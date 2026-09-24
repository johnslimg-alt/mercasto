#!/usr/bin/env bash
set -euo pipefail

RULES_FILE="${PERSISTENT_IPTABLES_RULES_FILE:-/etc/iptables/rules.v4}"
RULES_INPUT="$RULES_FILE"
RULES_SNAPSHOT=""

cleanup() {
  if [[ -n "$RULES_SNAPSHOT" ]]; then
    rm -f "$RULES_SNAPSHOT"
  fi
}
trap cleanup EXIT

if [[ ! -e "$RULES_FILE" ]]; then
  echo "persistent IPv4 rules file not present: $RULES_FILE"
  exit 0
fi

if [[ ! -r "$RULES_FILE" ]]; then
  if ! command -v sudo >/dev/null 2>&1; then
    echo "persistent IPv4 rules file is not readable and sudo is unavailable: $RULES_FILE" >&2
    exit 1
  fi

  RULES_SNAPSHOT="$(mktemp "${TMPDIR:-/tmp}/mercasto-persistent-firewall.XXXXXX")"
  chmod 0600 "$RULES_SNAPSHOT"
  if ! sudo -n cat "$RULES_FILE" >"$RULES_SNAPSHOT"; then
    echo "persistent IPv4 rules file is not readable through sudo -n cat: $RULES_FILE" >&2
    exit 1
  fi
  RULES_INPUT="$RULES_SNAPSHOT"
fi

pattern='(^|[[:space:]])(:?DOCKER(-[A-Z0-9_-]+)?|DOCKER(-[A-Z0-9_-]+)?)([[:space:]]|$)|(^|[[:space:]])br-[0-9a-f]{12}([[:space:]]|$)'
if grep -En "$pattern" "$RULES_INPUT" >/dev/null; then
  echo "persistent firewall contains Docker-managed chains or bridge references: $RULES_FILE" >&2
  grep -En "$pattern" "$RULES_INPUT" | sed -n '1,20p' >&2
  exit 1
fi

echo "persistent firewall Docker-rule check OK"
