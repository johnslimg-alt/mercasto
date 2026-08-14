import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const app = fs.readFileSync('src/App.jsx', 'utf8');

test('runtime JSON-LD follows the active language', () => {
  assert.match(app, /"inLanguage": lang === 'es' \? 'es-MX' : lang/);
  assert.match(app, /"name": t\.home \|\| 'Inicio'/);
  assert.equal(app.includes('"inLanguage": "es-MX"'), false);
});

test('company JSON-LD avoids Spanish-only public fallbacks', () => {
  assert.match(app, /"description": viewedCompany\.bio \|\| t\.ai_brand_description \|\| ''/);
  assert.match(app, /"addressCountry": "MX"/);
  assert.match(app, /"url": canonicalHref/);
  assert.equal(app.includes('Tienda oficial de ${viewedCompany.name} en Mercasto'), false);
  assert.equal(app.includes('Perfil de ${viewedCompany.name} en Mercasto'), false);
  assert.equal(app.includes('viewedCompany.city || "México"'), false);
});
