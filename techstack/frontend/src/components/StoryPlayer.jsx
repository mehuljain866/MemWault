import React, { useRef, useState, useEffect } from 'react'
import { Maximize } from 'lucide-react'
import { getSettings } from '../services/settings'
import {
  MentionSticker,
  LocationSticker,
  MusicSticker,
  HashtagSticker,
  GenericSticker,
  TextSticker
} from './StoryOverlays'

const VideoScrubber = ({ videoSrc, duration, progress, onScrub, onPlay, onPause }) => {
  const [hoverTime, setHoverTime] = useState(null);
  const [hoverX, setHoverX] = useState(0);
  const hiddenVideoRef = useRef(null);
  const canvasRef = useRef(null);
  const trackRef = useRef(null);
  const [thumbnailSrc, setThumbnailSrc] = useState(null);
  const hoverTimeRef = useRef(null);

  const handleMouseMove = (e) => {
    if (!trackRef.current || duration <= 0) return;
    const rect = trackRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const percentage = x / rect.width;
    const time = percentage * duration;
    setHoverTime(time);
    setHoverX(x);
    hoverTimeRef.current = time;
  };

  const handleMouseLeave = () => {
    setHoverTime(null);
    hoverTimeRef.current = null;
  };

  useEffect(() => {
    const video = hiddenVideoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const handleSeeked = () => {
      try {
        const ctx = canvas.getContext('2d');
        canvas.width = 90;
        canvas.height = 160;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        setThumbnailSrc(canvas.toDataURL());
      } catch (err) {
        console.error("Canvas thumbnail error (CORS):", err);
      }
    };

    video.addEventListener('seeked', handleSeeked);
    return () => video.removeEventListener('seeked', handleSeeked);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (hiddenVideoRef.current && hoverTimeRef.current !== null) {
        if (Math.abs(hiddenVideoRef.current.currentTime - hoverTimeRef.current) > 0.1) {
          hiddenVideoRef.current.currentTime = hoverTimeRef.current;
        }
      }
    }, 150);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center' }}>
      {hoverTime !== null && thumbnailSrc && (
        <div style={{
          position: 'absolute',
          bottom: '30px',
          left: hoverX,
          transform: 'translateX(-50%)',
          width: '90px',
          height: '160px',
          backgroundColor: '#000',
          borderRadius: '8px',
          border: '2px solid white',
          overflow: 'hidden',
          zIndex: 40,
          pointerEvents: 'none',
          boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
        }}>
          <img src={thumbnailSrc} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <div style={{ position: 'absolute', bottom: '4px', left: 0, right: 0, textAlign: 'center', color: 'white', fontSize: '12px', fontWeight: 600, textShadow: '0 1px 4px black' }}>
            {Math.floor(hoverTime / 60)}:{Math.floor(hoverTime % 60).toString().padStart(2, '0')}
          </div>
        </div>
      )}
      
      <video 
        ref={hiddenVideoRef} 
        src={videoSrc} 
        style={{ display: 'none' }} 
        muted 
        playsInline 
        crossOrigin="anonymous" 
      />
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      <div 
        ref={trackRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{ width: '100%', height: '24px', display: 'flex', alignItems: 'center', position: 'relative', cursor: 'pointer' }}
      >
        <input 
          type="range"
          min="0"
          max={duration || 1}
          step="0.01"
          value={progress}
          onChange={onScrub}
          onPointerDown={onPause}
          onPointerUp={onPlay}
          style={{ 
            width: '100%',
            cursor: 'pointer',
            accentColor: 'white',
            height: '4px',
            outline: 'none',
            WebkitAppearance: 'none',
            background: 'rgba(255, 255, 255, 0.3)',
            borderRadius: '2px',
            position: 'absolute',
            zIndex: 10
          }}
        />
      </div>
    </div>
  );
};


/**
 * StoryPlayer reconstructs an Instagram story on a 9:16 canvas.
 * It renders the base media (image/video) and overlays stickers exactly
 * where they appeared using the layout manifest.
 */
