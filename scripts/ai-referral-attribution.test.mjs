import test from 'node:test';
import assert from 'node:assert/strict';

import {
  classifyReferrerHost,
  isAiReferralSource,
  normalizeTrafficSource,
} from '../src/utils/trafficSourceClassification.js';

global.window = { location: new URL('https://mercasto.com/') };
global.document = { referrer: '' };
const { attributionFromUrl } = await import('../src/utils/campaignAttribution.js');

test('normalizes supported AI answer and search sources', () => {
  assert.equal(normalizeTrafficSource('chatgpt.com'), 'chatgpt');
  assert.equal(normalizeTrafficSource('www.perplexity.ai'), 'perplexity');
  assert.equal(normalizeTrafficSource('claude.ai'), 'claude');
  assert.equal(normalizeTrafficSource('gemini.google.com'), 'gemini');
  assert.equal(normalizeTrafficSource('copilot.microsoft.com'), 'microsoft_copilot');
});

test('classifies AI referrers separately from organic search', () => {
  assert.deepEqual(classifyReferrerHost('chatgpt.com'), {
    source: 'chatgpt', medium: 'ai_referral', channel: 'ai_referral', hostname: 'chatgpt.com',
  });
  assert.equal(classifyReferrerHost('www.google.com').channel, 'organic_search');
  assert.equal(classifyReferrerHost('example.com').channel, 'referral');
  assert.equal(isAiReferralSource('perplexity'), true);
  assert.equal(isAiReferralSource('google'), false);
});

test('recognizes the ChatGPT utm_source contract without a medium', () => {
  const attribution = attributionFromUrl('https://mercasto.com/seguridad?utm_source=chatgpt.com');
  assert.equal(attribution.source, 'chatgpt');
  assert.equal(attribution.medium, 'ai_referral');
  assert.equal(attribution.channel, 'ai_referral');
  assert.equal(attribution.paid, false);
});

test('captures AI document referrers without storing a full URL', () => {
  global.document.referrer = 'https://www.perplexity.ai/search/example?private=query';
  const attribution = attributionFromUrl('https://mercasto.com/como-funciona', true);
  assert.equal(attribution.source, 'perplexity');
  assert.equal(attribution.medium, 'ai_referral');
  assert.equal(attribution.referrerHost, 'perplexity.ai');
  assert.equal(attribution.landingPath, '/como-funciona');
  assert.equal(JSON.stringify(attribution).includes('private=query'), false);
});
