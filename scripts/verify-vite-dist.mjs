#!/usr/bin/env node

import { access, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const distRoot = path.resolve(process.argv[2] ?? 'dist');
const textExtensions = new Set(['.html', '.js', '.css', '.json', '.webmanifest', '.svg']);
const assetExtensions = 'js|css|map|json|wasm|woff2?|ttf|otf|eot|svg|png|jpe?g|webp|avif|gif|ico';
const absoluteAssetPattern = new RegExp(`(?:/)?assets/[A-Za-z0-9_@./-]+\\.(?:${assetExtensions})(?:[?#][^\\s"'()\\x60]+)?`, 'g');
const relativeAssetPattern = new RegExp(`\\./[A-Za-z0-9_@./-]+\\.(?:${assetExtensions})(?:[?#][^\\s"'()\\x60]+)?`, 'g');

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
const assetFiles = allFiles.filter(file => file.startsWith(path.join(distRoot, 'assets') + path.sep));
const javascriptFiles = assetFiles.filter(file => file.endsWith('.js'));

if (javascriptFiles.length === 0) {
  console.error('The Vite bundle contains no JavaScript assets.');
  process.exit(1);
}

const missing = new Map();
let referencesChecked = 0;

for (const sourceFile of allFiles) {
  if (!textExtensions.has(path.extname(sourceFile).toLowerCase())) {
    continue;
  }

  const content = await readFile(sourceFile, 'utf8');
  const references = new Set([
    ...(content.match(absoluteAssetPattern) ?? []),
    ...(content.match(relativeAssetPattern) ?? []),
  ]);

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

console.log(`Vite bundle verified: ${assetFiles.length} asset files, ${referencesChecked} internal references checked.`);
