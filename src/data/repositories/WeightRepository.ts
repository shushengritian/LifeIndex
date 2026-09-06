import { LifeIndexDatabase } from '@/data/db/LifeIndexDatabase'
import type { Clock, IdGenerator } from '@/shared/domain/runtime'
import { cryptoIdGenerator, systemClock } from '@/shared/domain/runtime'
import type { LocalDateRange, WeightEntry } from '@/shared/domain/types'
import { AppError } from '@/shared/errors/AppError'
import { logger } from '@/shared/logging/logger'
import { weightEntrySchema } from '@/shared/validation/schemas'

export interface SaveWeightEntryCommand {
  weightGrams: number
  measuredAt: string
  localDate: string
  timezoneOffsetMinutes: number
  note?: string
}

export class WeightRepository {
  constructor(
    private readonly database: LifeIndexDatabase,
    private readonly clock: Clock = systemClock,
    private readonly idGenerator: IdGenerator = cryptoIdGenerator,
  ) {}

  async create(command: SaveWeightEntryCommand): Promise<WeightEntry> {
    logger.info('weight.create.started', { entityType: 'weightEntry', operation: 'create' })
    const timestamp = this.clock.now().toISOString()
    return this.write('create', {
      ...command,
      id: this.idGenerator.next(),
      createdAt: timestamp,
      updatedAt: timestamp,
    })
  }

  async update(id: string, command: SaveWeightEntryCommand): Promise<WeightEntry> {
    logger.info('weight.update.started', { entityType: 'weightEntry', operation: 'update' })
    const existing = await this.get(id)
    if (!existing) throw new AppError('Validation', 'Weight entry does not exist')
    return this.write('update', {
      ...existing,
      ...command,
      updatedAt: this.clock.now().toISOString(),
    })
  }

  async remove(id: string): Promise<void> {
    logger.info('weight.delete.started', { entityType: 'weightEntry', operation: 'delete' })
    try {
      const existing = await this.database.weightEntries.get(id)
      await this.database.weightEntries.delete(id)
      logger.info('weight.delete.succeeded', {
        entityType: 'weightEntry',
        operation: 'delete',
        count: existing ? 1 : 0,
      })
    } catch (error) {
      this.throwWriteFailure('weight.delete.failed', 'delete', error)
    }
  }

  async get(id: string): Promise<WeightEntry | undefined> {
    logger.info('weight.read.started', { entityType: 'weightEntry', operation: 'read' })
    try {
      const entry = await this.database.weightEntries.get(id)
      logger.info('weight.read.succeeded', {
        entityType: 'weightEntry',
        operation: 'read',
        count: entry ? 1 : 0,
      })
      return entry
    } catch (error) {
      this.throwReadFailure('weight.read.failed', 'read', error)
    }
  }

  async latest(): Promise<WeightEntry | undefined> {
    logger.info('weight.latest.started', { entityType: 'weightEntry', operation: 'latest' })
    try {
      const entry = await this.database.weightEntries.orderBy('measuredAt').last()
      logger.info('weight.latest.succeeded', {
        entityType: 'weightEntry',
        operation: 'latest',
        count: entry ? 1 : 0,
      })
      return entry
    } catch (error) {
      this.throwReadFailure('weight.latest.failed', 'latest', error)
    }
  }

  async list(range: LocalDateRange): Promise<WeightEntry[]> {
    logger.info('weight.list.started', { entityType: 'weightEntry', operation: 'list' })
    try {
      const entries = await this.database.weightEntries
        .where('localDate')
        .between(range.from, range.to, true, true)
        .toArray()
      const result = entries.sort((left, right) => right.measuredAt.localeCompare(left.measuredAt))
      logger.info('weight.list.succeeded', {
        entityType: 'weightEntry',
        operation: 'list',
        count: result.length,
      })
      return result
    } catch (error) {
      this.throwReadFailure('weight.list.failed', 'list', error)
    }
  }

  private async write(operation: 'create' | 'update', candidate: unknown): Promise<WeightEntry> {
    try {
      const parsed = weightEntrySchema.safeParse(candidate)
      if (!parsed.success) throw new AppError('Validation', 'Weight entry validation failed')
      const entry = parsed.data as WeightEntry
      // Validation completes before the single-table write, so invalid private values never persist.
      if (operation === 'create') await this.database.weightEntries.add(entry)
      else await this.database.weightEntries.put(entry)
      logger.info(`weight.${operation}.succeeded`, {
        entityType: 'weightEntry',
        operation,
        count: 1,
      })
      return entry
    } catch (error) {
      this.throwWriteFailure(`weight.${operation}.failed`, operation, error)
    }
  }

  private throwReadFailure(event: string, operation: string, error: unknown): never {
    logger.error(event, error, {
      entityType: 'weightEntry',
      operation,
      failureClass: 'DatabaseRead',
    })
    throw new AppError('DatabaseRead', 'Weight entries could not be read', { cause: error })
  }

  private throwWriteFailure(event: string, operation: string, error: unknown): never {
    const failure =
      error instanceof AppError
        ? error
        : new AppError('DatabaseWrite', 'Weight entry change failed', { cause: error })
    logger.error(event, error, {
      entityType: 'weightEntry',
      operation,
      failureClass: failure.failureClass,
    })
    throw failure
  }
}
