import React, { useState, useEffect, useRef } from 'react';
import { getSettings } from '../services/settings';
import { Rewind, FastForward, Play, Pause, Music as MusicIcon, AudioLines } from 'lucide-react';

export default function MusicPlayer({ music, onPlayStateChange }) {
  const [previewUrl, setPreviewUrl] = useState(null);
  const [artworkUrl, setArtworkUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(30);
  const audioRef = useRef(null);

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
            // Get a slightly larger artwork image by replacing the 100x100 with 300x300
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
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const skipAmount = getSettings().skipDuration || 5;

  const skipBackward = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - skipAmount);
      setProgress(audioRef.current.currentTime);
    }
  };

  const skipForward = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.min(duration, audioRef.current.currentTime + skipAmount);
      setProgress(audioRef.current.currentTime);
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
    
    switch (app) {
      case 'apple': return `https://music.apple.com/us/search?term=${query}`;
      case 'youtube': return `https://music.youtube.com/search?q=${query}`;
      case 'amazon': return `https://music.amazon.com/search/${query}`;
      case 'spotify':
      default: return `https://open.spotify.com/search/${query}`;
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
    <div style={{ marginTop: '16px' }}>
      {/* ── Apple Music Style Widget ─────────────────────────── */}
      <div className="ios-glass" style={{
        background: 'var(--ios-glass)',
        backdropFilter: 'blur(30px) saturate(200%)',
        borderRadius: '24px',
        padding: '16px 20px',
        border: '1px solid rgba(255,255,255,0.1)',
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

          {/* EQ / Status Icon */}
          <div style={{ padding: '0 4px' }}>
            {isPlaying ? (
              <AudioLines size={24} color="var(--ios-accent)" className="bounce-anim" />
            ) : (
              <AudioLines size={24} color="var(--ios-text-secondary)" style={{ opacity: 0.5 }} />
            )}
          </div>
        </div>

        {/* Middle Section: Scrubber */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '11px', color: 'var(--ios-text-secondary)', fontFamily: 'var(--font-mono)', fontWeight: 600, width: '32px', textAlign: 'right' }}>
            {formatTime(progress)}
          </span>
          <input 
            type="range" min="0" max={duration || 30} step="0.01"
            value={progress} onChange={handleScrub} disabled={!previewUrl}
            style={{ 
              flex: 1, height: '6px', borderRadius: '3px',
              accentColor: 'var(--ios-text-primary)',
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

        {previewUrl && (
          <audio 
            ref={audioRef} src={previewUrl}
            onTimeUpdate={handleTimeUpdate} onLoadedMetadata={handleLoadedMetadata}
            onEnded={() => { setIsPlaying(false); setProgress(duration); }}
          />
        )}
      </div>

      {/* ── Open in App Button ──────────────────── */}
      <a
        href={generateAppUrl()} target="_blank" rel="noopener noreferrer"
        className="ios-btn"
        style={{ marginTop: '16px', width: '100%', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--ios-accent)', color: '#fff', border: 'none' }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <path d="M8 11.973c2.5-1.473 5.5-.973 7.5.527"></path>
          <path d="M9 15c1.5-1 4-1 5 .5"></path>
          <path d="M7 9c3-2 6-2 9 0"></path>
        </svg>
        Open in {appLabels[appName]}
      </a>
    </div>
  );
}
