import { fail } from './errors'
import type {
  ActivityInput,
  CategoryInput,
  CategoryScope,
  ClockSnapshot,
  DateRange,
  DateSelection,
  FocusDetailsInput,
  HabitInput,
  IconKey,
  TransactionInput,
  WeightInput,
} from './types'

export const LIMITS = Object.freeze({
  amountMinorMin: 1,
  amountMinorMax: 9999999999,
  weightGramsMin: 1000,
  weightGramsMax: 1000000,
  durationMinutesMin: 1,
  durationMinutesMax: 1440,
  categoryName: 30,
  habitName: 40,
  focusTitle: 80,
  note: 1000,
  backupBytes: 50 * 1024 * 1024,
  previewTtlMs: 15 * 60 * 1000,
})
export const ICON_KEYS: readonly IconKey[] = [
  'today',
  'health',
  'focus',
  'finance',
  'activity',
  'weight',
  'leaf',
  'book',
  'cup',
  'bag',
  'arrow',
]
export const CATEGORY_SCOPES: readonly CategoryScope[] = ['expense', 'income', 'activity', 'focus']
export function requireValue(condition: unknown, field?: string): asserts condition {
  if (!condition) fail('Validation', field)
}
export function object(value: unknown, allowed: readonly string[]): Record<string, unknown> {
  requireValue(value !== null && typeof value === 'object' && !Array.isArray(value))
  const record = value as Record<string, unknown>
  requireValue(Object.keys(record).every((key) => allowed.includes(key)))
  return record
}
export function integer(value: unknown, min: number, max: number, field?: string): number {
  requireValue(
    typeof value === 'number' && Number.isSafeInteger(value) && value >= min && value <= max,
    field,
  )
  return value
}
export function text(value: unknown, max: number, field: string, trim = true): string {
  requireValue(typeof value === 'string', field)
  const normalized = trim ? value.trim() : value
  requireValue(normalized.length <= max && (!trim || normalized.length >= 1), field)
  return normalized
}
export function oneOf<T extends string>(value: unknown, options: readonly T[], field?: string): T {
  requireValue(typeof value === 'string' && options.includes(value as T), field)
  return value as T
}
export function uuid(value: unknown): string {
  requireValue(
    typeof value === 'string' &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(value),
    'id',
  )
  return value
}
export function iso(value: unknown): string {
  requireValue(
    typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value),
    'time',
  )
  requireValue(
    Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value,
    'time',
  )
  return value
}
export function dateKey(value: unknown): string {
  requireValue(typeof value === 'string' && /^[1-9]\d{3}-\d{2}-\d{2}$/.test(value), 'localDate')
  requireValue(
    Number.isFinite(Date.parse(`${value}T00:00:00.000Z`)) &&
      new Date(`${value}T00:00:00.000Z`).toISOString().slice(0, 10) === value,
    'localDate',
  )
  return value
}
export function dateAt(nowMs: number, offset: number): string {
  integer(offset, -840, 840, 'utcOffsetMinutes')
  return dateKey(new Date(nowMs + offset * 60000).toISOString().slice(0, 10))
}
export function dateSelection(input: Record<string, unknown>): DateSelection {
  return {
    localDate: dateKey(input.localDate),
    utcOffsetMinutes: integer(input.utcOffsetMinutes, -840, 840, 'utcOffsetMinutes'),
  }
}
function note(input: Record<string, unknown>): { note?: string } {
  return input.note === undefined ? {} : { note: text(input.note, LIMITS.note, 'note', false) }
}
const dayKeys = ['localDate', 'utcOffsetMinutes', 'note']
export function validateTransactionInput(value: unknown): TransactionInput {
  const input = object(value, [...dayKeys, 'type', 'amountMinor', 'categoryId'])
  return {
    ...dateSelection(input),
    ...note(input),
    type: oneOf(input.type, ['expense', 'income'], 'type'),
    amountMinor: integer(input.amountMinor, 1, LIMITS.amountMinorMax, 'amountMinor'),
    categoryId: uuid(input.categoryId),
  }
}
export function validateWeightInput(value: unknown): WeightInput {
  const input = object(value, [...dayKeys, 'weightGrams'])
  return {
    ...dateSelection(input),
    ...note(input),
    weightGrams: integer(input.weightGrams, 1000, 1000000, 'weightGrams'),
  }
}
export function validateActivityInput(value: unknown): ActivityInput {
  const input = object(value, [...dayKeys, 'categoryId', 'durationMinutes', 'intensity'])
  return {
    ...dateSelection(input),
    ...note(input),
    categoryId: uuid(input.categoryId),
    durationMinutes: integer(input.durationMinutes, 1, 1440, 'durationMinutes'),
    intensity: oneOf(input.intensity, ['light', 'moderate', 'hard'], 'intensity'),
  }
}
export function validateCategoryInput(value: unknown): CategoryInput {
  const input = object(value, ['scope', 'name', 'iconKey'])
  return {
    scope: oneOf(input.scope, CATEGORY_SCOPES, 'scope'),
    name: text(input.name, 30, 'name'),
    iconKey: oneOf(input.iconKey, ICON_KEYS, 'iconKey'),
  }
}
export function validateHabitInput(value: unknown): HabitInput {
  const input = object(value, ['name', 'iconKey', 'scheduleWeekdays', 'note'])
  requireValue(
    Array.isArray(input.scheduleWeekdays) && input.scheduleWeekdays.length > 0,
    'scheduleWeekdays',
  )
  const weekdays = input.scheduleWeekdays
    .map((day) => integer(day, 1, 7, 'scheduleWeekdays'))
    .sort()
  requireValue(new Set(weekdays).size === weekdays.length, 'scheduleWeekdays')
  return {
    name: text(input.name, 40, 'name'),
    iconKey: oneOf(input.iconKey, ICON_KEYS, 'iconKey'),
    scheduleWeekdays: weekdays,
    ...note(input),
  }
}
export function validateFocusDetails(value: unknown): FocusDetailsInput {
  const input = object(value, ['title', 'categoryId', 'note'])
  return {
    title: text(input.title, 80, 'title'),
    ...(input.categoryId === undefined ? {} : { categoryId: uuid(input.categoryId) }),
    ...note(input),
  }
}
export function normalizeCategoryName(name: string): string {
  return name.trim().normalize('NFKC').toLowerCase()
}
export function validateRange(range: DateRange): DateRange {
  object(range, ['from', 'toExclusive'])
  const from = dateKey(range.from),
    toExclusive = dateKey(range.toExclusive)
  requireValue(from < toExclusive, 'range')
  return { from, toExclusive }
}
export function safeSum(values: readonly number[]): number {
  return values.reduce(
    (sum, n) => integer(sum + n, -Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER, 'total'),
    0,
  )
}
function decimalInput(
  value: string,
  decimals: number,
  min: number,
  max: number,
  field: string,
): number {
  requireValue(typeof value === 'string', field)
  const normalized = value.trim()
  requireValue(new RegExp(`^\\d+(?:\\.\\d{1,${decimals}})?$`).test(normalized), field)
  // Parse decimal digits, never round binary floating point or silently discard extra precision.
  const [whole = '', fraction = ''] = normalized.split('.')
  return integer(Number(whole + fraction.padEnd(decimals, '0')), min, max, field)
}
export function parseMoneyInput(value: string): number {
  return decimalInput(value, 2, 1, LIMITS.amountMinorMax, 'amountMinor')
}
export function parseWeightInput(value: string): number {
  return decimalInput(value, 3, 1000, 1000000, 'weightGrams')
}

export function parseMinutesInput(value: string): number {
  requireValue(typeof value === 'string' && /^\d+$/.test(value.trim()), 'durationMinutes')
  return integer(Number(value.trim()), 1, 1440, 'durationMinutes')
}
export function captureDateSelection(clock: ClockSnapshot, localDate?: string): DateSelection {
  return {
    localDate:
      localDate === undefined ? dateAt(clock.nowMs, clock.utcOffsetMinutes) : dateKey(localDate),
    utcOffsetMinutes: clock.utcOffsetMinutes,
  }
}
