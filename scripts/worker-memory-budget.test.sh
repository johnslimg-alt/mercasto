#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
MEMTOTAL_KIB=$((32*1024*1024)) bash scripts/worker-memory-budget.sh | grep -q 'worker memory budget OK'
if MEMTOTAL_KIB=$((6*1024*1024)) bash scripts/worker-memory-budget.sh >/dev/null 2>&1; then
  echo 'FAIL: undersized host unexpectedly accepted current worker budget' >&2
  exit 1
fi
echo 'worker memory budget fixture tests OK'
