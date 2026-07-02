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
                .then(() => alert('Scrape triggered! Check back in a moment.'))
                .catch(err => alert(`Error: ${err.message}`))
            })
          }}
        >
          🔄 Sync Now
        </button>
      </div>

      <style>{`
        @media (max-width: 768px) {
          #mobile-menu-btn { display: flex !important; }
        }
      `}</style>
    </header>
  )
}
