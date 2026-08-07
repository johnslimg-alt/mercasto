#!/usr/bin/env bash
set -euo pipefail

FRONTEND_CONTAINER="${FRONTEND_CONTAINER:-mercasto_frontend_container}"
PUBLIC_FRONTEND_CONTAINER="${PUBLIC_FRONTEND_CONTAINER:-mercasto_frontend_container}"
BASE_URL="${BASE_URL:-https://mercasto.com}"
IPV4_RULES_FILE="${IPV4_RULES_FILE:-/etc/iptables/rules.v4}"
IPV6_RULES_FILE="${IPV6_RULES_FILE:-/etc/iptables/rules.v6}"
LOCKDOWN_MARKER="${LOCKDOWN_MARKER:-/etc/mercasto/cloudflare-origin-lockdown}"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

echo "== Origin edge security smoke =="

nginx_config="$(docker exec "$FRONTEND_CONTAINER" nginx -T 2>&1)"
for expected in \
  'real_ip_header CF-Connecting-IP' \
  'real_ip_recursive on' \
  'set_real_ip_from 173.245.48.0/20' \
  'set_real_ip_from 2c0f:f248::/32' \
  'zone=mercasto_api_per_ip:20m rate=30r/s' \
  'zone=mercasto_conn_per_ip:20m' \
  'limit_req_status 429' \
  'limit_conn_status 429' \
  'limit_conn mercasto_conn_per_ip 60'  'limit_req zone=mercasto_api_per_ip burst=120 nodelay' \
  'client_header_timeout 15s' \
  'client_body_timeout 120s' \
  'reset_timedout_connection on'; do
  grep -qF "$expected" <<<"$nginx_config"
done
if grep -Eq 'set_real_ip_from (0\.0\.0\.0/0|::/0)' <<<"$nginx_config"; then
  echo "unsafe global real-ip trust found in active nginx config" >&2
  exit 1
fi

echo "active nginx edge limits and Cloudflare real-IP trust OK"
if [[ "$(id -u)" -eq 0 ]]; then
  firewall_v4="$(iptables -S INPUT)"
  firewall_v6="$(ip6tables -S INPUT)"
  docker_user_v4="$(iptables -S DOCKER-USER 2>/dev/null || true)"
  docker_user_v6="$(ip6tables -S DOCKER-USER 2>/dev/null || true)"
  persistent_v4="$(cat "$IPV4_RULES_FILE")"
  persistent_v6="$(cat "$IPV6_RULES_FILE")"
else
  firewall_v4="$(sudo -n iptables -S INPUT)"
  firewall_v6="$(sudo -n ip6tables -S INPUT)"
  docker_user_v4="$(sudo -n iptables -S DOCKER-USER 2>/dev/null || true)"
  docker_user_v6="$(sudo -n ip6tables -S DOCKER-USER 2>/dev/null || true)"  persistent_v4="$(sudo -n cat "$IPV4_RULES_FILE")"
  persistent_v6="$(sudo -n cat "$IPV6_RULES_FILE")"
fi

for rules in "$firewall_v4" "$firewall_v6"; do
  grep -qF -- '-P INPUT DROP' <<<"$rules"
  grep -qF -- '--dport 22 -j ACCEPT' <<<"$rules"
  for forbidden in 5432 6379 8082 9000 11434; do
    if grep -qF -- "--dport ${forbidden} -j ACCEPT" <<<"$rules"; then
      echo "sensitive port ${forbidden} is globally allowed by INPUT" >&2
      exit 1
    fi
  done
done

grep -qF ':INPUT DROP' <<<"$persistent_v4"
grep -qF ':INPUT DROP' <<<"$persistent_v6"
grep -qF -- '-p ipv6-icmp -j ACCEPT' <<<"$persistent_v6"
grep -qF -- '--dport 22 -j ACCEPT' <<<"$persistent_v4"
grep -qF -- '--dport 22 -j ACCEPT' <<<"$persistent_v6"

