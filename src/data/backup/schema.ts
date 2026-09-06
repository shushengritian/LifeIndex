import { z } from 'zod'

import type { BackupCounts, BackupData, LifeIndexBackupV2 } from '@/shared/domain/types'
import { AppError } from '@/shared/errors/AppError'
import {
  actionReceiptSchema,
  backupDataSchema,
  categorySchema,
  focusSessionSchema,
  habitRecordSchema,
  habitSchema,
  settingSchema,
  transactionSchema,
} from '@/shared/validation/schemas'

const storeKeys = [
  'categories',
  'transactions',
  'habits',
  'habitRecords',
  'focusSessions',
  'settings',
  'actionReceipts',
  'weightEntries',
  'activitySessions',
] as const satisfies ReadonlyArray<keyof BackupData>

const sourceSchema = z
  .object({
    timezoneOffsetMinutes: z.number().int().min(-840).max(840),
    locale: z.string().trim().min(2).max(35),
  })
  .strict()

const countsV2Schema = z
  .object({
    categories: z.number().int().nonnegative(),
    transactions: z.number().int().nonnegative(),
    habits: z.number().int().nonnegative(),
    habitRecords: z.number().int().nonnegative(),
    focusSessions: z.number().int().nonnegative(),
    settings: z.number().int().nonnegative(),
    actionReceipts: z.number().int().nonnegative(),
    weightEntries: z.number().int().nonnegative(),
    activitySessions: z.number().int().nonnegative(),
  })
  .strict()

const backupV2Schema = z
  .object({
    format: z.literal('lifeindex-backup'),
    formatVersion: z.literal(2),
    appVersion: z.string().trim().min(1).max(40),
    exportedAt: z.iso.datetime({ offset: true }),
    source: sourceSchema,
    counts: countsV2Schema,
    data: backupDataSchema,
  })
  .strict()

const legacyIcons = new Set([
  'utensils',
  'transport',
  'shopping',
  'home',
  'health',
  'entertainment',
  'other',
  'salary',
  'bonus',
  'refund',
  'work',
  'study',
  'reading',
  'personal',
])

// These restrictions freeze the shipped V1 unions even though unchanged record schemas are shared.
const legacyCategorySchema = categorySchema.refine(
  (category) => category.domain !== 'activity' && legacyIcons.has(category.icon),
  'Category is not valid in backup V1',
)
const legacySettingSchema = settingSchema.refine(
  (setting) => setting.key !== 'weightTarget',
  'Setting is not valid in backup V1',
)
const legacyDataV1Schema = z
  .object({
    categories: z.array(legacyCategorySchema),
    transactions: z.array(transactionSchema),
    habits: z.array(habitSchema),
    habitRecords: z.array(habitRecordSchema),
    focusSessions: z.array(focusSessionSchema),
    settings: z.array(legacySettingSchema),
    actionReceipts: z.array(actionReceiptSchema),
  })
  .strict()
const countsV1Schema = countsV2Schema.omit({ weightEntries: true, activitySessions: true })

const backupV1Schema = z
  .object({
    format: z.literal('lifeindex-backup'),
    formatVersion: z.literal(1),
    appVersion: z.string().trim().min(1).max(40),
    exportedAt: z.iso.datetime({ offset: true }),
    source: sourceSchema,
    counts: countsV1Schema,
    data: legacyDataV1Schema,
  })
  .strict()

const backupV0Schema = z
  .object({
    format: z.literal('lifeindex-backup'),
    formatVersion: z.literal(0),
    appVersion: z.string().trim().min(1).max(40),
    exportedAt: z.iso.datetime({ offset: true }),
    source: sourceSchema,
    counts: countsV1Schema.omit({ actionReceipts: true }),
    data: legacyDataV1Schema.omit({ actionReceipts: true }),
  })
  .strict()

function calculateCounts(data: BackupData): BackupCounts {
  return Object.fromEntries(storeKeys.map((key) => [key, data[key].length])) as BackupCounts
}

function assertUnique(values: readonly string[], label: string): void {
  if (new Set(values).size !== values.length) {
    throw new AppError('BackupIntegrity', `Duplicate ${label} key`)
  }
}

function assertCounts(expected: BackupCounts, data: BackupData): void {
  const actual = calculateCounts(data)
  if (storeKeys.some((key) => expected[key] !== actual[key])) {
    throw new AppError('BackupIntegrity', 'Backup counts do not match its data')
  }
}

