import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { Archive, RefreshCcw, RotateCcw, Image as ImageIcon, Video, Menu } from 'lucide-react'
import { getStories, updateStory } from '../services/api'

/**
 * Archives page — shows stories where is_archived = true.
 * Lets the user restore individual stories back to the main timeline.
 */
export default function Archives() {
  const [stories, setStories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [restoringIds, setRestoringIds] = useState(new Set())
  const { onMenuClick } = useOutletContext() || {}
  const navigate = useNavigate()

  const loadArchivedStories = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // Fetch all archived stories (no pagination — archives are typically small)
      const data = await getStories({ isArchived: true, pageSize: 200 })
      setStories(data.stories || [])
    } catch (err) {
      console.error('Failed to load archived stories:', err)
      setError(err.message || 'Failed to load archives')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadArchivedStories()
  }, [loadArchivedStories])

  const handleRestore = useCallback(async (e, storyId) => {
    // Prevent the card click (navigate to story) from firing
    e.stopPropagation()

    setRestoringIds(prev => new Set(prev).add(storyId))
    try {
      await updateStory(storyId, { is_archived: false })
      // Optimistically remove from the list
      setStories(prev => prev.filter(s => s.id !== storyId))
    } catch (err) {
      console.error('Failed to restore story:', err)
    } finally {
      setRestoringIds(prev => {
        const next = new Set(prev)
        next.delete(storyId)
        return next
      })
    }
  }, [])

  // ── Loading state ────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', height: '100%', gap: '16px',
        color: 'var(--ios-text-secondary)'
      }}>
        <RefreshCcw size={32} className="spin-anim" />
        <div style={{ fontSize: '18px', fontWeight: 600 }}>Loading Archives…</div>
      </div>
    )
  }

  // ── Error state ──────────────────────────────────────────────
  if (error) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', height: '100%', gap: '16px',
        color: 'var(--ios-text-secondary)', textAlign: 'center', padding: '40px'
      }}>
        <Archive size={48} strokeWidth={1} color="var(--ios-border)" />
        <div style={{ fontSize: '20px', fontWeight: 600, color: 'var(--ios-text-primary)' }}>Something went wrong</div>
        <div style={{ fontSize: '15px', maxWidth: '360px' }}>{error}</div>
        <button className="ios-btn" onClick={loadArchivedStories} style={{ marginTop: '8px' }}>
          <RefreshCcw size={16} /> Try Again
        </button>
      </div>
    )
  }

  return (
    <div style={{ position: 'relative', height: '100%', paddingBottom: '40px' }}>

      {/* ── Sticky Header ───────────────────────────────────── */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', alignItems: 'center',
        justifyContent: 'space-between', zIndex: 60,
        paddingTop: '20px', paddingBottom: '20px',
        margin: '-40px -40px 0 -40px',
        position: 'sticky', top: '-1px',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Mobile hamburger */}
          <button
            className="ios-btn-secondary"
            onClick={onMenuClick}
            style={{
              display: window.innerWidth <= 768 ? 'flex' : 'none',
              padding: '8px', borderRadius: '8px'
            }}
          >
            <Menu size={20} />
          </button>

          <Archive size={28} color="var(--ios-accent)" strokeWidth={2} />
          <h2 className="ios-title" style={{ margin: 0 }}>Archives</h2>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            color: 'var(--ios-text-secondary)', fontWeight: 600,
            fontSize: '14px'
          }}>
            {stories.length} {stories.length === 1 ? 'item' : 'items'}
          </div>
          <button
            className="ios-btn ios-btn-secondary"
            onClick={loadArchivedStories}
            style={{ padding: '8px 16px', fontSize: '13px', borderRadius: '16px' }}
          >
            <RefreshCcw size={16} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Empty State ─────────────────────────────────────── */}
      {stories.length === 0 ? (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', padding: '80px 40px', gap: '20px',
          color: 'var(--ios-text-secondary)', textAlign: 'center'
        }}>
          <div style={{
            width: '96px', height: '96px', borderRadius: '24px',
            background: 'var(--ios-bg-card)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)'
          }}>
            <Archive size={48} strokeWidth={1.2} color="var(--ios-border)" />
          </div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--ios-text-primary)' }}>
            Nothing archived yet
          </div>
          <div style={{ fontSize: '16px', maxWidth: '380px', lineHeight: 1.6 }}>
            Stories you archive will appear here. You can restore them to your timeline at any time.
          </div>
        </div>
      ) : (

        /* ── Story Grid ─────────────────────────────────────── */
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: '12px',
          marginTop: '32px'
        }}>
          {stories.map(story => (
            <ArchiveCard
              key={story.id}
              story={story}
              isRestoring={restoringIds.has(story.id)}
              onRestore={handleRestore}
              onNavigate={() => navigate(`/story/${story.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── ArchiveCard ──────────────────────────────────────────────────
function ArchiveCard({ story, isRestoring, onRestore, onNavigate }) {
  const isVideo = story.media_type === 2
  const dateStrUtc = story.taken_at + (story.taken_at.endsWith('Z') ? '' : 'Z')
  const date = new Date(dateStrUtc)
  const dateStr = date.toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  })

  return (
    <div
      className="ios-card"
      role="button"
      tabIndex={0}
      onClick={onNavigate}
      onKeyDown={(e) => e.key === 'Enter' && onNavigate()}
      style={{
        position: 'relative', overflow: 'hidden',
        cursor: 'pointer', borderRadius: 'var(--ios-radius-lg)',
        transition: 'transform var(--ios-spring-fast), box-shadow var(--ios-spring-fast)',
        padding: 0,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-4px) scale(1.01)'
        e.currentTarget.style.boxShadow = '0 16px 40px rgba(0,0,0,0.25)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = ''
        e.currentTarget.style.boxShadow = ''
      }}
    >
      {/* Thumbnail */}
      <div style={{ width: '100%', aspectRatio: '9/16', position: 'relative', background: 'var(--ios-bg-card)' }}>
        {story.media_url ? (
          isVideo ? (
            <video
              src={story.media_url}
              muted
              loop
              preload="metadata"
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              onMouseEnter={e => e.target.play()}
              onMouseLeave={e => { e.target.pause(); e.target.currentTime = 0 }}
            />
          ) : (
            <img
              src={story.media_url}
              alt={`Archived story from ${dateStr}`}
              loading="lazy"
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          )
        ) : (
          <div style={{
            width: '100%', height: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: 0.2
          }}>
            {isVideo ? <Video size={48} /> : <ImageIcon size={48} />}
          </div>
        )}

        {/* Archived badge */}
        <div className="ios-glass" style={{
          position: 'absolute', top: '10px', left: '10px',
          padding: '4px 8px', borderRadius: '8px',
          display: 'flex', alignItems: 'center', gap: '4px',
          fontSize: '11px', fontWeight: 700,
          color: 'var(--ios-text-primary)'
        }}>
          <Archive size={11} />
          Archived
        </div>
      </div>

      {/* Footer */}
      <div style={{ padding: '10px 12px 12px' }}>
        <div style={{
          fontSize: '12px', fontWeight: 500,
          color: 'var(--ios-text-secondary)', marginBottom: '8px'
        }}>
          {dateStr}
        </div>
        <button
          className="ios-btn"
          disabled={isRestoring}
          onClick={(e) => onRestore(e, story.id)}
          style={{
            width: '100%', padding: '8px', fontSize: '13px',
            borderRadius: '10px', justifyContent: 'center',
            gap: '6px', opacity: isRestoring ? 0.6 : 1,
            display: 'flex', alignItems: 'center'
          }}
        >
          {isRestoring
            ? <><RefreshCcw size={14} className="spin-anim" /> Restoring…</>
            : <><RotateCcw size={14} /> Restore</>
          }
        </button>
      </div>
    </div>
  )
}
