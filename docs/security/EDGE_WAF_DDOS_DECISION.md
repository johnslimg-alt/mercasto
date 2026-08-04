# Edge, WAF, and DDoS decision

Date: 2026-08-04
Owner: Mercasto operations
Status: approved origin baseline; managed edge required before broad paid traffic

## Verified posture

- DNS currently resolves directly to the Mercasto VPS through the existing authoritative DNS provider.
- No managed CDN or WAF is currently in the request path.
- The frontend nginx container is the only Docker service publishing ports 80 and 443.
- The host firewall uses dual-stack default-drop input policies and permits global inbound traffic only for SSH, HTTP, and HTTPS.
- Database, Redis, queue, AI, and application backend ports are not published publicly.
- Application rate limits protect authentication, listing writes, uploads, payments, contact actions, and AI helpers.
- Security headers, safe errors, upload validation, ownership checks, and bearer-only API auth are automated.

## Decision

1. Direct-origin mode is acceptable only for controlled validation and limited organic traffic.
2. Cloudflare or an equivalent managed edge is required before broad paid marketing or a material traffic increase.
3. Until managed edge activation, nginx origin connection/request limits and the host default-drop firewall are mandatory compensating controls.
4. Traefik must not be enabled for mercasto.com before issue #261. The frontend container continues to own ports 80/443.
5. Provider client-IP headers must not be trusted while the origin is directly reachable. Real-IP restoration is enabled only after the firewall restricts web traffic to published provider ranges.

## Managed edge activation checklist

- Add the zone and change authoritative nameservers through the DNS account owner.
- Proxy apex, www, and API records; keep mail records DNS-only.
- Use Full strict TLS and validate the origin certificate.
- Enable managed WAF, automatic DDoS protection, bot controls, and path-specific rate limits.
- Preserve websocket support and bypass cache for authenticated, API, payment, and webhook routes.
- Restrict origin web ports to provider ranges before trusting provider real-IP headers.
- Verify health, OAuth, payments, webhooks, uploads, websockets, analytics, and rollback.
- Keep provider account identifiers and credentials in the secret manager, never in the repository.

## Rollback

If edge activation breaks critical flows, restore prior DNS, remove real-IP trust, restore the prior firewall allowlist, and run the complete production smoke suite. Origin limits remain enabled during rollback.
