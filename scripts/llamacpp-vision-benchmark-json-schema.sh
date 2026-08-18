#!/usr/bin/env bash
set -euo pipefail

echo "benchmark_mode=schema-constrained-json-v1"

TMP_SCRIPT="$(mktemp /tmp/mercasto-llamacpp-schema.XXXXXX.sh)"
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

request_needle = '    "temperature": 0.1,\n'
request_replacement = r'''    "temperature": 0.1,
    "response_format": {
        "type": "json_object",
        "schema": {
            "type": "object",
            "properties": {
                "decision": {
                    "type": "string",
                    "enum": ["approved", "manual_review", "rejected"],
                },
                "reason": {
                    "type": "string",
                    "maxLength": 160,
                },
                "confidence": {
                    "type": "number",
                    "minimum": 0.0,
                    "maximum": 1.0,
                },
                "flags": {
                    "type": "array",
                    "items": {"type": "string", "maxLength": 64},
                    "maxItems": 8,
                },
            },
            "required": ["decision", "reason", "confidence", "flags"],
            "additionalProperties": False,
        },
    },
'''
if text.count(request_needle) != 1:
    raise SystemExit("Expected exactly one temperature field to patch")
text = text.replace(request_needle, request_replacement)

validate_needle = '  validate_response "$response"\n'
validate_replacement = r'''  if validate_response "$response"; then
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
if text.count(validate_needle) != 1:
    raise SystemExit("Expected exactly one validate_response call to patch")
text = text.replace(validate_needle, validate_replacement)

path.write_text(text, encoding="utf-8")
PY

bash "$TMP_SCRIPT"
