import { lazy, Suspense, useEffect, type ReactNode } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'

import { AppErrorBoundary } from '@/app/AppErrorBoundary'
import { AppProviders } from '@/app/AppProviders'
import { AppShell } from '@/app/AppShell'
import { PwaProvider } from '@/pwa/PwaProvider'
import { logger } from '@/shared/logging/logger'

const TodayPage = lazy(() =>
  import('@/features/today/TodayPage').then(({ TodayPage }) => ({ default: TodayPage })),
)
const FinancePage = lazy(() =>
  import('@/features/finance/FinancePage').then(({ FinancePage }) => ({ default: FinancePage })),
)
const FocusPage = lazy(() =>
  import('@/features/focus/FocusPage').then(({ FocusPage }) => ({ default: FocusPage })),
)
const HealthPage = lazy(() =>
  import('@/features/health/HealthPage').then(({ HealthPage }) => ({ default: HealthPage })),
)
const SettingsPage = lazy(() =>
  import('@/features/settings/SettingsPage').then(({ SettingsPage }) => ({
    default: SettingsPage,
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

function AppRoutes() {
  return (
    <Routes>
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
        />
        <Route
          path="/focus"
          element={
            <LazyRoute>
              <FocusPage />
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
          path="/settings"
          element={
            <LazyRoute>
              <SettingsPage />
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
      </Route>
    </Routes>
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
          <HashRouter>
            <button
              className="skip-link"
              type="button"
              onClick={() => document.getElementById('main-content')?.focus()}
            >
              跳到主要内容
            </button>
            <AppRoutes />
          </HashRouter>
        </PwaProvider>
      </AppProviders>
    </AppErrorBoundary>
  )
}
