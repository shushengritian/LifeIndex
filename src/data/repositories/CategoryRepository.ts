import { LifeIndexDatabase } from '@/data/db/LifeIndexDatabase'
import type { Clock, IdGenerator } from '@/shared/domain/runtime'
import { cryptoIdGenerator, systemClock } from '@/shared/domain/runtime'
import type { Category, CategoryDomain, TransactionType } from '@/shared/domain/types'
import { AppError } from '@/shared/errors/AppError'
import { logger } from '@/shared/logging/logger'
import { categorySchema } from '@/shared/validation/schemas'

export interface CreateCategoryCommand {
  domain: CategoryDomain
  transactionType?: TransactionType
  name: string
  icon: string
  color: Category['color']
}

export interface UpdateCategoryCommand {
  name: string
  icon: string
  color: Category['color']
}

export interface CategoryListFilter {
  domain: CategoryDomain
  transactionType?: TransactionType
  includeArchived?: boolean
}

export class CategoryRepository {
  constructor(
    private readonly database: LifeIndexDatabase,
    private readonly clock: Clock = systemClock,
    private readonly idGenerator: IdGenerator = cryptoIdGenerator,
  ) {}

  async create(command: CreateCategoryCommand): Promise<Category> {
    logger.info('category.create.started', { entityType: 'category', operation: 'create' })
    try {
      return await this.database.transaction('rw', this.database.categories, async () => {
        const timestamp = this.clock.now().toISOString()
        const sortOrder =
          ((await this.database.categories.orderBy('sortOrder').last())?.sortOrder ?? 0) + 10
        const parsed = categorySchema.safeParse({
          ...command,
          id: this.idGenerator.next(),
          sortOrder,
          archived: 0,
          createdAt: timestamp,
          updatedAt: timestamp,
        })
        if (!parsed.success) throw new AppError('Validation', 'Category validation failed')
        const category = parsed.data as Category

        // Computing sort order and insertion together prevents concurrent creates from sharing a slot.
        await this.database.categories.add(category)
        logger.info('category.create.succeeded', {
          entityType: 'category',
          operation: 'create',
          count: 1,
        })
        return category
      })
    } catch (error) {
      logger.error('category.create.failed', error, {
        entityType: 'category',
        operation: 'create',
        failureClass: error instanceof AppError ? error.failureClass : 'DatabaseWrite',
      })
      throw error instanceof AppError
        ? error
        : new AppError('DatabaseWrite', 'Category could not be created', { cause: error })
    }
  }

  async update(id: string, command: UpdateCategoryCommand): Promise<Category> {
    logger.info('category.update.started', { entityType: 'category', operation: 'update' })
    try {
      return await this.database.transaction('rw', this.database.categories, async () => {
        const existing = await this.database.categories.get(id)
        if (!existing) throw new AppError('Validation', 'Category does not exist')

        // Domain and transaction type are immutable because historical records depend on that contract.
        const parsed = categorySchema.safeParse({
          ...existing,
          ...command,
          updatedAt: this.clock.now().toISOString(),
        })
        if (!parsed.success) throw new AppError('Validation', 'Category validation failed')
        const updated = parsed.data as Category
        await this.database.categories.put(updated)
        logger.info('category.update.succeeded', {
          entityType: 'category',
          operation: 'update',
          count: 1,
        })
        return updated
      })
    } catch (error) {
      logger.error('category.update.failed', error, {
        entityType: 'category',
        operation: 'update',
        failureClass: error instanceof AppError ? error.failureClass : 'DatabaseWrite',
      })
      throw error instanceof AppError
        ? error
        : new AppError('DatabaseWrite', 'Category could not be updated', { cause: error })
    }
  }

  async archive(id: string): Promise<Category> {
    logger.info('category.archive.started', { entityType: 'category', operation: 'archive' })
    try {
      return await this.database.transaction('rw', this.database.categories, async () => {
        const existing = await this.database.categories.get(id)
        if (!existing) throw new AppError('Validation', 'Category does not exist')
        if (existing.archived === 1) {
          logger.info('category.archive.alreadypresent', {
            entityType: 'category',
            operation: 'archive',
            count: 0,
          })
          return existing
        }

        const updated: Category = {
          ...existing,
          archived: 1,
          updatedAt: this.clock.now().toISOString(),
        }
        await this.database.categories.put(updated)
        logger.info('category.archive.succeeded', {
          entityType: 'category',
          operation: 'archive',
          count: 1,
        })
        return updated
      })
    } catch (error) {
      logger.error('category.archive.failed', error, {
        entityType: 'category',
        operation: 'archive',
        failureClass: error instanceof AppError ? error.failureClass : 'DatabaseWrite',
      })
      throw error instanceof AppError
        ? error
        : new AppError('DatabaseWrite', 'Category could not be archived', { cause: error })
    }
  }

  async list(filter: CategoryListFilter): Promise<Category[]> {
    logger.info('category.list.started', { entityType: 'category', operation: 'list' })
    try {
      const archiveStates: Array<0 | 1> = filter.includeArchived ? [0, 1] : [0]
      const grouped = await Promise.all(
        archiveStates.map((archived) =>
          this.database.categories
            .where('[domain+archived]')
            .equals([filter.domain, archived])
            .toArray(),
        ),
      )
      const result = grouped
        .flat()
        .filter(({ transactionType }) =>
          filter.transactionType === undefined ? true : transactionType === filter.transactionType,
        )
        .sort((left, right) => left.sortOrder - right.sortOrder)
      logger.info('category.list.succeeded', {
        entityType: 'category',
        operation: 'list',
        count: result.length,
      })
      return result
    } catch (error) {
      logger.error('category.list.failed', error, {
        entityType: 'category',
        operation: 'list',
        failureClass: 'DatabaseRead',
      })
      throw new AppError('DatabaseRead', 'Categories could not be read', { cause: error })
    }
  }
}
