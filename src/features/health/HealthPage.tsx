import { useCallback, useMemo, useState, type FormEvent } from 'react'

import { useAppServices } from '@/app/AppServicesContext'
import {
  ActivityRepository,
  type SaveActivitySessionCommand,
} from '@/data/repositories/ActivityRepository'
import { CategoryRepository } from '@/data/repositories/CategoryRepository'
import { SettingsRepository } from '@/data/repositories/SettingsRepository'
import { WeightRepository, type SaveWeightEntryCommand } from '@/data/repositories/WeightRepository'
import { HabitsPage } from '@/features/habits/HabitsPage'
import {
  formatWeightGrams,
  parseWeightToGrams,
  summarizeActivities,
  summarizeWeightTrend,
} from '@/features/health/healthDomain'
import { addLocalDays, startOfLocalWeek, toLocalDateKey } from '@/shared/domain/date'
import type {
  ActivityIntensity,
  ActivitySession,
  Category,
  WeightEntry,
} from '@/shared/domain/types'
import { useLiveQueryState } from '@/shared/hooks/useLiveQueryState'
import { logger } from '@/shared/logging/logger'
import { Sheet } from '@/shared/ui/Sheet'
import { useDirtyForm } from '@/pwa/useDirtyForm'

type HealthSheet = 'chooser' | 'weight' | 'activity' | 'target'

function toDateTimeLocalInput(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function editableKilograms(weightGrams: number): string {
  return (weightGrams / 1_000).toFixed(3).replace(/\.?0+$/, '')
}

function formatActivityDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  if (hours === 0) return `${minutes} 分钟`
  return `${hours} 小时${remainder ? ` ${remainder} 分钟` : ''}`
}

