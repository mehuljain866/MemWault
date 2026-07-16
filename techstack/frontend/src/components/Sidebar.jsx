import { NavLink, useLocation } from 'react-router-dom'
import { LayoutDashboard, Film, PlaySquare, Settings, Map as MapIcon, Image as ImageIcon, FolderHeart } from 'lucide-react'

const topNavItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/timeline', label: 'Memories', icon: ImageIcon },
  { path: '/reels', label: 'Reels', icon: PlaySquare },
  { path: '/highlights', label: 'Highlights', icon: FolderHeart },
  { path: '/map', label: 'Map View', icon: MapIcon },
]

import { Trash2 } from 'lucide-react'

const bottomNavItems = [
  { path: '/trash', label: 'Trash', icon: Trash2 },
  { path: '/settings', label: 'Settings', icon: Settings },
]

export default function Sidebar({ isOpen, onClose }) {
  const location = useLocation()

  return (
    <>
      {/* Mobile overlay backdrop if needed */}
      {isOpen && (
        <div
          style={{
            position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 99
          }}
          onClick={onClose}
        />
      )}

      <aside className="ios-sidebar" style={{ display: isOpen || window.innerWidth > 768 ? 'flex' : 'none' }}>
        {/* ── Brand ──────────────────────────── */}
        <div className="ios-sidebar-logo">
          <Film size={28} color="var(--ios-accent)" />
          <span>MemWault</span>
        </div>

        {/* ── Navigation ────────────────────── */}
        <nav className="ios-nav-list" style={{ flexGrow: 1 }}>
          {topNavItems.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  `ios-nav-item ${isActive ? 'active' : ''}`
                }
                onClick={onClose}
              >
                <Icon size={20} strokeWidth={2.5} />
                {item.label}
              </NavLink>
            )
          })}
        </nav>

        <nav className="ios-nav-list ios-nav-bottom">
          {bottomNavItems.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  `ios-nav-item ${isActive ? 'active' : ''}`
                }
                onClick={onClose}
              >
                <Icon size={20} strokeWidth={2.5} />
                {item.label}
              </NavLink>
            )
          })}
        </nav>
      </aside>
    </>
  )
}
