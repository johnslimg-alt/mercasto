import { expect, test } from '@playwright/test';
import QRCode from 'qrcode';
import { QR_CODE_OPTIONS, buildShareTargets } from '../../src/utils/shareLinks.js';

// Share / OpenGraph / UTM contract on the public listing detail.
//
// Every share surface must use the crawler-visible /share/ads/{id} card with a
// per-channel UTM set, the QR must encode exactly the same URL, and sharing must
// never be reported as a contact conversion (no Contact event, no click POST).

const AD_ID = 6336;

test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

const detailAd = {
  id: AD_ID,
  user_id: 77,
  title: 'Fundas para Asientos de Piel Sintética - Modelo B',
  description: 'Descripción de prueba para la ficha del anuncio.',
  price: 1499,
  category: 'motor',
  condition: 'nuevo',
  attributes: { material: 'Piel sintética', ajuste: 'Universal' },
  state: 'Ciudad de México',
  location: 'Ciudad de México, México',
  image_url: '/placeholder-ad.svg',
  created_at: '2026-07-01T12:00:00Z',
  user: { id: 77, name: 'Vendedor de prueba', role: 'individual', created_at: '2025-01-01T12:00:00Z', whatsapp: '+525512345678' },
};

async function mockDetailApi(page, requests) {
  await page.addInitScript(() => localStorage.setItem('cookiesAccepted', 'true'));
  await page.route('**/api/**', async route => {
    const request = route.request();
    const url = new URL(request.url());
    requests.push({ method: request.method(), path: url.pathname, body: request.postData() || '' });
    if (url.pathname === `/api/ads/${AD_ID}` && request.method() === 'GET') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(detailAd) });
    }
    if (url.pathname === `/api/ads/${AD_ID}/price-history`) return route.fulfill({ status: 200, contentType: 'application/json', body: '{"history":[]}' });
    if (url.pathname === `/api/ads/${AD_ID}/similar`) return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    if (url.pathname.startsWith('/api/recommendations')) return route.fulfill({ status: 200, contentType: 'application/json', body: '{"data":[]}' });
    if (url.pathname === '/api/ads') return route.fulfill({ status: 200, contentType: 'application/json', body: '{"data":[],"total":0,"current_page":1,"last_page":1}' });
    if (url.pathname === '/api/categories') return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
  // The share channels are outbound intents; never follow them out of the local build.
  await page.route(/^https?:\/\/(?:wa\.me|www\.facebook\.com|twitter\.com|t\.me)\//, route => route.abort());
}

async function shareEvents(page) {
  return page.evaluate(() => (window.dataLayer || [])
    .filter(item => item && item.event === 'share')
    .map(item => item.share_channel));
}

async function contactEvents(page) {
  return page.evaluate(() => (window.dataLayer || [])
    .filter(item => item && ['contact_opened', 'contact_click', 'whatsapp_click', 'email_click', 'telegram_click'].includes(item.event))
    .map(item => item.event));
}

test('share links are crawler-visible routes with per-channel UTMs', async ({ page }) => {
  const requests = [];
  await mockDetailApi(page, requests);
  await page.goto(`/ads/${AD_ID}`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByText('Piel sintética', { exact: true })).toBeVisible();

  const origin = await page.evaluate(() => window.location.origin);
  const expected = buildShareTargets({ id: AD_ID, origin, title: detailAd.title, message: 'Mira este anuncio en Mercasto' });

  await page.getByRole('button', { name: /Compartir|Share/ }).first().click();
  const menu = page.locator('.hidden.md\\:block');
  await expect(menu).toBeVisible();

  const rendered = await menu.locator('a[data-share-channel]').evaluateAll(nodes => nodes.map(node => ({
    channel: node.getAttribute('data-share-channel'),
    href: node.getAttribute('href'),
  })));

  expect(rendered.map(item => item.channel)).toEqual(['whatsapp', 'telegram', 'facebook', 'x', 'email']);

  const carried = {};
  for (const item of rendered) {
    const href = new URL(item.href);
    if (item.channel === 'whatsapp') carried[item.channel] = href.searchParams.get('text').split(' ').pop();
    else if (item.channel === 'facebook') carried[item.channel] = href.searchParams.get('u');
    else if (item.channel === 'email') carried[item.channel] = href.searchParams.get('body').split('\n').pop();
    else carried[item.channel] = href.searchParams.get('url');

    expect(carried[item.channel]).toBe(expected[item.channel].url);
    expect(carried[item.channel]).toContain(`/share/ads/${AD_ID}?utm_source=${item.channel}&utm_medium=`);
    expect(carried[item.channel]).toContain('utm_campaign=listing_share&utm_content=ad_detail');
    expect(carried[item.channel]).toContain(`utm_term=ad_${AD_ID}`);
    expect(item.href).not.toContain('#ad-');
  }

  const utmSets = new Set(Object.values(carried).map(url => new URL(url).search));
  expect(utmSets.size).toBe(5);
});

