#!/usr/bin/env bash
set -euo pipefail

ROUTES="backend/routes/api.php"
SERVICES="backend/config/services.php"
DEAD_CONTROLLER="backend/app/Http/Controllers/Api/AiController.php"
DESCRIPTION="backend/app/Http/Controllers/Api/AiDescriptionController.php"

echo "== Backend AI provider boundary gate =="

test ! -e "$DEAD_CONTROLLER"
test -f "$DESCRIPTION"
grep -qF 'AiDescriptionController::class' "$ROUTES"
EXTERNAL_AI_PATTERN='generativelanguage[.]googleapis[.]com|api[.]deepseek[.]com|api[.]anthropic[.]com|api[.]groq[.]com|api[.]openai[.]com|GEMINI_API_KEY|DEEPSEEK_API_KEY|ANTHROPIC_API_KEY|GROQ_API_KEY|OPENAI_API_KEY|services[.](gemini|deepseek|anthropic|groq|openai)'
if grep -RInE --include='*.php' --include='*.js' --include='*.mjs' --include='*.py' "$EXTERNAL_AI_PATTERN" backend/app backend/config backend/routes server ops/agents 2>/dev/null; then
  echo "FAIL: external generative-AI runtime/config returned; production must remain local Ollama/Qwen only" >&2
  exit 1
fi
for provider in gemini deepseek anthropic groq openai; do
  if grep -qF "'$provider' =>" "$SERVICES"; then
    echo "FAIL: external AI service config returned for $provider" >&2
    exit 1
  fi
done

echo "backend AI provider boundary gate OK"
