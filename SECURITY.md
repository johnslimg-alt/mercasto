# Security Policy

## Supported production scope

Mercasto production hardening covers the live production application, deployment automation, CI checks, Docker runtime configuration, and public HTTP/API surface.

The current supported production branch is:

| Branch | Status |
| --- | --- |
| `main` | Supported |

## Reporting a vulnerability

Do not open public issues with secrets, exploit details, private URLs, credentials, tokens, database dumps, or personal data.

Report suspected vulnerabilities privately to the repository owner through GitHub private security reporting when available, or through a trusted private channel already used for Mercasto operations.

Include:

- affected URL, endpoint, workflow, or container;
- exact reproduction steps;
- expected impact;
- screenshots or logs with secrets redacted;
- whether the issue is already exploitable in production.

## Production response priorities

| Priority | Examples | Target response |
| --- | --- | --- |
| Critical | exposed secrets, auth bypass, payment integrity issue, public database/cache access, remote code execution | Immediate triage and production mitigation |
| High | stored XSS, sensitive file disclosure, broken access control, SSRF, unsafe upload path | Same-day triage |
| Medium | reflected XSS, rate-limit gaps, security header gaps, dependency vulnerabilities without known production exploit | Scheduled patch |
| Low | hardening suggestions, informational scan findings, stale docs | Backlog |

## Baseline controls

Mercasto production should maintain these controls:

- public `/`, `/api/categories`, and `/api/ads?page=1` smoke checks must return HTTP 200;
- sensitive files and internal tooling paths such as `/.env`, `/.git/config`, `/backend/.env`, `/composer.json`, `/package.json`, `/horizon`, and `/vendor/horizon` must not be publicly exposed;
- internal services such as database, Redis, Ollama, Prometheus, and cAdvisor must not be publicly reachable;
- dependency updates must pass CI and production smoke checks before merge;
- major dependency updates must not be auto-merged;
- secrets, runner tokens, generated credentials, local `.env` files, runner data, and backups must never be committed;
- `pull_request_target` workflows must not checkout or execute untrusted pull request code.

## Dependency and image updates

Dependency and image updates are handled through:

- Dependabot version updates for npm, GitHub Actions, and Docker;
- scheduled dependency audit artifacts;
- production checks and smoke probes before deployment.

Patch and minor dependency updates may be auto-merge candidates only after required checks pass. Major updates require explicit technical review.

## Secrets handling

If a secret is exposed:

1. Revoke or rotate the secret immediately.
2. Remove it from code and git history where required.
3. Confirm GitHub push protection and secret scanning status.
4. Re-run production smoke and security probes.
5. Record the remediation in the production hardening queue.
