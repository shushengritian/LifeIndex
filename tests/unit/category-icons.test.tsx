import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import {
  categoryIconIds,
  categoryIconGroups,
  resolveCategoryIcon,
} from '@/shared/domain/categoryIcons'
import { CategoryIcon } from '@/shared/ui/CategoryIcon'
import { CategoryIconPicker } from '@/shared/ui/CategoryIconPicker'
import { categorySchema, categorySchemaV3 } from '@/shared/validation/schemas'
import { createSeedCategories } from '@/data/db/seeds'

describe('approved category icons', () => {
  it('contains 42 stable icons across 8 groups, with legacy aliases', () => {
    expect(categoryIconIds).toHaveLength(42)
    expect(categoryIconGroups).toHaveLength(8)
    expect(new Set(categoryIconGroups.flatMap((g) => g.ids))).toEqual(new Set(categoryIconIds))
    const view = render(
      <>
        {categoryIconIds.map((name) => (
          <CategoryIcon key={name} name={name} />
        ))}
      </>,
    )
    expect(view.container.querySelectorAll('svg')).toHaveLength(42)
    for (const svg of view.container.querySelectorAll('svg'))
      expect(svg.children.length).toBeGreaterThan(0)
    expect(resolveCategoryIcon('utensils')).toBe('food')
    expect(resolveCategoryIcon('not-known')).toBe('bag')
    expect(resolveCategoryIcon('constructor')).toBe('bag')
  })
  it('accepts new icons only in the new schema, without relaxing historical backups', () => {
    const category = { ...createSeedCategories('2026-09-03T12:00:00.000Z')[0]!, icon: 'fruit' }
    expect(categorySchema.safeParse(category).success).toBe(true)
    expect(categorySchemaV3.safeParse(category).success).toBe(false)
  })
  it('preserves the selected icon while browsing another group', async () => {
    function Harness() {
      const [value, setValue] = useState('food')
      return <CategoryIconPicker value={value} onChange={setValue} />
    }
    render(<Harness />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: '餐饮' }))
    await user.click(screen.getByRole('button', { name: '图标 水果' }))
    await user.click(screen.getByRole('button', { name: '交通出行' }))
    expect(screen.getByText('已选：水果')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '餐饮' }))
    expect(screen.getByRole('button', { name: '图标 水果' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })
})
