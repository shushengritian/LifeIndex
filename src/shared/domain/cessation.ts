import { addLocalDays, isLocalDateKey } from '@/shared/domain/date'
import type { CessationDay, CessationEvent, CessationPlan } from '@/shared/domain/types'
import { AppError } from '@/shared/errors/AppError'

const formatters = new Map<string, Intl.DateTimeFormat>()
export function zonedDateKey(at: Date, timeZone: string): string {
  let formatter = formatters.get(timeZone)
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
    formatters.set(timeZone, formatter)
  }
  const parts = formatter.formatToParts(at)
  return ['year', 'month', 'day']
    .map((type) => parts.find((part) => part.type === type)?.value)
    .join('-')
}

export function validTimeZone(zone: string): boolean {
  try {
    zonedDateKey(new Date(0), zone)
    return true
  } catch {
    return false
  }
}

// Locate calendar boundaries in the plan's immutable zone, including 23/25-hour DST days.
// Binary search also handles zones whose transition occurs at midnight without guessing an offset.
export function dayStart(key: string, zone: string): number {
  if (!isLocalDateKey(key)) throw new AppError('Validation', 'Invalid calendar date')
  const center = Date.parse(`${key}T00:00:00Z`)
  let lo = center - 36 * 3_600_000,
    hi = center + 36 * 3_600_000
  while (lo < hi) {
    const middle = Math.floor((lo + hi) / 2)
    if (zonedDateKey(new Date(middle), zone) < key) lo = middle + 1
    else hi = middle
  }
  return lo
}

export function fullDayEligible(plan: CessationPlan, key: string, now: Date): boolean {
  const start = dayStart(key, plan.timeZone)
  const end = dayStart(addLocalDays(key, 1), plan.timeZone)
  return (
    end > start &&
    start >= Date.parse(plan.startAt) &&
    end <= now.getTime() &&
    (!plan.endAt || end <= Date.parse(plan.endAt))
  )
}

export function cessationDayStatus(
  key: string,
  days: CessationDay[],
  events: CessationEvent[],
  today: string,
): string {
  if (events.some((event) => event.localDate === key && event.kind === 'smoking'))
    return '有吸烟记录'
  const day = days.find((record) => record.localDate === key)
  if (day?.kind === 'fullDay') return '全天未吸烟'
  if (day?.kind === 'snapshot') return key === today ? '截至记录时未吸烟' : '待确认'
  return '未记录'
}

export function cessationSummary(
  plan: CessationPlan,
  days: CessationDay[],
  events: CessationEvent[],
  now: Date,
) {
  const fullDays = days.filter(
    (day) =>
      day.kind === 'fullDay' &&
      fullDayEligible(plan, day.localDate, now) &&
      !events.some((event) => event.kind === 'smoking' && event.localDate === day.localDate),
  ).length
  const lastSmoke = events
    .filter((event) => event.kind === 'smoking')
    .reduce((last, event) => Math.max(last, Date.parse(event.occurredAt)), 0)
  const until = Math.min(now.getTime(), plan.endAt ? Date.parse(plan.endAt) : Infinity)
  const elapsedHours = Math.max(
    0,
    Math.floor((until - (lastSmoke || Date.parse(plan.startAt))) / 3_600_000),
  )
  const savedMinor = plan.baseline
    ? Math.round(
        (fullDays * plan.baseline.dailyCount * plan.baseline.packPriceMinor) /
          plan.baseline.packCount,
      )
    : undefined
  // Coverage counts calendar labels, including partial days, not elapsed 24-hour intervals.
  // A cancelled/future interval has no recordable dates; unselected triggers are not inferred.
  const lastDate = zonedDateKey(new Date(until), plan.timeZone)
  const recordableDays =
    until <= Date.parse(plan.startAt)
      ? 0
      : Math.floor(
          (Date.parse(`${lastDate}T00:00:00Z`) - Date.parse(`${plan.startLocalDate}T00:00:00Z`)) /
            86400000,
        ) + 1
  const triggers = new Map<string, number>()
  for (const event of events)
    if (event.trigger) triggers.set(event.trigger, (triggers.get(event.trigger) ?? 0) + 1)
  return {
    fullDays,
    elapsedHours,
    savedMinor,
    lastSmoke,
    recordableDays,
    triggers,
    coveredDays: new Set([
      ...days.map((day) => day.localDate),
      ...events.map((event) => event.localDate),
    ]).size,
  }
}

