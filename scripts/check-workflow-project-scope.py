#!/usr/bin/env python3
"""Prevent Mercasto GitHub Actions from mutating foreign projects on shared runners."""

from __future__ import annotations

from pathlib import Path
import sys

WORKFLOW_DIR = Path(".github/workflows")

# These identifiers are owned by the separate Reef project.  They must never
# appear in executable Mercasto workflow definitions, because this repository
# shares a self-hosted VPS runner with other services.
FORBIDDEN_MARKERS = (
    "/root/reef-crm",
    "/srv/reefcrm",
    "/root/automation-stack/reef_",
    "reef-drive-sync",
    "reef-catalog-api",
    "reef-whatsapp-workflow",
    "ops/reef-mcp-agent",
)


def main() -> int:
    violations: list[str] = []

    if not WORKFLOW_DIR.is_dir():
        print(f"workflow directory missing: {WORKFLOW_DIR}", file=sys.stderr)
        return 1

    for path in sorted((*WORKFLOW_DIR.glob("*.yml"), *WORKFLOW_DIR.glob("*.yaml"))):
        name = path.name.lower()
        text = path.read_text(encoding="utf-8", errors="replace").lower()

        if name.startswith("reef-"):
            violations.append(f"{path}: foreign-project workflow filename")

        for marker in FORBIDDEN_MARKERS:
            if marker in text:
                violations.append(f"{path}: contains foreign-project marker {marker!r}")

    if violations:
        print("Mercasto workflow project-boundary check failed:", file=sys.stderr)
        for violation in violations:
            print(f" - {violation}", file=sys.stderr)
        print(
            "Move Reef operations to the Reef repository/workflow control plane instead of the Mercasto runner workflow tree.",
            file=sys.stderr,
        )
        return 1

    print("WORKFLOW_PROJECT_SCOPE=PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
