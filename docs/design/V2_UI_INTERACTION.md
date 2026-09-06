# LifeIndex V2 UI and Interaction Specification

**Status:** Revision 4 draft for owner review
**Version:** 0.4
**Date:** 2026-09-06
**Implementation authority:** None until the owner approves design gate G1 in [V2_PLAN.md](../../V2_PLAN.md)

## 1. Design intent

LifeIndex V2 should feel like a small, quiet personal tool: fast enough to use several times a day and restrained enough that the user's own records remain the focus. The refresh retains V1's local-first promise and functional scope while replacing form-heavy, web-like patterns with mobile-first actions and clearer hierarchy.

The design uses three principles:

1. **One dominant task per screen.** Today supports orientation; Finance supports recording and scanning; Habits supports completion; Focus supports a timer.
2. **Progress without judgment.** Completion is visible and pleasant, while missed habits, spending, and interrupted focus sessions use neutral language.
3. **Trust through legibility.** Local storage, pending writes, failures, destructive actions, and update states are explicit and recoverable.

The interface also has a strict complexity budget: no screen may add a chart, score, motivational panel, progress ring, or secondary card unless it is required by an existing V1 capability and materially helps the current task.

## 2. Reference synthesis

The design borrows interaction lessons, not branded visuals or business scope:

- **MOZE — primary:** clear Chinese information hierarchy, strong light/dark theme discipline, context-first entry, readable financial rows, and restrained use of accent color.
- **记账本 — primary:** calculator-style rapid amount entry, direct categories, date-grouped ledger records, larger typography, and a practical focus on recording speed.
- **Dime — secondary:** whitespace and a restrained ledger.
- **Streaks — secondary:** one-tap habit completion.
- **HabitKit — secondary:** readable historical rhythm inside habit detail, not on the daily list.

LifeIndex deliberately does not adopt MOZE's multi-account, budget, investment, invoice, cloud, and multidimensional reporting scope. It also does not adopt unrelated advertising or tracking behavior from 记账本. The result is a lighter product with a shared teal/sage identity across finance, habits, and focus.

Reference evidence reviewed for this revision:

