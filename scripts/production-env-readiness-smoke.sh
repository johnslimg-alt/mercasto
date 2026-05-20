#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="${ENV_FILE:-backend/.env}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "FAIL: missing env file at $ENV_FILE" >&2
  exit 1
fi

get_env() {
  local key="$1"
  grep -E "^${key}=" "$ENV_FILE" | tail -n1 | cut -d= -f2- | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//"
}

require_non_empty() {
  local key="$1"
  local value
  value="$(get_env "$key" || true)"
  if [[ -z "$value" ]]; then
    echo "FAIL: $key is empty or missing" >&2
    return 1
  fi
  echo "OK: $key is set"
}

require_not_placeholder() {
  local key="$1"
  local value
  value="$(get_env "$key" || true)"
  if [[ "$value" =~ (CHANGE_ME|changeme|example|placeholder|dummy|test-key|xxxxxxxx|XXXXXXXX|your_|YOUR_) ]]; then
    echo "FAIL: $key appears to contain a placeholder" >&2
    return 1
  fi
  echo "OK: $key is not a placeholder"
}

failures=0

echo "== Production env readiness smoke =="

app_env="$(get_env APP_ENV || true)"
app_debug="$(get_env APP_DEBUG || true)"
if [[ "$app_env" != "production" ]]; then
  echo "FAIL: APP_ENV must be production" >&2
  failures=$((failures + 1))
else
  echo "OK: APP_ENV=production"
fi

if [[ "$app_debug" != "false" ]]; then
  echo "FAIL: APP_DEBUG must be false" >&2
  failures=$((failures + 1))
else
  echo "OK: APP_DEBUG=false"
fi

required_keys=(
  APP_KEY
  APP_URL
  DB_CONNECTION
  DB_HOST
  DB_DATABASE
  DB_USERNAME
  DB_PASSWORD
  REDIS_HOST
  REDIS_PASSWORD
  MAIL_MAILER
  MAIL_HOST
  MAIL_USERNAME
  MAIL_PASSWORD
  GOOGLE_CLIENT_ID
  GOOGLE_CLIENT_SECRET
  DEEPSEEK_API_KEY
  DEEPSEEK_BASE_URL
  CLIP_API_KEY
  CLIP_WEBHOOK_SECRET
  SENTRY_LARAVEL_DSN
)

for key in "${required_keys[@]}"; do
  if ! require_non_empty "$key"; then
    failures=$((failures + 1))
    continue
  fi
  if ! require_not_placeholder "$key"; then
    failures=$((failures + 1))
  fi
done

# Twilio is optional only if phone verification intentionally runs in log/fallback mode.
# Treat partial Twilio configuration as a launch blocker because it creates false confidence.
twilio_sid="$(get_env TWILIO_ACCOUNT_SID || true)"
twilio_token="$(get_env TWILIO_AUTH_TOKEN || true)"
twilio_from="$(get_env TWILIO_FROM || true)"
if [[ -n "$twilio_sid$twilio_token$twilio_from" ]]; then
  for key in TWILIO_ACCOUNT_SID TWILIO_AUTH_TOKEN TWILIO_FROM; do
    if ! require_non_empty "$key" || ! require_not_placeholder "$key"; then
      failures=$((failures + 1))
    fi
  done
else
  echo "WARN: Twilio keys are absent; phone OTP must be confirmed as log/fallback before launch"
fi

if [[ "$failures" -gt 0 ]]; then
  echo "production env readiness smoke FAILED with $failures issue(s)" >&2
  exit 1
fi

echo "production env readiness smoke OK"
