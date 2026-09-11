#!/usr/bin/env node
/**
 * Home V2 parity audit — Legacy HomeScreen vs HomeScreenV2.
 *
 * The point of this gate is that nothing functional is lost by accident when
 * `/design-v2` becomes `/`. It compares the two screens mechanically and
 * classifies every production capability as one of:
 *
 *   V2 implemented        legacy signal present, V2 signal present
 *   intentionally removed legacy signal present, V2 absent, listed in INTENTIONAL
 *   MUST MIGRATE          legacy signal present, V2 absent, not intentional
 *   V2 only               no legacy signal, V2 signal present
 *   n/a                   neither side has the signal
 *
 * Exit code is non-zero when any MUST MIGRATE item exists, so this can be wired
 * into CI as a cutover gate. Every finding quotes the matched evidence so a
 * reviewer can verify it by hand instead of trusting the script.
 *
 * Usage: node scripts/home-v2-parity-audit.mjs [--json] [--write]
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const LEGACY_PATH = 'src/components/screens/HomeScreen.jsx';
const V2_PATH = 'src/components/screens/HomeScreenV2.jsx';
const APP_PATH = 'src/App.jsx';

const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const legacy = read(LEGACY_PATH);
const v2 = read(V2_PATH);
const app = read(APP_PATH);

// Some capabilities are expressed in the companion stylesheet rather than the
// JSX (dark mode being the obvious one), so the CSS participates in the audit.
const V2_CSS_PATH = 'src/components/screens/HomeScreenV2.css';
const legacyCss = fs.existsSync(path.join(ROOT, 'src/components/screens/HomeScreen.css'))
  ? read('src/components/screens/HomeScreen.css')
  : '';
const v2Css = fs.existsSync(path.join(ROOT, V2_CSS_PATH)) ? read(V2_CSS_PATH) : '';
const legacyAll = legacy + '\n' + legacyCss;
const v2All = v2 + '\n' + v2Css;

/* ─────────────────────────────────────────────────────────────────────────────
   1. Feature matrix
   Each entry lists evidence patterns. `re` is matched against the source and
   the first hit is quoted in the report.
   ───────────────────────────────────────────────────────────────────────────── */
