import fs from 'fs';
import path from 'path';

const mockDataPath = path.resolve('./src/constants/mockData.js');
let mockDataContent = fs.readFileSync(mockDataPath, 'utf8');

// Load cleaned translations
const cleanedTranslations = JSON.parse(
  fs.readFileSync(path.resolve('./scratch/cleaned_translations.json'), 'utf8')
);

// We want to generate the replacement string for the translations object
let translationsStr = 'export const translations = {\n';

for (const [lang, trans] of Object.entries(cleanedTranslations)) {
  translationsStr += `  ${lang}: {\n`;
  // Sort keys alphabetically for neatness
  const sortedKeys = Object.keys(trans).sort();
  for (const k of sortedKeys) {
    const rawVal = trans[k];
    // Escape single quotes and backslashes for JS string literal
    const escapedVal = String(rawVal)
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/\n/g, '\\n');
    translationsStr += `    ${k}: '${escapedVal}',\n`;
  }
  translationsStr += '  },\n';
}
translationsStr += '};';

// Find where translations starts in mockDataContent
const translationsIndex = mockDataContent.indexOf('export const translations = {');
if (translationsIndex === -1) {
  throw new Error("Could not find translations block in mockData.js");
}

// Replace from translationsIndex to the end of the file (assuming translations is the last thing, or we can replace exactly)
// Let's check if there is anything after translations in mockData.js
const contentBefore = mockDataContent.substring(0, translationsIndex);

const newContent = contentBefore + translationsStr + '\n';
fs.writeFileSync(mockDataPath, newContent, 'utf8');
console.log("Successfully wrote cleaned translations to mockData.js!");
