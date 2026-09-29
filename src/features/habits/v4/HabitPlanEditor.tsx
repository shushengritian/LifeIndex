import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useV4Services } from '@/app/v4/Services'
import { useV4Query } from '@/app/v4/useQuery'
import { useDirtyGuard } from '@/app/v4/useDirtyGuard'
import { useConfirm } from '@/app/v4/Confirmation'
import { useFlow } from '@/app/v4/Flow'
import type { Habit, IconKey, Snapshot } from '@/core/types'
import { PageHeading, Feedback } from '@/shared/ui/v4/Elements'
import { Icon } from '@/shared/ui/v4/Icon'
import { errorMessage } from '@/shared/v4/format'
import { logger } from '@/shared/logging/logger'
import { retainedIntent, type WriteIntent } from '@/features/today/v4/intent'

const choices: { key: IconKey; label: string }[] = [
  { key: 'today', label: '每日' },
  { key: 'health', label: '健康' },
  { key: 'focus', label: '专注' },
  { key: 'finance', label: '理财' },
  { key: 'activity', label: '运动' },
  { key: 'weight', label: '体重' },
  { key: 'leaf', label: '自然' },
  { key: 'book', label: '阅读' },
  { key: 'cup', label: '饮食' },
  { key: 'bag', label: '生活' },
  { key: 'arrow', label: '前行' },
]
function PlanForm({ snapshot }: { snapshot: Snapshot<Habit | null> }) {
  const services = useV4Services(),
    navigate = useNavigate(),
    location = useLocation(),
    confirm = useConfirm(),
    flow = useFlow(),
    [original] = useState(snapshot),
    habit = original.data,
    [name, setName] = useState(habit?.name ?? ''),
    [iconKey, setIconKey] = useState<IconKey>(habit?.iconKey ?? 'leaf'),
    [days, setDays] = useState(habit?.scheduleWeekdays ?? [1, 2, 3, 4, 5, 6, 7]),
    [note, setNote] = useState(habit?.note ?? ''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null),
    locked = useRef(false),
    intent = useRef<WriteIntent | null>(null),
    errorNode = useRef<HTMLParagraphElement>(null)
  const dirty =
      name !== (habit?.name ?? '') ||
      iconKey !== (habit?.iconKey ?? 'leaf') ||
      days.join(',') !== (habit?.scheduleWeekdays ?? [1, 2, 3, 4, 5, 6, 7]).join(',') ||
      note !== (habit?.note ?? ''),
    guard = useDirtyGuard({ dirty, busy })
  const search = new URLSearchParams(location.search)
  search.delete('edit')
  const back = habit
    ? `/health/habits/${habit.id}${search.size ? '?' + search.toString() : ''}`
    : '/health/habits'
  async function cancel() {
    if (locked.current) return
    if (
      dirty &&
      !(await confirm({
        title: '离开这份计划？',
        description: '尚未保存的修改会被丢弃。',
        confirmLabel: '放弃修改',
        cancelLabel: '继续编辑',
      }))
    )
      return
    guard.release()
    navigate(back)
  }
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (locked.current) return
    setError(null)
    if (!name.trim() || !days.length) {
      setError(!name.trim() ? '请填写习惯名称。' : '请至少选择一天。')
      logger.warn('v4.habitplan.invalid', { failureClass: 'validation' })
      requestAnimationFrame(() => errorNode.current?.focus())
      return
    }
    locked.current = true
    setBusy(true)
    logger.info('v4.habitplan.saving', { operation: habit ? 'update' : 'create' })
    try {
      const input = {
          name: name.trim(),
          iconKey,
          scheduleWeekdays: days,
          ...(note ? { note } : {}),
        },
        ctx = retainedIntent(intent, JSON.stringify(input), original.stamp)
      // Editing owns a frozen source stamp. A restore or concurrent edit cannot silently replace this draft's origin.
      const saved = habit
        ? await services.habits.update(
            { id: habit.id, expectedEntityRevision: habit.revision },
            input,
            ctx,
          )
        : await services.habits.create(input, ctx)
      intent.current = null
      logger.info('v4.habitplan.saved', { operation: habit ? 'update' : 'create' })
      guard.release()
      navigate(`/health/habits/${saved.data.id}`)
      flow.notify(habit ? '习惯计划已更新。' : '习惯已创建。')
    } catch (error) {
      setError(errorMessage(error))
      logger.warn('v4.habitplan.failed', { failureClass: 'command' })
      requestAnimationFrame(() => errorNode.current?.focus())
    } finally {
      locked.current = false
      setBusy(false)
    }
  }
  return (
    <>
      <PageHeading
        title={habit ? '编辑习惯计划' : '留一个小习惯'}
        description="按自己的频率重复，不必追求连续完美。"
      />
      <form
        className="v4-plan-form"
        onSubmit={(event) => void submit(event)}
        aria-busy={busy}
        noValidate
      >
        {error && (
          <p className="field-error" role="alert" tabIndex={-1} ref={errorNode}>
            {error}
          </p>
        )}
        <label className="field">
          <span>习惯名称</span>
          <input
            autoFocus
            maxLength={40}
            value={name}
            onChange={(event) => setName(event.target.value)}
            disabled={busy}
            placeholder="一个想重复的小动作"
            required
          />
        </label>
        <fieldset disabled={busy} className="v4-weekday-field">
          <legend>每周重复 · 至少选择一天</legend>
          <div>
            {[1, 2, 3, 4, 5, 6, 7].map((day) => (
              <label key={day}>
                <input
                  type="checkbox"
                  value={day}
                  checked={days.includes(day)}
                  onChange={(event) =>
                    setDays((value) =>
                      event.target.checked
                        ? [...value, day].sort((a, b) => a - b)
                        : value.filter((item) => item !== day),
                    )
                  }
                />
                <span>周{'一二三四五六日'[day - 1]}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset className="v4-icon-picker" disabled={busy}>
          <legend>习惯图形</legend>
          <div>
            {choices.map((choice) => (
              <button
                type="button"
                key={choice.key}
                aria-pressed={iconKey === choice.key}
                onClick={() => setIconKey(choice.key)}
              >
                <Icon name={choice.key} />
                <span>{choice.label}</span>
              </button>
            ))}
          </div>
        </fieldset>
        <label className="field">
          <span>备注（选填）</span>
          <textarea
            maxLength={1000}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            disabled={busy}
            rows={3}
          />
        </label>
        <p className="v4-scope-note">
          计划变更从今天起生效，已有完成记录保持原样。不使用当前计划推算过去缺勤。
        </p>
        <div className="v4-form-actions">
          <button
            type="button"
            className="button secondary"
            disabled={busy}
            onClick={() => void cancel()}
          >
            取消
          </button>
          <button className="button" type="submit" disabled={busy}>
            {busy ? '正在保存…' : '保存习惯'}
          </button>
        </div>
      </form>
    </>
  )
}
export function HabitPlanEditor({ id }: { id?: string }) {
  const services = useV4Services(),
    query = useV4Query(
      useCallback(async (): Promise<Snapshot<Habit | null>> => {
        if (id) return services.habits.getById(id)
        const result = await services.habits.list()
        return { data: null, stamp: result.stamp }
      }, [services, id]),
    )
  const [source, setSource] = useState<Snapshot<Habit | null>>()
  // A live observation must never unmount an active draft after another tab deletes its source.
  if (!source && query.snapshot && (!id || query.snapshot.data)) setSource(query.snapshot)
  useEffect(() => {
    if (source) logger.info('v4.habitplan.draft.opened', { operation: id ? 'update' : 'create' })
  }, [source, id])
  return source ? (
    <>
      {query.status === 'failed' && (
        <Feedback kind="error" title="刷新失败，当前草稿已保留" onRetry={query.retry} />
      )}
      {id && query.status === 'ready' && !query.snapshot?.data && (
        <p role="status">这个习惯已在其他页面删除。当前草稿仍保留，保存时会检查冲突。</p>
      )}
      <PlanForm snapshot={source} />
    </>
  ) : query.status === 'loading' ? (
    <Feedback kind="loading" title="正在打开习惯计划" />
  ) : query.status === 'failed' ? (
    <Feedback kind="error" title="习惯计划暂时读不到" onRetry={query.retry} />
  ) : query.snapshot ? (
    id && !query.snapshot.data ? (
      <Feedback kind="empty" title="这个习惯已不存在">
        返回习惯列表重新查看。
      </Feedback>
    ) : (
      <PlanForm snapshot={query.snapshot} />
    )
  ) : null
}
