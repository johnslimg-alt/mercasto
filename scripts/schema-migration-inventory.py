#!/usr/bin/env python3
import re
import sys
from pathlib import Path

root = Path(sys.argv[1] if len(sys.argv) > 1 else 'backend/database/migrations')
state: set[str] = set()
patterns = [
    ('create', re.compile(r"Schema::create\(\s*['\"]([^'\"]+)['\"]")),
    ('drop', re.compile(r"Schema::drop(?:IfExists)?\(\s*['\"]([^'\"]+)['\"]")),
    ('rename', re.compile(r"Schema::rename\(\s*['\"]([^'\"]+)['\"]\s*,\s*['\"]([^'\"]+)['\"]")),
]

for path in sorted(root.glob('*.php')):
    text = path.read_text(encoding='utf-8', errors='ignore').split('public function down', 1)[0]
    events = []
    for kind, pattern in patterns:
        for match in pattern.finditer(text):
            events.append((match.start(), kind, match.groups()))
    for _, kind, groups in sorted(events):
        if kind == 'create':
            state.add(groups[0])
        elif kind == 'drop':
            state.discard(groups[0])
        else:
            state.discard(groups[0])
            state.add(groups[1])

for table in sorted(state):
    print(table)
