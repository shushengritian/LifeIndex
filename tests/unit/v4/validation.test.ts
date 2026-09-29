import { describe, expect, it, vi } from 'vitest'
import {
  parseMoneyInput,
  parseWeightInput,
  parseMinutesInput,
  dateKey,
  uuid,
  validateCategoryInput,
  validateHabitInput,
  validateWeightInput,
} from '@/core/validation'
import { coreLog } from '@/core/errors'

describe('v4 shared exact input validation', () => {
  it('converts decimal digits without rounding money or grams', () => {
    expect(parseMoneyInput('0.29')).toBe(29)
    expect(parseMoneyInput('99999999.99')).toBe(9999999999)
    expect(parseWeightInput('65.123')).toBe(65123)
    expect(parseWeightInput('1000')).toBe(1000000)
    for (const value of ['1.001', '1e3', '-1', 'Infinity', '', '0'])
      expect(() => parseMoneyInput(value)).toThrow('Validation')
    for (const value of ['0.999', '1000.001', '65.0001'])
      expect(() => parseWeightInput(value)).toThrow('Validation')
    for (const value of ['0', '1441', '1.5'])
      expect(() => parseMinutesInput(value)).toThrow('Validation')
    expect(parseMinutesInput('1440')).toBe(1440)
  })
  it('rejects impossible dates, non UUIDs, unknown fields and invalid shared limits', () => {
    expect(dateKey('2024-02-29')).toBe('2024-02-29')
    expect(() => dateKey('2026-02-29')).toThrow()
    expect(() => uuid('cat-food')).toThrow()
    expect(() =>
      validateWeightInput({ localDate: '2026-09-28', utcOffsetMinutes: 480, weightGrams: 999 }),
    ).toThrow()
    expect(() =>
      validateWeightInput({
        localDate: '2026-09-28',
        utcOffsetMinutes: 480,
        weightGrams: 65000,
        measuredAt: 'invented',
      }),
    ).toThrow()
    expect(() =>
      validateCategoryInput({ scope: 'expense', name: '😀'.repeat(16), iconKey: 'bag' }),
    ).toThrow()
    expect(
      validateCategoryInput({ scope: 'expense', name: `  ${'字'.repeat(30)}  `, iconKey: 'bag' })
        .name.length,
    ).toBe(30)
    expect(() =>
      validateHabitInput({ name: '合成习惯', iconKey: 'leaf', scheduleWeekdays: [1, 1] }),
    ).toThrow()
  })
  it('filters log values at runtime instead of accepting arbitrary personal strings', () => {
    const spy = vi.spyOn(console, 'info').mockImplementation(() => undefined)
    coreLog('SYNTHETIC_PERSONAL_NOTE', 'ready', 'SYNTHETIC_BACKUP')
    expect(JSON.stringify(spy.mock.calls)).not.toContain('SYNTHETIC')
  })
})
