import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const sourceUrl = new URL('../src/components/screens/MyAdsScreen.jsx', import.meta.url);

test('archived AI human-review states stay in Pending instead of Sold', async () => {
  const source = await readFile(sourceUrl, 'utf8');

  assert.match(source, /HUMAN_REVIEW_STATUSES[\s\S]*manual_review[\s\S]*failed[\s\S]*admin_manual_review/);
  assert.match(source, /function awaitsHumanReview\(ad\)/);
  assert.match(source, /pending: userAds\.filter\(ad => ad\.status === 'pending' \|\| awaitsHumanReview\(ad\)\)/);
  assert.match(source, /!requiresSellerCorrection\(ad\) && !awaitsHumanReview\(ad\)/);
  assert.match(source, /pendingHumanReview \? \(t\.pending_status \|\| 'En Moderación'\)/);
  assert.match(source, /correction \|\| pendingHumanReview \?/);
  assert.match(source, /!correction && !pendingHumanReview && <Link/);
});
