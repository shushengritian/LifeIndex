// Persistent facts and runtime projections are separate: only these entities enter backups.
export interface EntityBase {
  id: string
  revision: number
  lastCommandId: string
  createdAt: string
  updatedAt: string
}
export interface Category extends EntityBase {
  scope: CategoryScope
  name: string
  normalizedName: string
  status: 'active' | 'archived'
  sortOrder: number
  iconKey: IconKey
}
export interface DayFact extends EntityBase, DateSelection {
  timePrecision: 'day'
  note?: string
}
export interface Transaction extends DayFact {
  type: 'expense' | 'income'
  amountMinor: number
  currency: 'CNY'
  categoryId: string
}
export interface WeightEntry extends DayFact {
  weightGrams: number
}
export interface ActivitySession extends DayFact {
  categoryId: string
  durationMinutes: number
  intensity: 'light' | 'moderate' | 'hard'
}
export interface Habit extends EntityBase {
  name: string
  iconKey: IconKey
  scheduleWeekdays: number[]
  status: 'active' | 'paused'
  scheduleEffectiveFrom: string
  note?: string
}
export type HabitCheck = EntityBase &
  DateSelection & { habitId: string } & (
    | { timePrecision: 'day'; completedAt?: never }
    | { timePrecision: 'instant'; completedAt: string }
  )
export interface FocusBase extends EntityBase {
  title: string
  categoryId?: string
  note?: string
  timePrecision: 'instant'
  startedAt: string
  localDate: string
  utcOffsetMinutes: number
  targetDurationMs: number
}
export interface CompletionIntent {
  token: string
  kind: 'timer' | 'early'
  durationMs: number
  endedAt: string
}
export interface RunningFocusSession extends FocusBase {
  status: 'running'
  accumulatedMs: number
  segmentStartedAt: string
}
export interface PausedFocusSession extends FocusBase {
  status: 'paused'
  accumulatedMs: number
  pausedAt: string
  pendingCompletion?: CompletionIntent
}
export interface CompletedFocusSession extends FocusBase {
  status: 'completed'
  durationMs: number
  endedAt: string
  completionKind: 'timer' | 'early'
  completionToken: string
}
export type FocusSession = RunningFocusSession | PausedFocusSession | CompletedFocusSession
export interface DatabaseMeta {
  key: 'state'
  schemaVersion: 1
  generation: string
  revision: number
}
export interface BackupData {
  categories: Category[]
  transactions: Transaction[]
  weightEntries: WeightEntry[]
  activitySessions: ActivitySession[]
  habits: Habit[]
  habitChecks: HabitCheck[]
  focusSessions: FocusSession[]
  preferences: Preference[]
}
export interface BackupDocument {
  format: 'lifeindex-v4-backup'
  formatVersion: 1
  schemaVersion: 1
  appVersion: string
  exportedAt: string
  source: { utcOffsetMinutes: number; locale: string }
  counts: BackupCounts
  data: BackupData
}
export interface ServiceOptions {
  databaseName?: string
  clock?: LifeIndexClock
  idGenerator?: () => string
}

export type Stamp = { generation: string; revision: number }
export type Snapshot<T> = { data: T; stamp: Stamp }
export type CommandContext = {
  commandId: string
  expectedGeneration: string
  expectedRevision: number
}
export type EntityRef = { id: string; expectedEntityRevision: number }
export type DateSelection = { localDate: string; utcOffsetMinutes: number }
export type DateRange = { from: string; toExclusive: string }
export type PageQuery = DateRange & { limit?: number; cursor?: string }
export type Page<T> = { items: T[]; nextCursor: string | null; totalCount: number }
export type TransactionInput = DateSelection & {
  type: 'expense' | 'income'
  amountMinor: number
  categoryId: string
  note?: string
}
export type WeightInput = DateSelection & { weightGrams: number; note?: string }
export type ActivityInput = DateSelection & {
  categoryId: string
  durationMinutes: number
  intensity: 'light' | 'moderate' | 'hard'
  note?: string
}
export type CategoryInput = { scope: CategoryScope; name: string; iconKey: IconKey }
export type HabitInput = {
  name: string
  iconKey: IconKey
  scheduleWeekdays: number[]
  note?: string
}
export type FocusDetailsInput = { title: string; categoryId?: string; note?: string }
export type CompletionAttempt = EntityRef & { token: string; requestedAt: string }

