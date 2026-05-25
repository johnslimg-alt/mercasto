#!/usr/bin/env bash
set -euo pipefail

REPO="${REPO:-johnslimg-alt/mercasto}"
PORT_MODE="${PORT_MODE:-prompt}"

usage() {
  cat <<'USAGE'
Usage:
  bash scripts/configure-live-server-gate-secrets.sh

Environment:
  REPO       GitHub repository, default: johnslimg-alt/mercasto
  PORT_MODE  prompt|skip|set, default: prompt

Notes:
  - This helper intentionally does not accept secret values as command-line arguments.
  - gh secret set prompts for each value, or reads from stdin when redirected.
  - Do not paste secret values into issues, commits, logs, or chat.
USAGE
}

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 127
  fi
}

case "${1:-}" in
  -h|--help)
    usage
    exit 0
    ;;
  '') ;;
  *)
    echo "Unsupported argument: $1" >&2
    usage >&2
    exit 64
    ;;
esac

case "${PORT_MODE}" in
  prompt|skip|set) ;;
  *)
    echo "Invalid PORT_MODE: ${PORT_MODE}. Use prompt, skip, or set." >&2
    exit 64
    ;;
esac

require_command gh

if ! gh auth status >/dev/null 2>&1; then
  echo "GitHub CLI is not authenticated. Run: gh auth login" >&2
  exit 64
fi

echo "Configuring repository Actions secrets for ${REPO}."
echo "Secret values must be entered only into the GitHub CLI prompt/stdin."
echo "Do not paste secret values into logs, issues, commits, or chat."
echo

gh secret set MERCASTO_SSH_HOST --repo "${REPO}"
gh secret set MERCASTO_SSH_USER --repo "${REPO}"
gh secret set MERCASTO_SSH_PRIVATE_KEY --repo "${REPO}"

case "${PORT_MODE}" in
  set)
    gh secret set MERCASTO_SSH_PORT --repo "${REPO}"
    ;;
  skip)
    echo "Skipping MERCASTO_SSH_PORT; workflow defaults to port 22 if unset."
    ;;
  prompt)
    read -r -p "Set MERCASTO_SSH_PORT too? [y/N] " set_port
    case "${set_port}" in
      y|Y|yes|YES)
        gh secret set MERCASTO_SSH_PORT --repo "${REPO}"
        ;;
      *)
        echo "Skipping MERCASTO_SSH_PORT; workflow defaults to port 22 if unset."
        ;;
    esac
    ;;
esac

echo
echo "Configured live server gate secrets for ${REPO}."
echo "Next: open a temporary same-repo PR or rerun Production checks to verify Live server gate verify_quick."