import { useEffect, useState } from 'react'

import { toLocalDateKey } from '@/shared/domain/date'

function millisecondsUntilNextLocalDay(now: Date): number {
  const nextDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  return Math.max(1_000, nextDay.getTime() - now.getTime() + 100)
}

export function useCurrentLocalDate(): string {
  const [localDate, setLocalDate] = useState(() => toLocalDateKey(new Date()))

  useEffect(() => {
    const now = new Date()
    const timeout = window.setTimeout(() => {
      setLocalDate(toLocalDateKey(new Date()))
    }, millisecondsUntilNextLocalDay(now))
    return () => window.clearTimeout(timeout)
  }, [localDate])

  return localDate
}
