#!/usr/bin/env python3
"""Plan-only local Qwen agent runner for Mercasto.

Reads /root/mercasto-agent/task.txt and writes /root/mercasto-agent/plan.md.
It uses the already-running local Ollama container and sends no task data to an
external generative-AI provider. It never executes the plan it generates.
"""
from __future__ import annotations

import argparse
import json
import subprocess
import urllib.error
import urllib.request
from pathlib import Path

TASK_PATH = Path('/root/mercasto-agent/task.txt')
OUT_PATH = Path('/root/mercasto-agent/plan.md')
DEFAULT_MODEL = 'qwen3-vl:4b-instruct'


def ollama_base_url() -> str:
    try:
        ip = subprocess.check_output(
            ['docker', 'inspect', '-f', '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}', 'mercasto_ollama'],
            text=True,
            timeout=10,
        ).strip()
    except (subprocess.SubprocessError, FileNotFoundError) as exc:
        raise SystemExit(f'Cannot resolve local mercasto_ollama container: {exc}') from exc
    if not ip:
        raise SystemExit('Local mercasto_ollama container has no reachable Docker IP')
    return f'http://{ip}:11434'


def request_plan(base_url: str, model: str, task: str) -> str:
    system = '''You are a senior CTO/DevOps/coding planning assistant for Mercasto.com.
Project: Laravel/PHP + React/Vite + Docker on VPS.
Current mode is PLAN ONLY. Never claim execution.
Return a concise plan with objective, inspections, proposed changes, smoke tests,
risks, and exact commands. Never print or request secrets. Prefer read-only checks
first and avoid destructive commands.'''
    payload = {
        'model': model,
        'messages': [
            {'role': 'system', 'content': system},
            {'role': 'user', 'content': task},
        ],
        'stream': False,
        'keep_alive': '5m',
        'options': {'temperature': 0.1, 'num_ctx': 4096, 'num_predict': 1200},
    }
    req = urllib.request.Request(
        base_url.rstrip('/') + '/api/chat',
        data=json.dumps(payload, ensure_ascii=False).encode('utf-8'),
        headers={'Content-Type': 'application/json'},
        method='POST',
    )
    try:
        with urllib.request.urlopen(req, timeout=180) as resp:
            data = json.loads(resp.read().decode('utf-8'))
    except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError) as exc:
        raise SystemExit(f'Local Ollama request failed: {exc}') from exc
    content = ((data.get('message') or {}).get('content') or '').strip()
    if not content:
        raise SystemExit('Local Ollama returned an empty plan')
    return content


def main() -> int:
    parser = argparse.ArgumentParser(description='Mercasto local Qwen plan-only runner')
    parser.add_argument('mode', nargs='?', default='fast', choices=['fast', 'smart'])
    parser.add_argument('--model', default=DEFAULT_MODEL)
    args = parser.parse_args()
    if not TASK_PATH.exists():
        raise SystemExit(f'Missing task file: {TASK_PATH}')
    task = TASK_PATH.read_text(encoding='utf-8').strip()
    if not task:
        raise SystemExit(f'Empty task file: {TASK_PATH}')
    content = request_plan(ollama_base_url(), args.model, task)
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(
        '# Mercasto Agent Plan\n\n'
        f'Mode: {args.mode}\n\nModel: {args.model}\n\nProvider: local Ollama\n\n{content}\n',
        encoding='utf-8',
    )
    print(str(OUT_PATH))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
