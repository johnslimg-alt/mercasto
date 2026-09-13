import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {
  SHARE_CHANNELS,
  QR_CODE_OPTIONS,
  buildCanonicalListingUrl,
  buildShareTargets,
  buildShareUrl,
  buildShareUtmParams,
} from '../src/utils/shareLinks.js';

const ROOT = process.cwd();
const ORIGIN = 'https://mercasto.com';
const LISTING_ID = 6336;
const read = (relative) => fs.readFileSync(path.join(ROOT, relative), 'utf8');

const CHANNELS = ['whatsapp', 'facebook', 'x', 'telegram', 'email', 'copy', 'native', 'qr'];

test('share urls are real server routes, never a #ad- fragment', () => {
  const target = buildShareTargets({ id: LISTING_ID, origin: ORIGIN, title: 'Funda', message: 'Mira esto' });

  for (const channel of CHANNELS) {
    const { url } = target[channel];
    assert.ok(url, `${channel} must produce a share url`);
    assert.equal(url.includes('#'), false, `${channel} must not use a fragment: ${url}`);
    assert.equal(url.includes('#ad-'), false, `${channel} must not use the legacy #ad- fragment: ${url}`);

    const parsed = new URL(url);
    assert.equal(parsed.origin, ORIGIN);
    assert.equal(parsed.pathname, `/share/ads/${LISTING_ID}`);
    assert.equal(parsed.searchParams.size, 5);
  }
});

test('share urls never fall back to window.location.href at the call sites', () => {
  const app = read('src/App.jsx');
  const detail = read('src/components/screens/AdDetailScreen.jsx');
  const shareHandler = app.slice(app.indexOf('const handleShareAd = async'), app.indexOf('const handleClipPayment'));

  assert.equal(app.includes('url: window.location.href'), false);
  assert.equal(app.includes('writeText(window.location.href)'), false);
  assert.equal(shareHandler.includes('window.location.href'), false, 'the share handler must use the shared URL builder');
  assert.match(shareHandler, /buildShareUrl\(\{ id: ad\.id, channel: 'native' \}\)/);
  assert.equal(detail.includes('window.location.href'), false);
  assert.equal(detail.includes('#ad-${ad.id}'), false);
});

test('every channel gets a distinct, well-formed UTM set', () => {
  const seen = new Set();

  for (const channel of CHANNELS) {
    const params = buildShareUtmParams({ id: LISTING_ID, channel });

    assert.deepEqual(Object.keys(params), ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']);
    assert.equal(params.utm_source, channel);
    assert.equal(params.utm_medium, SHARE_CHANNELS[channel].medium);
    assert.match(params.utm_medium, /^[a-z_]+$/);
    assert.equal(params.utm_campaign, 'listing_share');
    assert.equal(params.utm_content, 'ad_detail');
    assert.equal(params.utm_term, `ad_${LISTING_ID}`);

    const url = buildShareUrl({ id: LISTING_ID, channel, origin: ORIGIN });
    assert.equal(seen.has(url), false, `channel ${channel} reuses another channel's url`);
    seen.add(url);
  }

  assert.equal(seen.size, CHANNELS.length);
});

test('utm values are overridable and always url-encoded', () => {
  const url = buildShareUrl({
    id: LISTING_ID,
    channel: 'whatsapp',
    origin: ORIGIN,
    campaign: 'verano 2026',
    content: 'seller dashboard',
    term: 'fundas & forros',
  });

  const parsed = new URL(url);
  assert.equal(parsed.searchParams.get('utm_campaign'), 'verano 2026');
  assert.equal(parsed.searchParams.get('utm_content'), 'seller dashboard');
  assert.equal(parsed.searchParams.get('utm_term'), 'fundas & forros');
  assert.equal(url.includes(' '), false);
});

test('the UTM keys stay compatible with campaignAttribution.js', () => {
  const attribution = read('src/utils/campaignAttribution.js');
  const params = buildShareUtmParams({ id: LISTING_ID, channel: 'facebook' });

  for (const key of Object.keys(params)) {
    assert.ok(attribution.includes(`${key.split('utm_')[1]}: '${key}'`), `campaignAttribution must read ${key}`);
  }
});

test('the QR dialog encodes the same share url as the other channels', () => {
  const target = buildShareTargets({ id: LISTING_ID, origin: ORIGIN, title: 'Funda', message: 'Mira esto' });
  const qrUrl = buildShareUrl({ id: LISTING_ID, channel: 'qr', origin: ORIGIN });

  assert.equal(target.qr.url, qrUrl);
  for (const channel of CHANNELS) {
    const parsed = new URL(target[channel].url);
    assert.equal(`${parsed.origin}${parsed.pathname}`, buildCanonicalListingUrl(LISTING_ID, ORIGIN).replace('/ads/', '/share/ads/'));
  }

  const detail = read('src/components/screens/AdDetailScreen.jsx');
  const qrCall = detail.match(/QRCode\.toDataURL\(([^)]*)\)/);
  assert.ok(qrCall, 'AdDetailScreen must generate the QR code');
  assert.match(qrCall[1], /shareTargets\.qr\.url/);
  assert.deepEqual(QR_CODE_OPTIONS, { width: 300, margin: 2 });
});

