import dns from 'node:dns';

import {
  normalizedAttemptCount,
  requestSeoAuditText,
} from './seo-audit-request.mjs';

dns.setDefaultResultOrder('ipv4first');

const baseUrl = process.env.BASE_URL || 'https://mercasto.com';
const connectBaseUrl = process.env.SEO_AUDIT_CONNECT_BASE_URL || baseUrl;
const attempts = normalizedAttemptCount(process.env.SEO_AUDIT_ATTEMPTS);


async function fetchText(path) {
  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await requestSeoAuditText(path, {
        baseUrl,
        connectBaseUrl,
        insecureTls: process.env.SEO_AUDIT_INSECURE_TLS === '1',
      });
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        console.warn(`retrying ${new URL(path, baseUrl)} after network failure (${attempt}/${attempts})`);
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  }

  throw lastError;
}

function requireMatch(label, text, pattern) {
  if (!pattern.test(text)) {
    throw new Error(`${label} check failed`);
  }
}

function rejectMatch(label, text, pattern) {
  if (pattern.test(text)) {
    throw new Error(`${label} check failed`);
  }
}

async function checkPage(path) {
  const { url, status, text } = await fetchText(path);
  if (status < 200 || status >= 400) {
    throw new Error(`${url} returned ${status}`);
  }
  requireMatch(`${path} title`, text, /<title>[^<]{8,}<\/title>/i);
  rejectMatch(`${path} noindex`, text, /<meta[^>]+robots[^>]+noindex/i);
  rejectMatch(`${path} legacy copy`, text, /reefmt\.com|stack trace|ngrok/i);
  return text;
}

async function checkStatus(path, allowedStatuses) {
  const { url, status, text } = await fetchText(path);
  console.log(`${path} -> ${status}`);
  if (!allowedStatuses.includes(status)) {
    throw new Error(`${url} returned unexpected status ${status}`);
  }
  return { status, text };
}

function requireSitemapUrl(sitemapText, path) {
  const normalizedBase = baseUrl.replace(/\/$/, '');
  const escaped = `${normalizedBase}${path}`.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  requireMatch(`sitemap includes ${path}`, sitemapText, new RegExp(`<loc>${escaped}<\\/loc>`, 'i'));
}

console.log('== Mercasto public SEO audit ==');
console.log(`BASE_URL=${baseUrl}`);

const home = await checkPage('/');
await checkPage('/listings');

requireMatch('home description', home, /<meta[^>]+name=.description.[^>]+content=.{40,220}/i);
requireMatch('home canonical', home, /<link[^>]+rel=.canonical.[^>]+https:\/\/mercasto\.com\/?/i);
requireMatch('home Open Graph title', home, /<meta[^>]+property=.og:title./i);
requireMatch('home Open Graph description', home, /<meta[^>]+property=.og:description./i);
requireMatch('home structured data', home, /application\/ld\+json|schema\.org/i);

const robots = await checkStatus('/robots.txt', [200, 403, 404]);
if (robots.status === 200) {
  requireMatch('robots content', robots.text, /User-agent:|Sitemap:/i);
}

const sitemap = await checkStatus('/sitemap.xml', [200, 403, 404]);
if (sitemap.status === 200) {
  requireMatch('sitemap content', sitemap.text, /<urlset|<sitemapindex/i);

  const legalPagePaths = [
    '/como-funciona',
    '/seguridad',
    '/ayuda/publicar-anuncio',
    '/ayuda/comprar-y-contactar',
    '/tarifas',
    '/sobre-mercasto',
    '/terminos',
    '/privacidad',
    '/cookies',
    '/contacto',
    '/ayuda',
    '/reembolsos/',
    '/moderacion/',
  ];

  if (/<sitemapindex/i.test(sitemap.text)) {
    // Sitemap index: legal pages live in the referenced sub-sitemap, not inline.
    const subSitemapUrls = [...sitemap.text.matchAll(/<loc>([^<]+)<\/loc>/gi)].map((m) => m[1]);
    const mainSitemapUrl = subSitemapUrls.find((u) => /sitemap-main\.xml/i.test(u));
    if (!mainSitemapUrl) {
      throw new Error('sitemap index missing sitemap-main.xml reference');
    }
    const mainPath = new URL(mainSitemapUrl).pathname;
    const { text: mainText } = await fetchText(mainPath);
    legalPagePaths.forEach((path) => requireSitemapUrl(mainText, path));
    rejectMatch('sitemap excludes non-canonical /reembolsos', mainText, /<loc>https:\/\/mercasto\.com\/reembolsos<\/loc>/i);
    rejectMatch('sitemap excludes non-canonical /moderacion', mainText, /<loc>https:\/\/mercasto\.com\/moderacion<\/loc>/i);
  } else {
    legalPagePaths.forEach((path) => requireSitemapUrl(sitemap.text, path));
    rejectMatch('sitemap excludes non-canonical /reembolsos', sitemap.text, /<loc>https:\/\/mercasto\.com\/reembolsos<\/loc>/i);
    rejectMatch('sitemap excludes non-canonical /moderacion', sitemap.text, /<loc>https:\/\/mercasto\.com\/moderacion<\/loc>/i);
  }
}

console.log('public SEO audit OK');
