#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
CF_V4_FILE="${CF_V4_FILE:-$ROOT_DIR/ops/firewall/cloudflare-ips.v4}"
CF_V6_FILE="${CF_V6_FILE:-$ROOT_DIR/ops/firewall/cloudflare-ips.v6}"
FRONTEND_CONTAINER="${FRONTEND_CONTAINER:-mercasto_frontend_container}"
PUBLIC_INTERFACE="${PUBLIC_INTERFACE:-$(ip route show default 2>/dev/null | awk '/default/{print $5; exit}')}"
MARKER="${LOCKDOWN_MARKER:-/etc/mercasto/cloudflare-origin-lockdown}"
PERSIST_V4="${IPV4_RULES_FILE:-/etc/iptables/rules.v4}"
PERSIST_V6="${IPV6_RULES_FILE:-/etc/iptables/rules.v6}"
BACKUP_ROOT="${BACKUP_ROOT:-/root/mercasto-firewall-backups}"
APPLY_BACKUP=""

usage() {
  echo "Usage: $0 {preflight|apply|rollback|status}" >&2
  exit 2
}

require_root() {
  if [[ "$(id -u)" -ne 0 ]]; then
    echo "must run as root" >&2
    exit 1
  fi
}

load_cidrs() {
  mapfile -t CF_V4 < <(grep -Ev '^[[:space:]]*(#|$)' "$CF_V4_FILE")
  mapfile -t CF_V6 < <(grep -Ev '^[[:space:]]*(#|$)' "$CF_V6_FILE")
  test "${#CF_V4[@]}" -eq 15
  test "${#CF_V6[@]}" -eq 7
}

require_commands() {
  local cmd
  for cmd in ip iptables ip6tables iptables-save ip6tables-save iptables-restore ip6tables-restore docker install; do
    command -v "$cmd" >/dev/null
  done
  test -f "$PERSIST_V4"
  test -f "$PERSIST_V6"
}

verify_nginx_cidrs() {
  local nginx_config
  nginx_config="$(docker exec "$FRONTEND_CONTAINER" nginx -T 2>&1)"
  diff -u <(sort -u "$CF_V4_FILE") <(sed -nE 's/^set_real_ip_from ([0-9.]+\/[0-9]+);$/\1/p' <<<"$nginx_config" | sort -u)
  diff -u <(sort -u "$CF_V6_FILE") <(sed -nE 's/^set_real_ip_from ([0-9a-fA-F:]+\/[0-9]+);$/\1/p' <<<"$nginx_config" | sort -u)
  grep -qF 'real_ip_header CF-Connecting-IP;' <<<"$nginx_config"
  grep -qF 'real_ip_recursive on;' <<<"$nginx_config"
}

verify_baseline() {
  grep -qF -- '-P INPUT DROP' < <(iptables -S INPUT)
  grep -qF -- '-P INPUT DROP' < <(ip6tables -S INPUT)
  grep -qF -- '--dport 22 -j ACCEPT' < <(iptables -S INPUT)
  grep -qF -- '--dport 22 -j ACCEPT' < <(ip6tables -S INPUT)
  iptables -S DOCKER-USER >/dev/null
  ip6tables -S DOCKER-USER >/dev/null
  test -n "$PUBLIC_INTERFACE"
  verify_nginx_cidrs
}

chain_is_empty() {
  local tool="$1"
  [[ "$($tool -S DOCKER-USER | wc -l | tr -d ' ')" -eq 1 ]]
}

create_backup() {
  local stamp
  stamp="$(date -u +%Y%m%dT%H%M%SZ)"
  APPLY_BACKUP="$BACKUP_ROOT/$stamp"
  install -d -m 700 "$APPLY_BACKUP"
  iptables-save > "$APPLY_BACKUP/live.v4"
  ip6tables-save > "$APPLY_BACKUP/live.v6"
  install -m 600 "$PERSIST_V4" "$APPLY_BACKUP/persistent.v4"
  install -m 600 "$PERSIST_V6" "$APPLY_BACKUP/persistent.v6"
  printf 'created=%s\nhead=%s\n' "$stamp" "$(git -C "$ROOT_DIR" rev-parse HEAD 2>/dev/null || echo unknown)" > "$APPLY_BACKUP/meta"
  chmod 600 "$APPLY_BACKUP/meta"
  echo "$APPLY_BACKUP"
}

