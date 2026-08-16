import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const css = fs.readFileSync(new URL('../src/index.css', import.meta.url), 'utf8');
const doc = fs.readFileSync(new URL('../docs/design/token-contract.md', import.meta.url), 'utf8');
const packageJson = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

const expected = {
  '--mc-brand': '#84CC16',
  '--mc-brand-dark': '#65A30D',
  '--mc-ink': '#111827',
  '--mc-navy': '#0F172A',
  '--mc-muted': '#64748B',
  '--mc-paper': '#F8FAFC',
  '--mc-surface': '#FFFFFF',
  '--mc-raised-surface': '#F1F5F9',
  '--mc-line': '#E2E8F0',
  '--mc-dark-background': '#0F172A',
  '--mc-dark-surface': '#111827',
  '--mc-dark-raised-surface': '#1F2937',
  '--mc-dark-line': '#334155',
  '--mc-dark-ink': '#F8FAFC',
  '--mc-dark-muted': '#CBD5E1',
  '--mc-radius-sm': '8px',
  '--mc-radius-md': '12px',
  '--mc-radius-lg': '14px',
  '--mc-radius-xl': '18px',
  '--mc-touch-target': '48px',
};

function valueOf(token) {
  const match = css.match(new RegExp(`${token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*:\\s*([^;]+);`));
  return match?.[1]?.trim();
}

test('web design tokens match the shared Mercasto contract', () => {
  for (const [token, value] of Object.entries(expected)) {
    assert.equal(valueOf(token), value, token);
  }
  assert.match(css, /--mc-design-contract:\s*'2026-08-04'/);
  assert.match(css, /@import ['"]@fontsource-variable\/inter['"]/);
  assert.doesNotMatch(css, /fonts\.(?:googleapis|gstatic)\.com/);
  assert.equal(packageJson.dependencies?.['@fontsource-variable/inter'], '^5.3.0');
});

test('Tailwind compatibility aliases use the product brand', () => {
  assert.equal(valueOf('--color-lime-primary'), '#84CC16');
  assert.equal(valueOf('--color-lime-dark'), '#65A30D');
  assert.doesNotMatch(css, /#0f8f7d|#0b6f61/i);
});

test('shared controls consume the token contract', () => {
  assert.match(css, /\.btn-md[^}]+min-height:\s*var\(--mc-touch-target\)/s);
  assert.match(css, /\.btn-lg[^}]+min-height:\s*var\(--mc-touch-target\)/s);
  assert.match(css, /\.market-card[^}]+border-radius:\s*var\(--mc-radius-lg\)/s);
  assert.match(css, /\.mc-primary-action[^}]+background:\s*var\(--mc-brand\)/s);
  assert.match(css, /\.mc-control[^}]+border-radius:\s*var\(--mc-radius-md\)/s);
});

test('design documentation records the same contract version', () => {
  assert.match(doc, /Contract version: `2026-08-04`/);
  assert.match(doc, /Touch target \| `48px`/);
});
