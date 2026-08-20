import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ChevronLeft, ChevronRight, Layers, Sparkles, 
  Maximize2, Play, Pause, Volume2, VolumeX, 
  RotateCcw, Disc, Eye, Check, ExternalLink, Image as ImageIcon
} from 'lucide-react'

export default function CarouselPlayer({ post, activeIndex = 0, onIndexChange, onVersionToggle }) {
  const mediaItems = post?.media_items || []
  const [currentIndex, setCurrentIndex] = useState(activeIndex)
  const currentMedia = mediaItems[currentIndex] || mediaItems[0]

  // Version toggle: 'raw' or 'instagram'
  const [activeVersion, setActiveVersion] = useState(currentMedia?.default_version || (currentMedia?.has_raw_master ? 'raw' : 'instagram'))

  // Live photo playback state
  const [isPlayingLive, setIsPlayingLive] = useState(false)
  const liveVideoRef = useRef(null)

  // Zoom & Pan state
  const [scale, setScale] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const dragStartRef = useRef({ x: 0, y: 0 })
  const containerRef = useRef(null)

  // Video playback for video slides
  const [isVideoPlaying, setIsVideoPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(true)
  const videoRef = useRef(null)

  useEffect(() => {
    setCurrentIndex(activeIndex)
  }, [activeIndex])

  useEffect(() => {
    if (onIndexChange) onIndexChange(currentIndex)
    // Reset zoom on slide change
    setScale(1)
    setPosition({ x: 0, y: 0 })
    setIsPlayingLive(false)
    setIsVideoPlaying(false)
    const media = mediaItems[currentIndex]
    // Always default to Higher Quality uncompressed RAW if available
    setActiveVersion(media?.has_raw_master ? 'raw' : 'instagram')
  }, [currentIndex])

  const nextSlide = (e) => {
    e?.stopPropagation()
    if (currentIndex < mediaItems.length - 1) {
      setCurrentIndex(prev => prev + 1)
    }
  }

  const prevSlide = (e) => {
    e?.stopPropagation()
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1)
    }
  }

  // Keyboard arrow keys
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight') nextSlide()
      if (e.key === 'ArrowLeft') prevSlide()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentIndex, mediaItems.length])

  // Non-passive wheel and pinch-to-zoom listener to strictly prevent browser page zoom
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleWheelNative = (e) => {
      if (currentMedia?.media_type === 2) return // skip video slides
      // Stop native browser page zoom completely
      e.preventDefault()
      e.stopPropagation()
      
      const zoomFactor = e.ctrlKey ? -e.deltaY * 0.015 : -e.deltaY * 0.002
      setScale(prev => {
        const newScale = Math.min(Math.max(prev + zoomFactor, 1), 5)
        if (newScale === 1) setPosition({ x: 0, y: 0 })
        return newScale
      })
    }

    container.addEventListener('wheel', handleWheelNative, { passive: false })
    return () => {
      container.removeEventListener('wheel', handleWheelNative)
    }
  }, [currentMedia])

  // Double-click zoom
  const handleDoubleClick = (e) => {
    if (currentMedia?.media_type === 2) return
    if (scale > 1) {
      setScale(1)
      setPosition({ x: 0, y: 0 })
    } else {
      setScale(2.5)
    }
  }

  // Pan dragging when zoomed
  const handleMouseDown = (e) => {
    if (scale > 1) {
      setIsDragging(true)
      dragStartRef.current = { x: e.clientX - position.x, y: e.clientY - position.y }
    }
  }

  const handleMouseMove = (e) => {
    if (isDragging && scale > 1) {
      setPosition({
        x: e.clientX - dragStartRef.current.x,
        y: e.clientY - dragStartRef.current.y
      })
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  // Live photo hold-to-play
  const startLivePhoto = (e) => {
    e?.stopPropagation()
    if (currentMedia?.is_live_photo && currentMedia?.live_video_url) {
      setIsPlayingLive(true)
      if (liveVideoRef.current) {
        liveVideoRef.current.currentTime = 0
        liveVideoRef.current.play().catch(() => {})
      }
    }
  }

  const stopLivePhoto = () => {
    if (isPlayingLive) {
      setIsPlayingLive(false)
      if (liveVideoRef.current) {
        liveVideoRef.current.pause()
      }
    }
  }

  // Toggle RAW vs Instagram version
  const toggleVersion = (e) => {
    e?.stopPropagation()
    if (!currentMedia?.has_raw_master) return
    const newVer = activeVersion === 'raw' ? 'instagram' : 'raw'
    setActiveVersion(newVer)
    if (onVersionToggle) onVersionToggle(currentMedia.id, newVer)
  }

  if (!currentMedia) return null

  // Determine active media URL
  const isVideo = currentMedia.media_type === 2
  const activeMediaUrl = (activeVersion === 'raw' && currentMedia.raw_media_url)
    ? currentMedia.raw_media_url
    : (currentMedia.instagram_media_url || `/api/v1/proxy/image?url=${encodeURIComponent(currentMedia.instagram_cdn_url || '')}`)

  return (
    <div 
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onDoubleClick={handleDoubleClick}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        backgroundColor: '#000',
        borderRadius: '20px',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        userSelect: 'none',
        cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
      }}
    >
      {/* -- Top Left: Live Photo / Motion Badge ------------------ */}
      {currentMedia.is_live_photo && (
        <button
          onMouseDown={startLivePhoto}
          onMouseUp={stopLivePhoto}
          onMouseLeave={stopLivePhoto}
          onTouchStart={startLivePhoto}
          onTouchEnd={stopLivePhoto}
          style={{
            position: 'absolute', top: '16px', left: '16px', zIndex: 30,
            display: 'flex', alignItems: 'center', gap: '6px',
            backgroundColor: isPlayingLive ? '#007aff' : 'rgba(0,0,0,0.65)',
            color: '#fff', border: '1px solid rgba(255,255,255,0.2)',
            padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 700,
            backdropFilter: 'blur(8px)', cursor: 'pointer', transition: 'all 0.2s',
          }}
          title="Click and hold to play Motion / Live Photo"
        >
          <Disc size={15} className={isPlayingLive ? 'spin-anim' : ''} />
          <span>LIVE</span>
        </button>
      )}

      {/* -- Top Right: Dual-Version Switcher & Slide Counter ----- */}
      <div style={{ position: 'absolute', top: '16px', right: '16px', zIndex: 30, display: 'flex', alignItems: 'center', gap: '8px' }}>
        {currentMedia.has_raw_master && (
          <button
            onClick={toggleVersion}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              backgroundColor: activeVersion === 'raw' ? 'rgba(255, 215, 0, 0.2)' : 'rgba(0,0,0,0.65)',
              color: activeVersion === 'raw' ? '#ffd700' : '#fff',
              border: activeVersion === 'raw' ? '1px solid #ffd700' : '1px solid rgba(255,255,255,0.2)',
              padding: '6px 12px', borderRadius: '18px', fontSize: '12px', fontWeight: 700,
              backdropFilter: 'blur(8px)', cursor: 'pointer', transition: 'all 0.2s',
            }}
            title="Toggle between High Quality (Original) and Instagram Processed version"
          >
            {activeVersion === 'raw' ? <Sparkles size={14} color="#ffd700" /> : <Layers size={14} />}
            <span>{activeVersion === 'raw' ? 'High Quality (Original)' : 'Instagram (1080p)'}</span>
          </button>
        )}

        {mediaItems.length > 1 && (
          <div style={{
            backgroundColor: 'rgba(0,0,0,0.65)', color: '#fff',
            padding: '6px 12px', borderRadius: '18px', fontSize: '12px', fontWeight: 700,
            backdropFilter: 'blur(8px)',
          }}>
            {currentIndex + 1}/{mediaItems.length}
          </div>
        )}
      </div>

      {/* -- Media Rendering with Transform ------------------------ */}
      <div
        style={{
          width: '100%', height: '100%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
          transition: isDragging ? 'none' : 'transform 0.15s ease-out',
        }}
      >
        {isVideo ? (
          <video
            key={`vid_${activeMediaUrl}`}
            ref={videoRef}
            src={activeMediaUrl}
            loop
            muted={isMuted}
            playsInline
            autoPlay
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          />
        ) : (
          <>
            {/* Live Video Companion Overlay */}
            {currentMedia.is_live_photo && currentMedia.live_video_url && (
              <video
                ref={liveVideoRef}
                src={currentMedia.live_video_url}
                playsInline
                muted={false}
                style={{
                  position: 'absolute', inset: 0, width: '100%', height: '100%',
                  objectFit: 'contain', display: isPlayingLive ? 'block' : 'none',
                  zIndex: 2,
                }}
              />
            )}
            <img
              key={`img_${activeMediaUrl}`}
              src={activeMediaUrl}
              alt={`Slide ${currentIndex + 1}`}
              referrerPolicy="no-referrer"
              style={{
                width: '100%', height: '100%',
                objectFit: 'contain',
                display: isPlayingLive ? 'none' : 'block',
              }}
            />
          </>
        )}
      </div>

      {/* -- Zoom Reset Pill (when scaled) ------------------------- */}
      {scale > 1 && (
        <button
          onClick={() => { setScale(1); setPosition({ x: 0, y: 0 }); }}
          style={{
            position: 'absolute', bottom: '20px', zIndex: 30,
            backgroundColor: 'rgba(0,0,0,0.75)', color: '#fff',
            border: '1px solid rgba(255,255,255,0.2)', padding: '6px 14px',
            borderRadius: '20px', fontSize: '12px', fontWeight: 600,
            backdropFilter: 'blur(8px)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
          }}
        >
          <RotateCcw size={13} />
          <span>{Math.round(scale * 100)}% Reset</span>
        </button>
      )}

      {/* -- Navigation Arrows ------------------------------------- */}
      {mediaItems.length > 1 && currentIndex > 0 && (
        <button
          onClick={prevSlide}
          style={{
            position: 'absolute', left: '16px', zIndex: 25,
            width: '40px', height: '40px', borderRadius: '50%',
            backgroundColor: 'rgba(0,0,0,0.5)', color: '#fff',
            border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', backdropFilter: 'blur(4px)', transition: 'background 0.2s',
          }}
        >
          <ChevronLeft size={24} />
        </button>
      )}

      {mediaItems.length > 1 && currentIndex < mediaItems.length - 1 && (
        <button
          onClick={nextSlide}
          style={{
            position: 'absolute', right: '16px', zIndex: 25,
            width: '40px', height: '40px', borderRadius: '50%',
            backgroundColor: 'rgba(0,0,0,0.5)', color: '#fff',
            border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', backdropFilter: 'blur(4px)', transition: 'background 0.2s',
          }}
        >
          <ChevronRight size={24} />
        </button>
      )}

      {/* -- Pagination Dots --------------------------------------- */}
      {mediaItems.length > 1 && scale === 1 && (
        <div style={{
          position: 'absolute', bottom: '16px', zIndex: 20,
          display: 'flex', alignItems: 'center', gap: '6px',
        }}>
          {mediaItems.map((_, idx) => (
            <div
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              style={{
                width: currentIndex === idx ? '8px' : '6px',
                height: currentIndex === idx ? '8px' : '6px',
                borderRadius: '50%',
                backgroundColor: currentIndex === idx ? '#007aff' : 'rgba(255,255,255,0.4)',
                cursor: 'pointer', transition: 'all 0.2s',
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
