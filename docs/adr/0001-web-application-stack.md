# ADR-0001: TypeScript React PWA engineering stack

**Status:** Accepted

**Date:** 2026-09-03

## Context

LifeIndex V1 is a greenfield, static, local-first PWA with five related feature areas, long-lived data, non-trivial forms, offline behavior, and automated browser acceptance. The stack must remain understandable to one maintainer, build to static files, support GitHub Pages subpaths, and avoid server-only assumptions.

The local environment has Node 20.19.5, npm 10.8.2, and pnpm 11.19.0. Vite's current production documentation identifies Safari 16.4 as part of its default production target and provides a `base` setting for nested public paths.

## Decision

- Use React with TypeScript and strict compiler settings.
- Use Vite as the development server and production bundler.
- Use pnpm with an exact `packageManager` declaration and committed lockfile.
- Use React Router in hash mode so static hosting needs no server rewrite rules.
- Use component-local state for forms, URL state for navigation/period selection, and narrow React contexts for application services and appearance.
- Do not add Redux, MobX, a server framework, SSR, a general UI kit, or a charting framework in V1.
- Use CSS custom properties and small repository-owned components for the visual system.
- Use Vitest, React Testing Library, `fake-indexeddb`, Playwright, and an accessibility checker for the layered test suite.

## Rationale

- React/TypeScript gives explicit boundaries for data-rich forms and broad testing support without requiring a full-stack framework.
- Vite produces a static artifact and officially supports rewriting assets for a nested public base.
- Hash routing makes every HTTP navigation resolve to the one deployed `index.html` and also creates a server-private location for URL Action payloads.
- Avoiding a global state framework keeps IndexedDB repositories as the source of truth rather than creating a second long-lived client data store.
- Repository-owned UI primitives keep the bundle and visual language restrained.

## Consequences

- The application must test hash navigation, browser history, and fragment cleanup carefully.
- Derived views query repositories instead of expecting a global normalized cache.
- Charts use CSS/SVG or accessible tables for the modest V1 summaries.
- Node and dependency upgrades are deliberate maintenance changes, not floating CI behavior.

## Rejected alternatives

- Native SwiftUI: explicitly outside the approved baseline.
- Next.js/SSR: adds server-oriented behavior with no V1 need and complicates GitHub Pages.
- Vanilla DOM only: minimizes dependencies but raises the cost of accessible forms, state transitions, and component testing across five modules.
- A large UI framework: risks enterprise-dashboard aesthetics and unnecessary bundle weight.

## Evidence

- [Vite production build and public base path](https://vite.dev/guide/build)
- [React TypeScript guidance](https://react.dev/learn/typescript)
- [Playwright WebKit and mobile browser projects](https://playwright.dev/docs/browsers)
