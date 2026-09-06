# LifeIndex V2 Requirements Traceability

**Status:** Approved mapping; implementation and V2 verification pending

**Last updated:** 2026-09-06

V1 implementation remains the regression base. “Planned” means the design contract exists but V2 source/test evidence is not yet complete.

| Requirement | Product/design evidence | Architecture/data evidence | Planned implementation | Planned verification | Status |
| --- | --- | --- | --- | --- | --- |
| APP-001–005 | PRD §6.1; IA §§1–2,10 | HLD §§3–5; LLD §§1–3,7–8 | `src/app`, `src/shared/ui`, styles | app/component, dual-engine shell, deployed route smoke | planned |
| FIN-001–007 | PRD §6.2; IA §4 | HLD §9; LLD §§6,8 | `src/features/finance`; existing repositories | finance domain/unit/integration/E2E | planned |
| CAT-001 | PRD §6.2; IA §§4,7 | Data model §§3,12; LLD §§4,11 | CategoryRepository, Settings category UI | integration + category E2E | planned |
| HLT-001–004 | PRD §6.3; IA §6 | HLD §§4,8; LLD §§5,8 | `src/features/health` | independent-state component + Health E2E | planned |
| WGT-001–005 | PRD §6.4; IA §6 | Data model §7; ADR-0007; LLD §§4–5 | WeightRepository verified; Health forms/projections pending | repository/backup pass; parser/domain/E2E pending | partial |
| ACTV-001–004 | PRD §6.5; IA §6 | Data model §§3,8; ADR-0007; LLD §§4–5 | ActivityRepository/reference policy verified; Health UI pending | repository/reference/backup pass; domain/E2E pending | partial |
| HAB-001–006 | PRD §6.6; IA §§3,6 | Data model §5; LLD §5 | retained Habits domain/UI composed by Health | existing regression + heatmap/component/E2E | planned |
| FOC-001–006 | PRD §6.7; IA §5 | HLD §11; retained LLD state machine | refreshed Focus UI, FocusRepository unchanged | existing unit/integration + refreshed E2E | planned |
| TOD-001–004 | PRD §6.8; IA §3 | HLD §§4,7 | refreshed Today projection | component + cross-feature E2E | planned |
| SET-001–005 | PRD §6.9; IA §7 | Data model §§3,9; LLD §11 | SettingsPage and category/target controls | group-order/theme/category/backup tests | planned |
| BKP-001–006 | PRD §6.10; IA §8 | Backup schema; ADR-0007; HLD §10; LLD §§9–10 | format V2/migration/nine-store restore implemented | V0/V1/V2, invalid Health/reference matrix, rollback pass; browser pending | partial |
| PWA-001–005 | PRD §6.11 | HLD §§2,11,14 | retained worker/update code + shell integration | existing PWA tests + dual engine/live/iPhone | planned |
| URL-001–004 | PRD §6.12; IA §9 | HLD §11 | retained `src/app/actions` | existing parser/service/E2E privacy regression | planned |
| NFR-DAT/REL | PRD §7 | Data model §§13–14; backup §7; ADR-0007 | additive DB and atomic repositories/restore implemented | schema-V1 upgrade + rollback pass; iPhone continuity pending | partial |
| NFR-PRV/OFF | PRD §7 | HLD §§11–13 | logger/PWA boundaries | source/runtime privacy + offline/live checks | planned |
| NFR-UX/A11Y | PRD §7; UI spec | IA §§10–12; LLD §§7–8 | tokens/primitives/pages | 320/390 light/dark, axe, touch, reduced motion | planned |
| NFR-MNT/TST | PRD §7 | HLD §14; LLD §§12–15; DEV; test plan | modular source and scripts | full local/CI/deployed/physical gates | planned |

## Verification rule

A row becomes `verified` only when its V2 implementation exists, named automated/manual evidence passed against the production-intent candidate, documentation matches observed behavior, and any exception identifies impact/owner/approval. Physical checks remain pending until the owner reports them.
