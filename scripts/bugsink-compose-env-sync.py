#!/usr/bin/env python3
import secrets
import sys
from pathlib import Path

if len(sys.argv) != 3:
    raise SystemExit("usage: bugsink-compose-env-sync.py BACKEND_ENV COMPOSE_ENV")

source_path = Path(sys.argv[1])
target_path = Path(sys.argv[2])


def parse_env(path: Path):
    values = {}
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in raw:
            continue
        key, value = raw.split("=", 1)
        values[key.strip()] = value.strip()
    return values


def normalized(value: str):
    value = value.strip()
    if len(value) >= 2 and value[0] == value[-1] and value[0] in {"'", '"'}:
        return value[1:-1]
    return value
source = parse_env(source_path)
target = parse_env(target_path) if target_path.exists() else {}

admin_email = normalized(source.get("ADMIN_EMAIL", ""))
if not admin_email:
    raise SystemExit("missing backend value required for Bugsink: ADMIN_EMAIL")

updates = {"BUGSINK_ADMIN_EMAIL": admin_email}
for key, generator in {
    "BUGSINK_SECRET_KEY": lambda: secrets.token_urlsafe(48),
    "BUGSINK_ADMIN_PASSWORD": lambda: secrets.token_urlsafe(24),
    "BUGSINK_ALERT_TOKEN": lambda: secrets.token_urlsafe(48),
}.items():
    if not normalized(target.get(key, "")):
        updates[key] = generator()

lines = target_path.read_text(encoding="utf-8").splitlines() if target_path.exists() else []
seen = set()
output = []
for raw in lines:
    key = raw.split("=", 1)[0].strip() if "=" in raw else ""
    if key in updates:
        output.append(f"{key}={updates[key]}")
        seen.add(key)
    else:
        output.append(raw)

for key, value in updates.items():
    if key not in seen:
        output.append(f"{key}={value}")

target_path.write_text("\n".join(output) + "\n", encoding="utf-8")

final_target = parse_env(target_path)
alert_token = normalized(final_target.get("BUGSINK_ALERT_TOKEN", ""))
source_lines = source_path.read_text(encoding="utf-8").splitlines()
source_output = []
source_seen = False
for raw in source_lines:
    key = raw.split("=", 1)[0].strip() if "=" in raw else ""
    if key == "BUGSINK_ALERT_TOKEN":
        source_output.append(f"BUGSINK_ALERT_TOKEN={alert_token}")
        source_seen = True
    else:
        source_output.append(raw)
if not source_seen:
    source_output.append(f"BUGSINK_ALERT_TOKEN={alert_token}")
source_path.write_text("\n".join(source_output) + "\n", encoding="utf-8")

print("Bugsink compose env synced without printing secret values")
