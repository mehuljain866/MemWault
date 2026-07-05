import { useState } from 'react'
import { useLocation } from 'react-router-dom'

const pageTitles = {
  '/': 'Dashboard',
  '/timeline': 'Timeline',
  '/settings': 'Settings',
}

export default function Header({ onMenuClick }) {
  const location = useLocation()

  // Extract page title from path
  const title = pageTitles[location.pathname] ||
    (location.pathname.startsWith('/story/') ? 'Story Detail' : 'MemWault')

  const [toast, setToast] = useState(null)

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  return (
    <header className="sv-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {/* Mobile menu toggle */}
        <button
          className="sv-btn sv-btn--ghost sv-btn--icon"
          onClick={onMenuClick}
          style={{ display: 'none' }}
          id="mobile-menu-btn"
        >
          ☰
        </button>
        <h1 className="sv-header__title">{title}</h1>
      </div>

      <div className="sv-header__actions">
        <button
          className="sv-btn sv-btn--secondary sv-btn--sm"
          onClick={() => {
            import('../services/api').then(api => {
              api.triggerScrape(true)
                .then(() => showToast('✨ Scrape triggered! Check back in a moment.'))
                .catch(err => showToast(`Error: ${err.message}`))
            })
          }}
        >
          🔄 Sync Now
        </button>
      </div>

      {toast && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 9999,
          background: 'var(--sv-surface-raised)',
          border: '1px solid var(--sv-border-light)',
          padding: 'var(--sv-space-3) var(--sv-space-4)',
          borderRadius: 'var(--sv-radius-md)',
          boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
          color: 'var(--sv-text-primary)',
          animation: 'fadeIn 0.3s ease-out',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--sv-space-2)'
        }}>
          {toast}
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          #mobile-menu-btn { display: flex !important; }
        }
      `}</style>
    </header>
  )
}
