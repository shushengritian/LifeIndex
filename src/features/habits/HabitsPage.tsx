import { useCallback, useMemo, useState, type FormEvent } from 'react'

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

const weekdayLabels = ['日', '一', '二', '三', '四', '五', '六'] as const
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

  useDirtyForm(
    name !== initialValues.name ||
      icon !== initialValues.icon ||
      color !== initialValues.color ||
      scheduleType !== initialValues.scheduleType ||
      weekdays.join(',') !== initialValues.weekdays.join(',') ||
      startLocalDate !== initialValues.startLocalDate ||
      note !== initialValues.note,
  )

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
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
    setSaving(true)
    try {
      await onSave({
        name: name.trim(),
        icon,
        color,
        schedule,
        startLocalDate,
        ...(note.trim() ? { note: note.trim() } : {}),
      })
    } catch {
      setError('未能保存，本次输入仍保留。请重试。')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form
      className="entry-form"
      onSubmit={(event) => void submit(event)}
      aria-label={habit ? '编辑习惯' : '新增习惯'}
    >
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
        <button type="button" className="button-secondary" onClick={onCancel}>
          取消
        </button>
        <button type="submit" className="button-primary" disabled={saving}>
          {saving ? '保存中…' : '保存'}
        </button>
      </div>
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
    const saved = editing
      ? await repository.update(editing.id, command)
      : await repository.create(command)
    setSelectedHabitId(saved.id)
    setEditing(undefined)
    setFormOpen(false)
  }

  async function toggleCheckIn(habit: Habit, record: HabitRecord | undefined) {
    setPageError('')
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
    } catch {
      setPageError('签到状态未能更新，请重试。')
    }
  }

  async function toggleStatus(habit: Habit) {
    setPageError('')
    try {
      await repository.setStatus(habit.id, habit.status === 'active' ? 'paused' : 'active')
    } catch {
      setPageError('习惯状态未能更新，历史记录没有被删除。')
    }
  }

  const isFormOpen = formOpen || editing !== undefined

  return (
    <section
      className={embedded ? 'health-habit-workspace' : 'page'}
      aria-labelledby={embedded ? undefined : 'habits-title'}
    >
      {!embedded ? (
        <div className="page-heading-row">
          <div>
            <p className="eyebrow">habits</p>
            <h1 id="habits-title">习惯</h1>
          </div>
          {!isFormOpen ? (
            <button
              className="button-primary compact"
              type="button"
              onClick={() => setFormOpen(true)}
            >
              新增
            </button>
          ) : null}
        </div>
      ) : null}

      {isFormOpen ? (
        <HabitForm
          key={editing?.id ?? 'new'}
          {...(editing ? { habit: editing } : {})}
          onCancel={() => {
            setEditing(undefined)
            setFormOpen(false)
          }}
          onSave={save}
        />
      ) : null}

      {pageError ? (
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
          habits={state.data.habits}
          records={state.data.records}
          today={today}
          {...(selectedHabitId ? { selectedHabitId } : {})}
          onSelect={setSelectedHabitId}
          onCheckIn={(habit, record) => void toggleCheckIn(habit, record)}
          onEdit={(habit) => {
            setFormOpen(false)
            setEditing(habit)
          }}
          onToggleStatus={(habit) => void toggleStatus(habit)}
        />
      ) : null}
    </section>
  )
}

interface HabitContentProps {
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

      <section className="content-section" aria-labelledby="all-habits-title">
        <h2 id="all-habits-title">全部习惯</h2>
        {habits.length === 0 ? (
          <p className="empty-state">还没有习惯。名称和计划都可以稍后修改。</p>
        ) : (
          <ul className="record-list">
            {habits.map((habit) => (
              <li key={habit.id}>
                <div className="record-main">
                  <span>{habit.name}</span>
                  <span className="status-label">
                    {habit.status === 'active' ? '进行中' : '已暂停'}
                  </span>
                </div>
                <p>
                  {habit.schedule.type === 'daily'
                    ? '每天'
                    : `星期${habit.schedule.weekdays.map((day) => weekdayLabels[day]).join('、')}`}{' '}
                  · {habit.startLocalDate} 开始
                </p>
                <div className="row-actions">
                  <button
                    type="button"
                    onClick={() => onSelect(selectedHabitId === habit.id ? undefined : habit.id)}
                  >
                    {selectedHabitId === habit.id ? '收起进度' : '查看进度'}
                  </button>
                  <button type="button" onClick={() => onEdit(habit)}>
                    编辑
                  </button>
                  <button type="button" onClick={() => onToggleStatus(habit)}>
                    {habit.status === 'active' ? '暂停' : '恢复'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {selected ? <HabitProgress habit={selected} records={selectedRecords} today={today} /> : null}
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
      <div className="habit-heatmap" aria-label={`${habit.name} 近 14 周热力图`}>
        {heatmap.map(({ localDate, scheduled, completed, future }) => {
          const state = completed
            ? '已完成'
            : scheduled && !future
              ? '未完成'
              : scheduled
                ? '计划中'
                : '无计划'
          return (
            <span
              key={localDate}
              className={`heatmap-cell${completed ? ' heatmap-complete' : ''}${scheduled ? ' heatmap-scheduled' : ''}${future ? ' heatmap-future' : ''}`}
              aria-label={`${localDate} ${state}`}
            />
          )
        })}
      </div>
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
