export type CategoryDomain = 'finance' | 'focus' | 'activity'
export type TransactionType = 'expense' | 'income'
export type HabitStatus = 'active' | 'paused'
export type FocusStatus = 'active' | 'completed'
export type ActivityIntensity = 'light' | 'moderate' | 'hard'
export type Appearance = 'system' | 'light' | 'dark'
export type ActionType = 'add-transaction' | 'check-habit' | 'start-focus'

export type HabitSchedule = { type: 'daily' } | { type: 'weekdays'; weekdays: number[] }

export interface Category {
  id: string
  domain: CategoryDomain
  transactionType?: TransactionType
  name: string
  icon: string
  color: string
  sortOrder: number
  archived: 0 | 1
  createdAt: string
  updatedAt: string
}

export interface Transaction {
  id: string
  type: TransactionType
  amountMinor: number
  currency: string
  categoryId: string
  occurredAt: string
  localDate: string
  timezoneOffsetMinutes: number
  note?: string
  createdAt: string
  updatedAt: string
}

export interface Habit {
  id: string
  name: string
  icon: string
  color: string
  schedule: HabitSchedule
  startLocalDate: string
  status: HabitStatus
  pausedAt?: string
  note?: string
  createdAt: string
  updatedAt: string
}

export interface HabitRecord {
  id: string
  habitId: string
  localDate: string
  completedAt: string
  timezoneOffsetMinutes: number
  note?: string
  createdAt: string
  updatedAt: string
}

export interface FocusSession {
  id: string
  status: FocusStatus
  title: string
  categoryId?: string
  note?: string
  startedAt: string
  plannedDurationSeconds: number
  expectedEndAt: string
  endedAt?: string
  durationSeconds?: number
  completionKind?: 'timer' | 'early'
  localDate: string
  timezoneOffsetMinutes: number
  createdAt: string
  updatedAt: string
}

export interface WeightEntry {
  id: string
  weightGrams: number
  measuredAt: string
  localDate: string
  timezoneOffsetMinutes: number
  note?: string
  createdAt: string
  updatedAt: string
}

export interface ActivitySession {
  id: string
  categoryId: string
  durationMinutes: number
  intensity: ActivityIntensity
  occurredAt: string
  localDate: string
  timezoneOffsetMinutes: number
  note?: string
  createdAt: string
  updatedAt: string
}

export type Setting =
  | { key: 'appearance'; value: Appearance; updatedAt: string }
  | { key: 'currency'; value: { code: 'CNY' }; updatedAt: string }
  | {
      key: 'onboarding'
      value: { localDataNoticeSeen: boolean; backupNoticeSeen: boolean }
      updatedAt: string
    }
  | { key: 'lastSuccessfulExportAt'; value: string; updatedAt: string }
  | { key: 'weightTarget'; value: { weightGrams: number }; updatedAt: string }

export interface ActionReceipt {
  actionId: string
  actionType: ActionType
  handledAt: string
  outcomeEntityId: string
}

export interface LocalDateRange {
  from: string
  to: string
}

export interface BackupData {
  categories: Category[]
  transactions: Transaction[]
  habits: Habit[]
  habitRecords: HabitRecord[]
  focusSessions: FocusSession[]
  settings: Setting[]
  actionReceipts: ActionReceipt[]
  weightEntries: WeightEntry[]
  activitySessions: ActivitySession[]
}

export type BackupCounts = { [Key in keyof BackupData]: number }

export interface LifeIndexBackupV2 {
  format: 'lifeindex-backup'
  formatVersion: 2
  appVersion: string
  exportedAt: string
  source: {
    timezoneOffsetMinutes: number
    locale: string
  }
  counts: BackupCounts
  data: BackupData
}
