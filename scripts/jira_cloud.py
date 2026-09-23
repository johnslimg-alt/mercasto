#!/usr/bin/env python3
"""Small client for the Jira Cloud REST API v3."""

from __future__ import annotations

import argparse
import base64
import json
import os
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path

ISSUE_KEY = re.compile(r"^[A-Z][A-Z0-9]+-\d+$")


class JiraCloud:
    def __init__(self, base_url: str, email: str, token: str):
        if not base_url.startswith("https://"):
            raise ValueError("Jira Cloud URL must start with https://")
        if not email or not token:
            raise ValueError("Jira Cloud email and API token are required")
        self.base_url = base_url.rstrip("/")
        self._basic = base64.b64encode(f"{email}:{token}".encode()).decode()

    def request(self, method: str, path: str, payload=None):
        data = None if payload is None else json.dumps(payload).encode()
        req = urllib.request.Request(
            self.base_url + path,
            data=data,
            method=method,
            headers={
                "Authorization": f"Basic {self._basic}",
                "Accept": "application/json",
                "Content-Type": "application/json",
            },
        )
        try:
            with urllib.request.urlopen(req) as response:
                raw = response.read().decode()
        except urllib.error.HTTPError as error:
            detail = error.read().decode(errors="replace")[:300]
            raise RuntimeError(f"Jira Cloud API {error.code} {path}: {detail}") from None
        return json.loads(raw) if raw else {}

    def comments(self, issue: str) -> list:
        self._check_issue(issue)
        data = self.request("GET", f"/rest/api/3/issue/{issue}/comment?maxResults=50")
        return data.get("comments", []) if isinstance(data, dict) else []

    def add_comment(self, issue: str, body: dict) -> dict:
        self._check_issue(issue)
        return self.request("POST", f"/rest/api/3/issue/{issue}/comment", {"body": body})

    def remote_links(self, issue: str) -> list:
        self._check_issue(issue)
        data = self.request("GET", f"/rest/api/3/issue/{issue}/remotelink")
        return data if isinstance(data, list) else []

    def add_remote_link(self, issue: str, url: str, title: str) -> dict:
        self._check_issue(issue)
        return self.request("POST", f"/rest/api/3/issue/{issue}/remotelink", {
            "object": {"url": url, "title": title},
        })

    @staticmethod
    def _check_issue(issue: str) -> None:
        if not ISSUE_KEY.fullmatch(issue):
            raise ValueError(f"Not a Jira issue key: {issue}")


def parse_webhook(payload) -> dict:
    if isinstance(payload, str):
        payload = json.loads(payload) if payload.strip() else {}
    if not isinstance(payload, dict):
        return {"issue": "", "status": "", "summary": ""}
    issue = payload.get("issue_key") or payload.get("issue")
    status = str(payload.get("status") or "")
    summary = str(payload.get("summary") or "")
    if isinstance(issue, dict):
        fields = issue.get("fields") or {}
        status_field = fields.get("status") or {}
        summary = summary or str(fields.get("summary") or "")
        if isinstance(status_field, dict) and status_field.get("name"):
            status = status or str(status_field.get("name"))
        for item in (payload.get("changelog") or {}).get("items") or []:
            if item.get("field") == "status" and item.get("toString"):
                status = str(item["toString"])
        issue = issue.get("key")
    issue = str(issue or "").strip()
    if not ISSUE_KEY.fullmatch(issue):
        return {"issue": "", "status": "", "summary": ""}
    return {"issue": issue, "status": status.replace("\n", " ").strip()[:80], "summary": summary.replace("\n", " ").strip()[:180]}


def register_webhook(client: JiraCloud, project: str, callback: str) -> bool:
    if not callback.startswith("https://"):
        raise ValueError("JIRA_WEBHOOK_URL must start with https://")
    if not re.fullmatch(r"[A-Z][A-Z0-9]{1,9}", project):
        raise ValueError("JIRA_PROJECT_KEY is not a project key")
    jql = f"project = {project}"
    events = ["jira:issue_created", "jira:issue_updated"]
    try:
        existing = client.request("GET", "/rest/api/3/webhook")
    except RuntimeError as error:
        message = str(error)
        if " 401 " in message or " 403 " in message:
            print("Jira Cloud rejected webhook registration. A basic API token cannot call /rest/api/3/webhook. Use an Automation rule that posts repository_dispatch.")
            return False
        raise
    values = existing.get("values") if isinstance(existing, dict) else []
    for item in values or []:
        if item.get("jqlFilter") == jql and set(events).issubset(set(item.get("events") or [])):
            client.request("PUT", "/rest/api/3/webhook/refresh", {"webhookIds": [item["id"]]})
            print(f"Refreshed Jira webhook {item['id']} for {jql}.")
            return True
    created = client.request("POST", "/rest/api/3/webhook", {
        "url": callback,
        "webhooks": [{"events": events, "jqlFilter": jql}],
    })
    print(f"Registered Jira webhook for {jql}: {created.get('webhookRegistrationResult', created)}")
    return True


