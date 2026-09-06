import { z } from 'zod'

import { isLocalDateKey } from '@/shared/domain/date'
import { MAX_AMOUNT_MINOR } from '@/shared/domain/money'

const instantSchema = z.iso.datetime({ offset: true })
const localDateSchema = z.string().refine(isLocalDateKey, 'Invalid local calendar date')
const uuidSchema = z
  .uuid()
  .refine((value) => value === value.toLowerCase(), 'UUID must be lowercase')
const categoryIdSchema = z.union([
  uuidSchema,
  z.string().regex(/^category-(?:(?:finance|focus)-[a-z0-9-]+-v1|activity-[a-z0-9-]+-v2)$/),
])
const normalizedText = (maximum: number) =>
  z
    .string()
    .trim()
    .min(1)
    .max(maximum)
    .transform((value) => value.normalize('NFC'))
const optionalText = (maximum: number) => normalizedText(maximum).optional()
const timezoneOffsetSchema = z.number().int().min(-840).max(840)

export const categorySchema = z
  .object({
    id: categoryIdSchema,
    domain: z.enum(['finance', 'focus', 'activity']),
    transactionType: z.enum(['expense', 'income']).optional(),
    name: normalizedText(40),
    icon: z.enum([
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
      'walking',
      'running',
      'cycling',
      'strength',
      'yoga',
    ]),
    color: z.enum(['sage', 'blue', 'amber', 'rose', 'violet', 'slate']),
    sortOrder: z.number().int().min(0).max(10_000),
    archived: z.union([z.literal(0), z.literal(1)]),
    createdAt: instantSchema,
    updatedAt: instantSchema,
  })
  .strict()
  .superRefine((category, context) => {
    const hasValidFinanceType =
      category.domain === 'finance' && category.transactionType !== undefined
    const hasValidNonFinanceType =
      (category.domain === 'focus' || category.domain === 'activity') &&
      category.transactionType === undefined
    if (!hasValidFinanceType && !hasValidNonFinanceType) {
      context.addIssue({
        code: 'custom',
        path: ['transactionType'],
        message: 'Category type mismatch',
      })
    }
  })

export const transactionSchema = z
  .object({
    id: uuidSchema,
    type: z.enum(['expense', 'income']),
    amountMinor: z.number().int().positive().max(MAX_AMOUNT_MINOR),
    currency: z.string().regex(/^[A-Z]{3}$/),
    categoryId: categoryIdSchema,
    occurredAt: instantSchema,
    localDate: localDateSchema,
    timezoneOffsetMinutes: timezoneOffsetSchema,
    note: optionalText(280),
    createdAt: instantSchema,
    updatedAt: instantSchema,
  })
  .strict()

const dailyScheduleSchema = z.object({ type: z.literal('daily') }).strict()
const weekdayScheduleSchema = z
  .object({
    type: z.literal('weekdays'),
    weekdays: z.array(z.number().int().min(0).max(6)).min(1).max(7),
  })
  .strict()
  .superRefine((schedule, context) => {
    const canonical = [...new Set(schedule.weekdays)].sort((left, right) => left - right)
    if (
      canonical.length !== schedule.weekdays.length ||
      canonical.some((day, i) => day !== schedule.weekdays[i])
    ) {
      context.addIssue({
        code: 'custom',
        path: ['weekdays'],
        message: 'Weekdays must be unique and sorted',
      })
    }
  })

export const habitSchema = z
  .object({
    id: uuidSchema,
    name: normalizedText(60),
    icon: z.string().regex(/^[a-z][a-z0-9-]{0,30}$/),
    color: z.enum(['sage', 'blue', 'amber', 'rose', 'violet', 'slate']),
    schedule: z.discriminatedUnion('type', [dailyScheduleSchema, weekdayScheduleSchema]),
    startLocalDate: localDateSchema,
    status: z.enum(['active', 'paused']),
    pausedAt: instantSchema.optional(),
    note: optionalText(280),
    createdAt: instantSchema,
    updatedAt: instantSchema,
  })
  .strict()
  .superRefine((habit, context) => {
    if (habit.status === 'paused' && !habit.pausedAt) {
      context.addIssue({
        code: 'custom',
        path: ['pausedAt'],
        message: 'Paused habit needs timestamp',
      })
    }
    if (habit.status === 'active' && habit.pausedAt) {
      context.addIssue({
        code: 'custom',
        path: ['pausedAt'],
        message: 'Active habit cannot be paused',
      })
    }
  })

