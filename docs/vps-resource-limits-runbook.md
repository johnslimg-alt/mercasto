# Mercasto VPS resource limits runbook

This runbook is for Hostinger VPS CPU/resource limitation events. It is intentionally conservative: protect the live marketplace first, reduce non-critical load second, and only remove provider limitations after Mercasto remains healthy.

## Current production baseline

Mercasto core services that must remain available:

- `mercasto-frontend`
- `mercasto-backend`
- `postgres`
- `redis`
- `mercasto-reverb`
- `mercasto-worker`
- `mercasto-scheduler`

Do not stop these services during a launch gate unless there is a confirmed rollback plan.

## Non-critical services to reduce first

If Hostinger shows CPU limitation or CPU near 100%, reduce optional load in this order:

1. GitHub self-hosted runners: `gh-runner-1`, `gh-runner-2`, `gh-runner-3`.
2. n8n: `n8n_ai_agent`.
3. Ollama: `mercasto_ollama`.
4. Monitoring extras only if necessary: `cadvisor`, `prometheus`, `grafana`.

Keep n8n data volumes unless a separate backup/export has been completed.

## Read-only diagnostics

Run from the VPS shell:

```bash
cd /var/www/mercasto || exit 1

echo "== live cpu/mem by container =="
docker stats --no-stream --format 'table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.PIDs}}' | sort -k2 -hr | head -30

echo "== process cpu =="
ps -eo pid,ppid,comm,%cpu,%mem,args --sort=-%cpu | head -30

echo "== Mercasto core health =="
docker compose --env-file backend/.env -f docker-compose.yml -f docker-compose.override.yml ps | grep -E 'mercasto-frontend|mercasto-backend|mercasto-reverb|mercasto-worker|mercasto-scheduler|postgres|redis' || true

echo "== public HTTP checks =="
curl -k -sS -o /dev/null -w 'UP=%{http_code}\n' https://mercasto.com/up
curl -k -sS -o /dev/null -w 'HOME=%{http_code}\n' https://mercasto.com/
```

## Emergency load reduction

Only stop optional services first:

```bash
docker stop gh-runner-1 gh-runner-2 gh-runner-3 || true
docker stop n8n_ai_agent || true
docker stop mercasto_ollama || true
```

Then re-check load and Mercasto health:

```bash
sleep 20

docker stats --no-stream --format 'table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.PIDs}}' | sort -k2 -hr | head -30

cd /var/www/mercasto || exit 1
bash scripts/server-operator.sh verify_quick; echo "VERIFY_EXIT=$?"
```

## Remove Hostinger limitations only when

All criteria must be true:

- `VERIFY_EXIT=0`.
- `mercasto-frontend`, `mercasto-backend`, `postgres`, `redis`, `mercasto-reverb`, `mercasto-worker`, and `mercasto-scheduler` are up/healthy.
- No Mercasto core container is in `Restarting` state.
- CPU has dropped from the limitation spike and is stable.
- Public checks return `UP=200` and `HOME=200`.

## Optional resource caps

After the incident, add or adjust resource limits for optional services before re-enabling them. Prefer limiting optional/background services before touching Mercasto core. Use Docker runtime constraints or Compose deploy resource limits depending on how the service is managed.

Suggested targets:

- `n8n_ai_agent`: low CPU share and memory cap.
- `mercasto_ollama`: disable unless actively used, or cap heavily.
- GitHub runners: run only when needed; avoid long-running idle runner fleets on a small VPS.

## Do not do during an active limitation

- Do not reboot the VPS before capturing container/process diagnostics.
- Do not prune Docker volumes blindly.
- Do not stop `postgres` or `redis` unless performing a controlled rollback.
- Do not click Hostinger `Remove limitations` while CPU remains near 100%.
- Do not delete `n8n_data` without a separate export/backup.
