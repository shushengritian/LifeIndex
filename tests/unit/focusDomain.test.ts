import { describe, expect, it } from 'vitest'

import {
  focusByCategory,
  formatFocusDuration,
  remainingFocusSeconds,
  summarizeFocus,
} from '@/features/focus/focusDomain'
import { createSeedCategories } from '@/data/db/seeds'
import { buildFocusSession, FIXED_NOW } from '../fixtures/builders'

describe('Focus domain projections', () => {
  it('derives remaining time from timestamps rather than callback counts', () => {
    const active = buildFocusSession({
      status: 'active',
      expectedEndAt: '2026-09-03T12:25:00.000Z',
    })
    delete active.endedAt
    delete active.durationSeconds
    delete active.completionKind
    expect(remainingFocusSeconds(active, new Date(FIXED_NOW))).toBe(1_500)
    expect(remainingFocusSeconds(active, new Date('2026-09-03T12:24:59.500Z'))).toBe(1)
    expect(remainingFocusSeconds(active, new Date('2026-09-03T12:30:00.000Z'))).toBe(0)
  })

  it('formats clock values and summarizes completed duration exactly', () => {
    expect(formatFocusDuration(1_500)).toBe('25:00')
    expect(formatFocusDuration(3_661)).toBe('01:01:01')
    expect(
      summarizeFocus([
        buildFocusSession(),
        buildFocusSession({
          id: '00000000-0000-4000-8000-000000000061',
          durationSeconds: 600,
        }),
      ]),
    ).toEqual({ count: 2, durationSeconds: 2_100 })
  })

  it('groups completed time by current or archived category label', () => {
    expect(focusByCategory([buildFocusSession()], createSeedCategories(FIXED_NOW))).toEqual([
      {
        categoryId: 'category-focus-study-v1',
        name: '学习',
        durationSeconds: 1_500,
      },
    ])
  })
})
