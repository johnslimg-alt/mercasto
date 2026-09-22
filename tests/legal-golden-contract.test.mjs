import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

import { getPublicSeo } from '../src/constants/publicSeo.js';

test('React legal routes are not shadowed by copied static index files', () => {
  assert.equal(existsSync('public/moderacion/index.html'), false);
  assert.equal(existsSync('public/reembolsos/index.html'), false);
});

test('moderation and refund policy metadata is centrally owned', () => {
  assert.deepEqual(getPublicSeo('/moderacion', 'es'), {
    title: 'Política de moderación | Mercasto',
    description: 'Conoce las reglas de moderación, contenido prohibido, reportes y apelaciones de Mercasto México.',
  });
  assert.deepEqual(getPublicSeo('/reembolsos', 'es'), {
    title: 'Política de pagos y reembolsos | Mercasto',
    description: 'Consulta cómo funcionan los servicios de pago, promociones y revisiones de reembolso en Mercasto México.',
  });
});

test('Golden legal sticky geometry no longer depends on the legacy site header offset', () => {
  for (const file of [
    'src/components/screens/legal/TerminosScreen.jsx',
    'src/components/screens/legal/PrivacidadScreen.jsx',
    'src/components/screens/legal/CookiesScreen.jsx',
  ]) {
    const source = readFileSync(file, 'utf8');
    assert.equal(source.includes('mc-site-header-offset'), false);
    assert.match(source, /data-testid="legal-breadcrumb" className="[^"]*sticky top-0/);
    assert.match(source, /data-testid="legal-section-nav" className="[^"]*sticky top-20/);
  }
});

test('Golden legal contrast and scroll-restoration contracts stay explicit', () => {
  const css = readFileSync('src/components/home/mercasto-golden-home.css', 'utf8');
  assert.match(css, /\.dark \.mcg-legal-page \.bg-lime-100\{background:#365314!important\}/);

  const refunds = readFileSync('src/components/screens/legal/ReembolsosScreen.jsx', 'utf8');
  const moderation = readFileSync('src/components/screens/legal/ModeracionScreen.jsx', 'utf8');
  assert.match(refunds, /text-sm text-slate-300 mt-5/);
  assert.match(refunds, /window\.scrollTo\(0, 0\)/);
  assert.match(moderation, /window\.scrollTo\(0, 0\)/);
});

const relativeLuminance = (hex) => {
  const channels = [1, 3, 5].map((index) => Number.parseInt(hex.slice(index, index + 2), 16) / 255);
  const [r, g, b] = channels.map((value) => (
    value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  ));
  return (0.2126 * r) + (0.7152 * g) + (0.0722 * b);
};

const contrastRatio = (foreground, background) => {
  const [lighter, darker] = [relativeLuminance(foreground), relativeLuminance(background)]
    .sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
};

test('Golden legal foreground/background pairs meet WCAG AA contrast', () => {
  assert.ok(contrastRatio('#bef264', '#365314') >= 4.5);
  assert.ok(contrastRatio('#cbd5e1', '#020617') >= 4.5);
  assert.ok(contrastRatio('#cbd5e1', '#1e293b') >= 4.5);
});
