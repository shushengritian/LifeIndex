import { useEffect, type ReactNode } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'

import { AppErrorBoundary } from '@/app/AppErrorBoundary'
import { AppProviders } from '@/app/AppProviders'
import { AppShell } from '@/app/AppShell'
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

function TodayPage() {
  return (
    <FoundationPage
      eyebrow="today"
      title="让今天保持清晰"
      description="这里将汇总今天的记账、专注与习惯。"
    >
      <div className="foundation-card">
        <p>本地优先</p>
        <strong>数据只属于这台设备</strong>
        <span>完成数据层后，你可以离线记录并通过 JSON 自主备份。</span>
      </div>
    </FoundationPage>
  )
}

function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Navigate to="/today" replace />} />
        <Route path="/today" element={<TodayPage />} />
        <Route
          path="/finance"
          element={<FoundationPage eyebrow="finance" title="记账" description="看见钱去了哪里。" />}
        />
        <Route
          path="/focus"
          element={
            <FoundationPage eyebrow="focus" title="专注" description="看见时间和注意力去了哪里。" />
          }
        />
        <Route
          path="/habits"
          element={
            <FoundationPage eyebrow="habits" title="习惯" description="看见长期坚持了什么。" />
          }
        />
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
