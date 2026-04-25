# Mercasto AI Agent Company Operating Model

This document defines how Mercasto should use AI agents as a controlled operating system for product, engineering, growth, moderation, security, and support.

The goal is not to create uncontrolled bots. The goal is to create a scalable command structure where one CEO agent and one HR agent can coordinate many specialist agents safely, with clear approvals, quality gates, and production protections.

## Core principle

Mercasto may scale to many agents, but only a small number of agents may make decisions that affect production.

Every agent must have:

- a role;
- a mission;
- allowed tools;
- forbidden actions;
- output format;
- quality checklist;
- escalation path;
- owner agent.

## Command hierarchy

```text
Owner / Human
  └── CEO Agent
      ├── HR Agent
      │   ├── Recruiter Agent
      │   ├── Training Agent
      │   └── Performance Reviewer Agent
      ├── CTO Agent
      │   ├── Backend Lead Agent
      │   ├── Frontend Lead Agent
      │   ├── DevOps Lead Agent
      │   ├── Database Lead Agent
      │   ├── AI/ML Lead Agent
      │   └── Security Lead Agent
      ├── CPO Agent
      │   ├── Product Manager Agents
      │   ├── UX Research Agents
      │   └── Design Review Agents
      ├── COO Agent
      │   ├── Moderation Lead Agent
      │   ├── Customer Support Lead Agent
      │   └── Marketplace Operations Agent
      ├── CMO Agent
      │   ├── SEO Agent
      │   ├── Paid Ads Agent
      │   ├── Content Agent
      │   └── Growth Analytics Agent
      ├── CFO Agent
      │   ├── Monetization Agent
      │   ├── Unit Economics Agent
      │   └── Pricing Agent
      └── Legal/Risk Agent
          ├── Privacy Agent
          ├── Terms Agent
          └── Fraud Policy Agent
```

## Scaling model

Do not start with 1000 active agents. Start with a command team and scale by squads.

### Phase 1: 12 core agents

1. CEO Agent
2. HR Agent
3. CTO Agent
4. CPO Agent
5. COO Agent
6. CMO Agent
7. CFO Agent
8. Legal/Risk Agent
9. Security Lead Agent
10. DevOps Lead Agent
11. QA Lead Agent
12. Product Analytics Agent

### Phase 2: 40-60 specialist agents

Create squads for:

- Autos marketplace;
- Real estate marketplace;
- Services marketplace;
- Tourism marketplace;
- Classified goods;
- Seller tools;
- User trust and verification;
- Moderation and fraud;
- SEO and landing pages;
- Mobile/PWA;
- payments and Clip;
- AI photo improvement;
- AI search and recommendations.

### Phase 3: 200-1000 worker agents

Only after the workflow is stable, spawn many narrow agents for repetitive jobs:

- category cleanup;
- SEO page generation;
- listing quality scoring;
- duplicate detection;
- image diagnosis;
- translation;
- moderation review;
- bug triage;
- test case generation;
- analytics summaries;
- content localization by city/state.

Worker agents do not push code directly. They submit findings to lead agents.

## Permission levels

### Level 0: Read-only

Can inspect files, logs, metrics, screenshots, public pages, and documentation.

### Level 1: Draft-only

Can create plans, specs, issue drafts, PR drafts, test plans, and copy.

### Level 2: Branch writer

Can create branches and commits, but cannot merge.

### Level 3: Staging deployer

Can deploy to staging only after tests pass.

### Level 4: Production proposer

Can recommend production deployment, but cannot deploy alone.

### Level 5: Human approval required

Required for:

- production database migration;
- payment changes;
- auth/security changes;
- Docker networking changes;
- domain/DNS changes;
- secrets and env changes;
- destructive cleanup;
- user data export/deletion;
- legal policy publication.

## Non-negotiable rules

1. No agent may push directly to `main`.
2. No agent may deploy production without a snapshot and rollback plan.
3. No agent may edit `.env` secrets in GitHub.
4. No agent may expose PostgreSQL, Redis, Reverb, Grafana, or internal admin services publicly.
5. Every production PR must include smoke tests.
6. Every database migration must include rollback notes.
7. Every feature must include empty states, loading states, error states, and mobile checks.
8. Every monetization change must consider Clip-only payments.
9. Every AI feature must include cost, latency, abuse, and privacy review.
10. Human owner has final decision authority.

## Agent role cards

### CEO Agent

Mission: Convert owner goals into company priorities and enforce focus.

Responsibilities:

- set quarterly priorities;
- decide which verticals matter now;
- prevent feature chaos;
- approve team structure;
- prioritize revenue, trust, and launch readiness.

Output format:

- decision;
- reason;
- top 3 priorities;
- rejected distractions;
- next assigned agents.

### HR Agent

Mission: Build and maintain the agent workforce.

Responsibilities:

- define missing agent roles;
- create role prompts;
- assign agents to squads;
- review agent performance;
- remove low-quality or duplicated agents.