// Shared by writes and backup validation so imported facts cannot bypass repository invariants.
export function assertCessationIntegrity(
  plans: CessationPlan[],
  days: CessationDay[],
  events: CessationEvent[],
  now: Date,
): void {
  const reject = () => {
    throw new AppError('Validation', 'Cessation records are inconsistent')
  }
  // Audit metadata is part of the restore contract, not trusted merely because dates parse.
  for (const record of [...plans, ...days, ...events]) {
    if (
      Date.parse(record.createdAt) > now.getTime() ||
      Date.parse(record.updatedAt) > now.getTime() ||
      Date.parse(record.updatedAt) < Date.parse(record.createdAt)
    )
      reject()
  }
  // Cancelled future plans have empty intervals and must not block a new plan starting now.
  const sorted = plans
    .filter((plan) => !plan.endAt || Date.parse(plan.endAt) !== Date.parse(plan.startAt))
    .sort((a, b) => Date.parse(a.startAt) - Date.parse(b.startAt))
  if (plans.filter((plan) => !plan.endAt).length > 1) reject()
  for (const plan of plans) {
    if (plan.startLocalDate !== zonedDateKey(new Date(plan.startAt), plan.timeZone)) reject()
    if (
      Date.parse(plan.createdAt) > now.getTime() ||
      Date.parse(plan.updatedAt) > now.getTime() ||
      Date.parse(plan.updatedAt) < Date.parse(plan.createdAt) ||
      Date.parse(plan.startAt) > Date.parse(plan.createdAt) + 30 * 86400000
    )
      reject()
    if (
      plan.endAt &&
      (Date.parse(plan.endAt) < Date.parse(plan.startAt) ||
        (Date.parse(plan.endAt) > now.getTime() &&
          Date.parse(plan.endAt) !== Date.parse(plan.startAt)) ||
        plan.endLocalDate !== zonedDateKey(new Date(plan.endAt), plan.timeZone))
    )
      reject()
  }
  for (const [index, plan] of sorted.entries()) {
    const previous = sorted[index - 1]
    if (previous && (!previous.endAt || Date.parse(previous.endAt) > Date.parse(plan.startAt)))
      reject()
  }
  const byId = new Map(plans.map((plan) => [plan.id, plan]))
  if (new Set(days.map((day) => `${day.planId}:${day.localDate}`)).size !== days.length) reject()
  for (const event of events) {
    const plan = byId.get(event.planId)
    if (!plan) {
      reject()
      continue
    }
    const time = Date.parse(event.occurredAt)
    if (
      time > now.getTime() ||
      time < Date.parse(plan.startAt) ||
      (plan.endAt &&
        (time > Date.parse(plan.endAt) || Date.parse(plan.endAt) === Date.parse(plan.startAt))) ||
      event.localDate !== zonedDateKey(new Date(time), plan.timeZone)
    )
      reject()
  }
  for (const day of days) {
    const plan = byId.get(day.planId)
    if (!plan) {
      reject()
      continue
    }
    if (Date.parse(day.reportedAt) > now.getTime()) reject()
    if (
      events.some(
        (event) =>
          event.planId === day.planId &&
          event.localDate === day.localDate &&
          event.kind === 'smoking',
      )
    )
      reject()
    if (day.kind === 'fullDay') {
      if (!fullDayEligible(plan, day.localDate, new Date(day.reportedAt))) reject()
    } else if (
      day.localDate !== zonedDateKey(new Date(day.reportedAt), plan.timeZone) ||
      Date.parse(day.reportedAt) < Date.parse(plan.startAt) ||
      (plan.endAt &&
        (Date.parse(day.reportedAt) > Date.parse(plan.endAt) ||
          Date.parse(plan.endAt) === Date.parse(plan.startAt)))
    )
      reject()
  }
}
