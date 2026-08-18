#!/usr/bin/env bash
set -euo pipefail

TMP_SCRIPT="$(mktemp /tmp/mercasto-llamacpp-tolerant.XXXXXX.sh)"
cleanup() {
  rm -f "$TMP_SCRIPT"
}
trap cleanup EXIT INT TERM

cp scripts/llamacpp-vision-benchmark.sh "$TMP_SCRIPT"

python3 - "$TMP_SCRIPT" <<'PY'
from pathlib import Path
import sys

path = Path(sys.argv[1])
text = path.read_text(encoding="utf-8")
old = '  validate_response "$response"\n'
new = r'''  if validate_response "$response"; then
    echo "${label}_moderation_json_valid=true"
  else
    echo "${label}_moderation_json_valid=false"
    python3 - "$response" "$label" <<'PYMETA'
import json, sys
path, label = sys.argv[1], sys.argv[2]
with open(path, encoding="utf-8") as f:
    response = json.load(f)
choice = (response.get("choices") or [{}])[0]
message = choice.get("message") or {}
content = message.get("content") or ""
usage = response.get("usage") or {}
timings = response.get("timings") or {}
print(
    f"{label}_response_meta="
    f"finish_reason={choice.get('finish_reason')} "
    f"content_chars={len(content)} "
    f"prompt_tokens={usage.get('prompt_tokens')} "
    f"completion_tokens={usage.get('completion_tokens')} "
    f"prompt_ms={timings.get('prompt_ms')} "
    f"predicted_ms={timings.get('predicted_ms')} "
    f"predicted_per_second={timings.get('predicted_per_second')}"
)
PYMETA
  fi
'''
if text.count(old) != 1:
    raise SystemExit("Expected exactly one validate_response call to patch")
path.write_text(text.replace(old, new), encoding="utf-8")
PY

bash "$TMP_SCRIPT"
