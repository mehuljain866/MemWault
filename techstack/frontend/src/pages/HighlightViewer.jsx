import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Video, Image as ImageIcon } from 'lucide-react'
import { getHighlightStories } from '../services/api'
import StoryPlayer from '../components/StoryPlayer'

export default function HighlightViewer() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [stories, setStories] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const thumbnailContainerRef = useRef(null)

  useEffect(() => {
    loadStories()
  }, [id])

  async function loadStories() {
    setLoading(true)
    try {
      const data = await getHighlightStories(id)
      setStories(data)
      setCurrentIndex(0)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Auto-scroll the thumbnail container to keep active thumbnail in view
  useEffect(() => {
    if (thumbnailContainerRef.current) {
      const container = thumbnailContainerRef.current
      const activeElement = container.children[currentIndex]
      if (activeElement) {
        activeElement.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
      }
    }
  }, [currentIndex])

  const goPrev = () => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1)
  }

  const goNext = () => {
    if (currentIndex < stories.length - 1) setCurrentIndex(currentIndex + 1)
  }

  if (loading) {
    return <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>
  }

  if (stories.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
        <p>No stories found for this highlight.</p>
        <button className="ios-btn-secondary" onClick={() => navigate('/highlights')}>Back</button>
      </div>
    )
  }

  const currentStory = stories[currentIndex]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#000', margin: '-20px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '16px 20px', zIndex: 10, background: 'linear-gradient(to bottom, rgba(0,0,0,0.5), transparent)' }}>
        <button
          onClick={() => navigate('/highlights')}
          style={{ background: 'transparent', border: 'none', color: '#fff', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '17px', cursor: 'pointer', padding: 0 }}
        >
          <ChevronLeft size={24} /> Back
        </button>
        <div style={{ flex: 1, textAlign: 'center', color: '#fff', fontWeight: 600, fontSize: '16px' }}>
          {currentIndex + 1} of {stories.length}
        </div>
        <div style={{ width: '60px' }} /> {/* placeholder for balance */}
      </div>

      {/* Main Player Area */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'relative', height: '100%', aspectRatio: '9/16', maxHeight: '85vh', maxWidth: '100%' }}>
          
          <StoryPlayer story={currentStory} isMusicPlaying={false} />

          {/* Navigation Arrows */}
          {currentIndex > 0 && (
            <button
              onClick={goPrev}
              style={{ position: 'absolute', left: '-60px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)', border: 'none', borderRadius: '50%', width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer', zIndex: 10 }}
            >
              <ChevronLeft size={24} />
            </button>
          )}
          
          {currentIndex < stories.length - 1 && (
            <button
              onClick={goNext}
              style={{ position: 'absolute', right: '-60px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)', border: 'none', borderRadius: '50%', width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer', zIndex: 10 }}
            >
              <ChevronRight size={24} />
            </button>
          )}

        </div>
      </div>

      {/* Gallery Timeline Scrubber */}
      <div 
        ref={thumbnailContainerRef}
        style={{ 
          height: '80px', 
          display: 'flex', 
          gap: '8px', 
          padding: '16px 20px', 
          overflowX: 'auto',
          backgroundColor: 'rgba(0,0,0,0.8)',
          scrollbarWidth: 'none', // hide scrollbar firefox
        }}
        className="hide-scrollbar"
      >
        {stories.map((story, idx) => {
          const isActive = idx === currentIndex
          // Determine thumbnail to show
          let thumbSrc = null
          if (story.media_type === 1) {
            thumbSrc = story.media_url
          } else {
            // For video, we might not have a thumbnail easily if not using S3 mocked thumbnail logic.
            // Actually, we do have og_reel_url or s3_key_compressed that might generate a preview.
            // We can just use media_url if it works, or fallback to an icon.
            thumbSrc = story.media_url // In Instagram's API, media_url for videos is often the thumbnail! Wait, no, for reels it is.
          }

          return (
            <div 
              key={story.id} 
              onClick={() => setCurrentIndex(idx)}
              style={{
                flexShrink: 0,
                width: '40px',
                height: '60px',
                borderRadius: '8px',
                overflow: 'hidden',
                border: isActive ? '2px solid var(--ios-accent)' : '2px solid transparent',
                opacity: isActive ? 1 : 0.5,
                transition: 'all 0.2s',
                cursor: 'pointer',
                backgroundColor: '#333',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {thumbSrc ? (
                // We use object-fit cover to fill the thumbnail box
                <img src={thumbSrc} alt="thumbnail" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.style.display = 'none' }} />
              ) : null}
              {story.media_type === 2 && (
                <Video size={16} color="#fff" style={{ position: 'absolute', zIndex: 2 }} />
              )}
            </div>
          )
        })}
      </div>

    </div>
  )
}