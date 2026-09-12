#!/usr/bin/env node
/**
 * Gate integrity check.
 *
 * The repository enforces most of its safety invariants with scripts that grep
 * source files for string literals ("source-text gates"). That is legitimate for
 * wiring/config presence but catastrophic when it is used to stand in for
 * behaviour. Five incidents motivated this check:
 *
 *   1. `check-recovery-guards.mjs` asserted
 *      `orderBy('ads.is_catalog_filler', 'asc')` inside
 *      `Api/AdController.php`, whose `index()` method is NOT routed
 *      (`routes/api.php` maps GET /ads to AdIndexController@index). The gate
 *      therefore guarded dead code while the live catalog ranked editorial
 *      placeholders above real inventory.
 *   2. A gate pinned `window.addEventListener('pointerdown', activateVendorAnalytics`
 *      -- the exact consent-bypass that leaked analytics/marketing vendors
 *      before the visitor answered the cookie banner. The gate defended the P0.
 *   3. `catalog-index-hygiene-gate.sh` codified the broken sitemap predicate,
 *      keeping CI green while `sitemap-ads.xml` shipped zero URLs.
 *   4. A guard failed when an engineer legitimately extracted code into a new
 *      module, because it asserted text that moved rather than the invariant.
 *   5. `tests/ad-card-extraction-contract.test.mjs` pinned
 *      `Boolean(ad.is_catalog_filler)`, which treats the string 'false' as truthy.
 *
 * This script makes two of those failure modes mechanically impossible:
 *
 *   CHECK A -- dead-code assertions (incidents 1 and 4).
 *     A gate may not assert source text inside a controller method that nothing
 *     in production can reach. Such an assertion can never protect behaviour.
 *
 *   CHECK B -- unrun gates (the mechanism behind incidents 1 and 3).
 *     If a workflow runs a gate under a `paths:` filter (or an in-shell changed-
 *     file regex), that filter must fire for every repository file the gate
 *     reads. A guard that does not run when its subject changes is not a guard.
 *
 * Usage:
 *   node scripts/gate-integrity-check.mjs            # check the repository
 *   node scripts/gate-integrity-check.mjs --json     # machine-readable report
 *
 * Exits non-zero on any unwaived violation. Waivers live in
 * `scripts/gate-integrity-waivers.json` and MUST name an owner, a reason and the
 * concrete gate+target they bind to; a waiver that no longer matches a real
 * violation is itself an error, so waivers expire by themselves.
 *
 * Known limits, deliberately not closed (see docs/architecture/gate-assertion-policy.md):
 *   - Only `assertContains`/`assertOrder`/`assertNotContains`-style JS calls and
 *     `grep -q*F`-family shell lines are parsed. A gate that builds an assertion
 *     dynamically (`xargs grep`, `grep -f patterns`, string concatenation, a
 *     custom wrapper beyond the shapes below) is not audited.
 *   - CHECK A reasons about controllers only. A literal pinned to unreachable
 *     code in a service, job, command, model or orphaned component is not
 *     detected.
 *   - Assertion *literals* held in a variable are resolved for simple
 *     `const`/`VAR=` assignments only.
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// GATE_INTEGRITY_ROOT lets the contract test run this checker against a scratch
// fixture tree, which is how the negative controls prove the checker fails when
// an invariant is violated. Normal runs inspect the real repository.
const ROOT = process.env.GATE_INTEGRITY_ROOT
  ? resolve(process.env.GATE_INTEGRITY_ROOT)
  : join(dirname(fileURLToPath(import.meta.url)), '..');
const JSON_OUTPUT = process.argv.includes('--json');

const violations = [];
const notes = [];

const GUARD = 'scripts/check-recovery-guards.mjs';
const WAIVER_FILE = 'scripts/gate-integrity-waivers.json';
const KNOWN_CHECKS = new Set(['dead-code-assertion', 'gate-not-triggered']);

function readRepoFile(path) {
  return readFileSync(join(ROOT, path), 'utf8');
}

/* ------------------------------------------------------------------ *
 * Gate discovery and assertion extraction
 * ------------------------------------------------------------------ */

/**
 * Reads the path assignments a shell gate uses to point at source files, so
 * `grep -qF -- "literal" "$VAR"` resolves to a real path.
 *
 * Handles both quote styles (`VAR="p"`, `VAR='p'`) and rooted values
 * (`ADS="$ROOT/backend/x.php"`). A prefix whose value came from a command
 * substitution -- `ROOT_DIR="$(cd ... && pwd)"` -- denotes the repository root,
 * so it is stripped and the remainder is treated as repo-relative.
 */
