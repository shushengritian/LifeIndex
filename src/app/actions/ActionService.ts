import { LifeIndexDatabase } from '@/data/db/LifeIndexDatabase'
import { isHabitScheduled } from '@/features/habits/habitDomain'
import { toLocalDateKey } from '@/shared/domain/date'
import type { Clock, IdGenerator } from '@/shared/domain/runtime'
import { cryptoIdGenerator, systemClock } from '@/shared/domain/runtime'
import type {
  ActionReceipt,
  ActionType,
  FocusSession,
  HabitRecord,
  Transaction,
} from '@/shared/domain/types'
import { AppError } from '@/shared/errors/AppError'
import { logger } from '@/shared/logging/logger'
import {
  actionReceiptSchema,
  focusSessionSchema,
  habitRecordSchema,
  transactionSchema,
} from '@/shared/validation/schemas'

import type { ParsedAction } from './actionParser'

export type ActionDestination = '/finance' | '/habits' | '/focus'

export type ActionInspection =
  | { status: 'handled'; destination: ActionDestination }
  | { status: 'ready'; referenceLabel: string; alreadySatisfied: boolean }

export interface ActionExecutionResult {
  status: 'created' | 'handled'
  destination: ActionDestination
}

function destinationFor(actionType: ActionType): ActionDestination {
  if (actionType === 'add-transaction') return '/finance'
  if (actionType === 'check-habit') return '/habits'
  return '/focus'
}

export class ActionService {
  constructor(
    private readonly database: LifeIndexDatabase,
    private readonly clock: Clock = systemClock,
    private readonly idGenerator: IdGenerator = cryptoIdGenerator,
  ) {}

  async inspect(action: ParsedAction): Promise<ActionInspection> {
    logger.info('action.inspect.started', { operation: 'inspect', actionType: action.type })
    try {
      const receipt = await this.database.actionReceipts.get(action.actionId)
      if (receipt) {
        this.assertReceiptType(receipt, action.type)
        logger.info('action.inspect.handled', {
          operation: 'inspect',
          actionType: action.type,
          count: 1,
        })
        return { status: 'handled', destination: destinationFor(action.type) }
      }

      let referenceLabel: string
      let alreadySatisfied = false
      if (action.type === 'add-transaction') {
        const category = await this.database.categories.get(action.draft.categoryId)
        if (
          !category ||
          category.archived === 1 ||
          category.domain !== 'finance' ||
          category.transactionType !== action.draft.type
        ) {
          throw new AppError('Validation', 'Action category is unavailable')
        }
        referenceLabel = category.name
      } else if (action.type === 'check-habit') {
        const habit = await this.database.habits.get(action.habitId)
        if (!habit || habit.status !== 'active' || !isHabitScheduled(habit, action.localDate)) {
          throw new AppError('Validation', 'Action habit is unavailable')
        }
        referenceLabel = habit.name
        alreadySatisfied = Boolean(
          await this.database.habitRecords
            .where('[habitId+localDate]')
            .equals([action.habitId, action.localDate])
            .first(),
        )
      } else {
        const active = await this.database.focusSessions.where('status').equals('active').first()
        if (active) throw new AppError('Validation', 'An active focus session already exists')
        if (action.draft.categoryId) {
          const category = await this.database.categories.get(action.draft.categoryId)
          if (!category || category.archived === 1 || category.domain !== 'focus') {
            throw new AppError('Validation', 'Action category is unavailable')
          }
          referenceLabel = category.name
        } else {
          referenceLabel = '未分类'
        }
      }

      logger.info('action.inspect.ready', {
        operation: 'inspect',
        actionType: action.type,
        count: alreadySatisfied ? 0 : 1,
      })
      return { status: 'ready', referenceLabel, alreadySatisfied }
    } catch (error) {
      this.throwFailure('action.inspect.failed', 'inspect', action.type, error)
    }
  }

  async execute(action: ParsedAction): Promise<ActionExecutionResult> {
    logger.info('action.execute.started', { operation: 'execute', actionType: action.type })
    try {
      const result =
        action.type === 'add-transaction'
          ? await this.executeTransaction(action)
          : action.type === 'check-habit'
            ? await this.executeHabit(action)
            : await this.executeFocus(action)
      logger.info(`action.execute.${result.status}`, {
        operation: 'execute',
        actionType: action.type,
        count: result.status === 'created' ? 1 : 0,
      })
      return result
    } catch (error) {
      this.throwFailure('action.execute.failed', 'execute', action.type, error)
    }
  }

  private async executeTransaction(
    action: Extract<ParsedAction, { type: 'add-transaction' }>,
  ): Promise<ActionExecutionResult> {
    return this.database.transaction(
      'rw',
      this.database.categories,
      this.database.transactions,
      this.database.actionReceipts,
      async () => {
        const handled = await this.handledResult(action.actionId, action.type)
        if (handled) return handled
        const category = await this.database.categories.get(action.draft.categoryId)
        if (
          !category ||
          category.archived === 1 ||
          category.domain !== 'finance' ||
          category.transactionType !== action.draft.type
        ) {
          throw new AppError('Validation', 'Action category is unavailable')
        }

        const now = this.clock.now()
        const timestamp = now.toISOString()
        const parsed = transactionSchema.safeParse({
          ...action.draft,
          id: this.idGenerator.next(),
          currency: 'CNY',
          createdAt: timestamp,
          updatedAt: timestamp,
        })
        if (!parsed.success) throw new AppError('Validation', 'Action transaction is invalid')
        const transaction = parsed.data as Transaction
        await this.database.transactions.add(transaction)
        await this.addReceipt(action, transaction.id, timestamp)
        return { status: 'created', destination: '/finance' }
      },
    )
  }

