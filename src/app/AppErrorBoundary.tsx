import { Component, type ReactNode } from 'react'

import { logger } from '@/shared/logging/logger'

interface AppErrorBoundaryProps {
  children: ReactNode
}

interface AppErrorBoundaryState {
  hasError: boolean
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error): void {
    // Render failures stay local and emit only the safe error class/correlation metadata.
    logger.error('app.render.failed', error, { operation: 'render' })
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <main className="fatal-state" role="alert">
          <p className="eyebrow">LifeIndex</p>
          <h1>页面暂时无法显示</h1>
          <p>你的本地数据没有因此被删除。请重新打开应用；如果问题持续，请记录当前版本。</p>
          <button type="button" onClick={() => window.location.reload()}>
            重新打开
          </button>
        </main>
      )
    }

    return this.props.children
  }
}
