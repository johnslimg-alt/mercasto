#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "== Self-hosted workflow tempfile gate =="

prod=.github/workflows/production-live-gates.yml
vps=.github/workflows/vps-live-gate.yml
post=.github/workflows/post-merge-production-verify.yml

for file in "$prod" "$vps" "$post"; do
  test -f "$file"
done

grep -qF 'mktemp -d "${RUNNER_TEMP:-/tmp}/mercasto-seo-aeo.XXXXXX"' "$prod"
grep -qF 'mktemp -d "${RUNNER_TEMP:-/tmp}/mercasto-vps-live.XXXXXX"' "$vps"
grep -qF 'mktemp "${RUNNER_TEMP:-/tmp}/mercasto-post-merge-compose.XXXXXX.yml"' "$post"
grep -qF "trap 'rm -rf \"\$tmp_dir\"' EXIT" "$prod"
grep -qF "trap 'rm -rf \"\$tmp_dir\"' EXIT" "$vps"
grep -qF "trap 'rm -f \"\$compose_config\"' EXIT" "$post"
grep -qF "<title[^>]*>[^<]{10,160}</title>" "$vps"

if grep -nE '/tmp/(home\.html|sitemap\.xml|robots\.txt|mercasto-vps-(home\.html|auth-providers\.json)|mercasto_post_merge_compose\.yml)' "$prod" "$vps" "$post"; then
  echo "fixed shared tempfile remains in a self-hosted production workflow" >&2
  exit 1
fi
if grep -qF '<title[^>]*>[^<]{10,90}</title>' "$vps"; then
  echo "stale VPS title-length contract remains" >&2
  exit 1
fi

echo "self-hosted workflow tempfile gate OK"
