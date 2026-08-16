import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const adminScreen = fs.readFileSync(path.join(root, 'src/components/screens/AdminScreen.jsx'), 'utf8');

test('admin users show their persisted registration date', () => {
  assert.match(adminScreen, /data-testid=\{`admin-user-registered-\$\{u\.id\}`\}/);
  assert.match(adminScreen, /\{t\.member_since \|\| 'Miembro desde'\}/);
  assert.match(adminScreen, /u\.created_at \? formatDate\(u\.created_at, lang\) : '—'/);
});