export const habitRecordSchema = z
  .object({
    id: uuidSchema,
    habitId: uuidSchema,
    localDate: localDateSchema,
    completedAt: instantSchema,
    timezoneOffsetMinutes: timezoneOffsetSchema,
    note: optionalText(280),
    createdAt: instantSchema,
    updatedAt: instantSchema,
  })
  .strict()

export const focusSessionSchema = z
  .object({
    id: uuidSchema,
    status: z.enum(['active', 'completed']),
    title: normalizedText(100),
    categoryId: categoryIdSchema.optional(),
    note: optionalText(500),
    startedAt: instantSchema,
    plannedDurationSeconds: z.number().int().min(60).max(14_400),
    expectedEndAt: instantSchema,
    endedAt: instantSchema.optional(),
    durationSeconds: z.number().int().positive().max(14_400).optional(),
    completionKind: z.enum(['timer', 'early']).optional(),
    localDate: localDateSchema,
    timezoneOffsetMinutes: timezoneOffsetSchema,
    createdAt: instantSchema,
    updatedAt: instantSchema,
  })
  .strict()
  .superRefine((session, context) => {
    const completionFields = [session.endedAt, session.durationSeconds, session.completionKind]
    const validActive =
      session.status === 'active' && completionFields.every((value) => value === undefined)
    const validCompleted =
      session.status === 'completed' && completionFields.every((value) => value !== undefined)
    if (!validActive && !validCompleted) {
      context.addIssue({ code: 'custom', path: ['status'], message: 'Focus state is inconsistent' })
    }
    if (
      session.durationSeconds !== undefined &&
      session.durationSeconds > session.plannedDurationSeconds
    ) {
      context.addIssue({
        code: 'custom',
        path: ['durationSeconds'],
        message: 'Duration exceeds plan',
      })
    }
  })

export const weightEntrySchema = z
  .object({
    id: uuidSchema,
    weightGrams: z.number().int().min(20_000).max(500_000),
    measuredAt: instantSchema,
    localDate: localDateSchema,
    timezoneOffsetMinutes: timezoneOffsetSchema,
    note: optionalText(280),
    createdAt: instantSchema,
    updatedAt: instantSchema,
  })
  .strict()

export const activitySessionSchema = z
  .object({
    id: uuidSchema,
    categoryId: categoryIdSchema,
    durationMinutes: z.number().int().min(1).max(1_440),
    intensity: z.enum(['light', 'moderate', 'hard']),
    occurredAt: instantSchema,
    localDate: localDateSchema,
    timezoneOffsetMinutes: timezoneOffsetSchema,
    note: optionalText(280),
    createdAt: instantSchema,
    updatedAt: instantSchema,
  })
  .strict()

const appearanceSettingSchema = z
  .object({
    key: z.literal('appearance'),
    value: z.enum(['system', 'light', 'dark']),
    updatedAt: instantSchema,
  })
  .strict()
const currencySettingSchema = z
  .object({
    key: z.literal('currency'),
    value: z.object({ code: z.literal('CNY') }).strict(),
    updatedAt: instantSchema,
  })
  .strict()
const onboardingSettingSchema = z
  .object({
    key: z.literal('onboarding'),
    value: z.object({ localDataNoticeSeen: z.boolean(), backupNoticeSeen: z.boolean() }).strict(),
    updatedAt: instantSchema,
  })
  .strict()
const exportSettingSchema = z
  .object({
    key: z.literal('lastSuccessfulExportAt'),
    value: instantSchema,
    updatedAt: instantSchema,
  })
  .strict()
const weightTargetSettingSchema = z
  .object({
    key: z.literal('weightTarget'),
    value: z.object({ weightGrams: z.number().int().min(20_000).max(500_000) }).strict(),
    updatedAt: instantSchema,
  })
  .strict()

export const settingSchema = z.discriminatedUnion('key', [
  appearanceSettingSchema,
  currencySettingSchema,
  onboardingSettingSchema,
  exportSettingSchema,
  weightTargetSettingSchema,
])

export const actionReceiptSchema = z
  .object({
    actionId: uuidSchema,
    actionType: z.enum(['add-transaction', 'check-habit', 'start-focus']),
    handledAt: instantSchema,
    outcomeEntityId: uuidSchema,
  })
  .strict()

export const backupDataSchema = z
  .object({
    categories: z.array(categorySchema),
    transactions: z.array(transactionSchema),
    habits: z.array(habitSchema),
    habitRecords: z.array(habitRecordSchema),
    focusSessions: z.array(focusSessionSchema),
    settings: z.array(settingSchema),
    actionReceipts: z.array(actionReceiptSchema),
    weightEntries: z.array(weightEntrySchema),
    activitySessions: z.array(activitySessionSchema),
  })
  .strict()
