import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const myAds = fs.readFileSync('src/components/screens/MyAdsScreen.jsx', 'utf8');
const dashboard = fs.readFileSync('src/components/screens/UserDashboard.jsx', 'utf8');

test('My Ads relies on one dashboard-level PRO upgrade CTA', () => {
  assert.equal(myAds.includes("accountType === 'particular'"), false);
  assert.equal(myAds.includes('setShowPricingModal'), false);
  assert.equal(myAds.includes('upgrade_pro'), false);

  assert.match(
    dashboard,
    /accountType === 'particular'[\s\S]{0,240}data-testid="dashboard-pro-upgrade-banner"/
  );
  assert.equal(
    (dashboard.match(/data-testid="dashboard-pro-upgrade-banner"/g) || []).length,
    1
  );
});
