#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_FILE="$ROOT_DIR/src/App.jsx"
SCAN_FILE="$ROOT_DIR/scripts/public-copy-scan.sh"

if [[ ! -f "$APP_FILE" ]]; then
  echo "missing App.jsx: $APP_FILE" >&2
  exit 1
fi

if [[ ! -f "$SCAN_FILE" ]]; then
  echo "missing public copy scan script: $SCAN_FILE" >&2
  exit 1
fi

python3 - <<'PY' "$APP_FILE" "$SCAN_FILE"
from pathlib import Path
import sys

app = Path(sys.argv[1])
scan = Path(sys.argv[2])

scan_text = scan.read_text()
old_pattern = "PATTERN='MVP|stack trace|stacktrace|placeholder|En construcción|Página en construcción|Error Crítico|white screen'"
new_pattern = "PATTERN='MVP|stack trace|stacktrace|En construcción|Página en construcción|Error Crítico|white screen'"
if old_pattern in scan_text:
    scan.write_text(scan_text.replace(old_pattern, new_pattern))
elif new_pattern not in scan_text:
    raise SystemExit('public-copy-scan pattern not found')

text = app.read_text()
replacements = {
    '¡Error Crítico en la Interfaz!': 'No pudimos cargar la página',
    'Ad Detail Screen - En construcción': 'Detalle del anuncio no disponible temporalmente',
    'Storefront - En construcción': 'Tienda no disponible temporalmente',
    '{currentTab} - Página en construcción': '{currentTab} - Página no disponible temporalmente',
}
for old, new in replacements.items():
    text = text.replace(old, new)
app.write_text(text)
PY

bash "$SCAN_FILE"

echo "public copy fallback fix OK"
