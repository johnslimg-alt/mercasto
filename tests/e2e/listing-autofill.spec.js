import path from 'node:path';
import { expect, test } from '@playwright/test';

const seller = {
  id: 9751,
  name: 'Autofill Seller',
  email: 'autofill-e2e@example.test',
  role: 'individual',
  onboarding_completed_at: '2026-09-01T00:00:00Z',
};

const categories = [
  { id: 1, slug: 'motor', name: { es: 'Coches', en: 'Cars' } },
  { id: 2, slug: 'servicios', name: { es: 'Servicios', en: 'Services' } },
];

function suggestionPayload({ lowConfidence = false } = {}) {
  const confidence = lowConfidence ? 0.2 : 0.92;
  return {
    success: true,
    applied: false,
    suggestions: {
      category: { value: lowConfidence ? null : 'motor', confidence },
      subcategory_hint: { value: lowConfidence ? null : 'Sedán', confidence },
      attributes: lowConfidence ? {} : { marca: { value: 'Nissan', confidence: 0.9 } },
      title: { value: lowConfidence ? null : 'Nissan Versa usado', confidence },
      description: { value: lowConfidence ? null : 'Nissan Versa usado en buen estado visible.', confidence },
      runtime: 'private_local',
      model: 'autofill-e2e-fixture',
      authoritative: false,
      requires_seller_confirmation: true,
    },
  };
}

async function prepare(page, scenario = 'ok') {
  const requests = [];
  await page.addInitScript((user) => {
    localStorage.setItem('auth_token', 'autofill-e2e-token');
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('lang', 'en');
    localStorage.setItem('mercasto_language', 'en');
    localStorage.setItem('cookiesAccepted', 'true');
    localStorage.setItem('cookie_consent', 'essential');
  }, seller);

  await page.route('**/api/**', async route => {
    const request = route.request();
    const url = new URL(request.url());
    const pathname = url.pathname;

    if (pathname.endsWith('/api/user') && request.method() === 'GET') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(seller) });
    }
    if (pathname.endsWith('/api/categories')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(categories) });
    }
    if (pathname.endsWith('/api/category-attributes')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    }
    if (pathname.endsWith('/api/auth/providers')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ google: false, apple: false, twitter: false, telegram: false, sms: false }),
      });
    }
    if (pathname.endsWith('/api/ads/generate-description') && request.method() === 'POST') {
      const raw = request.postDataBuffer();
      requests.push(raw ? raw.toString('latin1') : '');
      if (scenario === 'unavailable') {
        return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'Autofill unavailable' }) });
      }
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(suggestionPayload({ lowConfidence: scenario === 'low' })),
      });
    }
    if (pathname.endsWith('/api/ads') && request.method() === 'GET') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [], total: 0 }) });
    }
    if (pathname.includes('/notifications')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [], count: 0 }) });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });

  await page.goto('/post');
  await expect(page.getByTestId('listing-autofill-panel')).toBeVisible({ timeout: 10000 });
  return requests;
}

async function openDetailsStep(page) {
  await page.getByRole('button', { name: 'Cars', exact: true }).click();
  await page.getByRole('button', { name: /Sedán|Sedan/i }).first().click();
  const next = page.getByRole('button', { name: /Next/i }).filter({ visible: true }).first();
  await expect(next).toBeEnabled();
  await next.click();
  await expect(page.getByTestId('publish-title')).toBeVisible();
}

test('text-only autofill stays suggestion-only until seller applies fields', async ({ page }, testInfo) => {
  test.skip(!['chromium', 'chromium-mobile'].includes(testInfo.project.name));
  const requests = await prepare(page);

  await page.getByTestId('listing-autofill-short-text').fill('Used Nissan Versa 2022');
  await page.getByTestId('listing-autofill-run').click();
  const suggestions = page.getByTestId('listing-autofill-suggestions');
  await expect(suggestions).toBeVisible();
  expect(requests).toHaveLength(1);
  expect(requests[0]).toContain('Used Nissan Versa 2022');
  expect(requests[0]).not.toContain('filename=');

  const applyButtons = suggestions.getByRole('button', { name: 'Apply' });
  await expect(applyButtons).toHaveCount(5);
  await applyButtons.nth(0).click();
  await applyButtons.nth(1).click();
  const next = page.getByRole('button', { name: /Next/i }).filter({ visible: true }).first();
  await expect(next).toBeEnabled();
});

test('photo-only and mixed autofill send only new seller media', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium');
  const requests = await prepare(page);
  await openDetailsStep(page);

  const upload = page.locator('main form input[type="file"][accept*="image"]').first();
  await upload.setInputFiles(path.join(process.cwd(), 'public/icon-192x192.png'));

  await page.getByTestId('listing-autofill-run').click();
  await expect(page.getByTestId('listing-autofill-suggestions')).toBeVisible();
  expect(requests[0]).toContain('icon-192x192.png');

  await page.getByTestId('listing-autofill-short-text').fill('Nissan Versa with one seller photo');
  await page.getByTestId('listing-autofill-run').click();
  expect(requests).toHaveLength(2);
  expect(requests[1]).toContain('Nissan Versa with one seller photo');
  expect(requests[1]).toContain('icon-192x192.png');
});

test('low-confidence suggestions expose no apply action', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium');
  await prepare(page, 'low');
  await page.getByTestId('listing-autofill-short-text').fill('Ambiguous object');
  await page.getByTestId('listing-autofill-run').click();
  const suggestions = page.getByTestId('listing-autofill-suggestions');
  await expect(suggestions).toBeVisible();
  await expect(suggestions.getByRole('button', { name: 'Apply' })).toHaveCount(0);
});

test('gateway failure leaves the manual publish flow usable on mobile', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-mobile');
  await prepare(page, 'unavailable');
  await page.getByTestId('listing-autofill-short-text').fill('Manual fallback listing');
  await page.getByTestId('listing-autofill-run').click();
  await expect(page.getByText(/Suggestions are unavailable|Autofill unavailable/i)).toBeVisible();

  const category = page.getByRole('button', { name: 'Cars', exact: true });
  await expect(category).toBeVisible();
  await category.click();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});
