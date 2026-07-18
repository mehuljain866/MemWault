import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, Image as ImageIcon, Play, RefreshCcw, Layers } from 'lucide-react'
import { getHighlightStories } from '../services/api'

// ── Skeleton tile ────────────────────────────────────────────
function SkeletonTile() {
  return (
    <div
      style={{
        aspectRatio: '9/16',
        borderRadius: '12px',
        background: 'var(--ios-border)',
        animation: 'pulse 1.5s ease-in-out infinite',
      }}
    />
  )
}

export default function HighlightViewer() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [stories, setStories] = useState([])
  const [highlightTitle, setHighlightTitle] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStories()
  }, [id])

  async function loadStories() {
    setLoading(true)
    try {
      const data = await getHighlightStories(id)
      // data may be an array of stories, or an object {highlight, stories}
      if (Array.isArray(data)) {
        setStories(data)
        setHighlightTitle('')
      } else if (data && data.stories) {
        setStories(data.stories)
        setHighlightTitle(data.highlight?.title || '')
      } else {
        setStories([])
      }
    } catch (err) {
      console.error(err)
      setStories([])
    } finally {
      setLoading(false)
    }
  }

  // ── Loading state ──────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ padding: '0 20px 60px', display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Header skeleton */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          padding: '20px 0 24px',
        }}>
          <button
            onClick={() => navigate('/highlights')}
            style={{
              background: 'transparent', border: 'none',
              color: 'var(--ios-accent)', display: 'flex',
              alignItems: 'center', gap: '4px', fontSize: '16px',
              cursor: 'pointer', padding: 0,
            }}
          >
            <ChevronLeft size={22} /> Back
          </button>
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
          gap: '10px',
        }}>
          {Array.from({ length: 9 }).map((_, i) => <SkeletonTile key={i} />)}
        </div>
      </div>
    )
  }

  // ── Empty state ────────────────────────────────────────────
  if (stories.length === 0) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', height: '100%',
        alignItems: 'center', justifyContent: 'center', gap: '16px',
        color: 'var(--ios-text-secondary)',
      }}>
        <div style={{
          width: '80px', height: '80px', borderRadius: '24px',
          background: 'var(--ios-border)', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Layers size={36} color="var(--ios-text-secondary)" />
        </div>
        <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--ios-text-primary)' }}>
          No stories found
        </div>
        <div style={{ fontSize: '14px', maxWidth: '280px', textAlign: 'center', lineHeight: 1.6 }}>
          This highlight has no stories attached to it.
        </div>
        <button
          className="ios-btn-secondary"
          style={{ padding: '10px 24px', borderRadius: '20px', fontSize: '14px', marginTop: '8px' }}
          onClick={() => navigate('/highlights')}
        >
          Back to Albums
        </button>
      </div>
    )
  }

  // ── Story grid ─────────────────────────────────────────────
  return (
    <div style={{ padding: '0 20px 60px', display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '16px',
        position: 'sticky', top: 0, zIndex: 40,
        margin: '0 -20px',
        padding: '16px 20px',
      }}>
        <button
          onClick={() => navigate('/highlights')}
          style={{
            background: 'transparent', border: 'none',
            color: 'var(--ios-accent)', display: 'flex',
            alignItems: 'center', gap: '4px', fontSize: '16px',
            cursor: 'pointer', padding: 0, flexShrink: 0,
          }}
        >
          <ChevronLeft size={22} /> Back
        </button>

        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{
            margin: 0, fontSize: '22px', fontWeight: 700,
            color: 'var(--ios-text-primary)',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {highlightTitle || 'Highlight'}
          </h1>
          <div style={{ fontSize: '13px', color: 'var(--ios-text-secondary)', marginTop: '2px' }}>
            {stories.length} {stories.length === 1 ? 'story' : 'stories'}
          </div>
        </div>
      </div>

      {/* Masonry-style story grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
        gap: '10px',
        marginTop: '20px',
        alignContent: 'start',
      }}>
        {stories.map((story, idx) => {
          const isVideo = story.media_type === 2
          // Use media_url directly, same pattern as StoryCard.jsx
          const thumbSrc = story.media_url

          return (
            <div
              key={story.id}
              onClick={() => navigate(`/story/${story.id}`)}
              style={{
                aspectRatio: '9/16',
                borderRadius: '12px',
                overflow: 'hidden',
                cursor: 'pointer',
                position: 'relative',
                background: 'var(--ios-border)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                transition: 'transform 0.18s, box-shadow 0.18s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'scale(1.03)'
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.2)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'scale(1)'
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)'
              }}
            >
              {/* Thumbnail */}
              {thumbSrc ? (
                isVideo ? (
                  <video
                    src={thumbSrc}
                    muted
                    preload="metadata"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <img
                    src={thumbSrc}
                    alt={`Story ${idx + 1}`}
                    loading="lazy"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={e => { e.target.style.display = 'none' }}
                  />
                )
              ) : (
                <div style={{
                  width: '100%', height: '100%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  opacity: 0.3,
                }}>
                  <ImageIcon size={32} />
                </div>
              )}

              {/* Gradient overlay */}
              <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(to top, rgba(0,0,0,0.45) 0%, transparent 50%)',
                pointerEvents: 'none',
              }} />

              {/* Video play badge */}
              {isVideo && (
                <div style={{
                  position: 'absolute', top: '8px', right: '8px',
                  background: 'rgba(0,0,0,0.5)',
                  backdropFilter: 'blur(6px)',
                  borderRadius: '8px',
                  padding: '3px 6px',
                  display: 'flex', alignItems: 'center', gap: '3px',
                  color: '#fff', fontSize: '10px', fontWeight: 700,
                }}>
                  <Play size={10} fill="currentColor" /> Video
                </div>
              )}

              {/* Story number bottom-left */}
              <div style={{
                position: 'absolute', bottom: '6px', left: '8px',
                color: 'rgba(255,255,255,0.7)',
                fontSize: '11px', fontWeight: 600,
              }}>
                {idx + 1}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}