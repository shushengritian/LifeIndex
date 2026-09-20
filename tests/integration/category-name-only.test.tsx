import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import { LifeIndexDatabase } from '@/data/db/LifeIndexDatabase'
import { CategoryRepository } from '@/data/repositories/CategoryRepository'
import { CategoryManager } from '@/features/settings/CategoryManager'
import { PwaProvider } from '@/pwa/PwaProvider'

let database: LifeIndexDatabase | undefined
afterEach(async () => {
  await database?.delete()
  vi.restoreAllMocks()
})

it('retains legacy child styling and draft through a failed name-only save and retry', async () => {
  vi.spyOn(console, 'info').mockImplementation(() => undefined)
  vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  database = new LifeIndexDatabase(`CategoryNameOnly-${crypto.randomUUID()}`)
  await database.initialize()
  const repository = new CategoryRepository(database)
  const child = await repository.create({
    domain: 'finance',
    transactionType: 'expense',
    parentId: 'category-finance-expense-food-v1',
    name: '合成旧分类',
    icon: 'fruit',
    color: 'rose',
  })
  const update = vi.spyOn(repository, 'update').mockRejectedValueOnce(new Error('SyntheticFailure'))
  render(
    <PwaProvider>
      <CategoryManager
        repository={repository}
        categories={await database.categories.toArray()}
        onError={() => undefined}
      />
    </PwaProvider>,
  )
  const user = userEvent.setup()
  await user.click(screen.getByText('分类管理', { exact: true }))
  await user.click(screen.getByRole('button', { name: '餐饮' }))
  await user.click(screen.getByRole('button', { name: '合成旧分类' }))
  expect(screen.queryByRole('group', { name: '图标颜色' })).not.toBeInTheDocument()
  await user.clear(screen.getByLabelText('分类名称'))
  await user.type(screen.getByLabelText('分类名称'), '合成新名称')
  await user.click(screen.getByRole('button', { name: '保存分类' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('名称已保留')
  expect(screen.getByLabelText('分类名称')).toHaveValue('合成新名称')
  expect((await database.categories.get(child.id))?.name).toBe('合成旧分类')
  await user.click(screen.getByRole('button', { name: '保存分类' }))
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  // Removing the icon controls must never reset existing child styling or historical identity.
  expect(update).toHaveBeenLastCalledWith(child.id, {
    name: '合成新名称',
    icon: 'fruit',
    color: 'rose',
  })
  expect(await database.categories.get(child.id)).toMatchObject({
    id: child.id,
    name: '合成新名称',
    icon: 'fruit',
    color: 'rose',
    parentId: child.parentId,
  })
})
