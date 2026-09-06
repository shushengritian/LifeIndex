# LifeIndex V2 Data Model

**Database:** `LifeIndexDB`

**Dexie schema version:** 2

**Status:** Schema V2, Health repositories, and migration implemented; UI integration pending

## 1. Shared conventions

- User-created `id`: lowercase UUID; stable seed categories use documented constant IDs.
- Instants: UTC ISO 8601 strings with offsets accepted by validation and canonical `Date#toISOString` on application writes.
- Local dates: valid `YYYY-MM-DD` device-calendar keys.
- `timezoneOffsetMinutes`: captured `Date#getTimezoneOffset()` integer from -840 through 840.
- Text: trimmed, NFC-normalized, bounded; optional text is omitted rather than stored blank.
- Money: positive integer minor units.
- Weight: integer grams.
- Activity duration: positive integer whole minutes.
- Statistics, calendar cells, trends, heatmaps, and summaries are projections, not persisted truth.

## 2. Stores and indexes

| Store | Primary key and indexes | Version | Purpose |
| --- | --- | --- | --- |
| `categories` | `id,[domain+archived],[domain+transactionType+archived],sortOrder,updatedAt` | V1 retained | Finance, Focus, Activity organization |
| `transactions` | `id,occurredAt,localDate,type,categoryId,[localDate+type],updatedAt` | V1 retained | Income/expense records |
| `habits` | `id,status,startLocalDate,updatedAt` | V1 retained | Habit definitions/schedules |
| `habitRecords` | `id,&[habitId+localDate],habitId,localDate,completedAt` | V1 retained | One completion per Habit/local date |
| `focusSessions` | `id,status,startedAt,localDate,categoryId,updatedAt` | V1 retained | Active/completed Focus |
| `settings` | `key,updatedAt` | V1 retained | Typed preferences/safety metadata |
| `actionReceipts` | `actionId,actionType,handledAt,outcomeEntityId` | V1 retained | URL Action idempotency |
| `weightEntries` | `id,measuredAt,localDate,updatedAt` | V2 new | Manual body-weight history |
| `activitySessions` | `id,occurredAt,localDate,categoryId,intensity,updatedAt` | V2 new | Lightweight activity history |

Indexes support bounded UI queries and do not encode every invariant. Repositories/backup validation enforce references and state.

## 3. Category

```ts
type CategoryDomain = 'finance' | 'focus' | 'activity'
type TransactionType = 'expense' | 'income'

interface Category {
  id: string
  domain: CategoryDomain
  transactionType?: TransactionType
  name: string
  icon: CategoryIcon
  color: CategoryColor
  sortOrder: number
  archived: 0 | 1
  createdAt: string
  updatedAt: string
}
```

Rules:

- Finance requires a transaction type; Focus and Activity omit it.
- Name is 1–40 characters.
- Icon/color are allowlisted tokens, not HTML or arbitrary CSS.
- Archive preserves historical references; archived categories cannot be selected for new records.
- Reorder is limited to one domain/type/archive group.

V2 adds stable Activity defaults: Walking, Running, Cycling, Strength, Yoga, Other. Existing V1 categories remain untouched.

## 4. Transaction

The V1 shape and invariants are unchanged:

```ts
interface Transaction {
  id: string
  type: 'expense' | 'income'
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

`amountMinor` is 1 through `99_999_999_999`, category must be matching Finance type, currency is three uppercase letters (current entry uses CNY), and note is at most 280 characters.

## 5. Habit and HabitRecord

The shipped V1 fields and semantics are unchanged. `HabitSchedule` is daily or sorted unique weekdays `0..6`; Habit name is at most 60 characters; notes are at most 280. A paused Habit has `pausedAt`; an active Habit does not. Dates before `startLocalDate` are never scheduled.

`HabitRecord` keeps UUID, `habitId`, `localDate`, `completedAt`, offset, optional note, and audit timestamps. `[habitId+localDate]` remains unique. Check-in validates the schedule and is idempotent; undo removes only the matching completion and any authoritative receipt under the existing action rule.

## 6. FocusSession

The V1 shape and timestamp state machine are unchanged. Planned duration remains 60–14,400 seconds; active rows omit completion fields; completed rows require `endedAt`, positive `durationSeconds` no greater than plan, and `timer|early`. At most one active row is enforced by a transaction.

## 7. WeightEntry

```ts
interface WeightEntry {
  id: string
  weightGrams: number
  measuredAt: string
  localDate: string
  timezoneOffsetMinutes: number
  note?: string
  createdAt: string
  updatedAt: string
}
```

Rules:

- `weightGrams`: integer from 20,000 through 500,000 inclusive.
- UI accepts kilograms with up to three decimal places and converts without floating-point multiplication.
- UI normally displays one decimal kilogram; export retains exact grams.
- `note`: optional, at most 280 characters.
- Multiple entries per local date are allowed; `measuredAt` orders newest first.
- Trend compares latest with earliest available entry in the inclusive trailing 30-local-day window; no persisted trend.

## 8. ActivitySession

```ts
type ActivityIntensity = 'light' | 'moderate' | 'hard'

