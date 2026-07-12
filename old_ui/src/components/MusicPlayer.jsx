import React, { useState, useEffect, useRef } from 'react';
import { getSettings } from '../services/settings';

export default function MusicPlayer({ music }) {
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(30);
  const audioRef = useRef(null);

  useEffect(() => {
    if (!music || !music.track_title) {
      setLoading(false);
      return;
    }

    async function fetchPreview() {
      try {
        const query = encodeURIComponent(`${music.track_title} ${music.artist_name}`);
        const res = await fetch(`https://itunes.apple.com/search?term=${query}&limit=1&entity=song`);
        const data = await res.json();
        
        if (data.results && data.results.length > 0) {
          setPreviewUrl(data.results[0].previewUrl);
        }
      } catch (err) {
        console.error('Failed to fetch iTunes preview:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchPreview();
  }, [music]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
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

  const handleScrub = (e) => {
    const newTime = parseFloat(e.target.value);
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
    const settings = getSettings();
    const app = settings.preferredMusicApp || 'spotify';
    const query = encodeURIComponent(`${music.track_title} ${music.artist_name}`);
    const timeMs = music.start_time_ms || 0;
    
    // Convert ms to Spotify format (e.g., #0:30)
    // Actually, spotify search doesn't support timestamps natively unless we have track ID.
    // We will just do a standard search url.
    
    switch (app) {
      case 'apple':
        return `https://music.apple.com/us/search?term=${query}`;
      case 'youtube':
        return `https://music.youtube.com/search?q=${query}`;
      case 'amazon':
        return `https://music.amazon.com/search/${query}`;
      case 'spotify':
      default:
        // Spotify web search
        return `https://open.spotify.com/search/${query}`;
    }
  };

  const appName = getSettings().preferredMusicApp || 'spotify';
  const appLabels = {
    spotify: 'Spotify',
    apple: 'Apple Music',
    youtube: 'YouTube Music',
    amazon: 'Amazon Music'
  };

  if (!music) return null;

  return (
    <div style={{ marginTop: 'var(--sv-space-5)' }}>
      {/* ── Mini Player ─────────────────────────── */}
      <div style={{
        background: 'var(--sv-surface)',
        borderRadius: 'var(--sv-radius-lg)',
        padding: 'var(--sv-space-3)',
        border: '1px solid var(--sv-border)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sv-space-3)' }}>
          <button 
            onClick={togglePlay}
            disabled={loading || !previewUrl}
            className="sv-btn sv-btn--primary"
            style={{ 
              width: 48, height: 48, 
              borderRadius: '50%', 
              padding: 0, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              opacity: (!loading && !previewUrl) ? 0.5 : 1
            }}
          >
            {loading ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
            ) : isPlaying ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
              </svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" style={{ marginLeft: '4px' }}>
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 'var(--sv-text-sm)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {loading ? 'Searching for preview...' : previewUrl ? 'iTunes 30s Preview' : 'No preview available'}
            </div>
            
            {/* Scrubber */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sv-space-2)', marginTop: '4px' }}>
              <span style={{ fontSize: '10px', color: 'var(--sv-text-muted)', fontFamily: 'var(--sv-font-mono)' }}>
                {formatTime(progress)}
              </span>
              <input 
                type="range"
                min="0"
                max={duration || 30}
                step="0.01"
                value={progress}
                onChange={handleScrub}
                disabled={!previewUrl}
                style={{ 
                  flex: 1, 
                  height: '4px',
                  accentColor: 'var(--sv-primary)',
                  cursor: previewUrl ? 'pointer' : 'default',
                  opacity: previewUrl ? 1 : 0.5
                }}
              />
              <span style={{ fontSize: '10px', color: 'var(--sv-text-muted)', fontFamily: 'var(--sv-font-mono)' }}>
                {formatTime(duration)}
              </span>
            </div>
          </div>
        </div>

        {previewUrl && (
          <audio 
            ref={audioRef}
            src={previewUrl}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={() => {
              setIsPlaying(false);
              setProgress(duration); // snap to end
            }}
          />
        )}
      </div>

      {/* ── Open in App Button ──────────────────── */}
      <a
        href={generateAppUrl()}
        target="_blank"
        rel="noopener noreferrer"
        className="sv-btn sv-btn--secondary"
        style={{ marginTop: 'var(--sv-space-3)', width: '100%', justifyContent: 'center' }}
      >
        🎧 Open in {appLabels[appName]}
      </a>
    </div>
  );
}
