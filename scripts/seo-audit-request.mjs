import http from 'node:http';
import https from 'node:https';

const SUPPORTED_PROTOCOLS = new Set(['http:', 'https:']);
const MAX_REDIRECTS = 5;

function parseBaseUrl(value, label) {
  const url = new URL(value);
  if (!SUPPORTED_PROTOCOLS.has(url.protocol)) {
    throw new Error(`${label} must use http or https`);
  }
  return url;
}

export function resolveSeoAuditRequest(path, options = {}) {
  const publicBaseUrl = parseBaseUrl(
    options.baseUrl || 'https://mercasto.com',
    'BASE_URL',
  );
  const connectBaseUrl = parseBaseUrl(
    options.connectBaseUrl || publicBaseUrl.toString(),
    'SEO_AUDIT_CONNECT_BASE_URL',
  );
  const publicUrl = new URL(path, publicBaseUrl);
  const useConnectOverride = (
    connectBaseUrl.origin !== publicBaseUrl.origin
    && publicUrl.origin === publicBaseUrl.origin
  );
  const fetchUrl = useConnectOverride
    ? new URL(`${publicUrl.pathname}${publicUrl.search}`, connectBaseUrl)
    : new URL(publicUrl);
  const headers = {};

  if (fetchUrl.host !== publicUrl.host) {
    headers.Host = publicUrl.host;
  }

  return {
    publicUrl: publicUrl.toString(),
    fetchUrl: fetchUrl.toString(),
    headers,
  };
}

export function normalizedAttemptCount(value, fallback = 3) {
  const parsed = Number.parseInt(String(value || ''), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(5, Math.max(1, parsed));
}

function requestOnce(requestConfig, options = {}) {
  const publicUrl = new URL(requestConfig.publicUrl);
  const fetchUrl = new URL(requestConfig.fetchUrl);
  const transport = fetchUrl.protocol === 'https:' ? https : http;
  const timeoutMs = Number(options.timeoutMs) || 30_000;

  return new Promise((resolve, reject) => {
    const request = transport.request({
      protocol: fetchUrl.protocol,
      hostname: fetchUrl.hostname,
      port: fetchUrl.port || undefined,
      path: `${fetchUrl.pathname}${fetchUrl.search}`,
      method: 'GET',
      headers: requestConfig.headers,
      ...(fetchUrl.protocol === 'https:' ? {
        servername: publicUrl.hostname,
        rejectUnauthorized: options.insecureTls !== true,
      } : {}),
    }, (response) => {
      const chunks = [];
      response.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      response.on('end', () => resolve({
        status: response.statusCode || 0,
        text: Buffer.concat(chunks).toString('utf8'),
        location: response.headers.location || '',
      }));
    });

    request.setTimeout(timeoutMs, () => {
      request.destroy(new Error(`SEO audit request timed out after ${timeoutMs}ms`));
    });
    request.on('error', reject);
    request.end();
  });
}

export async function requestSeoAuditText(path, options = {}, redirectCount = 0) {
  const requestConfig = resolveSeoAuditRequest(path, options);
  const result = await requestOnce(requestConfig, options);

  if (
    result.location
    && result.status >= 300
    && result.status < 400
    && redirectCount < MAX_REDIRECTS
  ) {
    const nextUrl = new URL(result.location, requestConfig.publicUrl).toString();
    return requestSeoAuditText(nextUrl, options, redirectCount + 1);
  }

  if (result.location && result.status >= 300 && result.status < 400) {
    throw new Error(`too many redirects while fetching ${requestConfig.publicUrl}`);
  }

  return {
    url: requestConfig.publicUrl,
    status: result.status,
    text: result.text,
  };
}
