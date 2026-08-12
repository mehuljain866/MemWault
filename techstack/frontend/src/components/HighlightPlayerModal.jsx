import React, { useState, useEffect, useRef } from 'react'
import { X, MoreHorizontal, ChevronLeft, ChevronRight, Play, Pause, ExternalLink, Folder, Music as MusicIcon, MapPin } from 'lucide-react'
import { locateStoryMedia } from '../services/api'
import MusicPlayer from './MusicPlayer'

// Animated Waveform Icon component
function AnimatedWaveform({ isPlaying }) {
  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'flex-end',
      gap: '2px',
      height: '12px',
      marginRight: '4px',
      flexShrink: 0
    }}>
      <span style={{
        width: '2px',
        background: '#fff',
        borderRadius: '1px',
        animation: isPlaying ? 'waveformPulse 0.8s ease-in-out infinite alternate' : 'none',
        height: isPlaying ? '12px' : '4px'
      }} />
      <span style={{
        width: '2px',
        background: '#fff',
        borderRadius: '1px',
        animation: isPlaying ? 'waveformPulse 0.5s ease-in-out infinite alternate' : 'none',
        height: isPlaying ? '10px' : '6px',
        animationDelay: '0.15s'
      }} />
      <span style={{
        width: '2px',
        background: '#fff',
        borderRadius: '1px',
        animation: isPlaying ? 'waveformPulse 0.7s ease-in-out infinite alternate' : 'none',
        height: isPlaying ? '14px' : '3px',
        animationDelay: '0.3s'
      }} />
    </div>
  )
}

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
  const [showMenu, setShowMenu] = useState(false)
  const [showMusicWidget, setShowMusicWidget] = useState(false)
  const [contextDisplayMode, setContextDisplayMode] = useState('music')
  const videoRef = useRef(null)
  
  // Reset state when modal opens or index changes
  useEffect(() => {
    if (isOpen && Array.isArray(stories) && stories.length > 0) {
      const validIdx = initialIndex >= 0 && initialIndex < stories.length ? initialIndex : 0
      setCurrentIndex(validIdx)
      setShowMenu(false)
    }
  }, [isOpen, initialIndex, stories])

  useEffect(() => {
    setProgress(0)
    setIsPaused(false)
    setShowMenu(false)
  }, [currentIndex])

  // Contextual Sub-header (Music / Location) cycling timer
  useEffect(() => {
    const validIdx = currentIndex >= 0 && currentIndex < stories.length ? currentIndex : 0
    const story = stories[validIdx]
    if (story && story.music && story.location_name) {
      const timer = setInterval(() => {
        setContextDisplayMode(prev => prev === 'music' ? 'location' : 'music')
      }, 3500)
      return () => clearInterval(timer)
    } else if (story && story.location_name) {
      setContextDisplayMode('location')
    } else {
      setContextDisplayMode('music')
    }
  }, [currentIndex, stories])

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (showMenu) setShowMenu(false)
        else onClose()
      }
      else if (e.key === 'ArrowLeft') handlePrev()
      else if (e.key === 'ArrowRight') handleNext()
      else if (e.key === ' ') {
        e.preventDefault()
        setIsPaused(p => !p)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, currentIndex, stories, showMenu])

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

  const handleOpenInstagram = () => {
    if (currentStory && currentStory.ig_media_id) {
      window.open(`https://www.instagram.com/p/${currentStory.ig_media_id}`, '_blank')
    } else {
      window.open(`https://www.instagram.com`, '_blank')
    }
    setShowMenu(false)
  }

  const handleLocateFile = async () => {
    if (currentStory && currentStory.id) {
      try {
        await locateStoryMedia(currentStory.id)
      } catch (err) {
        alert('Failed to locate file: ' + err.message)
      }
    }
    setShowMenu(false)
  }

  if (!isOpen || !stories || !Array.isArray(stories) || stories.length === 0) return null

  const validIndex = currentIndex >= 0 && currentIndex < stories.length ? currentIndex : 0
  const currentStory = stories[validIndex]
  if (!currentStory) return null

  const isVideo = currentStory.media_type === 2
  const mediaUrl = currentStory.media_url || (currentStory.s3_key_compressed ? `/media/${currentStory.s3_key_compressed}` : null)
  
  // Single click on story canvas toggles pause
  const handleCanvasClick = (e) => {
    e.stopPropagation()
    setIsPaused(prev => !prev)
  }

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
          onClick={(e) => { e.stopPropagation(); handlePrev(); }}
          style={{
            position: 'absolute', left: 0, top: 0, bottom: 0, width: '25%', zIndex: 50,
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

        {/* Center Stage (Story Canvas + optional Music Widget on Side) */}
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: '24px', padding: '20px 0', position: 'relative'
        }}>
          {/* Story Canvas */}
          <div 
            onClick={handleCanvasClick}
            style={{
              height: '100%', aspectRatio: '9/16',
              background: '#000', borderRadius: '16px', overflow: 'hidden',
              position: 'relative', cursor: 'pointer',
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

            {/* Paused Indicator Overlay */}
            {isPaused && (
              <div style={{
                position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                zIndex: 45, pointerEvents: 'none'
              }}>
                <div style={{
                  background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(12px)',
                  borderRadius: '50%', padding: '16px', color: '#fff'
                }}>
                  <Pause size={32} fill="#fff" />
                </div>
              </div>
            )}

            {/* AI Tag Overlay if applicable */}
            {currentStory.is_ai_generated && (
               <div style={{
                 position: 'absolute', top: '80px', right: '16px', zIndex: 40,
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
              background: 'linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, transparent 100%)',
              pointerEvents: 'none'
            }}>
              {/* Progress Bars */}
              <div style={{ display: 'flex', gap: '4px', marginBottom: '10px' }}>
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

              {/* ── 2-Row Header Layout ── */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', pointerEvents: 'auto' }}>
                {/* Avatar */}
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)', padding: '2px', flexShrink: 0 }}>
                   <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: '#222', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '13px', fontWeight: 700 }}>
                     {highlightTitle.charAt(0).toUpperCase()}
                   </div>
                </div>

                {/* 2-Row Info Block */}
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px', textShadow: '0 1px 4px rgba(0,0,0,0.6)' }}>
                  {/* Row 1: Identity */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: '#fff', fontWeight: 600, fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {highlightTitle}
                    </span>
                    <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: '12px', flexShrink: 0 }}>
                      {currentStory.taken_at ? new Date(currentStory.taken_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                    </span>
                  </div>

                  {/* Row 2: Contextual Metadata (Music / Location) */}
                  {(currentStory.music || currentStory.location_name) && (
                    <div 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (currentStory.music) setShowMusicWidget(prev => !prev);
                      }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '5px',
                        color: '#fff', fontSize: '12px', fontWeight: 500,
                        cursor: currentStory.music ? 'pointer' : 'default',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                      }}
                      title={currentStory.music ? "Click to toggle Apple Music widget" : ""}
                    >
                      {contextDisplayMode === 'location' || (!currentStory.music && currentStory.location_name) ? (
                        <>
                          <MapPin size={12} color="#ff3b30" />
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{currentStory.location_name}</span>
                        </>
                      ) : (
                        <>
                          <AnimatedWaveform isPlaying={!isPaused} />
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {currentStory.music?.track_title || 'Audio Track'} {currentStory.music?.artist_name ? ` · ${currentStory.music.artist_name}` : ''}
                          </span>
                        </>
                      )}
                    </div>
                  )}
                </div>
                
                {/* Controls */}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', position: 'relative' }}>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setShowMenu(prev => !prev); }} 
                    style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', padding: '4px' }}
                  >
                    <MoreHorizontal size={24} />
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); onClose(); }} 
                    style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', padding: '4px' }}
                  >
                    <X size={28} />
                  </button>

                  {/* ── Popover Menu ── */}
                  {showMenu && (
                    <div 
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        position: 'absolute', top: '40px', right: 0, zIndex: 100,
                        background: 'rgba(28,28,30,0.95)', backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(255,255,255,0.15)', borderRadius: '14px',
                        width: '220px', padding: '6px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                        display: 'flex', flexDirection: 'column', gap: '4px'
                      }}
                    >
                      <button 
                        onClick={handleOpenInstagram}
                        style={{
                          background: 'transparent', border: 'none', color: '#fff',
                          padding: '10px 12px', borderRadius: '8px', display: 'flex',
                          alignItems: 'center', gap: '10px', fontSize: '13px', fontWeight: 500,
                          cursor: 'pointer', textAlign: 'left'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <ExternalLink size={16} color="#0a84ff" /> Open on Instagram
                      </button>

                      <button 
                        onClick={() => { setShowMusicWidget(prev => !prev); setShowMenu(false); }}
                        style={{
                          background: 'transparent', border: 'none', color: '#fff',
                          padding: '10px 12px', borderRadius: '8px', display: 'flex',
                          alignItems: 'center', gap: '10px', fontSize: '13px', fontWeight: 500,
                          cursor: 'pointer', textAlign: 'left'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <MusicIcon size={16} color="#ff375f" /> {showMusicWidget ? 'Hide Music Widget' : 'Show Music Widget'}
                      </button>

                      {currentStory.location_name && (
                        <button 
                          onClick={() => { setContextDisplayMode('location'); setShowMenu(false); }}
                          style={{
                            background: 'transparent', border: 'none', color: '#fff',
                            padding: '10px 12px', borderRadius: '8px', display: 'flex',
                            alignItems: 'center', gap: '10px', fontSize: '13px', fontWeight: 500,
                            cursor: 'pointer', textAlign: 'left'
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                          <MapPin size={16} color="#ff3b30" /> Location: {currentStory.location_name}
                        </button>
                      )}

                      <button 
                        onClick={handleLocateFile}
                        style={{
                          background: 'transparent', border: 'none', color: '#fff',
                          padding: '10px 12px', borderRadius: '8px', display: 'flex',
                          alignItems: 'center', gap: '10px', fontSize: '13px', fontWeight: 500,
                          cursor: 'pointer', textAlign: 'left'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <Folder size={16} color="#ffd60a" /> Show Local File
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Optional Apple Music Side Widget (with Close button) */}
          {showMusicWidget && (
            <div style={{ width: '320px', zIndex: 60, flexShrink: 0, position: 'relative' }}>
              <button 
                onClick={() => setShowMusicWidget(false)}
                style={{
                  position: 'absolute', top: '-10px', right: '-10px', zIndex: 70,
                  background: 'rgba(255,59,48,0.9)', border: 'none', borderRadius: '50%',
                  width: '24px', height: '24px', color: '#fff', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                }}
                title="Hide Music Widget"
              >
                <X size={14} />
              </button>
              <MusicPlayer 
                music={currentStory.music || { track_title: 'Archived Story Track', artist_name: highlightTitle }} 
              />
            </div>
          )}
        </div>

        {/* Right Nav Zone */}
        <div 
          onClick={(e) => { e.stopPropagation(); handleNext(); }}
          style={{
            position: 'absolute', right: 0, top: 0, bottom: 0, width: '25%', zIndex: 50,
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
        @keyframes waveformPulse {
          0% {
            height: 3px;
          }
          100% {
            height: 12px;
          }
        }
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
