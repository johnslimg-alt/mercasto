import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const app = fs.readFileSync('src/App.jsx', 'utf8');
const uiContext = fs.readFileSync('src/contexts/UIContext.jsx', 'utf8');

function jsxFiles(root) {
  return fs.readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) return jsxFiles(full);
    return entry.isFile() && full.endsWith('.jsx') ? [full] : [];
  });
}

function classFragments(source) {
  return [...source.matchAll(/className\s*=\s*\{?(["'`])([\s\S]*?)\1\}?/g)].map(match => match[2]);
}

function tokenSet(fragment) {
  return new Set(fragment.split(/\s+/).filter(Boolean));
}

function limeContrastViolations(file, source) {
  const unsafe = [];
  for (const fragment of classFragments(source)) {
    const tokens = tokenSet(fragment);
    const hasBaseWhite = tokens.has('text-white');
    if (!hasBaseWhite) continue;

    if (tokens.has('bg-[#84CC16]')) {
      unsafe.push(`${file}: base lime uses text-white: ${fragment}`);
    }

    for (const token of tokens) {
      const match = token.match(/^(.+:)bg-\[#84CC16\]$/);
      if (!match) continue;
      const variant = match[1];
      if (!tokens.has(`${variant}text-slate-950`)) {
        unsafe.push(`${file}: ${variant}lime lacks ${variant}text-slate-950: ${fragment}`);
      }
    }
  }
  return unsafe;
}

test('UIProvider is the only owner of the persisted theme state', () => {
  assert.match(uiContext, /const \[isDarkMode, setIsDarkMode\] = useState/);
  assert.doesNotMatch(app, /const \[isDarkMode, setIsDarkMode\] = useState/);
  assert.doesNotMatch(app, /localStorage\.setItem\(['"]theme['"]/);
});

test('brand-lime surfaces never use white foreground text in the same Tailwind state', () => {
  const unsafe = [];
  for (const file of jsxFiles('src')) {
    unsafe.push(...limeContrastViolations(file, fs.readFileSync(file, 'utf8')));
  }
  assert.deepEqual(unsafe, [], `Unsafe lime/white combinations:\n${unsafe.join('\n')}`);
});

test('light lime gradients do not use white foreground text', () => {
  const unsafe = [];
  for (const file of jsxFiles('src')) {
    const lines = fs.readFileSync(file, 'utf8').split('\n');
    lines.forEach((line, index) => {
      const hasLightLimeGradient = line.includes('from-lime-400') || line.includes('from-lime-500');
      if (hasLightLimeGradient && line.includes('text-white')) unsafe.push(`${file}:${index + 1}: ${line.trim()}`);
    });
  }
  assert.deepEqual(unsafe, [], `Unsafe lime-gradient/white combinations:\n${unsafe.join('\n')}`);
});

test('reported seller and SEO dark-theme controls have explicit dark variants', () => {
  const ads = fs.readFileSync('src/components/screens/MyAdsScreen.jsx', 'utf8');
  const seo = fs.readFileSync('src/components/admin/AdminSeoMeasurement.jsx', 'utf8');
  assert.match(ads, /dark:bg-amber-950\/40 dark:hover:bg-amber-900\/50 dark:text-amber-200/);
  assert.match(seo, /dark:bg-amber-950\/30/);
  assert.match(seo, /dark:text-amber-300/);
});