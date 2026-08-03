#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

fail=0

blocked_artifacts="$(while IFS= read -r path; do
  if [[ -f "$path" ]]; then
    printf '%s\n' "$path"
  fi
done < <(git ls-files | grep -E '\.(dump|sql|bak|pem|key|p12|pfx)$' || true))"

if [[ -n "$blocked_artifacts" ]]; then
  echo "Tracked backup or credential artifacts are forbidden:"
  while IFS= read -r path; do
    [[ -n "$path" ]] && printf ' - %s\n' "$path"
  done <<< "$blocked_artifacts"
  fail=1
fi

public_php="$(while IFS= read -r path; do
  if [[ -f "$path" ]]; then
    printf '%s\n' "$path"
  fi
done < <(git ls-files 'public/*.php' 'public/**/*.php'))"

if [[ -n "$public_php" ]]; then
  echo "PHP source files must not be shipped from the static frontend public directory:"
  while IFS= read -r path; do
    [[ -n "$path" ]] && printf ' - %s\n' "$path"
  done <<< "$public_php"
  fail=1
fi

private_key_files="$(git grep -Il -E 'BEGIN (OPENSSH|RSA|DSA|EC)? ?PRIVATE KEY' -- . \
  ':(exclude)backend/tests/**' ':(exclude)docs/**' || true)"

if [[ -n "$private_key_files" ]]; then
  echo "Tracked private-key headers are forbidden:"
  while IFS= read -r path; do
    [[ -n "$path" ]] && printf ' - %s\n' "$path"
  done <<< "$private_key_files"
  fail=1
fi

if ((fail != 0)); then
  exit 1
fi

echo "repository sensitive artifact scan OK"
