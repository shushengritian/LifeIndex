import { LifeIndexDatabase } from '@/data/db/LifeIndexDatabase'
import { assertCessationIntegrity, zonedDateKey } from '@/shared/domain/cessation'
import type {
  CessationPlan,
  CessationDay,
  CessationEvent,
  CessationTrigger,
} from '@/shared/domain/types'
import type { Clock } from '@/shared/domain/runtime'
import { systemClock } from '@/shared/domain/runtime'
import { AppError } from '@/shared/errors/AppError'
import { logger } from '@/shared/logging/logger'
import {
  cessationPlanSchema,
  cessationDaySchema,
  cessationEventSchema,
} from '@/shared/validation/cessationSchemas'

export type PlanInput = Pick<CessationPlan, 'startAt' | 'timeZone' | 'reason' | 'baseline'>
export type EventInput = { occurredAt: string; trigger?: CessationTrigger } & (
  { kind: 'smoking'; count: number } | { kind: 'craving'; outcome: 'relieved' | 'still' }
)
export class CessationRepository {
  constructor(
    private readonly db: LifeIndexDatabase,
    private readonly clock: Clock = systemClock,
  ) {}
  private async run<T>(operation: string, write: boolean, action: () => Promise<T>): Promise<T> {
    logger.info('cessation.operation.started', { operation, entityType: 'cessation' })
    try {
      const result = await this.db.transaction(
        write ? 'rw' : 'r',
        [this.db.cessationPlans, this.db.cessationDays, this.db.cessationEvents],
        async () => {
          const result = await action()
          // Validate the complete affected domain before committing: backup and live writes share rules.
          if (write)
            assertCessationIntegrity(
              await this.db.cessationPlans.toArray(),
              await this.db.cessationDays.toArray(),
              await this.db.cessationEvents.toArray(),
              this.clock.now(),
            )
          return result
        },
      )
      logger.info('cessation.operation.succeeded', { operation, entityType: 'cessation' })
      return result
    } catch (error) {
      const failure =
        error instanceof AppError
          ? error
          : new AppError(write ? 'DatabaseWrite' : 'DatabaseRead', 'Cessation operation failed', {
              cause: error,
            })
      // Never include form values, trigger selections, dates or raw validation errors in diagnostics.
      logger.error('cessation.operation.failed', failure, {
        operation,
        failureClass: failure.failureClass,
      })
      throw failure
    }
  }
  async read() {
    return this.run('read', false, async () => ({
      plans: await this.db.cessationPlans.orderBy('startAt').reverse().toArray(),
      days: await this.db.cessationDays.toArray(),
      events: await this.db.cessationEvents.toArray(),
    }))
  }
  async start(id: string, input: PlanInput): Promise<void> {
    return this.run('start', true, async () => {
      if (await this.db.cessationPlans.get(id)) {
        logger.info('cessation.start.duplicate', { operation: 'start' })
        return
      }
      const now = this.clock.now()
      if (Date.parse(input.startAt) > now.getTime() + 30 * 86400000)
        throw new AppError('Validation', 'Plan starts too far in the future')
      const plan = cessationPlanSchema.safeParse({
        ...input,
        startAt: new Date(input.startAt).toISOString(),
        id,
        startLocalDate: zonedDateKey(new Date(input.startAt), input.timeZone),
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      })
      if (!plan.success) throw new AppError('Validation', 'Invalid plan')
      await this.db.cessationPlans.add(plan.data as CessationPlan)
    })
  }
  async end(id: string): Promise<void> {
    return this.run('end', true, async () => {
      const plan = await this.requirePlan(id)
      if (plan.endAt) return
      // A scheduled plan can be cancelled as an empty interval without rewriting its scheduled start.
      const endAt = new Date(
        Math.max(this.clock.now().getTime(), Date.parse(plan.startAt)),
      ).toISOString()
      await this.db.cessationPlans.put({
        ...plan,
        endAt,
        endLocalDate: zonedDateKey(new Date(endAt), plan.timeZone),
        updatedAt: this.clock.now().toISOString(),
      })
      logger.info('cessation.plan.ended', {
        operation: 'end',
        fromState: 'open',
        toState: 'closed',
      })
    })
  }
  async updateReason(id: string, reason: string): Promise<void> {
    return this.run('reason', true, async () => {
      const plan = await this.requirePlan(id)
      const candidate = {
        ...plan,
        reason: reason.trim() || undefined,
        updatedAt: this.clock.now().toISOString(),
      }
      const parsed = cessationPlanSchema.safeParse(candidate)
      if (!parsed.success) throw new AppError('Validation', 'Invalid reason')
      await this.db.cessationPlans.put(parsed.data as CessationPlan)
    })
  }
  async confirmDay(planId: string, localDate: string, kind: CessationDay['kind']): Promise<void> {
    return this.run('confirm', true, async () => {
      const now = this.clock.now().toISOString()
      const previous = await this.db.cessationDays
        .where('[planId+localDate]')
        .equals([planId, localDate])
        .first()
      const parsed = cessationDaySchema.safeParse({
        id: previous?.id ?? crypto.randomUUID(),
        planId,
        localDate,
        kind,
        reportedAt: now,
        createdAt: previous?.createdAt ?? now,
        updatedAt: now,
      })
      if (!parsed.success) throw new AppError('Validation', 'Invalid day confirmation')
      await this.db.cessationDays.put(parsed.data)
    })
  }
  async undoDay(planId: string, localDate: string): Promise<void> {
    return this.run('undo', true, async () => {
      await this.db.cessationDays.where('[planId+localDate]').equals([planId, localDate]).delete()
    })
  }
  async saveEvent(id: string, planId: string, input: EventInput, editing = false): Promise<void> {
    return this.run(editing ? 'edit' : 'record', true, async () => {
      const existing = await this.db.cessationEvents.get(id)
      if (existing && !editing) {
        logger.info('cessation.record.duplicate', { operation: 'record' })
        return
      }
      if (editing && (!existing || existing.planId !== planId))
        throw new AppError('Validation', 'Event missing')
      const plan = await this.requirePlan(planId)
      const timestamp = this.clock.now().toISOString()
      const parsed = cessationEventSchema.safeParse({
        ...input,
        id,
        planId,
        localDate: zonedDateKey(new Date(input.occurredAt), plan.timeZone),
        createdAt: existing?.createdAt ?? timestamp,
        updatedAt: timestamp,
      })
      if (!parsed.success) throw new AppError('Validation', 'Invalid event')
      const entry = parsed.data as CessationEvent
      // Smoking invalidates the destination-day assertion in the same transaction. Moving/deleting
      // an event never recreates an assertion on its old day: unknown is not evidence of abstinence.
      if (entry.kind === 'smoking') {
        await this.db.cessationDays
          .where('[planId+localDate]')
          .equals([planId, entry.localDate])
          .delete()
        logger.info('cessation.confirmation.invalidated', { operation: 'record' })
      }
      await this.db.cessationEvents.put(entry)
    })
  }
  async removeEvent(id: string): Promise<void> {
    return this.run('delete', true, async () => {
      await this.db.cessationEvents.delete(id)
    })
  }
  private async requirePlan(id: string): Promise<CessationPlan> {
    const plan = await this.db.cessationPlans.get(id)
    if (!plan) throw new AppError('Validation', 'Plan missing')
    return plan
  }
}
