import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getInstagramSession } from '../services/api'
import { playWin98Click } from '../services/win98Audio'

/**
 * Pixel-accurate macOS Big Sur / Monterey "About This Mac" window for MemWault.
 * Replicates the exact layout, light mode aesthetic, top tabs, circular profile disc,
 * second-quadrant application logo badge, specs grid, and outside-click dismiss.
 */
export default function AboutMemWaultModal({ isOpen, onClose, stats = {} }) {
  const [activeTab, setActiveTab] = useState('Overview')
  const [igSession, setIgSession] = useState(null)

  useEffect(() => {
    if (isOpen) {
      getInstagramSession()
        .then(setIgSession)
        .catch(() => {})
    }
  }, [isOpen])

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

  const profilePic = igSession?.profile_pic_url 
    ? `/api/v1/proxy/image?url=${encodeURIComponent(igSession.profile_pic_url)}`
    : null

  const username = igSession?.full_name || igSession?.ig_username || 'MemWault Vault User'

  return (
    <AnimatePresence>
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 999999,
          backgroundColor: 'rgba(0, 0, 0, 0.45)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 8 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          onClick={(e) => e.stopPropagation()}
          style={{
            width: '590px',
            maxWidth: '96vw',
            backgroundColor: '#ffffff',
            borderRadius: '14px',
            border: '1px solid #d2d2d7',
            boxShadow: '0 24px 60px rgba(0,0,0,0.3), 0 0 1px rgba(0,0,0,0.2)',
            overflow: 'hidden',
            fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Helvetica Neue", Helvetica, Arial, sans-serif',
            color: '#1d1d1f',
            userSelect: 'none',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* ── Top Bar with Traffic Lights & Navigation Tabs ── */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 14px 6px 14px',
            borderBottom: '1px solid #e5e5ea',
            backgroundColor: '#fbfbfd',
          }}>
            {/* Traffic Light Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px', width: '80px' }}>
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
                }}
              />
              <span
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  backgroundColor: '#ffbd2e',
                  border: '0.5px solid #dea123',
                  opacity: 0.7,
                }}
              />
              <span
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  backgroundColor: '#27c93f',
                  border: '0.5px solid #1aab29',
                  opacity: 0.7,
                }}
              />
            </div>

            {/* Navigation Tabs */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
              {['Overview', 'Displays', 'Storage', 'Support', 'Service'].map((tab) => {
                const isActive = activeTab === tab
                return (
                  <button
                    key={tab}
                    onClick={() => { playWin98Click(); setActiveTab(tab); }}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: '4px 2px',
                      fontSize: '13px',
                      fontWeight: isActive ? 600 : 400,
                      color: isActive ? '#1d1d1f' : '#6e6e73',
                      cursor: 'pointer',
                      position: 'relative',
                      transition: 'color 0.15s ease',
                    }}
                  >
                    {tab}
                    {isActive && (
                      <span style={{
                        position: 'absolute',
                        bottom: '-7px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: '100%',
                        height: '2px',
                        backgroundColor: '#0071e3',
                        borderRadius: '2px',
                      }} />
                    )}
                  </button>
                )
              })}
            </div>

            {/* Right Balancer */}
            <div style={{ width: '80px' }} />
          </div>

          {/* ── Main Body Content ── */}
          <div style={{ padding: '32px 36px 20px 36px', minHeight: '230px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            {activeTab === 'Overview' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '34px' }}>
                {/* ── Left Column: Circular Profile Disc with 2nd-Quadrant App Logo Badge ── */}
                <div style={{ position: 'relative', width: '160px', height: '160px', flexShrink: 0 }}>
                  {/* Outer Bevel Ring / Shadow */}
                  <div style={{
                    width: '160px',
                    height: '160px',
                    borderRadius: '50%',
                    padding: '4px',
                    background: 'linear-gradient(135deg, #e5e5ea 0%, #ffffff 50%, #d2d2d7 100%)',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.18), inset 0 1px 2px rgba(255,255,255,0.8)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    {/* Inner Profile Image Circle */}
                    <div style={{
                      width: '100%',
                      height: '100%',
                      borderRadius: '50%',
                      overflow: 'hidden',
                      backgroundColor: '#1d1d1f',
                      position: 'relative',
                      boxShadow: 'inset 0 0 6px rgba(0,0,0,0.3)',
                    }}>
                      {profilePic ? (
                        <img
                          src={profilePic}
                          alt={username}
                          onError={(e) => {
                            e.target.src = '/win98-memwault-logo.png'
                          }}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        <img
                          src="/logos/memwault_app_logo.png"
                          alt="MemWault"
                          onError={(e) => {
                            e.target.src = '/win98-memwault-logo.png'
                          }}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            background: 'linear-gradient(135deg, #1d1d1f 0%, #2c3e50 100%)',
                            padding: '16px',
                          }}
                        />
                      )}
                    </div>
                  </div>

                  {/* ── App Logo Overlay in 2nd Quadrant (Top-Left of circle) ── */}
                  <div
                    title="MemWault Application"
                    style={{
                      position: 'absolute',
                      top: '-2px',
                      left: '-2px',
                      width: '46px',
                      height: '46px',
                      borderRadius: '50%',
                      backgroundColor: '#ffffff',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.22), 0 0 1px rgba(0,0,0,0.15)',
                      border: '2.5px solid #ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      zIndex: 2,
                    }}
                  >
                    <img
                      src="/logos/memwault_app_logo.png"
                      alt="MemWault Logo"
                      onError={(e) => {
                        e.target.src = '/win98-memwault-logo.png'
                      }}
                      style={{ width: '32px', height: '32px', objectFit: 'contain' }}
                    />
                  </div>
                </div>

                {/* ── Right Column: Typography, Specs & Action Buttons ── */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  {/* Title */}
                  <h1 style={{
                    margin: '0 0 2px 0',
                    fontSize: '26px',
                    fontWeight: 700,
                    color: '#1d1d1f',
                    letterSpacing: '-0.4px',
                    lineHeight: 1.1,
                  }}>
                    MemWault 98
                  </h1>

                  {/* Version */}
                  <div style={{ fontSize: '13px', color: '#6e6e73', marginBottom: '16px' }}>
                    Version 3.2.0 (Build 98SE)
                  </div>

                  {/* Specs Rows */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '5px',
                    fontSize: '12px',
                    color: '#1d1d1f',
                    marginBottom: '18px',
                    lineHeight: 1.4,
                  }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '95px 1fr', gap: '6px' }}>
                      <span style={{ fontWeight: 400, color: '#6e6e73' }}>User Vault</span>
                      <span style={{ fontWeight: 600 }}>{username}</span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '95px 1fr', gap: '6px' }}>
                      <span style={{ fontWeight: 400, color: '#6e6e73' }}>Processor</span>
                      <span style={{ fontWeight: 600 }}>SQLite 3.x Spatial Engine</span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '95px 1fr', gap: '6px' }}>
                      <span style={{ fontWeight: 400, color: '#6e6e73' }}>Memory</span>
                      <span style={{ fontWeight: 600 }}>
                        {stats?.total_stories || 0} Archived Stories ({stats?.total_photos || 0} Photos, {stats?.total_videos || 0} Videos)
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '95px 1fr', gap: '6px' }}>
                      <span style={{ fontWeight: 400, color: '#6e6e73' }}>Serial Number</span>
                      <span style={{ fontWeight: 600, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>
                        MW98-PRO-VAULT-2026
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      onClick={() => {
                        playWin98Click()
                        onClose()
                        window.location.hash = '#/settings'
                      }}
                      style={{
                        padding: '4px 14px',
                        backgroundColor: '#f5f5f7',
                        border: '1px solid #d2d2d7',
                        borderRadius: '6px',
                        color: '#1d1d1f',
                        fontSize: '12px',
                        fontWeight: 500,
                        cursor: 'pointer',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = '#e8e8ed'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = '#f5f5f7'}
                    >
                      System Report...
                    </button>

                    <button
                      onClick={() => {
                        playWin98Click()
                        onClose()
                        window.location.hash = '#/timeline'
                      }}
                      style={{
                        padding: '4px 14px',
                        backgroundColor: '#f5f5f7',
                        border: '1px solid #d2d2d7',
                        borderRadius: '6px',
                        color: '#1d1d1f',
                        fontSize: '12px',
                        fontWeight: 500,
                        cursor: 'pointer',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = '#e8e8ed'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = '#f5f5f7'}
                    >
                      Software Update...
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'Storage' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '14px', fontWeight: 600 }}>MemWault Vault Storage</span>
                  <span style={{ fontSize: '13px', color: '#6e6e73' }}>{stats?.storage_used_mb || '54.8'} MB Used of 2.0 GB Allocated</span>
                </div>

                {/* Storage Bar Graphic */}
                <div style={{
                  width: '100%',
                  height: '24px',
                  borderRadius: '6px',
                  backgroundColor: '#e5e5ea',
                  overflow: 'hidden',
                  display: 'flex',
                  boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.1)',
                }}>
                  <div style={{ width: '45%', backgroundColor: '#ff9500' }} title="Photos" />
                  <div style={{ width: '30%', backgroundColor: '#ff2d55' }} title="Videos" />
                  <div style={{ width: '15%', backgroundColor: '#007aff' }} title="Database & Metadata" />
                  <div style={{ width: '10%', backgroundColor: '#34c759' }} title="Journals" />
                </div>

                {/* Legend */}
                <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#6e6e73' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span style={{ width: '10px', height: '10px', backgroundColor: '#ff9500', borderRadius: '2px' }} />
                    Photos ({stats?.total_photos || 0})
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span style={{ width: '10px', height: '10px', backgroundColor: '#ff2d55', borderRadius: '2px' }} />
                    Videos ({stats?.total_videos || 0})
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span style={{ width: '10px', height: '10px', backgroundColor: '#007aff', borderRadius: '2px' }} />
                    System DB
                  </span>
                </div>
              </div>
            )}

            {activeTab === 'Displays' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                <div style={{ fontSize: '38px' }}>🖥️</div>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 600, color: '#1d1d1f' }}>
                    Retina Display & Spatial StreetView Canvas
                  </div>
                  <div style={{ fontSize: '13px', color: '#6e6e73', marginTop: '4px' }}>
                    1920 × 1080 Resolution • 60 Hz ProMotion • Windows 98 Retro Desktop Mode
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'Support' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
                <div style={{ fontWeight: 600 }}>MemWault Help & Documentation</div>
                <div style={{ color: '#6e6e73' }}>
                  Need assistance preserving Instagram memories or exploring the World Atlas?
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                  <button
                    onClick={() => {
                      playWin98Click()
                      onClose()
                      window.location.hash = '#/settings'
                    }}
                    style={{
                      padding: '4px 12px',
                      backgroundColor: '#f5f5f7',
                      border: '1px solid #d2d2d7',
                      borderRadius: '6px',
                      fontSize: '12px',
                      cursor: 'pointer',
                    }}
                  >
                    User Guide...
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'Service' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                <div style={{ fontWeight: 600 }}>Local Vault Guarantee</div>
                <div style={{ color: '#6e6e73' }}>
                  Coverage: Active & Lifetime Local SQLite Vault Storage.
                </div>
                <div style={{ color: '#34c759', fontWeight: 600, fontSize: '12px' }}>
                  ● Hardware & Database COM1 Link Verified
                </div>
              </div>
            )}
          </div>

          {/* ── Bottom Legal / Copyright Ribbon ── */}
          <div style={{
            padding: '12px 20px',
            textAlign: 'center',
            fontSize: '11px',
            color: '#86868b',
            borderTop: '1px solid #f2f2f7',
            backgroundColor: '#ffffff',
          }}>
            ™ and © 1983–2026 Apple Inc. & MemWault Corp. All Rights Reserved. &nbsp;&nbsp;
            <span style={{ color: '#0071e3', cursor: 'pointer' }} onClick={() => { playWin98Click(); onClose(); }}>
              License Agreement
            </span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
