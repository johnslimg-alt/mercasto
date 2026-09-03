import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const overlay = fs.readFileSync('src/components/admin/AdminFraudRiskOverlay.jsx', 'utf8');
const i18n = fs.readFileSync('src/components/admin/adminFraudRiskI18n.js', 'utf8');

test('fraud risk overlay paginates the full review feed', () => {
  assert.match(overlay, /per_page=\$\{PAGE_SIZE\}&page=\$\{requestedPage\}/);
  assert.match(overlay, /setTotal\(Math\.max\(0, Number\(payload\?\.total \?\? 0\)\)\)/);
  assert.match(overlay, /setLastPage\(Math\.max\(1, Number\(payload\?\.last_page \?\? 1\)\)\)/);
  assert.match(overlay, /changePage\(page - 1\)/);
  assert.match(overlay, /changePage\(page \+ 1\)/);
  assert.match(overlay, /t\('total', \{ count: total \}\)/);
});

test('fraud risk overlay surfaces degraded batch provenance', () => {
  assert.match(overlay, /payload\?\.degraded/);
  assert.match(overlay, /payload\?\.providers/);
  assert.match(overlay, /t\('degraded'\)/);
});

test('fraud risk pagination copy exists in all supported languages', () => {
  for (const language of ['es', 'en', 'ru', 'pt', 'fr', 'de', 'it', 'zh', 'ko', 'ja', 'ar']) {
    const languageStart = i18n.indexOf(`  ${language}: {`);
    assert.notEqual(languageStart, -1, `missing language ${language}`);
    const nextLanguage = i18n.indexOf('\n  },', languageStart);
    const block = i18n.slice(languageStart, nextLanguage);
    for (const key of ['previous:', 'next:', 'page:', 'pagination:']) {
      assert.ok(block.includes(key), `${language} missing ${key}`);
    }
  }
});
