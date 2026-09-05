#!/usr/bin/env bash
set -euo pipefail

echo "== Session encryption contract gate =="
grep -qF 'SESSION_ENCRYPT=true' backend/.env.example
grep -A20 '^  mercasto-backend:' docker-compose.yml | grep -qF '"SESSION_ENCRYPT=true"'
grep -qF "'encrypt' => env('SESSION_ENCRYPT', false)" backend/config/session.php
echo "session encryption contract gate OK"
