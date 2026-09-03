import { describe, expect, it } from 'vitest'

import {
  addLocalDays,
  isLocalDateKey,
  parseLocalDateKey,
  toLocalDateKey,
} from '@/shared/domain/date'

describe('local date utilities', () => {
  it('round-trips calendar components without slicing a UTC instant', () => {
    const date = new Date(2026, 8, 3, 23, 30)
    expect(toLocalDateKey(date)).toBe('2026-09-03')
    expect(parseLocalDateKey('2026-09-03')).toBeInstanceOf(Date)
  })

  it.each([
    ['2024-02-29', true],
    ['2025-02-29', false],
    ['2026-13-01', false],
    ['2026-00-10', false],
    ['2026-9-03', false],
  ])('validates actual calendar date %s', (value, expected) => {
    expect(isLocalDateKey(value)).toBe(expected)
  })

  it('advances calendar days across month and leap-year boundaries', () => {
    expect(addLocalDays('2024-02-28', 1)).toBe('2024-02-29')
    expect(addLocalDays('2024-02-29', 1)).toBe('2024-03-01')
    expect(addLocalDays('2025-01-01', -1)).toBe('2024-12-31')
  })
})
