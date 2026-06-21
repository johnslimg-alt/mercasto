import { translations } from '../src/constants/mockData.js';
import fs from 'fs';
import path from 'path';

const cleanTranslations = {};

for (const lang of Object.keys(translations)) {
  cleanTranslations[lang] = {};
}

function cleanValue(val) {
  if (typeof val !== 'string') return val;
  // Unescape backslash escapes
  return val.replace(/\\'/g, "'").replace(/\\\\/g, "\\");
}

for (const [lang, trans] of Object.entries(translations)) {
  for (const [k, v] of Object.entries(trans)) {
    if (typeof v !== 'string') {
      cleanTranslations[lang][k] = v;
      continue;
    }
    
    // Check if it's a merged string
    // Merged strings look like: "Value', key2: 'Value2', key3: 'Value3"
    if (v.includes("', ") || v.includes("',") || v.includes("\\',")) {
      // It's a merged string! Let's parse it.
      // We normalize delimiters first
      const normalized = v.replace(/\\'/g, "'").replace(/\\"/g, '"');
      // Split by ', [key_name]: '
      // We can use a regex to split at ', key: '
      const parts = [];
      const regex = /',\s*(\w+):\s*'/g;
      let lastIndex = 0;
      let match;
      
      // The first key is k
      let currentKey = k;
      
      while ((match = regex.exec(normalized)) !== null) {
        const val = normalized.substring(lastIndex, match.index);
        parts.push({ key: currentKey, val: val });
        currentKey = match[1];
        lastIndex = regex.lastIndex;
      }
      // Add the last part
      parts.push({ key: currentKey, val: normalized.substring(lastIndex) });
      
      for (const part of parts) {
        // Clean up any remaining outer quotes or backslashes
        let cleanVal = part.val;
        if (cleanVal.endsWith("'")) cleanVal = cleanVal.slice(0, -1);
        if (cleanVal.startsWith("'")) cleanVal = cleanVal.slice(1);
        cleanTranslations[lang][part.key] = cleanVal;
      }
    } else {
      cleanTranslations[lang][k] = cleanValue(v);
    }
  }
}

// Check key counts now
console.log("Cleaned translations counts:");
for (const [lang, trans] of Object.entries(cleanTranslations)) {
  console.log(`${lang}: ${Object.keys(trans).length} keys`);
}

// Compare keys with ru to see if we recovered everything
const ruKeys = Object.keys(translations.ru);
console.log(`\nRU has ${ruKeys.length} keys.`);

for (const lang of Object.keys(cleanTranslations)) {
  const missing = [];
  const extra = [];
  const langKeys = Object.keys(cleanTranslations[lang]);
  for (const k of ruKeys) {
    if (!langKeys.includes(k)) missing.push(k);
  }
  for (const k of langKeys) {
    if (!ruKeys.includes(k)) extra.push(k);
  }
  console.log(`${lang}: missing=${missing.length}, extra=${extra.length}`);
  if (missing.length > 0) {
    console.log(`  Missing keys in ${lang}:`, missing);
  }
}

// Save the cleaned translations to a file so we can inspect it
fs.writeFileSync(
  path.resolve('./scratch/cleaned_translations.json'),
  JSON.stringify(cleanTranslations, null, 2),
  'utf8'
);
console.log("Saved to scratch/cleaned_translations.json");
