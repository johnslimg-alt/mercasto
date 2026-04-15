const fs = require('fs');

let content = fs.readFileSync('src/App.jsx', 'utf8');

const replacements = [
  // Backgrounds
  [/\bbg-white(?!\/|-)/g, 'bg-white dark:bg-slate-900'],
  [/\bbg-white\/([0-9]+)\b/g, 'bg-white/$1 dark:bg-slate-900/$1'],
  [/\bbg-\[\#f5f5f5\]\b/g, 'bg-[#f5f5f5] dark:bg-slate-950'],
  [/\bbg-gray-50(?!\/|-)/g, 'bg-gray-50 dark:bg-slate-800'],
  [/\bbg-gray-50\/([0-9]+)\b/g, 'bg-gray-50/$1 dark:bg-slate-800/$1'],
  [/\bbg-gray-100(?!\/|-)/g, 'bg-gray-100 dark:bg-slate-800\/50'],
  [/\bbg-gray-200(?!\/|-)/g, 'bg-gray-200 dark:bg-slate-700'],
  [/\bbg-gray-900(?!\/|-)/g, 'bg-gray-900 dark:bg-slate-100'],
  [/\bbg-gray-900\/([0-9]+)\b/g, 'bg-gray-900/$1 dark:bg-slate-100/$1'],

  // Hover Backgrounds
  [/\bhover:bg-gray-50\b/g, 'hover:bg-gray-50 dark:hover:bg-slate-700'],
  [/\bhover:bg-gray-100\b/g, 'hover:bg-gray-100 dark:hover:bg-slate-700'],
  [/\bhover:bg-gray-200\b/g, 'hover:bg-gray-200 dark:hover:bg-slate-600'],

  // Text colors
  [/\btext-gray-900\b/g, 'text-gray-900 dark:text-slate-100'],
  [/\btext-gray-800\b/g, 'text-gray-800 dark:text-slate-200'],
  [/\btext-gray-700\b/g, 'text-gray-700 dark:text-slate-300'],
  [/\btext-gray-600\b/g, 'text-gray-600 dark:text-slate-400'],
  [/\btext-gray-500\b/g, 'text-gray-500 dark:text-slate-400'],
  [/\btext-gray-400\b/g, 'text-gray-400 dark:text-slate-500'],
  [/\btext-gray-300\b/g, 'text-gray-300 dark:text-slate-600'],

  // Hover Text colors
  [/\bhover:text-gray-900\b/g, 'hover:text-gray-900 dark:hover:text-slate-100'],
  [/\bhover:text-gray-800\b/g, 'hover:text-gray-800 dark:hover:text-slate-200'],

  // Border colors
  [/\bborder-gray-300\b/g, 'border-gray-300 dark:border-slate-600'],
  [/\bborder-gray-200\b/g, 'border-gray-200 dark:border-slate-700'],
  [/\bborder-gray-100\b/g, 'border-gray-100 dark:border-slate-800'],

  // Ring colors (for focus state)
  [/\bring-\[\#12B981\]\/10\b/g, 'ring-[#12B981]/10 dark:ring-[#12B981]/20'],

  // Placeholders
  [/\bplaceholder-gray-400\b/g, 'placeholder-gray-400 dark:placeholder-slate-500'],
];

replacements.forEach(([regex, replacement]) => {
  content = content.replace(regex, replacement);
});

fs.writeFileSync('src/App.jsx', content);
console.log('Replacements applied');
