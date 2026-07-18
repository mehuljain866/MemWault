import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Music, MapPin, Users, Link as LinkIcon, Image as ImageIcon, Video, Play, Check } from 'lucide-react'

/**
 * StoryCard
 *
 * New props for multi-select mode:
 *  - isSelectMode  {boolean}  when true, clicking selects instead of navigating
 *  - isSelected    {boolean}  whether this card is currently selected
 *  - onSelect      {function} called with story.id when the card is tapped in select mode
 */
export default function StoryCard({ story, hideTitle, zoomLevel, isSelectMode = false, isSelected = false, onSelect }) {
  const navigate = useNavigate()

  // Ensure the datetime string is treated as UTC by appending 'Z' if missing
  const dateStrUtc = story.taken_at + (story.taken_at.endsWith('Z') ? '' : 'Z')
  const date = new Date(dateStrUtc)
  
  const dateStr = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  const timeStr = date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  })

  const isVideo = story.media_type === 2

  const handleClick = () => {
    if (isSelectMode) {
      onSelect && onSelect(story.id)
    } else {
      navigate(`/story/${story.id}`)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleClick()
    }
  }

  return (
    <motion.div
      layout
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="ios-story-card"
      onClick={handleClick}
      role={isSelectMode ? 'checkbox' : 'button'}
      aria-checked={isSelectMode ? isSelected : undefined}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      style={{
        borderRadius: zoomLevel === 'year' ? '2px' : zoomLevel === 'month' ? '6px' : 'var(--ios-radius-lg)',
        // Blue border highlight when selected
        outline: isSelected ? '2.5px solid var(--ios-accent)' : 'none',
        outlineOffset: '-2px',
        // Slight scale-down feedback in select mode
        transform: isSelected ? 'scale(0.97)' : 'scale(1)',
        cursor: isSelectMode ? 'pointer' : undefined,
      }}
    >
      {/* Media Thumbnail */}
      {story.media_url ? (
        isVideo ? (
          <video
            className="ios-story-card__media"
            src={story.media_url}
            muted
            loop
            preload="metadata"
            onMouseEnter={(e) => !isSelectMode && e.target.play()}
            onMouseLeave={(e) => {
              if (!isSelectMode) {
                e.target.pause()
                e.target.currentTime = 0
              }
            }}
          />
        ) : (
          <img
            className="ios-story-card__media"
            src={story.media_url}
            alt={`Story from ${dateStr}`}
            loading="lazy"
          />
        )
      ) : (
        <div
          className="ios-story-card__media"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: 0.2,
          }}
        >
          {isVideo ? <Video size={48} /> : <ImageIcon size={48} />}
        </div>
      )}

      {/* ── Multi-select checkbox overlay ─────────────────── */}
      {isSelectMode && (
        <div
          style={{
            position: 'absolute',
            bottom: '10px',
            left: '10px',
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            background: isSelected ? 'var(--ios-accent)' : 'rgba(0,0,0,0.35)',
            border: isSelected ? '2px solid var(--ios-accent)' : '2px solid rgba(255,255,255,0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background 0.18s ease, border-color 0.18s ease, transform 0.18s cubic-bezier(0.34,1.56,0.64,1)',
            transform: isSelected ? 'scale(1.1)' : 'scale(1)',
            pointerEvents: 'none', // click handled by parent card
            zIndex: 10,
            boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
          }}
          aria-hidden="true"
        >
          {isSelected && <Check size={14} color="#fff" strokeWidth={3} />}
        </div>
      )}

      {/* Type Badge (Top Right) — hidden in select mode to avoid clutter */}
      {zoomLevel === 'day' && !isSelectMode && (
        <div className="ios-glass" style={{
          position: 'absolute', top: '12px', right: '12px',
          padding: '6px 8px', borderRadius: '8px',
          display: 'flex', alignItems: 'center', gap: '4px',
          fontSize: '11px', fontWeight: 700, color: '#fff',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
        }}>
          {isVideo ? <><Play size={12} fill="currentColor" /> Video</> : <><ImageIcon size={12} /> Photo</>}
        </div>
      )}

      {/* Hover Overlay */}
      {zoomLevel === 'day' && !isSelectMode && (
        <div className="ios-story-card__overlay">
          <div style={{ color: 'white', fontWeight: 600, fontSize: '14px', marginBottom: '8px' }}>
            {timeStr}
          </div>
          <div style={{ display: 'flex', gap: '8px', color: 'rgba(255,255,255,0.9)' }}>
            {story.music && (
              <div title={`${story.music.track_title} — ${story.music.artist_name}`}>
                <Music size={16} />
              </div>
            )}
            {story.location_name && (
              <div title={story.location_name}>
                <MapPin size={16} />
              </div>
            )}
            {story.mentions?.length > 0 && (
              <div title={story.mentions.map(m => `@${m.username}`).join(', ')}>
                <Users size={16} />
              </div>
            )}
            {story.links?.length > 0 && (
              <div title={story.links.map(l => l.url).join(', ')}>
                <LinkIcon size={16} />
              </div>
            )}
          </div>
        </div>
      )}
    </motion.div>
  )
}
