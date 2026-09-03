# LifeIndex V1 Data Model

**Database:** `LifeIndexDB`

**Dexie schema version:** 1

**Status:** Normative for M3/M4 implementation

## 1. Shared conventions

- `id`: lowercase UUID string.
- `createdAt`, `updatedAt`, `startedAt`, `endedAt`, `completedAt`, `handledAt`: UTC ISO 8601 instant strings.
- `localDate`, `startLocalDate`: calendar date string matching `^\d{4}-\d{2}-\d{2}$`, interpreted in the user's device-local calendar.
- `timezoneOffsetMinutes`: the `Date.getTimezoneOffset()` value at capture time, retained for audit/display stability.
- Text is trimmed, normalized to NFC, and bounded by the field limits below.
- Derived statistics are calculated, not persisted.

## 2. Store overview and indexes

Dexie declares only primary keys and query indexes, not every field.

| Store | Primary key and indexes | Purpose |
| --- | --- | --- |
| `categories` | `id, [domain+archived], [domain+transactionType+archived], sortOrder, updatedAt` | Finance and optional Focus organization |
| `transactions` | `id, occurredAt, localDate, type, categoryId, [localDate+type], updatedAt` | Income and expense records |
| `habits` | `id, status, startLocalDate, updatedAt` | Habit definitions and schedules |
| `habitRecords` | `id, &[habitId+localDate], habitId, localDate, completedAt` | One completion per habit/local date |
| `focusSessions` | `id, status, startedAt, localDate, categoryId, updatedAt` | Active and completed focus sessions |
| `settings` | `key, updatedAt` | Typed application preferences and safety metadata |
| `actionReceipts` | `actionId, actionType, handledAt, outcomeEntityId` | Durable URL Action idempotency |

The application enforces at most one active focus session. IndexedDB cannot express a partial unique index, so `startFocus` checks and writes in one transaction.

## 3. Category

```ts
type CategoryDomain = 'finance' | 'focus'
type TransactionType = 'expense' | 'income'

interface Category {
  id: string
  domain: CategoryDomain
  transactionType?: TransactionType
  name: string
  icon: string
  color: string
  sortOrder: number
  archived: 0 | 1
  createdAt: string
  updatedAt: string
}
```

Rules:

- Finance categories require `transactionType`; focus categories omit it.
- `name`: 1–40 Unicode characters after trimming.
- `icon`: one allowlisted icon key, not arbitrary HTML/SVG.
- `color`: one design-token key, not an untrusted CSS value.
- Archiving preserves historical references.
- Deleting a referenced category is prohibited. V1 UI uses archive rather than hard deletion.

## 4. Transaction

```ts
interface Transaction {
  id: string
  type: TransactionType
  amountMinor: number
  currency: string
  categoryId: string
  occurredAt: string
  localDate: string
  timezoneOffsetMinutes: number
  note?: string
  createdAt: string
  updatedAt: string
}
```

Rules:

- `amountMinor` is a positive safe integer, maximum `99_999_999_999` minor units.
- `currency` is an uppercase ISO 4217 code; V1 entry uses the current `CNY` default.
- Category domain/type must match the transaction type, including archived historical categories on edit.
- `note`: optional, maximum 280 Unicode characters.
- `localDate` is calculated from the selected local date/time, not by slicing a UTC string.

## 5. Habit

```ts
type HabitStatus = 'active' | 'paused'

type HabitSchedule =
  | { type: 'daily' }
  | { type: 'weekdays'; weekdays: number[] }

interface Habit {
  id: string
  name: string
  icon: string
  color: string
  schedule: HabitSchedule
  startLocalDate: string
  status: HabitStatus
  pausedAt?: string
  note?: string
  createdAt: string
  updatedAt: string
}
```

Rules:

- `weekdays` contains unique integers `0..6`, where 0 is Sunday, in sorted order; it cannot be empty.
- `name`: 1–60 characters; `note`: optional, maximum 280 characters.
- Dates before `startLocalDate` are never scheduled.
- Pausing stops future scheduled presentation but never removes past records.

## 6. Habit record

```ts
interface HabitRecord {
  id: string
  habitId: string
  localDate: string
  completedAt: string
  timezoneOffsetMinutes: number
  note?: string
  createdAt: string
  updatedAt: string
}
```

