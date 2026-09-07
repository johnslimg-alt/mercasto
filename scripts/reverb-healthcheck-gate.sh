#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE="$ROOT_DIR/docker-compose.yml"

python3 - "$COMPOSE" <<'PY'
from pathlib import Path
import re
import sys

text = Path(sys.argv[1]).read_text()
frontend_match = re.search(r"(?ms)^  mercasto-frontend:\n(.*?)(?=^  mercasto-backend:\n)", text)
if not frontend_match:
    raise SystemExit("mercasto-frontend service block not found")
frontend = frontend_match.group(1)
if "mercasto-reverb:\n        condition: service_healthy" not in frontend:
    raise SystemExit("frontend must wait for healthy mercasto-reverb")

reverb_match = re.search(r"(?ms)^  mercasto-reverb:\n(.*?)(?=^  mercasto-autofill-model:\n)", text)
if not reverb_match:
    raise SystemExit("mercasto-reverb service block not found")
reverb = reverb_match.group(1)

required = [
    "healthcheck:",
    "test: [\"CMD\", \"php\", \"-r\", \"exit(@fsockopen('127.0.0.1', 8082) ? 0 : 1);\"]",
    "interval: 30s",
    "timeout: 5s",
    "retries: 3",
    "start_period: 15s",
]
for item in required:
    if item not in reverb:
        raise SystemExit(f"missing reverb healthcheck invariant: {item}")
if "disable: true" in reverb:
    raise SystemExit("reverb healthcheck must not be disabled")
print("reverb healthcheck gate OK")
PY
