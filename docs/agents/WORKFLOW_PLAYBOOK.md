# Mercasto Agent Workflow Playbook

This playbook turns the agent company model into an executable operating rhythm for Mercasto.

## Source-informed practices

The workflow follows these principles:

- Hierarchical orchestration: a manager agent delegates work, validates outputs, and coordinates specialists.
- Checkpointed graph execution: work is broken into resumable milestones with saved state and explicit review points.
- Human-in-the-loop for risky actions: production, payments, secrets, auth, database migrations, and legal changes require owner approval.
- Secure CI/CD: least privilege, secret rotation, dependency review, automated tests, and security scans.
- Manual + automated security review: automation catches common issues, but business logic, auth, payments, and user data need contextual review.

References:

- CrewAI hierarchical process: https://docs.crewai.com/en/learn/hierarchical-process
- CrewAI overview and human-in-the-loop capabilities: https://docs.crewai.com/en/learn/overview
- LangGraph persistence and checkpoints: https://docs.langchain.com/oss/python/langgraph/persistence
- GitHub Actions hardening: https://docs.github.com/en/actions/security-for-github-actions/security-guides/security-hardening-for-github-actions
- OWASP CI/CD Security Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/CI_CD_Security_Cheat_Sheet.html
- OWASP Secure Code Review Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Secure_Code_Review_Cheat_Sheet.html
- OpenSSF GitHub configuration best practices: https://best.openssf.org/SCM-BestPractices/github/

## Operating mode

Mercasto agents operate as a staged graph, not as uncontrolled parallel bots.

```text
Intake
  -> CEO Priority Review
  -> PM Task Breakdown
  -> Specialist Draft
  -> Critique Pass 1
  -> Critique Pass 2
  -> Fix Pass
  -> QA/Security Review
  -> PR or Issue Output
  -> Milestone Supervisor Gate
  -> Human Approval if risky
  -> Merge/Deploy/Monitor
```

## Two-step critique rule

Every meaningful task must pass two critiques before it is considered ready.

### Critique 1: Risk and correctness

Reviewer checks:

- Does it solve the right problem?
- Can it break production?
- Can it expose secrets or user data?
- Can it harm SEO, UX, payments, auth, uploads, or database integrity?
- Is there a rollback path?

### Critique 2: Alternatives and quality

Reviewer checks:

- Is there a simpler implementation?
- Is the design mobile-first?
- Are empty/loading/error states handled?
- Is the copy localized for Mexico Spanish?
- Are tests and smoke checks sufficient?
- Is the result good enough for real users, not just technically complete?

## Milestone gates

### M0: Intake accepted

Required:

- Clear owner goal.
- Business value stated.
- Risk level assigned.
- Responsible lead agent assigned.

### M1: Plan approved

Required:

- Scope defined.
- Files/systems to inspect listed.
- Success metric defined.
- Rollback plan drafted if production-impacting.

### M2: Design accepted

Required for UI/product work:

- UX flow reviewed.
- Mobile layout reviewed.
- Empty/loading/error states included.
- Design Reviewer has completed Critique 1 and Critique 2.

### M3: Implementation reviewed

Required:

- Code reviewed by specialist lead.
- Security-sensitive areas flagged.
- No secrets committed.
- Database changes documented.
- API compatibility checked.

### M4: QA green

Required:

- Unit/API smoke checks listed.
- Main user journey tested.
- Mobile smoke tested.
- Regression risks listed.

### M5: Release ready

Required:

- Snapshot/backup confirmed if server or DB changes.
- Rollback steps documented.
- Monitoring checks listed.
- Human approval captured for risky categories.

## Agent roster requested by owner

### Management and governance

1. CEO Alex — strategy and prioritization.
2. Project Manager — milestones, scope, task breakdown.
3. HR Manager — recruits and deactivates agents.
4. Milestone Supervisor — blocks incomplete checkpoints.
5. Task Dispatcher — converts findings into GitHub issues.
6. Business Auditor — checks economics, risk, and focus.

### Product and design

