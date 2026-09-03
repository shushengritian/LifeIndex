# LifeIndex PWA and iOS Shortcuts Guide

**Status:** M6 implementation and automated verification complete; physical iPhone steps remain in M9

**Last updated:** 2026-09-03

## 1. Privacy and ownership

LifeIndex is a static, local-first PWA. GitHub Pages serves application files only; Finance, Habits, Focus, Settings, action receipts, and backups remain in the current browser profile's IndexedDB unless the user explicitly exports a JSON file.

URL Actions use this shape:

```text
https://HOST/BASE/#/action/TYPE?FIELDS
```

Everything after `#` is a fragment and is not included in the HTTP request. HTTP-query actions such as `https://HOST/BASE/?amount=...` are unsupported because they can expose values to hosting and network history.

## 2. Installation and offline behavior

After one successful online launch:

1. Safari can add LifeIndex to the iPhone Home Screen.
2. The service worker caches the HTML, versioned JavaScript/CSS, manifest, and production icons.
3. Business records are never written to Cache Storage; IndexedDB remains authoritative.
4. When network access is unavailable, the app displays `当前离线 · 本机数据仍可继续使用` and local create/edit workflows remain available.
5. Settings shows whether the offline application shell is ready.

The app checks connectivity with a same-origin, body-free `HEAD` request that contains no record values. This avoids treating a successfully cached page as proof that the network is reachable.

## 3. Controlled updates

- A newly installed worker waits; LifeIndex never silently reloads the current screen.
- The app displays an update banner and requires `立即更新`.
- Finance, Habit, Focus-detail, category, and backup-preview drafts register with one shared dirty-form guard.
- When any draft is dirty, the update button is disabled until the user saves or cancels it.
- An active Focus timer is already persisted by absolute timestamps, so a user-approved update can safely reconstruct it.
- If activation fails, the current app remains open and offers a retry.

## 4. Action contract

Every action requires a lowercase UUID v4-compatible `actionId`. A Shortcut must generate a fresh UUID for every intended new operation. Reusing the same ID returns an already-handled result and never creates a second record.

All field names are case-sensitive. Unknown fields, duplicate fields, malformed percent encoding, unsupported action types, uppercase UUIDs, invalid references, and out-of-range values are rejected without a write.

### Add transaction

Route: `#/action/add-transaction`

| Field        | Required | Contract                                                                    |
| ------------ | -------- | --------------------------------------------------------------------------- |
| `actionId`   | yes      | Fresh lowercase UUID                                                        |
| `amount`     | yes      | Positive CNY decimal with at most two fraction digits                       |
| `categoryId` | yes      | Active Finance category ID matching the transaction type                    |
| `type`       | no       | `expense` or `income`; defaults to `expense`                                |
| `occurredAt` | no       | ISO-8601 instant with offset; defaults to the time the action page is opened |
| `note`       | no       | 1–280 normalized characters                                                 |

Stable default expense IDs include:

| Display name | ID                                          |
| ------------ | ------------------------------------------- |
| 餐饮         | `category-finance-expense-food-v1`          |
| 交通         | `category-finance-expense-transport-v1`     |
| 购物         | `category-finance-expense-shopping-v1`      |
| 居家         | `category-finance-expense-home-v1`          |
| 健康         | `category-finance-expense-health-v1`        |
| 娱乐         | `category-finance-expense-entertainment-v1` |
| 其他支出     | `category-finance-expense-other-v1`         |

Default income IDs are `category-finance-income-salary-v1`, `category-finance-income-bonus-v1`, `category-finance-income-refund-v1`, and `category-finance-income-other-v1`.

Synthetic example:

```text
#/action/add-transaction?actionId=00000000-0000-4000-8000-000000000901&amount=35.10&categoryId=category-finance-expense-food-v1&note=Lunch
```

### Check in a habit

Route: `#/action/check-habit`

| Field       | Required | Contract                                                       |
| ----------- | -------- | -------------------------------------------------------------- |
| `actionId`  | yes      | Fresh lowercase UUID                                           |
| `habitId`   | yes      | Existing active Habit UUID                                     |
| `localDate` | no       | Valid `YYYY-MM-DD`; defaults to the local day when preview opens |

The habit must be scheduled for the selected date. If that day is already checked in, confirmation records the action as handled but does not duplicate the daily record. Habit UUIDs are local implementation identifiers; the initial V1 Shortcut setup uses a test habit ID captured during guided M9 acceptance.

### Start focus

Route: `#/action/start-focus`

| Field             | Required | Contract                                            |
| ----------------- | -------- | --------------------------------------------------- |
| `actionId`        | yes      | Fresh lowercase UUID                                |
| `title`           | yes      | 1–100 normalized characters                         |
| `durationMinutes` | no       | Integer from 1 through 240; defaults to 25          |
| `categoryId`      | no       | Active Focus category ID                            |
| `note`            | no       | 1–500 normalized characters                         |

Stable Focus IDs are `category-focus-work-v1`, `category-focus-study-v1`, `category-focus-reading-v1`, and `category-focus-personal-v1`.

## 5. Building an iOS Shortcut

1. Add `Generate UUID`; convert it to lowercase if the current Shortcuts version emits uppercase characters.
2. Collect or define the action values.
3. Percent-encode every user-entered text value with the Shortcuts URL-encoding action.
4. Compose the deployed LifeIndex URL with the action route and documented fields after `#`.
5. Add `Open URLs`.
6. Review the LifeIndex preview and confirm. Do not design the Shortcut to tap the confirmation automatically.

The URL is scrubbed from the current history entry after cancel, validation failure, prior handling, or successful execution. Business entity and receipt writes share one IndexedDB transaction, so a receipt failure cannot leave a partial record.

## 6. Troubleshooting

| Symptom                                  | Meaning and action                                                                 |
| ---------------------------------------- | ---------------------------------------------------------------------------------- |
| `无法识别这个快捷动作`                   | Check type, spelling, duplicate fields, encoding, UUID case, amount, date, duration |
| `这个快捷动作现在不可用`                 | Reference is missing/archived/paused/unscheduled, or Focus is already active        |
| `这个快捷动作已经处理过`                 | The action ID has a durable receipt; generate a new ID only for a genuinely new act |
| Offline banner does not appear immediately | Wait briefly for the body-free connectivity probe; local data does not depend on it |
| Settings says offline shell needs retry  | Reconnect, open LifeIndex once, then refresh                                        |

Never share an action URL containing real amounts, titles, notes, or local IDs in an issue, log, screenshot, or repository fixture.

## 7. Verification boundary

Automated M6 evidence covers root and synthetic Pages-subpath builds, manifest/icon inspection, Cache Storage policy, explicit update/dirty-form components, all three action types, no-write preview, malformed input, stale references, atomic rollback, durable deduplication, fragment cleanup, dual-engine offline mutation, and Chromium offline reload. Playwright WebKit raises an internal error on offline `reload()`; real iPhone Safari/Home Screen launch, airplane mode, Files/iCloud, and installed update behavior remain mandatory M9 checks.
