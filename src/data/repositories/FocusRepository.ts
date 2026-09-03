import { LifeIndexDatabase } from '@/data/db/LifeIndexDatabase'
import { toLocalDateKey } from '@/shared/domain/date'
import type { Clock, IdGenerator } from '@/shared/domain/runtime'
import { cryptoIdGenerator, systemClock } from '@/shared/domain/runtime'
import type { FocusSession, LocalDateRange } from '@/shared/domain/types'
import { AppError } from '@/shared/errors/AppError'
import { logger } from '@/shared/logging/logger'
import { focusSessionSchema } from '@/shared/validation/schemas'

export interface StartFocusCommand {
  title: string
  plannedDurationSeconds: number
  categoryId?: string
  note?: string
}

export interface UpdateFocusDetailsCommand {
  title: string
  categoryId?: string
  note?: string
}

export class FocusRepository {
  constructor(
    private readonly database: LifeIndexDatabase,
    private readonly clock: Clock = systemClock,
    private readonly idGenerator: IdGenerator = cryptoIdGenerator,
  ) {}

  async start(command: StartFocusCommand): Promise<FocusSession> {
    logger.info('focus.start.started', { entityType: 'focusSession', operation: 'start' })
    try {
      return await this.database.transaction(
        'rw',
        this.database.focusSessions,
        this.database.categories,
        async () => {
          const active = await this.database.focusSessions.where('status').equals('active').first()
          if (active) {
            logger.info('focus.start.alreadyactive', {
              entityType: 'focusSession',
              operation: 'start',
              fromState: 'active',
              toState: 'active',
              count: 0,
            })
            return active
          }

          await this.assertFocusCategory(command.categoryId)
          const now = this.clock.now()
          const timestamp = now.toISOString()
          const candidate = {
            ...command,
            id: this.idGenerator.next(),
            status: 'active',
            startedAt: timestamp,
            expectedEndAt: new Date(
              now.getTime() + command.plannedDurationSeconds * 1000,
            ).toISOString(),
            localDate: toLocalDateKey(now),
            timezoneOffsetMinutes: now.getTimezoneOffset(),
            createdAt: timestamp,
            updatedAt: timestamp,
          }
          const parsed = focusSessionSchema.safeParse(candidate)
          if (!parsed.success) throw new AppError('Validation', 'Focus session validation failed')
          const session = parsed.data as FocusSession
          await this.database.focusSessions.add(session)
          logger.info('focus.start.succeeded', {
            entityType: 'focusSession',
            operation: 'start',
            fromState: 'idle',
            toState: 'active',
            count: 1,
          })
          return session
        },
      )
    } catch (error) {
      this.throwFailure('focus.start.failed', 'start', error)
    }
  }

  async getActive(): Promise<FocusSession | undefined> {
    try {
      return await this.database.focusSessions.where('status').equals('active').first()
    } catch (error) {
      this.throwReadFailure('focus.active.readfailed', 'read', error)
    }
  }

  async reconcileActive(now = this.clock.now().toISOString()): Promise<FocusSession | undefined> {
    logger.info('focus.reconcile.started', {
      entityType: 'focusSession',
      operation: 'reconcile',
    })
    try {
      return await this.database.transaction('rw', this.database.focusSessions, async () => {
        const active = await this.database.focusSessions.where('status').equals('active').first()
        if (!active) {
          logger.info('focus.reconcile.noactive', {
            entityType: 'focusSession',
            operation: 'reconcile',
            count: 0,
          })
          return undefined
        }
        if (new Date(now).getTime() < new Date(active.expectedEndAt).getTime()) {
          logger.info('focus.reconcile.notdue', {
            entityType: 'focusSession',
            operation: 'reconcile',
            fromState: 'active',
            toState: 'active',
          })
          return active
        }

        // Natural completion uses the planned endpoint, not a delayed resume callback time.
        const completed: FocusSession = {
          ...active,
          status: 'completed',
          endedAt: active.expectedEndAt,
          durationSeconds: active.plannedDurationSeconds,
          completionKind: 'timer',
          updatedAt: now,
        }
        await this.database.focusSessions.put(completed)
        logger.info('focus.reconcile.completed', {
          entityType: 'focusSession',
          operation: 'reconcile',
          fromState: 'active',
          toState: 'completed',
          reason: 'TimerElapsed',
          count: 1,
        })
        return completed
      })
    } catch (error) {
      this.throwFailure('focus.reconcile.failed', 'reconcile', error)
    }
  }

  async finishEarly(
    id: string,
    now = this.clock.now().toISOString(),
  ): Promise<FocusSession | undefined> {
    logger.info('focus.finish.started', { entityType: 'focusSession', operation: 'finish' })
    try {
      return await this.database.transaction(
        'rw',
        this.database.focusSessions,
        this.database.actionReceipts,
        async () => {
          const active = await this.database.focusSessions.get(id)
          if (!active || active.status !== 'active') {
            logger.info('focus.finish.notactive', {
              entityType: 'focusSession',
              operation: 'finish',
              count: 0,
            })
            return undefined
          }
          if (new Date(now).getTime() >= new Date(active.expectedEndAt).getTime()) {
            return this.completeNaturalInsideTransaction(active, now)
          }

          const elapsedSeconds = Math.floor(
            (new Date(now).getTime() - new Date(active.startedAt).getTime()) / 1000,
          )
          if (elapsedSeconds < 1) {
            // Sub-second sessions carry no useful duration and follow cancel semantics.
            await this.database.focusSessions.delete(id)
            await this.database.actionReceipts.where('outcomeEntityId').equals(id).delete()
            logger.info('focus.finish.cancelledshort', {
              entityType: 'focusSession',
              operation: 'finish',
              fromState: 'active',
              toState: 'idle',
              reason: 'BelowOneSecond',
            })
            return undefined
          }

          const completed: FocusSession = {
            ...active,
            status: 'completed',
            endedAt: now,
            durationSeconds: elapsedSeconds,
            completionKind: 'early',
            updatedAt: now,
          }
          await this.database.focusSessions.put(completed)
          logger.info('focus.finish.succeeded', {
            entityType: 'focusSession',
            operation: 'finish',
            fromState: 'active',
            toState: 'completed',
            reason: 'EarlyFinish',
            count: 1,
          })
          return completed
        },
      )
    } catch (error) {
      this.throwFailure('focus.finish.failed', 'finish', error)
    }
  }

