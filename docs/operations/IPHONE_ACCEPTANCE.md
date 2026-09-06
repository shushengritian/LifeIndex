# LifeIndex V2 Physical iPhone Acceptance

**Status:** First candidate reviewed; four owner-reported UI corrections awaiting redeployment and focused retest

**Last updated:** 2026-09-06

This checklist is the physical-only release gate for V2. Automated Chromium/WebKit results do not substitute for an installed iPhone report. The owner accepted V1 with earlier physical limitations documented in [ADR-0005](../adr/0005-v1-owner-acceptance.md) and the [v1.0.0 release record](../releases/v1.0.0.md); those historical limitations are not silently reclassified as V2 passes.

## 1. Evidence header

Do not record device identifiers, Apple ID, record contents, or backup contents.

| Field | Result |
| --- | --- |
| Date/time zone | TBD |
| iPhone model family | TBD |
| iOS/Safari version | TBD |
| First candidate commit SHA | `55706aa4f5300ec9cbaf7023398ccba9abccd63d` |
| Correction candidate commit SHA | Pending deployment |
| Pages URL | https://shushengritian.github.io/LifeIndex/ |
| Starting installed version | V1; owner confirmed a backup exists before deployment |
| Candidate displayed version | `2.0.0` expected; owner to confirm on-device |
| Final result | Pending |

## 2. Pre-deployment data-safety prerequisite

Complete this before the V2 candidate replaces production:

1. Open the currently installed LifeIndex while online.
2. In **设置 → 数据与安全**, choose **导出完整备份** and save it to Files or iCloud Drive.
3. Confirm the file exists and has a recent timestamp. Do not open, upload, or send its contents.
4. Keep the existing Home Screen app and Safari website data intact.

Pass condition: the owner explicitly confirms a recoverable V1 backup exists. Codex must not infer this from a browser screenshot.

**Result:** Passed on 2026-09-06. The owner explicitly replied that the V1 backup had been exported and the file's existence confirmed before `main` changed.

## 3. Installed upgrade and V1 data continuity

1. After Codex reports the verified V2 Pages deployment, open the existing Home Screen app while online.
2. If **新版本已准备好** appears, choose **立即更新** with no draft form open.
3. Confirm Settings shows application version `2.0.0` and database version `2`.
4. Confirm representative existing Finance, Focus, Habit, category, appearance, and backup-status data remains present and unchanged.
5. Force-close LifeIndex, reopen it from the Home Screen, and confirm it starts normally with five destinations: 今天、记账、专注、健康、设置.

Pass condition: V1 records remain usable after schema V2 opens; no reset, duplicate, invented Health value, or request to clear site data occurs.

## 4. Health and Habit acceptance

Use only synthetic values, then remove them after verification:

1. In Health, record `68.4` kg with no real note; force-close/reopen and confirm it persists.
2. Set a `65.0` kg target, confirm neutral target copy, then clear it.
3. Edit the synthetic weight to `68.2` kg and confirm the newest value/trend display; delete it with confirmation.
4. Record a `45` minute synthetic running Activity at “较强”, edit it to `50` minutes at “轻松”, force-close/reopen, then delete it.
5. Create `合成验收习惯`, check it in, open progress, and verify current/longest streak, monthly statistics, fourteen-week heatmap, and recent check-in. Undo once and check in again.

Pass condition: every save appears only after persistence, edits/deletes are confirmed, and Weight/Activity/Habit records survive reopen without judgmental or medical language.

## 5. Finance and Focus regression

1. Select a date in the Finance month calendar and add a `12.34` CNY synthetic expense in `餐饮`.
2. Confirm the day cell, month balance/expense/income, and selected-day ledger agree; edit to `20.00`, reopen, then delete it.
3. Start a one-minute Focus named `合成验收专注`, leave the app, lock the phone briefly, return, and finish it early.
4. Confirm Focus history is derived from persisted timestamps and remains after force-close/reopen.

Pass condition: Finance calendar and Focus state remain correct across navigation, suspension, and reopen.

## 6. Offline installed-app gate

1. While online, confirm Settings reports the offline shell ready, then force-close LifeIndex.
2. Enable airplane mode and turn Wi-Fi off.
3. Launch from the Home Screen and confirm the offline banner appears while existing synthetic data remains readable.
4. Add a `6.66` CNY synthetic expense and toggle the synthetic Habit. Close and reopen while still offline; verify both changes remain.
5. Restore connectivity and confirm no duplicate, replacement, or unexpected synchronization occurs.

Pass condition: physical Home Screen launch, read, write, and persistence work offline.

## 7. Files/iCloud backup and replacement restore

1. Export a V2 backup containing only the checklist's synthetic records and save it in Files/iCloud Drive.
2. Note the displayed export time and counts without sharing the JSON.
3. Add a `22.22` CNY synthetic expense after export.
4. Select the backup, inspect the nine-store preview, cancel once, and confirm current data is unchanged.
5. Select it again, confirm replacement, and verify the post-export `22.22` record is absent while pre-export synthetic records remain.
6. Select a small non-backup JSON/text file and confirm rejection leaves all current records unchanged.

Pass condition: iOS file handoff, preview, cancel, replacement, invalid-file rejection, and post-restore reopen are safe.

## 8. Appearance, layout, and update safety

1. Check System, Light, and Dark appearance; confirm each main page remains readable.
2. Open Finance and Health sheets with the keyboard visible; confirm fields, save/cancel controls, bottom safe area, and focus return are usable.
3. Confirm no horizontal clipping at the device's normal text size and the five-item bottom bar does not cover content.
4. For a later verified candidate deployment, leave a synthetic Finance or Health draft unsaved. Confirm **立即更新** is disabled and the draft remains. Cancel/save, apply the update, and confirm persisted records survive.

Pass condition: appearance and layout work on the actual device, and an update cannot discard a dirty form.

## 9. First-review findings and focused correction retest

The owner reported these four findings against the installed first candidate on 2026-09-06. They are not marked passed by browser automation:

| Finding | Implemented correction | Owner retest |
| --- | --- | --- |
| Finance and Health top-right add signs are not centered | Shared geometric SVG add icon inside a fixed 44 × 44 circular target | Pending updated Pages candidate |
| Date/time control width differs from the other fields | Full logical width and zero intrinsic minimum for native date/time controls | Pending updated Pages candidate |
| Settings Category management should not stay expanded | Category group remains separate; detailed editor is collapsed behind “分类管理” by default | Pending updated Pages candidate |
| Health Weight and Activity “记录” text does not look clickable | Circular icon-only add controls with VoiceOver labels “记录体重” and “记录运动” | Pending updated Pages candidate |

Focused retest after Codex confirms the corrected Pages deployment:

1. Open Finance and Health and confirm each top-right add icon looks centered inside its circle.
2. Open Finance entry, Weight entry, and Activity entry; confirm each date/time field has the same width as the other full-width fields.
3. Open Settings; confirm Categories, Appearance, Data & security, and Other remain separate, while the detailed category editor is initially hidden and opens after tapping “分类管理”.
4. In Health, confirm the Weight and Activity cards show recognizable circular add icons instead of the ambiguous “记录” text, and both controls open the expected entry sheet.

## 10. Release sign-off

The owner reports each section as pass/fail with a short synthetic-only note. Any data-loss, privacy, migration, offline-capture, blocked-control, or unrecoverable backup defect blocks the `v2.0.0` tag. Only after all required results are recorded may Codex publish the final tag and release notes.
