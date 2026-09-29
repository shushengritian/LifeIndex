import { Link, useParams, useSearchParams } from 'react-router-dom'
import { PageHeading } from '@/shared/ui/v4/Elements'
import { usePageLog } from '@/features/today/v4/data'
import { HabitCollection } from './v4/HabitCollection'
import { HabitDetail } from './v4/HabitDetail'
import { HabitPlanEditor } from './v4/HabitPlanEditor'
export function HabitsV4() {
  const { id } = useParams(),
    [search] = useSearchParams()
  usePageLog(id === 'new' ? 'habit-create' : id ? 'habit-detail' : 'habits')
  if (id === 'new') return <HabitPlanEditor />
  if (id && search.get('edit') === '1') return <HabitPlanEditor key={id} id={id} />
  if (id) return <HabitDetail key={id} id={id} />
  return (
    <>
      <PageHeading
        title="慢慢养成的日常"
        description="计划是一种提醒，完成是一份真实记录。"
        action={
          <Link className="text-button" to="/health">
            返回健康
          </Link>
        }
      />
      <HabitCollection />
    </>
  )
}
