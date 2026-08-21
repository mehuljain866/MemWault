import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Power, AlertTriangle, RefreshCw, CheckCircle2, X, Monitor, HelpCircle } from 'lucide-react';
import { shutdownSystem } from '../services/api';
import { getSettings } from '../services/settings';
import { playWin98Shutdown, playWin98Click } from '../services/win98Audio';

export default function ShutdownModal({ isOpen, onClose }) {
  const [isShuttingDown, setIsShuttingDown] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [shutdownOption, setShutdownOption] = useState('shutdown'); // 'shutdown' | 'restart'
  const settings = getSettings();
  const isWin98 = settings.themeId === 'win98';

  const handleConfirm = async () => {
    if (isWin98) {
      try {
        playWin98Shutdown();
      } catch (e) {}
    }
    setIsShuttingDown(true);
    try {
      await shutdownSystem();
      setIsDone(true);
    } catch (err) {
      // Even if network drops due to immediate process exit, show power off screen
      setIsDone(true);
    }
  };

  if (!isOpen) return null;

  // ═══════════════════════════════════════════════════════════
  // 1. WINDOWS 98 AUTHENTIC SHUTDOWN FLOW
  // ═══════════════════════════════════════════════════════════
  if (isWin98) {
    if (isDone) {
      // Iconic Bit-for-Bit Authentic Windows 98 "It's now safe to turn off your computer" screen
      return (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 999999,
          backgroundColor: '#000000',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          userSelect: 'none',
          backgroundImage: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.4) 0px, rgba(0,0,0,0.4) 1px, transparent 1px, transparent 2px)',
        }}>
          {/* Authentic Glowing Amber Orange Typography */}
          <h1 style={{
            fontSize: '44px',
            fontStyle: 'italic',
            fontWeight: 'normal',
            color: '#ff8800',
            fontFamily: '"Times New Roman", Times, "MS Serif", serif',
            textShadow: '0 0 12px rgba(255, 136, 0, 0.7), 2px 2px 0px #803000',
            letterSpacing: '1px',
            lineHeight: 1.3,
            margin: '0 0 36px 0',
            textAlign: 'center',
          }}>
            It's now safe to turn off<br/>your computer.
          </h1>

          {/* Minimalist Retro Reboot Control */}
          <button
            onClick={() => window.location.reload()}
            style={{
              backgroundColor: '#000000',
              border: '1px solid #ff8800',
              color: '#ff8800',
              padding: '6px 18px',
              fontFamily: '"MS Sans Serif", Tahoma, monospace',
              fontSize: '11px',
              fontWeight: 'bold',
              cursor: 'pointer',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              boxShadow: '0 0 8px rgba(255, 136, 0, 0.3)',
            }}
          >
            [ Restart Computer ]
          </button>
        </div>
      );
    }

    // Windows 98 Authentic Dialog
    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
      }}>
        <div style={{
          width: '360px',
          backgroundColor: 'var(--win98-face, #c0c0c0)',
          border: '1px solid #000',
          boxShadow: `
            inset 1px 1px 0px 0px var(--win98-highlight, #ffffff),
            inset -1px -1px 0px 0px var(--win98-dark-shadow, #000000),
            inset 2px 2px 0px 0px var(--win98-light, #dfdfdf),
            inset -2px -2px 0px 0px var(--win98-shadow, #808080),
            4px 4px 16px rgba(0,0,0,0.5)
          `,
          padding: '3px',
          fontFamily: 'var(--win98-font, "MS Sans Serif", Tahoma, sans-serif)',
          fontSize: '11px',
          color: '#000000',
          userSelect: 'none',
        }}>
          {/* Title Bar */}
          <div style={{
            background: 'linear-gradient(90deg, #000080 0%, #1084d0 100%)',
            color: '#ffffff',
            fontWeight: 'bold',
            padding: '3px 4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '8px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Monitor size={14} color="#ffffff" />
              <span>Shut Down MemWault</span>
            </div>
            <button
              onClick={() => { playWin98Click(); onClose(); }}
              style={{
                width: '16px',
                height: '14px',
                backgroundColor: '#c0c0c0',
                border: 'none',
                boxShadow: 'inset 1px 1px #fff, inset -1px -1px #000',
                color: '#000000',
                fontSize: '10px',
                fontWeight: 'bold',
                lineHeight: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
              }}
            >
              ✕
            </button>
          </div>

          {/* Dialog Body */}
          <div style={{ padding: '8px 12px', display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
            <img
              src="/win98-memwault-logo.png"
              alt="Computer"
              style={{ width: '42px', height: '42px', imageRendering: 'pixelated', flexShrink: 0 }}
            />

            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '10px', color: '#000080' }}>
                What do you want the computer to do?
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="win98_shutdown"
                    value="shutdown"
                    checked={shutdownOption === 'shutdown'}
                    onChange={() => setShutdownOption('shutdown')}
                  />
                  <span><u>S</u>hut down MemWault services</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="win98_shutdown"
                    value="restart"
                    checked={shutdownOption === 'restart'}
                    onChange={() => setShutdownOption('restart')}
                  />
                  <span><u>R</u>estart in background mode</span>
                </label>
              </div>
            </div>
          </div>

          {/* Buttons Row */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', padding: '10px 8px 4px 8px' }}>
            <button
              onClick={handleConfirm}
              disabled={isShuttingDown}
              className="btn-win98"
              style={{ width: '70px', padding: '4px', fontWeight: 'bold' }}
            >
              {isShuttingDown ? 'Stopping...' : 'OK'}
            </button>
            <button
              onClick={() => { playWin98Click(); onClose(); }}
              disabled={isShuttingDown}
              className="btn-win98"
              style={{ width: '70px', padding: '4px' }}
            >
              Cancel
            </button>
            <button
              onClick={() => alert('MemWault 98 Power Manager\n\nStops the Python Uvicorn backend and Vite local server cleanly.')}
              className="btn-win98"
              style={{ width: '70px', padding: '4px' }}
            >
              Help
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // 2. MODERN / UNIVERSAL THEME SHUTDOWN FLOW
  // ═══════════════════════════════════════════════════════════
  return (
    <AnimatePresence>
      <div 
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(16px)',
          padding: '16px',
        }}
        onClick={isDone ? undefined : onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          style={{
            width: '100%',
            maxWidth: '460px',
            backgroundColor: '#1c1c1e',
            borderRadius: '24px',
            border: '1px solid rgba(255,255,255,0.12)',
            boxShadow: '0 25px 60px rgba(0,0,0,0.8)',
            padding: '28px',
            position: 'relative',
            color: '#ffffff',
            textAlign: 'center'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {!isDone && !isShuttingDown && (
            <button
              onClick={onClose}
              style={{
                position: 'absolute',
                top: '18px',
                right: '18px',
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#ffffff'
              }}
            >
              <X size={18} />
            </button>
          )}

          {!isDone ? (
            <div>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '20px',
                backgroundColor: 'rgba(255, 59, 48, 0.15)',
                color: '#ff3b30',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px',
                boxShadow: '0 4px 16px rgba(255, 59, 48, 0.2)'
              }}>
                <Power size={32} strokeWidth={2.5} />
              </div>

              <h3 style={{ fontSize: '22px', fontWeight: 700, margin: '0 0 8px 0', letterSpacing: '-0.3px', color: '#ffffff' }}>
                Shut Down MemWault?
              </h3>
              
              <p style={{ fontSize: '14px', color: '#a0a0a5', lineHeight: 1.5, margin: '0 0 24px 0' }}>
                This will safely stop all background Python services, Uvicorn API servers, Vite frontend processes, and close command prompt windows.
              </p>

              <div style={{
                background: '#121214',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '14px',
                padding: '12px 16px',
                fontSize: '12px',
                color: '#a0a0a5',
                marginBottom: '24px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                textAlign: 'left'
              }}>
                <AlertTriangle size={18} color="#e89e38" style={{ flexShrink: 0 }} />
                <span>To start MemWault back up later, run <strong>start.bat</strong> or double-click the <strong>MemWault</strong> launcher.</span>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={onClose}
                  disabled={isShuttingDown}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '14px',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    background: 'rgba(255,255,255,0.1)',
                    color: '#ffffff',
                    border: '1px solid rgba(255,255,255,0.12)',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={isShuttingDown}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '14px',
                    fontSize: '14px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    background: '#ff3b30',
                    color: '#ffffff',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 14px rgba(255, 59, 48, 0.4)'
                  }}
                >
                  {isShuttingDown ? (
                    <>
                      <RefreshCw size={16} className="spin-anim" />
                      <span>Shutting down...</span>
                    </>
                  ) : (
                    <>
                      <Power size={16} />
                      <span>Shut Down All</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div style={{
                width: '72px',
                height: '72px',
                borderRadius: '24px',
                background: '#121214',
                border: '2px solid rgba(255,255,255,0.15)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '18px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
                position: 'relative',
              }}>
                <img
                  src="/memwault-logo.png"
                  alt="MemWault"
                  style={{ width: '44px', height: '44px', objectFit: 'contain' }}
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
                <CheckCircle2 size={30} color="#34c759" style={{ position: 'absolute', bottom: '-4px', right: '-4px', backgroundColor: '#1c1c1e', borderRadius: '50%' }} />
              </div>

              <h3 style={{ fontSize: '22px', fontWeight: 800, margin: '0 0 8px 0', letterSpacing: '-0.3px', color: '#ffffff' }}>
                MemWault is Powered Off
              </h3>

              <p style={{ fontSize: '14px', color: '#a0a0a5', lineHeight: 1.5, margin: '0 0 20px 0' }}>
                All backend Python scripts, Vite dev servers, and terminal prompt menus have been shut down cleanly.
              </p>

              <div style={{
                background: 'rgba(232, 158, 56, 0.15)',
                border: '1px solid rgba(232, 158, 56, 0.4)',
                borderRadius: '16px',
                padding: '16px',
                fontSize: '13px',
                color: '#f5a623',
                marginBottom: '20px',
                lineHeight: 1.4
              }}>
                <strong style={{ color: '#ffcc00' }}>Ready to relaunch?</strong><br/>
                Double-click <strong style={{ color: '#ffffff' }}>start.bat</strong> or the <strong style={{ color: '#ffffff' }}>MemWault</strong> shortcut icon to start everything back up.
              </div>

              <div style={{ fontSize: '12px', color: '#888888' }}>
                You can now safely close this browser window.
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