- [MOZE App Store listing](https://apps.apple.com/tw/app/moze/id1460011387)
- [记账本 App Store listing](https://apps.apple.com/cn/app/%E8%AE%B0%E8%B4%A6%E6%9C%AC-%E8%AE%B0%E8%B4%A6-%E9%A2%84%E7%AE%97-%E6%94%AF%E5%87%BA%E7%90%86%E8%B4%A2%E5%8A%A9%E6%89%8B/id482361839)

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

Light and dark are complete themes rather than an inverted afterthought. “Follow system” is the product default; the review prototype also allows immediate manual switching. The recommended accent stays close to V1, adjusted toward MOZE-like teal clarity so the upgrade feels evolutionary rather than like a different product.

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
- Use one canvas and one raised surface. Prefer dividers and tonal separation; routine rows do not receive individual shadows or nested cards. Sheets may use a stronger shadow because they represent a new interaction layer.
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

1. Plain “今天” title and date, with local-only status in small metadata.
2. Compact completion count, for example “2 / 3 已完成”.
3. Scheduled habit rows as the primary content.
4. Two high-frequency actions: “记一笔” and “开始专注”.
5. One finance row and one focus row.

This order intentionally prioritizes actions that can be completed today over historical reporting. There is no motivational hero, daily score, progress ring, large dashboard card, or invented insight.

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
2. Monthly calendar board as the primary navigation surface.
3. Compact month balance, expense, and income immediately below the calendar.
4. Selected date heading and selected-day total.
5. Transactions for the selected day.
6. Existing category and monthly-trend reports farther down the page.

The calendar replaces the Today/Week/Month/History segmented control. Today is represented by an underline on its date, selecting Today is a normal date selection, and historical access comes from previous/next month navigation.

Calendar behavior:

- Use a Sunday-to-Saturday seven-column grid matching the local calendar.
- Every day is a minimum 44 px touch target.
- A date with records shows a compact daily amount under its day number; income uses an explicit plus sign and expense remains unsigned in the calendar to reduce visual noise.
- The selected date uses the accent fill and updates the ledger immediately.
- Selecting an adjacent-month day also changes the visible month.
- A day with no records shows a neutral empty state rather than zero-value transaction rows.
- Month navigation updates the calendar, month totals, selected date, and ledger as one state transition.
- Screen reader labels announce date, record state, transaction type, and amount.

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
- Replace the old period tab strip with calendar selection; preserve category breakdown and monthly trend after the selected-day ledger.
- Do not add budgets, accounts, or spending judgments in this release scope.

## 7. Habits

### 7.1 Daily list

- Header shows “习惯” and today’s completion count.
- Each active scheduled habit uses one full-width management row with a separate 44 px check-in target.
- Leading mark uses the habit color/icon; text contains name and schedule context.
- Completed rows use a calm tint and clear check; incomplete rows remain visually available rather than faded away.
- Current streak appears as compact text in the row; tapping the descriptive portion opens habit detail.

### 7.2 Detail

- The identity block shows the habit, schedule, start date, and current streak.
- A fourteen-week heatmap is the main historical view, based only on existing check-in records.
- Statistics show current streak, longest streak, monthly completion rate, and total completions in one two-by-two group.
- Recent check-ins show date, completion time, and the corresponding streak day.
- The display avoids flame, failure, or “broken streak” language.
- Edit, pause/resume, and delete are secondary actions below progress content.
- The heatmap and statistics are projections only and require no new persisted fields or schema change.

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

- Today’s total and count appear as one compact line before recent sessions.
- Sessions are grouped by local date and show duration, category, and status.
- Edit changes description only; recorded duration remains immutable under current V1 rules.
- The ready screen does not display charts, achievement scores, or additional productivity cards.

## 9. Settings

Use familiar inset grouped rows in this order:

1. **Categories:** one standalone full-width group for Finance and Focus category management.
2. **Appearance:** one standalone full-width group containing the Theme row.
3. **Data & security:** device-only status, export, import, validation outcome, and clear-data action.
4. **Other:** Shortcuts, update state, and About.

Appearance is not grouped with Categories: it is a separate section between Categories and Data & security. Its Theme row displays the current value on the trailing side. Tapping it opens a bottom sheet with System, Light, and Dark as three full-width options; changing an option previews the theme immediately and persists only after the user chooses it.

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
- switching directly between light and dark themes from Settings;
- viewing Categories, Appearance, Data & security, and Other as four independent Settings groups;
- opening the Theme chooser from the standalone Appearance group;
- toggling a Today/Habits completion state;
- opening and closing Finance quick entry;
- entering an amount, choosing a category, and seeing the saved representative row;
- navigating Finance months, viewing per-day amounts, selecting a populated date, and selecting an empty date;
- opening a habit detail with current/longest streak, fourteen-week heatmap, completion rate, total count, and recent check-ins;
- selecting Focus duration presets;
- previewing compact/comfortable density, accent color, radius, and navigation label treatment.
- previewing a MOZE-like airy density and a 记账本-like compact ledger density without changing product scope.

Prototype interactions do not write to the LifeIndex repository database and are not evidence that production behavior has been implemented.

## 14. Approval record

Design gate G1 remains open. After review, record one of the following in this section and in [V2_PLAN.md](../../V2_PLAN.md):

- approved without changes;
- approved with named revisions;
- revision requested, with an itemized list.

Only an explicit owner approval authorizes V2-M2 requirements/architecture work and subsequent production implementation.

## 15. Revision history

| Version | Date | Change |
| --- | --- | --- |
| 0.4 | 2026-09-06 | Separated Settings into four independent groups: Categories, Appearance, Data & security, and Other. |
| 0.3 | 2026-09-06 | Replaced Finance period tabs with a clickable amount calendar and smaller totals below it; added habit streak/heatmap/statistics detail; moved Appearance to a full-width row between Categories and Data & security. |
| 0.2 | 2026-09-06 | Made MOZE and 记账本 primary references, reduced dashboard-like surfaces, moved habit rhythm to detail, and exposed complete light/dark theme switching. |
| 0.1 | 2026-09-06 | Initial V2 UI and interaction proposal. |
