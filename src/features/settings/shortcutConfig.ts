import type { Category } from '@/shared/domain/types'
import { assertCategoryHierarchy, isCategoryAvailable } from '@/shared/domain/categoryHierarchy'
import { categorySchema } from '@/shared/validation/schemas'
import { AppError } from '@/shared/errors/AppError'
import { logger } from '@/shared/logging/logger'

export interface ShortcutCategoryConfig {
  format: 'lifeindex-shortcut-categories'
  version: 1
  categories: Array<{
    id: string
    domain: 'finance'
    type: 'expense' | 'income'
    name: string
    parentId: string | null
    available: true
  }>
}

export function buildShortcutCategoryConfig(rows: readonly Category[]): ShortcutCategoryConfig {
  logger.info('shortcut.config.started', { operation: 'build' })
  try {
    // Validate the source before filtering: corrupt parent relationships must not become a partial config.
    const categories = rows.map((row) => categorySchema.parse(row)) as Category[]
    assertCategoryHierarchy(categories)
    const available = categories.filter(
      (row) => row.domain === 'finance' && isCategoryAvailable(row, categories),
    )
    if (!available.length) throw new AppError('Validation', 'No available finance categories')
    const ordered = [...available].sort(
      (a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id),
    )
    const config: ShortcutCategoryConfig = {
      format: 'lifeindex-shortcut-categories',
      version: 1,
      categories: [],
    }
    // Parents precede their children; explicit projection never includes records, timestamps or unrelated settings.
    for (const root of ordered.filter((row) => !row.parentId)) {
      for (const row of [root, ...ordered.filter((child) => child.parentId === root.id)]) {
        config.categories.push({
          id: row.id,
          domain: 'finance',
          type: row.transactionType!,
          name: row.name,
          parentId: row.parentId ?? null,
          available: true,
        })
      }
    }
    logger.info('shortcut.config.completed', {
      operation: 'build',
      count: config.categories.length,
      formatVersion: 1,
    })
    return config
  } catch (error) {
    logger.error('shortcut.config.failed', error, {
      operation: 'build',
      failureClass: 'Validation',
    })
    throw error
  }
}

export async function exportShortcutCategoryConfig(rows: readonly Category[]): Promise<void> {
  const config = buildShortcutCategoryConfig(rows)
  const file = new File([JSON.stringify(config, null, 2)], 'lifeindex-shortcut-categories.json', {
    type: 'application/json',
  })
  logger.info('shortcut.config.handoffstarted', {
    operation: 'export',
    count: config.categories.length,
  })
  try {
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      logger.info('shortcut.config.shareselected', { operation: 'share' })
      await navigator.share({ files: [file], title: 'LifeIndex 快捷记账分类' })
    } else {
      logger.info('shortcut.config.downloadselected', { operation: 'download' })
      const url = URL.createObjectURL(file)
      const anchor = document.createElement('a')
      try {
        anchor.href = url
        anchor.download = file.name
        document.body.append(anchor)
        anchor.click()
      } finally {
        anchor.remove()
        URL.revokeObjectURL(url)
      }
    }
    logger.info('shortcut.config.handoffcompleted', { operation: 'export' })
  } catch (error) {
    logger.error('shortcut.config.handofffailure', error, { operation: 'export' })
    throw error
  }
}
