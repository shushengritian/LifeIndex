import { useEffect, useRef, type ReactNode } from 'react'
import { NavLink, Link } from 'react-router-dom'
import { useFlow } from './Flow'
import { usePwa } from '@/pwa/PwaContext'
import { Icon } from '@/shared/ui/v4/Icon'
import { logger } from '@/shared/logging/logger'

const navigation = [
  ['today', '今天'],
  ['health', '健康'],
  ['focus', '专注'],
  ['finance', '记账'],
] as const
function Brand() {
  return (
    <svg className="v4-brand" viewBox="0 0 64 64" aria-hidden="true">
      <g transform="rotate(-15 32 32)">
        <path
          fill="var(--accent)"
          d="M32 8A24 24 0 0 1 56 32V42Q56 56 42 56H32A24 24 0 1 1 32 8Z"
        />
        <path
          fill="none"
          stroke="var(--on-accent)"
          strokeWidth="4"
          strokeLinejoin="round"
          d="M32 22A10 10 0 0 1 42 32V38Q42 42 38 42H32A10 10 0 1 1 32 22Z"
        />
      </g>
    </svg>
  )
}
function Navigation() {
  return (
    <>
      {navigation.map(([key, label]) => (
        <NavLink
          key={key}
          to={`/${key}`}
          className="v4-nav-link"
          data-nav={key}
          data-focus-key={`nav:${key}`}
        >
          <Icon name={key} />
          <span>{label}</span>
        </NavLink>
      ))}
    </>
  )
}
function PwaStatus() {
  const { state, dirtyFormCount, applyUpdate } = usePwa()
  const [hiddenUpdate, setHiddenUpdate] = useState(false)
  const [updateFailed, setUpdateFailed] = useState(false)
  async function update() {
    setUpdateFailed(false)
    try {
      await applyUpdate()
    } catch {
      // Activation failure leaves the current shell and records usable; expose an explicit retry.
      setUpdateFailed(true)
    }
  }
  if (!state.online)
    return (
      <div className="v4-pwa-status" role="status">
        已离线 · 已保存的本机记录仍可使用。
      </div>
    )
  if (state.registrationFailed)
    return (
      <div className="v4-pwa-status" role="status">
        离线功能尚未就绪，保持联网可继续使用。下次打开时会重试。
      </div>
    )
  if (state.updateReady && !hiddenUpdate)
    return (
      <div className="v4-pwa-status" role="status">
        <span>
          {updateFailed ? '更新暂未完成，当前记录保持原样，请重试。' : '新版本已准备好。'}
          {dirtyFormCount ? '先完成或取消当前编辑，再更新。' : ''}
        </span>
        <button type="button" className="text-button" onClick={() => setHiddenUpdate(true)}>
          稍后
        </button>
        <button
          type="button"
          className="text-button"
          disabled={dirtyFormCount > 0 || state.applyingUpdate}
          onClick={() => void update()}
        >
          {state.applyingUpdate ? '正在更新…' : updateFailed ? '重试更新' : '立即更新'}
        </button>
      </div>
    )
  return null
}
import { useState } from 'react'
export function AppShellV4({ children }: { children: ReactNode }) {
  const flow = useFlow(),
    dock = useRef<HTMLElement>(null)
  useEffect(() => {
    const element = dock.current
    if (!element) return
    const measure = () =>
      document.documentElement.style.setProperty(
        '--dock-height',
        `${element.getClientRects().length ? element.getBoundingClientRect().height + 20 : 0}px`,
      )
    // Safe scrolling follows the actual dock height, including large text and the two-row responsive layout.
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    measure()
    return () => observer.disconnect()
  }, [])
  return (
    <div
      className="v4-shell"
      data-lifeindex-version="4"
      data-app-version={__APP_VERSION__}
      data-app-build={__APP_BUILD_ID__}
      data-ready-region="shell"
      data-state="ready"
      onClickCapture={(event) => {
        const origin =
          event.target instanceof Element
            ? event.target.closest<HTMLElement>('[data-focus-key]')
            : null
        // Safari does not focus pointer-clicked buttons. Capture the actual activated source before Flow opens a route.
        // Waiting for click avoids moving focus when a touch merely starts scrolling over a record.
        if (origin && document.activeElement !== origin) {
          origin.focus({ preventScroll: true })
          logger.info('ui.origin.focused', { operation: 'activate' })
        }
      }}
    >
      <a
        className="v4-skip"
        href="#main-content"
        onClick={(event) => {
          event.preventDefault()
          document.getElementById('main-content')?.focus()
        }}
      >
        跳到主要内容
      </a>
      <aside className="v4-rail">
        <Link className="v4-wordmark" to="/today">
          <Brand />
          LifeIndex
        </Link>
        <nav aria-label="主要导航">
          <Navigation />
        </nav>
        <button
          type="button"
          className="button v4-rail-compose"
          aria-label="留一笔，选择记录类型"
          data-focus-key="compose:desktop"
          onClick={flow.openComposer}
        >
          <Icon name="write" />
          留一笔
        </button>
        <p className="v4-rail-note">
          按自己的节奏，
          <br />
          留下真实生活。
        </p>
      </aside>
      <div className="v4-app">
        <header className="v4-header">
          <Link className="v4-wordmark" to="/today" aria-label="LifeIndex 今天">
            <Brand />
            LifeIndex
          </Link>
          <Link className="v4-settings" to="/settings" data-focus-key="settings">
            <Icon name="settings" size={17} />
            设置
          </Link>
        </header>
        <PwaStatus />
        <main id="main-content" tabIndex={-1}>
          {children}
        </main>
      </div>
      <nav className="v4-dock" aria-label="主要导航" data-v4-dock ref={dock}>
        <div className="v4-dock-grid">
          <button
            type="button"
            className="button v4-compose"
            aria-label="留一笔，选择记录类型"
            data-focus-key="compose:mobile"
            onClick={flow.openComposer}
          >
            <Icon name="write" size={24} />
            <span>留一笔</span>
          </button>
          <Navigation />
        </div>
      </nav>
    </div>
  )
}
