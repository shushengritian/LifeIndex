import { Link, useSearchParams } from 'react-router-dom'
import { PageHeading } from '@/shared/ui/v4/Elements'
import { monthRange } from '@/shared/v4/format'
import { useTodayDate, validMonth, usePageLog } from '@/features/today/v4/data'
import { MonthPicker } from '@/features/finance/v4/MonthPicker'
import { RecordPageSection } from '@/features/finance/v4/RecordPageSection'
export function FocusHistoryV4() {
  usePageLog('focus-history')
  const today = useTodayDate(),
    [search, setSearch] = useSearchParams(),
    month = validMonth(search.get('month')) ? search.get('month')! : today.slice(0, 7)
  return (
    <>
      <PageHeading
        title="专注留下的时间"
        description="仅展示已完成并保存的会话，按开始日期归属。"
        action={
          <Link className="text-button" to="/focus">
            返回专注
          </Link>
        }
      />
      <MonthPicker month={month} onChange={(value) => setSearch({ month: value })} />
      <RecordPageSection kind="focus" range={monthRange(month)} />
    </>
  )
}
