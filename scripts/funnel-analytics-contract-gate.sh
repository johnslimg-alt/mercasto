#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

CONTRACT="src/utils/funnelAnalytics.js"
ANALYTICS="src/utils/analytics.js"
META="src/utils/metaCapiBridge.js"
TIKTOK="src/utils/tiktokPixel.js"
APP="src/App.jsx"
OBSERVER="backend/app/Observers/UserMetaRegistrationObserver.php"
AUTH="backend/app/Http/Controllers/Api/AuthController.php"
TEST="tests/funnel-analytics-contract.test.mjs"
CHANNEL_TEST="backend/tests/Feature/RegistrationConsentChannelsTest.php"
DOC="docs/analytics/funnel-contract.md"

echo "== Unified funnel analytics contract gate =="

for file in "$CONTRACT" "$ANALYTICS" "$META" "$TIKTOK" "$APP" "$OBSERVER" "$AUTH" "$TEST" "$CHANNEL_TEST" "$DOC"; do
  test -f "$file"
done

grep -qF "FUNNEL_ANALYTICS_VERSION = '2026-08-04'" "$CONTRACT"
grep -qF "LISTING_PUBLISHED: 'listing_published'" "$CONTRACT"
grep -qF "LISTING_VIEWED: 'listing_viewed'" "$CONTRACT"
grep -qF "CONTACT_OPENED: 'contact_opened'" "$CONTRACT"
grep -qF "MESSAGE_SENT: 'message_sent'" "$CONTRACT"
grep -qF "platform: 'web'" "$ANALYTICS"
grep -qF "analytics_contract_version: FUNNEL_ANALYTICS_VERSION" "$ANALYTICS"
grep -qF "adViewed: listingViewed" "$ANALYTICS"
grep -qF "adPosted: listingPublished" "$ANALYTICS"
grep -qF "trackEvent(FUNNEL_EVENTS.SIGN_UP" "$META"
grep -qF "contact_opened: { endpoint: 'contact'" "$META"
grep -qF "contact_opened: 'Contact'" "$TIKTOK"
grep -qF "events.contactOpened(channel, ad.id" "$APP"
grep -qF "api/auth/phone/verify" "$OBSERVER"
grep -qF "api/auth/telegram/callback" "$OBSERVER"
grep -qF "api/auth/*/callback" "$OBSERVER"
grep -qF "registration_event_id" "$AUTH"
grep -qF "assertJsonPath('is_new_user', true)" "$CHANNEL_TEST"

if grep -qF "events.messageStarted(channel)" "$APP"; then
  echo "Contact analytics must pass an object, never a raw channel string." >&2
  exit 1
fi

if grep -qF 'event: `${channel}_click`' "$APP"; then
  echo "External contact must emit one canonical contact_opened event." >&2
  exit 1
fi

if grep -qF "sendMappedEvent(EVENT_MAP.sign_up" "$META"; then
  echo "Registration must flow through first-party trackEvent exactly once." >&2
  exit 1
fi

if grep -qF "events.registered({ event_id: metaEventId })" src/contexts/AuthContext.jsx; then
  echo "Email registration is already tracked by the patched fetch and must not be duplicated." >&2
  exit 1
fi

node --test "$TEST"
echo "unified funnel analytics contract gate OK"
