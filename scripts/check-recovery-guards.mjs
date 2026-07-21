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

function assertOrder(path, firstNeedle, secondNeedle, reason) {
  const content = read(path);
  const first = content.indexOf(firstNeedle);
  const second = content.indexOf(secondNeedle);
  if (first < 0 || second < 0 || first >= second) {
    throw new Error(`${path} must place ${JSON.stringify(firstNeedle)} before ${JSON.stringify(secondNeedle)}: ${reason}`);
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

assertContains(
  'src/main.jsx',
  'installStaleChunkRecovery();',
  'stale Vite chunks are recovered before React renders the paid landing route'
);

assertContains(
  'src/utils/staleChunkRecovery.js',
  "url.searchParams.delete('__mercasto_refresh')",
  'stale recovery loop guard compares the original route without its cache-buster'
);

assertContains(
  'src/utils/staleChunkRecovery.js',
  'window.location.replace(recoveryUrl())',
  'stale recovery reloads the same route instead of sending traffic to the homepage'
);

assertContains(
  'public/stale-module.js',
  "routeUrl.searchParams.delete('__mercasto_refresh')",
  'nginx stale-module fallback uses the same normalized route guard'
);

assertNotContains(
  'public/stale-module.js',
  "location.replace('/')",
  'stale asset recovery must never discard the paid landing page'
);

assertContains(
  'src/main.jsx',
  'installCampaignAttribution();',
  'campaign attribution is captured before analytics bridges initialize'
);

assertOrder(
  'src/main.jsx',
  'installCampaignAttribution();',
  'installMetaCapiBridge();',
  'Meta receives the campaign-enriched data layer'
);

assertOrder(
  'src/main.jsx',
  'installCampaignAttribution();',
  'initTikTokPixel();',
  'TikTok receives the campaign-enriched data layer'
);

assertContains(
  'src/utils/protectedRouteReturn.js',
  "trackSellerFunnel('seller_post_returned_after_auth'",
  'seller registration return is measured as a funnel step'
);

assertContains(
  'src/utils/protectedRouteReturn.js',
  "trackSellerFunnel('seller_post_intent_abandoned'",
  'seller intent drop-off is measurable for marketing optimization'
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
