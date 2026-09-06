import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { useAppServices } from '@/app/AppServicesContext'
import { FocusRepository } from '@/data/repositories/FocusRepository'
import { HabitRepository } from '@/data/repositories/HabitRepository'
import { TransactionRepository } from '@/data/repositories/TransactionRepository'
import { summarizeTransactions } from '@/features/finance/financeDomain'
import { formatFocusDuration, summarizeFocus } from '@/features/focus/focusDomain'
import { formatMoney } from '@/shared/domain/money'
import type { Habit, HabitRecord } from '@/shared/domain/types'
import { useCurrentLocalDate } from '@/shared/hooks/useCurrentLocalDate'
import { useLiveQueryState } from '@/shared/hooks/useLiveQueryState'

function formatToday(date: Date): string {
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  }).format(date)
}

export function TodayPage() {
  const { database } = useAppServices()
  const transactions = useMemo(() => new TransactionRepository(database), [database])
  const habits = useMemo(() => new HabitRepository(database), [database])
  const focus = useMemo(() => new FocusRepository(database), [database])
  const now = new Date()
  const today = useCurrentLocalDate()
  const [habitError, setHabitError] = useState('')

  const financeQuery = useCallback(
    () => transactions.list({ from: today, to: today }),
    [today, transactions],
  )
  const habitQuery = useCallback(async () => {
    const scheduled = await habits.listScheduled(today)
    const records = await Promise.all(
      scheduled.map(async (habit) => {
        const record = (await habits.listRecords(habit.id, { from: today, to: today }))[0]
        return [habit.id, record] as const
      }),
    )
    return { scheduled, records: new Map(records) }
  }, [habits, today])
  const focusQuery = useCallback(async () => {
    const [active, completed] = await Promise.all([
      focus.getActive(),
      focus.listCompleted({ from: today, to: today }),
    ])
    return { active, completed }
  }, [focus, today])

  const financeState = useLiveQueryState(financeQuery)
  const habitState = useLiveQueryState(habitQuery)
  const focusState = useLiveQueryState(focusQuery)

  useEffect(() => {
    // Reconcile once on entry so an iOS-suspended timer becomes an accurate Today record.
    void focus.reconcileActive(new Date().toISOString())
  }, [focus])

  async function toggleHabit(habit: Habit, record: HabitRecord | undefined) {
    setHabitError('')
    try {
      if (record) await habits.undoCheckIn(habit.id, today)
      else {
        const capturedAt = new Date()
        await habits.checkIn({
          habitId: habit.id,
          localDate: today,
          completedAt: capturedAt.toISOString(),
          timezoneOffsetMinutes: capturedAt.getTimezoneOffset(),
        })
      }
    } catch {
      setHabitError('签到状态未能更新，请重试。')
    }
  }

  return (
    <section className="page today-page" aria-labelledby="today-title">
      <p className="eyebrow">{formatToday(now)}</p>
      <h1 id="today-title">今天</h1>
      <p className="page-intro">先完成眼前的小事，记录会在本机安静累积。</p>

      <section className="content-section" aria-labelledby="today-habit-title">
        <div className="section-heading">
          <h2 id="today-habit-title">健康习惯</h2>
          {habitState.status === 'ready' ? (
            <span>
              {
                habitState.data.scheduled.filter((habit) => habitState.data.records.get(habit.id))
                  .length
              }
              /{habitState.data.scheduled.length}
            </span>
          ) : null}
        </div>
        {habitError ? (
          <p className="form-error" role="alert">
            {habitError}
          </p>
        ) : null}
        {habitState.status === 'loading' ? <p className="state-message">正在读取习惯…</p> : null}
        {habitState.status === 'failed' ? (
          <p className="form-error" role="alert">
            习惯暂时无法读取；其他今日数据仍可使用。
          </p>
        ) : null}
        {habitState.status === 'ready' && habitState.data.scheduled.length === 0 ? (
          <p className="empty-state">今天没有计划中的习惯。可以从“健康”创建一个。</p>
        ) : null}
        {habitState.status === 'ready' && habitState.data.scheduled.length > 0 ? (
          <ul className="habit-check-list">
            {habitState.data.scheduled.map((habit) => {
              const record = habitState.data.records.get(habit.id)
              return (
                <li key={habit.id}>
                  <button
                    type="button"
                    aria-pressed={Boolean(record)}
                    onClick={() => void toggleHabit(habit, record)}
                  >
                    <span className={`habit-marker marker-${habit.color}`} aria-hidden="true">
                      {record ? '✓' : '○'}
                    </span>
                    <span>{habit.name}</span>
                    <strong>{record ? '已完成，点按撤销' : '点按完成'}</strong>
                  </button>
                </li>
              )
            })}
          </ul>
        ) : null}
      </section>

      <div className="quick-actions today-primary-actions" aria-label="快捷操作">
        <Link to="/finance">记一笔</Link>
        <Link to="/focus">开始专注</Link>
      </div>

      <div className="today-summary-grid">
        <section aria-labelledby="today-finance-title">
          <div className="section-heading">
            <h2 id="today-finance-title">今日账目</h2>
            <Link to="/finance">查看</Link>
          </div>
          {financeState.status === 'loading' ? <p className="state-message">正在读取…</p> : null}
          {financeState.status === 'failed' ? (
            <p className="form-error" role="alert">
              账目读取失败，不会显示为 0。
            </p>
          ) : null}
          {financeState.status === 'ready' ? <TodayFinance records={financeState.data} /> : null}
        </section>

        <section aria-labelledby="today-focus-title">
          <div className="section-heading">
            <h2 id="today-focus-title">今日专注</h2>
            <Link to="/focus">查看</Link>
          </div>
          {focusState.status === 'loading' ? <p className="state-message">正在读取…</p> : null}
          {focusState.status === 'failed' ? (
            <p className="form-error" role="alert">
              专注读取失败，不会显示为 0。
            </p>
          ) : null}
          {focusState.status === 'ready' ? (
            <TodayFocus active={focusState.data.active} completed={focusState.data.completed} />
          ) : null}
        </section>
      </div>
    </section>
  )
}

function TodayFinance({
  records,
}: {
  records: Awaited<ReturnType<TransactionRepository['list']>>
}) {
  const summary = summarizeTransactions(records)
  return (
    <div className="today-card-values">
      <p>
        <span>收入</span>
        <strong>{formatMoney(summary.incomeMinor)}</strong>
      </p>
      <p>
        <span>支出</span>
        <strong>{formatMoney(summary.expenseMinor)}</strong>
      </p>
      <p>
        <span>结余</span>
        <strong>{formatMoney(summary.balanceMinor)}</strong>
      </p>
    </div>
  )
}

function TodayFocus({
  active,
  completed,
}: {
  active?: Awaited<ReturnType<FocusRepository['getActive']>>
  completed: Awaited<ReturnType<FocusRepository['listCompleted']>>
}) {
  const summary = summarizeFocus(completed)
  return (
    <div className="today-card-values">
      <p>
        <span>已完成</span>
        <strong>{formatFocusDuration(summary.durationSeconds)}</strong>
      </p>
      <p>
        <span>次数</span>
        <strong>{summary.count}</strong>
      </p>
      {active ? (
        <p className="active-inline">
          <span>进行中</span>
          <strong>{active.title}</strong>
        </p>
      ) : (
        <p>
          <span>进行中</span>
          <strong>无</strong>
        </p>
      )}
    </div>
  )
}
