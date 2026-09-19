import type { Category, TransactionType } from '@/shared/domain/types'
import { isCategoryAvailable, categoryDisplayName } from '@/shared/domain/categoryHierarchy'
import { CategoryIcon } from '@/shared/ui/CategoryIcon'
import { logger } from '@/shared/logging/logger'

export function FinanceCategoryPicker({
  categories,
  type,
  value,
  originalId,
  disabled = false,
  onChange,
}: {
  categories: readonly Category[]
  type: TransactionType
  value: string
  originalId?: string | undefined
  disabled?: boolean
  onChange: (id: string) => void
}) {
  const selected = categories.find((c) => c.id === value && c.transactionType === type)
  const original = categories.find((c) => c.id === originalId && c.transactionType === type)
  const rootId = selected?.parentId ?? selected?.id
  const root = categories.find((c) => c.id === rootId)
  // Include the historical parent for orientation, never as a newly selectable archived value.
  const roots = categories.filter(
    (c) =>
      c.domain === 'finance' &&
      c.transactionType === type &&
      !c.parentId &&
      (isCategoryAvailable(c, categories) || c.id === original?.id || c.id === original?.parentId),
  )
  const children = categories.filter(
    (c) => c.parentId === rootId && (isCategoryAvailable(c, categories) || c.id === originalId),
  )
  function select(id: string) {
    onChange(id)
    logger.info('finance.category.selected', { operation: 'select' })
  }
  function choice(category: Category, isRoot = false) {
    const available = isCategoryAvailable(category, categories)
    const retained = category.id === originalId
    return (
      <button
        key={category.id}
        type="button"
        disabled={disabled || (!available && !retained)}
        aria-label={`${isRoot ? '一级分类' : '二级分类'} ${category.name}${!available ? '（已归档）' : ''}`}
        aria-pressed={isRoot ? rootId === category.id : value === category.id}
        onClick={() => select(category.id)}
      >
        <span className={`category-glyph tone-${category.color}`}>
          <CategoryIcon name={category.icon} />
        </span>
        <span>{category.name}</span>
        {!available && <small>已归档</small>}
      </button>
    )
  }
  return (
    <fieldset className="finance-category-picker" disabled={disabled}>
      <legend>分类</legend>
      <div className="finance-category-grid" aria-label="一级分类">
        {roots.map((c) => choice(c, true))}
      </div>
      {!roots.length && <p className="helper">暂无可用分类，请到设置新增或恢复分类。</p>}
      {root && (
        <div className="finance-subcategories">
          <p>二级分类 · 可选</p>
          <div className="finance-category-grid" aria-label="二级分类">
            {(isCategoryAvailable(root, categories) || root.id === originalId) && (
              <button
                type="button"
                disabled={disabled}
                aria-pressed={value === root.id}
                onClick={() => select(root.id)}
              >
                不细分
              </button>
            )}
            {children.map((c) => choice(c))}
          </div>
        </div>
      )}
      <p role="status" className="helper">
        {selected
          ? `已选：${categoryDisplayName(selected.id, categories)}${!isCategoryAvailable(selected, categories) ? '（保留原归档分类）' : ''}`
          : '请选择分类'}
      </p>
    </fieldset>
  )
}
