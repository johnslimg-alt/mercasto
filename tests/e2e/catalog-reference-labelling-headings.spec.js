import { expect, test } from '@playwright/test';

/**
 * Placeholder labelling + heading semantics contract.
 *
 * Production currently serves a catalogue that is 100% reference inventory
 * (`is_catalog_filler: true`), so the public surfaces must say so plainly:
 *   - every reference card carries a legible reference badge in its body,
 *   - real seller listings never carry it,
 *   - the results page states that the items are catalogue references,
 *   - each public route exposes exactly one visible h1 with no skipped levels.
 */

const FILLER_ID = 91001;
const CATALOG_TITLE = 'Referencia de catálogo Mercasto';
const CATALOG_BODY = 'Este producto se muestra como referencia';

const referenceAd = {
  id: FILLER_ID,
  // A real catalogue title (production ad 6376): long enough to need two lines on a
  // narrow grid card, which is the case where the badge used to outrank the title.
  title: 'Fundas para Asientos de Piel Sintética - Modelo G',
  price: 8999,
  category: 'electronica',
  state: 'Jalisco',
  location: 'Guadalajara, Jalisco',
  image_url: '/placeholder-ad.svg',
  status: 'active',
  is_catalog_filler: true,
  user: { id: 1, role: 'individual', name: 'Mercasto' },
};

// A real seller listing. The last one carries the string 'false': a loose
// Boolean(ad.is_catalog_filler) check would mislabel it as a reference.
const realAd = {
  id: 91002,
  title: 'Bicicleta real del vendedor',
  price: 4500,
  category: 'ocio',
  state: 'CDMX',
  location: 'CDMX, México',
  image_url: '/placeholder-ad.svg',
  status: 'active',
  is_catalog_filler: false,
  user: { id: 2, role: 'individual', name: 'Ana Vendedora' },
};

const stringFlagAd = {
  ...realAd,
  id: 91003,
  title: 'Anuncio real con bandera de texto',
  is_catalog_filler: 'false',
};

// Short reference titles are what the seeding path actually emits (TestAdsSeeder:
// "iPad Mini (Tablets) - 123"). A max-line clamp cannot protect these, so they are the
// case that proves the card reserves title space instead of only capping it.
const shortReferenceAd = {
  ...referenceAd,
  id: 91004,
  title: 'iPad Mini (Tablets) - 123',
};

const allAds = [referenceAd, shortReferenceAd, realAd, stringFlagAd];

async function mockPublicApi(page, { catalogView = 'grid' } = {}) {
  await page.addInitScript((view) => {
    localStorage.setItem('cookiesAccepted', 'true');
    localStorage.setItem('mercasto_language', 'es');
    localStorage.setItem('mercasto_catalog_view', view);
  }, catalogView);

  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url());
    const fulfill = body => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });

    const singleAd = url.pathname.match(/^\/api\/ads\/(\d+)$/);
    if (singleAd) {
      const match = allAds.find(ad => String(ad.id) === singleAd[1]);
      return match ? fulfill(match) : route.fulfill({ status: 404, contentType: 'application/json', body: '{}' });
    }
    if (url.pathname === '/api/ads') {
      return fulfill({ data: allAds, total: allAds.length, current_page: 1, last_page: 1, per_page: allAds.length });
    }
    if (url.pathname === '/api/categories') return fulfill([]);
    return fulfill({});
  });
}

function cardByTitle(page, title) {
  return page.locator('[data-catalog-card]').filter({ hasText: title });
}

async function badgeGeometry(badge) {
  return badge.evaluate(el => {
    const styles = getComputedStyle(el);
    let insideImage = false;
    for (let node = el.parentElement, depth = 0; node && depth < 4; node = node.parentElement, depth += 1) {
      if (node.querySelector(':scope > img')) { insideImage = true; break; }
    }
    return { fontSize: styles.fontSize, position: styles.position, insideImage };
  });
}

