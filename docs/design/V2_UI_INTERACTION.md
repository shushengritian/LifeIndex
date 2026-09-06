# LifeIndex V2 UI and Interaction Specification

**Status:** Draft for owner review
**Version:** 0.1
**Date:** 2026-09-06
**Implementation authority:** None until the owner approves design gate G1 in [V2_PLAN.md](../../V2_PLAN.md)

## 1. Design intent

LifeIndex V2 should feel like a quiet personal instrument: fast enough to use several times a day, warm enough to keep, and restrained enough that personal data remains the focus. The refresh retains V1's local-first promise and functional scope while replacing form-heavy, web-like patterns with mobile-first actions and clearer hierarchy.

The design uses three principles:

1. **One dominant task per screen.** Today supports orientation; Finance supports recording and scanning; Habits supports completion; Focus supports a timer.
2. **Progress without judgment.** Completion is visible and pleasant, while missed habits, spending, and interrupted focus sessions use neutral language.
3. **Trust through legibility.** Local storage, pending writes, failures, destructive actions, and update states are explicit and recoverable.

## 2. Reference synthesis

The design borrows interaction lessons, not branded visuals:

- **Dime:** restrained ledger hierarchy and confident use of whitespace.
- **MOZE:** strong Chinese-language information architecture and useful summaries without a dense dashboard.
- **记账本:** large amount entry, direct category selection, and one-handed recording speed.
- **Streaks:** clear one-tap habit completion.
- **HabitKit:** compact rhythm/heatmap context that makes continuity visible.

LifeIndex differentiates itself through a shared sage-and-ivory system across finance, habits, and focus; no module should look like a separate app.

## 3. Visual system

### 3.1 Color roles

| Role | Light appearance | Dark appearance | Use |
| --- | --- | --- | --- |
| Canvas | warm ivory | deep green-charcoal | App background |
| Surface | opaque soft white | raised charcoal-green | Sheets, grouped rows, cards |
| Primary text | near-black green | warm near-white | Titles and values |
| Secondary text | muted olive gray | desaturated warm gray | Metadata and hints |
| Accent | sage green | lighter sage | Primary action and active state |
| Accent soft | pale sage | translucent sage | Selection and progress background |
| Positive | forest green | soft mint | Completed/success state |
| Warning | ochre | warm amber | Recoverable attention state |
| Destructive | brick red | muted coral | Delete/reset only |

The owner can tune the accent and corner radius in the review prototype. The recommended default remains close to V1 so the upgrade feels evolutionary rather than like a different product.

### 3.2 Type and numbers

- Use the iOS system font stack.
- Screen titles: 28–32 px, semibold/bold, compact tracking.
- Section titles: 15–17 px, semibold.
- Body: 15–17 px.
- Metadata: 12–13 px, never below 11 px.
- Amounts and timers use tabular numerals.
- Avoid uppercase English eyebrow labels in the daily interface; use Chinese context directly.

### 3.3 Spacing and shape

- Page horizontal inset: 16 px on compact iPhones, 20 px when space allows.
- Primary vertical rhythm: 8 / 12 / 16 / 24 / 32 px.
- Default surface radius: 20 px; controls: 12–16 px; round actions: 50%.
- Use borders and tonal separation before shadows. Sheets may use a stronger shadow because they represent a new interaction layer.
- All interactive targets are at least 44 × 44 CSS px.

### 3.4 Icons and motion

- Use one consistent rounded line-icon family; do not use Chinese characters as icons.
- Keep icon meaning conventional: home/today, wallet/finance, timer/focus, check-circle/habits, sliders/settings.
- Page transitions: 160–220 ms fade/translate, disabled under reduced motion.
- Habit success: check draws and row tint settles within 220 ms; no confetti.
- Sheet transition: bottom slide with opacity scrim; focus remains trapped in the sheet until dismissed.

## 4. Shared application shell

### 4.1 Top bar

The global V1 brand, tagline, and version badge are removed from routine pages. Each destination owns a compact header:

- leading area: current date or screen title;
- trailing area: only one contextual action when needed;
- version moves to Settings > About;
- local-only status is shown where trust matters, not repeated above every screen.

