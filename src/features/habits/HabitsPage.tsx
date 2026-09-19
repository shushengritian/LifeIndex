import { useCallback, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'

import { useAppServices } from '@/app/AppServicesContext'
import { HabitRepository, type SaveHabitCommand } from '@/data/repositories/HabitRepository'
import {
  calculateHabitStatistics,
  habitHeatmap,
  isHabitVisibleForToday,
} from '@/features/habits/habitDomain'
import { parseLocalDateKey, toLocalDateKey } from '@/shared/domain/date'
import type { Habit, HabitRecord, HabitSchedule } from '@/shared/domain/types'
import { useLiveQueryState } from '@/shared/hooks/useLiveQueryState'
import { logger } from '@/shared/logging/logger'
import { useDirtyForm } from '@/pwa/useDirtyForm'
import { Sheet } from '@/shared/ui/Sheet'
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog'
import { CategoryIcon } from '@/shared/ui/CategoryIcon'
import { Icon } from '@/shared/ui/Icon'

const weekdayLabels = ['日', '一', '二', '三', '四', '五', '六'] as const

function HabitGlyph({ name }: { name: string }) {
  // Habit keys predate the finance icon library; preserve their meaning without rewriting records.
  if (name === 'check') return <Icon name="check" />
  if (name === 'moon')
    return (
      <svg
        width="23"
        height="23"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M20 15.5A8.5 8.5 0 0 1 8.5 4 8.5 8.5 0 1 0 20 15.5Z" />
      </svg>
    )
  return <CategoryIcon name={name === 'water' ? 'drop' : name === 'walk' ? 'activity' : name} />
}
const colorOptions = [
  { value: 'sage', label: '鼠尾草绿' },
  { value: 'blue', label: '雾蓝' },
  { value: 'amber', label: '琥珀' },
  { value: 'rose', label: '柔红' },
  { value: 'violet', label: '浅紫' },
  { value: 'slate', label: '岩灰' },
]

interface HabitFormProps {
  habit?: Habit
  onCancel: () => void
  onSave: (command: SaveHabitCommand) => Promise<void>
}

function HabitForm({ habit, onCancel, onSave }: HabitFormProps) {
  const [initialValues] = useState(() => ({
    name: habit?.name ?? '',
    icon: habit?.icon ?? 'check',
    color: habit?.color ?? 'sage',
    scheduleType: habit?.schedule.type ?? ('daily' as HabitSchedule['type']),
    weekdays: habit?.schedule.type === 'weekdays' ? habit.schedule.weekdays : [1, 2, 3, 4, 5],
    startLocalDate: habit?.startLocalDate ?? toLocalDateKey(new Date()),
    note: habit?.note ?? '',
  }))
  const [name, setName] = useState(initialValues.name)
  const [icon, setIcon] = useState(initialValues.icon)
  const [color, setColor] = useState(initialValues.color)
  const [scheduleType, setScheduleType] = useState<HabitSchedule['type']>(
    initialValues.scheduleType,
  )
  const [weekdays, setWeekdays] = useState<number[]>(initialValues.weekdays)
  const [startLocalDate, setStartLocalDate] = useState(initialValues.startLocalDate)
  const [note, setNote] = useState(initialValues.note)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const writeLock = useRef(false)
  const [discard, setDiscard] = useState(false)
  const dirty =
    name !== initialValues.name ||
    icon !== initialValues.icon ||
    color !== initialValues.color ||
    scheduleType !== initialValues.scheduleType ||
    weekdays.join(',') !== initialValues.weekdays.join(',') ||
    startLocalDate !== initialValues.startLocalDate ||
    note !== initialValues.note

  // Keep write protection even when an unchanged existing habit is submitted.
  useDirtyForm(dirty, saving)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (writeLock.current) return
    const schedule: HabitSchedule =
      scheduleType === 'daily'
        ? { type: 'daily' }
        : { type: 'weekdays', weekdays: [...weekdays].sort((left, right) => left - right) }
    if (
      !name.trim() ||
      !parseLocalDateKey(startLocalDate) ||
      (schedule.type === 'weekdays' && schedule.weekdays.length === 0)
    ) {
      logger.warn('habit.form.validationfailed', {
        operation: habit ? 'update' : 'create',
        failureClass: 'Validation',
      })
      setError('请填写习惯名称、有效开始日期，并至少选择一个计划日。')
      return
    }

    setError('')
    writeLock.current = true
    setSaving(true)
    logger.info('habit.form.savestarted', { operation: habit ? 'update' : 'create' })
    try {
      await onSave({
        name: name.trim(),
        icon,
        color,
        schedule,
        startLocalDate,
        ...(note.trim() ? { note: note.trim() } : {}),
      })
      logger.info('habit.form.saved', { operation: habit ? 'update' : 'create' })
    } catch {
      logger.warn('habit.form.savefailed', {
        operation: habit ? 'update' : 'create',
        failureClass: 'Write',
      })
      setError('未能保存，本次输入仍保留。请重试。')
    } finally {
      writeLock.current = false
      setSaving(false)
    }
  }

  return (
    <form
      className="sheet-form"
      onSubmit={(event) => void submit(event)}
      aria-label={habit ? '编辑习惯' : '新增习惯'}
    >
      {/* One disabled fieldset covers every control while the single write settles. */}
      <fieldset className="habit-form-fields" disabled={saving}>
        <label>
          习惯名称
          <input
            autoFocus
            value={name}
            maxLength={60}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <div className="form-grid-two">
          <label>
            标记
            <select value={icon} onChange={(event) => setIcon(event.target.value)}>
              <option value="check">完成</option>
              <option value="book">阅读</option>
              <option value="water">饮水</option>
              <option value="walk">运动</option>
              <option value="moon">睡眠</option>
            </select>
          </label>
          <label>
            颜色
            <select value={color} onChange={(event) => setColor(event.target.value)}>
              {colorOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <fieldset className="form-fieldset">
          <legend>计划</legend>
          <div className="segmented-control">
            <button
              type="button"
              className={scheduleType === 'daily' ? 'segment-active' : ''}
              aria-pressed={scheduleType === 'daily'}
              onClick={() => setScheduleType('daily')}
            >
              每天
            </button>
            <button
              type="button"
              className={scheduleType === 'weekdays' ? 'segment-active' : ''}
              aria-pressed={scheduleType === 'weekdays'}
              onClick={() => setScheduleType('weekdays')}
            >
              按星期
            </button>
          </div>
          {scheduleType === 'weekdays' ? (
            <div className="weekday-picker" aria-label="选择计划日">
              {weekdayLabels.map((label, day) => (
                <label key={label}>
                  <input
                    type="checkbox"
                    checked={weekdays.includes(day)}
                    onChange={() =>
                      setWeekdays((current) =>
                        current.includes(day)
                          ? current.filter((value) => value !== day)
                          : [...current, day],
                      )
                    }
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          ) : null}
        </fieldset>
        <label>
          开始日期
          <input
            type="date"
            value={startLocalDate}
            onChange={(event) => setStartLocalDate(event.target.value)}
          />
        </label>
        <label>
          备注（可选）
          <input value={note} maxLength={280} onChange={(event) => setNote(event.target.value)} />
        </label>
        {error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : null}
        <div className="form-actions">
          <button
            type="button"
            className="button-secondary"
            disabled={saving}
            onClick={() => {
              if (writeLock.current) return
              if (dirty) {
                setDiscard(true)
                logger.info('habit.form.discardrequested', { operation: 'cancel' })
              } else onCancel()
            }}
          >
            取消
          </button>
          <button type="submit" className="button-primary" disabled={saving}>
            {saving ? '保存中…' : '保存'}
          </button>
        </div>
      </fieldset>
      {discard && (
        <ConfirmDialog
          title="放弃习惯修改？"
          description="未保存的输入将丢失，已有打卡记录不会改变。"
          confirmLabel="放弃修改"
          cancelLabel="继续填写"
          onCancel={() => setDiscard(false)}
          onConfirm={onCancel}
        />
      )}
    </form>
  )
}

export function HabitsPage({
  embedded = false,
  createRequest = 0,
}: {
  embedded?: boolean
  createRequest?: number
}) {
  const { database } = useAppServices()
  const repository = useMemo(() => new HabitRepository(database), [database])
  const today = toLocalDateKey(new Date())
  // A keyed Health workspace can request the existing create flow on its initial render.
  const [formOpen, setFormOpen] = useState(createRequest > 0)
  const [editing, setEditing] = useState<Habit | undefined>()
  const [selectedHabitId, setSelectedHabitId] = useState<string>()
  const [pageError, setPageError] = useState('')
  const [busy, setBusy] = useState(false)
  const operationLock = useRef(false)
  const [statusChange, setStatusChange] = useState<Habit>()
  useDirtyForm(false, busy)

  const query = useCallback(async () => {
    const habits = await repository.listAll()
    const records = await Promise.all(
      habits.map(
        async (habit) =>
          [
            habit.id,
            await repository.listRecords(habit.id, { from: habit.startLocalDate, to: today }),
          ] as const,
      ),
    )
    return { habits, records: new Map(records) }
  }, [repository, today])
  const state = useLiveQueryState(query)

  async function save(command: SaveHabitCommand) {
    if (editing) await repository.update(editing.id, command)
    else await repository.create(command)
    // Return to the list after saving; statistics open only on an explicit request.
    setSelectedHabitId(undefined)
    setEditing(undefined)
    setFormOpen(false)
  }

  async function toggleCheckIn(habit: Habit, record: HabitRecord | undefined) {
    // Serialize tap-driven mutations; double taps must not immediately undo a new check-in.
    if (operationLock.current) return
    operationLock.current = true
    setBusy(true)
    setPageError('')
    logger.info('habit.checkin.started', { operation: record ? 'undo' : 'checkin' })
    try {
      if (record) await repository.undoCheckIn(habit.id, today)
      else {
        const now = new Date()
        await repository.checkIn({
          habitId: habit.id,
          localDate: today,
          completedAt: now.toISOString(),
          timezoneOffsetMinutes: now.getTimezoneOffset(),
        })
      }
      logger.info('habit.checkin.saved', { operation: record ? 'undo' : 'checkin' })
    } catch {
      logger.warn('habit.checkin.failed', {
        operation: record ? 'undo' : 'checkin',
        failureClass: 'Write',
      })
      setPageError('签到状态未能更新，请重试。')
    } finally {
      operationLock.current = false
      setBusy(false)
    }
  }

  async function toggleStatus(habit: Habit) {
    if (operationLock.current) return
    operationLock.current = true
    setBusy(true)
    setPageError('')
    logger.info('habit.status.started', { operation: 'setStatus' })
    try {
      await repository.setStatus(habit.id, habit.status === 'active' ? 'paused' : 'active')
      setStatusChange(undefined)
      logger.info('habit.status.saved', { operation: 'setStatus' })
    } catch {
      logger.warn('habit.status.failed', { operation: 'setStatus', failureClass: 'Write' })
      setPageError('习惯状态未能更新，历史记录没有被删除。')
    } finally {
      operationLock.current = false
      setBusy(false)
    }
  }

  const isFormOpen = formOpen || editing !== undefined

  return (
    <section
      className={embedded ? 'health-habit-workspace' : 'page'}
      aria-labelledby={embedded ? undefined : 'habits-title'}
    >
      {!embedded ? (
        <>
          <Link className="button-secondary" to="/health">
            返回健康
          </Link>
          <div className="page-heading-row">
            <div>
              <h1 id="habits-title">习惯</h1>
            </div>
            {!isFormOpen ? (
              <button
                className="button-primary compact round-action"
                aria-label="新增"
                type="button"
                disabled={busy}
                onClick={() => setFormOpen(true)}
              >
                <Icon name="add" />
              </button>
            ) : null}
          </div>
        </>
      ) : null}

      {isFormOpen ? (
        <Sheet title={editing ? '编辑习惯' : '新增习惯'}>
          <HabitForm
            key={editing?.id ?? 'new'}
            {...(editing ? { habit: editing } : {})}
            onCancel={() => {
              setEditing(undefined)
              setFormOpen(false)
            }}
            onSave={save}
          />
        </Sheet>
      ) : null}

      {pageError && !statusChange ? (
        <p className="form-error" role="alert">
          {pageError}
        </p>
      ) : null}
      {state.status === 'loading' ? <p className="state-message">正在读取本地习惯…</p> : null}
      {state.status === 'failed' ? (
        <p className="form-error" role="alert">
          习惯暂时无法读取，数据没有被清空。
        </p>
      ) : null}
      {state.status === 'ready' ? (
        <HabitContent
          busy={busy}
          embedded={embedded}
          habits={state.data.habits}
          records={state.data.records}
          today={today}
          {...(selectedHabitId ? { selectedHabitId } : {})}
          onSelect={setSelectedHabitId}
          onCheckIn={(habit, record) => void toggleCheckIn(habit, record)}
          onEdit={(habit) => {
            setSelectedHabitId(undefined)
            setFormOpen(false)
            setEditing(habit)
          }}
          onToggleStatus={(habit) => {
            setPageError('')
            setStatusChange(habit)
            logger.info('habit.status.requested', { operation: 'setStatus' })
          }}
        />
      ) : null}
      {statusChange && (
        <ConfirmDialog
          title={statusChange.status === 'active' ? '暂停习惯？' : '恢复习惯？'}
          description="只调整后续参与状态，历史打卡不会被删除。"
          confirmLabel={statusChange.status === 'active' ? '确认暂停' : '确认恢复'}
          busy={busy}
          error={pageError}
          onCancel={() => {
            if (!operationLock.current) {
              setStatusChange(undefined)
              setPageError('')
            }
          }}
          onConfirm={() => void toggleStatus(statusChange)}
        />
      )}
    </section>
  )
}

interface HabitContentProps {
  busy: boolean
  embedded: boolean
  habits: Habit[]
  records: Map<string, HabitRecord[]>
  today: string
  selectedHabitId?: string
  onSelect: (id: string | undefined) => void
  onCheckIn: (habit: Habit, record: HabitRecord | undefined) => void
  onEdit: (habit: Habit) => void
  onToggleStatus: (habit: Habit) => void
}

function HabitContent({
  busy,
  embedded,
  habits,
  records,
  today,
  selectedHabitId,
  onSelect,
  onCheckIn,
  onEdit,
  onToggleStatus,
}: HabitContentProps) {
  const scheduled = habits.filter((habit) => isHabitVisibleForToday(habit, today))
  const selected = habits.find(({ id }) => id === selectedHabitId)
  const selectedRecords = selected ? (records.get(selected.id) ?? []) : []

  return (
    <>
      {embedded && (
        <section className="content-section" aria-labelledby="today-habits-title">
          <div className="section-heading">
            <h2 id="today-habits-title">今天</h2>
            <span>
              {
                scheduled.filter((habit) =>
                  (records.get(habit.id) ?? []).some(({ localDate }) => localDate === today),
                ).length
              }
              /{scheduled.length}
            </span>
          </div>
          {scheduled.length === 0 ? (
            <p className="empty-state">今天没有计划中的习惯。你可以新增一个，或安静地继续今天。</p>
          ) : (
            <ul className="habit-check-list">
              {scheduled.map((habit) => {
                const record = (records.get(habit.id) ?? []).find(
                  ({ localDate }) => localDate === today,
                )
                return (
                  <li key={habit.id}>
                    <button
                      type="button"
                      aria-pressed={Boolean(record)}
                      disabled={busy}
                      onClick={() => onCheckIn(habit, record)}
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
          )}
        </section>
      )}

      {embedded ? (
        <Link className="button-secondary" to="/health/habits">
          管理习惯与统计
        </Link>
      ) : (
        <section className="content-section" aria-labelledby="all-habits-title">
          <h2 id="all-habits-title">全部习惯</h2>
          {habits.length === 0 ? (
            <p className="empty-state">还没有习惯。名称和计划都可以稍后修改。</p>
          ) : (
            <ul className="habit-management-list">
              {habits.map((habit) => (
                <li key={habit.id}>
                  <button
                    type="button"
                    className="habit-management-open"
                    disabled={busy}
                    aria-label={`查看 ${habit.name} 详情`}
                    onClick={() => {
                      logger.info('habit.detail.opened', { operation: 'open' })
                      onSelect(habit.id)
                    }}
                  >
                    <span className={`category-glyph tone-${habit.color}`}>
                      <HabitGlyph name={habit.icon} />
                    </span>
                    <span className="habit-management-copy">
                      <strong>{habit.name}</strong>
                      <small>
                        {habit.status === 'paused' ? '已暂停 · ' : ''}
                        {habit.schedule.type === 'daily'
                          ? '每天'
                          : `星期${habit.schedule.weekdays.map((day) => weekdayLabels[day]).join('、')}`}
                      </small>
                    </span>
                    <Icon name="next" size={18} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {selected ? (
        <Sheet title="习惯统计">
          <div className="habit-detail-actions">
            <button
              type="button"
              className="button-secondary"
              disabled={busy}
              onClick={() => onEdit(selected)}
            >
              <Icon name="settings" size={18} />
              编辑
            </button>
            <button
              type="button"
              className="button-secondary"
              disabled={busy}
              onClick={() => onToggleStatus(selected)}
            >
              {selected.status === 'active' ? '暂停' : '恢复'}
            </button>
          </div>
          <HabitProgress habit={selected} records={selectedRecords} today={today} />
          {isHabitVisibleForToday(selected, today) && (
            <button
              type="button"
              className="button-primary"
              disabled={busy}
              aria-pressed={selectedRecords.some(({ localDate }) => localDate === today)}
              onClick={() =>
                onCheckIn(
                  selected,
                  selectedRecords.find(({ localDate }) => localDate === today),
                )
              }
            >
              {selected.name} ·{' '}
              {selectedRecords.some(({ localDate }) => localDate === today)
                ? '已完成，点按撤销'
                : '点按完成'}
            </button>
          )}
          <button
            type="button"
            className="button-secondary"
            disabled={busy}
            onClick={() => onSelect(undefined)}
          >
            关闭统计
          </button>
        </Sheet>
      ) : null}
    </>
  )
}

function HabitProgress({
  habit,
  records,
  today,
}: {
  habit: Habit
  records: HabitRecord[]
  today: string
}) {
  const statistics = calculateHabitStatistics(habit, records, today)
  const heatmap = habitHeatmap(habit, records, today)
  const [selectedDate, setSelectedDate] = useState(today)
  const heatmapViewportRef = useCallback((element: HTMLDivElement | null) => {
    if (!element) return
    // Start at the current week once; later date inspection must not reset the user's scroll.
    element.scrollLeft = element.scrollWidth
    logger.info('habit.heatmap.positioned', { operation: 'open', reason: 'current-week' })
  }, [])
  const selectedDay = heatmap.find(({ localDate }) => localDate === selectedDate)
  function dayStatus(day: (typeof heatmap)[number]) {
    return day.future
      ? '未来日期'
      : day.completed
        ? '已完成'
        : day.scheduled
          ? '未完成'
          : '非计划日'
  }
  const recentRecords = [...records]
    .sort((left, right) => right.completedAt.localeCompare(left.completedAt))
    .slice(0, 5)

  return (
    <section className="content-section progress-panel" aria-labelledby="habit-progress-title">
      <h2 id="habit-progress-title">{habit.name} · 统计</h2>
      <div className="summary-grid habit-stats">
        <article>
          <span>当前连续</span>
          <strong>{statistics.currentStreak} 天</strong>
        </article>
        <article>
          <span>最长连续</span>
          <strong>{statistics.longestStreak} 天</strong>
        </article>
        <article>
          <span>本月完成</span>
          <strong>{Math.round(statistics.monthRate * 100)}%</strong>
        </article>
        <article>
          <span>本月次数</span>
          <strong>
            {statistics.monthCompleted}/{statistics.monthScheduled}
          </strong>
        </article>
        <article>
          <span>全部完成</span>
          <strong>{statistics.totalCompletions} 次</strong>
        </article>
      </div>
      <h3 className="subsection-title">近 14 周</h3>
      <p className="field-hint">列为周，行从周一至周日。横向滑动查看更早日期。</p>
      <div className="habit-heatmap-scroll" ref={heatmapViewportRef}>
        <div className="habit-heatmap" aria-label={`${habit.name} 近 14 周热力图`}>
          {heatmap.map((day) => {
            const { localDate, scheduled, completed, future } = day
            const state = dayStatus(day)
            return (
              <button
                type="button"
                key={localDate}
                className={`heatmap-cell${completed ? ' heatmap-complete' : ''}${scheduled ? ' heatmap-scheduled' : ''}${future ? ' heatmap-future' : ''}`}
                aria-label={`${localDate} ${state}`}
                aria-pressed={selectedDate === localDate}
                onClick={() => {
                  // Selection is inspection only; historical completion remains repository-owned.
                  setSelectedDate(localDate)
                  logger.info('habit.heatmap.inspected', {
                    operation: 'inspect',
                    reason: future ? 'future' : 'past-or-today',
                  })
                }}
              >
                <span aria-hidden="true">{completed ? '✓' : Number(localDate.slice(-2))}</span>
              </button>
            )
          })}
        </div>
      </div>
      <p role="status">
        {selectedDate} · {selectedDay ? dayStatus(selectedDay) : '不在当前范围'}
      </p>
      <p className="field-hint">
        实色 ✓ 为完成，空心为未完成，虚线为非计划日或未来。点击只查看，不补打卡。
      </p>
      <h3 className="subsection-title">最近打卡</h3>
      {recentRecords.length ? (
        <ul className="recent-checkins">
          {recentRecords.map((record) => (
            <li key={record.id}>
              <span>{record.localDate}</span>
              <strong>已完成</strong>
            </li>
          ))}
        </ul>
      ) : (
        <p className="empty-state">还没有打卡记录。</p>
      )}
    </section>
  )
}
