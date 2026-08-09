import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const invertedQuestion = String.fromCodePoint(0x00bf);
const invertedExclamation = String.fromCodePoint(0x00a1);
const roots = ['src/', 'tests/', 'public/', 'scripts/', 'backend/app/', 'backend/lang/', 'backend/resources/', 'backend/database/'];
const topLevel = new Set(['index.html', 'seed_tourism_ads.php']);
const textExtensions = new Set([
  '.js', '.jsx', '.mjs', '.cjs', '.ts', '.tsx', '.json', '.html', '.sh', '.css', '.md', '.txt', '.xml', '.yml', '.yaml',
]);
const tracked = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean);
const violations = [];

for (const file of tracked) {
  if (!topLevel.has(file) && !roots.some((root) => file.startsWith(root))) continue;
  const dot = file.lastIndexOf('.');
  const ext = dot >= 0 ? file.slice(dot) : '';
  if (!textExtensions.has(ext)) continue;
  const text = fs.readFileSync(file, 'utf8');
  if (!text.includes(invertedQuestion) && !text.includes(invertedExclamation)) continue;
  text.split(/\r?\n/).forEach((line, index) => {
    if (line.includes(invertedQuestion) || line.includes(invertedExclamation)) {
      violations.push(`${file}:${index + 1}:${line.trim()}`);
    }
  });
}

if (violations.length) {
  console.error('Mexico Spanish punctuation gate failed: use only closing ? and ! in product copy.');
  for (const violation of violations.slice(0, 100)) console.error(violation);
  if (violations.length > 100) console.error(`... ${violations.length - 100} more`);
  process.exit(1);
}

const dynamicAiOutputs = [
  'backend/app/Services/AI/SupportChatbotService.php',
  'backend/app/Services/AI/DescriptionGeneratorService.php',
];
for (const file of dynamicAiOutputs) {
  const text = fs.readFileSync(file, 'utf8');
  if (!text.includes('\\x{00BF}') || !text.includes('\\x{00A1}')) {
    console.error('Mexico Spanish punctuation gate failed: ' + file + ' must normalize dynamic AI output.');
    process.exit(1);
  }
}

console.log('Mexico Spanish punctuation gate passed: static product copy and dynamic AI output use local closing-only punctuation.');
