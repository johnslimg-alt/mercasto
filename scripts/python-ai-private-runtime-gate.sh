#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE="$ROOT_DIR/docker-compose.yml"
DEPLOY="$ROOT_DIR/.github/workflows/deploy-selfhosted.yml"
BOOTSTRAP="$ROOT_DIR/scripts/ensure-local-ai-models.sh"
CLIENT="$ROOT_DIR/backend/app/Services/LocalAiClient.php"
SERVICES="$ROOT_DIR/backend/config/services.php"

python3 - "$COMPOSE" "$DEPLOY" "$BOOTSTRAP" "$CLIENT" "$SERVICES" <<'PY'
from pathlib import Path
import re
import sys

compose = Path(sys.argv[1]).read_text()
deploy = Path(sys.argv[2]).read_text()
bootstrap = Path(sys.argv[3]).read_text()
client = Path(sys.argv[4]).read_text()
services = Path(sys.argv[5]).read_text()
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
    "OLLAMA_VISION_MODEL=qwen3-vl:2b-instruct",
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
    'add_service mercasto-ai-gateway',
    'add_up_service ollama',
    'add_up_service mercasto-ai-gateway',
    'bash scripts/ensure-local-ai-models.sh',
    'services/ai-gateway/',
    'docker-compose(\\.override)?\\.yml$',
]
for marker in deploy_required:
    if marker not in deploy:
        raise SystemExit(f"deployment does not carry private AI gateway contract: {marker}")

bootstrap_required = [
    "qwen3.8:9b-local",
    "qwen3-vl:2b-instruct",
    'ollama pull "$model"',
    'grep -Fxq "$model"',
]
for marker in bootstrap_required:
    if marker not in bootstrap:
        raise SystemExit(f"local AI model bootstrap contract missing: {marker}")

ollama_match = re.search(r"(?ms)^  ollama:\n(?P<body>.*?)(?=^  [a-zA-Z0-9_-]+:\n|^volumes:\n)", compose)
if not ollama_match:
    raise SystemExit("ollama service missing")
ollama_body = ollama_match.group("body")
for marker in (
    'cpus: "8.0"',
    'mem_limit: 14g',
    '/opt/reef-models/Qwen3.8-9B-Q4_K_M.gguf:/models/Qwen3.8-9B-Q4_K_M.gguf:ro',
):
    if marker not in ollama_body:
        raise SystemExit(f"Ollama Qwen3.8 runtime contract missing: {marker}")

for marker in (
    'qwen3.8:9b-local',
    'Qwen3.8-9B-Q4_K_M.gguf',
    'ollama create "$MODEL_NAME"',
):
    if marker not in bootstrap:
        raise SystemExit(f"Qwen3.8 bootstrap contract missing: {marker}")

for name, text in (("compose", compose), ("bootstrap", bootstrap), ("client", client), ("services", services)):
    if 'qwen2.5:1.5b' in text:
        raise SystemExit(f"legacy Qwen 1.5B runtime default remains in {name}")
if "'think' => false" not in client:
    raise SystemExit("Local AI client must disable Qwen thinking")

print("python AI private runtime gate OK")
PY
