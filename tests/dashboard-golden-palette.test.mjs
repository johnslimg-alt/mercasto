import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const source = fs.readFileSync('src/components/screens/UserDashboard.jsx', 'utf8');
const chatSource = fs.readFileSync('src/components/screens/ChatScreen.jsx', 'utf8');

test('dashboard generic chrome stays on the Mercasto Golden palette', () => {
  assert.equal(/\b(?:bg|text|border|from|to)-blue-/.test(source), false, 'generic dashboard blue tokens must not return');
  assert.equal(source.includes('color="blue"'), false, 'dashboard tabs/stats must not request blue theme');
  assert.match(source, /from-\[#84CC16\] to-\[#65A30D\]/);
  assert.match(source, /bg-lime-100 dark:bg-lime-500\/10/);
});

test('semantic status colors remain explicit', () => {
  assert.match(source, /bg-emerald-50/);
  assert.match(source, /bg-red-50/);
  assert.match(source, /from-amber-100 to-orange-100/);
});


test('dashboard mobile actions keep 48px touch targets', () => {
  assert.equal(source.includes('w-7 h-7'), false, 'credit purchase control must not remain 28px');
  assert.match(source, /dashboard-mobile-redeem-coupon[\s\S]*?min-h-12/);
  assert.match(source, /privacy-profile-visible-switch[\s\S]*?w-12 h-12/);
  assert.match(source, /privacy-tracking-consent-switch[\s\S]*?w-12 h-12/);
  assert.match(source, /className="inline-flex h-12 w-12 items-center justify-center transition-transform hover:scale-110"/);
  assert.match(source, /aria-label=\{\`\$\{star\} \/ 5\`\}/);
});


test('chat shell mobile navigation controls stay at the 48px contract', () => {
  assert.equal(chatSource.includes('min-h-11 min-w-11'), false, 'chat shell must not keep 44px navigation controls');
  const matches = chatSource.match(/min-h-12 min-w-12/g) || [];
  assert.ok(matches.length >= 3, 'chat needs 48px back, refresh, and thread-back controls');
  assert.match(chatSource, /mc-primary-action mc-icon-button/);
  assert.match(chatSource, /className="mc-control/);
});
