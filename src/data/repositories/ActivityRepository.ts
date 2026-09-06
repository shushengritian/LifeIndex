import { LifeIndexDatabase } from '@/data/db/LifeIndexDatabase'
import type { Clock, IdGenerator } from '@/shared/domain/runtime'
import { cryptoIdGenerator, systemClock } from '@/shared/domain/runtime'
import type { ActivityIntensity, ActivitySession, LocalDateRange } from '@/shared/domain/types'
import { AppError } from '@/shared/errors/AppError'
import { logger } from '@/shared/logging/logger'
import { activitySessionSchema } from '@/shared/validation/schemas'

export interface SaveActivitySessionCommand {
  categoryId: string
  durationMinutes: number
  intensity: ActivityIntensity
  occurredAt: string
  localDate: string
  timezoneOffsetMinutes: number
  note?: string
}

export class ActivityRepository {
  constructor(
    private readonly database: LifeIndexDatabase,
    private readonly clock: Clock = systemClock,
    private readonly idGenerator: IdGenerator = cryptoIdGenerator,
  ) {}

  async create(command: SaveActivitySessionCommand): Promise<ActivitySession> {
    logger.info('activity.create.started', {
      entityType: 'activitySession',
      operation: 'create',
    })
    const timestamp = this.clock.now().toISOString()
    return this.write('create', {
      ...command,
      id: this.idGenerator.next(),
      createdAt: timestamp,
      updatedAt: timestamp,
    })
  }

  async update(id: string, command: SaveActivitySessionCommand): Promise<ActivitySession> {
    logger.info('activity.update.started', {
      entityType: 'activitySession',
      operation: 'update',
    })
    const existing = await this.get(id)
    if (!existing) throw new AppError('Validation', 'Activity session does not exist')
    return this.write(
      'update',
      { ...existing, ...command, updatedAt: this.clock.now().toISOString() },
      existing.categoryId,
    )
  }

  async remove(id: string): Promise<void> {
    logger.info('activity.delete.started', {
      entityType: 'activitySession',
      operation: 'delete',
    })
    try {
      const existing = await this.database.activitySessions.get(id)
      await this.database.activitySessions.delete(id)
      logger.info('activity.delete.succeeded', {
        entityType: 'activitySession',
        operation: 'delete',
        count: existing ? 1 : 0,
      })
    } catch (error) {
      this.throwWriteFailure('activity.delete.failed', 'delete', error)
    }
  }

  async get(id: string): Promise<ActivitySession | undefined> {
    logger.info('activity.read.started', { entityType: 'activitySession', operation: 'read' })
    try {
      const session = await this.database.activitySessions.get(id)
      logger.info('activity.read.succeeded', {
        entityType: 'activitySession',
        operation: 'read',
        count: session ? 1 : 0,
      })
      return session
    } catch (error) {
      this.throwReadFailure('activity.read.failed', 'read', error)
    }
  }

  async list(range: LocalDateRange): Promise<ActivitySession[]> {
    logger.info('activity.list.started', { entityType: 'activitySession', operation: 'list' })
    try {
      const sessions = await this.database.activitySessions
        .where('localDate')
        .between(range.from, range.to, true, true)
        .toArray()
      const result = sessions.sort((left, right) => right.occurredAt.localeCompare(left.occurredAt))
      logger.info('activity.list.succeeded', {
        entityType: 'activitySession',
        operation: 'list',
        count: result.length,
      })
      return result
    } catch (error) {
      this.throwReadFailure('activity.list.failed', 'list', error)
    }
  }

  private async write(
    operation: 'create' | 'update',
    candidate: unknown,
    existingCategoryId?: string,
  ): Promise<ActivitySession> {
    try {
      return await this.database.transaction(
        'rw',
        this.database.categories,
        this.database.activitySessions,
        async () => {
          const parsed = activitySessionSchema.safeParse(candidate)
          if (!parsed.success) throw new AppError('Validation', 'Activity validation failed')
          const session = parsed.data as ActivitySession
          const category = await this.database.categories.get(session.categoryId)
          const keepsHistoricalArchivedCategory =
            operation === 'update' && existingCategoryId === session.categoryId
          if (
            category?.domain !== 'activity' ||
            (category.archived === 1 && !keepsHistoricalArchivedCategory)
          ) {
            throw new AppError('Validation', 'Activity category is invalid')
          }

          // Reference validation and write are atomic; archived history remains editable in place.
          if (operation === 'create') await this.database.activitySessions.add(session)
          else await this.database.activitySessions.put(session)
          logger.info(`activity.${operation}.succeeded`, {
            entityType: 'activitySession',
            operation,
            count: 1,
          })
          return session
        },
      )
    } catch (error) {
      this.throwWriteFailure(`activity.${operation}.failed`, operation, error)
    }
  }

  private throwReadFailure(event: string, operation: string, error: unknown): never {
    logger.error(event, error, {
      entityType: 'activitySession',
      operation,
      failureClass: 'DatabaseRead',
    })
    throw new AppError('DatabaseRead', 'Activities could not be read', { cause: error })
  }

  private throwWriteFailure(event: string, operation: string, error: unknown): never {
    const failure =
      error instanceof AppError
        ? error
        : new AppError('DatabaseWrite', 'Activity change failed', { cause: error })
    logger.error(event, error, {
      entityType: 'activitySession',
      operation,
      failureClass: failure.failureClass,
    })
    throw failure
  }
}
