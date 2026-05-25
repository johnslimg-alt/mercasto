#!/usr/bin/env bash
set -euo pipefail

REPO="${REPO:-johnslimg-alt/mercasto}"

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 127
  fi
}

require_command gh

if ! gh auth status >/dev/null 2>&1; then
  echo "GitHub CLI is not authenticated. Run: gh auth login" >&2
  exit 64
fi

echo "Configuring repository Actions secrets for ${REPO}."
echo "Do not paste secret values into logs, issues, commits, or chat."
echo

gh secret set MERCASTO_SSH_HOST --repo "${REPO}"
gh secret set MERCASTO_SSH_USER --repo "${REPO}"
gh secret set MERCASTO_SSH_PRIVATE_KEY --repo "${REPO}"

read -r -p "Set MERCASTO_SSH_PORT too? [y/N] " set_port
case "${set_port}" in
  y|Y|yes|YES)
    gh secret set MERCASTO_SSH_PORT --repo "${REPO}"
    ;;
  *)
    echo "Skipping MERCASTO_SSH_PORT; workflow defaults to port 22 if unset."
    ;;
esac

echo
echo "Configured live server gate secrets for ${REPO}."
echo "Next: open a temporary same-repo PR or rerun Production checks to verify Live server gate verify_quick."
