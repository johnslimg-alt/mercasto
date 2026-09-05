import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const lazyScreens = fs.readFileSync('src/app/lazyScreens.jsx', 'utf8');
const createFlow = fs.readFileSync('src/components/screens/PostScreenWithAutofill.jsx', 'utf8');
const editFlow = fs.readFileSync('src/components/screens/EditAdScreen.jsx', 'utf8');
const panel = fs.readFileSync('src/components/ai/ListingAutofillPanel.jsx', 'utf8');
const hook = fs.readFileSync('src/hooks/ai/useListingAutofill.js', 'utf8');
const i18n = fs.readFileSync('src/components/ai/listingAutofillI18n.js', 'utf8');

test('publish flow loads the seller-confirmed autofill wrapper without replacing manual PostScreen', () => {
  assert.match(lazyScreens, /PostScreenWithAutofill/);
  assert.match(createFlow, /<ListingAutofillPanel/);
  assert.match(createFlow, /<PostScreen key=/);
  assert.match(createFlow, /onApplyCategory=/);
  assert.match(createFlow, /onApplyAttribute=/);
  assert.match(createFlow, /onApplyTitle=/);
  assert.match(createFlow, /onApplyDescription=/);
});

test('edit flow exposes the same optional autofill panel while keeping the normal save form', () => {
  assert.match(editFlow, /<ListingAutofillPanel/);
  assert.match(editFlow, /<form onSubmit=\{handleSubmit\}/);
  assert.match(editFlow, /data-testid="edit-ad-save"/);
  assert.match(editFlow, /onApplyCategory=/);
  assert.match(editFlow, /onApplySubcategory=/);
  assert.match(editFlow, /onApplyAttribute=/);
  assert.match(editFlow, /onApplyTitle=/);
  assert.match(editFlow, /onApplyDescription=/);
});

test('suggestions are never silently applied and every action is an explicit button', () => {
  assert.match(panel, /const MIN_APPLY_CONFIDENCE = 0\.8;/);
  assert.match(panel, /const applyDisabled = disabled \|\| confidence < MIN_APPLY_CONFIDENCE;/);
  assert.match(panel, /type="button" disabled=\{applyDisabled\} onClick=\{onApply\}/);
  assert.match(panel, /onClick=\{run\}/);
  assert.doesNotMatch(panel, /useEffect\([^)]*onApply/s);
  assert.match(panel, /data-testid="listing-autofill-suggestions"/);
});

test('autofill request remains authenticated optional multipart with at most two new photos', () => {
  assert.match(hook, /new FormData\(\)/);
  assert.match(hook, /body\.append\('mode', 'listing_autofill'\)/);
  assert.match(hook, /filter\(\(image\) => image\?\.source === 'new'/);
  assert.match(hook, /\.slice\(0, 2\)/);
  assert.match(hook, /Authorization: `Bearer \$\{token\}`/);
});

test('listing autofill copy exists for all active UI languages', () => {
  for (const language of ['es', 'en', 'ru', 'pt', 'fr', 'de', 'it', 'zh', 'ko', 'ja', 'ar']) {
    assert.match(i18n, new RegExp(`\\n  ${language}: \\{`), `missing ${language}`);
  }
});
