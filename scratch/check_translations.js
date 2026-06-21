import { translations } from '../src/constants/mockData.js';

const languages = Object.keys(translations);
console.log("Languages:", languages);

const allKeys = new Set();
for (const trans of Object.values(translations)) {
  for (const key of Object.keys(trans)) {
    allKeys.add(key);
  }
}

console.log(`Total unique keys across all languages: ${allKeys.size}`);

// Find keys missing in each language compared to the full set
for (const lang of languages) {
  const trans = translations[lang];
  const missing = [];
  for (const key of allKeys) {
    if (!(key in trans)) {
      missing.push(key);
    }
  }
  if (missing.length > 0) {
    console.log(`${lang} is missing ${missing.length} keys:`, missing);
  } else {
    console.log(`${lang} has all keys.`);
  }
}

// Let's inspect if there are any suspicious values (e.g. empty strings, or string values that look like unparsed JS)
console.log("\nChecking for suspicious values:");
for (const lang of languages) {
  const trans = translations[lang];
  let issues = 0;
  for (const [k, v] of Object.entries(trans)) {
    if (typeof v !== 'string') {
      console.log(`  [${lang}] key '${k}' has non-string value:`, typeof v, v);
      issues++;
    } else if (v.includes("', ") || v.includes("',") || v.includes("\\',") || v.includes("\\', ")) {
      // Looks like a syntax merge issue where multiple keys got merged into one string value!
      console.log(`  [${lang}] key '${k}' contains suspicious quotes/comma formatting (possible merged keys):`, JSON.stringify(v.substring(0, 100)));
      issues++;
    }
  }
  if (issues === 0) {
    console.log(`  [${lang}] has no suspicious values.`);
  }
}