// The reference badge is the honest disclosure that a card is not seller inventory, so the
// listing's own title must never render shorter (and therefore visually lighter) than it.
async function expectTitleOutranksBadge(page, ad, label) {
  const card = cardByTitle(page, ad.title).first();
  await expect(card, `"${ad.title}" card ${label}`).toBeVisible({ timeout: 20_000 });

  const title = await card.locator('h2,h3,h4').first().boundingBox();
  const badge = await card.getByTestId('catalog-reference-badge').boundingBox();
  expect(title, `title box ${label}`).not.toBeNull();
  expect(badge, `badge box ${label}`).not.toBeNull();
  expect(
    title.height,
    `"${ad.title}" title (${title.height}px) must not be shorter than the reference badge (${badge.height}px) ${label}`,
  ).toBeGreaterThanOrEqual(badge.height);
}

// Visible headings in document order, so skipped levels are caught the way a
// reader or assistive technology would experience them.
async function visibleHeadingOutline(page) {
  return page.evaluate(() => {
    const isVisible = el => {
      const styles = getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return styles.display !== 'none' && styles.visibility !== 'hidden' && rect.width > 1 && rect.height > 1;
    };
    return [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')]
      .filter(isVisible)
      .map(el => ({ level: Number(el.tagName[1]), tag: el.tagName.toLowerCase(), text: (el.textContent || '').replace(/\s+/g, ' ').trim() }));
  });
}

async function expectSingleH1WithoutSkips(page) {
  // /listings keeps two breakpoint-exclusive h1 elements: the results toolbar
  // heading (from sm up) and the phone header row heading (below sm). The toolbar
  // title must stay hidden below sm — the 48px view-toggle contract asserted by
  // catalog-map-responsive.spec.js — so the two headings can never both render at
  // the same width. The invariant that matters, and the one asserted here, is that
  // each viewport exposes exactly ONE VISIBLE h1, with no skipped levels.
  const outline = await visibleHeadingOutline(page);
  const h1s = outline.filter(heading => heading.level === 1);
  expect(h1s, `expected exactly one visible h1, got ${JSON.stringify(outline)}`).toHaveLength(1);

  const simultaneouslyVisible = await page.evaluate(() => {
    const isVisible = el => {
      const styles = getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return styles.display !== 'none' && styles.visibility !== 'hidden' && rect.width > 1 && rect.height > 1;
    };
    return [...document.querySelectorAll('h1')].filter(isVisible).length;
  });
  expect(simultaneouslyVisible, 'more than one h1 rendered visible at this viewport').toBe(1);

  for (let index = 1; index < outline.length; index += 1) {
    const previous = outline[index - 1];
    const current = outline[index];
    expect(
      current.level,
      `heading level skipped: ${previous.tag} "${previous.text}" -> ${current.tag} "${current.text}"`,
    ).toBeLessThanOrEqual(previous.level + 1);
  }
}

test.describe('reference inventory is labelled', () => {
  test.beforeEach(async ({ page }) => {
    await mockPublicApi(page);
    await page.goto('/listings', { waitUntil: 'domcontentloaded' });
  });

  test('a reference card shows the catalogue badge in its body, at a legible size', async ({ page }) => {
    const badge = cardByTitle(page, referenceAd.title).first().getByTestId('catalog-reference-badge');
    await expect(badge).toBeVisible();
    await expect(badge).toHaveText(CATALOG_TITLE);

    const { fontSize, position, insideImage } = await badgeGeometry(badge);
    expect(parseFloat(fontSize), `badge font-size ${fontSize} must be at least 11px`).toBeGreaterThanOrEqual(11);
    expect(position).not.toBe('absolute');
    expect(insideImage, 'badge must sit in the card body, not over the listing image').toBe(false);
  });

  test('real seller listings never show the catalogue badge', async ({ page }) => {
    await expect(cardByTitle(page, realAd.title).first().getByTestId('catalog-reference-badge')).toHaveCount(0);
    await expect(cardByTitle(page, stringFlagAd.title).first().getByTestId('catalog-reference-badge')).toHaveCount(0);
  });

  test('the results page carries a persistent notice explaining the references', async ({ page }) => {
    const notice = page.getByTestId('catalog-reference-notice');
    await expect(notice).toBeVisible();
    await expect(notice).toContainText(CATALOG_TITLE);
    await expect(notice).toContainText(CATALOG_BODY);
    await expect(notice.getByRole('button')).toHaveCount(0);
  });

  test('the list layout also shows the badge in the card body', async ({ page }) => {
    await page.unroute('**/api/**');
    await mockPublicApi(page, { catalogView: 'list' });
    await page.goto('/listings', { waitUntil: 'domcontentloaded' });

    const badge = cardByTitle(page, referenceAd.title).first().getByTestId('catalog-reference-badge');
    await expect(badge).toBeVisible();

    const { fontSize, position, insideImage } = await badgeGeometry(badge);
    expect(parseFloat(fontSize)).toBeGreaterThanOrEqual(11);
    expect(position).not.toBe('absolute');
    expect(insideImage).toBe(false);
  });

  test('no badge is rendered when every result is a real listing', async ({ page }) => {
    await page.unroute('**/api/**');
    await page.route('**/api/**', async route => {
      const url = new URL(route.request().url());
      const fulfill = body => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
      if (url.pathname === '/api/ads') {
        return fulfill({ data: [realAd], total: 1, current_page: 1, last_page: 1, per_page: 1 });
      }
      if (url.pathname === '/api/categories') return fulfill([]);
      return fulfill({});
    });
    await page.goto('/listings', { waitUntil: 'domcontentloaded' });

    await expect(page.getByTestId('catalog-reference-badge')).toHaveCount(0);
    await expect(page.getByTestId('catalog-reference-notice')).toHaveCount(0);
  });

  test('the listing title keeps more visual weight than the reference badge', async ({ page }) => {
    // Regression guard for the inverted card hierarchy. The 11px badge label is long, so on
    // narrow grid cards it wraps to two lines (34px); in the list layout it stays on one line
    // but the pill is still 21px tall. A title clamp is only a MAXIMUM, so a LONG title is
    // protected by line-clamp-2 while a SHORT one ("iPad Mini (Tablets) - 123", the shape the
    // seeding path emits) renders a single line and is outweighed. Reference titles therefore
    // reserve two lines. Both shapes are asserted because the long-title case cannot fail for
    // the short-title regression, and both layouts are asserted because both are shipped.
    for (const width of [360, 390, 430, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/listings', { waitUntil: 'domcontentloaded' });
      for (const ad of [referenceAd, shortReferenceAd]) {
        await expectTitleOutranksBadge(page, ad, `in the grid at ${width}px`);
      }
    }

    await page.unroute('**/api/**');
    await mockPublicApi(page, { catalogView: 'list' });
    for (const width of [390, 412]) {
      await page.setViewportSize({ width, height: 844 });
      await page.goto('/listings', { waitUntil: 'domcontentloaded' });
      for (const ad of [referenceAd, shortReferenceAd]) {
        await expectTitleOutranksBadge(page, ad, `in the list at ${width}px`);
      }
    }
  });
});

test.describe('heading semantics', () => {
  test.beforeEach(async ({ page }) => {
    await mockPublicApi(page);
  });

  test('/listings has one visible h1 and no skipped levels at every breakpoint', async ({ page }) => {
    // 390 = phone (phone header row h1, toolbar title hidden), 900 = tablet,
    // 1440 = desktop (toolbar h1). Exactly one visible h1 must hold at each.
    for (const width of [390, 900, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/listings', { waitUntil: 'domcontentloaded' });
      // Readiness barrier: the outline is only meaningful once the results and their
      // cards have rendered, otherwise the page still exposes zero headings.
      await expect(page.locator('[data-catalog-card]').first()).toBeVisible({ timeout: 20_000 });
      await expectSingleH1WithoutSkips(page);
    }
  });

  test('the home page has one visible h1 and no skipped levels', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('home-category-rail')).toBeVisible({ timeout: 20_000 });
    await expectSingleH1WithoutSkips(page);
  });

  test('an ad detail page has one visible h1 and no skipped levels', async ({ page }) => {
    await page.goto(`/anuncio/${FILLER_ID}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 20_000 });
    await expectSingleH1WithoutSkips(page);
  });
});
