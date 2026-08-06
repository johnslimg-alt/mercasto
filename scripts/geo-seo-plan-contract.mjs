import assert from 'node:assert/strict';
import fs from 'node:fs';

const mapPath = 'docs/seo/first-20-landing-page-map.json';
const baselinePath = 'docs/seo/GEO_SEO_BASELINE_2026-08-05.md';
const growthPlanPath = 'docs/runbooks/GROWTH_SEO_LAUNCH_PLAN.md';
const checklistPath = 'docs/seo-aeo-launch-checklist.md';

const map = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
const baseline = fs.readFileSync(baselinePath, 'utf8');
const growthPlan = fs.readFileSync(growthPlanPath, 'utf8');
const checklist = fs.readFileSync(checklistPath, 'utf8');

assert.equal(map.version, 1, 'unexpected GEO/SEO map version');
assert.equal(map.pages.length, 20, 'first landing-page map must contain exactly 20 entries');
assert.deepEqual(map.pages.map(page => page.rank), Array.from({ length: 20 }, (_, index) => index + 1), 'ranks must be 1–20');
assert.equal(new Set(map.pages.map(page => page.route)).size, 20, 'landing-page routes must be unique');

assert.equal(map.baseline.active_genuine, 0, 'baseline must be refreshed before changing zero-genuine stop condition');
assert.equal(map.baseline.active_total, map.baseline.active_catalog_filler, 'all active baseline records are expected to be catalog filler');
assert(map.baseline.active_without_state > 0, 'location-completeness blocker must remain explicit');

const liveDirectories = map.pages.filter(page => page.status === 'live_directory_not_inventory_qualified');
const blockedLocations = map.pages.filter(page => page.status === 'blocked_no_genuine_inventory');
assert.equal(liveDirectories.length, 14, 'expected 14 live national directory surfaces');
assert.equal(blockedLocations.length, 6, 'expected six blocked category-location candidates');

for (const page of liveDirectories) {
  assert(['national_vertical', 'national_category_hub'].includes(page.page_type), `${page.route}: unexpected live page type`);
  assert.equal(page.genuine_active, 0, `${page.route}: baseline genuine inventory mismatch`);
  assert(page.internal_links.length >= 3, `${page.route}: internal-link plan is incomplete`);
}

for (const page of blockedLocations) {
  assert(['state_category_candidate', 'city_category_candidate'].includes(page.page_type), `${page.route}: location candidate type required`);
  assert.equal(page.genuine_active, 0, `${page.route}: blocked route cannot claim genuine supply`);
  assert(page.route.split('/').filter(Boolean).length >= 2, `${page.route}: location route shape is incomplete`);
  assert(page.internal_links.includes('/post'), `${page.route}: seller acquisition path is required`);
}

const thresholds = map.thresholds;
for (const key of ['national_inventory_qualified', 'state_category', 'city_category']) {
  const threshold = thresholds[key];
  assert(threshold.genuine_active_min > 0, `${key}: active threshold must be positive`);
  assert(threshold.genuine_recent_90d_min > 0, `${key}: recency threshold must be positive`);
  assert(threshold.genuine_sellers_min > 0, `${key}: seller threshold must be positive`);
  assert(threshold.location_completeness_min_percent >= 80, `${key}: location completeness is too low`);
}
assert(thresholds.state_category.consecutive_weekly_snapshots >= 2, 'state pages need anti-flapping snapshots');
assert(thresholds.city_category.consecutive_weekly_snapshots >= 2, 'city pages need anti-flapping snapshots');
assert(thresholds.exit_policy.consecutive_weekly_snapshots >= 4, 'exit policy must resist temporary supply changes');

const combinedDocs = [baseline, growthPlan, checklist].join('\n');
for (const required of [
  'active genuine user ads',
  'Catalog filler never counts',
  'noindex,follow',
  'Google-Extended',
  'OAI-SearchBot',
  'PerplexityBot',
  'llms.txt',
]) {
  assert(combinedDocs.toLowerCase().includes(required.toLowerCase()), `missing documented GEO/SEO policy: ${required}`);
}

for (const forbidden of [
  'Tiendas y vendedores verificados en México',
  'Publica gratis y vende más rápido',
  'Create top city pages before inventory thresholds',
]) {
  assert(!combinedDocs.includes(forbidden), `outdated or unsupported Growth SEO assumption returned: ${forbidden}`);
}

assert(baseline.includes('Do not publish `/llms.txt`.'), 'llms.txt decision must be explicit');
assert(checklist.includes('**Blocked: qualification thresholds not met**'), 'state/city rollout blocker must stay threshold-based and visible');
assert(!checklist.includes('| Measurement | Weekly genuine-supply, Search Console and conversion report | Pending implementation |'), 'implemented weekly measurement cannot regress to pending');
assert(checklist.includes('Restricted Search Console reporting and GA4 Viewer reporting are connected'), 'external reporting status must stay documented');
assert(growthPlan.includes('../seo/first-20-landing-page-map.json'), 'growth plan must link to the machine-readable map');

console.log(`GEO/SEO plan contract OK: ${liveDirectories.length} live directories, ${blockedLocations.length} blocked location candidates.`);
