import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { getStories, bulkUpdateStories } from '../services/api'
import StoryCard from '../components/StoryCard'
import BulkActionBar from '../components/BulkActionBar'
import HighlightCreatorModal from '../components/HighlightCreatorModal'
import AddToHighlightModal from '../components/AddToHighlightModal'
import FastScrollbar from '../components/FastScrollbar'
import { useOutletContext } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Filter, Image as ImageIcon, Video, BoxSelect, RefreshCcw, 
  ZoomIn, ZoomOut, Menu, CheckSquare, X as XIcon, Calendar, Layers
} from 'lucide-react'

// Helper for Year/Month cluster preview
function ClusterPreview({ stories, size }) {
  const previews = stories.slice(0, 4)
  if (previews.length === 0) return null

  if (previews.length === 1 || size < 80) {
    const s = previews[0]
    return (
      <img 
        src={s.media_url || `/media/${s.s3_key_compressed}`} 
        alt="" 
        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
        loading="lazy"
      />
    )
  }

  return (
    <div style={{ width: '100%', height: '100%', display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: '1px', background: 'var(--ios-border)' }}>
      {previews.map((s, idx) => (
        <div key={s.id || idx} style={{ overflow: 'hidden', position: 'relative' }}>
          <img 
            src={s.media_url || `/media/${s.s3_key_compressed}`} 
            alt="" 
            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
            loading="lazy"
          />
        </div>
      ))}
    </div>
  )
}

