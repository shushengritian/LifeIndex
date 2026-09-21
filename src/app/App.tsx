import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react'
import {
  createHashRouter,
  createRoutesFromElements,
  Navigate,
  Route,
  RouterProvider,
} from 'react-router-dom'

import { AppErrorBoundary } from '@/app/AppErrorBoundary'
import { AppProviders } from '@/app/AppProviders'
import { AppShell } from '@/app/AppShell'
import { PwaProvider } from '@/pwa/PwaProvider'
import { logger } from '@/shared/logging/logger'

const TodayPage = lazy(() =>
  import('@/features/today/TodayPage').then(({ TodayPage }) => ({ default: TodayPage })),
)
const FinancePage = lazy(() =>
  import('@/features/finance/FinancePage').then(({ FinanceRoute }) => ({ default: FinanceRoute })),
)
const FinanceReportPage = lazy(() =>
  import('@/features/finance/FinanceReportPage').then(({ FinanceReportPage }) => ({
    default: FinanceReportPage,
  })),
)
const FinanceNewPage = lazy(() =>
  import('@/features/finance/FinancePage').then(({ FinanceNewPage }) => ({
    default: FinanceNewPage,
  })),
)
const FocusPage = lazy(() =>
  import('@/features/focus/FocusPage').then(({ FocusPage }) => ({ default: FocusPage })),
)
const FocusHistoryPage = lazy(() =>
  import('@/features/focus/FocusPage').then(({ FocusHistoryPage }) => ({
    default: FocusHistoryPage,
  })),
)
const HealthPage = lazy(() =>
  import('@/features/health/HealthPage').then(({ HealthPage }) => ({ default: HealthPage })),
)
const HabitsPage = lazy(() =>
  import('@/features/habits/HabitsPage').then(({ HabitsPage }) => ({ default: HabitsPage })),
)
const WeightHistoryPage = lazy(() =>
  import('@/features/health/HealthPage').then(({ WeightHistoryPage }) => ({
    default: WeightHistoryPage,
  })),
)
const ActivityHistoryPage = lazy(() =>
  import('@/features/health/HealthPage').then(({ ActivityHistoryPage }) => ({
    default: ActivityHistoryPage,
  })),
)
const CessationPage = lazy(() =>
  import('@/features/health/cessation/CessationPage').then(({ CessationPage }) => ({
    default: CessationPage,
  })),
)
const SettingsPage = lazy(() =>
  import('@/features/settings/SettingsPage').then(({ SettingsPage }) => ({
    default: SettingsPage,
  })),
)
const SettingsDetailPage = lazy(() =>
  import('@/features/settings/SettingsPage').then(({ SettingsDetailPage }) => ({
    default: SettingsDetailPage,
  })),
)
const ActionPage = lazy(() =>
  import('@/app/actions/ActionPage').then(({ ActionPage }) => ({ default: ActionPage })),
)
const ActionResultPage = lazy(() =>
  import('@/app/actions/ActionPage').then(({ ActionResultPage }) => ({
    default: ActionResultPage,
  })),
)

function LazyRoute({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<p className="state-message route-loading">正在打开模块…</p>}>
      {children}
    </Suspense>
  )
}

function createAppRouter() {
  return createHashRouter(
    createRoutesFromElements(
      <Route element={<AppShell />}>
        <Route index element={<Navigate to="/today" replace />} />
        <Route
          path="/today"
          element={
            <LazyRoute>
              <TodayPage />
            </LazyRoute>
          }
        />
        <Route
          path="/finance"
          element={
            <LazyRoute>
              <FinancePage />
            </LazyRoute>
          }
        >
          {/* Read-only reports retain the parent ledger's calendar and browsing context. */}
          <Route
            path="report"
            element={
              <LazyRoute>
                <FinanceReportPage />
              </LazyRoute>
            }
          />
        </Route>
        <Route
          path="/focus"
          element={
            <LazyRoute>
              <FocusPage />
            </LazyRoute>
          }
        />
        <Route
          path="/finance/new"
          element={
            <LazyRoute>
              <FinanceNewPage />
            </LazyRoute>
          }
        />
        <Route
          path="/focus/history"
          element={
            <LazyRoute>
              <FocusHistoryPage />
            </LazyRoute>
          }
        />
        <Route
          path="/health"
          element={
            <LazyRoute>
              <HealthPage />
            </LazyRoute>
          }
        />
        <Route path="/habits" element={<Navigate to="/health" replace />} />
        <Route
          path="/health/habits"
          element={
            <LazyRoute>
              <HabitsPage />
            </LazyRoute>
          }
        />
        {/* Histories remain Health children and reuse the same IndexedDB edit paths. */}
        <Route
          path="/health/weight-history"
          element={
            <LazyRoute>
              <WeightHistoryPage />
            </LazyRoute>
          }
        />
        <Route
          path="/health/activity-history"
          element={
            <LazyRoute>
              <ActivityHistoryPage />
            </LazyRoute>
          }
        />
        {/* Cessation remains a Health child; no new bottom-navigation destination. */}
        <Route
          path="/health/cessation"
          element={
            <LazyRoute>
              <CessationPage />
            </LazyRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <LazyRoute>
              <SettingsPage />
            </LazyRoute>
          }
        />
        <Route
          path="/settings/:section"
          element={
            <LazyRoute>
              <SettingsDetailPage />
            </LazyRoute>
          }
        />
        <Route
          path="/action/:actionType"
          element={
            <LazyRoute>
              <ActionPage />
            </LazyRoute>
          }
        />
        <Route
          path="/action-result"
          element={
            <LazyRoute>
              <ActionResultPage />
            </LazyRoute>
          }
        />
        <Route path="*" element={<Navigate to="/today" replace />} />
      </Route>,
    ),
  )
}

function AppRouter() {
  // Data-router navigation blocking covers links and POP while retaining all existing hash URLs.
  const [router, setRouter] = useState<ReturnType<typeof createAppRouter>>()
  useEffect(() => {
    // Own history listeners in an effect so StrictMode's discarded render cannot leak a router.
    const instance = createAppRouter()
    // eslint-disable-next-line react-hooks/set-state-in-effect -- publish the external router after listener setup
    setRouter(instance)
    return () => instance.dispose()
  }, [])
  return router ? (
    <RouterProvider router={router} />
  ) : (
    <p className="state-message">正在打开模块…</p>
  )
}

export function App() {
  useEffect(() => {
    logger.info('app.shell.ready', { appVersion: __APP_VERSION__, operation: 'render' })
  }, [])

  return (
    <AppErrorBoundary>
      <AppProviders>
        <PwaProvider>
          <button
            className="skip-link"
            type="button"
            onClick={() => document.getElementById('main-content')?.focus()}
          >
            跳到主要内容
          </button>
          <AppRouter />
        </PwaProvider>
      </AppProviders>
    </AppErrorBoundary>
  )
}
