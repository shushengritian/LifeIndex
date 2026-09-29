import { expect, it } from 'vitest'
import { deriveFocusDisplay, captureDateSelection } from '@/core/services'
import type { RunningFocusSession } from '@/core/types'
const start = Date.parse('2026-09-28T15:55:00.000Z')
const session: RunningFocusSession = {
  id: '40000000-0000-4000-8000-000000000001',
  revision: 1,
  lastCommandId: '40000000-0000-4000-8000-000000000001',
  createdAt: new Date(start).toISOString(),
  updatedAt: new Date(start).toISOString(),
  title: '合成专注',
  timePrecision: 'instant',
  startedAt: new Date(start).toISOString(),
  localDate: '2026-09-28',
  utcOffsetMinutes: 480,
  targetDurationMs: 1500000,
  status: 'running',
  accumulatedMs: 0,
  segmentStartedAt: new Date(start).toISOString(),
}
it('uses complementary seconds and caps late foreground returns at the original target', () => {
  const display = deriveFocusDisplay(session, { nowMs: start + 23999, utcOffsetMinutes: 480 })
  expect(display.displayElapsedSeconds).toBe(23)
  expect(display.displayRemainingSeconds).toBe(1477)
  expect(
    deriveFocusDisplay(session, { nowMs: start + 9000000, utcOffsetMinutes: 480 }).elapsedMs,
  ).toBe(1500000)
})
it('detects backwards wall time and captures explicit date without inventing an instant', () => {
  expect(
    deriveFocusDisplay(session, { nowMs: start - 1, utcOffsetMinutes: 480 }).clockChanged,
  ).toBe(true)
  expect(
    captureDateSelection({ nowMs: start + 600000, utcOffsetMinutes: 480 }, '2026-09-28'),
  ).toEqual({ localDate: '2026-09-28', utcOffsetMinutes: 480 })
})
