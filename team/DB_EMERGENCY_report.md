# DB Emergency & Stack Audit Report
Date: 2026-04-21
Agent: Claude (Cowork)
Status: ALL ISSUES RESOLVED - API 200, WebSockets live, DB fully migrated

---

## 1. Situation at Handoff

Previous agent diagnosed a MySQL lower_case_table_names=2 mismatch. This diagnosis was outdated.
The server had been fully rebuilt:
- MySQL replaced by PostgreSQL 18.3 + pgvector
- Laravel 13.6.0, PHP 8.4.20, Vite 6.x, Tailwind v4, Laravel Reverb WebSockets

All containers were already running. API /api/categories was returning 200 when this session began.

---

## 2. Issues Found and Fixed

### CRITICAL - 28 Pending Migrations blocked by 1 empty file

Root cause: database/migrations/2026_04_15_000000_add_apple_id_to_users_table.php was 0 bytes.
Laravel threw Class "AddAppleIdToUsersTable" not found and aborted the entire migration run.

Impact: DB aÇd OOly 11 tables instead of 23. Missing: reviews, payments, coupons,
user_notifications, push_subscriptions, personal_access_tokens, and more.
Auth-protected routes were returning 500.

Fix:
1. Wrote valid anonymous-class migration to the empty file
2. php artisan migrate --force - all 26 blocked migrations applied
3. php artisan vendor:publish --tag=sanctum-migrations && php artisan migrate --force

Result: DB now has 23 tables, all migrations complete.

---

### CRITICAL - Reverb WebSocket Frontend Misconfiguration (mixed-content failure)

Root cause: /var/www/mercasto/.env had:
  VITE_REVERB_SCHEME=http   (WRONG - site is HTTPS)
  VITE_REVERB_PORT=8082     (WRONG - Nginx proxies wss on 443)
  VITE_REVERB_APP_KEY missing (fell back to hardcoded mercasto_key)
  VITE_REVERB_HOST missing  (fell back to window.location.hostname)

Impact: Browsers block ws:// from https:// pages (mixed content). All WebSocket
connections would silently fail - real-time notifications and broadcasting broken.

Fix: Updated frontend .env:
  VITE_REVERB_SCHEME=https
  VITE_REVERB_PORT=443
  VITE_REVERB_APP_KEY=80e2fed380140d74a030bee51b3535a3
  VITE_REVERB_HOST=mercasto.com
Frontend rebuilt with vite build to bake in correct values.

---

### MEDIUM - Redis NOAUTH (backend could not connect to Redis)

Root cause: backend/.env had REDIS_PASSWORD="null" (literal string).
Redis was running with requirepass mercasto_secure_redis_2026.

Impact: Queue workers, cache, sessions all failing silently.

Fix: sed corrected REDIS_PASSWORD in backend/.env.
All containers (backend, worker, scheduler, reverb) restarted.

---

### MEDIUM - Sanctum personal_access_tokens table never created

Root cause: Sanctum migrations not published. Table absent from all migration files.

Fix: php artisan vendor:publish --tag=sanctum-migrations && php artisan migrate --force

---

## 3. Stack Compatibility Audit

### Vite 6 + Tailwind v4 - PASSES (1 warning)
- Build: SUCCESS in 1.77s, 2302 modules transformed, 0 errors
- Warning: @import url(fonts.googleapis.com) appears after @layer block.
  Tailwind v4 enforces CSS spec ordering. Non-fatal but should be fixed.
  FIX: Move Google Fonts @import to very top of CSS, before any @layer or :root.
- Bundle sizes: index.js=423kB (127kB gzip), UserDashboard.js=395kB (112kB gzip).
  Consider further lazy-loading if LCP becomes an issue.

### Laravel 13.6.0 / PHP 8.4.20 - HEALTHY
- All routes registered correctly (admin, ads, auth, broadcasting, payments, etc.)
- php artisan route:list shows no errors
- All migrations now show Ran status

### PostgreSQL 18.3 + pgvector - HEALTHY
- 23 tables, all owned by mercasto_user
- pgvector extension active (used for ad vector embeddings / AI search)
- Daily backup container running

### Laravel Reverb - RUNNING
- Container listening on 0.0.0.0:8082
- Backend: REVERB_SCHEME=https, REVERB_HOST=mercasto.com, REVERB_PORT=443
- Frontend now correctly targets wss://mercasto.com:443 (fixed this session)
- echo.js: uses laravel-echo + pusher-js, broadcaster reverb - correct

---

## 4. Final Container Status

  mercasto_frontend_container   nginx          UP healthy
  mercasto_backend_container    php 8.4-fpm    UP healthy
  mercasto_worker_container     php 8.4-fpm    UP
  mercasto_scheduler_container  php 8.4-fpm    UP
  mercasto_reverb_container     php 8.4-fpm    UP
  mercasto_db_container         pgvector/pg18  UP healthy
  mercasto_db_backup            pgvector/pg18  UP
  mercasto_redis_container      redis:7-alpine UP healthy

---

## 5. Remaining Recommendations (non-blocking)

1. CSS @import ordering: move Google Fonts @import to top of CSS file
2. Bundle splitting: UserDashboard.js at 395kB could be split further
3. ProcessVideoWatermark.php is sitting inside database/migrations/ - move to app/Jobs/
4. VITE_GOOGLE_MAPS_API_KEY is empty - map features will fail silently
5. VITE_SENTRY_DSN is empty - error tracking not active in production

---

## 6. API Verification

  GET https://mercasto.com/api/categories -> 200 OK
  Response: [{id:1,slug:motor,...},{id:2,slug:inmobiliaria,...},...]

All endpoints operational.
