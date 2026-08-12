import React, { useState, useEffect, useRef } from 'react'
import { X, MoreHorizontal, ChevronLeft, ChevronRight, Play } from 'lucide-react'

// Main Player Modal
export default function HighlightPlayerModal({
  isOpen,
  onClose,
  stories,
  initialIndex = 0,
  highlightTitle = "Highlight"
}) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [progress, setProgress] = useState(0) // 0 to 1 for current story
  const [isPaused, setIsPaused] = useState(false)
  const videoRef = useRef(null)
  
  // Reset state when modal opens or index changes
  useEffect(() => {
    if (isOpen && Array.isArray(stories) && stories.length > 0) {
      const validIdx = initialIndex >= 0 && initialIndex < stories.length ? initialIndex : 0
      setCurrentIndex(validIdx)
    }
  }, [isOpen, initialIndex, stories])

  useEffect(() => {
    setProgress(0)
    setIsPaused(false)
  }, [currentIndex])

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowLeft') handlePrev()
      else if (e.key === 'ArrowRight') handleNext()
      else if (e.key === ' ') {
        e.preventDefault()
        setIsPaused(p => !p)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, currentIndex, stories])

  // Auto-advance for images (5 seconds)
  useEffect(() => {
    if (!isOpen || isPaused || !stories || stories.length === 0) return
    
    const validIdx = currentIndex >= 0 && currentIndex < stories.length ? currentIndex : 0
    const currentStory = stories[validIdx]
    if (!currentStory) return
    
    // If it's an image, advance progress artificially over 5s
    if (currentStory.media_type === 1) {
      const duration = 5000 // 5 seconds
      const interval = 50 // Update every 50ms
      const increment = interval / duration
      
      const timer = setInterval(() => {
        setProgress(prev => {
          if (prev >= 1) {
            clearInterval(timer)
            handleNext()
            return 1
          }
          return prev + increment
        })
      }, interval)
      
      return () => clearInterval(timer)
    }
  }, [isOpen, currentIndex, isPaused, stories])

  // Handle video progress and end
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const p = videoRef.current.currentTime / videoRef.current.duration
      setProgress(p || 0)
    }
  }

  const handleVideoEnded = () => {
    handleNext()
  }

  // Play/Pause video when isPaused changes
  useEffect(() => {
    if (videoRef.current) {
      if (isPaused) videoRef.current.pause()
      else videoRef.current.play().catch(e => console.log('Autoplay prevented', e))
    }
  }, [isPaused, currentIndex])

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
    } else {
      setProgress(0)
    }
  }

  const handleNext = () => {
    if (stories && currentIndex < stories.length - 1) {
      setCurrentIndex(currentIndex + 1)
    } else {
      onClose()
    }
  }

  if (!isOpen || !stories || !Array.isArray(stories) || stories.length === 0) return null

  const validIndex = currentIndex >= 0 && currentIndex < stories.length ? currentIndex : 0
  const currentStory = stories[validIndex]
  if (!currentStory) return null

  const isVideo = currentStory.media_type === 2
  const mediaUrl = currentStory.media_url || (currentStory.s3_key_compressed ? `/media/${currentStory.s3_key_compressed}` : null)
  
  // Handle click-hold to pause
  const handleMouseDown = () => setIsPaused(true)
  const handleMouseUp = () => setIsPaused(false)

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: '#111', display: 'flex', flexDirection: 'column',
      userSelect: 'none'
    }}>
      {/* ── Main Viewing Area ── */}
      <div style={{ flex: 1, display: 'flex', position: 'relative', overflow: 'hidden' }}>
        
        {/* Left Nav Zone */}
        <div 
          onClick={handlePrev}
          style={{
            position: 'absolute', left: 0, top: 0, bottom: 0, width: '30%', zIndex: 50,
            cursor: 'w-resize', display: 'flex', alignItems: 'center', justifyContent: 'flex-start',
            paddingLeft: '20px'
          }}
          className="nav-zone group"
        >
          <div className="nav-icon" style={{
            background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)',
            borderRadius: '50%', padding: '12px', color: '#fff',
            opacity: 0, transition: 'opacity 0.2s',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }}>
            <ChevronLeft size={28} />
          </div>
        </div>

        {/* Center Stage (Story Canvas) */}
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '20px 0', position: 'relative'
        }}>
          <div 
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            style={{
              height: '100%', aspectRatio: '9/16',
              background: '#000', borderRadius: '16px', overflow: 'hidden',
              position: 'relative',
              boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
            }}
          >
            {/* Story Media */}
            {isVideo ? (
              <video
                ref={videoRef}
                src={mediaUrl}
                autoPlay
                playsInline
                onTimeUpdate={handleTimeUpdate}
                onEnded={handleVideoEnded}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <img
                src={mediaUrl}
                alt="Story"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            )}

            {/* AI Tag Overlay if applicable */}
            {currentStory.is_ai_generated && (
               <div style={{
                 position: 'absolute', top: '70px', right: '16px', zIndex: 40,
                 background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)',
                 color: '#fff', fontSize: '11px', fontWeight: 700, padding: '4px 10px',
                 borderRadius: '12px', border: '1px solid rgba(255,255,255,0.2)'
               }}>
                 ✨ AI
               </div>
            )}

            {/* Overlays (Progress Bars & Header) */}
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0,
              padding: '12px', zIndex: 60,
              background: 'linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, transparent 100%)',
              pointerEvents: 'none'
            }}>
              {/* Progress Bars */}
              <div style={{ display: 'flex', gap: '4px', marginBottom: '12px' }}>
                {stories.map((s, idx) => {
                  let fill = 0;
                  if (idx < currentIndex) fill = 100;
                  else if (idx === currentIndex) fill = progress * 100;
                  
                  return (
                    <div key={s.id || idx} style={{
                      flex: 1, height: '2px', background: 'rgba(255,255,255,0.3)',
                      borderRadius: '2px', overflow: 'hidden'
                    }}>
                      <div style={{
                        height: '100%', background: '#fff',
                        width: `${fill}%`, transition: isPaused ? 'none' : 'width 50ms linear'
                      }} />
                    </div>
                  )
                })}
              </div>

              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', pointerEvents: 'auto' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)', padding: '2px' }}>
                   <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: '#222', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '12px' }}>
                     {highlightTitle.charAt(0).toUpperCase()}
                   </div>
                </div>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px', textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>
                  <span style={{ color: '#fff', fontWeight: 600, fontSize: '14px' }}>
                    {highlightTitle}
                  </span>
                  <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px' }}>
                    {new Date(currentStory.taken_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
                
                {/* Controls */}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', padding: '4px' }}>
                    <MoreHorizontal size={24} />
                  </button>
                  <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', padding: '4px' }}>
                    <X size={28} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Nav Zone */}
        <div 
          onClick={handleNext}
          style={{
            position: 'absolute', right: 0, top: 0, bottom: 0, width: '30%', zIndex: 50,
            cursor: 'e-resize', display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
            paddingRight: '20px'
          }}
          className="nav-zone group"
        >
           <div className="nav-icon" style={{
            background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)',
            borderRadius: '50%', padding: '12px', color: '#fff',
            opacity: 0, transition: 'opacity 0.2s',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }}>
            <ChevronRight size={28} />
          </div>
        </div>
      </div>

      {/* ── Bottom Filmstrip (Thumbnail Scrubber) ── */}
      <div style={{
        height: '100px', background: '#0a0a0a', borderTop: '1px solid #222',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 20px',
        overflowX: 'auto', gap: '8px'
      }} className="hide-scrollbar">
        {stories.map((story, idx) => {
          const isActive = idx === currentIndex
          const isVid = story.media_type === 2
          const thumbUrl = story.media_url || (story.s3_key_compressed ? `/media/${story.s3_key_compressed}` : null)
          return (
            <div 
              key={story.id} 
              onClick={() => setCurrentIndex(idx)}
              style={{
                height: '70px', minWidth: '40px', aspectRatio: '9/16',
                borderRadius: '6px', overflow: 'hidden',
                border: isActive ? '2px solid #fff' : '2px solid transparent',
                opacity: isActive ? 1 : 0.4,
                transition: 'all 0.2s', cursor: 'pointer',
                position: 'relative', background: '#222',
                flexShrink: 0
              }}
            >
              {thumbUrl ? (
                isVid ? (
                  <video src={thumbUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted preload="metadata" />
                ) : (
                  <img src={thumbUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" loading="lazy" />
                )
              ) : null}
            </div>
          )
        })}
      </div>
      
      {/* Add global styles for nav-zone hover and hiding scrollbar */}
      <style>{`
        .nav-zone:hover .nav-icon {
          opacity: 1 !important;
        }
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  )
}
