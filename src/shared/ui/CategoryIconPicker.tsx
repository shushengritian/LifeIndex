import { useState } from 'react'
import {
  categoryIconGroups,
  categoryIconLabels,
  resolveCategoryIcon,
} from '@/shared/domain/categoryIcons'
import { CategoryIcon } from './CategoryIcon'
import { logger } from '@/shared/logging/logger'

export function CategoryIconPicker({
  value,
  onChange,
  disabled = false,
}: {
  value: string
  onChange: (id: string) => void
  disabled?: boolean
}) {
  const [group, setGroup] = useState('common')
  const current = categoryIconGroups.find(({ id }) => id === group)!
  return (
    <fieldset className="category-icon-picker" disabled={disabled}>
      <legend>分类图标</legend>
      <p className="category-icon-preview">
        <CategoryIcon name={value} />
        已选：{categoryIconLabels[resolveCategoryIcon(value)]}
      </p>
      <div className="icon-group-tabs" aria-label="图标分组">
        {categoryIconGroups.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            aria-pressed={group === id}
            onClick={() => {
              // Browsing icon groups is presentation state, not a change to the saved choice.
              setGroup(id)
              logger.info('category.icons.groupchanged', { operation: 'browse', toState: id })
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="category-icon-grid">
        {current.ids.map((id) => (
          <button
            key={id}
            type="button"
            aria-label={`图标 ${categoryIconLabels[id]}`}
            aria-pressed={resolveCategoryIcon(value) === id}
            onClick={() => {
              onChange(id)
              logger.info('category.icons.selected', { operation: 'select' })
            }}
          >
            <CategoryIcon name={id} />
            <span>{categoryIconLabels[id]}</span>
          </button>
        ))}
      </div>
    </fieldset>
  )
}
