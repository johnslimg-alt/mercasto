#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

python3 - <<'PY'
from pathlib import Path

conf = Path('default.conf')
text = conf.read_text()

manifest_block = """    location ~* ^/(backend/)?(composer\\.(json|lock)|package(-lock)?\\.json|pnpm-lock\\.yaml|yarn\\.lock)$ {
        return 404;
    }
"""

horizon_block = """    location ~* ^/(horizon|vendor/horizon)(/.*)?$ {
        return 404;
    }
"""

sensitive_block = """    location ~* ^/(backend/)?(\\.env.*|\\.git|\\.aws|config\\.json|js/config\\.js|env)$ {
        return 404;
    }
"""

if manifest_block not in text:
    if sensitive_block not in text:
        raise SystemExit('sensitive block not found in default.conf')
    text = text.replace(sensitive_block, sensitive_block + '\n' + manifest_block)

if horizon_block not in text:
    old_horizon = """    location ~* ^/horizon(/.*)?$ {
        return 404;
    }
"""
    if old_horizon in text:
        text = text.replace(old_horizon, horizon_block)
    else:
        if manifest_block not in text:
            raise SystemExit('manifest block not found in default.conf')
        text = text.replace(manifest_block, manifest_block + '\n' + horizon_block)

conf.write_text(text)

scan = Path('scripts/public-copy-scan.sh')
scan_text = scan.read_text()
old_pattern = "PATTERN='MVP|stack trace|stacktrace|placeholder|En construcción|Página en construcción|Error Crítico|white screen'"
new_pattern = "PATTERN='MVP|stack trace|stacktrace|En construcción|Página en construcción|Error Crítico|white screen'"
if old_pattern in scan_text:
    scan.write_text(scan_text.replace(old_pattern, new_pattern))
elif new_pattern not in scan_text:
    raise SystemExit('public copy scan pattern not found')

app = Path('src/App.jsx')
app_text = app.read_text()
replacements = {
    '¡Error Crítico en la Interfaz!': 'No pudimos cargar la página',
    'Ad Detail Screen - En construcción': 'Detalle del anuncio no disponible temporalmente',
    'Storefront - En construcción': 'Tienda no disponible temporalmente',
    '{currentTab} - Página en construcción': '{currentTab} - Página no disponible temporalmente',
}
for old, new in replacements.items():
    app_text = app_text.replace(old, new)
app.write_text(app_text)
PY

bash scripts/public-copy-scan.sh

echo "production hotfix runner OK"
