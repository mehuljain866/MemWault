import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, MoreHorizontal, ChevronLeft, ChevronRight, Play, Pause, ExternalLink, Folder, Music as MusicIcon, MapPin, Star, Image as ImageIcon } from 'lucide-react'
import { locateStoryMedia } from '../services/api'
import MusicPlayer from './MusicPlayer'

// Live Moving Equalizer Waveform Icon component
function LiveMovingWaveform({ isPlaying }) {
  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'flex-end',
      gap: '2.5px',
      height: '14px',
      marginRight: '6px',
      flexShrink: 0
    }}>
      {[1, 2, 3, 4].map((i) => (
        <span
          key={i}
          className={`eq-bar-${i}`}
          style={{
            width: '2.5px',
            background: 'var(--ios-accent, #0050EF)',
            borderRadius: '2px',
            height: isPlaying ? undefined : '3px',
            animationPlayState: isPlaying ? 'running' : 'paused'
          }}
        />
      ))}
    </div>
  )
}

// ── Resilient Story Thumbnail Scrubber Item ──
function StoryThumbnail({ story, isActive, onClick }) {
  const rawUrl = story?.thumbnail_url || story?.cover_media_url || story?.display_url || story?.media_url || story?.raw_media_url || (Array.isArray(story?.preview_stories) ? story.preview_stories[0] : '') || (story?.s3_key_compressed ? `/api/v1/media/${story.s3_key_compressed}` : '');
  const isVid = story?.media_type === 2 || story?.is_video || (typeof rawUrl === 'string' && (rawUrl.includes('.mp4') || rawUrl.includes('.mov') || rawUrl.includes('video') || rawUrl.startsWith('data:video')));
  const [src, setSrc] = useState(rawUrl);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setSrc(rawUrl);
    setHasError(false);
  }, [rawUrl]);

  return (
    <motion.div 
      className={`filmstrip-thumb ${isActive ? 'active' : ''}`}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      style={{
        height: '68px',
        width: '38px',
        minWidth: '38px',
        aspectRatio: '9/16',
        borderRadius: '6px',
        overflow: 'hidden',
        border: isActive ? '2px solid var(--ios-accent, #0050EF)' : '2px solid transparent',
        opacity: isActive ? 1 : 0.5,
        transition: 'border 0.2s, opacity 0.2s',
        cursor: 'pointer',
        position: 'relative',
        backgroundColor: '#1E1E1E',
        flexShrink: 0,
        boxShadow: isActive ? '0 0 12px rgba(0, 80, 239, 0.55)' : 'none',
        WebkitTapHighlightColor: 'transparent',
        userSelect: 'none',
      }}
    >
      {src && !hasError ? (
        isVid ? (
          <video 
            src={src ? (src.includes('#t=') || src.startsWith('blob:') ? src : `${src}#t=0.001`) : ''} 
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', pointerEvents: 'none' }} 
            muted 
            playsInline 
            loop
            autoPlay
            preload="metadata"
            onLoadedData={(e) => {
              try {
                if (e.target.paused) e.target.play().catch(() => {});
              } catch (err) {}
            }}
            onError={() => {
              if (rawUrl && !rawUrl.startsWith('/api/v1/proxy') && rawUrl.startsWith('http')) {
                setSrc(`/api/v1/proxy/image?url=${encodeURIComponent(rawUrl)}`);
              } else if (story?.s3_key_compressed) {
                setSrc(`/api/v1/media/${story.s3_key_compressed}`);
              } else {
                setHasError(true);
              }
            }}
          />
        ) : (
          <img 
            src={src} 
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', pointerEvents: 'none' }} 
            alt="Thumb" 
            loading="lazy" 
            onError={() => {
              if (rawUrl && !rawUrl.startsWith('/api/v1/proxy') && rawUrl.startsWith('http')) {
                setSrc(`/api/v1/proxy/image?url=${encodeURIComponent(rawUrl)}`);
              } else if (story?.s3_key_compressed) {
                setSrc(`/api/v1/media/${story.s3_key_compressed}`);
              } else {
                setHasError(true);
              }
            }}
          />
        )
      ) : (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#141414' }}>
          <ImageIcon size={14} color="#666" />
        </div>
      )}
    </motion.div>
  );
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
      setShowMusicWidget(false)
    }
  }, [isOpen, initialIndex, stories])

  useEffect(() => {
    setProgress(0)
    setIsPaused(false)
    setShowMenu(false)
  }, [currentIndex])

  // Contextual Sub-header (Music / Location) cycling timer
  useEffect(() => {
    const validIdx = currentIndex >= 0 && currentIndex < stories?.length ? currentIndex : 0
    const story = stories?.[validIdx]
    if (story && (story.music || story.music_title) && story.location_name) {
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
        else if (showMusicWidget) setShowMusicWidget(false)
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
  }, [isOpen, currentIndex, stories, showMenu, showMusicWidget])

  // Auto-advance for images (5 seconds)
  useEffect(() => {
    if (!isOpen || isPaused || showMusicWidget || !stories || stories.length === 0) return
    
    const validIdx = currentIndex >= 0 && currentIndex < stories.length ? currentIndex : 0
    const currentStory = stories[validIdx]
    if (!currentStory) return
    
    // If it's an image, advance progress artificially over 5s
    const isVid = currentStory.media_type === 2 || (typeof currentStory.media_url === 'string' && (currentStory.media_url.includes('.mp4') || currentStory.media_url.includes('.mov')));
    if (!isVid) {
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
  }, [isOpen, currentIndex, isPaused, showMusicWidget, stories])

  // Handle video progress and end
  const handleTimeUpdate = () => {
    if (videoRef.current && !showMusicWidget) {
      const p = videoRef.current.currentTime / videoRef.current.duration
      setProgress(p || 0)
    }
  }

  const handleVideoEnded = () => {
    if (!showMusicWidget) {
      handleNext()
    }
  }

  // Play/Pause video when isPaused or showMusicWidget changes
  useEffect(() => {
    if (videoRef.current) {
      if (isPaused || showMusicWidget) {
        videoRef.current.pause()
      } else {
        videoRef.current.play().catch(() => {})
      }
    }
  }, [isPaused, showMusicWidget, currentIndex])

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

  const isVideo = currentStory.media_type === 2 || (typeof currentStory.media_url === 'string' && (currentStory.media_url.includes('.mp4') || currentStory.media_url.includes('.mov')))
  const mediaUrl = currentStory.media_url || currentStory.display_url || currentStory.cover_media_url || (currentStory.s3_key_compressed ? `/media/${currentStory.s3_key_compressed}` : null)
  const trackName = currentStory.music?.track_title || currentStory.music_title
  const artistName = currentStory.music?.artist_name || currentStory.music_artist

  // Canvas Tap Logic
  const handleCanvasClick = (e) => {
    if (e.target.closest('.story-header-overlay') || e.target.closest('.menu-popover')) {
      return
    }
    e.stopPropagation()

    // IF MUSIC WIDGET IS OPEN: clicking canvas restores full story mode
    if (showMusicWidget) {
      setShowMusicWidget(false)
      return
    }

    const rect = e.currentTarget.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const width = rect.width

    if (clickX < width * 0.3) {
      handlePrev()
    } else if (clickX > width * 0.7) {
      handleNext()
    } else {
      setIsPaused(prev => !prev)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            backgroundColor: '#000000',
            display: 'flex',
            flexDirection: 'column',
            userSelect: 'none',
            WebkitTapHighlightColor: 'transparent',
            WebkitTouchCallout: 'none',
            overflow: 'hidden',
          }}
        >
          {/* ── Main Viewing Area ── */}
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'hidden',
            width: '100%',
          }}>
            
            {/* Left Nav Zone (Starts below top header to avoid button overlap) */}
            <div 
              onClick={(e) => { e.stopPropagation(); if (!showMusicWidget) handlePrev(); }}
              style={{
                position: 'absolute', left: 0, top: '75px', bottom: 0, width: '25%', zIndex: 40,
                cursor: 'w-resize', display: 'flex', alignItems: 'center', justifyContent: 'flex-start',
                paddingLeft: '20px', WebkitTapHighlightColor: 'transparent',
              }}
              className="nav-zone group"
            >
              <div className="nav-icon" style={{
                background: 'var(--ios-bg-card, rgba(30,30,30,0.8))',
                border: '1px solid var(--ios-border, rgba(255,255,255,0.15))',
                borderRadius: '50%', padding: '12px', color: 'var(--ios-text-primary, #fff)',
                opacity: 0, transition: 'opacity 0.2s',
                boxShadow: 'var(--ios-shadow-md)'
              }}>
                <ChevronLeft size={28} />
              </div>
            </div>

            {/* Center Story Canvas */}
            <motion.div 
              layout
              animate={{
                scale: showMusicWidget ? 0.65 : 1,
                y: showMusicWidget ? -30 : 0,
              }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              onClick={handleCanvasClick}
              className="ios-story-card"
              style={{
                height: showMusicWidget ? '70%' : '94%',
                maxHeight: '88vh',
                aspectRatio: '9/16',
                background: '#000000',
                borderRadius: '16px',
                overflow: 'hidden',
                position: 'relative',
                cursor: 'pointer',
                boxShadow: '0 16px 48px rgba(0,0,0,0.8)',
                border: '1px solid rgba(255,255,255,0.12)',
                flexShrink: 0,
                WebkitTapHighlightColor: 'transparent',
                outline: 'none',
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
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              ) : (
                <img
                  src={mediaUrl}
                  alt="Story"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  onError={(e) => {
                    if (mediaUrl && !mediaUrl.startsWith('/api/v1/proxy') && mediaUrl.startsWith('http')) {
                      e.target.src = `/api/v1/proxy/image?url=${encodeURIComponent(mediaUrl)}`;
                    }
                  }}
                />
              )}

              {/* AI Tag Overlay */}
              {currentStory.is_ai_generated && (
                <div style={{
                  position: 'absolute', top: '80px', right: '16px', zIndex: 40,
                  background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)',
                  color: '#fff', fontSize: '11px', fontWeight: 700, padding: '4px 10px',
                  borderRadius: '12px', border: '1px solid rgba(255,255,255,0.2)'
                }}>
                  ✨ AI
                </div>
              )}

              {/* Visual PAUSED Indicator (Only shown in full story mode when paused) */}
              {isPaused && !showMusicWidget && (
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  backgroundColor: 'rgba(0,0,0,0.75)',
                  border: '1px solid rgba(255,255,255,0.25)',
                  backdropFilter: 'blur(8px)',
                  color: '#FFFFFF',
                  padding: '8px 18px',
                  borderRadius: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '12px',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  pointerEvents: 'none',
                  zIndex: 50,
                  boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
                }}>
                  <Pause size={14} fill="#FFF" />
                  <span>PAUSED</span>
                </div>
              )}

              {/* Tap to Resume Story Banner when Music Mode is active */}
              {showMusicWidget && (
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundColor: 'rgba(0,0,0,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 45,
                }}>
                  <div style={{
                    backgroundColor: 'rgba(0,0,0,0.75)',
                    padding: '6px 14px',
                    borderRadius: '16px',
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#FFF',
                    letterSpacing: '0.05em',
                  }}>
                    TAP TO ENLARGE STORY
                  </div>
                </div>
              )}

              {/* Overlays (Progress Bars & Header) */}
              <div 
                className="story-header-overlay"
                onClick={(e) => e.stopPropagation()}
                style={{
                  position: 'absolute', top: 0, left: 0, right: 0,
                  padding: '14px 16px', zIndex: 60,
                  background: 'linear-gradient(to bottom, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.25) 60%, transparent 100%)',
                  pointerEvents: 'auto',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                {/* Segmented Progress Bars */}
                <div style={{ display: 'flex', gap: '4px', marginBottom: '10px' }}>
                  {stories.map((s, idx) => {
                    let fill = 0;
                    if (idx < currentIndex) fill = 100;
                    else if (idx === currentIndex) fill = progress * 100;
                    
                    return (
                      <div key={s.id || idx} style={{
                        flex: 1, height: '2.5px', background: 'rgba(255,255,255,0.3)',
                        borderRadius: '2px', overflow: 'hidden'
                      }}>
                        <div style={{
                          height: '100%', background: 'var(--ios-accent, #0050EF)',
                          width: `${fill}%`, transition: (isPaused || showMusicWidget) ? 'none' : 'width 50ms linear'
                        }} />
                      </div>
                    )
                  })}
                </div>

                {/* ── 2-Row Header Layout ── */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', pointerEvents: 'auto' }}>
                  {/* Avatar */}
                  <div style={{
                    width: '38px', height: '38px', borderRadius: '50%',
                    background: 'var(--ios-accent, #0050EF)',
                    padding: '2px', flexShrink: 0,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                  }}>
                     <div style={{
                       width: '100%', height: '100%', borderRadius: '50%',
                       background: 'var(--ios-bg-card, #1c1c1e)',
                       display: 'flex', alignItems: 'center', justifyContent: 'center',
                       color: '#FFF', fontSize: '13px', fontWeight: 800
                     }}>
                       {highlightTitle.charAt(0).toUpperCase()}
                     </div>
                  </div>

                  {/* 2-Row Info Block */}
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px', textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>
                    {/* Row 1: Identity & Close Friends */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ color: '#fff', fontWeight: 700, fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {highlightTitle}
                      </span>
                      {(currentStory.is_close_friends || currentStory.audience === 'close_friends') && (
                        <span style={{
                          backgroundColor: '#00D26A',
                          color: '#FFFFFF',
                          padding: '1px 5px',
                          borderRadius: '2px',
                          fontSize: '9px',
                          fontWeight: 800,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '2px',
                          flexShrink: 0
                        }}>
                          <Star size={8} fill="#FFFFFF" color="#FFFFFF" />
                          <span>CF</span>
                        </span>
                      )}
                      <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px', flexShrink: 0 }}>
                        {currentStory.taken_at ? new Date(currentStory.taken_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                      </span>
                    </div>

                    {/* Row 2: Contextual Metadata (Music / Location) */}
                    {(trackName || currentStory.location_name) && (
                      <AnimatePresence mode="wait">
                        <motion.div 
                          key={contextDisplayMode}
                          initial={{ opacity: 0, y: 3 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -3 }}
                          transition={{ duration: 0.18 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (trackName) setShowMusicWidget(prev => !prev);
                          }}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '4px',
                            color: '#fff', fontSize: '12px', fontWeight: 500,
                            cursor: trackName ? 'pointer' : 'default',
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                          }}
                          title={trackName ? "Click to toggle music turntable" : ""}
                        >
                          {contextDisplayMode === 'location' || (!trackName && currentStory.location_name) ? (
                            <>
                              <MapPin size={12} color="var(--ios-accent, #0050EF)" />
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{currentStory.location_name}</span>
                            </>
                          ) : (
                            <>
                              <LiveMovingWaveform isPlaying={!isPaused && !showMusicWidget} />
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {trackName} {artistName ? ` · ${artistName}` : ''}
                              </span>
                            </>
                          )}
                        </motion.div>
                      </AnimatePresence>
                    )}
                  </div>
                  
                  {/* Controls (Generous 44px hitboxes, stops propagation) */}
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', position: 'relative' }}>
                    <button 
                      onClick={(e) => { e.stopPropagation(); e.preventDefault(); setShowMenu(prev => !prev); }} 
                      style={{
                        background: 'rgba(0,0,0,0.55)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '50%',
                        width: '38px',
                        height: '38px',
                        minWidth: '38px',
                        minHeight: '38px',
                        color: '#fff',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        pointerEvents: 'auto',
                        zIndex: 100,
                        WebkitTapHighlightColor: 'transparent',
                      }}
                      title="Story Options"
                    >
                      <MoreHorizontal size={18} />
                    </button>
                    
                    <button 
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        e.preventDefault(); 
                        onClose(); 
                      }} 
                      style={{
                        background: 'rgba(0,0,0,0.55)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '50%',
                        width: '38px',
                        height: '38px',
                        minWidth: '38px',
                        minHeight: '38px',
                        color: '#fff',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        pointerEvents: 'auto',
                        zIndex: 100,
                        WebkitTapHighlightColor: 'transparent',
                      }}
                      title="Close"
                    >
                      <X size={18} />
                    </button>

                    {/* ── Popover Menu ── */}
                    <AnimatePresence>
                      {showMenu && (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.88, y: -8 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.88, y: -8 }}
                          transition={{ type: 'spring', stiffness: 450, damping: 28 }}
                          onClick={(e) => e.stopPropagation()}
                          className="ios-card menu-popover"
                          style={{
                            position: 'absolute', top: '46px', right: 0, zIndex: 200,
                            backgroundColor: 'var(--ios-bg-card, #1c1c1e)',
                            border: '1px solid rgba(255,255,255,0.18)',
                            borderRadius: '16px',
                            width: '230px', padding: '6px',
                            boxShadow: '0 10px 30px rgba(0,0,0,0.8)',
                            display: 'flex', flexDirection: 'column', gap: '2px', transformOrigin: 'top right'
                          }}
                        >
                          <button 
                            onClick={handleOpenInstagram}
                            style={{
                              background: 'transparent', border: 'none',
                              color: 'var(--ios-text-primary, #fff)',
                              padding: '10px 12px', borderRadius: '10px', display: 'flex',
                              alignItems: 'center', gap: '10px', fontSize: '13px', fontWeight: 600,
                              cursor: 'pointer', textAlign: 'left',
                              transition: 'background 0.15s'
                            }}
                          >
                            <ExternalLink size={16} color="var(--ios-accent, #0050EF)" /> Open on Instagram
                          </button>

                          {trackName && (
                            <button 
                              onClick={() => { setShowMusicWidget(prev => !prev); setShowMenu(false); }}
                              style={{
                                background: 'transparent', border: 'none',
                                color: 'var(--ios-text-primary, #fff)',
                                padding: '10px 12px', borderRadius: '10px', display: 'flex',
                                alignItems: 'center', gap: '10px', fontSize: '13px', fontWeight: 600,
                                cursor: 'pointer', textAlign: 'left',
                                transition: 'background 0.15s'
                              }}
                            >
                              <MusicIcon size={16} color="#0050EF" /> {showMusicWidget ? 'Hide Music Turntable' : 'Show Music Turntable'}
                            </button>
                          )}

                          {currentStory.location_name && (
                            <button 
                              onClick={() => { setContextDisplayMode('location'); setShowMenu(false); }}
                              style={{
                                background: 'transparent', border: 'none',
                                color: 'var(--ios-text-primary, #fff)',
                                padding: '10px 12px', borderRadius: '10px', display: 'flex',
                                alignItems: 'center', gap: '10px', fontSize: '13px', fontWeight: 600,
                                cursor: 'pointer', textAlign: 'left',
                                transition: 'background 0.15s'
                              }}
                            >
                              <MapPin size={16} color="#ff3b30" /> Location: {currentStory.location_name}
                            </button>
                          )}

                          <button 
                            onClick={handleLocateFile}
                            style={{
                              background: 'transparent', border: 'none',
                              color: 'var(--ios-text-primary, #fff)',
                              padding: '10px 12px', borderRadius: '10px', display: 'flex',
                              alignItems: 'center', gap: '10px', fontSize: '13px', fontWeight: 600,
                              cursor: 'pointer', textAlign: 'left',
                              transition: 'background 0.15s'
                            }}
                          >
                            <Folder size={16} color="var(--ios-accent, #0050EF)" /> Reveal Media File
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Right Nav Zone (Starts below header to avoid X button collision) */}
            <div 
              onClick={(e) => { e.stopPropagation(); if (!showMusicWidget) handleNext(); }}
              style={{
                position: 'absolute', right: 0, top: '75px', bottom: 0, width: '25%', zIndex: 40,
                cursor: 'e-resize', display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
                paddingRight: '20px', WebkitTapHighlightColor: 'transparent',
              }}
              className="nav-zone group"
            >
               <div className="nav-icon" style={{
                background: 'var(--ios-bg-card, rgba(30,30,30,0.8))',
                border: '1px solid var(--ios-border, rgba(255,255,255,0.15))',
                borderRadius: '50%', padding: '12px', color: 'var(--ios-text-primary, #fff)',
                opacity: 0, transition: 'opacity 0.2s',
                boxShadow: 'var(--ios-shadow-md)'
              }}>
                <ChevronRight size={28} />
              </div>
            </div>

            {/* ── Music Turntable Emerges From Behind Below Story ── */}
            <AnimatePresence>
              {showMusicWidget && (
                <motion.div 
                  initial={{ y: 90, opacity: 0, scale: 0.94 }}
                  animate={{ y: 0, opacity: 1, scale: 1 }}
                  exit={{ y: 90, opacity: 0, scale: 0.94 }}
                  transition={{ type: 'spring', stiffness: 340, damping: 28 }}
                  style={{
                    position: 'absolute',
                    bottom: '12px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 90,
                    width: '92%',
                    maxWidth: '380px',
                    boxShadow: '0 16px 48px rgba(0,0,0,0.95)',
                    borderRadius: '16px',
                    overflow: 'hidden',
                  }}
                >
                  <div style={{ position: 'relative' }}>
                    <button
                      onClick={() => setShowMusicWidget(false)}
                      style={{
                        position: 'absolute',
                        top: '10px',
                        right: '10px',
                        background: 'rgba(0,0,0,0.65)',
                        border: 'none',
                        color: '#FFF',
                        borderRadius: '50%',
                        width: '26px',
                        height: '26px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        zIndex: 130
                      }}
                      title="Close Music Panel"
                    >
                      <X size={14} />
                    </button>
                    <MusicPlayer 
                      music={currentStory.music || { track_title: trackName || 'Archived Story Track', artist_name: artistName || highlightTitle }} 
                      onPlayStateChange={(isMusicPlaying) => {
                        if (isMusicPlaying) {
                          setIsPaused(true);
                          if (videoRef.current) {
                            videoRef.current.pause();
                            videoRef.current.muted = true;
                          }
                        }
                      }}
                      onExternalOpen={() => {
                        setIsPaused(true);
                        if (videoRef.current) {
                          videoRef.current.pause();
                          videoRef.current.muted = true;
                        }
                      }}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── Bottom Filmstrip (Thumbnail Scrubber) — Slides away when music is shown ── */}
          <AnimatePresence>
            {!showMusicWidget && (
              <motion.div 
                initial={{ y: 80, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 80, opacity: 0 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                style={{
                  height: '84px',
                  backgroundColor: '#111113',
                  borderTop: '1px solid rgba(255,255,255,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px',
                  overflowX: 'auto', gap: '8px',
                  WebkitTapHighlightColor: 'transparent',
                  userSelect: 'none',
                  zIndex: 50,
                }} 
                className="hide-scrollbar"
              >
                {stories.map((story, idx) => (
                  <StoryThumbnail
                    key={story.id || idx}
                    story={story}
                    isActive={idx === currentIndex}
                    onClick={() => setCurrentIndex(idx)}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
          
          <style>{`
            * {
              -webkit-tap-highlight-color: transparent !important;
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
        </motion.div>
      )}
    </AnimatePresence>
  )
}
