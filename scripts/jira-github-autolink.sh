#!/usr/bin/env bash
set -euo pipefail

if [ -z "${JIRA_BASE_URL:-}" ] || [ -z "${JIRA_PROJECT_KEY:-}" ]; then
  echo "Jira base URL or project key is not configured; GitHub autolink was not changed."
  exit 0
fi
if ! printf '%s' "$JIRA_PROJECT_KEY" | grep -Eq '^[A-Z][A-Z0-9]{1,9}$'; then
  echo "JIRA_PROJECT_KEY is not a project key." >&2
  exit 1
fi
case "$JIRA_BASE_URL" in
  https://*) ;;
  *) echo "JIRA_BASE_URL must start with https://." >&2; exit 1 ;;
esac

: "${GITHUB_TOKEN:?}"
: "${GITHUB_REPOSITORY:?}"

base="${JIRA_BASE_URL%/}"
prefix="${JIRA_PROJECT_KEY}-"
template="${base}/browse/${prefix}<num>"

python3 - "$prefix" "$template" << 'PY'
import json, os, sys, urllib.request

prefix, template = sys.argv[1], sys.argv[2]
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

existing = api("GET", f"https://api.github.com/repos/{repo}/autolinks")
for link in existing:
    if link.get("key_prefix") == prefix:
        print(f"Autolink {prefix} already points at {link.get('url_template')}.")
        raise SystemExit(0)
created = api("POST", f"https://api.github.com/repos/{repo}/autolinks", {
    "key_prefix": prefix,
    "url_template": template,
    "is_alphanumeric": False,
})
print(f"Created autolink {created.get('key_prefix')} -> {created.get('url_template')}.")
PY
