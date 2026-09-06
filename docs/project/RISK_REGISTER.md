# LifeIndex V2 Risk Register

**Status:** Active for V2 delivery

**Last reviewed:** 2026-09-06

Likelihood/impact are low, medium, or high. Plausible personal-data loss/disclosure and broken core offline capture are release-blocking regardless of likelihood.

| ID | Risk | Likelihood | Impact | Mitigation/evidence required | Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| R2-001 | V1→V2 database open loses or rewrites existing rows | medium | high | additive stores only; real schema-V1 fixture and logical row equality pass; initialization blocks on failure; iPhone upgrade still required | Data/User | automated mitigation verified; physical open |
| R2-002 | V1 backup is rejected or restored without new-store consistency | medium | high | frozen V1 schema; pure V1→V2 migration; nine-store current validation/transaction and browser UI tests pass | Data | mitigated locally; physical pending |
| R2-003 | Restore clears current data before invalid Health records are rejected | medium | high | pre-write validation, forced nine-store rollback, and browser replacement tests pass | Data | mitigated locally; physical pending |
| R2-004 | Health values leak through logs, fixtures, URLs, or artifacts | medium | high | safe logger context plus synthetic Health marker capture across network/console; final artifact scan required | Security | locally mitigated; release scan pending |
| R2-005 | V1 source rollback cannot open schema V2 | medium | high | no schema downgrade; retain V2-compatible release/fix path; documented rollback rule | Release/Data | accepted constraint, mitigation open |
| R2-006 | Calendar/date math assigns records to the wrong day/month/week | medium | high | local-date keys plus month clamp, leap, Monday-first calendar, trend, and week-boundary tests pass | Finance/Health | mitigated automatically; physical pending |
| R2-007 | Weight float conversion changes the entered measurement | medium | medium | string-to-integer grams parser and boundary/round-trip tests pass | Health | mitigated |
| R2-008 | Activity category archive breaks historical rows | medium | medium | reference-preserving archive, active-only capture, import and repository tests pass | Health/Data | mitigated locally |
| R2-009 | Dense calendar/Health content becomes unusable at 320 px | medium | medium | 320/390 inspection, edge-to-edge 320 calendar, touch/overflow/axe checks pass | UX | mitigated locally; physical pending |
| R2-010 | Sheet keyboard/safe-area handling hides save/cancel controls on iPhone | medium | high | scrollable inert sheet, focus return, 16 px inputs, safe-area CSS and WebKit pass | UX/Test | mitigated locally; physical pending |
| R2-011 | Update reload discards a dirty V2 sheet | medium | high | every new sheet registers with shared dirty-form guard; unit tests pass | Platform | mitigated locally; physical update pending |
| R2-012 | Focus behavior regresses during visual rewrite | medium | high | repository/state machine unchanged; timer/reload/early-finish dual-engine tests pass | Focus | mitigated locally |
| R2-013 | GitHub Pages base path/version cache publishes stale V1 | medium | high | base-aware build, exact rendered-version deployed test, workflow/run verification | Release | open |
| R2-014 | Automation is mistaken for physical-iPhone proof | medium | high | separate physical checklist; record owner statements only | Test/User | open |
| R2-015 | Safari site-data clearing/device loss removes all records | medium | high | visible local-only copy, V2 export/restore, owner Files/iCloud acceptance | Product/User | open |

## Release rule

Open data-loss, privacy, core offline, or unrecoverable migration risks block deployment/tagging. Cosmetic issues may be deferred only if they do not harm comprehension, accessibility, or safe action, and the deferral is recorded with owner approval.
