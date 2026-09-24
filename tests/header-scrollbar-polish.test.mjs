import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const css = fs.readFileSync('src/index.css', 'utf8');
const header = fs.readFileSync('src/components/shell/AppHeader.jsx', 'utf8');
const home = fs.readFileSync('src/components/home/MercastoGoldenHome.jsx', 'utf8');
const homeCss = fs.readFileSync('src/components/home/mercasto-golden-home.css', 'utf8');
const map = fs.readFileSync('src/components/common/MapV3.jsx', 'utf8');
const catalog = fs.readFileSync('src/components/screens/CatalogScreen.jsx', 'utf8');
const chat = fs.readFileSync('src/components/screens/ChatScreen.jsx', 'utf8');
const moderation = fs.readFileSync('src/components/admin/AdminModerationCenter.jsx', 'utf8');

test('all app scrollbars are hidden without disabling scrolling', () => {
  assert.match(css, /html,[\s\S]{0,80}body \*[\s\S]{0,80}scrollbar-width:\s*none/);
  assert.ok(css.includes('body *::-webkit-scrollbar'));
  assert.doesNotMatch(css, /scrollbar-width:\s*thin/);
  assert.equal(css.includes('overflow: hidden !important; /* global scrollbar'), false);
  assert.match(map, /map-filter-scroller[^"]*overflow-y-auto/);
  assert.match(css, /\.map-filter-scroller \{[\s\S]*?scrollbar-width:\s*none/);
  assert.match(catalog, /overflow-y-auto no-scrollbar/);
  assert.match(chat, /overflow-y-auto/);
  assert.match(moderation, /overflow-y-auto/);
});

test('header uses compact geometry and removes the redundant AI strip', () => {
  assert.ok(header.includes('h-[52px]'));
  assert.ok(header.includes('sm:h-[56px]'));
  assert.ok(header.includes('lg:h-[60px]'));
  assert.ok(header.includes('mobile-search-row py-2.5 lg:hidden'));
  assert.equal(header.includes('global-ai-brand-strip'), false);
  assert.ok(header.includes('data-testid="desktop-account-button" aria-label={user ? t.open_account_menu : t.login}'));
  assert.ok(header.includes('data-testid="desktop-location-button" aria-label={searchLocationInput ?'));
  assert.ok(header.includes('data-testid="mobile-location-button" aria-expanded={showMobileLocationPicker}'));
  assert.ok(header.includes('aria-label={`${t.change_location}: ${searchLocationInput || t.all_mexico}`}'));
  assert.ok(header.includes('hidden min-[400px]:inline truncate max-w-[68px]'));
  assert.match(css, /@media \(max-width: 399px\)[\s\S]*?\.mobile-location-select-top[\s\S]*?min-width:\s*3rem[\s\S]*?max-width:\s*3rem/);
  assert.match(css, /@media \(max-width: 1023px\)[\s\S]*?\.header-category-bar[\s\S]*?display:\s*none/);
});

test('approved home keeps distinct responsive discovery layouts', () => {
  assert.equal(home.includes('HERO STATS'), false);
  assert.ok(home.includes('mcg-desktop'));
  assert.ok(home.includes('mcg-ref-cats'));
  assert.ok(home.includes('mcg-tablet'));
  assert.ok(home.includes('mcg-mobile'));
  assert.match(homeCss, /@media\(max-width:1179px\) and \(min-width:768px\)/);
  assert.match(homeCss, /@media\(max-width:767px\)/);
});
