import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const sourceRoot = path.join(root, 'src');
const sourceFiles = [];

function visit(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.name.startsWith('._')) continue;
    const filePath = path.join(directory, entry.name);
    if (entry.isDirectory()) visit(filePath);
    else if (/\.(jsx|js)$/.test(entry.name)) sourceFiles.push(filePath);
  }
}

function lineAt(source, index) {
  return source.slice(0, index).split('\n').length;
}

function readOpeningTag(source, start) {
  let index = start + 1;
  if (!/[A-Za-z]/.test(source[index] || '')) return null;
  let tag = '';
  while (/[A-Za-z0-9_.:-]/.test(source[index] || '')) tag += source[index++];

  let quote = null;
  let escaped = false;
  let braceDepth = 0;
  for (; index < source.length; index += 1) {
    const char = source[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'" || char === '`') {
      quote = char;
      continue;
    }
    if (char === '{') braceDepth += 1;
    else if (char === '}') braceDepth = Math.max(0, braceDepth - 1);
    else if (char === '>' && braceDepth === 0) {
      return { tag, text: source.slice(start, index + 1), end: index };
    }
  }
  return null;
}

function isInsideForm(source, index) {
  const before = source.slice(0, index);
  return before.lastIndexOf('<form') > before.lastIndexOf('</form');
}

function hasAttribute(tagText, name) {
  return new RegExp(`(?:\\s|^)${name}(?:\\s*=|\\s|/?>)`).test(tagText.slice(1));
}

function staticAttribute(tagText, name) {
  const match = tagText.match(new RegExp(`(?:\\s|^)${name}\\s*=\\s*(["'])(.*?)\\1`, 's'));
  return match?.[2] ?? null;
}

visit(sourceRoot);

let interactiveCount = 0;
let nonSemanticClickTargets = 0;
const violations = [];
for (const filePath of sourceFiles) {
  const source = fs.readFileSync(filePath, 'utf8');
  for (let index = 0; index < source.length; index += 1) {
    if (source[index] !== '<') continue;
    const opening = readOpeningTag(source, index);
    if (!opening) continue;
    index = opening.end;

    const { tag, text } = opening;
    // Ignore raw HTML snippets embedded in strings (Leaflet popups etc.); this gate
    // is for React JSX controls. Lowercase inline onclick is a reliable discriminator.
    if (/\sonclick\s*=/.test(text)) continue;
    const hasOnClick = hasAttribute(text, 'onClick');
    const role = staticAttribute(text, 'role');
    const interactive = tag === 'button' || tag === 'a' || hasOnClick || role === 'button';
    if (!interactive) continue;

    interactiveCount += 1;
    const label = `${path.relative(root, filePath)}:${lineAt(source, index)}`;
    const hasSpread = /\{\s*\.\.\./.test(text);

    if (tag === 'button' && !hasAttribute(text, 'disabled') && !hasSpread && !hasOnClick) {
      const type = staticAttribute(text, 'type');
      if (!['submit', 'reset'].includes(type) && !isInsideForm(source, index)) {
        violations.push(`${label}: enabled button has no onClick and is not a form submit/reset control`);
      }
    }

    if (tag === 'a') {
      const href = staticAttribute(text, 'href');
      if (href !== null && (href === '' || href === '#' || href.toLowerCase().startsWith('javascript:'))) {
        violations.push(`${label}: anchor uses an empty, #, or javascript: href`);
      }
    }

    if (tag !== 'button' && tag !== 'a' && hasOnClick) nonSemanticClickTargets += 1;
    if (tag !== 'button' && role === 'button' && !hasOnClick && !hasSpread) {
      violations.push(`${label}: role=button has no click handler`);
    }
  }
}

console.log(`frontend interaction inventory: files=${sourceFiles.length}, interactive=${interactiveCount}, nonsemantic_click_targets=${nonSemanticClickTargets}`);

if (sourceFiles.length < 100 || interactiveCount < 500) {
  console.error(`frontend interaction inventory unexpectedly small: files=${sourceFiles.length}, interactive=${interactiveCount}`);
  process.exit(1);
}

if (violations.length) {
  console.error('frontend interaction contract violations:');
  violations.forEach(violation => console.error(`- ${violation}`));
  process.exit(1);
}

console.log('frontend interaction contract OK');
