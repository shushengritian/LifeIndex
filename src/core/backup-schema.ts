import { fail } from './errors'
import { PREFERENCE_KEYS, validatePreference } from './preferences'
import type {
  BackupCounts,
  BackupData,
  BackupDocument,
  BackupTable,
  Category,
  FocusSession,
} from './types'
import {
  CATEGORY_SCOPES,
  ICON_KEYS,
  dateAt,
  dateKey,
  integer,
  iso,
  normalizeCategoryName,
  object,
  oneOf,
  requireValue,
  text,
  uuid,
  validateActivityInput,
  validateCategoryInput,
  validateHabitInput,
  validateTransactionInput,
  validateWeightInput,
} from './validation'

export const BACKUP_TABLES: readonly BackupTable[] = [
  'categories',
  'transactions',
  'weightEntries',
  'activitySessions',
  'habits',
  'habitChecks',
  'focusSessions',
  'preferences',
]
const baseKeys = ['id', 'revision', 'lastCommandId', 'createdAt', 'updatedAt']
const dayKeys = ['timePrecision', 'localDate', 'utcOffsetMinutes', 'note']
const select = (row: Record<string, unknown>, keys: readonly string[]) =>
  Object.fromEntries(keys.filter((key) => row[key] !== undefined).map((key) => [key, row[key]]))
