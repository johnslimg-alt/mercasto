import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
const localesDir = path.join(root, 'src/locales');
const expectedLanguages = ['es', 'en', 'ru', 'pt', 'fr', 'de', 'it', 'zh', 'ko', 'ja', 'ar'];
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

const localeFileLanguages = files.map((file) => path.basename(file, '.json')).sort();
const expectedSorted = [...expectedLanguages].sort();
if (JSON.stringify(localeFileLanguages) !== JSON.stringify(expectedSorted)) {
  failed = true;
  console.error(`locale JSON set mismatch: expected=${expectedSorted.join(',')} actual=${localeFileLanguages.join(',')}`);
}

for (const file of files) {
  const locale = flatten(JSON.parse(fs.readFileSync(path.join(localesDir, file), 'utf8')));
  const missing = Object.keys(base).filter((key) => !(key in locale));
  const empty = Object.entries(locale).filter(([, value]) => typeof value !== 'string' || !value.trim());
  if (missing.length || empty.length) {
    failed = true;
    console.error(`${file}: missing=${missing.length}, empty=${empty.length}`);
  }
}

const runtimeTranslationsDir = path.join(root, 'src/constants/translations');
const runtimeFiles = fs.readdirSync(runtimeTranslationsDir)
  .filter((file) => file.endsWith('.js'))
  .map((file) => path.basename(file, '.js'))
  .sort();

if (JSON.stringify(runtimeFiles) !== JSON.stringify(expectedSorted)) {
  failed = true;
  console.error(`runtime translation file set mismatch: expected=${expectedSorted.join(',')} actual=${runtimeFiles.join(',')}`);
}

const runtimeResources = {};
for (const language of expectedLanguages) {
  const filePath = path.join(runtimeTranslationsDir, `${language}.js`);
  try {
    runtimeResources[language] = (await import(pathToFileURL(filePath).href)).default || {};
  } catch (error) {
    failed = true;
    console.error(`runtime translations ${language}: unable to import: ${error.message}`);
    runtimeResources[language] = {};
  }
}

const runtimeBase = runtimeResources.en || {};
const runtimeBaseKeys = Object.keys(runtimeBase);
for (const language of expectedLanguages) {
  const locale = runtimeResources[language] || {};
  const keys = Object.keys(locale);
  const missing = runtimeBaseKeys.filter((key) => !(key in locale));
  const extra = keys.filter((key) => !(key in runtimeBase));
  const empty = keys.filter((key) => typeof locale[key] !== 'string' || !locale[key].trim());
  if (missing.length || extra.length || empty.length) {
    failed = true;
    console.error(`runtime translations ${language}: missing=${missing.length}, extra=${extra.length}, empty=${empty.length}`);
  }
}

const moderationSourcePath = path.join(root, 'src/components/admin/adminModerationI18n.js');
if (fs.existsSync(moderationSourcePath)) {
  const source = fs.readFileSync(moderationSourcePath, 'utf8');
  const marker = 'const resources = ';
  const start = source.indexOf(marker);
  const end = source.indexOf('\n\nObject.entries(resources)');

  if (start === -1 || end === -1) {
    failed = true;
    console.error('adminModerationI18n.js: unable to locate translation resources');
  } else {
    const expression = source.slice(start + marker.length, end).trim().replace(/;$/, '');
    let moderationResources;
    try {
      moderationResources = Function(`"use strict"; return (${expression});`)();
    } catch (error) {
      failed = true;
      console.error(`adminModerationI18n.js: invalid resources object: ${error.message}`);
    }

    if (moderationResources) {
      const moderationBase = flatten(moderationResources.en || {});
      const baseKeys = Object.keys(moderationBase);

      for (const language of expectedLanguages) {
        const locale = flatten(moderationResources[language] || {});
        const missing = baseKeys.filter((key) => !(key in locale));
        const extra = Object.keys(locale).filter((key) => !(key in moderationBase));
        const empty = Object.entries(locale).filter(([, value]) => typeof value !== 'string' || !value.trim());
        if (missing.length || extra.length || empty.length) {
          failed = true;
          console.error(`admin moderation ${language}: missing=${missing.length}, extra=${extra.length}, empty=${empty.length}`);
        }
      }

      const unsupported = Object.keys(moderationResources).filter((language) => !expectedLanguages.includes(language));
      if (unsupported.length) {
        failed = true;
        console.error(`admin moderation: unexpected languages=${unsupported.join(',')}`);
      }
    }
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
console.log(`i18n audit passed: ${files.length} locale JSON files (${Object.keys(base).length} structured keys), ${expectedLanguages.length} runtime translation modules (${runtimeBaseKeys.length} keys each), and complete intelligent moderation translations.`);
