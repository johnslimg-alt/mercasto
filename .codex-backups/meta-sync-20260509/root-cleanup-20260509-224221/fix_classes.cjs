const fs = require('fs');
let content = fs.readFileSync('src/App.jsx', 'utf8');

// Function to unique space-separated words
const uniqueWords = (str) => {
  return [...new Set(str.split(/\s+/))].filter(Boolean).join(' ');
};

content = content.replace(/className="([^"]+)"/g, (match, classes) => {
  return `className="${uniqueWords(classes)}"`;
});

content = content.replace(/className=\{`([^`]+)`\}/g, (match, classes) => {
  return `className={\`${uniqueWords(classes)}\`}`;
});

fs.writeFileSync('src/App.jsx', content);
console.log("Duplicates removed.");