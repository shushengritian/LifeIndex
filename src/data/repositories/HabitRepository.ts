import { LifeIndexDatabase } from '@/data/db/LifeIndexDatabase'
import { isHabitScheduled, isHabitVisibleForToday } from '@/features/habits/habitDomain'
import type { Clock, IdGenerator } from '@/shared/domain/runtime'
import { cryptoIdGenerator, systemClock } from '@/shared/domain/runtime'
import type {
  Habit,
  HabitRecord,
  HabitSchedule,
  HabitStatus,
  LocalDateRange,
} from '@/shared/domain/types'
import { AppError } from '@/shared/errors/AppError'
import { logger } from '@/shared/logging/logger'
import { habitRecordSchema, habitSchema } from '@/shared/validation/schemas'

export interface SaveHabitCommand {
  name: string
  icon: string
  color: string
  schedule: HabitSchedule
  startLocalDate: string
  note?: string
}

export interface CheckInHabitCommand {
  habitId: string
  localDate: string
  completedAt: string
  timezoneOffsetMinutes: number
  note?: string
}

export class HabitRepository {
  constructor(
    private readonly database: LifeIndexDatabase,
    private readonly clock: Clock = systemClock,
    private readonly idGenerator: IdGenerator = cryptoIdGenerator,
  ) {}

  async create(command: SaveHabitCommand): Promise<Habit> {
    logger.info('habit.create.started', { entityType: 'habit', operation: 'create' })
    const timestamp = this.clock.now().toISOString()
    return this.write('create', {
      ...command,
      id: this.idGenerator.next(),
      status: 'active',
      createdAt: timestamp,
      updatedAt: timestamp,
    })
  }

  async update(id: string, command: SaveHabitCommand): Promise<Habit> {
    logger.info('habit.update.started', { entityType: 'habit', operation: 'update' })
    const existing = await this.database.habits.get(id)
    if (!existing) throw new AppError('Validation', 'Habit does not exist')
    return this.write('update', {
      ...existing,
      ...command,
      updatedAt: this.clock.now().toISOString(),
    })
  }

  async setStatus(id: string, status: HabitStatus): Promise<Habit> {
    logger.info('habit.status.started', { entityType: 'habit', operation: 'status' })
    try {
      return await this.database.transaction('rw', this.database.habits, async () => {
        const existing = await this.database.habits.get(id)
        if (!existing) throw new AppError('Validation', 'Habit does not exist')
        if (existing.status === status) {
          logger.info('habit.status.alreadypresent', {
            entityType: 'habit',
            operation: 'status',
            fromState: status,
            toState: status,
          })
          return existing
        }
        const timestamp = this.clock.now().toISOString()
        const candidate = {
          ...existing,
          status,
          ...(status === 'paused' ? { pausedAt: timestamp } : {}),
          updatedAt: timestamp,
        }
        if (status === 'active') delete candidate.pausedAt
        const parsed = habitSchema.safeParse(candidate)
        if (!parsed.success) throw new AppError('Validation', 'Habit status is invalid')
        const habit = parsed.data as Habit
        await this.database.habits.put(habit)
        logger.info('habit.status.succeeded', {
          entityType: 'habit',
          operation: 'status',
          fromState: existing.status,
          toState: status,
          count: 1,
        })
        return habit
      })
    } catch (error) {
      this.throwFailure('habit.status.failed', 'status', error)
    }
  }

  async listAll(): Promise<Habit[]> {
    logger.info('habit.list.started', { entityType: 'habit', operation: 'list' })
    try {
      const habits = await this.database.habits.toArray()
      const result = habits.sort((left, right) => left.createdAt.localeCompare(right.createdAt))
      logger.info('habit.list.succeeded', {
        entityType: 'habit',
        operation: 'list',
        count: result.length,
      })
      return result
    } catch (error) {
      this.throwReadFailure('habit.list.failed', 'list', error)
    }
  }

  async listScheduled(localDate: string): Promise<Habit[]> {
    return (await this.listAll()).filter((habit) => isHabitVisibleForToday(habit, localDate))
  }

