import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { SUPPORTED_LANGUAGES } from '../src/utils/translations.js';

const home = fs.readFileSync('src/components/screens/HomeScreen.jsx', 'utf8');

async function translationsFor(lang) {
  return (await import(`../src/constants/translations/${lang}.js`)).default;
}

test('home promotional cards use guaranteed localization keys without Spanish fallbacks', async () => {
  const keys = ['deal_of_day', 'up_to_40', 'elec_phones', 'shop_now', 'ends_in_8h', 'furniture', 'living_room_sets', 'from_price', 'see_deals', 'automotive', 'certified_cars', 'zero_comm', 'browse_cars', 'for_sellers', 'boost_ad', 'boost_desc', 'promote_now'];
  for (const lang of SUPPORTED_LANGUAGES) {
    const t = await translationsFor(lang);
    for (const key of keys) assert.ok(String(t[key] || '').trim(), `${lang}.${key}`);
  }
  for (const key of keys) assert.doesNotMatch(home, new RegExp(`t\\.${key}\\s*\\|\\|`), key);
});
