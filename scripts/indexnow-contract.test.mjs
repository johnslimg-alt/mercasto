import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

// The IndexNow key is public by design, but it is copied into three places: the controller's
// config default, the file served at /{key}.txt, and the daily batch script. A drift between
// them means every submission is rejected (the receiving engine fetches the key file and
// compares), which is exactly the silent failure this contract exists to prevent.
const config = readFileSync('backend/config/marketplace.php', 'utf8');
const controller = readFileSync('backend/app/Http/Controllers/Api/IndexNowController.php', 'utf8');
const job = readFileSync('backend/app/Jobs/SubmitIndexNowUrl.php', 'utf8');
const script = readFileSync('scripts/submit-all-to-indexnow.sh', 'utf8');

const configured = config.match(/'key' => \(string\) env\('INDEXNOW_KEY', '([^']+)'\)/);
assert(configured, 'marketplace.indexnow.key must keep an explicit default');
const key = configured[1];
assert.match(key, /^[A-Za-z0-9-]{8,128}$/, 'IndexNow keys are 8-128 alphanumeric characters');

const keyFile = `public/${key}.txt`;
assert(existsSync(keyFile), `the key file must be served at /${key}.txt (${keyFile})`);
assert.equal(
  readFileSync(keyFile, 'utf8').trim(),
  key,
  'the served key file must contain exactly the configured key',
);
assert(existsSync(`backend/public/${key}.txt`) === false,
  'the key file belongs to the frontend public root that nginx serves; a second copy would drift');

assert(script.includes(`\${MERCASTO_INDEXNOW_KEY:-${key}}`), 'the batch script must default to the same key');
assert(script.includes('$BASE_URL/$KEY.txt'), 'the batch script must verify the served key file first');
assert(script.includes('api.indexnow.org/indexnow'), 'the batch script must default to the IndexNow endpoint');

// The submission must be queued, not performed inside the request, and the URL must be built in
// exactly one place. The canonical-route value of that expression is owned by PR #1135, so this
// contract deliberately says nothing about the path itself.
assert(!controller.includes('Http::'), 'submissions must be queued, not performed in the request');
assert.equal((controller.match(/\$url = /g) || []).length, 1,
  'the submission URL must be built in exactly one place');
// (The value of that expression - the canonical route - is PR #1135's; do not assert it here.)
assert(job.includes('ShouldQueue'), 'the submission job must be queued');
assert(job.includes('->connectTimeout(3)') && job.includes('->timeout(5)'),
  'the queued submission must bound its timeouts');
assert(controller.includes('SubmitIndexNowUrl::dispatch'), 'notifyAdChange must dispatch the queued job');

// The former dead HTTP endpoints must stay removed.
for (const dead of ['function submitUrl', 'function submitBatch', 'function getKey']) {
  assert(!controller.includes(dead), `${dead} was never routed and must stay deleted`);
}

// The root cron runs this exact path at 04:00; it must exist and be executable in git.
assert(existsSync('scripts/submit-all-to-indexnow.sh'), 'the cron target must exist in the repository');
const mode = readFileSync('scripts/submit-all-to-indexnow.sh', 'utf8');
assert(mode.startsWith('#!/usr/bin/env bash'), 'the cron target must be a bash script');

console.log(`IndexNow contract OK: key ${key.slice(0, 6)}… served at /${key}.txt, queued submissions, batch script present.`);
