import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const css = fs.readFileSync('src/index.css', 'utf8');
const header = fs.readFileSync('src/components/shell/AppHeader.jsx', 'utf8');
const home = fs.readFileSync('src/components/screens/HomeScreen.jsx', 'utf8');

test('scrollbars are visually hidden without disabling scrolling', () => {
  assert.match(css, /\*[\s\S]{0,80}scrollbar-width:\s*none/);
  assert.match(css, /\*::\-webkit-scrollbar[\s\S]{0,120}display:\s*none\s*!important/);
  assert.equal(css.includes('overflow: hidden !important; /* global scrollbar'), false);
});

test('header uses compact geometry and removes the redundant AI strip', () => {
  assert.ok(header.includes('h-[52px]'));
  assert.ok(header.includes('sm:h-[56px]'));
  assert.ok(header.includes('lg:h-[60px]'));
  assert.ok(header.includes('mobile-search-row py-2.5 lg:hidden'));
  assert.equal(header.includes('global-ai-brand-strip'), false);
  assert.match(css, /@media \(max-width: 1023px\)[\s\S]*?\.header-category-bar[\s\S]*?display:\s*none/);
});

test('home discovery no longer repeats the old stats action toolbar', () => {
  assert.equal(home.includes('HERO STATS'), false);
  assert.ok(home.includes('max-w-[1480px]'));
  assert.ok(home.includes('data-testid="home-category-rail" className="category-rail rail-fade"'));
});
