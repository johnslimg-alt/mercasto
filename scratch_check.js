import { translations } from './src/constants/mockData.js';

const locales = Object.keys(translations);
console.log('Locales found:', locales);

const keysByLocale = {};
locales.forEach(locale => {
  keysByLocale[locale] = Object.keys(translations[locale]);
  console.log(`Locale "${locale}" has ${keysByLocale[locale].length} keys.`);
});

// Find the union of all keys
const allKeys = new Set();
locales.forEach(locale => {
  keysByLocale[locale].forEach(key => allKeys.add(key));
});

console.log(`Total unique keys across all locales: ${allKeys.size}`);

// Check for missing keys in each locale
let hasError = false;
locales.forEach(locale => {
  const missing = [];
  allKeys.forEach(key => {
    if (!Object.prototype.hasOwnProperty.call(translations[locale], key)) {
      missing.push(key);
    }
  });
  if (missing.length > 0) {
    console.error(`❌ Locale "${locale}" is missing keys:`, missing);
    hasError = true;
  } else {
    console.log(`✅ Locale "${locale}" has no missing keys.`);
  }
});

// Check for empty or undefined values
locales.forEach(locale => {
  const badKeys = [];
  Object.keys(translations[locale]).forEach(key => {
    const val = translations[locale][key];
    if (val === undefined || val === null || val === '') {
      badKeys.push(key);
    }
  });
  if (badKeys.length > 0) {
    console.error(`❌ Locale "${locale}" has empty/undefined values for:`, badKeys);
    hasError = true;
  }
});

if (!hasError) {
  console.log('🎉 SUCCESS: All locales are perfectly symmetrical and complete!');
} else {
  process.exit(1);
}
