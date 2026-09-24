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

grep -qF 'sudo -n cat "$RULES_FILE"' "$GATE"

mkdir -p "$TMP_DIR/fake-bin"
cat > "$TMP_DIR/fake-bin/sudo" <<'FAKE_SUDO'
#!/usr/bin/env bash
set -u
if [[ "${1:-}" != "-n" || "${2:-}" != "cat" || -z "${3:-}" ]]; then
  echo "unexpected fake sudo invocation: $*" >&2
  exit 64
fi
path="$3"
mode="$(stat -c %a "$path")"
chmod u+r "$path"
cat "$path"
rc=$?
chmod "$mode" "$path"
exit "$rc"
FAKE_SUDO
chmod +x "$TMP_DIR/fake-bin/sudo"

cp "$TMP_DIR/clean.rules" "$TMP_DIR/privileged-clean.rules"
chmod 000 "$TMP_DIR/privileged-clean.rules"
PATH="$TMP_DIR/fake-bin:$PATH" \
  PERSISTENT_IPTABLES_RULES_FILE="$TMP_DIR/privileged-clean.rules" \
  "$GATE" >/dev/null

cp "$TMP_DIR/docker_chain.rules" "$TMP_DIR/privileged-docker.rules"
chmod 000 "$TMP_DIR/privileged-docker.rules"
if PATH="$TMP_DIR/fake-bin:$PATH" \
  PERSISTENT_IPTABLES_RULES_FILE="$TMP_DIR/privileged-docker.rules" \
  "$GATE" >/dev/null 2>&1; then
  echo "expected privileged contaminated fixture to fail" >&2
  exit 1
fi

echo "persistent firewall Docker-rule gate tests OK"
