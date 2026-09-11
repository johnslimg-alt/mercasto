import { readFileSync, readdirSync, statSync } from 'node:fs';

const checks = [];

function read(path) {
  return readFileSync(path, 'utf8');
}

function assertContains(path, needle, reason) {
  const content = read(path);
  if (!content.includes(needle)) {
    throw new Error(`${path} must contain ${JSON.stringify(needle)}: ${reason}`);
  }
  checks.push(`${path}: ${reason}`);
}

function assertNotContains(path, needle, reason) {
  const content = read(path);
  if (content.includes(needle)) {
    throw new Error(`${path} must not contain ${JSON.stringify(needle)}: ${reason}`);
  }
  checks.push(`${path}: ${reason}`);
}

function assertOrder(path, firstNeedle, secondNeedle, reason) {
  const content = read(path);
  const first = content.indexOf(firstNeedle);
  const second = content.indexOf(secondNeedle);
  if (first < 0 || second < 0 || first >= second) {
    throw new Error(`${path} must place ${JSON.stringify(firstNeedle)} before ${JSON.stringify(secondNeedle)}: ${reason}`);
  }
  checks.push(`${path}: ${reason}`);
}

/**
 * Assert that the ranking call is the query's FIRST ordering key: every other
 * ordering clause (promotions, price, date, distance, id tie-breaker) must come
 * after it, otherwise it would outrank real inventory again.
 */
