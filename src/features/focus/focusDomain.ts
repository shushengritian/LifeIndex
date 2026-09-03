import { sumMoneyMinor } from '@/shared/domain/money'
import type { Category, FocusSession } from '@/shared/domain/types'

export function remainingFocusSeconds(session: FocusSession, now: Date): number {
  if (session.status !== 'active') return 0
  return Math.max(0, Math.ceil((new Date(session.expectedEndAt).getTime() - now.getTime()) / 1000))
}

export function formatFocusDuration(seconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(seconds))
  const hours = Math.floor(safeSeconds / 3600)
  const minutes = Math.floor((safeSeconds % 3600) / 60)
  const remainder = safeSeconds % 60
  const clock = `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`
  return hours > 0 ? `${String(hours).padStart(2, '0')}:${clock}` : clock
}

export function summarizeFocus(sessions: readonly FocusSession[]) {
  const completed = sessions.filter(
    (session): session is FocusSession & { durationSeconds: number } =>
      session.status === 'completed' && session.durationSeconds !== undefined,
  )
  return {
    count: completed.length,
    durationSeconds: sumMoneyMinor(completed.map(({ durationSeconds }) => durationSeconds)),
  }
}

export function focusByCategory(
  sessions: readonly FocusSession[],
  categories: readonly Category[],
): Array<{ categoryId: string; name: string; durationSeconds: number }> {
  const names = new Map(categories.map(({ id, name }) => [id, name]))
  const totals = new Map<string, number>()
  for (const session of sessions) {
    if (session.status !== 'completed' || session.durationSeconds === undefined) continue
    const key = session.categoryId ?? 'uncategorized'
    totals.set(key, sumMoneyMinor([totals.get(key) ?? 0, session.durationSeconds]))
  }
  return [...totals.entries()]
    .map(([categoryId, durationSeconds]) => ({
      categoryId,
      name: categoryId === 'uncategorized' ? '未分类' : (names.get(categoryId) ?? '已归档分类'),
      durationSeconds,
    }))
    .sort((left, right) => right.durationSeconds - left.durationSeconds)
}
