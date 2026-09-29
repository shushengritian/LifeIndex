import { lazy, Suspense, useEffect, useState } from 'react'
import {
  createHashRouter,
  Navigate,
  Route,
  RouterProvider,
  Routes,
  useLocation,
} from 'react-router-dom'
import { AppErrorBoundary } from '@/app/AppErrorBoundary'
import { PwaProvider } from '@/pwa/PwaProvider'
import { Feedback } from '@/shared/ui/v4/Elements'
import { NewRecordRoute } from '@/features/records/v4/NewRecordRoute'
import { AppProvidersV4 } from './AppProviders'
import { AppShellV4 } from './AppShell'
import { ConfirmationProvider } from './ConfirmationProvider'
import { FocusRuntimeProvider } from './FocusRuntimeProvider'
import { FlowProvider } from './FlowProvider'
import type { FlowRouteState } from './Flow'
import { NavigationGuardV4 } from './NavigationGuard'

const Today = lazy(() => import('@/features/today/TodayV4').then((m) => ({ default: m.TodayV4 })))
const Health = lazy(() =>
  import('@/features/health/HealthV4').then((m) => ({ default: m.HealthV4 })),
)
const WeightHistory = lazy(() =>
  import('@/features/health/WeightHistoryV4').then((m) => ({ default: m.WeightHistoryV4 })),
)
const ActivityHistory = lazy(() =>
  import('@/features/health/ActivityHistoryV4').then((m) => ({ default: m.ActivityHistoryV4 })),
)
const Habits = lazy(() =>
  import('@/features/habits/HabitsV4').then((m) => ({ default: m.HabitsV4 })),
)
const Finance = lazy(() =>
  import('@/features/finance/FinanceV4').then((m) => ({ default: m.FinanceV4 })),
)
const Report = lazy(() =>
  import('@/features/finance/FinanceReportV4').then((m) => ({ default: m.FinanceReportV4 })),
)
const Focus = lazy(() => import('@/features/focus/FocusV4').then((m) => ({ default: m.FocusV4 })))
const FocusHistory = lazy(() =>
  import('@/features/focus/FocusHistoryV4').then((m) => ({ default: m.FocusHistoryV4 })),
)
const Settings = lazy(() =>
  import('@/features/settings/v4/SettingsV4').then((m) => ({ default: m.SettingsV4 })),
)
const Appearance = lazy(() =>
  import('@/features/settings/v4/AppearanceV4').then((m) => ({ default: m.AppearanceV4 })),
)
const Categories = lazy(() =>
  import('@/features/settings/v4/CategoriesV4').then((m) => ({ default: m.CategoriesV4 })),
)
const Backup = lazy(() =>
  import('@/features/settings/v4/BackupV4').then((m) => ({ default: m.BackupV4 })),
)
const About = lazy(() =>
  import('@/features/settings/v4/AboutV4').then((m) => ({ default: m.AboutV4 })),
)
const Record = lazy(() =>
  import('@/features/records/v4/RecordRoute').then((m) => ({ default: m.RecordRoute })),
)

function PageRoutes() {
  const location = useLocation()
  const state = location.state as FlowRouteState | null
  const background =
    state?.background &&
    /^\/(today|health|finance|focus|settings)(\/|$)/.test(state.background.pathname)
      ? state.background
      : undefined
  const workflow = /^\/(new|records)\//.test(location.pathname)
  return (
    <AppShellV4>
      <Suspense fallback={<Feedback kind="loading" title="正在打开这个空间…" />}>
        <Routes location={background ?? location}>
          <Route index element={<Navigate to="/today" replace />} />
          <Route path="/today" element={<Today />} />
          <Route path="/health" element={<Health />} />
          <Route path="/health/weight" element={<WeightHistory />} />
          <Route path="/health/activity" element={<ActivityHistory />} />
          <Route path="/health/habits" element={<Habits />} />
          <Route path="/health/habits/:id" element={<Habits />} />
          <Route path="/finance" element={<Finance />} />
          <Route path="/finance/report" element={<Report />} />
          <Route path="/focus" element={<Focus />} />
          <Route path="/focus/history" element={<FocusHistory />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/settings/appearance" element={<Appearance />} />
          <Route path="/settings/categories" element={<Categories />} />
          <Route path="/settings/backup" element={<Backup />} />
          <Route path="/settings/about" element={<About />} />
          <Route path="/new/:kind" element={<div aria-hidden="true" />} />
          <Route path="/records/:kind/:id" element={<div aria-hidden="true" />} />
          <Route
            path="*"
            element={
              <Feedback kind="empty" title="这个页面已经移到新的位置">
                <a className="button" href="#/today">
                  回到今天
                </a>
              </Feedback>
            }
          />
        </Routes>
      </Suspense>
      {workflow && (
        <Suspense fallback={<Feedback kind="loading" title="正在读取记录…" />}>
          <Routes>
            <Route path="/new/:kind" element={<NewRecordRoute key={location.pathname} />} />
            <Route path="/records/:kind/:id" element={<Record key={location.pathname} />} />
          </Routes>
        </Suspense>
      )}
    </AppShellV4>
  )
}
function RootRoute() {
  return (
    <FlowProvider>
      <FocusRuntimeProvider>
        <NavigationGuardV4 />
        <PageRoutes />
      </FocusRuntimeProvider>
    </FlowProvider>
  )
}
function Router() {
  const [router, setRouter] = useState<ReturnType<typeof createHashRouter>>()
  useEffect(() => {
    const instance = createHashRouter([{ path: '*', element: <RootRoute /> }])
    // History listeners are owned by this effect so discarded StrictMode renders cannot leak a router.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- publishing a newly connected external router
    setRouter(instance)
    return () => instance.dispose()
  }, [])
  return router ? (
    <RouterProvider router={router} />
  ) : (
    <main className="v4-startup">
      <p>正在打开生活空间…</p>
    </main>
  )
}
export function AppV4() {
  return (
    <AppErrorBoundary>
      <AppProvidersV4>
        <PwaProvider>
          <ConfirmationProvider>
            <Router />
          </ConfirmationProvider>
        </PwaProvider>
      </AppProvidersV4>
    </AppErrorBoundary>
  )
}
