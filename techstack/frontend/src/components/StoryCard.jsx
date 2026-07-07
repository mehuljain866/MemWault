import { useNavigate } from 'react-router-dom'

/**
 * Story card component for the timeline grid.
 * Displays a story thumbnail with overlay metadata on hover.
 */
export default function StoryCard({ story }) {
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
      className="sv-story-card sv-slide-up"
      onClick={() => navigate(`/story/${story.id}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && navigate(`/story/${story.id}`)}
    >
      {/* Media Thumbnail */}
      {story.media_url ? (
        isVideo ? (
          <video
            className="sv-story-card__media"
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
            className="sv-story-card__media"
            src={story.media_url}
            alt={`Story from ${dateStr}`}
            loading="lazy"
          />
        )
      ) : (
        <div
          className="sv-story-card__media"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '3rem',
            opacity: 0.2,
          }}
        >
          {isVideo ? '🎬' : '📷'}
        </div>
      )}

      {/* Type Badge */}
      <div className="sv-story-card__type-badge">
        {isVideo ? '▶ Video' : '📷 Photo'}
      </div>

      {/* Hover Overlay */}
      <div className="sv-story-card__overlay">
        <div className="sv-story-card__date">
          {dateStr} · {timeStr}
        </div>
        <div className="sv-story-card__meta">
          {story.music && (
            <span className="sv-story-card__meta-icon" title={`${story.music.track_title} — ${story.music.artist_name}`}>
              🎵
            </span>
          )}
          {story.location_name && (
            <span className="sv-story-card__meta-icon" title={story.location_name}>
              📍
            </span>
          )}
          {story.mentions?.length > 0 && (
            <span className="sv-story-card__meta-icon" title={story.mentions.map(m => `@${m.username}`).join(', ')}>
              👥
            </span>
          )}
          {story.links?.length > 0 && (
            <span className="sv-story-card__meta-icon">🔗</span>
          )}
          {story.polls?.length > 0 && (
            <span className="sv-story-card__meta-icon">📊</span>
          )}
        </div>
      </div>
    </div>
  )
}
