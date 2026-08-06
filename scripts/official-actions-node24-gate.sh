#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "== Official GitHub Actions Node 24 gate =="

workflow_files="$(find .github/workflows -type f \( -name '*.yml' -o -name '*.yaml' \) -print | sort)"
if [[ -z "$workflow_files" ]]; then
  echo 'no workflow files found' >&2
  exit 1
fi

legacy="$(printf '%s\n' "$workflow_files" | xargs grep -nHE 'uses:[[:space:]]*actions/(checkout|setup-node)@v([1-5])([^0-9]|$)' 2>/dev/null || true)"
if [[ -n "$legacy" ]]; then
  echo 'checkout/setup-node versions older than v6 are forbidden:' >&2
  printf '%s\n' "$legacy" >&2
  exit 1
fi

checkout_count="$(printf '%s\n' "$workflow_files" | xargs grep -hE 'uses:[[:space:]]*actions/checkout@v[0-9]+' | wc -l | tr -d ' ')"
setup_node_count="$(printf '%s\n' "$workflow_files" | xargs grep -hE 'uses:[[:space:]]*actions/setup-node@v[0-9]+' | wc -l | tr -d ' ')"

(( checkout_count > 0 )) || { echo 'actions/checkout usage missing' >&2; exit 1; }
(( setup_node_count > 0 )) || { echo 'actions/setup-node usage missing' >&2; exit 1; }

echo "official actions Node 24 gate OK: checkout=${checkout_count}, setup-node=${setup_node_count}"
