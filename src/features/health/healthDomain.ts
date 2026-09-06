import { addLocalDays } from '@/shared/domain/date'
import type { ActivitySession, WeightEntry } from '@/shared/domain/types'

export type WeightParseResult =
  { ok: true; weightGrams: number } | { ok: false; reason: 'format' | 'range' }

export function parseWeightToGrams(input: string): WeightParseResult {
  const normalized = input.trim().replace(',', '.')
  const match = /^(\d{1,3})(?:\.(\d{1,3}))?$/.exec(normalized)
  if (!match) return { ok: false, reason: 'format' }
  const whole = Number(match[1])
  const fraction = Number((match[2] ?? '').padEnd(3, '0'))
  const weightGrams = whole * 1_000 + fraction
  if (!Number.isSafeInteger(weightGrams) || weightGrams < 20_000 || weightGrams > 500_000) {
    return { ok: false, reason: 'range' }
  }
  return { ok: true, weightGrams }
}

export function formatWeightGrams(weightGrams: number): string {
  if (!Number.isInteger(weightGrams)) throw new RangeError('Weight must use integer grams')
  return new Intl.NumberFormat('zh-CN', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(weightGrams / 1_000)
}

export interface WeightTrend {
  latest?: WeightEntry
  deltaGrams?: number
}

export function summarizeWeightTrend(entries: readonly WeightEntry[], today: string): WeightTrend {
  const from = addLocalDays(today, -29)
  const windowEntries = entries
    .filter(({ localDate }) => localDate >= from && localDate <= today)
    .sort((left, right) => left.measuredAt.localeCompare(right.measuredAt))
  const latest = windowEntries.at(-1)
  if (!latest) return {}
  if (windowEntries.length < 2) return { latest }
  return { latest, deltaGrams: latest.weightGrams - windowEntries[0]!.weightGrams }
}

export interface ActivitySummary {
  count: number
  durationMinutes: number
}

export function summarizeActivities(entries: readonly ActivitySession[]): ActivitySummary {
  let durationMinutes = 0
  for (const entry of entries) {
    durationMinutes += entry.durationMinutes
    if (!Number.isSafeInteger(durationMinutes)) throw new RangeError('Activity duration is unsafe')
  }
  return { count: entries.length, durationMinutes }
}
