#!/usr/bin/env bash
set -euo pipefail

DOC="docs/ai-description-editor-gate.md"
PACKAGE="package.json"

if [ ! -f "${DOC}" ]; then
  echo "Missing ${DOC}" >&2
  exit 1
fi

if ! grep -Fq 'qwen2.5-7b-instruct' "${DOC}"; then
  echo "AI text gate must set qwen2.5-7b-instruct as default" >&2
  exit 1
fi

if ! grep -Eiq 'paid.*not.*default|not.*paid.*default' "${DOC}"; then
  echo "AI text gate must prevent paid models from becoming the default high-volume path" >&2
  exit 1
fi

if ! grep -Eiq 'configurable|environment|without code changes' "${DOC}"; then
  echo "AI provider/model must be configurable without code changes" >&2
  exit 1
fi

if ! grep -Eiq 'Spanish|Espa' "${DOC}"; then
  echo "AI text gate must require Spanish output quality checks" >&2
  exit 1
fi

if [ -f "${PACKAGE}" ] && grep -Eq '"(openai|deepseek|gpt-4o|gpt-4\.1|gpt-5)' "${PACKAGE}"; then
  echo "Do not add paid AI SDK/model dependencies as the default description editor path" >&2
  exit 1
fi

echo "AI description editor gate OK"
