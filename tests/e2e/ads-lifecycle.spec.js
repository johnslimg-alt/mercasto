import { expect, test } from '@playwright/test';
import path from 'path';

const E2E_SELLER_EMAIL = process.env.E2E_SELLER_EMAIL;
const E2E_SELLER_PASSWORD = process.env.E2E_SELLER_PASSWORD;
const E2E_BUYER_EMAIL = process.env.E2E_BUYER_EMAIL || 'buyer_e2e@mercasto.com';
const E2E_BUYER_PASSWORD = process.env.E2E_BUYER_PASSWORD || 'E2eTestPass99!';
const API_BASE_URL = process.env.API_BASE_URL || `${process.env.BASE_URL || 'https://mercasto.com'}/api`;
const uniqueAdTitle = () => `Toyota Corolla E2E ${Date.now()} ${Math.floor(Math.random() * 10000)}`;

test.skip(!E2E_SELLER_EMAIL || !E2E_SELLER_PASSWORD, 'Set E2E_SELLER_EMAIL and E2E_SELLER_PASSWORD to run seller lifecycle tests.');

// Precise helper to select the active auth modal container on the page uniquely
const getModal = (page) => page.locator('.fixed.inset-0').filter({ has: page.locator('input[name="email"], input[name="code"]') }).first();

// Helper to log in a user using the modal flow
async function loginUser(page, email, password) {
  const userButton = page.locator('.header-user-button, .mobile-account-button').filter({ visible: true }).first();
  await expect(userButton).toBeVisible();

  const modal = getModal(page);

  // Real Playwright click
  await userButton.click();
  await expect(modal).toBeVisible({ timeout: 5000 });

  // Wait for modal animation to settle and React click handlers to attach
  await page.waitForTimeout(500);

  // Ensure modal is in Login mode (header has "Iniciar Sesión" or "Login")
  const h2Text = await modal.locator('h2').innerText().catch(() => '');
  if (!/Iniciar Sesión|Login/i.test(h2Text)) {
    const hasAccountBtn = modal.locator('button:has-text("tienes cuenta")').first();
    const smsBackBtn = modal.locator('button:has-text("Volver a iniciar")').first();

    if (await hasAccountBtn.isVisible()) {
      await hasAccountBtn.click();
    } else if (await smsBackBtn.isVisible()) {
      await smsBackBtn.click();
    }
    await expect(modal.locator('h2')).toContainText(/Iniciar Sesión|Login/i, { timeout: 3000 });
  }

  // Fill credentials inside the modal
  await modal.locator('input[name="email"]').fill(email);
  await modal.locator('input[name="password"]').fill(password);

  // Submit login via Enter key
  await modal.locator('input[name="password"]').press('Enter');

  // Wait for the auth session token to be successfully saved in localStorage
  await page.waitForFunction(() => localStorage.getItem('auth_token') !== null, { timeout: 10000 });

  // Wait for onboarding modal and dismiss it if it appears (App.jsx opens it with a 500ms delay)
  const skipButton = page.locator('button').filter({ hasText: /Omitir|Skip/i }).first();
  await skipButton.waitFor({ state: 'visible', timeout: 1500 }).catch(() => {});
  if (await skipButton.isVisible().catch(() => false)) {
    await skipButton.click();
    await skipButton.waitFor({ state: 'hidden', timeout: 2000 }).catch(() => {});
  }
}


async function logoutUser(page) {
  const accountButton = page.locator('.header-user-button, .mobile-account-button').filter({ visible: true }).first();
  await expect(accountButton).toBeVisible({ timeout: 10000 });
  await accountButton.click();
  const logoutButton = page.getByRole('button', { name: /Salir|Logout/i }).filter({ visible: true }).first();
  await expect(logoutButton).toBeVisible({ timeout: 5000 });
  await logoutButton.click();
  await expect.poll(() => page.evaluate(() => localStorage.getItem('auth_token'))).toBeNull();
}

async function authenticatedAds(page, request) {
  const token = await page.evaluate(() => localStorage.getItem('auth_token'));
  expect(token).toBeTruthy();
  const response = await request.get(`${API_BASE_URL}/user/ads`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });
  expect(response.ok()).toBeTruthy();
  const payload = await response.json();
  return Array.isArray(payload) ? payload : (payload.data || []);
}

