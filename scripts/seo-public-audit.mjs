const baseUrl = process.env.BASE_URL || 'https://mercasto.com';

async function fetchText(path) {
  const url = new URL(path, baseUrl).toString();
  const response = await fetch(url, { redirect: 'follow' });
  const text = await response.text();
  return { url, status: response.status, text };
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
}

console.log('public SEO audit OK');
