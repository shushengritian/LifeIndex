import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'

import { useAppServices } from '@/app/AppServicesContext'
import { CategoryRepository } from '@/data/repositories/CategoryRepository'
import {
  FocusRepository,
  type StartFocusCommand,
  type UpdateFocusDetailsCommand,
} from '@/data/repositories/FocusRepository'
import {
  focusByCategory,
  formatFocusDuration,
  remainingFocusSeconds,
  summarizeFocus,
} from '@/features/focus/focusDomain'
import {
  addLocalDays,
  endOfLocalMonth,
  startOfLocalMonth,
  startOfLocalWeek,
  toLocalDateKey,
} from '@/shared/domain/date'
import type { Category, FocusSession } from '@/shared/domain/types'
import { useLiveQueryState } from '@/shared/hooks/useLiveQueryState'
import { logger } from '@/shared/logging/logger'
import { useDirtyForm } from '@/pwa/useDirtyForm'

function durationLabel(seconds: number): string {
  if (seconds < 60) return `${seconds} 秒`
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.round((seconds % 3600) / 60)
  return hours > 0 ? `${hours} 小时${minutes ? ` ${minutes} 分钟` : ''}` : `${minutes} 分钟`
}

interface FocusFormProps {
  categories: Category[]
  onStart: (command: StartFocusCommand) => Promise<void>
}

function FocusForm({ categories, onStart }: FocusFormProps) {
  const [duration, setDuration] = useState<'1500' | '3000' | 'custom'>('1500')
  const [customMinutes, setCustomMinutes] = useState('25')
  const [title, setTitle] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const previewSeconds =
    duration === 'custom' && Number.isFinite(Number(customMinutes))
      ? Number(customMinutes) * 60
      : Number(duration === 'custom' ? 0 : duration)

  useDirtyForm(
    duration !== '1500' ||
      customMinutes !== '25' ||
      title !== '' ||
      categoryId !== '' ||
      note !== '',
  )

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const plannedDurationSeconds =
      duration === 'custom' ? Number(customMinutes) * 60 : Number(duration)
    if (
      !title.trim() ||
      !Number.isInteger(plannedDurationSeconds) ||
      plannedDurationSeconds < 60 ||
      plannedDurationSeconds > 14_400
    ) {
      logger.warn('focus.form.validationfailed', {
        operation: 'start',
        failureClass: 'Validation',
      })
      setError('请填写标题，并选择 1–240 分钟的专注时长。')
      return
    }

    setError('')
    setSaving(true)
    try {
      await onStart({
        title: title.trim(),
        plannedDurationSeconds,
        ...(categoryId ? { categoryId } : {}),
        ...(note.trim() ? { note: note.trim() } : {}),
      })
    } catch {
      setError('未能开始专注，本次输入仍保留。请重试。')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form
      className="entry-form focus-start-form"
      onSubmit={(event) => void submit(event)}
      aria-label="开始专注"
    >
      <div className="focus-timer-ring" aria-label={`计划 ${durationLabel(previewSeconds)}`}>
        <strong>{formatFocusDuration(previewSeconds)}</strong>
        <span>准备专注</span>
      </div>
      <div className="duration-presets" aria-label="专注时长">
        {[
          { value: '1500', label: '25 分钟' },
          { value: '3000', label: '50 分钟' },
          { value: 'custom', label: '自定义' },
        ].map(({ value, label }) => (
          <button
            key={value}
            type="button"
            aria-pressed={duration === value}
            onClick={() => setDuration(value as typeof duration)}
          >
            {label}
          </button>
        ))}
      </div>
      {duration === 'custom' ? (
        <label>
          自定义分钟数
          <input
            type="number"
            inputMode="numeric"
            min="1"
            max="240"
            step="1"
            value={customMinutes}
            onChange={(event) => setCustomMinutes(event.target.value)}
          />
        </label>
      ) : null}
      <label>
        专注标题
        <input
          autoFocus
          value={title}
          maxLength={100}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="例如：阅读一章"
        />
      </label>
      <label>
        分类（可选）
        <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
          <option value="">未分类</option>
          {categories
            .filter(({ archived }) => archived === 0)
            .map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
        </select>
      </label>
      <label>
        备注（可选）
        <input value={note} maxLength={500} onChange={(event) => setNote(event.target.value)} />
      </label>
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      <button className="button-primary" type="submit" disabled={saving}>
        {saving ? '正在开始…' : '开始专注'}
      </button>
    </form>
  )
}

function FocusEditForm({
  session,
  categories,
  onCancel,
  onSave,
}: {
  session: FocusSession
  categories: Category[]
  onCancel: () => void
  onSave: (command: UpdateFocusDetailsCommand) => Promise<void>
}) {
  const [title, setTitle] = useState(session.title)
  const [categoryId, setCategoryId] = useState(session.categoryId ?? '')
  const [note, setNote] = useState(session.note ?? '')
  const [error, setError] = useState('')

  useDirtyForm(
    title !== session.title ||
      categoryId !== (session.categoryId ?? '') ||
      note !== (session.note ?? ''),
  )

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!title.trim()) {
      setError('专注标题不能为空。')
      return
    }
    try {
      await onSave({
        title: title.trim(),
        ...(categoryId ? { categoryId } : {}),
        ...(note.trim() ? { note: note.trim() } : {}),
      })
    } catch {
      setError('未能保存描述，计时时长没有改变。')
    }
  }

  return (
    <form className="entry-form" onSubmit={(event) => void submit(event)} aria-label="编辑专注记录">
      <label>
        专注标题
        <input value={title} maxLength={100} onChange={(event) => setTitle(event.target.value)} />
      </label>
      <label>
        分类（可选）
        <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
          <option value="">未分类</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
              {category.archived ? '（已归档）' : ''}
            </option>
          ))}
        </select>
      </label>
      <label>
        备注（可选）
        <input value={note} maxLength={500} onChange={(event) => setNote(event.target.value)} />
      </label>
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="form-actions">
        <button className="button-secondary" type="button" onClick={onCancel}>
          取消
        </button>
        <button className="button-primary" type="submit">
          保存描述
        </button>
      </div>
    </form>
  )
}

