import { test, expect } from '@playwright/test';

const AUDIT_ROUTES = [
  '/', '/login', '/register', '/listings', '/vendedores', '/publicar-gratis',
  '/motor', '/autos', '/inmuebles', '/empleos', '/servicios', '/productos', '/turismo',
  '/electronica', '/moda', '/hogar', '/tecnologia', '/telefonos', '/mascotas', '/infantil',
  '/negocios', '/ocio', '/boletos', '/hospedaje', '/tours', '/boletos_turismo',
  '/articulos_camping', '/souvenirs', '/renta_vehiculos', '/guias_servicios',
  '/atracciones_exp', '/retiros_bienestar', '/terminos', '/privacidad', '/cookies',
  '/tiendas', '/contacto', '/como-funciona', '/seguridad', '/ayuda/publicar-anuncio',
  '/ayuda/comprar-y-contactar', '/tarifas', '/sobre-mercasto', '/ayuda', '/verificar-email',
  '/publish', '/account', '/account/listings', '/account/billing', '/account/promotions',
  '/admin/login', '/post', '/notificaciones', '/mensajes', '/profile', '/admin',
  '/terms', '/privacy', '/help', '/safety', '/perfil/editar', '/informatica', '/telefonia',
  '/acerca-de', '/referidos',
];

const allowedSchemes = new Set(['http:', 'https:', 'mailto:', 'tel:']);

test('all audited browser routes and internal links resolve', async ({ page, request }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop');
  test.setTimeout(120_000);

  const base = new URL(testInfo.project.use.baseURL || 'https://mercasto.com');
  const internalLinks = new Set();

  for (const route of AUDIT_ROUTES) {
    const response = await page.goto(route, { waitUntil: 'domcontentloaded' });
    expect(response?.status(), `route ${route}`).toBeLessThan(400);
    await expect(page.locator('body')).not.toContainText(/No pudimos cargar esta (?:sección|página)/i);

    const hrefs = await page.locator('a[href]').evaluateAll((anchors) => anchors.map((anchor) => anchor.href));
    for (const href of hrefs) {
      const parsed = new URL(href);
      expect(allowedSchemes.has(parsed.protocol), `unsupported link scheme: ${href}`).toBeTruthy();
      if (parsed.origin === base.origin) internalLinks.add(parsed.href);
    }
  }

  for (const href of internalLinks) {
    const response = await request.get(href, { maxRedirects: 10, timeout: 15_000 });
    expect(response.status(), `internal link ${href}`).toBeLessThan(400);
  }
});

test('every visible button on audited guest routes has an accessible name', async ({ page }) => {
  test.setTimeout(120_000);

  const unnamed = [];
  for (const route of AUDIT_ROUTES) {
    await page.goto(route, { waitUntil: 'domcontentloaded' });
    const controls = await page.locator('button:visible').evaluateAll((buttons) => buttons.map((button) => ({
      text: (button.innerText || '').trim(),
      aria: (button.getAttribute('aria-label') || '').trim(),
      title: (button.getAttribute('title') || '').trim(),
      html: button.outerHTML.slice(0, 220),
    })));
    controls.forEach((control) => {
      if (!control.text && !control.aria && !control.title) unnamed.push({ route, html: control.html });
    });
  }

  expect(unnamed, `unnamed visible buttons: ${JSON.stringify(unnamed, null, 2)}`).toEqual([]);
});


test('every visible form control on audited guest routes has an accessible name', async ({ page }) => {
  test.setTimeout(150_000);
  const unnamed = [];
  for (const route of AUDIT_ROUTES) {
    await page.addInitScript(() => localStorage.setItem('cookie_consent', 'essential'));
    await page.goto(route, { waitUntil: 'domcontentloaded' });
    const controls = await page.locator('input:visible:not([type="hidden"]), select:visible, textarea:visible').evaluateAll((elements) => elements.map((element) => {
      const id = element.id;
      const explicitLabel = id ? document.querySelector(`label[for="${CSS.escape(id)}"]`) : null;
      const wrappingLabel = element.closest('label');
      return {
        aria: (element.getAttribute('aria-label') || '').trim(),
        labelledby: (element.getAttribute('aria-labelledby') || '').trim(),
        title: (element.getAttribute('title') || '').trim(),
        label: (explicitLabel?.textContent || wrappingLabel?.textContent || '').trim(),
        html: element.outerHTML.slice(0, 240),
      };
    }));
    controls.forEach((control) => {
      if (!control.aria && !control.labelledby && !control.title && !control.label) unnamed.push({ route, html: control.html });
    });
  }
  expect(unnamed, `unnamed visible form controls: ${JSON.stringify(unnamed, null, 2)}`).toEqual([]);
});


test('every visible link on audited guest routes has an accessible name', async ({ page }) => {
  test.setTimeout(150_000);
  const unnamed = [];
  for (const route of AUDIT_ROUTES) {
    await page.addInitScript(() => localStorage.setItem('cookie_consent', 'essential'));
    await page.goto(route, { waitUntil: 'domcontentloaded' });
    const links = await page.locator('a:visible').evaluateAll((elements) => elements.map((element) => ({
      text: (element.textContent || '').trim(),
      aria: (element.getAttribute('aria-label') || '').trim(),
      title: (element.getAttribute('title') || '').trim(),
      imageAlt: Array.from(element.querySelectorAll('img')).map(image => image.alt || '').join(' ').trim(),
      href: element.getAttribute('href') || '',
      html: element.outerHTML.slice(0, 240),
    })));
    links.forEach((link) => {
      if (!link.text && !link.aria && !link.title && !link.imageAlt) unnamed.push({ route, href: link.href, html: link.html });
    });
  }
  expect(unnamed, `unnamed visible links: ${JSON.stringify(unnamed, null, 2)}`).toEqual([]);
});
