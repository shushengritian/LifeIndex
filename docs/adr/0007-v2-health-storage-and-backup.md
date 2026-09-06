# ADR-0007: Use additive V2 Health stores and backup format V2

**Status:** Accepted at V2 gate G2

**Date:** 2026-09-06

## Context

ADR-0006 adds manual weight and activity records while preserving every V1 Habit record. LifeIndex is already installed on the owner's iPhone, where IndexedDB is the only primary database. A V2 implementation therefore needs exact units, references, backup compatibility, and failure behavior before code is allowed to change the schema.

## Decision

- Increment Dexie from schema version 1 to 2.
- Keep all seven V1 stores and their records unchanged.
- Add `weightEntries` and `activitySessions` stores only.
- Persist weight as bounded integer grams and activity duration as bounded integer whole minutes.
- Extend Category with `domain=activity`; Activity sessions reference those categories. Seed six stable Activity definitions only when missing.
- Store the optional weight target as a typed Settings row; row absence means no target.
- Increment backup format from 1 to 2 and export all nine stores.
- Accept V0 and V1 backups through pure in-memory migrations that add only missing empty collections/counts.
- Validate current fields, counts, uniqueness, state, and references before issuing a preview token or starting restore.
- Replace all nine stores atomically after explicit confirmation; failure retains pre-restore data.

## Rationale

Integer units avoid floating-point drift. Separate stores keep Health records independently queryable and avoid reinterpreting Habits. Activity categories reuse a tested archive/history pattern without introducing workout programming. Pure legacy migrations preserve old backups while refusing to invent private measurements. An all-store transaction keeps replacement internally consistent.

## Consequences

- V1 code may not understand a database after V2 has opened it, so rollback is a forward-fix deployment, not a schema downgrade.
- Backup V2 fixtures and integrity checks expand to nine stores.
- Initialization adds public category definitions after schema open but no personal Health data.
- Logs must exclude measurements, target, duration, intensity, notes, record dates/IDs, and backup content.

## Rejected alternatives

- Add weight/activity fields to Habits: changes semantics and weakens query/integrity boundaries.
- Persist kilograms as floating point: risks representation drift.
- Use free-form Activity type only: prevents consistent archive/history management approved in Settings.
- Keep backup format V1 while adding collections: silently changes a supposedly stable envelope.
- Migrate by exporting/clearing/reimporting: creates avoidable data-loss risk.
- Seed a target or synthetic measurements: invents personal values.

## Required evidence

The V2 release requires synthetic schema-V1 in-place upgrade proof, V0/V1/V2 backup migrations, invalid-input rejection before mutation, forced nine-store restore rollback, and owner-confirmed installed-iPhone data continuity.
