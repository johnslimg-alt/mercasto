#!/usr/bin/env bash
set -euo pipefail

RULES_FILE="${PERSISTENT_IPTABLES_RULES_FILE:-/etc/iptables/rules.v4}"

if [[ ! -e "$RULES_FILE" ]]; then
  echo "persistent IPv4 rules file not present: $RULES_FILE"
  exit 0
fi
if [[ ! -r "$RULES_FILE" ]]; then
  echo "persistent IPv4 rules file is not readable: $RULES_FILE" >&2
  exit 1
fi

pattern='(^|[[:space:]])(:?DOCKER(-[A-Z0-9_-]+)?|DOCKER(-[A-Z0-9_-]+)?)([[:space:]]|$)|(^|[[:space:]])br-[0-9a-f]{12}([[:space:]]|$)'
if grep -En "$pattern" "$RULES_FILE" >/dev/null; then
  echo "persistent firewall contains Docker-managed chains or bridge references: $RULES_FILE" >&2
  grep -En "$pattern" "$RULES_FILE" | sed -n '1,20p' >&2
  exit 1
fi

echo "persistent firewall Docker-rule check OK"
