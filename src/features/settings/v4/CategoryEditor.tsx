import { useRef, useState, type FormEvent } from 'react'
import { useV4Services } from '@/app/v4/Services'
import { useDirtyGuard } from '@/app/v4/useDirtyGuard'
import { useConfirm } from '@/app/v4/Confirmation'
import { useFlow } from '@/app/v4/Flow'
import type { Category, CategoryScope, IconKey, Stamp } from '@/core/types'
import { ICON_KEYS, LIMITS } from '@/core/validation'
import { Modal } from '@/shared/ui/v4/Modal'
import { Icon } from '@/shared/ui/v4/Icon'
import { errorMessage } from '@/shared/v4/format'
import { retainedIntent, type WriteIntent } from '@/features/today/v4/intent'
import { logger } from '@/shared/logging/logger'

const labels: Record<IconKey, string> = {
  today: '每日',
  health: '健康',
  focus: '专注',
  finance: '财务',
  activity: '运动',
  weight: '体重',
  leaf: '自然',
  book: '阅读',
  cup: '饮食',
  bag: '生活',
  arrow: '前行',
}
export function CategoryEditor({
  scope,
  category,
  stamp,
  onClose,
}: {
  scope: CategoryScope
  category: Category | null
  stamp: Stamp
  onClose: () => void
}) {
  const services = useV4Services(),
    confirm = useConfirm(),
    flow = useFlow(),
    [original] = useState({ scope, category, stamp }),
    [name, setName] = useState(category?.name ?? ''),
    [iconKey, setIconKey] = useState<IconKey>(
      category?.iconKey ?? (scope === 'expense' || scope === 'income' ? 'finance' : scope),
    ),
    [error, setError] = useState<string | null>(null),
    [busy, setBusy] = useState(false),
    locked = useRef(false),
    intent = useRef<WriteIntent | null>(null),
    errorNode = useRef<HTMLParagraphElement>(null)
  const dirty =
      name !== (original.category?.name ?? '') ||
      iconKey !==
        (original.category?.iconKey ??
          (original.scope === 'expense' || original.scope === 'income'
            ? 'finance'
            : original.scope)),
    guard = useDirtyGuard({ dirty, busy })
  async function close() {
    if (locked.current) return
    if (
      dirty &&
      !(await confirm({
        title: '离开分类设置？',
        description: '尚未保存的修改会被丢弃。',
        confirmLabel: '放弃修改',
        cancelLabel: '继续编辑',
      }))
    )
      return
    guard.release()
    onClose()
  }
  async function save(event: FormEvent) {
    event.preventDefault()
    if (locked.current) return
    setError(null)
    if (!name.trim()) {
      setError('请填写分类名称。')
      requestAnimationFrame(() => errorNode.current?.focus())
      logger.warn('v4.categoryeditor.invalid', { failureClass: 'validation' })
      return
    }
    locked.current = true
    setBusy(true)
    logger.info('v4.categoryeditor.saving', { operation: original.category ? 'update' : 'create' })
    try {
      const input = { scope: original.scope, name: name.trim(), iconKey },
        ctx = retainedIntent(intent, JSON.stringify(input), original.stamp)
      if (original.category)
        await services.categories.update(
          { id: original.category.id, expectedEntityRevision: original.category.revision },
          input,
          ctx,
        )
      else await services.categories.create(input, ctx)
      intent.current = null
      logger.info('v4.categoryeditor.saved')
      guard.release()
      onClose()
      flow.notify('分类已保存。')
    } catch (error) {
      const candidate = error as { code?: string; field?: string }
      setError(
        candidate.code === 'Validation' && candidate.field === 'name'
          ? '同一领域已有可用的同名分类，请换一个名称。'
          : errorMessage(error),
      )
      logger.warn('v4.categoryeditor.failed', { failureClass: 'command' })
      requestAnimationFrame(() => errorNode.current?.focus())
    } finally {
      locked.current = false
      setBusy(false)
    }
  }
  return (
    <Modal title={category ? '编辑分类' : '新增分类'} onClose={() => void close()} busy={busy}>
      <form onSubmit={(event) => void save(event)} aria-busy={busy} noValidate>
        <div className="modal-content">
          {error && (
            <p className="field-error" role="alert" ref={errorNode} tabIndex={-1}>
              {error}
            </p>
          )}
          <p>
            {{ expense: '支出', income: '收入', activity: '运动', focus: '专注' }[original.scope]}
            分类{category?.status === 'archived' ? ' · 已归档，可先改名再重新启用' : ''}
          </p>
          <label className="field">
            <span>分类名称</span>
            <input
              data-initial-focus
              maxLength={LIMITS.categoryName}
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={busy}
              required
            />
          </label>
          <fieldset className="v4-icon-picker" disabled={busy}>
            <legend>分类图形</legend>
            <div>
              {ICON_KEYS.map((key) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={key === iconKey}
                  onClick={() => setIconKey(key)}
                >
                  <Icon name={key} />
                  <span>{labels[key]}</span>
                </button>
              ))}
            </div>
          </fieldset>
          <p className="v4-scope-note">
            分类领域固定。改名会同步已有记录中的分类显示，备注保持原样。
          </p>
        </div>
        <footer className="modal-footer">
          <button className="button" type="submit" disabled={busy}>
            {busy ? '正在保存…' : '保存分类'}
          </button>
        </footer>
      </form>
    </Modal>
  )
}