const FEATURES = [
  // --- Discovery / navigation ---
  { id: 'search', group: 'Discovery', label: 'Search submit from home', legacy: [/executeSearch\?\.\(/], v2: [/executeSearch\?\.\(/] },
  { id: 'categories', group: 'Discovery', label: 'Category rail', legacy: [/home-category-rail/, /category-rail/], v2: [/v2-category-rail/, /CATEGORY_META/] },
  { id: 'pricing_entry', group: 'Discovery', label: 'Pricing entry from rail', legacy: [/action === 'pricing'/], v2: [/openPricing\('design_v2_category_rail'\)/] },
  { id: 'location_input', group: 'Discovery', label: 'Location input', legacy: [/setSearchLocationInput/], v2: [/setSearchLocationInput/] },
  { id: 'location_state', group: 'Filters', label: 'State/city selection', legacy: [/setSelectedState/, /selectedState/], v2: [/setSelectedState|selectedState/] },
  { id: 'price_range', group: 'Filters', label: 'Min/max price filters', legacy: [/setMinPrice/, /setMaxPrice/], v2: [/setMinPrice/, /setMaxPrice/] },
  { id: 'dynamic_filters', group: 'Filters', label: 'Dynamic attribute filters', legacy: [/dynamicFilters/], v2: [/dynamicFilters/] },
  { id: 'condition_filter', group: 'Filters', label: 'Condition filter', legacy: [/conditionFilter/], v2: [/conditionFilter/] },
  { id: 'sort', group: 'Filters', label: 'Sort control', legacy: [/sortBy|sort_by|\bsort\b/i], v2: [/\bsort\b/i] },
  { id: 'filter_panel', group: 'Filters', label: 'Filters UI on home', legacy: [/home-open-filters/], v2: [/v2-filter-panel/] },

  // --- Personalisation / account ---
  { id: 'saved_search', group: 'Account', label: 'Save search alert', legacy: [/handleSaveSearchAlert/], v2: [/handleSaveSearchAlert/] },
  { id: 'favorites', group: 'Account', label: 'Favourites wiring', legacy: [/favoriteIds|handleToggleFavorite/], v2: [/favoriteIds|handleToggleFavorite/] },
  { id: 'auth_user', group: 'Account', label: 'Auth-aware rendering (user prop)', legacy: [/\buser\b\s*[,}]/], v2: [/\buser\b\s*[,}]/] },
  { id: 'recently_viewed', group: 'Account', label: 'Recently viewed', legacy: [/getRecentlyViewed/], v2: [/getRecentlyViewed/] },
  { id: 'referral', group: 'Account', label: 'Referral hooks', legacy: [/referral/i], v2: [/referral/i] },

  // --- Listings ---
  { id: 'cards', group: 'Listings', label: 'Ad cards via renderAdCard', legacy: [/renderAdCard/], v2: [/renderAdCard/] },
  { id: 'promoted', group: 'Listings', label: 'Promoted / featured listings', legacy: [/featuredAds/, /promoted/], v2: [/featured/, /promoted/] },
  { id: 'trending', group: 'Listings', label: 'Trending block', legacy: [/trending_now/], v2: [/trending_now/] },
  { id: 'vertical_re', group: 'Verticals', label: 'Real estate block', legacy: [/realEstateAds/], v2: [/realEstateAds/] },
  { id: 'vertical_jobs', group: 'Verticals', label: 'Jobs block', legacy: [/jobAds/], v2: [/jobAds/] },
  { id: 'vertical_services', group: 'Verticals', label: 'Services block', legacy: [/serviceAds/], v2: [/serviceAds/] },
  { id: 'vertical_auto', group: 'Verticals', label: 'Automotive block', legacy: [/automotiveAds/], v2: [/automotiveAds/] },
  { id: 'vertical_re_quickfilters', group: 'Verticals', label: 'Real-estate quick filters (rent/buy/commercial)', legacy: [/home-real-estate-rent/], v2: [/home-real-estate-rent/] },
  // Component-backed features match an actual render (`<Name`), not the bare
  // identifier: a component that is only imported is not a homepage capability,
  // and treating it as one invents regressions that do not exist.
  { id: 'map', group: 'Verticals', label: 'Map usage on home', legacy: [/<MapV3\b/, /home-real-estate-map-card/], v2: [/<MapV3\b|home-real-estate-map-card/] },
  { id: 'recommendations', group: 'Listings', label: 'AI recommendations widget', legacy: [/<RecommendationsWidget\b/], v2: [/<RecommendationsWidget\b/] },
  { id: 'ads_total', group: 'Listings', label: 'Accurate total counter (adsTotal)', legacy: [/adsTotal/], v2: [/adsTotal/] },

  // --- Monetisation ---
  { id: 'pricing_modal', group: 'Monetisation', label: 'Pricing modal opens', legacy: [/setShowPricingModal/], v2: [/setShowPricingModal/] },
  { id: 'promotion', group: 'Monetisation', label: 'Promotion CTA', legacy: [/promote_ad|promote_now/], v2: [/promote_ad|promote_now/] },
  // Legacy HomeScreen only *imports* AdSenseBanner and never renders it (the
  // banner is rendered inside AdDetailScreen). Render-based matching is what
  // makes this correctly report n/a instead of a phantom regression.
  { id: 'adsense', group: 'Monetisation', label: 'Ad placements', legacy: [/<AdSenseBanner\b/], v2: [/<AdSenseBanner\b/] },

  // --- Publishing ---
  { id: 'publish_cta', group: 'Publishing', label: 'Publish CTA / tab switch', legacy: [/setCurrentTab\('post'\)/], v2: [/setCurrentTab\('post'\)/] },
  { id: 'how_it_works', group: 'Publishing', label: 'How Mercasto works', legacy: [/how_it_works/], v2: [/how_it_works/] },

  // --- Trust / discovery extras ---
  { id: 'discovery_sections', group: 'Content', label: 'Popular searches / cities / newsletter', legacy: [/<PopularSearchesSection\b|<CitiesSection\b|<NewsletterSection\b/], v2: [/<PopularSearchesSection\b|<CitiesSection\b|<NewsletterSection\b/] },
  { id: 'toast', group: 'Content', label: 'Home toast feedback', legacy: [/home-toast/], v2: [/home-toast/] },

  // --- SEO / metadata ---
  { id: 'seo_component', group: 'SEO', label: 'SEO component', legacy: [/<SEO\b/], v2: [/<SEO\b/] },
  { id: 'faq_schema', group: 'SEO', label: 'FAQ structured data', legacy: [/<FAQSchema\b/], v2: [/<FAQSchema\b/] },
  { id: 'itemlist_schema', group: 'SEO', label: 'ItemList structured data', legacy: [/<ItemListSchema\b/], v2: [/<ItemListSchema\b/] },
  { id: 'h1', group: 'SEO', label: 'Home H1', legacy: [/<h1/], v2: [/<h1/] },

  // --- Platform ---
  { id: 'analytics', group: 'Platform', label: 'Analytics events', legacy: [/events\./], v2: [/events\./] },
  { id: 'cookie_consent', group: 'Platform', label: 'Cookie/consent interaction', legacy: [/cookie|consent/i], v2: [/cookie|consent/i] },
  { id: 'dark_mode', group: 'Platform', label: 'Dark mode support', legacy: [/dark:/], v2: [/\.dark\b|dark:/], cssAware: true },
  { id: 'i18n_runtime', group: 'Platform', label: 'Uses production t.* keys', legacy: [/\bt\.[a-z_]+/], v2: [/\bt\.[a-z_]+/] },
];

