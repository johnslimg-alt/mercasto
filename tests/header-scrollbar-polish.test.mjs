import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const css = fs.readFileSync('src/index.css', 'utf8');
const header = fs.readFileSync('src/components/shell/AppHeader.jsx', 'utf8');
const home = fs.readFileSync('src/components/screens/HomeScreen.jsx', 'utf8');
const map = fs.readFileSync('src/components/common/MapV3.jsx', 'utf8');
const catalog = fs.readFileSync('src/components/screens/CatalogScreen.jsx', 'utf8');
const chat = fs.readFileSync('src/components/screens/ChatScreen.jsx', 'utf8');
const moderation = fs.readFileSync('src/components/admin/AdminModerationCenter.jsx', 'utf8');

test('decorative scrollbars are hidden without disabling essential vertical scroll controls', () => {
  assert.doesNotMatch(css, /html,[\s\S]{0,80}#root \{[\s\S]{0,80}scrollbar-width:\s*none/);
  assert.equal(css.includes('*::-webkit-scrollbar'), false);
  assert.equal(css.includes('* {\n  scrollbar-width: none'), false);
  assert.equal(css.includes('overflow: hidden !important; /* global scrollbar'), false);
  assert.match(map, /map-filter-scroller[^"]*overflow-y-auto/);
  assert.doesNotMatch(map, /map-filter-scroller[^"]*no-scrollbar/);
  assert.match(css, /\.map-filter-scroller \{[\s\S]*?scrollbar-width:\s*none/);
  assert.doesNotMatch(css, /@media \(min-width: 1024px\)[\s\S]*?\.map-filter-scroller[\s\S]*?scrollbar-width:\s*thin/);
  assert.match(catalog, /overflow-y-auto no-scrollbar/);
  assert.match(chat, /overflow-y-auto/);
  assert.doesNotMatch(chat, /overflow-y-auto[^"]*no-scrollbar/);
  assert.match(moderation, /overflow-y-auto/);
  assert.doesNotMatch(moderation, /overflow-y-auto[^"]*no-scrollbar/);
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

test('home discovery no longer repeats the old stats action toolbar', () => {
  assert.equal(home.includes('HERO STATS'), false);
  assert.ok(home.includes('max-w-[1480px]'));
  assert.ok(home.includes('data-testid="home-category-rail" className="category-rail rail-fade"'));
  assert.match(css, /\.rail-fade \{[\s\S]*?mask-image:\s*linear-gradient\(90deg, black 0,/);
  assert.match(css, /\.category-rail \{[\s\S]*?padding-inline:\s*0\.125rem 1\.625rem/);
});