### 4.2 Bottom navigation

Five destinations remain in the same order: Today, Finance, Focus, Habits, Settings.

- Use icon plus short Chinese label.
- The active destination uses an accent-soft capsule behind the icon and stronger text.
- Respect `env(safe-area-inset-bottom)`.
- The tab bar remains available on top-level pages and is hidden while a modal entry sheet owns the interaction.
- Route selection is represented with `aria-current="page"`.

### 4.3 Sheets and dialogs

- Create/edit flows use a full-width bottom sheet on iPhone when the workflow is short.
- Long configuration and detail views use an in-route page to avoid an overfilled sheet.
- A visible drag handle is decorative; dismissal is available through an explicit close action and supported swipe behavior.
- Unsaved input blocks accidental close and offers “继续填写” or “放弃更改”.
- Destructive confirmation names the affected record type and never places the destructive action as the default focused action.

## 5. Today

### 5.1 Layout

1. Compact date header and a quiet local-only indicator.
2. Daily completion statement, for example “今天完成 2 / 3”.
3. Scheduled habit rows as the primary content.
4. Two high-frequency actions: “记一笔” and “开始专注”.
5. Compact finance and focus summary rows.

This order intentionally prioritizes actions that can be completed today over historical reporting.

### 5.2 Habit row interaction

- Tap anywhere on the row to request check-in/undo.
- On tap, show a short pending state without announcing completion.
- After IndexedDB succeeds, animate the check and update the count.
- On failure, restore the previous state, keep focus on the row, and announce a concise error.
- Long press is not required; edit/detail remains in the Habits destination.

### 5.3 Quick actions

- “记一笔” opens the Finance quick-entry sheet over the current context.
- “开始专注” navigates to Focus with the default 25-minute preset selected.
- Returning after save/start restores the Today scroll position where practical.

### 5.4 Summary rows

- Finance shows today's expense and income, with values labelled rather than color alone.
- Focus shows completed minutes/session count, or the active timer state.
- A read failure displays “暂时无法读取” rather than a zero value.

## 6. Finance

### 6.1 Ledger screen

1. Header with “记账” and a circular add action.
2. Month summary surface with expense, income, and balance.
3. Existing period selector: today, week, month, history.
4. Transactions grouped by local date.
5. Each date group shows the date, weekday/context, and daily expense total.
6. Each row shows category icon/color, category, optional note, time, and amount.

Income and expense never rely on red/green alone. The sign, label, and alignment remain available to assistive technology.

### 6.2 Quick-entry sheet

The recommended entry order is optimized for one hand:

1. Expense/income segmented toggle.
2. Large amount display with CNY context.
3. Recent-first category grid followed by the remaining active categories.
4. Compact date shortcut (“今天 10:28”) and optional note row.
5. Numeric keypad and a single primary save action.

Interaction rules:

- Opening the sheet focuses amount entry without forcing the iOS keyboard if an in-app keypad is used.
- The decimal key allows at most two fractional digits for CNY.
- Backspace removes one digit; long-press clear is optional and must have an accessible alternative.
- A category is required. The last recently used category may be highlighted but is not silently submitted when no category is confirmed.
- Date/time defaults to now and can open the native date/time picker.
- Save is disabled while invalid or in progress.
- On persistence failure, amount, category, date, and note remain in the sheet.
- Editing an existing transaction reuses the same sheet but exposes delete through a separate overflow/detail action, not beside Save.

### 6.3 Reports within current scope

- Preserve period totals, category breakdown, and monthly trend.
- Place reports after the current ledger rather than before entry.
- Do not add budgets, accounts, or spending judgments in this release scope.

## 7. Habits

### 7.1 Daily list

- Header shows “习惯” and today’s completion count.
- Each active scheduled habit uses a full-width one-tap row.
- Leading mark uses the habit color/icon; text contains name and schedule context.
- A compact seven-day strip shows recent rhythm, including today.
- Completed rows use a calm tint and clear check; incomplete rows remain visually available rather than faded away.

### 7.2 Detail

- Existing month calendar remains the main historical view.
- Statistics retain current streak, longest streak, monthly rate, and total completions.
- The display avoids flame, failure, or “broken streak” language.
- Edit, pause/resume, and delete are secondary actions below progress content.

