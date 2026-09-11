// Single source of truth for outbound listing share links (SHARE / OpenGraph / UTM).
//
// Every share surface — the five channel buttons, the native share sheet, the
// clipboard and the QR dialog — must build its URL here so that:
//   1. the link a crawler fetches is a real server route (never a `#ad-<id>` fragment,
//      which browsers strip before the request leaves the device),
//   2. the crawler receives the dedicated share card rendered by
//      backend/app/Http/Controllers/ShareAdController.php (`og:type=product`,
//      real listing photo, canonical `og:url`), and
//   3. every visit carries a deterministic, per-channel UTM set that
//      src/utils/campaignAttribution.js already knows how to read.
//
// The share card redirects humans to the canonical listing (see
// buildCanonicalListingPath) while preserving this query string, so attribution
// survives the redirect.

export const SHARE_SITE_URL = 'https://mercasto.com';

// Sensible default taxonomy. Callers may override campaign/content/term per surface
// instead of inventing new values ad hoc.
export const DEFAULT_SHARE_CAMPAIGN = 'listing_share';
export const DEFAULT_SHARE_CONTENT = 'ad_detail';
export const DEFAULT_SHARE_MESSAGE = 'Mira este anuncio en Mercasto';

// Shared with the QR dialog so tests can reproduce the exact encoded payload.
export const QR_CODE_OPTIONS = Object.freeze({ width: 300, margin: 2 });

// utm_source is the channel itself; utm_medium groups channels for reporting.
export const SHARE_CHANNELS = Object.freeze({
  whatsapp: { label: 'WhatsApp', medium: 'social' },
  telegram: { label: 'Telegram', medium: 'social' },
  facebook: { label: 'Facebook', medium: 'social' },
  x: { label: 'X / Twitter', medium: 'social' },
  email: { label: 'Email', medium: 'email' },
  copy: { label: 'Copiar enlace', medium: 'link' },
  native: { label: 'Compartir desde el dispositivo', medium: 'link' },
  qr: { label: 'Código QR', medium: 'qr' },
});

export const SHARE_MENU_CHANNELS = Object.freeze(['whatsapp', 'telegram', 'facebook', 'x', 'email']);

export function normalizeShareChannel(channel) {
  const value = String(channel || '').trim().toLowerCase();
  return Object.prototype.hasOwnProperty.call(SHARE_CHANNELS, value) ? value : '';
}

export function normalizeListingId(value) {
  const id = String(value ?? '').trim();
  return /^[0-9]+$/.test(id) && Number(id) > 0 ? id : '';
}

function normalizeOrigin(origin) {
  const candidate = String(origin || '').trim();
  if (candidate) return candidate.replace(/\/+$/, '');
  if (typeof window !== 'undefined' && window.location?.origin) return window.location.origin;
  return SHARE_SITE_URL;
}

function cleanParam(value, fallback) {
  const candidate = String(value ?? '').trim();
  return candidate || fallback;
}

/** Canonical, indexable listing route (`src/App.jsx` + `SeoShellController::ad`). */
export function buildCanonicalListingPath(id) {
  const listingId = normalizeListingId(id);
  return listingId ? `/ads/${listingId}` : '';
}

/** Crawler-readable share card route (`backend/routes/web.php`). */
export function buildShareCardPath(id) {
  const listingId = normalizeListingId(id);
  return listingId ? `/share/ads/${listingId}` : '';
}

export function buildCanonicalListingUrl(id, origin) {
  const path = buildCanonicalListingPath(id);
  return path ? `${normalizeOrigin(origin)}${path}` : '';
}

/**
 * Deterministic UTM set for one share channel.
 * utm_source   = channel (whatsapp | facebook | x | telegram | email | copy | native | qr)
 * utm_medium   = channel family (social | email | link | qr)
 * utm_campaign = campaign, default `listing_share`
 * utm_content  = share surface, default `ad_detail`
 * utm_term     = `ad_<listing id>` so reports can segment by listing
 */
export function buildShareUtmParams({ id, channel, campaign, content, term } = {}) {
  const shareChannel = normalizeShareChannel(channel) || 'copy';
  const listingId = normalizeListingId(id);
  return {
    utm_source: shareChannel,
    utm_medium: SHARE_CHANNELS[shareChannel].medium,
    utm_campaign: cleanParam(campaign, DEFAULT_SHARE_CAMPAIGN),
    utm_content: cleanParam(content, DEFAULT_SHARE_CONTENT),
    utm_term: cleanParam(term, listingId ? `ad_${listingId}` : 'ad'),
  };
}

/** Absolute, server-rendered share URL for one channel (never contains a fragment). */
export function buildShareUrl({ id, channel = 'copy', origin, campaign, content, term } = {}) {
  const path = buildShareCardPath(id);
  if (!path) return '';
  const query = new URLSearchParams(buildShareUtmParams({ id, channel, campaign, content, term }));
  return `${normalizeOrigin(origin)}${path}?${query.toString()}`;
}

function encode(value) {
  return encodeURIComponent(String(value ?? ''));
}

function shareMessage(message) {
  return String(message ?? '').trim() || DEFAULT_SHARE_MESSAGE;
}

function channelTarget(channel, href, url) {
  return {
    channel,
    label: SHARE_CHANNELS[channel].label,
    medium: SHARE_CHANNELS[channel].medium,
    url,
    href,
  };
}

/**
 * Every share target for one listing, sharing one canonical URL builder.
 *
 * @returns {{
 *   options: Array<{channel: string, label: string, medium: string, url: string, href: string}>,
 *   whatsapp: object, telegram: object, facebook: object, x: object, email: object,
 *   copy: object, native: object, qr: object
 * }}
 */
export function buildShareTargets({ id, origin, title, message, campaign, content, term } = {}) {
  const shareUrlFor = (channel) => buildShareUrl({ id, channel, origin, campaign, content, term });
  const text = shareMessage(message);
  const subject = String(title ?? '').trim() || text;

  const targets = {
    whatsapp: channelTarget('whatsapp', '', shareUrlFor('whatsapp')),
    telegram: channelTarget('telegram', '', shareUrlFor('telegram')),
    facebook: channelTarget('facebook', '', shareUrlFor('facebook')),
    x: channelTarget('x', '', shareUrlFor('x')),
    email: channelTarget('email', '', shareUrlFor('email')),
    copy: channelTarget('copy', '', shareUrlFor('copy')),
    native: channelTarget('native', '', shareUrlFor('native')),
    qr: channelTarget('qr', '', shareUrlFor('qr')),
  };

  targets.whatsapp.href = targets.whatsapp.url
    ? `https://wa.me/?text=${encode(`${text} ${targets.whatsapp.url}`)}`
    : '';
  targets.telegram.href = targets.telegram.url
    ? `https://t.me/share/url?url=${encode(targets.telegram.url)}&text=${encode(text)}`
    : '';
  targets.facebook.href = targets.facebook.url
    ? `https://www.facebook.com/sharer/sharer.php?u=${encode(targets.facebook.url)}`
    : '';
  targets.x.href = targets.x.url
    ? `https://twitter.com/intent/tweet?text=${encode(text)}&url=${encode(targets.x.url)}`
    : '';
  targets.email.href = targets.email.url
    ? `mailto:?subject=${encode(subject)}&body=${encode(`${text}\n${targets.email.url}`)}`
    : '';

  return {
    ...targets,
    options: SHARE_MENU_CHANNELS.map((channel) => targets[channel]),
  };
}
