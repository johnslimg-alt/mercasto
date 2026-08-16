#!/usr/bin/env bash
set -euo pipefail

LLAMA_TAG="b10453"
LLAMA_ARCHIVE="llama-${LLAMA_TAG}-bin-ubuntu-x64.tar.gz"
LLAMA_URL="https://github.com/ggml-org/llama.cpp/releases/download/${LLAMA_TAG}/${LLAMA_ARCHIVE}"
LLAMA_SHA256="550eb155a09c3051c7add5becf6d0badc3a4c33416807985963036b27b859fb4"
PORT="${LLAMACPP_BENCHMARK_PORT:-12346}"
BASE_URL="http://127.0.0.1:${PORT}"
THREADS="${LLAMACPP_BENCHMARK_THREADS:-2}"
CONTEXT_LENGTH=3072
MAX_TOKENS=220
REQUEST_TIMEOUT=90
MODEL_DIR="$HOME/.lmstudio/models/lmstudio-community/Qwen3-VL-2B-Instruct-GGUF"
MODEL="$MODEL_DIR/Qwen3-VL-2B-Instruct-Q4_K_M.gguf"
MMPROJ="$MODEL_DIR/mmproj-Qwen3-VL-2B-Instruct-F16.gguf"
TMP_DIR="$(mktemp -d /tmp/mercasto-llamacpp-benchmark.XXXXXX)"
SERVER_PID=""

cleanup() {
  set +e
  if [ -n "$SERVER_PID" ] && kill -0 "$SERVER_PID" 2>/dev/null; then
    kill "$SERVER_PID" 2>/dev/null || true
    for _ in $(seq 1 20); do
      kill -0 "$SERVER_PID" 2>/dev/null || break
      sleep 0.25
    done
    kill -9 "$SERVER_PID" 2>/dev/null || true
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

echo '== Direct llama.cpp Qwen3-VL 2B benchmark preflight =='
echo "arch=$(uname -m) logical_cpu_count=$(nproc) benchmark_threads=$THREADS"
if [ -r /etc/os-release ]; then
  . /etc/os-release
  echo "os=${PRETTY_NAME:-unknown}"
fi
if [ "$(uname -m)" != "x86_64" ]; then
  echo 'This pinned benchmark asset is for Linux x86_64 only.' >&2
  exit 2
fi
if ! grep -qm1 -w avx2 /proc/cpuinfo; then
  echo 'AVX2 is not present.' >&2
  exit 2
fi
if ! [[ "$THREADS" =~ ^[1-9][0-9]*$ ]]; then
  echo 'LLAMACPP_BENCHMARK_THREADS must be a positive integer.' >&2
  exit 2
fi
[ -f "$MODEL" ] || { echo "Model missing: $MODEL" >&2; exit 3; }
[ -f "$MMPROJ" ] || { echo "Vision projector missing: $MMPROJ" >&2; exit 3; }

disk_available_bytes=$(df -Pk "$HOME" | awk 'NR==2 {printf "%.0f", $4 * 1024}')
mem_available_bytes=$(awk '/^MemAvailable:/ {printf "%.0f", $2 * 1024}' /proc/meminfo)
echo "disk_available=$(bytes_human "$disk_available_bytes")"
echo "memory_available=$(bytes_human "$mem_available_bytes")"
echo "model_bytes=$(stat -c %s "$MODEL") mmproj_bytes=$(stat -c %s "$MMPROJ")"
docker stats --no-stream --format 'ollama={{.Name}} mem={{.MemUsage}} cpu={{.CPUPerc}}' mercasto_ollama 2>/dev/null || true

echo "== Download pinned official llama.cpp ${LLAMA_TAG} Ubuntu x64 CPU release =="
curl -fsSL --max-time 60 "$LLAMA_URL" -o "$TMP_DIR/$LLAMA_ARCHIVE"
echo "$LLAMA_SHA256  $TMP_DIR/$LLAMA_ARCHIVE" | sha256sum -c -
tar -xzf "$TMP_DIR/$LLAMA_ARCHIVE" -C "$TMP_DIR"
LLAMA_SERVER=$(find "$TMP_DIR" -type f -name llama-server -perm -u+x | head -1)
[ -n "$LLAMA_SERVER" ] || { echo 'llama-server binary not found in release archive.' >&2; exit 4; }
"$LLAMA_SERVER" --version

echo '== Start direct llama.cpp server: threads=2 parallel=1 localhost only =='
server_start=$(date +%s%3N)
"$LLAMA_SERVER" \
  --model "$MODEL" \
  --mmproj "$MMPROJ" \
  --host 127.0.0.1 \
  --port "$PORT" \
  --ctx-size "$CONTEXT_LENGTH" \
  --threads "$THREADS" \
  --threads-batch "$THREADS" \
  --parallel 1 \
  --batch-size 512 \
  --ubatch-size 512 \
  --flash-attn on \
  --jinja \
  --no-webui \
  >"$TMP_DIR/server.log" 2>&1 &
SERVER_PID=$!

ready=false
for _ in $(seq 1 180); do
  if ! kill -0 "$SERVER_PID" 2>/dev/null; then
    echo 'llama-server exited before readiness.' >&2
    tail -120 "$TMP_DIR/server.log" >&2 || true
    exit 5
  fi
  if curl -fsS --max-time 2 "$BASE_URL/health" >"$TMP_DIR/health.json" 2>/dev/null; then
    if python3 - "$TMP_DIR/health.json" <<'PY'
import json, sys
with open(sys.argv[1], encoding="utf-8") as f:
    data=json.load(f)
raise SystemExit(0 if data.get("status") == "ok" else 1)
PY
    then
      ready=true
      break
    fi
  fi
  sleep 1
done
server_ready=$(date +%s%3N)
[ "$ready" = true ] || { echo 'llama-server did not become ready.' >&2; tail -120 "$TMP_DIR/server.log" >&2 || true; exit 6; }
echo "server_ready_elapsed_ms=$((server_ready - server_start))"

echo '== Server runtime snapshot =='
ps -o pid,rss,%cpu,comm,args -p "$SERVER_PID" || true
free -h || true

echo '== Build synthetic 768x768 moderation image and OpenAI-compatible request =='
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
python3 - "$TMP_DIR/synthetic.png" "$MAX_TOKENS" >"$TMP_DIR/request.json" <<'PY'
import base64, json, sys
image_path, max_tokens = sys.argv[1], int(sys.argv[2])
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
    "model": "qwen3-vl-2b-instruct",
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
    response=json.load(f)
content=response.get("choices", [{}])[0].get("message", {}).get("content", "")
if not isinstance(content, str) or not content.strip():
    raise SystemExit("no assistant content")
clean=re.sub(r"^```(?:json)?\s*|\s*```$", "", content.strip(), flags=re.I)
try:
    result=json.loads(clean)
except json.JSONDecodeError:
    m=re.search(r"\{.*\}", clean, flags=re.S)
    if not m:
        raise
    result=json.loads(m.group(0))
if result.get("decision") not in {"approved", "manual_review", "rejected"}:
    raise SystemExit("invalid moderation decision")
if not isinstance(result.get("confidence"), (int, float)):
    raise SystemExit("missing numeric confidence")
usage=response.get("usage", {})
timings=response.get("timings", {})
print("decision=%s confidence=%s prompt_tokens=%s completion_tokens=%s prompt_ms=%s predicted_ms=%s predicted_per_second=%s" % (
    result.get("decision"), result.get("confidence"), usage.get("prompt_tokens"), usage.get("completion_tokens"),
    timings.get("prompt_ms"), timings.get("predicted_ms"), timings.get("predicted_per_second")))
PY
}

