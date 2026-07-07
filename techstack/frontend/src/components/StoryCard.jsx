import { useNavigate } from 'react-router-dom'
import { Music, MapPin, Users, Link as LinkIcon, Image as ImageIcon, Video, Play } from 'lucide-react'

export default function StoryCard({ story, hideTitle, zoomLevel }) {
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

  return (
    <div
      className="ios-story-card"
      onClick={() => navigate(`/story/${story.id}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && navigate(`/story/${story.id}`)}
      style={{
        borderRadius: zoomLevel === 'year' ? '2px' : zoomLevel === 'month' ? '6px' : 'var(--ios-radius-lg)'
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
            onMouseEnter={(e) => e.target.play()}
            onMouseLeave={(e) => {
              e.target.pause()
              e.target.currentTime = 0
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

      {/* Type Badge (Top Right) */}
      {zoomLevel === 'day' && (
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
      {zoomLevel === 'day' && (
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
    </div>
  )
}
