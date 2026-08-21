#!/usr/bin/env bash
set -euo pipefail

domain="${REEF_COURIER_DOMAIN:-courier.mercasto.com}"
cert_dir="/etc/letsencrypt/live/${domain}"
fullchain="${cert_dir}/fullchain.pem"
privkey="${cert_dir}/privkey.pem"
credentials="${CLOUDFLARE_CERTBOT_CREDENTIALS:-/etc/letsencrypt/cloudflare.ini}"
min_valid_seconds="${REEF_CERT_MIN_VALID_SECONDS:-604800}"

cert_valid() {
  [ -s "$fullchain" ] && [ -s "$privkey" ] && \
    openssl x509 -in "$fullchain" -noout -checkend "$min_valid_seconds" >/dev/null 2>&1 && \
    openssl x509 -in "$fullchain" -noout -ext subjectAltName 2>/dev/null | grep -Fq "DNS:${domain}"
}

if cert_valid; then
  echo "Courier TLS prerequisite ready: ${domain}"
  exit 0
fi

run_privileged() {
  if [ "$(id -u)" -eq 0 ]; then
    "$@"
  else
    sudo -n "$@"
  fi
}

if ! run_privileged test -r "$credentials"; then
  echo "Cloudflare Certbot credentials are unavailable: ${credentials}" >&2
  exit 1
fi

echo "Courier certificate missing or expiring; provisioning ${domain}."
run_privileged certbot certonly \
  --dns-cloudflare \
  --dns-cloudflare-credentials "$credentials" \
  --dns-cloudflare-propagation-seconds 30 \
  --cert-name "$domain" \
  -d "$domain" \
  --non-interactive \
  --agree-tos \
  --register-unsafely-without-email \
  --keep-until-expiring

if ! cert_valid; then
  echo "Courier TLS prerequisite validation failed for ${domain}." >&2
  exit 1
fi

echo "Courier TLS prerequisite provisioned: ${domain}"
