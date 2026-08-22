import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { getStories, bulkUpdateStories, triggerScrape } from '../services/api'
import { getSettings, saveSettings } from '../services/settings'
import StoryCard from '../components/StoryCard'
import BulkActionBar from '../components/BulkActionBar'
import HighlightCreatorModal from '../components/HighlightCreatorModal'
import AddToHighlightModal from '../components/AddToHighlightModal'
import FastScrollbar from '../components/FastScrollbar'
import { useOutletContext } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Filter, Image as ImageIcon, Video, VideoOff, BoxSelect, RefreshCcw, RefreshCw,
  ZoomIn, ZoomOut, Menu, CheckSquare, X as XIcon, Calendar, Layers,
  Star, Users, Globe, Search, CheckCircle2
} from 'lucide-react'

// Helper for Year/Month cluster preview
function ClusterMediaItem({ story, autoplay = true }) {
  if (!story) return null
  const url = story.thumbnail_url || story.media_url || (story.s3_key_compressed ? `/api/v1/media/${story.s3_key_compressed}` : null)
  if (!url) return null
  const isVideo = story.media_type === 2 || Boolean(story.music) || story.is_reel || (typeof url === 'string' && (url.includes('.mp4') || url.includes('.mov') || url.includes('video')))
  if (isVideo) {
    return (
      <video 
        src={url} 
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} 
        autoPlay={autoplay}
        muted 
        loop
        playsInline 
        preload="metadata"
        onMouseEnter={!autoplay ? (e) => e.target.play().catch(() => {}) : undefined}
        onMouseLeave={!autoplay ? (e) => { e.target.pause(); e.target.currentTime = 0; } : undefined}
      />
    )
  }
  return (
    <img 
      src={url} 
      alt="" 
      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} 
      loading="lazy"
    />
  )
}

