import { readFileSync } from 'node:fs';

const checks = [];

function read(path) {
  return readFileSync(path, 'utf8');
}

function assertContains(path, needle, reason) {
  const content = read(path);
  if (!content.includes(needle)) {
    throw new Error(`${path} must contain ${JSON.stringify(needle)}: ${reason}`);
  }
  checks.push(`${path}: ${reason}`);
}

function assertNotContains(path, needle, reason) {
  const content = read(path);
  if (content.includes(needle)) {
    throw new Error(`${path} must not contain ${JSON.stringify(needle)}: ${reason}`);
  }
  checks.push(`${path}: ${reason}`);
}

assertContains(
  'index.html',
  "typeof window.Notification === 'undefined'",
  'inline Notification fallback protects iOS browsers before the app bundle loads'
);

assertContains(
  'src/main.jsx',
  "./lib/notificationPolyfill.js",
  'pre-React Notification fallback is loaded before App.jsx'
);

assertContains(
  'src/lib/notificationPolyfill.js',
  'fallbackNotification.requestPermission',
  'Notification fallback exposes requestPermission safely'
);

assertNotContains(
  '.github/workflows/emergency-container-frontend-patch.yml',
  "paths:\n      - 'public/deploy-trigger.txt'",
  'container patch workflow must stay manual-only during stabilization'
);

assertContains(
  '.github/workflows/emergency-ssh-frontend-deploy.yml',
  'workflow_dispatch',
  'SSH frontend deploy remains manually triggerable'
);

assertNotContains(
  '.github/workflows/emergency-ssh-frontend-deploy.yml',
  'push:',
  'SSH frontend deploy must not auto-run on every push during stabilization'
);

console.log('Recovery guard checks passed:');
for (const check of checks) {
  console.log(`- ${check}`);
}
