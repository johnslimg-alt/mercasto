import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import test from 'node:test';

const workflowDir = '.github/workflows';
const workflowFiles = readdirSync(workflowDir)
  .filter((name) => /\.ya?ml$/.test(name))
  .map((name) => `${workflowDir}/${name}`);

const expected = new Map([
  ['public-smoke.yml', 'public-smoke-check'],
  ['production-checks.yml', 'production-checks'],
  ['production-live-gates.yml', 'production-live-gates'],
  ['backend-image-gate.yml', 'backend-image-gate'],
  ['frontend-quality.yml', 'frontend-quality'],
  ['backend-tests.yml', 'backend-phpunit'],
  ['vps-live-gate.yml', 'vps-live-gate'],
  ['e2e-seller.yml', 'e2e-seller'],
  ['manual-verification-suite.yml', 'manual-verification-suite'],
  ['backend-schema-inventory.yml', 'backend-schema-inventory'],
]);

function concurrencyBlock(source) {
  const match = source.match(/\nconcurrency:\n((?: {2}[^\n]*\n?)+)/);
  return match?.[1] ?? '';
}

test('verification workflows isolate PRs and non-PR commits', () => {
  for (const [file, prefix] of expected) {
    const source = readFileSync(`${workflowDir}/${file}`, 'utf8');
    const block = concurrencyBlock(source);
    assert.ok(block, `${file} must retain a concurrency block`);
    assert.match(
      block,
      new RegExp(`group: ${prefix}-\\$\\{\\{ github\\.event\\.pull_request\\.number \\|\\| github\\.sha \\}\\}`),
      `${file} must group PR runs by PR number and non-PR runs by commit SHA`,
    );
    assert.match(block, /cancel-in-progress: true/);
    assert.doesNotMatch(block, /github\.ref/);
  }
});

test('no cancel-in-progress workflow groups by github.ref', () => {
  for (const path of workflowFiles) {
    const source = readFileSync(path, 'utf8');
    const block = concurrencyBlock(source);
    if (/cancel-in-progress: true/.test(block)) {
      assert.doesNotMatch(block, /github\.ref/, path);
    }
  }
});


test('production SEO live gates match the localized title availability contract', () => {
  const production = readFileSync(`${workflowDir}/production-live-gates.yml`, 'utf8');
  const vps = readFileSync(`${workflowDir}/vps-live-gate.yml`, 'utf8');
  const watch = readFileSync('scripts/public-production-watch.sh', 'utf8');
  const contract = '<title[^>]*>[^<]{10,160}</title>';
  for (const source of [production, vps, watch]) {
    assert.ok(source.includes(contract));
    assert.doesNotMatch(source, /\{10,(?:70|90)\}/);
  }
});

test('self-hosted production workflows avoid fixed shared temp files', () => {
  const cases = new Map([
    ['production-live-gates.yml', ['/tmp/home.html', '/tmp/sitemap.xml', '/tmp/robots.txt']],
    ['vps-live-gate.yml', ['/tmp/mercasto-vps-home.html', '/tmp/mercasto-vps-auth-providers.json']],
    ['post-merge-production-verify.yml', ['/tmp/mercasto_post_merge_compose.yml']],
  ]);
  for (const [file, forbidden] of cases) {
    const source = readFileSync(`${workflowDir}/${file}`, 'utf8');
    assert.match(source, /mktemp/);
    assert.match(source, /trap 'rm -r?f /);
    for (const path of forbidden) {
      assert.ok(!source.includes(path), `${file} must not use fixed shared temp path ${path}`);
    }
  }
});

test('compose validation uses a private reusable tempfile gate', () => {
  const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
  const gate = readFileSync('scripts/compose-config-gate.sh', 'utf8');
  const backendImage = readFileSync(`${workflowDir}/backend-image-gate.yml`, 'utf8');
  assert.equal(pkg.scripts['check:compose'], 'bash scripts/compose-config-gate.sh');
  assert.match(gate, /mktemp -d/);
  assert.match(gate, /trap 'rm -rf /);
  assert.doesNotMatch(gate, /\/tmp\/mercasto_compose_/);
  assert.match(backendImage, /bash scripts\/compose-config-gate\.sh/);
  assert.doesNotMatch(backendImage, /\/tmp\/mercasto_compose_/);
});

const serverOperatorCommands = [
  'RUN:status',
  'RUN:verify_quick',
  'RUN:security_smoke',
  'RUN:seo_aeo_smoke',
  'RUN:content_quality_audit',
  'RUN:runner_health',
  'RUN:logs_frontend',
  'RUN:logs_backend',
  'RUN:deploy_main:MERCASTO',
  'RUN:restart_frontend:MERCASTO',
  'RUN:restart_stack:MERCASTO',
  'RUN:align_media_caps:MERCASTO',
  'RUN:cleanup_build_cache:MERCASTO',
  'RUN:cleanup_docker:MERCASTO',
  'RUN:maintenance_reboot:MERCASTO',
];

function sortedUnique(values) {
  return [...new Set(values)].sort();
}

test('server operator trigger matches only the explicit allowlisted commands', () => {
  const source = readFileSync(`${workflowDir}/chatgpt-server-operator.yml`, 'utf8');
  const triggerCommands = [...source.matchAll(/github\.event\.comment\.body == '([^']+)'/g)]
    .map((match) => match[1]);
  const commandMap = source.match(/const commands = \{([\s\S]*?)\n\s+\};/);
  assert.ok(commandMap, 'server operator command map must exist');
  const mappedCommands = [...commandMap[1].matchAll(/'([^']+)': \[/g)]
    .map((match) => match[1]);

  assert.deepEqual(sortedUnique(triggerCommands), [...serverOperatorCommands].sort());
  assert.deepEqual(sortedUnique(mappedCommands), [...serverOperatorCommands].sort());
  assert.doesNotMatch(source, /startsWith\(github\.event\.comment\.body,\s*['"]RUN:/);

  for (const command of [
    'RUN:hosted_runner_status',
    'RUN:hosted_agent_recovery:MERCASTO',
    'RUN:mcp_bridge_status',
    'RUN:reef_mcp_agent_install:MERCASTO',
    'RUN:unknown_command',
  ]) {
    assert.ok(!triggerCommands.includes(command), `${command} must not allocate the self-hosted operator job`);
  }
});

test('server operator serializes valid jobs without cancelling active work', () => {
  const source = readFileSync(`${workflowDir}/chatgpt-server-operator.yml`, 'utf8');
  assert.doesNotMatch(source, /^concurrency:/m, 'operator must not use workflow-level concurrency');
  assert.match(
    source,
    /^ {4}concurrency:\n {6}group: chatgpt-server-operator\n {6}cancel-in-progress: false/m,
    'operator concurrency must remain job-scoped and non-cancelling',
  );
});

test('content quality audit operator remains fixed and read-only', () => {
  const source = readFileSync('scripts/server-operator.sh', 'utf8');
  const match = source.match(/\n  content_quality_audit\)\n([\s\S]*?)\n    ;;/);
  assert.ok(match, 'content_quality_audit operation must exist');
  const block = match[1];
  assert.match(
    block,
    /exec -T mercasto-backend php artisan ads:audit-active-content-quality --limit-groups=20/,
  );
  assert.doesNotMatch(block, /require_confirm|\brm\b|\bdelete\b|\bupdate\b|restart|up -d|migrate|reset --hard|git clean/);
});
