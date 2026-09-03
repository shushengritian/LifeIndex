import { NavLink, Outlet } from 'react-router-dom'

const destinations = [
  { to: '/today', label: '今天', short: '今' },
  { to: '/finance', label: '记账', short: '账' },
  { to: '/focus', label: '专注', short: '专' },
  { to: '/habits', label: '习惯', short: '习' },
  { to: '/settings', label: '设置', short: '设' },
] as const

export function AppShell() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <p className="brand">LifeIndex</p>
          <p className="tagline">Index your life.</p>
        </div>
        <span className="version" aria-label={`应用版本 ${__APP_VERSION__}`}>
          v{__APP_VERSION__}
        </span>
      </header>

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
              {destination.short}
            </span>
            <span>{destination.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
