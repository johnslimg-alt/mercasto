# Traffic spike and attack runbook

Use this runbook for sudden request growth, credential attacks, scraping, upload abuse, websocket exhaustion, or suspected DDoS activity.

## Confirm impact without changing production

- Check container health, public health endpoint, active connections, host firewall policy, nginx logs, CPU, memory, network usage, queue backlog, and database pressure.
- Capture the exact start time, top paths, response codes, source patterns, and sanitized samples.
- Never paste tokens, cookies, personal data, payment payloads, or request bodies into tickets.

## Classify the event

- **Application abuse:** repeated login, register, publish, upload, contact, checkout, or AI calls. Confirm Laravel/nginx 429 responses.
- **Origin saturation:** high nginx connections, PHP-FPM saturation, queue backlog, or database pressure.
- **Volumetric attack:** bandwidth or connection volume overwhelms the VPS before nginx can respond. Escalate to Hostinger and the managed edge provider immediately.

## Safe immediate actions

1. Verify both IPv4 and IPv6 host firewalls still have default-drop input policies and only intended public ports.
2. Confirm nginx request and connection limits are active in the running frontend container.
3. Pause paid advertising if capacity is impaired or attack traffic is campaign-driven.
4. Temporarily disable expensive nonessential endpoints through a reviewed nginx/Laravel change while preserving health, recovery, payment webhooks, and admin access.
5. Block only clearly malicious sources with time-bounded, documented rules. Never block broad hosting, CDN, or provider address ranges without verification.
6. For volumetric attacks, enable managed-edge emergency protections. When the edge is not yet active, contact Hostinger emergency support and prioritize edge activation.

## Prohibited incident actions

- Do not expose database, Redis, PHP-FPM, Reverb, browser-debug, or monitoring ports.
- Do not enable Traefik for mercasto.com before issue #261.
- Do not trust provider client-IP headers until direct origin access is restricted to provider ranges.
- Do not delete logs, rotate secrets casually, run broad refactors, or restart the database without evidence of a database fault.
- Do not return debug or stack output to users.

## Recovery

Run the complete read-only verification suite and the origin edge security smoke. Confirm normal latency, health/API responses, payment webhook behavior, websocket connectivity, queue health, and absence of unusual 5xx errors.

## Post-incident

Open an incident record with timeline, trigger, impact, mitigations, affected paths, sanitized evidence, and follow-up owners. Convert temporary changes into reviewed repository changes or remove them. Reassess thresholds and accelerate managed-edge activation if the event reached the origin.
