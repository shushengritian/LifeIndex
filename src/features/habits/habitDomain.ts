import {
  addLocalDays,
  endOfLocalMonth,
  parseLocalDateKey,
  startOfLocalMonth,
} from '@/shared/domain/date'
import type { Habit, HabitRecord } from '@/shared/domain/types'

export function isHabitScheduled(habit: Habit, localDate: string): boolean {
  if (localDate < habit.startLocalDate) return false
  if (habit.schedule.type === 'daily') return true
  const date = parseLocalDateKey(localDate)
  return date ? habit.schedule.weekdays.includes(date.getDay()) : false
}

export function isHabitVisibleForToday(habit: Habit, localDate: string): boolean {
  return habit.status === 'active' && isHabitScheduled(habit, localDate)
}

function scheduledDates(habit: Habit, from: string, to: string): string[] {
  const dates: string[] = []
  let cursor = from < habit.startLocalDate ? habit.startLocalDate : from
  let iterations = 0
  while (cursor <= to) {
    if (isHabitScheduled(habit, cursor)) dates.push(cursor)
    cursor = addLocalDays(cursor, 1)
    iterations += 1
    if (iterations > 40_000) throw new RangeError('Habit statistics range is too large')
  }
  return dates
}

export interface HabitStatistics {
  currentStreak: number
  longestStreak: number
  monthCompleted: number
  monthScheduled: number
  monthRate: number
  totalCompletions: number
}

export function calculateHabitStatistics(
  habit: Habit,
  records: readonly HabitRecord[],
  today: string,
): HabitStatistics {
  const completed = new Set(records.map(({ localDate }) => localDate))
  const historyDates = scheduledDates(habit, habit.startLocalDate, today)
  let currentStreak = 0
  let cursorIndex = historyDates.length - 1

  // An unfinished scheduled today is still in progress and does not break the prior streak.
  if (historyDates[cursorIndex] === today && !completed.has(today)) cursorIndex -= 1
  while (cursorIndex >= 0 && completed.has(historyDates[cursorIndex]!)) {
    currentStreak += 1
    cursorIndex -= 1
  }

  let longestStreak = 0
  let running = 0
  for (const localDate of historyDates) {
    if (completed.has(localDate)) {
      running += 1
      longestStreak = Math.max(longestStreak, running)
    } else {
      running = 0
    }
  }

  const monthStart = startOfLocalMonth(today)
  const monthEnd = today < endOfLocalMonth(today) ? today : endOfLocalMonth(today)
  const monthDates = scheduledDates(habit, monthStart, monthEnd)
  const monthCompleted = monthDates.filter((date) => completed.has(date)).length
  return {
    currentStreak,
    longestStreak,
    monthCompleted,
    monthScheduled: monthDates.length,
    monthRate: monthDates.length === 0 ? 0 : monthCompleted / monthDates.length,
    totalCompletions: records.length,
  }
}

export function currentMonthCalendar(habit: Habit, today: string) {
  const from = startOfLocalMonth(today)
  const to = endOfLocalMonth(today)
  return Array.from({ length: Number(to.slice(8, 10)) }, (_, index) => {
    const localDate = `${from.slice(0, 8)}${String(index + 1).padStart(2, '0')}`
    return { localDate, scheduled: isHabitScheduled(habit, localDate), future: localDate > today }
  })
}
