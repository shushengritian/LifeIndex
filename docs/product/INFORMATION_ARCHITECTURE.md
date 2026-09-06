# LifeIndex V2 Information Architecture

**Status:** Approved and frozen at gate G2

**Date:** 2026-09-06

## 1. Navigation model

LifeIndex uses five persistent bottom destinations in this order:

1. Today
2. Finance
3. Focus
4. Health
5. Settings

The navigation is shallow. Health contains habits, weight, and activity as sections and detail/entry overlays, not additional bottom destinations. The compact header names the current context; version and product identity move to Settings.

The persistent navigation remains visible on destination pages and is hidden only while a modal sheet/dialog needs focused completion. Back/close always returns to the originating destination without losing committed data.

## 2. Route map

Routes use `HashRouter`, so GitHub Pages receives no application fields and direct refresh does not require server rewrites.

| Route | Purpose | Compatibility behavior |
| --- | --- | --- |
| `#/today` | Daily projection and quick actions | Default route |
| `#/finance` | Month calendar, totals, selected-day ledger, reports | Retained |
| `#/finance/new` | Optional addressable finance entry state | May render as sheet over Finance |
| `#/finance/:id` | Transaction edit/detail | Existing records retained |
| `#/focus` | Timer/setup/active/history | Retained |
| `#/health` | Weight, activity, today's habits | Replaces Habits destination |
| `#/health/weight` | Weight history/target | New |
| `#/health/activity` | Activity history | New |
| `#/health/habits/:id` | Habit detail and statistics | Existing Habit identity |
| `#/settings` | Four grouped Settings sections | Retained |
| `#/action/:actionType?...` | Existing fragment URL Action preview | Retained; no Health actions |
| `#/action-result` | Sanitized action outcome | Retained |
| `#/habits` | Legacy bookmark | Replace-redirects to `#/health` |

Unknown routes replace-redirect to Today. Record-edit routes that reference missing IDs show a safe not-found state and a route back; they never create placeholder data.

## 3. Today

### Content priority

1. Local date and compact completion count.
2. Today's scheduled Health habits as direct check-in rows.
3. Primary actions: Record transaction and Start focus.
4. Compact Finance summary row.
5. Compact Focus summary row.

Today owns no persistence. It combines bounded repository projections, and each projection represents loading/error independently so a failed read cannot become a false zero.

### Interaction

- Habit row: tap once, wait for persistence, then show completed; tap completed row to undo with the same persistence boundary.
- Record transaction: open Finance quick-entry context.
- Start focus: open Focus with setup ready.
- Summary row: navigate to its destination.

## 4. Finance

### Main screen hierarchy

1. Month title with previous/next controls.
2. Seven-column monthly calendar.
3. Small balance, expense, and income values for the visible month.
4. Selected-date heading and ledger.
5. Reports disclosure/section for category distribution and six-month trend.
6. One primary add control in thumb reach.

Calendar cells show day number and one compact signed daily net amount when records exist. Income/expense distinctions use sign/text as well as color. Selecting a day updates the ledger and selected state. Moving months clamps the selected day to the target month's valid day count; returning to the current month does not silently write a preference.

### Quick-entry sheet

1. Choose Expense or Income.
2. Enter amount with large numeric presentation.
3. Choose a recent-first active category.
4. Choose local date/time; default is now.
5. Optionally enter a note.
6. Save.

The sheet closes only after commit. Validation or persistence failure keeps every non-sensitive draft field in memory and announces the error. Edit uses the same field order; delete is a separate confirmed action.

### Category lifecycle

Finance category groups are Expense and Income. Archived categories remain rendered in historical rows and cannot be selected for new entries. Reorder applies only within one domain/type/archive group.

## 5. Focus

### Idle hierarchy

1. Large timer ring/value.
2. 25-minute, 50-minute, and custom presets.
3. Title, optional Focus category, optional note.
4. Start control.
5. Today/week/month summary and recent completed sessions.

### Active and terminal states

- Active: remaining time dominates; background/resume derives from persisted timestamps.
- Natural completion: finalized at expected end.
- Early finish: confirmation then finalizes at current time.
- Cancel: confirmation then removes the active row.
- History edit changes descriptive fields only; deletion is confirmed.

