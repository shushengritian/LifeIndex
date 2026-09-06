# LifeIndex V2 Risk Register

**Status:** Active for V2 delivery

**Last reviewed:** 2026-09-06

Likelihood/impact are low, medium, or high. Plausible personal-data loss/disclosure and broken core offline capture are release-blocking regardless of likelihood.

| ID | Risk | Likelihood | Impact | Mitigation/evidence required | Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| R2-001 | V1→V2 database open loses or rewrites existing rows | medium | high | additive stores only; real schema-V1 fixture; logical row equality; initialization blocks on failure; iPhone upgrade check | Data/User | open |
| R2-002 | V1 backup is rejected or restored without new-store consistency | medium | high | frozen V1 schema; pure V1→V2 migration; nine-store current validation/transaction tests | Data | open |
| R2-003 | Restore clears current data before invalid Health records are rejected | medium | high | complete validation before preview/write; forced nine-store rollback test | Data | open |
| R2-004 | Health values leak through logs, fixtures, URLs, or artifacts | medium | high | logger denylist/allowlist, runtime capture, source/artifact scan, synthetic fixtures | Security | open |
| R2-005 | V1 source rollback cannot open schema V2 | medium | high | no schema downgrade; retain V2-compatible release/fix path; documented rollback rule | Release/Data | accepted constraint, mitigation open |
| R2-006 | Calendar/date math assigns records to the wrong day/month/week | medium | high | validated local-date keys, calendar-component iteration, leap/DST/boundary tests | Finance/Health | open |
| R2-007 | Weight float conversion changes the entered measurement | medium | medium | string-to-integer grams parser; boundary/round-trip tests | Health | open |
| R2-008 | Activity category archive breaks historical rows | medium | medium | reference-preserving archive, active-only new capture, import/integration/E2E tests | Health/Data | open |
| R2-009 | Dense calendar/Health content becomes unusable at 320 px | medium | medium | fixed complexity budget, 320/390 screenshots, touch/overflow/axe checks | UX | open |
| R2-010 | Sheet keyboard/safe-area handling hides save/cancel controls on iPhone | medium | high | scrollable sheet, 16 px inputs, safe-area CSS, WebKit plus physical check | UX/Test | open |
| R2-011 | Update reload discards a dirty V2 sheet | medium | high | register all sheets in dirty-form guard; update-transition tests; physical check | Platform | open |
| R2-012 | Focus behavior regresses during visual rewrite | medium | high | repository/state machine unchanged; full existing timer/reload tests | Focus | open |
| R2-013 | GitHub Pages base path/version cache publishes stale V1 | medium | high | base-aware build, exact rendered-version deployed test, workflow/run verification | Release | open |
| R2-014 | Automation is mistaken for physical-iPhone proof | medium | high | separate physical checklist; record owner statements only | Test/User | open |
| R2-015 | Safari site-data clearing/device loss removes all records | medium | high | visible local-only copy, V2 export/restore, owner Files/iCloud acceptance | Product/User | open |

## Release rule

Open data-loss, privacy, core offline, or unrecoverable migration risks block deployment/tagging. Cosmetic issues may be deferred only if they do not harm comprehension, accessibility, or safe action, and the deferral is recorded with owner approval.
