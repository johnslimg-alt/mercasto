import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

/**
 * Honesty guard for the views KPI.
 *
 * `ads.views` holds synthetic demo values (rand() written by bulk seeders), so it
 * must never be published as a measured KPI. The behavioural proof lives in
 * `backend/tests/Feature/MeasuredViewsReportingTest.php`; this file guards the
 * shape of the code so a regression is caught even before the suite runs.
 */

const read = (file) => fs.readFileSync(file, 'utf8');

const REPORTING_CONTROLLERS = [
  'backend/app/Http/Controllers/Api/AdminAnalyticsController.php',
  'backend/app/Http/Controllers/Api/SellerStatsController.php',
];

test('reporting controllers never assign the views KPI from sum(ads.views)', () => {
  for (const file of REPORTING_CONTROLLERS) {
    const source = read(file);

    // The KPI must come from the measurement log.
    assert.match(
      source,
      /DB::table\('ad_views'\)/,
      `${file} must read views from the ad_views measurement log`,
    );
    assert.match(
      source,
      /'total_views_source'\s*=>\s*'ad_views'/,
      `${file} must declare the provenance of the views KPI`,
    );
    assert.match(
      source,
      /'total_views_verified'\s*=>\s*true/,
      `${file} must mark the views KPI as verified`,
    );

    // The legacy counter may be published, but only under an explicitly
    // unverified key.
    assert.match(
      source,
      /'total_views_legacy_counter'\s*=>\s*\$legacyViewsCounter/,
      `${file} must expose the legacy counter only through the legacy key`,
    );
    assert.match(
      source,
      /'total_views_legacy_counter_verified'\s*=>\s*false/,
      `${file} must mark the legacy counter as unverified`,
    );

    // No assignment may bind the KPI variable to the unmeasured aggregate.
    for (const assignment of source.matchAll(/\$totalViews\s*=\s*([^;]+);/g)) {
      assert.doesNotMatch(
        assignment[1],
        /sum\(\s*'views'\s*\)/,
        `${file} must not compute the views KPI from sum('views')`,
      );
    }

    // sum('views') may only ever be used for the legacy counter. Statements are
    // compared whole so a multi-line assignment is still matched.
    for (const statement of source.split(';')) {
      if (!/sum\(\s*'views'\s*\)/.test(statement)) continue;
      assert.match(
        statement,
        /\$legacyViewsCounter\s*=/,
        `${file}: sum('views') is only allowed when building the legacy counter, got: ${statement.trim().slice(0, 120)}`,
      );
    }
  }
});

test('the seller views series is not synthesised from the counter', () => {
  const source = read('backend/app/Http/Controllers/Api/SellerStatsController.php');

  // The old fallback divided the fabricated counter into a plausible week.
  assert.doesNotMatch(
    source,
    /dailyAvg/,
    'the seller 7-day series must never be fabricated from the legacy counter',
  );
  assert.match(
    source,
    /'views_series_source'\s*=>\s*\$viewsSeriesSource/,
    'the seller payload must declare where its views series comes from',
  );
});

test('the seller dashboard never presents the raw ads.views counter as the KPI', () => {
  const dashboard = read('src/components/screens/UserDashboard.jsx');

  assert.doesNotMatch(
    dashboard,
    /userAds\.reduce\([^)]*ad\.views/,
    'the dashboard must not sum the synthetic ads.views column into a KPI',
  );
  assert.match(
    dashboard,
    /measuredSellerStats\.total_views/,
    'the dashboard views KPI must come from the measured seller stats',
  );
  assert.match(
    dashboard,
    /\/seller\/stats/,
    'the dashboard must load the measured seller stats',
  );

  // Invented trend badges must not come back.
  for (const fake of ['change="+12%"', 'change="+8%"']) {
    assert.ok(!dashboard.includes(fake), `hardcoded trend badge ${fake} must not be rendered`);
  }
});

test('the demo seeding command cannot silently write synthetic views into production', () => {
  const command = read('backend/app/Console/Commands/SeedLotsOfAds.php');

  assert.match(command, /'views'\s*=>\s*rand\(/, 'sanity: this is the command that writes random views');
  assert.match(
    command,
    /app\(\)->environment\('production'\)/,
    'ads:seed-lots must refuse to run in production without an explicit opt-in',
  );
  assert.match(command, /--force/, 'the refusal must be overridable explicitly, not silently');
});

test('the admin dashboard shows the measured figure and names its source', () => {
  const source = read('src/components/screens/AdminScreen.jsx');

  assert.match(
    source,
    /data-testid="admin-measured-views-value"[\s\S]{0,200}adminAnalytics\.total_views/,
    'the admin views KPI must render the measured total_views value',
  );
  assert.match(
    source,
    /data-testid="admin-measured-views-source"[\s\S]{0,200}adminAnalytics\?\.total_views_source/,
    'the admin views KPI must name its source from the payload so it cannot be confused with the counter',
  );
  assert.doesNotMatch(
    source,
    /adminAnalytics\??\.total_views_legacy_counter\s*\?\?/,
    'the legacy counter must never be the value rendered in the admin KPI card',
  );
});

test('the provenance of the views KPI is documented for operators', () => {
  const doc = read('docs/analytics/views-provenance.md');

  assert.match(doc, /SeedLotsOfAds\.php:272/, 'the document must cite the seeding source');
  assert.match(doc, /TestAdsSeeder\.php:234/, 'the document must cite the second seeding source');
  assert.match(doc, /UNKNOWN/, 'what could not be established must be stated as unknown');
  assert.match(doc, /ad_views/, 'the document must name the measured source');
});
