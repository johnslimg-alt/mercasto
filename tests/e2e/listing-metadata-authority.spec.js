import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

/**
 * The SEO shell decides a listing page's head; hydration must not rewrite that decision while
 * it has no listing payload of its own.
 *
 * Each test serves a document decorated exactly the way `SeoShellController::renderShell()`
 * decorates the built shell (title, canonical, robots, JSON-LD, and the
 * `data-mercasto-seo-owner` marker), then blocks or stubs `/api/**` and asserts the effective
 * head after hydration still matches what the server decided for that listing.
 */

const SHELL_PATH = path.join(process.cwd(), 'dist', 'index.html');

const REFERENCE_TITLE = 'Fundas para Asientos de Piel Sintética - Modelo G | Catálogo Mercasto';
const LISTING_TITLE = 'Bicicleta urbana rodada 29 | Mercasto';
const WEBPAGE_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: 'Referencia de catálogo',
  url: 'https://www.mercasto.com/ads/4321',
};
const PRODUCT_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'Product',
  name: 'Bicicleta urbana rodada 29',
  url: 'https://www.mercasto.com/ads/4321',
};

/** Mirrors SeoShellController::renderShell(): replace when present, insert when absent. */
function decorateShell({ title, robots, canonical, schema, seoOwner }) {
  let html = fs.readFileSync(SHELL_PATH, 'utf8');

  html = html.replace(/<html([^>]*)>/i, `<html$1 data-mercasto-seo-owner="${seoOwner}">`);
  html = html.replace(/<title>.*?<\/title>/is, `<title>${title}</title>`);
  html = html.replace(
    /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i,
    `<link rel="canonical" href="${canonical}" />`,
  );

  const robotsTag = `<meta name="robots" content="${robots}" />`;
  html = /<meta\s+name="robots"\s+content="[^"]*"\s*\/?>/i.test(html)
    ? html.replace(/<meta\s+name="robots"\s+content="[^"]*"\s*\/?>/i, robotsTag)
    : html.replace(/<\/head>/i, `  ${robotsTag}\n</head>`);

  html = html.replace(
    /<script\s+type="application\/ld\+json"\s+id="schema-ld-json"\s*>.*?<\/script>/is,
    `<script type="application/ld+json" id="schema-ld-json">${JSON.stringify(schema)}</script>`,
  );

  return html;
}

/** A server-rendered listing page: Laravel proxied the route, so the shell carries the marker. */
async function serveServerListing(page, { id, title, robots, canonical, schema }) {
  await page.route(`**/ads/${id}`, route => route.fulfill({
    status: 200,
    contentType: 'text/html; charset=UTF-8',
    body: decorateShell({ title, robots, canonical, schema, seoOwner: 'listing' }),
  }));
}

/** `/anuncio/{id}` is an SPA-only alias: nginx serves the undecorated shell, no server decision. */
async function serveUndeckedAlias(page, id) {
  const shell = fs.readFileSync(SHELL_PATH, 'utf8');
  await page.route(`**/anuncio/${id}`, route => route.fulfill({
    status: 200,
    contentType: 'text/html; charset=UTF-8',
    body: shell,
  }));
}

async function blockApi(page) {
  await page.route('**/api/**', route => route.abort('failed'));
}

async function stubListingApi(page, id, listing) {
  await page.route('**/api/**', route => {
    const url = new URL(route.request().url());
    if (url.pathname === `/api/ads/${id}`) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(listing) });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  });
}

async function prepare(page) {
  await page.addInitScript(() => {
    localStorage.setItem('cookiesAccepted', 'true');
    localStorage.setItem('mercasto_language', 'es');
  });
}

async function readHead(page) {
  return page.evaluate(() => {
    const typeOf = script => {
      try {
        return JSON.parse(script.textContent)['@type'];
      } catch {
        return 'unparsable';
      }
    };
    const owned = document.getElementById('schema-ld-json');
    return {
      title: document.title,
      robots: document.querySelector('meta[name="robots"]')?.getAttribute('content') ?? null,
      canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href') ?? null,
      // The head schema the SEO shell rendered / the app shell owns.
      schemaLdJson: owned ? typeOf(owned) : null,
      // Everything in the document, including the ad detail screen's inline copy.
      jsonld: [...document.querySelectorAll('script[type="application/ld+json"]')].map(typeOf),
    };
  });
}

