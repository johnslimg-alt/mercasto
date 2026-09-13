#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

CONTRACT="src/utils/funnelAnalytics.js"
ANALYTICS="src/utils/analytics.js"
META="src/utils/metaCapiBridge.js"
TIKTOK="src/utils/tiktokPixel.js"
APP="src/App.jsx"
# Live auth surface. The AppProviders/AuthContext subtree is unreachable (no
# importers repo-wide, no useAuth consumers) and is slated for removal, so the
# anti-duplication contract is asserted against the module the live app actually
# uses — otherwise deleting that subtree would hollow this gate.
LIVE_AUTH_STATE="src/app/useAuthSessionState.js"
OBSERVER="backend/app/Observers/UserMetaRegistrationObserver.php"
AUTH="backend/app/Http/Controllers/Api/AuthController.php"
TEST="tests/funnel-analytics-contract.test.mjs"
CHANNEL_TEST="backend/tests/Feature/RegistrationConsentChannelsTest.php"
DOC="docs/analytics/funnel-contract.md"

echo "== Unified funnel analytics contract gate =="

# A missing asserted file must be a loud failure. `grep` exits 2 on a missing
# file and an `if` reads that as "no match", which silently hollows every
# negative guard below into a no-op.
for file in "$CONTRACT" "$ANALYTICS" "$META" "$TIKTOK" "$APP" "$LIVE_AUTH_STATE" "$OBSERVER" "$AUTH" "$TEST" "$CHANNEL_TEST" "$DOC"; do
  test -f "$file" || { echo "Missing asserted file: $file" >&2; exit 1; }
done

# Fail-closed negative guards: only exit status 1 (no match) satisfies the
# contract. A missing file, an unreadable file or any other grep error (>= 2)
# fails the gate instead of passing it.
must_not_contain() { # <file> <fixed-string> <message>
  test -f "$1" || { echo "Missing asserted file: $1" >&2; exit 1; }
  local status=0
  grep -qF -- "$2" "$1" || status=$?
  case "$status" in
    0) echo "$3" >&2; exit 1 ;;
    1) return 0 ;;
    *) echo "grep failed (status $status) while checking $1" >&2; exit 1 ;;
  esac
}

grep -qF "export function useAuthSessionState" "$LIVE_AUTH_STATE"

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

must_not_contain "$APP" \
  "events.messageStarted(channel)" \
  "Contact analytics must pass an object, never a raw channel string."

must_not_contain "$APP" \
  'event: `${channel}_click`' \
  "External contact must emit one canonical contact_opened event."

must_not_contain "$META" \
  "sendMappedEvent(EVENT_MAP.sign_up" \
  "Registration must flow through first-party trackEvent exactly once."

# Email registration is emitted exactly once, by the registration fetch
# interceptor in metaCapiBridge.js (see docs/analytics/funnel-contract.md).
# Neither the live auth state module nor App.jsx may add a second emitter for it.
must_not_contain "$LIVE_AUTH_STATE" \
  "events.registered" \
  "The live auth session state must not emit registration events; email sign_up comes from the registration fetch interceptor."

# The email-emitter matcher is shared with the unit contract through
# scripts/funnel-emitter-contract.mjs. A bare regex here matched only
# `method: 'email'`, so the equally valid double-quoted and backtick spellings
# escaped the gate entirely. The module normalizes quote style and whitespace and
# parses the call's argument list; it exits 2 (fail closed) on unreadable input.
if ! node scripts/funnel-emitter-contract.mjs "$APP"; then
  exit 1
fi

node --test "$TEST"
echo "unified funnel analytics contract gate OK"