def text_to_adf(marker: str, text: str) -> dict:
    lines = [marker, *[line.strip() for line in text.splitlines() if line.strip()]]
    return {
        "type": "doc",
        "version": 1,
        "content": [
            {"type": "paragraph", "content": [{"type": "text", "text": line[:2000]}]}
            for line in lines[:20]
        ],
    }


def issue_keys(pull: dict, project: str) -> list[str]:
    if not re.fullmatch(r"[A-Z][A-Z0-9]{1,9}", project):
        raise ValueError("JIRA_PROJECT_KEY is not a project key")
    blob = "\n".join([
        pull.get("title") or "",
        pull.get("body") or "",
        ((pull.get("head") or {}).get("ref") or ""),
    ])
    found = []
    for key in re.findall(rf"\b{re.escape(project)}-\d+\b", blob):
        if key not in found:
            found.append(key)
    return found


def keys_in_text(blob: str, project: str) -> list[str]:
    return issue_keys({"title": blob, "body": "", "head": {"ref": ""}}, project)


def report_ci(client: JiraCloud, project: str, blob: str, name: str, status: str, sha: str, url: str) -> list[str]:
    keys = keys_in_text(blob, project)
    safe = re.sub(r"[^A-Za-z0-9._-]+", "-", name).strip("-") or "workflow"
    marker = f"mercasto-ci-{safe}-{sha[:7]}"
    summary = "\n".join(part for part in (f"CI {name}: {status}", sha[:7], url) if part)
    body = text_to_adf(marker, summary)
    for key in keys:
        if any(marker in json.dumps(comment) for comment in client.comments(key)):
            print(f"Jira {key} already has {marker}.")
            continue
        client.add_comment(key, body)
        if url and not any((link.get("object") or {}).get("url") == url for link in client.remote_links(key)):
            client.add_remote_link(key, url, f"CI {name}")
        print(f"Reported {name} {status} to {key}.")
    return keys


def _configured() -> bool:
    return all(os.environ.get(name) for name in ("JIRA_BASE_URL", "JIRA_EMAIL", "JIRA_API_TOKEN", "JIRA_PROJECT_KEY"))


def _github_json(url: str, token: str):
    req = urllib.request.Request(url, headers={
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    })
    with urllib.request.urlopen(req) as response:
        return json.loads(response.read().decode())


def ci_blob(token: str, repo: str, sha: str, event: str) -> str:
    texts = []
    if event == "pull_request":
        pulls = _github_json(f"https://api.github.com/repos/{repo}/commits/{sha}/pulls", token)
        for pull in pulls if isinstance(pulls, list) else []:
            texts.extend([
                pull.get("title") or "",
                pull.get("body") or "",
                ((pull.get("head") or {}).get("ref") or ""),
            ])
    commit = _github_json(f"https://api.github.com/repos/{repo}/commits/{sha}", token)
    texts.append(((commit.get("commit") or {}).get("message") or ""))
    return "\n".join(texts)
    if not re.fullmatch(r"[A-Z][A-Z0-9]{1,9}", project):
        raise ValueError("JIRA_PROJECT_KEY is not a project key")
    blob = "\n".join([
        pull.get("title") or "",
        pull.get("body") or "",
        ((pull.get("head") or {}).get("ref") or ""),
    ])
    found = []
    for key in re.findall(rf"\b{re.escape(project)}-\d+\b", blob):
        if key not in found:
            found.append(key)
    return found


def notify(pull: dict, summary: str, client: JiraCloud, project: str, sha: str) -> list[str]:
    keys = issue_keys(pull, project)
    if not keys:
        return []
    marker = f"mercasto-pr-{pull['number']}-{sha[:7]}"
    pr_url = pull.get("html_url") or ""
    for key in keys:
        if not any(marker in json.dumps(comment) for comment in client.comments(key)):
            client.add_comment(key, text_to_adf(marker, summary))
        links = client.remote_links(key)
        if pr_url and not any((link.get("object") or {}).get("url") == pr_url for link in links):
            client.add_remote_link(key, pr_url, f"GitHub PR #{pull['number']}")
        print(f"Updated Jira Cloud issue {key}.")
    return keys


