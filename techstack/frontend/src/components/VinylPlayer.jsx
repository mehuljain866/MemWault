import React, { useState, useRef, useEffect } from 'react';
import { motion, useMotionValue, animate } from 'framer-motion';
import { Play, Pause, Rewind, FastForward, Volume2, Disc3 } from 'lucide-react';
import { getSettings } from '../services/settings';

const ANGLES = {
  PARKED: 0,
  START: 21.5,
  END: 44.0,
};

export default function VinylPlayer({ 
  music, 
  previewUrl, 
  artworkUrl, 
  isPlaying, 
  onTogglePlay,
  progress, 
  duration = 30, 
  onScrub,
  onSkipBackward,
  onSkipForward
}) {
  const settings = getSettings();
  const themeId = settings.themeId || 'darkroom';

  const pivotRef = useRef(null);
  const isDragging = useRef(false);

  // Framer motion values for smooth 60fps turntable motion
  const armAngle = useMotionValue(ANGLES.PARKED);
  const discRotation = useMotionValue(0);
  const spinAnimation = useRef(null);

  // Sync rotation with isPlaying state (33⅓ RPM = 1.80s per rotation)
  useEffect(() => {
    if (isPlaying) {
      spinAnimation.current = animate(discRotation, discRotation.get() + 360000, {
        duration: (360000 / 360) * 1.8,
        ease: "linear",
        repeat: Infinity
      });
      // Move arm onto track if parked
      if (armAngle.get() < 10) {
        animate(armAngle, ANGLES.START, { duration: 0.6, ease: "easeOut" });
      }
    } else {
      if (spinAnimation.current) spinAnimation.current.stop();
      // Physical inertial coast-down deceleration
      animate(discRotation, discRotation.get() + 140, {
        duration: 1.2,
        ease: [0.16, 1, 0.3, 1]
      });
    }
  }, [isPlaying]);

  // Sync tonearm position with track progress
  useEffect(() => {
    if (isDragging.current) return;
    if (isPlaying && duration > 0) {
      const normalized = Math.min(Math.max(progress / duration, 0), 1);
      const targetAngle = ANGLES.START + normalized * (ANGLES.END - ANGLES.START);
      armAngle.set(targetAngle);
    } else if (!isPlaying && progress === 0) {
      animate(armAngle, ANGLES.PARKED, { duration: 0.8, ease: "easeInOut" });
    }
  }, [progress, duration, isPlaying]);

  // Draggable tonearm physics using atan2
  const handlePointerDown = (e) => {
    isDragging.current = true;
    e.target.setPointerCapture(e.pointerId);
    handlePointerMove(e);
  };

  const handlePointerMove = (e) => {
    if (!isDragging.current || !pivotRef.current) return;
    const rect = pivotRef.current.getBoundingClientRect();
    const pivotX = rect.left + rect.width / 2;
    const pivotY = rect.top + rect.height / 2;

    const dx = e.clientX - pivotX;
    const dy = e.clientY - pivotY;

    // Relative angle where downward vertical is ~0 deg
    let deg = Math.atan2(dx, dy) * (180 / Math.PI);
    deg = Math.min(Math.max(deg, -5), 50);
    armAngle.set(deg);
  };

  const handlePointerUp = (e) => {
    if (!isDragging.current) return;
    isDragging.current = false;
    try { e.target.releasePointerCapture(e.pointerId); } catch (err) {}

    const currentDeg = armAngle.get();

    if (currentDeg < 12) {
      // Parked in rest clip -> Stop audio
      animate(armAngle, ANGLES.PARKED, { duration: 0.4, ease: "easeOut" });
      if (isPlaying && onTogglePlay) onTogglePlay();
    } else {
      // Dropped on vinyl -> Start playback and scrub to position
      const clampedAngle = Math.min(Math.max(currentDeg, ANGLES.START), ANGLES.END);
      animate(armAngle, clampedAngle, { duration: 0.3, ease: "easeOut" });

      const progressRatio = (clampedAngle - ANGLES.START) / (ANGLES.END - ANGLES.START);
      if (onScrub) {
        onScrub(progressRatio * duration);
      }
      if (!isPlaying && onTogglePlay) {
        onTogglePlay();
      }
    }
  };

  // Theme-specific label & plinth styling
  const getThemeStyling = () => {
    switch (themeId) {
      case 'field-notes':
        return {
          plinthBg: 'linear-gradient(145deg, #2b2520, #1c1815)',
          plinthBorder: '1px solid #4a3b2c',
          labelBg: '#8b5a2b',
          labelText: '#f5ede0',
          tonearmTube: '#c87d43',
          accent: '#c87d43',
          fontFamily: 'var(--font-serif)'
        };
      case 'observatory':
        return {
          plinthBg: 'linear-gradient(145deg, #101726, #060a12)',
          plinthBorder: '1px solid #1e293b',
          labelBg: '#0f172a',
          labelText: '#e2b858',
          tonearmTube: '#d4af37',
          accent: '#e2b858',
          fontFamily: 'var(--font-serif)'
        };
      case 'cabinet-1974':
        return {
          plinthBg: 'linear-gradient(145deg, #242927, #131716)',
          plinthBorder: '1px solid #374151',
          labelBg: '#f3f4f6',
          labelText: '#111827',
          tonearmTube: '#9ca3af',
          accent: '#b85d43',
          fontFamily: 'var(--font-mono)'
        };
      case 'scriptorium':
        return {
          plinthBg: 'linear-gradient(145deg, #261e19, #15100c)',
          plinthBorder: '1px solid #451a03',
          labelBg: '#7f1d1d',
          labelText: '#fef2f2',
          tonearmTube: '#b45309',
          accent: '#962828',
          fontFamily: 'var(--font-serif)'
        };
      case 'mid-century':
        return {
          plinthBg: 'linear-gradient(145deg, #3d2616, #1c120a)', // Danish Teak wood
          plinthBorder: '1px solid #78350f',
          labelBg: '#064e3b', // Emerald velvet
          labelText: '#fef08a',
          tonearmTube: '#eab308', // Spun satin gold
          accent: '#d4af37',
          fontFamily: 'var(--font-serif)'
        };
      case 'darkroom':
      default:
        return {
          plinthBg: 'linear-gradient(145deg, #1c1414, #0d0909)',
          plinthBorder: '1px solid #3b1818',
          labelBg: '#7f1d1d',
          labelText: '#fca5a5',
          tonearmTube: '#e05a36',
          accent: '#e05a36',
          fontFamily: 'var(--font-ios)'
        };
    }
  };

  const style = getThemeStyling();

  const formatTime = (time) => {
    const m = Math.floor(time / 60);
    const s = Math.floor(time % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div style={{
      width: '100%',
      background: style.plinthBg,
      borderRadius: '24px',
      padding: '20px',
      boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
      border: style.plinthBorder,
      color: '#fff',
      userSelect: 'none',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* ── Turntable Well / Platter Chassis ─────────────────────── */}
      <div style={{
        width: '100%',
        height: '270px',
        position: 'relative',
        background: '#0a0a0c',
        borderRadius: '16px',
        overflow: 'hidden',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        boxShadow: 'inset 0 4px 16px rgba(0,0,0,0.9)'
      }}>
        {/* Platter Strobe Ring */}
        <div style={{
          position: 'absolute',
          top: '15px',
          left: '15px',
          width: '240px',
          height: '240px',
          borderRadius: '50%',
          border: '4px dashed rgba(255, 255, 255, 0.12)',
          boxShadow: '0 0 20px rgba(0,0,0,0.95)'
        }} />

        {/* ── 33⅓ RPM Rotating Vinyl Disc ── */}
        <motion.div 
          style={{
            position: 'absolute',
            top: '19px',
            left: '19px',
            width: '232px',
            height: '232px',
            borderRadius: '50%',
            rotate: discRotation,
            background: `
              radial-gradient(circle at center, transparent 94%, rgba(0,0,0,0.8) 96%, #111 100%),
              radial-gradient(circle at center, transparent 62%, rgba(255,255,255,0.06) 63%, transparent 64%),
              radial-gradient(circle at center, transparent 48%, rgba(255,255,255,0.06) 49%, transparent 50%),
              repeating-radial-gradient(circle at center, #0d0d0d 0px, #161616 1px, #0d0d0d 2px, #1f1f1f 2.5px, #0d0d0d 3px)
            `,
            boxShadow: '0 8px 24px rgba(0,0,0,0.85)'
          }}
        >
          {/* Anisotropic Double-Bowtie Light Sheen */}
          <div style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            background: `conic-gradient(
              from 45deg at 50% 50%,
              rgba(255, 255, 255, 0.16) 0deg,
              transparent 40deg,
              transparent 140deg,
              rgba(255, 255, 255, 0.16) 180deg,
              transparent 220deg,
              transparent 320deg,
              rgba(255, 255, 255, 0.16) 360deg
            )`,
            mixBlendMode: 'screen',
            pointerEvents: 'none'
          }} />

          {/* Center Paper Label (33.3% Diameter) */}
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: '33.33%',
            height: '33.33%',
            transform: 'translate(-50%, -50%)',
            borderRadius: '50%',
            overflow: 'hidden',
            boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.6), 0 0 8px rgba(0,0,0,0.8)',
            background: style.labelBg,
            color: style.labelText,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: style.fontFamily
          }}>
            {artworkUrl ? (
              <img src={artworkUrl} alt="Album Art" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ fontSize: '8px', fontWeight: 800, textAlign: 'center', lineHeight: 1.1, padding: '4px' }}>
                MEMWAULT<br/>
                <span style={{ fontSize: '6px', opacity: 0.85 }}>33⅓ RPM</span>
              </div>
            )}
          </div>

          {/* Center Brass Spindle Pin */}
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: '10px',
            height: '10px',
            transform: 'translate(-50%, -50%)',
            borderRadius: '50%',
            background: '#000',
            boxShadow: '0 0 0 1.5px #d4d4d8, inset 0 1px 2px rgba(0,0,0,0.9)'
          }} />
        </motion.div>

        {/* ── Tonearm Gimbal & Vector S-Arm ── */}
        <div 
          ref={pivotRef}
          style={{
            position: 'absolute',
            top: '26px',
            right: '26px',
            width: '38px',
            height: '38px',
            zIndex: 20
          }}
        >
          {/* Gimbal Heavy Metal Base */}
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '50%',
            background: 'radial-gradient(circle at 35% 35%, #e4e4e7 0%, #71717a 60%, #18181b 100%)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.8), inset 0 1px 1px rgba(255,255,255,0.9)'
          }} />

          {/* Interactive Tonearm Pivot Group */}
          <motion.div
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            style={{
              position: 'absolute',
              top: '19px',
              left: '19px',
              width: '40px',
              height: '185px',
              transformOrigin: 'top center',
              rotate: armAngle,
              cursor: 'grab',
              touchAction: 'none'
            }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ cursor: 'grabbing' }}
            title="Drag the needle onto the vinyl to play, or park it to stop"
          >
            <svg width="48" height="195" viewBox="0 0 48 195" fill="none" style={{ marginLeft: '-24px', filter: 'drop-shadow(4px 8px 8px rgba(0,0,0,0.7))' }}>
              {/* Knurled Counterweight */}
              <rect x="18" y="-16" width="12" height="22" rx="2" fill="url(#metalGrad)" stroke="#18181b" strokeWidth="1" />
              <line x1="20" y1="-10" x2="28" y2="-10" stroke="#52525b" strokeWidth="1" />
              <line x1="20" y1="-6" x2="28" y2="-6" stroke="#52525b" strokeWidth="1" />

              {/* S-Arm Tube */}
              <path 
                d="M24 0 C24 38, 16 68, 16 106 C16 140, 26 155, 24 175" 
                stroke="url(#tubeGrad)" 
                strokeWidth="4.5" 
                strokeLinecap="round"
              />

              {/* Headshell & Stylus Cartridge */}
              <g transform="translate(24, 175) rotate(-14)">
                <rect x="-5" y="0" width="10" height="20" rx="2" fill="#18181b" stroke="#3f3f46" strokeWidth="1" />
                <rect x="-3" y="13" width="6" height="7" rx="1" fill={style.accent} />
                <path d="M5 5 Q14 5 12 13" stroke="#d4d4d8" strokeWidth="1.5" fill="none" />
              </g>

              <defs>
                <linearGradient id="metalGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#71717a" />
                  <stop offset="50%" stopColor="#e4e4e7" />
                  <stop offset="100%" stopColor="#27272a" />
                </linearGradient>
                <linearGradient id="tubeGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#a1a1aa" />
                  <stop offset="40%" stopColor="#ffffff" />
                  <stop offset="100%" stopColor="#52525b" />
                </linearGradient>
              </defs>
            </svg>
          </motion.div>
        </div>
      </div>

      {/* ── Metadata & Transport Controls ────────────────────────── */}
      <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '15px', fontWeight: 700, color: '#f4f4f5', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {music?.track_title || 'Analog Memory'}
          </div>
          <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {music?.artist_name || 'Archival Vault'}
          </div>
        </div>

        {/* Transport buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={onSkipBackward}
            disabled={!previewUrl}
            style={{ background: 'transparent', border: 'none', color: '#fff', opacity: previewUrl ? 0.8 : 0.4, cursor: previewUrl ? 'pointer' : 'default', padding: '6px' }}
          >
            <Rewind size={20} />
          </button>

          <button
            onClick={onTogglePlay}
            disabled={!previewUrl}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: style.accent,
              border: 'none',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: previewUrl ? 'pointer' : 'default',
              boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
              opacity: previewUrl ? 1 : 0.5
            }}
          >
            {isPlaying ? <Pause size={20} /> : <Play size={20} style={{ marginLeft: '2px' }} />}
          </button>

          <button
            onClick={onSkipForward}
            disabled={!previewUrl}
            style={{ background: 'transparent', border: 'none', color: '#fff', opacity: previewUrl ? 0.8 : 0.4, cursor: previewUrl ? 'pointer' : 'default', padding: '6px' }}
          >
            <FastForward size={20} />
          </button>
        </div>
      </div>

      {/* Scrubber Progress Bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px' }}>
        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', fontFamily: 'var(--font-mono)', width: '32px', textAlign: 'right' }}>
          {formatTime(progress)}
        </span>
        <input 
          type="range" min="0" max={duration || 30} step="0.01"
          value={progress}
          onChange={(e) => onScrub && onScrub(parseFloat(e.target.value))}
          disabled={!previewUrl}
          style={{ 
            flex: 1, height: '4px', borderRadius: '2px',
            accentColor: style.accent,
            cursor: previewUrl ? 'pointer' : 'default',
            opacity: previewUrl ? 1 : 0.5,
            background: 'rgba(255,255,255,0.2)',
            WebkitAppearance: 'none'
          }}
        />
        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', fontFamily: 'var(--font-mono)', width: '32px' }}>
          -{formatTime(Math.max(0, duration - progress))}
        </span>
      </div>
    </div>
  );
}
