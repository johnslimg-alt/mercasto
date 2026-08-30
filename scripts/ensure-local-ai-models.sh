#!/usr/bin/env bash
set -euo pipefail

OLLAMA_CONTAINER="${OLLAMA_CONTAINER:-mercasto_ollama}"
TEXT_MODEL="${MERCASTO_TEXT_MODEL:-qwen3.8:9b-local}"
VISION_MODEL="${MERCASTO_VISION_MODEL:-qwen3-vl:2b-instruct}"
LOCAL_TEXT_MODEL="qwen3.8:9b-local"
LOCAL_TEXT_GGUF="${MERCASTO_TEXT_GGUF:-/models/Qwen3.8-9B-Q4_K_M.gguf}"

if ! docker inspect "$OLLAMA_CONTAINER" >/dev/null 2>&1; then
  echo "Ollama container not found: $OLLAMA_CONTAINER" >&2
  exit 1
fi

TMP_ROOT="${RUNNER_TEMP:-${TMPDIR:-/tmp}}"
MODEL_LIST_FILE="$(mktemp "${TMP_ROOT%/}/mercasto-ollama-models.XXXXXX")"
trap 'rm -f "$MODEL_LIST_FILE"' EXIT

ready=0
for attempt in $(seq 1 30); do
  if docker exec "$OLLAMA_CONTAINER" ollama list >"$MODEL_LIST_FILE" 2>/dev/null; then
    ready=1
    break
  fi
  sleep 2
done
if [ "$ready" -ne 1 ]; then
  echo "Ollama did not become ready for model bootstrap." >&2
  exit 1
fi

has_model() {
  local model="$1"
  docker exec "$OLLAMA_CONTAINER" ollama list \
    | awk 'NR > 1 {print $1}' \
    | grep -Fxq "$model"
}

create_local_text_model() {
  local model="$1"
  docker exec "$OLLAMA_CONTAINER" test -r "$LOCAL_TEXT_GGUF" || {
    echo "Local Qwen3.8 GGUF is unavailable inside Ollama: $LOCAL_TEXT_GGUF" >&2
    exit 1
  }
  docker exec -e MODEL_NAME="$model" -e MODEL_PATH="$LOCAL_TEXT_GGUF" "$OLLAMA_CONTAINER" sh -lc '
    set -eu
    modelfile=/tmp/mercasto-qwen38.Modelfile
    printf "FROM %s\nPARAMETER num_ctx 4096\nPARAMETER temperature 0.2\n" "$MODEL_PATH" > "$modelfile"
    ollama create "$MODEL_NAME" -f "$modelfile"
    rm -f "$modelfile"
  '
}

ensure_model() {
  local model="$1"
  if has_model "$model"; then
    echo "local_ai_model=$model status=installed"
    return 0
  fi

  if [ "$model" = "$LOCAL_TEXT_MODEL" ]; then
    echo "local_ai_model=$model status=creating_from_gguf"
    create_local_text_model "$model"
  else
    echo "local_ai_model=$model status=pulling"
    docker exec "$OLLAMA_CONTAINER" ollama pull "$model"
  fi
  has_model "$model" || {
    echo "Model bootstrap completed but model is still missing: $model" >&2
    exit 1
  }
  echo "local_ai_model=$model status=installed"
}

ensure_model "$TEXT_MODEL"
ensure_model "$VISION_MODEL"

echo "local AI model bootstrap OK"
