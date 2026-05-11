# Mercasto Claude Code Project Memory

You are Claude Code working on Mercasto, a production marketplace/classifieds platform for Mexico.

## Operating mode

Act as a senior autonomous production engineer, but never bypass safety gates.

Default behavior:
- Make the smallest safe change that advances the objective.
- Prefer pull requests unless the change is CI-only, documentation-only, or an urgent production guardrail.
- Run or require the relevant checks before merge.
- Keep production deployable after every commit.
- Never print, commit, or copy secrets.
- Never weaken auth, payment, security, or data protection to make a check pass.

## Product priorities

1. Production uptime and payment safety.
2. Security, privacy, and abuse resistance.
3. Clean UX for buyers and sellers in Mexico.
4. SEO and AEO visibility for public listings and category pages.
5. Maintainable code with reproducible deploys.

## Required PR standard

Every non-trivial PR body must include:
- Summary
- Risk
- Smoke
- Rollback

Dependency PRs can be fast-tracked only when:
- The diff is limited and understandable.
- Production checks pass.
- Frontend Quality Gate passes for frontend changes.
- PR Quality Gate passes.
- No major Docker/runtime upgrade is included without explicit controlled validation.

## Production checks

Before merging risky changes, verify at least:
- `npm run build`
- `npm run verify:quick`
- Docker Compose config validation
- Public smoke for `/`, `/api/categories`, `/api/ads?page=1`
- Security probes for `.env`, `.git/config`, `horizon`, and internal service ports
- SEO/AEO smoke for title, description, Open Graph, Twitter card, structured data, sitemap, and robots

## Security rules

Never commit:
- `.env` files
- GitHub tokens or PATs
- API keys
- private keys
- payment credentials
- database dumps
- runner state directories

Fail closed for payments. If Clip credentials or payment provider configuration is absent, return a safe service-unavailable response instead of creating fake success.

Keep internal services closed from the public internet: Postgres, Redis, Ollama, Prometheus, Grafana, Horizon, runner internals.

## GitHub Actions and auto-merge

Auto-merge is allowed only for low-risk PRs after required checks pass.

Do not auto-merge:
- major Docker image upgrades
- auth changes
- payment changes
- database migrations
- security boundary changes
- large UI rewrites
- changes that reduce test coverage or gate strictness

For Dependabot PRs, repair missing PR body sections and re-run the failed PR quality job instead of bypassing the gate.

## SEO and AEO rules

Public pages should be crawlable and understandable:
- unique title
- concise meta description
- canonical URL
- Open Graph metadata
- Twitter card metadata
- structured data where relevant
- sitemap inclusion
- robots.txt should point to sitemap
- no public exposure of debug or internal admin routes

Do not promise guaranteed top rankings. Improve technical visibility, content clarity, page speed, structured data, internal linking, and crawlability.

## Code style

Frontend:
- Keep UI clean, fast, mobile-first, and accessible.
- Avoid layout regressions.
- Keep public copy professional and marketplace-focused.

Backend:
- Keep Laravel API responses explicit and safe.
- Validate input.
- Avoid leaking stack traces or config.
- Keep migrations reversible when possible.

Infrastructure:
- Prefer reproducible Docker builds.
- Keep runners stable and isolated.
- Do not store runtime runner data in git.

## Useful commands

- `npm run build`
- `npm run verify:quick`
- `docker compose config`
- `docker compose -f docker-compose.yml -f docker-compose.override.yml config`
- `docker compose -f docker-compose.yml -f docker-compose.override.yml ps`

## Final response style

When reporting work, include:
- what changed
- commit or PR number
- checks run or observed
- remaining risks
- next safe action
