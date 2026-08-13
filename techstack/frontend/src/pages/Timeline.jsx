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
  
  // Clean zoom levels: 'year' | 'month' | 'day'
  const [zoomLevel, setZoomLevel] = useState('day')

  // ── Multi-select state ──────────────────────────────────
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

  const getGridColumns = () => {
    if (zoomLevel === 'year') return 'repeat(auto-fill, minmax(100px, 1fr))'
    if (zoomLevel === 'month') return 'repeat(auto-fill, minmax(140px, 1fr))'
    return 'repeat(auto-fill, minmax(200px, 1fr))'
  }

  const getGridGap = () => {
    if (zoomLevel === 'year') return '6px'
    if (zoomLevel === 'month') return '10px'
    return '16px'
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

  // Segment Filter Button — animated sliding pill
  const SegmentButton = ({ active, onClick, icon: Icon, label, layoutId }) => (
    <button
      onClick={onClick}
      style={{
        flex: 1, padding: '7px 10px', border: 'none', background: 'transparent',
        borderRadius: '7px', color: active ? 'var(--ios-text-primary)' : 'var(--ios-text-secondary)',
        fontWeight: active ? 700 : 500, fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: '6px', cursor: 'pointer', position: 'relative', zIndex: 1, transition: 'color 0.2s ease',
      }}
    >
      {active && (
        <motion.span
          layoutId={layoutId || 'media-filter-pill'}
          style={{
            position: 'absolute', inset: 0, borderRadius: '7px',
            background: 'var(--ios-bg-card)', boxShadow: '0 2px 6px rgba(0,0,0,0.14)', zIndex: -1,
          }}
          transition={{ type: 'spring', stiffness: 380, damping: 34 }}
        />
      )}
      <Icon size={15} /> {label}
    </button>
  )

  return (
    <motion.div 
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.25 }}
      style={{ position: 'relative', height: '100%', paddingBottom: '40px' }}
    >
      <FastScrollbar items={stories} getDate={(s) => new Date(s.taken_at)} scrollContainerSelector=".ios-main-content" />

      {/* ── Fixed Clean Top Header Bar ─────────────────────────── */}
      <div style={{ 
        display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', 
        marginBottom: '24px', gap: '16px', zIndex: 60, 
        paddingTop: '16px', paddingBottom: '16px',
        borderBottom: '1px solid var(--ios-border)'
      }}>
        {/* Left Section: Title & Clean Zoom Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <button
            className="ios-btn-secondary"
            onClick={onMenuClick}
            style={{ display: window.innerWidth <= 768 ? 'flex' : 'none', padding: '8px', borderRadius: '8px' }}
          >
            <Menu size={20} />
          </button>
          <h2 className="ios-title" style={{ margin: 0 }}>{isReelView ? "Reels" : "Memories"}</h2>
          <span style={{ fontSize: '14px', color: 'var(--ios-text-secondary)', fontWeight: 600 }}>
            {total} items
          </span>

          {/* Clean animated 3-Pill Zoom Selector */}
          {!isSelectMode && (
            <div style={{ display: 'flex', background: 'var(--ios-border)', borderRadius: '20px', padding: '2px', gap: '2px' }}>
              {[['year','Years'],['month','Months'],['day','Days']].map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setZoomLevel(val)}
                  style={{
                    border: 'none', background: 'transparent',
                    color: zoomLevel === val ? 'var(--ios-text-primary)' : 'var(--ios-text-secondary)',
                    padding: '5px 14px', borderRadius: '16px',
                    fontWeight: zoomLevel === val ? 700 : 500,
                    fontSize: '13px', cursor: 'pointer',
                    position: 'relative', zIndex: 1, transition: 'color 0.2s ease',
                  }}
                >
                  {zoomLevel === val && (
                    <motion.span
                      layoutId="zoom-pill"
                      style={{
                        position: 'absolute', inset: 0, borderRadius: '16px',
                        background: 'var(--ios-bg-card)', boxShadow: '0 2px 8px rgba(0,0,0,0.18)', zIndex: -1,
                      }}
                      transition={{ type: 'spring', stiffness: 400, damping: 36 }}
                    />
                  )}
                  {label}
                </button>
              ))}
            </div>
          )}

          {isSelectMode && (
            <span style={{ fontSize: '14px', color: 'var(--ios-accent)', fontWeight: 600 }}>
              {selectedIds.length > 0 ? `${selectedIds.length} selected` : 'Select items'}
            </span>
          )}
        </div>
        
        {/* Right Section: Filters & Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {!isSelectMode && (
            <>
              {/* Media Filter */}
              <div style={{
                display: 'flex', background: 'var(--ios-border)', padding: '2px',
                borderRadius: '9px', width: '220px'
              }}>
                <SegmentButton active={!filters.mediaType} onClick={() => setFilters({ mediaType: null })} icon={BoxSelect} label="All" />
                <SegmentButton active={filters.mediaType === 1} onClick={() => setFilters({ mediaType: 1 })} icon={ImageIcon} label="Photos" />
                <SegmentButton active={filters.mediaType === 2} onClick={() => setFilters({ mediaType: 2 })} icon={Video} label="Videos" />
              </div>

              <input
                type="text"
                placeholder="Search..."
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                style={{
                  padding: '8px 16px', borderRadius: '16px', border: '1px solid var(--ios-border)',
                  backgroundColor: 'var(--ios-glass)', color: 'var(--ios-text-primary)',
                  fontSize: '13px', outline: 'none', width: '160px', transition: 'all 0.2s'
                }}
                onFocus={e => e.target.style.borderColor = 'var(--ios-accent)'}
                onBlur={e => e.target.style.borderColor = 'var(--ios-border)'}
              />

              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                className="ios-btn-secondary ios-btn"
                style={{ padding: '8px 14px', fontSize: '13px', borderRadius: '16px' }}
                onClick={() => {
                  import('../services/api').then(api => {
                    api.triggerScrape(true).catch(console.error)
                  })
                }}
              >
                <RefreshCcw size={14} />
                Sync
              </motion.button>
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
            <div key={dateStr} style={{ position: 'relative', marginBottom: zoomLevel === 'year' ? '20px' : '40px' }}>
              
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
                      hideTitle={zoomLevel !== 'day'}
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
