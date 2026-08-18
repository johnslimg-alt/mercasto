import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { LISTING_REPORT_REASONS, USER_REPORT_REASONS } from '../src/constants/reportReasons.js';

const listingModal = await readFile(new URL('../src/components/modals/ReportModal.jsx', import.meta.url), 'utf8');
const userModal = await readFile(new URL('../src/components/modals/UserReportModal.jsx', import.meta.url), 'utf8');

assert.deepEqual(
  LISTING_REPORT_REASONS.map(({ value }) => value),
  ['Fraude o estafa', 'Contenido inapropiado', 'Artículo falso o falsificado', 'Ya se vendió', 'Otro'],
  'listing report API reason values must remain stable',
);

assert.deepEqual(
  USER_REPORT_REASONS.map(({ value }) => value),
  ['Comportamiento abusivo', 'Sospecha de fraude', 'Vende productos ilegales', 'Suplantación de identidad', 'Otro'],
  'user report API reason values must remain stable',
);

for (const reason of [...LISTING_REPORT_REASONS, ...USER_REPORT_REASONS]) {
  assert.match(reason.labelKey, /^(report_reason_|sold_status$)/, `unexpected localization key: ${reason.labelKey}`);
}

for (const source of [listingModal, userModal]) {
  assert.ok(source.includes('t[labelKey]'), 'report reason display labels must resolve through localization keys');
  assert.ok(!source.match(/<option\s+value="(?:Fraude|Contenido|Artículo|Ya se vendió|Otro|Comportamiento|Sospecha|Vende productos|Suplantación)/), 'canonical Spanish API values must not be duplicated as public JSX labels');
}

console.log('report reason localization contract OK');
