import React, { useState, useEffect, useRef } from 'react';
import { getSettings, THEME_CATALOG } from '../services/settings';
import { Rewind, FastForward, Play, Pause, Music as MusicIcon, Volume2 } from 'lucide-react';
import VinylPlayer from './VinylPlayer';

export default function MusicPlayer({ music, onPlayStateChange, onExternalOpen }) {
  const [previewUrl, setPreviewUrl] = useState(null);
  const [artworkUrl, setArtworkUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(30);
  const audioRef = useRef(null);

  const settings = getSettings();
  const themeId = settings.themeId || 'darkroom';
  const themeMeta = THEME_CATALOG.find(t => t.id === themeId);
  const isVinylTheme = themeMeta ? themeMeta.hasVinyl : true;

  useEffect(() => {
    if (onPlayStateChange) onPlayStateChange(isPlaying);
  }, [isPlaying, onPlayStateChange]);

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
          if (data.results[0].artworkUrl100) {
            setArtworkUrl(data.results[0].artworkUrl100.replace('100x100bb', '300x300bb'));
          }
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
    const app = settings.preferredMusicApp || 'spotify';
    const query = encodeURIComponent(`${music.track_title} ${music.artist_name}`);
    
    switch (app) {
      case 'apple': return `https://music.apple.com/us/search?term=${query}`;
      case 'youtube': return `https://music.youtube.com/search?q=${query}`;
      case 'amazon': return `https://music.amazon.com/search/${query}`;
      case 'spotify':
      default: return `https://open.spotify.com/search/${query}`;
    }
  };

  const appName = settings.preferredMusicApp || 'spotify';
  const appLabels = {
    spotify: 'Spotify',
    apple: 'Apple Music',
    youtube: 'YouTube Music',
    amazon: 'Amazon Music'
  };

  if (!music) return null;

  return (
    <div style={{ marginTop: '16px', width: '100%' }}>
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

      {/* ── Vinyl Player Mode ── */}
      {isVinylTheme ? (
        <VinylPlayer
          music={music}
          previewUrl={previewUrl}
          artworkUrl={artworkUrl}
          isPlaying={isPlaying}
          onTogglePlay={togglePlay}
          progress={progress}
          duration={duration}
          onScrub={handleScrub}
          onSkipBackward={skipBackward}
          onSkipForward={skipForward}
        />
      ) : (
        /* ── Standard / Era Dynamic EQ Player Mode ── */
        <div className="ios-glass" style={{
          background: 'var(--ios-glass)',
          backdropFilter: 'blur(30px) saturate(200%)',
          borderRadius: 'var(--mat-border-radius, 24px)',
          padding: '16px 20px',
          border: '1px solid var(--ios-border)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          boxShadow: 'var(--ios-shadow-lg)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Top Section: Art & Info */}
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            {/* Album Art */}
            <div style={{
              width: '56px', height: '56px', borderRadius: '10px', overflow: 'hidden', flexShrink: 0,
              background: 'var(--ios-bg-card)', border: '1px solid var(--ios-border)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
            }}>
              {artworkUrl ? (
                <img src={artworkUrl} alt="Album Art" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <MusicIcon size={28} color="var(--ios-text-secondary)" />
              )}
            </div>
            
            {/* Title & Artist */}
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ fontWeight: 700, fontSize: '17px', color: 'var(--ios-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {music.track_title || 'Unknown Track'}
              </div>
              <div style={{ fontSize: '15px', color: 'var(--ios-text-secondary)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {music.artist_name || 'Unknown Artist'}
              </div>
            </div>

            {/* ── LIVE ANIMATED SPECTRUM EQUALIZER ── */}
            <div 
              style={{ 
                display: 'flex', 
                alignItems: 'flex-end', 
                gap: '3px', 
                height: '24px', 
                padding: '0 4px' 
              }}
              title={isPlaying ? "Equalizer Active" : "Paused"}
            >
              {[1, 2, 3, 4, 5, 6, 7, 8].map((bar) => (
                <span
                  key={bar}
                  className={`eq-bar eq-bar-${bar} ${isPlaying ? 'is-playing' : ''}`}
                  style={{
                    width: '3px',
                    backgroundColor: isPlaying ? 'var(--ios-accent)' : 'var(--ios-text-secondary)',
                    borderRadius: '1.5px',
                    opacity: isPlaying ? 1 : 0.45,
                    transition: 'opacity 0.3s ease'
                  }}
                />
              ))}
            </div>
          </div>

          {/* Middle Section: Scrubber */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '11px', color: 'var(--ios-text-secondary)', fontFamily: 'var(--font-mono)', fontWeight: 600, width: '32px', textAlign: 'right' }}>
              {formatTime(progress)}
            </span>
            <input 
              type="range" min="0" max={duration || 30} step="0.01"
              value={progress} onChange={(e) => handleScrub(parseFloat(e.target.value))} disabled={!previewUrl}
              style={{ 
                flex: 1, height: '6px', borderRadius: '3px',
                accentColor: 'var(--ios-accent, var(--ios-text-primary))',
                cursor: previewUrl ? 'pointer' : 'default',
                opacity: previewUrl ? 1 : 0.5,
                background: 'var(--ios-border)',
                WebkitAppearance: 'none'
              }}
            />
            <span style={{ fontSize: '11px', color: 'var(--ios-text-secondary)', fontFamily: 'var(--font-mono)', fontWeight: 600, width: '32px' }}>
              -{formatTime(Math.max(0, duration - progress))}
            </span>
          </div>

          {/* Bottom Section: Controls */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '40px', marginTop: '-4px' }}>
            <button 
              onClick={skipBackward} disabled={!previewUrl}
              style={{ background: 'transparent', border: 'none', color: 'var(--ios-text-primary)', opacity: previewUrl ? 1 : 0.5, cursor: previewUrl ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px' }}
            >
              <Rewind size={32} fill="currentColor" />
            </button>
            
            <button 
              onClick={togglePlay} disabled={loading || !previewUrl}
              style={{ background: 'transparent', border: 'none', color: 'var(--ios-text-primary)', opacity: (!loading && !previewUrl) ? 0.5 : 1, cursor: previewUrl ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px' }}
            >
              {loading ? (
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
              ) : isPlaying ? (
                <Pause size={40} fill="currentColor" />
              ) : (
                <Play size={40} fill="currentColor" style={{ marginLeft: '4px' }} />
              )}
            </button>

            <button 
              onClick={skipForward} disabled={!previewUrl}
              style={{ background: 'transparent', border: 'none', color: 'var(--ios-text-primary)', opacity: previewUrl ? 1 : 0.5, cursor: previewUrl ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px' }}
            >
              <FastForward size={32} fill="currentColor" />
            </button>
          </div>
        </div>
      )}

      {/* ── Open in Music App Button ──────────────────── */}
      <a
        href={generateAppUrl()} target="_blank" rel="noopener noreferrer"
        className="ios-btn"
        onClick={() => {
          if (audioRef.current) audioRef.current.pause();
          setIsPlaying(false);
          if (onExternalOpen) onExternalOpen();
        }}
        style={{ marginTop: '14px', width: '100%', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--ios-accent)', color: '#fff', border: 'none' }}
      >
        {appName === 'apple' ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M23.997 6.124v11.752a6.124 6.124 0 11-4.083-5.787V6.862l-10.207 2.31v10.038a6.124 6.124 0 11-4.083-5.787V4.083L23.997 1.36v4.764z"/>
          </svg>
        ) : appName === 'youtube' ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.376 0 0 5.376 0 12s5.376 12 12 12 12-5.376 12-12S18.624 0 12 0zm0 19.104c-3.924 0-7.104-3.18-7.104-7.104 0-3.924 3.18-7.104 7.104-7.104 3.924 0 7.104 3.18 7.104 7.104 0 3.924-3.18 7.104-7.104 7.104zm0-11.832c-2.612 0-4.728 2.116-4.728 4.728 0 2.612 2.116 4.728 4.728 4.728 2.612 0 4.728-2.116 4.728-4.728 0-2.612-2.116-4.728-4.728-4.728zm-1.182 6.552V10.18l3.182 1.822-3.182 1.822z"/>
          </svg>
        ) : appName === 'amazon' ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1.8 13.9c-3.14 0-5.7-2.56-5.7-5.7s2.56-5.7 5.7-5.7 5.7 2.56 5.7 5.7c0 .35-.04.69-.1 1.02h-1.86c.04-.33.06-.67.06-1.02 0-2.09-1.71-3.8-3.8-3.8s-3.8 1.71-3.8 3.8 1.71 3.8 3.8 3.8c1.03 0 1.96-.42 2.64-1.09l1.34 1.34c-1.03 1.03-2.43 1.65-3.98 1.65zm7.3 1.8c-3.17 1.84-7.56 1.11-10.43-.7-.22-.14-.04-.41.21-.29 2.66 1.25 6.64 1.8 9.55-.35.37-.28.82.11.67.74v.6z"/>
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.494 17.308c-.216.353-.675.467-1.028.25-2.817-1.721-6.36-2.111-10.536-1.157-.404.093-.807-.16-.9-.564-.093-.404.16-.807.564-.9 4.568-1.044 8.487-.597 11.65 1.343.353.217.467.676.25 1.028zm1.467-3.26c-.272.441-.849.582-1.29.31-3.224-1.981-8.14-2.556-11.954-1.398-.498.151-1.024-.132-1.176-.63-.151-.498.132-1.024.63-1.176 4.364-1.324 9.789-.684 13.48 1.597.441.272.582.849.31 1.29zm.125-3.398C15.228 8.354 8.878 8.146 5.17 9.272c-.6-.182-1.233-.162-1.415-.762-.182-.6.162-1.233.762-1.415 4.254-1.292 11.267-1.05 15.688 1.574.542.321.719 1.027.398 1.569-.321.542-1.027.719-1.569.398z"/>
          </svg>
        )}
        Open in {appLabels[appName]}
      </a>
    </div>
  );
}