interface ActivitySession {
  id: string
  categoryId: string
  durationMinutes: number
  intensity: ActivityIntensity
  occurredAt: string
  localDate: string
  timezoneOffsetMinutes: number
  note?: string
  createdAt: string
  updatedAt: string
}
```

Rules:

- `categoryId` references an Activity category.
- `durationMinutes`: integer 1–1,440.
- Intensity is perceived effort only and carries no medical interpretation.
- `note`: optional, at most 280 characters.
- Multiple sessions per date are allowed; list order is newest `occurredAt` first.
- Weekly summary uses Monday through Sunday local dates and safe-integer accumulation.

## 9. Settings

```ts
type Setting =
  | { key: 'appearance'; value: 'system' | 'light' | 'dark'; updatedAt: string }
  | { key: 'currency'; value: { code: 'CNY' }; updatedAt: string }
  | { key: 'onboarding'; value: { localDataNoticeSeen: boolean; backupNoticeSeen: boolean }; updatedAt: string }
  | { key: 'lastSuccessfulExportAt'; value: string; updatedAt: string }
  | { key: 'weightTarget'; value: { weightGrams: number }; updatedAt: string }
```

`weightTarget` is optional by row absence and uses the same 20,000–500,000 gram bounds. It is not seeded. Existing Settings rows are not rewritten during upgrade.

## 10. ActionReceipt

The V1 shape and types remain unchanged: `add-transaction`, `check-habit`, `start-focus`. Receipt and business mutation are atomic. V2 adds no Health action type.

## 11. Referential and uniqueness integrity

- Every Transaction references a matching Finance category/type.
- Every Focus category, when present, references Focus.
- Every ActivitySession references Activity; archived references remain valid historically.
- Every HabitRecord references an existing Habit.
- Every ActionReceipt outcome references the correct existing V1 entity type.
- Primary IDs, Setting keys, receipt action IDs, and Habit/date pairs are unique.
- At most one FocusSession is active.

Restore rejects all violations before a write transaction. Repository write validation and reference checks occur in the same transaction as mutation.

## 12. Default data

Initialization seeds missing stable keys only:

- V1 retained: seven expense, four income, four Focus categories; appearance/currency/onboarding settings.
- V2 added Activity: Walking, Running, Cycling, Strength, Yoga, Other.

Reopening never overwrites renamed/archived user values. `weightTarget` and all Health records have no personal defaults.

## 13. V1-to-V2 database migration

- Register schema V1 and schema V2 in Dexie.
- Version 2 adds only `weightEntries` and `activitySessions` stores/indexes.
- No V1 table is cleared, copied, transformed, or deleted.
- After successful open, normal idempotent seeding adds only missing Activity categories.
- Migration failure blocks app readiness and preserves the browser database; no automatic `delete()` or recreation path exists.

Required test fixture: create a real schema-V1 database with representative records in every V1 store, close it, open with V2, then assert byte-equivalent logical V1 rows, empty new stores, stable categories present, schema version 2, and normal new Health writes.

## 14. Future migration policy

Any store/index/persisted-invariant change increments the Dexie version, has deterministic synthetic predecessor fixtures and failure tests, updates backup compatibility independently, and ships a forward-compatible recovery path. A source rollback never downgrades IndexedDB.
