#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GATE="$SCRIPT_DIR/persistent-firewall-docker-gate.sh"
TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/mercasto-firewall-gate-test.XXXXXX")"
trap 'rm -rf "$TMP_DIR"' EXIT

cat > "$TMP_DIR/clean.rules" <<'RULES'
*filter
:INPUT DROP [0:0]
-A INPUT -i lo -j ACCEPT
-A INPUT -p tcp --dport 22 -j ACCEPT
-A INPUT -p tcp --dport 80 -j ACCEPT
-A INPUT -p tcp --dport 443 -j ACCEPT
COMMIT
RULES
PERSISTENT_IPTABLES_RULES_FILE="$TMP_DIR/clean.rules" "$GATE" >/dev/null

for fixture in docker_chain stale_bridge docker_nat; do
  case "$fixture" in
    docker_chain) line=':DOCKER-FORWARD - [0:0]' ;;
    stale_bridge) line='-A PREROUTING -d 172.18.0.10/32 ! -i br-9a39457ced9f -j DROP' ;;
    docker_nat) line='-A PREROUTING -m addrtype --dst-type LOCAL -j DOCKER' ;;
  esac
  printf '*filter\n%s\nCOMMIT\n' "$line" > "$TMP_DIR/$fixture.rules"
  if PERSISTENT_IPTABLES_RULES_FILE="$TMP_DIR/$fixture.rules" "$GATE" >/dev/null 2>&1; then
    echo "expected contaminated fixture to fail: $fixture" >&2
    exit 1
  fi
done

echo "persistent firewall Docker-rule gate tests OK"