restore_backup() {
  local dir="$1"
  test -f "$dir/live.v4"
  test -f "$dir/live.v6"
  iptables-restore < "$dir/live.v4"
  ip6tables-restore < "$dir/live.v6"
  install -m 600 "$dir/persistent.v4" "$PERSIST_V4"
  install -m 600 "$dir/persistent.v6" "$PERSIST_V6"
  rm -f "$MARKER"
}

add_rule_once() {
  local tool="$1" chain="$2"
  shift 2
  if ! "$tool" -C "$chain" "$@" 2>/dev/null; then
    "$tool" -A "$chain" "$@"
  fi
}

delete_rule_all() {
  local tool="$1" chain="$2"
  shift 2
  while "$tool" -C "$chain" "$@" 2>/dev/null; do
    "$tool" -D "$chain" "$@"
  done
}

persist_live_rules() {
  local tmp4 tmp6
  tmp4="$(mktemp)"
  tmp6="$(mktemp)"
  iptables-save > "$tmp4"
  ip6tables-save > "$tmp6"
  install -m 600 "$tmp4" "$PERSIST_V4"
  install -m 600 "$tmp6" "$PERSIST_V6"
  rm -f "$tmp4" "$tmp6"
}

write_marker() {
  install -d -m 755 "$(dirname "$MARKER")"
  printf 'enabled_at=%s\nbackup=%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$APPLY_BACKUP" > "$MARKER"
  chmod 600 "$MARKER"
}

apply_lockdown() {
  verify_baseline
  if [[ -e "$MARKER" ]]; then
    echo "lockdown marker already present: $MARKER"
    status_lockdown
    return 0
  fi
  if ! chain_is_empty iptables || ! chain_is_empty ip6tables; then
    echo "DOCKER-USER is not empty; refusing to overwrite unknown firewall policy" >&2
    exit 1
  fi

  create_backup >/dev/null
  trap 'rc=$?; if [[ $rc -ne 0 && -n "$APPLY_BACKUP" ]]; then restore_backup "$APPLY_BACKUP"; fi; exit $rc' ERR

  local cidr
  for cidr in "${CF_V4[@]}"; do
    add_rule_once iptables INPUT -s "$cidr" -p tcp -m multiport --dports 80,443 -j ACCEPT
    add_rule_once iptables DOCKER-USER -i "$PUBLIC_INTERFACE" -s "$cidr" -p tcp -m multiport --dports 80,443 -j ACCEPT
  done
  for cidr in "${CF_V6[@]}"; do
    add_rule_once ip6tables INPUT -s "$cidr" -p tcp -m multiport --dports 80,443 -j ACCEPT
    add_rule_once ip6tables DOCKER-USER -i "$PUBLIC_INTERFACE" -s "$cidr" -p tcp -m multiport --dports 80,443 -j ACCEPT
  done

  add_rule_once iptables DOCKER-USER -i "$PUBLIC_INTERFACE" -p tcp -m multiport --dports 80,443 -j DROP
  add_rule_once ip6tables DOCKER-USER -i "$PUBLIC_INTERFACE" -p tcp -m multiport --dports 80,443 -j DROP

  delete_rule_all iptables INPUT -p tcp --dport 80 -j ACCEPT
  delete_rule_all iptables INPUT -p tcp --dport 443 -j ACCEPT
  delete_rule_all ip6tables INPUT -p tcp --dport 80 -j ACCEPT
  delete_rule_all ip6tables INPUT -p tcp --dport 443 -j ACCEPT

  verify_live_lockdown
  persist_live_rules
  write_marker
  trap - ERR
  echo "Cloudflare origin lockdown applied; backup=$APPLY_BACKUP"
}

