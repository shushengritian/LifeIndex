import { z } from 'zod'

import type { BackupCounts, BackupData, LifeIndexBackupV1 } from '@/shared/domain/types'
import { AppError } from '@/shared/errors/AppError'
import { backupDataSchema } from '@/shared/validation/schemas'

const storeKeys = [
  'categories',
  'transactions',
  'habits',
  'habitRecords',
  'focusSessions',
  'settings',
  'actionReceipts',
] as const satisfies ReadonlyArray<keyof BackupData>

const sourceSchema = z
  .object({
    timezoneOffsetMinutes: z.number().int().min(-840).max(840),
    locale: z.string().trim().min(2).max(35),
  })
  .strict()

const countsSchema = z
  .object({
    categories: z.number().int().nonnegative(),
    transactions: z.number().int().nonnegative(),
    habits: z.number().int().nonnegative(),
    habitRecords: z.number().int().nonnegative(),
    focusSessions: z.number().int().nonnegative(),
    settings: z.number().int().nonnegative(),
    actionReceipts: z.number().int().nonnegative(),
  })
  .strict()

const backupV1Schema = z
  .object({
    format: z.literal('lifeindex-backup'),
    formatVersion: z.literal(1),
    appVersion: z.string().trim().min(1).max(40),
    exportedAt: z.iso.datetime({ offset: true }),
    source: sourceSchema,
    counts: countsSchema,
    data: backupDataSchema,
  })
  .strict()

const backupV0Schema = z
  .object({
    format: z.literal('lifeindex-backup'),
    formatVersion: z.literal(0),
    appVersion: z.string().trim().min(1).max(40),
    exportedAt: z.iso.datetime({ offset: true }),
    source: sourceSchema,
    counts: countsSchema.omit({ actionReceipts: true }),
    data: backupDataSchema.omit({ actionReceipts: true }),
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

function assertDomainIntegrity(backup: LifeIndexBackupV1): void {
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

  if (data.focusSessions.filter(({ status }) => status === 'active').length > 1) {
    throw new AppError('BackupIntegrity', 'More than one focus session is active')
  }
  assertReferences(data)
}

function migrateV0(input: unknown): unknown {
  const legacy = backupV0Schema.safeParse(input)
  if (!legacy.success) {
    throw new AppError('Validation', 'Legacy backup validation failed')
  }

  // V0 predates URL Actions; an empty receipt collection preserves every existing business record.
  return {
    ...legacy.data,
    formatVersion: 1,
    counts: { ...legacy.data.counts, actionReceipts: 0 },
    data: { ...legacy.data.data, actionReceipts: [] },
  }
}

export function validateBackup(input: unknown): LifeIndexBackupV1 {
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

  // Migrations run in memory and flow through the current schema and integrity checks before any write.
  const migrated = header.formatVersion === 0 ? migrateV0(input) : input
  if ((migrated as { formatVersion?: unknown }).formatVersion !== 1) {
    throw new AppError('BackupVersion', 'Backup version is not supported')
  }

  const parsed = backupV1Schema.safeParse(migrated)
  if (!parsed.success) {
    throw new AppError('Validation', 'Backup schema validation failed')
  }

  const backup = parsed.data as LifeIndexBackupV1
  assertDomainIntegrity(backup)
  return backup
}

export { calculateCounts, storeKeys }
