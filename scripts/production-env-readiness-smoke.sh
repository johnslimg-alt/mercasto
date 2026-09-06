#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="${ENV_FILE:-backend/.env}"
ENV_READINESS_CONTAINER="${ENV_READINESS_CONTAINER:-}"

run_runtime_readiness() {
  local container="$1"
  if [[ ! "$container" =~ ^[A-Za-z0-9_.-]+$ ]]; then
    echo "FAIL: invalid ENV_READINESS_CONTAINER" >&2
    exit 1
  fi
  command -v docker >/dev/null 2>&1 || {
    echo "FAIL: docker is required for runtime readiness mode" >&2
    exit 1
  }
  if [[ "$(docker inspect -f '{{.State.Running}}' "$container" 2>/dev/null || true)" != "true" ]]; then
    echo "FAIL: runtime readiness container is not running: $container" >&2
    exit 1
  fi

  local results failures
  results="$(docker exec "$container" php artisan tinker --execute='
$connection = (string) config("database.default");
$mailer = (string) config("mail.default");
$checks = [
    "APP_KEY" => (string) config("app.key"),
    "APP_URL" => (string) config("app.url"),
    "DB_CONNECTION" => $connection,
    "DB_HOST" => (string) config("database.connections.".$connection.".host"),
    "DB_DATABASE" => (string) config("database.connections.".$connection.".database"),
    "DB_USERNAME" => (string) config("database.connections.".$connection.".username"),
    "DB_PASSWORD" => (string) config("database.connections.".$connection.".password"),
    "REDIS_HOST" => (string) config("database.redis.default.host"),
    "REDIS_PASSWORD" => (string) config("database.redis.default.password"),
    "MAIL_MAILER" => $mailer,
    "MAIL_HOST" => (string) config("mail.mailers.".$mailer.".host"),
    "MAIL_USERNAME" => (string) config("mail.mailers.".$mailer.".username"),
    "MAIL_PASSWORD" => (string) config("mail.mailers.".$mailer.".password"),
    "GOOGLE_CLIENT_ID" => (string) config("services.google.client_id"),
    "GOOGLE_CLIENT_SECRET" => (string) config("services.google.client_secret"),
    "OLLAMA_URL" => (string) config("services.ollama.url"),
    "OLLAMA_MODEL" => (string) config("services.ollama.model"),
    "CLIP_API_KEY" => (string) config("services.clip.api_key"),
    "CLIP_WEBHOOK_SECRET" => (string) config("services.clip.webhook_secret"),
    "SENTRY_LARAVEL_DSN" => (string) config("sentry.dsn"),
];
$placeholderPattern = "/(CHANGE_ME|changeme|example|placeholder|dummy|test-key|xxxxxxxx|your_)/i";
$failures = 0;
$appEnv = (string) config("app.env");
if ($appEnv !== "production") {
    echo "FAIL: APP_ENV must be production".PHP_EOL;
    $failures++;
} else {
    echo "OK: APP_ENV=production".PHP_EOL;
}
if ((bool) config("app.debug")) {
    echo "FAIL: APP_DEBUG must be false".PHP_EOL;
    $failures++;
} else {
    echo "OK: APP_DEBUG=false".PHP_EOL;
}
if (!(bool) config("session.encrypt")) {
    echo "FAIL: SESSION_ENCRYPT effective runtime config must be true".PHP_EOL;
    $failures++;
} else {
    echo "OK: SESSION_ENCRYPT effective runtime config=true".PHP_EOL;
}
foreach ($checks as $key => $value) {
    $value = trim($value);
    if ($value === "") {
        echo "FAIL: ".$key." is empty or missing".PHP_EOL;
        $failures++;
        continue;
    }
    if (preg_match($placeholderPattern, $value)) {
        echo "FAIL: ".$key." appears to contain a placeholder".PHP_EOL;
        $failures++;
        continue;
    }
    echo "OK: ".$key." is set".PHP_EOL;
    echo "OK: ".$key." is not a placeholder".PHP_EOL;
}
$twilioSid = trim((string) config("services.twilio.sid"));
$twilioToken = trim((string) config("services.twilio.token"));
$twilioFrom = trim((string) config("services.twilio.from"));
if ($twilioSid === "" && $twilioToken === "") {
    echo "WARN: Twilio keys are absent; phone OTP must be confirmed as log/fallback before launch".PHP_EOL;
} else {
    foreach (["TWILIO_ACCOUNT_SID" => $twilioSid, "TWILIO_AUTH_TOKEN" => $twilioToken, "TWILIO_FROM" => $twilioFrom] as $key => $value) {
        if ($value === "" || preg_match($placeholderPattern, $value)) {
            echo "FAIL: ".$key." is missing or invalid".PHP_EOL;
            $failures++;
        } else {
            echo "OK: ".$key." is set".PHP_EOL;
        }
    }
}
echo "__FAILURES__=".$failures.PHP_EOL;
')"

  echo "$results" | grep -v '^__FAILURES__=' || true
  failures="$(echo "$results" | sed -n 's/^__FAILURES__=//p' | tail -n1)"
  if [[ ! "$failures" =~ ^[0-9]+$ ]]; then
    echo "production runtime readiness did not return a failure count" >&2
    exit 1
  fi
  if [[ "$failures" -gt 0 ]]; then
    echo "production env readiness smoke FAILED with $failures issue(s)" >&2
    exit 1
  fi
  echo "production env readiness smoke OK"
}

if [[ -n "$ENV_READINESS_CONTAINER" ]]; then
  echo "== Production env readiness smoke =="
  run_runtime_readiness "$ENV_READINESS_CONTAINER"
  exit 0
fi


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

session_encrypt="$(get_env SESSION_ENCRYPT || true)"
if [[ -n "$session_encrypt" && "$session_encrypt" != "true" ]]; then
  echo "FAIL: SESSION_ENCRYPT must be true when explicitly set" >&2
  failures=$((failures + 1))
elif [[ "$session_encrypt" == "true" ]]; then
  echo "OK: SESSION_ENCRYPT=true"
else
  echo "OK: SESSION_ENCRYPT omitted; production config defaults encryption on"
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
  OLLAMA_URL
  OLLAMA_MODEL
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
