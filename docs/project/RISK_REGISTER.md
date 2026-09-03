# LifeIndex V1 Risk Register

**Status:** Active

**Last reviewed:** 2026-09-03

Likelihood and impact use `low`, `medium`, and `high`. Release-blocking risks remain open until their mitigation has verified evidence.

| ID    | Risk                                                                                            | Likelihood | Impact | Mitigation and verification                                                                                                          | Owner           | Status |
| ----- | ----------------------------------------------------------------------------------------------- | ---------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------ | --------------- | ------ |
| R-001 | Safari data is removed by website-data clearing, app removal, device loss, or storage pressure. | medium     | high   | First-class export/restore, explicit durability copy, last-export status, fixture/round-trip tests, physical Files/iCloud flow.      | Product/Data    | open   |
| R-002 | A schema upgrade corrupts or silently drops years of records.                                   | medium     | high   | Versioned Dexie migrations, immutable fixtures, upgrade tests, backup-before-risk guidance, no destructive change without migration. | Data            | open   |
| R-003 | Restore clears valid current data before an invalid backup is fully processed.                  | medium     | high   | Parse/validate/referential checks before mutation; one transactional replace; rollback and unchanged-data assertions.                | Data            | open   |
| R-004 | GitHub Pages subpath breaks routes, assets, manifest start URL, or worker scope.                | medium     | high   | Base-path-aware config, hash routing candidate, artifact inspection, deployed online/offline/reload smoke suite.                     | Platform        | open   |
| R-005 | Sensitive URL query values reach GitHub or browser/network logs.                                | medium     | high   | Fragment action routes, allowlist schema, preview-before-write, history cleanup, privacy test and ADR.                               | Security        | open   |
| R-006 | URL Action refresh or repeated Shortcut launch creates duplicate records.                       | medium     | medium | Action ID/idempotency store, canonical payload handling, completion cleanup, repeated-launch tests.                                  | App/Data        | open   |
| R-007 | iOS suspends callbacks, causing an incorrect focus duration or duplicate completion.            | high       | high   | Persist active session before display; derive from wall-clock timestamps; explicit state machine and fake-clock/reload tests.        | Focus           | open   |
| R-008 | Local logging exposes amounts, titles, notes, or backup content during troubleshooting.         | medium     | high   | Central event logger with safe metadata types, code review, test capture, no remote sink.                                            | Security        | open   |
| R-009 | Service-worker update reload loses an in-progress form or active focus state.                   | medium     | medium | Explicit update prompt, dirty-form guard, active state persisted in IndexedDB, update-transition E2E.                                | Platform        | open   |
| R-010 | A public static URL is mistaken for private authenticated access.                               | medium     | medium | Confirm Pages access model before remote creation; security/README copy; never include user data in artifacts.                       | Product/Release | open   |
| R-011 | Accessibility or compact-screen defects block daily use on iPhone.                              | medium     | medium | 320 px layouts, 44 px targets, system fonts, WebKit E2E, automated accessibility and physical-device review.                         | UX/Test         | open   |
| R-012 | Dependency or browser support changes during a long-lived project.                              | medium     | medium | Lockfile, bounded dependency set, documented browser floor, CI, deliberate upgrade/migration commits.                                | Engineering     | open   |
| R-013 | GitHub account/authentication is unavailable at deployment time.                                | high       | medium | Complete and verify all local milestones first; request one consolidated auth/repository decision at M8.                             | Release/User    | open   |
| R-014 | Automated browser evidence is mistaken for physical-iPhone acceptance.                          | medium     | high   | Separate M9 checklist; require user-reported results before `v1.0.0`.                                                                | Test/User       | open   |

## Severity rules

- A plausible personal-data loss or disclosure path is release-blocking regardless of frequency.
- A broken core offline/capture workflow is release-blocking.
- Cosmetic issues may be deferred only when they do not impair comprehension, accessibility, or safe action.
- Closed risks retain their evidence link rather than being deleted.