def _check() -> None:
    document = text_to_adf("mercasto-pr-1-abcdefg", "Проверки упали\nFrontend build: упала")
    assert document["type"] == "doc" and document["version"] == 1
    assert len(document["content"]) == 3
    assert document["content"][0]["content"][0]["text"] == "mercasto-pr-1-abcdefg"
    try:
        JiraCloud("http://example.atlassian.net", "a@b.c", "token")
    except ValueError as error:
        assert "https://" in str(error)
    else:
        raise AssertionError("http URL was accepted")
    try:
        JiraCloud("https://example.atlassian.net", "a@b.c", "token").add_comment("not a key", document)
    except ValueError:
        pass
    else:
        raise AssertionError("bad issue key was accepted")
    keys = issue_keys(
        {"title": "Fix MER-42", "body": "see MER-42 and MER-7", "head": {"ref": "feature/MER-9"}},
        "MER",
    )
    assert keys == ["MER-42", "MER-7", "MER-9"], keys
    reported = text_to_adf("mercasto-ci-Frontend-build-abc1234", "CI Frontend build: success\nabc1234")
    assert reported["content"][0]["content"][0]["text"].startswith("mercasto-ci-")
    assert any(item["content"][0]["text"].startswith("CI Frontend build:") for item in reported["content"])
    card = {"issue": {"key": "MER-42", "fields": {"summary": "Поиск", "status": {"name": "In Progress"}}}, "changelog": {"items": [{"field": "status", "toString": "Done"}]}}
    parsed = parse_webhook(card)
    assert parsed == {"issue": "MER-42", "status": "Done", "summary": "Поиск"}, parsed
    assert parse_webhook({"issue": "MER-7", "status": "Done", "summary": "Кнопка"})["issue"] == "MER-7"
    assert parse_webhook({"issue": "not a key"})["issue"] == ""
    print("jira cloud api ok")


def main() -> int:
    parser = argparse.ArgumentParser()
    commands = parser.add_subparsers(dest="command", required=True)
    notify_parser = commands.add_parser("notify")
    notify_parser.add_argument("--pull", required=True)
    notify_parser.add_argument("--summary", required=True)
    notify_parser.add_argument("--keys-out", required=True)
    commands.add_parser("ci")
    commands.add_parser("webhook-fields")
    commands.add_parser("register-webhook")
    args = parser.parse_args()
    if args.command == "webhook-fields":
        import shlex
        fields = parse_webhook(os.environ.get("JIRA_PAYLOAD", ""))
        for name in ("issue", "status", "summary"):
            print(f"{name}={shlex.quote(fields[name])}")
        return 0
    if args.command == "register-webhook":
        if not _configured() or not os.environ.get("JIRA_WEBHOOK_URL"):
            print("Jira webhook registration needs JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN, JIRA_PROJECT_KEY and JIRA_WEBHOOK_URL.")
            return 0
        client = JiraCloud(os.environ["JIRA_BASE_URL"], os.environ["JIRA_EMAIL"], os.environ["JIRA_API_TOKEN"])
        register_webhook(client, os.environ["JIRA_PROJECT_KEY"], os.environ["JIRA_WEBHOOK_URL"])
        return 0
    if args.command == "ci":
        if not _configured():
            print("Jira Cloud is not configured; CI report skipped.")
            return 0
        client = JiraCloud(os.environ["JIRA_BASE_URL"], os.environ["JIRA_EMAIL"], os.environ["JIRA_API_TOKEN"])
        blob = ci_blob(
            os.environ["GITHUB_TOKEN"],
            os.environ["GITHUB_REPOSITORY"],
            os.environ["CI_SHA"],
            os.environ.get("CI_EVENT", ""),
        )
        report_ci(
            client,
            os.environ["JIRA_PROJECT_KEY"],
            blob,
            os.environ.get("CI_NAME", "workflow"),
            os.environ.get("CI_STATUS", "completed"),
            os.environ["CI_SHA"],
            os.environ.get("CI_URL", ""),
        )
        return 0
    pull = json.loads(Path(args.pull).read_text())
    summary = json.loads(Path(args.summary).read_text())["text"]
    client = JiraCloud(os.environ["JIRA_BASE_URL"], os.environ["JIRA_EMAIL"], os.environ["JIRA_API_TOKEN"])
    keys = notify(pull, summary, client, os.environ["JIRA_PROJECT_KEY"], os.environ["GITHUB_SHA"])
    Path(args.keys_out).write_text("\n".join(keys))
    return 0


if __name__ == "__main__":
    if "--check" in sys.argv:
        _check()
    else:
        raise SystemExit(main())
