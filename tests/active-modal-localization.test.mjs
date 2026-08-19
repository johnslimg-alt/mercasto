import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { SUPPORTED_LANGUAGES } from '../src/utils/translations.js';

const report = fs.readFileSync('src/components/modals/ReportModal.jsx', 'utf8');
const userReport = fs.readFileSync('src/components/modals/UserReportModal.jsx', 'utf8');
const qr = fs.readFileSync('src/components/modals/QRModal.jsx', 'utf8');

async function translationsFor(lang) {
  return (await import(`../src/constants/translations/${lang}.js`)).default;
}

test('active modal keys cover exactly the 11 active languages', async () => {
  assert.equal(SUPPORTED_LANGUAGES.length, 11);
  assert.equal(SUPPORTED_LANGUAGES.includes('he'), false);
  assert.equal(SUPPORTED_LANGUAGES.includes('yi'), false);
  for (const lang of SUPPORTED_LANGUAGES) {
    const t = await translationsFor(lang);
    for (const key of ['close_btn', 'qr_contact_title', 'qr_contact_desc', 'report_ad', 'report_seller']) {
      assert.ok(String(t[key] || '').trim(), `${lang}.${key}`);
    }
  }
});

test('active report and QR modals use guaranteed localization keys without fallback chains', () => {
  for (const source of [report, userReport, qr]) {
    assert.equal(source.includes('t.close_btn || t.close'), false);
    assert.match(source, /aria-label=\{t\.close_btn\}/);
  }
  assert.equal(qr.includes('t.qr_code_alt || t.qr_code'), false);
  assert.match(qr, /alt=\{t\.qr_contact_title\}/);
  assert.match(qr, />\{t\.close_btn\}<\/button>/);
});

test('report reason and QR generation contracts remain unchanged', () => {
  assert.match(report, /LISTING_REPORT_REASONS\.map/);
  assert.match(userReport, /USER_REPORT_REASONS\.map/);
  assert.match(report, /onSubmit=\{handleReportAd\}/);
  assert.match(userReport, /onSubmit=\{handleUserReportSubmit\}/);
  assert.match(qr, /api\.qrserver\.com\/v1\/create-qr-code\/\?size=250x250&data=/);
  assert.match(qr, /encodeURIComponent\(qrModalData\)/);
});
