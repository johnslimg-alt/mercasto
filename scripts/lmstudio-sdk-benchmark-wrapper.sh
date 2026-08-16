#!/usr/bin/env bash
set -euo pipefail

BOOTSTRAP_DIR="$(mktemp -d /tmp/mercasto-lmstudio-pip.XXXXXX)"
cleanup() {
  rm -rf "$BOOTSTRAP_DIR"
}
trap cleanup EXIT INT TERM

echo '== Bootstrap temporary pip for LM Studio SDK benchmark =='
curl -fsSL --max-time 30 https://bootstrap.pypa.io/pip/pip.pyz -o "$BOOTSTRAP_DIR/pip.pyz"
export PYTHONPATH="$BOOTSTRAP_DIR/pip.pyz${PYTHONPATH:+:$PYTHONPATH}"
python3 -m pip --version

bash scripts/lmstudio-vision-benchmark.sh
