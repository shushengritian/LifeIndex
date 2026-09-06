# LifeIndex V2 Requirements Traceability

**Status:** Local implementation verified; deployed and physical evidence pending

**Last updated:** 2026-09-06

V1 implementation remains the regression base. “Local verified” means source, static, Vitest, and production-intent browser evidence pass; it does not claim GitHub Pages or physical-iPhone evidence.

| Requirement | Product/design evidence | Architecture/data evidence | Planned implementation | Planned verification | Status |
| --- | --- | --- | --- | --- | --- |
| APP-001–005 | PRD §6.1; IA §§1–2,10 | HLD §§3–5; LLD §§1–3,7–8 | five-route lazy shell, icons, sheets | component and dual-engine route/a11y pass; deployed pending | local verified |
| FIN-001–007 | PRD §6.2; IA §4 | HLD §9; LLD §§6,8 | Finance calendar/ledger/sheet/reports | domain, failure UI, CRUD/calendar E2E pass | local verified |
| CAT-001 | PRD §6.2; IA §§4,7 | Data model §§3,12; LLD §§4,11 | CategoryRepository and four-domain Settings UI | repository plus lifecycle E2E pass | local verified |
| HLT-001–004 | PRD §6.3; IA §6 | HLD §§4,8; LLD §§5,8 | Health independent Weight/Activity/Habit states | component/failure and dual-engine Health E2E pass | local verified |
| WGT-001–005 | PRD §6.4; IA §6 | Data model §7; ADR-0007; LLD §§4–5 | Weight repository/forms/trend/target/history | parser, repository, failure, target, CRUD/reload E2E pass | local verified |
| ACTV-001–004 | PRD §6.5; IA §6 | Data model §§3,8; ADR-0007; LLD §§4–5 | Activity repository/forms/weekly summary/history | bounds/reference/archive and CRUD/reload E2E pass | local verified |
| HAB-001–006 | PRD §6.6; IA §§3,6 | Data model §5; LLD §5 | retained Habits composed inside Health | repository, streak/heatmap, create/check/reload/undo E2E pass | local verified |
| FOC-001–006 | PRD §6.7; IA §5 | HLD §11; retained LLD state machine | refreshed Focus UI; repository unchanged | unit/integration and dual-engine reconcile/finish E2E pass | local verified |
| TOD-001–004 | PRD §6.8; IA §3 | HLD §§4,7 | refreshed Today projection | shell and cross-feature E2E pass | local verified |
| SET-001–005 | PRD §6.9; IA §7 | Data model §§3,9; LLD §11 | four independent groups and category/target controls | exact order, theme, category, backup tests pass | local verified |
| BKP-001–006 | PRD §6.10; IA §8 | Backup schema; ADR-0007; HLD §10; LLD §§9–10 | V2/migration/nine-store restore | V0/V1/V2 invalid/reference/rollback/browser replacement pass | local verified |
| PWA-001–005 | PRD §6.11 | HLD §§2,11,14 | retained worker/update code + shell integration | unit, dual-engine offline mutation, Chromium reload pass; live/iPhone pending | partial |
| URL-001–004 | PRD §6.12; IA §9 | HLD §11 | retained `src/app/actions` | parser/service/dual-engine privacy/idempotency pass | local verified |
| NFR-DAT/REL | PRD §7 | Data model §§13–14; backup §7; ADR-0007 | additive DB and atomic repositories/restore | schema-V1 upgrade/rollback pass; iPhone continuity pending | partial |
| NFR-PRV/OFF | PRD §7 | HLD §§11–13 | logger/PWA boundaries | local source/runtime privacy and offline pass; live/iPhone pending | partial |
| NFR-UX/A11Y | PRD §7; UI spec | IA §§10–12; LLD §§7–8 | tokens, semantic calendar/dialogs, responsive pages | 320/390, dual-theme inspection, axe, touch, reduced motion pass | local verified |
| NFR-MNT/TST | PRD §7 | HLD §14; LLD §§12–15; DEV; test plan | modular source and reproducible scripts | local full gate passes; CI/deployed/physical pending | partial |

## Verification rule

A row becomes `verified` only when its V2 implementation exists, named automated/manual evidence passed against the production-intent candidate, documentation matches observed behavior, and any exception identifies impact/owner/approval. Physical checks remain pending until the owner reports them.
