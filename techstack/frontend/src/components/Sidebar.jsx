import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { LayoutDashboard, Film, PlaySquare, Settings, Map as MapIcon, Image as ImageIcon, FolderHeart, Archive, LayoutGrid, Power, BookOpen } from 'lucide-react'
import ShutdownModal from './ShutdownModal'

const topNavItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/posts', label: 'Feed Posts', icon: LayoutGrid },
  { path: '/timeline', label: 'Memories', icon: ImageIcon },
  { path: '/journal', label: 'Journal', icon: BookOpen },
  { path: '/reels', label: 'Reels', icon: PlaySquare },
  { path: '/highlights', label: 'Highlights', icon: FolderHeart },
  { path: '/map', label: 'Map View', icon: MapIcon },
]

const bottomNavItems = [
  { path: '/archives', label: 'Archives', icon: Archive },
  { path: '/settings', label: 'Settings', icon: Settings },
]

function MemWaultVaultIcon({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
      <rect width="32" height="32" rx="8" fill="var(--ios-accent, #E89E38)" />
      {/* Outer Arch Vault */}
      <path d="M7 25V13C7 9.68629 9.68629 7 13 7H19C22.3137 7 25 9.68629 25 13V25" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" />
      {/* Inner Vault Door Arch */}
      <path d="M11 25V16C11 14.3431 12.3431 13 14 13H18C19.6569 13 21 14.3431 21 16V25" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" opacity="0.85" />
      {/* Keyhole */}
      <circle cx="16" cy="18" r="1.5" fill="#ffffff" />
      <path d="M16 19.5V22" stroke="#ffffff" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

export default function Sidebar({ isOpen, onClose }) {
  const location = useLocation()
  const [shutdownModalOpen, setShutdownModalOpen] = useState(false)

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
        <div className="ios-sidebar-logo" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <MemWaultVaultIcon size={32} />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '22px', fontWeight: 800, letterSpacing: '-0.5px', color: 'var(--ios-text-inverse, #ffffff)', lineHeight: 1.1 }}>
              MemWault
            </span>
            <span className="archive-label" style={{ fontSize: '9px', letterSpacing: '0.16em', opacity: 0.75, marginTop: '2px', color: 'var(--ios-text-inverse, #ffffff)' }}>
              DIGITAL VAULT
            </span>
          </div>
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

          {/* ── Power / Shutdown Button ── */}
          <button
            onClick={() => {
              if (onClose) onClose();
              setShutdownModalOpen(true);
            }}
            className="ios-nav-item"
            style={{
              background: 'transparent',
              border: 'none',
              width: '100%',
              textAlign: 'left',
              color: '#ff453a',
              marginTop: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '16px'
            }}
            title="Shut Down All Services"
          >
            <Power size={20} strokeWidth={2.5} color="#ff453a" />
            <span>Power Off</span>
          </button>
        </nav>
      </aside>

      <ShutdownModal 
        isOpen={shutdownModalOpen}
        onClose={() => setShutdownModalOpen(false)}
      />
    </>
  )
}

