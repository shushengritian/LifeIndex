# LifeIndex V1 Requirements Traceability

**Status:** Living document

**Last updated:** 2026-09-04

This matrix connects approved product requirements to design, implementation, and verification evidence. `TBD` is intentional before the corresponding milestone; it must be replaced by a real file, test, or accepted exception before V1 release.

For `v1.0.0`, physical-evidence gaps below are accepted **deferrals**, not verified tests: [ADR-0005](../adr/0005-v1-owner-acceptance.md) records the owner's explicit approval and [POST_V1_BACKLOG.md](POST_V1_BACKLOG.md) names PV1-01–06. Final version-specific automated evidence belongs in [the release handoff](../releases/v1.0.0.md). Phone-browser opening is the only user-confirmed device result.

| Requirement group    | Product evidence           | Design evidence                                                                           | Planned implementation                        | Planned verification                                              | Status               |
| -------------------- | -------------------------- | ----------------------------------------------------------------------------------------- | --------------------------------------------- | ----------------------------------------------------------------- | -------------------- |
| APP-001–004          | `docs/product/PRD.md` §6.1 | IA §§1–2, 10; HLD §§3–5; LLD §§1–2, 13                                                    | `src/app`, routing, initialization boundary   | `tests/unit/app.test.tsx`; `tests/e2e/app-shell.spec.ts`          | foundation verified  |
| FIN-001–006          | PRD §6.2                   | IA §4; UX guide §7; HLD §§4, 7–8; LLD §§3, 5–6                                            | `src/features/finance`, transaction/category repositories | Domain/unit, repository integration, dual-engine Finance E2E      | verified             |
| CAT-001              | PRD §6.2                   | IA §4; UX guide §7; HLD §§4, 7–8; LLD §§3, 5–6                                            | category repository and Settings lifecycle UI  | Repository integration and dual-engine management E2E             | verified             |
| HAB-001–006          | PRD §6.3                   | IA §6; UX guide §7; HLD §§4, 7–8; LLD §§3, 5, 7                                           | `src/features/habits`, `HabitRepository`       | Domain/unit, repository integration, dual-engine Habits E2E       | verified             |
| FOC-001–006          | PRD §6.4                   | IA §5; UX guide §7; HLD §10; LLD §§3, 8                                                   | `src/features/focus`, `FocusRepository`        | Domain/unit, state integration, dual-engine reload/finish E2E      | verified             |
| TOD-001–003          | PRD §6.5                   | IA §3; UX guide §7; HLD §8; LLD §4                                                        | `src/features/today` independent projections   | Dual-engine cross-feature Today E2E                               | verified             |
| SET-001–003          | PRD §6.6                   | IA §7; UX guide §7; data model §8                                                         | `src/features/settings`, browser backup adapter | Settings unit/integration and dual-engine appearance/category E2E | verified             |
| BKP-001–006          | PRD §6.7                   | IA §8; HLD §9; LLD §9; `BACKUP_SCHEMA.md`                                                 | `src/data/backup`, browser adapter, transactional coordinator | Backup integration plus dual-engine export/preview/replace E2E; physical Files acceptance pending | automated verified   |
| PWA-001–005          | PRD §6.8                   | IA §§1–2, 10; UX guide §§3, 6; HLD §§11, 14; LLD §§11, 15                                 | manifest/icons, `src/sw.ts`, `src/pwa`        | Root/subpath and live 0.1.1 gates; `pwa.test.tsx`, `pwaUpdates.test.ts`, actual browser upgrade; physical iPhone pending | automated verified   |
| ACT-001–004          | PRD §6.9                   | IA §9; HLD §12; LLD §10; ADR-0003; `docs/operations/PWA_AND_SHORTCUTS.md`                 | `src/app/actions`, `actionReceipts`           | 15 parser/atomic-service checks and dual-engine action-route/privacy E2E | verified             |
| NFR-DAT/PRV          | PRD §7                     | `SECURITY.md`; HLD §§6–7, 12, 15; LLD §§12–13; ADR-0002                                   | storage/logging boundaries                    | Logger, corruption/rollback, build-artifact, Git-ignore, runtime network/console privacy checks | automated verified   |
| NFR-OFF/REL          | PRD §7                     | HLD §§5, 9–13; LLD §§8–11, 13; ADR-0004                                                   | service worker, error boundary, DB recovery   | Offline/update/failure paths, real HTTPS smoke, and browser upgrade verified; physical gate pending | partial verification |
| NFR-UX/A11Y          | PRD §7                     | `docs/design/UX_UI_GUIDE.md`                                                              | design tokens and shared components           | Dual-engine axe, 320 px/touch/reduced-motion automation, light/dark visual checks; physical device pending | automated verified   |
| NFR-MNT/TST          | PRD §7                     | `AGENTS.md`; HLD §16; LLD §§14–16; `docs/development/DEV.md`; `docs/testing/TEST_PLAN.md` | modular source and quality scripts            | Full local gates and successful Linux/Pages/live run 33833052946 for 0.1.1; final release sign-off pending | automated verified |

## Deployment and update-discovery evidence

- GitHub run [33832099931](https://github.com/shushengritian/LifeIndex/actions/runs/33832099931) verifies the first live application at `60b0676`: clean Linux install, full local gates, base-path build/deployment, and 9 live smoke passes with the documented WebKit offline-reload skip. This supersedes the initial matrix's “remote run/live pending” notes for that commit only.
- `tests/unit/pwaUpdates.test.ts` maps the 0.1.1 foreground/reconnect discovery change to PWA-001–005 and NFR-OFF/REL: foreground, reconnect, offline/hidden guards, in-flight/cooled-down checks, install/waiting guards, failure retry, and listener cleanup. Existing `tests/unit/pwa.test.tsx` still proves explicit activation and dirty-form blocking.
- The 0.1.1 source `ff7d443` passed its own complete local and remote gates in [run 33833052946](https://github.com/shushengritian/LifeIndex/actions/runs/33833052946): 92 unit/integration passes, 33 browser passes / 1 documented skip, 9 live passes / 1 documented skip, and a manual dirty-form-safe browser upgrade from 0.1.0. Physical installation, offline relaunch, Files restore, Shortcuts, and the physical two-version update transition remain unverified until user sign-off.

## Release rule

A requirement may be marked `verified` only when:

1. Its implementation path is present.
2. The mapped automated/manual evidence has passed against the production-intent build.
3. Product and architecture documents still describe the observed behavior.
4. Any exception names its user impact, owner, and approval.
