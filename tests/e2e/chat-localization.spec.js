import { expect, test } from '@playwright/test';

const LANGUAGES = ['es', 'en', 'pt', 'fr', 'zh', 'ko', 'de', 'it', 'ar', 'ru', 'ja'];
const RTL_LANGUAGES = new Set(['ar']);
const LOCALES = {
  es: 'es-MX', en: 'en-US', pt: 'pt-BR', fr: 'fr-FR', zh: 'zh-CN', ko: 'ko-KR',
  de: 'de-DE', it: 'it-IT', ar: 'ar-MX', he: 'he-IL', yi: 'yi', ru: 'ru-RU', ja: 'ja-JP',
};
const translations = {};
for (const lang of LANGUAGES) {
  translations[lang] = (await import(`../../src/constants/translations/${lang}.js`)).default;
}

const user = { id: 91, name: 'QA User', email: 'qa@example.test', role: 'individual', is_verified: true, account_verified: true };
const conversation = {
  conversation_id: 41,
  user_id: 22,
  ad_id: 9,
  name: 'Carlos',
  last_message: 'Mensaje escrito por una persona',
  unread_count: 1,
  created_at: '2026-08-08T14:15:00Z',
  ad: { id: 9, title: 'Toyota Corolla' },
};
const message = {
  id: 501,
  conversation_id: 41,
  sender_id: 22,
  body: 'Contenido del usuario: no traducir',
  created_at: '2026-08-08T14:16:00Z',
};

async function installSession(page, lang) {
  await page.addInitScript(({ savedLang, savedUser }) => {
    localStorage.setItem('lang', savedLang);
    localStorage.setItem('mercasto_language', savedLang);
    localStorage.setItem('cookiesAccepted', 'true');
    localStorage.setItem('auth_token', 'chat-localization-token');
    localStorage.setItem('user', JSON.stringify(savedUser));
  }, { savedLang: lang, savedUser: user });
}

async function mockChatApi(page) {
  await page.route('**/api/**', async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.pathname.endsWith('/user')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(user) });
    }
    if (url.pathname.endsWith('/chat/conversations')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([conversation]) });
    }
    if (url.pathname.endsWith('/chat/conversations/41/messages')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ conversation, messages: [message] }) });
    }
    if (url.pathname.endsWith('/chat/messages') && request.method() === 'POST') {
      return route.fulfill({ status: 422, contentType: 'application/json', body: JSON.stringify({
        error: 'No pudimos enviar el mensaje.',
        message: 'Error del servidor en español que no debe mostrarse.',
      }) });
    }
    if (url.pathname.endsWith('/auth/providers')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ google: false, apple: false, sms: false }) });
    }
    if (url.pathname.endsWith('/categories')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    }
    if (url.pathname.includes('/notifications')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [], count: 0 }) });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
}

async function expectedTimestamp(page, lang) {
  return page.evaluate(({ locale }) => new Date('2026-08-08T14:16:00Z').toLocaleString(locale, {
    hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short',
  }), { locale: LOCALES[lang] });
}

async function verifyChat(page, lang, viewport) {
  const t = translations[lang];
  await page.setViewportSize(viewport);
  await mockChatApi(page);
  await installSession(page, lang);
  await page.goto('/mensajes?conversation=41');

  await expect(page.getByRole('heading', { name: t.messages })).toBeVisible();
  await expect(page.getByRole('button', { name: t.back }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: t.retry })).toBeVisible();
  await expect(page.getByText('Carlos', { exact: true }).last()).toBeVisible();
  await expect(page.getByText('Contenido del usuario: no traducir', { exact: true })).toBeVisible();
  await expect(page.getByText(await expectedTimestamp(page, lang), { exact: true })).toBeVisible();

  const composer = page.getByLabel(t.write_message);
  await expect(composer).toHaveAttribute('placeholder', t.write_message);
  await composer.fill('QA send attempt');
  await page.getByRole('button', { name: t.sendMessage }).click();
  await expect(page.getByText(t.chat_send_failed, { exact: true })).toBeVisible();

  if (lang !== 'es') {
    const body = await page.locator('body').innerText();
    expect(body).not.toContain('Error del servidor en español que no debe mostrarse.');
    expect(body).not.toContain('No pudimos enviar el mensaje.');
  }

  await expect.poll(() => page.evaluate(() => document.documentElement.dir)).toBe(RTL_LANGUAGES.has(lang) ? 'rtl' : 'ltr');
  await expect.poll(() => page.evaluate(() => document.documentElement.lang)).toBe(lang === 'es' ? 'es-MX' : lang);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
}

for (const lang of LANGUAGES) {
  test(`chat localization renders ${lang} on desktop`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-desktop');
    await verifyChat(page, lang, { width: 1440, height: 900 });
  });
}
for (const lang of LANGUAGES) {
  test(`chat localization renders ${lang} on mobile`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-desktop');
    await verifyChat(page, lang, { width: 390, height: 844 });
  });
}
