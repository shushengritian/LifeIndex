# LifeIndex V1 Physical iPhone Acceptance

**Status:** Ready to execute after the live Pages gate

**Last updated:** 2026-09-04

## 1. Evidence header

Complete this header during M9. Do not record device identifiers, Apple ID, or personal data.

| Field                 | Result |
| --------------------- | ------ |
| Date/time zone        | TBD    |
| iPhone model family   | TBD    |
| iOS/Safari version    | TBD    |
| Deployed commit SHA   | TBD    |
| Pages URL             | TBD    |
| Installed/standalone  | TBD    |
| Final result          | TBD    |

## 2. Safety rules

- Use only the synthetic names and amounts in this checklist.
- Save the test backup to a clearly named temporary folder in Files/iCloud Drive; delete it after acceptance if no longer needed.
- Never send the backup, action URL, local IDs, screenshots with values, or Safari diagnostic logs to GitHub.
- Do not clear Safari website data, delete the Home Screen app, or remove a backup while it is the only copy of important records.
- Stop at the first failed step, record the visible symptom without private content, and fix/repeat the affected section before release.

## 3. Install and standalone launch

1. Open the verified Pages HTTPS URL in Safari and confirm Today appears without a console/browser warning.
2. Use **Share → Add to Home Screen** (on some Safari layouts, open **More → Share** first). If **Open as Web App / 作为网页 App 打开** is shown, keep it enabled; keep the name `LifeIndex`, and confirm the generated icon matches the approved sage ring. If the Home Screen action is missing, use **Edit Actions** to add it. See [Apple's installation guide](https://support.apple.com/zh-cn/guide/iphone/iphea86e5236/ios).
3. Launch from the new Home Screen icon. Confirm it opens without Safari chrome, starts on Today, respects safe areas, and reaches all five bottom-navigation destinations.
4. Rotate or enlarge text only if that is part of the user's normal device configuration; record any clipping or blocked control.

Pass condition: the installed app is recognizable, standalone, readable, and fully navigable with normal touch input.

## 4. Local persistence and suspension

1. Add an expense of `12.34` CNY in `餐饮` with note `合成验收账目`.
2. Create a daily habit named `合成验收习惯` and check it for today.
3. Start a one-minute Focus named `合成验收专注`, leave the app, lock the phone briefly, return, and finish it.
4. Force-close LifeIndex, reopen it from the Home Screen, and verify the transaction, habit state, and Focus history remain correct.

Pass condition: persisted timestamps—not background callback frequency—produce the correct Focus result, and all three modules survive close/relaunch.

## 5. Airplane-mode offline gate

1. Confirm Settings reports the offline shell is ready, then force-close LifeIndex.
2. Enable airplane mode and ensure Wi-Fi is also off.
3. Launch from the Home Screen, refresh/relaunch once, and confirm the offline banner appears while existing synthetic data remains readable.
4. Add a `6.66` CNY synthetic expense and toggle the synthetic habit. Close and reopen while still offline; verify both changes remain.
5. Restore connectivity and confirm no duplicate, data replacement, or unexpected remote synchronization occurs.

Pass condition: installed launch, reload, read, write, and persistence work offline on physical Safari/Home Screen.

## 6. Files/iCloud backup and replacement restore

1. In Settings, export a complete backup and save it as a synthetic LifeIndex JSON file in Files or iCloud Drive.
2. Note the on-screen backup time and expected counts; do not open or share the JSON contents.
3. Add a `22.22` CNY synthetic expense after export.
4. Select the saved backup, verify the preview metadata/counts, cancel once, and confirm current data is unchanged.
5. Select it again, explicitly confirm replacement, and verify `22.22` is absent while the pre-export `12.34` and `6.66` records are present.
6. Try a small non-backup JSON/text file and confirm LifeIndex rejects it while keeping all current records.

Pass condition: real iOS file handoff, preview, cancel, replacement, rejection, and post-restore restart are safe.

## 7. URL Actions and Shortcuts

Use the deployed base URL and the contracts in `PWA_AND_SHORTCUTS.md`.

1. Open a synthetic add-transaction fragment action with a fresh lowercase UUID. Confirm preview causes no write; cancel and verify its fields disappear from the active URL/history entry.
2. Open it again with another UUID, confirm once, and verify exactly one record. Reopen the identical handled URL and verify no duplicate appears.
3. Repeat preview/confirm with the synthetic habit and a one-minute Focus action.
4. Open an action containing an unknown field and confirm it is rejected, scrubbed, and writes nothing.
5. Build one iOS Shortcut using **Generate UUID → lowercase → URL Encode → Open URLs** and verify it stops at LifeIndex's confirmation screen.

Pass condition: valid actions are preview-first and idempotent; invalid/canceled values are removed and never mutate data.

## 8. Controlled update gate

This section requires a second verified Pages deployment after the installed version is controlling the app.

Use 0.1.1 or later as the starting version for this foreground-update test. If 0.1.0 was installed first, reopen it online and apply the available update before creating the dirty form; 0.1.0 only initiates update discovery at startup. The operator then deploys a different, verified version and records both versions. Merely redeploying unchanged application bytes does not prove an update transition.

1. Begin a Finance form and leave a synthetic amount unsaved.
2. After the new deployment is available, bring LifeIndex to the foreground and wait for the update banner.
3. Confirm `立即更新` is disabled while the draft is dirty and the entered value remains visible.
4. Cancel or save the draft, apply the update, and confirm LifeIndex reloads to the new displayed version without losing persisted records.
5. If an active Focus was running, confirm its elapsed state reconstructs from timestamps.

Pass condition: updates are explicit, dirty work is protected, and persisted data/state survives activation.

## 9. Release sign-off

Record each section as pass/fail with a short synthetic-only note. M6.4, M9, and `v1.0.0` remain blocked until the user explicitly confirms sections 3–8 on the physical iPhone. Automated Chromium/WebKit evidence must not be substituted for this sign-off.