7. Designer — visual concepts and brand direction.
8. CEO UI — high-level UI quality owner.
9. CEO UX — high-level UX quality owner.
10. UI/UX Specialist — flows, usability, mobile-first checks.
11. Design Reviewer — finds layout, spacing, contrast, hierarchy, and conversion issues.
12. Text Corrector — Spanish/Russian/English copy quality.
13. Translator — Spanish, Russian, English localization.

### Engineering

14. Engineering Architect — system design.
15. React Agent — frontend implementation.
16. Laravel Agent — backend/API implementation.
17. PostgreSQL Agent — schema, indexes, pgvector, query plans.
18. DBA Super Specialist — database optimization and backup/restore quality.
19. AI Agent — AI workflows, RAG, embeddings, prompts.
20. UI Builder — builds UI components.
21. UX Builder — implements UX improvements.
22. Code Reviewer — functional and maintainability review.
23. Auto-Apply Agent — prepares branches and PRs.
24. Auto-Accept Agent — may only merge when rules allow; cannot bypass human approval gates.

### QA and security

25. QA Unit Agent.
26. QA Integration Agent.
27. QA API Agent.
28. QA GUI Agent.
29. QA Regression Agent.
30. Cybersecurity Agent — attacks, ports, secrets, auth, headers, abuse.
31. CEO Cybersecurity — final security owner.
32. APM Telemetry Agent — metrics, traces, logs, alerts.

### Business and growth

33. Accountant — infrastructure/API costs.
34. Economist — unit economics and pricing.
35. CFO/Monetization Agent — Clip, PRO, boosts, revenue.
36. Marketer & SEO — organic and paid growth.
37. CEO Marketing — marketing strategy owner.
38. CEO Ads — paid ads owner.
39. CEO Sales — seller acquisition and sales motion.
40. CEO Economics — market and monetization logic.

### Legal and risk

41. Lawyer — terms, privacy, prohibited items.
42. Notary — formal document and contract review logic.
43. Advocate — dispute and user-protection logic.
44. Legal/Risk Lead — final legal-risk owner.

## Automatic task creation rules

The Task Dispatcher creates GitHub issues when any reviewer finds:

- production mismatch;
- security risk;
- broken route;
- missing mobile state;
- missing smoke test;
- database/index risk;
- poor UX/copy;
- missing monetization path;
- missing analytics event;
- unclear owner or success metric.

## Auto-Apply rules

Auto-Apply may create branches and PRs for:

- documentation;
- copy fixes;
- UI polish with low risk;
- tests;
- smoke scripts;
- non-destructive refactors;
- config alignment that does not touch secrets or public ports.

Auto-Apply must not directly change:

- production secrets;
- payment flows;
- auth/session logic;
- database destructive migrations;
- public network exposure;
- Docker deployment behavior without rollback notes.

## Auto-Accept rules

Auto-Accept may merge only if all are true:

- CI is green.
- Risk is low.
- No secrets or credentials are changed.
- No payments/auth/database destructive changes are included.
- PR includes rollback notes when relevant.
- Milestone Supervisor approves.

Human approval is always required for production deployment and sensitive changes.

## First execution wave

### Wave 1: Safety and sync

Owner: CTO Agent.

Tasks:

- rotate exposed SSH deploy key;
- confirm GitHub matches production;
- validate backups and restore path;
- validate Docker healthchecks;
- validate Reverb through Nginx;
- document environment variables without secrets.

### Wave 2: Marketplace MVP quality

Owner: CPO Agent.

Tasks:

- publish flow audit;
- listing card UX audit;
- search/filter audit;
- mobile-first audit;
- dashboard audit;
- Spanish copy audit.

### Wave 3: Trust and monetization

Owner: COO + CFO Agents.

Tasks:

- verified seller rules;
- fraud reporting workflow;
- listing boost packages;
- PRO seller account rules;
- Clip-only payment UX;
- prohibited items policy.

### Wave 4: Growth launch

Owner: CMO Agent.

Tasks:

- SEO landing pages by state/city/category;
- launch ad angles for Meta/TikTok;
- WhatsApp-first seller acquisition;
- analytics events and dashboards.

## Supervisor checkpoint format

```markdown
# Milestone Supervisor Review

## Milestone

## Status
PASS / BLOCKED

## Critique 1: risk and correctness

## Critique 2: alternatives and quality

## Required fixes

## Approved next step

## Human approval needed?
```
