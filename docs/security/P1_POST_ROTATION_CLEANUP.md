# Mercasto P1 Post-Rotation Security Cleanup

## Purpose
Checklist after rotating tokens, SSH keys, API keys, database passwords, webhook secrets, or deployment credentials.

## Safety rules
- Do not commit secrets.
- Do not paste secrets into Git, issues, chat, frontend code, templates, screenshots, or logs.
- Revoke old credentials after the new credential works.

## Required checks
- Verify homepage, login, listings, account, and API endpoints.
- Verify deployment access after SSH/GitHub token changes.
- Verify payment webhook and checkout after payment secret changes.
- Search repo for accidental secrets.
- Search public UI for MVP, internal provider wording, debug/test fragments, and stack traces.
- Check logs for full passwords, API keys, tokens, private keys, webhook secrets, or session IDs.

## Public payment copy
- Pago con tarjeta.
- Pago en efectivo en OXXO.
- Métodos de pago disponibles al finalizar.

## Completion criteria
Rotation cleanup is complete only when new secret works, old secret is revoked, no tracked files/logs expose secrets, and P1 smoke checks pass.
