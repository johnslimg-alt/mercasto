import { expect, test } from '@playwright/test';

const API_BASE_URL = process.env.API_BASE_URL || `${process.env.BASE_URL || 'https://mercasto.com'}/api`;
const ISOLATED_STACK = process.env.E2E_ISOLATED_STACK === '1';
const RESET_NEW_PASSWORD = process.env.E2E_RESET_NEW_PASSWORD || 'E2eNewPass99!';

function projectFixture(projectName, kind) {
  const mobile = projectName.includes('mobile');
  const suffix = mobile ? 'MOBILE' : 'DESKTOP';
  if (kind === 'reset') {
    return {
      email: process.env[`E2E_RESET_EMAIL_${suffix}`],
      token: process.env[`E2E_RESET_TOKEN_${suffix}`],
    };
  }
  return {
    email: process.env[`E2E_2FA_EMAIL_${suffix}`],
    password: process.env[`E2E_2FA_PASSWORD_${suffix}`],
    recoveryCode: process.env[`E2E_2FA_RECOVERY_${suffix}`],
  };
}

const randomEmail = () => `e2e_${Date.now()}_${Math.floor(Math.random() * 9999)}@mailinator.com`;

const getModal = (page) =>
  page.locator('.fixed.inset-0').filter({ has: page.locator('input[name="email"], input[name="code"]') }).first();

async function dismissCookies(page) {
  const acceptCookies = page.locator('button:has-text("Aceptar")').first();
  await acceptCookies.waitFor({ state: 'visible', timeout: 2000 }).catch(() => {});
  if (await acceptCookies.isVisible().catch(() => false)) {
    await acceptCookies.click().catch(() => {});
  }
}

async function openAuthModal(page) {
  const btn = page.locator(
    '[data-testid="golden-account-button"]:visible, [data-testid="golden-mobile-account-tab"]:visible, .header-user-button:visible, .mobile-account-button:visible'
  ).first();

  await expect(btn).toBeVisible({ timeout: 25000 });
  await btn.click();

  const modal = getModal(page);
  await expect(modal).toBeVisible({ timeout: 8000 });
  await expect(modal.locator('input[name="email"]')).toBeVisible({ timeout: 8000 });
  return modal;
}

async function switchToRegister(modal) {
  const registerSwitch = modal.locator('button').filter({ hasText: /No tienes cuenta|tienes cuenta|Únete|Crear/i }).first();
  await registerSwitch.click();
  await expect(modal.locator('input[name="name"]')).toBeVisible({ timeout: 5000 });
}

async function registerUser(page, email, name = 'E2E Test User', password = 'E2eTestPass99!') {
  await dismissCookies(page);
  const modal = await openAuthModal(page);
  await switchToRegister(modal);
  await modal.locator('input[name="name"]').fill(name);
  await modal.locator('input[name="email"]').fill(email);
  await modal.locator('input[name="password"]').fill(password);
  await modal.locator('input[name="age_confirmed"]').check();
  await modal.locator('button[type="submit"]').click();

  await page.waitForFunction(() => localStorage.getItem('auth_token') !== null, { timeout: 10000 }).catch(() => {});

  const onboarding = page.getByRole('dialog').filter({ has: page.getByRole('heading', { name: /Bienvenido a Mercasto|Welcome to Mercasto/i }) }).first();
  await onboarding.waitFor({ state: 'visible', timeout: 2500 }).catch(() => {});
  if (await onboarding.isVisible().catch(() => false)) {
    const closeButton = onboarding.getByRole('button', { name: /Cerrar|Close/i }).first();
    await closeButton.click();
    await onboarding.waitFor({ state: 'hidden', timeout: 5000 });
  }
}

