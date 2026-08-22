import React, { useState, useEffect, useRef } from 'react';
import { getSettings } from '../services/settings';
import { Rewind, FastForward, Play, Pause, Music as MusicIcon, Disc3 } from 'lucide-react';

/**
 * Animated Turntable Artwork Component
 * Replaces the album cover with a realistic rotating circular vinyl disc,
 * metallic turntable platter rim, vinyl grooves, center label art, and mechanical tonearm.
 */
function TurntableArtwork({ artworkUrl, isPlaying, onTogglePlay, size = 64 }) {
  return (
    <div
      onClick={onTogglePlay}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        minWidth: `${size}px`,
        minHeight: `${size}px`,
        aspectRatio: '1 / 1',
        position: 'relative',
        cursor: 'pointer',
        flexShrink: 0,
        borderRadius: '50%',
        boxShadow: '0 4px 14px rgba(0,0,0,0.6), inset 0 0 0 2px rgba(255,255,255,0.18)',
        backgroundColor: '#0a0a0a',
        userSelect: 'none',
      }}
      title={isPlaying ? "Tap to Pause" : "Tap to Play Turntable"}
    >
      {/* Spinning Vinyl Disc with Grooves */}
      <div
        style={{
          width: '100%',
          height: '100%',
          borderRadius: '50%',
          aspectRatio: '1 / 1',
          background: `
            radial-gradient(circle at center,
              #111 0%,
              #111 26%,
              #222 28%,
              #111 31%,
              #1c1c1c 40%,
              #0d0d0d 50%,
              #222 55%,
              #111 60%,
              #1c1c1c 70%,
              #0a0a0a 85%,
              #1f1f1f 92%,
              #050505 100%
            )
          `,
          boxShadow: 'inset 0 0 4px rgba(255,255,255,0.18), 0 2px 8px rgba(0,0,0,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          animation: isPlaying ? 'spin 1.818s linear infinite' : 'none',
          transition: 'transform 0.5s ease-out',
          overflow: 'hidden',
        }}
      >
        {/* Vinyl Sheen Overlay (Specular light reflections) */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            aspectRatio: '1 / 1',
            background: 'conic-gradient(from 45deg, rgba(255,255,255,0.14) 0deg, transparent 60deg, rgba(255,255,255,0.14) 180deg, transparent 240deg, rgba(255,255,255,0.14) 360deg)',
            pointerEvents: 'none',
          }}
        />

        {/* Center Label Art */}
        <div
          style={{
            width: '42%',
            height: '42%',
            borderRadius: '50%',
            aspectRatio: '1 / 1',
            overflow: 'hidden',
            backgroundColor: '#0050EF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            border: '1.5px solid #222',
            boxShadow: '0 0 4px rgba(0,0,0,0.8)',
          }}
        >
          {artworkUrl ? (
            <img src={artworkUrl} alt="Label" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
          ) : (
            <Disc3 size={14} color="#FFF" />
          )}

          {/* Center Spindle Hole */}
          <div
            style={{
              position: 'absolute',
              width: '5px',
              height: '5px',
              borderRadius: '50%',
              backgroundColor: '#000',
              border: '1px solid #888',
              zIndex: 5,
            }}
          />
        </div>
      </div>

      {/* Mechanical Tonearm Needle */}
      <div
        style={{
          position: 'absolute',
          top: '-2px',
          right: '-2px',
          width: '28px',
          height: '42px',
          pointerEvents: 'none',
          transformOrigin: 'top right',
          transform: isPlaying ? 'rotate(24deg)' : 'rotate(0deg)',
          transition: 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        {/* Arm Pivot Base */}
        <div
          style={{
            position: 'absolute',
            top: '0',
            right: '0',
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, #ffffff, #666666)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.6)',
          }}
        />
        {/* Metallic Arm Rod */}
        <div
          style={{
            position: 'absolute',
            top: '5px',
            right: '4px',
            width: '2px',
            height: '32px',
            background: 'linear-gradient(to bottom, #e0e0e0, #888888)',
            transform: 'rotate(-12deg)',
            transformOrigin: 'top center',
            borderRadius: '1px',
          }}
        />
        {/* Needle Cartridge Head */}
        <div
          style={{
            position: 'absolute',
            bottom: '4px',
            left: '3px',
            width: '6px',
            height: '9px',
            backgroundColor: '#0050EF',
            borderRadius: '1px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.6)',
          }}
        />
      </div>
    </div>
  );
}

