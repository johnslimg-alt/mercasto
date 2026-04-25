# Mercasto Launch Backlog

Owner: CEO Agent + Project Manager + CPO Agent

Purpose: convert the agent operating model into a clear launch plan.

## Launch strategy

Mercasto should launch as one marketplace with focused verticals, not as separate apps.

Priority order:

1. Core classifieds stability.
2. Trust and moderation.
3. Autos vertical.
4. Services vertical.
5. Seller monetization with Clip.
6. SEO and city/category landing pages.

## Phase 0: Production safety gate

Goal: make sure the platform is safe to iterate.

### Must-have

- Access credentials rotated if exposed.
- PostgreSQL backup and restore path verified.
- Smoke test script available.
- PR quality gate active.
- Runbooks available for QA, security, database, product, SEO, and listing quality.
- Internal services remain internal-only.

### Exit criteria

- Smoke checklist can be run by QA.
- No known exposed credentials remain active.
- Backup restore has been verified or tracked as a launch blocker.

## Phase 1: Core classifieds MVP

Goal: users can browse, search, publish, and manage listings reliably.

### Buyer flow

- Homepage loads quickly on mobile.
- Search works.
- Category filter works.
- Listing cards are clear.
- Listing detail page works.
- Contact seller action is visible.
- Report listing action exists or is planned.

### Seller flow

- Register/login works.
- Publish form works.
- Image upload works.
- Listing goes to pending/active state clearly.
- Seller dashboard shows own listings.
- Seller can edit listing.
- Validation messages are friendly Spanish.

### Admin/moderation flow

- Pending listing queue works.
- Admin can approve/reject listings.
- Reports queue works.
- Obvious low-quality listings can be kept out of public feed.

### Exit criteria

- QA smoke test has no P0 failures.
- Top P1 issues are either fixed or explicitly accepted.
- Homepage and primary category pages do not show low-quality placeholder content.

## Phase 2: Trust foundation

Goal: make Mercasto feel safer than random social posts.

### Must-have

- Seller profile page.
- Seller trust indicator.
- Report listing/user flows.
- Basic prohibited-items policy.
- Listing quality review process.
- Clear status labels: pending, active, rejected, archived.
- KYC/admin paths protected.

### Should-have

- Verified seller badge.
- Safe meeting/safe transaction tips.
- WhatsApp contact warning and anti-scam copy.
- Duplicate listing detection later.

### Exit criteria

- Public UX communicates trust.
- Admin has a moderation workflow.
- Security baseline review has no unresolved critical launch blockers.

## Phase 3: Autos vertical

Goal: make Autos the first high-value vertical.

### Must-have filters

- Make/brand.
- Model.
- Year.
- Price.
- Mileage.
- Transmission.
- Location.
- Seller type.

### Must-have UX

- Autos landing page.
- Autos listing card optimized for vehicle details.
- Vehicle detail page fields.
- WhatsApp CTA.
- Trust/safety block.

### Later

- VIN/REPUVE guidance.
- Mechanic inspection partner flow.
- Featured autos package.

### Exit criteria

- Autos pages are useful even with low inventory.
- First seller acquisition script ready.
- Monetization package drafted.

## Phase 4: Services vertical

Goal: make Services the second high-value vertical.

### Must-have categories

- Plomeros.
- Electricistas.
- Aire acondicionado.
- Limpieza.
- Jardinería.
- Reparación de celulares.
- Reparación de computadoras.
- Mudanzas.

### Must-have UX

- Services landing page.
- Provider profile.
- Work photos.
- Area served.
- Contact CTA.
- Trust badge/reviews if available.

### Later

- Quote request form.
- Calendar/availability.
- Lead package.
- Verified provider subscription.

### Exit criteria

- Services page can acquire providers manually.
- First paid provider package drafted.
- QA confirms contact flow works.

## Phase 5: Clip-only monetization

Goal: validate revenue without overbuilding payments too early.

### First products

- 7-day boost.
- 30-day boost.
- PRO seller profile.
- Featured store.
- Autos featured listing.
- Verified services provider.

### Validation sequence

1. Show interest CTAs.
2. Track clicks.
3. Process first sellers manually through Clip link.
4. Add admin activation controls.
5. Automate Clip checkout after demand is proven.

### Exit criteria

- Pricing hypotheses documented.
- Analytics events defined.
- Payment implementation has security review before launch.

## Phase 6: SEO and growth

Goal: acquire supply and demand city by city.

### First location focus

1. Puerto Vallarta.
2. Guadalajara.
3. Ciudad de México.

### First SEO pages

- Autos usados en Puerto Vallarta.
- Servicios en Puerto Vallarta.
- Plomeros en Puerto Vallarta.
- Electricistas en Puerto Vallarta.
- Renta de casas en Puerto Vallarta.
- Marketplace en Puerto Vallarta.

### Exit criteria

- Robots and sitemap are sane.
- Landing page structure exists.
- Analytics is ready.
- Paid traffic is not started until publish/search/contact pass QA.

## Decision rules

### Work now

- Stability.
- Content quality.
- QA scripts.
- SEO basics.
- Trust UX.
- Autos/Services planning.

### Avoid now

- Separate apps.
- Over-complex AI image workflows.
- Payment automation before demand validation.
- Large App.jsx refactor without tests.
- Destructive production changes.

## Launch blocker list

A blocker is any issue that prevents a real buyer or seller from completing the core path.

- Site unavailable.
- API unavailable.
- Login/register broken.
- Publish broken.
- Image upload broken.
- Listing detail broken.
- Contact seller broken.
- Admin cannot moderate.
- Public feed contains obvious test content.
- Backup/restore not verified.
- Exposed credential not rotated.

## Milestone owner map

| Milestone | Owner | Supporting agents |
|---|---|---|
| Production safety | CTO Agent | DevOps, Security, DBA, QA |
| Core MVP | CPO Agent | React, Laravel, QA |
| Trust | COO Agent | Security, Legal/Risk, Moderation |
| Autos | CPO Agent | SEO, Frontend, Backend, Monetization |
| Services | CPO Agent | SEO, Frontend, Growth, Monetization |
| Monetization | CFO Agent | Clip, Accountant, Economist |
| Growth | CMO Agent | SEO, Ads, Analytics |

## Weekly operating rhythm

1. CEO selects top priorities.
2. PM converts priorities into issues.
3. Specialist agents produce PRs or findings.
4. Milestone Supervisor reviews risk and quality.
5. QA runs smoke checks.
6. Security reviews sensitive areas.
7. Low-risk PRs merge automatically when safe.
8. High-risk items wait for safety gate.