export type CategoryScope = 'expense' | 'income' | 'activity' | 'focus'
export type IconKey =
  | 'today'
  | 'health'
  | 'focus'
  | 'finance'
  | 'activity'
  | 'weight'
  | 'leaf'
  | 'book'
  | 'cup'
  | 'bag'
  | 'arrow'
export type PreferenceValues = {
  appearance: 'system' | 'light' | 'dark'
  weightTarget: number | null
  lastExportedAt: string | null
  localNoticeSeen: boolean
}
export type PreferenceKey = keyof PreferenceValues
export type DomainErrorCode =
  | 'Validation'
  | 'NotFound'
  | 'ReadFailure'
  | 'WriteFailure'
  | 'Busy'
  | 'EntityConflict'
  | 'GenerationConflict'
  | 'PreviewStale'
  | 'PreviewExpired'
  | 'UnsupportedBackup'
  | 'ClockChanged'
export type DomainError = Error & { code: DomainErrorCode; field?: string }
export type Preference<K extends PreferenceKey = PreferenceKey> = {
  key: K
  value: PreferenceValues[K]
  revision: number
  lastCommandId: string
  updatedAt: string
}
export type PreferencesSnapshot = {
  values: PreferenceValues
  revisions: Record<PreferenceKey, number>
}
export type Mutation<T> = Promise<Snapshot<T>>
export type Removal = { id: string; removed: boolean }
export type RecordView =
  | { kind: 'transaction'; entity: Transaction; category: Category }
  | { kind: 'weight'; entity: WeightEntry }
  | { kind: 'activity'; entity: ActivitySession; category: Category }
  | { kind: 'focus'; entity: CompletedFocusSession; category?: Category }
  | { kind: 'habitCheck'; entity: HabitCheck; habit: Habit }
export type TodayHabits = {
  date: string
  items: { habit: Habit; check: HabitCheck | null; scheduled: boolean }[]
  scheduledCount: number
  scheduledCompletedCount: number
  pendingCount: number
  completedCount: number
}
export type FinanceTotals = { incomeMinor: number; expenseMinor: number; netMinor: number }
export type TodayFinance = FinanceTotals & { date: string; transactionCount: number }
export type TodayRecords = {
  date: string
  timed: RecordView[]
  dayOnly: RecordView[]
  recent: RecordView[]
  totalCount: number
  hasMore: boolean
}
export type MonthSummary = FinanceTotals & {
  month: string
  range: DateRange
  days: (FinanceTotals & { date: string; count: number })[]
  categories: {
    category: Category
    type: 'expense' | 'income'
    amountMinor: number
    count: number
  }[]
}
export type WeightTrend = {
  points: { localDate: string; entry: WeightEntry }[]
  latest: WeightEntry | null
  targetGrams: number | null
}
export type ActivitySummary = {
  range: DateRange
  count: number
  totalMinutes: number
  byIntensity: Record<'light' | 'moderate' | 'hard', { count: number; totalMinutes: number }>
}
export type BackupTable =
  | 'categories'
  | 'transactions'
  | 'weightEntries'
  | 'activitySessions'
  | 'habits'
  | 'habitChecks'
  | 'focusSessions'
  | 'preferences'
