#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SMOKE="$ROOT_DIR/scripts/origin-edge-security-smoke.sh"
CF_V4="$ROOT_DIR/ops/firewall/cloudflare-ips.v4"
CF_V6="$ROOT_DIR/ops/firewall/cloudflare-ips.v6"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT
mkdir -p "$TMP_DIR/bin"

cat > "$TMP_DIR/bin/id" <<'EOF'
#!/usr/bin/env bash
[[ "${1:-}" == "-u" ]] && { echo 0; exit 0; }
exec /usr/bin/id "$@"
EOF

cat > "$TMP_DIR/bin/docker" <<'EOF'
#!/usr/bin/env bash
if [[ "${1:-}" == "exec" ]]; then
  cat "$MOCK_NGINX"
  exit 0
fi
if [[ "${1:-}" == "ps" ]]; then
  echo 'mercasto_frontend_container|0.0.0.0:80->80/tcp, [::]:80->80/tcp, 0.0.0.0:443->443/tcp, [::]:443->443/tcp'
  exit 0
fi
exit 1
EOF
cat > "$TMP_DIR/bin/iptables" <<'EOF'
#!/usr/bin/env bash
case "$*" in
  '-S INPUT') cat "$MOCK_V4_INPUT" ;;
  '-S DOCKER-USER') cat "$MOCK_V4_DOCKER" ;;
  *) exit 1 ;;
esac
EOF

cat > "$TMP_DIR/bin/ip6tables" <<'EOF'
#!/usr/bin/env bash
case "$*" in
  '-S INPUT') cat "$MOCK_V6_INPUT" ;;
  '-S DOCKER-USER') cat "$MOCK_V6_DOCKER" ;;
  *) exit 1 ;;
esac
EOF

