import { useState, useEffect } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { FolderHeart, MoreHorizontal, Image as ImageIcon, ZoomIn, ZoomOut, RefreshCcw, Clock } from 'lucide-react'
import { getHighlights, triggerHighlightsSync } from '../services/api'

export default function Highlights() {
  const navigate = useNavigate()
  const { onMenuClick } = useOutletContext() || {}
  const [highlights, setHighlights] = useState([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [zoom, setZoom] = useState(180) // default column width

  // Map of highlight_id -> 'official' | 'recent'
  const [coverPrefs, setCoverPrefs] = useState(() => {
    return JSON.parse(localStorage.getItem('highlight_covers') || '{}')
  })

  // Which highlight's menu is currently open
  const [openMenuId, setOpenMenuId] = useState(null)

  useEffect(() => {
    loadHighlights()
  }, [])

  useEffect(() => {
    localStorage.setItem('highlight_covers', JSON.stringify(coverPrefs))
  }, [coverPrefs])

  // Close menus when clicking outside
  useEffect(() => {
    function handleClickOutside() {
      setOpenMenuId(null)
    }
    window.addEventListener('click', handleClickOutside)
    return () => window.removeEventListener('click', handleClickOutside)
  }, [])

  async function loadHighlights() {
    try {
      const data = await getHighlights()
      setHighlights(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function handleSync() {
    setSyncing(true)
    try {
      await triggerHighlightsSync()
      alert('Highlights sync started in background. Refresh in a moment.')
    } catch (err) {
      alert('Sync failed: ' + err.message)
    } finally {
      setSyncing(false)
    }
  }

  function handleMenuClick(e, id) {
    e.stopPropagation()
    setOpenMenuId(openMenuId === id ? null : id)
  }

  function handleSetCoverPref(e, id, pref) {
    e.stopPropagation()
    setCoverPrefs(prev => ({ ...prev, [id]: pref }))
    setOpenMenuId(null)
  }

  return (
    <div style={{ padding: '20px 20px 60px', height: '100%', display: 'flex', flexDirection: 'column' }}>
      
      {/* ── Header ─────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', zIndex: 50, position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            className="ios-btn-secondary"
            onClick={(e) => { e.stopPropagation(); onMenuClick?.(); }}
            style={{ display: window.innerWidth <= 768 ? 'flex' : 'none', padding: '8px', borderRadius: '8px' }}
          >
            <FolderHeart size={24} />
          </button>
          <h1 style={{ fontSize: '28px', fontWeight: 700, margin: 0 }}>Albums</h1>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', background: 'var(--ios-border)', borderRadius: '16px', padding: '2px' }}>
            <button
              onClick={() => setZoom(Math.min(zoom + 40, 300))}
              style={{ padding: '8px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--ios-text-primary)' }}
            >
              <ZoomIn size={18} />
            </button>
            <button
              onClick={() => setZoom(Math.max(zoom - 40, 100))}
              style={{ padding: '8px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--ios-text-primary)' }}
            >
              <ZoomOut size={18} />
            </button>
          </div>

          <button
            className="ios-btn"
            style={{ padding: '8px 16px', fontSize: '13px', borderRadius: '16px' }}
            onClick={handleSync}
            disabled={syncing}
          >
            <RefreshCcw size={16} className={syncing ? 'spin-anim' : ''} />
            <span style={{ display: window.innerWidth <= 768 ? 'none' : 'inline' }}>Sync Highlights</span>
          </button>
        </div>
      </div>

      {/* ── Grid ─────────────────────────── */}
      {loading ? (
        <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <RefreshCcw size={32} className="spin-anim" color="var(--ios-text-secondary)" />
        </div>
      ) : highlights.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'var(--ios-text-secondary)' }}>
          <FolderHeart size={48} color="var(--ios-border)" />
          <div style={{ fontSize: '20px', fontWeight: 600, marginTop: '16px', color: 'var(--ios-text-primary)' }}>No Highlights</div>
          <div style={{ fontSize: '16px', maxWidth: '300px', textAlign: 'center', marginTop: '8px' }}>Sync your highlights to see them here.</div>
        </div>
      ) : (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: `repeat(auto-fill, minmax(${zoom}px, 1fr))`, 
          gap: '16px',
          alignContent: 'start',
          flex: 1
        }}>
          {highlights.map(hl => {
            const pref = coverPrefs[hl.id] || 'official'
            // In a full implementation, 'recent' would fetch the most recent story's cover url.
            // For now, our backend returns cover_media_url which is the official one.
            const displayCover = hl.cover_media_url

            return (
              <div 
                key={hl.id}
                onClick={() => navigate(`/highlights/${hl.id}`)}
                style={{
                  position: 'relative',
                  aspectRatio: '4/5',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  backgroundColor: 'var(--ios-border)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }}
              >
                {displayCover ? (
                  <img src={displayCover} alt={hl.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ImageIcon size={32} color="var(--ios-text-secondary)" />
                  </div>
                )}

                {/* Gradient overlay */}
                <div style={{
                  position: 'absolute',
                  bottom: 0, left: 0, right: 0,
                  height: '50%',
                  background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 100%)',
                  pointerEvents: 'none'
                }} />

                {/* Title */}
                <div style={{
                  position: 'absolute',
                  bottom: '12px', left: '12px', right: '12px',
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: '15px',
                  textShadow: '0 1px 4px rgba(0,0,0,0.5)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {hl.title}
                </div>

                {/* Settings Menu Button */}
                <button
                  onClick={(e) => handleMenuClick(e, hl.id)}
                  style={{
                    position: 'absolute', top: '8px', right: '8px',
                    background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(10px)',
                    border: 'none', borderRadius: '50%',
                    width: '28px', height: '28px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', cursor: 'pointer', zIndex: 10
                  }}
                >
                  <MoreHorizontal size={16} />
                </button>

                {/* Menu Dropdown */}
                {openMenuId === hl.id && (
                  <div 
                    onClick={e => e.stopPropagation()}
                    style={{
                      position: 'absolute', top: '40px', right: '8px',
                      background: 'var(--ios-bg-card)',
                      borderRadius: '12px',
                      padding: '4px',
                      boxShadow: 'var(--ios-shadow-lg)',
                      zIndex: 20,
                      minWidth: '150px'
                    }}
                  >
                    <button 
                      onClick={(e) => handleSetCoverPref(e, hl.id, 'official')}
                      style={{
                        width: '100%', padding: '8px 12px', textAlign: 'left',
                        background: 'transparent', border: 'none', cursor: 'pointer',
                        borderRadius: '8px', fontSize: '13px', fontWeight: 500,
                        color: pref === 'official' ? 'var(--ios-accent)' : 'var(--ios-text-primary)'
                      }}
                    >
                      Official Cover
                    </button>
                    <button 
                      onClick={(e) => handleSetCoverPref(e, hl.id, 'recent')}
                      style={{
                        width: '100%', padding: '8px 12px', textAlign: 'left',
                        background: 'transparent', border: 'none', cursor: 'pointer',
                        borderRadius: '8px', fontSize: '13px', fontWeight: 500,
                        color: pref === 'recent' ? 'var(--ios-accent)' : 'var(--ios-text-primary)'
                      }}
                    >
                      Most Recent Story
                    </button>
                  </div>
                )}

              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}