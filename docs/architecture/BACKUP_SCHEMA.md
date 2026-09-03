# LifeIndex V1 Backup Schema

**Format name:** `lifeindex-backup`

**Current format version:** 1

**Status:** Normative for M4 implementation

## 1. File naming and media type

- Filename: `lifeindex-backup-YYYY-MM-DD-HHmm.json` using the user's local export time.
- Encoding: UTF-8 JSON.
- Media type when supported: `application/json`.
- Maximum accepted V1 import size: 50 MiB before parsing. This is deliberately generous for text records while bounding accidental or hostile input.

## 2. Envelope

```ts
interface LifeIndexBackupV1 {
  format: 'lifeindex-backup'
  formatVersion: 1
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
  }
  data: {
    categories: Category[]
    transactions: Transaction[]
    habits: Habit[]
    habitRecords: HabitRecord[]
    focusSessions: FocusSession[]
    settings: Setting[]
    actionReceipts: ActionReceipt[]
  }
}
```

The record definitions and invariants come from `DATA_MODEL.md`. Arrays are emitted in deterministic primary-key order so test diffs and future integrity mechanisms remain stable.

## 3. Example with synthetic data

```json
{
  "format": "lifeindex-backup",
  "formatVersion": 1,
  "appVersion": "0.1.0",
  "exportedAt": "2026-09-03T12:00:00.000Z",
  "source": {
    "timezoneOffsetMinutes": -480,
    "locale": "zh-CN"
  },
  "counts": {
    "categories": 1,
    "transactions": 0,
    "habits": 0,
    "habitRecords": 0,
    "focusSessions": 0,
    "settings": 1,
    "actionReceipts": 0
  },
  "data": {
    "categories": [
      {
        "id": "category-finance-expense-food-v1",
        "domain": "finance",
        "transactionType": "expense",
        "name": "餐饮",
        "icon": "utensils",
        "color": "sage",
        "sortOrder": 10,
        "archived": 0,
        "createdAt": "2026-09-03T12:00:00.000Z",
        "updatedAt": "2026-09-03T12:00:00.000Z"
      }
    ],
    "transactions": [],
    "habits": [],
    "habitRecords": [],
    "focusSessions": [],
    "settings": [
      {
        "key": "currency",
        "value": { "code": "CNY" },
        "updatedAt": "2026-09-03T12:00:00.000Z"
      }
    ],
    "actionReceipts": []
  }
}
```

All example values are synthetic. Real backups are excluded by `.gitignore` and must never become fixtures.

## 4. Export algorithm

1. Log `backup.export.started` with app/schema versions only.
2. Open a Dexie read transaction covering every exported store to obtain one consistent snapshot.
3. Sort each store by primary key.
4. Validate the in-memory envelope using the current backup schema.
5. Serialize with two-space indentation for human inspectability.
6. Create a Blob and invoke the browser share/download path.
7. After the handoff is initiated successfully, write `lastSuccessfulExportAt` and log counts/version—not record values.
8. Revoke object URLs in a `finally` path.

Failure before step 6 does not update the last-export setting. Browser APIs cannot prove that the user ultimately retained the file; UI wording must say “最近导出” rather than “云端已备份”.

## 5. Import validation pipeline

No database write occurs during these stages:

1. Reject files over 50 MiB or unsupported media/file shape.
2. Decode UTF-8 and parse JSON with failure classification.
3. Validate `format` and integer `formatVersion`.
4. Migrate supported older backup versions in memory, one pure step at a time.
5. Validate every field and domain invariant.
6. Check unique primary and compound keys.
7. Check all references and action-receipt outcomes.
8. Recompute counts and reject mismatches.
9. Produce a safe preview containing only version, export time, and store counts.

The UI never renders backup strings as HTML and never logs raw validation input.

## 6. Replace restore

After explicit user confirmation:

1. Revalidate the already parsed canonical object immediately before write.
2. Start one Dexie `rw` transaction over all seven stores.
3. Clear all seven stores.
4. Bulk insert arrays in dependency order: categories, habits, transactions, habit records, focus sessions, settings, action receipts.
5. Let any exception abort and roll back the transaction.
6. After commit, reopen/reactivate live queries and verify counts.
7. Report success and log only versions/counts.

The confirmation must state that current LifeIndex data will be replaced and that V1 does not merge. It should recommend exporting the current state first.

## 7. Failure behavior

| Failure                          | User-visible result                                               | Data guarantee                          |
| -------------------------------- | ----------------------------------------------------------------- | --------------------------------------- |
| File too large or unreadable     | File could not be read; choose a valid LifeIndex JSON backup      | No database write started               |
| Invalid JSON/schema/version      | Sanitized field/category summary                                  | No database write started               |
| Duplicate/dangling records       | Counts of invalid relationships, not private values               | No database write started               |
| Quota/transaction/Dexie failure  | Restore failed and current data was retained; safe retry guidance | Transaction abort required and verified |
| Post-commit view refresh failure | Data restored; app offers reload and a safe error ID              | Committed data remains authoritative    |

If a browser defect makes atomic multi-store behavior uncertain in a supported environment, release is blocked until physical evidence and a safer coordinator exist.

## 8. Compatibility policy

- `formatVersion` changes only for a breaking envelope/data representation change.
- `appVersion` is informational and does not decide compatibility.
- Readers accept the current version and every explicitly supported older version with tested migration functions.
- Unknown future versions are rejected without mutation and the user is told to update LifeIndex.
- Export always emits only the current version.
- A migration never invents a personal value; it uses documented neutral defaults or rejects the record.

## 9. Not included in V1

- Merge/conflict resolution.
- Incremental or differential backups.
- Encryption or password protection implemented by LifeIndex.
- Automatic upload, scheduled cloud backup, or background Files access.
- Backup of service-worker caches, logs, UI drafts, or derived statistics.
