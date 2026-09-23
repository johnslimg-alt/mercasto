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
  '--mc-dark-line': '#64748B',
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

const spacing = fs.readFileSync(new URL('../src/design-spacing.css', import.meta.url), 'utf8');
const mainJsx = fs.readFileSync(new URL('../src/main.jsx', import.meta.url), 'utf8');
const goldenBridge = fs.readFileSync(new URL('../src/components/home/mercasto-golden-home.mobile-fix.css', import.meta.url), 'utf8');

const spacingExpected = {
  '--mc-space-1': '4px',
  '--mc-space-2': '8px',
  '--mc-space-3': '12px',
  '--mc-space-4': '16px',
  '--mc-space-5': '24px',
  '--mc-space-6': '32px',
  '--mc-space-stack': '8px',
  '--mc-space-gutter': '12px',
  '--mc-space-page': '16px',
  '--mc-space-page-lg': '40px',
  '--mc-space-section': '24px',
  '--mc-space-touch': '48px',
};

function valueIn(source, token) {
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = source.match(new RegExp(`${escaped}\\s*:\\s*([^;]+);`));
  return match?.[1]?.trim();
}

test('spacing scale matches the contract and is loaded', () => {
  for (const [token, value] of Object.entries(spacingExpected)) {
    assert.equal(valueIn(spacing, token), value, token);
    assert.ok(doc.includes(token), token);
  }
  assert.match(mainJsx, /import '\.\/design-spacing\.css'/);
  assert.doesNotMatch(spacing, /#0f8f7d|#0b6f61/i);
});

test('golden home aliases the site brand instead of a private palette', () => {
  assert.match(goldenBridge, /--mcg-green:\s*var\(--mc-brand/);
  assert.match(goldenBridge, /--mcg-green-dark:\s*var\(--mc-brand-dark/);
  assert.match(goldenBridge, /--mcg-ink:\s*var\(--mc-ink/);
  assert.match(goldenBridge, /html\.dark \.mcg-root[\s\S]*--mcg-ink:\s*var\(--mc-dark-ink/);
  assert.match(goldenBridge, /background:\s*var\(--mc-dark-background/);
  assert.doesNotMatch(goldenBridge, /#0f8f7d|#0b6f61/i);
});