/**
 * Capabilities the owner may deliberately drop on the homepage. Anything here
 * needs an explicit written reason; it is reported, but does not fail the gate.
 */
const INTENTIONAL = {
  // Populated during review; empty means "nothing agreed yet".
};

/* ─────────────────────────────────────────────────────────────────────────────
   2. Prop parity (function signature + App.jsx wiring)
   ───────────────────────────────────────────────────────────────────────────── */
function destructuredProps(source) {
  const m = source.match(/export default function\s+\w+\s*\(\s*\{([\s\S]*?)\}\s*\)/);
  if (!m) return [];
  return m[1]
    .replace(/\s+/g, ' ')
    .split(',')
    .map(s => s.trim().split(/[=:]/)[0].trim())
    .filter(Boolean);
}

const legacyProps = new Set(destructuredProps(legacy));
const v2Props = new Set(destructuredProps(v2));

// What App.jsx actually hands to each renderer.
function propsPassedTo(jsxNames) {
  const found = new Set();
  for (const name of jsxNames) {
    const re = new RegExp(`<${name}\\b([\\s\\S]*?)/>`, 'm');
    const m = app.match(re);
    if (!m) continue;
    for (const attr of m[1].matchAll(/(\w+)=/g)) found.add(attr[1]);
  }
  return found;
}
const appToLegacy = propsPassedTo(['HomeScreen']);
const appToV2 = propsPassedTo(['HomeScreenV2']);

/* ─────────────────────────────────────────────────────────────────────────────
   3. i18n gate — every t.key used by V2 must exist in all 11 runtime modules
   ───────────────────────────────────────────────────────────────────────────── */
const LANGS = ['es', 'en', 'pt', 'fr', 'zh', 'ko', 'de', 'it', 'ar', 'ru', 'ja'];

