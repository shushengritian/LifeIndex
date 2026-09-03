const localDatePattern = /^(\d{4})-(\d{2})-(\d{2})$/

export function toLocalDateKey(value: Date): string {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function parseLocalDateKey(value: string): Date | undefined {
  const match = localDatePattern.exec(value)
  if (!match) return undefined

  const [, yearText, monthText, dayText] = match
  const year = Number(yearText)
  const month = Number(monthText)
  const day = Number(dayText)
  const parsed = new Date(year, month - 1, day)

  // Date normalizes impossible values, so compare every calendar component before accepting it.
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return undefined
  }

  return parsed
}

export function isLocalDateKey(value: string): boolean {
  return parseLocalDateKey(value) !== undefined
}

export function addLocalDays(value: string, amount: number): string {
  const parsed = parseLocalDateKey(value)
  if (!parsed || !Number.isInteger(amount)) throw new RangeError('Invalid local date operation')

  // Calendar component advancement stays correct across daylight-saving transitions.
  parsed.setDate(parsed.getDate() + amount)
  return toLocalDateKey(parsed)
}

export function startOfLocalWeek(value: string): string {
  const parsed = parseLocalDateKey(value)
  if (!parsed) throw new RangeError('Invalid local date')
  const daysFromMonday = (parsed.getDay() + 6) % 7
  return addLocalDays(value, -daysFromMonday)
}

export function endOfLocalMonth(value: string): string {
  const parsed = parseLocalDateKey(value)
  if (!parsed) throw new RangeError('Invalid local date')
  return toLocalDateKey(new Date(parsed.getFullYear(), parsed.getMonth() + 1, 0))
}

export function startOfLocalMonth(value: string): string {
  if (!isLocalDateKey(value)) throw new RangeError('Invalid local date')
  return `${value.slice(0, 7)}-01`
}

export function addLocalMonths(value: string, amount: number): string {
  const parsed = parseLocalDateKey(startOfLocalMonth(value))
  if (!parsed || !Number.isInteger(amount)) throw new RangeError('Invalid local month operation')
  parsed.setMonth(parsed.getMonth() + amount)
  return toLocalDateKey(parsed)
}
