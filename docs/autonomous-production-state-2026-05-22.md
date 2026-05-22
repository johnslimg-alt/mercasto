# Mercasto autonomous production state — 2026-05-22

## Current production status

Production was recovered and verified green after the Hostinger limitation and Traefik port conflict incident.

Last known live checks reported:

- `UP=200` for `https://mercasto.com/up`.
- `VERIFY_EXIT=0` for `bash scripts/server-operator.sh verify_quick`.
- `mercasto_frontend_container` healthy and publishing host ports `80` and `443`.
- Backend, Postgres, Redis, Reverb and core runtime containers healthy.
- Public route, SEO, cache, copy, manifest, security and business profile smoke gates passed.

## Production architecture invariant

Until a separate Traefik migration is completed, Mercasto uses direct nginx/frontend ownership of host ports `80/443`.

Expected invariant:

```text
mercasto_frontend_container ... 0.0.0.0:80->80/tcp ... 0.0.0.0:443->443/tcp
```

Do not enable host-level Traefik for `mercasto.com` under the current topology. If Traefik is enabled while frontend also publishes `80/443`, public smoke checks can return `404` or `000` and the frontend may fail to bind ports.

Tracked in:

- Issue #261 — Architecture decision: keep direct nginx 80/443.
- `scripts/port-ownership-smoke.sh`.
- `npm run smoke:port-ownership` wired into `smoke:all`, `verify:quick`, and `gate:prod`.

## GitHub MCP status

GitHub MCP is configured through Docker using the official GitHub MCP server image and environment-variable token propagation.

Current local Cline settings pattern:

```json
{
  "command": "docker",
  "args": [
    "run",
    "-i",
    "--rm",
    "-e",
    "GITHUB_PERSONAL_ACCESS_TOKEN",
    "ghcr.io/github/github-mcp-server"
  ]
}
```

Token must stay outside the JSON file and be supplied through environment variables.

## Recent autonomous commits

Important commits created through GitHub MCP:

- `b1898a6c570cb2f127ed95ead575cd6c03c5cdba` — stabilize business profile smoke.
- `c61b4bdf3b89704d6a6158835c955219e4830f87` — add port ownership smoke.
- `9129f087befa5fff8e1561bb0224667bde907414` — wire port ownership smoke.
- `312e661f7d027030d6496b6f508c9fa8c7cd3ac4` — scope port smoke to live server.
- `13ffef8d0ac072348d566ad833c645bc3e5e12ee` — add SMS launch readiness contract.
- `b40dad87427bb278bde4055d6486a26155d130c6` — harden SMS readiness smoke.
- `d449427b1340443e371ec89145174923b78ac208` — add OTP abuse control gate.
- `f8b9741937f0555e3cd01df11ba5fea3f8c9a726` — wire OTP abuse control gate.

## Open tracking issues

- Issue #260 — Launch blocker: configure SMS OTP provider and pass `verify:launch`.
- Issue #261 — Architecture decision: keep direct nginx `80/443`.
- Issue #262 — Ops: sync production after autonomous GitHub MCP commits.

## Server sync command

When syncing production after repo commits, run migrations inside the backend container, not directly on the host. The Laravel `.env` uses `DB_HOST=postgres`, which resolves inside the Docker network.

Safe command:

```bash
ssh mercasto "cd /var/www/mercasto && git fetch origin main && git reset --hard origin/main && docker exec mercasto_backend_container php artisan migrate --force && bash scripts/server-operator.sh verify_quick; echo VERIFY_EXIT=\$?"
```

Expected result:

```text
INFO  Nothing to migrate.
VERIFY_EXIT=0
```

## Launch blockers remaining

### SMS OTP readiness

Current strict launch remains blocked until production SMS provider secrets are configured and `verify:launch` passes.

Required final checks:

```bash
REQUIRE_SMS_READY=1 npm run smoke:sms-readiness
npm run verify:launch
```

Expected pass:

```text
sms_provider=ready
VERIFY_EXIT=0
```

The current preferred provider candidate is Twilio Verify, unless a better Mexico-specific commercial provider is selected.

### OTP abuse controls

Static guard exists in `scripts/otp-abuse-control-gate.sh`. Before final launch, ensure runtime behavior covers:

- per-IP throttling,
- per-phone throttling,
- per-account throttling,
- cooldown between sends,
- max verification attempts,
- no provider secret leakage in logs.

## Product polish backlog after launch gates

Proceed in this order after production stays green:

1. Listing detail map and public location display hardening.
2. Telegram contact CTA on listing detail where provider data exists.
3. AI description cost control: prefer local Ollama fallback for high-volume/free path.
4. SEO/AEO structured data expansion and sitemap validation.
5. Marketplace trust polish: profile completeness, business badges, reporting UX.

## Safety rules for autonomous agents

- Do not enable Traefik on `80/443` for `mercasto.com` unless issue #261 is completed.
- Do not run Laravel migrations on the host; use `docker exec mercasto_backend_container php artisan migrate --force`.
- Do not print secrets in logs.
- Do not commit `.env` values, tokens, provider keys, or Hostinger credentials.
- After every production sync, require `UP=200` and `VERIFY_EXIT=0` before continuing.
- Treat `verify:launch` as the final launch gate, not `verify:quick`.