function assertFirstOrderingKey(path, methodSignature, needle, reason) {
  const content = read(path);
  const start = content.indexOf(methodSignature);
  if (start < 0) {
    throw new Error(`${path} must define ${methodSignature}: ${reason}`);
  }

  const nextMethod = content.indexOf('\n    public function ', start + 1);
  const body = content.slice(start, nextMethod === -1 ? content.length : nextMethod);
  const rankedAt = body.indexOf(needle);
  if (rankedAt < 0) {
    throw new Error(`${path} ${methodSignature} must rank through ${JSON.stringify(needle)}: ${reason}`);
  }

  const competing = [...body.matchAll(/->(?:orderByRaw|orderByDesc|orderBy|latest)\(/g)]
    .map((match) => match.index)
    .filter((index) => index < rankedAt);

  if (competing.length > 0) {
    throw new Error(
      `${path} ${methodSignature} must rank on the catalog-reference flag before any other ordering clause, found ${competing.length} earlier ordering clause(s): ${reason}`
    );
  }

  checks.push(`${path}: ${reason}`);
}

/**
 * The catalog ranking rule must have exactly one implementation. Re-inlining it in
 * another query — especially in an unrouted controller that looks authoritative —
 * is how the public catalog ended up ranking editorial references first.
 */
function assertNoInlineCatalogRanking(root) {
  const offenders = [];
  const prune = new Set(['node_modules', 'vendor', 'storage']);

  const walk = (dir) => {
    for (const entry of readdirSync(dir)) {
      if (prune.has(entry)) continue;
      const path = `${dir}/${entry}`;
      if (statSync(path).isDirectory()) {
        walk(path);
        continue;
      }
      if (!entry.endsWith('.php')) continue;
      if (/->orderBy\(\s*['"]ads\.is_catalog_filler['"]/.test(read(path))) {
        offenders.push(path);
      }
    }
  };

  walk(root);

  if (offenders.length > 0) {
    throw new Error(
      `${offenders.join(', ')} must not order catalog listings inline: catalog ranking belongs to App\\Support\\CatalogInventoryRanking`
    );
  }

  checks.push(`${root}: catalog ranking keeps a single query-layer implementation`);
}

assertContains(
  'index.html',
  "typeof window.Notification === 'undefined'",
  'inline Notification fallback protects iOS browsers before the app bundle loads'
);

assertContains(
  'src/main.jsx',
  "./lib/notificationPolyfill.js",
  'pre-React Notification fallback is loaded before App.jsx'
);

assertContains(
  'src/lib/notificationPolyfill.js',
  'fallbackNotification.requestPermission',
  'Notification fallback exposes requestPermission safely'
);

assertContains(
  'src/main.jsx',
  'installStaleChunkRecovery();',
  'stale Vite chunks are recovered before React renders the paid landing route'
);

assertContains(
  'src/utils/staleChunkRecovery.js',
  "url.searchParams.delete('__mercasto_refresh')",
  'stale recovery loop guard compares the original route without its cache-buster'
);

assertContains(
  'src/utils/staleChunkRecovery.js',
  'window.location.replace(recoveryUrl())',
  'stale recovery reloads the same route instead of sending traffic to the homepage'
);

assertContains(
  'public/stale-module.js',
  "routeUrl.searchParams.delete('__mercasto_refresh')",
  'nginx stale-module fallback uses the same normalized route guard'
);

assertNotContains(
  'public/stale-module.js',
  "location.replace('/')",
  'stale asset recovery must never discard the paid landing page'
);

assertContains(
  'src/main.jsx',
  'installCampaignAttribution();',
  'campaign attribution is captured before analytics bridges initialize'
);

assertOrder(
  'src/main.jsx',
  'installCampaignAttribution();',
  'installMetaCapiBridge();',
  'Meta receives the campaign-enriched data layer'
);

assertOrder(
  'src/main.jsx',
  'installCampaignAttribution();',
  'initTikTokPixel();',
  'TikTok receives the campaign-enriched data layer'
);

assertContains(
  'src/main.jsx',
  'const vendorFallbackMs = 12000;',
  'heavy analytics vendors have a conservative delayed fallback'
);

assertContains(
  'src/main.jsx',
  "window.addEventListener('pointerdown', activateVendorAnalytics",
  'heavy analytics vendors activate on the first user interaction'
);

assertContains(
  'src/utils/analytics.js',
  'pendingVendorEvents',
  'first-party analytics queues vendor events before external scripts activate'
);

assertContains(
  'src/main.jsx',
  'metaBridge.replayMetaBrowserEvents();',
  'Meta browser conversions emitted before vendor activation are replayed'
);

assertContains(
  'src/utils/protectedRouteReturn.js',
  "trackSellerFunnel('seller_post_returned_after_auth'",
  'seller registration return is measured as a funnel step'
);

assertContains(
  'src/utils/protectedRouteReturn.js',
  "trackSellerFunnel('seller_post_intent_abandoned'",
  'seller intent drop-off is measurable for marketing optimization'
);

assertContains(
  'src/utils/protectedRouteReturn.js',
  "trackSellerFunnel('contact_returned_after_auth'",
  'listing contact returns to the exact seller conversation after authentication'
);

assertContains(
  'src/components/screens/AdDetailScreen.jsx',
  'data-testid="guest-contact-auth"',
  'guest contact CTA preserves the listing and seller context'
);

assertContains(
  'src/utils/metaCapiBridge.js',
  'registrationEventId()',
  'Meta registration ids use the shared funnel event-id generator'
);

assertContains(
  'src/utils/funnelAnalytics.js',
  "return createAnalyticsEventId('register_user');",
  'shared registration ids satisfy the backend observer allowlist'
);

assertContains(
  'src/utils/metaCapiBridge.js',
  'meta_event_id: sharedEventId',
  'the registration request carries the server-side CompleteRegistration event id'
);

assertContains(
  'src/utils/metaCapiBridge.js',
  'if (response.ok) {',
  'browser CompleteRegistration waits for successful account creation'
);

assertContains(
  'src/utils/metaCapiBridge.js',
  'event_id: patched.sharedEventId',
  'browser and server CompleteRegistration copies share one deduplication id'
);

assertOrder(
  'src/utils/metaCapiBridge.js',
  'meta_event_id: sharedEventId',
  'const response = await currentFetch.call(this, input, patched.init);',
  'the event id is attached before Laravel creates the user'
);

assertOrder(
  'src/utils/metaCapiBridge.js',
  'const response = await currentFetch.call(this, input, patched.init);',
  'trackEvent(FUNNEL_EVENTS.SIGN_UP',
  'the browser conversion is emitted only after the registration response succeeds'
);

assertContains(
  'src/utils/metaCapiBridge.js',
  'patchRegistrationFetch();',
  'the registration handoff is installed with the existing Meta bridge'
);

for (const path of ['src/App.jsx', 'src/components/common/AdCard.jsx', 'src/components/screens/HomeScreen.jsx']) {
  assertNotContains(
    path,
    '4 + (((Number(ad.id) || 1) % 10) / 10)',
    'ad ratings must never be synthesized from an ad id'
  );
  assertNotContains(
    path,
    '((Number(ad.id) || 1) % 7) + 1',
    'review counts must never be synthesized from an ad id'
  );
}

assertContains(
  'src/components/common/AdCard.jsx',
  'if (!hasReviews) return null;',
  'rating social proof renders only when real review data exists'
);

assertContains(
  'src/components/screens/HomeScreen.jsx',
  'rating.hasReviews &&',
  'homepage rating social proof renders only when real review data exists'
);

// Catalog-reference integrity: keep the marketplace full without fabricating seller activity.
assertNotContains(
  'src/components/screens/AdDetailScreen.jsx',
  '4 + (((Number(ad.id) || 1) % 10) / 10)',
  'detail pages must never synthesize ratings from an ad id'
);

assertNotContains(
  'src/components/screens/AdDetailScreen.jsx',
  'Comprador verificado',
  'detail pages must never display canned buyer testimonials'
);

assertNotContains(
  'src/components/screens/AdDetailScreen.jsx',
  'Usuario Mercasto',
  'detail pages must never display canned user testimonials'
);

assertContains(
  'src/components/common/AdCard.jsx',
  'detailCopy.catalogTitle',
  'catalog references are visibly distinguished on result cards with localized copy'
);

assertContains(
  'src/components/screens/AdDetailScreen.jsx',
  'detailCopy.catalogBody',
  'catalog detail pages disclose that availability and seller must be confirmed through localized copy'
);

assertContains(
  'src/components/screens/AdDetailScreen.jsx',
  'data-catalog-reference',
  'catalog disclosure remains machine-testable'
);

assertContains(
  'src/components/screens/AdDetailScreen.jsx',
  'ratingStats.hasReviews && !isCatalogFiller',
  'catalog references cannot inherit rating social proof'
);

assertContains(
  'src/components/screens/AdDetailScreen.jsx',
  'detailCopy.sellTitle',
  'catalog references convert owners into genuine sellers through localized CTA copy instead of exposing a placeholder contact'
);

// Public catalog ranking invariant.
//
// This used to assert the literal `orderBy('ads.is_catalog_filler', 'asc')` inside
// AdController::index. That method has no route — GET /ads is served by
// AdIndexController@index — so the guard passed for months while every public
// catalog page ranked editorial references first. The invariant is now asserted
// against the code that actually runs: the routed endpoint, its routing target, and
// the single shared ranking policy, plus the "flag is the first ordering key"
// property (it must outrank promotions and every sort mode) and the runtime
// behavioural pin in the backend suite.
const CATALOG_ROUTE = 'backend/routes/api.php';
const CATALOG_CONTROLLER = 'backend/app/Http/Controllers/Api/AdIndexController.php';
const CATALOG_RANKING = 'backend/app/Support/CatalogInventoryRanking.php';
const LEGACY_CATALOG_CONTROLLER = 'backend/app/Http/Controllers/Api/AdController.php';

assertContains(
  CATALOG_ROUTE,
  "Route::middleware('throttle:search')->get('/ads', [AdIndexController::class, 'index']);",
  'the public catalog endpoint keeps resolving to AdIndexController@index'
);

assertContains(
  CATALOG_RANKING,
  "public const FILLER_COLUMN = 'ads.is_catalog_filler';",
  'the shared catalog ranking policy keys on the catalog-reference flag'
);

assertContains(
  CATALOG_RANKING,
  "return $query->orderBy(self::FILLER_COLUMN, 'asc');",
  'the shared catalog ranking policy sorts real listings ahead of catalog references'
);

assertContains(
  CATALOG_CONTROLLER,
  'CatalogInventoryRanking::realInventoryFirst($query);',
  'the routed public catalog applies the shared real-inventory-first policy'
);

assertFirstOrderingKey(
  CATALOG_CONTROLLER,
  'public function index(Request $request)',
  'CatalogInventoryRanking::realInventoryFirst($query);',
  'real user listings rank ahead of catalog references before promotions and sort modes'
);

assertContains(
  LEGACY_CATALOG_CONTROLLER,
  'CatalogInventoryRanking::realInventoryFirst($query);',
  'the unrouted legacy listing path ranks through the same shared policy instead of diverging silently'
);

assertNoInlineCatalogRanking('backend/app');

assertContains(
  'backend/tests/Feature/CatalogRealInventoryRankingTest.php',
  'public function test_real_inventory_ranks_before_catalog_references_on_the_default_catalog(): void',
  'the ranking invariant keeps a runtime behavioural pin, not just a static one'
);

assertNotContains(
  '.github/workflows/emergency-container-frontend-patch.yml',
  "paths:\n      - 'public/deploy-trigger.txt'",
  'container patch workflow must stay manual-only during stabilization'
);

assertContains(
  '.github/workflows/emergency-ssh-frontend-deploy.yml',
  'workflow_dispatch',
  'SSH frontend deploy remains manually triggerable'
);

assertNotContains(
  '.github/workflows/emergency-ssh-frontend-deploy.yml',
  'push:',
  'SSH frontend deploy must not auto-run on every push during stabilization'
);

console.log('Recovery guard checks passed:');
for (const check of checks) {
  console.log(`- ${check}`);
}