function base(row: Record<string, unknown>, exportedAt: string): void {
  uuid(row.id)
  uuid(row.lastCommandId)
  integer(row.revision, 1, Number.MAX_SAFE_INTEGER)
  const created = iso(row.createdAt),
    updated = iso(row.updatedAt)
  requireValue(created <= updated && updated <= exportedAt, 'time')
}
function day(row: Record<string, unknown>, exportedAt: string): void {
  requireValue(row.timePrecision === 'day')
  const offset = integer(row.utcOffsetMinutes, -840, 840)
  requireValue(dateKey(row.localDate) <= dateAt(Date.parse(exportedAt), offset), 'localDate')
}
function instant(value: unknown, row: Record<string, unknown>): string {
  const valueIso = iso(value)
  requireValue(valueIso <= String(row.updatedAt), 'time')
  return valueIso
}
export function validateFocusRecord(value: unknown, exportedAt: string): FocusSession {
  const raw = object(value, [
    ...baseKeys,
    'title',
    'categoryId',
    'note',
    'timePrecision',
    'startedAt',
    'localDate',
    'utcOffsetMinutes',
    'targetDurationMs',
    'status',
    'accumulatedMs',
    'segmentStartedAt',
    'pausedAt',
    'pendingCompletion',
    'durationMs',
    'endedAt',
    'completionKind',
    'completionToken',
  ])
  base(raw, exportedAt)
  text(raw.title, 80, 'title')
  if (raw.note !== undefined) text(raw.note, 1000, 'note', false)
  if (raw.categoryId !== undefined) uuid(raw.categoryId)
  requireValue(raw.timePrecision === 'instant')
  const started = iso(raw.startedAt)
  requireValue(started === raw.createdAt)
  requireValue(
    dateKey(raw.localDate) ===
      dateAt(Date.parse(started), integer(raw.utcOffsetMinutes, -840, 840)),
    'localDate',
  )
  const target = integer(raw.targetDurationMs, 60000, 86400000)
  requireValue(target % 60000 === 0)
  const status = oneOf(raw.status, ['running', 'paused', 'completed'])
  const absent = (keys: string[]) => requireValue(keys.every((key) => !(key in raw)))
  if (status === 'running') {
    absent([
      'pausedAt',
      'pendingCompletion',
      'durationMs',
      'endedAt',
      'completionKind',
      'completionToken',
    ])
    const accumulated = integer(raw.accumulatedMs, 0, target - 1),
      segment = instant(raw.segmentStartedAt, raw)
    requireValue(segment >= started && accumulated <= Date.parse(segment) - Date.parse(started))
  } else if (status === 'paused') {
    absent(['segmentStartedAt', 'durationMs', 'endedAt', 'completionKind', 'completionToken'])
    const paused = instant(raw.pausedAt, raw),
      accumulated = integer(raw.accumulatedMs, 0, target)
    requireValue(paused >= started && accumulated <= Date.parse(paused) - Date.parse(started))
    if (raw.pendingCompletion === undefined) requireValue(accumulated < target)
    else {
      const intent = object(raw.pendingCompletion, ['token', 'kind', 'durationMs', 'endedAt'])
      uuid(intent.token)
      const kind = oneOf(intent.kind, ['timer', 'early']),
        duration = integer(intent.durationMs, 1000, target)
      requireValue(
        iso(intent.endedAt) === paused &&
          duration === accumulated &&
          (kind === 'timer' ? duration === target : duration < target),
      )
    }
  } else {
    absent(['accumulatedMs', 'segmentStartedAt', 'pausedAt', 'pendingCompletion'])
    const duration = integer(raw.durationMs, 1000, target),
      end = instant(raw.endedAt, raw),
      kind = oneOf(raw.completionKind, ['timer', 'early'])
    uuid(raw.completionToken)
    requireValue(
      end >= started &&
        duration <= Date.parse(end) - Date.parse(started) &&
        (kind === 'timer' ? duration === target : duration < target),
    )
  }
  return raw as unknown as FocusSession
}
export function backupCounts(data: BackupData): BackupCounts {
  return Object.fromEntries(BACKUP_TABLES.map((key) => [key, data[key].length])) as BackupCounts
}
export function validateBackupDocument(value: unknown): BackupDocument {
  const root = object(value, [
    'format',
    'formatVersion',
    'schemaVersion',
    'appVersion',
    'exportedAt',
    'source',
    'counts',
    'data',
  ])
  if (root.format !== 'lifeindex-v4-backup' || root.formatVersion !== 1 || root.schemaVersion !== 1)
    fail('UnsupportedBackup')
  const exportedAt = iso(root.exportedAt)
  requireValue(
    typeof root.appVersion === 'string' &&
      /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(root.appVersion),
  )
  const source = object(root.source, ['utcOffsetMinutes', 'locale'])
  integer(source.utcOffsetMinutes, -840, 840)
  requireValue(
    typeof source.locale === 'string' &&
      /^[a-zA-Z]{2,8}(?:-[a-zA-Z0-9]{1,8})*$/.test(source.locale),
  )
  const data = object(root.data, BACKUP_TABLES),
    counts = object(root.counts, BACKUP_TABLES)
  for (const key of BACKUP_TABLES) {
    requireValue(Array.isArray(data[key]))
    integer(counts[key], 0, Number.MAX_SAFE_INTEGER)
    requireValue((data[key] as unknown[]).length === counts[key])
  }
  const parsed = data as unknown as BackupData
  // Field validation completes before references, uniqueness, or any restore transaction can begin.
  for (const value of parsed.categories) {
    const row = object(value, [
      ...baseKeys,
      'scope',
      'name',
      'normalizedName',
      'status',
      'sortOrder',
      'iconKey',
    ])
    base(row, exportedAt)
    const input = validateCategoryInput(select(row, ['scope', 'name', 'iconKey']))
    requireValue(
      row.name === input.name && row.normalizedName === normalizeCategoryName(input.name),
    )
    oneOf(row.status, ['active', 'archived'])
    integer(row.sortOrder, 0, Number.MAX_SAFE_INTEGER)
  }
  for (const value of parsed.transactions) {
    const row = object(value, [
      ...baseKeys,
      ...dayKeys,
      'type',
      'amountMinor',
      'currency',
      'categoryId',
    ])
    base(row, exportedAt)
    day(row, exportedAt)
    validateTransactionInput(
      select(row, ['localDate', 'utcOffsetMinutes', 'note', 'type', 'amountMinor', 'categoryId']),
    )
    requireValue(row.currency === 'CNY')
  }
  for (const value of parsed.weightEntries) {
    const row = object(value, [...baseKeys, ...dayKeys, 'weightGrams'])
    base(row, exportedAt)
    day(row, exportedAt)
    validateWeightInput(select(row, ['localDate', 'utcOffsetMinutes', 'note', 'weightGrams']))
  }
  for (const value of parsed.activitySessions) {
    const row = object(value, [
      ...baseKeys,
      ...dayKeys,
      'categoryId',
      'durationMinutes',
      'intensity',
    ])
    base(row, exportedAt)
    day(row, exportedAt)
    validateActivityInput(
      select(row, [
        'localDate',
        'utcOffsetMinutes',
        'note',
        'categoryId',
        'durationMinutes',
        'intensity',
      ]),
    )
  }
  for (const value of parsed.habits) {
    const row = object(value, [
      ...baseKeys,
      'name',
      'iconKey',
      'scheduleWeekdays',
      'status',
      'scheduleEffectiveFrom',
      'note',
    ])
    base(row, exportedAt)
    const input = validateHabitInput(select(row, ['name', 'iconKey', 'scheduleWeekdays', 'note']))
    requireValue(
      input.name === row.name &&
        JSON.stringify(input.scheduleWeekdays) === JSON.stringify(row.scheduleWeekdays),
    )
    oneOf(row.status, ['active', 'paused'])
    requireValue(dateKey(row.scheduleEffectiveFrom) <= dateAt(Date.parse(exportedAt), 840))
  }
  for (const value of parsed.habitChecks) {
    const row = object(value, [
      ...baseKeys,
      'habitId',
      'localDate',
      'utcOffsetMinutes',
      'timePrecision',
      'completedAt',
    ])
    base(row, exportedAt)
    uuid(row.habitId)
    if (row.timePrecision === 'day') {
      day(row, exportedAt)
      requireValue(!('completedAt' in row))
    } else {
      requireValue(row.timePrecision === 'instant')
      const completed = instant(row.completedAt, row)
      requireValue(
        dateKey(row.localDate) ===
          dateAt(Date.parse(completed), integer(row.utcOffsetMinutes, -840, 840)),
      )
    }
  }
  for (const row of parsed.focusSessions) validateFocusRecord(row, exportedAt)
  for (const value of parsed.preferences) {
    const row = object(value, ['key', 'value', 'revision', 'lastCommandId', 'updatedAt'])
    const key = oneOf(row.key, PREFERENCE_KEYS)
    validatePreference(key, row.value)
    integer(row.revision, 1, Number.MAX_SAFE_INTEGER)
    uuid(row.lastCommandId)
    requireValue(iso(row.updatedAt) <= exportedAt)
    if (key === 'lastExportedAt' && row.value !== null)
      requireValue(String(row.value) <= exportedAt)
  }
  requireValue(
    parsed.preferences.length === PREFERENCE_KEYS.length &&
      PREFERENCE_KEYS.every((key) => parsed.preferences.some((row) => row.key === key)),
  )
  for (const key of BACKUP_TABLES) {
    const ids = parsed[key].map((row) => ('id' in row ? row.id : row.key))
    requireValue(new Set(ids).size === ids.length)
  }
  const categoryMap = new Map(parsed.categories.map((row) => [row.id, row]))
  const reference = (id: string, scope: Category['scope']) => {
    const category = categoryMap.get(id)
    requireValue(category && category.scope === scope, 'categoryId')
  }
  for (const row of parsed.transactions) reference(row.categoryId, row.type)
  for (const row of parsed.activitySessions) reference(row.categoryId, 'activity')
  for (const row of parsed.focusSessions) if (row.categoryId) reference(row.categoryId, 'focus')
  const activeNames = parsed.categories
    .filter((row) => row.status === 'active')
    .map((row) => `${row.scope}:${row.normalizedName}`)
  requireValue(new Set(activeNames).size === activeNames.length)
  requireValue(
    parsed.categories.every(
      (row) => CATEGORY_SCOPES.includes(row.scope) && ICON_KEYS.includes(row.iconKey),
    ),
  )
  const habitIds = new Set(parsed.habits.map((row) => row.id)),
    habitDays = parsed.habitChecks.map((row) => `${row.habitId}:${row.localDate}`)
  requireValue(
    parsed.habitChecks.every((row) => habitIds.has(row.habitId)) &&
      new Set(habitDays).size === habitDays.length,
  )
  requireValue(parsed.focusSessions.filter((row) => row.status !== 'completed').length <= 1)
  const tokens = parsed.focusSessions.flatMap((row) =>
    row.status === 'completed'
      ? [row.completionToken]
      : row.status === 'paused' && row.pendingCompletion
        ? [row.pendingCompletion.token]
        : [],
  )
  requireValue(new Set(tokens).size === tokens.length)
  return root as unknown as BackupDocument
}
