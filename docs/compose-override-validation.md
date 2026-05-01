# Compose override validation

This note exists because `docker-compose.override.yml` adds Redis health-gated startup for `mercasto-scheduler` and `mercasto-reverb` without rewriting the main production compose file.

## Why this exists

The override file currently adds:

```yaml
services:
  mercasto-scheduler:
    depends_on:
      redis:
        condition: service_healthy

  mercasto-reverb:
    depends_on:
      redis:
        condition: service_healthy
```

This is intended to make scheduler and Reverb wait for Redis to pass its healthcheck instead of only waiting for the Redis container to start.

## Required validation command

Run this from the repository root before deployment:

```bash
docker compose -f docker-compose.yml -f docker-compose.override.yml config
```

Expected result:

- command exits with status `0`;
- rendered config includes `mercasto-scheduler.depends_on.redis.condition: service_healthy`;
- rendered config includes `mercasto-reverb.depends_on.redis.condition: service_healthy`;
- no service definitions are accidentally replaced with incomplete fragments;
- frontend, backend, worker, scheduler, reverb, redis, postgres, ollama, prometheus, grafana, cadvisor and certbot remain present.

## Manual workflow run

The GitHub Actions workflow is configured with `workflow_dispatch` in:

```text
.github/workflows/production-checks.yml
```

Run it manually from GitHub Actions UI, GitHub CLI or REST API when available.

## If validation fails

Do not deploy. Fix the smallest invalid compose change first, then rerun:

```bash
docker compose config
docker compose -f docker-compose.yml -f docker-compose.override.yml config
```

## Deployment note

If the deployment host uses plain `docker compose up -d` from the repository root, Docker Compose should automatically load the standard override file in the same directory. If the host uses explicit `-f docker-compose.yml`, include the override explicitly:

```bash
docker compose -f docker-compose.yml -f docker-compose.override.yml up -d
```
