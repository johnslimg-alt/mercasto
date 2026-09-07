#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PYPROJECT="$ROOT_DIR/services/ai-gateway/pyproject.toml"
REQ_FILE="$(mktemp)"
trap 'rm -f "$REQ_FILE"' EXIT

python3 - "$PYPROJECT" "$REQ_FILE" <<'PY'
from pathlib import Path
import sys
import tomllib

pyproject = Path(sys.argv[1])
out = Path(sys.argv[2])
with pyproject.open("rb") as handle:
    data = tomllib.load(handle)

dependencies = data.get("project", {}).get("dependencies", [])
if not dependencies:
    raise SystemExit("AI gateway runtime dependency list is empty")

out.write_text("\n".join(dependencies) + "\n")
PY

python3 -m pip_audit -r "$REQ_FILE" --progress-spinner=off
