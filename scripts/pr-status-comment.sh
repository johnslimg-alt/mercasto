#!/usr/bin/env bash
set -euo pipefail

: "${GITHUB_TOKEN:?}"
: "${GITHUB_REPOSITORY:?}"
: "${GITHUB_SHA:?}"

api() {
  curl -fsS \
    -H "Authorization: Bearer ${GITHUB_TOKEN}" \
    -H "Accept: application/vnd.github+json" \
    -H "X-GitHub-Api-Version: 2022-11-28" \
    "$@"
}

pr_number="${PR_NUMBER:-}"
if [ -z "$pr_number" ]; then
  pr_number="$(api "https://api.github.com/repos/${GITHUB_REPOSITORY}/commits/${GITHUB_SHA}/pulls" | python3 -c 'import json,sys; data=json.load(sys.stdin); print(data[0]["number"] if data else "")')"
fi
if [ -z "$pr_number" ]; then
  echo "No pull request for ${GITHUB_SHA}."
  exit 0
fi

tmp="${RUNNER_TEMP:-/tmp}"
api "https://api.github.com/repos/${GITHUB_REPOSITORY}/commits/${GITHUB_SHA}/check-runs?per_page=100" > "$tmp/pr-status-checks.json"
api "https://api.github.com/repos/${GITHUB_REPOSITORY}/issues/${pr_number}/comments?per_page=100" > "$tmp/pr-status-comments.json"

PR_NUMBER="$pr_number" python3 - "$tmp" << 'PY'
import json, os, sys
from pathlib import Path

root = Path(sys.argv[1])
checks = json.loads((root / "pr-status-checks.json").read_text())
comments = json.loads((root / "pr-status-comments.json").read_text())
marker = "<!-- mercasto-pr-status -->"
best = {}
for run in checks.get("check_runs", []):
    previous = best.get(run["name"])
    if previous is None or (run.get("started_at") or "") >= (previous.get("started_at") or ""):
        best[run["name"]] = run

rank = {"failure": 0, "timed_out": 1, "cancelled": 2, "in_progress": 3, "queued": 4, "success": 5, "skipped": 6, "neutral": 7}
rows = sorted(best.values(), key=lambda run: (rank.get(run.get("conclusion") or run.get("status"), 9), run["name"].lower()))
failed = sum(run.get("conclusion") in {"failure", "timed_out", "cancelled"} for run in rows)
pending = sum(run.get("status") != "completed" for run in rows)
if failed:
    title = "Проверки упали"
elif pending:
    title = "Проверки ещё идут"
else:
    title = "Проверки прошли"

labels = {
    "success": "прошла",
    "failure": "упала",
    "cancelled": "отменена",
    "skipped": "пропущена",
    "timed_out": "таймаут",
    "neutral": "нейтрально",
}
lines = [marker, f"## {title}", "", "| Проверка | Статус |", "|---|---|"]
for run in rows:
    state = "идёт" if run.get("status") != "completed" else labels.get(run.get("conclusion"), run.get("conclusion") or "")
    name = run["name"].replace("|", "/")
    url = run.get("html_url") or ""
    lines.append(f"| [{name}]({url}) | {state} |")
lines += ["", f"Коммит `{os.environ['GITHUB_SHA'][:7]}`."]
body = "\n".join(lines) + "\n"
(root / "pr-status-payload.json").write_text(json.dumps({"body": body}))
comment_id = next((str(comment["id"]) for comment in comments if marker in (comment.get("body") or "")), "")
(root / "pr-status-comment-id").write_text(comment_id)
if failed or not pending:
    notable = [run for run in rows if run.get("conclusion") in {"failure", "timed_out", "cancelled"}] or rows
    bits = []
    for run in notable[:12]:
        state = "идёт" if run.get("status") != "completed" else labels.get(run.get("conclusion"), run.get("conclusion") or "")
        bits.append(f"• {run['name']}: {state}")
    pr_url = f"https://github.com/{os.environ['GITHUB_REPOSITORY']}/pull/{os.environ['PR_NUMBER']}"
    text = f"{title}: {pr_url} ({os.environ['GITHUB_SHA'][:7]})\n" + "\n".join(bits)
    (root / "pr-status-slack.json").write_text(json.dumps({"text": text}))
else:
    (root / "pr-status-slack.json").write_text("")
PY

