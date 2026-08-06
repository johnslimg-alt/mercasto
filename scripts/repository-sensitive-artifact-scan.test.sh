#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/mercasto-gitlink-scan.XXXXXX")"
trap 'rm -rf "$TMP_DIR"' EXIT

mkdir -p "$TMP_DIR/scripts"
cp "$ROOT_DIR/scripts/repository-sensitive-artifact-scan.sh" "$TMP_DIR/scripts/"

git -C "$TMP_DIR" init -q
git -C "$TMP_DIR" config user.name 'Mercasto CI'
git -C "$TMP_DIR" config user.email 'ci@mercasto.test'
printf 'fixture\n' > "$TMP_DIR/README.md"
git -C "$TMP_DIR" add README.md
git -C "$TMP_DIR" commit -qm 'fixture baseline'

positive_output="$(bash "$TMP_DIR/scripts/repository-sensitive-artifact-scan.sh")"
grep -qF 'repository sensitive artifact scan OK' <<< "$positive_output"

fixture_commit="$(git -C "$TMP_DIR" rev-parse HEAD)"
git -C "$TMP_DIR" update-index --add \
  --cacheinfo "160000,$fixture_commit,.claude/worktrees/fixture"

set +e
negative_output="$(bash "$TMP_DIR/scripts/repository-sensitive-artifact-scan.sh" 2>&1)"
negative_status=$?
set -e

if (( negative_status == 0 )); then
  echo 'repository artifact scan accepted an orphan gitlink' >&2
  exit 1
fi

grep -qF 'Tracked gitlinks are forbidden in Mercasto' <<< "$negative_output"
grep -qF '.claude/worktrees/fixture' <<< "$negative_output"

echo 'repository gitlink regression test OK'
