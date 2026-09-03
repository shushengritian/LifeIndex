# LifeIndex V1 Requirements Traceability

**Status:** Living document

**Last updated:** 2026-09-03

This matrix connects approved product requirements to design, implementation, and verification evidence. `TBD` is intentional before the corresponding milestone; it must be replaced by a real file, test, or accepted exception before V1 release.

| Requirement group | Product evidence | Design evidence | Planned implementation | Planned verification | Status |
| --- | --- | --- | --- | --- | --- |
| APP-001–004 | `docs/product/PRD.md` §6.1 | `docs/product/INFORMATION_ARCHITECTURE.md` §§1–2, 10 | `src/app`, routing, initialization boundary | App-shell integration and mobile E2E | designed |
| FIN-001–006, CAT-001 | PRD §6.2 | IA §4; UX guide §7 | `src/features/finance`, category repository | Money/date unit tests, repository integration, Finance E2E | designed |
| HAB-001–006 | PRD §6.3 | IA §6; UX guide §7 | `src/features/habits`, habit repositories | Schedule/streak unit tests, integration, Habits E2E | designed |
| FOC-001–006 | PRD §6.4 | IA §5; UX guide §7 | `src/features/focus`, active-session state | Clock/state-machine unit tests, reload/background E2E | designed |
| TOD-001–003 | PRD §6.5 | IA §3; UX guide §7 | `src/features/today` projections | Cross-feature integration and Today E2E | designed |
| SET-001–003 | PRD §6.6 | IA §7; UX guide §7 | `src/features/settings` | Settings integration and appearance E2E | designed |
| BKP-001–006 | PRD §6.7 | IA §8 | `src/data/backup`, DB transaction coordinator | Schema fixtures, round trip, invalid-preservation, rollback tests | designed |
| PWA-001–005 | PRD §6.8 | IA §§1–2, 10; UX guide §§3, 6 | manifest, service worker, update UI | Build inspection, online/offline Playwright and deployed smoke | designed |
| ACT-001–004 | PRD §6.9 | IA §9 | `src/app/actions`, feature command adapters | Parser/idempotency unit tests and action-route E2E | designed |
| NFR-DAT/PRV | PRD §7 | `SECURITY.md`; HLD/LLD TBD | storage/logging boundaries | Network/log review and privacy tests | partially designed |
| NFR-OFF/REL | PRD §7 | HLD/LLD TBD | service worker, error boundary, DB recovery | Offline and failure-path tests | partially designed |
| NFR-UX/A11Y | PRD §7 | `docs/design/UX_UI_GUIDE.md` | design tokens and shared components | Automated accessibility plus visual/manual checks | designed |
| NFR-MNT/TST | PRD §7 | `AGENTS.md`; DEV/TEST_PLAN TBD | modular source and quality scripts | CI/full release gate | partially designed |

## Release rule

A requirement may be marked `verified` only when:

1. Its implementation path is present.
2. The mapped automated/manual evidence has passed against the production-intent build.
3. Product and architecture documents still describe the observed behavior.
4. Any exception names its user impact, owner, and approval.
