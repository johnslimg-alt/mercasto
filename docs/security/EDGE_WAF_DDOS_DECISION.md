# Edge, WAF, and DDoS decision

Date: 2026-08-07
Owner: Mercasto operations
Status: Cloudflare edge active; origin-lockdown TTL drain in progress

## Verified posture

- Cloudflare is authoritative for `mercasto.com`; apex, www, and API are proxied while mail records stay DNS-only.
- The frontend nginx container remains the only Docker service publishing ports 80 and 443.
- Cloudflare Full (strict), WebSockets, cache bypass, Clip webhook exclusions, automatic DDoS protection, a custom Skip rule, and a conservative edge write-flood limiter are active.
- Nginx trusts `CF-Connecting-IP` only when the TCP peer is one of Cloudflare's published IPv4/IPv6 networks; direct peers cannot spoof that header into the real-IP path.
- DNS-01 renewal is proven and the Certbot host/container renewal paths both have the Cloudflare DNS plugin.
- The host firewall remains dual-stack default-drop, but global web ingress is temporarily retained only while the previous direct-origin A-record TTL drains.
- A direct IPv4 origin probe was observed traversing Docker DNAT/FORWARD, so final origin lockdown must protect both INPUT and DOCKER-USER paths.

## Decision

1. Controlled soft-launch traffic may continue through the active Cloudflare edge.
2. A non-bypassable managed edge is required before broad paid marketing; final origin 80/443 lockdown must complete after the old DNS cache window drains.
3. During the bounded TTL-drain window, nginx origin limits and the host default-drop firewall remain mandatory compensating controls.
4. Traefik must not be enabled for mercasto.com before issue #261. The frontend container continues to own ports 80/443.
5. Provider client-IP headers may be trusted before final firewall lockdown only when trust is explicitly limited to the provider's published source CIDRs. Global or arbitrary proxy trust is forbidden.
6. After the lockdown marker is created, production smoke must require Cloudflare-only web ingress in both INPUT and DOCKER-USER and reject any global web ACCEPT rule.
7. Cloudflare Free does not provide the full managed-rules phase originally planned; broad paid scale still requires either an appropriate managed-rules plan or explicit owner risk acceptance in #408/#272.

## Origin lockdown checklist

- Run `sudo ops/firewall/cloudflare-origin-lockdown.sh preflight`; do not continue unless it reports the current Nginx/CIDR/firewall baseline as safe.
- Wait for the previous 14,400-second direct-A cache window to drain and verify major resolvers no longer return the origin.
- Back up active and persistent IPv4/IPv6 firewall state.
- Preserve global SSH on port 22 and existing internal Docker allowances.
- Allow web ports 80/443 from all current Cloudflare IPv4/IPv6 CIDRs in INPUT.
- Apply the same Cloudflare allowlist in DOCKER-USER, then drop all other forwarded web traffic there.
- Remove global INPUT accepts for ports 80 and 443 and persist both IPv4 and IPv6 rules.
- Create `/etc/mercasto/cloudflare-origin-lockdown` only after the rules are saved successfully; that marker switches live smoke into strict Cloudflare-only enforcement.
- Prove a direct non-Cloudflare request to the origin fails while proxied site/API/TLS/WebSocket/Clip paths remain healthy.
- Run production smoke and live gates.

## Rollback

For a normal firewall-only rollback, run `sudo ops/firewall/cloudflare-origin-lockdown.sh rollback`, then verify public and direct-origin behavior. The apply path also creates a root-only full firewall backup for emergency restoration.

If edge activation or origin lockdown breaks critical flows, restore the backed-up firewall first, remove the lockdown marker, then set affected web records DNS-only or restore the prior Hostinger nameservers if needed. Keep DNS-01 renewal intact and run the complete production smoke suite. Origin nginx limits remain enabled during rollback.
