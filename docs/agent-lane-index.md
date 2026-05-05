# Mercasto Agent Lane Index

Status: active
Owner: production coordination lane

This index maps active autonomous work lanes to the concrete repo artifacts and verification gates that prove progress.

## Global rules

- No lane is complete without a concrete artifact: commit, issue, generated report, script, or captured server output.
- Runtime changes must be small and reversible.
- Server-only tasks stay in `docs/server-command-queue.md` until real VPS output is captured.
- Generated route inventory must come from `bash scripts/route-inventory-gate.sh`.
- Release checks must reference `docs/verification-gates.md`.

## Lanes

| Lane | Primary artifacts | Current gate | Notes |
| --- | --- | --- | --- |
| Route inventory | `docs/route-inventory.md`, `docs/route-inventory-generated.md`, `scripts/export-route-inventory.sh`, `scripts/check-route-inventory-artifact.sh`, `scripts/route-inventory-gate.sh` | `bash scripts/route-inventory-gate.sh` | Needs server-generated snapshot. |
| Verification gates | `docs/verification-gates.md` | `npm run verify:quick` / `npm run verify:prod` | Shared command contract. |
| Server command queue | `docs/server-command-queue.md` | Real VPS output required | Prevents pretending GitHub-only work completed server actions. |
| Docker/backend image | `backend/Dockerfile`, `docs/verification-gates.md` | Compose config + backend build + quick verify | Current baseline is PHP 8.4 FPM. |
| Auth/session/CSRF/request limits | `docs/route-inventory.md`, route inventory snapshot | Route inventory first | Do not patch middleware blindly. |
| Media/upload safety | route inventory snapshot, upload validation audit | Route inventory first | Depends on exact upload routes/controllers. |
| Billing/promotions | route inventory snapshot, billing checklist issues | Route inventory first | Return pages must be documented from real routes. |
| UI/public copy | UI checklist and public copy scan | `npm run smoke:copy` | Keep frontend Spanish-first. |
| Release/CI | GitHub workflow/manual gate docs, verification gates | `workflow_dispatch` + verify scripts | Manual gate only unless deploy automation is explicitly added. |
| Backup/rollback | `docs/server-command-queue.md`, backup visibility output | `npm run verify:quick` before/after | DB restore is separate from code rollback. |

## Immediate next server action

```bash
cd /var/www/mercasto
git pull
bash scripts/route-inventory-gate.sh
npm run verify:quick
git status --short
```

## Immediate next GitHub-only action

If server output is unavailable, continue only with docs/scripts/issues that do not claim server execution.

## Stop conditions

- Any verification gate fails.
- Unexpected files change.
- Route inventory remains placeholder-only after generation.
- Generated artifact is empty.
- A proposed runtime change lacks rollback instructions.
