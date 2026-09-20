# LifeIndex PWA and Link Actions Guide

Current runtime supports habit and focus links only. Financial records are created through in-app forms.

**Status:** V2 retains the verified V1 URL Action contract; V2 physical checks pending

**Last updated:** 2026-09-06

## 1. Privacy and ownership

LifeIndex is a static, local-first PWA. GitHub Pages serves application files only; Finance, Health/Habits, Focus, Settings, action receipts, and backups remain in the current browser profile's IndexedDB unless the user explicitly exports a JSON file.

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
- Version 0.1.1 checks for a newer worker on return to the foreground and restored connectivity. Hidden/offline states, a pending update, and repeated events within 60 seconds of a successful check are skipped. Failed checks keep the current app usable and retry on a later event. Discovery only calls `registration.update()`; it cannot approve activation. Version 0.1.0 checks at startup, so reopen that version online once to discover 0.1.1 before testing the foreground-update contract.
- The app displays an update banner and requires `立即更新`.
- Finance, Habit, Focus-detail, category, and backup-preview drafts register with one shared dirty-form guard.
- When any draft is dirty, the update button is disabled until the user saves or cancels it.
- An active Focus timer is already persisted by absolute timestamps, so a user-approved update can safely reconstruct it.
- If activation fails, the current app remains open and offers a retry.

Implementation reference: [Vite PWA manual update checks](https://vite-pwa-org.netlify.app/guide/periodic-sw-updates).

## 4. Action contract

Every action requires a lowercase UUID v4-compatible `actionId`. A caller must generate a fresh UUID for every intended new operation. Reusing the same ID returns an already-handled result and never creates a second record.

All field names are case-sensitive. Unknown fields, duplicate fields, malformed percent encoding, unsupported action types, uppercase UUIDs, invalid references, and out-of-range values are rejected without a write.

### Check in a habit

Route: `#/action/check-habit`

| Field       | Required | Contract                                                       |
| ----------- | -------- | -------------------------------------------------------------- |
| `actionId`  | yes      | Fresh lowercase UUID                                           |
| `habitId`   | yes      | Existing active Habit UUID                                     |
| `localDate` | no       | Valid `YYYY-MM-DD`; defaults to the local day when preview opens |

The habit must be scheduled for the selected date. If that day is already checked in, confirmation records the action as handled but does not duplicate the daily record. Habit UUIDs are local implementation identifiers.

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

## 5. Confirmation and history

The URL is scrubbed from the current history entry after cancel, validation failure, prior handling, or successful execution. Business entity and receipt writes share one IndexedDB transaction, so a receipt failure cannot leave a partial record.

## 6. Troubleshooting

| Symptom                                  | Meaning and action                                                                 |
| ---------------------------------------- | ---------------------------------------------------------------------------------- |
| `无法识别这个链接操作`                   | Check type, spelling, duplicate fields, encoding, UUID case, date, duration |
| `这个链接操作现在不可用`                 | Reference is missing/archived/paused/unscheduled, or Focus is already active        |
| `这个链接操作已经处理过`                 | The action ID has a durable receipt; generate a new ID only for a genuinely new act |
| Offline banner does not appear immediately | Wait briefly for the body-free connectivity probe; local data does not depend on it |
| Settings says offline shell needs retry  | Reconnect, open LifeIndex once, then refresh                                        |

Never share an action URL containing real amounts, titles, notes, or local IDs in an issue, log, screenshot, or repository fixture.

## 7. Verification boundary

V2 local automation retains root/Pages-subpath builds, manifest/icon inspection, Cache Storage policy, explicit update/dirty-form components, both enabled action types, no-write preview, malformed input, stale references, atomic rollback, durable deduplication, fragment cleanup, dual-engine offline mutation, and Chromium offline reload. Playwright WebKit raises an internal error on offline `reload()`; real iPhone Home Screen launch, airplane mode, Files/iCloud, and installed update behavior remain unverified. The owner deferred those checks for `v1.0.0` in [ADR-0005](../adr/0005-v1-owner-acceptance.md); V2 must use the current [physical acceptance checklist](IPHONE_ACCEPTANCE.md).
