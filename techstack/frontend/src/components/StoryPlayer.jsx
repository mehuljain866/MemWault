import React, { useRef, useState, useEffect } from 'react'
import {
  MentionSticker,
  LocationSticker,
  MusicSticker,
  HashtagSticker,
  GenericSticker,
  TextSticker
} from './StoryOverlays'

/**
 * StoryPlayer reconstructs an Instagram story on a 9:16 canvas.
 * It renders the base media (image/video) and overlays stickers exactly
 * where they appeared using the layout manifest.
 */
export default function StoryPlayer({ story }) {
  const containerRef = useRef(null)
  const videoRef = useRef(null)
  const [isPlaying, setIsPlaying] = useState(true)

  // Toggle video play/pause on click
  const togglePlay = () => {
    if (!videoRef.current) return
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
      className="sv-story-player" 
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
            ref={videoRef}
            src={story.media_url}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            autoPlay
            loop
            playsInline
            controls={false}
          />
        ) : (
          <img
            src={story.media_url}
            alt="Story background"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
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

        {/* Render music separately if available, since sometimes it lacks coordinate data */}
        <MusicSticker story={story} />
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
    </div>
  )
}
