#!/usr/bin/env bash
set -euo pipefail

python3 - <<'PY'
import json
from pathlib import Path

assetlinks = Path('backend/public/.well-known/assetlinks.json')
if not assetlinks.is_file():
    raise SystemExit('missing backend/public/.well-known/assetlinks.json')
statements = json.loads(assetlinks.read_text(encoding='utf-8'))
match = next((s for s in statements if s.get('target', {}).get('package_name') == 'com.mercasto.app'), None)
if not match:
    raise SystemExit('assetlinks.json does not delegate com.mercasto.app')
fingerprints = match.get('target', {}).get('sha256_cert_fingerprints', [])
if not fingerprints or any(':' not in value for value in fingerprints):
    raise SystemExit('assetlinks.json has no valid SHA-256 fingerprint')

nginx = Path('default.conf').read_text(encoding='utf-8')
for path in ('/.well-known/assetlinks.json', '/.well-known/apple-app-site-association'):
    marker = f'location = {path}'
    if marker not in nginx:
        raise SystemExit(f'missing exact nginx location for {path}')

# Apple association must not ship a placeholder Team ID as if it were valid.
aasa = Path('backend/public/.well-known/apple-app-site-association')
if aasa.exists():
    body = aasa.read_text(encoding='utf-8')
    if 'TEAMID.' in body:
        raise SystemExit('AASA still contains placeholder Apple Team ID')
    json.loads(body)

print('mobile app association gate OK')
PY
