import { useCallback, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

import { useAppServices } from '@/app/AppServicesContext'
import { FocusRepository } from '@/data/repositories/FocusRepository'
import { HabitRepository } from '@/data/repositories/HabitRepository'
import { TransactionRepository } from '@/data/repositories/TransactionRepository'
import { summarizeTransactions } from '@/features/finance/financeDomain'
import { formatFocusDuration, summarizeFocus } from '@/features/focus/focusDomain'
import { useFocusCompletion } from '@/features/focus/useFocusCompletion'
import { formatMoney } from '@/shared/domain/money'
import type { Habit, HabitRecord } from '@/shared/domain/types'
import { useCurrentLocalDate } from '@/shared/hooks/useCurrentLocalDate'
import { useLiveQueryState } from '@/shared/hooks/useLiveQueryState'
import { Icon } from '@/shared/ui/Icon'
import { CategoryIcon } from '@/shared/ui/CategoryIcon'
import { useDirtyForm } from '@/pwa/useDirtyForm'
import { logger } from '@/shared/logging/logger'

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
  const [habitBusy, setHabitBusy] = useState(false)
  const habitLock = useRef(false)
  useDirtyForm(false, habitBusy)

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

  // Today and Focus share recovery semantics for sessions that expired while iOS suspended the app.
  const completion = useFocusCompletion(
    focus,
    focusState.status === 'ready' ? focusState.data.active : undefined,
  )

  async function toggleHabit(habit: Habit, record: HabitRecord | undefined) {
    // Today uses the same single-write semantics as Health; a double tap must not undo itself.
    if (habitLock.current) return
    habitLock.current = true
    setHabitBusy(true)
    setHabitError('')
    logger.info('today.habit.started', { operation: record ? 'undo' : 'checkin' })
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
      logger.info('today.habit.saved', { operation: record ? 'undo' : 'checkin' })
    } catch {
      logger.warn('today.habit.failed', {
        operation: record ? 'undo' : 'checkin',
        failureClass: 'Write',
      })
      setHabitError('签到状态未能更新，请重试。')
    } finally {
      habitLock.current = false
      setHabitBusy(false)
    }
  }

  return (
    <section className="page today-page" aria-labelledby="today-title">
      <h1 id="today-title">今天</h1>
      <p className="today-date">{formatToday(now)}</p>
      <section className="daily-intro" aria-label="开始今天的记录">
        <h2>从一笔记录开始</h2>
        <p>把花费、专注和日常，留在今天。</p>
        <Link className="button-primary today-record-action" to="/finance/new">
          <Icon name="add" />
          记一笔
        </Link>
      </section>
      <Link
        to="/focus"
        className="today-focus-entry"
        aria-label={
          focusState.status === 'ready' && focusState.data.active ? '继续本次专注' : '开始专注'
        }
      >
        <span className="category-glyph tone-violet">
          <CategoryIcon name="timer" />
        </span>
        <span>
          <strong>
            {focusState.status === 'ready' && focusState.data.active
              ? '继续本次专注'
              : '给自己一段专注时间'}
          </strong>
          <small>
            {focusState.status === 'failed'
              ? '状态暂时无法读取，打开后重试'
              : focusState.status === 'loading'
                ? '正在读取本地计时状态…'
                : focusState.data.active
                  ? completion.error
                    ? '本次专注待保存，点击返回'
                    : '计时仍在进行，点击返回'
                  : '25 分钟，专心做一件事'}
          </small>
        </span>
        <span aria-hidden="true">›</span>
      </Link>
      {completion.error && (
        <div role="alert" className="form-error">
          <p>{completion.error}</p>
          <button
            className="button-primary"
            disabled={completion.busy}
            onClick={() => void completion.retry()}
          >
            重试保存专注
          </button>
        </div>
      )}
      {completion.busy && <p role="status">正在保存本次专注…</p>}

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
                    disabled={habitBusy}
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
            <TodayFocus completed={focusState.data.completed} />
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
        <span>支出</span>
        <strong>{records.length ? formatMoney(summary.expenseMinor) : '尚无记录'}</strong>
      </p>
      <small>{records.length} 笔收支</small>
    </div>
  )
}

function TodayFocus({
  completed,
}: {
  completed: Awaited<ReturnType<FocusRepository['listCompleted']>>
}) {
  const summary = summarizeFocus(completed)
  return (
    <div className="today-card-values">
      <p>
        <span>已完成</span>
        <strong>{formatFocusDuration(summary.durationSeconds)}</strong>
      </p>
      <small>{summary.count} 次</small>
    </div>
  )
}
