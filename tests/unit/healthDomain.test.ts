import { describe, expect, it } from 'vitest'

import {
  formatWeightGrams,
  parseWeightToGrams,
  summarizeActivities,
  summarizeWeightTrend,
} from '@/features/health/healthDomain'
import { buildActivitySession, buildWeightEntry } from '../fixtures/builders'

describe('Health projections', () => {
  it.each([
    ['68.4', 68_400],
    ['68,425', 68_425],
    ['20', 20_000],
    ['500.000', 500_000],
  ])('parses %s kg losslessly to %i grams', (input, expected) => {
    expect(parseWeightToGrams(input)).toEqual({ ok: true, weightGrams: expected })
  })

  it.each(['', '68.1234', '19.999', '500.001', '-68', 'abc'])(
    'rejects invalid weight %s',
    (input) => {
      expect(parseWeightToGrams(input).ok).toBe(false)
    },
  )

  it('formats exact grams for the calm one-decimal display', () => {
    expect(formatWeightGrams(68_425)).toBe('68.4')
  })

  it('derives a trailing thirty-day signed trend and avoids inventing one record trend', () => {
    const first = buildWeightEntry({
      id: '00000000-0000-4000-8000-000000000111',
      weightGrams: 69_000,
      localDate: '2026-08-10',
      measuredAt: '2026-08-10T12:00:00.000Z',
    })
    const latest = buildWeightEntry({ weightGrams: 68_400 })
    expect(summarizeWeightTrend([latest, first], '2026-09-03')).toEqual({
      latest,
      deltaGrams: -600,
    })
    expect(summarizeWeightTrend([latest], '2026-09-03')).toEqual({ latest })
  })

  it('summarizes Activity count and whole minutes', () => {
    expect(
      summarizeActivities([
        buildActivitySession({ durationMinutes: 35 }),
        buildActivitySession({
          id: '00000000-0000-4000-8000-000000000112',
          durationMinutes: 25,
        }),
      ]),
    ).toEqual({ count: 2, durationMinutes: 60 })
  })
})
