# LifeIndex V1 Information Architecture

**Status:** Implementation baseline

**Date:** 2026-09-03

## 1. Navigation model

LifeIndex uses five stable top-level destinations in a bottom navigation bar:

```text
LifeIndex
├── 今天 (Today)
├── 记账 (Finance)
├── 专注 (Focus)
├── 习惯 (Habits)
└── 设置 (Settings)
```

Today is the default route and aggregation surface. It owns no business records; every value is derived from Finance, Focus, Habits, or Settings repositories.

On narrow iPhones the bottom navigation remains visible while primary content scrolls. Creation and editing use full-height sheets/pages rather than tiny desktop-style dialogs. Destructive confirmations may use compact modal sheets.

## 2. Route map

The implementation may refine route syntax, but the information model is:

```text
/
├── today
├── finance
│   ├── transactions/new
│   ├── transactions/:id/edit
│   ├── history
│   └── categories
├── focus
│   ├── active
│   ├── sessions/:id/edit
│   └── history
├── habits
│   ├── new
│   ├── :id
│   ├── :id/edit
│   └── calendar
├── settings
│   ├── data
│   ├── appearance
│   ├── categories
│   ├── habits
│   └── about
└── action
    ├── add-transaction
    ├── check-habit
    └── start-focus
```

GitHub Pages and privacy make hash-based client routes the leading M2 candidate. In that design, an action looks like `#/action/add-transaction?...`; everything after `#` remains client-side and is not part of the HTTP request.

## 3. Today

### Content priority

1. Current local date and offline/update status only when actionable.
2. Habit completion strip for habits scheduled today.
3. Quick actions: add transaction and start focus.
4. Compact finance and focus summaries.

### States

- First use: gentle explanation plus three clear starting actions.
- Normal day: summaries with the next useful action.
- All habits complete: calm completion state, not a celebratory interruption.
- Active focus session: persistent status and return-to-timer action.
- Offline: a small status indicator while local actions remain enabled.

## 4. Finance

### Main screen

- Period selector: Today, Week, Month, History.
- Selected-period income, expense, and balance.
- Transaction list, newest first, grouped by local date where useful.
- Primary add button.
- Month view may reveal category breakdown and recent trend below the list/summary.

### Add/edit transaction flow

```text
Finance/Today quick action
  -> choose expense or income
  -> enter amount
  -> choose matching category
  -> adjust date/time if needed
  -> add optional note
  -> validate
  -> save to IndexedDB
  -> show result in selected period
```

Amount receives input focus first. The last appropriate category may be suggested later only if it does not obscure the current choice. V1 must not auto-save partially completed transactions.

### Category lifecycle

- Default categories are available after first initialization.
- Archive replaces deletion for referenced categories.
- Archived categories remain visible on historical records but do not appear in new-entry choices by default.

## 5. Focus

### Main screen hierarchy

1. Active timer or duration presets.
2. Required title and optional category/note.
3. Today/week summary.
4. Recent completed sessions and history link.

### Timer flow

```text
idle
  -> configure 25 / 50 / custom + title
  -> start (persist active state first)
  -> active
       -> natural completion -> save completed session -> idle
       -> finish early -> confirm -> save measured session -> idle
       -> cancel -> confirm -> remove active state -> idle
```

Returning from background or reloading resolves the display from persisted timestamps before offering any transition. There is no pause/resume interval in V1.

## 6. Habits

### Main screen

- Today schedule and direct check-in toggles.
- Completion progress for the local date.
- Month calendar entry.
- Active and paused habit management.

### Habit flow

```text
create habit
  -> name + marker
  -> every day or selected weekdays
  -> start date
  -> active
  -> save
```

Daily check-in is reversible. A habit detail view explains the schedule and shows current streak, longest streak, month completion rate, total completions, and a local-date calendar.

Pausing a habit preserves records. V1 avoids destructive habit deletion in normal UI; a future maintenance tool can be designed separately if necessary.

## 7. Settings

Settings is organized by user intent:

- Data safety: export, restore, last export, schema version, durability explanation.
- Organization: finance categories and active/paused habits.
- Appearance: system/light/dark.
- About: product version, tagline, privacy model, repository link after deployment.

Settings does not contain daily transaction, timer, or check-in actions.

## 8. Backup/restore flow

```text
select JSON file
  -> read without mutating IndexedDB
  -> parse JSON
  -> validate envelope, version, records, unique keys, references
       -> invalid: report sanitized errors, current data unchanged
       -> valid: show backup time and per-store counts
  -> user confirms replace
  -> one logical restore transaction
       -> success: reload repository views and report counts
       -> failure: roll back and report safe retry guidance
```

Merge import is intentionally absent from V1 because ambiguous conflict rules put data safety at risk.

## 9. URL Action flow

```text
iOS Shortcut opens #/action/<type>?...
  -> app initializes database
  -> parser accepts only allowlisted action and fields
  -> schema validation and canonicalization
  -> idempotency check
       -> already handled: show prior outcome without writing
       -> new: render preview/prefilled form
  -> user confirms
  -> repository mutation
  -> mark action handled
  -> replace route so refresh cannot replay it
```

No action may silently mutate data merely because a URL was opened.

## 10. Global state and recovery

- Loading: skeletons reflect final layout and do not block navigation longer than initialization requires.
- Empty: state names what is absent and offers the next relevant action.
- Validation error: shown beside the field and summarized for assistive technology.
- Storage failure: preserve entered form state in memory, avoid false success, provide retry or safe exit.
- First-load network failure: explain that one online load is required before offline use.
- Update available: offer an explicit reload after protecting current form/timer state.

## 11. Interaction budget

| Task                                    | Budget from primary destination                            |
| --------------------------------------- | ---------------------------------------------------------- |
| Check/uncheck today's habit             | 1 tap                                                      |
| Open add-transaction form               | 1 tap                                                      |
| Save a valid common transaction         | No more than 4 purposeful interactions after opening       |
| Start a preset focus session with title | No more than 3 purposeful interactions after opening Focus |
| Reach export/restore                    | No more than 2 taps after opening Settings                 |
