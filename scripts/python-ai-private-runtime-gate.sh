#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE="$ROOT_DIR/docker-compose.yml"
DEPLOY="$ROOT_DIR/.github/workflows/deploy-selfhosted.yml"

python3 - "$COMPOSE" "$DEPLOY" <<'PY'
from pathlib import Path
import re
import sys

compose = Path(sys.argv[1]).read_text()
deploy = Path(sys.argv[2]).read_text()
match = re.search(r"(?ms)^  mercasto-ai-gateway:\n(?P<body>.*?)(?=^  [a-zA-Z0-9_-]+:\n|^volumes:\n)", compose)
if not match:
    raise SystemExit("mercasto-ai-gateway service missing")
body = match.group("body")

required = [
    "context: ./services/ai-gateway",
    "dockerfile: Dockerfile",
    "container_name: mercasto_ai_gateway",
    'expose:\n      - "8080"',
    "OLLAMA_BASE_URL=http://ollama:11434",
    "OLLAMA_VISION_MODEL=${OLLAMA_CHAT_MODEL:-qwen3-vl:4b-instruct}",
    "MERCASTO_AI_INTERNAL_TOKEN=${MERCASTO_AI_INTERNAL_TOKEN:-}",
    "ollama:\n        condition: service_healthy",
    "cpus: '0.50'",
    "memory: 256M",
    "autoheal=true",
]
for marker in required:
    if marker not in body:
        raise SystemExit(f"missing private AI runtime contract: {marker}")

for forbidden in ("ports:", "DB_HOST=", "DB_PASSWORD=", "REDIS_HOST=", "REDIS_PASSWORD="):
    if forbidden in body:
        raise SystemExit(f"forbidden private AI runtime setting: {forbidden}")

if "./backend" in body or "/var/www" in body:
    raise SystemExit("Python AI gateway must not mount Laravel source/storage")

deploy_required = [
    'BUILD_SERVICES="mercasto-frontend mercasto-backend mercasto-ai-gateway"',
    'UP_SERVICES="mercasto-frontend mercasto-backend mercasto-worker mercasto-scheduler mercasto-reverb ollama mercasto-ai-gateway"',
    'add_service mercasto-ai-gateway',
    'UP_SERVICES="$UP_SERVICES ollama mercasto-ai-gateway"',
    'services/ai-gateway/',
    'docker-compose(\\.override)?\\.yml$',
]
for marker in deploy_required:
    if marker not in deploy:
        raise SystemExit(f"deployment does not carry private AI gateway contract: {marker}")

print("python AI private runtime gate OK")
PY
