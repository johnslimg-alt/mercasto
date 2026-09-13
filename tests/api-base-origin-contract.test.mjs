import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const app = fs.readFileSync('src/App.jsx', 'utf8');

const walkSources = (dir, visit) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkSources(full, visit);
    else if (/\.(?:jsx?|tsx?)$/.test(entry.name)) visit(full, fs.readFileSync(full, 'utf8'));
  }
};

test('every client API call resolves against the host that served the app', () => {
  // The client used to fall back to the absolute `https://mercasto.com/api`. On the canonical
  // www host that is a cross-origin request, and the API sends no CORS headers, so *every*
  // fetch failed: no categories, no ads, and a listing deep link rendered the load-error state.
  // A relative base is same-origin on every host nginx serves the SPA from.
  const offenders = [];
  walkSources('src', (file, source) => {
    if (source.includes('mercasto.com/api')) offenders.push(`${file}: cross-origin API fallback`);
  });

  assert.deepEqual(offenders, []);
});

test('the app shell and the websocket auth endpoint use the relative API base', () => {
  assert.match(app, /getEnvVar\('VITE_API_BASE_URL', '\/api'\)/);

  const echo = fs.readFileSync('src/echo.js', 'utf8');
  assert.match(echo, /VITE_API_BASE_URL \|\| '\/api'/);
  assert.match(echo, /authEndpoint: `\$\{apiBase\}\/broadcasting\/auth`/);
});

test('listing pages only claim a head the client can actually back with data', () => {
  // The SEO shell marks the listing pages it rendered; hydration must leave that head alone
  // until it holds the listing payload, and must never invent an indexability decision for a
  // listing URL it could not load.
  assert.match(app, /const serverOwnsListingHead = routeSeoOwner === 'listing';/);
  assert.match(app, /const clientMayRewriteHead = hasListingPayload \|\| !serverOwnsListingHead;/);
  assert.match(app, /const listingDecisionUnresolved = isListingPath && !hasListingPayload;/);
  assert.match(app, /if \(!listingDecisionUnresolved\) \{\n\s+canonicalEl\.setAttribute\('href', canonicalHref\);/);
  assert.match(app, /if \(routeSeoOwner !== 'not-found' && !listingDecisionUnresolved\) \{/);

  // The schema the SEO shell rendered for a listing may only be replaced when the client has
  // schema data of its own; everywhere else the client still owns the slot. Cleanup may only
  // remove what the client itself wrote.
  assert.match(app, /const existingScript = document\.getElementById\('schema-ld-json'\);/);
  assert.match(app, /else if \(!serverOwnsListingHead && existingScript\) \{/);
  assert.match(app, /script\.dataset\.mercastoOwner = 'client';/);
  assert.match(app, /if \(cleanupScript\?\.dataset\?\.mercastoOwner === 'client'\) \{/);
});
