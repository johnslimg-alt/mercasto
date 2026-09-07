#!/usr/bin/env bash
set -euo pipefail

BUGSINK_CONTAINER="${BUGSINK_CONTAINER:-mercasto_bugsink}"
BACKEND_CONTAINER="${BACKEND_CONTAINER:-mercasto_backend_container}"
DEPLOY_SHA="${DEPLOY_SHA:-unknown}"
RUNTIMES=(
  mercasto_backend_container
  mercasto_worker_container
  mercasto_moderation_worker_container
  mercasto_scheduler_container
  mercasto_reverb_container
)

tmp_env="$(mktemp)"
trap 'rm -f "$tmp_env"' EXIT

healthy=0
for _ in $(seq 1 30); do
  status="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{end}}' "$BUGSINK_CONTAINER" 2>/dev/null || true)"
  if [ "$status" = "healthy" ]; then
    healthy=1
    break
  fi
  sleep 2
done

if [ "$healthy" -ne 1 ]; then
  echo "FAIL: Bugsink did not become healthy" >&2
  exit 1
fi
bootstrap_py=$(cat <<'PY'
import json
import os
from urllib.parse import quote

from django.contrib.auth import get_user_model
from alerts.models import MessagingServiceConfig
from teams.models import Team, TeamMembership, TeamRole
from projects.models import Project, ProjectMembership, ProjectRole

email = os.environ["BUGSINK_ADMIN_EMAIL"]
token = os.environ["BUGSINK_ALERT_TOKEN"]
User = get_user_model()
user = User.objects.filter(username=email).first()
if user is None:
    user = User.objects.filter(is_superuser=True).order_by("id").first()
if user is None:
    raise RuntimeError("Bugsink admin user is missing")
if user.username != email or user.email != email or user.send_email_alerts:
    user.username = email
    user.email = email
    user.send_email_alerts = False
    user.save(update_fields=["username", "email", "send_email_alerts"])

team, _ = Team.objects.get_or_create(name="Mercasto")
TeamMembership.objects.update_or_create(
    team=team, user=user,
    defaults={"accepted": True, "role": TeamRole.ADMIN, "send_email_alerts": False},
)
project, _ = Project.objects.get_or_create(team=team, name="Backend Production")
ProjectMembership.objects.update_or_create(
    project=project, user=user,
    defaults={"accepted": True, "role": ProjectRole.ADMIN, "send_email_alerts": False},
)

webhook_url = (
    "http://mercasto-frontend:8081/api/internal/runtime-alerts?token="
    + quote(token, safe="")
)
MessagingServiceConfig.objects.update_or_create(
    project=project,
    display_name="Mercasto internal runtime alert mail",
    defaults={
        "kind": "custom",
        "config": json.dumps({"webhook_url": webhook_url}, separators=(",", ":")),
    },
)

project.alert_on_new_issue = True
project.alert_on_regression = True
project.alert_on_unmute = True
project.save(update_fields=["alert_on_new_issue", "alert_on_regression", "alert_on_unmute"])
print(project.dsn)
PY
)

dsn="$(docker exec "$BUGSINK_CONTAINER" bugsink-manage shell -c "$bootstrap_py" | tail -n 1)"
python3 - "$dsn" <<'PY'
import sys
from urllib.parse import urlparse

url = urlparse(sys.argv[1])
if url.scheme != "https" or url.hostname != "mercasto.com":
    raise SystemExit("invalid Bugsink project DSN origin")
if not url.path.startswith("/ops/errors/"):
    raise SystemExit("invalid Bugsink project DSN path")
if not url.username:
    raise SystemExit("Bugsink project DSN has no public key")
PY

docker exec "$BACKEND_CONTAINER" cat /var/www/.env > "$tmp_env"
python3 - "$tmp_env" "$dsn" "$DEPLOY_SHA" <<'PY'
import sys
from pathlib import Path

path = Path(sys.argv[1])
values = {
    "SENTRY_LARAVEL_DSN": sys.argv[2],
    "SENTRY_ENVIRONMENT": "production",
    "SENTRY_RELEASE": sys.argv[3],
    "SENTRY_TRACES_SAMPLE_RATE": "0",
    "SENTRY_PROFILES_SAMPLE_RATE": "0",
    "SENTRY_SEND_DEFAULT_PII": "false",
}
lines = path.read_text(encoding="utf-8").splitlines()
seen = set()
out = []
for line in lines:
    key = line.split("=", 1)[0] if "=" in line else ""
    if key in values:
        out.append(f"{key}={values[key]}")
        seen.add(key)
    else:
        out.append(line)
for key, value in values.items():
    if key not in seen:
        out.append(f"{key}={value}")
path.write_text("\n".join(out) + "\n", encoding="utf-8")
PY

cat "$tmp_env" | docker exec -i "$BACKEND_CONTAINER" sh -lc 'umask 077; cat > /var/www/.env'
for container in "${RUNTIMES[@]}"; do
  docker exec "$container" /var/www/docker/refresh-runtime-env.sh >/dev/null
done
docker exec "$BACKEND_CONTAINER" php artisan config:clear >/dev/null

