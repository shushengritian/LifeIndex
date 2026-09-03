import { LifeIndexDatabase } from '@/data/db/LifeIndexDatabase'
import type { Clock, IdGenerator } from '@/shared/domain/runtime'
import { cryptoIdGenerator, systemClock } from '@/shared/domain/runtime'
import type { LocalDateRange, Transaction, TransactionType } from '@/shared/domain/types'
import { AppError } from '@/shared/errors/AppError'
import { logger } from '@/shared/logging/logger'
import { transactionSchema } from '@/shared/validation/schemas'

export interface SaveTransactionCommand {
  type: TransactionType
  amountMinor: number
  categoryId: string
  occurredAt: string
  localDate: string
  timezoneOffsetMinutes: number
  note?: string
}

export class TransactionRepository {
  constructor(
    private readonly database: LifeIndexDatabase,
    private readonly clock: Clock = systemClock,
    private readonly idGenerator: IdGenerator = cryptoIdGenerator,
  ) {}

  async create(command: SaveTransactionCommand): Promise<Transaction> {
    logger.info('transaction.create.started', {
      entityType: 'transaction',
      operation: 'create',
    })
    const timestamp = this.clock.now().toISOString()
    return this.write('create', {
      ...command,
      id: this.idGenerator.next(),
      currency: 'CNY',
      createdAt: timestamp,
      updatedAt: timestamp,
    })
  }

  async update(id: string, command: SaveTransactionCommand): Promise<Transaction> {
    logger.info('transaction.update.started', {
      entityType: 'transaction',
      operation: 'update',
    })
    const existing = await this.get(id)
    if (!existing) throw new AppError('Validation', 'Transaction does not exist')
    return this.write('update', {
      ...existing,
      ...command,
      updatedAt: this.clock.now().toISOString(),
    })
  }

  async remove(id: string): Promise<void> {
    logger.info('transaction.delete.started', {
      entityType: 'transaction',
      operation: 'delete',
    })
    try {
      await this.database.transaction(
        'rw',
        this.database.transactions,
        this.database.actionReceipts,
        async () => {
          const existing = await this.database.transactions.get(id)
          await this.database.transactions.delete(id)
          await this.database.actionReceipts.where('outcomeEntityId').equals(id).delete()
          logger.info('transaction.delete.succeeded', {
            entityType: 'transaction',
            operation: 'delete',
            count: existing ? 1 : 0,
          })
        },
      )
    } catch (error) {
      this.throwWriteFailure('transaction.delete.failed', 'delete', error)
    }
  }

  async get(id: string): Promise<Transaction | undefined> {
    logger.info('transaction.read.started', { entityType: 'transaction', operation: 'read' })
    try {
      const transaction = await this.database.transactions.get(id)
      logger.info('transaction.read.succeeded', {
        entityType: 'transaction',
        operation: 'read',
        count: transaction ? 1 : 0,
      })
      return transaction
    } catch (error) {
      logger.error('transaction.read.failed', error, {
        entityType: 'transaction',
        operation: 'read',
        failureClass: 'DatabaseRead',
      })
      throw new AppError('DatabaseRead', 'Transaction could not be read', { cause: error })
    }
  }

  async list(range: LocalDateRange): Promise<Transaction[]> {
    logger.info('transaction.list.started', { entityType: 'transaction', operation: 'list' })
    try {
      const transactions = await this.database.transactions
        .where('localDate')
        .between(range.from, range.to, true, true)
        .toArray()
      const result = transactions.sort((left, right) =>
        right.occurredAt.localeCompare(left.occurredAt),
      )
      logger.info('transaction.list.succeeded', {
        entityType: 'transaction',
        operation: 'list',
        count: result.length,
      })
      return result
    } catch (error) {
      logger.error('transaction.list.failed', error, {
        entityType: 'transaction',
        operation: 'list',
        failureClass: 'DatabaseRead',
      })
      throw new AppError('DatabaseRead', 'Transactions could not be read', { cause: error })
    }
  }

  private async write(operation: 'create' | 'update', candidate: unknown): Promise<Transaction> {
    try {
      return await this.database.transaction(
        'rw',
        this.database.categories,
        this.database.transactions,
        async () => {
          const parsed = transactionSchema.safeParse(candidate)
          if (!parsed.success) throw new AppError('Validation', 'Transaction validation failed')
          const transaction = parsed.data as Transaction
          const category = await this.database.categories.get(transaction.categoryId)
          if (category?.domain !== 'finance' || category.transactionType !== transaction.type) {
            throw new AppError('Validation', 'Transaction category does not match its type')
          }

          // Reference validation and write share one transaction so categories cannot change between them.
          if (operation === 'create') {
            await this.database.transactions.add(transaction)
          } else {
            const existing = await this.database.transactions.get(transaction.id)
            if (!existing) throw new AppError('Validation', 'Transaction does not exist')
            await this.database.transactions.put(transaction)
          }
          logger.info(`transaction.${operation}.succeeded`, {
            entityType: 'transaction',
            operation,
            count: 1,
          })
          return transaction
        },
      )
    } catch (error) {
      this.throwWriteFailure(`transaction.${operation}.failed`, operation, error)
    }
  }

  private throwWriteFailure(event: string, operation: string, error: unknown): never {
    const failure =
      error instanceof AppError
        ? error
        : new AppError('DatabaseWrite', 'Transaction write failed', { cause: error })
    logger.error(event, error, {
      entityType: 'transaction',
      operation,
      failureClass: failure.failureClass,
    })
    throw failure
  }
}