function keysUsed(source) {
  const keys = new Set();
  for (const m of source.matchAll(/\bt\.([A-Za-z_][A-Za-z0-9_]*)/g)) keys.add(m[1]);
  // keys injected through a local copy object (sectionCopy.foo = t.foo) are
  // already captured above; also catch explicit string literals in lookups.
  for (const m of source.matchAll(/t\[['"]([A-Za-z0-9_]+)['"]\]/g)) keys.add(m[1]);
  return [...keys].sort();
}

function langModuleHas(lang, key) {
  const rel = `src/constants/translations/${lang}.js`;
  const p = path.join(ROOT, rel);
  if (!fs.existsSync(p)) return null;
  const src = fs.readFileSync(p, 'utf8');
  return new RegExp(`["'\`]${key}["'\`]\\s*:`).test(src);
}

const v2Keys = keysUsed(v2);
const i18nGaps = [];
for (const key of v2Keys) {
  const missing = LANGS.filter(l => langModuleHas(l, key) === false);
  const absentModule = LANGS.filter(l => langModuleHas(l, key) === null);
  if (missing.length || absentModule.length) i18nGaps.push({ key, missing, absentModule });
}

/* ─────────────────────────────────────────────────────────────────────────────
   4. testid contract — data-testids asserted by the e2e suite that live on home
   ───────────────────────────────────────────────────────────────────────────── */
function testIdsUsedInTests() {
  const dir = path.join(ROOT, 'tests');
  const ids = new Set();
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, e.name);
      if (e.isDirectory()) { walk(full); continue; }
      if (!/\.(js|mjs)$/.test(e.name)) continue;
      const src = fs.readFileSync(full, 'utf8');
      for (const m of src.matchAll(/getByTestId\(\s*['"]([a-z0-9-]+)['"]/gi)) ids.add(m[1]);
      for (const m of src.matchAll(/data-testid="([a-z0-9-]+)"/gi)) ids.add(m[1]);
    }
  };
  if (fs.existsSync(dir)) walk(dir);
  return [...ids];
}

/** testids built from template literals, e.g. data-testid={`home-category-${slug}`} */
function testIdPrefixes(source) {
  const set = new Set();
  for (const m of source.matchAll(/data-testid=\{`([^`$]*)/g)) set.add(m[1]);
  return [...set].filter(Boolean);
}

function testIdPresent(source, id) {
  if (source.includes(`data-testid="${id}"`)) return true;
  return testIdPrefixes(source).some(p => id.startsWith(p));
}

const homeTestIds = testIdsUsedInTests().filter(id => id.startsWith('home-'));
const testIdContract = homeTestIds.map(id => ({
  id,
  inLegacy: testIdPresent(legacy, id),
  inV2: testIdPresent(v2, id),
}));

/* ─────────────────────────────────────────────────────────────────────────────
   5. Child component / import parity
   ───────────────────────────────────────────────────────────────────────────── */
function importedModules(source) {
  const set = new Set();
  for (const m of source.matchAll(/import\s+([\s\S]*?)\s+from\s+['"]([^'"]+)['"]/g)) {
    set.add(m[2]);
  }
  return set;
}
const legacyImports = importedModules(legacy);
const v2Imports = importedModules(v2);
const importsOnlyLegacy = [...legacyImports].filter(i => !v2Imports.has(i)).sort();

/* ─────────────────────────────────────────────────────────────────────────────
   6. Analytics event parity
   ───────────────────────────────────────────────────────────────────────────── */
function eventNames(source) {
  const set = new Set();
  for (const m of source.matchAll(/events\.([A-Za-z0-9_]+)\s*\(/g)) set.add(m[1]);
  return [...set].sort();
}
const legacyEvents = eventNames(legacy);
const v2Events = eventNames(v2);

/* ─────────────────────────────────────────────────────────────────────────────
   Evaluate the matrix
   ───────────────────────────────────────────────────────────────────────────── */
function matchAny(source, patterns) {
  for (const re of patterns) {
    const m = source.match(re);
    if (m) return m[0];
  }
  return null;
}

const rows = FEATURES.map(f => {
  const lSource = f.cssAware ? legacyAll : legacy;
  const vSource = f.cssAware ? v2All : v2;
  const l = matchAny(lSource, f.legacy);
  const v = matchAny(vSource, f.v2);
  let status;
  if (!l && !v) status = 'n/a';
  else if (l && v) status = 'V2 implemented';
  else if (!l && v) status = 'V2 only';
  else status = INTENTIONAL[f.id] ? 'intentionally removed' : 'MUST MIGRATE';
  return { ...f, legacyEvidence: l, v2Evidence: v, status };
});

const mustMigrate = rows.filter(r => r.status === 'MUST MIGRATE');
const propsMissing = [...legacyProps].filter(p => !v2Props.has(p)).sort();
const appPropsMissing = [...appToLegacy].filter(p => !appToV2.has(p)).sort();
const testIdBroken = testIdContract.filter(t => t.inLegacy && !t.inV2);

/* ─────────────────────────────────────────────────────────────────────────────
   Report
   ───────────────────────────────────────────────────────────────────────────── */
const lines = [];
const P = (s = '') => lines.push(s);

P('# Home V2 parity audit — Legacy vs V2');
P();
P(`Generated: ${new Date().toISOString()}`);
P();
P(`- Legacy: \`${LEGACY_PATH}\` (${legacy.split('\n').length} lines)`);
P(`- V2:     \`${V2_PATH}\` (${v2.split('\n').length} lines)`);
P();
P('## Verdict');
P();
P(`- Features audited: **${rows.length}**`);
P(`- V2 implemented: **${rows.filter(r => r.status === 'V2 implemented').length}**`);
P(`- V2 only: **${rows.filter(r => r.status === 'V2 only').length}**`);
P(`- Intentionally removed: **${rows.filter(r => r.status === 'intentionally removed').length}**`);
P(`- **MUST MIGRATE: ${mustMigrate.length}**`);
P(`- Legacy props not accepted by V2: **${propsMissing.length}**`);
P(`- App.jsx props not forwarded to V2: **${appPropsMissing.length}**`);
P(`- Home testids asserted by tests but absent in V2: **${testIdBroken.length}**`);
P(`- V2 i18n keys missing from one or more of the 11 runtime modules: **${i18nGaps.length}**`);
P();

P('## Feature matrix');
P();
P('| Feature | Group | Legacy | V2 | Status |');
P('| --- | --- | --- | --- | --- |');
for (const r of rows) {
  const ev = (s) => (s ? '`' + String(s).replace(/\|/g, '\\|').replace(/`/g, "'").slice(0, 46) + '`' : '—');
  P(`| ${r.label} | ${r.group} | ${ev(r.legacyEvidence)} | ${ev(r.v2Evidence)} | ${r.status} |`);
}
P();

P('## MUST MIGRATE detail');
P();
if (!mustMigrate.length) P('_None._');
for (const r of mustMigrate) {
  P(`### ${r.label}  \`${r.id}\``);
  P();
  P(`- Group: ${r.group}`);
  P(`- Legacy evidence: \`${r.legacyEvidence}\``);
  P(`- V2 evidence: none`);
  P();
}
P();

P('## Legacy props not accepted by V2');
P();
P(propsMissing.length ? propsMissing.map(p => `- \`${p}\``).join('\n') : '_None._');
P();
P('## App.jsx props not forwarded to V2');
P();
P(appPropsMissing.length ? appPropsMissing.map(p => `- \`${p}\``).join('\n') : '_None._');
P();

P('## Home testids asserted by the test suite');
P();
P('| testid | in legacy | in V2 |');
P('| --- | --- | --- |');
for (const t of testIdContract) P(`| \`${t.id}\` | ${t.inLegacy ? 'yes' : 'no'} | ${t.inV2 ? 'yes' : 'no'} |`);
P();

P('## Imports present only in legacy');
P();
P(importsOnlyLegacy.length ? importsOnlyLegacy.map(i => `- \`${i}\``).join('\n') : '_None._');
P();

P('## Analytics events');
P();
P(`- Legacy: ${legacyEvents.length ? legacyEvents.map(e => '`' + e + '`').join(', ') : '—'}`);
P(`- V2: ${v2Events.length ? v2Events.map(e => '`' + e + '`').join(', ') : '—'}`);
P();

P('## i18n gate — V2 keys across the 11 runtime language modules');
P();
P(`V2 uses **${v2Keys.length}** distinct \`t.*\` keys.`);
P();
if (!i18nGaps.length) {
  P('_All V2 keys exist in every runtime language module._');
} else {
  P('| key | missing in | module absent |');
  P('| --- | --- | --- |');
  for (const g of i18nGaps) {
    P(`| \`${g.key}\` | ${g.missing.join(', ') || '—'} | ${g.absentModule.join(', ') || '—'} |`);
  }
}
P();

const report = lines.join('\n');

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({
    generatedAt: new Date().toISOString(),
    counts: {
      features: rows.length,
      implemented: rows.filter(r => r.status === 'V2 implemented').length,
      v2Only: rows.filter(r => r.status === 'V2 only').length,
      intentional: rows.filter(r => r.status === 'intentionally removed').length,
      mustMigrate: mustMigrate.length,
      propsMissing: propsMissing.length,
      appPropsMissing: appPropsMissing.length,
      testIdBroken: testIdBroken.length,
      i18nGaps: i18nGaps.length,
    },
    mustMigrate: mustMigrate.map(r => ({ id: r.id, label: r.label, group: r.group, legacyEvidence: r.legacyEvidence })),
    propsMissing,
    appPropsMissing,
    testIdBroken,
    i18nGaps,
    rows,
  }, null, 2));
} else {
  console.log(report);
}

if (process.argv.includes('--write')) {
  const out = 'docs/home-v2-parity-audit.md';
  fs.writeFileSync(path.join(ROOT, out), report + '\n');
  console.error(`\n[parity] report written to ${out}`);
}

const failed = mustMigrate.length > 0 || i18nGaps.length > 0 || testIdBroken.length > 0;
if (failed) {
  console.error(
    `\n[parity] FAIL — must-migrate=${mustMigrate.length} i18n-gaps=${i18nGaps.length} testid-breaks=${testIdBroken.length}`,
  );
}
process.exit(failed ? 1 : 0);
