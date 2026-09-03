# ADR-0004: Custom service worker and GitHub Pages workflow

**Status:** Accepted

**Date:** 2026-09-03

## Context

LifeIndex must launch and mutate local data offline after one successful load. It must also avoid surprise reloads while a form is dirty or a focus session is active. GitHub Pages hosts the production static artifact under a repository subpath and deployment must be gated by quality checks.

## Decision

- Use `vite-plugin-pwa` with the `injectManifest` strategy and a TypeScript service worker in `src/sw.ts`.
- Precache the versioned application shell and required icons only.
- Use a navigation fallback to the base-aware `index.html`; do not add runtime caching for business data or third-party APIs.
- Clean outdated static caches after activation.
- Use prompt-for-update behavior. A waiting worker activates only after the UI confirms no dirty form is at risk and asks the user to apply the update.
- Persist active focus state before any worker update can reload the UI.
- Build with an explicit `LIFEINDEX_BASE_PATH`/Vite `base` contract; local builds use `/`, Pages builds use the confirmed repository path.
- Run CI checks before a least-privilege GitHub Pages deploy job uploads the `dist` artifact.

## Rationale

- A custom worker makes the narrow cache policy and update transition auditable.
- Prompted updates preserve in-progress interaction while still allowing a controlled migration to new app code.
- Vite's public-base mechanism rewrites built assets for nested hosting.
- GitHub's Pages actions separate the reviewed source from generated deployment artifacts.

## Consequences

- Service workers are disabled during ordinary dev and tested against `vite preview`/production builds.
- The app must display first-load network failure separately from normal offline mode.
- Deployment verification inspects the manifest, worker scope, asset URLs, reload, and airplane-equivalent offline behavior at the live Pages URL.
- The repository name remains a deployment input until M8 confirmation.

## Rejected alternatives

- Auto-update/`skipWaiting` on discovery: can reload at an unsafe moment.
- Branch-committed `dist`: mixes generated artifacts into source history.
- Cache-first wildcard runtime routing: risks stale behavior and obscures the invariant that IndexedDB owns business data.

## Evidence

- [Vite PWA custom `injectManifest` service worker](https://vite-pwa-org.netlify.app/guide/inject-manifest)
- [Vite nested public base](https://vite.dev/guide/build#public-base-path)
- [GitHub Pages custom workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
