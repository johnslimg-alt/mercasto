import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const workflowPath = '.github/workflows/llamacpp-vision-benchmark.yml';

function leadingSpaces(line) {
  return line.length - line.trimStart().length;
}

test('llama.cpp benchmark Python heredocs stay inside YAML run blocks', () => {
  const lines = fs.readFileSync(workflowPath, 'utf8').split('\n');
  let heredocs = 0;

  for (let start = 0; start < lines.length; start += 1) {
    if (!lines[start].includes("<<'PY'")) continue;
    heredocs += 1;
    const yamlIndent = 10;
    let end = start + 1;
    while (end < lines.length && lines[end].trim() !== 'PY') end += 1;

    assert.ok(end < lines.length, `unterminated Python heredoc after line ${start + 1}`);
    for (let index = start + 1; index <= end; index += 1) {
      assert.ok(
        leadingSpaces(lines[index]) >= yamlIndent,
        `Python heredoc escaped YAML block at line ${index + 1}`,
      );
    }
    const continuation = lines[end + 1] || '';
    assert.ok(leadingSpaces(continuation) >= yamlIndent, `heredoc continuation escaped YAML block at line ${end + 2}`);
  }

  assert.equal(heredocs, 3, 'benchmark workflow Python heredoc inventory changed');
});