  async checkIn(command: CheckInHabitCommand): Promise<HabitRecord> {
    logger.info('habit.checkin.started', { entityType: 'habitRecord', operation: 'create' })
    try {
      return await this.database.transaction(
        'rw',
        this.database.habits,
        this.database.habitRecords,
        async () => {
          const existing = await this.database.habitRecords
            .where('[habitId+localDate]')
            .equals([command.habitId, command.localDate])
            .first()
          if (existing) {
            logger.info('habit.checkin.alreadypresent', {
              entityType: 'habitRecord',
              operation: 'create',
              count: 0,
            })
            return existing
          }
          const habit = await this.database.habits.get(command.habitId)
          if (!habit || !isHabitScheduled(habit, command.localDate)) {
            throw new AppError('Validation', 'Habit is not scheduled for this date')
          }
          const timestamp = this.clock.now().toISOString()
          const parsed = habitRecordSchema.safeParse({
            ...command,
            id: this.idGenerator.next(),
            createdAt: timestamp,
            updatedAt: timestamp,
          })
          if (!parsed.success) throw new AppError('Validation', 'Habit check-in is invalid')
          const record = parsed.data as HabitRecord
          await this.database.habitRecords.add(record)
          logger.info('habit.checkin.succeeded', {
            entityType: 'habitRecord',
            operation: 'create',
            count: 1,
          })
          return record
        },
      )
    } catch (error) {
      this.throwFailure('habit.checkin.failed', 'create', error)
    }
  }

  async undoCheckIn(habitId: string, localDate: string): Promise<void> {
    logger.info('habit.checkin.undo.started', { entityType: 'habitRecord', operation: 'delete' })
    try {
      await this.database.transaction(
        'rw',
        this.database.habitRecords,
        this.database.actionReceipts,
        async () => {
          const record = await this.database.habitRecords
            .where('[habitId+localDate]')
            .equals([habitId, localDate])
            .first()
          if (!record) {
            logger.info('habit.checkin.undoabsent', {
              entityType: 'habitRecord',
              operation: 'delete',
              count: 0,
            })
            return
          }
          await this.database.habitRecords.delete(record.id)
          await this.database.actionReceipts.where('outcomeEntityId').equals(record.id).delete()
          logger.info('habit.checkin.undo.succeeded', {
            entityType: 'habitRecord',
            operation: 'delete',
            count: 1,
          })
        },
      )
    } catch (error) {
      this.throwFailure('habit.checkin.undofailed', 'delete', error)
    }
  }

  async listRecords(habitId: string, range: LocalDateRange): Promise<HabitRecord[]> {
    try {
      return await this.database.habitRecords
        .where('[habitId+localDate]')
        .between([habitId, range.from], [habitId, range.to], true, true)
        .toArray()
    } catch (error) {
      this.throwReadFailure('habit.records.failed', 'list', error)
    }
  }

  private async write(operation: 'create' | 'update', candidate: unknown): Promise<Habit> {
    try {
      const parsed = habitSchema.safeParse(candidate)
      if (!parsed.success) throw new AppError('Validation', 'Habit validation failed')
      const habit = parsed.data as Habit
      if (operation === 'create') await this.database.habits.add(habit)
      else {
        if (!(await this.database.habits.get(habit.id))) {
          throw new AppError('Validation', 'Habit does not exist')
        }
        await this.database.habits.put(habit)
      }
      logger.info(`habit.${operation}.succeeded`, {
        entityType: 'habit',
        operation,
        count: 1,
      })
      return habit
    } catch (error) {
      this.throwFailure(`habit.${operation}.failed`, operation, error)
    }
  }

  private throwReadFailure(event: string, operation: string, error: unknown): never {
    logger.error(event, error, {
      entityType: 'habit',
      operation,
      failureClass: 'DatabaseRead',
    })
    throw new AppError('DatabaseRead', 'Habit data could not be read', { cause: error })
  }

  private throwFailure(event: string, operation: string, error: unknown): never {
    const failure =
      error instanceof AppError
        ? error
        : new AppError('DatabaseWrite', 'Habit change failed', { cause: error })
    logger.error(event, error, {
      entityType: 'habit',
      operation,
      failureClass: failure.failureClass,
    })
    throw failure
  }
}
