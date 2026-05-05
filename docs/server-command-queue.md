# Mercasto Server Command Queue

Status: active
Owner: production coordination lane

This document lists commands that require an actual VPS shell. GitHub-only agents must not mark these tasks done unless the corresponding server output is captured.

## Queue item 1 — pull latest route inventory tooling

```bash
cd /var/www/mercasto
git pull
git rev-parse --short HEAD
git status --short
```

Expected:

- Repository is updated to latest `main`.
- Current commit is visible.
- Working tree state is known before generated artifacts are produced.

## Queue item 2 — generate route inventory artifact

```bash
cd /var/www/mercasto
bash scripts/route-inventory-gate.sh
```

Expected:

- `docs/route-inventory-generated.md` exists.
- The artifact contains `Mercasto Generated Route Inventory`.
- The artifact contains `Source: php artisan route:list --except-vendor -v`.
- The artifact contains `Commit:`.

## Queue item 3 — quick verification

```bash
cd /var/www/mercasto
npm run verify:quick
```

Expected:

- Shell script syntax check passes.
- Compose checks pass.
- Production smoke passes.
- Security probes pass.
- Route and public copy smoke checks pass.

## Queue item 4 — inspect generated diff

```bash
cd /var/www/mercasto
git status --short
git diff -- docs/route-inventory-generated.md | sed -n '1,220p'
```

Expected:

- Either clean tree or only the generated route inventory artifact changed.
- Generated route inventory contains real Laravel route output, not placeholder text.

## Queue item 5 — commit generated route inventory snapshot if changed

Only run if `docs/route-inventory-generated.md` changed and `npm run verify:quick` passed.

```bash
cd /var/www/mercasto
git add docs/route-inventory-generated.md
git commit -m "docs: update generated route inventory"
git push
```

Expected:

- Route/middleware snapshot is available to auth, media, billing and request-limit lanes.

## Stop criteria

Stop and inspect before committing if any of these occur:

- `git pull` fails.
- `bash scripts/route-inventory-gate.sh` fails.
- `npm run verify:quick` fails.
- Generated route inventory is empty.
- Generated route inventory still contains only placeholder text.
- Unexpected files change.

## Notes

- GitHub-only work can create and update docs/scripts.
- Server command queue items require real terminal output.
- Generated artifacts should only be committed after the verification gate passes.
