#!/usr/bin/env python3
from pathlib import Path

path = Path('docs/openapi.public.yaml')
if not path.exists():
    raise SystemExit('missing docs/openapi.public.yaml')

text = path.read_text(encoding='utf-8')

required = [
    'openapi: 3.1.0',
    'title: Mercasto Public API',
    'paths:',
    'components:',
    '/api/categories:',
    '/api/ads:',
    '/api/ads/{id}:',
    '/api/search/suggestions:',
    '/api/states/counts:',
    '/api/users/{id}/profile:',
    '/api/users/{id}/business-profile:',
    '/api/auth/providers:',
]

for token in required:
    if token not in text:
        raise SystemExit(f'missing OpenAPI token: {token}')

blocked_paths = ['/api/admin', '/api/payment', '/api/webhooks', '/api/agents', '/api/login', '/api/register']
for token in blocked_paths:
    if token in text:
        raise SystemExit(f'blocked path in public contract: {token}')

if text.count('operationId:') < 8:
    raise SystemExit('expected operationId entries for public endpoints')

print('public OpenAPI smoke OK')
