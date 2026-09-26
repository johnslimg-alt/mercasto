import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const source = fs.readFileSync('src/App.jsx', 'utf8');

test('fatal system recovery keeps mobile-safe actions and hidden diagnostic scrollbar', () => {
  assert.match(source, /data-testid="fatal-open-guest"[\s\S]*?min-h-12/);
  assert.match(source, /data-testid="fatal-reload"[\s\S]*?min-h-12/);
  assert.match(source, /data-testid="fatal-error-code"[\s\S]*?no-scrollbar/);
});
