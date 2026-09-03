import { describe, expect, it } from 'vitest'

import {
  MAX_AMOUNT_MINOR,
  formatMoney,
  parseMoneyToMinor,
  sumMoneyMinor,
} from '@/shared/domain/money'

describe('money utilities', () => {
  it.each([
    ['0.01', 1],
    ['12', 1_200],
    ['12.3', 1_230],
    ['999999999.99', MAX_AMOUNT_MINOR],
  ])('parses %s without floating-point multiplication', (input, expected) => {
    expect(parseMoneyToMinor(input)).toEqual({ ok: true, amountMinor: expected })
  })

  it.each(['', '0', '-1', '1.001', '01.00', '1000000000.00', '12,30'])(
    'rejects invalid or out-of-range input %s',
    (input) => {
      expect(parseMoneyToMinor(input).ok).toBe(false)
    },
  )

  it('guards accumulation outside the safe integer range', () => {
    expect(sumMoneyMinor([10, 20, -5])).toBe(25)
    expect(() => sumMoneyMinor([Number.MAX_SAFE_INTEGER, 1])).toThrow(RangeError)
  })

  it('formats integer minor units only at the rendering boundary', () => {
    expect(formatMoney(1_230, 'CNY', 'zh-CN')).toContain('12.30')
    expect(() => formatMoney(1.5)).toThrow(RangeError)
  })
})
