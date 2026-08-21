import React, { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { HardDrive, Cpu, Database, Sparkles, ExternalLink, ShieldCheck, Layers, X } from 'lucide-react'
import { playWin98Click } from '../services/win98Audio'

/**
 * Apple "About This Mac" inspired system overview window for MemWault.
 * Dismisses on outside backdrop click or Escape key.
 */
export default function AboutMemWaultModal({ isOpen, onClose, stats = {} }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    if (isOpen) window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 999999,
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 10 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          onClick={(e) => e.stopPropagation()}
          style={{
            width: '490px',
            maxWidth: '96vw',
            backgroundColor: 'rgba(30, 30, 32, 0.92)',
            borderRadius: '18px',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            boxShadow: '0 30px 80px rgba(0,0,0,0.7), 0 0 1px rgba(255,255,255,0.4)',
            overflow: 'hidden',
            fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif',
            color: '#ffffff',
            userSelect: 'none',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Top macOS Traffic Light Title Bar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            backgroundColor: 'rgba(255, 255, 255, 0.03)',
          }}>
            {/* Traffic Light Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={() => { playWin98Click(); onClose(); }}
                title="Close"
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  backgroundColor: '#ff5f56',
                  border: '0.5px solid #e0443e',
                  cursor: 'pointer',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              />
              <span
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  backgroundColor: '#ffbd2e',
                  border: '0.5px solid #dea123',
                  display: 'inline-block',
                }}
              />
              <span
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  backgroundColor: '#27c93f',
                  border: '0.5px solid #1aab29',
                  display: 'inline-block',
                }}
              />
            </div>

            <span style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255, 255, 255, 0.65)', letterSpacing: '0.2px' }}>
              About MemWault
            </span>

            <div style={{ width: '50px' }} />
          </div>

          {/* Body Content */}
          <div style={{ padding: '28px 24px 20px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {/* Hero Logo Graphic */}
            <div style={{
              position: 'relative',
              width: '84px',
              height: '84px',
              borderRadius: '20px',
              backgroundColor: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 12px 30px rgba(0,0,0,0.5)',
              marginBottom: '16px',
            }}>
              <img
                src="/logos/memwault_app_logo.png"
                alt="MemWault"
                onError={(e) => {
                  e.target.src = '/win98-memwault-logo.png'
                }}
                style={{ width: '64px', height: '64px', objectFit: 'contain' }}
              />
              <div style={{
                position: 'absolute',
                bottom: '-4px',
                right: '-4px',
                backgroundColor: '#007aff',
                borderRadius: '50%',
                width: '20px',
                height: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
              }}>
                <ShieldCheck size={12} color="#ffffff" />
              </div>
            </div>

            {/* Title & Version */}
            <h2 style={{ margin: '0 0 2px 0', fontSize: '20px', fontWeight: 700, color: '#ffffff', letterSpacing: '-0.2px' }}>
              MemWault 98
            </h2>
            <span style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '20px' }}>
              Version 3.2.0 (Build 98SE.2026)
            </span>

            {/* Specifications Card (Apple "About This Mac" Grid) */}
            <div style={{
              width: '100%',
              backgroundColor: 'rgba(255, 255, 255, 0.04)',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              padding: '12px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              fontSize: '12px',
              marginBottom: '20px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'rgba(255, 255, 255, 0.55)', fontWeight: 500 }}>System Architecture</span>
                <span style={{ fontWeight: 600, color: '#ffffff' }}>MemWault 98 Spatial Engine</span>
              </div>

              <div style={{ height: '1px', backgroundColor: 'rgba(255, 255, 255, 0.06)' }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'rgba(255, 255, 255, 0.55)', fontWeight: 500 }}>Core Engine</span>
                <span style={{ fontWeight: 600, color: '#ffffff' }}>SQLite 3.x Local Database</span>
              </div>

              <div style={{ height: '1px', backgroundColor: 'rgba(255, 255, 255, 0.06)' }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'rgba(255, 255, 255, 0.55)', fontWeight: 500 }}>Archived Memories</span>
                <span style={{ fontWeight: 600, color: '#ffffff' }}>
                  {stats?.total_stories || 0} Stories ({stats?.total_photos || 0} Photos, {stats?.total_videos || 0} Videos)
                </span>
              </div>

              <div style={{ height: '1px', backgroundColor: 'rgba(255, 255, 255, 0.06)' }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'rgba(255, 255, 255, 0.55)', fontWeight: 500 }}>Storage Allocated</span>
                <span style={{ fontWeight: 600, color: '#34c759' }}>{stats?.storage_used_mb || '54.8'} MB Used (Local)</span>
              </div>

              <div style={{ height: '1px', backgroundColor: 'rgba(255, 255, 255, 0.06)' }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'rgba(255, 255, 255, 0.55)', fontWeight: 500 }}>Serial Number</span>
                <span style={{ fontWeight: 600, color: 'rgba(255, 255, 255, 0.75)', fontFamily: 'monospace' }}>MW98-PRO-VAULT-2026</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '10px', width: '100%', justifyContent: 'center' }}>
              <button
                onClick={() => {
                  playWin98Click()
                  onClose()
                  window.location.hash = '#/settings'
                }}
                style={{
                  flex: 1,
                  padding: '7px 14px',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '8px',
                  color: '#ffffff',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.18)'}
                onMouseLeave={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
              >
                System Settings...
              </button>

              <button
                onClick={() => {
                  playWin98Click()
                  onClose()
                }}
                style={{
                  flex: 1,
                  padding: '7px 14px',
                  backgroundColor: '#007aff',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#ffffff',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(0, 122, 255, 0.4)',
                }}
              >
                Done
              </button>
            </div>

            {/* Legal / Copyright Line */}
            <div style={{ marginTop: '16px', fontSize: '10px', color: 'rgba(255, 255, 255, 0.35)', textAlign: 'center' }}>
              ™ and © 1998–2026 MemWault Corp. All rights reserved.
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