function WeightForm({
  entry,
  onCancel,
  onSave,
}: {
  entry?: WeightEntry
  onCancel: () => void
  onSave: (command: SaveWeightEntryCommand) => Promise<void>
}) {
  const [initial] = useState(() => ({
    weight: entry ? editableKilograms(entry.weightGrams) : '',
    measuredAt: entry
      ? toDateTimeLocalInput(new Date(entry.measuredAt))
      : toDateTimeLocalInput(new Date()),
    note: entry?.note ?? '',
  }))
  const [weight, setWeight] = useState(initial.weight)
  const [measuredAt, setMeasuredAt] = useState(initial.measuredAt)
  const [note, setNote] = useState(initial.note)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const dirty =
    weight !== initial.weight || measuredAt !== initial.measuredAt || note !== initial.note
  useDirtyForm(dirty)

  function cancel() {
    if (dirty && !window.confirm('放弃尚未保存的体重输入？')) return
    onCancel()
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const parsedWeight = parseWeightToGrams(weight)
    const measuredDate = new Date(measuredAt)
    if (!parsedWeight.ok || Number.isNaN(measuredDate.getTime())) {
      logger.warn('health.weight.validationfailed', {
        entityType: 'weightEntry',
        operation: entry ? 'update' : 'create',
        failureClass: 'Validation',
      })
      setError('请输入 20–500 公斤之间的有效体重和日期时间。')
      return
    }
    setSaving(true)
    setError('')
    try {
      await onSave({
        weightGrams: parsedWeight.weightGrams,
        measuredAt: measuredDate.toISOString(),
        localDate: toLocalDateKey(measuredDate),
        timezoneOffsetMinutes: measuredDate.getTimezoneOffset(),
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
      className="sheet-form"
      aria-label={entry ? '编辑体重' : '记录体重'}
      onSubmit={(event) => void submit(event)}
    >
      <label className="weight-input">
        体重（公斤）
        <input
          autoFocus
          inputMode="decimal"
          value={weight}
          placeholder="0.0"
          onChange={(event) => setWeight(event.target.value)}
        />
      </label>
      <label>
        日期与时间
        <input
          type="datetime-local"
          value={measuredAt}
          onChange={(event) => setMeasuredAt(event.target.value)}
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
        <button className="button-secondary" type="button" onClick={cancel}>
          取消
        </button>
        <button className="button-primary" type="submit" disabled={saving}>
          {saving ? '保存中…' : '保存'}
        </button>
      </div>
    </form>
  )
}

function ActivityForm({
  categories,
  session,
  onCancel,
  onSave,
}: {
  categories: Category[]
  session?: ActivitySession
  onCancel: () => void
  onSave: (command: SaveActivitySessionCommand) => Promise<void>
}) {
  const selectableCategories = categories.filter(
    ({ archived, id }) => archived === 0 || id === session?.categoryId,
  )
  const [initial] = useState(() => ({
    categoryId: session?.categoryId ?? selectableCategories[0]?.id ?? '',
    duration: session ? String(session.durationMinutes) : '30',
    intensity: session?.intensity ?? ('moderate' as ActivityIntensity),
    occurredAt: session
      ? toDateTimeLocalInput(new Date(session.occurredAt))
      : toDateTimeLocalInput(new Date()),
    note: session?.note ?? '',
  }))
  const [categoryId, setCategoryId] = useState(initial.categoryId)
  const [duration, setDuration] = useState(initial.duration)
  const [intensity, setIntensity] = useState<ActivityIntensity>(initial.intensity)
  const [occurredAt, setOccurredAt] = useState(initial.occurredAt)
  const [note, setNote] = useState(initial.note)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const dirty =
    categoryId !== initial.categoryId ||
    duration !== initial.duration ||
    intensity !== initial.intensity ||
    occurredAt !== initial.occurredAt ||
    note !== initial.note
  useDirtyForm(dirty)

  function cancel() {
    if (dirty && !window.confirm('放弃尚未保存的运动输入？')) return
    onCancel()
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const durationMinutes = Number(duration)
    const occurredDate = new Date(occurredAt)
    if (
      !selectableCategories.some(({ id }) => id === categoryId) ||
      !Number.isInteger(durationMinutes) ||
      durationMinutes < 1 ||
      durationMinutes > 1_440 ||
      Number.isNaN(occurredDate.getTime())
    ) {
      logger.warn('health.activity.validationfailed', {
        entityType: 'activitySession',
        operation: session ? 'update' : 'create',
        failureClass: 'Validation',
      })
      setError('请选择运动类型，并填写 1–1440 分钟和有效日期时间。')
      return
    }
    setSaving(true)
    setError('')
    try {
      await onSave({
        categoryId,
        durationMinutes,
        intensity,
        occurredAt: occurredDate.toISOString(),
        localDate: toLocalDateKey(occurredDate),
        timezoneOffsetMinutes: occurredDate.getTimezoneOffset(),
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
      className="sheet-form"
      aria-label={session ? '编辑运动' : '记录运动'}
      onSubmit={(event) => void submit(event)}
    >
      <label>
        运动类型
        <select
          autoFocus
          value={categoryId}
          onChange={(event) => setCategoryId(event.target.value)}
        >
          {selectableCategories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
              {category.archived ? '（已归档）' : ''}
            </option>
          ))}
        </select>
      </label>
      <label>
        时长（分钟）
        <input
          type="number"
          inputMode="numeric"
          min="1"
          max="1440"
          step="1"
          value={duration}
          onChange={(event) => setDuration(event.target.value)}
        />
      </label>
      <fieldset className="form-fieldset">
        <legend>体感强度</legend>
        <div className="segmented-control intensity-control">
          {(
            [
              ['light', '轻松'],
              ['moderate', '适中'],
              ['hard', '较强'],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={intensity === value}
              className={intensity === value ? 'segment-active' : ''}
              onClick={() => setIntensity(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </fieldset>
      <label>
        日期与时间
        <input
          type="datetime-local"
          value={occurredAt}
          onChange={(event) => setOccurredAt(event.target.value)}
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
        <button className="button-secondary" type="button" onClick={cancel}>
          取消
        </button>
        <button className="button-primary" type="submit" disabled={saving}>
          {saving ? '保存中…' : '保存'}
        </button>
      </div>
    </form>
  )
}

function TargetForm({
  targetGrams,
  onCancel,
  onSave,
  onClear,
}: {
  targetGrams?: number
  onCancel: () => void
  onSave: (weightGrams: number) => Promise<void>
  onClear: () => Promise<void>
}) {
  const [value, setValue] = useState(targetGrams ? editableKilograms(targetGrams) : '')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  useDirtyForm(value !== (targetGrams ? editableKilograms(targetGrams) : ''))

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const parsed = parseWeightToGrams(value)
    if (!parsed.ok) {
      setError('请输入 20–500 公斤之间的目标，或选择清除目标。')
      return
    }
    setSaving(true)
    try {
      await onSave(parsed.weightGrams)
    } catch {
      setError('目标未能保存，原有设置没有改变。')
    } finally {
      setSaving(false)
    }
  }

  async function clear() {
    setSaving(true)
    setError('')
    try {
      await onClear()
    } catch {
      // Keep the sheet and prior target visible when IndexedDB rejects the delete.
      setError('目标未能清除，原有设置没有改变。')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="sheet-form" aria-label="体重目标" onSubmit={(event) => void submit(event)}>
      <p className="sheet-copy">目标只用于显示距离，不评价体重或健康状态。</p>
      <label>
        目标（公斤）
        <input
          autoFocus
          inputMode="decimal"
          value={value}
          onChange={(event) => setValue(event.target.value)}
        />
      </label>
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="form-actions split-actions">
        {targetGrams ? (
          <button
            className="text-destructive"
            type="button"
            disabled={saving}
            onClick={() => void clear()}
          >
            清除目标
          </button>
        ) : (
          <span />
        )}
        <button className="button-secondary" type="button" onClick={onCancel}>
          取消
        </button>
        <button className="button-primary" type="submit" disabled={saving}>
          {saving ? '保存中…' : '保存'}
        </button>
      </div>
    </form>
  )
}

export function HealthPage() {
  const { database } = useAppServices()
  const weights = useMemo(() => new WeightRepository(database), [database])
  const activities = useMemo(() => new ActivityRepository(database), [database])
  const categories = useMemo(() => new CategoryRepository(database), [database])
  const settings = useMemo(() => new SettingsRepository(database), [database])
  const today = toLocalDateKey(new Date())
  const weekStart = startOfLocalWeek(today)
  const weekEnd = addLocalDays(weekStart, 6)
  const [sheet, setSheet] = useState<HealthSheet>()
  const [editingWeight, setEditingWeight] = useState<WeightEntry>()
  const [editingActivity, setEditingActivity] = useState<ActivitySession>()
  const [habitCreateRequest, setHabitCreateRequest] = useState(0)
  const [pageError, setPageError] = useState('')

  const weightQuery = useCallback(async () => {
    const [entries, target] = await Promise.all([
      weights.list({ from: '1000-01-01', to: today }),
      settings.get('weightTarget'),
    ])
    return {
      entries,
      targetGrams: target?.key === 'weightTarget' ? target.value.weightGrams : undefined,
    }
  }, [settings, today, weights])
  const activityQuery = useCallback(async () => {
    const [sessions, activityCategories] = await Promise.all([
      activities.list({ from: '1000-01-01', to: '9999-12-31' }),
      categories.list({ domain: 'activity', includeArchived: true }),
    ])
    return { sessions, categories: activityCategories }
  }, [activities, categories])
  const weightState = useLiveQueryState(weightQuery)
  const activityState = useLiveQueryState(activityQuery)

  function openSheet(next: HealthSheet) {
    logger.info('health.sheet.opened', { operation: 'open', toState: next })
    setSheet(next)
  }

  function closeSheet() {
    logger.info('health.sheet.closed', { operation: 'close', fromState: sheet })
    setSheet(undefined)
    setEditingWeight(undefined)
    setEditingActivity(undefined)
  }

  async function removeWeight(entry: WeightEntry) {
    if (!window.confirm('删除这条体重记录？其他健康记录不会改变。')) return
    setPageError('')
    try {
      await weights.remove(entry.id)
    } catch {
      setPageError('体重记录未能删除，现有数据没有改变。')
    }
  }

  async function removeActivity(session: ActivitySession) {
    if (!window.confirm('删除这条运动记录？其他健康记录不会改变。')) return
    setPageError('')
    try {
      await activities.remove(session.id)
    } catch {
      setPageError('运动记录未能删除，现有数据没有改变。')
    }
  }

  const weightData = weightState.status === 'ready' ? weightState.data : undefined
  const weightTrend = weightData ? summarizeWeightTrend(weightData.entries, today) : undefined
  const activityData = activityState.status === 'ready' ? activityState.data : undefined
  const weekActivities =
    activityData?.sessions.filter(
      ({ localDate }) => localDate >= weekStart && localDate <= weekEnd,
    ) ?? []
  const activitySummary = summarizeActivities(weekActivities)
  const activityNames = new Map(activityData?.categories.map(({ id, name }) => [id, name]) ?? [])

  return (
    <section className="page health-page" aria-labelledby="health-title">
      <div className="page-heading-row">
        <div>
          <p className="eyebrow">wellbeing</p>
          <h1 id="health-title">健康</h1>
        </div>
        <button
          className="button-primary compact round-action"
          type="button"
          aria-label="添加健康记录"
          onClick={() => openSheet('chooser')}
        >
          ＋
        </button>
      </div>
      <p className="page-intro">体重、运动与习惯，安静地留在同一条时间线上。</p>

      {pageError ? (
        <p className="form-error global-feedback" role="alert">
          {pageError}
        </p>
      ) : null}

      <section className="health-card weight-card" aria-labelledby="weight-title">
        <div className="section-heading">
          <h2 id="weight-title">体重</h2>
          <button type="button" className="text-action" onClick={() => openSheet('weight')}>
            记录
          </button>
        </div>
        {weightState.status === 'loading' ? (
          <p className="state-message">正在读取体重记录…</p>
        ) : null}
        {weightState.status === 'failed' ? (
          <p className="form-error" role="alert">
            体重记录暂时无法读取；运动和习惯仍可使用。
          </p>
        ) : null}
        {weightTrend ? (
          <>
            <div className="weight-overview">
              <p>
                <strong>
                  {weightTrend.latest ? formatWeightGrams(weightTrend.latest.weightGrams) : '—'}
                </strong>
                <span>kg</span>
              </p>
              <p>
                {weightTrend.deltaGrams === undefined
                  ? '暂无 30 天趋势'
                  : `近 30 天 ${weightTrend.deltaGrams > 0 ? '+' : ''}${formatWeightGrams(weightTrend.deltaGrams)} kg`}
              </p>
            </div>
            <button className="target-row" type="button" onClick={() => openSheet('target')}>
              <span>目标</span>
              <strong>
                {weightData?.targetGrams
                  ? `${formatWeightGrams(weightData.targetGrams)} kg`
                  : '未设置'}{' '}
                ›
              </strong>
            </button>
            {weightData?.entries.length ? (
              <ul className="compact-history">
                {weightData.entries.slice(0, 3).map((entry) => (
                  <li key={entry.id}>
                    <span>{entry.localDate}</span>
                    <strong>{formatWeightGrams(entry.weightGrams)} kg</strong>
                    <div className="mini-actions">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingWeight(entry)
                          openSheet('weight')
                        }}
                      >
                        编辑
                      </button>
                      <button
                        className="text-destructive"
                        type="button"
                        onClick={() => void removeWeight(entry)}
                      >
                        删除
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="empty-state">记录第一次体重后，这里会显示方向，不做评价。</p>
            )}
          </>
        ) : null}
      </section>

      <section className="health-card activity-card" aria-labelledby="activity-title">
        <div className="section-heading">
          <h2 id="activity-title">运动</h2>
          <button type="button" className="text-action" onClick={() => openSheet('activity')}>
            记录
          </button>
        </div>
        {activityState.status === 'loading' ? (
          <p className="state-message">正在读取运动记录…</p>
        ) : null}
        {activityState.status === 'failed' ? (
          <p className="form-error" role="alert">
            运动记录暂时无法读取；体重和习惯仍可使用。
          </p>
        ) : null}
        {activityData ? (
          <>
            <div className="activity-summary" aria-label="本周运动汇总">
              <p>
                <strong>{activitySummary.count}</strong>
                <span>次</span>
              </p>
              <p>
                <strong>{formatActivityDuration(activitySummary.durationMinutes)}</strong>
                <span>本周累计</span>
              </p>
            </div>
            {activityData.sessions.length ? (
              <ul className="compact-history activity-history">
                {activityData.sessions.slice(0, 4).map((session) => (
                  <li key={session.id}>
                    <span>
                      {session.localDate} · {activityNames.get(session.categoryId) ?? '已归档类型'}
                    </span>
                    <strong>
                      {formatActivityDuration(session.durationMinutes)} ·{' '}
                      {session.intensity === 'light'
                        ? '轻松'
                        : session.intensity === 'moderate'
                          ? '适中'
                          : '较强'}
                    </strong>
                    <div className="mini-actions">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingActivity(session)
                          openSheet('activity')
                        }}
                      >
                        编辑
                      </button>
                      <button
                        className="text-destructive"
                        type="button"
                        onClick={() => void removeActivity(session)}
                      >
                        删除
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="empty-state">本周还没有运动记录。一次步行也值得留下。</p>
            )}
          </>
        ) : null}
      </section>

      <section className="health-card habit-card" aria-labelledby="health-habits-title">
        <h2 id="health-habits-title">习惯</h2>
        <HabitsPage key={habitCreateRequest} embedded createRequest={habitCreateRequest} />
      </section>

      {sheet === 'chooser' ? (
        <Sheet title="添加健康记录">
          <div className="health-add-choices">
            <button type="button" onClick={() => openSheet('weight')}>
              <strong>记录体重</strong>
              <span>数值、日期和可选备注</span>
            </button>
            <button type="button" onClick={() => openSheet('activity')}>
              <strong>记录运动</strong>
              <span>类型、时长与体感强度</span>
            </button>
            <button
              type="button"
              onClick={() => {
                closeSheet()
                setHabitCreateRequest((value) => value + 1)
              }}
            >
              <strong>创建习惯</strong>
              <span>每天或按星期安排</span>
            </button>
            <button className="button-secondary" type="button" onClick={closeSheet}>
              取消
            </button>
          </div>
        </Sheet>
      ) : null}
      {sheet === 'weight' && weightData ? (
        <Sheet title={editingWeight ? '编辑体重' : '记录体重'}>
          <WeightForm
            key={editingWeight?.id ?? 'new-weight'}
            {...(editingWeight ? { entry: editingWeight } : {})}
            onCancel={closeSheet}
            onSave={async (command) => {
              if (editingWeight) await weights.update(editingWeight.id, command)
              else await weights.create(command)
              closeSheet()
            }}
          />
        </Sheet>
      ) : null}
      {sheet === 'activity' && activityData ? (
        <Sheet title={editingActivity ? '编辑运动' : '记录运动'}>
          <ActivityForm
            key={editingActivity?.id ?? 'new-activity'}
            categories={activityData.categories}
            {...(editingActivity ? { session: editingActivity } : {})}
            onCancel={closeSheet}
            onSave={async (command) => {
              if (editingActivity) await activities.update(editingActivity.id, command)
              else await activities.create(command)
              closeSheet()
            }}
          />
        </Sheet>
      ) : null}
      {sheet === 'target' && weightData ? (
        <Sheet title="体重目标">
          <TargetForm
            {...(weightData.targetGrams ? { targetGrams: weightData.targetGrams } : {})}
            onCancel={closeSheet}
            onSave={async (weightGrams) => {
              const timestamp = new Date().toISOString()
              await settings.put({
                key: 'weightTarget',
                value: { weightGrams },
                updatedAt: timestamp,
              })
              closeSheet()
            }}
            onClear={async () => {
              await settings.remove('weightTarget')
              closeSheet()
            }}
          />
        </Sheet>
      ) : null}
    </section>
  )
}