## 6. Health

### Overview hierarchy

1. Body-weight block: latest value, neutral trailing-30-day direction, optional target, Record weight.
2. Activity block: current-week count/duration, recent activities, Record activity.
3. Today's Habits block: completion count and existing one-tap rows.
4. A single add control opening Record weight / Record activity / Create habit.

If one source fails, the other Health sections remain usable and the failed source is labeled. No data shows as zero while loading.

### Weight flow

The weight sheet contains weight in kilograms, local date/time, optional note, and save. Input converts losslessly to integer grams. History is newest first. Trend uses the latest entry and the earliest entry in the trailing 30 local days; it shows the signed difference or “暂无趋势”. Target editing is optional and independent of entry history.

### Activity flow

The activity sheet contains an active Activity category, whole-minute duration, light/moderate/hard perceived intensity, local date/time, optional note, and save. Health displays the current Monday–Sunday count and duration plus recent entries. Advanced workout detail is intentionally absent.

### Habits continuity and detail

Existing create/edit/pause/resume and schedule behavior remains. Habit detail displays current/longest streak, total, current-month rate, a fourteen-week heatmap ending in the current week, and recent check-ins. Heatmap cells include non-color accessible labels.

## 7. Settings

Settings uses four separate iOS-style full-width groups, in this exact order:

1. **Categories** — Expense, Income, Focus, Activity management.
2. **Appearance** — Theme row opening System/Light/Dark choice.
3. **Data & security** — local-only explanation, export, import preview/replace, last export, database/backup versions.
4. **Other** — version, usage/help, and support information.

Appearance is neither nested inside nor visually merged with Categories or Other. Destructive replacement is visually isolated and requires explicit confirmation.

## 8. Backup and restore

```text
Settings → Data & security → Import
  → select bounded JSON
  → parse/migrate/validate entirely in memory
  → preview version/time/counts
  → explicit replace confirmation
  → one all-store IndexedDB transaction
  → success and reactive refresh, or rollback and retained-current-data message
```

V0 and V1 inputs appear in the preview as canonical V2 after migration. The UI may mention that empty Health collections were added; it must not imply that personal Health values were inferred.

## 9. URL Actions

The three V1 fragment actions remain unchanged: add transaction, check habit, start focus. The route shows a preview, validates again on confirmation, writes business record and receipt atomically, then replaces the fragment with a safe destination/result route. Health adds no action in V2.

## 10. Global states and overlays

- **Startup:** loading or explicit initialization/migration failure before routes become writable.
- **Offline:** non-blocking status; core local actions stay enabled.
- **Update ready:** explicit activation; blocked while a registered form is dirty.
- **Sheet/dialog:** focus-contained, keyboard-safe, close confirmation when dirty.
- **Save pending:** originating action disabled; duplicate submission ignored.
- **Save failure:** overlay remains open and preserves draft.
- **Empty:** explains the next primary action without invented zero statistics.

Sheets respect `env(safe-area-inset-bottom)`, use at least 16 px inputs, and degrade to an in-page dialog layout at very small heights.

## 11. Interaction budget

| Goal | Expected path |
| --- | --- |
| Check/undo today's habit | One tap from Today or Health, plus persistence wait |
| Record transaction | Open sheet, enter amount/category, save |
| Select finance history day | One calendar tap |
| Start preset focus | Open Focus, choose preset/details, start |
| Record weight | Health add or weight action, value, save |
| Record activity | Health add or activity action, type/duration/intensity, save |
| Open habit statistics | Tap habit detail affordance from Health |
| Change theme | Settings → Appearance → choice |
| Replace from backup | Settings → import → preview → explicit confirmation |

## 12. Responsive and accessibility rules

- 320 CSS px is the minimum supported width; no horizontal page scroll.
- Calendar cells may reduce secondary amount type but never below legibility or collapse touch selection.
- Primary controls are at least 44 × 44 CSS px.
- Current navigation, selected dates, completion, intensity, and trends use text/shape in addition to color.
- Focus is restored to a meaningful trigger after closing a sheet/dialog.
- Reduced motion removes nonessential transforms/animation while preserving state feedback.
- System, Light, and Dark are complete token themes rather than filter inversions.
