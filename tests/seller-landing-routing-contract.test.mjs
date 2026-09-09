import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const main = fs.readFileSync('src/main.jsx', 'utf8');
const app = fs.readFileSync('src/App.jsx', 'utf8');
const policy = fs.readFileSync('scripts/client-spa-route-policy.mjs', 'utf8');

test('canonical seller acquisition path remains a real landing page before React mounts', () => {
  assert.match(main, /window\.location\.pathname === '\/publicar-gratis'/);
  assert.match(main, /`\/vendedores\$\{window\.location\.search\}\$\{window\.location\.hash\}`/);
  assert.doesNotMatch(main, /\['\/vendedores', '\/publicar-gratis'\]/);
  assert.doesNotMatch(main, /`\/post\$\{window\.location\.search\}\$\{window\.location\.hash\}`/);
});

test('seller landing, legacy alias, and protected post route keep distinct responsibilities', () => {
  assert.match(app, /<Route path="\/vendedores"[^\n]*<SellerLandingScreen lang=\{lang\}/);
  assert.match(app, /<Route path="\/publicar-gratis" element=\{<Navigate to="\/vendedores" replace \/>\}/);
  assert.match(app, /<Route path="\/post" element=\{<RequireAuth/);
  assert.doesNotMatch(policy, /'\/vendedores': \{ expectedPath:/);
  assert.match(policy, /'\/publicar-gratis': \{ expectedPath: '\/vendedores', preMount: true \}/);
});
