import { useCallback, useMemo, useRef, useState, type FormEvent } from 'react'

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
import { Icon } from '@/shared/ui/Icon'
import { Link } from 'react-router-dom'
import { CessationCard } from '@/features/health/cessation/CessationCard'
import { Sheet } from '@/shared/ui/Sheet'
import { useDirtyForm } from '@/pwa/useDirtyForm'
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog'
import { HealthHistoryList } from './HealthHistoryList'
import { WeightTrendChart } from './WeightTrendChart'
import { CategoryIcon } from '@/shared/ui/CategoryIcon'

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
  onDelete,
}: {
  entry?: WeightEntry
  onCancel: () => void
  onSave: (command: SaveWeightEntryCommand) => Promise<void>
  onDelete?: () => void
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
  const writeLock = useRef(false)
  const [discard, setDiscard] = useState(false)
  const dirty =
    weight !== initial.weight || measuredAt !== initial.measuredAt || note !== initial.note
  // A pending IndexedDB write cannot be discarded by route navigation.
  useDirtyForm(dirty, saving)

  function cancel() {
    if (writeLock.current) {
      logger.info('health.weight.closeblocked', { operation: 'cancel', reason: 'busy' })
      return
    }
    if (dirty) {
      logger.info('health.weight.discardrequested', { operation: 'cancel' })
      setDiscard(true)
    } else onCancel()
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    // The ref locks immediately, before React renders disabled controls.
    if (writeLock.current) return
    const parsedWeight = parseWeightToGrams(weight)
    const measuredDate = new Date(String(new FormData(event.currentTarget).get('measuredAt')))
    if (!parsedWeight.ok || Number.isNaN(measuredDate.getTime())) {
      logger.warn('health.weight.validationfailed', {
        entityType: 'weightEntry',
        operation: entry ? 'update' : 'create',
        failureClass: 'Validation',
      })
      setError('请输入 20–500 公斤之间的有效体重和日期时间。')
      return
    }
    writeLock.current = true
    setSaving(true)
    logger.info('health.weight.savestarted', { operation: entry ? 'update' : 'create' })
    setError('')
    try {
      await onSave({
        weightGrams: parsedWeight.weightGrams,
        measuredAt: measuredDate.toISOString(),
        localDate: toLocalDateKey(measuredDate),
        timezoneOffsetMinutes: measuredDate.getTimezoneOffset(),
        ...(note.trim() ? { note: note.trim() } : {}),
      })
      logger.info('health.weight.saved', { operation: entry ? 'update' : 'create' })
    } catch {
      logger.warn('health.weight.savefailed', {
        operation: entry ? 'update' : 'create',
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
      aria-label={entry ? '编辑体重' : '记录体重'}
      onSubmit={(event) => void submit(event)}
    >
      <label className="weight-input">
        体重（公斤）
        <input
          autoFocus
          disabled={saving}
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
          name="measuredAt"
          disabled={saving}
          value={measuredAt}
          onChange={(event) => setMeasuredAt(event.target.value)}
        />
      </label>
      <label>
        备注（可选）
        <input
          disabled={saving}
          value={note}
          maxLength={280}
          onChange={(event) => setNote(event.target.value)}
        />
      </label>
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      {onDelete && (
        <button
          type="button"
          className="button-secondary text-destructive"
          disabled={saving}
          onClick={onDelete}
        >
          删除记录
        </button>
      )}
      <div className="form-actions">
        <button className="button-secondary" type="button" disabled={saving} onClick={cancel}>
          取消
        </button>
        <button className="button-primary" type="submit" disabled={saving}>
          {saving ? '保存中…' : '保存'}
        </button>
      </div>
      {discard && (
        <ConfirmDialog
          title="放弃体重输入？"
          description="尚未保存的修改将丢失，已保存的记录不会改变。"
          confirmLabel="放弃输入"
          cancelLabel="继续填写"
          onCancel={() => setDiscard(false)}
          onConfirm={onCancel}
        />
      )}
    </form>
  )
}

function ActivityForm({
  categories,
  session,
  onCancel,
  onSave,
  onDelete,
}: {
  categories: Category[]
  session?: ActivitySession
  onCancel: () => void
  onSave: (command: SaveActivitySessionCommand) => Promise<void>
  onDelete?: () => void
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
  const writeLock = useRef(false)
  const [discard, setDiscard] = useState(false)
  const dirty =
    categoryId !== initial.categoryId ||
    duration !== initial.duration ||
    intensity !== initial.intensity ||
    occurredAt !== initial.occurredAt ||
    note !== initial.note
  useDirtyForm(dirty, saving)

  function cancel() {
    if (writeLock.current) {
      logger.info('health.activity.closeblocked', { operation: 'cancel', reason: 'busy' })
      return
    }
    if (dirty) {
      logger.info('health.activity.discardrequested', { operation: 'cancel' })
      setDiscard(true)
    } else onCancel()
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    // Capture the native picker value even if its final change event has not fired yet.
    if (writeLock.current) return
    const durationMinutes = Number(duration)
    const occurredDate = new Date(String(new FormData(event.currentTarget).get('occurredAt')))
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
    writeLock.current = true
    setSaving(true)
    logger.info('health.activity.savestarted', { operation: session ? 'update' : 'create' })
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
      logger.info('health.activity.saved', { operation: session ? 'update' : 'create' })
    } catch {
      logger.warn('health.activity.savefailed', {
        operation: session ? 'update' : 'create',
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
      aria-label={session ? '编辑运动' : '记录运动'}
      onSubmit={(event) => void submit(event)}
    >
      <label>
        运动类型
        <select
          autoFocus
          disabled={saving}
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
          disabled={saving}
          inputMode="numeric"
          min="1"
          max="1440"
          step="1"
          value={duration}
          onChange={(event) => setDuration(event.target.value)}
        />
      </label>
      <fieldset className="form-fieldset" disabled={saving}>
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
          name="occurredAt"
          disabled={saving}
          value={occurredAt}
          onChange={(event) => setOccurredAt(event.target.value)}
        />
      </label>
      <label>
        备注（可选）
        <input
          disabled={saving}
          value={note}
          maxLength={280}
          onChange={(event) => setNote(event.target.value)}
        />
      </label>
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      {onDelete && (
        <button
          type="button"
          className="button-secondary text-destructive"
          disabled={saving}
          onClick={onDelete}
        >
          删除记录
        </button>
      )}
      <div className="form-actions">
        <button className="button-secondary" type="button" disabled={saving} onClick={cancel}>
          取消
        </button>
        <button className="button-primary" type="submit" disabled={saving}>
          {saving ? '保存中…' : '保存'}
        </button>
      </div>
      {discard && (
        <ConfirmDialog
          title="放弃运动输入？"
          description="尚未保存的修改将丢失，已保存的记录不会改变。"
          confirmLabel="放弃输入"
          cancelLabel="继续填写"
          onCancel={() => setDiscard(false)}
          onConfirm={onCancel}
        />
      )}
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
  const writeLock = useRef(false)
  const [confirmation, setConfirmation] = useState<'discard' | 'clear'>()
  const dirty = value !== (targetGrams ? editableKilograms(targetGrams) : '')
  useDirtyForm(dirty, saving)

  function cancel() {
    if (writeLock.current) return
    if (dirty) {
      logger.info('health.target.discardrequested', { operation: 'cancel' })
      setConfirmation('discard')
    } else onCancel()
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    // Saving and clearing share a lock so competing writes cannot race each other.
    if (writeLock.current) return
    const parsed = parseWeightToGrams(value)
    if (!parsed.ok) {
      logger.warn('health.target.validationfailed', {
        operation: 'save',
        failureClass: 'Validation',
      })
      setError('请输入 20–500 公斤之间的目标，或选择清除目标。')
      return
    }
    writeLock.current = true
    setSaving(true)
    setError('')
    logger.info('health.target.savestarted', { operation: 'save' })
    try {
      await onSave(parsed.weightGrams)
      logger.info('health.target.saved', { operation: 'save' })
    } catch {
      logger.warn('health.target.savefailed', { operation: 'save', failureClass: 'Write' })
      setError('目标未能保存，原有设置没有改变。')
    } finally {
      writeLock.current = false
      setSaving(false)
    }
  }

  async function clear() {
    if (writeLock.current) return
    writeLock.current = true
    setSaving(true)
    setError('')
    logger.info('health.target.clearstarted', { operation: 'clear' })
    try {
      await onClear()
      logger.info('health.target.cleared', { operation: 'clear' })
    } catch {
      // Keep the sheet and prior target visible when IndexedDB rejects the delete.
      setError('目标未能清除，原有设置没有改变。')
      logger.warn('health.target.clearfailed', { operation: 'clear', failureClass: 'Write' })
    } finally {
      writeLock.current = false
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
          disabled={saving}
          value={value}
          onChange={(event) => setValue(event.target.value)}
        />
      </label>
      {error && confirmation !== 'clear' ? (
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
            onClick={() => {
              setError('')
              setConfirmation('clear')
              logger.info('health.target.clearrequested', { operation: 'clear' })
            }}
          >
            清除目标
          </button>
        ) : (
          <span />
        )}
        <button className="button-secondary" type="button" disabled={saving} onClick={cancel}>
          取消
        </button>
        <button className="button-primary" type="submit" disabled={saving}>
          {saving ? '保存中…' : '保存'}
        </button>
      </div>
      {confirmation && (
        <ConfirmDialog
          title={confirmation === 'clear' ? '清除体重目标？' : '放弃目标修改？'}
          description={
            confirmation === 'clear'
              ? '只清除目标，已有体重记录不会改变。'
              : '尚未保存的目标修改将丢失。'
          }
          confirmLabel={confirmation === 'clear' ? '确认清除' : '放弃修改'}
          cancelLabel="继续编辑"
          busy={saving}
          error={confirmation === 'clear' ? error : ''}
          onCancel={() => {
            if (!writeLock.current) setConfirmation(undefined)
          }}
          onConfirm={() => {
            if (confirmation === 'clear') void clear()
            else onCancel()
          }}
        />
      )}
    </form>
  )
}

export function WeightHistoryPage() {
  return <HealthPage history="weight" />
}

export function ActivityHistoryPage() {
  return <HealthPage history="activity" />
}

export function HealthPage({ history }: { history?: 'weight' | 'activity' }) {
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
  const [deletion, setDeletion] = useState<{ kind: 'weight' | 'activity'; id: string }>()
  const [deleting, setDeleting] = useState(false)
  const deleteLock = useRef(false)
  useDirtyForm(false, deleting)

  const weightQuery = useCallback(async () => {
    const [entries, target] = await Promise.all([
      // History must remain complete, including future-dated entries that need correction.
      weights.list({ from: '1000-01-01', to: '9999-12-31' }),
      settings.get('weightTarget'),
    ])
    return {
      entries,
      targetGrams: target?.key === 'weightTarget' ? target.value.weightGrams : undefined,
    }
  }, [settings, weights])
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

  function requestDeletion(kind: 'weight' | 'activity', id: string) {
    if (deleteLock.current) return
    setPageError('')
    setDeletion({ kind, id })
    logger.info('health.history.deleterequested', { operation: 'delete', entityType: kind })
  }

  async function confirmDeletion() {
    // Keep the confirmation open on failure; the original record remains available for retry.
    if (!deletion || deleteLock.current) return
    deleteLock.current = true
    setDeleting(true)
    setPageError('')
    logger.info('health.history.deletestarted', { operation: 'delete', entityType: deletion.kind })
    try {
      if (deletion.kind === 'weight') await weights.remove(deletion.id)
      else await activities.remove(deletion.id)
      logger.info('health.history.deleted', { operation: 'delete', entityType: deletion.kind })
      setDeletion(undefined)
      closeSheet()
    } catch {
      logger.warn('health.history.deletefailed', {
        operation: 'delete',
        entityType: deletion.kind,
        failureClass: 'Write',
      })
      setPageError('记录未能删除，现有数据没有改变。请重试。')
    } finally {
      deleteLock.current = false
      setDeleting(false)
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
    <section
      className={`page health-page${history ? ' health-history-page' : ''}`}
      aria-labelledby="health-title"
    >
      {history && (
        <Link to="/health" className="button-secondary">
          返回健康
        </Link>
      )}
      <div className="page-heading-row">
        <div>
          <h1 id="health-title">
            {history === 'weight' ? '体重历史' : history === 'activity' ? '运动历史' : '健康'}
          </h1>
        </div>
        <button
          className="button-primary compact round-action"
          type="button"
          aria-label="添加健康记录"
          onClick={() => openSheet(history ?? 'chooser')}
        >
          <Icon name="add" />
        </button>
      </div>
      {!history && <p className="page-intro">体重、运动与习惯，安静地留在同一条时间线上。</p>}

      {pageError && !deletion ? (
        <p className="form-error global-feedback" role="alert">
          {pageError}
        </p>
      ) : null}

      {history !== 'activity' && (
        <section className="health-card weight-card" aria-labelledby="weight-title">
          <div className="section-heading">
            <h2 id="weight-title" className="health-section-label">
              <span className="category-glyph tone-blue">
                <CategoryIcon name="heart" />
              </span>
              体重
            </h2>
            <button
              type="button"
              className="icon-action"
              aria-label="记录体重"
              onClick={() => openSheet('weight')}
            >
              <Icon name="add" size={20} />
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
              {!history && weightData && weightData.entries.length > 0 && (
                <WeightTrendChart entries={weightData.entries} today={today} />
              )}
              <div className="weight-panel-footer">
                <button className="target-row" type="button" onClick={() => openSheet('target')}>
                  <span>目标</span>
                  <strong>
                    {weightData?.targetGrams
                      ? `${formatWeightGrams(weightData.targetGrams)} kg`
                      : '未设置'}{' '}
                    ›
                  </strong>
                </button>
                {!history && (
                  <Link className="button-secondary" to="/health/weight-history">
                    查看体重历史
                  </Link>
                )}
              </div>
              {history === 'weight' && weightData?.entries.length ? (
                <HealthHistoryList
                  rows={weightData.entries.map((entry) => ({
                    id: entry.id,
                    date: entry.localDate,
                    time: new Date(entry.measuredAt).toLocaleTimeString('zh-CN', {
                      hour: '2-digit',
                      minute: '2-digit',
                    }),
                    title: `${formatWeightGrams(entry.weightGrams)} kg`,
                    subtitle: '体重记录',
                    icon: 'heart',
                    color: 'blue',
                  }))}
                  onOpen={(id) => {
                    setEditingWeight(weightData.entries.find((entry) => entry.id === id))
                    openSheet('weight')
                  }}
                />
              ) : !weightData?.entries.length ? (
                <p className="empty-state">记录第一次体重后，这里会显示方向，不做评价。</p>
              ) : null}
            </>
          ) : null}
        </section>
      )}

      {history !== 'weight' && (
        <section className="health-card activity-card" aria-labelledby="activity-title">
          <div className="section-heading">
            <h2 id="activity-title" className="health-section-label">
              <span className="category-glyph tone-amber">
                <CategoryIcon name="activity" />
              </span>
              运动
            </h2>
            <button
              type="button"
              className="icon-action"
              aria-label="记录运动"
              onClick={() => openSheet('activity')}
            >
              <Icon name="add" size={20} />
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
              {!history && (
                <Link className="button-secondary" to="/health/activity-history">
                  查看运动历史
                </Link>
              )}
              {history === 'activity' && activityData.sessions.length ? (
                <HealthHistoryList
                  rows={activityData.sessions.map((session) => {
                    const category = activityData.categories.find(
                      ({ id }) => id === session.categoryId,
                    )
                    return {
                      id: session.id,
                      date: session.localDate,
                      time: new Date(session.occurredAt).toLocaleTimeString('zh-CN', {
                        hour: '2-digit',
                        minute: '2-digit',
                      }),
                      title: `${formatActivityDuration(session.durationMinutes)} · ${session.intensity === 'light' ? '轻松' : session.intensity === 'moderate' ? '适中' : '较强'}`,
                      subtitle: activityNames.get(session.categoryId) ?? '已归档类型',
                      icon: category?.icon ?? 'activity',
                      color: category?.color ?? 'sage',
                    }
                  })}
                  onOpen={(id) => {
                    setEditingActivity(activityData.sessions.find((session) => session.id === id))
                    openSheet('activity')
                  }}
                />
              ) : !activityData.sessions.length ? (
                <p className="empty-state">本周还没有运动记录。一次步行也值得留下。</p>
              ) : null}
            </>
          ) : null}
        </section>
      )}

      {/* Optional cessation data stays independent from the existing habits and measurements. */}
      {!history && (
        <>
          <CessationCard />
          <section className="health-card habit-card" aria-labelledby="health-habits-title">
            <h2 id="health-habits-title" className="health-section-label">
              <span className="category-glyph tone-violet">
                <CategoryIcon name="leaf" />
              </span>
              习惯
            </h2>
            <HabitsPage key={habitCreateRequest} embedded createRequest={habitCreateRequest} />
          </section>
        </>
      )}

      {sheet === 'chooser' ? (
        <Sheet title="添加健康记录">
          <div className="health-add-choices">
            <Link
              className="button-secondary"
              to="/health/cessation"
              onClick={() => {
                logger.info('health.cessation.opened', { operation: 'open' })
                closeSheet()
              }}
            >
              戒烟计划与记录
            </Link>
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
      {deletion && (
        <ConfirmDialog
          title={deletion.kind === 'weight' ? '删除体重记录？' : '删除运动记录？'}
          description="删除后无法撤销。其他健康记录不会改变。"
          confirmLabel="删除记录"
          busy={deleting}
          error={pageError}
          onCancel={() => {
            if (deleteLock.current) return
            setDeletion(undefined)
            setPageError('')
            logger.info('health.history.deletecancelled', { operation: 'delete' })
          }}
          onConfirm={() => void confirmDeletion()}
        />
      )}
      {sheet === 'weight' && weightData ? (
        <Sheet title={editingWeight ? '编辑体重' : '记录体重'}>
          <WeightForm
            key={editingWeight?.id ?? 'new-weight'}
            {...(editingWeight ? { entry: editingWeight } : {})}
            {...(editingWeight
              ? { onDelete: () => requestDeletion('weight', editingWeight.id) }
              : {})}
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
            {...(editingActivity
              ? { onDelete: () => requestDeletion('activity', editingActivity.id) }
              : {})}
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
