import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const packageLock = JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8'));

const expected = {
  reactRouterDom: '7.18.2',
  braceExpansion: '5.0.9',
};

const allowedAdvisories = new Set([
  'GHSA-4x5r-pxfx-6jf8', // Babel 7 build-time sourceMappingURL file read.
  'GHSA-qwww-vcr4-c8h2', // React Router RSC action CSRF; Mercasto is a browser-only SPA.
]);
const allowedVulnerablePackages = new Set([
  '@babel/core',
  'react-router',
  'react-router-dom',
]);
const forbiddenRscPatterns = [
  /@react-router\/(?:dev|node)/,
  /react-router\/dom\/server/,
  /react-server-dom/,
  /\bcreateRequestHandler\b/,
  /\bcreateStaticHandler\b/,
  /\bServerRouter\b/,
  /\bunstable_(?:RSC|createCallServer|getRSCStream)/,
];

function fail(message) {
  console.error(`npm audit policy failed: ${message}`);
  process.exitCode = 1;
}

if (packageJson.dependencies?.['react-router-dom'] !== expected.reactRouterDom) {
  fail(`react-router-dom must stay pinned to ${expected.reactRouterDom}`);
}
if (packageJson.overrides?.['brace-expansion'] !== expected.braceExpansion) {
  fail(`brace-expansion override must stay pinned to ${expected.braceExpansion}`);
}

const lockedRouter = packageLock.packages?.['node_modules/react-router-dom']?.version;
const lockedBrace = packageLock.packages?.['node_modules/brace-expansion']?.version;
if (lockedRouter !== expected.reactRouterDom) {
  fail(`package-lock resolves react-router-dom ${lockedRouter ?? 'missing'}`);
}
if (lockedBrace !== expected.braceExpansion) {
  fail(`package-lock resolves brace-expansion ${lockedBrace ?? 'missing'}`);
}

let audit;
try {
  const stdout = execFileSync('npm', ['audit', '--json'], {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  audit = JSON.parse(stdout);
} catch (error) {
  const stdout = error?.stdout?.toString() ?? '';
  if (!stdout.trim()) throw error;
  audit = JSON.parse(stdout);
}

const vulnerabilities = audit.vulnerabilities ?? {};
for (const packageName of Object.keys(vulnerabilities)) {
  if (!allowedVulnerablePackages.has(packageName)) {
    fail(`unexpected vulnerable package: ${packageName}`);
  }
}

const seenAdvisories = new Set();
for (const vulnerability of Object.values(vulnerabilities)) {
  for (const via of vulnerability.via ?? []) {
    if (!via || typeof via !== 'object' || !via.url) continue;
    const advisory = via.url.split('/').pop();
    seenAdvisories.add(advisory);
    if (!allowedAdvisories.has(advisory)) {
      fail(`unexpected advisory: ${advisory} (${via.title})`);
    }
  }
}

for (const advisory of allowedAdvisories) {
  if (!seenAdvisories.has(advisory)) {
    console.log(`npm audit policy: ${advisory} is no longer reported; remove its exception.`);
  }
}

if ((audit.metadata?.vulnerabilities?.critical ?? 0) > 0) {
  fail('critical vulnerabilities are never allowed');
}

function walk(directory) {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...walk(fullPath));
    else if (/\.(?:js|jsx|mjs|ts|tsx)$/.test(entry.name)) files.push(fullPath);
  }
  return files;
}

for (const file of walk(path.join(root, 'src'))) {
  const source = fs.readFileSync(file, 'utf8');
  for (const pattern of forbiddenRscPatterns) {
    if (pattern.test(source)) {
      fail(`RSC/server router API detected in ${path.relative(root, file)}: ${pattern}`);
    }
  }
}

if (!process.exitCode) {
  console.log('npm audit policy OK: patched transitive pins enforced; only documented non-applicable advisories remain.');
}
