import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const service = fs.readFileSync('backend/app/Services/SeoWeeklyMeasurementService.php', 'utf8');
const controller = fs.readFileSync('backend/app/Http/Controllers/Api/AdminSeoMeasurementController.php', 'utf8');
const admin = fs.readFileSync('src/components/admin/AdminSeoMeasurement.jsx', 'utf8');

const METRICS = [
  'internal_conversations_started',
  'seller_replied_conversations',
  'seller_response_rate_percent',
  'median_first_response_minutes',
  'seller_replies_within_2h_percent',
];

test('weekly measurement derives aggregate first-response metrics from genuine conversations', () => {
  assert.match(service, /join\('ads', 'ads\.id', '=', 'conversations\.ad_id'\)/);
  assert.match(service, /where\('ads\.is_catalog_filler', false\)/);
  assert.match(service, /conversationResponseMetrics\(\$start, \$end\)/);
  for (const metric of METRICS) assert.match(service, new RegExp(`'${metric}'`));
  assert.match(service, /private function median\(array \$values\): \?float/);
});

test('admin response whitelist exposes only aggregate response metrics', () => {
  for (const metric of METRICS) assert.match(controller, new RegExp(`'${metric}'`));
  for (const blocked of ['message_content', 'buyer_email', 'seller_email', 'phone_number']) {
    assert.doesNotMatch(controller, new RegExp(blocked));
  }
});

test('admin UI renders first-response KPIs without user identifiers', () => {
  assert.match(admin, /current\.internal_conversations_started/);
  assert.match(admin, /current\.seller_response_rate_percent/);
  assert.match(admin, /current\.median_first_response_minutes/);
  assert.match(admin, /current\.seller_replies_within_2h_percent/);
  assert.doesNotMatch(admin, /current\.(?:buyer_id|seller_id|user_id)/);
});
