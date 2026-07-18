import { useState, useEffect } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  FolderHeart,
  MoreHorizontal,
  Image as ImageIcon,
  ZoomIn,
  ZoomOut,
  RefreshCcw,
  Plus,
  Layers,
} from 'lucide-react'
import { getHighlights, triggerHighlightsSync } from '../services/api'
import HighlightCreatorModal from '../components/HighlightCreatorModal'

// ── Skeleton card for loading state ──────────────────────────
function SkeletonCard() {
  return (
    <div
      style={{
        aspectRatio: '4/5',
        borderRadius: '16px',
        background: 'var(--ios-border)',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <div
        style={{
          position: 'absolute',
          bottom: '12px',
          left: '12px',
          right: '12px',
          height: '14px',
          borderRadius: '8px',
          background: 'rgba(255,255,255,0.08)',
        }}
      />
    </div>
  )
}

export default function Highlights() {
  const navigate = useNavigate()
  const { onMenuClick } = useOutletContext() || {}
  const [highlights, setHighlights] = useState([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [zoom, setZoom] = useState(180) // default column width in px
  const [showCreateModal, setShowCreateModal] = useState(false)

  // Map of highlight_id -> 'official' | 'recent'
  const [coverPrefs, setCoverPrefs] = useState(() =>
    JSON.parse(localStorage.getItem('highlight_covers') || '{}')
  )

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
    setLoading(true)
    try {
      const data = await getHighlights()
      setHighlights(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
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

  function handleHighlightCreated() {
    loadHighlights()
  }

  return (
    <div style={{ padding: '20px 20px 60px', height: '100%', display: 'flex', flexDirection: 'column' }}>

      {/* ── Header ─────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: '24px', zIndex: 50, position: 'relative'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Mobile hamburger */}
          <button
            className="ios-btn-secondary"
            onClick={(e) => { e.stopPropagation(); onMenuClick?.() }}
            style={{ display: window.innerWidth <= 768 ? 'flex' : 'none', padding: '8px', borderRadius: '8px' }}
          >
            <FolderHeart size={24} />
          </button>
          <h1 style={{ fontSize: '28px', fontWeight: 700, margin: 0, color: 'var(--ios-text-primary)' }}>
            Albums
          </h1>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Zoom controls */}
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

          {/* Create Highlight button */}
          <button
            className="ios-btn"
            style={{ padding: '8px 18px', fontSize: '13px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}
            onClick={() => setShowCreateModal(true)}
          >
            <Plus size={16} />
            <span style={{ display: window.innerWidth <= 768 ? 'none' : 'inline' }}>Create Highlight</span>
          </button>
        </div>
      </div>

      {/* ── Grid / Loading / Empty ─────────────────────────── */}
      {loading ? (
        /* Loading skeleton */
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(auto-fill, minmax(${zoom}px, 1fr))`,
          gap: '16px',
          alignContent: 'start',
          flex: 1,
        }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : highlights.length === 0 ? (
        /* Empty state */
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', flex: 1, color: 'var(--ios-text-secondary)',
          gap: '16px'
        }}>
          <div style={{
            width: '96px', height: '96px', borderRadius: '28px',
            background: 'var(--ios-border)', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Layers size={48} color="var(--ios-text-secondary)" />
          </div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--ios-text-primary)' }}>
            No Highlights Yet
          </div>
          <div style={{ fontSize: '15px', maxWidth: '320px', textAlign: 'center', lineHeight: 1.6 }}>
            Sync your Instagram highlights or create a custom album from your saved stories.
          </div>
            <button
              className="ios-btn"
              style={{ padding: '10px 22px', fontSize: '14px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}
              onClick={() => setShowCreateModal(true)}
            >
              <Plus size={16} /> Create your first highlight
            </button>
        </div>
      ) : (
        /* Album grid */
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(auto-fill, minmax(${zoom}px, 1fr))`,
          gap: '16px',
          alignContent: 'start',
          flex: 1,
        }}>
          {highlights.map(hl => {
            const displayCover = hl.cover_media_url

            return (
              <motion.div
                layout
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                key={hl.id}
                onClick={() => navigate(`/highlights/${hl.id}`)}
                style={{
                  position: 'relative',
                  aspectRatio: '4/5',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  backgroundColor: 'var(--ios-border)',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'scale(1.02)'
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.2)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'scale(1)'
                  e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.12)'
                }}
              >
                {/* Cover image */}
                {displayCover ? (
                  <img
                    src={displayCover}
                    alt={hl.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={e => { e.target.style.display = 'none' }}
                  />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ImageIcon size={36} color="var(--ios-text-secondary)" />
                  </div>
                )}

                {/* Gradient overlay */}
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0,
                  height: '55%',
                  background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)',
                  pointerEvents: 'none',
                }} />

                {/* Story count badge */}
                {hl.story_count != null && (
                  <div style={{
                    position: 'absolute', top: '10px', left: '10px',
                    background: 'rgba(0,0,0,0.45)',
                    backdropFilter: 'blur(10px)',
                    borderRadius: '12px',
                    padding: '3px 8px',
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}>
                    <Layers size={11} />
                    {hl.story_count}
                  </div>
                )}

                {/* Title */}
                <div style={{
                  position: 'absolute', bottom: '10px', left: '12px', right: '40px',
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: '14px',
                  textShadow: '0 1px 4px rgba(0,0,0,0.6)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}>
                  {hl.title}
                </div>

                {/* Settings menu button */}
                <button
                  onClick={(e) => handleMenuClick(e, hl.id)}
                  style={{
                    position: 'absolute', bottom: '8px', right: '8px',
                    background: 'rgba(255,255,255,0.15)',
                    backdropFilter: 'blur(10px)',
                    border: 'none', borderRadius: '50%',
                    width: '28px', height: '28px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', cursor: 'pointer', zIndex: 10,
                  }}
                >
                  <MoreHorizontal size={16} />
                </button>

                {/* Cover pref dropdown */}
                {openMenuId === hl.id && (
                  <div
                    onClick={e => e.stopPropagation()}
                    style={{
                      position: 'absolute', bottom: '44px', right: '8px',
                      background: 'var(--ios-bg-card)',
                      borderRadius: '12px',
                      padding: '4px',
                      boxShadow: 'var(--ios-shadow-lg)',
                      zIndex: 20,
                      minWidth: '150px',
                    }}
                  >
                    {[
                      { key: 'official', label: 'Official Cover' },
                      { key: 'recent', label: 'Most Recent Story' },
                    ].map(opt => (
                      <button
                        key={opt.key}
                        onClick={(e) => handleSetCoverPref(e, hl.id, opt.key)}
                        style={{
                          width: '100%', padding: '8px 12px', textAlign: 'left',
                          background: 'transparent', border: 'none', cursor: 'pointer',
                          borderRadius: '8px', fontSize: '13px', fontWeight: 500,
                          color: (coverPrefs[hl.id] || 'official') === opt.key
                            ? 'var(--ios-accent)'
                            : 'var(--ios-text-primary)',
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </motion.div>
            )
          })}
        </div>
      )}

      {/* ── Create Highlight Modal ─────────────────────────── */}
      <HighlightCreatorModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={handleHighlightCreated}
      />
    </div>
  )
}