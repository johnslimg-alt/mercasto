import fs from 'fs';
import path from 'path';
import { translations } from './src/constants/mockData.js';

const esKeys = new Set(Object.keys(translations.es));
console.log(`Current translations dictionary has ${esKeys.size} keys.`);

// Standard JS/React/browser properties to ignore if matched by t.prop
const ignoreList = new Set([
  'Component', 'Fragment', 'StrictMode', 'Suspense', 'lazy',
  'useState', 'useEffect', 'useRef', 'useMemo', 'useCallback', 'useContext',
  'addEventListener', 'removeEventListener', 'preventDefault', 'stopPropagation',
  'target', 'value', 'checked', 'classList', 'documentElement', 'getElementById',
  'querySelector', 'createElement', 'length', 'substring', 'toLowerCase', 'trim',
  'split', 'includes', 'entries', 'keys', 'values', 'data', 'error', 'message',
  'status', 'msg', 'type', 'id', 'name', 'desc', 'description', 'title', 'price',
  'color', 'badge', 'created_at', 'role', 'email', 'user', 'path', 'src', 'msg',
  'body', 'head', 'meta', 'two_factor', 'access_token', 'challenge_token', 'clip_checkout_id'
]);

const missingKeys = new Set();
const foundKeys = new Set();

function scanDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git') {
        scanDirectory(fullPath);
      }
    } else if (file.endsWith('.js') || file.endsWith('.jsx')) {
      if (fullPath.includes('mockData.js') || fullPath.includes('scratch_check.js') || fullPath.includes('scratch_audit.js')) {
        continue;
      }
      analyzeFile(fullPath);
    }
  }
}

function analyzeFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  
  // Find all matches for t.some_key
  const regex = /\bt\.([a-zA-Z0-9_]+)\b/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const key = match[1];
    if (ignoreList.has(key)) continue;
    
    // Check if it's likely a translation key (starts with lowercase, doesn't start with capital like Component)
    if (/^[a-z_][a-z0-9_]*$/.test(key)) {
      foundKeys.add(key);
      if (!esKeys.has(key)) {
        missingKeys.add(key);
        console.log(`🔍 Found missing key reference: "t.${key}" in ${path.relative(process.cwd(), filePath)}`);
      }
    }
  }

  // Also search for t['some_key'] or t["some_key"]
  const regexBrackets = /\bt\s*\[\s*['"]([a-zA-Z0-9_]+)['"]\s*\]/g;
  while ((match = regexBrackets.exec(content)) !== null) {
    const key = match[1];
    if (ignoreList.has(key)) continue;
    if (/^[a-z_][a-z0-9_]*$/.test(key)) {
      foundKeys.add(key);
      if (!esKeys.has(key)) {
        missingKeys.add(key);
        console.log(`🔍 Found missing bracket key reference: "t['${key}']" in ${path.relative(process.cwd(), filePath)}`);
      }
    }
  }
}

console.log('Starting scan of "src/" directory...');
scanDirectory('./src');

console.log('\n--- SCAN COMPLETED ---');
console.log(`Total unique translation keys referenced in code: ${foundKeys.size}`);
console.log(`Total missing translation keys: ${missingKeys.size}`);

if (missingKeys.size > 0) {
  console.log('\n❌ MISSING KEYS LIST:');
  Array.from(missingKeys).sort().forEach(k => console.log(`- ${k}`));
} else {
  console.log('\n🎉 SUCCESS: No missing translation keys found in the source code!');
}
