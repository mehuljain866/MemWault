import { NavLink, useLocation } from 'react-router-dom'

const navItems = [
  { path: '/', label: 'Dashboard', icon: '📊' },
  { path: '/timeline', label: 'Memories', icon: '🎞️' },
  { path: '/reels', label: 'Reels', icon: '📱' },
  { path: '/settings', label: 'Settings', icon: '⚙️' },
]

export default function Sidebar({ isOpen, onClose }) {
  const location = useLocation()

  return (
    <>
      {/* Mobile overlay backdrop */}
      {isOpen && (
        <div
          className="sv-modal-backdrop"
          style={{ zIndex: 99 }}
          onClick={onClose}
        />
      )}

      <aside className={`sv-sidebar ${isOpen ? 'sv-sidebar--open' : ''}`}>
        {/* ── Brand ──────────────────────────── */}
        <div className="sv-sidebar__brand">
          <div className="sv-sidebar__logo">🏛️</div>
          <div>
            <div className="sv-sidebar__title">MemWault</div>
            <div className="sv-sidebar__version">v0.1.0 — MVP</div>
          </div>
        </div>

        {/* ── Navigation ────────────────────── */}
        <nav className="sv-sidebar__nav">
          <div className="sv-sidebar__section-title">Navigation</div>
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `sv-sidebar__link ${isActive ? 'sv-sidebar__link--active' : ''}`
              }
              onClick={onClose}
            >
              <span className="sv-sidebar__link-icon">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}

          <div className="sv-sidebar__section-title" style={{ marginTop: 'auto' }}>
            Archive
          </div>
          <div
            className="sv-sidebar__link"
            style={{ cursor: 'default', opacity: 0.5 }}
          >
            <span className="sv-sidebar__link-icon">📁</span>
            Highlights
            <span className="sv-badge sv-badge--accent" style={{ marginLeft: 'auto' }}>
              Soon
            </span>
          </div>
          <NavLink
            to="/map"
            className={({ isActive }) =>
              `sv-sidebar__link ${isActive ? 'sv-sidebar__link--active' : ''}`
            }
            onClick={onClose}
          >
            <span className="sv-sidebar__link-icon">🗺️</span>
            Map View
          </NavLink>
        </nav>

        {/* ── Footer Status ─────────────────── */}
        <div className="sv-sidebar__footer">
          <div className="sv-sidebar__status">
            <span className="sv-sidebar__status-dot" />
            Cloud Worker Active
          </div>
        </div>
      </aside>
    </>
  )
}
