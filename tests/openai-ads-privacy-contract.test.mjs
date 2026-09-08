import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const dockerfile = fs.readFileSync(new URL('../Dockerfile', import.meta.url), 'utf8');
const compose = fs.readFileSync(new URL('../docker-compose.yml', import.meta.url), 'utf8');
const bridge = fs.readFileSync(new URL('../src/utils/openaiAdsBridge.js', import.meta.url), 'utf8');
const consent = fs.readFileSync(new URL('../src/utils/trackingConsent.js', import.meta.url), 'utf8');
const cookieBanner = fs.readFileSync(new URL('../src/components/CookieBanner.jsx', import.meta.url), 'utf8');
const dashboard = fs.readFileSync(new URL('../src/components/screens/UserDashboard.jsx', import.meta.url), 'utf8');
const app = fs.readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');

 test('production build receives the OpenAI Ads public Pixel ID', () => {
  assert.match(dockerfile, /ARG VITE_OPENAI_ADS_PIXEL_ID=/);
  assert.match(dockerfile, /ENV VITE_OPENAI_ADS_PIXEL_ID=\$\{VITE_OPENAI_ADS_PIXEL_ID\}/);
  assert.match(compose, /VITE_OPENAI_ADS_PIXEL_ID=\$\{VITE_OPENAI_ADS_PIXEL_ID:-\}/);
});

test('OpenAI Ads SDK is not injected before effective tracking consent', () => {
  assert.match(bridge, /function initPixel\(\)[\s\S]*?if \(!isOpenAIAdsMeasurementAllowed\(\)\) return;[\s\S]*?installQueue\(\)/);
  assert.doesNotMatch(bridge, /window\.__mercastoOpenAIAdsBridgeInstalled = true;\s*initPixel\(\);/);
  assert.match(bridge, /if \(allowed\) initPixel\(\)/);
});

test('cookie and privacy choices synchronize effective analytics consent to the server', () => {
  assert.match(consent, /\/api\/user\/privacy\/analytics-consent/);
  assert.match(consent, /analytics_tracking_consent: Boolean\(allowed\)/);
  assert.match(cookieBanner, /persistAnalyticsTrackingConsent\(false\)/);
  assert.match(consent, /serverAllowed = false;[\s\S]*?analytics_tracking_consent === true/);
  assert.match(consent, /typeof rawPreferences === 'string'[\s\S]*?JSON\.parse\(rawPreferences \|\| '\{\}'\)/);
  assert.match(cookieBanner, /privacyAllowsTracking[\s\S]*?persistAnalyticsTrackingConsent\(privacyAllowsTracking\)/);
  assert.match(dashboard, /const allowed = cookieAllowsTracking && newVal;[\s\S]*?if \(!allowed\) notify\(\);[\s\S]*?if \(allowed && synced\) notify\(\)/);
  assert.doesNotMatch(app, /if \(!user\?\.id\) return;[\s\S]{0,180}?persistAnalyticsTrackingConsent/);
  assert.match(consent, /mercasto:analytics-consent-synced/);
  assert.match(app, /addEventListener\('mercasto:analytics-consent-synced'/);
});
