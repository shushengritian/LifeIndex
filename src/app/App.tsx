import { useEffect, type ReactNode } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'

import { AppErrorBoundary } from '@/app/AppErrorBoundary'
import { AppProviders } from '@/app/AppProviders'
import { AppShell } from '@/app/AppShell'
import { FinancePage } from '@/features/finance/FinancePage'
import { FocusPage } from '@/features/focus/FocusPage'
import { HabitsPage } from '@/features/habits/HabitsPage'
import { TodayPage } from '@/features/today/TodayPage'
import { logger } from '@/shared/logging/logger'

interface FoundationPageProps {
  eyebrow: string
  title: string
  description: string
  children?: ReactNode
}

function FoundationPage({ eyebrow, title, description, children }: FoundationPageProps) {
  return (
    <section className="page" aria-labelledby={`${eyebrow}-title`}>
      <p className="eyebrow">{eyebrow}</p>
      <h1 id={`${eyebrow}-title`}>{title}</h1>
      <p className="page-intro">{description}</p>
      {children}
    </section>
  )
}

function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Navigate to="/today" replace />} />
        <Route path="/today" element={<TodayPage />} />
        <Route path="/finance" element={<FinancePage />} />
        <Route path="/focus" element={<FocusPage />} />
        <Route path="/habits" element={<HabitsPage />} />
        <Route
          path="/settings"
          element={
            <FoundationPage
              eyebrow="settings"
              title="设置"
              description="管理数据安全与应用偏好。"
            />
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
      </AppProviders>
    </AppErrorBoundary>
  )
}
