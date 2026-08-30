#!/usr/bin/env python3
from pathlib import Path
import sys

compose = Path("docker-compose.yml").read_text(encoding="utf-8")
deploy = Path(".github/workflows/deploy-selfhosted.yml").read_text(encoding="utf-8")
errors = []

required_compose = (
    "default:\n    external: true\n    name: mercasto_default",
    "automation-net:\n    external: true\n    name: automation-net",
)
for marker in required_compose:
    if marker not in compose:
        errors.append(f"missing external network guard: {marker!r}")

frontend_build_selectors = [
    line for line in deploy.splitlines()
    if "grep -Eq" in line and "Dockerfile|src/|public/" in line
]
if len(frontend_build_selectors) != 1:
    errors.append(f"expected one frontend build selector, found {len(frontend_build_selectors)}")
else:
    selector = frontend_build_selectors[0]
    for forbidden in (r"default\.conf", r"security_headers\.conf", ".github/workflows"):
        if forbidden in selector:
            errors.append(f"frontend build selector still contains {forbidden!r}")

ai_build_selectors = [
    line for line in deploy.splitlines()
    if "grep -Eq" in line and "services/ai-gateway/" in line
]
if len(ai_build_selectors) != 1:
    errors.append(f"expected one AI build selector, found {len(ai_build_selectors)}")
elif ".github/workflows/deploy-selfhosted" in ai_build_selectors[0]:
    errors.append("AI build selector still rebuilds on deploy workflow edits")

for required in (
    "NGINX_CONFIG_RELOAD=1",
    "docker exec mercasto_frontend_container nginx -t",
    "docker exec mercasto_frontend_container nginx -s reload",
):
    if required not in deploy:
        errors.append(f"missing nginx config-only deploy guard: {required!r}")

if errors:
    print("DEPLOY_NETWORK_SAFETY=FAIL", file=sys.stderr)
    for error in errors:
        print(f" - {error}", file=sys.stderr)
    raise SystemExit(1)

print("DEPLOY_NETWORK_SAFETY=PASS")
