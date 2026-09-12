#!/usr/bin/env node
// Asserts that a Playwright spec DECLARES the given test titles.
//
// `grep -qF "<title>" spec.js` is satisfied by a title mentioned in a comment,
// in a skipped block, or in a string that is never passed to `test()`. This
// helper parses the spec for real `test(...)` / `test.describe(...)`
// declarations, so a title that only appears as prose does not count.

import { readFileSync } from 'node:fs';

const [specPath, ...expectedTitles] = process.argv.slice(2);

if (!specPath || expectedTitles.length === 0) {
  console.error('usage: playwright-spec-titles.mjs <spec-file> <expected-title> [...]');
  process.exit(2);
}

const source = readFileSync(specPath, 'utf8');
const declaration = /\btest(?:\.(?:describe|only|skip|fixme|fail))?\(\s*(['"`])((?:\\.|(?!\1)[^\\])*)\1/g;

const declared = new Set();
for (const match of source.matchAll(declaration)) {
  declared.add(match[2]);
}

const missing = expectedTitles.filter((title) => !declared.has(title));
if (missing.length > 0) {
  for (const title of missing) {
    console.error(`FAIL: ${specPath} declares no test titled "${title}"`);
    console.error('      a comment or unused string mentioning the title does not run it');
  }
  console.error(`      declared titles: ${declared.size === 0 ? '(none)' : [...declared].map((t) => JSON.stringify(t)).join(', ')}`);
  process.exit(1);
}

console.log(`${specPath}: ${expectedTitles.length} declared test title(s) verified`);
