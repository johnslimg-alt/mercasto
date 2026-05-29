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

  // Scope elements within the post form to prevent any footer collision
  const formContainer = page.locator('form').first();

  // Basic Fields
  await formContainer.locator('input[placeholder*="Ej:"]').first().fill('Toyota Corolla 2022 Excelente Estado');
  await formContainer.locator('textarea').first().fill('Vendo mi Toyota Corolla 2022 en excelente estado. Único dueño, todos los servicios de agencia.');
  await formContainer.locator('input[type="number"]').first().fill('320000');

  // Select category (Coches)
  const categorySelect = formContainer.locator('select').first();
  await categorySelect.selectOption({ value: 'coches' });

  // Fill dynamic attributes
  const brandSelect = formContainer.locator('select').filter({ hasText: /Toyota|Chevrolet/i }).first();
  await expect(brandSelect).toBeVisible();
  await brandSelect.selectOption({ label: 'Toyota' });

  const modelInput = formContainer.locator('div').filter({ has: page.locator('label', { hasText: /^Modelo$/i }) }).locator('input').first();
  await modelInput.fill('Corolla');

  const yearInput = formContainer.locator('input[placeholder="Desde"]').first();
  await yearInput.fill('2022');

  const kmsInput = formContainer.locator('input[placeholder="Mín."]').first();
  await kmsInput.fill('45000');

  const fuelSelect = formContainer.locator('select').filter({ hasText: /Gasolina/i }).first();
  await fuelSelect.selectOption({ label: 'Gasolina' });

  // Select state
  const stateSelect = formContainer.locator('select').filter({ hasText: /Seleccionar estado|Select state/i }).first();
  await stateSelect.selectOption({ value: 'Ciudad de México' });

  // Fill location/city
  const locationInput = formContainer.locator('input[placeholder*="ciudad"]');
  await locationInput.fill('CDMX, México');

  // Upload mock photo file
  await formContainer.locator('input[type="file"]').first().setInputFiles(path.join(process.cwd(), 'public/icon-192x192.png'));

  // Submit the form
  await formContainer.locator('button[type="submit"]').click();

  // Verification: should redirect to /profile (my_ads tab) and show the new ad
  await page.waitForURL('**/profile', { timeout: 10000 });
}

test.describe('Ads Lifecycle E2E Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to homepage, clear state, and login
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.evaluate(() => sessionStorage.clear());

    // Dismiss cookie banner
    const acceptCookies = page.locator('button:has-text("Aceptar")').first();
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

    // Click edit on the first active ad
    const editButton = page.locator('a[title*="Editar"], button[title*="Editar"], a:has-text("Editar")').first();
    await expect(editButton).toBeVisible();
    await editButton.click();

    // Wait for the edit ad screen to load
    await page.waitForURL('**/anuncio/*/editar', { timeout: 10000 });

    // Modify fields
    const formContainer = page.locator('form').first();
    await formContainer.locator('input[type="number"]').first().fill('310000');
    await formContainer.locator('input[placeholder*="Ej:"]').first().fill('Toyota Corolla 2022 Excelente Estado - Precio Reducido');

    // Submit
    await formContainer.locator('button[type="submit"]').click();

    // Verification: should redirect to home with ?ad= and show updated price/title
    await page.waitForURL('**/?ad=*', { timeout: 10000 });
    await expect(page.locator('body')).toContainText(/Precio Reducido/i);
  });

  test('should allow users to report inappropriate ads', async ({ page }) => {
    // 1. Create an ad first to ensure one exists on the home page for reporting
    await createTestAd(page);

    // 2. We are already on /profile. Click the "Ver" button of our newly created ad
    const verButton = page.locator('a[title*="Ver"], button[title*="Ver"], a:has-text("Ver")').first();
    await expect(verButton).toBeVisible();
    await verButton.click();

    // Click report button on the details page
    const reportButton = page.locator('button').filter({ hasText: /Reportar|Report/i }).filter({ visible: true }).first();
    await expect(reportButton).toBeVisible();
    await reportButton.click();

    // Fill report modal form
    const reportModal = page.locator('.fixed.inset-0').filter({ hasText: /Reportar/i }).first();
    await expect(reportModal).toBeVisible();
    await reportModal.locator('select').selectOption({ value: 'spam' });
    await reportModal.locator('textarea').fill('Este anuncio contains spam y enlaces inapropiados.');
    await reportModal.locator('button').filter({ hasText: /Enviar|Reportar/i }).click();

    // Verify success toast/alert or modal close
    await expect(reportModal).not.toBeVisible();
  });

  test('should perform full ad deletion sequence', async ({ page }) => {
    // 1. Create an ad first to ensure one exists for deleting
    await createTestAd(page);

    await page.goto('/profile');

    // Verify the delete button of the ad card is visible
    const deleteButton = page.locator('button[title*="Eliminar"], button[title*="Delete"], button:has(.lucide-trash-2), button:has(svg.lucide-trash-2)').first();
    await expect(deleteButton).toBeVisible();

    // Playwright handles confirm dialogs automatically or we can register a handler
    page.once('dialog', async dialog => {
      expect(dialog.message()).toContain('seguro');
      await dialog.accept();
    });

    await deleteButton.click();
    await page.waitForTimeout(2000);
  });
});
