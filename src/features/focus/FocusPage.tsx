import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react'
import { Link } from 'react-router-dom'
import { useFocusCompletion } from './useFocusCompletion'

import { useAppServices } from '@/app/AppServicesContext'
import { CategoryRepository } from '@/data/repositories/CategoryRepository'
import {
  FocusRepository,
  type StartFocusCommand,
  type UpdateFocusDetailsCommand,
} from '@/data/repositories/FocusRepository'
import {
  focusByCategory,
  focusProgress,
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
import { Sheet } from '@/shared/ui/Sheet'
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog'
import { CategoryIcon } from '@/shared/ui/CategoryIcon'
import { Icon } from '@/shared/ui/Icon'

function FocusStage({
  seconds,
  planned,
  running = false,
  action,
}: {
  seconds: number
  planned: number
  running?: boolean
  action?: ReactNode
}) {
  // The arc is a presentation of elapsed time; persisted timestamps remain the timing authority.
  const { elapsed, percent: progress } = focusProgress(seconds, planned, running)
  useEffect(() => {
    // Log mode changes only, never per-second activity or the user's title/duration.
    logger.info('focus.stage.modechanged', { toState: running ? 'running' : 'ready' })
  }, [running])
  return (
    <div
      className="focus-stage"
      aria-label={`${running ? (seconds === 0 ? '待保存时长' : '剩余') : '计划'} ${durationLabel(running && seconds === 0 ? elapsed : seconds)}`}
    >
      <svg className="focus-orbit" viewBox="0 0 390 294" aria-hidden="true">
        <path
          d="M43 233 A169 169 0 0 1 304 49"
          fill="none"
          stroke="var(--divider)"
          strokeWidth="1.5"
        />
        <path
          d="M43 233 A169 169 0 0 1 304 49"
          fill="none"
          stroke="var(--accent)"
          strokeWidth="3"
          strokeLinecap="round"
          pathLength="100"
          strokeDasharray="100"
          strokeDashoffset={100 - progress}
        />
        <circle cx="43" cy="233" r="4" fill="var(--accent)" />
      </svg>
      <span>
        {running ? (seconds === 0 ? '计时完成，等待保存' : '正在专注') : '准备好，进入专注'}
      </span>
      <strong
        role="timer"
        aria-live="off"
        className={seconds >= 3600 ? 'focus-clock long' : 'focus-clock'}
      >
        {formatFocusDuration(running && seconds === 0 ? elapsed : seconds)}
      </strong>
      <small>
        {running
          ? seconds === 0
            ? '保存成功后计入汇总'
            : '离开此页不会停止计时'
          : '留一点空间，让注意力安静下来'}
      </small>
      {action}
      {/* Keep changing facts in HTML, not tiny SVG labels; do not announce every second to VoiceOver. */}
      <div className="focus-progress-labels" aria-live="off">
        <span>
          已专注 <strong>{formatFocusDuration(elapsed)}</strong>
        </span>
        <span>
          目标 <strong>{planned / 60} 分钟</strong>
        </span>
      </div>
    </div>
  )
}

function durationLabel(seconds: number): string {
  // Keep recorded seconds exact: rounding creates misleading totals near minute boundaries.
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainder = Math.floor(seconds % 60)
  return [
    hours ? `${hours} 小时` : '',
    minutes ? `${minutes} 分钟` : '',
    remainder || !seconds ? `${remainder} 秒` : '',
  ]
    .filter(Boolean)
    .join(' ')
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
  const startLock = useRef(false)
  const previewSeconds =
    duration === 'custom' && Number.isFinite(Number(customMinutes))
      ? Number(customMinutes) * 60
      : Number(duration === 'custom' ? 0 : duration)

  // Starting a session must settle before leaving; running sessions remain navigable.
  useDirtyForm(
    duration !== '1500' ||
      customMinutes !== '25' ||
      title !== '' ||
      categoryId !== '' ||
      note !== '',
    saving,
  )

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (startLock.current) return
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
    startLock.current = true
    setSaving(true)
    logger.info('focus.form.started', { operation: 'start' })
    try {
      await onStart({
        title: title.trim(),
        plannedDurationSeconds,
        ...(categoryId ? { categoryId } : {}),
        ...(note.trim() ? { note: note.trim() } : {}),
      })
      logger.info('focus.form.saved', { operation: 'start' })
    } catch {
      logger.warn('focus.form.failed', { operation: 'start', failureClass: 'Write' })
      setError('未能开始专注，本次输入仍保留。请重试。')
    } finally {
      startLock.current = false
      setSaving(false)
    }
  }

  return (
    <form
      className="entry-form focus-start-form"
      onSubmit={(event) => void submit(event)}
      aria-label="开始专注"
    >
      <FocusStage
        seconds={Math.max(0, Math.min(14_400, previewSeconds))}
        planned={Math.max(0, Math.min(14_400, previewSeconds))}
        action={
          <button className="button-primary focus-stage-action" type="submit" disabled={saving}>
            <Icon name="play" size={24} />
            <span>{saving ? '正在开始…' : '开始专注'}</span>
          </button>
        }
      />
      <div className="duration-presets" aria-label="专注时长">
        {[
          { value: '1500', label: '25 分钟' },
          { value: '3000', label: '50 分钟' },
          { value: 'custom', label: '自定义' },
        ].map(({ value, label }) => (
          <button
            key={value}
            type="button"
            disabled={saving}
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
            disabled={saving}
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
          disabled={saving}
          value={title}
          maxLength={100}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="例如：阅读一章"
        />
      </label>
      <details className="focus-extras">
        <summary>分类与备注（可选）</summary>
        <label>
          分类（可选）
          <select
            disabled={saving}
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
          >
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
          <input
            disabled={saving}
            value={note}
            maxLength={500}
            onChange={(event) => setNote(event.target.value)}
          />
        </label>
      </details>
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  )
}

function FocusEditForm({
  session,
  categories,
  onCancel,
  onSave,
  onDelete,
}: {
  session: FocusSession
  categories: Category[]
  onCancel: () => void
  onSave: (command: UpdateFocusDetailsCommand) => Promise<void>
  onDelete: () => Promise<void>
}) {
  const [title, setTitle] = useState(session.title)
  const [categoryId, setCategoryId] = useState(session.categoryId ?? '')
  const [note, setNote] = useState(session.note ?? '')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const writeLock = useRef(false)
  const [confirmation, setConfirmation] = useState<'discard' | 'delete'>()
  const bodyRef = useRef<HTMLDivElement>(null)
  const errorRef = useRef<HTMLParagraphElement>(null)
  useEffect(() => {
    // A delete/discard confirmation owns focus until dismissed; never focus behind its top layer.
    if (!error || confirmation) return
    errorRef.current?.focus({ preventScroll: true })
    if (bodyRef.current) bodyRef.current.scrollTop = 0
    logger.info('focus.details.errorfocused', { operation: 'focus', reason: 'failure' })
  }, [error, confirmation])
  const dirty =
    title !== session.title ||
    categoryId !== (session.categoryId ?? '') ||
    note !== (session.note ?? '')

  useDirtyForm(dirty, saving)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    // Protect both duplicate submission and navigation until the repository settles.
    if (writeLock.current) return
    if (!title.trim()) {
      logger.warn('focus.details.validationfailed', {
        operation: 'update',
        failureClass: 'Validation',
      })
      setError('专注标题不能为空。')
      return
    }
    writeLock.current = true
    setSaving(true)
    setError('')
    logger.info('focus.details.savestarted', { operation: 'update' })
    try {
      await onSave({
        title: title.trim(),
        ...(categoryId ? { categoryId } : {}),
        ...(note.trim() ? { note: note.trim() } : {}),
      })
      logger.info('focus.details.saved', { operation: 'update' })
    } catch {
      logger.warn('focus.details.savefailed', { operation: 'update', failureClass: 'Write' })
      setError('未能保存描述，计时时长没有改变。')
    } finally {
      writeLock.current = false
      setSaving(false)
    }
  }

  function close() {
    if (writeLock.current) return
    if (dirty) {
      logger.info('focus.details.discardrequested', { operation: 'close' })
      setConfirmation('discard')
    } else onCancel()
  }

  async function remove() {
    if (writeLock.current) return
    writeLock.current = true
    setSaving(true)
    setError('')
    logger.info('focus.details.deletestarted', { operation: 'delete' })
    try {
      await onDelete()
      logger.info('focus.details.deleted', { operation: 'delete' })
    } catch {
      logger.warn('focus.details.deletefailed', { operation: 'delete', failureClass: 'Write' })
      setError('未能删除，记录和草稿仍保留，请重试。')
    } finally {
      writeLock.current = false
      setSaving(false)
    }
  }

  return (
    <Sheet title="专注详情" structured busy={saving} onClose={close}>
      <form
        className="entry-form focus-details-form sheet-form--structured"
        onSubmit={(event) => void submit(event)}
        aria-label="编辑专注记录"
      >
        {/* Only fields scroll; shared Sheet owns Escape so confirmation cannot close the draft. */}
        <div className="sheet-form-body" ref={bodyRef}>
          {error ? (
            <p className="form-error" role="alert" tabIndex={-1} ref={errorRef}>
              {error}
            </p>
          ) : null}
          <fieldset className="sheet-form-fields" disabled={saving}>
            {/* Time facts are immutable here; only descriptive fields can be edited. */}
            <dl className="focus-facts">
              <div>
                <dt>开始时间</dt>
                <dd>{new Date(session.startedAt).toLocaleString('zh-CN')}</dd>
              </div>
              <div>
                <dt>结束时间</dt>
                <dd>{session.endedAt ? new Date(session.endedAt).toLocaleString('zh-CN') : '—'}</dd>
              </div>
              <div>
                <dt>实际专注</dt>
                <dd>
                  {durationLabel(session.durationSeconds ?? 0)} ·{' '}
                  {session.completionKind === 'early' ? '提前结束' : '计时完成'}
                </dd>
              </div>
            </dl>
            <label>
              专注标题
              <input
                autoFocus
                disabled={saving}
                value={title}
                maxLength={100}
                onChange={(event) => setTitle(event.target.value)}
              />
            </label>
            <label>
              分类（可选）
              <select
                disabled={saving}
                value={categoryId}
                onChange={(event) => setCategoryId(event.target.value)}
              >
                <option value="">未分类</option>
                {categories
                  .filter((category) => !category.archived || category.id === session.categoryId)
                  .map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                      {category.archived ? '（已归档）' : ''}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              备注（可选）
              <input
                disabled={saving}
                value={note}
                maxLength={500}
                onChange={(event) => setNote(event.target.value)}
              />
            </label>
            <button
              type="button"
              className="button-secondary text-destructive"
              disabled={saving}
              onClick={() => {
                setError('')
                setConfirmation('delete')
                logger.info('focus.details.deleterequested', { operation: 'delete' })
              }}
            >
              删除记录
            </button>
          </fieldset>
        </div>
        <div className="form-actions sheet-form-footer">
          <button className="button-secondary" type="button" disabled={saving} onClick={close}>
            取消
          </button>
          <button className="button-primary" type="submit" disabled={saving}>
            {saving ? '保存中…' : '保存描述'}
          </button>
        </div>
      </form>
      {confirmation && (
        <ConfirmDialog
          title={confirmation === 'discard' ? '放弃修改？' : '删除专注记录？'}
          description={
            confirmation === 'discard'
              ? '未保存的描述修改将丢失，原始计时记录不受影响。'
              : '这条记录将被删除，时长不再计入汇总。此操作无法撤销。'
          }
          confirmLabel={confirmation === 'discard' ? '放弃修改' : '删除记录'}
          busy={saving}
          error={confirmation === 'delete' ? error : ''}
          onCancel={() => {
            if (!writeLock.current) setConfirmation(undefined)
          }}
          onConfirm={() => {
            if (confirmation === 'discard') onCancel()
            else void remove()
          }}
        />
      )}
    </Sheet>
  )
}

export function FocusHistoryPage() {
  return <FocusPage historyOnly />
}

export function FocusPage({ historyOnly = false }: { historyOnly?: boolean }) {
  const { database } = useAppServices()
  const repository = useMemo(() => new FocusRepository(database), [database])
  const categoryRepository = useMemo(() => new CategoryRepository(database), [database])
  const today = toLocalDateKey(new Date())
  const [editing, setEditing] = useState<FocusSession>()
  const [editCategories, setEditCategories] = useState<Category[]>([])
  const [pageError, setPageError] = useState('')
  const [pending, setPending] = useState<{ kind: 'finish' | 'cancel'; session: FocusSession }>()
  const [commandBusy, setCommandBusy] = useState(false)
  const commandLock = useRef(false)
  const endpoint = useRef<string | undefined>(undefined)
  const [manualPending, setManualPending] = useState(false)
  const [readRetry, setReadRetry] = useState(0)
  useDirtyForm(manualPending, commandBusy)

  const query = useCallback(async () => {
    // A failed live subscription needs a new identity to retry; this never writes records.
    void readRetry
    const [active, history, categories] = await Promise.all([
      repository.getActive(),
      repository.listCompleted({ from: '1000-01-01', to: '9999-12-31' }),
      categoryRepository.list({ domain: 'focus', includeArchived: true }),
    ])
    return { active, history, categories }
  }, [categoryRepository, repository, readRetry])
  const state = useLiveQueryState(query)
  const [lastReady, setLastReady] = useState<Awaited<ReturnType<typeof query>>>()
  // Preserve the mounted start form, its draft, and its busy guard across refresh failures.
  // Only a changed successful result updates this display snapshot; it is not a second database.
  if (state.status === 'ready' && state.data !== lastReady) setLastReady(state.data)
  const data = state.status === 'ready' ? state.data : lastReady
  useEffect(() => {
    if (state.status === 'failed') {
      logger.warn('focus.read.failed', { operation: 'read', failureClass: 'Read' })
    }
  }, [state.status])
  const active = state.status === 'ready' ? state.data.active : undefined

  const completion = useFocusCompletion(repository, active, manualPending || commandBusy)

  function requestCommand(kind: 'finish' | 'cancel', session: FocusSession) {
    if (completion.busy || commandLock.current) return
    endpoint.current = undefined
    setPageError('')
    setPending({ kind, session })
    logger.info('focus.command.requested', { operation: kind })
  }

  async function confirmCommand() {
    if (!pending || commandLock.current || completion.busy) return
    commandLock.current = true
    // Reuse the first confirmed endpoint on failed writes; retries must not accrue extra time.
    endpoint.current ??= new Date().toISOString()
    setManualPending(true)
    setCommandBusy(true)
    setPageError('')
    logger.info('focus.command.started', { operation: pending.kind })
    try {
      if (pending.kind === 'finish')
        await repository.finishEarly(pending.session.id, endpoint.current)
      else await repository.cancel(pending.session.id)
      logger.info('focus.command.saved', { operation: pending.kind })
      setPending(undefined)
      setManualPending(false)
      endpoint.current = undefined
    } catch {
      logger.warn('focus.command.failed', { operation: pending.kind, failureClass: 'Write' })
      setPageError('操作未能保存。请重试；返回计时会放弃本次操作，继续按原计划计时。')
    } finally {
      commandLock.current = false
      setCommandBusy(false)
    }
  }

  return (
    <section className="page focus-page" aria-labelledby="focus-title">
      {historyOnly && (
        <Link to="/focus" className="button-secondary">
          返回专注
        </Link>
      )}
      <h1 id="focus-title">{historyOnly ? '专注历史' : '专注'}</h1>
      {pageError && !pending ? (
        <p className="form-error" role="alert">
          {pageError}
        </p>
      ) : null}
      {completion.error && (
        <div role="alert" className="form-error">
          <p>{completion.error}</p>
          <button
            className="button-primary"
            type="button"
            disabled={completion.busy}
            onClick={() => void completion.retry()}
          >
            重试保存
          </button>
        </div>
      )}
      {completion.busy && <p role="status">正在保存本次专注…</p>}
      {state.status === 'loading' ? <p className="state-message">正在读取本地专注记录…</p> : null}
      {state.status === 'failed' ? (
        <div>
          <p className="form-error" role="alert">
            专注记录暂时无法读取，数据没有被清空。
          </p>
          <button
            type="button"
            className="button-secondary"
            onClick={() => {
              logger.info('focus.read.retryrequested', { operation: 'read' })
              setReadRetry((value) => value + 1)
            }}
          >
            重试读取
          </button>
        </div>
      ) : null}
      {data ? (
        <>
          {historyOnly ? null : data.active ? (
            <ActiveFocus
              session={data.active}
              now={new Date(completion.now)}
              onFinish={() => requestCommand('finish', data.active!)}
              onCancel={() => requestCommand('cancel', data.active!)}
              busy={commandBusy || completion.busy || manualPending}
            />
          ) : (
            <FocusForm
              categories={data.categories}
              onStart={async (command) => {
                await repository.start(command)
                // Resume a failed subscription after a committed write, so the active session is re-read.
                setReadRetry((value) => value + 1)
                logger.info('focus.read.refreshrequested', {
                  operation: 'read',
                  reason: 'start-saved',
                })
              }}
            />
          )}
          <FocusHistory
            expanded={historyOnly}
            sessions={data.history}
            categories={data.categories}
            today={today}
            onEdit={(session) => {
              // Snapshot editor choices so a failed background refresh cannot unmount a dirty form.
              setEditCategories(data.categories)
              setEditing(session)
              logger.info('focus.details.opened', { operation: 'edit' })
            }}
          />
        </>
      ) : null}
      {editing && (
        <FocusEditForm
          key={editing.id}
          session={editing}
          categories={editCategories}
          onCancel={() => setEditing(undefined)}
          onSave={async (command) => {
            await repository.updateDetails(editing.id, command)
            setEditing(undefined)
          }}
          onDelete={async () => {
            await repository.removeCompleted(editing.id)
            setEditing(undefined)
          }}
        />
      )}
      {pending && (
        <ConfirmDialog
          title={pending.kind === 'finish' ? '提前结束专注？' : '取消本次专注？'}
          description={
            pending.kind === 'finish'
              ? '保存已经专注的时间。未满一秒的会话不会保留。'
              : '本次计时不会保留，也不会计入汇总。'
          }
          confirmLabel={pending.kind === 'finish' ? '结束并保存' : '取消本次'}
          cancelLabel="返回计时"
          busy={commandBusy || completion.busy}
          error={pageError}
          onCancel={() => {
            if (commandLock.current) return
            setPending(undefined)
            setManualPending(false)
            endpoint.current = undefined
            setPageError('')
            logger.info('focus.command.abandoned', { operation: pending.kind })
          }}
          onConfirm={() => void confirmCommand()}
        />
      )}
    </section>
  )
}

function ActiveFocus({
  session,
  now,
  onFinish,
  onCancel,
  busy,
}: {
  session: FocusSession
  now: Date
  onFinish: () => void
  onCancel: () => void
  busy: boolean
}) {
  const remaining = remainingFocusSeconds(session, now)
  return (
    <section className="active-focus" aria-labelledby="active-focus-title">
      <h2 id="active-focus-title">{session.title}</h2>
      <FocusStage
        seconds={remaining}
        planned={session.plannedDurationSeconds}
        running
        action={
          <button
            className="button-primary focus-stage-action"
            type="button"
            disabled={remaining === 0 || busy}
            onClick={onFinish}
          >
            <Icon name="stop" size={24} />
            <span>提前结束</span>
          </button>
        }
      />
      <div className="focus-secondary-action">
        <button
          className="button-secondary"
          type="button"
          disabled={remaining === 0 || busy}
          onClick={onCancel}
        >
          取消本次
        </button>
      </div>
    </section>
  )
}

function FocusHistory({
  expanded,
  sessions,
  categories,
  today,
  onEdit,
}: {
  expanded: boolean
  sessions: FocusSession[]
  categories: Category[]
  today: string
  onEdit: (session: FocusSession | undefined) => void
}) {
  const [range, setRange] = useState<'all' | 'today' | 'week' | 'month'>('all')
  const weekStart = startOfLocalWeek(today)
  const weekEnd = addLocalDays(weekStart, 6)
  const monthStart = startOfLocalMonth(today)
  const monthEnd = endOfLocalMonth(today)
  const todaySummary = summarizeFocus(sessions.filter(({ localDate }) => localDate === today))
  const weekSummary = summarizeFocus(
    sessions.filter(({ localDate }) => localDate >= weekStart && localDate <= weekEnd),
  )
  // Both the category totals and records use the same local-calendar window.
  const visible = sessions.filter(({ localDate }) => {
    if (range === 'today') return localDate === today
    if (range === 'week') return localDate >= weekStart && localDate <= weekEnd
    if (range === 'month') return localDate >= monthStart && localDate <= monthEnd
    return true
  })
  const distribution = focusByCategory(visible, categories)
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
      {!expanded && <p className="focus-summary-note">汇总仅统计已完成并保存的专注</p>}
      {!expanded && (
        <Link className="button-secondary" to="/focus/history">
          查看专注历史
        </Link>
      )}
      {expanded && (
        <div className="duration-presets" role="group" aria-label="历史日期范围">
          {(
            [
              ['all', '全部'],
              ['today', '今天'],
              ['week', '本周'],
              ['month', '本月'],
            ] as const
          ).map(([value, label]) => (
            <button
              type="button"
              key={value}
              aria-pressed={range === value}
              onClick={() => {
                setRange(value)
                logger.info('focus.history.filtered', { operation: value })
              }}
            >
              {label}
            </button>
          ))}
        </div>
      )}
      {expanded && distribution.length > 0 ? (
        <section className="content-section" aria-labelledby="focus-category-title">
          <h2 id="focus-category-title">分类汇总</h2>
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
      {expanded && (
        <section className="content-section" aria-labelledby="focus-history-title">
          <h2 id="focus-history-title">最近记录</h2>
          {visible.length === 0 ? (
            <p className="empty-state">
              {sessions.length
                ? '这个时间范围还没有专注记录。可以切换日期范围查看。'
                : '完成一次专注后，时长会安静地留在这里。'}
            </p>
          ) : (
            <ul className="record-list">
              {visible.map((session) => (
                <li key={session.id}>
                  <span
                    className={`category-glyph tone-${categories.find(({ id }) => id === session.categoryId)?.color ?? 'violet'}`}
                  >
                    <CategoryIcon
                      name={categories.find(({ id }) => id === session.categoryId)?.icon ?? 'timer'}
                    />
                  </span>
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
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </>
  )
}
