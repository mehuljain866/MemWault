import React from 'react'

/**
 * Helper to generate the CSS styles for an Instagram sticker based on its manifest coordinates.
 * Instagram API coordinates (x, y) represent the CENTER of the sticker.
 * x, y, width, height are normalized (0.0 to 1.0).
 * rotation is in degrees (sometimes radians, but usually degrees, we'll handle standard degrees here).
 */
const getStickerStyle = (layer) => {
  const { x, y, width, height, rotation, z_index } = layer.transform || {}
  
  if (x == null || y == null) return { display: 'none' }

  return {
    position: 'absolute',
    left: `${x * 100}%`,
    top: `${y * 100}%`,
    width: width ? `${width * 100}%` : 'auto',
    height: height ? `${height * 100}%` : 'auto',
    transform: `translate(-50%, -50%) rotate(${rotation || 0}deg)`,
    zIndex: z_index || 10,
    pointerEvents: 'none', // Let clicks pass through to the player if needed
  }
}

// ── Mentions ───────────────────────────────────────────────
export const MentionSticker = ({ layer }) => {
  return (
    <div
      style={{
        ...getStickerStyle(layer),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0.2rem 0.8rem',
        background: 'rgba(255, 255, 255, 0.9)',
        color: '#000',
        borderRadius: '8px',
        fontWeight: 'bold',
        fontSize: 'clamp(0.8rem, 2vw, 1.2rem)',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        whiteSpace: 'nowrap',
      }}
    >
      @{layer.username}
    </div>
  )
}

// ── Locations ──────────────────────────────────────────────
export const LocationSticker = ({ layer }) => {
  const locationName = layer.data?.location_name || 'Location'
  return (
    <div
      style={{
        ...getStickerStyle(layer),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0.4rem 1rem',
        background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
        color: '#fff',
        borderRadius: '12px',
        fontWeight: 'bold',
        fontSize: 'clamp(0.8rem, 2vw, 1.2rem)',
        boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
        textAlign: 'center',
      }}
    >
      📍 {locationName}
    </div>
  )
}

// ── Music ──────────────────────────────────────────────────
export const MusicSticker = ({ story }) => {
  // Music is often stored in the story.music object, and sometimes in the manifest.
  // We'll use the story.music object to render a nice player-like widget.
  if (!story.music) return null

  // If there's no specific sticker coordinates for music, we can place it at the top or bottom
  // But let's try to see if there's a music sticker in the manifest layers
  const manifestLayers = story.manifest?.layers || []
  const musicLayer = manifestLayers.find(l => l.sticker_type === 'music')
  
  let style = {}
  if (musicLayer && musicLayer.transform?.x != null) {
    style = getStickerStyle(musicLayer)
  } else {
    // Default fallback position if no coordinates
    style = {
      position: 'absolute',
      bottom: '10%',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 20,
    }
  }

  return (
    <div
      style={{
        ...style,
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.4rem 0.8rem',
        background: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(10px)',
        color: '#fff',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        maxWidth: '80%',
      }}
    >
      {story.music.cover_art_url ? (
        <img 
          src={story.music.cover_art_url} 
          alt="Album Art" 
          style={{ width: 32, height: 32, borderRadius: '4px', objectFit: 'cover' }}
        />
      ) : (
        <span style={{ fontSize: '1.2rem' }}>🎵</span>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 'bold', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
          {story.music.track_title}
        </span>
        <span style={{ fontSize: '0.65rem', opacity: 0.8, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
          {story.music.artist_name}
        </span>
      </div>
    </div>
  )
}

// ── Hashtags ───────────────────────────────────────────────
export const HashtagSticker = ({ layer }) => {
  const tag = layer.data?.hashtag || 'hashtag'
  return (
    <div
      style={{
        ...getStickerStyle(layer),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0.2rem 0.8rem',
        background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
        color: '#fff',
        borderRadius: '8px',
        fontWeight: 'bold',
        fontSize: 'clamp(0.8rem, 2vw, 1.2rem)',
        boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
      }}
    >
      #{tag}
    </div>
  )
}

// ── Generic / Fallback Sticker ─────────────────────────────
export const GenericSticker = ({ layer }) => {
  return (
    <div
      style={{
        ...getStickerStyle(layer),
        border: '1px dashed rgba(255,255,255,0.5)',
        background: 'rgba(0,0,0,0.2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontSize: '0.7rem',
      }}
      title={layer.sticker_type}
    >
      {/* Invisible or barely visible box for debugging */}
    </div>
  )
}

// ── Text Sticker ───────────────────────────────────────────
export const TextSticker = ({ layer }) => {
  const text = layer.sticker_data?.text || layer.data?.text || ''
  const textColor = layer.sticker_data?.text_color || '#ffffff'
  const textBg = layer.sticker_data?.text_background_color || 'transparent'
  
  if (!text) return null

  return (
    <div
      style={{
        ...getStickerStyle(layer),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: textColor,
        backgroundColor: textBg,
        padding: textBg !== 'transparent' ? '0.5rem 1rem' : '0',
        borderRadius: textBg !== 'transparent' ? '8px' : '0',
        fontWeight: 'bold',
        fontSize: 'clamp(1rem, 4vw, 2.5rem)',
        textAlign: 'center',
        textShadow: textBg === 'transparent' ? '1px 1px 4px rgba(0,0,0,0.8)' : 'none',
        whiteSpace: 'pre-wrap',
        lineHeight: 1.2,
      }}
    >
      {text}
    </div>
  )
}
