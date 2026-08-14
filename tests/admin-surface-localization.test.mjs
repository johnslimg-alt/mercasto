import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { SUPPORTED_LANGUAGES } from '../src/utils/translations.js';
import { ADMIN_SURFACE_COPY } from '../src/utils/adminSurfaceCopy.js';

const ADMIN_KEYS = ['admin_by', 'admin_promotion_revenue_30d', 'admin_promotion_products', 'admin_global_ctr', 'admin_business_verifications_pending', 'admin_business_verifications_desc', 'admin_plan', 'admin_email_phone_pending', 'admin_anonymous', 'admin_discard_report', 'admin_email_ip', 'deleteUserConfirm', 'deleteUserError', 'changeRoleConfirm', 'changeRoleError', 'rejectReasonPrompt', 'deleteReportConfirm', 'deleteUserReportConfirm', 'couponCreated', 'couponCreateError', 'couponDeleteConfirm', 'categorySaved', 'categorySaveError', 'roleIndividual', 'roleBusiness', 'roleAdmin'];

async function translationsFor(lang) {
  return (await import(`../src/constants/translations/${lang}.js`)).default;
}

test('admin surface copy covers exactly the 11 active languages', async () => {
  assert.equal(SUPPORTED_LANGUAGES.length, 11);
  assert.equal(SUPPORTED_LANGUAGES.includes('he'), false);
  assert.equal(SUPPORTED_LANGUAGES.includes('yi'), false);
  for (const lang of SUPPORTED_LANGUAGES) {
    const t = await translationsFor(lang);
    const copy = ADMIN_SURFACE_COPY[lang] || {};
    assert.equal(Object.keys(copy).length, ADMIN_KEYS.length, `${lang}.admin copy key count`);
    for (const key of ADMIN_KEYS) {
      assert.ok(String(copy[key] || '').trim(), `${lang}.${key}`);
      assert.equal(t[key], undefined, `${lang}.${key} must stay out of global dictionary`);
    }
    assert.match(copy.changeRoleConfirm, /\{role\}/, `${lang}.role placeholder`);
  }
});

test('non-Spanish admin actions are localized instead of copying Spanish', async () => {
  for (const lang of SUPPORTED_LANGUAGES.filter(language => language !== 'es')) {
    for (const key of ['deleteUserConfirm', 'couponCreated']) assert.notEqual(ADMIN_SURFACE_COPY[lang][key], ADMIN_SURFACE_COPY.es[key], `${lang}.${key}`);
    assert.notEqual(ADMIN_SURFACE_COPY[lang].admin_business_verifications_desc, ADMIN_SURFACE_COPY.es.admin_business_verifications_desc, `${lang}.admin_business_verifications_desc`);
  }
});

test('Mexico Spanish admin copy follows closing-only punctuation policy', async () => {
  const serialized = JSON.stringify(ADMIN_SURFACE_COPY.es);
  assert.equal(serialized.includes(String.fromCharCode(0xbf)), false);
  assert.equal(serialized.includes(String.fromCharCode(0xa1)), false);
});

test('App admin handlers consume localized action copy', () => {
  const source = fs.readFileSync('src/App.jsx', 'utf8');
  for (const marker of [
    'adminCopy.deleteUserConfirm',
    "adminCopy.changeRoleConfirm.replace('{role}', roleLabel)",
    'adminCopy.rejectReasonPrompt',
    'adminCopy.deleteReportConfirm',
    'adminCopy.deleteUserReportConfirm',
    'adminCopy.couponCreated',
    'localizeServerMessage(lang, errData.message, adminCopy.couponCreateError)',
    'adminCopy.couponDeleteConfirm',
    'adminCopy.categorySaved',
    'adminCopy.categorySaveError',
  ]) assert.ok(source.includes(marker), marker);

  for (const former of [
    'Estás seguro de que deseas eliminar este usuario?', 'Cambiar rol a ${newRole}?',
    'Indica el motivo del rechazo:', 'Eliminar este reporte?',
    'Eliminar este reporte de usuario?', 'Cupón creado exitosamente',
    'Error al crear cupón', 'Eliminar cupón?', 'Categoría guardada exitosamente',
    'Error al guardar la categoría',
  ]) assert.equal(source.includes(former), false, former);
});

test('admin screen uses active locale for labels, money, numbers and dates', () => {
  const source = fs.readFileSync('src/components/screens/AdminScreen.jsx', 'utf8');
  assert.match(source, /formatMXN\(ad\.price, lang/);
  assert.match(source, /formatMXN\(payment\.amount, lang\)/);
  assert.match(source, /formatNumber\(adminPaymentsTotal, lang\)/);
  assert.match(source, /formatDateTime\(payment\.created_at, lang/);
  assert.match(source, /formatDate\(u\.active_plan\?\.expires_at \|\| u\.plan_expires_at, lang\)/);
  for (const marker of [
    'adminCopy.admin_by', 'adminCopy.admin_promotion_revenue_30d', 'adminCopy.admin_global_ctr',
    'adminCopy.admin_business_verifications_pending', 'adminCopy.admin_email_ip', 'adminCopy.admin_plan',
    'adminCopy.admin_email_phone_pending', 'adminCopy.roleIndividual', 'adminCopy.roleBusiness',
    'adminCopy.roleAdmin', 't.free_plan', 't.ads_per_month', 't.expires_word',
  ]) assert.ok(source.includes(marker), marker);
  assert.equal(source.includes("toLocaleString('es-MX')"), false);
  assert.equal(source.includes("toLocaleDateString('es-MX')"), false);
});

test('admin mutation methods and payloads stay unchanged', () => {
  const source = fs.readFileSync('src/App.jsx', 'utf8');
  assert.match(source, /fetch\(`\$\{API_URL\}\/users\/\$\{id\}`, \{ method: 'DELETE'/);
  assert.match(source, /fetch\(`\$\{API_URL\}\/users\/\$\{id\}\/role`,[\s\S]*?method: 'POST',[\s\S]*?JSON\.stringify\(\{ role: newRole \}\)/);
  assert.match(source, /fetch\(`\$\{API_URL\}\/admin\/moderation\/ads\/\$\{id\}\/decision`,[\s\S]*?method: 'POST',[\s\S]*?JSON\.stringify\(\{ decision, reason: reason\?\.trim\(\) \|\| '' \}\)/);
  assert.match(source, /fetch\(`\$\{API_URL\}\/admin\/reports\/\$\{id\}`, \{ method: 'DELETE'/);
  assert.match(source, /fetch\(`\$\{API_URL\}\/admin\/user-reports\/\$\{id\}`, \{ method: 'DELETE'/);
  assert.match(source, /fetch\(`\$\{API_URL\}\/admin\/coupons`,[\s\S]*?method: 'POST',[\s\S]*?JSON\.stringify\(couponForm\)/);
  assert.match(source, /fetch\(`\$\{API_URL\}\/admin\/coupons\/\$\{id\}`, \{ method: 'DELETE'/);
  assert.match(source, /const method = editingCatId \? 'PUT' : 'POST'/);
  assert.match(source, /body: JSON\.stringify\(adminCatForm\)/);
});
