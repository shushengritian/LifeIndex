import { fail } from './errors'
import type {
  ClockSnapshot,
  CompletionAttempt,
  FocusDisplay,
  FocusSession,
  LifeIndexClock,
  PausedFocusSession,
  RunningFocusSession,
} from './types'
import { uuid } from './validation'

export const systemClock: LifeIndexClock = {
  now: () => Date.now(),
  utcOffsetMinutes: (now) => -new Date(now).getTimezoneOffset(),
  monotonicNow: () => performance.now(),
}
export { captureDateSelection } from './validation'
export function deriveFocusDisplay(
  session: FocusSession | null,
  clock: ClockSnapshot,
  previousWallMs?: number,
): FocusDisplay {
  if (!session)
    return {
      elapsedMs: 0,
      displayElapsedSeconds: 0,
      displayRemainingSeconds: 0,
      expired: false,
      clockChanged: false,
    }
  const backwards =
    (previousWallMs !== undefined && clock.nowMs < previousWallMs) ||
    clock.nowMs < Date.parse(session.updatedAt)
  let elapsedMs = session.status === 'completed' ? session.durationMs : session.accumulatedMs
  if (session.status === 'running')
    elapsedMs += Math.min(
      session.targetDurationMs - elapsedMs,
      Math.max(0, clock.nowMs - Date.parse(session.segmentStartedAt)),
    )
  // Derive both integer displays from one snapshot so their sum stays exactly the target.
  const seconds = Math.floor(elapsedMs / 1000)
  return {
    elapsedMs,
    displayElapsedSeconds: seconds,
    displayRemainingSeconds: session.targetDurationMs / 1000 - seconds,
    expired: elapsedMs >= session.targetDurationMs,
    clockChanged: backwards,
  }
}
export function createCompletionAttempt(
  session: RunningFocusSession | PausedFocusSession,
  clock: ClockSnapshot,
  token: string,
): CompletionAttempt {
  if (deriveFocusDisplay(session, clock).clockChanged) fail('ClockChanged')
  return {
    id: session.id,
    expectedEntityRevision: session.revision,
    token: uuid(token),
    requestedAt: new Date(clock.nowMs).toISOString(),
  }
}
