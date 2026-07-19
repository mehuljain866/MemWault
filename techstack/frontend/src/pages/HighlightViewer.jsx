import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, Image as ImageIcon, Play, RefreshCcw, Layers, Edit2, Plus, X as XIcon, Check } from 'lucide-react'
import { getHighlightStories, getHighlights, updateHighlight, removeStoriesFromHighlight } from '../services/api'
import HighlightCreatorModal from '../components/HighlightCreatorModal'

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

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false)
  const [editedTitle, setEditedTitle] = useState('')
  const [savingTitle, setSavingTitle] = useState(false)
  const [showAddStoriesModal, setShowAddStoriesModal] = useState(false)

  useEffect(() => {
    loadStories()
  }, [id])

  async function loadStories() {
    setLoading(true)
    try {
      const [storiesData, highlightsData] = await Promise.all([
        getHighlightStories(id),
        getHighlights()
      ])
      
      let fetchedStories = []
      if (Array.isArray(storiesData)) {
        fetchedStories = storiesData
      } else if (storiesData && storiesData.stories) {
        fetchedStories = storiesData.stories
      }

      const hl = highlightsData.find(h => h.id === id)
      setHighlightTitle(hl?.title || '')
      
      // Sort chronologically (newest first)
      fetchedStories.sort((a, b) => new Date(b.taken_at) - new Date(a.taken_at))
      
      setStories(fetchedStories)
    } catch (err) {
      console.error(err)
      setStories([])
    } finally {
      setLoading(false)
    }
  }

  async function handleSaveTitle() {
    if (!editedTitle.trim() || editedTitle === highlightTitle) {
      setIsEditing(false)
      return
    }
    try {
      setSavingTitle(true)
      await updateHighlight(id, editedTitle.trim())
      setHighlightTitle(editedTitle.trim())
      setIsEditing(false)
    } catch (err) {
      alert('Failed to update title: ' + err.message)
    } finally {
      setSavingTitle(false)
    }
  }

  async function handleRemoveStory(e, storyId) {
    e.stopPropagation()
    try {
      await removeStoriesFromHighlight(id, [storyId])
      setStories(prev => prev.filter(s => s.id !== storyId))
    } catch (err) {
      alert('Failed to remove story: ' + err.message)
    }
  }

  // ── Group Stories by Date ──────────────────────────────────
  const groupedStories = useMemo(() => {
    return stories.reduce((acc, story) => {
      // Handle missing 'Z' for UTC parsing
      const dateStrUtc = story.taken_at + (story.taken_at.endsWith('Z') ? '' : 'Z')
      const d = new Date(dateStrUtc)
      const groupKey = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
      
      if (!acc[groupKey]) acc[groupKey] = []
      acc[groupKey].push(story)
      return acc
    }, {})
  }, [stories])

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
          {isEditing ? (
            <input
              type="text"
              value={editedTitle}
              onChange={e => setEditedTitle(e.target.value)}
              autoFocus
              style={{
                fontSize: '22px', fontWeight: 700, color: 'var(--ios-text-primary)',
                background: 'var(--ios-border)', border: '1px solid var(--ios-accent)',
                borderRadius: '8px', padding: '4px 8px', width: '100%',
                outline: 'none', boxSizing: 'border-box'
              }}
              onKeyDown={e => {
                if (e.key === 'Enter') handleSaveTitle()
              }}
            />
          ) : (
            <h1 style={{
              margin: 0, fontSize: '22px', fontWeight: 700,
              color: 'var(--ios-text-primary)',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {highlightTitle || 'Highlight'}
            </h1>
          )}
          <div style={{ fontSize: '13px', color: 'var(--ios-text-secondary)', marginTop: '2px' }}>
            {stories.length} {stories.length === 1 ? 'story' : 'stories'}
          </div>
        </div>

        {/* Edit Toggle */}
        <div style={{ flexShrink: 0 }}>
          {isEditing ? (
            <button
              onClick={handleSaveTitle}
              disabled={savingTitle}
              className="ios-btn"
              style={{
                padding: '6px 12px', fontSize: '14px', borderRadius: '14px',
                display: 'flex', alignItems: 'center', gap: '4px'
              }}
            >
              <Check size={16} /> {savingTitle ? 'Saving...' : 'Done'}
            </button>
          ) : (
            <button
              onClick={() => {
                setEditedTitle(highlightTitle)
                setIsEditing(true)
              }}
              className="ios-btn-secondary"
              style={{
                padding: '6px 12px', fontSize: '14px', borderRadius: '14px',
                display: 'flex', alignItems: 'center', gap: '4px'
              }}
            >
              <Edit2 size={16} /> Edit
            </button>
          )}
        </div>
      </div>

      {isEditing && (
        <div style={{ marginTop: '8px' }}>
          <button
            onClick={() => setShowAddStoriesModal(true)}
            style={{
              width: '100%', padding: '12px', borderRadius: '12px',
              border: '2px dashed var(--ios-accent)', background: 'rgba(10, 132, 255, 0.1)',
              color: 'var(--ios-accent)', fontWeight: 600, fontSize: '15px',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              cursor: 'pointer'
            }}
          >
            <Plus size={18} /> Add More Stories
          </button>
        </div>
      )}

      {/* Grouped story grid */}
      <div>
        {Object.entries(groupedStories).map(([dateStr, dateStories]) => (
          <div key={dateStr} style={{ position: 'relative', marginBottom: '20px' }}>
            
            {/* Floating Date Header */}
            <div style={{ position: 'sticky', top: '74px', zIndex: 30, pointerEvents: 'none', display: 'flex', padding: '8px 0' }}>
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
              gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
              gap: '10px',
              marginTop: '8px',
            }}>
              {dateStories.map((story, idx) => {
                const isVideo = story.media_type === 2
                const thumbSrc = story.media_url

                return (
                  <div
                    key={story.id}
                    onClick={() => !isEditing && navigate(`/story/${story.id}`)}
                    style={{
                      aspectRatio: '9/16',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      cursor: isEditing ? 'default' : 'pointer',
                      position: 'relative',
                      background: 'var(--ios-border)',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                      transition: 'transform 0.18s, box-shadow 0.18s',
                      opacity: isEditing ? 0.9 : 1,
                    }}
                    onMouseEnter={e => {
                      if (!isEditing) {
                        e.currentTarget.style.transform = 'scale(1.03)'
                        e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.2)'
                      }
                    }}
                    onMouseLeave={e => {
                      if (!isEditing) {
                        e.currentTarget.style.transform = 'scale(1)'
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)'
                      }
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

                    {/* Remove overlay in edit mode */}
                    {isEditing && (
                      <div style={{
                        position: 'absolute', inset: 0,
                        background: 'rgba(0,0,0,0.3)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <button
                          onClick={(e) => handleRemoveStory(e, story.id)}
                          style={{
                            background: 'rgba(255,59,48,0.9)',
                            border: 'none', borderRadius: '50%',
                            width: '40px', height: '40px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#fff', cursor: 'pointer',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                          }}
                        >
                          <XIcon size={20} />
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      <HighlightCreatorModal
        isOpen={showAddStoriesModal}
        onClose={() => setShowAddStoriesModal(false)}
        editMode={true}
        onSave={async (selectedIds) => {
          if (selectedIds.length === 0) return;
          try {
            await import('../services/api').then(m => m.addStoriesToHighlight(id, selectedIds));
            loadStories();
          } catch (err) {
            alert('Failed to add stories: ' + err.message);
          }
        }}
        preSelectedStoryIds={stories.map(s => s.id)}
      />
    </div>
  )
}