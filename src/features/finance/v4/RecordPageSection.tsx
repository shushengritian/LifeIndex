import { useLocation, useSearchParams } from 'react-router-dom'
import type { DateRange } from '@/core/types'
import { Feedback } from '@/shared/ui/v4/Elements'
import { RecordList } from '@/shared/ui/v4/RecordList'
import { useRecordPage, type HistoryKind } from './useRecordPage'

export function RecordPageSection({
  kind,
  range,
  emptyText = '这个范围还没有记录。',
}: {
  kind: HistoryKind
  range: DateRange
  emptyText?: string
}) {
  const location = useLocation(),
    [search, setSearch] = useSearchParams(),
    cursor = search.get('cursor'),
    query = useRecordPage(kind, range, cursor),
    data = query.snapshot?.data
  function page(next: string | null) {
    const params = new URLSearchParams(search)
    if (next) params.set('cursor', next)
    else params.delete('cursor')
    setSearch(params, location.pathname === '/finance/report' ? { state: location.state } : {})
  }
  return (
    <div data-state={query.status}>
      {query.status === 'loading' ? (
        <Feedback kind="loading" title="正在读取记录" />
      ) : query.status === 'failed' ? (
        <Feedback kind="error" title="记录暂时读不到" onRetry={query.retry}>
          {cursor && (
            <button type="button" className="text-button" onClick={() => page(null)}>
              重新从第一页读取
            </button>
          )}
        </Feedback>
      ) : (
        data && (
          <>
            <p className="v4-scope-note">
              共 {data.totalCount} 条 · 本页 {data.items.length} 条
            </p>
            <RecordList items={data.items} emptyText={emptyText} />
            <div className="v4-pagination">
              {cursor && (
                <button type="button" className="button secondary" onClick={() => page(null)}>
                  回到第一页
                </button>
              )}
              {data.nextCursor && (
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => page(data.nextCursor)}
                >
                  下一页
                </button>
              )}
            </div>
          </>
        )
      )}
    </div>
  )
}
