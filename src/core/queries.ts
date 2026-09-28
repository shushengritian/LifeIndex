import { Engine } from './database'
import { fail } from './errors'
import type {
  ActivitySummary,
  Category,
  CompletedFocusSession,
  FinanceTotals,
  LifeIndexServices,
  MonthSummary,
  RecordView,
  TodayFinance,
  TodayHabits,
  TodayRecords,
  Transaction,
  WeightTrend,
} from './types'
import { dateAt, dateKey, integer, requireValue, safeSum } from './validation'
import { rangeDates } from './records'

export function totals(rows: Transaction[]): FinanceTotals {
  const incomeMinor = safeSum(
    rows.filter((row) => row.type === 'income').map((row) => row.amountMinor),
  )
  const expenseMinor = safeSum(
    rows.filter((row) => row.type === 'expense').map((row) => row.amountMinor),
  )
  return { incomeMinor, expenseMinor, netMinor: safeSum([incomeMinor, -expenseMinor]) }
}
function needCategory(map: Map<string, Category>, id: string): Category {
  const category = map.get(id)
  if (!category) fail('ReadFailure')
  return category
}
export function todayService(engine: Engine): LifeIndexServices['today'] {
  const db = engine.db
  return {
    getHabits: (date) =>
      engine.read<TodayHabits>(async () => {
        dateKey(date)
        const [habits, checks] = await Promise.all([
          db.habits.toArray(),
          db.habitChecks.where('localDate').equals(date).toArray(),
        ])
        const clock = engine.capture(),
          today = dateAt(clock.nowMs, clock.utcOffsetMinutes),
          weekday = new Date(`${date}T12:00:00Z`).getUTCDay() || 7
        const checkMap = new Map(checks.map((check) => [check.habitId, check]))
        const items = habits
          .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id))
          .map((habit) => ({
            habit,
            check: checkMap.get(habit.id) ?? null,
            scheduled:
              date === today &&
              habit.status === 'active' &&
              habit.scheduleEffectiveFrom <= date &&
              habit.scheduleWeekdays.includes(weekday),
          }))
          .filter((item) => item.scheduled || item.check)
        const scheduledCount = items.filter((item) => item.scheduled).length,
          scheduledCompletedCount = items.filter((item) => item.scheduled && item.check).length
        return {
          date,
          items,
          scheduledCount,
          scheduledCompletedCount,
          pendingCount: scheduledCount - scheduledCompletedCount,
          completedCount: checks.length,
        }
      }),
    getFinance: (date) =>
      engine.read<TodayFinance>(async () => {
        dateKey(date)
        const rows = await db.transactions.where('localDate').equals(date).toArray()
        return { date, ...totals(rows), transactionCount: rows.length }
      }),
    getRecords: (date, options) =>
      engine.read<TodayRecords>(async () => {
        dateKey(date)
        const limit =
          options?.limit === undefined ? 20 : integer(options.limit, 1, Number.MAX_SAFE_INTEGER)
        const [transactions, weights, activities, checks, focus, categories, habits] =
          await Promise.all([
            db.transactions.where('localDate').equals(date).toArray(),
            db.weightEntries.where('localDate').equals(date).toArray(),
            db.activitySessions.where('localDate').equals(date).toArray(),
            db.habitChecks.where('localDate').equals(date).toArray(),
            db.focusSessions.where('localDate').equals(date).toArray(),
            db.categories.toArray(),
            db.habits.toArray(),
          ])
        const categoryMap = new Map(categories.map((row) => [row.id, row])),
          habitMap = new Map(habits.map((row) => [row.id, row]))
        const records: RecordView[] = [
          ...transactions.map((entity) => ({
            kind: 'transaction' as const,
            entity,
            category: needCategory(categoryMap, entity.categoryId),
          })),
          ...weights.map((entity) => ({ kind: 'weight' as const, entity })),
          ...activities.map((entity) => ({
            kind: 'activity' as const,
            entity,
            category: needCategory(categoryMap, entity.categoryId),
          })),
          ...checks.map((entity) => {
            const habit = habitMap.get(entity.habitId)
            if (!habit) fail('ReadFailure')
            return { kind: 'habitCheck' as const, entity, habit }
          }),
          ...focus
            .filter((entity): entity is CompletedFocusSession => entity.status === 'completed')
            .map((entity) => ({
              kind: 'focus' as const,
              entity,
              ...(entity.categoryId
                ? { category: needCategory(categoryMap, entity.categoryId) }
                : {}),
            })),
        ]
        // Day-only records are deliberately not given invented timestamps to interleave with real instants.
        const dayOnly = records
          .filter((record) => record.entity.timePrecision === 'day')
          .sort(
            (a, b) =>
              a.entity.createdAt.localeCompare(b.entity.createdAt) ||
              a.entity.id.localeCompare(b.entity.id),
          )
        const eventTime = (record: RecordView) =>
          record.kind === 'focus'
            ? record.entity.startedAt
            : record.kind === 'habitCheck' && record.entity.timePrecision === 'instant'
              ? record.entity.completedAt
              : ''
        const timed = records
          .filter((record) => record.entity.timePrecision === 'instant')
          .sort(
            (a, b) =>
              eventTime(a).localeCompare(eventTime(b)) ||
              a.kind.localeCompare(b.kind) ||
              a.entity.id.localeCompare(b.entity.id),
          )
        const recent = [...records]
          .sort(
            (a, b) =>
              b.entity.createdAt.localeCompare(a.entity.createdAt) ||
              b.entity.id.localeCompare(a.entity.id),
          )
          .slice(0, 3)
        return {
          date,
          timed: timed.slice(-limit),
          dayOnly: dayOnly.slice(-limit),
          recent,
          totalCount: records.length,
          hasMore: timed.length > limit || dayOnly.length > limit,
        }
      }),
  }
}
export function getMonth(engine: Engine): LifeIndexServices['transactions']['getMonth'] {
  return (month) =>
    engine.read<MonthSummary>(async () => {
      requireValue(/^[1-9]\d{3}-(0[1-9]|1[0-2])$/.test(month), 'month')
      const from = dateKey(`${month}-01`),
        end = new Date(`${from}T00:00:00Z`)
      end.setUTCMonth(end.getUTCMonth() + 1)
      const range = rangeDates({ from, toExclusive: end.toISOString().slice(0, 10) })
      const [rows, categories] = await Promise.all([
        engine.db.transactions
          .where('localDate')
          .between(range.from, range.toExclusive, true, false)
          .toArray(),
        engine.db.categories.toArray(),
      ])
      const days = [...new Set(rows.map((row) => row.localDate))].sort().map((date) => {
        const entries = rows.filter((row) => row.localDate === date)
        return { date, ...totals(entries), count: entries.length }
      })
      const categoryMap = new Map(categories.map((row) => [row.id, row]))
      const groups = [...new Set(rows.map((row) => `${row.type}:${row.categoryId}`))].map((key) => {
        const entries = rows.filter((row) => `${row.type}:${row.categoryId}` === key),
          first = entries[0]
        if (!first) fail('ReadFailure')
        return {
          category: needCategory(categoryMap, first.categoryId),
          type: first.type,
          amountMinor: safeSum(entries.map((row) => row.amountMinor)),
          count: entries.length,
        }
      })
      return { month, range, ...totals(rows), days, categories: groups }
    })
}
export function getTrend(engine: Engine): LifeIndexServices['weights']['getTrend'] {
  return (range) =>
    engine.read<WeightTrend>(async () => {
      const bounds = rangeDates(range),
        clock = engine.capture(),
        today = dateAt(clock.nowMs, clock.utcOffsetMinutes)
      const [rows, latestRows, preference] = await Promise.all([
        engine.db.weightEntries
          .where('localDate')
          .between(bounds.from, bounds.toExclusive, true, false)
          .toArray(),
        engine.db.weightEntries.where('localDate').belowOrEqual(today).toArray(),
        engine.db.preferences.get('weightTarget'),
      ])
      const compare = (a: (typeof rows)[number], b: (typeof rows)[number]) =>
        a.localDate.localeCompare(b.localDate) ||
        a.createdAt.localeCompare(b.createdAt) ||
        a.id.localeCompare(b.id)
      const byDay = new Map<string, (typeof rows)[number]>()
      for (const row of rows.sort(compare)) byDay.set(row.localDate, row)
      return {
        points: [...byDay].map(([localDate, entry]) => ({ localDate, entry })),
        latest: latestRows.sort(compare).at(-1) ?? null,
        targetGrams: typeof preference?.value === 'number' ? preference.value : null,
      }
    })
}
export function getActivitySummary(engine: Engine): LifeIndexServices['activities']['getSummary'] {
  return (range) =>
    engine.read<ActivitySummary>(async () => {
      const bounds = rangeDates(range),
        rows = await engine.db.activitySessions
          .where('localDate')
          .between(bounds.from, bounds.toExclusive, true, false)
          .toArray()
      const byIntensity = Object.fromEntries(
        (['light', 'moderate', 'hard'] as const).map((intensity) => {
          const selected = rows.filter((row) => row.intensity === intensity)
          return [
            intensity,
            {
              count: selected.length,
              totalMinutes: safeSum(selected.map((row) => row.durationMinutes)),
            },
          ]
        }),
      ) as ActivitySummary['byIntensity']
      return {
        range: bounds,
        count: rows.length,
        totalMinutes: safeSum(rows.map((row) => row.durationMinutes)),
        byIntensity,
      }
    })
}
