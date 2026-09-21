import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react'
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
    if (lock.current) {
      logger.info('category.manager.writeblocked', { reason: 'busy', operation: 'update' })
      return
    }
    lock.current = true
    setBusy(true)
    setError('')
    onError('')
    logger.info('category.manager.writestarted', { operation: 'update' })
    try {
      await action()
      setArchiveTarget(undefined)
      logger.info('category.manager.writesucceeded', { operation: 'update' })
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
    } else {
      setEditor({ category })
      logger.info('category.manager.editoropened', { operation: 'edit', toState: 'editor' })
    }
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
              <button
                className="category-back"
                type="button"
                disabled={busy}
                onClick={() => {
                  setParentId(undefined)
                  logger.info('category.manager.returned', {
                    operation: 'navigate',
                    toState: 'roots',
                  })
                }}
              >
                <Icon name="back" size={16} />
                返回一级分类
              </button>
              <div className="category-detail-heading">
                <span className={`category-glyph tone-${parent.color}`}>
                  <CategoryIcon name={parent.icon} />
                </span>
                <h3>{parent.name}</h3>
                <CategoryMore name={parent.name} disabled={busy}>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setEditor({ category: parent })}
                  >
                    编辑一级分类
                  </button>
                  <button
                    type="button"
                    className={parent.archived ? '' : 'category-archive-action'}
                    disabled={busy}
                    onClick={() =>
                      parent.archived
                        ? void write(() => repository.setArchived(parent.id, false))
                        : setArchiveTarget(parent)
                    }
                  >
                    {parent.archived ? '恢复一级分类' : '归档一级分类'}
                  </button>
                </CategoryMore>
              </div>
              {Boolean(parent.archived) && (
                <p className="helper">一级分类已归档，恢复后才能新增或选择二级分类。</p>
              )}
            </>
          ) : (
            <div className="segmented-control category-domain-tabs" aria-label="分类类型">
              {groups.map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  disabled={busy}
                  aria-pressed={group === id}
                  onClick={() => {
                    setGroup(id)
                    logger.info('category.manager.groupchanged', {
                      operation: 'navigate',
                      toState: id,
                    })
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
          <div className="category-list-heading">
            <h3>{parent ? '二级分类' : groups.find(([id]) => id === group)?.[1]}</h3>
            <span className="category-list-count">{active.length}</span>
            <button
              className="category-add"
              type="button"
              aria-label={parent ? '新增二级分类' : '新增分类'}
              disabled={busy || Boolean(parent?.archived)}
              onClick={() => {
                setEditor({})
                logger.info('category.manager.editoropened', {
                  operation: 'create',
                  toState: parent ? 'child' : 'root',
                })
              }}
            >
              <Icon name="add" size={20} />
            </button>
          </div>
          {error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}
          <ul className="category-drilldown-list">
            {active.map((category, index) => (
              <li key={category.id} className={parent ? 'category-child-row' : undefined}>
                <button
                  type="button"
                  className="category-open"
                  disabled={busy}
                  onClick={() => open(category)}
                >
                  {!parent && (
                    <span className={`category-glyph tone-${category.color}`}>
                      <CategoryIcon name={category.icon} />
                    </span>
                  )}
                  <span className="category-row-name">{category.name}</span>
                  {!parent && domain === 'finance' && <Icon name="next" size={15} />}
                </button>
                <CategoryMore name={category.name} disabled={busy}>
                  <button type="button" disabled={busy} onClick={() => setEditor({ category })}>
                    编辑
                  </button>
                  {!parent && domain === 'finance' && (
                    <button type="button" disabled={busy} onClick={() => open(category)}>
                      二级分类
                    </button>
                  )}
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
                    className="category-archive-action"
                    onClick={() => setArchiveTarget(category)}
                  >
                    归档
                  </button>
                </CategoryMore>
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
                  <li key={c.id} className={parent ? 'category-child-row' : undefined}>
                    <button
                      className="category-open"
                      type="button"
                      disabled={busy}
                      onClick={() => open(c)}
                    >
                      {!parent && (
                        <span className={`category-glyph tone-${c.color}`}>
                          <CategoryIcon name={c.icon} />
                        </span>
                      )}
                      <span className="category-row-name">{c.name}</span>
                    </button>
                    <button
                      type="button"
                      className="category-restore"
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
        <CategoryEditor
          key={editor.category?.id ?? 'new'}
          category={editor.category}
          parent={editor.category && !editor.category.parentId ? undefined : parent}
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

function CategoryMore({
  name,
  disabled,
  children,
}: {
  name: string
  disabled: boolean
  children: ReactNode
}) {
  const [expanded, setExpanded] = useState(false)
  const region = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const panelId = useId()
  useEffect(() => {
    if (!expanded) return
    // A non-modal disclosure keeps native Tab navigation; outside clicks dismiss without
    // stealing focus, while Escape and action selection return focus to the row trigger.
    function outside(event: PointerEvent) {
      if (event.target instanceof Node && !region.current?.contains(event.target)) {
        setExpanded(false)
        logger.info('category.actions.dismissed', { operation: 'close', reason: 'outside' })
      }
    }
    document.addEventListener('pointerdown', outside)
    return () => document.removeEventListener('pointerdown', outside)
  }, [expanded])
  function close() {
    setExpanded(false)
    trigger.current?.focus()
    logger.info('category.actions.dismissed', { operation: 'close' })
  }
  return (
    <div
      className="category-more"
      ref={region}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && expanded) {
          event.preventDefault()
          event.stopPropagation()
          close()
        }
      }}
      onBlur={(event) => {
        if (
          event.relatedTarget instanceof Node &&
          !event.currentTarget.contains(event.relatedTarget)
        )
          setExpanded(false)
      }}
    >
      <button
        ref={trigger}
        type="button"
        className="category-more-trigger"
        disabled={disabled}
        aria-label={`更多 ${name}`}
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={() => {
          setExpanded(!expanded)
          logger.info('category.actions.toggled', { operation: expanded ? 'close' : 'open' })
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <circle cx="5" cy="12" r="1.6" />
          <circle cx="12" cy="12" r="1.6" />
          <circle cx="19" cy="12" r="1.6" />
        </svg>
      </button>
      <div
        id={panelId}
        className="category-actions-panel"
        hidden={!expanded}
        role="group"
        aria-label={`${name}操作`}
        onClickCapture={(event) => {
          // Restore before opening an editor, so Sheet captures a persistent trigger, not a hidden action.
          if (event.target instanceof Element && event.target.closest('button:not(:disabled)'))
            close()
        }}
      >
        {children}
      </div>
    </div>
  )
}

function CategoryEditor({
  category,
  parent,
  onClose,
  onSave,
}: {
  category?: Category | undefined
  parent?: Category | undefined
  onClose: () => void
  onSave: (values: { name: string; icon: string; color: Category['color'] }) => Promise<void>
}) {
  const [name, setName] = useState(category?.name ?? '')
  // Child styling is hidden, not erased: preserve legacy values when editing, and inherit
  // the parent for new rows so V4 exports and historical references remain compatible.
  const initialIcon = category?.icon ?? parent?.icon ?? 'food'
  const initialColor = category?.color ?? parent?.color ?? 'blue'
  const [icon, setIcon] = useState(initialIcon)
  const [color, setColor] = useState<Category['color']>(initialColor)
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [discard, setDiscard] = useState(false)
  const lock = useRef(false)
  const bodyRef = useRef<HTMLDivElement>(null)
  const errorRef = useRef<HTMLParagraphElement>(null)
  useEffect(() => {
    if (!error) return
    // Focus the failure without scrolling the underlying settings page or moving its tab bar.
    errorRef.current?.focus({ preventScroll: true })
    if (bodyRef.current) bodyRef.current.scrollTop = 0
    logger.info('category.editor.errorfocused', {
      operation: 'focus',
      reason: 'validation-or-save',
    })
  }, [error])
  const dirty = name !== (category?.name ?? '') || icon !== initialIcon || color !== initialColor
  useDirtyForm(dirty, busy)
  function close() {
    if (lock.current) {
      logger.info('category.editor.exitblocked', { operation: 'close', reason: 'busy' })
      return
    }
    logger.info('category.editor.exitrequested', {
      operation: 'close',
      reason: dirty ? 'dirty' : 'clean',
    })
    if (dirty) setDiscard(true)
    else onClose()
  }
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (lock.current) {
      logger.info('category.editor.saveblocked', { operation: 'save', reason: 'busy' })
      return
    }
    setError('')
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
      setError(parent ? '未能保存，名称已保留。请重试。' : '未能保存，名字和图标已保留。请重试。')
      logger.warn('category.editor.savefailed', { operation: 'save', failureClass: 'Write' })
    } finally {
      lock.current = false
      setBusy(false)
    }
  }
  return (
    <Sheet
      title={category ? '编辑分类' : parent ? '新增二级分类' : '新增分类'}
      structured
      onClose={close}
      busy={busy}
    >
      <form
        className="sheet-form sheet-form--structured category-editor"
        aria-label="分类编辑"
        onSubmit={(event) => void submit(event)}
      >
        <div className="sheet-form-body" ref={bodyRef}>
          {error && (
            <p role="alert" className="form-error" tabIndex={-1} ref={errorRef}>
              {error}
            </p>
          )}
          <div className="sheet-form-fields">
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
            {!parent && (
              <>
                <CategoryIconPicker value={icon} onChange={setIcon} disabled={busy} />
                <fieldset className="category-color-picker" disabled={busy}>
                  <legend>图标颜色</legend>
                  {colors.map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      aria-pressed={color === id}
                      onClick={() => setColor(id)}
                    >
                      <span className={`category-glyph tone-${id}`}>
                        <CategoryIcon name={icon} />
                      </span>
                      {label}
                    </button>
                  ))}
                </fieldset>
              </>
            )}
          </div>
        </div>
        <div className="form-actions sheet-form-footer">
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
            description={
              parent ? '尚未保存的名称将被丢弃。' : '尚未保存的名字、图标和颜色将被丢弃。'
            }
            confirmLabel="放弃修改"
            onCancel={() => setDiscard(false)}
            onConfirm={onClose}
          />
        )}
      </form>
    </Sheet>
  )
}
