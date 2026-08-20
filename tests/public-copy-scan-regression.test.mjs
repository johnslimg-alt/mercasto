import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const repoRoot = process.cwd();
const scanScript = path.join(repoRoot, 'scripts/public-copy-scan.sh');

function runFixture(defaultConf) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mercasto-copy-scan-'));
  try {
    fs.writeFileSync(path.join(root, 'default.conf'), defaultConf, 'utf8');
    return spawnSync('bash', [scanScript], {
      cwd: repoRoot,
      env: { ...process.env, ROOT: root },
      encoding: 'utf8',
    });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

test('Docker embedded DNS resolver directive is allowed', () => {
  const result = runFixture('resolver 127.0.0.11 valid=10s ipv6=off;\n');
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, /public copy scan OK/);
});

test('literal host loopback remains blocked in scanned configuration', () => {
  const result = runFixture('proxy_pass http://127.0.0.1:3000;\n');
  assert.equal(result.status, 1, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stderr, /public copy scan found banned or review-required public text/);
});

test('Docker DNS address remains blocked when used as a local upstream URL', () => {
  const result = runFixture('proxy_pass http://127.0.0.11:3000;\n');
  assert.equal(result.status, 1, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stderr, /public copy scan found banned or review-required public text/);
});

test('other 127.0.0.1-prefixed loopback addresses are not globally exempted', () => {
  const result = runFixture('proxy_pass http://127.0.0.10:3000;\n');
  assert.equal(result.status, 1, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stderr, /public copy scan found banned or review-required public text/);
});
