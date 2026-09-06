# LifeIndex V2 Backup Schema

**Format name:** `lifeindex-backup`

**Current format version:** 2

**Status:** Format V2 and V0/V1 migrations implemented; browser UI regression/hardening pending

## 1. File contract

- Filename: `lifeindex-backup-YYYY-MM-DD-HHmm.json` in local export time.
- Encoding/media: UTF-8 JSON / `application/json` when supported.
- Maximum accepted size: 50 MiB before parsing.
- Arrays are sorted by primary key for deterministic tests/diffs.
- Real exports remain ignored and must never become repository fixtures.

## 2. V2 envelope

```ts
interface LifeIndexBackupV2 {
  format: 'lifeindex-backup'
  formatVersion: 2
  appVersion: string
  exportedAt: string
  source: {
    timezoneOffsetMinutes: number
    locale: string
  }
  counts: {
    categories: number
    transactions: number
    habits: number
    habitRecords: number
    focusSessions: number
    settings: number
    actionReceipts: number
    weightEntries: number
    activitySessions: number
  }
  data: {
    categories: Category[]
    transactions: Transaction[]
    habits: Habit[]
    habitRecords: HabitRecord[]
    focusSessions: FocusSession[]
    settings: Setting[]
    actionReceipts: ActionReceipt[]
    weightEntries: WeightEntry[]
    activitySessions: ActivitySession[]
  }
}
```

Record rules are normative in [DATA_MODEL.md](DATA_MODEL.md).

## 3. Export algorithm

1. Emit `backup.export.started` with format version only.
2. Read all nine stores in one Dexie read transaction.
3. Sort each collection by primary key.
4. Build format V2 with current app version/time/source metadata and computed counts.
5. Validate through the same strict V2 schema and integrity checks used for import.
6. Serialize with two-space indentation and hand the Blob to share/download.
7. After handoff begins, update `lastSuccessfulExportAt`; browser copy says “最近导出”, never “云端已备份”.
8. Revoke object URLs in `finally` and emit only version/count success or safe failure class.

## 4. Frozen legacy shapes

- **V0:** six original business collections and Settings; no `actionReceipts`.
- **V1:** seven shipped collections including `actionReceipts`; no Weight or Activity collections; Category domains are Finance/Focus and Settings keys are the V1 union.
- **V2:** current nine collections and expanded Category/Settings unions.

Legacy Zod schemas are frozen independently. They must not be built by omitting fields from a future `backupDataSchema`, because future union expansion could accidentally reject a historically valid file or accept a historically impossible one.

## 5. Migration pipeline

```text
V0 --add empty actionReceipts--> V1
V1 --add empty weightEntries/activitySessions--> V2
V2 --strict parse/integrity checks--> canonical preview
```

Rules:

- Migrations are pure, deterministic, and in memory.
- V0 first passes its frozen schema, then flows through the V1 step.
- V1 adds count `0` and empty arrays for both new collections.
- No migration creates Activity categories, a weight target, weight entries, or activity sessions. Database initialization may separately seed public stable Activity category definitions after restore.
- `appVersion` is informational and does not select compatibility.
- Unknown future versions are rejected without mutation.

## 6. Validation before preview

No database write occurs while the service:

1. enforces size and parses JSON;
2. validates format/header/version;
3. performs supported migrations;
4. strictly validates every current V2 field;
5. validates primary/compound uniqueness;
6. validates Transaction, Focus, Habit, Activity, and receipt references;
7. validates at most one active Focus row and typed Settings uniqueness;
8. recomputes and matches all nine counts.

The preview exposes only a random one-time token, canonical format version, source app version, export time, counts, and expiry. It expires after 15 minutes and is process-memory only.

## 7. Atomic replace restore

After explicit owner confirmation:

1. Resolve and consume only a valid non-expired preview token.
2. Revalidate the canonical V2 object.
3. Start one `rw` transaction over all nine stores.
4. Clear and insert in dependency order: categories, habits, transactions, habitRecords, focusSessions, settings, actionReceipts, weightEntries, activitySessions.
5. Re-read and compare all counts before commit.
6. On any exception, abort the transaction and report that existing data was retained.
7. On success, remove the token and refresh live queries.

Failed restore does not run seed repair inside the transaction. Normal initialization on the next load inserts only any missing stable defaults.

## 8. Failure behavior

| Failure | User result | Data guarantee |
| --- | --- | --- |
| Oversize/unreadable/invalid JSON | Choose a valid LifeIndex JSON backup | No write begun |
| Unsupported version | Update LifeIndex or select V0–V2 | No write begun |
| Schema/count/duplicate/reference/state violation | Sanitized invalid-backup message | No write begun |
| Missing/expired/consumed token | Re-select and preview | No write begun |
| Quota/table/Dexie failure | Restore failed; current data retained | Nine-store transaction abort |
| Post-commit render failure | Data restored; reload offered | Committed data remains truth |

No error copy or log contains record fields, IDs, backup text, or nested validation input.

## 9. Compatibility and rollback

- Export always emits current V2.
- Import supports V0, V1, and V2 until a separately approved removal decision.
- Backup format and database schema versions are independent.
- A deployed source rollback does not rewrite a V2 backup or downgrade IndexedDB.
- Merge restore, incremental backups, encryption, scheduled upload, cloud sync, and cache/log/draft export remain excluded.

## 10. Required verification

- Canonical V2 round trip including both new collections and optional target.
- V0→V1→V2 and V1→V2 deterministic migration with empty Health collections.
- Counts, duplicate IDs, duplicate Habit/date, invalid grams/duration/intensity, invalid categories, invalid Settings, dangling references, future version, and multiple active Focus rejection before writes.
- Forced insertion failure proves every pre-restore store remains unchanged.
- Representative larger snapshot preserves deterministic ordering and exact integer sums.