function shellVariables(source) {
  const raw = new Map();
  for (const line of source.split('\n')) {
    const match = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line);
    if (!match) continue;
    let value = match[2];
    const quoted = /^(['"])([\s\S]*)\1$/.exec(value);
    if (quoted) value = quoted[2];
    raw.set(match[1], value);
  }

  const resolveValue = (value, depth = 0) => {
    if (depth > 5 || typeof value !== 'string') return value;
    const ref = /^\$\{?([A-Za-z_][A-Za-z0-9_]*)\}?([\s\S]*)$/.exec(value);
    if (!ref) return value;
    const base = raw.get(ref[1]);
    const rest = ref[2];
    if (base === undefined || base.includes('$(') || base.includes('`')) {
      // Unknown or dynamic prefix: treat it as the repo root.
      return rest.replace(/^\/+/, '');
    }
    return resolveValue(base + rest, depth + 1);
  };

  const vars = new Map();
  for (const [key, value] of raw) vars.set(key, resolveValue(value));
  return vars;
}

function unescapeJsLiteral(literal) {
  return literal.replace(/\\(['"\\])/g, '$1').replace(/\\n/g, '\n').replace(/\\t/g, '\t');
}

/** Simple `const NAME = 'literal'` bindings in a JS gate, so constant targets resolve. */
function jsConstants(source) {
  const map = new Map();
  for (const match of source.matchAll(
    /^\s*(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(['"])((?:\\.|(?!\2)[\s\S])*?)\2\s*;?\s*$/gm
  )) {
    map.set(match[1], unescapeJsLiteral(match[3]));
  }
  return map;
}

/**
 * Resolves an assertion argument that is either a quoted literal or a simple
 * identifier bound to one. Returns null when it cannot be resolved.
 *
 * Quoted arguments may contain commas and parentheses -- assertion literals such
 * as `CatalogInventoryRanking::realInventoryFirst($query);` do -- so the pattern
 * matches whole quoted strings rather than stopping at the first delimiter.
 */
const ASSERT_ARG = String.raw`(?:'((?:\\.|[^'\\])*)'|"((?:\\.|[^"\\])*)"|([A-Za-z_$][\w$]*))`;

function resolveArgGroups(match, base, constants) {
  for (let i = base; i < base + 3; i += 1) {
    if (match[i] === undefined) continue;
    const raw = match[i];
    if (i === base + 2) return constants.get(raw) ?? null;
    return unescapeJsLiteral(raw);
  }
  return null;
}

/**
 * Extracts positive source-text assertions from one gate.
 *
 * Supported shapes:
 *   JS : assertContains(pathOrConst, literalOrConst, reason)
 *        assertOrder(pathOrConst, first, second, reason)
 *   SH : grep -qF -- "literal" "$VAR"   /   grep -qF -- "literal" path/to/file
 *
 * Negative assertions (`assertNotContains`, `if grep -qF ...; then exit 1`) are
 * intentionally ignored: this check is about assertions that can be satisfied by
 * dead code, and absence assertions cannot be.
 */
function extractAssertions(gatePath, source) {
  const found = [];
  const isShell = gatePath.endsWith('.sh');

  if (!isShell) {
    const constants = jsConstants(source);
    const call = new RegExp(String.raw`assert(Contains|Order)\(\s*${ASSERT_ARG}\s*,\s*${ASSERT_ARG}`, 'g');
    let match;
    while ((match = call.exec(source)) !== null) {
      const target = resolveArgGroups(match, 2, constants);
      const literal = resolveArgGroups(match, 5, constants);
      if (target === null || literal === null) continue;
      found.push({ target, literal });
      if (match[1] === 'Order') {
        // assertOrder(target, first, second, reason): capture the second needle too.
        const rest = source.slice(call.lastIndex);
        const second = new RegExp(String.raw`^\s*,\s*${ASSERT_ARG}`).exec(rest);
        const secondLiteral = second ? resolveArgGroups(second, 1, constants) : null;
        if (secondLiteral !== null) found.push({ target, literal: secondLiteral });
      }
    }
    return found;
  }

  const vars = shellVariables(source);
  for (const line of source.split('\n')) {
    if (!/\bgrep\b/.test(line)) continue;
    // Only positive greps: skip the `if grep ...; then echo ... exit 1` guards.
    if (/^\s*if\s+grep\b/.test(line)) continue;
    const grep = /grep\s+-[A-Za-z]*q[A-Za-z]*F?\s*(?:--\s*)?(['"])((?:\\.|(?!\1).)*)\1\s+(\S+)/.exec(line)
      ?? /grep\s+-[A-Za-z]*F[A-Za-z]*q?[A-Za-z]*\s*(?:--\s*)?(['"])((?:\\.|(?!\1).)*)\1\s+(\S+)/.exec(line);
    if (!grep) continue;
    let target = grep[3].replace(/^["']|["']$/g, '');
    if (target.startsWith('$')) target = vars.get(target.slice(1).replace(/[{}]/g, '')) ?? '';
    if (!target) continue;
    found.push({ target, literal: unescapeJsLiteral(grep[2]) });
  }
  return found;
}

/**
 * Every repository file a gate ASSERTS about, positive or negative.
 *
 * Used for trigger coverage only. `extractAssertions()` deliberately returns
 * positive assertions alone, because dead-code analysis is about assertions that
 * dead code could satisfy -- an absence assertion cannot be satisfied by dead
 * code. Trigger coverage is a different question: if a workflow does not run when
 * a file the guard makes claims about changes, the guard cannot observe a
 * regression there, and that is equally true for a file the guard asserts must
 * NOT contain something. Negative-only targets used to be dropped entirely, so
 * removing their `paths:` entry went unnoticed.
 */
function extractAssertedTargets(source) {
  const targets = new Set();
  const constants = jsConstants(source);
  const call = new RegExp(String.raw`assert(?:Contains|Order|NotContains)\(\s*${ASSERT_ARG}`, 'g');
  let match;
  while ((match = call.exec(source)) !== null) {
    const target = resolveArgGroups(match, 1, constants);
    if (target !== null) targets.add(target);
  }
  return targets;
}

function gateFiles() {
  const dir = join(ROOT, 'scripts');
  return readdirSync(dir)
    .filter((name) => name.endsWith('.sh') || name.endsWith('.mjs'))
    .filter((name) => !name.endsWith('.test.mjs') && !name.endsWith('.test.sh'))
    .map((name) => `scripts/${name}`);
}

/**
 * A repository file a check can reason about, used for CHECK A targets.
 * Prose/HTML/data targets are ignored.
 */
function isSourceTarget(target) {
  if (!/^(src|backend|public|resources|config|routes|tests|database)\//.test(target)) return false;
  if (target.includes('*')) return false;
  return /\.(php|jsx?|tsx?|mjs|cjs|vue|html|css|json|ya?ml)$/.test(target);
}

/**
 * Every repository file a gate can read, used for CHECK B trigger coverage.
 *
 * Deliberately broader than isSourceTarget: the guard also asserts root files
 * (`index.html`) and workflow files (`.github/workflows/emergency-*.yml`), and a
 * narrow source-only filter silently dropped those from coverage -- removing the
 * corresponding trigger entry would then go unnoticed.
 */
function isRepoTarget(target) {
  if (typeof target !== 'string' || target === '') return false;
  if (target.includes('*') || /\s/.test(target)) return false;
  if (target.startsWith('/') || target.startsWith('$') || target.includes('..')) return false;
  if (!/\.(php|jsx?|tsx?|mjs|cjs|vue|html|css|json|ya?ml|md|sh|py|conf|txt|xml|env)$/.test(target)) return false;
  return target.includes('/') || /^(index\.html|package\.json|package-lock\.json)$/.test(target);
}

/* ------------------------------------------------------------------ *
 * CHECK A -- assertions on unreachable (dead) controller code
 * ------------------------------------------------------------------ */

const ROUTE_DIR = 'backend/routes';

// Production reachability only. `backend/tests` is deliberately excluded: a
// PHPUnit reference to a controller method is not a production call site, and
// counting it would let a gate pin a method that no route, command, job or
// runtime service can invoke.
const BACKEND_DIRS = ['backend/app', 'backend/routes', 'backend/database', 'backend/config'];

let backendFilesCache = null;
function backendPhpFiles() {
  if (backendFilesCache) return backendFilesCache;
  const files = [];
  const walk = (dir) => {
    for (const entry of readdirSync(join(ROOT, dir), { withFileTypes: true })) {
      if (entry.name === 'vendor' || entry.name === 'storage' || entry.name === 'node_modules') continue;
      const path = `${dir}/${entry.name}`;
      if (entry.isDirectory()) walk(path);
      else if (entry.name.endsWith('.php')) files.push(path);
    }
  };
  for (const dir of BACKEND_DIRS) if (existsSync(join(ROOT, dir))) walk(dir);
  backendFilesCache = files;
  return files;
}

/** Splits a PHP class file into method-name -> body text. */
function methodBodies(source) {
  const bodies = new Map();
  const starts = [...source.matchAll(/\n\s*(?:public|protected|private|static|\s)*function\s+([A-Za-z_]\w*)\s*\(/g)];
  for (let i = 0; i < starts.length; i += 1) {
    const from = starts[i].index;
    const to = i + 1 < starts.length ? starts[i + 1].index : source.length;
    bodies.set(starts[i][1], source.slice(from, to));
  }
  return bodies;
}

/** Conventional action sets, so a resource route is not treated as "every method". */
const RESOURCE_ACTIONS = {
  resource: ['index', 'create', 'store', 'show', 'edit', 'update', 'destroy'],
  apiResource: ['index', 'store', 'show', 'update', 'destroy'],
};

/**
 * Removes PHP comments (including docblocks) while leaving string literals intact.
 *
 * Reachability seeds are collected with source regexes, so a docblock that
 * documents an example -- `Example: [FooController::class, 'legacy']` -- would
 * otherwise register a real callable pair and mark an unreachable method as
 * reachable. A comment that can mask dead code is the same defect as a gate that
 * guards unreachable code: the tool would be lying in exactly the way it exists
 * to prevent. Strings are copied verbatim so a `//` inside a literal is not
 * mistaken for a comment.
 *
 * `#[Attribute]` is preserved: `#` only starts a comment when not followed by `[`.
 * Heredoc/nowdoc bodies are not parsed; a callable pair written inside one would
 * still be counted, which is the conservative (non-masking) direction.
 */
function stripPhpComments(source) {
  let out = '';
  let i = 0;
  while (i < source.length) {
    const char = source[i];
    const next = source[i + 1];

    if (char === "'" || char === '"') {
      const quote = char;
      out += char;
      i += 1;
      while (i < source.length) {
        if (source[i] === '\\') {
          out += source[i] + (source[i + 1] ?? '');
          i += 2;
          continue;
        }
        out += source[i];
        const done = source[i] === quote;
        i += 1;
        if (done) break;
      }
      continue;
    }

    if (char === '/' && next === '*') {
      const end = source.indexOf('*/', i + 2);
      i = end === -1 ? source.length : end + 2;
      out += ' ';
      continue;
    }

    if ((char === '/' && next === '/') || (char === '#' && next !== '[')) {
      const end = source.indexOf('\n', i);
      i = end === -1 ? source.length : end;
      continue;
    }

    out += char;
    i += 1;
  }
  return out;
}

/**
 * Which controller methods can production actually reach?
 *
 * "Not routed" is NOT the same as "dead": controllers legitimately expose
 * helpers reached only from a routed sibling, an artisan command, a job or
 * `app(X::class)->m()`. Calling those dead would produce a checker nobody
 * trusts. Reachability is therefore seeded from genuinely external entry points
 * and closed transitively over *intra-class* calls:
 *
 *   seed  (a) a route reaches it -- explicit `[C::class, 'm']`, `'C@m'`, and the
 *             conventional actions of a resource route (honouring only/except);
 *             `Route::controller(C::class)` groups contribute only the actions
 *             they explicitly declare, never the whole class;
 *         (b) `C::class, 'm'` appears as a callable pair (commands, jobs, providers);
 *         (c) `app(C::class)->m(` / `resolve(C::class)->m(`;
 *   edge  (d) `$this->m(`, `self::m(`, `static::m(` **inside another reachable
 *             method of the same class**.
 *
 * Only calls on `$this`/`self`/`static` create edges. An unrelated receiver
 * (`$query->index()`) is not a call to the controller's own `index()`.
 */
function reachableMethods() {
  const routed = new Set();
  const callablePairs = new Set();
  const containerCalls = new Set();
  const edges = new Map(); // "C@from" -> Set("C@to")
  const routeFiles = new Set();

  const addEdge = (from, to) => {
    if (!edges.has(from)) edges.set(from, new Set());
    edges.get(from).add(to);
  };

  for (const file of backendPhpFiles()) {
    // Comments are stripped before any seed or edge is collected: a docblock
    // example must never make an unreachable method look reachable.
    const source = stripPhpComments(readRepoFile(file));
    if (file.startsWith(`${ROUTE_DIR}/`)) routeFiles.add(file);

    for (const match of source.matchAll(/\[\s*([A-Za-z_][\w]*)::class\s*,\s*['"]([^'"]+)['"]\s*\]/g)) {
      callablePairs.add(`${match[1]}@${match[2]}`);
    }
    for (const match of source.matchAll(/,\s*([A-Za-z_][\w]*)::class\s*[,)]/g)) {
      callablePairs.add(`${match[1]}@__invoke`);
    }
    for (const match of source.matchAll(/['"]([A-Za-z_][\w]*)@([A-Za-z_][\w]*)['"]/g)) {
      callablePairs.add(`${match[1]}@${match[2]}`);
    }
    for (const match of source.matchAll(/(?:app|resolve)\(\s*([A-Za-z_][\w]*)::class\s*\)\s*->\s*([A-Za-z_]\w*)\s*\(/g)) {
      containerCalls.add(`${match[1]}@${match[2]}`);
    }

    const className = /class\s+([A-Za-z_]\w*)/.exec(source)?.[1];
    if (!className) continue;
    for (const [method, body] of methodBodies(source)) {
      for (const call of body.matchAll(/(?:\$this\s*->|self\s*::|static\s*::)\s*([A-Za-z_]\w*)\s*\(/g)) {
        addEdge(`${className}@${method}`, `${className}@${call[1]}`);
      }
    }
  }

  // Routes: explicit pairs already collected above; add resource actions and
  // Route::controller group actions, which are narrower than "whole class".
  for (const file of routeFiles) {
    const source = readRepoFile(file);
    for (const match of source.matchAll(
      /\b(apiResource|apiResources|resource|resources)\(\s*[^,)]*,\s*([A-Za-z_][\w]*)::class([\s\S]{0,200})/g
    )) {
      const kind = match[1].startsWith('api') ? 'apiResource' : 'resource';
      let actions = RESOURCE_ACTIONS[kind];
      const chain = match[3] ?? '';
      const only = /->only\(\s*\[([^\]]*)\]/.exec(chain);
      const except = /->except\(\s*\[([^\]]*)\]/.exec(chain);
      const parseList = (text) => [...text.matchAll(/['"]([^'"]+)['"]/g)].map((m) => m[1]);
      if (only) actions = parseList(only[1]).filter((a) => actions.includes(a));
      else if (except) actions = actions.filter((a) => !parseList(except[1]).includes(a));
      for (const action of actions) routed.add(`${match[2]}@${action}`);
    }

    // Route::controller(C::class) exposes ONLY the actions its group declares.
    for (const group of source.matchAll(/Route::controller\(\s*([A-Za-z_][\w]*)::class\s*\)([\s\S]{0,600})/g)) {
      const controller = group[1];
      for (const action of group[2].matchAll(/Route::\w+\(\s*['"][^'"]*['"]\s*,\s*['"]([A-Za-z_]\w*)['"]/g)) {
        routed.add(`${controller}@${action[1]}`);
      }
    }
  }

  // Transitive closure over intra-class edges, starting from external seeds.
  const seeds = new Set([...routed, ...callablePairs, ...containerCalls]);
  const closure = new Set(seeds);
  const queue = [...seeds];
  while (queue.length > 0) {
    const current = queue.pop();
    for (const next of edges.get(current) ?? []) {
      if (closure.has(next)) continue;
      closure.add(next);
      queue.push(next);
    }
  }

  return { has: (controller, method) => closure.has(`${controller}@${method}`) };
}

/** Finds the method enclosing a byte offset inside a PHP class file. */
function enclosingMethod(source, offset) {
  const before = source.slice(0, offset);
  const matches = [...before.matchAll(/\n\s*(?:public|protected|private)?\s*function\s+([A-Za-z_]\w*)\s*\(/g)];
  if (matches.length === 0) return null;
  return matches[matches.length - 1][1];
}

/**
 * Waiver schema validation.
 *
 * A waiver must bind to ONE concrete violation: it needs an owner, a reason, a
 * known check, and both the gate and the target it applies to. Without those, a
 * broad `{check}` entry could suppress whichever matching violation appeared
 * first and stay non-stale as one violation replaced another -- defeating the
 * ownership and self-expiration guarantees.
 */
function validateWaivers(waivers) {
  const problems = [];
  if (!Array.isArray(waivers)) {
    return ['waivers file must contain a "waivers" array'];
  }
  waivers.forEach((waiver, index) => {
    const where = `waivers[${index}]`;
    if (waiver === null || typeof waiver !== 'object' || Array.isArray(waiver)) {
      problems.push(`${where} must be an object`);
      return;
    }
    if (!KNOWN_CHECKS.has(waiver.check)) {
      problems.push(`${where}.check must be one of ${[...KNOWN_CHECKS].join(', ')} (got ${JSON.stringify(waiver.check)})`);
    }
    for (const field of ['owner', 'reason', 'gate', 'target']) {
      const value = waiver[field];
      if (typeof value !== 'string' || value.trim() === '') {
        problems.push(`${where}.${field} is required and must be a non-empty string`);
      }
    }
  });
  return problems;
}

function loadWaivers() {
  const path = join(ROOT, WAIVER_FILE);
  if (!existsSync(path)) return { waivers: [], problems: [], file: WAIVER_FILE };
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    return { waivers: [], problems: [`${WAIVER_FILE} is not valid JSON: ${error.message}`], file: WAIVER_FILE };
  }
  const waivers = Array.isArray(parsed?.waivers) ? parsed.waivers : [];
  return { waivers, problems: validateWaivers(parsed?.waivers), file: WAIVER_FILE };
}

function checkDeadCodeAssertions() {
  const reachable = reachableMethods();
  const hits = [];

  for (const gate of gateFiles()) {
    const source = readRepoFile(gate);
    for (const { target, literal } of extractAssertions(gate, source)) {
      if (!isSourceTarget(target)) continue;
      if (!target.startsWith('backend/app/Http/Controllers/') || !target.endsWith('.php')) continue;
      if (!existsSync(join(ROOT, target))) continue;

      const subject = readRepoFile(target);

      // A literal can appear several times in one controller. The assertion is
      // only dead when EVERY occurrence sits in unreachable code: a single live
      // occurrence still constrains production behaviour, even if the author
      // aimed at a different method.
      const occurrences = [];
      let cursor = subject.indexOf(literal);
      while (cursor >= 0) {
        occurrences.push(cursor);
        cursor = subject.indexOf(literal, cursor + 1);
      }
      if (occurrences.length === 0) continue; // stale assertion: a different check's business

      const methods = occurrences
        .map((offset) => enclosingMethod(subject, offset))
        .filter((method) => method !== null);
      if (methods.length === 0) continue;

      const controller = target.split('/').pop().replace(/\.php$/, '');
      if (methods.some((method) => reachable.has(controller, method))) continue;

      const method = methods[0];
      hits.push({
        check: 'dead-code-assertion',
        gate,
        target,
        literal,
        method,
        detail: `${controller}@${method}() is not reachable from any route, callable reference, container resolution or reachable same-class caller (checked ${methods.length} occurrence${methods.length === 1 ? '' : 's'}), so this assertion guards unreachable code`,
      });
    }
  }
  return hits;
}

/* ------------------------------------------------------------------ *
 * CHECK B -- a gate must run when the files it reads change
 * ------------------------------------------------------------------ */

/** Minimal glob -> RegExp covering the `**`, `*` and `?` forms `paths:` uses. */
function globToRegExp(glob) {
  let out = '';
  for (let i = 0; i < glob.length; i += 1) {
    const char = glob[i];
    if (char === '*') {
      if (glob[i + 1] === '*') {
        if (glob[i + 2] === '/') { out += '(?:.*/)?'; i += 2; } else { out += '.*'; i += 1; }
      } else {
        out += '[^/]*';
      }
    } else if (char === '?') {
      out += '[^/]';
    } else {
      out += char.replace(/[.+^${}()|[\]\\]/g, '\\$&');
    }
  }
  return new RegExp(`^${out}$`);
}

/** Parses the `paths:` / `paths-ignore:` filters of a GitHub workflow. */
function workflowFilters(path) {
  const lines = readRepoFile(path).split('\n');
  const result = { paths: [], pathsIgnore: [], found: false };
  let current = null;
  for (const line of lines) {
    // Comment-only lines are skipped BEFORE the dedent check: a `#` comment inside
    // a paths block is indented like a list item, and treating it as a dedent
    // silently emptied the list.
    if (/^\s*#/.test(line)) continue;
    const key = /^(\s*)(paths|paths-ignore):\s*$/.exec(line);
    if (key) {
      current = key[2] === 'paths' ? result.paths : result.pathsIgnore;
      result.found = true;
      continue;
    }
    const item = /^\s*-\s*'([^']+)'\s*$/.exec(line) ?? /^\s*-\s*"([^"]+)"\s*$/.exec(line);
    if (item && current) { current.push(item[1]); continue; }
    if (/^\s{0,6}\S/.test(line) && !/^\s*-/.test(line)) current = null;
  }
  return result;
}

/** Every npm script body, so `npm run x` indirection can be resolved. */
function npmScripts() {
  try {
    return JSON.parse(readRepoFile('package.json')).scripts ?? {};
  } catch {
    return {};
  }
}

/** Expands a script body to the text it actually executes, following nested `npm run`. */
function expandScript(name, scripts, seen = new Set()) {
  if (seen.has(name)) return '';
  seen.add(name);
  const body = scripts[name];
  if (typeof body !== 'string') return '';
  let text = body;
  for (const match of body.matchAll(/npm\s+run\s+(--silent\s+)?([A-Za-z0-9:_.-]+)/g)) {
    text += `\n${expandScript(match[2], scripts, seen)}`;
  }
  return text;
}

/**
 * Removes a shell comment from a command line.
 *
 * A `#` starts a comment only when unquoted and at the start of a word, so
 * `node scripts/check-recovery-guards.mjs` inside a trailing comment must not be
 * mistaken for an executed command -- that would let a workflow "run" a gate it
 * only mentions.
 */
function stripShellComment(line) {
  let inSingle = false;
  let inDouble = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === "'" && !inDouble) inSingle = !inSingle;
    else if (char === '"' && !inSingle) inDouble = !inDouble;
    else if (char === '#' && !inSingle && !inDouble && (i === 0 || /\s/.test(line[i - 1]))) {
      return line.slice(0, i);
    }
  }
  return line;
}

/**
 * The shell text a workflow actually EXECUTES.
 *
 * Searching the whole YAML for a gate path is wrong: a workflow that merely
 * lists the path in `paths:` or mentions it in a comment would be classified as
 * running the gate, so deleting the real `run:` step would go unnoticed. This
 * extracts `run:` blocks (inline and block scalars), strips shell comments, and
 * resolves `npm run` indirection through package.json.
 */
function workflowExecutedText(path, scripts) {
  const lines = readRepoFile(path).split('\n');
  const commands = [];
  for (let i = 0; i < lines.length; i += 1) {
    const match = /^(\s*)(?:-\s*)?run:\s*(.*)$/.exec(lines[i]);
    if (!match) continue;
    const indent = match[1].length;
    const inline = match[2].trim().replace(/^['"]|['"]$/g, '');
    if (inline !== '' && !/^[|>]/.test(inline)) {
      commands.push(inline);
      continue;
    }
    for (let j = i + 1; j < lines.length; j += 1) {
      const line = lines[j];
      if (line.trim() === '') continue;
      if (line.match(/^\s*/)[0].length <= indent) break;
      commands.push(line.trim());
    }
  }
  let text = commands.map(stripShellComment).join('\n');
  for (const match of text.matchAll(/npm\s+run\s+(--silent\s+)?([A-Za-z0-9:_.-]+)/g)) {
    text += `\n${expandScript(match[2], scripts)}`;
  }
  return text;
}

/** Workflows that actually execute a gate, resolved through npm script indirection. */
function workflowsRunningGate(gateScript, scripts) {
  const dir = join(ROOT, '.github/workflows');
  const result = [];
  for (const name of readdirSync(dir)) {
    if (!/\.ya?ml$/.test(name)) continue;
    const path = `.github/workflows/${name}`;
    if (!workflowExecutedText(path, scripts).includes(gateScript)) continue;
    result.push(path);
  }
  return result;
}

function checkGateTriggerCoverage() {
  const hits = [];
  if (!existsSync(join(ROOT, GUARD))) return hits;
  const guardSource = readRepoFile(GUARD);
  const scripts = npmScripts();

  // Every repository file the guard reads or makes a claim about, source or not,
  // positive or negative: root files and workflow files count too, otherwise
  // dropping their trigger goes unnoticed.
  const targets = new Set();
  for (const target of extractAssertedTargets(guardSource)) {
    if (isRepoTarget(target)) targets.add(target);
  }
  for (const match of guardSource.matchAll(/(?:read|readFileSync)\(\s*'([^']+)'/g)) {
    if (isRepoTarget(match[1])) targets.add(match[1]);
  }

  // A gate is adequately triggered when AT LEAST ONE workflow that runs it fires
  // for the changed file. Requiring every workflow to cover every asserted file
  // would drag the 30-minute frontend browser pipeline into backend-only PRs for
  // no safety gain, so coverage is unioned across the workflows instead.
  const workflows = workflowsRunningGate(GUARD, scripts);
  const coverage = workflows.map((workflow) => {
    const filter = workflowFilters(workflow);
    const deny = filter.pathsIgnore.map(globToRegExp);
    if (!filter.found) return { workflow, always: true, allow: [], deny };
    if (filter.paths.length > 0) {
      return { workflow, always: false, allow: filter.paths.map(globToRegExp), deny };
    }
    // `paths-ignore` only: the workflow runs on everything EXCEPT the ignored
    // patterns. Treating this as "no filter" discarded the deny list, so a change
    // confined to an ignored file looked fully covered.
    return { workflow, always: true, allow: [], deny };
  });

  for (const workflow of workflows) {
    const filter = workflowFilters(workflow);
    if (!filter.found) {
      notes.push(`${workflow} runs ${GUARD} with no paths filter (always runs) -- OK`);
    } else if (filter.paths.length === 0 && filter.pathsIgnore.length > 0) {
      notes.push(
        `${workflow} runs ${GUARD} with paths-ignore only; denied patterns are honoured (${filter.pathsIgnore.length})`
      );
    }
  }

  for (const target of [...targets].sort()) {
    const covered = coverage.some((entry) => {
      if (entry.deny.some((re) => re.test(target))) return false;
      if (entry.always) return true;
      return entry.allow.some((re) => re.test(target));
    });
    if (covered) continue;
    hits.push({
      check: 'gate-not-triggered',
      gate: GUARD,
      target,
      workflow: workflows.join(', '),
      detail: `no workflow that runs ${GUARD} fires when ${target} changes, so the guard cannot observe a regression there`,
    });
  }
  return hits;
}

/* ------------------------------------------------------------------ *
 * Waivers
 * ------------------------------------------------------------------ */

function applyWaivers(hits, waivers) {
  const used = new Set();
  const surviving = [];
  for (const hit of hits) {
    const index = waivers.findIndex((waiver, i) => {
      if (used.has(i)) return false;
      if (waiver.check !== hit.check) return false;
      if (waiver.gate !== hit.gate) return false;
      if (waiver.target !== hit.target) return false;
      if (waiver.literalContains && !hit.literal?.includes(waiver.literalContains)) return false;
      return true;
    });
    if (index >= 0) { used.add(index); hit.waived = waivers[index]; continue; }
    surviving.push(hit);
  }
  const stale = waivers.filter((_, i) => !used.has(i));
  return { surviving, stale };
}

/* ------------------------------------------------------------------ *
 * Main
 * ------------------------------------------------------------------ */

const { waivers, problems: waiverProblems, file: waiverFile } = loadWaivers();
for (const problem of waiverProblems) {
  violations.push({ check: 'invalid-waiver', detail: `${problem} in ${waiverFile}` });
}

const allHits = [...checkDeadCodeAssertions(), ...checkGateTriggerCoverage()];
const { surviving, stale } = applyWaivers(allHits, waivers);

for (const waiver of stale) {
  violations.push({
    check: 'stale-waiver',
    detail: `waiver for ${waiver.gate} -> ${waiver.target} matches no current violation; remove it from ${waiverFile} (owner ${waiver.owner})`,
  });
}
violations.push(...surviving);

if (JSON_OUTPUT) {
  console.log(JSON.stringify({ violations, waived: allHits.filter((h) => h.waived), notes }, null, 2));
} else {
  console.log('== Gate integrity check ==');
  console.log(`Gates inspected: ${gateFiles().length}`);
  console.log(
    `Source-text assertions resolved: ${gateFiles().reduce((n, g) => n + extractAssertions(g, readRepoFile(g)).length, 0)}`
  );
  if (allHits.filter((h) => h.waived).length) {
    console.log('\nWaived (owned and bound to one violation):');
    for (const hit of allHits.filter((h) => h.waived)) {
      console.log(`  [waived: ${hit.waived.owner}] ${hit.detail}`);
    }
  }
  for (const note of notes) console.log(`  note: ${note}`);
  if (violations.length === 0) {
    console.log('\nGate integrity check OK');
  } else {
    console.error('\nGate integrity violations:');
    for (const violation of violations) {
      console.error(`  [${violation.check}] ${violation.detail}`);
      if (violation.gate) console.error(`      gate: ${violation.gate}`);
    }
  }
}

process.exit(violations.length === 0 ? 0 : 1);
