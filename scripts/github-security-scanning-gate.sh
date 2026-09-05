#!/usr/bin/env bash
set -euo pipefail
WF='.github/workflows/codeql.yml'
DOC='docs/github-security-scanning.md'
STATIC='scripts/static-safety-scans.sh'
SENSITIVE='scripts/repository-sensitive-artifact-scan.sh'
PR='.github/workflows/pr-quality-gate.yml'

echo '== GitHub security scanning contract gate =='
test -s "$WF"
grep -qF 'github/codeql-action/init@v4' "$WF"
grep -qF 'languages: javascript-typescript' "$WF"
grep -qF 'queries: security-extended' "$WF"
grep -qF 'github/codeql-action/analyze@v4' "$WF"
grep -qF 'security-events: write' "$WF"
grep -qF 'cancel-in-progress: false' "$WF"
test -s "$SENSITIVE"
grep -qF 'repository-sensitive-artifact-scan.sh' "$STATIC"
grep -qF 'Possible private key detected in PR body' "$PR"
grep -qF 'secret scanning applies automatically to public repositories' "$DOC"
echo 'GitHub security scanning contract gate OK'