if [[ -e "$LOCKDOWN_MARKER" ]]; then
  mapfile -t cf_v4 < <(sed -nE 's/^set_real_ip_from ([0-9.]+\/[0-9]+);$/\1/p' <<<"$nginx_config" | sort -u)
  mapfile -t cf_v6 < <(sed -nE 's/^set_real_ip_from ([0-9a-fA-F:]+\/[0-9]+);$/\1/p' <<<"$nginx_config" | sort -u)
  test "${#cf_v4[@]}" -eq 15
  test "${#cf_v6[@]}" -eq 7
  for rules in "$firewall_v4" "$firewall_v6" "$persistent_v4" "$persistent_v6"; do
    if grep -Eq -- '-A INPUT -p tcp( -m tcp)? --dport (80|443) -j ACCEPT' <<<"$rules"; then
      echo "global web ACCEPT remains after Cloudflare origin lockdown" >&2
      exit 1
    fi
  done

  for cidr in "${cf_v4[@]}"; do
    grep -qF -- "-A INPUT -s ${cidr} -p tcp -m multiport --dports 80,443 -j ACCEPT" <<<"$firewall_v4"
    grep -qF -- "-A DOCKER-USER -s ${cidr} -p tcp -m multiport --dports 80,443 -j ACCEPT" <<<"$docker_user_v4"
    grep -qF -- "-A INPUT -s ${cidr} -p tcp -m multiport --dports 80,443 -j ACCEPT" <<<"$persistent_v4"
    grep -qF -- "-A DOCKER-USER -s ${cidr} -p tcp -m multiport --dports 80,443 -j ACCEPT" <<<"$persistent_v4"
  done
  for cidr in "${cf_v6[@]}"; do
    grep -qF -- "-A INPUT -s ${cidr} -p tcp -m multiport --dports 80,443 -j ACCEPT" <<<"$firewall_v6"
    grep -qF -- "-A DOCKER-USER -s ${cidr} -p tcp -m multiport --dports 80,443 -j ACCEPT" <<<"$docker_user_v6"
    grep -qF -- "-A INPUT -s ${cidr} -p tcp -m multiport --dports 80,443 -j ACCEPT" <<<"$persistent_v6"
    grep -qF -- "-A DOCKER-USER -s ${cidr} -p tcp -m multiport --dports 80,443 -j ACCEPT" <<<"$persistent_v6"
  done
  grep -qF -- '-A DOCKER-USER -p tcp -m multiport --dports 80,443 -j DROP' <<<"$docker_user_v4"
  grep -qF -- '-A DOCKER-USER -p tcp -m multiport --dports 80,443 -j DROP' <<<"$docker_user_v6"
  grep -qF -- '-A DOCKER-USER -p tcp -m multiport --dports 80,443 -j DROP' <<<"$persistent_v4"
  grep -qF -- '-A DOCKER-USER -p tcp -m multiport --dports 80,443 -j DROP' <<<"$persistent_v6"  echo "firewall mode=cloudflare-lockdown"
else
  for rules in "$firewall_v4" "$firewall_v6" "$persistent_v4" "$persistent_v6"; do
    grep -qF -- '--dport 80 -j ACCEPT' <<<"$rules"
    grep -qF -- '--dport 443 -j ACCEPT' <<<"$rules"
  done
  echo "firewall mode=pre-lockdown TTL drain"
fi

echo "dual-stack default-drop firewall OK"

published="$(docker ps --format '{{.Names}}|{{.Ports}}')"
while IFS='|' read -r name ports; do
  [[ -z "$name" ]] && continue
  if [[ "$name" != "$PUBLIC_FRONTEND_CONTAINER" && "$ports" =~ (0\.0\.0\.0:|\[::\]:) ]]; then
    echo "unexpected public Docker port on ${name}: ${ports}" >&2
    exit 1
  fi
done <<<"$published"

echo "Docker public-port ownership OK"

status="$(curl -ksS -o "$TMP_DIR/up" -w '%{http_code}' --max-time 20 "$BASE_URL/up")"
test "$status" = "200"
grep -qF 'ok' "$TMP_DIR/up"

echo "origin edge security smoke OK"