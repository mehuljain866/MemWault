import { useState, useEffect, useRef } from 'react'
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
  CheckSquare,
  Trash2,
} from 'lucide-react'
import { getHighlights, triggerHighlightsSync, deleteHighlight, uploadHighlightCover } from '../services/api'
import HighlightCreatorModal from '../components/HighlightCreatorModal'

// ── Helper for rendering images or videos seamlessly ──────────
function MediaPreview({ url, style }) {
  if (!url) return null
  const isVideo = url.includes('.mp4') || url.includes('.mov')
  
  if (isVideo) {
    return (
      <video
        src={url}
        style={style}
        autoPlay
        muted
        loop
        playsInline
        onError={e => { e.target.style.display = 'none' }}
      />
    )
  }
  return (
    <img
      src={url}
      style={style}
      onError={e => { e.target.style.display = 'none' }}
    />
  )
}

function GridItem({ url, style }) {
  return (
    <div style={{ ...style, position: 'relative', overflow: 'hidden', minWidth: 0, minHeight: 0 }}>
      <MediaPreview url={url} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
    </div>
  )
}

// ── Skeleton card for loading state ──────────────────────────
function SkeletonCard() {
  return (
    <div
      style={{
        aspectRatio: '1/1',
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

  // Custom cover upload state
  const fileInputRef = useRef(null)
  const [uploadingForId, setUploadingForId] = useState(null)

  // Multi-select state
  const [isSelectMode, setIsSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState([])
  const [bulkLoading, setBulkLoading] = useState(false)

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
    const newPrefs = { ...coverPrefs, [id]: pref }
    setCoverPrefs(newPrefs)
    localStorage.setItem('memwault_hl_cover_prefs', JSON.stringify(newPrefs))
    setOpenMenuId(null)
  }

  async function handleDeleteHighlight(e, id) {
    e.stopPropagation()
    if (!window.confirm('Are you sure you want to delete this highlight? This will NOT delete the actual stories inside.')) return
    
    try {
      await deleteHighlight(id)
      setHighlights(prev => prev.filter(hl => hl.id !== id))
      setSelectedIds(prev => prev.filter(x => x !== id))
    } catch (err) {
      alert('Failed to delete highlight: ' + err.message)
    } finally {
      setOpenMenuId(null)
    }
  }

  async function handleCustomImageUpload(e) {
    const file = e.target.files?.[0]
    if (!file || !uploadingForId) return

    try {
      const updatedHl = await uploadHighlightCover(uploadingForId, file)
      setHighlights(prev => prev.map(h => h.id === uploadingForId ? updatedHl : h))
      setCoverPrefs(prev => {
        const newPrefs = { ...prev, [uploadingForId]: 'custom' }
        localStorage.setItem('memwault_hl_cover_prefs', JSON.stringify(newPrefs))
        return newPrefs
      })
    } catch (err) {
      alert('Failed to upload custom cover: ' + err.message)
    } finally {
      setUploadingForId(null)
      // Reset input value so same file can be selected again
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleBulkDelete() {
    if (selectedIds.length === 0) return
    if (!window.confirm(`Are you sure you want to delete ${selectedIds.length} highlight(s)?`)) return
    
    try {
      setBulkLoading(true)
      for (const id of selectedIds) {
        await deleteHighlight(id)
      }
      setHighlights(prev => prev.filter(hl => !selectedIds.includes(hl.id)))
      setIsSelectMode(false)
      setSelectedIds([])
    } catch (err) {
      alert('Failed to delete highlights: ' + err.message)
    } finally {
      setBulkLoading(false)
    }
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
          {isSelectMode && (
            <span style={{ fontSize: '14px', color: 'var(--ios-text-secondary)', fontWeight: 500 }}>
              {selectedIds.length > 0 ? `${selectedIds.length} selected` : 'Tap to select'}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Select Mode toggle */}
          <button
            onClick={() => {
              setIsSelectMode(!isSelectMode)
              setSelectedIds([])
              setOpenMenuId(null)
            }}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '8px 12px', borderRadius: '16px', border: 'none',
              background: isSelectMode ? 'var(--ios-accent)' : 'transparent',
              color: isSelectMode ? '#fff' : 'var(--ios-text-primary)',
              cursor: 'pointer', fontSize: '14px', fontWeight: 600,
              transition: 'all 0.2s ease',
            }}
          >
            <CheckSquare size={16} />
            <span style={{ display: window.innerWidth <= 768 ? 'none' : 'inline' }}>
              {isSelectMode ? 'Cancel' : 'Select'}
            </span>
          </button>
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
            const pref = coverPrefs[hl.id] || 'grid' // Default to grid
            
            // Render content based on preference
            let CoverContent
            if (pref === 'grid' && hl.preview_stories?.length > 0) {
              const stories = hl.preview_stories.slice(0, 4)
              
              if (stories.length === 4) {
                CoverContent = (
                  <div style={{ width: '100%', height: '100%', display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: '2px', background: 'var(--ios-border)' }}>
                    {stories.map((url, idx) => (
                      <GridItem key={idx} url={url} />
                    ))}
                  </div>
                )
              } else if (stories.length === 3) {
                CoverContent = (
                  <div style={{ width: '100%', height: '100%', display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: '2px', background: 'var(--ios-border)' }}>
                    <GridItem url={stories[0]} style={{ gridRow: 'span 2' }} />
                    <GridItem url={stories[1]} />
                    <GridItem url={stories[2]} />
                  </div>
                )
              } else if (stories.length === 2) {
                CoverContent = (
                  <div style={{ width: '100%', height: '100%', display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr', gap: '2px', background: 'var(--ios-border)' }}>
                    {stories.map((url, idx) => (
                      <GridItem key={idx} url={url} />
                    ))}
                  </div>
                )
              } else {
                CoverContent = (
                  <MediaPreview url={stories[0]} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                )
              }
            } else if (pref === 'recent' && hl.preview_stories?.length > 0) {
              CoverContent = (
                <MediaPreview
                  url={hl.preview_stories[0]}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              )
            } else {
              // 'official' or 'custom' (custom uploads update cover_media_url)
              CoverContent = hl.cover_media_url ? (
                <MediaPreview
                  url={hl.cover_media_url}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ImageIcon size={36} color="var(--ios-text-secondary)" />
                </div>
              )
            }

            return (
              <motion.div
                layout
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                key={hl.id}
                onClick={() => {
                  if (isSelectMode) {
                    setSelectedIds(prev => prev.includes(hl.id) ? prev.filter(x => x !== hl.id) : [...prev, hl.id])
                  } else {
                    navigate(`/highlights/${hl.id}`)
                  }
                }}
                style={{
                  position: 'relative',
                  aspectRatio: '1/1',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  backgroundColor: 'var(--ios-border)',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  transform: isSelectMode && selectedIds.includes(hl.id) ? 'scale(0.95)' : 'scale(1)',
                  opacity: isSelectMode && !selectedIds.includes(hl.id) ? 0.7 : 1,
                  border: isSelectMode && selectedIds.includes(hl.id) ? '3px solid var(--ios-accent)' : 'none',
                }}
              >
                {/* Cover image area */}
                {CoverContent}

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
                {!isSelectMode && (
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
                )}

                {/* Cover pref dropdown */}
                {!isSelectMode && openMenuId === hl.id && (
                  <div
                    onClick={e => e.stopPropagation()}
                    style={{
                      position: 'absolute', bottom: '44px', right: '8px',
                      background: 'rgba(30,30,30,0.85)',
                      backdropFilter: 'blur(20px) saturate(180%)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '12px',
                      padding: '8px 0',
                      display: 'flex', flexDirection: 'column',
                      minWidth: '160px', zIndex: 20,
                      boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                    }}
                  >
                    {[
                      { key: 'official', label: 'Official Cover' },
                      { key: 'recent', label: 'Latest Story' },
                      { key: 'grid', label: '4-Image Grid' },
                      { key: 'custom', label: 'Custom Upload...' },
                    ].map(opt => (
                      <button
                        key={opt.key}
                        onClick={(e) => {
                          e.stopPropagation()
                          if (opt.key === 'custom') {
                            setUploadingForId(hl.id)
                            if (fileInputRef.current) fileInputRef.current.click()
                          } else {
                            handleSetCoverPref(e, hl.id, opt.key)
                          }
                        }}
                        style={{
                          width: '100%', padding: '10px 16px', textAlign: 'left',
                          background: 'transparent', border: 'none', cursor: 'pointer',
                          fontSize: '14px', fontWeight: 500,
                          color: (coverPrefs[hl.id] || 'grid') === opt.key
                            ? 'var(--ios-accent)'
                            : '#fff',
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                    <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '4px 0' }} />
                    <button
                      onClick={(e) => handleDeleteHighlight(e, hl.id)}
                      style={{
                        width: '100%', padding: '10px 16px', textAlign: 'left',
                        background: 'transparent', border: 'none', cursor: 'pointer',
                        fontSize: '14px', fontWeight: 500,
                        color: 'var(--ios-danger)',
                      }}
                    >
                      Delete Highlight
                    </button>
                  </div>
                )}
              </motion.div>
            )
          })}
        </div>
      )}

      {/* ── Highlight Creator Modal ─────────────────────────── */}
      <HighlightCreatorModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={handleHighlightCreated}
      />

      {/* ── Custom Bulk Delete Bar ─────────────────────────── */}
      {isSelectMode && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          style={{
            position: 'fixed',
            bottom: '30px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(30,30,30,0.85)',
            backdropFilter: 'blur(20px) saturate(180%)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '24px',
            padding: '8px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            zIndex: 100,
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          }}
        >
          <div style={{ color: '#fff', fontWeight: 600, fontSize: '14px', marginRight: '8px' }}>
            {selectedIds.length} selected
          </div>
          <button
            onClick={handleBulkDelete}
            disabled={bulkLoading || selectedIds.length === 0}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '8px 16px', borderRadius: '16px',
              background: 'rgba(255,59,48,0.2)',
              color: '#ff3b30', border: 'none', cursor: 'pointer',
              fontWeight: 600, fontSize: '13px',
              opacity: (bulkLoading || selectedIds.length === 0) ? 0.5 : 1
            }}
          >
            <Trash2 size={16} />
            {bulkLoading ? 'Deleting...' : 'Delete'}
          </button>
        </motion.div>
      )}
    </div>
  )
}