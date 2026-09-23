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
    print("jira cloud api ok")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("command", choices=("notify",))
    parser.add_argument("--pull", required=True)
    parser.add_argument("--summary", required=True)
    parser.add_argument("--keys-out", required=True)
    args = parser.parse_args()
    pull = json.loads(Path(args.pull).read_text())
    summary = json.loads(Path(args.summary).read_text())["text"]
    client = JiraCloud(
        os.environ["JIRA_BASE_URL"],
        os.environ["JIRA_EMAIL"],
        os.environ["JIRA_API_TOKEN"],
    )
    keys = notify(pull, summary, client, os.environ["JIRA_PROJECT_KEY"], os.environ["GITHUB_SHA"])
    Path(args.keys_out).write_text("\n".join(keys))
    return 0


if __name__ == "__main__":
    if "--check" in sys.argv:
        _check()
    else:
        raise SystemExit(main())