Rules:

- `id` is a UUID; unique compound index `[habitId+localDate]` enforces one completion.
- Check-in uses transactional `put-if-absent` semantics; undo deletes the matching record.
- Check-in is permitted for scheduled dates on/after habit start. Historical UI may explicitly record/undo a scheduled past date.
- `note`: optional, maximum 280 characters.

## 7. Focus session

```ts
type FocusStatus = 'active' | 'completed'

interface FocusSession {
  id: string
  status: FocusStatus
  title: string
  categoryId?: string
  note?: string
  startedAt: string
  plannedDurationSeconds: number
  expectedEndAt: string
  endedAt?: string
  durationSeconds?: number
  completionKind?: 'timer' | 'early'
  localDate: string
  timezoneOffsetMinutes: number
  createdAt: string
  updatedAt: string
}
```

Rules:

- `title`: 1–100 characters; `note`: optional, maximum 500 characters.
- Planned duration is an integer from 60 to 14,400 seconds (1 minute to 4 hours). Presets are 1,500 and 3,000 seconds.
- Active rows have no `endedAt`, `durationSeconds`, or `completionKind`.
- Completed rows require those fields; duration is positive and no greater than planned duration for V1.
- Natural completion uses `expectedEndAt` and the planned duration even if the app resumes later.
- Early finish uses current time and measured positive seconds. Sessions below 1 second are cancelled rather than saved.
- Cancel removes the active row and does not preserve a cancelled business record.

## 8. Settings

```ts
type SettingKey =
  | 'appearance'
  | 'currency'
  | 'onboarding'
  | 'lastSuccessfulExportAt'

interface Setting<T = unknown> {
  key: SettingKey
  value: T
  updatedAt: string
}
```

Typed values:

- `appearance`: `'system' | 'light' | 'dark'`
- `currency`: `{ code: 'CNY' }` in V1
- `onboarding`: `{ localDataNoticeSeen: boolean; backupNoticeSeen: boolean }`
- `lastSuccessfulExportAt`: ISO instant string, written only after the browser accepts export/share initiation successfully enough to report it

Settings are individual rows to avoid unrelated preference conflicts in future migrations.

## 9. Action receipt

```ts
type ActionType = 'add-transaction' | 'check-habit' | 'start-focus'

interface ActionReceipt {
  actionId: string
  actionType: ActionType
  handledAt: string
  outcomeEntityId: string
}
```

Rules:

- `actionId` is supplied by the Shortcut and must be a UUID.
- Receipt and business mutation are written in the same transaction.
- A repeated action ID returns the existing outcome without writing.
- Receipts contain no action payload and are retained/exported in V1 to preserve idempotency after restore.

## 10. Referential integrity

IndexedDB does not enforce foreign keys. Repositories and backup validation enforce:

- Every transaction category exists, has `domain=finance`, and has matching `transactionType`.
- Every habit record references an existing habit.
- Every focus `categoryId`, when present, references `domain=focus`.
- Every action receipt outcome references an existing entity of the action's expected type.
- Restore rejects dangling references before opening a write transaction.

Deleting a transaction or completed focus session also deletes any receipt whose outcome refers to it, in the same transaction. Habit check-in undo removes its matching receipt only when that receipt created the record and no retained action should remain authoritative.

## 11. Default data

First initialization inserts stable-ID categories idempotently:

- Expense: Food, Transport, Shopping, Home, Health, Entertainment, Other.
- Income: Salary, Bonus, Refund, Other.
- Focus: Work, Study, Reading, Personal.

Visible names are Chinese in the UI seed. Stable IDs use non-personal constants such as `category-finance-expense-food-v1`, not UUIDs, so a retry cannot duplicate defaults. User-created entities use UUIDs.

## 12. Migration policy

- Version 1 creates all V1 stores and indexes.
- A new store, index change, or persisted-field invariant increments the database version.
- Upgrade callbacks are deterministic and do not access network or UI state.
- Every upgrade has fixtures representing the oldest supported version, malformed rows, boundary dates/money, and enough records to expose transaction mistakes.
- A failed upgrade surfaces `MigrationError` and blocks writes; it never recreates/deletes the database automatically.
- Removing support for a backup/database version is a release decision documented in an ADR and migration guide.
