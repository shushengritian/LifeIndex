# ADR-0002: Dexie repositories and schema validation

**Status:** Accepted

**Date:** 2026-09-03

## Context

IndexedDB is the baseline-mandated primary database. Direct IndexedDB is event-heavy and makes versioned multi-store operations harder to audit. Safari wake/resume behavior and long-lived schema evolution are material risks. Backup input is untrusted even when selected by the owner and must be fully validated before mutation.

## Decision

- Use Dexie 4 as the IndexedDB wrapper.
- Keep a single database named `LifeIndexDB` with explicit numeric versions.
- Expose feature-specific repository interfaces; feature UI and services do not import Dexie tables directly.
- Use Zod schemas at external and persistence boundaries: form command canonicalization, URL Actions, backup import, and migration fixtures.
- Use TypeScript types generated/inferred from the same schemas where practical.
- Keep domain invariants in pure functions so money, local dates, schedules, streaks, and timer transitions can be tested without IndexedDB.
- Perform restore as a single Dexie read-write transaction across all V1 stores after complete validation.

## Rationale

- Dexie provides promise-based transactions, indexed queries, version declarations, and upgrade callbacks while preserving access to IndexedDB semantics.
- Dexie's current Safari guidance recommends Dexie 4 for workarounds around major Safari IndexedDB issues.
- Repositories prevent storage syntax from spreading through features and preserve a natural migration path.
- Runtime validation is required because TypeScript cannot validate JSON files or URL strings at runtime.

## Consequences

- Every schema/index change increments the Dexie version and includes migration fixtures.
- Repository integration tests use `fake-indexeddb`; production-intent E2E still runs in WebKit because an emulator cannot prove every Safari storage behavior.
- Backup format version and IndexedDB version are related but independent; pure backup migrations run before persistence.
- Dexie Cloud and all synchronization addons are prohibited in V1.

## Rejected alternatives

- Raw IndexedDB: fewer packages but substantially more transaction, migration, and error-handling code.
- `localStorage`: explicitly prohibited for core data and lacks transactional/indexed behavior.
- SQLite/WASM: larger operational surface and no baseline need.
- Cloud database: conflicts with local-first, privacy, offline, and no-backend requirements.

## Evidence

- [Dexie API and database versioning](https://dexie.org/docs/API-Reference)
- [Dexie IndexedDB guidance for Safari](https://dexie.org/docs/IndexedDB-on-Safari)
