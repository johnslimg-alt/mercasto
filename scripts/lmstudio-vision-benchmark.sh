#!/usr/bin/env bash
set -euo pipefail

PORT="${LMSTUDIO_BENCHMARK_PORT:-12345}"
BASE_URL="http://127.0.0.1:${PORT}"
MODEL_SOURCE="https://huggingface.co/lmstudio-community/Qwen3-VL-2B-Instruct-GGUF"
MODEL_QUANT="Q4_K_M"
CONTEXT_LENGTH=3072
MAX_TOKENS=220
REQUEST_TIMEOUT=60
SERVER_STARTED=0
DAEMON_STARTED=0
TMP_DIR="$(mktemp -d /tmp/mercasto-lmstudio-benchmark.XXXXXX)"

cleanup() {
  set +e
  if [ "$SERVER_STARTED" -eq 1 ] && command -v lms >/dev/null 2>&1; then
    lms unload --all >/dev/null 2>&1 || true
    lms server stop >/dev/null 2>&1 || true
  fi
  if [ "$DAEMON_STARTED" -eq 1 ] && command -v lms >/dev/null 2>&1; then
    lms daemon down >/dev/null 2>&1 || true
  fi
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT INT TERM

bytes_human() {
  python3 - "$1" <<'PY'
import sys
n = float(sys.argv[1])
for unit in ("B", "KiB", "MiB", "GiB", "TiB"):
    if n < 1024 or unit == "TiB":
        print(f"{n:.2f} {unit}")
        break
    n /= 1024
PY
}

echo '== LM Studio isolated vision benchmark preflight =='
echo "arch=$(uname -m)"
if [ -r /etc/os-release ]; then
  . /etc/os-release
  echo "os=${PRETTY_NAME:-unknown}"
fi
if [ "$(uname -m)" = "x86_64" ] && ! grep -qm1 -w avx2 /proc/cpuinfo; then
  echo 'AVX2 is required by the default LM Studio Linux x64 runtime but is not present.' >&2
  exit 2
fi

disk_available_bytes=$(df -Pk "$HOME" | awk 'NR==2 {printf "%.0f", $4 * 1024}')
mem_available_bytes=$(awk '/^MemAvailable:/ {printf "%.0f", $2 * 1024}' /proc/meminfo)
echo "disk_available=$(bytes_human "$disk_available_bytes")"
echo "memory_available=$(bytes_human "$mem_available_bytes")"
echo 'Existing Ollama container remains untouched during this benchmark.'
docker stats --no-stream --format 'ollama={{.Name}} mem={{.MemUsage}} cpu={{.CPUPerc}}' mercasto_ollama 2>/dev/null || true

if command -v lms >/dev/null 2>&1; then
  existing_daemon=$(lms daemon status --json 2>/dev/null || true)
  if printf '%s' "$existing_daemon" | grep -q '"status"[[:space:]]*:[[:space:]]*"running"'; then
    echo 'A pre-existing LM Studio daemon is running; refusing to disturb it.' >&2
    exit 3
  fi
else
  echo 'Installing official LM Studio headless daemon into the runner user home.'
  curl -fsSL https://lmstudio.ai/install.sh | bash
  export PATH="$HOME/.lmstudio/bin:$PATH"
fi
export PATH="$HOME/.lmstudio/bin:$PATH"
command -v lms >/dev/null 2>&1 || { echo 'lms CLI not found after installation.' >&2; exit 4; }
lms --help | head -20 || true
lms runtime ls || true

echo '== Start private headless daemon/server =='
lms daemon up --json
DAEMON_STARTED=1
lms server start --bind 127.0.0.1 --port "$PORT"
SERVER_STARTED=1
for _ in $(seq 1 30); do
  if curl -fsS --max-time 2 "$BASE_URL/api/v1/models" >/dev/null; then
    break
  fi
  sleep 1
done
curl -fsS --max-time 5 "$BASE_URL/api/v1/models" >/dev/null

echo '== Download Qwen3-VL 2B GGUF Q4_K_M =='
python3 - "$MODEL_SOURCE" "$MODEL_QUANT" >"$TMP_DIR/download-request.json" <<'PY'
import json, sys
print(json.dumps({"model": sys.argv[1], "quantization": sys.argv[2]}))
PY
curl -fsS --max-time 30 \
  -H 'Content-Type: application/json' \
  --data-binary @"$TMP_DIR/download-request.json" \
  "$BASE_URL/api/v1/models/download" >"$TMP_DIR/download.json"
cat "$TMP_DIR/download.json"

download_status=$(python3 - "$TMP_DIR/download.json" <<'PY'
import json, sys
with open(sys.argv[1], encoding="utf-8") as f:
    print(json.load(f).get("status", ""))
PY
)
if [ "$download_status" != "already_downloaded" ] && [ "$download_status" != "completed" ]; then
  job_id=$(python3 - "$TMP_DIR/download.json" <<'PY'
import json, sys
with open(sys.argv[1], encoding="utf-8") as f:
    print(json.load(f).get("job_id", ""))
PY
)
  [ -n "$job_id" ] || { echo 'LM Studio download did not return a job_id.' >&2; exit 5; }
  for _ in $(seq 1 240); do
    curl -fsS --max-time 10 "$BASE_URL/api/v1/models/download/status/$job_id" >"$TMP_DIR/download-status.json"
    download_status=$(python3 - "$TMP_DIR/download-status.json" <<'PY'
import json, sys
with open(sys.argv[1], encoding="utf-8") as f:
    print(json.load(f).get("status", ""))
PY
)
    if [ "$download_status" = "completed" ]; then
      cat "$TMP_DIR/download-status.json"
      break
    fi
    if [ "$download_status" = "failed" ]; then
      cat "$TMP_DIR/download-status.json" >&2
      exit 6
    fi
    sleep 5
  done
  [ "$download_status" = "completed" ] || { echo 'LM Studio model download did not complete inside the benchmark window.' >&2; exit 7; }
fi

curl -fsS --max-time 10 "$BASE_URL/api/v1/models" >"$TMP_DIR/models.json"
MODEL_KEY=$(python3 - "$TMP_DIR/models.json" "$MODEL_QUANT" <<'PY'
import json, sys
with open(sys.argv[1], encoding="utf-8") as f:
    data = json.load(f)
target_quant = sys.argv[2].upper()
models = data.get("models", data.get("data", []))
candidates = []
for model in models:
    haystack = " ".join(str(model.get(k, "")) for k in ("key", "id", "display_name", "displayName")).lower()
    if "qwen3-vl-2b" not in haystack:
        continue
    quant = model.get("quantization")
    if isinstance(quant, dict):
        quant = quant.get("name", "")
    key = model.get("key") or model.get("id") or model.get("modelKey")
    if key:
        candidates.append((str(quant).upper() == target_quant, str(key), model.get("size_bytes", 0), str(quant)))
if not candidates:
    raise SystemExit("Downloaded Qwen3-VL 2B was not found in LM Studio v1 model inventory")
candidates.sort(reverse=True)
exact, key, size_bytes, quant = candidates[0]
print(key)
print(f"inventory_quant={quant} inventory_size_bytes={size_bytes} exact_quant={str(exact).lower()}", file=sys.stderr)
PY
)
echo "model_key=$MODEL_KEY"
lms ls --json || lms ls || true

echo '== Estimate and load model =='
lms load --estimate-only "$MODEL_KEY" --context-length "$CONTEXT_LENGTH" --gpu off || true
python3 - "$MODEL_KEY" "$CONTEXT_LENGTH" >"$TMP_DIR/load-request.json" <<'PY'
import json, sys
print(json.dumps({
    "model": sys.argv[1],
    "context_length": int(sys.argv[2]),
    "flash_attention": True,
    "offload_kv_cache_to_gpu": False,
    "echo_load_config": True,
}))
PY
load_start=$(date +%s%3N)
curl -fsS --max-time 120 \
  -H 'Content-Type: application/json' \
  --data-binary @"$TMP_DIR/load-request.json" \
  "$BASE_URL/api/v1/models/load" >"$TMP_DIR/load.json"
load_end=$(date +%s%3N)
echo "load_elapsed_ms=$((load_end - load_start))"
cat "$TMP_DIR/load.json"
python3 - "$TMP_DIR/load.json" <<'PY'
import json, sys
with open(sys.argv[1], encoding="utf-8") as f:
    data = json.load(f)
if data.get("status") != "loaded" or not data.get("instance_id"):
    raise SystemExit("LM Studio load response is missing loaded status or instance_id")
PY
lms ps --json || lms ps || true
free -h || true
ps -eo pid,rss,%cpu,comm,args --sort=-rss | grep -E 'llmster|llm-engine|llama|LM Studio' | grep -v grep | head -20 || true

echo '== Build synthetic 768x768 moderation image and request =='
python3 - "$TMP_DIR/synthetic.png" <<'PY'
import binascii, struct, sys, zlib
path = sys.argv[1]
w = h = 768
raw = bytearray()
for y in range(h):
    raw.append(0)
    for x in range(w):
        raw.extend(((x * 255) // (w - 1), (y * 255) // (h - 1), ((x // 64 + y // 64) % 2) * 90 + 80))
def chunk(kind, data):
    return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", binascii.crc32(kind + data) & 0xffffffff)
png = b"\x89PNG\r\n\x1a\n"
png += chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0))
png += chunk(b"IDAT", zlib.compress(bytes(raw), 6))
png += chunk(b"IEND", b"")
with open(path, "wb") as f:
    f.write(png)
PY
python3 - "$TMP_DIR/synthetic.png" "$MODEL_KEY" "$MAX_TOKENS" >"$TMP_DIR/vision-request.json" <<'PY'
import base64, json, sys
image_path, model, max_tokens = sys.argv[1], sys.argv[2], int(sys.argv[3])
with open(image_path, "rb") as f:
    image = base64.b64encode(f.read()).decode("ascii")
system = "Eres el moderador privado de imágenes públicas de Mercasto. Responde exclusivamente JSON válido, sin markdown."
prompt = """Analiza la imagen que se quiere publicar en una superficie pública de Mercasto.
Contexto: benchmark sintético sin datos de usuario.

Devuelve exclusivamente JSON válido:
{\"decision\":\"approved|manual_review|rejected\",\"reason\":\"motivo breve en español\",\"confidence\":0.0,\"flags\":[\"...\"]}

Reglas:
- Rechaza desnudez o contenido sexual explícito, explotación, violencia gráfica, armas, drogas ilegales, odio, amenazas, fraude evidente o instrucciones delictivas.
- Rechaza identificaciones, pasaportes, tarjetas bancarias, comprobantes u otros documentos con datos personales sensibles usados como imagen pública.
- Rechaza imágenes claramente diseñadas para suplantar a otra persona o empresa, phishing o engaño.
- Logotipos comerciales normales, retratos apropiados, productos y fotografías de negocio permitidas pueden aprobarse.
- Si existe duda material, usa manual_review. No inventes hechos.
- approved solo con alta confianza."""
print(json.dumps({
    "model": model,
    "messages": [
        {"role": "system", "content": system},
        {"role": "user", "content": [
            {"type": "text", "text": prompt},
            {"type": "image_url", "image_url": {"url": "data:image/png;base64," + image}},
        ]},
    ],
    "temperature": 0.1,
    "max_tokens": max_tokens,
    "stream": False,
}, ensure_ascii=False))
PY

validate_response() {
  local file="$1"
  python3 - "$file" <<'PY'
import json, re, sys
with open(sys.argv[1], encoding="utf-8") as f:
    response = json.load(f)
content = response.get("choices", [{}])[0].get("message", {}).get("content", "")
if not isinstance(content, str) or not content.strip():
    raise SystemExit("LM Studio returned no assistant content")
clean = re.sub(r"^```(?:json)?|```$", "", content.strip(), flags=re.M).strip()
try:
    result = json.loads(clean)
except json.JSONDecodeError:
    match = re.search(r"\{.*\}", clean, flags=re.S)
    if not match:
        raise
    result = json.loads(match.group(0))
if result.get("decision") not in {"approved", "manual_review", "rejected"}:
    raise SystemExit("LM Studio moderation JSON has an invalid decision")
confidence = result.get("confidence")
if not isinstance(confidence, (int, float)):
    raise SystemExit("LM Studio moderation JSON has no numeric confidence")
print("decision=%s confidence=%s" % (result.get("decision"), confidence))
PY
}

run_vision() {
  local label="$1" response="$TMP_DIR/$1.json" start end rc http_code
  start=$(date +%s%3N)
  set +e
  http_code=$(curl -sS --max-time "$REQUEST_TIMEOUT" -o "$response" -w '%{http_code}' \
    -H 'Content-Type: application/json' --data-binary @"$TMP_DIR/vision-request.json" \
    "$BASE_URL/v1/chat/completions")
  rc=$?
  set -e
  end=$(date +%s%3N)
  echo "${label}_elapsed_ms=$((end - start)) http_code=${http_code:-000} curl_rc=$rc"
  if [ "$rc" -ne 0 ] || [ "$http_code" != "200" ]; then
    [ -s "$response" ] && cat "$response" >&2 || true
    return 1
  fi
  validate_response "$response"
}

run_vision vision_first
run_vision vision_warm

echo '== Final runtime snapshot =='
lms ps --json || lms ps || true
free -h || true
ps -eo pid,rss,%cpu,comm,args --sort=-rss | grep -E 'llmster|llm-engine|llama|LM Studio' | grep -v grep | head -20 || true
docker stats --no-stream --format 'ollama={{.Name}} mem={{.MemUsage}} cpu={{.CPUPerc}}' mercasto_ollama 2>/dev/null || true
echo 'LM Studio isolated vision benchmark OK'
