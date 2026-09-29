import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useV4Services } from '@/app/v4/Services'
import { useDirtyGuard } from '@/app/v4/useDirtyGuard'
import { useV4Query } from '@/app/v4/useQuery'
import { useConfirm } from '@/app/v4/Confirmation'
import { useFlow } from '@/app/v4/Flow'
import { PageHeading, Feedback } from '@/shared/ui/v4/Elements'
import { errorMessage, monthRange } from '@/shared/v4/format'
import {
  consistentPair,
  calendarDays,
  habitSchedule,
  useTodayDate,
  validMonth,
} from '@/features/today/v4/data'
import { MonthPicker } from '@/features/finance/v4/MonthPicker'
import { logger } from '@/shared/logging/logger'
import { retainedIntent, type WriteIntent } from '@/features/today/v4/intent'

export function HabitDetail({ id }: { id: string }) {
  const services = useV4Services(),
    date = useTodayDate(),
    confirm = useConfirm(),
    flow = useFlow(),
    navigate = useNavigate(),
    [search, setSearch] = useSearchParams(),
    month = validMonth(search.get('month')) ? search.get('month')! : date.slice(0, 7),
    candidate = search.get('day'),
    selected =
      candidate && calendarDays(month).includes(candidate)
        ? candidate
        : month === date.slice(0, 7)
          ? date
          : `${month}-01`,
    range = monthRange(month)
  const query = useV4Query(
      useCallback(
        () =>
          consistentPair(
            () => services.habits.getById(id),
            () =>
              services.habits.getChecks(id, { from: range.from, toExclusive: range.toExclusive }),
          ),
        [services, id, range.from, range.toExclusive],
      ),
    ),
    data = query.snapshot?.data,
    habit = data?.left
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null),
    locked = useRef(false),
    intent = useRef<WriteIntent | null>(null),
    checkButton = useRef<HTMLButtonElement>(null),
    statusButton = useRef<HTMLButtonElement>(null)
  const checked = !!data?.right.some((item) => item.localDate === selected),
    edit = new URLSearchParams(search)
  edit.set('edit', '1')
  const guard = useDirtyGuard({ dirty: false, busy })
  const [focusRequest, setFocusRequest] = useState<{ action: 'check' | 'status' } | null>(null)
  // Restore focus only after React commits enabled controls; animation frames can precede that commit.
  useLayoutEffect(() => {
    if (!busy && focusRequest) {
      const button = focusRequest.action === 'check' ? checkButton.current : statusButton.current
      button?.focus({ preventScroll: true })
      logger.info('v4.habitdetail.focus.restored', { operation: focusRequest.action })
    }
  }, [busy, focusRequest])
  async function command(action: 'check' | 'status' | 'remove') {
    if (locked.current || !habit || !query.snapshot) return
    if (
      action === 'remove' &&
      !(await confirm({
        title: '删除这个习惯？',
        description: '习惯计划及它的所有完成记录会一并删除。暂停习惯可以保留这些记录。',
        confirmLabel: '确认删除',
        cancelLabel: '保留习惯',
      }))
    )
      return
    locked.current = true
    setBusy(true)
    setError(null)
    logger.info('v4.habitdetail.requested', { operation: action })
    try {
      const ctx = retainedIntent(
          intent,
          JSON.stringify({
            action,
            id: habit.id,
            revision: habit.revision,
            date: selected,
            desired: !checked,
          }),
          query.snapshot.stamp,
        ),
        ref = { id: habit.id, expectedEntityRevision: habit.revision }
      if (action === 'check')
        await services.habits.setCheck(
          {
            habitId: habit.id,
            expectedHabitRevision: habit.revision,
            date: selected,
            desired: !checked,
          },
          ctx,
        )
      if (action === 'status')
        await services.habits.setStatus(ref, habit.status === 'active' ? 'paused' : 'active', ctx)
      if (action === 'remove') {
        await services.habits.remove(ref, { deleteChecks: true }, ctx)
        // The completed delete must release its own busy navigation guard before leaving.
        guard.release()
        navigate('/health/habits')
        flow.notify('习惯及完成记录已删除。')
      }
      intent.current = null
      logger.info('v4.habitdetail.saved', { operation: action })
    } catch (error) {
      setError(errorMessage(error))
      logger.warn('v4.habitdetail.failed', { operation: action, failureClass: 'command' })
    } finally {
      locked.current = false
      setBusy(false)
      if (action !== 'remove') setFocusRequest({ action })
    }
  }
  return (
    <>
      <PageHeading
        title={habit?.name ?? '习惯详情'}
        description="查看计划与真实留下的完成记录。"
        action={
          <Link className="text-button" to="/health/habits">
            返回习惯
          </Link>
        }
      />
      {query.status === 'loading' ? (
        <Feedback kind="loading" title="正在读取习惯" />
      ) : query.status === 'failed' ? (
        <Feedback kind="error" title="习惯暂时读不到" onRetry={query.retry} />
      ) : !habit ? (
        <Feedback kind="empty" title="这个习惯已不存在">
          <Link to="/health/habits" className="button secondary">
            返回习惯列表
          </Link>
        </Feedback>
      ) : (
        <div className="v4-two-column">
          <section className="v4-habit-overview">
            <p className="v4-habit-plan-summary">
              {habit.status === 'paused' ? '已暂停' : habitSchedule(habit.scheduleWeekdays)}
            </p>
            <p className="v4-scope-note">
              计划从 {habit.scheduleEffectiveFrom} 起生效。暂停仅停止安排，不移除完成记录。
            </p>
            {habit.note && <p className="v4-note-text">{habit.note}</p>}
            <div className="v4-form-actions">
              <Link
                to={`?${edit.toString()}`}
                className="button secondary"
                data-focus-key="habit-edit"
              >
                编辑计划
              </Link>
              <button
                ref={statusButton}
                className="text-button"
                type="button"
                disabled={busy}
                onClick={() => void command('status')}
              >
                {habit.status === 'paused' ? '恢复习惯' : '暂停习惯'}
              </button>
            </div>
            <button
              className="text-button v4-danger-text"
              type="button"
              disabled={busy}
              onClick={() => void command('remove')}
            >
              删除习惯及完成记录
            </button>
          </section>
          <section>
            <MonthPicker
              month={month}
              onChange={(value) => setSearch({ month: value, day: `${value}-01` })}
            />
            <div className="v4-calendar" aria-label="习惯完成日历">
              {['一', '二', '三', '四', '五', '六', '日'].map((value) => (
                <span key={value} aria-hidden="true">
                  {value}
                </span>
              ))}
              {calendarDays(month).map((value, index) =>
                value ? (
                  <button
                    type="button"
                    key={value}
                    aria-label={`${value}${data?.right.some((item) => item.localDate === value) ? '，已完成' : ''}`}
                    aria-pressed={selected === value}
                    onClick={() => setSearch({ month, day: value })}
                  >
                    {Number(value.slice(8))}
                    {data?.right.some((item) => item.localDate === value) && (
                      <i aria-hidden="true" />
                    )}
                  </button>
                ) : (
                  <i key={`blank-${index}`} />
                ),
              )}
            </div>
            <div className="v4-selected-day">
              <h2>{selected}</h2>
              <p>{checked ? '当天有完成记录。' : '没有完成记录；不按当前计划推算历史缺勤。'}</p>
              <button
                className="button"
                type="button"
                ref={checkButton}
                disabled={busy || selected > date}
                onClick={() => void command('check')}
              >
                {busy ? '正在保存…' : checked ? '撤销当天完成' : '补记当天完成'}
              </button>
              {selected > date && <p className="v4-scope-note">不能记录尚未发生的完成。</p>}
            </div>
          </section>
          {error && (
            <p className="field-error" role="alert">
              {error} 原记录已保留。
            </p>
          )}
        </div>
      )}
    </>
  )
}
