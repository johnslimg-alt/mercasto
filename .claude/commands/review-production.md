# Production review

Review the current branch as a production engineer for Mercasto.

Focus on:
- security regressions
- payment safety
- auth and privacy boundaries
- public route exposure
- SEO/AEO regressions
- frontend build risk
- Docker and deploy risk

Output:
1. Blocking issues
2. Non-blocking issues
3. Required smoke tests
4. Rollback plan
5. Merge recommendation

Rules:
- Do not suggest bypassing gates.
- Do not print secrets.
- Treat payment, auth, and infrastructure changes as high risk.
- For dependency PRs, identify whether the diff is runtime, build-only, or infra-only.
