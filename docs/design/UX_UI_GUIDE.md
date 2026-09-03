# LifeIndex V1 UX/UI Guide

**Direction:** Modern, minimal, calm, refined, personal, data-aware

**Primary surface:** iPhone Home Screen PWA

## 1. Experience principles

- Quiet clarity: reveal the next useful action without turning life into a performance dashboard.
- Fast capture: common input starts with the field that matters most and preserves sensible, visible defaults.
- Trust through feedback: confirm successful local writes and explain failures without exposing technical noise.
- Honest data safety: distinguish local persistence from backup and never imply automatic cloud sync.
- Native familiarity: respect iPhone safe areas, touch conventions, system typography, appearance, and reduced motion without pretending the PWA is a native binary.

## 2. Voice and language

- Brand and product name: `LifeIndex`.
- Tagline: `Index your life.`
- Primary interface language: concise Simplified Chinese.
- Use neutral, descriptive copy: `本月支出`, `今日专注`, `已完成 3/5`.
- Avoid judgmental language such as `失败`, `偷懒`, `超支警告` unless describing a real technical failure.
- Error copy states what happened, whether data changed, and the next safe action.

## 3. Layout

- Design mobile-first from 320 CSS pixels upward.
- Use one primary content column with a readable maximum width on larger screens.
- Respect `env(safe-area-inset-top)` and `env(safe-area-inset-bottom)` in standalone mode.
- Keep the bottom navigation stable; ensure scrolling content is not hidden behind it.
- Prefer 16 px horizontal page padding on compact phones and 20–24 px on wider screens.
- Use an 8 px spacing grid with 4 px only for tight internal relationships.

## 4. Typography

- Use the system stack headed by `-apple-system`/`BlinkMacSystemFont`.
- Body text: 16 px minimum for form controls to avoid iOS input zoom.
- Recommended scale: 12 metadata, 14 secondary, 16 body/control, 20 section title, 28 page metric/title.
- Use tabular numerals for money, timer values, and aligned statistics.
- Prefer weight and whitespace over excessive size for hierarchy.

## 5. Color tokens

Initial tokens are implementation candidates and must pass contrast checks:

| Role | Light candidate | Dark candidate | Purpose |
| --- | --- | --- | --- |
| Canvas | `#F4F3EE` | `#151713` | Calm app background |
| Surface | `#FFFDF8` | `#20231E` | Cards and sheets |
| Text | `#20231F` | `#F3F2EC` | Primary content |
| Muted text | `#62675F` | `#AEB4AA` | Secondary content |
| Accent | `#3F6B57` | `#78B596` | Primary action/selection |
| Positive | `#4F7658` | `#82BE8C` | Completed state with icon/text |
| Warning | `#9A6B2F` | `#D4A55D` | Recoverable attention |
| Destructive | `#A14343` | `#E07A7A` | Confirmed destructive action only |
| Divider | `#DADBD4` | `#373B34` | Structural separation |

Module identity should be subtle—small accent variations, icons, and labels—not large saturated panels. Never encode income/expense or complete/incomplete by color alone.

## 6. Components

### Bottom navigation

- Five equal destinations with icon and Chinese label.
- Minimum 44 px target height plus bottom safe area.
- Active state uses accent, weight, and an accessible current-page state.

### Cards and summaries

- Use cards only to group related action and information.
- Avoid nested cards and dense dashboard grids.
- A summary shows one primary value, its period label, and at most one supporting comparison in V1.

### Forms

- Labels remain visible; placeholders are examples, not labels.
- Show currency alongside amount and use decimal input mode.
- Use native date/time controls when they provide more reliable iPhone behavior.
- Disable submission only for a clear reason and expose validation near fields.
- Preserve entered values when a storage write fails.

### Buttons

- One visually primary action per screen/sheet.
- Minimum 44 by 44 CSS pixels.
- Destructive actions are secondary until the confirmation step.
- Icon-only buttons require accessible names and visible tooltips on pointer devices where applicable.

### Feedback

- Local success feedback is brief and non-blocking.
- Errors remain visible until addressed.
- Offline status appears only when it changes expectations; valid local mutations remain available.
- Update prompts explain that reopening will use the new app version and protect in-progress work.

## 7. Module-specific behavior

### Today

- Lead with the date and today's habits, then quick actions and concise summaries.
- Do not show long historical charts.
- Empty state should invite the first record without requiring onboarding completion.

### Finance

- Amount is visually prominent but not oversized.
- Expense/income control is explicit and accessible.
- Historical rows show category, amount, local time/date, and note only when present.
- Totals use consistent sign and currency formatting.

### Focus

- Timer uses tabular numerals and stays readable at arm's length.
- Natural completion, early finish, and cancel are distinct states/actions.
- Motion is subtle and absent when reduced motion is requested.

### Habits

- Check-in is a direct, reversible control.
- Calendar uses shape/icon plus color for completion.
- Streak information is descriptive, never punitive.

### Settings/data safety

- Export is a normal primary data-safety action.
- Restore uses a sequence of file selection, validation preview, and explicit replacement confirmation.
- The confirmation names counts and states that merge is not performed.

## 8. Accessibility checklist

- Semantic headings and landmarks.
- Logical DOM/focus order matching visual order.
- Visible focus indicator for keyboard and switch-control use.
- Screen-reader names, values, states, and error associations.
- Text and essential controls meet WCAG AA contrast.
- 200% text zoom does not hide core actions or cause horizontal scrolling.
- Touch targets meet 44 px minimum with adequate separation.
- Status never depends on color alone.
- Reduced motion disables nonessential transitions.
- Charts include text summaries or accessible tabular equivalents.

## 9. Visual review states

Every primary screen must be rendered and inspected in at least:

- Empty data
- Representative data
- Long Chinese labels/notes
- Loading
- Validation error
- Storage error where feasible
- Offline
- Light and dark appearance
- 320 px compact width and a current iPhone-sized viewport
