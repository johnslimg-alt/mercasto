# Mercasto Post-Recovery Checklist

Purpose: minimum checks after frontend recovery or deploy changes.

## Mobile browser checks

Check on a real iPhone:

1. Safari opens `https://mercasto.com`.
2. Chrome opens `https://mercasto.com`.
3. Refresh works normally.
4. The homepage loads without a critical error screen.
5. Categories and listing cards are visible.

## API checks

These routes should return JSON:

- `/api/categories`
- `/api/ads?page=1`
- `/api/auth/providers`

## Known recovered frontend issues

Watch for these strings:

- `Notification`
- empty React root;
- dynamic import chunk error;
- stale Vite asset;
- service worker cache loop.

## Current recovery fixes to preserve

- inline Notification fallback in `index.html`;
- pre-React Notification fallback in `src/lib/notificationPolyfill.js`;
- service worker unregister logic in `index.html`.

## Workflow checks

1. Production deploy workflows should be manual unless explicitly re-enabled.
2. `Emergency SSH Frontend Deploy` is the preferred manual frontend deploy path.
3. Server-runner workflows are reserve paths until runner health is fixed.
4. Disabled AI workflows should not run automatically.
5. Action failures should map to real failures, not stale workflow noise.

## Avoid during smoke testing

Do not change database schema, auth settings, payment logic, production secrets, or persistent Docker volumes while checking frontend recovery.

## Pass criteria

Recovery is stable when:

- homepage opens on iOS Safari and Chrome;
- API category route returns JSON;
- no critical frontend screen appears;
- workflows are readable and not noisy;
- deploy path is documented.