export default function StoryPlayer({ story, isMusicPlaying }) {
  const containerRef = useRef(null)
  const videoRef = useRef(null)
  const timerRef = useRef(null)
  
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)

  useEffect(() => {
    if (isMusicPlaying && isPlaying && videoRef.current) {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  }, [isMusicPlaying, isPlaying]);

  useEffect(() => {
    if (!videoRef.current || !story) return;
    const settings = getSettings();
    const delay = settings.autoplayDelay;
    
    if (delay === -1) {
      // Disabled
      setIsPlaying(false);
    } else if (delay === 0) {
      // Instant
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    } else {
      // Delay
      timerRef.current = setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
        }
      }, delay * 1000);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    }
  }, [story]);

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setProgress(videoRef.current.currentTime)
    }
  }

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration)
    }
  }

  const handleScrub = (e) => {
    const newTime = parseFloat(e.target.value)
    if (videoRef.current) {
      videoRef.current.currentTime = newTime
      setProgress(newTime)
    }
  }

  // Toggle video play/pause on click
  const togglePlay = () => {
    if (!videoRef.current) return
    if (timerRef.current) clearTimeout(timerRef.current)

    if (isPlaying) {
      videoRef.current.pause()
    } else {
      videoRef.current.play()
    }
    setIsPlaying(!isPlaying)
  }

  if (!story) return null

  const isVideo = story.media_type === 2
  
  // Combine all layers from mentions, stickers, etc since the backend returns them separate now
  // We'll merge them into a standard layer format
  const allLayers = []
  
  if (story.mentions) {
    story.mentions.forEach(m => allLayers.push({ type: 'mention', ...m, transform: m }))
  }
  if (story.stickers) {
    story.stickers.forEach(s => allLayers.push({ type: 'sticker', ...s, transform: s }))
  }
  if (story.polls) {
    story.polls.forEach(p => allLayers.push({ type: 'poll', ...p, transform: p }))
  }

  return (
    <div 
      className="ios-story-player" 
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: '450px', // Standard mobile max width
        margin: '0 auto',
        aspectRatio: '9 / 16',
        backgroundColor: '#000',
        borderRadius: '16px',
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
      }}
    >
      {/* ── Base Media Layer ────────────────────────────────────── */}
      <div 
        style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          zIndex: 1,
        }}
        onClick={togglePlay}
      >
        {isVideo ? (
          <video
            key={`vid_${story.media_url}`}
            ref={videoRef}
            src={story.media_url}
            style={{ width: '100%', height: '100%', objectFit: 'contain', backgroundColor: '#000' }}
            loop
            playsInline
            controls={false}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
          />
        ) : (
          <img
            key={`img_${story.media_url}`}
            src={story.media_url}
            alt="Story background"
            style={{ width: '100%', height: '100%', objectFit: 'contain', backgroundColor: '#000' }}
          />
        )}
      </div>

      {/* ── Sticker & Mention Overlays ──────────────────────────── */}
      <div 
        style={{ 
          position: 'absolute', 
          top: 0, left: 0, right: 0, bottom: 0, 
          zIndex: 10,
          pointerEvents: 'none' // Let clicks pass to the video for pause/play
        }}
      >
        {allLayers.map((layer, idx) => {
          if (layer.type === 'mention') {
            return <MentionSticker key={idx} layer={layer} />
          }
          if (layer.type === 'sticker') {
            if (layer.sticker_type === 'location') {
              return <LocationSticker key={idx} layer={layer} />
            }
            if (layer.sticker_type === 'hashtag') {
              return <HashtagSticker key={idx} layer={layer} />
            }
            if (layer.sticker_type === 'text') {
              return <TextSticker key={idx} layer={layer} />
            }
            // For other known stickers, we could add specific renderers here.
            // return <GenericSticker key={idx} layer={layer} />
          }
          return null
        })}

        {/* Render music separately if available, since sometimes it lacks coordinate data - REMOVED per user request */}
      </div>

      {/* ── UI Controls Overlay (Play/Pause Indicator) ──────────── */}
      {isVideo && !isPlaying && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 20,
          width: '64px',
          height: '64px',
          backgroundColor: 'rgba(0,0,0,0.5)',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: '2rem',
          pointerEvents: 'none',
        }}>
          ▶
        </div>
      )}

      {/* ── Scrub Timeline (Video Only) ─────────── */}
      {isVideo && duration > 0 && (
        <div style={{
          position: 'absolute',
          bottom: '24px',
          left: '16px',
          right: '16px',
          zIndex: 30,
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <VideoScrubber 
            videoSrc={story.media_url}
            duration={duration}
            progress={progress}
            onScrub={handleScrub}
            onPause={() => {
              if (videoRef.current && isPlaying) videoRef.current.pause();
            }}
            onPlay={() => {
              if (videoRef.current && isPlaying) videoRef.current.play();
            }}
          />
          <button 
            onClick={(e) => {
              e.stopPropagation();
              if (containerRef.current) {
                if (document.fullscreenElement) {
                  document.exitFullscreen();
                } else {
                  containerRef.current.requestFullscreen();
                }
              }
            }}
            style={{
              background: 'rgba(0,0,0,0.5)', border: 'none', color: 'white', borderRadius: '50%',
              width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', flexShrink: 0
            }}
          >
            <Maximize size={16} />
          </button>
        </div>
      )}

      {!isVideo && (
        <div style={{ position: 'absolute', bottom: '24px', right: '16px', zIndex: 30 }}>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              if (containerRef.current) {
                if (document.fullscreenElement) {
                  document.exitFullscreen();
                } else {
                  containerRef.current.requestFullscreen();
                }
              }
            }}
            style={{
              background: 'rgba(0,0,0,0.5)', border: 'none', color: 'white', borderRadius: '50%',
              width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', flexShrink: 0
            }}
          >
            <Maximize size={16} />
          </button>
        </div>
      )}
    </div>
  )
}