function assertReferences(data: BackupData): void {
  const categories = new Map(data.categories.map((category) => [category.id, category]))
  const habits = new Set(data.habits.map(({ id }) => id))
  const transactions = new Set(data.transactions.map(({ id }) => id))
  const habitRecords = new Set(data.habitRecords.map(({ id }) => id))
  const focusSessions = new Set(data.focusSessions.map(({ id }) => id))

  for (const transaction of data.transactions) {
    const category = categories.get(transaction.categoryId)
    if (category?.domain !== 'finance' || category.transactionType !== transaction.type) {
      throw new AppError('BackupIntegrity', 'Transaction category reference is invalid')
    }
  }

  if (data.habitRecords.some(({ habitId }) => !habits.has(habitId))) {
    throw new AppError('BackupIntegrity', 'Habit record reference is invalid')
  }

  if (
    data.focusSessions.some(({ categoryId }) => {
      return categoryId !== undefined && categories.get(categoryId)?.domain !== 'focus'
    })
  ) {
    throw new AppError('BackupIntegrity', 'Focus category reference is invalid')
  }

  if (
    data.activitySessions.some(
      ({ categoryId }) => categories.get(categoryId)?.domain !== 'activity',
    )
  ) {
    throw new AppError('BackupIntegrity', 'Activity category reference is invalid')
  }

  for (const receipt of data.actionReceipts) {
    const exists =
      receipt.actionType === 'add-transaction'
        ? transactions.has(receipt.outcomeEntityId)
        : receipt.actionType === 'check-habit'
          ? habitRecords.has(receipt.outcomeEntityId)
          : focusSessions.has(receipt.outcomeEntityId)
    if (!exists) throw new AppError('BackupIntegrity', 'Action outcome reference is invalid')
  }
}

function assertDomainIntegrity(backup: LifeIndexBackupV2): void {
  const { data } = backup
  assertCounts(backup.counts, data)
  assertUnique(
    data.categories.map(({ id }) => id),
    'category',
  )
  assertUnique(
    data.transactions.map(({ id }) => id),
    'transaction',
  )
  assertUnique(
    data.habits.map(({ id }) => id),
    'habit',
  )
  assertUnique(
    data.habitRecords.map(({ id }) => id),
    'habit record',
  )
  assertUnique(
    data.habitRecords.map(({ habitId, localDate }) => `${habitId}:${localDate}`),
    'habit date',
  )
  assertUnique(
    data.focusSessions.map(({ id }) => id),
    'focus session',
  )
  assertUnique(
    data.settings.map(({ key }) => key),
    'setting',
  )
  assertUnique(
    data.actionReceipts.map(({ actionId }) => actionId),
    'action receipt',
  )
  assertUnique(
    data.weightEntries.map(({ id }) => id),
    'weight entry',
  )
  assertUnique(
    data.activitySessions.map(({ id }) => id),
    'activity session',
  )

  if (data.focusSessions.filter(({ status }) => status === 'active').length > 1) {
    throw new AppError('BackupIntegrity', 'More than one focus session is active')
  }
  assertReferences(data)
}

function migrateV0(input: unknown): unknown {
  const legacy = backupV0Schema.safeParse(input)
  if (!legacy.success) throw new AppError('Validation', 'Legacy V0 backup validation failed')

  // V0 predates URL Actions; the empty collection preserves every original business record.
  return {
    ...legacy.data,
    formatVersion: 1,
    counts: { ...legacy.data.counts, actionReceipts: 0 },
    data: { ...legacy.data.data, actionReceipts: [] },
  }
}

function migrateV1(input: unknown): unknown {
  const legacy = backupV1Schema.safeParse(input)
  if (!legacy.success) throw new AppError('Validation', 'Legacy V1 backup validation failed')

  // V1 has no Health measurements; empty collections avoid inventing private values.
  return {
    ...legacy.data,
    formatVersion: 2,
    counts: { ...legacy.data.counts, weightEntries: 0, activitySessions: 0 },
    data: { ...legacy.data.data, weightEntries: [], activitySessions: [] },
  }
}

export function validateBackup(input: unknown): LifeIndexBackupV2 {
  if (typeof input !== 'object' || input === null) {
    throw new AppError('Validation', 'Backup root must be an object')
  }

  const header = input as { format?: unknown; formatVersion?: unknown }
  if (header.format !== 'lifeindex-backup') {
    throw new AppError('Validation', 'Backup format is not recognized')
  }
  if (!Number.isInteger(header.formatVersion)) {
    throw new AppError('BackupVersion', 'Backup version is missing')
  }

  // Each migration is validated at its own frozen boundary before current-schema validation.
  let migrated: unknown = input
  if (header.formatVersion === 0) migrated = migrateV0(migrated)
  if ((migrated as { formatVersion?: unknown }).formatVersion === 1) migrated = migrateV1(migrated)
  if ((migrated as { formatVersion?: unknown }).formatVersion !== 2) {
    throw new AppError('BackupVersion', 'Backup version is not supported')
  }

  const parsed = backupV2Schema.safeParse(migrated)
  if (!parsed.success) throw new AppError('Validation', 'Backup schema validation failed')

  const backup = parsed.data as LifeIndexBackupV2
  assertDomainIntegrity(backup)
  return backup
}

export { calculateCounts, storeKeys }
