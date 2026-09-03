# LifeIndex V1 Requirements Traceability

**Status:** Living document

**Last updated:** 2026-09-03

This matrix connects approved product requirements to design, implementation, and verification evidence. `TBD` is intentional before the corresponding milestone; it must be replaced by a real file, test, or accepted exception before V1 release.

| Requirement group    | Product evidence           | Design evidence                                                                           | Planned implementation                        | Planned verification                                              | Status               |
| -------------------- | -------------------------- | ----------------------------------------------------------------------------------------- | --------------------------------------------- | ----------------------------------------------------------------- | -------------------- |
| APP-001–004          | `docs/product/PRD.md` §6.1 | IA §§1–2, 10; HLD §§3–5; LLD §§1–2, 13                                                    | `src/app`, routing, initialization boundary   | `tests/unit/app.test.tsx`; `tests/e2e/app-shell.spec.ts`          | foundation verified  |
| FIN-001–006          | PRD §6.2                   | IA §4; UX guide §7; HLD §§4, 7–8; LLD §§3, 5–6                                            | `src/features/finance`, transaction repository | Domain/unit, repository integration, dual-engine Finance E2E      | implemented          |
| CAT-001              | PRD §6.2                   | IA §4; UX guide §7; HLD §§4, 7–8; LLD §§3, 5–6                                            | category repository; Settings UI pending       | Repository integration; management E2E pending                    | partial              |
| HAB-001–006          | PRD §6.3                   | IA §6; UX guide §7; HLD §§4, 7–8; LLD §§3, 5, 7                                           | `src/features/habits`, habit repositories     | Schedule/streak unit tests, integration, Habits E2E               | implementation-ready |
| FOC-001–006          | PRD §6.4                   | IA §5; UX guide §7; HLD §10; LLD §§3, 8                                                   | `src/features/focus`, active-session state    | Clock/state-machine unit tests, reload/background E2E             | implementation-ready |
| TOD-001–003          | PRD §6.5                   | IA §3; UX guide §7; HLD §8; LLD §4                                                        | `src/features/today` projections              | Cross-feature integration and Today E2E                           | implementation-ready |
| SET-001–003          | PRD §6.6                   | IA §7; UX guide §7; data model §8                                                         | `src/features/settings`                       | Settings integration and appearance E2E                           | implementation-ready |
| BKP-001–006          | PRD §6.7                   | IA §8; HLD §9; LLD §9; `BACKUP_SCHEMA.md`                                                 | `src/data/backup`, DB transaction coordinator | `tests/integration/backup.test.ts`; browser file UI pending        | data layer verified  |
| PWA-001–005          | PRD §6.8                   | IA §§1–2, 10; UX guide §§3, 6; HLD §§11, 14; LLD §§11, 15                                 | manifest, service worker, update UI           | Build inspection, online/offline Playwright and deployed smoke    | implementation-ready |
| ACT-001–004          | PRD §6.9                   | IA §9; HLD §12; LLD §10; ADR-0003                                                         | `src/app/actions`, feature command adapters   | Parser/idempotency unit tests and action-route E2E                | implementation-ready |
| NFR-DAT/PRV          | PRD §7                     | `SECURITY.md`; HLD §§6–7, 12, 15; LLD §§12–13; ADR-0002                                   | storage/logging boundaries                    | M3 logger and M4 atomic-restore tests; release privacy review      | partial verification |
| NFR-OFF/REL          | PRD §7                     | HLD §§5, 9–13; LLD §§8–11, 13; ADR-0004                                                   | service worker, error boundary, DB recovery   | Offline and failure-path tests                                    | implementation-ready |
| NFR-UX/A11Y          | PRD §7                     | `docs/design/UX_UI_GUIDE.md`                                                              | design tokens and shared components           | Automated accessibility plus visual/manual checks                 | implementation-ready |
| NFR-MNT/TST          | PRD §7                     | `AGENTS.md`; HLD §16; LLD §§14–16; `docs/development/DEV.md`; `docs/testing/TEST_PLAN.md` | modular source and quality scripts            | Local M3 gate verified; CI/full release gate pending              | partial verification |

## Release rule

A requirement may be marked `verified` only when:

1. Its implementation path is present.
2. The mapped automated/manual evidence has passed against the production-intent build.
3. Product and architecture documents still describe the observed behavior.
4. Any exception names its user impact, owner, and approval.
