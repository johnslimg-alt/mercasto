#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if grep -q '"nuwave/lighthouse"' backend/composer.json backend/composer.lock; then
  echo "FAIL: unused Lighthouse dependency is present" >&2
  exit 1
fi

if grep -q '"webonyx/graphql-php"' backend/composer.lock; then
  echo "FAIL: stale GraphQL runtime dependency is present" >&2
  exit 1
fi

if [ -e backend/graphql/schema.graphql ] || [ -e graphql/schema.graphql ]; then
  echo "FAIL: application GraphQL schema exists without approved product scope" >&2
  exit 1
fi

if grep -RIEq 'Nuwave\\Lighthouse|GraphQL|graphql' backend/app backend/routes backend/config 2>/dev/null; then
  echo "FAIL: application GraphQL/Lighthouse source reference exists" >&2
  exit 1
fi

echo "no-unused-graphql-surface gate OK"
