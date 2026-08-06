#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

NGINX="default.conf"
DECISION="docs/security/EDGE_WAF_DDOS_DECISION.md"
RUNBOOK="docs/ops/TRAFFIC_ATTACK_RUNBOOK.md"
COMPOSE="docker-compose.yml"
IPV6_RULES="ops/firewall/mercasto-rules.v6"
HEADER_SMOKE="scripts/security-header-smoke.sh"
PRODUCTION_SMOKE="scripts/production-smoke.sh"

echo "== Origin edge security contract gate =="

for file in "$NGINX" "$DECISION" "$RUNBOOK" "$COMPOSE" "$IPV6_RULES" "$HEADER_SMOKE" "$PRODUCTION_SMOKE"; do
  test -f "$file"
done

grep -qF 'limit_req_zone $binary_remote_addr zone=mercasto_api_per_ip:20m rate=30r/s;' "$NGINX"
grep -qF 'limit_conn_zone $binary_remote_addr zone=mercasto_conn_per_ip:20m;' "$NGINX"
grep -qF 'limit_req_status 429;' "$NGINX"
grep -qF 'limit_conn_status 429;' "$NGINX"
grep -qF 'limit_conn mercasto_conn_per_ip 60;' "$NGINX"
grep -qF 'limit_req zone=mercasto_api_per_ip burst=120 nodelay;' "$NGINX"
grep -qF 'limit_conn mercasto_conn_per_ip 10;' "$NGINX"
grep -qF 'client_header_timeout 15s;' "$NGINX"
grep -qF 'client_body_timeout 120s;' "$NGINX"
grep -qF 'reset_timedout_connection on;' "$NGINX"
server_tokens_line="$(grep -n '^server_tokens off;' "$NGINX" | cut -d: -f1)"
first_server_line="$(grep -n '^server {' "$NGINX" | head -1 | cut -d: -f1)"
test "$(grep -c '^server_tokens off;' "$NGINX")" = '1'
test -n "$server_tokens_line"
test -n "$first_server_line"
test "$server_tokens_line" -lt "$first_server_line"
grep -qF 'bash scripts/security-header-smoke.sh' "$PRODUCTION_SMOKE"
grep -qF ':INPUT DROP' "$IPV6_RULES"
grep -qF -- '-p ipv6-icmp -j ACCEPT' "$IPV6_RULES"
grep -qF -- '--dport 22 -j ACCEPT' "$IPV6_RULES"
grep -qF -- '--dport 80 -j ACCEPT' "$IPV6_RULES"
grep -qF -- '--dport 443 -j ACCEPT' "$IPV6_RULES"
grep -qF 'managed edge is required before broad paid marketing' "$DECISION"
grep -qF 'Traefik must not be enabled' "$DECISION"
grep -qF 'Volumetric attack' "$RUNBOOK"
grep -qF 'frontend container continues to own ports 80/443' "$DECISION"

python3 - <<'PY'
from pathlib import Path
import yaml

compose = yaml.safe_load(Path('docker-compose.yml').read_text())
services = compose.get('services', {})
for name, service in services.items():
    for port in service.get('ports') or []:
        if isinstance(port, str):
            if port.startswith(('127.0.0.1:', '[::1]:')):
                continue
            published = port.split(':')[-2:] if ':' in port else [port]
            if name in {'frontend', 'mercasto-frontend'} and any(p in {'80', '443'} for p in published):
                continue
            raise SystemExit(f'unexpected non-loopback published port on service {name}: {port}')

        host_ip = str(port.get('host_ip') or '')
        published = str(port.get('published') or '')
        if host_ip in {'127.0.0.1', '::1'}:
            continue
        if name in {'frontend', 'mercasto-frontend'} and published in {'80', '443'}:
            continue
        raise SystemExit(f'unexpected non-loopback published port on service {name}: {port}')
PY
echo "origin edge security contract gate OK"