payload="$tmp/pr-status-payload.json"
comment_id="$(cat "$tmp/pr-status-comment-id")"
if [ -n "$comment_id" ]; then
  api -X PATCH "https://api.github.com/repos/${GITHUB_REPOSITORY}/issues/comments/${comment_id}" --data-binary @"$payload"
else
  api -X POST "https://api.github.com/repos/${GITHUB_REPOSITORY}/issues/${pr_number}/comments" --data-binary @"$payload"
fi
echo "Updated PR #${pr_number} status comment."
if [ -n "${SLACK_WEBHOOK_URL:-}" ] && [ -s "$tmp/pr-status-slack.json" ]; then
  curl -fsS -X POST -H "Content-type: application/json" --data-binary @"$tmp/pr-status-slack.json" "$SLACK_WEBHOOK_URL" >/dev/null
  echo "Sent Slack notification for PR #${pr_number}."
else
  echo "Slack webhook is not configured or checks are still running; Slack was not notified."
fi

if [ -z "${JIRA_BASE_URL:-}" ] || [ -z "${JIRA_EMAIL:-}" ] || [ -z "${JIRA_API_TOKEN:-}" ] || [ -z "${JIRA_PROJECT_KEY:-}" ]; then
  echo "Jira is not configured; skipping."
elif [ ! -s "$tmp/pr-status-slack.json" ]; then
  echo "Checks are still running; Jira was not updated."
elif ! printf '%s' "$JIRA_PROJECT_KEY" | grep -Eq '^[A-Z][A-Z0-9]{1,9}$'; then
  echo "JIRA_PROJECT_KEY is not a project key; Jira was not updated." >&2
  exit 1
else
  jira_base="${JIRA_BASE_URL%/}"
  api "https://api.github.com/repos/${GITHUB_REPOSITORY}/pulls/${pr_number}" > "$tmp/pr-status-pull.json"
  JIRA_BASE_URL="$jira_base" python3 - "$tmp" << 'PY'
import base64, json, os, re, sys, urllib.request
from pathlib import Path

root = Path(sys.argv[1])
pull = json.loads((root / "pr-status-pull.json").read_text())
summary = json.loads((root / "pr-status-slack.json").read_text())["text"]
project = os.environ["JIRA_PROJECT_KEY"]
blob = "\n".join([
    pull.get("title") or "",
    pull.get("body") or "",
    ((pull.get("head") or {}).get("ref") or ""),
])
keys = []
for key in re.findall(rf"\b{re.escape(project)}-\d+\b", blob):
    if key not in keys:
        keys.append(key)
(root / "pr-status-jira-keys").write_text("\n".join(keys))
if not keys:
    raise SystemExit(0)
marker = f"mercasto-pr-{pull['number']}-{os.environ['GITHUB_SHA'][:7]}"
pr_url = pull.get("html_url") or ""
auth = base64.b64encode(f"{os.environ['JIRA_EMAIL']}:{os.environ['JIRA_API_TOKEN']}".encode()).decode()
base = os.environ["JIRA_BASE_URL"]

def jira(method, path, payload=None):
    data = None if payload is None else json.dumps(payload).encode()
    req = urllib.request.Request(
        base + path,
        data=data,
        method=method,
        headers={
            "Authorization": f"Basic {auth}",
            "Accept": "application/json",
            "Content-Type": "application/json",
        },
    )
    with urllib.request.urlopen(req) as response:
        raw = response.read().decode()
    return json.loads(raw) if raw else {}

for key in keys:
    comments = jira("GET", f"/rest/api/3/issue/{key}/comment?maxResults=50")
    already = marker in json.dumps(comments)
    if not already:
        jira("POST", f"/rest/api/3/issue/{key}/comment", {
            "body": {
                "type": "doc",
                "version": 1,
                "content": [{
                    "type": "paragraph",
                    "content": [{"type": "text", "text": f"{marker}\n{summary}"}],
                }],
            }
        })
    links = jira("GET", f"/rest/api/3/issue/{key}/remotelink")
    if pr_url and not any((link.get("object") or {}).get("url") == pr_url for link in links):
        jira("POST", f"/rest/api/3/issue/{key}/remotelink", {
            "object": {"url": pr_url, "title": f"GitHub PR #{pull['number']}"}
        })
    print(f"Updated Jira issue {key}.")
PY
  if [ ! -s "$tmp/pr-status-jira-keys" ]; then
    echo "No ${JIRA_PROJECT_KEY} issue key in the PR title, body, or branch."
  fi
fi
