import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const localesDir = path.join(root, 'src/locales');
const files = fs.readdirSync(localesDir).filter((file) => file.endsWith('.json')).sort();

const flatten = (value, prefix = '', result = {}) => {
  for (const [key, item] of Object.entries(value)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (item && typeof item === 'object' && !Array.isArray(item)) flatten(item, fullKey, result);
    else result[fullKey] = item;
  }
  return result;
};

const sourceFiles = [];
const visit = (directory) => {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) visit(fullPath);
    else if (/\.(jsx|js)$/.test(entry.name)) sourceFiles.push(fullPath);
  }
};

const base = flatten(JSON.parse(fs.readFileSync(path.join(localesDir, 'en.json'), 'utf8')));
let failed = false;

for (const file of files) {
  const locale = flatten(JSON.parse(fs.readFileSync(path.join(localesDir, file), 'utf8')));
  const missing = Object.keys(base).filter((key) => !(key in locale));
  const empty = Object.entries(locale).filter(([, value]) => typeof value !== 'string' || !value.trim());
  if (missing.length || empty.length) {
    failed = true;
    console.error(`${file}: missing=${missing.length}, empty=${empty.length}`);
  }
}

visit(path.join(root, 'src'));
const rawKeyPattern = />\s*([a-z][a-z0-9]+(?:_[a-z0-9]+)+)\s*</g;
for (const file of sourceFiles) {
  const source = fs.readFileSync(file, 'utf8');
  for (const match of source.matchAll(rawKeyPattern)) {
    failed = true;
    console.error(`${path.relative(root, file)}: raw translation key "${match[1]}"`);
  }
}

if (failed) process.exit(1);
console.log(`i18n audit passed: ${files.length} locales, ${Object.keys(base).length} structured keys.`);
