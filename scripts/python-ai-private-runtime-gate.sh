#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE="$ROOT_DIR/docker-compose.yml"
DEPLOY="$ROOT_DIR/.github/workflows/deploy-selfhosted.yml"
BOOTSTRAP="$ROOT_DIR/scripts/ensure-local-ai-models.sh"
CLIENT="$ROOT_DIR/backend/app/Services/LocalAiClient.php"
SERVICES="$ROOT_DIR/backend/config/services.php"
GATEWAY_CLIENT="$ROOT_DIR/backend/app/Services/AiModerationGatewayClient.php"
MODERATION_JOB="$ROOT_DIR/backend/app/Jobs/ModerateAdWithAI.php"
ROTATE="$ROOT_DIR/scripts/rotate-internal-secrets.sh"

python3 - "$COMPOSE" "$DEPLOY" "$BOOTSTRAP" "$CLIENT" "$SERVICES" "$GATEWAY_CLIENT" "$MODERATION_JOB" "$ROTATE" <<'PY'
from pathlib import Path
import re
import sys

compose = Path(sys.argv[1]).read_text()
deploy = Path(sys.argv[2]).read_text()
bootstrap = Path(sys.argv[3]).read_text()
client = Path(sys.argv[4]).read_text()
services = Path(sys.argv[5]).read_text()
gateway_client = Path(sys.argv[6]).read_text()
moderation_job = Path(sys.argv[7]).read_text()
rotate = Path(sys.argv[8]).read_text()
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
    "http://127.0.0.1:8080/health",
    "cpus: '0.50'",
    "memory: 256M",
]
for marker in required:
    if marker not in body:
        raise SystemExit(f"missing private AI runtime contract: {marker}")

for forbidden in ("ports:", "DB_HOST=", "DB_PASSWORD=", "REDIS_HOST=", "REDIS_PASSWORD="):
    if forbidden in body:
        raise SystemExit(f"forbidden private AI runtime setting: {forbidden}")

for service_name in ("mercasto-backend", "mercasto-moderation-worker"):
    service_match = re.search(
        rf"(?ms)^  {re.escape(service_name)}:\n(?P<body>.*?)(?=^  [a-zA-Z0-9_-]+:\n|^volumes:\n)",
        compose,
    )
    if not service_match:
        raise SystemExit(f"{service_name} service missing")
    service_body = service_match.group("body")
    for service_marker in (
        "AI_MODERATION_GATEWAY_URL=http://mercasto-ai-gateway:8080",
        "AI_MODERATION_GATEWAY_TIMEOUT=${AI_MODERATION_GATEWAY_TIMEOUT:-150}",
        "MERCASTO_AI_INTERNAL_TOKEN=${MERCASTO_AI_INTERNAL_TOKEN:-}",
    ):
        if service_marker not in service_body:
            raise SystemExit(f"{service_name} missing AI gateway wiring: {service_marker}")
    if service_name == "mercasto-worker" and "mercasto-ai-gateway:\n        condition: service_healthy" not in service_body:
        raise SystemExit("worker must wait for a healthy private AI gateway")

general_worker_match = re.search(r"(?ms)^  mercasto-worker:\n(?P<body>.*?)(?=^  [a-zA-Z0-9_-]+:\n|^volumes:\n)", compose)
if not general_worker_match:
    raise SystemExit("mercasto-worker service missing")
general_worker = general_worker_match.group("body")
if "mercasto-ai-gateway" in general_worker or "AI_MODERATION_GATEWAY_URL" in general_worker:
    raise SystemExit("general worker must stay independent of private AI health")
moderation_worker = re.search(r"(?ms)^  mercasto-moderation-worker:\n(?P<body>.*?)(?=^  [a-zA-Z0-9_-]+:\n|^volumes:\n)", compose)
if not moderation_worker or "--queue=ai-moderation" not in moderation_worker.group("body") or "condition: service_healthy" not in moderation_worker.group("body"):
    raise SystemExit("dedicated AI moderation worker contract missing")

if "./backend" in body or "/var/www" in body:
    raise SystemExit("Python AI gateway must not mount Laravel source/storage")

deploy_required = [
    'add_service mercasto-ai-gateway',
    'add_up_service ollama',
    'add_up_service mercasto-ai-gateway',
    'bash scripts/ensure-local-ai-models.sh',
    'services/ai-gateway/',
    'docker-compose(\\.override)?\\.yml$',
    'COMPOSE_ENV_FILE="/var/www/mercasto/.env"',
    'Verify private AI deployment credential',
]
for marker in deploy_required:
    if marker not in deploy:
        raise SystemExit(f"deployment does not carry private AI gateway contract: {marker}")

stop_index = deploy.find('stop mercasto-moderation-worker')
gateway_up_index = deploy.find('up -d --no-build --no-deps $OTHER_UP_SERVICES')
worker_up_index = deploy.find('--force-recreate --renew-anon-volumes mercasto-moderation-worker')
if min(stop_index, gateway_up_index, worker_up_index) < 0 or not stop_index < gateway_up_index < worker_up_index:
    raise SystemExit("deployment must quiesce moderation, update gateway services, then start the worker with dependencies")
worker_start = deploy[max(0, worker_up_index - 180):worker_up_index + 120]
if '--no-deps' in worker_start:
    raise SystemExit("moderation worker restart must allow Compose service_healthy dependencies")

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

for marker in (
    "X-Mercasto-Internal-Token",
    "/v1/moderation/listing",
    "mercasto-ai-gateway",
    "private Mercasto runtime",
    "($data['authoritative'] ?? null) !== false",
    "($data['rollout_mode'] ?? null) !== 'shadow_assist'",
    "config('services.ai_moderation_gateway.timeout', 150)",
    "'structured_context' => $contextForGateway",
):
    if marker not in gateway_client:
        raise SystemExit(f"Laravel AI moderation gateway contract missing: {marker}")

for marker in (
    "AiModerationGatewayClient $aiGateway",
    "$aiGateway->moderateListing",
    "structuredContext: [",
    "policySignals: $canonicalPolicySignals",
    "'adapter' => 'python_gateway'",
):
    if marker not in moderation_job:
        raise SystemExit(f"listing moderation does not use Python gateway boundary: {marker}")
for forbidden in ("LocalAiClient $ai", "$ai->chatPro", "/api/chat"):
    if forbidden in moderation_job:
        raise SystemExit(f"listing moderation direct Ollama bypass remains: {forbidden}")

for marker in (
    "getQueue() !== 'ai-moderation'",
    "pushRaw($this->job->getRawBody(), 'ai-moderation')",
    "microtime(true) - $attemptStartedAt",
):
    if marker not in moderation_job:
        raise SystemExit(f"moderation rollout compatibility contract missing: {marker}")

if rotate.count("mercasto-moderation-worker") < 2 or "mercasto_moderation_worker_container" not in rotate:
    raise SystemExit("secret rotation must recreate, roll back, and health-check the moderation worker")

print("python AI private runtime gate OK")
PY
