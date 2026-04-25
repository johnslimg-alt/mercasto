# Mercasto Frontend Map

Owner: Frontend Lead Agent + React Agent

Purpose: document the current frontend structure before adding more vertical pages or doing large refactors.

## Entry point

- `src/main.jsx` mounts the app with `BrowserRouter`.
- `src/App.jsx` wraps the app with `ErrorBoundary` and contains most shared state and navigation logic.

## Main screen files

- `src/components/screens/HomeScreen.jsx`
- `src/components/screens/PostScreen.jsx`
- `src/components/screens/UserDashboard.jsx`
- `src/components/screens/AdminScreen.jsx`
- `src/components/screens/AdDetailScreen.jsx`
- `src/components/screens/StorefrontScreen.jsx`
- `src/components/screens/StaticPages.jsx`

## Current structure notes

`App.jsx` is a large coordination file. It owns many concerns:

- language state;
- auth state;
- listing data;
- search state;
- category filter state;
- dashboard state;
- admin state;
- publishing form state;
- media upload state;
- notification state;
- AI command center state;
- route selection;
- shared helpers and handlers.

This makes direct feature work risky. Prefer small UI-only changes or small component extractions.

## HomeScreen sections already present

`HomeScreen.jsx` already includes several vertical-like sections:

- category browsing;
- trending listings;
- real estate spotlight;
- jobs board;
- services marketplace;
- automotive section;
- seller promotion card.

Because Services and Automotive already exist as homepage sections, new Autos/Services work should avoid duplicate UI and should first reuse or formalize these sections.

## Safe insertion points

Preferred order:

1. Document existing sections.
2. Extract small presentational components from `HomeScreen` if needed.
3. Add URL-aware behavior only after route map is clear.
4. Add dedicated vertical landing pages as isolated components.
5. Wire routes in a small PR with smoke checks.

## Avoid

- Large `App.jsx` refactor in one PR.
- Mixing route changes with visual redesign.
- Mixing backend schema changes with frontend UI work.
- Adding duplicate Autos/Services sections while homepage already has them.

## Recommended next PRs

### PR 1: Component inventory only

Document all screen components, props, and major state dependencies.

### PR 2: Extract shared vertical card components

Move repeated card layout into reusable presentational components without changing behavior.

### PR 3: Add vertical landing skeletons

Add isolated components for Autos and Services landing pages, behind existing navigation or simple routes.

### PR 4: Wire navigation

Add route entries and navigation links only after skeletons are stable.

## QA checks for frontend changes

After each frontend PR:

- homepage renders;
- search works;
- category click works;
- listing card click works;
- publish route opens;
- dashboard route opens;
- mobile layout is usable;
- no blank screen after refresh.
