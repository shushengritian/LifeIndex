import type { FocusSession, Habit, HabitRecord, Transaction } from '@/shared/domain/types'

export const FIXED_NOW = '2026-09-03T12:00:00.000Z'

export function buildTransaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: '00000000-0000-4000-8000-000000000001',
    type: 'expense',
    amountMinor: 1_230,
    currency: 'CNY',
    categoryId: 'category-finance-expense-food-v1',
    occurredAt: FIXED_NOW,
    localDate: '2026-09-03',
    timezoneOffsetMinutes: -480,
    note: '合成测试记录',
    createdAt: FIXED_NOW,
    updatedAt: FIXED_NOW,
    ...overrides,
  }
}

export function buildHabit(overrides: Partial<Habit> = {}): Habit {
  return {
    id: '00000000-0000-4000-8000-000000000002',
    name: '合成测试习惯',
    icon: 'check',
    color: 'sage',
    schedule: { type: 'daily' },
    startLocalDate: '2026-09-01',
    status: 'active',
    createdAt: FIXED_NOW,
    updatedAt: FIXED_NOW,
    ...overrides,
  }
}

export function buildHabitRecord(overrides: Partial<HabitRecord> = {}): HabitRecord {
  return {
    id: '00000000-0000-4000-8000-000000000003',
    habitId: '00000000-0000-4000-8000-000000000002',
    localDate: '2026-09-03',
    completedAt: FIXED_NOW,
    timezoneOffsetMinutes: -480,
    createdAt: FIXED_NOW,
    updatedAt: FIXED_NOW,
    ...overrides,
  }
}

export function buildFocusSession(overrides: Partial<FocusSession> = {}): FocusSession {
  return {
    id: '00000000-0000-4000-8000-000000000004',
    status: 'completed',
    title: '合成专注记录',
    categoryId: 'category-focus-study-v1',
    startedAt: '2026-09-03T11:35:00.000Z',
    plannedDurationSeconds: 1_500,
    expectedEndAt: FIXED_NOW,
    endedAt: FIXED_NOW,
    durationSeconds: 1_500,
    completionKind: 'timer',
    localDate: '2026-09-03',
    timezoneOffsetMinutes: -480,
    createdAt: '2026-09-03T11:35:00.000Z',
    updatedAt: FIXED_NOW,
    ...overrides,
  }
}