export default function Timeline({ isReelView = false }) {
  const [stories, setStories] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [hasNext, setHasNext] = useState(false)
  const [filters, setFilters] = useState({ mediaType: null })
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const { onMenuClick } = useOutletContext() || {}
  
  // Continuous Zoom Scale: 0 (Years) -> 1 (Detailed Photos)
  // Preset semantic levels: 'year' (0), 'month' (0.33), 'day' (0.66), 'photo' (1.0)
  const [zoomScale, setZoomScale] = useState(0.66) // Default to Day view
  const timelineRef = useRef(null)

  // Derive semantic level name from continuous zoomScale
  const zoomLevel = useMemo(() => {
    if (zoomScale < 0.25) return 'year'
    if (zoomScale < 0.5) return 'month'
    if (zoomScale < 0.8) return 'day'
    return 'photo'
  }, [zoomScale])

  // ── Multi-select state (Persists across zoom levels by story ID) ──────
  const [selectedIds, setSelectedIds] = useState([])
  const [isSelectMode, setIsSelectMode] = useState(false)
  const [bulkLoading, setBulkLoading] = useState(false)
  
  const [showAddToHighlightModal, setShowAddToHighlightModal] = useState(false)
  const [showHighlightCreatorModal, setShowHighlightCreatorModal] = useState(false)

  const PAGE_SIZE = zoomLevel === 'year' ? 120 : zoomLevel === 'month' ? 60 : 30

  const loadStories = useCallback(async (pageNum = 1) => {
    if (pageNum === 1) setLoading(true)
    try {
      const queryParams = {
        page: pageNum,
        pageSize: PAGE_SIZE,
        mediaType: filters.mediaType,
        search: searchQuery.trim() || undefined
      }
      
      if (isReelView) {
        queryParams.isReel = true
      } else {
        queryParams.isMemory = true
      }

      const data = await getStories(queryParams)
      if (pageNum === 1) {
        setStories(data.stories)
      } else {
        setStories(prev => [...prev, ...data.stories])
      }
      setTotal(data.total)
      setHasNext(data.has_next)
      setPage(pageNum)
    } catch (err) {
      console.error('Failed to load stories:', err)
    } finally {
      setLoading(false)
    }
  }, [filters, isReelView, PAGE_SIZE, searchQuery])

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput)
    }, 400)
    return () => clearTimeout(timer)
  }, [searchInput])

  useEffect(() => {
    loadStories(1)
  }, [loadStories])

  // Trackpad Pinch / Ctrl+MouseWheel Continuous Zoom Listener
  useEffect(() => {
    const container = timelineRef.current
    if (!container) return

    function handleWheel(e) {
      if (e.ctrlKey) {
        e.preventDefault()
        const delta = e.deltaY < 0 ? 0.08 : -0.08
        setZoomScale(prev => Math.min(1.0, Math.max(0.0, prev + delta)))
      }
    }

    container.addEventListener('wheel', handleWheel, { passive: false })
    return () => container.removeEventListener('wheel', handleWheel)
  }, [])

  // Dynamic Grouping according to semantic zoom level
  const groupedStories = useMemo(() => {
    return stories.reduce((acc, story) => {
      const dateStrUtc = story.taken_at + (story.taken_at.endsWith('Z') ? '' : 'Z')
      const d = new Date(dateStrUtc)
      let groupKey = ''
      
      if (zoomLevel === 'year') {
        groupKey = d.getFullYear().toString()
      } else if (zoomLevel === 'month') {
        groupKey = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      } else {
        groupKey = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
      }
      
      if (!acc[groupKey]) acc[groupKey] = []
      acc[groupKey].push(story)
      return acc
    }, {})
  }, [stories, zoomLevel])

  // Dynamic Grid sizing continuously bound to zoomScale (from 50px up to 260px)
  const getGridColumns = () => {
    const minWidth = Math.round(50 + zoomScale * 210) // 50px at 0.0 -> 260px at 1.0
    return `repeat(auto-fill, minmax(${minWidth}px, 1fr))`
  }

  const getGridGap = () => {
    if (zoomScale < 0.25) return '4px'
    if (zoomScale < 0.5) return '8px'
    return '14px'
  }

  // ── Multi-select handlers ────────────────────────────────
  const enterSelectMode = () => {
    setIsSelectMode(true)
    setSelectedIds([])
  }

  const exitSelectMode = () => {
    setIsSelectMode(false)
    setSelectedIds([])
  }

  const toggleCard = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const handleArchive = async () => {
    if (selectedIds.length === 0) return
    try {
      setBulkLoading(true)
      await bulkUpdateStories(selectedIds, { is_trashed: true })
      setStories(prev => prev.filter(s => !selectedIds.includes(s.id)))
      exitSelectMode()
    } catch (err) {
      console.error('Bulk archive failed:', err)
    } finally {
      setBulkLoading(false)
    }
  }

  const handleAddToHighlight = () => {
    setShowAddToHighlightModal(true)
  }

  const handleHighlightCreated = () => {
    setShowHighlightCreatorModal(false)
    exitSelectMode()
  }

  const handleAddedToExisting = () => {
    setShowAddToHighlightModal(false)
    exitSelectMode()
  }

  if (loading && stories.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '16px', color: 'var(--ios-text-secondary)' }}>
        <RefreshCcw size={32} className="spin-anim" />
        <div style={{ fontSize: '18px', fontWeight: 600 }}>Loading Timeline...</div>
      </div>
    )
  }

  // Segment Filter Button
  const SegmentButton = ({ active, onClick, icon: Icon, label }) => (
    <button
      onClick={onClick}
      style={{
        flex: 1, padding: '7px 10px', border: 'none', background: active ? 'var(--ios-bg-card)' : 'transparent',
        borderRadius: '7px', color: active ? 'var(--ios-text-primary)' : 'var(--ios-text-secondary)',
        fontWeight: active ? 600 : 500, fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: '6px', cursor: 'pointer', transition: 'all 0.2s ease',
        boxShadow: active ? '0 2px 6px rgba(0,0,0,0.12)' : 'none'
      }}
    >
      <Icon size={15} /> {label}
    </button>
  )

  return (
    <motion.div 
      ref={timelineRef}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.25 }}
      style={{ position: 'relative', height: '100%', paddingBottom: '40px' }}
    >
      <FastScrollbar items={stories} getDate={(s) => new Date(s.taken_at)} scrollContainerSelector=".ios-main-content" />

      {/* ── Fixed Top Control Bar ─────────────────────────── */}
      <div style={{ 
        display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', 
        marginBottom: '20px', gap: '16px', zIndex: 60, 
        paddingTop: '16px', paddingBottom: '16px',
        borderBottom: '1px solid var(--ios-border)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            className="ios-btn-secondary"
            onClick={onMenuClick}
            style={{ display: window.innerWidth <= 768 ? 'flex' : 'none', padding: '8px', borderRadius: '8px' }}
          >
            <Menu size={20} />
          </button>
          <h2 className="ios-title" style={{ margin: 0 }}>{isReelView ? "Reels" : "Memories"}</h2>

          {/* Continuous Zoom Level Pills */}
          {!isSelectMode && (
            <div style={{ display: 'flex', background: 'var(--ios-border)', borderRadius: '20px', padding: '2px', alignItems: 'center', gap: '2px' }}>
              <button 
                onClick={() => setZoomScale(0.0)} 
                style={{ border: 'none', background: zoomLevel === 'year' ? 'var(--ios-bg-card)' : 'transparent', color: zoomLevel === 'year' ? 'var(--ios-text-primary)' : 'var(--ios-text-secondary)', padding: '5px 12px', borderRadius: '16px', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}
              >
                Years
              </button>
              <button 
                onClick={() => setZoomScale(0.35)} 
                style={{ border: 'none', background: zoomLevel === 'month' ? 'var(--ios-bg-card)' : 'transparent', color: zoomLevel === 'month' ? 'var(--ios-text-primary)' : 'var(--ios-text-secondary)', padding: '5px 12px', borderRadius: '16px', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}
              >
                Months
              </button>
              <button 
                onClick={() => setZoomScale(0.66)} 
                style={{ border: 'none', background: zoomLevel === 'day' ? 'var(--ios-bg-card)' : 'transparent', color: zoomLevel === 'day' ? 'var(--ios-text-primary)' : 'var(--ios-text-secondary)', padding: '5px 12px', borderRadius: '16px', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}
              >
                Days
              </button>
              <button 
                onClick={() => setZoomScale(1.0)} 
                style={{ border: 'none', background: zoomLevel === 'photo' ? 'var(--ios-bg-card)' : 'transparent', color: zoomLevel === 'photo' ? 'var(--ios-text-primary)' : 'var(--ios-text-secondary)', padding: '5px 12px', borderRadius: '16px', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}
              >
                Photos
              </button>

              {/* Continuous Zoom Range Slider */}
              <div style={{ display: 'flex', alignItems: 'center', padding: '0 8px', gap: '6px', borderLeft: '1px solid rgba(255,255,255,0.1)' }}>
                <ZoomOut size={13} color="var(--ios-text-secondary)" />
                <input 
                  type="range" 
                  min="0" 
                  max="1" 
                  step="0.01" 
                  value={zoomScale} 
                  onChange={(e) => setZoomScale(parseFloat(e.target.value))} 
                  style={{ width: '70px', accentColor: 'var(--ios-accent)', cursor: 'pointer' }}
                  title="Pinch trackpad or Ctrl+Scroll to zoom continuously"
                />
                <ZoomIn size={13} color="var(--ios-text-secondary)" />
              </div>
            </div>
          )}

          {/* Select mode state */}
          {isSelectMode && (
            <span style={{ fontSize: '14px', color: 'var(--ios-text-secondary)', fontWeight: 500 }}>
              {selectedIds.length > 0 ? `${selectedIds.length} selected` : 'Tap photos to select'}
            </span>
          )}
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {!isSelectMode && (
            <>
              <div style={{ color: 'var(--ios-text-secondary)', fontWeight: 600, fontSize: '14px', display: window.innerWidth <= 768 ? 'none' : 'block' }}>
                {total} items
              </div>
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                className="ios-btn"
                style={{ padding: '8px 16px', fontSize: '13px', borderRadius: '16px' }}
                onClick={() => {
                  import('../services/api').then(api => {
                    api.triggerScrape(true).catch(console.error)
                  })
                }}
              >
                <RefreshCcw size={15} />
                Sync Now
              </motion.button>

              {/* Media Type Filter */}
              <div style={{
                display: 'flex', background: 'var(--ios-border)', padding: '2px',
                borderRadius: '9px', width: '240px'
              }}>
                <SegmentButton active={!filters.mediaType} onClick={() => setFilters({ mediaType: null })} icon={BoxSelect} label="All" />
                <SegmentButton active={filters.mediaType === 1} onClick={() => setFilters({ mediaType: 1 })} icon={ImageIcon} label="Photos" />
                <SegmentButton active={filters.mediaType === 2} onClick={() => setFilters({ mediaType: 2 })} icon={Video} label="Videos" />
              </div>

              <input
                type="text"
                placeholder="Search memories..."
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                style={{
                  padding: '8px 16px', borderRadius: '16px', border: '1px solid var(--ios-border)',
                  backgroundColor: 'var(--ios-glass)', color: 'var(--ios-text-primary)',
                  fontSize: '13px', outline: 'none', width: '180px', transition: 'all 0.2s'
                }}
                onFocus={e => e.target.style.borderColor = 'var(--ios-accent)'}
                onBlur={e => e.target.style.borderColor = 'var(--ios-border)'}
              />
            </>
          )}

          {/* Select Mode Toggle */}
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            className={isSelectMode ? 'ios-btn' : 'ios-btn ios-btn-secondary'}
            onClick={isSelectMode ? exitSelectMode : enterSelectMode}
            style={{
              padding: '8px 16px',
              fontSize: '13px',
              borderRadius: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: isSelectMode ? 'var(--ios-accent)' : undefined,
              color: isSelectMode ? '#fff' : undefined,
            }}
          >
            {isSelectMode ? (
              <><XIcon size={15} /> Done</>
            ) : (
              <><CheckSquare size={15} /> Select</>
            )}
          </motion.button>
        </div>
      </div>

      {/* ── Continuous Timeline Canvas ──────────────────────── */}
      {stories.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px', gap: '16px', color: 'var(--ios-text-secondary)', textAlign: 'center' }}>
          <ImageIcon size={48} strokeWidth={1} color="var(--ios-border)" />
          <div style={{ fontSize: '20px', fontWeight: 600, color: 'var(--ios-text-primary)' }}>{isReelView ? "No Reels Yet" : "No Stories Yet"}</div>
          <div style={{ fontSize: '16px', maxWidth: '400px' }}>
            {isReelView 
              ? "Reels you share to your story will appear here automatically." 
              : "Your archive is currently empty. Sync your account to start preserving memories."}
          </div>
        </div>
      ) : (
        <div>
          {Object.entries(groupedStories).map(([dateStr, dateStories]) => (
            <div key={dateStr} style={{ position: 'relative', marginBottom: zoomScale < 0.5 ? '24px' : '40px' }}>
              
              {/* Hierarchical Sticky Temporal Header */}
              <div style={{ position: 'sticky', top: '74px', zIndex: 40, pointerEvents: 'none', display: 'flex', padding: '6px 0' }}>
                <div style={{
                  background: 'rgba(28, 28, 30, 0.85)',
                  backdropFilter: 'blur(20px) saturate(180%)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#fff',
                  padding: '5px 14px',
                  borderRadius: '16px',
                  fontSize: '13px',
                  fontWeight: 700,
                  boxShadow: '0 4px 14px rgba(0,0,0,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <Calendar size={13} color="var(--ios-accent)" />
                  {dateStr}
                  <span style={{ fontSize: '11px', opacity: 0.6, fontWeight: 500 }}>({dateStories.length})</span>
                </div>
              </div>
              
              {/* Dynamic Grid with Framer Motion spatial layout transition */}
              <motion.div 
                layout
                style={{
                  display: 'grid',
                  gridTemplateColumns: getGridColumns(),
                  gap: getGridGap(),
                  marginTop: '8px'
                }}
              >
                {dateStories.map((story) => {
                  // If zoomed out to Years / Months, show Cluster Preview
                  if (zoomLevel === 'year') {
                    return (
                      <motion.div
                        layout
                        key={story.id}
                        onClick={() => toggleCard(story.id)}
                        whileHover={{ scale: 1.08 }}
                        whileTap={{ scale: 0.95 }}
                        style={{
                          aspectRatio: '1/1',
                          borderRadius: '6px',
                          overflow: 'hidden',
                          background: '#222',
                          cursor: 'pointer',
                          position: 'relative',
                          outline: selectedIds.includes(story.id) ? '2px solid var(--ios-accent)' : 'none'
                        }}
                      >
                        <ClusterPreview stories={[story]} size={60} />
                      </motion.div>
                    )
                  }

                  return (
                    <StoryCard
                      key={story.id}
                      story={story}
                      hideTitle={zoomLevel !== 'photo'}
                      zoomLevel={zoomLevel}
                      isSelectMode={isSelectMode}
                      isSelected={selectedIds.includes(story.id)}
                      onSelect={toggleCard}
                    />
                  )
                })}
              </motion.div>
            </div>
          ))}

          {/* Load More */}
          {hasNext && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '40px' }}>
              <motion.button 
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                className="ios-btn ios-btn-secondary" 
                onClick={() => loadStories(page + 1)} 
                disabled={loading}
              >
                {loading ? <><RefreshCcw size={16} className="spin-anim" /> Loading...</> : 'Load More Memories'}
              </motion.button>
            </div>
          )}
        </div>
      )}

      {/* ── Bulk Action Bar ──────────────────────────── */}
      <BulkActionBar
        selectedCount={selectedIds.length}
        onArchive={handleArchive}
        onHighlight={handleAddToHighlight}
        onCancel={exitSelectMode}
        loading={bulkLoading}
      />

      {/* ── Highlight Modals ──────────────────── */}
      <AddToHighlightModal
        isOpen={showAddToHighlightModal}
        onClose={() => setShowAddToHighlightModal(false)}
        selectedStoryIds={selectedIds}
        onAdded={handleAddedToExisting}
        onCreateNewRequest={() => {
          setShowAddToHighlightModal(false)
          setShowHighlightCreatorModal(true)
        }}
      />
      
      <HighlightCreatorModal
        isOpen={showHighlightCreatorModal}
        onClose={() => setShowHighlightCreatorModal(false)}
        onCreated={handleHighlightCreated}
        preSelectedStoryIds={selectedIds}
      />
    </motion.div>
  )
}
