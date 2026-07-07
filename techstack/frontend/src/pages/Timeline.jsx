import { useState, useEffect, useCallback, useMemo } from 'react'
import { getStories } from '../services/api'
import StoryCard from '../components/StoryCard'
import FastScrollbar from '../components/FastScrollbar'
import { Filter, Image as ImageIcon, Video, BoxSelect, RefreshCcw, ZoomIn, ZoomOut } from 'lucide-react'

export default function Timeline({ isReelView = false }) {
  const [stories, setStories] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [hasNext, setHasNext] = useState(false)
  const [filters, setFilters] = useState({ mediaType: null })
  
  // zoomLevel: 'day' | 'month' | 'year'
  const [zoomLevel, setZoomLevel] = useState('day')

  const PAGE_SIZE = zoomLevel === 'year' ? 100 : zoomLevel === 'month' ? 48 : 24

  const loadStories = useCallback(async (pageNum = 1) => {
    if (pageNum === 1) setLoading(true)
    try {
      const data = await getStories({
        page: pageNum,
        pageSize: PAGE_SIZE,
        mediaType: filters.mediaType,
        isReel: isReelView,
      })
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
  }, [filters, isReelView, PAGE_SIZE])

  useEffect(() => {
    loadStories(1)
  }, [loadStories, isReelView])

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

  if (loading && stories.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '16px', color: 'var(--ios-text-secondary)' }}>
        <RefreshCcw size={32} className="spin-anim" />
        <div style={{ fontSize: '18px', fontWeight: 600 }}>Loading Memories...</div>
      </div>
    )
  }

  // iOS Segmented Control
  const SegmentButton = ({ active, onClick, icon: Icon, label }) => (
    <button
      onClick={onClick}
      style={{
        flex: 1, padding: '8px', border: 'none', background: active ? 'var(--ios-bg-card)' : 'transparent',
        borderRadius: '7px', color: active ? 'var(--ios-text-primary)' : 'var(--ios-text-secondary)',
        fontWeight: active ? 600 : 500, fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: '6px', cursor: 'pointer', transition: 'all var(--ios-spring-fast)',
        boxShadow: active ? '0 3px 8px rgba(0,0,0,0.12), 0 3px 1px rgba(0,0,0,0.04)' : 'none'
      }}
    >
      <Icon size={16} /> {label}
    </button>
  )

  const getGridColumns = () => {
    if (zoomLevel === 'year') return 'repeat(auto-fill, minmax(60px, 1fr))'
    if (zoomLevel === 'month') return 'repeat(auto-fill, minmax(120px, 1fr))'
    return 'repeat(auto-fill, minmax(200px, 1fr))' // day
  }
  
  const getGridGap = () => {
    if (zoomLevel === 'year') return '2px'
    if (zoomLevel === 'month') return '4px'
    return '12px' // day
  }

  const zoomOut = () => {
    if (zoomLevel === 'day') setZoomLevel('month')
    else if (zoomLevel === 'month') setZoomLevel('year')
  }

  const zoomIn = () => {
    if (zoomLevel === 'year') setZoomLevel('month')
    else if (zoomLevel === 'month') setZoomLevel('day')
  }

  return (
    <div style={{ position: 'relative', height: '100%', paddingBottom: '40px' }}>
      <FastScrollbar items={stories} getDate={(s) => new Date(s.taken_at)} scrollContainerSelector=".ios-main-content" />
      {/* ── Header & Filters ─────────────────────────── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', gap: '16px', position: 'sticky', top: 0, zIndex: 50, background: 'var(--ios-bg-app)', paddingTop: '16px', paddingBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <h2 className="ios-title" style={{ margin: 0 }}>{isReelView ? "Reels" : "Timeline"}</h2>
          <div style={{ display: 'flex', background: 'var(--ios-border)', borderRadius: '20px', overflow: 'hidden', padding: '2px' }}>
            <button onClick={zoomOut} disabled={zoomLevel === 'year'} style={{ border: 'none', background: 'transparent', padding: '6px 12px', cursor: zoomLevel === 'year' ? 'default' : 'pointer', opacity: zoomLevel === 'year' ? 0.3 : 1, color: 'var(--ios-text-primary)' }}><ZoomOut size={16}/></button>
            <div style={{ padding: '6px 12px', fontSize: '13px', fontWeight: 600, color: 'var(--ios-text-primary)', borderLeft: '1px solid var(--ios-border)', borderRight: '1px solid var(--ios-border)' }}>
              {zoomLevel.charAt(0).toUpperCase() + zoomLevel.slice(1)}s
            </div>
            <button onClick={zoomIn} disabled={zoomLevel === 'day'} style={{ border: 'none', background: 'transparent', padding: '6px 12px', cursor: zoomLevel === 'day' ? 'default' : 'pointer', opacity: zoomLevel === 'day' ? 0.3 : 1, color: 'var(--ios-text-primary)' }}><ZoomIn size={16}/></button>
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ color: 'var(--ios-text-secondary)', fontWeight: 600, fontSize: '14px' }}>
            {total} items
          </div>
          <div style={{
            display: 'flex', background: 'var(--ios-border)', padding: '2px',
            borderRadius: '9px', width: '280px'
          }}>
            <SegmentButton active={!filters.mediaType} onClick={() => setFilters({ mediaType: null })} icon={BoxSelect} label="All" />
            <SegmentButton active={filters.mediaType === 1} onClick={() => setFilters({ mediaType: 1 })} icon={ImageIcon} label="Photos" />
            <SegmentButton active={filters.mediaType === 2} onClick={() => setFilters({ mediaType: 2 })} icon={Video} label="Videos" />
          </div>
        </div>
      </div>

      {/* ── Story Grid ──────────────────────── */}
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
            <div key={dateStr} style={{ position: 'relative', marginBottom: zoomLevel === 'day' ? '40px' : '20px' }}>
              
              {/* Apple Photos floating bubble date */}
              <div style={{ position: 'sticky', top: '70px', zIndex: 40, pointerEvents: 'none', display: 'flex', padding: '8px 0' }}>
                <div style={{
                  background: 'var(--ios-glass)',
                  backdropFilter: 'blur(25px) saturate(180%)',
                  border: '1px solid var(--ios-border)',
                  color: 'var(--ios-text-primary)',
                  padding: '6px 16px',
                  borderRadius: '20px',
                  fontSize: '14px',
                  fontWeight: 600,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                }}>
                  {dateStr}
                </div>
              </div>
              
              <div style={{
                display: 'grid',
                gridTemplateColumns: getGridColumns(),
                gap: getGridGap(),
                marginTop: '8px'
              }}>
                {dateStories.map((story) => (
                  <StoryCard key={story.id} story={story} hideTitle={zoomLevel !== 'day'} zoomLevel={zoomLevel} />
                ))}
              </div>
            </div>
          ))}

          {/* Load More */}
          {hasNext && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '40px' }}>
              <button className="ios-btn ios-btn-secondary" onClick={() => loadStories(page + 1)} disabled={loading}>
                {loading ? <><RefreshCcw size={16} className="spin-anim" /> Loading...</> : 'Load More Memories'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
