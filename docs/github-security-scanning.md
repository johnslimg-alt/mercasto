# GitHub security scanning

Mercasto is a public GitHub repository. GitHub secret scanning applies automatically to public repositories. Repository CI also keeps local fallback checks for tracked credential artifacts and secret-like PR metadata, including `scripts/repository-sensitive-artifact-scan.sh` and the PR quality gate.

Code scanning is configured in `.github/workflows/codeql.yml` using CodeQL advanced setup for JavaScript/TypeScript. It runs on pull requests to `main`, pushes to `main`, a weekly schedule, and manual dispatch. The workflow uses the `security-extended` query suite and writes results only through the `security-events` permission.

The PHP backend is not declared in this CodeQL workflow because the supported CodeQL language set used by GitHub does not include PHP. PHP continues to be covered by backend PHPUnit, static security contracts, dependency audit, image gates, and production security smokes.

If GitHub changes public-repository availability or an account policy blocks code scanning, the workflow failure is treated as explicit evidence of the blocker rather than silently disabling the repository-local fallback gates.
