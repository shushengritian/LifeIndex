import { z } from 'zod'
import { isLocalDateKey } from '@/shared/domain/date'
import { validTimeZone } from '@/shared/domain/cessation'

const id = z.uuid().refine((value) => value === value.toLowerCase())
const instant = z.iso.datetime({ offset: true })
const date = z.string().refine(isLocalDateKey)
const audit = { createdAt: instant, updatedAt: instant }
export const cessationPlanSchema = z
  .object({
    id,
    startAt: instant,
    startLocalDate: date,
    timeZone: z.string().max(100).refine(validTimeZone),
    endAt: instant.optional(),
    endLocalDate: date.optional(),
    reason: z
      .string()
      .trim()
      .min(1)
      .max(80)
      .transform((value) => value.normalize('NFC'))
      .optional(),
    baseline: z
      .object({
        dailyCount: z.number().int().min(1).max(100),
        packCount: z.number().int().min(1).max(100),
        packPriceMinor: z.number().int().min(1).max(999999),
        currency: z.literal('CNY'),
      })
      .strict()
      .optional(),
    ...audit,
  })
  .strict()
  .refine((plan) => Boolean(plan.endAt) === Boolean(plan.endLocalDate))
export const cessationDaySchema = z
  .object({
    id,
    planId: id,
    localDate: date,
    kind: z.enum(['snapshot', 'fullDay']),
    reportedAt: instant,
    ...audit,
  })
  .strict()
const eventBase = {
  id,
  planId: id,
  occurredAt: instant,
  localDate: date,
  trigger: z.enum(['meal', 'stress', 'social', 'boredom', 'other']).optional(),
  ...audit,
}
export const cessationEventSchema = z.discriminatedUnion('kind', [
  z
    .object({ ...eventBase, kind: z.literal('smoking'), count: z.number().int().min(1).max(100) })
    .strict(),
  z
    .object({ ...eventBase, kind: z.literal('craving'), outcome: z.enum(['relieved', 'still']) })
    .strict(),
])
