#!/usr/bin/env bash
set -euo pipefail

PORT="${LMSTUDIO_BENCHMARK_PORT:-12345}"
BASE_URL="http://127.0.0.1:${PORT}"
MODEL_SOURCE="https://huggingface.co/lmstudio-community/Qwen3-VL-2B-Instruct-GGUF"
MODEL_QUANT="Q4_K_M"
CONTEXT_LENGTH=3072
MAX_TOKENS=220
REQUEST_TIMEOUT=60
CPU_THREADS="${LMSTUDIO_BENCHMARK_THREADS:-2}"
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
echo "logical_cpu_count=$(nproc) benchmark_cpu_threads=$CPU_THREADS"
if [ -r /etc/os-release ]; then
  . /etc/os-release
  echo "os=${PRETTY_NAME:-unknown}"
fi
if [ "$(uname -m)" = "x86_64" ] && ! grep -qm1 -w avx2 /proc/cpuinfo; then
  echo 'AVX2 is required by the default LM Studio Linux x64 runtime but is not present.' >&2
  exit 2
fi
if ! [[ "$CPU_THREADS" =~ ^[1-9][0-9]*$ ]]; then
  echo 'LMSTUDIO_BENCHMARK_THREADS must be a positive integer.' >&2
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
fi
export PATH="$HOME/.lmstudio/bin:$PATH"
command -v lms >/dev/null 2>&1 || { echo 'lms CLI not found after installation.' >&2; exit 4; }
lms runtime ls || true

echo '== Install official LM Studio Python SDK into temporary benchmark path =='
python3 -m pip --version
python3 -m pip install --disable-pip-version-check --quiet --target "$TMP_DIR/python-packages" 'lmstudio>=1.5,<2'
PYTHONPATH="$TMP_DIR/python-packages" python3 - <<'PY'
import lmstudio
print(f"lmstudio_python_module={lmstudio.__file__}")
PY

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

echo '== Ensure Qwen3-VL 2B GGUF Q4_K_M is downloaded =='
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
    raise SystemExit("Downloaded Qwen3-VL 2B was not found in LM Studio model inventory")
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

echo '== Build synthetic 768x768 moderation image =='
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

echo '== Run SDK vision probe with explicit CPU thread budget =='
set +e
PYTHONPATH="$TMP_DIR/python-packages" timeout "$((REQUEST_TIMEOUT * 2 + 30))" \
  python3 scripts/lmstudio-sdk-vision-probe.py \
    --host "127.0.0.1:$PORT" \
    --model "$MODEL_KEY" \
    --image "$TMP_DIR/synthetic.png" \
    --threads "$CPU_THREADS" \
    --max-tokens "$MAX_TOKENS" \
    --timeout "$REQUEST_TIMEOUT"
probe_rc=$?
set -e

echo '== Final runtime snapshot =='
lms ps --json || lms ps || true
free -h || true
ps -eo pid,rss,%cpu,comm,args --sort=-rss | grep -E 'llmster|llm-engine|llama|LM Studio' | grep -v grep | head -20 || true
docker stats --no-stream --format 'ollama={{.Name}} mem={{.MemUsage}} cpu={{.CPUPerc}}' mercasto_ollama 2>/dev/null || true

if [ "$probe_rc" -ne 0 ]; then
  echo "LM Studio SDK vision benchmark failed rc=$probe_rc" >&2
  exit "$probe_rc"
fi

echo 'LM Studio SDK vision benchmark OK'