test.describe('Authentication E2E Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'load' });
    await page.evaluate(() => localStorage.clear());
    await page.evaluate(() => sessionStorage.clear());
    await dismissCookies(page);
  });

  test('auth modal opens and shows login form', async ({ page }) => {
    const modal = await openAuthModal(page);
    await expect(modal.locator('input[name="email"]')).toBeVisible();
    await expect(modal.locator('input[name="password"]')).toBeVisible();
    await expect(modal.locator('h2')).toContainText(/Iniciar Ses|Login/i);
  });

  test('switches between login and register mode', async ({ page }) => {
    const modal = await openAuthModal(page);
    await expect(modal.locator('input[name="name"]')).not.toBeVisible();
    await switchToRegister(modal);
    await modal.locator('button').filter({ hasText: /Ya tengo cuenta|Login|Iniciar/i }).first().click();
    await expect(modal.locator('input[name="name"]')).not.toBeVisible();
  });

  test('forgot password form is available', async ({ page }) => {
    const modal = await openAuthModal(page);
    await modal.locator('button').filter({ hasText: /Olvidaste|Forgot/i }).first().click();
    await expect(modal.locator('input[name="email"]')).toBeVisible({ timeout: 5000 });
    await expect(modal.locator('input[name="password"]')).not.toBeVisible();
    await expect(modal).toContainText(/Volver|iniciar sesión|Login/i);
  });

  test('registers a new account and reaches post-register state', async ({ page }) => {
    const email = randomEmail();
    await registerUser(page, email);

    const bodyText = await page.locator('body').textContent();
    const token = await page.evaluate(() => localStorage.getItem('auth_token'));
    expect(Boolean(token) || /Verifica|Reenviar|Confirmar|enviado|verif/i.test(bodyText || '')).toBe(true);
  });

  test('invalid login stays in auth modal', async ({ page }) => {
    const modal = await openAuthModal(page);
    await modal.locator('input[name="email"]').fill('nonexistent@example.com');
    await modal.locator('input[name="password"]').fill('WrongPassword123!');
    await modal.locator('input[name="password"]').press('Enter');

    await page.waitForTimeout(2000);
    await expect(modal.locator('input[name="email"]')).toBeVisible();
  });

  test('OAuth buttons follow the provider availability contract', async ({ page, request }) => {
    const response = await request.get(`${API_BASE_URL}/auth/providers`);
    expect(response.ok()).toBeTruthy();
    const payload = await response.json();
    const providers = payload.providers ?? payload;

    await openAuthModal(page);
    const googleButton = page.getByRole('button', { name: 'Google' });
    if (providers.google === true || providers.google?.enabled === true) {
      await expect(googleButton).toBeVisible({ timeout: 5000 });
    } else {
      await expect(googleButton).toHaveCount(0);
    }
  });

  test('no stack traces or secrets are visible in public UI', async ({ page }) => {
    const body = await page.locator('body').textContent();
    expect(body).not.toMatch(/Exception|Stack trace|Traceback|at Object\.|at Function\./i);
    expect(body).not.toMatch(/APP_KEY|DB_PASSWORD|SECRET/i);
  });

  test('completes password reset and logs in with the new password', async ({ page }, testInfo) => {
    test.skip(!ISOLATED_STACK, 'Password reset completion uses isolated reset-token fixtures.');
    const fixture = projectFixture(testInfo.project.name, 'reset');
    expect(fixture.email).toBeTruthy();
    expect(fixture.token).toBeTruthy();

    await page.goto(`/?reset_token=${encodeURIComponent(fixture.token)}&email=${encodeURIComponent(fixture.email)}`);
    const modal = page.locator('.fixed.inset-0').filter({ has: page.locator('input[name="password_confirmation"]') }).first();
    await expect(modal).toBeVisible({ timeout: 8000 });
    await expect(modal.locator('input[name="password_confirmation"]')).toBeVisible();
    await modal.locator('input[name="password"]').fill(RESET_NEW_PASSWORD);
    await modal.locator('input[name="password_confirmation"]').fill(RESET_NEW_PASSWORD);
    await modal.locator('button[type="submit"]').click();

    const loginModal = page.getByRole('dialog').filter({
      has: page.getByRole('heading', { name: /Iniciar Sesión|Login/i }),
    }).first();
    await expect(loginModal).toBeVisible({ timeout: 8000 });
    const emailInput = loginModal.locator('input[type="email"][name="email"]');
    const passwordInput = loginModal.locator('input[type="password"][name="password"]');
    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await emailInput.fill(fixture.email);
    await expect(emailInput).toHaveValue(fixture.email);
    await passwordInput.fill(RESET_NEW_PASSWORD);
    await expect(passwordInput).toHaveValue(RESET_NEW_PASSWORD);
    await expect(emailInput).toHaveValue(fixture.email);
    await loginModal.getByRole('button', { name: /Iniciar Sesión|Login/i }).click();
    await page.waitForFunction(() => localStorage.getItem('auth_token') !== null, { timeout: 10000 });
  });

  test('completes the 2FA challenge with a one-time recovery code', async ({ page }, testInfo) => {
    test.skip(!ISOLATED_STACK, '2FA verification uses isolated recovery-code fixtures.');
    const fixture = projectFixture(testInfo.project.name, 'two-factor');
    expect(fixture.email).toBeTruthy();
    expect(fixture.password).toBeTruthy();
    expect(fixture.recoveryCode).toBeTruthy();

    const modal = await openAuthModal(page);
    await modal.locator('input[name="email"]').fill(fixture.email);
    await modal.locator('input[name="password"]').fill(fixture.password);
    await modal.locator('input[name="password"]').press('Enter');

    await expect(modal.getByRole('heading', { name: /Verificación de dos pasos/i })).toBeVisible({ timeout: 8000 });
    const codeInput = modal.locator('input[name="code"]');
    await expect(codeInput).toHaveAttribute('maxlength', '32');
    await codeInput.fill(fixture.recoveryCode);
    await modal.getByRole('button', { name: /Verificar e Iniciar Sesión/i }).click();
    await page.waitForFunction(() => localStorage.getItem('auth_token') !== null, { timeout: 10000 });
  });

  test('deletes a newly registered account through the browser UI', async ({ page, request }) => {
    test.skip(!ISOLATED_STACK, 'Account deletion must never mutate a production account.');
    const email = randomEmail();
    const password = 'E2eDeletePass99!';
    await registerUser(page, email, 'E2E Delete User', password);
    await page.goto('/profile');

    await page.getByRole('button', { name: /Ajustes|Configuración|Settings/i }).first().click();
    const deleteButton = page.getByRole('button', { name: /Eliminar Cuenta|Delete Account/i }).first();
    await expect(deleteButton).toBeVisible({ timeout: 8000 });

    page.on('dialog', async (dialog) => {
      if (dialog.type() === 'confirm') {
        expect(dialog.message()).toMatch(/eliminar tu cuenta|delete your account/i);
        await dialog.accept();
        return;
      }
      if (dialog.type() === 'prompt') {
        await dialog.accept(password);
      }
    });
    const deletionResponse = page.waitForResponse((response) => (
      response.url().endsWith('/api/user')
      && response.request().method() === 'DELETE'
      && response.status() === 200
    ));
    await deleteButton.click();
    expect((await deletionResponse).status()).toBe(200);
    await expect.poll(() => page.evaluate(() => localStorage.getItem('auth_token'))).toBeNull();

    const loginResponse = await request.post(`${API_BASE_URL}/login`, {
      data: { email, password },
      headers: { Accept: 'application/json' },
    });
    expect(loginResponse.status()).toBe(422);
  });

  test('registered user can log out and log back in', async ({ page }) => {
    const email = 'e2e-login@example.test';
    const password = 'E2eTestPass99!';
    const e2eUser = { id: 7001, name: 'E2E Login User', email, role: 'individual', account_verified: true };

    await page.route('**/api/**', async route => {
      const url = new URL(route.request().url());
      const method = route.request().method();
      const json = (payload, status = 200) => route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify(payload),
      });
      if (url.pathname.endsWith('/login') && method === 'POST') {
        return json({ access_token: 'e2e-login-token', user: e2eUser });
      }
      if (url.pathname.endsWith('/logout') && method === 'POST') return json({ ok: true });
      if (url.pathname.endsWith('/user')) return json(e2eUser);
      if (url.pathname.endsWith('/auth/providers')) return json({ google: false, apple: false, sms: false });
      if (url.pathname.endsWith('/categories') || url.pathname.endsWith('/category-attributes') || url.pathname.endsWith('/favorites')) return json([]);
      if (url.pathname.endsWith('/ads')) return json({ data: [], total: 0, current_page: 1, last_page: 1 });
      if (url.pathname.endsWith('/banners')) return json({ banners: [] });
      return json({});
    });

    await page.evaluate(({ user }) => {
      localStorage.setItem('auth_token', 'e2e-seeded-token');
      localStorage.setItem('user', JSON.stringify(user));
    }, { user: e2eUser });

    await page.goto('/profile');
    const accountButton = page.getByTestId('golden-account-button');
    await expect(accountButton).toBeVisible({ timeout: 10000 });
    await accountButton.click();
    const accountMenu = page.getByTestId('golden-account-menu');
    await expect(accountMenu).toBeVisible({ timeout: 5000 });
    const logoutButton = accountMenu.getByRole('menuitem', { name: /Cerrar sesión|Salir|Log out|Logout/i });
    await expect(logoutButton).toBeVisible({ timeout: 5000 });
    await logoutButton.click();
    await expect.poll(() => page.evaluate(() => localStorage.getItem('auth_token'))).toBeNull();

    await page.goto('/');
    const modal = await openAuthModal(page);
    await modal.locator('input[name="email"]').fill(email);
    await modal.locator('input[name="password"]').fill(password);
    await modal.locator('input[name="password"]').press('Enter');

    await page.waitForFunction(() => localStorage.getItem('auth_token') !== null, { timeout: 10000 }).catch(() => {});
    await page.goto('/profile');
    await expect(page.locator('body')).toContainText(/E2E Login User|Cuenta|Perfil/i);
  });
});


