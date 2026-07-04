import { expect, test } from '@playwright/test';
import path from 'path';

const E2E_SELLER_EMAIL = process.env.E2E_SELLER_EMAIL;
const E2E_SELLER_PASSWORD = process.env.E2E_SELLER_PASSWORD;

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

// Helper to create a test ad via the UI
async function createTestAd(page) {
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
  await titleInput.fill('Toyota Corolla 2022 Excelente Estado');

  await formContainer.locator('textarea').first().fill('Vendo mi Toyota Corolla 2022 en excelente estado. Único dueño, todos los servicios de agencia.');
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

  // Upload mock photo file
  await formContainer.locator('input[type="file"]').first().setInputFiles(path.join(process.cwd(), 'public/icon-192x192.png'));

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

  // Switch to the "Revisión" (In Review) tab to make the pending ad visible
  const revisionTab = page.locator('button').filter({ hasText: /Revisión|Review|Pending/i }).first();
  await expect(revisionTab).toBeVisible({ timeout: 5000 });
  await revisionTab.click();
  await page.waitForTimeout(500);
}

test.describe('Ads Lifecycle E2E Flow', () => {
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
    await createTestAd(page);
    await expect(page.locator('body')).toContainText(/Toyota Corolla 2022/i);
  });

  test('should edit and update ad details successfully', async ({ page }) => {
    // 1. Create an ad first to ensure one exists for editing
    await createTestAd(page);

    // 2. Navigate to dashboard
    await page.goto('/profile');

    // Switch to the "Revisión" (In Review) tab to see the pending ad
    const revisionTab = page.locator('button').filter({ hasText: /Revisión|Review|Pending/i }).first();
    await expect(revisionTab).toBeVisible({ timeout: 5000 });
    await revisionTab.click();
    await page.waitForTimeout(500);

    // Click edit on the first active/pending ad
    const editButton = page.locator('a[title*="Editar"], button[title*="Editar"], a:has-text("Editar"), button:has(.lucide-pencil)').first();
    await expect(editButton).toBeVisible();
    await editButton.click();

    // Wait for the edit ad screen to load (we switch to the post tab in SPA)
    const titleInput = page.locator('main form').first().locator('input[placeholder*="Ej:"]').first();
    
    // Go past Step 1
    const nextBtn1 = page.locator('button').filter({ hasText: /Siguiente/i }).filter({ visible: true }).first();
    await expect(nextBtn1).toBeVisible({ timeout: 5000 });
    await nextBtn1.click({ force: true });

    // Modify fields on Step 2
    await expect(titleInput).toBeVisible({ timeout: 5000 });
    const priceInput = page.locator('main form').first().locator('input[type="number"]').first();
    await priceInput.fill('310000');
    await titleInput.fill('Toyota Corolla 2022 Excelente Estado - Precio Reducido');

    // Go past Step 2
    const nextBtn2 = page.locator('button').filter({ hasText: /Siguiente/i }).filter({ visible: true }).first();
    await nextBtn2.click({ force: true });

    // Submit on Step 3
    const saveButton = page.locator('main button').filter({ hasText: /Guardar|Save/i }).filter({ visible: true }).first();
    await expect(saveButton).toBeVisible({ timeout: 5000 });
    await saveButton.click({ force: true });

    // Verification: should redirect back to profile and show updated title
    await page.waitForURL('**/profile', { timeout: 15000 });

    // Switch to the "Revisión" (In Review) tab to see the updated pending ad
    const revisionTabAfter = page.locator('button').filter({ hasText: /Revisión|Review|Pending/i }).first();
    await expect(revisionTabAfter).toBeVisible({ timeout: 5000 });
    await revisionTabAfter.click();
    await expect(page.locator('body')).toContainText(/Precio Reducido/i);
  });

  test('should allow users to report inappropriate ads', async ({ page }) => {
    // 1. Create an ad first to ensure one exists on the home page for reporting
    await createTestAd(page);

    // 2. We are already on /profile. Click the "Ver" button of our newly created ad
    const verButton = page.locator('a[title*="Ver"], button[title*="Ver"], a:has-text("Ver"), a:has(.lucide-eye)').first();
    await expect(verButton).toBeVisible();
    await verButton.click();

    // Click report button on the details page
    const reportButton = page.locator('button').filter({ hasText: /Reportar|Report/i }).filter({ visible: true }).first();
    await expect(reportButton).toBeVisible();
    await reportButton.click();

    // Fill report modal form
    const reportModal = page.locator('.fixed.inset-0').filter({ hasText: /Reportar/i }).first();
    await expect(reportModal).toBeVisible();
    await reportModal.locator('select').selectOption({ index: 1 });
    await reportModal.locator('textarea').fill('Este anuncio contains spam y enlaces inapropiados.');
    await reportModal.locator('button').filter({ hasText: /Enviar|Reportar/i }).click();

    // Verify success toast/alert or modal close
    await expect(reportModal).not.toBeVisible();
  });

  test('should perform full ad deletion sequence', async ({ page }) => {
    // 1. Create an ad first to ensure one exists for deleting
    await createTestAd(page);

    await page.goto('/profile');

    // Switch to the "Revisión" (In Review) tab to see the pending ad
    const revisionTab = page.locator('button').filter({ hasText: /Revisión|Review|Pending/i }).first();
    await expect(revisionTab).toBeVisible({ timeout: 5000 });
    await revisionTab.click();
    await page.waitForTimeout(500);

    // Verify the delete button of the ad card is visible
    const deleteButton = page.locator('button[title*="Eliminar"], button[title*="Delete"], button:has(.lucide-trash-2), button:has(svg.lucide-trash-2)').first();
    await expect(deleteButton).toBeVisible();

    page.once('dialog', async dialog => {
      expect(dialog.message().toLowerCase()).toMatch(/seguro|sure/);
      await dialog.accept();
    });

    await deleteButton.click();
    await page.waitForTimeout(2000);
  });
});
