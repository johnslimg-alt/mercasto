import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  getTwoFactorReauthTranslations,
  twoFactorReauthLanguages,
} from '../src/constants/twoFactorReauthTranslations.js';

const component = readFileSync('src/components/profile/TwoFactorAuthSection.jsx', 'utf8');
const expectedLanguages = ['es', 'en', 'pt', 'fr', 'zh', 'ko', 'de', 'it', 'ar', 'ru', 'ja'];
const requiredKeys = [
  'twofa_reauth_title',
  'twofa_reauth_desc',
  'twofa_reauth_code',
  'twofa_reauth_invalid',
  'twofa_disable_confirm_action',
];

test('2FA disable submits an explicit reauthentication credential', () => {
  assert.match(component, /method:\s*'DELETE'/);
  assert.match(component, /'Content-Type':\s*'application\/json'/);
  assert.match(component, /body:\s*JSON\.stringify/);
  assert.match(component, /password:\s*disablePassword/);
  assert.match(component, /code:\s*disableCode/);
  assert.match(component, /disabled=\{loading \|\| \(!disablePassword && !disableCode\)\}/);
});

test('2FA reauthentication copy is complete for all supported languages', () => {
  assert.deepEqual([...twoFactorReauthLanguages].sort(), [...expectedLanguages].sort());
  for (const language of expectedLanguages) {
    const translations = getTwoFactorReauthTranslations(language);
    for (const key of requiredKeys) {
      assert.equal(typeof translations[key], 'string', `${language}.${key} must be a string`);
      assert.ok(translations[key].trim().length > 0, `${language}.${key} must not be empty`);
    }
  }
});
