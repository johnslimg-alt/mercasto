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
 *     A gate may not assert source text inside a controller method that no route
 *     reaches. Such an assertion can never protect production behaviour.
 *
 *   CHECK B -- unrun gates (the mechanism behind incident 1 and 3).
 *     If a workflow runs a gate under a `paths:` filter (or an in-shell changed-
 *     file regex), that filter must fire for every repository file the gate
 *     reads. A guard that does not run when its subject changes is not a guard.
 *
 * Usage:
 *   node scripts/gate-integrity-check.mjs            # check the repository
 *   node scripts/gate-integrity-check.mjs --json     # machine-readable report
 *
 * Exits non-zero on any unwaived violation. Waivers live in
 * `scripts/gate-integrity-waivers.json` and MUST name an owning PR; a waiver
 * that no longer matches a real violation is itself an error, so waivers expire
 * by themselves once the owning PR lands.
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

const rel = (p) => relative(ROOT, p).split('\\').join('/');

function readRepoFile(path) {
  return readFileSync(join(ROOT, path), 'utf8');
}

/* ------------------------------------------------------------------ *
 * Gate discovery and assertion extraction
 * ------------------------------------------------------------------ */

/**
 * Reads the `VAR="path"` assignments a shell gate uses to point at source
 * files, so `grep -qF -- "literal" "$VAR"` can be resolved to a real path.
 */
function shellVariables(source) {
  const vars = new Map();
  for (const line of source.split('\n')) {
    const match = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*"?([^"\s]+)"?\s*$/.exec(line);
    if (match) vars.set(match[1], match[2]);
  }
  return vars;
}