test('login and register entry routes use the shared Golden shell on desktop and mobile', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop');
  await page.addInitScript(() => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem('cookiesAccepted', 'true');
  });
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/auth/providers')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ google: false, apple: false, sms: false }),
      });
    }
    return route.fulfill({ status: 401, contentType: 'application/json', body: '{}' });
  });

  for (const viewport of [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'mobile', width: 390, height: 844 },
  ]) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });

    for (const route of ['/login', '/register']) {
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      await expect(page.getByTestId('golden-header')).toBeVisible();
      await expect(page.getByTestId('golden-auth-entry-main')).toBeVisible();
      await expect(page.locator('.site-header')).toBeHidden();

      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(1);

      if (viewport.name === 'mobile') {
        await expect(page.getByTestId('golden-bottom-nav')).toBeVisible();
        await expect(page.getByTestId('golden-mobile-account-tab')).toHaveClass(/active/);
        await expect(page.locator('.mobile-tabbar')).toBeHidden();
      }
    }
  }
});


test('direct auth entry keeps the Golden shell visible while a stored session is validated', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem('cookiesAccepted', 'true');
    localStorage.setItem('auth_token', 'expired-e2e-token');
  });

  let releaseUserValidation;
  const userValidationHold = new Promise(resolve => {
    releaseUserValidation = resolve;
  });
  const userValidationRequest = page.waitForRequest(request => {
    try {
      return new URL(request.url()).pathname === '/api/user';
    } catch {
      return false;
    }
  });

  await page.route('**/api/user', async route => {
    await userValidationHold;
    await route.fulfill({ status: 401, contentType: 'application/json', body: '{}' });
  });
  await page.route('**/api/auth/providers', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ google: false, apple: false, sms: false }),
  }));

  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await userValidationRequest;

  await expect(page.getByTestId('golden-header')).toBeVisible();
  await expect(page.getByTestId('golden-auth-entry-main')).toBeVisible();
  await expect(page.getByTestId('golden-auth-entry-main').locator('.animate-spin')).toBeVisible();
  await expect(page.locator('.site-header')).toBeHidden();

  releaseUserValidation();

  await expect(page.getByTestId('auth-modal-close')).toBeVisible({ timeout: 5000 });
  await expect(page.getByTestId('golden-header')).toBeVisible();
  await expect(page.locator('.site-header')).toBeHidden();
});