test('the QR dialog and the clipboard carry the same share url', async ({ page }) => {
  const requests = [];
  await mockDetailApi(page, requests);
  await page.goto(`/ads/${AD_ID}`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByText('Piel sintética', { exact: true })).toBeVisible();

  const origin = await page.evaluate(() => window.location.origin);
  const expected = buildShareTargets({ id: AD_ID, origin, title: detailAd.title, message: 'Mira este anuncio en Mercasto' });
  const shareButton = page.getByRole('button', { name: /Compartir|Share/ }).first();
  const menu = page.locator('.hidden.md\\:block');

  await shareButton.click();
  await menu.getByRole('button', { name: /Copiar enlace|Copy link/ }).click();
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe(expected.copy.url);

  await shareButton.click();
  await menu.getByRole('button', { name: /Código QR|QR code/ }).click();

  const qrImage = page.locator('img[width="240"]');
  await expect(qrImage).toBeVisible();
  const encoded = await qrImage.getAttribute('src');
  expect(encoded).not.toBe('');
  expect(encoded.startsWith('data:image/png')).toBe(true);

  // Recover the QR module matrix from the rendered image and compare it with the
  // matrix of the qr-channel share url: the dialog must encode exactly that URL.
  const expectedModules = QRCode.create(expected.qr.url, { errorCorrectionLevel: 'M' }).modules;
  const sampled = await page.evaluate(({ size, margin, width }) => {
    const image = document.querySelector('img[width="240"]');
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d');
    context.drawImage(image, 0, 0);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    const scale = width / (size + margin * 2);
    const scaledMargin = margin * scale;
    const rows = [];
    for (let row = 0; row < size; row += 1) {
      const y = Math.floor(scaledMargin + (row + 0.5) * scale);
      let bits = '';
      for (let column = 0; column < size; column += 1) {
        const x = Math.floor(scaledMargin + (column + 0.5) * scale);
        bits += pixels[(y * canvas.width + x) * 4] < 128 ? '1' : '0';
      }
      rows.push(bits);
    }
    return { width: canvas.width, height: canvas.height, rows };
  }, { size: expectedModules.size, margin: QR_CODE_OPTIONS.margin, width: QR_CODE_OPTIONS.width });

  const expectedRows = [];
  for (let row = 0; row < expectedModules.size; row += 1) {
    let bits = '';
    for (let column = 0; column < expectedModules.size; column += 1) {
      bits += expectedModules.data[row * expectedModules.size + column] ? '1' : '0';
    }
    expectedRows.push(bits);
  }

  expect(sampled.width).toBe(QR_CODE_OPTIONS.width);
  expect(sampled.rows).toEqual(expectedRows);

  expect(await shareEvents(page)).toEqual(['copy', 'qr']);
});

test('sharing never emits a contact conversion and emits exactly one share event', async ({ page }) => {
  const requests = [];
  await mockDetailApi(page, requests);
  await page.goto(`/ads/${AD_ID}`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByText('Piel sintética', { exact: true })).toBeVisible();

  const shareButton = page.getByRole('button', { name: /Compartir|Share/ }).first();
  const menu = page.locator('.hidden.md\\:block');

  await shareButton.click();
  await menu.locator('a[data-share-channel="whatsapp"]').click();
  await expect.poll(() => shareEvents(page)).toEqual(['whatsapp']);

  await shareButton.click();
  await menu.locator('a[data-share-channel="facebook"]').click();
  await expect.poll(() => shareEvents(page)).toEqual(['whatsapp', 'facebook']);

  expect(await contactEvents(page)).toEqual([]);
  expect(requests.filter(request => request.path === `/api/ads/${AD_ID}/click`)).toEqual([]);
  expect(requests.filter(request => request.path.includes('/meta/events/contact'))).toEqual([]);
  expect(requests.filter(request => request.method === 'POST' && request.body.includes('"share"'))).toEqual([]);
});
