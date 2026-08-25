#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

python3 - <<'PY'
from pathlib import Path

text = Path('scripts/server-operator.sh').read_text()
start = text.find('  deploy_main)')
end = text.find('  restart_frontend)', start)
if start < 0 or end <= start:
    raise SystemExit('deploy_main case block not found')
deploy = text[start:end]

required = [
    'require_confirm',
    'sudo -n git fetch origin',
    'sudo -n git reset --hard origin/main',
    'sudo -n git switch -C main origin/main',
    'sudo -n git clean -fd',
    'git fetch origin main --prune',
    'git reset --hard origin/main',
    'git switch -C main origin/main',
    'git clean -fd',
]
for needle in required:
    if needle not in deploy:
        raise SystemExit(f'missing deploy branch contract: {needle}')

prod_reset = deploy.index('sudo -n git reset --hard origin/main')
prod_switch = deploy.index('sudo -n git switch -C main origin/main')
prod_clean = deploy.index('sudo -n git clean -fd')
if not prod_reset < prod_switch < prod_clean:
    raise SystemExit('production deploy must reset origin/main, switch branch main, then clean')

local_reset = deploy.index('git reset --hard origin/main', prod_clean)
local_switch = deploy.index('git switch -C main origin/main', local_reset)
local_clean = deploy.index('git clean -fd', local_switch)
if not local_reset < local_switch < local_clean:
    raise SystemExit('non-production deploy must reset origin/main, switch branch main, then clean')

if deploy.index('require_confirm') > prod_reset:
    raise SystemExit('MERCASTO confirmation must remain before checkout mutation')

print('server operator branch gate OK')
PY