const genuineListing = id => ({
  id,
  status: 'active',
  is_catalog_filler: false,
  title: { es: 'Bicicleta urbana rodada 29' },
  description: { es: 'Bicicleta urbana lista para rodar por toda la ciudad, con frenos revisados.' },
  price: 3500,
  condition: 'usado',
  image_url: '["ads/bicicleta.webp"]',
  expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
});

test('a failed listing fetch cannot rewrite a noindex listing page', async ({ page }) => {
  await prepare(page);
  await serveServerListing(page, {
    id: 4321,
    title: REFERENCE_TITLE,
    robots: 'noindex,follow,max-image-preview:large',
    canonical: 'https://www.mercasto.com/ads/4321',
    schema: WEBPAGE_SCHEMA,
  });
  await blockApi(page);

  await page.goto('/ads/4321', { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('deep-link-ad-load-error')).toBeVisible();

  const head = await readHead(page);
  expect(head.robots).toBe('noindex,follow,max-image-preview:large');
  expect(head.canonical).toBe('https://www.mercasto.com/ads/4321');
  expect(head.title).toBe(REFERENCE_TITLE);
  expect(head.schemaLdJson).toBe('WebPage');
  expect(head.jsonld).toEqual(['WebPage']);
});

test('a failed listing fetch cannot rewrite an indexable listing page', async ({ page }) => {
  await prepare(page);
  await serveServerListing(page, {
    id: 4322,
    title: LISTING_TITLE,
    robots: 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1',
    canonical: 'https://www.mercasto.com/ads/4322',
    schema: PRODUCT_SCHEMA,
  });
  await blockApi(page);

  await page.goto('/ads/4322', { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('deep-link-ad-load-error')).toBeVisible();

  const head = await readHead(page);
  expect(head.robots).toBe('index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1');
  expect(head.canonical).toBe('https://www.mercasto.com/ads/4322');
  expect(head.title).toBe(LISTING_TITLE);
  expect(head.schemaLdJson).toBe('Product');
  expect(head.jsonld).toEqual(['Product']);
});

test('a failed listing fetch cannot make the /anuncio alias claim indexability', async ({ page }) => {
  await prepare(page);
  await serveUndeckedAlias(page, 4323);
  await blockApi(page);

  await page.goto('/anuncio/4323', { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('deep-link-ad-load-error')).toBeVisible();

  const head = await readHead(page);
  // No server decision exists for this alias, so the client must not invent an indexable one.
  expect(head.robots ?? '').not.toMatch(/^index,follow/);
  expect(head.canonical).not.toBe('http://127.0.0.1:4323/anuncio/4323');
});

test('when the listing payload arrives the client still owns the head', async ({ page }) => {
  await prepare(page);
  await serveServerListing(page, {
    id: 4324,
    title: LISTING_TITLE,
    robots: 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1',
    canonical: 'https://www.mercasto.com/ads/4324',
    schema: PRODUCT_SCHEMA,
  });
  await stubListingApi(page, 4324, genuineListing(4324));

  await page.goto('/ads/4324', { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('deep-link-ad-loading')).toHaveCount(0);

  const head = await readHead(page);
  expect(head.robots).toMatch(/^index,follow/);
  // The client replaced the server schema with its own once it had the payload.
  expect(head.schemaLdJson).toBe('Product');
  expect(head.jsonld).toContain('Product');
});

test('a catalog reference that loads is still noindex', async ({ page }) => {
  await prepare(page);
  await serveServerListing(page, {
    id: 4325,
    title: REFERENCE_TITLE,
    robots: 'noindex,follow,max-image-preview:large',
    canonical: 'https://www.mercasto.com/ads/4325',
    schema: WEBPAGE_SCHEMA,
  });
  await stubListingApi(page, 4325, { ...genuineListing(4325), is_catalog_filler: true });

  await page.goto('/ads/4325', { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('deep-link-ad-loading')).toHaveCount(0);

  const head = await readHead(page);
  expect(head.robots).toBe('noindex,follow,max-image-preview:large');
  // Nothing to say about a reference, so the server's WebPage schema must survive.
  expect(head.schemaLdJson).toBe('WebPage');
  expect(head.jsonld).toEqual(['WebPage']);
});
