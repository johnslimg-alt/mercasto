import { test, expect } from '@playwright/test';

test('header autocomplete ignores a stale slower response', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop');

  await page.route('**/api/search/suggestions?**', async (route) => {
    const url = new URL(route.request().url());
    const query = url.searchParams.get('q');
    if (query === 'iphone') {
      await new Promise(resolve => setTimeout(resolve, 900));
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(['iPhone viejo']) });
      return;
    }
    if (query === 'ipad') {
      await new Promise(resolve => setTimeout(resolve, 50));
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(['iPad nuevo']) });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  });

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.getByTestId('desktop-search-input').waitFor({ state: 'visible' });
  const input = page.getByTestId('desktop-search-input');
  await input.fill('iphone');
  await page.waitForTimeout(320);
  await input.fill('ipad');

  await expect(page.getByRole('button', { name: /iPad nuevo/i })).toBeVisible();
  await page.waitForTimeout(800);
  await expect(page.getByRole('button', { name: /iPad nuevo/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /iPhone viejo/i })).toHaveCount(0);
});


const AUTOCOMPLETE_COPY = {
  en: { recent: 'Recent searches', suggestions: 'Suggestions', clear: 'Clear history', didYouMean: 'Did you mean:' },
  ru: { recent: 'История поиска', suggestions: 'Рекомендации', clear: 'Очистить историю', didYouMean: 'Возможно, вы имели в виду:' },
  ar: { recent: 'عمليات البحث الأخيرة', suggestions: 'المقترحات', clear: 'مسح السجل', didYouMean: 'هل تقصد:' },
};

for (const [lang, copy] of Object.entries(AUTOCOMPLETE_COPY)) {
  test(`header autocomplete copy is localized in ${lang}`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-desktop');

    await page.addInitScript(({ savedLang }) => {
      localStorage.setItem('lang', savedLang);
      localStorage.setItem('mercasto_language', savedLang);
      localStorage.setItem('mercasto_recent_searches', JSON.stringify(['Toyota Corolla']));
      localStorage.setItem('cookiesAccepted', 'true');
    }, { savedLang: lang });

    await page.route('**/api/search/suggestions?**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(['ipad']) });
    });

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const input = page.getByTestId('desktop-search-input');
    await input.waitFor({ state: 'visible' });
    await expect.poll(() => page.evaluate(() => document.documentElement.lang)).toBe(lang);
    await expect.poll(() => page.evaluate(() => document.documentElement.dir)).toBe(lang === 'ar' ? 'rtl' : 'ltr');
    const desktopHeader = page.getByTestId('desktop-header-row');
    await input.focus();
    await expect(desktopHeader.getByText(copy.recent, { exact: true })).toBeVisible();
    await expect(desktopHeader.getByRole('button', { name: copy.clear })).toBeVisible();

    await input.fill('ipd');
    await expect(desktopHeader.getByText(copy.suggestions, { exact: true })).toBeVisible();
    await expect(desktopHeader.getByRole('button', { name: new RegExp(`${copy.didYouMean}\\s+ipad`, 'i') })).toBeVisible();
  });
}
