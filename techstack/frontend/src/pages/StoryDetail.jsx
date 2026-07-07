import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getStory, getStoryViewers, locateStoryMedia, updateStoryLocation, toggleStoryReel, getAdjacentStories } from '../services/api'
import StoryPlayer from '../components/StoryPlayer'
import LocationModal from '../components/LocationModal'
import MusicPlayer from '../components/MusicPlayer'

export default function StoryDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [story, setStory] = useState(null)
  const [viewers, setViewers] = useState([])
  const [adjacent, setAdjacent] = useState({ prev_id: null, next_id: null })
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('metadata')
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false)

  useEffect(() => {
    loadStory()
  }, [id])

  // Keydown listener for arrow navigation
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'ArrowLeft' && adjacent.prev_id) {
        navigate(`/story/${adjacent.prev_id}`)
      } else if (e.key === 'ArrowRight' && adjacent.next_id) {
        navigate(`/story/${adjacent.next_id}`)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [adjacent, navigate])

  async function handleLocate() {
    try {
      await locateStoryMedia(id)
    } catch (err) {
      alert('Failed to locate file: ' + err.message)
    }
  }

  async function loadStory() {
    setLoading(true)
    try {
      const data = await getStory(id)
      setStory(data)

      // Load viewers and adjacent stories in background
      Promise.all([
        getStoryViewers(id).catch(() => []),
        getAdjacentStories(id).catch(() => ({ prev_id: null, next_id: null }))
      ]).then(([v, adj]) => {
        setViewers(v)
        setAdjacent(adj)
      })

    } catch (err) {
      console.error('Failed to load story:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleSaveLocation(locData) {
    try {
      const res = await updateStoryLocation(id, locData);
      // Update local story state
      setStory(prev => ({
        ...prev,
        location_name: locData.location_name,
        location_lat: locData.location_lat,
        location_lng: locData.location_lng,
      }));
      setIsLocationModalOpen(false);
    } catch (err) {
      alert('Failed to update location: ' + err.message);
    }
  }

  async function handleToggleReel() {
    try {
      const data = await toggleStoryReel(id);
      setStory(prev => ({ ...prev, is_reel: data.is_reel }));
    } catch (err) {
      alert('Failed to toggle reel status: ' + err.message);
    }
  }

  if (loading) {
    return (
      <div className="sv-empty">
        <div className="sv-empty__icon">⏳</div>
        <div className="sv-empty__title">Loading Story...</div>
      </div>
    )
  }

  if (!story) {
    return (
      <div className="sv-empty">
        <div className="sv-empty__icon">❌</div>
        <div className="sv-empty__title">Story Not Found</div>
        <button className="sv-btn sv-btn--primary" onClick={() => navigate('/timeline')}>
          Back to Timeline
        </button>
      </div>
    )
  }

  // Ensure the datetime string is treated as UTC by appending 'Z' if missing
  const dateStrUtc = story.taken_at + (story.taken_at.endsWith('Z') ? '' : 'Z')
  const date = new Date(dateStrUtc)
  const isVideo = story.media_type === 2

  return (
    <div className="sv-fade-in">
      {/* Back button */}
      <button
        className="sv-btn sv-btn--ghost"
        onClick={() => navigate(-1)}
        style={{ marginBottom: 'var(--sv-space-4)' }}
      >
        ← Back
      </button>

      <div className="sv-story-detail">
        {/* ── Media Player ──────────────────── */}
        <div 
          className="sv-story-detail__media-container sv-story-nav-container" 
          style={{ background: 'transparent' }}
        >
          <StoryPlayer story={story} />
          
          {/* Navigation Arrows */}
          {adjacent.prev_id && (
            <button
              className="sv-story-nav-btn sv-story-nav-btn--prev"
              onClick={() => navigate(`/story/${adjacent.prev_id}`)}
              title="Previous Story (Left Arrow)"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
          )}
          
          {adjacent.next_id && (
            <button
              className="sv-story-nav-btn sv-story-nav-btn--next"
              onClick={() => navigate(`/story/${adjacent.next_id}`)}
              title="Next Story (Right Arrow)"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          )}
        </div>

        {/* ── Metadata Panel ────────────────── */}
        <div className="sv-story-detail__info">
          {/* Tab Nav */}
          <div style={{ display: 'flex', gap: 'var(--sv-space-2)', borderBottom: '1px solid var(--sv-border)', paddingBottom: 'var(--sv-space-3)' }}>
            {['metadata', 'music', 'viewers', 'manifest'].map(tab => (
              <button
                key={tab}
                className={`sv-btn sv-btn--sm ${activeTab === tab ? 'sv-btn--primary' : 'sv-btn--ghost'}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {/* ── Metadata Tab ──────────────── */}
          {activeTab === 'metadata' && (
            <div className="sv-story-detail__section sv-slide-up">
              <div className="sv-story-detail__section-title">Story Info</div>

              <div className="sv-story-detail__metadata-row">
                <span className="sv-story-detail__metadata-icon">📅</span>
                <div>
                  <div className="sv-story-detail__metadata-label">Posted</div>
                  <div className="sv-story-detail__metadata-value">
                    {date.toLocaleDateString('en-US', {
                      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                    })} at {date.toLocaleTimeString()}
                  </div>
                </div>
              </div>

              <div className="sv-story-detail__metadata-row">
                <span className="sv-story-detail__metadata-icon">
                  {isVideo ? '🎬' : '📷'}
                </span>
                <div>
                  <div className="sv-story-detail__metadata-label">Type</div>
                  <div className="sv-story-detail__metadata-value">
                    {isVideo ? 'Video' : 'Photo'}
                    {story.width && story.height ? ` · ${story.width}×${story.height}` : ''}
                    {story.duration_ms ? ` · ${(story.duration_ms / 1000).toFixed(1)}s` : ''}
                  </div>
                </div>
              </div>

              <div className="sv-story-detail__metadata-row" style={{ alignItems: 'flex-start' }}>
                <span className="sv-story-detail__metadata-icon">📍</span>
                <div style={{ flex: 1 }}>
                  <div className="sv-story-detail__metadata-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    Location
                    <button 
                      className="sv-btn sv-btn--ghost" 
                      style={{ padding: 0, height: 'auto', color: 'var(--sv-primary)' }}
                      onClick={() => setIsLocationModalOpen(true)}
                    >
                      ✎ Edit
                    </button>
                  </div>
                  <div className="sv-story-detail__metadata-value">
                    {story.location_name ? (
                      <>
                        {story.location_name}
                        {story.location_lat && story.location_lng && (
                          <div style={{ marginTop: 'var(--sv-space-2)', display: 'flex', gap: 'var(--sv-space-2)' }}>
                            <a 
                              href={`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${story.location_lat},${story.location_lng}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="sv-btn sv-btn--secondary sv-btn--sm"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                            >
                              🚶‍♂️ View Street View
                            </a>
                            <a 
                              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(story.location_name)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="sv-btn sv-btn--ghost sv-btn--sm"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                            >
                              🗺️ Open in Maps
                            </a>
                          </div>
                        )}
                      </>
                    ) : (
                      <span style={{ color: 'var(--sv-text-muted)' }}>No location added. <a href="#" onClick={(e) => { e.preventDefault(); setIsLocationModalOpen(true); }}>Add one?</a></span>
                    )}
                  </div>
                </div>
              </div>

              {story.caption_text && (
                <div className="sv-story-detail__metadata-row">
                  <span className="sv-story-detail__metadata-icon">💬</span>
                  <div>
                    <div className="sv-story-detail__metadata-label">Caption</div>
                    <div className="sv-story-detail__metadata-value">{story.caption_text}</div>
                  </div>
                </div>
              )}

              {story.viewer_count != null && (
                <div className="sv-story-detail__metadata-row">
                  <span className="sv-story-detail__metadata-icon">👁️</span>
                  <div>
                    <div className="sv-story-detail__metadata-label">Views</div>
                    <div className="sv-story-detail__metadata-value">{story.viewer_count}</div>
                  </div>
                </div>
              )}

              {/* Music Quick Link */}
              {story.music && (
                <>
                  <div className="sv-story-detail__section-title" style={{ marginTop: 'var(--sv-space-4)' }}>
                    Music
                  </div>
                  <div 
                    className="sv-card" 
                    style={{ padding: 'var(--sv-space-3)', display: 'flex', alignItems: 'center', gap: 'var(--sv-space-3)', cursor: 'pointer' }}
                    onClick={() => setActiveTab('music')}
                  >
                    <div style={{ fontSize: '1.5rem' }}>🎵</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600 }}>{story.music.track_title}</div>
                      <div style={{ fontSize: 'var(--sv-text-xs)', color: 'var(--sv-text-muted)' }}>{story.music.artist_name}</div>
                    </div>
                    <div style={{ color: 'var(--sv-primary)' }}>Play →</div>
                  </div>
                </>
              )}

              {/* Management Info */}
              {story.mentions?.length > 0 && (
                <>
                  <div className="sv-story-detail__section-title" style={{ marginTop: 'var(--sv-space-4)' }}>
                    Mentions
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--sv-space-2)' }}>
                    {story.mentions.map((m) => (
                      <span key={m.id} className="sv-badge sv-badge--accent">
                        @{m.username}
                      </span>
                    ))}
                  </div>
                </>
              )}

              {/* Links */}
              {story.links?.length > 0 && (
                <>
                  <div className="sv-story-detail__section-title" style={{ marginTop: 'var(--sv-space-4)' }}>
                    Links
                  </div>
                  {story.links.map((l) => (
                    <a
                      key={l.id}
                      href={l.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="sv-card sv-card--clickable"
                      style={{ padding: 'var(--sv-space-3)', display: 'block' }}
                    >
                      🔗 {l.link_title || l.display_url || l.url}
                    </a>
                  ))}
                </>
              )}

              {/* Polls */}
              {story.polls?.length > 0 && (
                <>
                  <div className="sv-story-detail__section-title" style={{ marginTop: 'var(--sv-space-4)' }}>
                    Polls & Quizzes
                  </div>
                  {story.polls.map((p) => (
                    <div key={p.id} className="sv-card" style={{ padding: 'var(--sv-space-4)' }}>
                      <div style={{ fontWeight: 600, marginBottom: 'var(--sv-space-2)' }}>
                        {p.question_text || 'Poll'}
                      </div>
                      <div style={{ fontSize: 'var(--sv-text-xs)', color: 'var(--sv-text-muted)' }}>
                        {p.total_votes} total votes · {p.poll_type}
                      </div>
                    </div>
                  ))}
                </>
              )}

              <div className="sv-story-detail__section-title" style={{ marginTop: 'var(--sv-space-4)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Management</span>
                <div style={{ display: 'flex', gap: 'var(--sv-space-2)' }}>
                  <button className="sv-btn sv-btn--sm sv-btn--secondary" onClick={handleToggleReel}>
                    {story.is_reel ? "Move to Memories" : "Move to Reels"}
                  </button>
                  {story.is_downloaded && (
                    <button className="sv-btn sv-btn--sm sv-btn--secondary" onClick={handleLocate}>
                      Show in Explorer
                    </button>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 'var(--sv-space-2)', flexWrap: 'wrap' }}>
                <span className={`sv-badge ${story.is_downloaded ? 'sv-badge--success' : 'sv-badge--warning'}`}>
                  {story.is_downloaded ? '✓ Downloaded' : '⏳ Pending'}
                </span>
                <span className={`sv-badge ${story.is_metadata_written ? 'sv-badge--success' : 'sv-badge--warning'}`}>
                  {story.is_metadata_written ? '✓ Metadata Written' : '⏳ Metadata Pending'}
                </span>
                <span className={`sv-badge ${story.is_uploaded_to_s3 ? 'sv-badge--success' : 'sv-badge--warning'}`}>
                  {story.is_uploaded_to_s3 ? '✓ Uploaded' : '⏳ Upload Pending'}
                </span>
              </div>
              {story.file_name && (
                <div style={{
                  fontSize: 'var(--sv-text-xs)',
                  color: 'var(--sv-text-muted)',
                  fontFamily: 'var(--sv-font-mono)',
                  marginTop: 'var(--sv-space-2)',
                }}>
                  {story.file_name}
                </div>
              )}
            </div>
          )}

          {/* ── Music Tab ─────────────────── */}
          {activeTab === 'music' && (
            <div className="sv-story-detail__section sv-slide-up">
              {story.music ? (
                <>
                  <div className="sv-card" style={{ padding: 'var(--sv-space-5)' }}>
                    <div style={{ display: 'flex', gap: 'var(--sv-space-4)', alignItems: 'center' }}>
                      {story.music.cover_art_url ? (
                        <img
                          src={story.music.cover_art_url}
                          alt="Cover art"
                          style={{
                            width: 64,
                            height: 64,
                            borderRadius: 'var(--sv-radius-md)',
                            objectFit: 'cover',
                          }}
                        />
                      ) : (
                        <div style={{
                          width: 64,
                          height: 64,
                          borderRadius: 'var(--sv-radius-md)',
                          background: 'var(--sv-gradient-warm)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1.5rem',
                        }}>
                          🎵
                        </div>
                      )}
                      <div>
                        <div style={{ fontSize: 'var(--sv-text-lg)', fontWeight: 700 }}>
                          {story.music.track_title}
                        </div>
                        <div style={{ color: 'var(--sv-text-secondary)' }}>
                          {story.music.artist_name}
                        </div>
                      </div>
                    </div>

                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: 'var(--sv-space-4)',
                      marginTop: 'var(--sv-space-5)',
                    }}>
                      {story.music.start_time_ms != null && (
                        <div>
                          <div className="sv-story-detail__metadata-label">Start Offset</div>
                          <div className="sv-story-detail__metadata-value">
                            {(story.music.start_time_ms / 1000).toFixed(1)}s
                          </div>
                        </div>
                      )}
                      {story.music.play_duration_ms != null && (
                        <div>
                          <div className="sv-story-detail__metadata-label">Duration</div>
                          <div className="sv-story-detail__metadata-value">
                            {(story.music.play_duration_ms / 1000).toFixed(1)}s
                          </div>
                        </div>
                      )}
                      {story.music.ig_audio_id && (
                        <div>
                          <div className="sv-story-detail__metadata-label">IG Audio ID</div>
                          <div className="sv-story-detail__metadata-value" style={{ fontFamily: 'var(--sv-font-mono)', fontSize: 'var(--sv-text-xs)' }}>
                            {story.music.ig_audio_id}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Interactive Music Player */}
                    <MusicPlayer music={story.music} />
                  </div>
                </>
              ) : (
                <div className="sv-empty" style={{ padding: 'var(--sv-space-12)' }}>
                  <div className="sv-empty__icon" style={{ fontSize: '3rem' }}>🔇</div>
                  <div className="sv-empty__title">No Music</div>
                  <div className="sv-empty__description">
                    This story was posted without a music sticker.
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Viewers Tab ───────────────── */}
          {activeTab === 'viewers' && (
            <div className="sv-story-detail__section sv-slide-up">
              {viewers.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sv-space-2)' }}>
                  {viewers.map((v) => (
                    <div
                      key={v.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--sv-space-3)',
                        padding: 'var(--sv-space-2)',
                        borderRadius: 'var(--sv-radius-md)',
                      }}
                    >
                      {v.profile_pic_url ? (
                        <img
                          src={v.profile_pic_url}
                          alt={v.username}
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: '50%',
                            objectFit: 'cover',
                          }}
                        />
                      ) : (
                        <div style={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          background: 'var(--sv-surface)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 'var(--sv-text-sm)',
                        }}>
                          👤
                        </div>
                      )}
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 'var(--sv-text-sm)' }}>
                          <a 
                            href={`https://instagram.com/${v.username}`} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            style={{ color: 'inherit', textDecoration: 'none' }}
                            onMouseOver={(e) => e.target.style.textDecoration = 'underline'}
                            onMouseOut={(e) => e.target.style.textDecoration = 'none'}
                          >
                            {v.username}
                          </a>
                        </div>
                        {v.full_name && (
                          <div style={{ fontSize: 'var(--sv-text-xs)', color: 'var(--sv-text-muted)' }}>
                            {v.full_name}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="sv-empty" style={{ padding: 'var(--sv-space-12)' }}>
                  <div className="sv-empty__icon" style={{ fontSize: '3rem' }}>👁️</div>
                  <div className="sv-empty__title">No Viewer Data</div>
                  <div className="sv-empty__description">
                    Viewer data is only captured while the story is still active (within 24 hours).
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Manifest Tab ──────────────── */}
          {activeTab === 'manifest' && (
            <div className="sv-story-detail__section sv-slide-up">
              <div className="sv-story-detail__section-title">
                .mem Manifest (Layout Recipe)
              </div>
              <pre
                style={{
                  background: 'var(--sv-bg-primary)',
                  border: '1px solid var(--sv-border)',
                  borderRadius: 'var(--sv-radius-md)',
                  padding: 'var(--sv-space-4)',
                  overflow: 'auto',
                  maxHeight: 500,
                  fontSize: 'var(--sv-text-xs)',
                  fontFamily: 'var(--sv-font-mono)',
                  color: 'var(--sv-text-secondary)',
                  lineHeight: 1.8,
                }}
              >
                {JSON.stringify(story, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
      
      <LocationModal 
        isOpen={isLocationModalOpen} 
        onClose={() => setIsLocationModalOpen(false)} 
        onSave={handleSaveLocation}
        initialLocation={story.location_name ? {
          name: story.location_name,
          lat: story.location_lat,
          lng: story.location_lng
        } : null}
      />
    </div>
  )
}
