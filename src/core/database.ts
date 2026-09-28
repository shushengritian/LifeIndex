import Dexie, { type Table } from 'dexie'
import { coreLog, domainError, fail } from './errors'
import type {
  ActivitySession,
  Category,
  CommandContext,
  DatabaseMeta,
  EntityBase,
  EntityRef,
  FocusSession,
  Habit,
  HabitCheck,
  LifeIndexClock,
  Preference,
  Snapshot,
  Transaction,
  WeightEntry,
} from './types'
import { integer, normalizeCategoryName, object, requireValue, uuid } from './validation'

export const V4_SCHEMA = {
  categories: 'id,scope,status,[scope+status],sortOrder',
  transactions: 'id,localDate,[localDate+createdAt],categoryId,[localDate+type]',
  weightEntries: 'id,localDate,[localDate+createdAt]',
  activitySessions: 'id,localDate,[localDate+createdAt],categoryId',
  habits: 'id,status,scheduleEffectiveFrom',
  habitChecks: 'id,&[habitId+localDate],habitId,localDate',
  focusSessions: 'id,status,localDate,startedAt,categoryId,&completionToken',
  preferences: 'key',
  meta: 'key',
}
export class V4Database extends Dexie {
  categories!: Table<Category, string>
  transactions!: Table<Transaction, string>
  weightEntries!: Table<WeightEntry, string>
  activitySessions!: Table<ActivitySession, string>
  habits!: Table<Habit, string>
  habitChecks!: Table<HabitCheck, string>
  focusSessions!: Table<FocusSession, string>
  preferences!: Table<Preference, string>
  meta!: Table<DatabaseMeta, string>
  constructor(name = 'LifeIndexV4') {
    super(name)
    this.version(1).stores(V4_SCHEMA)
  }
}
export class Engine {
  private opening: Promise<void> | undefined
  constructor(
    readonly db: V4Database,
    readonly clock: LifeIndexClock,
    readonly idGenerator: () => string,
  ) {}
  capture() {
    const nowMs = this.clock.now()
    return { nowMs, utcOffsetMinutes: this.clock.utcOffsetMinutes(nowMs) }
  }
  now(): string {
    return new Date(this.clock.now()).toISOString()
  }
  id(): string {
    return uuid(this.idGenerator())
  }
  async ready(): Promise<void> {
    if (!this.opening)
      this.opening = this.initialize().catch((error) => {
        this.opening = undefined
        throw error
      })
    return this.opening
  }
  close(): void {
    this.db.close()
    this.opening = undefined
  }
  private async initialize(): Promise<void> {
    coreLog('initialize', 'entered')
    try {
      await this.db.open()
      // The meta check and initial seeds share a transaction, including simultaneous first opens.
      await this.db.transaction('rw', this.db.tables, async () => {
        if (await this.db.meta.get('state')) return
        const now = this.now(),
          command = this.id()
        const groups = [
          ['expense', ['餐饮', '交通', '购物', '居家', '健康', '娱乐', '其他']],
          ['income', ['工资', '奖金', '其他']],
          ['activity', ['步行', '跑步', '力量', '骑行', '其他']],
          ['focus', ['工作', '学习', '创作', '其他']],
        ] as const
        let ordinal = 0
        for (const [scope, names] of groups) {
          for (const [sortOrder, name] of names.entries()) {
            ordinal++
            await this.db.categories.add({
              id: `30000000-0000-4000-8000-${ordinal.toString(16).padStart(12, '0')}`,
              revision: 1,
              lastCommandId: command,
              createdAt: now,
              updatedAt: now,
              scope,
              name,
              normalizedName: normalizeCategoryName(name),
              status: 'active',
              sortOrder,
              iconKey: scope === 'expense' || scope === 'income' ? 'finance' : scope,
            })
          }
        }
        for (const [key, value] of Object.entries({
          appearance: 'system',
          weightTarget: null,
          lastExportedAt: null,
          localNoticeSeen: false,
        })) {
          await this.db.preferences.add({
            key,
            value,
            revision: 1,
            lastCommandId: command,
            updatedAt: now,
          } as Preference)
        }
        await this.db.meta.add({
          key: 'state',
          schemaVersion: 1,
          generation: this.id(),
          revision: 0,
        })
      })
      coreLog('initialize', 'ready')
    } catch (error) {
      const safe = domainError(error, 'WriteFailure')
      coreLog('initialize', 'failed', safe.code)
      throw safe
    }
  }
  async read<T>(query: () => Promise<T>): Promise<Snapshot<T>> {
    coreLog('read', 'entered')
    try {
      await this.ready()
      const result = await this.db.transaction('r', this.db.tables, async () => {
        const meta = await this.getMeta(),
          data = await query()
        return { data, stamp: { generation: meta.generation, revision: meta.revision } }
      })
      coreLog('read', 'ready')
      return result
    } catch (error) {
      const safe = domainError(error, 'ReadFailure')
      coreLog('read', 'failed', safe.code)
      throw safe
    }
  }
  async getMeta(): Promise<DatabaseMeta> {
    const meta = await this.db.meta.get('state')
    if (!meta) fail('ReadFailure')
    return meta
  }
  async write<T>(
    operation: string,
    ctx: CommandContext,
    work: (meta: DatabaseMeta) => Promise<{ data: T; changed: boolean }>,
  ): Promise<Snapshot<T>> {
    coreLog(operation, 'entered')
    try {
      await this.ready()
      let changed = false
      const snapshot = await this.db.transaction('rw', this.db.tables, async () => {
        const meta = await this.getMeta()
        object(ctx, ['commandId', 'expectedGeneration', 'expectedRevision'])
        uuid(ctx.commandId)
        uuid(ctx.expectedGeneration)
        integer(ctx.expectedRevision, 0, Number.MAX_SAFE_INTEGER)
        if (meta.generation !== ctx.expectedGeneration) fail('GenerationConflict')
        const result = await work(meta)
        if (result.changed) {
          meta.revision = integer(meta.revision + 1, 0, Number.MAX_SAFE_INTEGER)
          await this.db.meta.put(meta)
        }
        changed = result.changed
        return {
          data: result.data,
          stamp: { generation: meta.generation, revision: meta.revision },
        }
      })
      // Log success only after IndexedDB has committed, not merely after queuing writes.
      coreLog(operation, changed ? 'committed' : 'unchanged')
      return snapshot
    } catch (error) {
      const safe = domainError(error, 'WriteFailure')
      coreLog(operation, 'failed', safe.code)
      throw safe
    }
  }
  base(ctx: CommandContext): EntityBase {
    const now = this.now()
    return {
      id: ctx.commandId,
      revision: 1,
      lastCommandId: ctx.commandId,
      createdAt: now,
      updatedAt: now,
    }
  }
  revision(entity: { revision: number }, ref: EntityRef): void {
    uuid(ref.id)
    integer(ref.expectedEntityRevision, 1, Number.MAX_SAFE_INTEGER)
    if (entity.revision !== ref.expectedEntityRevision) fail('EntityConflict')
  }
  changed<T extends EntityBase>(entity: T, ctx: CommandContext): T {
    if (this.clock.now() < Date.parse(entity.updatedAt)) fail('ClockChanged')
    return {
      ...entity,
      revision: integer(entity.revision + 1, 1, Number.MAX_SAFE_INTEGER),
      lastCommandId: ctx.commandId,
      updatedAt: this.now(),
    }
  }
  createGuard(meta: DatabaseMeta, ctx: CommandContext): void {
    if (meta.revision !== ctx.expectedRevision) fail('EntityConflict')
  }
  async category(id: string, scope: Category['scope'], original?: string): Promise<Category> {
    const category = await this.db.categories.get(uuid(id))
    requireValue(
      category &&
        category.scope === scope &&
        (category.status === 'active' || category.id === original),
      'categoryId',
    )
    return category
  }
}
export function sameInput(existing: object, input: object): boolean {
  const optionalKeys = ['note', 'categoryId']
  if (optionalKeys.some((key) => key in existing && !(key in input))) return false
  return Object.entries(input).every(
    ([key, value]) =>
      JSON.stringify((existing as Record<string, unknown>)[key]) === JSON.stringify(value),
  )
}