async function fixtureAd(page, request, title) {
  const ads = await authenticatedAds(page, request);
  const ad = ads.find((item) => item.title === title);
  expect(ad, `Missing E2E fixture: ${title}`).toBeTruthy();
  return ad;
}

// Helper to create a test ad via the UI
async function createTestAd(page, options = {}) {
  const { withVideo = false, useAiDescription = false } = options;
  const adTitle = uniqueAdTitle();
  // Navigate to the post screen (the route in SPA is /post)
  await page.goto('/post');

  // Dismiss onboarding modal if it appears (safeguard)
  const skipButton = page.locator('button').filter({ hasText: /Omitir|Skip/i }).first();
  await skipButton.waitFor({ state: 'visible', timeout: 1500 }).catch(() => {});
  if (await skipButton.isVisible().catch(() => false)) {
    await skipButton.click().catch(() => {});
    await skipButton.waitFor({ state: 'hidden', timeout: 2000 }).catch(() => {});
  }

  // Scope elements within the post form to prevent any header/footer collision
  const formContainer = page.locator('main form').first();

  // === STEP 1 — Categoría ===
  // Select category button Coches
  const categoryBtn = formContainer.locator('button').filter({ hasText: /Coches|Cars/i }).first();
  await expect(categoryBtn).toBeVisible({ timeout: 10000 });
  await categoryBtn.click();

  // Select subcategory button Sedán
  const subcategoryBtn = formContainer.locator('button').filter({ hasText: /Sedán|Sedan/i }).first();
  await expect(subcategoryBtn).toBeVisible({ timeout: 5000 });
  await subcategoryBtn.click();

  // Wait for the category attributes API request to complete to prevent race conditions
  await page.waitForResponse(
    response => response.url().includes('/api/category-attributes') && response.status() === 200,
    { timeout: 5000 }
  ).catch(() => {});

  // Go to step 2
  const nextBtn1 = page.locator('button').filter({ hasText: /Siguiente/i }).filter({ visible: true }).first();
  await nextBtn1.click({ force: true });

  // === STEP 2 — Detalles ===
  // Basic Fields
  const titleInput = formContainer.locator('input[placeholder*="Ej:"]').first();
  await expect(titleInput).toBeVisible({ timeout: 5000 });
  await titleInput.fill(adTitle);

  const descriptionInput = formContainer.locator('textarea').first();
  if (!useAiDescription) {
    await descriptionInput.fill('Vendo mi Toyota Corolla 2022 en excelente estado. Único dueño, todos los servicios de agencia.');
  }
  await formContainer.locator('input[type="number"]').first().fill('320000');

  // Fill dynamic attributes (Brand, Model, Year, Kilometers, Fuel) using robust locators matching either English or Spanish labels
  const brandSelect = formContainer.locator('div:has(> label:has-text("Marca")), div:has(> label:has-text("Brand"))').locator('select').first();
  await expect(brandSelect).toBeVisible();
  await brandSelect.selectOption({ label: 'Toyota' });

  const modelWrapper = formContainer.locator('div:has(> label:has-text("Model")), div:has(> label:has-text("Modelo"))');
  const modelSelect = modelWrapper.locator('select').first();
  const modelInput = modelWrapper.locator('input').first();
  if (await modelSelect.count() > 0 && await modelSelect.isVisible()) {
    await modelSelect.selectOption({ label: 'Corolla' });
  } else {
    await modelInput.fill('Corolla');
  }

  const yearInput = formContainer.locator('div:has(> label:has-text("Año")) input, div:has(> label:has-text("Year")) input').first();
  await yearInput.fill('2022');

  const kmsInput = formContainer.locator('div:has(> label:has-text("Kilómetros")) input, div:has(> label:has-text("Kilometer")) input').first();
  await kmsInput.fill('45000');

  const fuelSelect = formContainer.locator('div:has(> label:has-text("Combustible")), div:has(> label:has-text("Fuel"))').locator('select').first();
  await fuelSelect.selectOption({ label: 'Gasolina' });

  if (useAiDescription) {
    const aiResponsePromise = page.waitForResponse((response) => (
      response.url().endsWith('/api/ads/generate-description') && response.request().method() === 'POST'
    ));
    await formContainer.getByRole('button', { name: /Generar con IA|Generate with AI/i }).click();
    const aiResponse = await aiResponsePromise;
    expect(aiResponse.status()).toBe(200);
    await expect(descriptionInput).toHaveValue(/fallback local E2E/i, { timeout: 10000 });
  }

  // Upload deterministic media fixtures.
  await formContainer.locator('input[type="file"]').first().setInputFiles(path.join(process.cwd(), 'public/icon-192x192.png'));
  if (withVideo) {
    await formContainer.locator('input[type="file"][accept*="video"]').setInputFiles(
      path.join(process.cwd(), 'tests/fixtures/e2e-sample.mp4')
    );
    await expect(formContainer).toContainText('e2e-sample.mp4');
  }

  // Go to step 3
  const nextBtn2 = page.locator('button').filter({ hasText: /Siguiente/i }).filter({ visible: true }).first();
  await nextBtn2.click({ force: true });

  // === STEP 3 — Contacto ===
  // Select state
  const stateSelect = formContainer.locator('select').filter({ hasText: /Seleccionar estado|Select state/i }).first();
  await expect(stateSelect).toBeVisible({ timeout: 10000 });
  await stateSelect.selectOption({ value: 'Ciudad de México' });

  // Select city
  const citySelect = formContainer.locator('select').filter({ hasText: /Seleccionar ciudad|Select city/i }).first();
  await expect(citySelect).toBeVisible({ timeout: 5000 });
  await citySelect.selectOption({ value: 'Cuauhtémoc' });

  // Fill location input (supports both English and Spanish labels/placeholders)
  const locationInput = formContainer.locator('div:has(> label:has-text("Ubicación")) input, div:has(> label:has-text("Location")) input, input[placeholder*="dirección"], input[placeholder*="address"]').first();
  await locationInput.fill('CDMX, México');

  // Click on the map to set required latitude and longitude coords
  const mapContainer = formContainer.locator('.leaflet-container');
  await expect(mapContainer).toBeVisible({ timeout: 10000 });
  await mapContainer.click({ position: { x: 100, y: 100 } });

  // Select contact method (WhatsApp) if not already selected
  const whatsappTab = formContainer.locator('button').filter({ hasText: /WhatsApp/i }).first();
  const isSelected = await whatsappTab.evaluate(el => el.className.includes('border-[#84CC16]') || el.className.includes('text-[#65A30D]'));
  if (!isSelected) {
    await whatsappTab.click();
  }

  const phoneInput = formContainer.locator('input[type="tel"]').first();
  await phoneInput.waitFor({ state: 'visible', timeout: 5000 });
  await phoneInput.fill('5512345678');

  // Submit the form (Works on both desktop and mobile layouts)
  const submitBtn = page.locator('main button').filter({ hasText: /Publicar|Publish/i }).filter({ visible: true }).first();
  await expect(submitBtn).toBeVisible();
  await submitBtn.click({ force: true });

  // Verification: should redirect to /profile (my_ads tab) and show the new ad
  await page.waitForURL('**/profile', { timeout: 15000 });

  // The dashboard opens on "Todos" and must already show the newly-created pending listing.
  const titleHeading = page.getByRole('heading', { name: adTitle }).first();
  await expect(titleHeading).toBeVisible({ timeout: 10000 });
  const card = titleHeading.locator('xpath=ancestor::div[starts-with(@data-testid, "dashboard-ad-")][1]');
  const cardTestId = await card.getAttribute('data-testid');
  const adId = Number(cardTestId?.replace('dashboard-ad-', ''));
  expect(adId).toBeGreaterThan(0);
  await expect(card.getByText(/Pendiente|Pending/i).first()).toBeVisible();
  return { adTitle, adId };
}