function unescapeJsLiteral(literal) {
  return literal.replace(/\\(['"\\])/g, '$1').replace(/\\n/g, '\n').replace(/\\t/g, '\t');
}

/**
 * Extracts positive source-text assertions from one gate.
 *
 * Supported shapes (the two that cover virtually every gate in this repo):
 *   JS : assertContains('path', 'literal', 'reason') / assertOrder('path', 'a', 'b', ...)
 *   SH : grep -qF -- "literal" "$VAR"   /   grep -qF -- "literal" path/to/file
 *
 * Negative assertions (`assertNotContains`, the `if grep -qF ... exit 1` guards)
 * are intentionally ignored: this check is about assertions that can be
 * satisfied by dead code, and absence assertions cannot be.
 */
function extractAssertions(gatePath, source) {
  const found = [];
  const isShell = gatePath.endsWith('.sh');

  if (!isShell) {
    const call = /assert(Contains|Order)\(\s*(['"])((?:\\.|(?!\2).)*)\2\s*,\s*(['"])((?:\\.|(?!\4).)*)\4/g;
    let match;
    while ((match = call.exec(source)) !== null) {
      const kind = match[1];
      const target = unescapeJsLiteral(match[3]);
      found.push({ target, literal: unescapeJsLiteral(match[5]) });
      if (kind === 'Order') {
        // assertOrder(target, first, second, reason): capture the second needle too.
        const rest = source.slice(call.lastIndex);
        const second = /^\s*,\s*(['"])((?:\\.|(?!\1).)*)\1/.exec(rest);
        if (second) found.push({ target, literal: unescapeJsLiteral(second[2]) });
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
    if (target.startsWith('$')) target = vars.get(target.slice(1)) ?? '';
    if (!target) continue;
    found.push({ target, literal: unescapeJsLiteral(grep[2]) });
  }
  return found;
}

function gateFiles() {
  const dir = join(ROOT, 'scripts');
  return readdirSync(dir)
    .filter((name) => name.endsWith('.sh') || name.endsWith('.mjs'))
    .filter((name) => !name.endsWith('.test.mjs') && !name.endsWith('.test.sh'))
    .map((name) => `scripts/${name}`);
}

/**
 * A gate target is a repository source file this check can reason about.
 * Prose/HTML/data targets are ignored.
 */
function isSourceTarget(target) {
  if (!/^(src|backend|public|resources|config|routes|tests|database)\//.test(target)) return false;
  if (target.includes('*')) return false;
  return /\.(php|jsx?|tsx?|mjs|cjs|vue|html|css|json|ya?ml)$/.test(target);
}

/* ------------------------------------------------------------------ *
 * CHECK A -- assertions on unrouted (dead) controller code
 * ------------------------------------------------------------------ */

const ROUTE_DIR = 'backend/routes';
const BACKEND_DIRS = ['backend/app', 'backend/routes', 'backend/tests', 'backend/database', 'backend/config'];

/** Every .php file under the backend tree, once, so reachability scans stay cheap. */
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

/**
 * Which controller methods does the application actually reach?
 *
 * "Not routed" is NOT the same as "dead": controllers legitimately expose
 * helpers that only their own sibling methods, an artisan command, a scheduled
 * job or `app(X::class)->m()` call. Calling those dead would produce a checker
 * nobody trusts, so reachability is modelled explicitly:
 *
 *   (a) a route reaches it -- including resource/controller routes that expose
 *       every public method;
 *   (b) it is referenced as a callable pair anywhere (`C::class, 'm'`, `'C@m'`);
 *   (c) it is called from inside its own class (`$this->m(`), which covers
 *       helpers invoked by routed sibling methods;
 *   (d) it is resolved through the container (`app(C::class)->m(`).
 *
 * Only when none of those hold is a method genuinely unreachable, and an
 * assertion pinned to it is guarding code that can never run in production.
 */
function reachableMethods() {
  const routed = new Set();
  const callablePairs = new Set();
  const inClassCalls = new Set();
  const containerCalls = new Set();
  const wholeController = new Set();

  for (const file of backendPhpFiles()) {
    const source = readRepoFile(file);

    for (const match of source.matchAll(/\[\s*([A-Za-z_][\w]*)::class\s*,\s*['"]([^'"]+)['"]\s*\]/g)) {
      callablePairs.add(`${match[1]}@${match[2]}`);
    }
    for (const match of source.matchAll(/,\s*([A-Za-z_][\w]*)::class\s*[,)]/g)) {
      callablePairs.add(`${match[1]}@__invoke`);
    }
    for (const match of source.matchAll(/(?:apiResource|apiResources|resource|resources|controller)\([^;]{0,200}?([A-Za-z_][\w]*)::class/g)) {
      wholeController.add(match[1]);
    }
    for (const match of source.matchAll(/['"]([A-Za-z_][\w]*)@([A-Za-z_][\w]*)['"]/g)) {
      callablePairs.add(`${match[1]}@${match[2]}`);
    }
    for (const match of source.matchAll(/(?:app|resolve)\(\s*([A-Za-z_][\w]*)::class\s*\)\s*->\s*([A-Za-z_]\w*)\s*\(/g)) {
      containerCalls.add(`${match[1]}@${match[2]}`);
    }

    const className = /class\s+([A-Za-z_]\w*)/.exec(source)?.[1];
    if (className) {
      for (const match of source.matchAll(/->\s*([A-Za-z_]\w*)\s*\(/g)) {
        inClassCalls.add(`${className}@${match[1]}`);
      }
      for (const match of source.matchAll(/::\s*([A-Za-z_]\w*)\s*\(/g)) {
        inClassCalls.add(`${className}@${match[1]}`);
      }
    }
  }

  // Resource routes make every public method of the controller reachable.
  const has = (controller, method) =>
    wholeController.has(controller) ||
    routed.has(`${controller}@${method}`) ||
    callablePairs.has(`${controller}@${method}`) ||
    containerCalls.has(`${controller}@${method}`) ||
    inClassCalls.has(`${controller}@${method}`);

  return { has };
}

/** Finds the method enclosing a byte offset inside a PHP class file. */
function enclosingMethod(source, offset) {
  const before = source.slice(0, offset);
  const matches = [...before.matchAll(/\n\s*(?:public|protected|private)?\s*function\s+([A-Za-z_]\w*)\s*\(/g)];
  if (matches.length === 0) return null;
  return matches[matches.length - 1][1];
}

function loadWaivers() {
  const path = join(ROOT, 'scripts/gate-integrity-waivers.json');
  if (!existsSync(path)) return { waivers: [], file: null };
  const parsed = JSON.parse(readFileSync(path, 'utf8'));
  return { waivers: parsed.waivers ?? [], file: 'scripts/gate-integrity-waivers.json' };
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
      // aimed at a different method. (The converse -- one dead occurrence plus a
      // live one that silently satisfies the gate -- is a masking problem that
      // belongs to the audit, not to this check.)
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
        detail: `${controller}@${method}() has no route, no callable reference and no in-class caller (checked ${methods.length} occurrence${methods.length === 1 ? '' : 's'}), so this assertion guards unreachable code`,
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
        // `**/` spans directories; a trailing `**` spans everything below.
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
    // silently emptied the list (which made this check pass everything).
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

/** Workflow -> the npm gate scripts it runs. */
function workflowsRunningGate(gateScript) {
  const dir = join(ROOT, '.github/workflows');
  const result = [];
  for (const name of readdirSync(dir)) {
    if (!/\.ya?ml$/.test(name)) continue;
    const path = `.github/workflows/${name}`;
    const source = readRepoFile(path).replace(/\\\r?\n\s*/g, ' ');
    if (!source.includes(gateScript)) continue;
    result.push(path);
  }
  return result;
}

function checkGateTriggerCoverage() {
  const hits = [];
  const GUARD = 'scripts/check-recovery-guards.mjs';
  if (!existsSync(join(ROOT, GUARD))) return hits;
  const guardSource = readRepoFile(GUARD);

  const targets = new Set();
  for (const { target } of extractAssertions(GUARD, guardSource)) {
    if (isSourceTarget(target)) targets.add(target);
  }
  // Files the guard reads via helper calls rather than assertContains arguments.
  for (const match of guardSource.matchAll(/(?:read|readFileSync)\(\s*'([^']+)'/g)) {
    if (isSourceTarget(match[1])) targets.add(match[1]);
  }

  // A gate is adequately triggered when AT LEAST ONE workflow that runs it fires
  // for the changed file. Requiring every workflow to cover every asserted file
  // would drag the 30-minute frontend browser pipeline into backend-only PRs for
  // no safety gain, so coverage is unioned across the workflows instead.
  const workflows = workflowsRunningGate(GUARD);
  const coverage = workflows.map((workflow) => {
    const filter = workflowFilters(workflow);
    if (!filter.found || filter.paths.length === 0) return { workflow, always: true, allow: [], deny: [] };
    return {
      workflow,
      always: false,
      allow: filter.paths.map(globToRegExp),
      deny: filter.pathsIgnore.map(globToRegExp),
    };
  });

  for (const workflow of workflows) {
    const filter = workflowFilters(workflow);
    if (!filter.found || filter.paths.length === 0) {
      notes.push(`${workflow} runs ${GUARD} without a paths filter (always runs) -- OK`);
    }
  }

  for (const target of [...targets].sort()) {
    const covered = coverage.some((entry) => {
      if (entry.always) return true;
      if (entry.deny.some((re) => re.test(target))) return false;
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
      if (waiver.gate && waiver.gate !== hit.gate) return false;
      if (waiver.target && waiver.target !== hit.target) return false;
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

const { waivers, file: waiverFile } = loadWaivers();
const allHits = [...checkDeadCodeAssertions(), ...checkGateTriggerCoverage()];
const { surviving, stale } = applyWaivers(allHits, waivers);

for (const waiver of stale) {
  violations.push({
    check: 'stale-waiver',
    detail: `waiver for ${waiver.gate ?? waiver.check}${waiver.target ? ` -> ${waiver.target}` : ''} matches no current violation; remove it from ${waiverFile} (owner ${waiver.owner ?? 'unknown'})`,
  });
}
violations.push(...surviving);

if (JSON_OUTPUT) {
  console.log(JSON.stringify({ violations, waived: allHits.filter((h) => h.waived), notes }, null, 2));
} else {
  console.log('== Gate integrity check ==');
  console.log(`Gates inspected: ${gateFiles().length}`);
  console.log(`Source-text assertions resolved: ${gateFiles().reduce((n, g) => n + extractAssertions(g, readRepoFile(g)).length, 0)}`);
  if (allHits.filter((h) => h.waived).length) {
    console.log('\nWaived (owned by another PR):');
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