run_vision() {
  local label="$1" response="$TMP_DIR/$1.json" start end rc http_code
  start=$(date +%s%3N)
  set +e
  http_code=$(curl -sS --max-time "$REQUEST_TIMEOUT" -o "$response" -w '%{http_code}' \
    -H 'Content-Type: application/json' \
    --data-binary @"$TMP_DIR/request.json" \
    "$BASE_URL/v1/chat/completions")
  rc=$?
  set -e
  end=$(date +%s%3N)
  echo "${label}_elapsed_ms=$((end - start)) http_code=${http_code:-000} curl_rc=$rc"
  if [ "$rc" -ne 0 ] || [ "$http_code" != "200" ]; then
    [ -s "$response" ] && cat "$response" >&2 || true
    tail -100 "$TMP_DIR/server.log" >&2 || true
    return 1
  fi
  validate_response "$response"
}

run_vision vision_first
run_vision vision_warm

echo '== Final direct llama.cpp snapshot =='
ps -o pid,rss,%cpu,comm,args -p "$SERVER_PID" || true
free -h || true
docker stats --no-stream --format 'ollama={{.Name}} mem={{.MemUsage}} cpu={{.CPUPerc}}' mercasto_ollama 2>/dev/null || true
echo '== Selected llama.cpp server timing lines =='
grep -E 'load time|prompt eval time|eval time|n_threads|n_slots|warmup' "$TMP_DIR/server.log" | tail -80 || true
echo 'Direct llama.cpp Qwen3-VL 2B benchmark OK'
