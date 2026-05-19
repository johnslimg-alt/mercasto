#!/usr/bin/env python3
"""Plan-only DeepSeek agent runner for Mercasto.

Reads:
- /root/.config/mercasto-agent/deepseek.env
- /root/mercasto-agent/task.txt

Writes:
- /root/mercasto-agent/plan.md

This script does not execute shell commands. It only asks DeepSeek for a safe plan.
"""
from __future__ import annotations

import argparse
import json
import os
import stat
import sys
import urllib.error
import urllib.request
from pathlib import Path

CONFIG_PATH = Path("/root/.config/mercasto-agent/deepseek.env")
TASK_PATH = Path("/root/mercasto-agent/task.txt")
OUT_PATH = Path("/root/mercasto-agent/plan.md")


def load_env(path: Path) -> dict[str, str]:
    if not path.exists():
        raise SystemExit(f"Missing config: {path}")

    mode = path.stat().st_mode
    if mode & (stat.S_IRWXG | stat.S_IRWXO):
        raise SystemExit(f"Refusing insecure config permissions on {path}; run: chmod 600 {path}")

    values: dict[str, str] = {}
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        if "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip().strip('"').strip("'")
    return values


def choose_model(env: dict[str, str], mode: str) -> str:
    if mode == "fast":
        return env.get("DEEPSEEK_MODEL_FAST") or env.get("DEEPSEEK_MODEL") or "deepseek-v4-flash"
    if mode == "smart":
        return env.get("DEEPSEEK_MODEL_SMART") or "deepseek-v4-pro"
    raise SystemExit("Usage: mercasto-agent-plan [fast|smart]")


def request_plan(base_url: str, api_key: str, model: str, task: str) -> tuple[str, dict]:
    system = """You are a senior CTO/DevOps/coding agent for Mercasto.com.
Project: Laravel/PHP + React/Vite + Docker on VPS.
Production path: /var/www/mercasto.
Public UI language: Spanish.
Payments/monetization: Clip only.
Your current mode is PLAN ONLY. Do not claim you executed anything.

Return a concise, safe execution plan with:
1. Objective
2. Files/commands to inspect
3. Proposed changes
4. Smoke tests
5. Risks
6. Exact shell commands

Security rules:
- Never suggest printing secrets, .env values, private keys, API keys, or tokens.
- Never suggest destructive commands unless explicitly marked dangerous and unnecessary for read-only audits.
- Prefer read-only commands first.
- Do not suggest git push, git reset --hard, rm -rf, chmod 777, or exposing MCP command tools publicly.
- For production, prefer smoke checks before edits and builds/tests before restarts.
"""

    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": task},
        ],
        "thinking": {"type": "disabled"},
        "temperature": 0.1,
        "max_tokens": 2500,
    }

    url = base_url.rstrip("/") + "/chat/completions"
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": "Bearer " + api_key,
            "Content-Type": "application/json",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=180) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        raise SystemExit(f"DeepSeek API HTTP {exc.code}: {body}") from exc
    except urllib.error.URLError as exc:
        raise SystemExit(f"DeepSeek API connection error: {exc}") from exc

    try:
        content = data["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError) as exc:
        raise SystemExit("Unexpected DeepSeek response: " + json.dumps(data, ensure_ascii=False)[:2000]) from exc

    return content, data.get("usage", {})


def main() -> int:
    parser = argparse.ArgumentParser(description="Mercasto DeepSeek plan-only runner")
    parser.add_argument("mode", nargs="?", default="fast", choices=["fast", "smart"])
    args = parser.parse_args()

    if not TASK_PATH.exists():
        raise SystemExit(f"Missing task file: {TASK_PATH}\nCreate it first, e.g. nano {TASK_PATH}")

    env = load_env(CONFIG_PATH)
    base_url = env.get("DEEPSEEK_BASE_URL", "https://api.deepseek.com")
    api_key = env.get("DEEPSEEK_API_KEY", "")
    if not api_key or api_key in {"key", "PASTE_REAL_KEY_HERE", "PASTE_KEY_HERE"}:
        raise SystemExit(f"Missing real DEEPSEEK_API_KEY in {CONFIG_PATH}")

    model = choose_model(env, args.mode)
    task = TASK_PATH.read_text(encoding="utf-8").strip()
    if not task:
        raise SystemExit(f"Empty task file: {TASK_PATH}")

    content, usage = request_plan(base_url, api_key, model, task)

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(
        "# Mercasto Agent Plan\n\n"
        f"Mode: {args.mode}\n\n"
        f"Model: {model}\n\n"
        f"{content}\n\n---\n"
        "Usage: " + json.dumps(usage, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    print(str(OUT_PATH))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
