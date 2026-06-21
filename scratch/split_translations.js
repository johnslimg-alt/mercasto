const fs = require('fs');
const path = require('path');

const mockDataPath = path.join(__dirname, '../src/constants/mockData.js');
const genTranslationsPath = path.join(__dirname, '../src/constants/generatedTranslations.js');
const outputDir = path.join(__dirname, '../src/constants/translations');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Read files
const mockDataContent = fs.readFileSync(mockDataPath, 'utf8');
const genTranslationsContent = fs.readFileSync(genTranslationsPath, 'utf8');

// Use dynamic execution to import the objects safely by mocking modules
const mockModule = { exports: {} };
const originalRequire = require;

// Simple parser to extract translations from mockData.js
// Since mockData.js is ES module, we can convert it to CommonJS or just extract the translations export.
let translationsObj = {};
const transStartIndex = mockDataContent.indexOf('export const translations = {');
if (transStartIndex !== -1) {
  // Find matching closing brace
  let openBraces = 0;
  let index = transStartIndex + 'export const translations ='.length;
  let braceIndex = -1;
  while (index < mockDataContent.length) {
    if (mockDataContent[index] === '{') {
      openBraces++;
      if (braceIndex === -1) braceIndex = index;
    } else if (mockDataContent[index] === '}') {
      openBraces--;
      if (openBraces === 0) {
        const transString = mockDataContent.slice(braceIndex, index + 1);
        // Safely parse or evaluate using Function
        translationsObj = new Function(`return ${transString}`)();
        break;
      }
    }
    index++;
  }
}

// Simple parser to extract generatedTranslations
let genTranslationsObj = {};
const genStartIndex = genTranslationsContent.indexOf('export const generatedTranslations = {');
if (genStartIndex !== -1) {
  let openBraces = 0;
  let index = genStartIndex + 'export const generatedTranslations ='.length;
  let braceIndex = -1;
  while (index < genTranslationsContent.length) {
    if (genTranslationsContent[index] === '{') {
      openBraces++;
      if (braceIndex === -1) braceIndex = index;
    } else if (genTranslationsContent[index] === '}') {
      openBraces--;
      if (openBraces === 0) {
        const genString = genTranslationsContent.slice(braceIndex, index + 1);
        genTranslationsObj = new Function(`return ${genString}`)();
        break;
      }
    }
    index++;
  }
}

const languages = ['es', 'en', 'pt', 'fr', 'zh', 'ko', 'de', 'it', 'ar', 'he', 'yi', 'ru', 'ja'];

languages.forEach(lang => {
  const manual = translationsObj[lang] || {};
  const generated = genTranslationsObj[lang] || {};
  
  // English fallback: if not ES, we merge EN manual translations for complete UI coverage
  const enManual = translationsObj['en'] || {};
  
  let merged = {};
  if (lang === 'es') {
    merged = { ...manual };
  } else if (lang === 'en') {
    merged = { ...manual };
  } else {
    // Other languages inherit English manual translations as a baseline, then apply their specific translations
    merged = {
      ...enManual,
      ...manual,
      ...generated
    };
  }

  const filePath = path.join(outputDir, `${lang}.js`);
  const fileContent = `export default ${JSON.stringify(merged, null, 2)};\n`;
  fs.writeFileSync(filePath, fileContent, 'utf8');
  console.log(`Wrote ${lang}.js (${Object.keys(merged).length} keys)`);
});
