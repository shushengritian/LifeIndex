# LifeIndex Development Guide

**Status:** Active

**Last verified:** 2026-09-03

## 1. Prerequisites

- macOS or another supported local environment
- Git 2.39 or newer
- Node 20.19.0 or newer (`.nvmrc` records the initially verified 20.19.5)
- pnpm 11.19.0 as declared by `packageManager`

No environment secret, backend, database server, Apple Developer account, or Xcode project is required.

## 2. Install and run

```bash
pnpm install --frozen-lockfile
pnpm dev
```

Vite prints the local URL. The normal development server does not register the production service worker; PWA behavior is verified from a production build/preview.

## 3. Commands

| Command                 | Purpose                                                     |
| ----------------------- | ----------------------------------------------------------- |
| `pnpm dev`              | Start the local Vite development server                     |
| `pnpm format`           | Apply Prettier formatting                                   |
| `pnpm format:check`     | Verify formatting without changing files                    |
| `pnpm lint`             | Run ESLint with zero allowed warnings                       |
| `pnpm typecheck`        | Type-check app, worker, tests, and configs                  |
| `pnpm test`             | Run all Vitest unit/integration tests                       |
| `pnpm test:unit`        | Run pure/component unit tests                               |
| `pnpm test:integration` | Run IndexedDB/repository integration tests                  |
| `pnpm build`            | Type-check and create the production PWA artifact in `dist` |
| `pnpm preview`          | Serve the built artifact locally                            |
| `pnpm test:e2e`         | Run Chromium and Mobile Safari/WebKit Playwright tests      |
| `pnpm quality`          | Run the local non-E2E quality gate                          |

Playwright browser binaries are version-coupled to the package. Install the required engines after dependency installation:

```bash
pnpm exec playwright install chromium webkit
```

## 4. Production base path

Local builds use `/`. A GitHub Pages project build supplies the repository path without guessing it in source:

```bash
LIFEINDEX_BASE_PATH=/REPOSITORY-NAME/ pnpm build
```

`vite.config.ts` normalizes this once and uses it for assets, manifest ID/start/scope, and worker placement. M8 records the exact confirmed value and validates the deployed artifact.

## 5. Source ownership

- `src/app`: bootstrap, router, providers, global error/update UI.
- `src/data`: Dexie schema/migrations, repositories, backup and restore.
- `src/features`: Today, Finance, Habits, Focus, Settings vertical slices.
- `src/pwa`: service-worker registration and update/offline client state.
- `src/shared`: pure domain utilities, safe logging, validation, and UI primitives.
- `src/styles`: tokens and shared layout.
- `tests/unit`: pure functions and component contracts.
- `tests/integration`: IndexedDB, repository, migration, and restore contracts.
- `tests/e2e`: production-intent user journeys in Chromium and Mobile Safari/WebKit.

Do not create empty folders. Introduce each directory with its first owned implementation and test.

## 6. Coding rules

- Use strict TypeScript and explicit domain unions instead of unchecked strings.
- Put business invariants in pure functions and persistence behind repository interfaces.
- Store money in integer minor units and calendar behavior in validated local date keys.
- Add rationale comments to key logic, branches, migrations, and state transitions.
- Log entry, branch, transition, exception, and failure events through the safe logger using static, dot-separated event identifiers.
- Never pass user records, IDs, amounts, names, titles, notes, payloads, or URL fragments to production logs.
- Update the relevant PRD, HLD/LLD/data contract, test plan, operations guide, traceability matrix, changelog, and plan in the same change.

## 7. Git workflow

- `main` remains releasable; use short-lived `feat/`, `fix/`, and `docs/` branches when collaboration/remote review begins.
- Use focused Conventional Commits.
- Do not rewrite shared history, force-push, or commit `dist`, dependencies, credentials, backups, reports, or personal data.
- Before a milestone commit, inspect `git diff`, run `git diff --check`, and run the narrowest gate that proves the change.

## 8. Data/schema changes

1. Update `DATA_MODEL.md`, `BACKUP_SCHEMA.md`, and an ADR when the compatibility contract changes.
2. Increment the Dexie version for a persisted schema/index change.
3. Add deterministic upgrade logic and synthetic old-version fixtures.
4. Add success, malformed-row, and transaction-failure tests.
5. Verify current backups still import or add a pure backup migration.
6. Never delete/recreate a user's database as an automatic recovery strategy.

The first shipped database schema is V1 and therefore has no predecessor database fixture. The supported backup V0 fixture exercises the pure migration pipeline separately; database and backup versions must never be treated as interchangeable.

## 9. Release and rollback

- CI must reproduce install with `pnpm install --frozen-lockfile`.
- Pages deploys only the generated `dist` artifact after required checks.
- A source rollback deploys a prior known-good app artifact but does not downgrade or mutate IndexedDB automatically.
- If new code cannot safely read an existing schema, stop the release and ship a forward-compatible fix; never instruct users to clear data as the default remedy.
