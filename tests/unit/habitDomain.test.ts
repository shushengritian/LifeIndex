import { describe, expect, it } from 'vitest'

import {
  calculateHabitStatistics,
  currentMonthCalendar,
  isHabitScheduled,
  isHabitVisibleForToday,
} from '@/features/habits/habitDomain'
import { buildHabit, buildHabitRecord } from '../fixtures/builders'

describe('habit schedules and statistics', () => {
  it('respects start date, weekday membership, and active presentation', () => {
    const habit = buildHabit({
      startLocalDate: '2026-09-01',
      schedule: { type: 'weekdays', weekdays: [1, 3, 5] },
    })
    expect(isHabitScheduled(habit, '2026-08-31')).toBe(false)
    expect(isHabitScheduled(habit, '2026-09-02')).toBe(true)
    expect(isHabitScheduled(habit, '2026-09-03')).toBe(false)
    expect(
      isHabitVisibleForToday(
        { ...habit, status: 'paused', pausedAt: '2026-09-02T12:00:00.000Z' },
        '2026-09-02',
      ),
    ).toBe(false)
  })

  it('does not let unscheduled days or unfinished today break the current streak', () => {
    const habit = buildHabit({
      startLocalDate: '2026-08-31',
      schedule: { type: 'weekdays', weekdays: [1, 2, 3, 4, 5] },
    })
    const records = [
      buildHabitRecord({ id: '00000000-0000-4000-8000-000000000041', localDate: '2026-08-31' }),
      buildHabitRecord({ id: '00000000-0000-4000-8000-000000000042', localDate: '2026-09-01' }),
      buildHabitRecord({ id: '00000000-0000-4000-8000-000000000043', localDate: '2026-09-02' }),
    ]
    expect(calculateHabitStatistics(habit, records, '2026-09-03')).toEqual({
      currentStreak: 3,
      longestStreak: 3,
      monthCompleted: 2,
      monthScheduled: 3,
      monthRate: 2 / 3,
      totalCompletions: 3,
    })
  })

  it('marks scheduled and future states in the current month calendar', () => {
    const habit = buildHabit({ startLocalDate: '2026-09-02' })
    const calendar = currentMonthCalendar(habit, '2026-09-03')
    expect(calendar).toHaveLength(30)
    expect(calendar[0]).toMatchObject({ scheduled: false, future: false })
    expect(calendar[1]).toMatchObject({ scheduled: true, future: false })
    expect(calendar[3]).toMatchObject({ scheduled: true, future: true })
  })
})
