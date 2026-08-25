import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const script = readFileSync(resolve('scripts/production-session-security-smoke.sh'), 'utf8');

function functionBody(name) {
  const match = script.match(new RegExp(`${name}\\(\\) \\{([\\s\\S]*?)^\\}`, 'm'));
  assert.ok(match, `${name} must exist`);
  return match[1];
}

test('CORS retries keep only the current attempt response headers', () => {
  const body = functionBody('curl_with_fresh_headers');

  assert.match(body, /: > "\$header_file"/);
  assert.match(body, /curl "\$\{CURL_COMMON\[@\]\}" -D "\$header_file"/);
  assert.doesNotMatch(body, /CURL_RETRY|--retry/);
  assert.match(body, /408\|429\|500\|502\|503\|504/);
  assert.match(body, /return 1/);

  const truncateIndex = body.indexOf(': > "$header_file"');
  const curlIndex = body.indexOf('curl "${CURL_COMMON[@]}" -D "$header_file"');
  assert.ok(truncateIndex >= 0 && truncateIndex < curlIndex, 'header file must be truncated before every curl attempt');
});

test('both CORS assertions use the fresh-header retry helper', () => {
  assert.match(script, /curl_with_fresh_headers "\$TMP_DIR\/untrusted-headers"/);
  assert.match(script, /curl_with_fresh_headers "\$TMP_DIR\/trusted-headers"/);
  assert.doesNotMatch(script, /-D "\$TMP_DIR\/(?:untrusted|trusted)-headers"/);
});

test('non-header production requests retain bounded curl retry behavior', () => {
  assert.match(script, /CURL_RETRY=\([\s\S]*--retry 2[\s\S]*--retry-delay 2[\s\S]*--retry-connrefused[\s\S]*\)/);
  assert.match(script, /curl "\$\{CURL_COMMON\[@\]\}" "\$\{CURL_RETRY\[@\]\}" -c "\$TMP_DIR\/cookies"/);
  assert.match(script, /cookie_status="\$\(curl "\$\{CURL_COMMON\[@\]\}" "\$\{CURL_RETRY\[@\]\}"/);
});
