import type { Category } from './types'
import { AppError } from '@/shared/errors/AppError'

/** Display the current hierarchy without rewriting historical category references. */
export function categoryDisplayName(id: string, categories: readonly Category[]): string {
  const category = categories.find((c) => c.id === id)
  if (!category) return '已归档分类'
  const parent = categories.find((c) => c.id === category.parentId)
  return parent ? `${parent.name} / ${category.name}` : category.name
}

/** Validate references separately from row schemas, including for archived historical categories. */
export function assertCategoryHierarchy(categories: readonly Category[]): void {
  const byId = new Map(categories.map((category) => [category.id, category]))
  for (const category of categories) {
    if (!category.parentId) continue
    const parent = byId.get(category.parentId)
    if (
      !parent ||
      parent.id === category.id ||
      parent.parentId ||
      category.domain !== 'finance' ||
      parent.domain !== 'finance' ||
      parent.transactionType !== category.transactionType
    ) {
      throw new AppError('Validation', 'Invalid two-level category hierarchy')
    }
  }
}

/** Parent archival is inherited at selection time, never written over a child's own state. */
export function isCategoryAvailable(category: Category, categories: readonly Category[]): boolean {
  if (category.archived) return false
  if (!category.parentId) return true
  const parent = categories.find(({ id }) => id === category.parentId)
  return Boolean(
    parent &&
    !parent.archived &&
    !parent.parentId &&
    parent.domain === 'finance' &&
    category.domain === 'finance' &&
    parent.transactionType === category.transactionType,
  )
}
