#!/usr/bin/env bash
set -euo pipefail

shard="${1:?frontend quality shard is required}"
port="${2:?preview port is required}"
base_url="http://127.0.0.1:${port}"
log_file="/tmp/mercasto-${shard}-preview.log"

npm run preview -- --host 127.0.0.1 --port "${port}" >"${log_file}" 2>&1 &
preview_pid=$!
trap 'kill "${preview_pid}" >/dev/null 2>&1 || true' EXIT

for _ in $(seq 1 30); do
  if curl -fsS "${base_url}/" >/dev/null; then
    break
  fi
  sleep 1
done

if ! curl -fsS "${base_url}/" >/dev/null; then
  cat "${log_file}"
  exit 1
fi
case "${shard}" in
  localized-dashboard)
    BASE_URL="${base_url}" CI=1 npx playwright test \
      tests/e2e/notifications-localization.spec.js tests/e2e/communications-control-names.spec.js \
      tests/e2e/shell-localization.spec.js tests/e2e/referral-localization.spec.js \
      tests/e2e/profile-edit-localization.spec.js tests/e2e/chat-localization.spec.js \
      tests/e2e/saved-searches-localization.spec.js tests/e2e/dashboard-locale-format.spec.js \
      tests/e2e/post-edit-localization.spec.js tests/e2e/onboarding-experience-localization.spec.js \
      tests/e2e/onboarding-first-publication.spec.js tests/e2e/admin-operational-localization.spec.js \
      tests/e2e/admin-report-lifecycle.spec.js \
      tests/e2e/response-funnel-measurement.spec.js tests/e2e/message-return-email.spec.js \
      tests/e2e/app-modal-code-splitting.spec.js tests/e2e/seller-landing-language.spec.js \
      --project=chromium-desktop --workers=1 --retries=1 --reporter=list
    ;;
  localized-public)
    BASE_URL="${base_url}" CI=1 npx playwright test \
      tests/e2e/vertical-landing-localization.spec.js tests/e2e/autos-landing-localization.spec.js \
      tests/e2e/empleos-landing-localization.spec.js tests/e2e/inmuebles-landing-localization.spec.js \
      tests/e2e/servicios-landing-localization.spec.js tests/e2e/category-landing-subcategory-localization.spec.js \
      tests/e2e/ad-detail-localization.spec.js tests/e2e/seller-profile-localization.spec.js \
      tests/e2e/storefront-public-copy.spec.js tests/e2e/stores-directory-localization.spec.js \
      tests/e2e/runtime-seo-localization.spec.js tests/e2e/runtime-schema-localization.spec.js \
      tests/e2e/contact-page-localization.spec.js tests/e2e/help-center-localization.spec.js \
      tests/e2e/email-verification-localization.spec.js tests/e2e/not-found-localization.spec.js \
      tests/e2e/geo-source-localization.spec.js tests/e2e/payment-action-localization.spec.js \
      tests/e2e/account-action-localization.spec.js tests/e2e/listing-action-localization.spec.js \
      --project=chromium-desktop --project=chromium-mobile --workers=2 --retries=1 --reporter=list
    ;;
  journey)
    BASE_URL="${base_url}" CI=1 npx playwright test \
      tests/e2e/header-search.spec.js tests/e2e/protected-route-stability.spec.js \
      tests/e2e/publish-draft-recovery.spec.js tests/e2e/search-autocomplete-race.spec.js \
      tests/e2e/home-categories.spec.js tests/e2e/home-auto-quick-filters.spec.js \
      tests/e2e/catalog-route-performance.spec.js tests/e2e/category-seo-quality.spec.js \
      tests/e2e/seller-registration-redirect.spec.js tests/e2e/publish-first-value.spec.js \
      tests/e2e/first-response-return.spec.js tests/e2e/seo-index-hygiene.spec.js \
      --project=chromium-desktop --project=chromium-mobile --workers=1 --retries=0 --reporter=list
    ;;
  critical)
    BASE_URL="${base_url}" CI=1 npx playwright test \
      tests/e2e/catalog-localization.spec.js tests/e2e/ad-detail-critical-path.spec.js \
      tests/e2e/analytics-vendor-activation.spec.js tests/e2e/header-geometry.spec.js \
      --project=chromium-desktop --workers=1 --retries=0 --reporter=list
    ;;
  catalog)
    BASE_URL="${base_url}" CI=1 npx playwright test \
      tests/e2e/catalog-state-matrix.spec.js tests/e2e/header-search-history.spec.js \
      tests/e2e/catalog-filter-state.spec.js tests/e2e/catalog-request-race.spec.js \
      tests/e2e/catalog-map-filter-state.spec.js tests/e2e/catalog-map-responsive.spec.js \
      tests/e2e/map-shell-localization.spec.js tests/e2e/archived-language-fallback.spec.js \
      tests/e2e/category-filter-option-localization.spec.js tests/e2e/ad-card-favorite-tap-target.spec.js \
      tests/e2e/mobile-shell-touch-targets.spec.js \
      --project=chromium-desktop --project=chromium-mobile --workers=1 --retries=1 --reporter=list
    ;;
  webkit-public)
    BASE_URL="${base_url}" CI=1 npx playwright test \
      tests/e2e/webkit-public-smoke.spec.js \
      --config=playwright.config.webkit.js --workers=2 --retries=1 --reporter=list
    ;;
  *)
    echo "Unknown frontend quality shard: ${shard}" >&2
    exit 2
    ;;
esac
