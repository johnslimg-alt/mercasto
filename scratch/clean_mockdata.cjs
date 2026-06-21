const fs = require('fs');
const path = require('path');

const mockDataPath = path.join(__dirname, '../src/constants/mockData.js');
let content = fs.readFileSync(mockDataPath, 'utf8');

const startTag = 'export const translations = {';
const startIndex = content.indexOf(startTag);

if (startIndex !== -1) {
  let openBraces = 0;
  let index = startIndex + 'export const translations ='.length;
  let endIndex = -1;
  while (index < content.length) {
    if (content[index] === '{') {
      openBraces++;
    } else if (content[index] === '}') {
      openBraces--;
      if (openBraces === 0) {
        endIndex = index;
        break;
      }
    }
    index++;
  }
  
  if (endIndex !== -1) {
    // Remove translations export and clean up extra newlines
    let nextIndex = endIndex + 1;
    while (nextIndex < content.length && (content[nextIndex] === '\n' || content[nextIndex] === '\r' || content[nextIndex] === ';')) {
      nextIndex++;
    }
    content = content.slice(0, startIndex) + content.slice(nextIndex);
    fs.writeFileSync(mockDataPath, content, 'utf8');
    console.log('Successfully removed translations from mockData.js');
  } else {
    console.error('Could not find closing brace for translations');
  }
} else {
  console.error('Could not find translations export in mockData.js');
}
