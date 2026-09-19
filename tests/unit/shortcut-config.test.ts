import { afterEach, expect, it, vi } from 'vitest'
import {
  buildShortcutCategoryConfig,
  exportShortcutCategoryConfig,
} from '@/features/settings/shortcutConfig'
import type { Category } from '@/shared/domain/types'

const root: Category = {
  id: 'category-finance-expense-food-v1',
  domain: 'finance',
  transactionType: 'expense',
  name: '合成餐饮',
  icon: 'food',
  color: 'blue',
  sortOrder: 10,
  archived: 0,
  createdAt: '2026-09-19T00:00:00Z',
  updatedAt: '2026-09-19T00:00:00Z',
}
const child: Category = {
  ...root,
  id: '00000000-0000-4000-8000-000000000123',
  parentId: root.id,
  name: '合成早餐',
  sortOrder: 5,
}
afterEach(() => vi.unstubAllGlobals())

it('exports versioned finance-only data, preserving hierarchy, names and stable IDs without mutating the source', () => {
  const focus: Category = {
    ...root,
    id: 'category-focus-work-v1',
    domain: 'focus',
    name: '不应导出',
  }
  delete focus.transactionType
  const rows = [child, focus, root]
  const before = structuredClone(rows)
  const config = buildShortcutCategoryConfig(rows)
  expect(config).toEqual({
    format: 'lifeindex-shortcut-categories',
    version: 1,
    categories: [
      {
        id: root.id,
        domain: 'finance',
        type: 'expense',
        name: root.name,
        parentId: null,
        available: true,
      },
      {
        id: child.id,
        domain: 'finance',
        type: 'expense',
        name: child.name,
        parentId: root.id,
        available: true,
      },
    ],
  })
  expect(rows).toEqual(before)
})

it('omits archived children and children under archived parents, and refuses an empty usable config', () => {
  expect(buildShortcutCategoryConfig([root, { ...child, archived: 1 }]).categories).toHaveLength(1)
  expect(() => buildShortcutCategoryConfig([{ ...root, archived: 1 }, child])).toThrow()
  expect(() => buildShortcutCategoryConfig([])).toThrow()
})

it('rejects orphan, cross-type and three-level references instead of exporting a partial config', () => {
  expect(() => buildShortcutCategoryConfig([child])).toThrow()
  expect(() =>
    buildShortcutCategoryConfig([root, { ...child, transactionType: 'income' }]),
  ).toThrow()
  expect(() =>
    buildShortcutCategoryConfig([
      root,
      child,
      { ...child, id: '00000000-0000-4000-8000-000000000124', parentId: child.id },
    ]),
  ).toThrow()
})

it('hands the minimal JSON file to system sharing and propagates cancellation', async () => {
  const share = vi
    .fn()
    .mockResolvedValueOnce(undefined)
    .mockRejectedValueOnce(new DOMException('Cancelled', 'AbortError'))
  vi.stubGlobal('navigator', { share, canShare: () => true })
  await exportShortcutCategoryConfig([root, child])
  const file = share.mock.calls[0]![0].files[0] as File
  expect(file.name).toBe('lifeindex-shortcut-categories.json')
  const text = await new Promise<string>((resolve) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.readAsText(file)
  })
  expect(JSON.parse(text)).toEqual(buildShortcutCategoryConfig([root, child]))
  await expect(exportShortcutCategoryConfig([root])).rejects.toMatchObject({ name: 'AbortError' })
})

it('cleans up a download URL and temporary link even when download dispatch fails', async () => {
  const revoke = vi.fn()
  vi.stubGlobal('navigator', {})
  vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:synthetic'), revokeObjectURL: revoke })
  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementationOnce(() => {
    throw new Error('SyntheticDownloadFailure')
  })
  await expect(exportShortcutCategoryConfig([root])).rejects.toThrow('SyntheticDownloadFailure')
  expect(click).toHaveBeenCalledTimes(1)
  expect(revoke).toHaveBeenCalledWith('blob:synthetic')
  expect(document.querySelector('a[download]')).toBeNull()
})
