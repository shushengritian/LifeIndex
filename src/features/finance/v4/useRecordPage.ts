import { useCallback } from 'react'
import { useV4Services } from '@/app/v4/Services'
import { useV4Query } from '@/app/v4/useQuery'
import type { Category, DateRange, Page, RecordView, Snapshot } from '@/core/types'
import { consistentPair } from '@/features/today/v4/data'

export type HistoryKind = 'transaction' | 'weight' | 'activity' | 'focus'
function categoryById(categories: Category[], id: string): Category {
  const category = categories.find((item) => item.id === id)
  if (!category)
    throw Object.assign(new Error('Missing category reference'), { code: 'ReadFailure' as const })
  return category
}
export function useRecordPage(kind: HistoryKind, range: DateRange, cursor: string | null) {
  const services = useV4Services()
  const query = useCallback(async (): Promise<Snapshot<Page<RecordView>>> => {
    const pageQuery = {
      from: range.from,
      toExclusive: range.toExclusive,
      limit: 50,
      ...(cursor ? { cursor } : {}),
    }
    if (kind === 'weight') {
      const result = await services.weights.list(pageQuery)
      return {
        ...result,
        data: {
          ...result.data,
          items: result.data.items.map((entity) => ({ kind: 'weight', entity })),
        },
      }
    }
    if (kind === 'transaction') {
      const result = await consistentPair(
        () => services.transactions.list(pageQuery),
        () => services.categories.list({ includeArchived: true }),
      )
      return {
        stamp: result.stamp,
        data: {
          ...result.data.left,
          items: result.data.left.items.map((entity) => ({
            kind: 'transaction',
            entity,
            category: categoryById(result.data.right, entity.categoryId),
          })),
        },
      }
    }
    if (kind === 'activity') {
      const result = await consistentPair(
        () => services.activities.list(pageQuery),
        () => services.categories.list({ scope: 'activity', includeArchived: true }),
      )
      return {
        stamp: result.stamp,
        data: {
          ...result.data.left,
          items: result.data.left.items.map((entity) => ({
            kind: 'activity',
            entity,
            category: categoryById(result.data.right, entity.categoryId),
          })),
        },
      }
    }
    const result = await consistentPair(
      () => services.focus.list(pageQuery),
      () => services.categories.list({ scope: 'focus', includeArchived: true }),
    )
    return {
      stamp: result.stamp,
      data: {
        ...result.data.left,
        items: result.data.left.items.map((entity) => ({
          kind: 'focus',
          entity,
          ...(entity.categoryId
            ? { category: categoryById(result.data.right, entity.categoryId) }
            : {}),
        })),
      },
    }
  }, [services, kind, range.from, range.toExclusive, cursor])
  return useV4Query(query)
}
