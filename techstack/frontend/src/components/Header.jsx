import { useState, useEffect } from 'react'
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
  const [isVisible, setIsVisible] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)

  useEffect(() => {
    const scrollContainer = document.querySelector('.ios-main-content')
    if (!scrollContainer) return

    const handleScroll = () => {
      const currentScrollY = scrollContainer.scrollTop
      if (currentScrollY > lastScrollY && currentScrollY > 50) {
        setIsVisible(false) // scrolling down
      } else {
        setIsVisible(true)  // scrolling up
      }
      setLastScrollY(currentScrollY)
    }

    scrollContainer.addEventListener('scroll', handleScroll, { passive: true })
    return () => scrollContainer.removeEventListener('scroll', handleScroll)
  }, [lastScrollY])

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const isDashboard = location.pathname === '/'

  const defaultStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px 40px',
    position: 'sticky',
    top: 0,
    zIndex: 50,
    borderBottom: '1px solid var(--ios-border)',
    margin: '-40px -40px 40px -40px',
    transition: 'transform 0.3s cubic-bezier(0.25, 1, 0.5, 1)',
    transform: isVisible ? 'translateY(0)' : 'translateY(-100%)'
  }

  const pillStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 24px',
    position: 'fixed',
    top: '20px',
    left: '50%',
    zIndex: 50,
    borderRadius: '30px',
    border: '1px solid var(--ios-border)',
    boxShadow: 'var(--ios-shadow-lg)',
    width: 'max-content',
    minWidth: '50%',
    gap: '32px',
    transition: 'transform 0.4s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.4s',
    transform: isVisible ? 'translateX(-50%) translateY(0)' : 'translateX(-50%) translateY(-300%)',
    opacity: isVisible ? 1 : 0,
    pointerEvents: isVisible ? 'auto' : 'none'
  }

  const headerStyle = isDashboard ? defaultStyle : pillStyle

  const isTimelineOrReels = location.pathname === '/timeline' || location.pathname === '/reels' || location.pathname === '/' || location.pathname.startsWith('/story/')
  if (isTimelineOrReels) return null;

  return (
    <header className="ios-glass" style={headerStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button
          className="ios-btn-secondary"
          onClick={onMenuClick}
          style={{ display: window.innerWidth <= 768 ? 'flex' : 'none', padding: '8px', borderRadius: '8px' }}
        >
          <Menu size={20} />
        </button>
        <h1 style={{ fontSize: isDashboard ? '28px' : '20px', fontWeight: 700, letterSpacing: '-0.5px', margin: 0 }}>{title}</h1>
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
