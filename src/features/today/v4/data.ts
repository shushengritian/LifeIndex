import { useEffect, useState } from 'react'
import { useV4Services } from '@/app/v4/Services'
import type { Snapshot } from '@/core/types'
import { localDate } from '@/shared/v4/format'
import { logger } from '@/shared/logging/logger'

export function useTodayDate(): string {
  const services = useV4Services()
  const [date, setDate] = useState(() => localDate(services.clock.capture()))
  useEffect(() => {
    // Calendar boundaries refresh after backgrounding too; open drafts retain their own captured date.
    const refresh = () => setDate(localDate(services.clock.capture()))
    const timer = window.setInterval(refresh, 30_000)
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [services])
  return date
}

export function usePageLog(entityType: string): void {
  useEffect(() => {
    logger.info('v4.page.entered', { entityType })
  }, [entityType])
}

export async function consistentPair<A, B>(
  left: () => Promise<Snapshot<A>>,
  right: () => Promise<Snapshot<B>>,
): Promise<Snapshot<{ left: A; right: B }>> {
  // Independently queried entities and references may straddle a restore. Never publish a mixed snapshot.
  for (let attempt = 0; attempt < 3; attempt++) {
    const [a, b] = await Promise.all([left(), right()])
    if (a.stamp.generation === b.stamp.generation && a.stamp.revision === b.stamp.revision)
      return { data: { left: a.data, right: b.data }, stamp: a.stamp }
    logger.info('v4.query.snapshotchanged', { reason: 'concurrent-write' })
  }
  throw Object.assign(new Error('Consistent snapshot unavailable'), {
    code: 'ReadFailure' as const,
  })
}

export function shiftDate(date: string, days: number): string {
  const value = new Date(`${date}T12:00:00Z`)
  value.setUTCDate(value.getUTCDate() + days)
  return value.toISOString().slice(0, 10)
}
export function validMonth(value: string | null): value is string {
  return !!value && /^\d{4}-(0[1-9]|1[0-2])$/.test(value) && value.slice(0, 4) >= '1000'
}
export function weekday(date: string): number {
  return new Date(`${date}T12:00:00Z`).getUTCDay() || 7
}
export function habitSchedule(days: number[]): string {
  return days.length === 7
    ? '每天'
    : `每周${days.map((day) => '一二三四五六日'[day - 1]).join('、')}`
}
export function calendarDays(month: string): (string | null)[] {
  const first = `${month}-01`,
    offset = weekday(first) - 1
  const [year, number] = month.split('-').map(Number)
  const count = new Date(Date.UTC(year!, number!, 0)).getUTCDate()
  return [
    ...Array<null>(offset).fill(null),
    ...Array.from(
      { length: count },
      (_, index) => `${month}-${String(index + 1).padStart(2, '0')}`,
    ),
  ]
}
