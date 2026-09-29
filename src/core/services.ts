import { liveQuery } from 'dexie'
import { backupService } from './backup'
import { categoriesService } from './categories'
import { systemClock } from './clock'
import { Engine, V4Database } from './database'
import { coreLog, domainError } from './errors'
import { focusService } from './focus'
import { habitsService } from './habits'
import { preferencesService } from './preferences'
import { getActivitySummary, getMonth, getTrend, todayService } from './queries'
import { createRecordService } from './records'
import type {
  ActivityInput,
  ActivitySession,
  LifeIndexServices,
  ServiceOptions,
  Transaction,
  TransactionInput,
  WeightEntry,
  WeightInput,
} from './types'
import { validateActivityInput, validateTransactionInput, validateWeightInput } from './validation'

export type * from './types'
export { createCompletionAttempt, deriveFocusDisplay } from './clock'
export { captureDateSelection } from './validation'

export function createLifeIndexServices(options: ServiceOptions = {}): LifeIndexServices {
  const database = new V4Database(options.databaseName ?? 'LifeIndexV4')
  const engine = new Engine(
    database,
    options.clock ?? systemClock,
    options.idGenerator ?? (() => crypto.randomUUID()),
  )
  const transactions = createRecordService<Transaction, TransactionInput>(
    engine,
    database.transactions,
    validateTransactionInput,
    () => ({ currency: 'CNY' }),
    (input) => ({ id: input.categoryId, scope: input.type }),
  )
  const weights = createRecordService<WeightEntry, WeightInput>(
    engine,
    database.weightEntries,
    validateWeightInput,
    () => ({}),
  )
  const activities = createRecordService<ActivitySession, ActivityInput>(
    engine,
    database.activitySessions,
    validateActivityInput,
    () => ({}),
    (input) => ({ id: input.categoryId, scope: 'activity' }),
  )
  // The factory exposes domain commands, not tables. One stable instance is owned by the application shell.
  return {
    database: { open: () => engine.ready(), close: () => engine.close() },
    clock: { capture: () => engine.capture() },
    observe: (query, observer) => {
      let stopped = false
      let subscription: { unsubscribe(): void } | undefined
      const report = (error: unknown) => {
        if (stopped) return
        const safe = domainError(error, 'ReadFailure')
        coreLog('read', 'failed', safe.code)
        observer.error(safe)
      }
      // Initialization may write seeds: finish it outside liveQuery's read-only scope.
      void engine
        .ready()
        .then(() => {
          if (stopped) return
          // Explicit async keeps observability across the query's native await boundaries.
          subscription = liveQuery(async () => await query()).subscribe({
            next: (value) => {
              if (!stopped) observer.next(value)
            },
            error: report,
          })
        })
        .catch(report)
      return () => {
        stopped = true
        subscription?.unsubscribe()
      }
    },
    today: todayService(engine),
    transactions: { ...transactions, getMonth: getMonth(engine) },
    weights: { ...weights, getTrend: getTrend(engine) },
    activities: { ...activities, getSummary: getActivitySummary(engine) },
    categories: categoriesService(engine),
    habits: habitsService(engine),
    focus: focusService(engine),
    preferences: preferencesService(engine),
    backup: backupService(engine),
  }
}
