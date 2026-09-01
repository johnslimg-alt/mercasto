import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { SUPPORTED_LANGUAGES } from '../src/utils/translations.js';

const REQUIRED = [
  'title', 'description', 'humanAuthoritative', 'provider', 'model', 'runtime',
  'mode', 'proposed', 'finalRoute', 'policyIds', 'images', 'videoFrames',
  'gatewayVersion', 'modelMedia', 'omittedMedia',
  'none', 'disabled', 'disabledNote', 'manualFallback',
];

const source = fs.readFileSync('src/components/admin/adminModerationI18n.js', 'utf8');
const start = source.indexOf('const aiAssistResources = {');
const end = source.indexOf('\n};', start);
const block = source.slice(start, end + 3);

test('moderation AI-assist evidence copy covers all 11 active languages', () => {
  assert.ok(start >= 0 && end > start, 'aiAssistResources block');
  for (const language of SUPPORTED_LANGUAGES) {
    assert.match(block, new RegExp(`\\n\\s{2}${language}: \\{`), `${language}.aiAssist`);
  }
  for (const key of REQUIRED) {
    const occurrences = [...block.matchAll(new RegExp(`(?:^|[,{]\\s*)${key}:`, 'g'))].length;
    assert.equal(occurrences, SUPPORTED_LANGUAGES.length, `${key} translated in all languages`);
  }
  assert.equal(block.includes('ZXQ'), false, 'no placeholder text');
  assert.match(source, /resource\.aiAssist = aiAssistResources\[language\] \|\| aiAssistResources\.en/);
});

test('admin moderation renders normalized AI-assist evidence only', () => {
  const ui = fs.readFileSync('src/components/admin/AdminModerationCenter.jsx', 'utf8');
  assert.match(ui, /detail\.ai_assist/);
  assert.match(ui, /data-testid="admin-ai-assist-evidence"/);
  assert.match(ui, /assist\.runtime\?\.provider/);
  assert.match(ui, /assist\.runtime\?\.gateway_version/);
  assert.match(ui, /assist\.media\?\.model_media/);
  assert.match(ui, /assist\.rollout\?\.human_authoritative/);
  assert.match(ui, /assist\.policy_ids/);
  assert.equal(ui.includes('metadata.result'), false);
  assert.equal(ui.includes('raw_private_sentinel'), false);
});

test('admin evidence keeps historical rollout separate from current feature state', () => {
  const ui = fs.readFileSync('src/components/admin/AdminModerationCenter.jsx', 'utf8');
  assert.match(ui, /label=\{t\('aiAssist\.mode'\)\} value=\{assist\.rollout\?\.mode \|\| 'assist'\}/);
  assert.match(ui, /label=\{t\('aiAssist\.disabled'\)\} value=\{assist\.feature_enabled \? t\('no'\) : t\('yes'\)\}/);
  assert.doesNotMatch(ui, /assist\.feature_enabled \? \(assist\.rollout\?\.mode/);
  assert.match(ui, /assist\.runtime\?\.execution === 'skipped'/);
});
