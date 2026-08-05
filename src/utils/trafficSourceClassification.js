const AI_SOURCE_HOSTS = [
  ['chatgpt.com', 'chatgpt'],
  ['openai.com', 'chatgpt'],
  ['perplexity.ai', 'perplexity'],
  ['claude.ai', 'claude'],
  ['gemini.google.com', 'gemini'],
  ['copilot.microsoft.com', 'microsoft_copilot'],
];

export function normalizeTrafficSource(value) {
  const source = String(value || '').trim().toLowerCase().replace(/^www\./, '');
  if (!source) return '';

  return AI_SOURCE_HOSTS.find(([hostname]) => (
    source === hostname || source.endsWith(`.${hostname}`)
  ))?.[1] || source;
}

export function classifyReferrerHost(value) {
  const hostname = String(value || '').trim().toLowerCase().replace(/^www\./, '');
  const source = normalizeTrafficSource(hostname);
  const aiReferral = AI_SOURCE_HOSTS.some(([, canonical]) => canonical === source);

  if (aiReferral) {
    return { source, medium: 'ai_referral', channel: 'ai_referral', hostname };
  }

  if (hostname.includes('google.')) {
    return { source: 'google', medium: 'organic', channel: 'organic_search', hostname };
  }

  if (hostname === 'bing.com' || hostname.endsWith('.bing.com')) {
    return { source: 'bing', medium: 'organic', channel: 'organic_search', hostname };
  }

  return { source: source || hostname, medium: 'referral', channel: 'referral', hostname };
}

export function isAiReferralSource(value) {
  const source = normalizeTrafficSource(value);
  return AI_SOURCE_HOSTS.some(([, canonical]) => canonical === source);
}
