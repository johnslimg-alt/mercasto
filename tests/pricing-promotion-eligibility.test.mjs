import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const app = fs.readFileSync('src/App.jsx', 'utf8');

test('pricing modal receives only ads accepted by the promotion eligibility contract', () => {
  assert.match(app, /import \{ isAdCreditPromotionEligible \} from '\.\/utils\/adBulkEligibility'/);
  assert.match(app, /filter\(isAdCreditPromotionEligible\)/);
  assert.match(app, /const selectedStillEligible = promotableAds\.some/);
  assert.match(app, /setPromotionTargetAdId\(promotableAds\.length > 0 \? String\(promotableAds\[0\]\.id\) : ''\)/);
  assert.doesNotMatch(app, /filter\(ad => ad\.status === 'active'\)/);
});