test.describe('Ads Lifecycle E2E Flow', () => {
  test.describe.configure({ timeout: 60_000 });
  test.beforeEach(async ({ page }) => {
    // Navigate to homepage, clear state, and login
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.evaluate(() => sessionStorage.clear());

    // Dismiss cookie banner
    const acceptCookies = page.locator('button').filter({ hasText: /Aceptar|Accept/i }).first();
    await acceptCookies.waitFor({ state: 'visible', timeout: 2000 }).catch(() => {});
    if (await acceptCookies.isVisible().catch(() => false)) {
      await acceptCookies.click().catch(() => {});
    }

    await loginUser(page, E2E_SELLER_EMAIL, E2E_SELLER_PASSWORD);
  });

  test('should create a new ad with media and category-specific attributes', async ({ page }) => {
    const { adTitle } = await createTestAd(page);
    await expect(page.getByRole('heading', { name: adTitle }).first()).toBeVisible();
  });

  test('should edit and update ad details successfully', async ({ page, request }) => {
    const { adId, adTitle } = await createTestAd(page);
    const updatedTitle = `${adTitle} Precio Reducido`;

    await page.getByTestId(`edit-ad-${adId}`).click();
    await expect(page).toHaveURL(new RegExp(`/anuncio/${adId}/editar$`));

    const editForm = page.locator('main form, form').filter({ has: page.getByTestId('edit-ad-title') }).first();
    const titleInput = page.getByTestId('edit-ad-title');
    const priceInput = page.getByTestId('edit-ad-price');
    await expect(titleInput).toHaveValue(adTitle, { timeout: 10000 });
    await titleInput.fill(updatedTitle);
    await expect(titleInput).toHaveValue(updatedTitle);
    await priceInput.fill('310000');
    await expect(priceInput).toHaveValue('310000');
    await expect(titleInput).toHaveValue(updatedTitle);

    const updateRequestPromise = page.waitForRequest((updateRequest) => (
      updateRequest.url().endsWith(`/api/ads/${adId}`) && updateRequest.method() === 'POST'
    ));
    const updateResponsePromise = page.waitForResponse((response) => (
      response.url().endsWith(`/api/ads/${adId}`) && response.request().method() === 'POST'
    ));
    await editForm.getByRole('button', { name: /Guardar cambios|Save changes/i }).click();
    const [updateRequest, updateResponse] = await Promise.all([updateRequestPromise, updateResponsePromise]);
    expect(updateRequest.postData() || '').toContain(updatedTitle);
    expect(updateResponse.status()).toBe(200);
    await expect(page).toHaveURL(new RegExp(`/#ad-${adId}$`), { timeout: 15000 });

    await expect.poll(async () => {
      const ads = await authenticatedAds(page, request);
      return ads.find((item) => item.id === adId)?.title;
    }).toBe(updatedTitle);

    await page.goto('/profile');
    await expect(page.getByTestId(`dashboard-ad-${adId}`)).toContainText(updatedTitle);
    await expect(page.getByTestId(`dashboard-ad-${adId}`)).toContainText('$310,000');
  });

  test('should allow a buyer to report an active listing', async ({ page, request }) => {
    const response = await request.get(`${API_BASE_URL}/ads?search=${encodeURIComponent('Mercasto E2E Active Listing')}`);
    expect(response.ok()).toBeTruthy();
    const payload = await response.json();
    const activeAd = (payload.data || []).find((item) => item.title === 'Mercasto E2E Active Listing');
    expect(activeAd).toBeTruthy();

    await logoutUser(page);
    await loginUser(page, E2E_BUYER_EMAIL, E2E_BUYER_PASSWORD);
    await page.goto(`/?ad=${activeAd.id}`);
    await expect(page.getByRole('heading', { name: 'Mercasto E2E Active Listing' }).first()).toBeVisible({ timeout: 10000 });

    await page.getByRole('button', { name: /Report listing|Reportar (?:este )?anuncio/i }).click();
    const reportModal = page.locator('.fixed.inset-0').filter({ hasText: /Reportar Anuncio/i }).first();
    await expect(reportModal).toBeVisible();
    await reportModal.locator('select').selectOption('Contenido inapropiado');
    await reportModal.locator('textarea').fill('Fixture E2E: contenido inapropiado para validar el flujo de reporte.');

    const reportResponsePromise = page.waitForResponse((result) => (
      result.url().endsWith(`/api/ads/${activeAd.id}/report`) && result.request().method() === 'POST'
    ));
    await reportModal.getByRole('button', { name: /Enviar Reporte/i }).click();
    const reportResponse = await reportResponsePromise;
    expect(reportResponse.status()).toBe(200);
    await expect(reportModal).not.toBeVisible();
  });

  test('should pause and reactivate an active listing', async ({ page, request }) => {
    const activeAd = await fixtureAd(page, request, 'Mercasto E2E Active Listing');
    await page.goto('/profile');

    await page.getByTestId(`pause-ad-${activeAd.id}`).click();
    await expect(page.getByTestId(`reactivate-ad-${activeAd.id}`)).toBeVisible();
    await expect.poll(async () => (await fixtureAd(page, request, activeAd.title)).status).toBe('paused');

    await page.getByTestId(`reactivate-ad-${activeAd.id}`).click();
    await expect(page.getByTestId(`pause-ad-${activeAd.id}`)).toBeVisible();
    await expect.poll(async () => (await fixtureAd(page, request, activeAd.title)).status).toBe('active');
  });

  test('should open the paid renewal checkout for an expired listing', async ({ page, request }) => {
    const expiredAd = await fixtureAd(page, request, 'Mercasto E2E Expired Listing');
    await page.goto('/profile');

    await page.getByTestId(`republish-ad-${expiredAd.id}`).click();
    await expect(page).toHaveURL(/^http:\/\/127\.0\.0\.1:18001\/checkout\/local-checkout-/, { timeout: 15000 });
    await expect(page.getByRole('heading', { name: 'Clip local checkout' })).toBeVisible();
  });

  test('should upload and process an MP4 listing video', async ({ page, request }) => {
    const { adId } = await createTestAd(page, { withVideo: true });
    await expect.poll(async () => {
      const ad = (await authenticatedAds(page, request)).find((item) => item.id === adId);
      return ad ? { video_url: ad.video_url, status: ad.video_processing_status } : null;
    }, { timeout: 15000 }).toMatchObject({
      video_url: expect.stringMatching(/^videos\//),
      status: 'completed',
    });
  });

  test('should generate the description through the isolated Ollama fallback', async ({ page, request }) => {
    const { adId } = await createTestAd(page, { useAiDescription: true });
    await expect.poll(async () => {
      const ad = (await authenticatedAds(page, request)).find((item) => item.id === adId);
      return ad?.description || '';
    }).toMatch(/fallback local E2E/i);
  });

  test('should render a public listing detail without debug or secret text', async ({ page, request }) => {
    const response = await request.get(`${API_BASE_URL}/ads?search=${encodeURIComponent('Mercasto E2E Active Listing')}`);
    expect(response.ok()).toBeTruthy();
    const payload = await response.json();
    const activeAd = (payload.data || []).find((item) => item.title === 'Mercasto E2E Active Listing');
    expect(activeAd).toBeTruthy();

    await page.goto(`/?ad=${activeAd.id}`);
    await expect(page.getByRole('heading', { name: activeAd.title }).first()).toBeVisible({ timeout: 10000 });
    const body = await page.locator('body').textContent();
    expect(body).not.toMatch(/Whoops|Stack trace|SQLSTATE|APP_KEY|DB_PASSWORD|Exception|Traceback/i);
  });

  test('should perform full ad deletion sequence', async ({ page, request }) => {
    const { adId, adTitle } = await createTestAd(page);
    await page.goto('/profile');

    page.once('dialog', async (dialog) => {
      expect(dialog.message().toLowerCase()).toMatch(/seguro|sure/);
      await dialog.accept();
    });
    await page.getByTestId(`delete-ad-${adId}`).click();

    await expect(page.getByTestId(`dashboard-ad-${adId}`)).toHaveCount(0);
    await expect.poll(async () => (await authenticatedAds(page, request)).some((item) => item.id === adId)).toBe(false);
    await expect(page.getByRole('heading', { name: adTitle })).toHaveCount(0);
  });

});
