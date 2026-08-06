#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

fail=0

tracked_backups="$(git ls-files | grep -E '\.(dump|sql|bak|old|orig|backup|save|swp|pem|key|p12|pfx)$|~$' || true)"
workspace_backups="$(find . \
  -path './.git' -prune -o \
  -path './.claude' -prune -o \
  -path './node_modules' -prune -o \
  -path './backend/vendor' -prune -o \
  -path './backend/storage' -prune -o \
  -path './postgres-data' -prune -o \
  -path './postgres-backups' -prune -o \
  -type f \
  \( -name '*.dump' -o -name '*.sql' -o -name '*.bak' -o -name '*.old' \
     -o -name '*.orig' -o -name '*.backup' -o -name '*.save' -o -name '*.swp' \
     -o -name '*.pem' -o -name '*.key' -o -name '*.p12' -o -name '*.pfx' -o -name '*~' \) \
  -print | sed 's#^./##')"
blocked_artifacts="$(printf '%s\n%s\n' "$tracked_backups" "$workspace_backups" | sed '/^$/d' | sort -u)"

if [[ -n "$blocked_artifacts" ]]; then
  echo "Backup or credential artifacts are forbidden:"
  while IFS= read -r path; do
    [[ -n "$path" ]] && printf ' - %s\n' "$path"
  done <<< "$blocked_artifacts"
  fail=1
fi

tracked_gitlinks="$(git ls-files --stage | awk '$1 == "160000" { sub(/^[^\t]*\t/, ""); print }')"

if [[ -n "$tracked_gitlinks" ]]; then
  echo "Tracked gitlinks are forbidden in Mercasto; local agent worktrees must stay untracked:"
  while IFS= read -r path; do
    [[ -n "$path" ]] && printf ' - %s\n' "$path"
  done <<< "$tracked_gitlinks"
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
