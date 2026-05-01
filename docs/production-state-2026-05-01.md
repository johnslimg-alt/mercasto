# Mercasto production state — 2026-05-01

Status: production smoke passed.

Confirmed on server:

- Docker Compose base file and override file merge successfully.
- `mercasto-scheduler` waits for Redis with `condition: service_healthy`.
- `mercasto-reverb` waits for Redis with `condition: service_healthy`.
- `docker compose up -d` completed successfully.
- Frontend container is running and healthy.
- Backend container is running and healthy.
- Postgres container is running and healthy.
- Redis container is running and healthy.
- Ollama container is running and healthy internally.
- Public health endpoint `/up` returns HTTP 200.
- Baseline security headers are present on `/up`.
- Public access to Ollama port `11434` is closed from the internet.
- Redis host setting `vm.overcommit_memory = 1` is applied persistently.
- New Redis logs no longer show the memory-overcommit warning.

Minor maintenance notes:

- Nginx reports a non-blocking notice because mounted config is read-only.
- Ubuntu reports pending system/security updates; apply during a scheduled maintenance window with backup and rollback available.
- Ubuntu login banner reports one zombie process; inspect during maintenance, but this is not blocking current production health.

Next checks:

```bash
cd /var/www/mercasto
curl -I https://mercasto.com/
curl -I https://www.mercasto.com/
curl -I https://mercasto.com/api/categories
curl -I 'https://mercasto.com/api/ads?page=1'
curl -I https://mercasto.com/.env
curl -I https://mercasto.com/.git/config
```

Expected:

- homepage and www return HTTP 200 or expected redirect;
- API endpoints do not return HTTP 500;
- protected probe paths return safe denial such as 403 or 404.
