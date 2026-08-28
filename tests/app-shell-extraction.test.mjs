import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const app = fs.readFileSync('src/App.jsx', 'utf8');
const header = fs.readFileSync('src/components/shell/AppHeader.jsx', 'utf8');
const footer = fs.readFileSync('src/components/shell/AppFooter.jsx', 'utf8');
const mobile = fs.readFileSync('src/components/shell/MobileTabBar.jsx', 'utf8');
const logo = fs.readFileSync('src/components/shell/MercastoLogo.jsx', 'utf8');

test('App delegates responsive chrome to focused shell components', () => {
  for (const marker of [
    "import AppHeader from './components/shell/AppHeader'",
    "import AppFooter from './components/shell/AppFooter'",
    "import MobileTabBar from './components/shell/MobileTabBar'",
    '<AppHeader', '<AppFooter', '<MobileTabBar',
  ]) assert.ok(app.includes(marker), marker);
  assert.equal(app.includes('<header className="site-header'), false);
  assert.equal(app.includes('<footer className="mt-10'), false);
  assert.equal(app.includes('mobile-tabbar md:hidden fixed'), false);
});

test('extracted shell preserves final visual and interaction anchors', () => {
  for (const marker of [
    'data-testid="desktop-header-row"',
    'data-testid="desktop-account-button"',
    'data-testid="mobile-header-search"',
    'data-testid="header-category-bar"',
    'data-testid="global-ai-brand-strip"',
  ]) assert.ok(header.includes(marker), marker);
  assert.ok(mobile.includes('mobile-tabbar md:hidden fixed'));
  assert.ok(mobile.includes('data-testid="mobile-notifications-tab"'));
  assert.ok(footer.includes('footer-logo'));
  assert.ok(logo.includes('rounded') === false || logo.includes('Mercasto'));
});
