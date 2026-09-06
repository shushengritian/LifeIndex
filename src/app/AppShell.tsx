import { NavLink, Outlet, useLocation } from 'react-router-dom'

import { PwaStatus } from '@/pwa/PwaStatus'
import { Icon, type IconName } from '@/shared/ui/Icon'

const destinations = [
  { to: '/today', label: '今天', icon: 'today' },
  { to: '/finance', label: '记账', icon: 'finance' },
  { to: '/focus', label: '专注', icon: 'focus' },
  { to: '/health', label: '健康', icon: 'health' },
  { to: '/settings', label: '设置', icon: 'settings' },
] as const satisfies ReadonlyArray<{ to: string; label: string; icon: IconName }>

function routeTitle(pathname: string): string {
  if (pathname.startsWith('/finance')) return '记账'
  if (pathname.startsWith('/focus')) return '专注'
  if (pathname.startsWith('/health') || pathname.startsWith('/habits')) return '健康'
  if (pathname.startsWith('/settings')) return '设置'
  return '今天'
}

export function AppShell() {
  const location = useLocation()
  return (
    <div className="app-shell">
      <header className="app-header">
        <span className="context-title">{routeTitle(location.pathname)}</span>
        <span className="local-badge">仅本机</span>
      </header>

      <PwaStatus />

      {/* HashRouter owns the URL fragment, so the skip control moves focus directly. */}
      <main className="app-content" id="main-content" tabIndex={-1}>
        <Outlet />
      </main>

      <nav className="bottom-nav" aria-label="主要导航">
        {destinations.map((destination) => (
          <NavLink
            key={destination.to}
            to={destination.to}
            className={({ isActive }) => `nav-item${isActive ? ' nav-item-active' : ''}`}
          >
            <span className="nav-icon" aria-hidden="true">
              <Icon name={destination.icon} />
            </span>
            <span>{destination.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
