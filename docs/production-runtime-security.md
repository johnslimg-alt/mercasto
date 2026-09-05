# Production runtime security bounds

Mercasto avoids containers that require unrestricted host control. Docker restart policies (`unless-stopped`/`always`) provide process-exit recovery; the former `autoheal` service was removed because mounting `/var/run/docker.sock` into a general-purpose restart controller is effectively host-root authority.

The optional monitoring profile no longer runs cAdvisor because its normal host-root and Docker-socket mounts exceed the least-privilege boundary. Prometheus and Grafana remain available for application/exported metrics and receive no host filesystem or Docker socket mounts. Reintroducing host/container telemetry requires an explicitly allowlisted exporter design without arbitrary host-root reads or Docker control authority.

Production Laravel sessions are encrypted. `SESSION_ENCRYPT=true` is the documented setting; if the variable is omitted, `backend/config/session.php` defaults encryption on whenever `APP_ENV=production`. An explicit `SESSION_ENCRYPT=false` fails the production readiness smoke.

Queue capacity is intentionally bounded to one PHP process per worker container. The general worker and AI moderation worker each have a 1 GiB container memory limit. Sizing rule: reserve at least 25% of host RAM for OS/database/cache headroom, then require `worker_count × worker_limit <= remaining workload budget`. On the current 32 GiB class host, the two 1 GiB worker ceilings consume at most 2 GiB, well below the 24 GiB workload budget after 25% headroom. Increasing worker process/container count requires updating this document and the static gate with measured peak RSS evidence.
