import { useLayoutEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useV4Services } from '@/app/v4/Services'
import { useDirtyGuard } from '@/app/v4/useDirtyGuard'
import type { Habit, Stamp } from '@/core/types'
import { errorMessage } from '@/shared/v4/format'
import { logger } from '@/shared/logging/logger'
import { retainedIntent, type WriteIntent } from '@/features/today/v4/intent'
import { habitSchedule, weekday } from '@/features/today/v4/data'

interface Props {
  habit: Habit
  completed: boolean
  date: string
  stamp: Stamp
  showPlan?: boolean
}
export function HabitAction({ habit, completed, date, stamp, showPlan = false }: Props) {
  const services = useV4Services(),
    locked = useRef(false),
    intent = useRef<WriteIntent | null>(null),
    button = useRef<HTMLButtonElement>(null)
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null),
    [focusRequest, setFocusRequest] = useState(0)
  useDirtyGuard({ dirty: false, busy })
  useLayoutEffect(() => {
    if (!focusRequest || busy) return
    const element = button.current
    if (!element) return
    // React may commit disabled=false after an animation frame. Restore only after the enabled DOM is committed.
    element.focus({ preventScroll: true })
    const bounds = element.getBoundingClientRect()
    const dock = document.querySelector('[data-v4-dock]')
    const visibleBottom = dock?.getClientRects().length
      ? dock.getBoundingClientRect().top
      : innerHeight
    if (bounds.top < 0 || bounds.bottom > visibleBottom)
      element.scrollIntoView({ block: 'center', behavior: 'instant' })
    logger.info('v4.habit.focusrestored', { operation: 'respond' })
  }, [busy, focusRequest])
  async function respond() {
    if (locked.current) return
    locked.current = true
    setBusy(true)
    setError(null)
    logger.info('v4.habit.requested', { operation: completed ? 'uncomplete' : 'complete' })
    try {
      // desired is captured once: retries must not invert whichever state a live query later publishes.
      await services.habits.setCheck(
        { habitId: habit.id, expectedHabitRevision: habit.revision, date, desired: !completed },
        retainedIntent(
          intent,
          JSON.stringify({ id: habit.id, revision: habit.revision, date, desired: !completed }),
          stamp,
        ),
      )
      intent.current = null
      logger.info('v4.habit.responded', { toState: completed ? 'pending' : 'completed' })
    } catch (error) {
      setError(errorMessage(error))
      logger.warn('v4.habit.failed', { failureClass: 'command' })
    } finally {
      locked.current = false
      setBusy(false)
      setFocusRequest((request) => request + 1)
    }
  }
  return (
    <li className="v4-habit-item" data-completed={completed}>
      <div className="v4-habit-row">
        <button
          ref={button}
          type="button"
          className="v4-habit-surface"
          aria-pressed={completed}
          aria-label={`${completed ? '撤销完成' : '完成'}${habit.name}`}
          aria-busy={busy}
          disabled={busy}
          onClick={() => void respond()}
          data-focus-key={`habit-action-${habit.id}`}
        >
          <span>
            <strong>{habit.name}</strong>
            {showPlan && (
              <small className="v4-habit-plan">
                {habit.status === 'paused'
                  ? '已暂停 · 可手动记录'
                  : `${habitSchedule(habit.scheduleWeekdays)}${habit.scheduleWeekdays.includes(weekday(date)) ? '' : ' · 今天非计划日'}`}
              </small>
            )}
            <small>
              {busy ? '正在记下…' : completed ? '今天已记下 · 点按撤销' : '今天做过了？点按记下'}
            </small>
          </span>
          <span className="v4-habit-state" aria-hidden="true">
            {completed ? '已完成' : '记下'}
          </span>
        </button>
        <Link
          className="v4-habit-detail"
          to={`/health/habits/${habit.id}`}
          aria-label={`查看${habit.name}详情`}
          data-focus-key={`habit-details-${habit.id}`}
        >
          详情
        </Link>
      </div>
      {error && (
        <p className="v4-action-error" role="alert">
          {error} 原完成状态已保留。
        </p>
      )}
    </li>
  )
}