  private async executeHabit(
    action: Extract<ParsedAction, { type: 'check-habit' }>,
  ): Promise<ActionExecutionResult> {
    return this.database.transaction(
      'rw',
      this.database.habits,
      this.database.habitRecords,
      this.database.actionReceipts,
      async () => {
        const handled = await this.handledResult(action.actionId, action.type)
        if (handled) return handled
        const habit = await this.database.habits.get(action.habitId)
        if (!habit || habit.status !== 'active' || !isHabitScheduled(habit, action.localDate)) {
          throw new AppError('Validation', 'Action habit is unavailable')
        }

        const existing = await this.database.habitRecords
          .where('[habitId+localDate]')
          .equals([action.habitId, action.localDate])
          .first()
        const now = this.clock.now()
        const timestamp = now.toISOString()
        let record = existing
        if (!record) {
          const parsed = habitRecordSchema.safeParse({
            id: this.idGenerator.next(),
            habitId: action.habitId,
            localDate: action.localDate,
            completedAt: timestamp,
            timezoneOffsetMinutes: now.getTimezoneOffset(),
            createdAt: timestamp,
            updatedAt: timestamp,
          })
          if (!parsed.success) throw new AppError('Validation', 'Action habit record is invalid')
          record = parsed.data as HabitRecord
          await this.database.habitRecords.add(record)
        }
        // A pre-existing daily check-in is a successful no-op; the receipt still makes this action durable.
        await this.addReceipt(action, record.id, timestamp)
        return { status: 'created', destination: '/habits' }
      },
    )
  }

  private async executeFocus(
    action: Extract<ParsedAction, { type: 'start-focus' }>,
  ): Promise<ActionExecutionResult> {
    return this.database.transaction(
      'rw',
      this.database.categories,
      this.database.focusSessions,
      this.database.actionReceipts,
      async () => {
        const handled = await this.handledResult(action.actionId, action.type)
        if (handled) return handled
        if (await this.database.focusSessions.where('status').equals('active').first()) {
          throw new AppError('Validation', 'An active focus session already exists')
        }
        if (action.draft.categoryId) {
          const category = await this.database.categories.get(action.draft.categoryId)
          if (!category || category.archived === 1 || category.domain !== 'focus') {
            throw new AppError('Validation', 'Action category is unavailable')
          }
        }

        const now = this.clock.now()
        const timestamp = now.toISOString()
        const parsed = focusSessionSchema.safeParse({
          ...action.draft,
          id: this.idGenerator.next(),
          status: 'active',
          startedAt: timestamp,
          expectedEndAt: new Date(
            now.getTime() + action.draft.plannedDurationSeconds * 1000,
          ).toISOString(),
          localDate: toLocalDateKey(now),
          timezoneOffsetMinutes: now.getTimezoneOffset(),
          createdAt: timestamp,
          updatedAt: timestamp,
        })
        if (!parsed.success) throw new AppError('Validation', 'Action focus session is invalid')
        const session = parsed.data as FocusSession
        await this.database.focusSessions.add(session)
        await this.addReceipt(action, session.id, timestamp)
        return { status: 'created', destination: '/focus' }
      },
    )
  }

  private async handledResult(
    actionId: string,
    actionType: ActionType,
  ): Promise<ActionExecutionResult | undefined> {
    const receipt = await this.database.actionReceipts.get(actionId)
    if (!receipt) return undefined
    this.assertReceiptType(receipt, actionType)
    return { status: 'handled', destination: destinationFor(actionType) }
  }

  private assertReceiptType(receipt: ActionReceipt, actionType: ActionType): void {
    if (receipt.actionType !== actionType) {
      throw new AppError('Validation', 'Action ID belongs to another action type')
    }
  }

  private async addReceipt(
    action: ParsedAction,
    outcomeEntityId: string,
    handledAt: string,
  ): Promise<void> {
    const parsed = actionReceiptSchema.safeParse({
      actionId: action.actionId,
      actionType: action.type,
      handledAt,
      outcomeEntityId,
    })
    if (!parsed.success) throw new AppError('Validation', 'Action receipt is invalid')
    await this.database.actionReceipts.add(parsed.data as ActionReceipt)
  }

  private throwFailure(
    event: string,
    operation: string,
    actionType: ActionType,
    error: unknown,
  ): never {
    const failure =
      error instanceof AppError
        ? error
        : new AppError(
            operation === 'inspect' ? 'DatabaseRead' : 'DatabaseWrite',
            'URL action failed',
            { cause: error },
          )
    logger.error(event, error, {
      operation,
      actionType,
      failureClass: failure.failureClass,
    })
    throw failure
  }
}
