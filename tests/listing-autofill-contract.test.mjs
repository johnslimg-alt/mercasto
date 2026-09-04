import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const lazyScreens = fs.readFileSync('src/app/lazyScreens.jsx', 'utf8');
const createFlow = fs.readFileSync('src/components/screens/PostScreenWithAutofill.jsx', 'utf8');
const panel = fs.readFileSync('src/components/ai/ListingAutofillPanel.jsx', 'utf8');
const hook = fs.readFileSync('src/hooks/ai/useListingAutofill.js', 'utf8');
const i18n = fs.readFileSync('src/components/ai/listingAutofillI18n.js', 'utf8');

test('publish flow adds optional autofill without replacing the manual PostScreen', () => {
  assert.match(lazyScreens, /PostScreenWithAutofill/);
  assert.match(createFlow, /<ListingAutofillPanel/);
  assert.match(createFlow, /<PostScreen key=/);
  assert.match(createFlow, /onApplyCategory=/);
  assert.match(createFlow, /onApplySubcategory=/);
  assert.match(createFlow, /onApplyAttribute=/);
  assert.match(createFlow, /onApplyTitle=/);
  assert.match(createFlow, /onApplyDescription=/);
});

test('suggestions are never silently applied', () => {
  assert.match(panel, /type="button"/);
  assert.match(panel, /onClick=\{onApply\}/);
  assert.match(panel, /onClick=\{run\}/);
  assert.doesNotMatch(panel, /useEffect\([^)]*onApply/s);
  assert.match(panel, /data-testid="listing-autofill-suggestions"/);
});

test('autofill request uses the protected dedicated endpoint and bounded multipart input', () => {
  assert.match(hook, /`\$\{API_URL\}\/ads\/autofill`/);
  assert.match(hook, /body\.append\('hint_text'/);
  assert.doesNotMatch(hook, /generate-description/);
  assert.doesNotMatch(hook, /body\.append\('mode'/);
  assert.match(hook, /filter\(\(image\) => image\?\.source === 'new'/);
  assert.match(hook, /\.slice\(0, 2\)/);
  assert.match(hook, /body\.append\('images\[\]'/);
  assert.match(hook, /Authorization: `Bearer \$\{token\}`/);
});

test('frontend accepts only available suggestion responses and keeps failure optional', () => {
  assert.match(hook, /!payload\.available \|\| !payload\.suggestions/);
  assert.match(hook, /setSuggestions\(null\)/);
  assert.match(panel, /copy\.unavailable/);
});

test('listing autofill copy exists for every active UI language', () => {
  for (const language of ['es', 'en', 'ru', 'pt', 'fr', 'de', 'it', 'zh', 'ko', 'ja', 'ar']) {
    assert.match(i18n, new RegExp(`\\n  ${language}: \\{`), `missing ${language}`);
  }
});
