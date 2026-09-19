import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { FinanceCategoryPicker } from '@/features/finance/FinanceCategoryPicker'
import { createSeedCategories } from '@/data/db/seeds'
import type { Category } from '@/shared/domain/types'

const roots = createSeedCategories('2026-09-03T12:00:00.000Z')
const root = roots.find((c) => c.id === 'category-finance-expense-food-v1')!
const child: Category = {
  ...root,
  id: '00000000-0000-4000-8000-000000000070',
  parentId: root.id,
  name: '早餐',
  icon: 'fruit',
}
function Harness({
  categories = [...roots, child],
  originalId = '',
  disabled = false,
}: {
  categories?: Category[]
  originalId?: string
  disabled?: boolean
}) {
  const [value, setValue] = useState(originalId)
  return (
    <FinanceCategoryPicker
      categories={categories}
      type="expense"
      value={value}
      originalId={originalId}
      disabled={disabled}
      onChange={setValue}
    />
  )
}
describe('finance two-level selection', () => {
  it('selects a root, optional child and explicit ungrouped root', async () => {
    render(<Harness />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: '一级分类 餐饮' }))
    await user.click(screen.getByRole('button', { name: '二级分类 早餐' }))
    expect(screen.getByRole('status')).toHaveTextContent('已选：餐饮 / 早餐')
    await user.click(screen.getByRole('button', { name: '不细分' }))
    expect(screen.getByRole('status')).toHaveTextContent('已选：餐饮')
    expect(screen.getByRole('button', { name: '不细分' })).toHaveAttribute('aria-pressed', 'true')
  })
  it('retains an archived historical child but cannot select its parent as a new value', () => {
    render(<Harness categories={[{ ...root, archived: 1 }, child]} originalId={child.id} />)
    expect(screen.getByRole('status')).toHaveTextContent('餐饮 / 早餐（保留原归档分类）')
    expect(screen.getByRole('button', { name: '一级分类 餐饮（已归档）' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '二级分类 早餐（已归档）' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.queryByRole('button', { name: '不细分' })).not.toBeInTheDocument()
  })
  it('does not offer inherited archived children to new transactions', () => {
    render(<Harness categories={[{ ...root, archived: 1 }, child]} />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.getByText(/暂无可用分类/)).toBeInTheDocument()
  })
  it('locks all selection while saving', () => {
    render(<Harness disabled originalId={child.id} />)
    for (const button of screen.getAllByRole('button')) expect(button).toBeDisabled()
  })
})
