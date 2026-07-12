import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { getStories } from '../services/api'
import StoryCard from '../components/StoryCard'

export default function Timeline({ isReelView = false }) {
  const [stories, setStories] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [hasNext, setHasNext] = useState(false)
  const [filters, setFilters] = useState({
    mediaType: null,
    dateFrom: '',
    dateTo: '',
  })

  const observerRef = useRef(null)

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          const header = entry.target.nextElementSibling
          if (!header || !header.classList.contains('sv-timeline__header')) return

          if (!entry.isIntersecting && entry.boundingClientRect.y <= 64) {
            header.classList.add('is-stuck')
          } else {
            header.classList.remove('is-stuck')
          }
        })
      },
      { threshold: 1, rootMargin: '-64px 0px 0px 0px' }
    )
    
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [])

  const observeSentinel = useCallback((node) => {
    if (node && observerRef.current) {
      observerRef.current.observe(node)
    }
  }, [])

  const groupedStories = useMemo(() => {
    return stories.reduce((acc, story) => {
      // Ensure the datetime string is treated as UTC by appending 'Z' if missing
      const dateStrUtc = story.taken_at + (story.taken_at.endsWith('Z') ? '' : 'Z')
      const d = new Date(dateStrUtc)
      const dateStr = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
      if (!acc[dateStr]) acc[dateStr] = []
      acc[dateStr].push(story)
      return acc
    }, {})
  }, [stories])

  const PAGE_SIZE = 24

  const loadStories = useCallback(async (pageNum = 1) => {
    setLoading(true)
    try {
      const data = await getStories({
        page: pageNum,
        pageSize: PAGE_SIZE,
        mediaType: filters.mediaType,
        dateFrom: filters.dateFrom || undefined,
        dateTo: filters.dateTo || undefined,
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
  }, [filters, isReelView])

  useEffect(() => {
    loadStories(1)
  }, [loadStories, isReelView])

  function handleFilterChange(key, value) {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  if (loading && stories.length === 0) {
    return (
      <div className="sv-empty">
        <div className="sv-empty__icon">⏳</div>
        <div className="sv-empty__title">Loading Stories...</div>
      </div>
    )
  }

  return (
    <div className="sv-fade-in">
      {/* ── Filters ─────────────────────────── */}
      <div
        className="sv-card"
        style={{
          marginBottom: 'var(--sv-space-6)',
          padding: 'var(--sv-space-4) var(--sv-space-5)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--sv-space-4)',
            flexWrap: 'wrap',
          }}
        >
          <span style={{ fontSize: 'var(--sv-text-sm)', fontWeight: 600, color: 'var(--sv-text-secondary)' }}>
            Filter:
          </span>

          {/* Media Type Filter */}
          <div style={{ display: 'flex', gap: 'var(--sv-space-2)' }}>
            <button
              className={`sv-btn sv-btn--sm ${!filters.mediaType ? 'sv-btn--primary' : 'sv-btn--ghost'}`}
              onClick={() => handleFilterChange('mediaType', null)}
            >
              All
            </button>
            <button
              className={`sv-btn sv-btn--sm ${filters.mediaType === 1 ? 'sv-btn--primary' : 'sv-btn--ghost'}`}
              onClick={() => handleFilterChange('mediaType', 1)}
            >
              📷 Photos
            </button>
            <button
              className={`sv-btn sv-btn--sm ${filters.mediaType === 2 ? 'sv-btn--primary' : 'sv-btn--ghost'}`}
              onClick={() => handleFilterChange('mediaType', 2)}
            >
              🎬 Videos
            </button>
          </div>

          <div style={{ marginLeft: 'auto' }}>
            {/* Date filters removed as per user request */}
          </div>

          {/* Total count */}
          <span
            className="sv-badge sv-badge--accent"
            style={{ marginLeft: 'var(--sv-space-2)' }}
          >
            {total} stories
          </span>
        </div>
      </div>

      {/* ── Story Grid ──────────────────────── */}
      {stories.length === 0 ? (
        <div className="sv-empty">
          <div className="sv-empty__icon">🏛️</div>
          <div className="sv-empty__title">{isReelView ? "No Reels Yet" : "No Stories Yet"}</div>
          <div className="sv-empty__description">
            {isReelView 
              ? "Reels you share to your story will appear here automatically." 
              : "Connect your Instagram account in Settings and trigger your first sync to start preserving memories."}
          </div>
        </div>
      ) : (
        <>
          <div className="sv-timeline">
            {Object.entries(groupedStories).map(([dateStr, dateStories]) => (
              <div key={dateStr} className="sv-timeline__group">
                <div className="sv-timeline__sentinel" ref={observeSentinel}></div>
                <div className="sv-timeline__header">
                  {dateStr}
                </div>
                <div className="sv-story-grid">
                  {dateStories.map((story) => (
                    <StoryCard key={story.id} story={story} />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Load More */}
          {hasNext && (
            <div style={{ textAlign: 'center', marginTop: 'var(--sv-space-8)' }}>
              <button
                className="sv-btn sv-btn--secondary sv-btn--lg"
                onClick={() => loadStories(page + 1)}
                disabled={loading}
              >
                {loading ? '⏳ Loading...' : 'Load More Stories'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
