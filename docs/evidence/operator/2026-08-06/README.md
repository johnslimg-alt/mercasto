# Mercasto operator evidence bundle — 2026-08-06

This bundle converts the remaining claims in issue #292 into current, reviewable evidence.
It records both successful verification and one superseded claim; it does not invent a passing result.

## Production baseline

- Production commit: `bb9eba246e861ca4677202cd6f9ac527bc026278`.
- Production checkout: clean.
- Compose services: 11 total, 0 unhealthy.
- `https://mercasto.com/up`: `ok`.
- Latest standard `deploy_main`: exit 0, including migrations, Laravel cache refresh, nginx reload and `verify_quick`.
- Pre-deploy backup: `predeploy_auth_ui_20260806_205439.dump`, verified with `pg_restore -l` and copied offsite.

## Result summary

| Evidence item | Result | Decision |
| --- | --- | --- |
| Reverb over secure 443 | Verified | Keep active |
| SSL expiry monitoring and renewal | Verified | Keep active |
| PostgreSQL read-only agent role | Verified | Keep active |
| Public MCP SSE claim | Not valid in current topology | Retired, not restored |

No secret values, passwords, application keys, tokens or email addresses are included in this bundle.

## Reverb / WebSocket evidence

Active frontend nginx configuration contains:

- `location /app`;
- `proxy_pass http://mercasto-reverb:8082`;
- HTTP/1.1 Upgrade and Connection headers;
- connection limiting for WebSocket clients.

The Laravel runtime configuration contained a Reverb application key. A TLS WebSocket handshake was then made to `mercasto.com:443` without printing that key.

Sanitized result:

```text
laravel_reverb_key=loaded
websocket_status=HTTP/1.1 101 Switching Protocols
upgrade_header=websocket
connection_header=upgrade
```

The frontend, backend and Reverb containers were running after the probe. This replaces the earlier unverified statement that Reverb was fixed with direct handshake evidence.

## SSL monitoring evidence

The server has three independent renewal/monitoring paths:

- `certbot.timer`: enabled and active;
- monthly `certbot renew --quiet` with frontend reload;
- daily `/usr/local/bin/ssl_check.sh` at 08:00 UTC;
- daily `/usr/local/bin/check-ssl-expiry.sh` at 09:00 UTC.

Both monitor scripts are root-owned and executable. `/etc/ssl_check.env` is root-owned with mode `600`; the Gmail application password is configured. The sender and alert recipient are defined by the monitor without exposing them in this report.

The daily logs show uninterrupted successful checks from 2026-07-28 through 2026-08-06. Current live certificate evidence:

```text
subject=CN = mercasto.com
issuer=C = US, O = Let's Encrypt, CN = YE1
notAfter=Sep 11 00:33:16 2026 GMT
35 days remaining at verification time
```

The manual multi-domain expiry script also completed successfully for Mercasto, AI, MCP and n8n certificate files. This proves monitoring configuration and execution; it does not claim that every certificate is currently attached to a live virtual host.

## PostgreSQL read-only role evidence

The only custom PostgreSQL role is `mercasto_readonly`. Its verified attributes are:

```text
login=true
superuser=false
createdb=false
createrole=false
replication=false
```

After `SET ROLE mercasto_readonly`:

- 57 public-schema objects exposed `SELECT` privilege;
- a read from `public.ads` succeeded;
- `CREATE TABLE public.__mercasto_readonly_probe(...)` failed with `permission denied for schema public` and exit code 3;
- `to_regclass('public.__mercasto_readonly_probe') IS NULL` returned true;
- production `/up` remained `ok`.

The write denial was the expected result. No test object or production data mutation remained.

## MCP SSE claim: superseded and retired

The historical claim that `mcp.mercasto.com/sse` was repaired is not valid in the current production topology:

- DNS resolves `mcp.mercasto.com` to the VPS;
- the old host-nginx MCP site is not enabled and host nginx is inactive;
- no process listens on ports 3000 or 8001;
- the public `/sse` URL returns the normal Mercasto HTML shell, not `text/event-stream`;
- the live certificate presented there covers `mercasto.com`, `www.mercasto.com` and `api.mercasto.com`, not `mcp.mercasto.com`.

The dormant bridge was an ignored, untracked production file with write-capable tools. Its launch scripts targeted a public shell bridge/tunnel and required an explicit high-risk opt-in in one path. It was not restored.

The ignored bridge file was removed from the production checkout and placed in root-only quarantine:

```text
/root/retired-mcp/20260806_210926
owner=root:root, directory mode=700, files mode=600
```

Production stayed healthy and the Git checkout remained clean. The approved MCP direction is the bounded, non-root SSH-agent pattern documented in `docs/mcp-agents.md`, not an unauthenticated public shell SSE endpoint.

## Existing evidence linked by this bundle

- SEO/AEO: issue #270, PRs #414 and #418, Search Console ownership and accepted sitemap evidence.
- Lighthouse/performance: issue #271 and `docs/perf/lighthouse-report.md`.
- Public UI visual QA: issue #286, PR #485, 24 production screenshots.
- Authenticated UI visual QA: PR #486, 9 isolated seller/admin screenshots.
- Auth/account, listing lifecycle and payment/webhook E2E: PR #399, 36/36 passed, 0 failed, 0 skipped.
- Security/privacy/anti-abuse: issue #287 and PRs #400–#407.
- SMS/phone OTP: issues #225 and #260 closed as not planned; UI disabled and endpoints fail closed.
- Legal/business implementation: technical evidence is green; issue #269 remains open for named human owners and policy approval.

The old report of 44 passed and 32 skipped E2E tests is superseded by the isolated 36/36 launch-critical result. The old skipped result is not used to close any launch gate.

## Remaining launch constraints

Closing the evidence tracker does not approve broad paid scale. The following remain outside this bundle:

- #269: human support, moderation, refund/recovery ownership and policy approval;
- #408: VPS-compatible managed CDN/WAF before broad paid campaigns;
- #183: intermittent GitHub Actions backend/runner lane degradation;
- #272: final launch decision and monitoring record.

This bundle is evidence only. It does not make or fabricate those external decisions.
