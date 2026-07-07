import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Menu, RefreshCcw } from 'lucide-react'

const pageTitles = {
  '/': 'Dashboard',
  '/timeline': 'Memories',
  '/reels': 'Reels',
  '/map': 'Map View',
  '/settings': 'Settings',
}

export default function Header({ onMenuClick }) {
  const location = useLocation()

  const title = pageTitles[location.pathname] ||
    (location.pathname.startsWith('/story/') ? 'Story Detail' : 'MemWault')

  const [toast, setToast] = useState(null)

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  return (
    <header className="ios-glass" style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '20px 40px',
      position: 'sticky',
      top: 0,
      zIndex: 50,
      borderBottom: '1px solid var(--ios-border)',
      margin: '-40px -40px 40px -40px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button
          className="ios-btn-secondary"
          onClick={onMenuClick}
          style={{ display: window.innerWidth <= 768 ? 'flex' : 'none', padding: '8px', borderRadius: '8px' }}
        >
          <Menu size={20} />
        </button>
        <h1 style={{ fontSize: '28px', fontWeight: 700, letterSpacing: '-0.5px' }}>{title}</h1>
      </div>

      <div>
        <button
          className="ios-btn"
          style={{ padding: '10px 16px', fontSize: '14px', borderRadius: 'var(--ios-radius-sm)' }}
          onClick={() => {
            import('../services/api').then(api => {
              api.triggerScrape(true)
                .then(() => showToast('Syncing your archive...'))
                .catch(err => showToast(`Error: ${err.message}`))
            })
          }}
        >
          <RefreshCcw size={16} />
          Sync Now
        </button>
      </div>

      {toast && (
        <div className="ios-glass" style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 9999,
          padding: '12px 20px',
          borderRadius: 'var(--ios-radius-md)',
          boxShadow: 'var(--ios-shadow-lg)',
          color: 'var(--ios-text-primary)',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          border: '1px solid var(--ios-border)'
        }}>
          <RefreshCcw size={18} className="spin-anim" />
          {toast}
        </div>
      )}
    </header>
  )
}
