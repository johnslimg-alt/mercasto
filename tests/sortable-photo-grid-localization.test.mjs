import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { SUPPORTED_LANGUAGES } from '../src/utils/translations.js';

const source = fs.readFileSync('src/components/SortablePhotoGrid.jsx', 'utf8');

test('sortable photo grid follows the live Mercasto UI language', () => {
  assert.match(source, /import \{ useUI \} from '\.\.\/contexts\/UIContext'/);
  assert.match(source, /const \{ lang: uiLang \} = useUI\(\)/);
  assert.match(source, /const activeLang = lang \|\| uiLang/);
  assert.match(source, /lang=\{activeLang\}/);
  assert.doesNotMatch(source, /document\.documentElement\.lang/);
});

test('cover labels cover exactly the 11 active languages', () => {
  assert.equal(SUPPORTED_LANGUAGES.length, 11);
  assert.equal(SUPPORTED_LANGUAGES.includes('he'), false);
  assert.equal(SUPPORTED_LANGUAGES.includes('yi'), false);
  for (const lang of SUPPORTED_LANGUAGES) {
    assert.match(source, new RegExp(`\\n\\s{2}${lang}:\\s`), lang);
  }
  assert.doesNotMatch(source, /\n\s{2}(he|yi):\s/);
});
