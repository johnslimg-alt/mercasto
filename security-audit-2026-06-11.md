# Mercasto — Security Audit
**Дата:** 2026-06-11 · **Тип:** read-only (код, сервер, живые пробы, зависимости). Ничего не изменено.

## Сводка

| # | Находка | Severity | Где |
|---|---------|:--------:|-----|
| 1 | MCP/SSE-bridge без аутентификации открыт в интернет, умеет писать файлы в репозиторий | **CRITICAL** | сервер :8001 |
| 2 | n8n открыт в интернет, образ `:latest`, только app-логин | **HIGH** | сервер :5678 |
| 3 | На хосте нет фаервола (UFW inactive, iptables ACCEPT) | **HIGH** | VPS |
| 4 | Отсутствуют security-заголовки (HSTS/CSP/X-Frame/…) | **MEDIUM** | nginx / mercasto.com |
| 5 | CUPS (печать) слушает публичный интерфейс | **MEDIUM** | сервер :631 |
| 6 | Docker-образы не запинены (`:latest`) | **MEDIUM** | n8n, ollama, autoheal |
| 7 | Админский AI-агент исполняет произвольный SQL | **LOW** | AdController |
| 8 | JSON-ключи фильтров интерполируются в SQL (Laravel экранирует) | **LOW** | AdController/AdIndexController |

Хорошие новости: секретов в репозитории нет, `.env` в gitignore и имеет права 640 root:www-data; внутренние сервисы (Postgres 5432, Redis 6379, Ollama 11434) **не** опубликованы на хост; `composer audit` и `npm audit` — **0 уязвимостей**; `APP_DEBUG=false`, Telescope выключен, Ignition не эксплуатируется.

---

## 1. CRITICAL — Незащищённый MCP/SSE-bridge на :8001

`node scripts/mcp-sse-bridge.cjs` слушает `*:8001` (все интерфейсы) и **доступен из интернета**. Проверка снаружи (`http://72.62.173.145:8001/sse`) выдаёт живую SSE-сессию:

```
event: endpoint
data: https://72.62.173.145:8001/message?sessionId=id0vgwaf76
```

Внутри bridge:
- OAuth-эндпоинты возвращают `access_token: "mock-access-token"` — **аутентификация фиктивная**, принимается что угодно.
- Среди MCP-инструментов есть `apply_auth_route_fix`, который **модифицирует `src/App.jsx` и пишет файлы** в `/var/www/mercasto` (cwd процесса = `/var/www/mercasto`).

**Риск:** любой в интернете может подключиться по MCP/SSE и вызывать инструменты, изменяющие файлы продакшен-кода → дефейс, внедрение бэкдора в фронтенд, потенциальный RCE через последующий деплой/сборку.

**Фикс (срочно):**
1. Немедленно остановить процесс или забиндить на `127.0.0.1:8001` (не `0.0.0.0`/`*`).
2. Добавить аутентификацию (реальный токен), а не mock-OAuth.
3. Закрыть 8001 фаерволом. Этот bridge — инструмент разработки, ему нечего делать на проде вообще.

---

## 2. HIGH — n8n открыт в интернет (:5678)

Контейнер `n8n_ai_agent` (`n8nio/n8n:latest`) опубликован как `0.0.0.0:5678`. Снаружи отвечает 200; `userManagement.authenticationMethod=email`, владелец заведён, `/rest/login` требует логин (401). То есть прямого анонимного доступа нет, но:
- Весь интернет видит логин-форму n8n → brute-force/credential stuffing.
- n8n обычно хранит креды к внешним сервисам и вебхуки; известны RCE-CVE в n8n.
- Образ `:latest` — неконтролируемые обновления.

**Фикс:** забиндить на `127.0.0.1` и ходить через VPN/SSH-туннель, либо за reverse-proxy с auth и IP-allowlist; запинить версию образа; включить фаервол.

## 3. HIGH — Нет хостового фаервола

`ufw status` = inactive, `iptables -S INPUT` = `-P INPUT ACCEPT`. Единственное, что защищает внутренние сервисы — то, что их docker-порты не опубликованы. Любой процесс/контейнер, забиндившийся на `0.0.0.0` (как 8001 и 5678), сразу доступен из интернета.

**Фикс:** включить UFW: разрешить только 22, 80, 443; всё остальное — deny. Это закрывает находки 1, 2, 5 одним движением как defense-in-depth.

## 4. MEDIUM — Отсутствуют security-заголовки

Ответ `https://mercasto.com/` не содержит `Strict-Transport-Security`, `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` (есть только `Server: nginx`).

**Фикс:** добавить в nginx: HSTS (`max-age=31536000; includeSubDomains; preload`), `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY` (или CSP `frame-ancestors`), `Referrer-Policy: strict-origin-when-cross-origin`, базовый CSP. Снижает clickjacking/MIME-sniffing/downgrade-риски.

## 5. MEDIUM — CUPS (:631) на публичном интерфейсе

`cupsd` слушает `0.0.0.0:631` (403 снаружи). Сервис печати на сервере маркетплейса не нужен — лишняя поверхность атаки (исторически в CUPS были RCE).

**Фикс:** `systemctl disable --now cups cups-browsed` или забиндить на localhost; закрыть фаерволом.

## 6. MEDIUM — Незапиненные образы

`n8nio/n8n:latest`, `ollama/ollama:latest`, `willfarrell/autoheal:latest` — невоспроизводимые сборки; `docker compose pull` может затянуть сломанную или скомпрометированную версию. (CLAUDE.md уже требует reproducible builds.)

**Фикс:** запинить по digest/тегу версии.

---

## 7. LOW — Админский AI-агент исполняет произвольный SQL

`AdController::runAgentSelect()` выполняет SQL, сгенерированный LLM. Защищено: `denyNonAdmin()` (role==='admin'), `SET LOCAL statement_timeout='3000ms'`, принудительный `LIMIT 50`. Тем не менее это raw-исполнение: при компрометации админ-аккаунта — произвольное чтение БД.

**Рекомендация:** read-only БД-роль для агента, запрет DDL/DML, логирование запросов.

## 8. LOW — JSON-ключи фильтров в SQL

В публичном `/api/ads`: `$query->where("attributes->{$key}", $value)`, где `$key` из `$request->filters`. Пробы (`'`, `') or (1=1`) вернули 200 без ошибки — **Laravel экранирует JSON-селекторы, инъекция не воспроизводится**. Оставляю как hardening.

**Рекомендация:** валидировать `$key` по allowlist известных атрибутов категории.

---

## Проверено и в порядке
- Секреты: в трекинге только `*.env.example`; `.env` в `.gitignore`, права `640 root:www-data`; в коде хардкоженных ключей нет.
- Внутренние сервисы (Postgres/Redis/Ollama) — только внутри docker-сети, на хост не опубликованы.
- `composer audit` — нет advisories; `npm audit --omit=dev` — 0 уязвимостей.
- `APP_ENV=production`, `APP_DEBUG=false`; Telescope off; `/telescope` и `/_ignition` 200 — это SPA-fallback (ложные срабатывания), не реальные эндпоинты.
- Raw SQL в `ChatController`/`orderByRaw` — параметризован либо константа.

## Рекомендуемый порядок действий
1. **Сейчас:** убить/забиндить на localhost процесс :8001 (находка 1).
2. **Сегодня:** включить UFW (22/80/443), забиндить n8n на localhost (находки 2, 3, 5).
3. **На неделе:** security-заголовки в nginx, запин образов, read-only роль для AI-агента (находки 4, 6, 7).