cat > "$TMP_DIR/bin/curl" <<'EOF'
#!/usr/bin/env bash
out=''
while [[ $# -gt 0 ]]; do
  if [[ "$1" == '-o' ]]; then out="$2"; shift 2; continue; fi
  shift
done
printf 'ok\n' > "$out"
printf '200'
EOF

chmod +x "$TMP_DIR/bin/"*
MOCK_NGINX="$TMP_DIR/nginx.conf"
{
  echo 'real_ip_header CF-Connecting-IP;'
  echo 'real_ip_recursive on;'
  while IFS= read -r cidr; do [[ -n "$cidr" ]] && echo "set_real_ip_from $cidr;"; done < "$CF_V4"
  while IFS= read -r cidr; do [[ -n "$cidr" ]] && echo "set_real_ip_from $cidr;"; done < "$CF_V6"
  echo 'limit_req_zone $binary_remote_addr zone=mercasto_api_per_ip:20m rate=30r/s;'
  echo 'limit_conn_zone $binary_remote_addr zone=mercasto_conn_per_ip:20m;'
  echo 'limit_req_status 429;'
  echo 'limit_conn_status 429;'
  echo 'limit_conn mercasto_conn_per_ip 60;'
  echo 'limit_req zone=mercasto_api_per_ip burst=120 nodelay;'
  echo 'client_header_timeout 15s;'
  echo 'client_body_timeout 120s;'
  echo 'reset_timedout_connection on;'
} > "$MOCK_NGINX"

MOCK_V4_INPUT="$TMP_DIR/v4.input"
MOCK_V6_INPUT="$TMP_DIR/v6.input"
MOCK_V4_DOCKER="$TMP_DIR/v4.docker"
MOCK_V6_DOCKER="$TMP_DIR/v6.docker"
PERSIST_V4="$TMP_DIR/rules.v4"
PERSIST_V6="$TMP_DIR/rules.v6"
MARKER="$TMP_DIR/lockdown"
export MOCK_NGINX MOCK_V4_INPUT MOCK_V6_INPUT MOCK_V4_DOCKER MOCK_V6_DOCKER
write_pre_lockdown() {
  cat > "$MOCK_V4_INPUT" <<'EOF'
-P INPUT DROP
-A INPUT -p tcp -m tcp --dport 22 -j ACCEPT
-A INPUT -p tcp -m tcp --dport 80 -j ACCEPT
-A INPUT -p tcp -m tcp --dport 443 -j ACCEPT
EOF
  cat > "$MOCK_V6_INPUT" <<'EOF'
-P INPUT DROP
-A INPUT -p tcp -m tcp --dport 22 -j ACCEPT
-A INPUT -p tcp -m tcp --dport 80 -j ACCEPT
-A INPUT -p tcp -m tcp --dport 443 -j ACCEPT
EOF
  echo '-N DOCKER-USER' > "$MOCK_V4_DOCKER"
  echo '-N DOCKER-USER' > "$MOCK_V6_DOCKER"
  cat > "$PERSIST_V4" <<'EOF'
*filter
:INPUT DROP [0:0]
-A INPUT -p tcp -m tcp --dport 22 -j ACCEPT
-A INPUT -p tcp -m tcp --dport 80 -j ACCEPT
-A INPUT -p tcp -m tcp --dport 443 -j ACCEPT
COMMIT
EOF
  cat > "$PERSIST_V6" <<'EOF'
*filter
:INPUT DROP [0:0]
-A INPUT -p ipv6-icmp -j ACCEPT
-A INPUT -p tcp -m tcp --dport 22 -j ACCEPT
-A INPUT -p tcp -m tcp --dport 80 -j ACCEPT
-A INPUT -p tcp -m tcp --dport 443 -j ACCEPT
COMMIT
EOF
  rm -f "$MARKER"
}

write_lockdown() {
  printf '%s\n' '-P INPUT DROP' '-A INPUT -p tcp -m tcp --dport 22 -j ACCEPT' > "$MOCK_V4_INPUT"
  printf '%s\n' '-P INPUT DROP' '-A INPUT -p tcp -m tcp --dport 22 -j ACCEPT' > "$MOCK_V6_INPUT"
  echo '-N DOCKER-USER' > "$MOCK_V4_DOCKER"
  echo '-N DOCKER-USER' > "$MOCK_V6_DOCKER"
  printf '%s\n' '*filter' ':INPUT DROP [0:0]' ':DOCKER-USER - [0:0]' '-A INPUT -p tcp -m tcp --dport 22 -j ACCEPT' > "$PERSIST_V4"
  printf '%s\n' '*filter' ':INPUT DROP [0:0]' ':DOCKER-USER - [0:0]' '-A INPUT -p ipv6-icmp -j ACCEPT' '-A INPUT -p tcp -m tcp --dport 22 -j ACCEPT' > "$PERSIST_V6"

  local cidr
  while IFS= read -r cidr; do
    [[ -z "$cidr" ]] && continue
    echo "-A INPUT -s $cidr -p tcp -m multiport --dports 80,443 -j ACCEPT" >> "$MOCK_V4_INPUT"
    echo "-A DOCKER-USER -s $cidr -i eth0 -p tcp -m multiport --dports 80,443 -j ACCEPT" >> "$MOCK_V4_DOCKER"
    echo "-A INPUT -s $cidr -p tcp -m multiport --dports 80,443 -j ACCEPT" >> "$PERSIST_V4"
    echo "-A DOCKER-USER -s $cidr -i eth0 -p tcp -m multiport --dports 80,443 -j ACCEPT" >> "$PERSIST_V4"
  done < "$CF_V4"
  while IFS= read -r cidr; do
    [[ -z "$cidr" ]] && continue
    echo "-A INPUT -s $cidr -p tcp -m multiport --dports 80,443 -j ACCEPT" >> "$MOCK_V6_INPUT"
    echo "-A DOCKER-USER -s $cidr -i eth0 -p tcp -m multiport --dports 80,443 -j ACCEPT" >> "$MOCK_V6_DOCKER"
    echo "-A INPUT -s $cidr -p tcp -m multiport --dports 80,443 -j ACCEPT" >> "$PERSIST_V6"
    echo "-A DOCKER-USER -s $cidr -i eth0 -p tcp -m multiport --dports 80,443 -j ACCEPT" >> "$PERSIST_V6"
  done < "$CF_V6"

  echo '-A DOCKER-USER -i eth0 -p tcp -m multiport --dports 80,443 -j DROP' >> "$MOCK_V4_DOCKER"
  echo '-A DOCKER-USER -i eth0 -p tcp -m multiport --dports 80,443 -j DROP' >> "$MOCK_V6_DOCKER"
  echo '-A DOCKER-USER -i eth0 -p tcp -m multiport --dports 80,443 -j DROP' >> "$PERSIST_V4"
  echo 'COMMIT' >> "$PERSIST_V4"
  echo '-A DOCKER-USER -i eth0 -p tcp -m multiport --dports 80,443 -j DROP' >> "$PERSIST_V6"
  echo 'COMMIT' >> "$PERSIST_V6"
  : > "$MARKER"
}

run_smoke() {
  PATH="$TMP_DIR/bin:$PATH" \
    IPV4_RULES_FILE="$PERSIST_V4" \
    IPV6_RULES_FILE="$PERSIST_V6" \
    LOCKDOWN_MARKER="$MARKER" \
    PUBLIC_INTERFACE="eth0" \
    bash "$SMOKE"
}

write_pre_lockdown
pre_output="$(run_smoke)"
grep -qF 'firewall mode=pre-lockdown TTL drain' <<<"$pre_output"
grep -qF 'origin edge security smoke OK' <<<"$pre_output"

write_lockdown
lock_output="$(run_smoke)"
grep -qF 'firewall mode=cloudflare-lockdown' <<<"$lock_output"
grep -qF 'origin edge security smoke OK' <<<"$lock_output"

# Regression guard: a destination-only web DROP in DOCKER-USER also blocks
# container-originated outbound HTTPS. The smoke must reject that policy.
sed -i.bak 's/-A DOCKER-USER -i eth0 -p tcp -m multiport --dports 80,443 -j DROP/-A DOCKER-USER -p tcp -m multiport --dports 80,443 -j DROP/' "$MOCK_V4_DOCKER"
sed -i.bak 's/-A DOCKER-USER -i eth0 -p tcp -m multiport --dports 80,443 -j DROP/-A DOCKER-USER -p tcp -m multiport --dports 80,443 -j DROP/' "$PERSIST_V4"
if run_smoke >"$TMP_DIR/legacy.out" 2>"$TMP_DIR/legacy.err"; then
  echo "legacy unscoped DOCKER-USER web drop unexpectedly passed" >&2
  exit 1
fi
grep -qF 'unscoped DOCKER-USER web drop would block container egress' "$TMP_DIR/legacy.err"

echo "origin edge security smoke transition test OK"
