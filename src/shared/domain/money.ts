const MAX_AMOUNT_MINOR = 99_999_999_999
const moneyPattern = /^(0|[1-9]\d*)(?:\.(\d{1,2}))?$/

export type MoneyParseResult =
  { ok: true; amountMinor: number } | { ok: false; reason: 'invalid-format' | 'out-of-range' }

export function parseMoneyToMinor(input: string): MoneyParseResult {
  const normalized = input.trim()
  const match = moneyPattern.exec(normalized)
  if (!match) return { ok: false, reason: 'invalid-format' }

  const [, majorText = '0', fractionText = ''] = match
  const major = Number(majorText)
  const minor = Number(fractionText.padEnd(2, '0'))

  // Integer composition avoids binary floating-point multiplication of the user's decimal input.
  const amountMinor = major * 100 + minor
  if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0 || amountMinor > MAX_AMOUNT_MINOR) {
    return { ok: false, reason: 'out-of-range' }
  }

  return { ok: true, amountMinor }
}

export function sumMoneyMinor(values: readonly number[]): number {
  return values.reduce((sum, value) => {
    const next = sum + value
    if (!Number.isSafeInteger(value) || !Number.isSafeInteger(next)) {
      throw new RangeError('Money sum is outside the safe integer range')
    }
    return next
  }, 0)
}

export function formatMoney(amountMinor: number, currency = 'CNY', locale = 'zh-CN'): string {
  if (!Number.isSafeInteger(amountMinor)) throw new RangeError('Money value must be a safe integer')

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(amountMinor / 100)
}

export { MAX_AMOUNT_MINOR }
