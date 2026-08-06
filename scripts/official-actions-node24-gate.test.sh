#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/mercasto-actions-node24.XXXXXX")"
trap 'rm -rf "$TMP_DIR"' EXIT

mkdir -p "$TMP_DIR/scripts" "$TMP_DIR/.github/workflows"
cp "$ROOT_DIR/scripts/official-actions-node24-gate.sh" "$TMP_DIR/scripts/"

cat > "$TMP_DIR/.github/workflows/modern.yml" <<'YAML'
name: Modern actions
on: workflow_dispatch
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v6
        with:
          node-version: '22'
YAML

positive_output="$(bash "$TMP_DIR/scripts/official-actions-node24-gate.sh")"
grep -qF 'official actions Node 24 gate OK' <<< "$positive_output"

sed -i.bak 's#actions/checkout@v6#actions/checkout@v5#' "$TMP_DIR/.github/workflows/modern.yml"
rm -f "$TMP_DIR/.github/workflows/modern.yml.bak"

set +e
negative_output="$(bash "$TMP_DIR/scripts/official-actions-node24-gate.sh" 2>&1)"
negative_status=$?
set -e

if (( negative_status == 0 )); then
  echo 'official actions gate accepted checkout@v5' >&2
  exit 1
fi

grep -qF 'versions older than v6 are forbidden' <<< "$negative_output"
grep -qF 'actions/checkout@v5' <<< "$negative_output"

echo 'official actions Node 24 regression test OK'
