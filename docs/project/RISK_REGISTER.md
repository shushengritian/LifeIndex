# LifeIndex V1 Risk Register

**Status:** Active

**Last reviewed:** 2026-09-04

Likelihood and impact use `low`, `medium`, and `high`. Release-blocking risks remain open until mitigation has verified evidence or the owner explicitly accepts a scoped release exception. ADR-0005 accepts deferred physical-device evidence for `v1.0.0`; it does not waive a known critical data-loss/privacy defect. Unverified device behavior remains PV1-01–06, and licensing remains PV1-07 without adding a grant.

| ID    | Risk                                                                                            | Likelihood | Impact | Mitigation and verification                                                                                                          | Owner           | Status |
| ----- | ----------------------------------------------------------------------------------------------- | ---------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------ | --------------- | ------ |
| R-001 | Safari data is removed by website-data clearing, app removal, device loss, or storage pressure. | medium     | high   | First-class export/restore, explicit durability copy, last-export status, fixture/round-trip tests, physical Files/iCloud flow.      | Product/Data    | open   |
| R-002 | A future schema upgrade corrupts or silently drops years of records. | medium | high | Database remains V1 in this release. Backup V0 fixture conversion is separate, not proof of database upgrades. Future schema changes require tested migration/rollback and independent backups. | Data | open for future schema changes |
| R-003 | Restore clears valid current data before an invalid backup is fully processed.                  | medium     | high   | M7 verifies malformed/future/corrupted rejection before mutation plus forced transactional rollback and unchanged-data assertions.   | Data            | mitigated |
| R-004 | GitHub Pages subpath breaks routes, assets, manifest start URL, or worker scope.                | medium     | high   | Base-path-aware config, hash routing candidate, artifact inspection, deployed online/offline/reload smoke suite.                     | Platform        | open   |
| R-005 | Sensitive URL query values reach GitHub or browser/network logs.                                | medium     | high   | Fragment-only fields, strict allowlist, preview, route replacement, and M7 request/console capture prove payloads remain local.       | Security        | mitigated |
| R-006 | URL Action refresh or repeated Shortcut launch creates duplicate records.                       | medium     | medium | Durable action receipt, atomic write, canonical validation, route cleanup, and repeated-launch tests pass.                           | App/Data        | mitigated |
| R-007 | iOS suspends callbacks, causing an incorrect focus duration or duplicate completion.            | high       | high   | Timestamp-derived reconciliation, single-active transaction, fake-clock, reload, and repeated-transition tests pass.                 | Focus           | mitigated |
| R-008 | Local logging exposes amounts, titles, notes, or backup content during troubleshooting.         | medium     | high   | Central allowlisted logger, no remote sink, unit capture, tracked-source scan, and runtime action privacy test pass.                  | Security        | mitigated |
| R-009 | Service-worker update reload loses an in-progress form or active focus state.                   | medium     | medium | Explicit update prompt, dirty-form guard, active state persisted in IndexedDB, update-transition E2E.                                | Platform        | open   |
| R-010 | A public static URL is mistaken for private authenticated access.                               | medium     | medium | Confirm Pages access model before remote creation; security/README copy; never include user data in artifacts.                       | Product/Release | open   |
| R-011 | Accessibility or compact-screen defects block daily use on iPhone.                              | medium     | medium | 320 px layouts, 44 px targets, system fonts, WebKit E2E, automated accessibility and physical-device review.                         | UX/Test         | open   |
| R-012 | Dependency or browser support changes during a long-lived project.                              | medium     | medium | Lockfile, bounded dependency set, documented browser floor, CI, deliberate upgrade/migration commits.                                | Engineering     | open   |
| R-013 | GitHub account/authentication is unavailable at deployment time.                                | high       | medium | Complete and verify all local milestones first; request one consolidated auth/repository decision at M8.                             | Release/User    | open   |
| R-014 | Automated browser evidence is mistaken for physical-iPhone acceptance. | medium | high | Separate device checklist and explicit ADR-0005 owner-approved deferral; only phone-browser opening is confirmed. PV1-01–06 remain unverified. | Test/User | accepted deferral; evidence boundary retained |

## Severity rules

- A plausible personal-data loss or disclosure path is release-blocking regardless of frequency.
- A broken core offline/capture workflow is release-blocking.
- Cosmetic issues may be deferred only when they do not impair comprehension, accessibility, or safe action.
- Closed risks retain their evidence link rather than being deleted.