Output format:

- role needed;
- mission;
- tools allowed;
- success metric;
- first task;
- reporting manager.

### CTO Agent

Mission: Keep the technical system coherent, deployable, and secure.

Responsibilities:

- architecture decisions;
- code quality;
- framework compatibility;
- Docker architecture;
- API contracts;
- performance gates.

### CPO Agent

Mission: Build Mercasto into a useful marketplace, not just a technical demo.

Responsibilities:

- product roadmap;
- user journeys;
- category strategy;
- buyer/seller experience;
- trust features;
- mobile-first UX.

### COO Agent

Mission: Make the marketplace operationally safe.

Responsibilities:

- moderation process;
- fraud reports;
- support workflows;
- seller verification;
- dispute handling.

### CMO Agent

Mission: Generate demand and organic traffic.

Responsibilities:

- SEO architecture;
- city/category landing pages;
- content strategy;
- Meta/TikTok/Google campaign briefs;
- tracking and funnel analysis.

### CFO Agent

Mission: Make Mercasto monetizable.

Responsibilities:

- pricing;
- paid listing boosts;
- PRO accounts;
- featured stores;
- Clip payment flows;
- unit economics.

### Legal/Risk Agent

Mission: Reduce legal, privacy, fraud, and platform-policy risk.

Responsibilities:

- terms of service;
- privacy policy;
- prohibited items policy;
- takedown workflows;
- data retention;
- Mexico-specific marketplace compliance review.

## First 30-day agent backlog

### Week 1: Freeze and stabilize

- Snapshot VPS and PostgreSQL.
- Confirm GitHub matches production.
- Verify Docker images are pinned.
- Verify healthchecks.
- Verify Reverb through Nginx only.
- Verify backups restore.
- Verify `.env.example` is accurate without secrets.

Owner: CTO Agent + DevOps Lead Agent + Security Lead Agent.

### Week 2: Marketplace core

- Audit publish flow.
- Audit listing search and filters.
- Audit mobile UX.
- Audit categories.
- Audit image uploads.
- Audit user dashboards.
- Build QA smoke checklist.

Owner: CPO Agent + QA Lead Agent + Frontend Lead Agent + Backend Lead Agent.

### Week 3: Trust and monetization

- Define verified seller rules.
- Define moderation policy.
- Define listing boost packages.
- Define PRO seller account.
- Define Clip payment flow.
- Define fraud-report triage.

Owner: COO Agent + CFO Agent + Legal/Risk Agent.

### Week 4: Growth launch

- Build SEO page plan for Mexico states and cities.
- Create category pages for autos, inmobiliaria, servicios, electronics, furniture, tourism.
- Prepare Meta/TikTok ad angles.
- Prepare WhatsApp-first onboarding.
- Set analytics events.

Owner: CMO Agent + Product Analytics Agent.

## First 12 squads

1. Infrastructure Stability Squad
2. Frontend UX Squad
3. Backend/API Squad
4. Database/Search Squad
5. Reverb/Realtime Squad
6. Security/Fraud Squad
7. Moderation/Trust Squad
8. Payments/Clip Squad
9. SEO/Growth Squad
10. AI Photo/Listing Quality Squad
11. QA/Testing Squad
12. Legal/Compliance Squad

## Task template for agents

```markdown
# Agent Task

## Role

## Objective

## Context

## Files / systems to inspect

## Constraints

## Output required

## Done when

## Risks

## Escalate if
```

## PR requirements for agent-generated work

Every PR must include:

- summary;
- changed files;
- risk level;
- rollback plan;
- smoke tests;
- screenshots if UI changed;
- migration notes if DB changed;
- security notes if auth/payments/uploads changed.

## Definition of done

A task is done only when:

- it is merged or explicitly rejected;
- production risk is known;
- tests or smoke checks are documented;
- follow-up tasks are created;
- no secrets are exposed;
- owner can understand what changed in under 2 minutes.

## Recommended starting command team

Start with these active agents:

- CEO Agent: strategy and prioritization;
- HR Agent: staffing and role creation;
- CTO Agent: architecture and production safety;
- CPO Agent: marketplace product;
- DevOps Agent: Docker, backups, healthchecks;
- Security Agent: auth, ports, headers, abuse;
- QA Agent: smoke tests and regression;
- Growth Agent: SEO, ads, analytics;
- Monetization Agent: Clip, PRO, featured listings;
- Moderation Agent: fraud, prohibited content, reports;
- AI Search Agent: pgvector, embeddings, ranking;
- AI Photo Agent: image scoring and improvement.

## Immediate next decision

The CEO Agent should decide whether Mercasto's next launch priority is:

1. classifieds MVP stability;
2. autos vertical;
3. services vertical;
4. seller PRO tools;
5. AI listing quality.

Recommended answer: classifieds MVP stability first, then Autos and Services.
