import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// The web robots policy widens `Disallow: /api/` with `Allow: /api/ads` + `Allow: /api/categories`
// so that ad-detail pages can hydrate while rendering (a blocked XHR leaves Googlebot looking at an
// error card). robots.txt has no notion of HTTP methods, so that widening is prefix-wide: this
// contract proves, against the real route table, that (a) every write route under those prefixes is
// still disallowed by a longer rule and (b) the read paths hydration actually uses resolve to Allow.

const ROBOTS_FILES = ['public/robots.txt', 'backend/public/robots.txt'];
const ROUTES = readFileSync('backend/routes/api.php', 'utf8');

/** Paths the ad-detail page fetches while rendering (verified with a headless render probe). */
const HYDRATION_READS = [
  '/api/ads',
  '/api/ads/6376',
  '/api/ads/6376/similar',
  '/api/ads/6376/price-history',
  '/api/categories',
];

/**
 * Write routes that share their exact path with a hydration read, so no path-based rule can
 * separate them. Both are authenticated (sanctum) and CSRF-protected, which is the real control.
 */
const SAME_PATH_AS_READ = new Set([
  '/api/ads/*', // POST /api/ads/{id} (update) vs GET /api/ads/{id} (detail)
  '/api/categories', // POST /api/categories (admin) vs GET /api/categories (index)
]);

/** Parse non-GET routes under the widened prefixes out of the Laravel route table. */
function writeRoutePaths() {
  const paths = new Set();
  const declaration = /Route::(post|put|patch|delete)\(\s*'(\/?(?:ads|categories)[^']*)'/g;
  for (const match of ROUTES.matchAll(declaration)) {
    const uri = match[2].replace(/^\//, '').replace(/\{[^}]+\}/g, '*');
    paths.add(`/api/${uri}`);
  }
  return [...paths].sort();
}

/** Longest-match-wins evaluation, mirroring Google's robots.txt matching for Allow/Disallow. */
function rulesFor(robots, userAgent) {
  const groups = [];
  let current = null;
  for (const rawLine of robots.split('\n')) {
    const line = rawLine.replace(/#.*$/, '').trim();
    if (!line) continue;
    const [rawField, ...rest] = line.split(':');
    const field = rawField.trim().toLowerCase();
    const value = rest.join(':').trim();
    if (field === 'user-agent') {
      if (!current || current.rules.length > 0) {
        current = { agents: [], rules: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      continue;
    }
    if ((field === 'allow' || field === 'disallow') && current) {
      current.rules.push({ allow: field === 'allow', path: value });
    }
  }

  const wanted = userAgent.toLowerCase();
  const group = groups.find((candidate) => candidate.agents.includes(wanted))
    ?? groups.find((candidate) => candidate.agents.includes('*'));
  assert(group, `no robots.txt group for ${userAgent}`);
  return group.rules;
}

function decision(rules, path) {
  let best = null;
  for (const rule of rules) {
    if (rule.path === '') continue;
    const anchored = rule.path.endsWith('$');
    const pattern = anchored ? rule.path.slice(0, -1) : rule.path;
    const regex = new RegExp(`^${pattern.split('*').map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*')}${anchored ? '$' : ''}`);
    if (!regex.test(path)) continue;
    const specificity = pattern.length;
    if (best === null || specificity > best.specificity || (specificity === best.specificity && rule.allow)) {
      best = { allow: rule.allow, specificity };
    }
  }
  return best ? (best.allow ? 'allow' : 'disallow') : 'allow';
}

const writePaths = writeRoutePaths();
assert(writePaths.length >= 10, `expected the ads/categories write routes to be found, got ${writePaths.length}`);

for (const file of ROBOTS_FILES) {
  const robots = readFileSync(file, 'utf8');
  const rules = rulesFor(robots, 'Googlebot');

  // (a) every write route is disallowed
  for (const path of writePaths) {
    if (SAME_PATH_AS_READ.has(path)) continue;
    assert.equal(decision(rules, path), 'disallow',
      `${file}: write route ${path} must stay disallowed after the /api/ads widening`);
  }

  // (b) the documented same-path collisions are exactly the ones we know about
  for (const path of writePaths) {
    if (!SAME_PATH_AS_READ.has(path)) continue;
    assert.equal(decision(rules, path), 'allow',
      `${file}: ${path} shares its path with a hydration read; it must be documented, not silently changed`);
  }

  // (c) hydration reads still resolve to Allow, otherwise the render fix is undone
  for (const path of HYDRATION_READS) {
    assert.equal(decision(rules, path), 'allow',
      `${file}: hydration read ${path} must stay allowed for rendering crawlers`);
  }

  // (d) everything else under /api/ stays blocked
  for (const path of ['/api/ads-archive', '/api/admin/ads', '/api/users/1', '/api/payments', '/api/adsomething']) {
    assert.equal(decision(rules, path), 'disallow', `${file}: ${path} must stay disallowed`);
  }
}

console.log(`robots write-path contract OK: ${writePaths.length} write routes checked, ${HYDRATION_READS.length} hydration reads allowed, ${SAME_PATH_AS_READ.size} documented same-path collisions.`);