test('channel intents all carry the same share url', () => {
  const target = buildShareTargets({ id: LISTING_ID, origin: ORIGIN, title: 'Funda', message: 'Mira esto' });
  const encoded = {
    whatsapp: encodeURIComponent(target.whatsapp.url),
    telegram: encodeURIComponent(target.telegram.url),
    facebook: encodeURIComponent(target.facebook.url),
    x: encodeURIComponent(target.x.url),
    email: encodeURIComponent(target.email.url),
  };

  assert.ok(target.whatsapp.href.startsWith('https://wa.me/?text='));
  assert.ok(target.whatsapp.href.includes(encoded.whatsapp));
  assert.ok(target.telegram.href.startsWith('https://t.me/share/url?url='));
  assert.ok(target.telegram.href.includes(encoded.telegram));
  assert.ok(target.facebook.href.startsWith('https://www.facebook.com/sharer/sharer.php?u='));
  assert.ok(target.facebook.href.includes(encoded.facebook));
  assert.ok(target.x.href.startsWith('https://twitter.com/intent/tweet?'));
  assert.ok(target.x.href.includes(encoded.x));
  assert.ok(target.email.href.startsWith('mailto:?subject='));
  assert.ok(target.email.href.includes(encoded.email));
});

test('an unknown listing id produces no share url instead of a broken one', () => {
  assert.equal(buildShareUrl({ id: '', channel: 'copy', origin: ORIGIN }), '');
  assert.equal(buildShareUrl({ id: 'abc', channel: 'copy', origin: ORIGIN }), '');
  assert.equal(buildShareUrl({ id: 0, channel: 'copy', origin: ORIGIN }), '');
  assert.equal(buildShareUrl({ id: LISTING_ID, channel: 'nope', origin: ORIGIN }).includes('utm_source=copy'), true);
});

test('sharing is never reported as a contact conversion', () => {
  const detail = read('src/components/screens/AdDetailScreen.jsx');
  const analytics = read('src/utils/analytics.js');
  const metaBridge = read('src/utils/metaCapiBridge.js');
  const app = read('src/App.jsx');

  // The share menu must not route through the WhatsApp/contact handler any more.
  assert.equal(detail.includes("handleWhatsAppClick(ad, 'share')"), false);
  assert.equal(detail.includes("handleWhatsAppClick(ad, 'email')"), false);
  assert.equal(app.includes("channel = 'share'"), false);

  // Share surfaces opt out of the delegated click tracker, which would otherwise
  // classify wa.me / mailto: share intents as contact clicks.
  // 7 JSX surfaces: native sheet, channel menu, QR, copy (desktop) + channel sheet, QR, copy (mobile).
  const shareSurfaceCount = (detail.match(/data-analytics-ignore="true"/g) || []).length;
  assert.equal(shareSurfaceCount, 7, `every share surface must opt out of click tracking (found ${shareSurfaceCount})`);
  assert.equal((detail.match(/data-share-channel=/g) || []).length, 2);

  // `share` is its own event and must not be mapped to a Meta Contact event.
  assert.match(analytics, /share: \(channel, listingId, category, params = \{\}\) =>/);
  assert.match(analytics, /trackEvent\('share', listingAnalyticsParams\(/);
  assert.equal(/META_STANDARD_EVENT_MAP = \{[^}]*\bshare:/.test(analytics), false);
  assert.equal(/EVENT_MAP = \{[^}]*\bshare:/.test(metaBridge), false);
  assert.equal(metaBridge.includes("share: { endpoint: 'contact'"), false);

  // Share intents that reuse the WhatsApp/Telegram/email schemes are not contact clicks.
  assert.match(analytics, /isShareIntent/);
  assert.match(analytics, /t\.me\/share\//);
});

test('each share interaction emits exactly one share event', () => {
  const detail = read('src/components/screens/AdDetailScreen.jsx');

  // One channel button == one emitShare call.
  assert.equal((detail.match(/const emitShare = \(channel\) => \{/g) || []).length, 1);
  assert.equal((detail.match(/handleChannelShare\(option\.channel\)/g) || []).length, 2);
  assert.equal((detail.match(/events\.share\(/g) || []).length, 1);

  // Native sheet, clipboard and QR each emit through the same single helper.
  assert.match(detail, /const nativeShare = async \(\) => \{[\s\S]*?emitShare\(result === 'clipboard' \? 'copy' : 'native'\)/);
  assert.match(detail, /const copyShareLink = async \(\) => \{[\s\S]*?emitShare\('copy'\)/);
  assert.match(detail, /const handleShowQR = async \(\) => \{[\s\S]*?emitShare\('qr'\)/);
});
