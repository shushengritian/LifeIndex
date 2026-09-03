import { liveQuery } from 'dexie'
import { useEffect, useState } from 'react'

export type QueryState<T> =
  | { status: 'loading'; data?: undefined; error?: undefined }
  | { status: 'ready'; data: T; error?: undefined }
  | { status: 'failed'; data?: undefined; error: unknown }

export function useLiveQueryState<T>(query: () => Promise<T>): QueryState<T> {
  const [state, setState] = useState<QueryState<T>>({ status: 'loading' })

  useEffect(() => {
    const subscription = liveQuery(query).subscribe({
      next(data) {
        setState({ status: 'ready', data })
      },
      error(error) {
        setState({ status: 'failed', error })
      },
    })
    return () => subscription.unsubscribe()
  }, [query])

  return state
}
