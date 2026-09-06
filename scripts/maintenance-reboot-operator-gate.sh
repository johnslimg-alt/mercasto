#!/usr/bin/env bash
set -euo pipefail
python3 - <<'PY'
from pathlib import Path
operator = Path('scripts/server-operator.sh').read_text()
workflow = Path('.github/workflows/chatgpt-server-operator.yml').read_text()
start = operator.find('  maintenance_reboot)')
end = operator.find('  *)', start)
if start < 0 or end <= start:
    raise SystemExit('maintenance_reboot case missing')
block = operator[start:end]
required = [
    'require_confirm',
    'npm run maintenance:precheck',
    '/var/run/reboot-required',
    "-name 'backup_*.dump' -size +0c",
    'backup_age',
    '-gt 7200',
    'pg_restore -l',
    'compose-orphan-preflight.sh',
    'public_smoke',
    'systemd-run',
    '--on-active=45s',
    '/usr/bin/systemctl reboot',
]
for needle in required:
    if needle not in block:
        raise SystemExit(f'missing maintenance reboot safety contract: {needle}')
if block.index('npm run maintenance:precheck') > block.index('systemd-run'):
    raise SystemExit('precheck must run before reboot scheduling')
if block.index('pg_restore -l') > block.index('systemd-run'):
    raise SystemExit('restore-list validation must run before reboot scheduling')
if "RUN:maintenance_reboot:MERCASTO" not in workflow:
    raise SystemExit('maintenance reboot exact workflow command missing')
if "['maintenance_reboot', 'MERCASTO', '220']" not in workflow:
    raise SystemExit('maintenance reboot command map missing confirmation')
print('maintenance reboot operator gate OK')
PY
