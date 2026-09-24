#!/usr/bin/env bash
set -euo pipefail

if [ -n "${JIRA_PAYLOAD:-}" ]; then
  eval "$(python3 scripts/jira_cloud.py webhook-fields)"
  JIRA_ISSUE="${issue}"
  JIRA_STATUS="${status}"
  JIRA_SUMMARY="${summary}"
fi

issue="${JIRA_ISSUE:-}"
if ! printf '%s' "$issue" | grep -Eq '^[A-Z][A-Z0-9]{1,9}-[0-9]+$'; then
  echo "Ignoring payload without a Jira issue key."
  exit 0
fi
if [ -n "${JIRA_PROJECT_KEY:-}" ] && ! printf '%s' "$issue" | grep -Eq "^${JIRA_PROJECT_KEY}-[0-9]+$"; then
  echo "Issue ${issue} is outside ${JIRA_PROJECT_KEY}; ignoring."
  exit 0
fi

: "${GITHUB_TOKEN:?}"
: "${GITHUB_REPOSITORY:?}"

tmp="${RUNNER_TEMP:-/tmp}"
python3 - "$tmp" << 'PY'
import json, os, sys, urllib.request
from pathlib import Path

root = Path(sys.argv[1])
issue = os.environ["JIRA_ISSUE"]
status = (os.environ.get("JIRA_STATUS") or "").replace("\n", " ").strip()[:80]
summary = (os.environ.get("JIRA_SUMMARY") or "").replace("\n", " ").strip()[:180]
token = os.environ["GITHUB_TOKEN"]
repo = os.environ["GITHUB_REPOSITORY"]

def api(method, url, payload=None):
    data = None if payload is None else json.dumps(payload).encode()
    req = urllib.request.Request(url, data=data, method=method, headers={
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
    })
    with urllib.request.urlopen(req) as response:
        raw = response.read().decode()
    return json.loads(raw) if raw else []

pulls = []
for page in (1, 2, 3):
    batch = api("GET", f"https://api.github.com/repos/{repo}/pulls?state=open&per_page=50&page={page}")
    if not isinstance(batch, list):
        raise SystemExit("Unexpected pull request response")
    pulls.extend(batch)
    if len(batch) < 50:
        break

matched = []
for pull in pulls:
    blob = "\n".join([
        pull.get("title") or "",
        pull.get("body") or "",
        ((pull.get("head") or {}).get("ref") or ""),
    ])
    if issue in blob:
        matched.append(pull)

if not matched:
    print(f"No open pull request mentions {issue}.")

marker = f"<!-- mercasto-jira-{issue}-{status or 'updated'} -->"
state = status or "обновлена"
text = summary or "Без описания."
body = f"{marker}\nJira **{issue}** теперь: {state}.\n\n{text}\n"
posted = False
links = []
for pull in matched:
    number = pull["number"]
    comments = api("GET", f"https://api.github.com/repos/{repo}/issues/{number}/comments?per_page=100")
    if any(marker in (comment.get("body") or "") for comment in comments):
        print(f"PR #{number} already has this Jira status.")
        continue
    api("POST", f"https://api.github.com/repos/{repo}/issues/{number}/comments", {"body": body})
    posted = True
    if pull.get("html_url"):
        links.append(pull["html_url"])
    print(f"Commented on PR #{number} for {issue}.")

if matched and not posted:
    (root / "jira-slack.json").write_text("")
    raise SystemExit(0)

base = (os.environ.get("JIRA_BASE_URL") or "").rstrip("/")
jira_url = f"{base}/browse/{issue}" if base else ""
lines = [f"Jira {issue} теперь: {state}", text]
if jira_url:
    lines.append(jira_url)
lines.extend(links)
if not links:
    lines.append("Открытого PR с этим ключом нет.")
(root / "jira-slack.json").write_text(json.dumps({"text": "\n".join(lines)}))
PY

if [ -n "${SLACK_WEBHOOK_URL:-}" ] && [ -s "$tmp/jira-slack.json" ]; then
  curl -fsS -X POST -H "Content-type: application/json" --data-binary @"$tmp/jira-slack.json" "$SLACK_WEBHOOK_URL" >/dev/null
  echo "Sent ${issue} to Slack."
else
  echo "Slack webhook is not configured or this Jira status was already delivered."
fi
