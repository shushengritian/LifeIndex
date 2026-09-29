import { Link, useSearchParams } from 'react-router-dom'
import { useFlow } from '@/app/v4/Flow'
import { PageHeading } from '@/shared/ui/v4/Elements'
import { monthRange } from '@/shared/v4/format'
import { useTodayDate, validMonth } from '@/features/today/v4/data'
import { MonthPicker } from '@/features/finance/v4/MonthPicker'
import { RecordPageSection } from '@/features/finance/v4/RecordPageSection'

export function HealthHistoryView({ kind }: { kind: 'weight' | 'activity' }) {
  const flow = useFlow(),
    today = useTodayDate(),
    [search, setSearch] = useSearchParams(),
    month = validMonth(search.get('month')) ? search.get('month')! : today.slice(0, 7)
  const title = kind === 'weight' ? '体重记录' : '运动记录'
  return (
    <>
      <PageHeading
        title={title}
        description="按记录日期回看。补记过去，不会冒充今天。"
        action={
          <Link className="text-button" to="/health">
            返回健康
          </Link>
        }
      />
      <div className="v4-history-toolbar">
        <MonthPicker month={month} onChange={(value) => setSearch({ month: value })} />
        <button
          className="button"
          type="button"
          onClick={() => flow.openCreate(kind)}
          data-focus-key={`${kind}-history-create`}
        >
          {kind === 'weight' ? '记录体重' : '记录运动'}
        </button>
      </div>
      <RecordPageSection key={`${kind}-${month}`} kind={kind} range={monthRange(month)} />
    </>
  )
}