verify_live_lockdown() {
  local cidr
  for cidr in "${CF_V4[@]}"; do
    iptables -C INPUT -s "$cidr" -p tcp -m multiport --dports 80,443 -j ACCEPT
    iptables -C DOCKER-USER -i "$PUBLIC_INTERFACE" -s "$cidr" -p tcp -m multiport --dports 80,443 -j ACCEPT
  done
  for cidr in "${CF_V6[@]}"; do
    ip6tables -C INPUT -s "$cidr" -p tcp -m multiport --dports 80,443 -j ACCEPT
    ip6tables -C DOCKER-USER -i "$PUBLIC_INTERFACE" -s "$cidr" -p tcp -m multiport --dports 80,443 -j ACCEPT
  done
  iptables -C DOCKER-USER -i "$PUBLIC_INTERFACE" -p tcp -m multiport --dports 80,443 -j DROP
  ip6tables -C DOCKER-USER -i "$PUBLIC_INTERFACE" -p tcp -m multiport --dports 80,443 -j DROP
  ! iptables -C INPUT -p tcp --dport 80 -j ACCEPT 2>/dev/null
  ! iptables -C INPUT -p tcp --dport 443 -j ACCEPT 2>/dev/null
  ! ip6tables -C INPUT -p tcp --dport 80 -j ACCEPT 2>/dev/null
  ! ip6tables -C INPUT -p tcp --dport 443 -j ACCEPT 2>/dev/null
}

rollback_lockdown() {
  verify_baseline
  local cidr
  delete_rule_all iptables DOCKER-USER -i "$PUBLIC_INTERFACE" -p tcp -m multiport --dports 80,443 -j DROP
  delete_rule_all ip6tables DOCKER-USER -i "$PUBLIC_INTERFACE" -p tcp -m multiport --dports 80,443 -j DROP
  delete_rule_all iptables DOCKER-USER -p tcp -m multiport --dports 80,443 -j DROP
  delete_rule_all ip6tables DOCKER-USER -p tcp -m multiport --dports 80,443 -j DROP

  for cidr in "${CF_V4[@]}"; do
    delete_rule_all iptables INPUT -s "$cidr" -p tcp -m multiport --dports 80,443 -j ACCEPT
    delete_rule_all iptables DOCKER-USER -i "$PUBLIC_INTERFACE" -s "$cidr" -p tcp -m multiport --dports 80,443 -j ACCEPT
    delete_rule_all iptables DOCKER-USER -s "$cidr" -p tcp -m multiport --dports 80,443 -j ACCEPT
  done
  for cidr in "${CF_V6[@]}"; do
    delete_rule_all ip6tables INPUT -s "$cidr" -p tcp -m multiport --dports 80,443 -j ACCEPT
    delete_rule_all ip6tables DOCKER-USER -i "$PUBLIC_INTERFACE" -s "$cidr" -p tcp -m multiport --dports 80,443 -j ACCEPT
    delete_rule_all ip6tables DOCKER-USER -s "$cidr" -p tcp -m multiport --dports 80,443 -j ACCEPT
  done

  add_rule_once iptables INPUT -p tcp --dport 80 -j ACCEPT
  add_rule_once iptables INPUT -p tcp --dport 443 -j ACCEPT
  add_rule_once ip6tables INPUT -p tcp --dport 80 -j ACCEPT
  add_rule_once ip6tables INPUT -p tcp --dport 443 -j ACCEPT
  persist_live_rules
  rm -f "$MARKER"
  echo "Cloudflare origin lockdown rolled back to globally reachable 80/443"
}

status_lockdown() {
  if [[ -e "$MARKER" ]]; then
    echo "mode=cloudflare-lockdown"
    verify_live_lockdown
  else
    echo "mode=pre-lockdown"
  fi
  echo "ipv4_input=$(iptables -S INPUT | wc -l | tr -d ' ')"
  echo "ipv6_input=$(ip6tables -S INPUT | wc -l | tr -d ' ')"
}

main() {
  require_root
  load_cidrs
  require_commands
  case "${1:-}" in
    preflight)
      verify_baseline
      if [[ -e "$MARKER" ]]; then
        verify_live_lockdown
      else
        grep -qF -- '--dport 80 -j ACCEPT' < <(iptables -S INPUT)
        grep -qF -- '--dport 443 -j ACCEPT' < <(iptables -S INPUT)
        grep -qF -- '--dport 80 -j ACCEPT' < <(ip6tables -S INPUT)
        grep -qF -- '--dport 443 -j ACCEPT' < <(ip6tables -S INPUT)
      fi
      echo "preflight OK: Cloudflare CIDRs match nginx and firewall baseline is safe"
      ;;
    apply)
      apply_lockdown
      ;;
    rollback)
      rollback_lockdown
      ;;
    status)
      verify_baseline
      status_lockdown
      ;;
    *)
      usage
      ;;
  esac
}

main "$@"