function ClusterPreview({ stories, size, autoplay = true }) {
  const previews = stories.slice(0, 4)
  if (previews.length === 0) return null

  if (previews.length === 1 || size < 80) {
    return <ClusterMediaItem story={previews[0]} autoplay={autoplay} />
  }

  return (
    <div style={{ width: '100%', height: '100%', display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: '1px', background: 'var(--ios-border)' }}>
      {previews.map((s, idx) => (
        <div key={s.id || idx} style={{ overflow: 'hidden', position: 'relative' }}>
          <ClusterMediaItem story={s} autoplay={autoplay} />
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
  const [filters, setFilters] = useState({ mediaType: null, isCloseFriends: null })
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const { onMenuClick } = useOutletContext() || {}
  
  // Clean zoom levels: 'year' | 'month' | 'day'
  const [zoomLevel, setZoomLevel] = useState('day')

  // ── Playback Settings ──────────────────────────────────
  const [autoplayVideo, setAutoplayVideo] = useState(() => getSettings().timelineAutoplayVideo !== false)

  useEffect(() => {
    const handleSettingsUpdate = () => {
      setAutoplayVideo(getSettings().timelineAutoplayVideo !== false)
    }
    window.addEventListener('storage', handleSettingsUpdate)
    window.addEventListener('memwault-settings-changed', handleSettingsUpdate)
    return () => {
      window.removeEventListener('storage', handleSettingsUpdate)
      window.removeEventListener('memwault-settings-changed', handleSettingsUpdate)
    }
  }, [])

  const toggleAutoplay = () => {
    const nextVal = !autoplayVideo
    setAutoplayVideo(nextVal)
    const current = getSettings()
    saveSettings({ ...current, timelineAutoplayVideo: nextVal })
  }

  // ── Multi-select state ──────────────────────────────────
  const [selectedIds, setSelectedIds] = useState([])
  const [isSelectMode, setIsSelectMode] = useState(false)
  const [bulkLoading, setBulkLoading] = useState(false)
  
  const [showAddToHighlightModal, setShowAddToHighlightModal] = useState(false)
  const [showHighlightCreatorModal, setShowHighlightCreatorModal] = useState(false)

  const [syncing, setSyncing] = useState(false)
  const [toast, setToast] = useState(null)

  const PAGE_SIZE = zoomLevel === 'year' ? 120 : zoomLevel === 'month' ? 60 : 30

  const loadStories = useCallback(async (pageNum = 1) => {
    if (pageNum === 1) setLoading(true)
    try {
      const queryParams = {
        page: pageNum,
        pageSize: PAGE_SIZE,
        mediaType: filters.mediaType,
        isCloseFriends: filters.isCloseFriends !== null ? filters.isCloseFriends : undefined,
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

  const handleSync = async () => {
    if (syncing) return
    setSyncing(true)
    try {
      await triggerScrape(true)
      await loadStories(1)
      setToast('Archive synced successfully!')
      setTimeout(() => setToast(null), 3000)
    } catch (err) {
      setToast(`Sync error: ${err.message}`)
      setTimeout(() => setToast(null), 4000)
    } finally {
      setSyncing(false)
    }
  }

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

  // Clean Segment Filter Button
  const SegmentButton = ({ active, onClick, icon: Icon, label }) => (
    <button
      className={`segment-btn ${active ? 'active' : ''}`}
      onClick={onClick}
      style={{
        padding: '6px 12px',
        border: 'none',
        borderRadius: 'var(--ios-radius-sm, 8px)',
        backgroundColor: active ? 'var(--ios-accent)' : 'transparent',
        color: active ? '#ffffff' : 'var(--ios-text-secondary)',
        fontWeight: active ? 700 : 500,
        fontSize: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '5px',
        cursor: 'pointer',
      }}
    >
      <Icon size={14} strokeWidth={active ? 3 : 2} />
      {label}
    </button>
  )

  return (
    <motion.div 
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.25 }}
      style={{
        position: 'relative',
        minHeight: '100%',
        padding: '16px 20px 60px 20px',
        boxSizing: 'border-box',
        width: '100%',
        maxWidth: '100%',
        overflowX: 'hidden',
      }}
    >
      <FastScrollbar items={stories} getDate={(s) => new Date(s.taken_at)} scrollContainerSelector=".ios-main-content" />

      {/* ── Top Header Row: Title, Granularity & Primary Actions ──────── */}
      <div style={{ 
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
        marginBottom: '14px', zIndex: 60, 
        paddingTop: '16px', gap: '16px',
      }}>
        {/* Left Section: Title & Item Count */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            className="ios-btn-secondary"
            onClick={onMenuClick}
            style={{ display: window.innerWidth <= 768 ? 'flex' : 'none', padding: '8px', borderRadius: '8px' }}
          >
            <Menu size={20} />
          </button>
          <h2 className="ios-title" style={{ margin: 0 }}>{isReelView ? "Reels" : "Memories"}</h2>
          <span style={{
            fontSize: '12px',
            color: 'var(--ios-text-secondary)',
            background: 'var(--ios-border)',
            padding: '3px 10px',
            borderRadius: '12px',
            fontWeight: 600
          }}>
            {total} items
          </span>

          {isSelectMode && (
            <span style={{ fontSize: '13px', color: 'var(--ios-accent)', fontWeight: 600 }}>
              {selectedIds.length > 0 ? `${selectedIds.length} selected` : 'Select items'}
            </span>
          )}
        </div>

        {/* Right Section: Time Granularity & Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Zoom Selector (Years / Months / Days) */}
          {!isSelectMode && (
            <div className="segmented-container segment-group" style={{
              display: 'flex',
              background: 'var(--ios-bg-card)',
              border: '1px solid var(--ios-border)',
              borderRadius: '12px',
              padding: '3px',
              gap: '3px'
            }}>
              {[['year', 'Years'], ['month', 'Months'], ['day', 'Days']].map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setZoomLevel(val)}
                  className={`segment-btn ${zoomLevel === val ? 'active' : ''}`}
                  style={{
                    border: 'none',
                    borderRadius: '8px',
                    backgroundColor: zoomLevel === val ? 'var(--ios-accent)' : 'transparent',
                    color: zoomLevel === val ? '#ffffff' : 'var(--ios-text-secondary)',
                    padding: '5px 12px',
                    fontWeight: zoomLevel === val ? 700 : 500,
                    fontSize: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {/* Video Autoplay / Motion Toggle */}
          {!isSelectMode && (
            <button
              onClick={toggleAutoplay}
              className={`segment-btn ${autoplayVideo ? 'active' : ''}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 12px',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                background: autoplayVideo ? 'var(--ios-accent)' : 'var(--ios-bg-card)',
                color: autoplayVideo ? '#ffffff' : 'var(--ios-text-secondary)',
                border: autoplayVideo ? 'none' : '1px solid var(--ios-border)',
                transition: 'all 0.15s ease'
              }}
              title={autoplayVideo ? "Click to stop playing video thumbnails (speeds up page & saves GPU)" : "Click to auto-play video thumbnails in feed"}
            >
              {autoplayVideo ? <Video size={14} /> : <VideoOff size={14} />}
              <span>{autoplayVideo ? 'Motion: ON' : 'Motion: OFF'}</span>
            </button>
          )}

          {/* Sync Button */}
          {!isSelectMode && (
            <button
              onClick={handleSync}
              disabled={syncing}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: 'var(--ios-accent)',
                color: '#ffffff',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '12px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: syncing ? 'default' : 'pointer',
                opacity: syncing ? 0.7 : 1,
                transition: 'opacity 0.2s',
              }}
            >
              <RefreshCw size={15} className={syncing ? 'spin-anim' : ''} />
              <span>{syncing ? 'Syncing...' : (isReelView ? 'Sync Reels' : 'Sync Memories')}</span>
            </button>
          )}

          {/* Select Mode Toggle */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className={isSelectMode ? 'ios-btn' : 'ios-btn ios-btn-secondary'}
            onClick={isSelectMode ? exitSelectMode : enterSelectMode}
            style={{
              padding: '8px 16px',
              fontSize: '13px',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: 600,
              background: isSelectMode ? 'var(--ios-accent)' : 'var(--ios-bg-card)',
              color: isSelectMode ? '#fff' : 'var(--ios-text-primary)',
              border: isSelectMode ? 'none' : '1px solid var(--ios-border)',
            }}
          >
            {isSelectMode ? (
              <><XIcon size={14} /> Done</>
            ) : (
              <><CheckSquare size={14} /> Select</>
            )}
          </motion.button>
        </div>
      </div>

      {/* ── Second Row: Filter Bar & Search Input ─── */}
      {!isSelectMode && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '20px',
          gap: '12px',
          paddingBottom: '14px',
          borderBottom: '1px solid var(--ios-border)',
          flexWrap: 'wrap',
        }}>
          {/* Left: Audience & Media Segmented Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {/* Audience Filter (All / CF / Public) */}
            <div style={{
              display: 'flex',
              background: 'var(--ios-bg-card)',
              border: '1px solid var(--ios-border)',
              padding: '3px',
              borderRadius: '12px',
              gap: '3px'
            }}>
              <SegmentButton 
                active={filters.isCloseFriends === null} 
                onClick={() => setFilters(f => ({ ...f, isCloseFriends: null }))} 
                icon={Globe} 
                label="All" 
              />
              <SegmentButton 
                active={filters.isCloseFriends === true} 
                onClick={() => setFilters(f => ({ ...f, isCloseFriends: true }))} 
                icon={Star} 
                label="Close Friends" 
              />
              <SegmentButton 
                active={filters.isCloseFriends === false} 
                onClick={() => setFilters(f => ({ ...f, isCloseFriends: false }))} 
                icon={Users} 
                label="Public" 
              />
            </div>

            {/* Media Filter */}
            <div style={{
              display: 'flex',
              background: 'var(--ios-bg-card)',
              border: '1px solid var(--ios-border)',
              padding: '3px',
              borderRadius: '12px',
              gap: '3px'
            }}>
              <SegmentButton active={!filters.mediaType} onClick={() => setFilters(f => ({ ...f, mediaType: null }))} icon={BoxSelect} label="All" />
              <SegmentButton active={filters.mediaType === 1} onClick={() => setFilters(f => ({ ...f, mediaType: 1 }))} icon={ImageIcon} label="Photos" />
              <SegmentButton active={filters.mediaType === 2} onClick={() => setFilters(f => ({ ...f, mediaType: 2 }))} icon={Video} label="Videos" />
            </div>
          </div>

          {/* Right: Search Input */}
          <div className="search-input-wrapper" style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            minWidth: '200px',
            maxWidth: '280px',
            flex: '1 1 auto',
          }}>
            <Search size={14} style={{
              position: 'absolute',
              left: '9px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--ios-text-secondary, #8e8e93)',
              pointerEvents: 'none',
              zIndex: 5
            }} />
            <input
              type="text"
              placeholder="Search memories..."
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              style={{
                width: '100%',
                padding: '7px 12px 7px 30px',
                borderRadius: '14px',
                border: '1px solid var(--ios-border)',
                backgroundColor: 'var(--ios-bg-card)',
                color: 'var(--ios-text-primary)',
                fontSize: '13px',
                outline: 'none',
                transition: 'all 0.2s ease',
              }}
              onFocus={e => {
                e.target.style.borderColor = 'var(--ios-accent)'
              }}
              onBlur={e => {
                e.target.style.borderColor = 'var(--ios-border)'
              }}
            />
            {searchInput && (
              <button
                onClick={() => setSearchInput('')}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--ios-text-secondary)',
                  cursor: 'pointer',
                  padding: '2px',
                  display: 'flex',
                  alignItems: 'center',
                  zIndex: 5
                }}
              >
                <XIcon size={13} />
              </button>
            )}
          </div>
        </div>
      )}

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
                  background: 'var(--ios-bg-card)',
                  backdropFilter: 'blur(20px) saturate(180%)',
                  border: '1px solid var(--ios-border)',
                  color: 'var(--ios-text-primary)',
                  padding: '5px 14px',
                  borderRadius: '16px',
                  fontSize: '13px',
                  fontWeight: 700,
                  boxShadow: 'var(--ios-shadow-sm)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <Calendar size={13} color="var(--ios-accent)" />
                  {dateStr}
                  <span style={{ fontSize: '11px', color: 'var(--ios-text-secondary)', fontWeight: 500 }}>({dateStories.length})</span>
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
                        <ClusterPreview stories={[story]} size={60} autoplay={autoplayVideo} />
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
                      autoplayVideo={autoplayVideo}
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

      {/* ── Floating Notification Toast ─────────────── */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="ios-glass" 
            style={{
              position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999,
              padding: '12px 20px', borderRadius: 'var(--ios-radius-md)',
              boxShadow: 'var(--ios-shadow-lg)', color: 'var(--ios-text-primary)',
              fontWeight: 600, display: 'flex', alignItems: 'center', gap: '10px',
              border: '1px solid var(--ios-border)'
            }}
          >
            <CheckCircle2 size={16} color="var(--ios-success, #34c759)" />
            <span>{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
