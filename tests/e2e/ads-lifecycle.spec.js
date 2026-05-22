import { expect, test } from '@playwright/test';
import path from 'path';

test.describe('Ads Lifecycle E2E Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login and mock authenticated state
    await page.goto('/login');
    await page.fill('input[type="email"]', 'seller@example.com');
    await page.fill('input[type="password"]', 'SellerPass123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/account**', { timeout: 10000 }).catch(() => {});
  });

  test('should create a new ad with media and category-specific attributes', async ({ page }) => {
    await page.goto('/publish');

    // Basic Fields
    await page.fill('input[name="title"]', 'Toyota Corolla 2022 Excelente Estado');
    await page.fill('textarea[name="description"]', 'Vendo mi Toyota Corolla 2022 en excelente estado. Único dueño, todos los servicios de agencia. Muy ahorrador.');
    await page.fill('input[name="price"]', '320000');

    // Select "Coches" (Cars) category to trigger dynamic attributes
    await page.selectOption('select[name="category_id"]', { label: 'Coches' });

    // Verify dynamic category attributes appear
    const brandInput = page.locator('select[name="attributes[brand]"]');
    await expect(brandInput).toBeVisible();
    await brandInput.selectOption({ value: 'toyota' });

    await page.fill('input[name="attributes[model]"]', 'Corolla');
    await page.fill('input[name="attributes[year]"]', '2022');
    await page.fill('input[name="attributes[kms]"]', '45000');
    await page.selectOption('select[name="attributes[fuel]"]', { value: 'gasolina' });

    // Upload dynamic mock media files
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.click('.media-upload-dropzone, input[type="file"]');
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles([
      path.join(process.cwd(), 'public/icon-192x192.png')
    ]);

    // Check uploaded image preview is visible
    await expect(page.locator('.uploaded-image-preview, img[src*="blob"]')).toBeVisible();

    // Fill location
    await page.fill('input[placeholder*="Ubicación"], input[name="location"]', 'CDMX, México');

    // Submit
    await page.click('button[type="submit"]');

    // Verification: should redirect to the new listing's storefront detail view
    await page.waitForURL('**/listings/**').catch(() => {});
    await expect(page.locator('h1')).toContainText(/Toyota Corolla 2022/i);
    await expect(page.locator('body')).toContainText(/toyota/i);
    await expect(page.locator('body')).toContainText(/Corolla/i);
  });

  test('should edit and update ad details successfully', async ({ page }) => {
    // Navigate to "My Ads" dashboard
    await page.goto('/account/listings');

    // Click edit on the first active ad
    const editButton = page.locator('a:has-text("Editar"), button:has-text("Edit")').first();
    await expect(editButton).toBeVisible();
    await editButton.click();

    // Wait for the edit page to load
    await page.waitForURL('**/publish/**').catch(() => {});
    await expect(page.locator('h1')).toContainText(/Editar anuncio|Edit Ad/i);

    // Modify fields
    await page.fill('input[name="price"]', '310000');
    await page.fill('input[name="title"]', 'Toyota Corolla 2022 Excelente Estado - Precio Reducido');

    // Update
    await page.click('button[type="submit"]');

    // Verification: check details page displays new values
    await page.waitForURL('**/listings/**').catch(() => {});
    await expect(page.locator('h1')).toContainText(/Precio Reducido/i);
    await expect(page.locator('body')).toContainText(/310,000/i);
  });

  test('should allow users to report inappropriate ads', async ({ page }) => {
    // Go to an ad's detail page
    await page.goto('/listings');
    const adCard = page.locator('.ad-card, a[href*="/listings/"]').first();
    await expect(adCard).toBeVisible();
    await adCard.click();

    // Verify detail page has a Report button
    const reportButton = page.locator('button:has-text("Reportar"), button:has-text("Report")');
    await expect(reportButton).toBeVisible();
    await reportButton.click();

    // Fill report modal
    await expect(page.locator('div[role="dialog"], .modal')).toBeVisible();
    await page.selectOption('select[name="reason"]', { value: 'spam' });
    await page.fill('textarea[name="comments"]', 'Este anuncio contiene spam y enlaces inapropiados.');
    await page.click('.modal button:has-text("Enviar"), .modal button:has-text("Submit")');

    // Verify success toast/alert
    await expect(page.locator('body')).toContainText(/gracias|reporte recibido|reported/i);
  });

  test('should perform full ad deletion sequence', async ({ page }) => {
    await page.goto('/account/listings');

    const initialAdsCount = await page.locator('.ad-card-row').count();
    
    // Trigger delete sequence
    const deleteButton = page.locator('button:has-text("Eliminar"), button:has-text("Delete")').first();
    await expect(deleteButton).toBeVisible();
    
    // Playwright handles confirm dialogs automatically or via page.once('dialog')
    page.once('dialog', async dialog => {
      expect(dialog.message()).toContain('seguro');
      await dialog.accept();
    });
    
    await deleteButton.click();

    // Verify it is removed from UI
    await page.waitForTimeout(2000);
    const postAdsCount = await page.locator('.ad-card-row').count();
    expect(postAdsCount).toBeLessThan(initialAdsCount);
  });
});