export type BackupCounts = Record<BackupTable, number>
export type BackupFocusSummary = {
  running: number
  paused: number
  awaitingSave: number
  completed: number
}
export type BackupPreview = {
  token: string
  expiresAt: string
  exportedAt: string
  appVersion: string
  sourceCounts: BackupCounts
  targetCounts: BackupCounts
  targetStamp: Stamp
  sourceFocus: BackupFocusSummary
  targetFocus: BackupFocusSummary
}
export type BackupExport = {
  blob: Blob
  filename: string
  exportedAt: string
  stamp: Stamp
  counts: BackupCounts
}
export type ClockSnapshot = { nowMs: number; utcOffsetMinutes: number }
export type LifeIndexClock = {
  now(): number
  utcOffsetMinutes(epochMs: number): number
  monotonicNow(): number
}
export type FocusDisplay = {
  elapsedMs: number
  displayElapsedSeconds: number
  displayRemainingSeconds: number
  expired: boolean
  clockChanged: boolean
}
export interface RecordService<E, I> {
  create(input: I, ctx: CommandContext): Mutation<E>
  getById(id: string): Mutation<E | null>
  update(ref: EntityRef, input: I, ctx: CommandContext): Mutation<E>
  remove(ref: EntityRef, ctx: CommandContext): Mutation<Removal>
  list(query: PageQuery): Mutation<Page<E>>
}
export interface LifeIndexServices {
  database: { open(): Promise<void>; close(): void }
  clock: { capture(): ClockSnapshot }
  observe<T>(
    query: () => Mutation<T>,
    observer: {
      next(value: Snapshot<T>): void
      error(error: DomainError): void
    },
  ): () => void
  today: {
    getHabits(date: string): Mutation<TodayHabits>
    getFinance(date: string): Mutation<TodayFinance>
    getRecords(date: string, options?: { limit?: number }): Mutation<TodayRecords>
  }
  transactions: RecordService<Transaction, TransactionInput> & {
    getMonth(month: string): Mutation<MonthSummary>
  }
  weights: RecordService<WeightEntry, WeightInput> & {
    getTrend(range: DateRange): Mutation<WeightTrend>
  }
  activities: RecordService<ActivitySession, ActivityInput> & {
    getSummary(range: DateRange): Mutation<ActivitySummary>
  }
  habits: {
    list(): Mutation<Habit[]>
    getById(id: string): Mutation<Habit | null>
    getChecks(habitId: string, range: DateRange): Mutation<HabitCheck[]>
    getCheckById(id: string): Mutation<HabitCheck | null>
    create(input: HabitInput, ctx: CommandContext): Mutation<Habit>
    update(ref: EntityRef, input: HabitInput, ctx: CommandContext): Mutation<Habit>
    setStatus(ref: EntityRef, status: 'active' | 'paused', ctx: CommandContext): Mutation<Habit>
    setCheck(
      input: { habitId: string; expectedHabitRevision: number; date: string; desired: boolean },
      ctx: CommandContext,
    ): Mutation<{ habit: Habit; check: HabitCheck | null }>
    remove(
      ref: EntityRef,
      options: { deleteChecks: true },
      ctx: CommandContext,
    ): Mutation<Removal & { deletedChecksCount: number }>
  }
  categories: {
    list(options: { scope?: CategoryScope; includeArchived: boolean }): Mutation<Category[]>
    create(input: CategoryInput, ctx: CommandContext): Mutation<Category>
    update(ref: EntityRef, input: CategoryInput, ctx: CommandContext): Mutation<Category>
    reorder(scope: CategoryScope, refs: EntityRef[], ctx: CommandContext): Mutation<Category[]>
    archive(ref: EntityRef, ctx: CommandContext): Mutation<Category>
    activate(ref: EntityRef, ctx: CommandContext): Mutation<Category>
    removeUnused(ref: EntityRef, ctx: CommandContext): Mutation<Removal>
  }
  focus: {
    getCurrent(): Mutation<RunningFocusSession | PausedFocusSession | null>
    getById(id: string): Mutation<FocusSession | null>
    list(query: PageQuery): Mutation<Page<CompletedFocusSession>>
    getSummary(range: DateRange): Mutation<{ count: number; totalDurationMs: number }>
    start(
      input: { targetDurationMs: number; title?: string; categoryId?: string },
      ctx: CommandContext,
    ): Mutation<FocusSession>
    pause(ref: EntityRef, ctx: CommandContext): Mutation<FocusSession>
    resume(ref: EntityRef, ctx: CommandContext): Mutation<FocusSession>
    prepareCompletion(
      attempt: CompletionAttempt,
      ctx: CommandContext,
    ): Mutation<PausedFocusSession | CompletedFocusSession>
    finalizeCompletion(
      input: { id: string; token: string },
      ctx: CommandContext,
    ): Mutation<CompletedFocusSession>
    discard(ref: EntityRef, ctx: CommandContext): Mutation<Removal>
    updateDetails(
      ref: EntityRef,
      input: FocusDetailsInput,
      ctx: CommandContext,
    ): Mutation<CompletedFocusSession>
    remove(ref: EntityRef, ctx: CommandContext): Mutation<Removal>
  }
  preferences: {
    getAll(): Mutation<PreferencesSnapshot>
    set<K extends PreferenceKey>(
      input: { key: K; value: PreferenceValues[K]; expectedEntityRevision: number },
      ctx: CommandContext,
    ): Mutation<Preference<K>>
  }
  backup: {
    inspectFile(file: Blob): Promise<BackupPreview>
    cancelPreview(token: string): void
    restore(token: string): Mutation<{ counts: BackupCounts }>
    exportSnapshot(): Promise<BackupExport>
  }
}
