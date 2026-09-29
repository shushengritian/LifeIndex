import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useV4Services } from '@/app/v4/Services'
import { useDirtyGuard } from '@/app/v4/useDirtyGuard'
import { useV4Query } from '@/app/v4/useQuery'
import { useConfirm } from '@/app/v4/Confirmation'
import { useFlow } from '@/app/v4/Flow'
import type { Category, CategoryScope, Stamp } from '@/core/types'
import { PageHeading, Feedback, SectionHeading } from '@/shared/ui/v4/Elements'
import { Icon } from '@/shared/ui/v4/Icon'
import { errorMessage } from '@/shared/v4/format'
import { usePageLog } from '@/features/today/v4/data'
import { retainedIntent, type WriteIntent } from '@/features/today/v4/intent'
import { logger } from '@/shared/logging/logger'
import { CategoryEditor } from './CategoryEditor'
const scopes: { value: CategoryScope; label: string }[] = [
  { value: 'expense', label: '支出' },
  { value: 'income', label: '收入' },
  { value: 'activity', label: '运动' },
  { value: 'focus', label: '专注' },
]
export function CategoriesV4() {
  usePageLog('categories')
  const services = useV4Services(),
    confirm = useConfirm(),
    flow = useFlow(),
    [search, setSearch] = useSearchParams(),
    scope = scopes.find((item) => item.value === search.get('scope'))?.value ?? 'expense',
    query = useV4Query(
      useCallback(
        () => services.categories.list({ scope, includeArchived: true }),
        [services, scope],
      ),
    ),
    data = query.snapshot?.data,
    [editor, setEditor] = useState<{
      category: Category | null
      scope: CategoryScope
      stamp: Stamp
    } | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null),
    locked = useRef(false),
    intent = useRef<WriteIntent | null>(null),
    pendingFocus = useRef<{ id: string; action: string; stamp: Stamp } | null>(null)
  const active = data?.filter((item) => item.status === 'active') ?? [],
    archived = data?.filter((item) => item.status === 'archived') ?? []
  useDirtyGuard({ dirty: false, busy })
  useEffect(() => {
    const pending = pendingFocus.current
    if (!pending || busy || !query.snapshot) return
    // Archive and activation move rows between lists. Restore only after the committed snapshot is rendered.
    if (
      query.snapshot.stamp.generation === pending.stamp.generation &&
      query.snapshot.stamp.revision < pending.stamp.revision
    )
      return
    const frame = requestAnimationFrame(() => {
      const target =
        document.querySelector<HTMLButtonElement>(
          `[data-focus-key="category-${pending.action}-${pending.id}"]:not(:disabled)`,
        ) ??
        document.querySelector<HTMLButtonElement>(
          `[data-focus-key="category-edit-${pending.id}"]`,
        ) ??
        document.querySelector<HTMLButtonElement>('[data-focus-key="category-create"]')
      target?.focus()
      pendingFocus.current = null
    })
    return () => cancelAnimationFrame(frame)
  }, [busy, query.snapshot])
  async function command(
    category: Category,
    action: 'archive' | 'activate' | 'remove' | 'up' | 'down',
  ) {
    if (locked.current || !query.snapshot) return
    if (
      ['archive', 'remove'].includes(action) &&
      !(await confirm({
        title: action === 'archive' ? '归档这个分类？' : '删除未使用的分类？',
        description:
          action === 'archive'
            ? '已有记录会保留分类引用，新记录将不再提供此分类。'
            : '只有未被记录使用的分类可删除；已有使用会改为提示归档。',
        confirmLabel: action === 'archive' ? '确认归档' : '确认删除',
        cancelLabel: '保留分类',
      }))
    )
      return
    locked.current = true
    setBusy(true)
    setError(null)
    logger.info('v4.categories.requested', { operation: action })
    const ref = { id: category.id, expectedEntityRevision: category.revision },
      stamp = query.snapshot.stamp
    let committed: Stamp | null = null
    try {
      if (action === 'up' || action === 'down') {
        const order = [...active],
          index = order.findIndex((item) => item.id === category.id),
          other = index + (action === 'up' ? -1 : 1)
        if (index < 0 || other < 0 || other >= order.length) return
        ;[order[index], order[other]] = [order[other]!, order[index]!]
        const refs = order.map((item) => ({ id: item.id, expectedEntityRevision: item.revision }))
        committed = (
          await services.categories.reorder(
            scope,
            refs,
            retainedIntent(intent, JSON.stringify({ scope, refs }), stamp),
          )
        ).stamp
      } else {
        const ctx = retainedIntent(intent, JSON.stringify({ ref, action }), stamp)
        if (action === 'archive') committed = (await services.categories.archive(ref, ctx)).stamp
        if (action === 'activate') committed = (await services.categories.activate(ref, ctx)).stamp
        if (action === 'remove') {
          try {
            committed = (await services.categories.removeUnused(ref, ctx)).stamp
          } catch (error) {
            const candidate = error as { code?: string; field?: string }
            if (candidate.code !== 'Validation' || candidate.field !== 'categoryId') throw error
            // Referenced categories never lose identity. A second, explicit choice may archive instead.
            logger.info('v4.categories.referenced', { reason: 'archive-required' })
            if (
              !(await confirm({
                title: '此分类已有记录',
                description: '不能删除正在使用的分类。归档后，历史引用仍完整保留。',
                confirmLabel: '改为归档',
                cancelLabel: '保留分类',
              }))
            )
              return
            committed = (
              await services.categories.archive(
                ref,
                retainedIntent(intent, JSON.stringify({ ref, action: 'archive' }), stamp),
              )
            ).stamp
          }
        }
      }
      intent.current = null
      if (committed) pendingFocus.current = { id: category.id, action, stamp: committed }
      logger.info('v4.categories.saved', { operation: action })
      flow.notify(
        action === 'activate'
          ? '分类已重新启用。'
          : action === 'up' || action === 'down'
            ? '分类顺序已调整。'
            : '分类已更新。',
      )
    } catch (error) {
      const candidate = error as { code?: string; field?: string }
      setError(
        action === 'activate' && candidate.code === 'Validation' && candidate.field === 'name'
          ? '此领域已有可用的同名分类。归档状态已保留，请先编辑名称，再重新启用。'
          : errorMessage(error),
      )
      logger.warn('v4.categories.failed', { operation: action, failureClass: 'command' })
    } finally {
      locked.current = false
      setBusy(false)
    }
  }
  function rows(items: Category[]) {
    return (
      <ul className="v4-category-management">
        {items.map((category, index) => (
          <li key={category.id}>
            <div className="v4-category-identity">
              <Icon name={category.iconKey} />
              <div>
                <strong>{category.name}</strong>
                <small>
                  {category.status === 'archived' ? '已归档 · 历史仍保留' : '可用于新记录'}
                </small>
              </div>
            </div>
            <div className="v4-category-actions">
              <button
                type="button"
                className="text-button"
                disabled={busy}
                onClick={() =>
                  query.snapshot && setEditor({ category, scope, stamp: query.snapshot.stamp })
                }
                aria-label={`编辑分类${category.name}`}
                data-focus-key={`category-edit-${category.id}`}
              >
                编辑
              </button>
              {category.status === 'active' ? (
                <>
                  <button
                    type="button"
                    className="text-button"
                    disabled={busy || index === 0}
                    aria-label={`上移${category.name}`}
                    data-focus-key={`category-up-${category.id}`}
                    onClick={() => void command(category, 'up')}
                  >
                    上移
                  </button>
                  <button
                    type="button"
                    className="text-button"
                    disabled={busy || index === items.length - 1}
                    aria-label={`下移${category.name}`}
                    data-focus-key={`category-down-${category.id}`}
                    onClick={() => void command(category, 'down')}
                  >
                    下移
                  </button>
                  <button
                    type="button"
                    className="text-button"
                    disabled={busy}
                    onClick={() => void command(category, 'archive')}
                  >
                    归档
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="text-button"
                  disabled={busy}
                  onClick={() => void command(category, 'activate')}
                >
                  重新启用
                </button>
              )}
              <button
                type="button"
                className="text-button v4-danger-text"
                disabled={busy}
                onClick={() => void command(category, 'remove')}
              >
                删除
              </button>
            </div>
          </li>
        ))}
      </ul>
    )
  }
  return (
    <>
      <PageHeading
        title="分类，按你的方式。"
        description="一个层级就够了。归档不改变已有记录。"
        action={
          <Link className="text-button" to="/settings">
            返回设置
          </Link>
        }
      />
      <div className="v4-range-tabs" role="group" aria-label="分类领域">
        {scopes.map((item) => (
          <button
            type="button"
            key={item.value}
            aria-pressed={item.value === scope}
            disabled={busy}
            onClick={() => {
              setError(null)
              setSearch({ scope: item.value })
            }}
          >
            {item.label}
          </button>
        ))}
      </div>
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
      {query.status === 'loading' ? (
        <Feedback kind="loading" title="正在读取分类" />
      ) : query.status === 'failed' ? (
        <Feedback kind="error" title="分类暂时读不到" onRetry={query.retry} />
      ) : (
        <>
          <button
            className="button"
            type="button"
            disabled={busy}
            data-focus-key="category-create"
            onClick={() =>
              query.snapshot && setEditor({ category: null, scope, stamp: query.snapshot.stamp })
            }
          >
            新增{scopes.find((item) => item.value === scope)!.label}分类
          </button>
          <SectionHeading title="可用分类" />
          {active.length ? (
            rows(active)
          ) : (
            <Feedback kind="empty" title="这里还没有可用分类">
              创建或重新启用一个分类后，就可以用来记录。
            </Feedback>
          )}
          {archived.length > 0 && (
            <>
              <SectionHeading title="已归档" />
              {rows(archived)}
            </>
          )}
        </>
      )}
      {editor && <CategoryEditor {...editor} onClose={() => setEditor(null)} />}
    </>
  )
}
