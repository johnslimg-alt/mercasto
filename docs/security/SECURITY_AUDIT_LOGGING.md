# Security audit logging

Mercasto records security-relevant API failures in a dedicated daily channel at `storage/logs/security-YYYY-MM-DD.log`.

## Recorded events

- `auth_rejected`: failed login, registration authentication, OTP, OAuth, or two-factor requests.
- `authentication_required`: protected API access without valid bearer authentication.
- `authorization_denied`: authenticated request denied with HTTP 403, including listing ownership failures.
- `upload_rejected`: invalid or oversized avatar, listing, business, KYC, CSF, or bulk-upload request.
- `webhook_rejected`: failed Clip webhook validation or verification.
- `rate_limited`: HTTP 429 from API abuse controls.

## Data minimization

Raw request bodies are never recorded. Passwords, bearer tokens, cookies, authorization headers, upload contents, provider payloads, email addresses, and raw IP addresses are excluded.

The log contains only:

- event type, HTTP status, method, and route template;
- authenticated actor ID when available;
- route resource parameter and bounded resource ID when available;
- HMAC-SHA256 fingerprints of IP and submitted email for correlation without retaining the original values.

## Retention and access

The `security` channel rotates daily, retains 30 days by default, and creates files with mode `0640`. Access is limited to authorized server operators and the application runtime group. Security logs must not be copied into issues or chat without redaction.

## Investigation

Correlate repeated `email_hash`, `ip_hash`, actor ID, resource ID, status, and route. Compare with nginx 429 entries, firewall counters, payment/webhook audit records, and deployment timestamps. Never reverse fingerprints or enrich them with unrelated personal information.

## Response

For credential attacks, increase or temporarily tighten the existing named limiter rather than blocking broad networks. For ownership probing, preserve event counts and affected resource IDs. For upload abuse, inspect file type/size metrics without opening untrusted payloads. For webhook failures, validate provider status and configuration without logging the webhook body or secret.
