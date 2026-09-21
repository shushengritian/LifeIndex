import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterAll, afterEach, beforeAll, expect, it, vi } from 'vitest'
import { LifeIndexDatabase } from '@/data/db/LifeIndexDatabase'
import { CategoryRepository } from '@/data/repositories/CategoryRepository'
import { CategoryManager } from '@/features/settings/CategoryManager'
import { PwaProvider } from '@/pwa/PwaProvider'

let database: LifeIndexDatabase | undefined
// JSDOM has no native top-layer dialog; only lifecycle is stubbed, not focus/layout behavior.
beforeAll(() => {
  Object.defineProperties(HTMLDialogElement.prototype, {
    showModal: {
      configurable: true,
      value(this: HTMLDialogElement) {
        this.setAttribute('open', '')
      },
    },
    close: {
      configurable: true,
      value(this: HTMLDialogElement) {
        this.removeAttribute('open')
      },
    },
  })
})
afterAll(() => {
  Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal')
  Reflect.deleteProperty(HTMLDialogElement.prototype, 'close')
})
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
  expect(screen.getByRole('alert')).toHaveFocus()
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

it('uses the same dirty exit guard for header and Escape, and locks close during save', async () => {
  database = new LifeIndexDatabase(`CategorySheet-${crypto.randomUUID()}`)
  await database.initialize()
  const repository = new CategoryRepository(database)
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
  await user.click(screen.getByRole('button', { name: '新增分类' }))
  expect(screen.getByRole('dialog')).toHaveClass('sheet--structured')
  await user.click(screen.getByRole('button', { name: '关闭编辑器' }))
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: '新增分类' }))
  await user.type(screen.getByLabelText('分类名称'), '合成测试')
  await user.click(screen.getByRole('button', { name: '关闭编辑器' }))
  expect(screen.getByRole('dialog', { name: '放弃分类修改？' })).toBeInTheDocument()
  await user.click(screen.getAllByRole('button', { name: '取消' }).at(-1)!)
  expect(screen.getByLabelText('分类名称')).toHaveValue('合成测试')
  fireEvent.keyDown(screen.getByLabelText('分类名称'), { key: 'Escape' })
  expect(screen.getByRole('dialog', { name: '放弃分类修改？' })).toBeInTheDocument()
  await user.click(screen.getAllByRole('button', { name: '取消' }).at(-1)!)
  let rejectSave!: (reason: Error) => void
  const create = vi.spyOn(repository, 'create').mockImplementationOnce(
    () =>
      new Promise((_resolve, reject) => {
        rejectSave = reject
      }),
  )
  fireEvent.click(screen.getByRole('button', { name: '保存分类' }))
  expect(screen.getByRole('button', { name: '关闭编辑器' })).toBeDisabled()
  fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
  expect(screen.queryByRole('dialog', { name: '放弃分类修改？' })).not.toBeInTheDocument()
  expect(create).toHaveBeenCalledTimes(1)
  await act(async () => rejectSave(new Error('SyntheticWrite')))
  expect(await screen.findByRole('alert')).toHaveFocus()
  expect(screen.getByLabelText('分类名称')).toHaveValue('合成测试')
  expect(screen.getByRole('button', { name: '关闭编辑器' })).toBeEnabled()
})