test('direct auth fallback keeps dark text on the lime CTA in dark mode', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem('cookiesAccepted', 'true');
  });
  await page.route('**/api/auth/providers', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ google: false, apple: false, sms: false }),
  }));

  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('auth-modal-close')).toBeVisible();
  await page.getByTestId('auth-modal-close').click();

  const themeToggle = page.getByTestId('golden-theme-toggle');
  await expect(themeToggle).toBeVisible();
  if (!await page.evaluate(() => document.documentElement.classList.contains('dark'))) {
    await themeToggle.click();
  }
  await expect.poll(() => page.evaluate(() => document.documentElement.classList.contains('dark'))).toBe(true);

  const cta = page.locator('.mcg-auth-lime-cta');
  await expect(cta).toBeVisible();
  const colors = await cta.evaluate(node => {
    const style = getComputedStyle(node);
    return { color: style.color, backgroundColor: style.backgroundColor };
  });
  expect(colors.color).toBe('rgb(15, 23, 42)');
  expect(colors.backgroundColor).toBe('rgb(132, 204, 22)');
});

test('direct auth shell keeps the tablet footer content above the fixed Golden nav', async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 800 });
  await page.addInitScript(() => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem('cookiesAccepted', 'true');
  });
  await page.route('**/api/auth/providers', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ google: false, apple: false, sms: false }),
  }));

  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('auth-modal-close')).toBeVisible();
  await page.getByTestId('auth-modal-close').click();

  const footer = page.locator('.app-global-footer');
  const legal = page.locator('.app-footer-legal');
  const bottomNav = page.getByTestId('golden-bottom-nav');
  await expect(footer).toBeVisible();
  await expect(legal).toBeVisible();
  await expect(bottomNav).toBeVisible();

  const footerPaddingBottom = await footer.evaluate(node => parseFloat(getComputedStyle(node).paddingBottom));
  expect(footerPaddingBottom).toBeGreaterThanOrEqual(100);

  await page.evaluate(() => {
    document.documentElement.style.scrollBehavior = 'auto';
    window.scrollTo(0, document.documentElement.scrollHeight);
  });
  await expect.poll(() => page.evaluate(() => {
    const legalNode = document.querySelector('.app-footer-legal');
    const navNode = document.querySelector('[data-testid="golden-bottom-nav"]');
    if (!legalNode || !navNode) return false;
    const legalRect = legalNode.getBoundingClientRect();
    const navRect = navNode.getBoundingClientRect();
    return legalRect.top >= 0 && legalRect.bottom <= navRect.top + 1;
  })).toBeTruthy();
});
