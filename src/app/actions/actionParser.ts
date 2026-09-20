import { z } from 'zod'

import { toLocalDateKey } from '@/shared/domain/date'
import { logger } from '@/shared/logging/logger'

const actionTypes = ['check-habit', 'start-focus'] as const
export type EnabledActionType = (typeof actionTypes)[number]
const actionIdSchema = z
  .uuid()
  .refine((value) => value === value.toLowerCase(), 'UUID must be lowercase')
const categoryIdSchema = z.union([
  actionIdSchema,
  z.string().regex(/^category-(finance|focus)-[a-z0-9-]+-v1$/),
])
const localDateSchema = z.iso.date()
const normalizedText = (maximum: number) =>
  z
    .string()
    .trim()
    .min(1)
    .max(maximum)
    .transform((value) => value.normalize('NFC'))

const checkHabitSchema = z
  .object({
    actionId: actionIdSchema,
    habitId: actionIdSchema,
    localDate: localDateSchema.optional(),
  })
  .strict()

const startFocusSchema = z
  .object({
    actionId: actionIdSchema,
    title: normalizedText(100),
    durationMinutes: z
      .string()
      .regex(/^\d{1,3}$/)
      .transform(Number)
      .pipe(z.number().int().min(1).max(240))
      .default(25),
    categoryId: categoryIdSchema.optional(),
    note: normalizedText(500).optional(),
  })
  .strict()

export type ParsedAction =
  | {
      type: 'check-habit'
      actionId: string
      habitId: string
      localDate: string
    }
  | {
      type: 'start-focus'
      actionId: string
      draft: {
        title: string
        plannedDurationSeconds: number
        categoryId?: string
        note?: string
      }
    }

export type ActionParseFailureReason =
  'UnknownAction' | 'MalformedEncoding' | 'DuplicateField' | 'InvalidField'

export type ActionParseResult =
  { ok: true; action: ParsedAction } | { ok: false; reason: ActionParseFailureReason }

function isEnabledActionType(value: string): value is EnabledActionType {
  return actionTypes.some((actionType) => actionType === value)
}

function uniqueParameters(search: string): Record<string, string> | undefined {
  try {
    // URLSearchParams tolerates malformed escapes, so decode once first to reject corrupted encoded URLs.
    decodeURIComponent(search.replace(/\+/g, ' '))
  } catch {
    return undefined
  }

  // A null-prototype map prevents special keys such as __proto__ from changing parser behavior.
  const values = Object.create(null) as Record<string, string>
  for (const [key, value] of new URLSearchParams(
    search.startsWith('?') ? search.slice(1) : search,
  )) {
    if (Object.hasOwn(values, key)) return undefined
    values[key] = value
  }
  return values
}

function failure(actionType: EnabledActionType | undefined, reason: ActionParseFailureReason) {
  logger.warn('action.parse.failed', {
    operation: 'parse',
    ...(actionType ? { actionType } : {}),
    failureClass: reason,
  })
  return { ok: false, reason } as const
}

export function parseActionRoute(
  rawEnabledActionType: string,
  search: string,
  now = new Date(),
): ActionParseResult {
  const actionType = isEnabledActionType(rawEnabledActionType) ? rawEnabledActionType : undefined
  logger.info('action.parse.started', {
    operation: 'parse',
    ...(actionType ? { actionType } : {}),
  })
  if (!actionType) return failure(undefined, 'UnknownAction')

  const parameters = uniqueParameters(search)
  if (!parameters) {
    const malformed = (() => {
      try {
        decodeURIComponent(search.replace(/\+/g, ' '))
        return false
      } catch {
        return true
      }
    })()
    return failure(actionType, malformed ? 'MalformedEncoding' : 'DuplicateField')
  }

  let action: ParsedAction | undefined
  // Only enabled link actions reach parsing; retired actions cannot create financial records.
  if (actionType === 'check-habit') {
    const parsed = checkHabitSchema.safeParse(parameters)
    if (parsed.success) {
      action = {
        type: actionType,
        actionId: parsed.data.actionId,
        habitId: parsed.data.habitId,
        localDate: parsed.data.localDate ?? toLocalDateKey(now),
      }
    }
  } else {
    const parsed = startFocusSchema.safeParse(parameters)
    if (parsed.success) {
      action = {
        type: actionType,
        actionId: parsed.data.actionId,
        draft: {
          title: parsed.data.title,
          plannedDurationSeconds: parsed.data.durationMinutes * 60,
          ...(parsed.data.categoryId ? { categoryId: parsed.data.categoryId } : {}),
          ...(parsed.data.note ? { note: parsed.data.note } : {}),
        },
      }
    }
  }

  if (!action) return failure(actionType, 'InvalidField')
  logger.info('action.parse.succeeded', { operation: 'parse', actionType })
  return { ok: true, action }
}