token_hash="$(docker exec "$BUGSINK_CONTAINER" sh -lc 'printf %s "$BUGSINK_ALERT_TOKEN" | sha256sum' | awk '{print $1}')"
verification_hash="$(printf '%s|%s' "$dsn" "$token_hash" | sha256sum | awk '{print $1}')"
verified_hash="$(docker exec "$BUGSINK_CONTAINER" sh -lc 'cat /data/mercasto-runtime-alerts.verified 2>/dev/null || true')"
if [ "$verified_hash" != "$verification_hash" ]; then
  if ! [[ "$DEPLOY_SHA" =~ ^[0-9a-f]{40}$ ]]; then
    echo "FAIL: runtime alert verification requires an exact deploy SHA" >&2
    exit 1
  fi

  before_events="$(docker exec -e MERCASTO_VERIFY_RELEASE="$DEPLOY_SHA" "$BUGSINK_CONTAINER" bugsink-manage shell -c 'import os; from events.models import Event; print(Event.objects.filter(release=os.environ["MERCASTO_VERIFY_RELEASE"]).count())' | tail -n 1)"
  before_deliveries="$(docker exec "$BACKEND_CONTAINER" sh -lc "grep -c 'runtime error alert delivered' /var/www/storage/logs/laravel.log 2>/dev/null || true")"

  docker exec "$BACKEND_CONTAINER" php artisan sentry:test >/dev/null 2>&1

  after_events="$before_events"
  test_issue_id=""
  for _ in $(seq 1 30); do
    after_events="$(docker exec -e MERCASTO_VERIFY_RELEASE="$DEPLOY_SHA" "$BUGSINK_CONTAINER" bugsink-manage shell -c 'import os; from events.models import Event; print(Event.objects.filter(release=os.environ["MERCASTO_VERIFY_RELEASE"]).count())' | tail -n 1)"
    if [ "$after_events" -gt "$before_events" ]; then
      test_issue_id="$(docker exec -e MERCASTO_VERIFY_RELEASE="$DEPLOY_SHA" "$BUGSINK_CONTAINER" bugsink-manage shell -c 'import os; from events.models import Event; print(Event.objects.filter(release=os.environ["MERCASTO_VERIFY_RELEASE"]).order_by("-ingested_at").values_list("issue_id", flat=True).first() or "")' | tail -n 1)"
      break
    fi
    sleep 1
  done

  if [ "$after_events" -le "$before_events" ] || [ -z "$test_issue_id" ]; then
    echo "FAIL: Sentry SDK test event did not reach Bugsink" >&2
    exit 1
  fi

  after_deliveries="$before_deliveries"
  for _ in $(seq 1 15); do
    after_deliveries="$(docker exec "$BACKEND_CONTAINER" sh -lc "grep -c 'runtime error alert delivered' /var/www/storage/logs/laravel.log 2>/dev/null || true")"
    if [ "$after_deliveries" -gt "$before_deliveries" ]; then
      break
    fi
    sleep 1
  done

  if [ "$after_deliveries" -le "$before_deliveries" ]; then
    webhook_failure="$(docker exec "$BUGSINK_CONTAINER" bugsink-manage shell -c 'from alerts.models import MessagingServiceConfig; c=MessagingServiceConfig.objects.get(display_name="Mercasto internal runtime alert mail"); print(1 if c.last_failure_timestamp else 0)' | tail -n 1)"
    if [ "$webhook_failure" = "1" ]; then
      echo "Retrying the failed Bugsink NEW alert for this deploy verification issue."
      docker exec -e MERCASTO_VERIFY_ISSUE="$test_issue_id" "$BUGSINK_CONTAINER" bugsink-manage shell -c 'import os; from alerts.tasks import send_new_issue_alert; send_new_issue_alert.delay(os.environ["MERCASTO_VERIFY_ISSUE"])' >/dev/null
      for _ in $(seq 1 30); do
        after_deliveries="$(docker exec "$BACKEND_CONTAINER" sh -lc "grep -c 'runtime error alert delivered' /var/www/storage/logs/laravel.log 2>/dev/null || true")"
        if [ "$after_deliveries" -gt "$before_deliveries" ]; then
          break
        fi
        sleep 1
      done
    fi
  fi

  if [ "$after_deliveries" -le "$before_deliveries" ]; then
    echo "FAIL: Bugsink alert did not complete Laravel mail delivery" >&2
    exit 1
  fi

  webhook_failure="$(docker exec "$BUGSINK_CONTAINER" bugsink-manage shell -c 'from alerts.models import MessagingServiceConfig; c=MessagingServiceConfig.objects.get(display_name="Mercasto internal runtime alert mail"); print(1 if c.last_failure_timestamp else 0)' | tail -n 1)"
  if [ "$webhook_failure" != "0" ]; then
    echo "FAIL: Bugsink custom alert backend reports a delivery failure" >&2
    exit 1
  fi

  docker exec "$BUGSINK_CONTAINER" sh -lc "umask 077; printf '%s\\n' '$verification_hash' > /data/mercasto-runtime-alerts.verified"
fi

echo "Bugsink runtime alert bootstrap OK"
