export const CONTACT_BUTTON_SOURCE = 'listing_contact_button';

/**
 * Emits the canonical `contact_opened` intent for a seller contact button.
 *
 * The analytics API is injected by the caller so that this module stays free of
 * browser-only imports and can be tested directly. The event always goes through
 * the shared first-party analytics API, so it inherits whatever consent gating
 * that layer applies. Measurement must never be able to break contact, hence the
 * swallowed error.
 */
export function emitContactIntent({
  channel,
  ad = {},
  analytics = null,
  source = CONTACT_BUTTON_SOURCE,
  authenticationState = 'authenticated',
} = {}) {
  const listingId = ad?.id ?? ad?.ad_id ?? '';
  if (!channel || !listingId || typeof analytics?.contactOpened !== 'function') return false;

  try {
    analytics.contactOpened(channel, listingId, ad?.category, {
      source,
      contact_method: channel,
      authentication_state: authenticationState,
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Contact intent must be observable even when the click-logging POST fails, and
 * the POST must not run before the event is emitted. Hence: emit, then post.
 *
 * @param {object} options
 * @param {() => Promise<any>} options.post the existing click-logging request
 */
export function logContactIntent({ post, ...intent } = {}) {
  emitContactIntent(intent);
  if (typeof post !== 'function') return Promise.resolve(false);

  try {
    // A rejected logging request must never surface as an unhandled rejection
    // nor block opening the contact channel.
    return Promise.resolve(post()).catch(() => false);
  } catch {
    return Promise.resolve(false);
  }
}
