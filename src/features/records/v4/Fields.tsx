import type { Category } from '@/core/types'
import { Icon } from '@/shared/ui/v4/Icon'

export function CategoryField({
  categories,
  selected,
  onChange,
  disabled,
  optional = false,
}: {
  categories: Category[]
  selected: string
  onChange(value: string): void
  disabled: boolean
  optional?: boolean
}) {
  return (
    <fieldset className="category-field" disabled={disabled}>
      <legend>分类</legend>
      <div className="category-options">
        {optional && (
          <button
            type="button"
            aria-pressed={!selected}
            className="category-choice"
            onClick={() => onChange('')}
          >
            不分类
          </button>
        )}
        {categories.map((category) => (
          <button
            type="button"
            className="category-choice"
            key={category.id}
            aria-pressed={selected === category.id}
            onClick={() => onChange(category.id)}
          >
            <Icon name={category.iconKey} />
            <span>
              {category.name}
              {category.status === 'archived' ? '（已归档）' : ''}
            </span>
          </button>
        ))}
      </div>
      {!categories.length && !optional && (
        <p className="field-error">没有可用分类。请先在设置中建立分类，再回来记录。</p>
      )}
    </fieldset>
  )
}
export function AmountField({
  kind,
  value,
  onChange,
  disabled,
  error,
}: {
  kind: 'transaction' | 'weight' | 'activity'
  value: string
  onChange(value: string): void
  disabled: boolean
  error?: string | undefined
}) {
  const label = kind === 'transaction' ? '金额' : kind === 'weight' ? '体重' : '运动时长'
  return (
    <label className="amount-field">
      <span>{label}</span>
      <div>
        <input
          data-initial-focus
          name="amount"
          inputMode={kind === 'activity' ? 'numeric' : 'decimal'}
          autoComplete="off"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          aria-invalid={!!error}
          aria-describedby={error ? 'record-field-error' : 'record-amount-hint'}
        />
        <strong>{kind === 'transaction' ? '元' : kind === 'weight' ? 'kg' : '分钟'}</strong>
      </div>
      <small id="record-amount-hint">
        {kind === 'transaction'
          ? '0.01–99,999,999.99 元，最多两位小数'
          : kind === 'weight'
            ? '1–1,000 kg，最多三位小数'
            : '1–1,440，整数分钟'}
      </small>
      {error && (
        <span id="record-field-error" className="field-error">
          {error}
        </span>
      )}
    </label>
  )
}