  async cancel(id: string): Promise<void> {
    logger.info('focus.cancel.started', { entityType: 'focusSession', operation: 'cancel' })
    try {
      await this.database.transaction(
        'rw',
        this.database.focusSessions,
        this.database.actionReceipts,
        async () => {
          const active = await this.database.focusSessions.get(id)
          if (!active || active.status !== 'active') {
            logger.info('focus.cancel.notactive', {
              entityType: 'focusSession',
              operation: 'cancel',
              count: 0,
            })
            return
          }
          await this.database.focusSessions.delete(id)
          await this.database.actionReceipts.where('outcomeEntityId').equals(id).delete()
          logger.info('focus.cancel.succeeded', {
            entityType: 'focusSession',
            operation: 'cancel',
            fromState: 'active',
            toState: 'idle',
            count: 1,
          })
        },
      )
    } catch (error) {
      this.throwFailure('focus.cancel.failed', 'cancel', error)
    }
  }

  async updateDetails(id: string, command: UpdateFocusDetailsCommand): Promise<FocusSession> {
    logger.info('focus.details.started', { entityType: 'focusSession', operation: 'update' })
    try {
      return await this.database.transaction(
        'rw',
        this.database.focusSessions,
        this.database.categories,
        async () => {
          const existing = await this.database.focusSessions.get(id)
          if (!existing) throw new AppError('Validation', 'Focus session does not exist')
          await this.assertFocusCategory(command.categoryId)
          const parsed = focusSessionSchema.safeParse({
            ...existing,
            ...command,
            updatedAt: this.clock.now().toISOString(),
          })
          if (!parsed.success) throw new AppError('Validation', 'Focus details are invalid')
          const session = parsed.data as FocusSession
          await this.database.focusSessions.put(session)
          logger.info('focus.details.succeeded', {
            entityType: 'focusSession',
            operation: 'update',
            count: 1,
          })
          return session
        },
      )
    } catch (error) {
      this.throwFailure('focus.details.failed', 'update', error)
    }
  }

  async removeCompleted(id: string): Promise<void> {
    logger.info('focus.delete.started', { entityType: 'focusSession', operation: 'delete' })
    try {
      await this.database.transaction(
        'rw',
        this.database.focusSessions,
        this.database.actionReceipts,
        async () => {
          const existing = await this.database.focusSessions.get(id)
          if (!existing || existing.status !== 'completed') {
            throw new AppError('Validation', 'Completed focus session does not exist')
          }
          await this.database.focusSessions.delete(id)
          await this.database.actionReceipts.where('outcomeEntityId').equals(id).delete()
          logger.info('focus.delete.succeeded', {
            entityType: 'focusSession',
            operation: 'delete',
            count: 1,
          })
        },
      )
    } catch (error) {
      this.throwFailure('focus.delete.failed', 'delete', error)
    }
  }

  async listCompleted(range: LocalDateRange): Promise<FocusSession[]> {
    try {
      const sessions = await this.database.focusSessions
        .where('localDate')
        .between(range.from, range.to, true, true)
        .filter(({ status }) => status === 'completed')
        .toArray()
      return sessions.sort((left, right) => right.startedAt.localeCompare(left.startedAt))
    } catch (error) {
      this.throwReadFailure('focus.history.readfailed', 'list', error)
    }
  }

  private async completeNaturalInsideTransaction(
    active: FocusSession,
    now: string,
  ): Promise<FocusSession> {
    const completed: FocusSession = {
      ...active,
      status: 'completed',
      endedAt: active.expectedEndAt,
      durationSeconds: active.plannedDurationSeconds,
      completionKind: 'timer',
      updatedAt: now,
    }
    await this.database.focusSessions.put(completed)
    logger.info('focus.finish.naturalcompletion', {
      entityType: 'focusSession',
      operation: 'finish',
      fromState: 'active',
      toState: 'completed',
      reason: 'TimerElapsed',
      count: 1,
    })
    return completed
  }

  private async assertFocusCategory(categoryId: string | undefined): Promise<void> {
    if (!categoryId) return
    const category = await this.database.categories.get(categoryId)
    if (category?.domain !== 'focus') {
      throw new AppError('Validation', 'Focus category is invalid')
    }
  }

  private throwReadFailure(event: string, operation: string, error: unknown): never {
    logger.error(event, error, {
      entityType: 'focusSession',
      operation,
      failureClass: 'DatabaseRead',
    })
    throw new AppError('DatabaseRead', 'Focus data could not be read', { cause: error })
  }

  private throwFailure(event: string, operation: string, error: unknown): never {
    const failure =
      error instanceof AppError
        ? error
        : new AppError('DatabaseWrite', 'Focus change failed', { cause: error })
    logger.error(event, error, {
      entityType: 'focusSession',
      operation,
      failureClass: failure.failureClass,
    })
    throw failure
  }
}