export function FocusPage() {
  const { database } = useAppServices()
  const repository = useMemo(() => new FocusRepository(database), [database])
  const categoryRepository = useMemo(() => new CategoryRepository(database), [database])
  const today = toLocalDateKey(new Date())
  const [now, setNow] = useState(() => Date.now())
  const [editing, setEditing] = useState<FocusSession>()
  const [pageError, setPageError] = useState('')

  const query = useCallback(async () => {
    const [active, history, categories] = await Promise.all([
      repository.getActive(),
      repository.listCompleted({ from: '1000-01-01', to: '9999-12-31' }),
      categoryRepository.list({ domain: 'focus', includeArchived: true }),
    ])
    return { active, history, categories }
  }, [categoryRepository, repository])
  const state = useLiveQueryState(query)
  const active = state.status === 'ready' ? state.data.active : undefined

  useEffect(() => {
    if (!active) return
    const expectedEnd = new Date(active.expectedEndAt).getTime()
    let reconciled = false
    const refresh = () => {
      const timestamp = Date.now()
      setNow(timestamp)
      if (!reconciled && timestamp >= expectedEnd) {
        reconciled = true
        void repository.reconcileActive(new Date(timestamp).toISOString())
      }
    }
    const interval = window.setInterval(refresh, 1000)
    const onVisibility = () => {
      if (document.visibilityState === 'visible') refresh()
    }
    document.addEventListener('visibilitychange', onVisibility)
    if (Date.now() >= expectedEnd) {
      reconciled = true
      void repository.reconcileActive(new Date().toISOString())
    }
    // The interval updates display only; persistence derives the transition from absolute timestamps.
    return () => {
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [active, repository])

  async function finish(session: FocusSession) {
    if (!window.confirm('提前结束并保存已经专注的时间？')) return
    setPageError('')
    try {
      await repository.finishEarly(session.id, new Date().toISOString())
    } catch {
      setPageError('未能结束专注，请保留页面并重试。')
    }
  }

  async function cancel(session: FocusSession) {
    if (!window.confirm('取消本次专注？取消后不会保留记录。')) return
    setPageError('')
    try {
      await repository.cancel(session.id)
    } catch {
      setPageError('未能取消专注，请重试。')
    }
  }

  async function remove(session: FocusSession) {
    if (!window.confirm('删除这条专注历史？计时时长将不再计入汇总。')) return
    try {
      await repository.removeCompleted(session.id)
    } catch {
      setPageError('未能删除专注记录。')
    }
  }

  return (
    <section className="page" aria-labelledby="focus-title">
      <p className="eyebrow">focus</p>
      <h1 id="focus-title">专注</h1>
      {pageError ? (
        <p className="form-error" role="alert">
          {pageError}
        </p>
      ) : null}
      {state.status === 'loading' ? <p className="state-message">正在读取本地专注记录…</p> : null}
      {state.status === 'failed' ? (
        <p className="form-error" role="alert">
          专注记录暂时无法读取，数据没有被清空。
        </p>
      ) : null}
      {state.status === 'ready' ? (
        <>
          {state.data.active ? (
            <ActiveFocus
              session={state.data.active}
              now={new Date(now)}
              onFinish={() => void finish(state.data.active!)}
              onCancel={() => void cancel(state.data.active!)}
            />
          ) : (
            <FocusForm
              categories={state.data.categories}
              onStart={async (command) => {
                await repository.start(command)
              }}
            />
          )}
          <FocusHistory
            sessions={state.data.history}
            categories={state.data.categories}
            today={today}
            {...(editing ? { editing } : {})}
            onEdit={setEditing}
            onDelete={(session) => void remove(session)}
            onSave={async (session, command) => {
              await repository.updateDetails(session.id, command)
              setEditing(undefined)
            }}
          />
        </>
      ) : null}
    </section>
  )
}

function ActiveFocus({
  session,
  now,
  onFinish,
  onCancel,
}: {
  session: FocusSession
  now: Date
  onFinish: () => void
  onCancel: () => void
}) {
  const remaining = remainingFocusSeconds(session, now)
  return (
    <section className="active-focus" aria-labelledby="active-focus-title">
      <p>正在专注</p>
      <h2 id="active-focus-title">{session.title}</h2>
      <div className="focus-timer-ring active" aria-label={`剩余 ${durationLabel(remaining)}`}>
        <strong className="timer-value">{formatFocusDuration(remaining)}</strong>
        <span>剩余</span>
      </div>
      <span>即使切到后台，也会按结束时间继续计算。</span>
      <div className="form-actions">
        <button className="button-secondary" type="button" onClick={onCancel}>
          取消本次
        </button>
        <button className="button-primary" type="button" onClick={onFinish}>
          提前结束
        </button>
      </div>
    </section>
  )
}

function FocusHistory({
  sessions,
  categories,
  today,
  editing,
  onEdit,
  onDelete,
  onSave,
}: {
  sessions: FocusSession[]
  categories: Category[]
  today: string
  editing?: FocusSession
  onEdit: (session: FocusSession | undefined) => void
  onDelete: (session: FocusSession) => void
  onSave: (session: FocusSession, command: UpdateFocusDetailsCommand) => Promise<void>
}) {
  const weekStart = startOfLocalWeek(today)
  const weekEnd = addLocalDays(weekStart, 6)
  const monthStart = startOfLocalMonth(today)
  const monthEnd = endOfLocalMonth(today)
  const todaySummary = summarizeFocus(sessions.filter(({ localDate }) => localDate === today))
  const weekSummary = summarizeFocus(
    sessions.filter(({ localDate }) => localDate >= weekStart && localDate <= weekEnd),
  )
  const monthSessions = sessions.filter(
    ({ localDate }) => localDate >= monthStart && localDate <= monthEnd,
  )
  const distribution = focusByCategory(monthSessions, categories)
  const categoryNames = new Map(categories.map(({ id, name }) => [id, name]))

  return (
    <>
      <div className="summary-grid focus-summary" aria-label="专注汇总">
        <article>
          <span>今日专注</span>
          <strong>{durationLabel(todaySummary.durationSeconds)}</strong>
          <small>{todaySummary.count} 次</small>
        </article>
        <article>
          <span>本周专注</span>
          <strong>{durationLabel(weekSummary.durationSeconds)}</strong>
          <small>{weekSummary.count} 次</small>
        </article>
      </div>
      {distribution.length > 0 ? (
        <section className="content-section" aria-labelledby="focus-category-title">
          <h2 id="focus-category-title">本月分类</h2>
          <ul className="breakdown-list">
            {distribution.map((item) => (
              <li key={item.categoryId}>
                <span>{item.name}</span>
                <strong>{durationLabel(item.durationSeconds)}</strong>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <section className="content-section" aria-labelledby="focus-history-title">
        <h2 id="focus-history-title">最近记录</h2>
        {editing ? (
          <FocusEditForm
            key={editing.id}
            session={editing}
            categories={categories}
            onCancel={() => onEdit(undefined)}
            onSave={(command) => onSave(editing, command)}
          />
        ) : null}
        {sessions.length === 0 ? (
          <p className="empty-state">完成一次专注后，时长会安静地留在这里。</p>
        ) : (
          <ul className="record-list">
            {sessions.map((session) => (
              <li key={session.id}>
                <div className="record-main">
                  <span>{session.title}</span>
                  <strong>{durationLabel(session.durationSeconds ?? 0)}</strong>
                </div>
                <p>
                  {session.localDate} ·{' '}
                  {session.categoryId
                    ? (categoryNames.get(session.categoryId) ?? '已归档分类')
                    : '未分类'}{' '}
                  · {session.completionKind === 'early' ? '提前结束' : '计时完成'}
                </p>
                <div className="row-actions">
                  <button type="button" onClick={() => onEdit(session)}>
                    编辑
                  </button>
                  <button
                    type="button"
                    className="text-destructive"
                    onClick={() => onDelete(session)}
                  >
                    删除
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  )
}
