#!/usr/bin/env node

import { access, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const distRoot = path.resolve(process.argv[2] ?? 'dist');
const textExtensions = new Set(['.html', '.js', '.css', '.json', '.webmanifest', '.svg']);
const assetExtensions = 'js|css|map|json|wasm|woff2?|ttf|otf|eot|svg|png|jpe?g|webp|avif|gif|ico';
const referenceSuffix = '(?:[?#][^\\s"\'()\\x60]+)?';
const absoluteAsset = `((?:/)?assets/[A-Za-z0-9_@./-]+\\.(?:${assetExtensions}))${referenceSuffix}`;
const relativeAsset = `(\\./[A-Za-z0-9_@./-]+\\.(?:${assetExtensions}))${referenceSuffix}`;

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await walk(fullPath));
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }

  return files;
}

function collectMatches(content, pattern, target) {
  for (const match of content.matchAll(pattern)) {
    if (match[1]) {
      target.add(match[1]);
    }
  }
}

function collectReferences(content, extension) {
  const references = new Set();

  collectMatches(content, new RegExp(`["'\\x60]${absoluteAsset}["'\\x60]`, 'g'), references);

  if (extension === '.html' || extension === '.svg') {
    collectMatches(content, new RegExp(`(?:src|href)\\s*=\\s*["']${absoluteAsset}["']`, 'gi'), references);
  }

  if (extension === '.css' || extension === '.html' || extension === '.svg') {
    collectMatches(content, new RegExp(`url\\(\\s*["']?${absoluteAsset}["']?\\s*\\)`, 'gi'), references);
    collectMatches(content, new RegExp(`url\\(\\s*["']?${relativeAsset}["']?\\s*\\)`, 'gi'), references);
  }

  if (extension === '.js') {
    collectMatches(
      content,
      new RegExp(`(?:\\bfrom\\s*|\\bimport\\s*\\(\\s*|\\bimport\\s*)["'\\x60]${relativeAsset}["'\\x60]`, 'g'),
      references,
    );
    collectMatches(
      content,
      new RegExp(`\\bnew\\s+URL\\(\\s*["'\\x60]${relativeAsset}["'\\x60]\\s*,\\s*import\\.meta\\.url`, 'g'),
      references,
    );
  }

  return references;
}

function stripQueryAndHash(reference) {
  return reference.split(/[?#]/, 1)[0];
}

function resolveReference(sourceFile, reference) {
  const cleanReference = stripQueryAndHash(reference);

  if (cleanReference.startsWith('/assets/')) {
    return path.join(distRoot, cleanReference.slice(1));
  }

  if (cleanReference.startsWith('assets/')) {
    return path.join(distRoot, cleanReference);
  }

  if (cleanReference.startsWith('./')) {
    return path.resolve(path.dirname(sourceFile), cleanReference);
  }

  return null;
}

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

if (!await exists(path.join(distRoot, 'index.html'))) {
  console.error(`Missing Vite entrypoint: ${path.join(distRoot, 'index.html')}`);
  process.exit(1);
}

const allFiles = await walk(distRoot);
const assetRoot = path.join(distRoot, 'assets') + path.sep;
const assetFiles = allFiles.filter(file => file.startsWith(assetRoot));
const javascriptFiles = assetFiles.filter(file => file.endsWith('.js'));

if (javascriptFiles.length === 0) {
  console.error('The Vite bundle contains no JavaScript assets.');
  process.exit(1);
}

const missing = new Map();
let referencesChecked = 0;

for (const sourceFile of allFiles) {
  const extension = path.extname(sourceFile).toLowerCase();
  if (!textExtensions.has(extension)) {
    continue;
  }

  const content = await readFile(sourceFile, 'utf8');
  const references = collectReferences(content, extension);

  for (const reference of references) {
    const target = resolveReference(sourceFile, reference);
    if (!target) {
      continue;
    }

    const normalizedTarget = path.resolve(target);
    if (normalizedTarget !== distRoot && !normalizedTarget.startsWith(distRoot + path.sep)) {
      continue;
    }

    referencesChecked += 1;
    if (!await exists(normalizedTarget)) {
      const relativeSource = path.relative(distRoot, sourceFile);
      const list = missing.get(relativeSource) ?? [];
      list.push(reference);
      missing.set(relativeSource, list);
    }
  }
}

if (missing.size > 0) {
  console.error('The Vite bundle contains references to missing files:');
  for (const [source, references] of missing) {
    for (const reference of references) {
      console.error(`- ${source} -> ${reference}`);
    }
  }
  process.exit(1);
}

if (referencesChecked === 0) {
  console.error('The Vite bundle verifier found no internal asset references.');
  process.exit(1);
}

console.log(`Vite bundle verified: ${assetFiles.length} asset files, ${referencesChecked} internal references checked.`);