### 7.3 Add/edit flow

- Use a route page or tall sheet with name, icon, color, schedule, start date, and optional note.
- Day-of-week targets behave as a seven-item multi-select with explicit selected states.
- Pausing a habit preserves records and explains that it leaves Today until resumed.

## 8. Focus

### 8.1 Ready state

- The timer ring is the visual center and displays the selected duration.
- 25, 50, and custom presets sit immediately below or within reach of the ring.
- Title is the only required text field.
- Category and note are collapsed optional details.
- “开始专注” is the single dominant action.

### 8.2 Active state

- Display remaining time, title, and a subtle progress ring.
- Use persisted timestamps as truth; the animated ring is presentation only.
- Background/foreground reconciliation updates the timer without fabricating elapsed intervals.
- Interruption requires confirmation; completion clearly distinguishes completed from interrupted sessions.

### 8.3 History

- Today’s total and count appear before recent sessions.
- Sessions are grouped by local date and show duration, category, and status.
- Edit changes description only; recorded duration remains immutable under current V1 rules.

## 9. Settings

Use familiar inset grouped rows in this order:

1. **Appearance:** system/light/dark and reduced-motion result.
2. **Categories:** finance and focus categories.
3. **Data & backup:** device-only status, export, import, validation outcome, clear-data action.
4. **Shortcuts:** existing safe URL Action instructions and PWA/Safari storage warning.
5. **Updates:** current version, available update, reload action.
6. **About:** product version, privacy statement, support/recovery links.

Destructive clear/import replacement actions are visually separated from routine settings.

## 10. Responsive behavior

- **320–374 px:** one-column layout, 16 px page inset, abbreviated metadata, category grid remains at least four columns only when each target stays 44 px; otherwise use three columns.
- **375–430 px:** reference iPhone layout, 16–20 px inset, four-column category grid.
- **Above 430 px:** content remains centered with a phone-oriented reading width; do not stretch transaction or habit rows into a desktop dashboard.
- Bottom sheets account for keyboard height and safe-area bottom inset.
- Dynamic Type may increase row height; text is not clipped or replaced with unlabeled icons.

## 11. Accessibility and feedback

- Visible focus rings for keyboard/switch access.
- Screen reader labels include action and state, for example “阅读，未完成，点按完成”.
- Completion, save, delete, and failure changes use a polite live region where appropriate.
- Color is always paired with text, shape, sign, or icon.
- Charts include equivalent text summaries and do not require hover.
- Reduced motion replaces transforms and ring sweeps with direct state changes or fades.
- Errors state what remains safe: for example, “未能保存，本次输入仍保留”.

## 12. State model

| State | Visual behavior | Data behavior |
| --- | --- | --- |
| Loading | Skeleton/neutral placeholder; no zero values | Await IndexedDB query |
| Empty | Explain next useful action | No synthetic data |
| Editing | Preserve visible input and dirty state | No write until Save |
| Saving | Disable duplicate submission; show progress | One repository operation |
| Saved | Close sheet/update projection after success | React to committed IndexedDB state |
| Recoverable failure | Keep input/restore prior toggle and announce error | Existing data remains unchanged |
| Offline | App shell and local features continue | No network dependency |
| Update available | Non-blocking prompt unless safety requires otherwise | Reload only after dirty-state guard |

## 13. Review prototype coverage

The first interactive review includes representative data for visual evaluation only and demonstrates:

- switching among all five destinations;
- toggling a Today/Habits completion state;
- opening and closing Finance quick entry;
- entering an amount, choosing a category, and seeing the saved representative row;
- selecting Focus duration presets;
- previewing compact/comfortable density, accent color, radius, and navigation label treatment.

Prototype interactions do not write to the LifeIndex repository database and are not evidence that production behavior has been implemented.

## 14. Approval record

Design gate G1 remains open. After review, record one of the following in this section and in [V2_PLAN.md](../../V2_PLAN.md):

- approved without changes;
- approved with named revisions;
- revision requested, with an itemized list.

Only an explicit owner approval authorizes V2-M2 requirements/architecture work and subsequent production implementation.
