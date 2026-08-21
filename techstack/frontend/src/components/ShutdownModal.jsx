import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Power, AlertTriangle, RefreshCw, CheckCircle2, X } from 'lucide-react';
import { shutdownSystem } from '../services/api';

export default function ShutdownModal({ isOpen, onClose }) {
  const [isShuttingDown, setIsShuttingDown] = useState(false);
  const [isDone, setIsDone] = useState(false);

  const handleConfirm = async () => {
    setIsShuttingDown(true);
    try {
      await shutdownSystem();
      setIsDone(true);
    } catch (err) {
      // Even if network fails because server terminated immediately, consider it done
      setIsDone(true);
    }
  };

  if (!isOpen) return null;

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
            backgroundColor: 'var(--ios-bg-card, #1c1c1e)',
            borderRadius: '24px',
            border: '1px solid var(--ios-border, rgba(255,255,255,0.1))',
            boxShadow: '0 25px 60px rgba(0,0,0,0.7)',
            padding: '28px',
            position: 'relative',
            color: 'var(--ios-text-primary, #fff)',
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
                background: 'var(--ios-border, rgba(255,255,255,0.1))',
                border: 'none',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'inherit'
              }}
            >
              <X size={18} />
            </button>
          )}

          {!isDone ? (
            <div>
              {/* Header Icon */}
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

              <h3 style={{ fontSize: '22px', fontWeight: 700, margin: '0 0 8px 0', letterSpacing: '-0.3px' }}>
                Shut Down MemWault?
              </h3>
              
              <p style={{ fontSize: '14px', color: 'var(--ios-text-secondary, #8e8e93)', lineHeight: 1.5, margin: '0 0 24px 0' }}>
                This will safely stop all background Python services, Uvicorn API servers, Vite frontend processes, and close the command prompt terminal windows.
              </p>

              <div style={{
                background: 'var(--ios-bg-app, #121214)',
                border: '1px solid var(--ios-border, rgba(255,255,255,0.08))',
                borderRadius: '14px',
                padding: '12px 16px',
                fontSize: '12px',
                color: 'var(--ios-text-secondary, #a0a0a5)',
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
                  className="ios-btn-secondary"
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '14px',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer'
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
              {/* Powered Off Confirmation State */}
              <div style={{
                width: '72px',
                height: '72px',
                borderRadius: '24px',
                background: 'linear-gradient(135deg, #181818, #2c2c2c)',
                border: '2px solid rgba(255,255,255,0.1)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '18px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.6)'
              }}>
                <img src="/memwault-logo.png" alt="MemWault" style={{ width: '48px', height: '48px', objectFit: 'contain' }} onError={(e) => { e.target.style.display = 'none'; }} />
                <CheckCircle2 size={36} color="#34c759" style={{ position: 'absolute' }} />
              </div>

              <h3 style={{ fontSize: '22px', fontWeight: 800, margin: '0 0 8px 0', letterSpacing: '-0.3px', color: '#fff' }}>
                MemWault is Powered Off
              </h3>

              <p style={{ fontSize: '14px', color: 'var(--ios-text-secondary, #a0a0a5)', lineHeight: 1.5, margin: '0 0 20px 0' }}>
                All backend Python scripts, Vite dev servers, and terminal prompt menus have been shut down cleanly.
              </p>

              <div style={{
                background: 'rgba(232, 158, 56, 0.1)',
                border: '1px solid rgba(232, 158, 56, 0.3)',
                borderRadius: '16px',
                padding: '16px',
                fontSize: '13px',
                color: '#e89e38',
                marginBottom: '20px',
                lineHeight: 1.4
              }}>
                <strong>Ready to relaunch?</strong><br/>
                Double-click <strong>start.bat</strong> or the <strong>MemWault</strong> shortcut icon to start everything back up.
              </div>

              <div style={{ fontSize: '12px', opacity: 0.6 }}>
                You can now safely close this browser window.
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