export default function MusicPlayer({ 
  music, 
  onPlayStateChange, 
  onExternalOpen,
  showTurntable = undefined // If undefined, reads from localStorage or settings
}) {
  const [previewUrl, setPreviewUrl] = useState(null);
  const [artworkUrl, setArtworkUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(30);
  const audioRef = useRef(null);

  const settings = getSettings();
  
  // Turntable toggle: prop -> localStorage -> settings -> default true
  const isTurntableEnabled = showTurntable !== undefined 
    ? showTurntable 
    : (localStorage.getItem('metro_show_turntable') !== 'false' && (settings.showTurntable !== false));

  useEffect(() => {
    if (onPlayStateChange) onPlayStateChange(isPlaying);
  }, [isPlaying, onPlayStateChange]);

  useEffect(() => {
    if (!music || !music.track_title) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    async function fetchPreview() {
      try {
        const query = encodeURIComponent(`${music.track_title} ${music.artist_name || ''}`);
        const res = await fetch(`https://itunes.apple.com/search?term=${query}&limit=1&entity=song`);
        const data = await res.json();
        
        if (isMounted && data.results && data.results.length > 0) {
          setPreviewUrl(data.results[0].previewUrl);
          if (data.results[0].artworkUrl100) {
            setArtworkUrl(data.results[0].artworkUrl100.replace('100x100bb', '300x300bb'));
          }
        }
      } catch (err) {
        console.error('Failed to fetch iTunes preview:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchPreview();
    return () => { isMounted = false; };
  }, [music]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const skipAmount = settings.skipDuration || 5;

  const skipBackward = () => {
    if (audioRef.current) {
      const target = Math.max(0, audioRef.current.currentTime - skipAmount);
      audioRef.current.currentTime = target;
      setProgress(target);
    }
  };

  const skipForward = () => {
    if (audioRef.current) {
      const target = Math.min(duration, audioRef.current.currentTime + skipAmount);
      audioRef.current.currentTime = target;
      setProgress(target);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setProgress(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleScrub = (newTime) => {
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
      setProgress(newTime);
    }
  };

  const formatTime = (time) => {
    const m = Math.floor(time / 60);
    const s = Math.floor(time % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const generateAppUrl = () => {
    const app = settings.preferredMusicApp || localStorage.getItem('metro_preferred_music_app') || 'spotify';
    const query = encodeURIComponent(`${music.track_title} ${music.artist_name || ''}`);
    
    switch (app) {
      case 'apple': return `https://music.apple.com/us/search?term=${query}`;
      case 'youtube': return `https://music.youtube.com/search?q=${query}`;
      case 'amazon': return `https://music.amazon.com/search/${query}`;
      case 'spotify':
      default: return `https://open.spotify.com/search/${query}`;
    }
  };

  const appName = settings.preferredMusicApp || localStorage.getItem('metro_preferred_music_app') || 'spotify';
  const appLabels = {
    spotify: 'Spotify',
    apple: 'Apple Music',
    youtube: 'YouTube Music',
    amazon: 'Amazon Music'
  };

  if (!music) return null;

  return (
    <div style={{ marginTop: '10px', width: '100%' }}>
      {/* ── Audio element ── */}
      {previewUrl && (
        <audio 
          ref={audioRef} 
          src={previewUrl}
          onTimeUpdate={handleTimeUpdate} 
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={() => { setIsPlaying(false); setProgress(duration); }}
        />
      )}

      {/* ── Normal Desktop UI Music Widget with Turntable in place of Album Cover ── */}
      <div 
        className="ios-glass"
        style={{
          background: 'rgba(25, 25, 25, 0.95)',
          backdropFilter: 'blur(30px) saturate(200%)',
          borderRadius: '16px',
          padding: '16px 18px',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
          position: 'relative',
          overflow: 'hidden',
          color: '#FFFFFF',
        }}
      >
        {/* Top Section: Album Cover / Turntable & Track Info */}
        <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
          
          {/* Turntable or Album Cover Toggleable Slot */}
          {isTurntableEnabled ? (
            <TurntableArtwork
              artworkUrl={artworkUrl}
              isPlaying={isPlaying}
              onTogglePlay={togglePlay}
              size={58}
            />
          ) : (
            <div 
              onClick={togglePlay}
              style={{
                width: '58px', 
                height: '58px', 
                borderRadius: '10px', 
                overflow: 'hidden', 
                flexShrink: 0,
                background: '#1a1a1a', 
                border: '1px solid rgba(255,255,255,0.15)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
                cursor: 'pointer',
              }}
              title="Tap to Play / Pause"
            >
              {artworkUrl ? (
                <img src={artworkUrl} alt="Album Art" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <MusicIcon size={26} color="rgba(255,255,255,0.6)" />
              )}
            </div>
          )}
          
          {/* Title & Artist */}
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ fontWeight: 700, fontSize: '15px', color: '#FFFFFF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {music.track_title || 'Unknown Track'}
            </div>
            <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.65)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {music.artist_name || 'Unknown Artist'}
            </div>
          </div>

          {/* ── LIVE ANIMATED SPECTRUM EQUALIZER ── */}
          <div 
            style={{ 
              display: 'flex', 
              alignItems: 'flex-end', 
              gap: '2.5px', 
              height: '22px', 
              padding: '0 2px' 
            }}
            title={isPlaying ? "Equalizer Active" : "Paused"}
          >
            {[1, 2, 3, 4, 5, 6, 7, 8].map((bar) => (
              <span
                key={bar}
                className={`eq-bar eq-bar-${bar} ${isPlaying ? 'is-playing' : ''}`}
                style={{
                  width: '3px',
                  backgroundColor: isPlaying ? '#1DB954' : 'rgba(255,255,255,0.3)',
                  borderRadius: '1.5px',
                  opacity: isPlaying ? 1 : 0.45,
                  transition: 'opacity 0.3s ease',
                  height: isPlaying ? undefined : '4px',
                }}
              />
            ))}
          </div>
        </div>

        {/* Middle Section: Scrubber */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)', fontFamily: 'monospace', fontWeight: 600, width: '28px', textAlign: 'right' }}>
            {formatTime(progress)}
          </span>
          <input 
            type="range" 
            min="0" 
            max={duration || 30} 
            step="0.01"
            value={progress} 
            onChange={(e) => handleScrub(parseFloat(e.target.value))} 
            disabled={!previewUrl}
            style={{ 
              flex: 1, 
              height: '4px', 
              borderRadius: '2px',
              accentColor: '#1DB954',
              cursor: previewUrl ? 'pointer' : 'default',
              opacity: previewUrl ? 1 : 0.4,
              background: 'rgba(255,255,255,0.2)',
              WebkitAppearance: 'none'
            }}
          />
          <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)', fontFamily: 'monospace', fontWeight: 600, width: '28px' }}>
            -{formatTime(Math.max(0, duration - progress))}
          </span>
        </div>

        {/* Bottom Section: Playback Controls */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '32px', marginTop: '-2px' }}>
          <button 
            onClick={skipBackward} 
            disabled={!previewUrl}
            style={{ background: 'transparent', border: 'none', color: '#FFFFFF', opacity: previewUrl ? 1 : 0.4, cursor: previewUrl ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '6px' }}
          >
            <Rewind size={26} fill="currentColor" />
          </button>
          
          <button 
            onClick={togglePlay} 
            disabled={loading || !previewUrl}
            style={{ background: 'transparent', border: 'none', color: '#FFFFFF', opacity: (!loading && !previewUrl) ? 0.4 : 1, cursor: previewUrl ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '6px' }}
          >
            {loading ? (
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
            ) : isPlaying ? (
              <Pause size={34} fill="currentColor" />
            ) : (
              <Play size={34} fill="currentColor" style={{ marginLeft: '3px' }} />
            )}
          </button>

          <button 
            onClick={skipForward} 
            disabled={!previewUrl}
            style={{ background: 'transparent', border: 'none', color: '#FFFFFF', opacity: previewUrl ? 1 : 0.4, cursor: previewUrl ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '6px' }}
          >
            <FastForward size={26} fill="currentColor" />
          </button>
        </div>
      </div>

      {/* ── Open in Music App Button ──────────────────── */}
      <a
        href={generateAppUrl()} 
        target="_blank" 
        rel="noopener noreferrer"
        onClick={() => {
          if (audioRef.current) audioRef.current.pause();
          setIsPlaying(false);
          if (onExternalOpen) onExternalOpen();
        }}
        style={{
          marginTop: '10px',
          width: '100%',
          justifyContent: 'center',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: '#1DB954',
          color: '#000000',
          border: 'none',
          padding: '8px 14px',
          borderRadius: '4px',
          fontWeight: 700,
          fontSize: '12px',
          textDecoration: 'none',
          boxSizing: 'border-box',
          cursor: 'pointer',
        }}
      >
        {appName === 'apple' ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M23.997 6.124v11.752a6.124 6.124 0 11-4.083-5.787V6.862l-10.207 2.31v10.038a6.124 6.124 0 11-4.083-5.787V4.083L23.997 1.36v4.764z"/>
          </svg>
        ) : appName === 'youtube' ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.376 0 0 5.376 0 12s5.376 12 12 12 12-5.376 12-12S18.624 0 12 0zm0 19.104c-3.924 0-7.104-3.18-7.104-7.104 0-3.924 3.18-7.104 7.104-7.104 3.924 0 7.104 3.18 7.104 7.104 0 3.924-3.18 7.104-7.104 7.104zm0-11.832c-2.612 0-4.728 2.116-4.728 4.728 0 2.612 2.116 4.728 4.728 4.728 2.612 0 4.728-2.116 4.728-4.728 0-2.612-2.116-4.728-4.728-4.728zm-1.182 6.552V10.18l3.182 1.822-3.182 1.822z"/>
          </svg>
        ) : appName === 'amazon' ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1.8 13.9c-3.14 0-5.7-2.56-5.7-5.7s2.56-5.7 5.7-5.7 5.7 2.56 5.7 5.7c0 .35-.04.69-.1 1.02h-1.86c.04-.33.06-.67.06-1.02 0-2.09-1.71-3.8-3.8-3.8s-3.8 1.71-3.8 3.8 1.71 3.8 3.8 3.8c1.03 0 1.96-.42 2.64-1.09l1.34 1.34c-1.03 1.03-2.43 1.65-3.98 1.65zm7.3 1.8c-3.17 1.84-7.56 1.11-10.43-.7-.22-.14-.04-.41.21-.29 2.66 1.25 6.64 1.8 9.55-.35.37-.28.82.11.67.74v.6z"/>
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.494 17.308c-.216.353-.675.467-1.028.25-2.817-1.721-6.36-2.111-10.536-1.157-.404.093-.807-.16-.9-.564-.093-.404.16-.807.564-.9 4.568-1.044 8.487-.597 11.65 1.343.353.217.467.676.25 1.028zm1.467-3.26c-.272.441-.849.582-1.29.31-3.224-1.981-8.14-2.556-11.954-1.398-.498.151-1.024-.132-1.176-.63-.151-.498.132-1.024.63-1.176 4.364-1.324 9.789-.684 13.48 1.597.441.272.582.849.31 1.29zm.125-3.398C15.228 8.354 8.878 8.146 5.17 9.272c-.6-.182-1.233-.162-1.415-.762-.182-.6.162-1.233.762-1.415 4.254-1.292 11.267-1.05 15.688 1.574.542.321.719 1.027.398 1.569-.321.542-1.027.719-1.569.398z"/>
          </svg>
        )}
        Open in {appLabels[appName]}
      </a>
    </div>
  );
}

