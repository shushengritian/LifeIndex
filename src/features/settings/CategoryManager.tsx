import { useRef, useState, type FormEvent } from 'react'
import type { CategoryRepository } from '@/data/repositories/CategoryRepository'
import type { Category, CategoryDomain, TransactionType } from '@/shared/domain/types'
import { CategoryIcon } from '@/shared/ui/CategoryIcon'
import { CategoryIconPicker } from '@/shared/ui/CategoryIconPicker'
import { Sheet } from '@/shared/ui/Sheet'
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog'
import { Icon } from '@/shared/ui/Icon'
import { useDirtyForm } from '@/pwa/useDirtyForm'
import { logger } from '@/shared/logging/logger'

const groups = [
  ['expense', '支出'],
  ['income', '收入'],
  ['focus', '专注'],
  ['activity', '运动'],
] as const
type Group = (typeof groups)[number][0]
const colors: Array<[Category['color'], string]> = [
  ['blue', '蓝色'],
  ['sage', '绿色'],
  ['amber', '琥珀'],
  ['rose', '玫瑰'],
  ['violet', '紫色'],
  ['slate', '灰色'],
]

export function CategoryManager({
  repository,
  categories,
  onError,
}: {
  repository: CategoryRepository
  categories: Category[]
  onError: (message: string) => void
}) {
  const [group, setGroup] = useState<Group>('expense')
  const [parentId, setParentId] = useState<string>()
  const [editor, setEditor] = useState<{ category?: Category }>()
  const [archiveTarget, setArchiveTarget] = useState<Category>()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const lock = useRef(false)
  useDirtyForm(false, busy)
  const domain: CategoryDomain = group === 'expense' || group === 'income' ? 'finance' : group
  const parent = categories.find(({ id }) => id === parentId)
  const rows = categories.filter(
    (c) =>
      c.domain === domain &&
      (domain !== 'finance' || c.transactionType === group) &&
      c.parentId === parentId,
  )
  const active = rows.filter((c) => !c.archived)
  const archived = rows.filter((c) => c.archived)
  async function write(action: () => Promise<unknown>) {
    if (lock.current) return
    lock.current = true
    setBusy(true)
    setError('')
    onError('')
    logger.info('category.manager.writestarted', { operation: 'update' })
    try {
      await action()
      setArchiveTarget(undefined)
    } catch {
      setError('分类未能更新，原有记录未改变。请重试。')
      logger.warn('category.manager.writefailed', { operation: 'update', failureClass: 'Write' })
    } finally {
      lock.current = false
      setBusy(false)
    }
  }
  function open(category: Category) {
    if (busy) return
    // Finance roots own child navigation; non-finance categories are always edited directly.
    if (domain === 'finance' && !category.parentId) {
      setParentId(category.id)
      logger.info('category.manager.entered', { operation: 'open', toState: 'children' })
    } else setEditor({ category })
  }
  async function move(index: number, direction: -1 | 1) {
    const next = [...active],
      target = index + direction
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target]!, next[index]!]
    await write(() => repository.reorder(next.map((c) => c.id)))
  }
  return (
    <section className="settings-section" aria-labelledby="category-management-title">
      <h2 id="category-management-title">分类</h2>
      <details className="category-manager-disclosure">
        <summary>
          <span className="category-glyph tone-amber">
            <CategoryIcon name="bag" />
          </span>
          <span>
            <strong>分类管理</strong>
            <small>支出、收入、专注与运动</small>
          </span>
          <Icon name="next" size={18} />
        </summary>
        <div className="category-manager-content">
          {parent ? (
            <>
              <button type="button" disabled={busy} onClick={() => setParentId(undefined)}>
                返回一级分类
              </button>
              <div className="category-detail-heading">
                <CategoryIcon name={parent.icon} />
                <h3>{parent.name}</h3>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setEditor({ category: parent })}
                >
                  编辑一级分类
                </button>
              </div>
              <p className="helper">
                {parent.archived
                  ? '一级分类已归档，恢复后才能新增或选择二级分类。'
                  : '可直接记到一级分类，也可选择更具体的二级分类。'}
              </p>
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  parent.archived
                    ? void write(() => repository.setArchived(parent.id, false))
                    : setArchiveTarget(parent)
                }
              >
                {parent.archived ? '恢复一级分类' : '归档一级分类'}
              </button>
            </>
          ) : (
            <div className="segmented-control category-domain-tabs" aria-label="分类类型">
              {groups.map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  disabled={busy}
                  aria-pressed={group === id}
                  onClick={() => setGroup(id)}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
          <button
            className="button-primary"
            type="button"
            disabled={busy || Boolean(parent?.archived)}
            onClick={() => setEditor({})}
          >
            {parent ? '新增二级分类' : '新增分类'}
          </button>
          {error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}
          <ul className="category-drilldown-list">
            {active.map((category, index) => (
              <li key={category.id}>
                <button
                  type="button"
                  className="category-open"
                  disabled={busy}
                  onClick={() => open(category)}
                >
                  <span className={`category-glyph tone-${category.color}`}>
                    <CategoryIcon name={category.icon} />
                  </span>
                  <span>{category.name}</span>
                  <span aria-hidden="true">›</span>
                </button>
                <div className="category-row-actions">
                  <button
                    type="button"
                    disabled={busy || index === 0}
                    aria-label={`上移 ${category.name}`}
                    onClick={() => void move(index, -1)}
                  >
                    上移
                  </button>
                  <button
                    type="button"
                    disabled={busy || index === active.length - 1}
                    aria-label={`下移 ${category.name}`}
                    onClick={() => void move(index, 1)}
                  >
                    下移
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    aria-label={`归档 ${category.name}`}
                    onClick={() => setArchiveTarget(category)}
                  >
                    归档
                  </button>
                </div>
              </li>
            ))}
          </ul>
          {!active.length && (
            <p className="empty-state">
              {parent
                ? '还没有二级分类。新增后可以更细致地记账。'
                : '还没有可用分类。可以新增或恢复已归档分类。'}
            </p>
          )}
          {!!archived.length && (
            <details key={parentId ?? group}>
              <summary>已归档分类（{archived.length}）</summary>
              <ul className="category-drilldown-list">
                {archived.map((c) => (
                  <li key={c.id}>
                    <button
                      className="category-open"
                      type="button"
                      disabled={busy}
                      onClick={() => open(c)}
                    >
                      <CategoryIcon name={c.icon} />
                      {c.name}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void write(() => repository.setArchived(c.id, false))}
                    >
                      恢复
                    </button>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      </details>
      {editor && (
        <Sheet title={editor.category ? '编辑分类' : parent ? '新增二级分类' : '新增分类'}>
          <CategoryEditor
            key={editor.category?.id ?? 'new'}
            category={editor.category}
            onClose={() => setEditor(undefined)}
            onSave={async (values) => {
              if (editor.category) await repository.update(editor.category.id, values)
              else
                await repository.create({
                  ...values,
                  domain,
                  ...(domain === 'finance' ? { transactionType: group as TransactionType } : {}),
                  ...(parentId ? { parentId } : {}),
                })
              setEditor(undefined)
            }}
          />
        </Sheet>
      )}
      {archiveTarget && (
        <ConfirmDialog
          title="归档这个分类？"
          description="新记录将不能选择它及其二级分类，已有记录保持不变。之后可以恢复。"
          confirmLabel="归档分类"
          busy={busy}
          error={error}
          onCancel={() => {
            setArchiveTarget(undefined)
            setError('')
          }}
          onConfirm={() => void write(() => repository.archive(archiveTarget.id))}
        />
      )}
    </section>
  )
}

function CategoryEditor({
  category,
  onClose,
  onSave,
}: {
  category?: Category | undefined
  onClose: () => void
  onSave: (values: { name: string; icon: string; color: Category['color'] }) => Promise<void>
}) {
  const [name, setName] = useState(category?.name ?? '')
  const [icon, setIcon] = useState(category?.icon ?? 'food')
  const [color, setColor] = useState<Category['color']>(category?.color ?? 'blue')
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [discard, setDiscard] = useState(false)
  const lock = useRef(false)
  const dirty =
    name !== (category?.name ?? '') ||
    icon !== (category?.icon ?? 'food') ||
    color !== (category?.color ?? 'blue')
  useDirtyForm(dirty, busy)
  function close() {
    if (lock.current) return
    if (dirty) setDiscard(true)
    else onClose()
  }
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (lock.current) return
    if (!name.trim()) {
      logger.warn('category.editor.validationfailed', {
        operation: 'save',
        failureClass: 'Validation',
      })
      setError('请填写分类名称。')
      return
    }
    lock.current = true
    setBusy(true)
    setError('')
    logger.info('category.editor.savestarted', { operation: category ? 'update' : 'create' })
    try {
      await onSave({ name: name.trim(), icon, color })
      logger.info('category.editor.saved', { operation: 'save' })
    } catch {
      setError('未能保存，名字和图标已保留。请重试。')
      logger.warn('category.editor.savefailed', { operation: 'save', failureClass: 'Write' })
    } finally {
      lock.current = false
      setBusy(false)
    }
  }
  return (
    <form
      className="sheet-form category-editor"
      aria-label="分类编辑"
      onSubmit={(event) => void submit(event)}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && !discard) {
          event.preventDefault()
          close()
        }
      }}
    >
      <label>
        分类名称
        <input
          autoFocus
          required
          maxLength={40}
          disabled={busy}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </label>
      <CategoryIconPicker value={icon} onChange={setIcon} disabled={busy} />
      <fieldset className="category-color-picker" disabled={busy}>
        <legend>图标颜色</legend>
        {colors.map(([id, label]) => (
          <button key={id} type="button" aria-pressed={color === id} onClick={() => setColor(id)}>
            <span className={`category-glyph tone-${id}`}>
              <CategoryIcon name={icon} />
            </span>
            {label}
          </button>
        ))}
      </fieldset>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      <div className="form-actions">
        <button type="button" disabled={busy} onClick={close}>
          取消
        </button>
        <button className="button-primary" disabled={busy}>
          {busy ? '保存中…' : '保存分类'}
        </button>
      </div>
      {discard && (
        <ConfirmDialog
          title="放弃分类修改？"
          description="尚未保存的名字、图标和颜色将被丢弃。"
          confirmLabel="放弃修改"
          onCancel={() => setDiscard(false)}
          onConfirm={onClose}
        />
      )}
    </form>
  )
}
