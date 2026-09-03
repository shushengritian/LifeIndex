# LifeIndex Agent Instructions

## Source of truth

- Read `LifeIndex-Project-Baseline.md` and `PLAN.md` before changing product behavior.
- The baseline defines the approved product scope. Record material changes in an ADR and the plan instead of silently changing it.
- Keep V1 local-first: IndexedDB is the primary database, the service worker caches only the application shell, and no backend, account system, analytics, or cloud database may be introduced without explicit approval.

## Change discipline

- Work in small, reviewable increments and run the narrowest relevant check after each change.
- Update affected product, architecture, development, test, or operations documentation in the same change as the implementation.
- Update `PLAN.md` at milestone boundaries, when evidence changes task status, and whenever a risk or decision changes the plan.
- Do not commit generated builds, credentials, personal records, IndexedDB exports, or LifeIndex backup files.

## Code comments and logging

- Add comments for new or adjusted key logic, key branches, and state transitions. Comments must explain responsibility or rationale, not restate the code.
- Add privacy-safe logs at entry points, key branch hits, state changes, exceptions, and failure paths.
- Include useful business context in logs, but never log amounts, notes, titles, backup contents, or other personal data.
- When changing existing core logic, add missing comments and logs in the surrounding logic as part of the same change.

## Data safety

- Never use `localStorage` for core business data.
- Never overwrite current IndexedDB data until an imported backup has been fully parsed and validated.
- Every destructive schema change requires an explicit, tested migration path.
- Use integer minor currency units and local calendar date keys where their semantics matter.
- Do not claim physical-iPhone verification until the user has performed and confirmed the check.
