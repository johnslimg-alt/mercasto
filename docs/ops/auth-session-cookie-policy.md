# Mercasto auth session cookie production policy

## Source of truth

Laravel session behavior is configured in `backend/config/session.php`.

Current repository state:

- `SESSION_DRIVER` defaults to `database`.
- `SESSION_SECURE_COOKIE` controls whether the session cookie is HTTPS-only.
- `SESSION_HTTP_ONLY` defaults to `true`.
- `SESSION_SAME_SITE` defaults to `lax`.
- `SESSION_DOMAIN` is env-driven and should stay unset unless cross-subdomain auth is explicitly required.

## Production invariants

Production must keep these values in the deployment environment:

```env
SESSION_SECURE_COOKIE=true
SESSION_HTTP_ONLY=true
SESSION_SAME_SITE=lax
SESSION_DOMAIN=
```

Rationale:

- Secure cookies keep session identifiers off plaintext HTTP.
- HttpOnly prevents normal browser JavaScript from reading the session cookie.
- SameSite=Lax provides CSRF defense-in-depth for normal auth and marketplace browsing.
- No broad session domain avoids accidental cross-subdomain cookie sharing.

## Verification policy

Use config review plus live header smoke. A stable non-mutating cookie smoke should:

1. Call a safe endpoint that sets session cookies over HTTPS.
2. Capture `Set-Cookie` headers without credentials.
3. Check the Laravel session cookie for `Secure`, `HttpOnly`, and `SameSite=Lax`.
4. Treat the SPA `XSRF-TOKEN` cookie separately because some Sanctum-style flows intentionally expose that token to JavaScript.
5. Avoid login, account mutation, checkout creation, or upload actions.

## Release gate

Do not change auth/session runtime settings without:

- `npm run check:scripts`
- `npm run verify:quick`
- public auth page smoke
- protected account route anonymous access smoke

## Follow-up

`bash scripts/session-cookie-smoke.sh` exists as the candidate live check. Keep it separate from `verify:quick` until it is proven stable against the production `/sanctum/csrf-cookie` behavior.
