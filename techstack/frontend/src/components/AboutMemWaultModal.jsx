import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getInstagramSession } from '../services/api'
import { playWin98Click } from '../services/win98Audio'
import { Github, ExternalLink, ShieldCheck, Database, HardDrive, CheckCircle2 } from 'lucide-react'

/**
 * Pixel-accurate macOS Big Sur / Monterey "About This Mac" window for MemWault.
 * Replicates the exact layout, light mode aesthetic, top tabs, circular profile disc,
 * second-quadrant application logo badge, specs grid, and outside-click dismiss.
 * Isolated from global Win98 button stylesheets.
 */
export default function AboutMemWaultModal({ isOpen, onClose, stats = {} }) {
  const [activeTab, setActiveTab] = useState('Overview')
  const [igSession, setIgSession] = useState(() => {
    try {
      const cached = localStorage.getItem('memwault_ig_session')
      return cached ? JSON.parse(cached) : null
    } catch {
      return null
    }
  })

  useEffect(() => {
    getInstagramSession()
      .then((session) => {
        if (session) {
          setIgSession(session)
          try {
            localStorage.setItem('memwault_ig_session', JSON.stringify(session))
            if (session.profile_pic_url) {
              localStorage.setItem('memwault_profile_pic', session.profile_pic_url)
            }
          } catch {}
        }
      })
      .catch(() => {})
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

  const rawPic = igSession?.profile_pic_url || localStorage.getItem('memwault_profile_pic')
  const profilePic = rawPic ? (rawPic.startsWith('http') ? `/api/v1/proxy/image?url=${encodeURIComponent(rawPic)}` : rawPic) : null

  const username = igSession?.full_name || igSession?.ig_username || 'Mehul Jain'

  return (
    <AnimatePresence>
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 999999,
          backgroundColor: 'rgba(0, 0, 0, 0.45)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
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
            width: '600px',
            maxWidth: '96vw',
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #d2d2d7',
            boxShadow: '0 24px 60px rgba(0,0,0,0.32), 0 0 1px rgba(0,0,0,0.2)',
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
            padding: '12px 16px 8px 16px',
            borderBottom: '1px solid #e5e5ea',
            backgroundColor: '#fbfbfd',
          }}>
            {/* Traffic Light Dots (using div to prevent Win98 button override) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '80px' }}>
              <div
                onClick={() => { playWin98Click(); onClose(); }}
                title="Close"
                role="button"
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  backgroundColor: '#ff5f56',
                  border: '0.5px solid #e0443e',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              />
              <div
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  backgroundColor: '#ffbd2e',
                  border: '0.5px solid #dea123',
                  opacity: 0.6,
                  flexShrink: 0,
                }}
              />
              <div
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  backgroundColor: '#27c93f',
                  border: '0.5px solid #1aab29',
                  opacity: 0.6,
                  flexShrink: 0,
                }}
              />
            </div>

            {/* Navigation Tabs (using styled div to completely bypass Win98 button styles) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '22px' }}>
              {['Overview', 'Displays', 'Storage', 'Support', 'Service'].map((tab) => {
                const isActive = activeTab === tab
                return (
                  <div
                    key={tab}
                    role="button"
                    onClick={() => { playWin98Click(); setActiveTab(tab); }}
                    style={{
                      background: 'none',
                      border: 'none',
                      boxShadow: 'none',
                      padding: '4px 2px',
                      fontSize: '13px',
                      fontWeight: isActive ? 600 : 400,
                      color: isActive ? '#1d1d1f' : '#6e6e73',
                      cursor: 'pointer',
                      position: 'relative',
                      transition: 'color 0.15s ease',
                      outline: 'none',
                      userSelect: 'none',
                    }}
                  >
                    {tab}
                    {isActive && (
                      <span style={{
                        position: 'absolute',
                        bottom: '-9px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: '100%',
                        height: '2px',
                        backgroundColor: '#0071e3',
                        borderRadius: '2px',
                      }} />
                    )}
                  </div>
                )
              })}
            </div>

            {/* Right Balancer */}
            <div style={{ width: '80px' }} />
          </div>

          {/* ── Main Body Content ── */}
          <div style={{ padding: '34px 38px 24px 38px', minHeight: '230px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            {/* 1. OVERVIEW TAB */}
            {activeTab === 'Overview' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '36px' }}>
                {/* ── Left Column: Circular Profile Disc with 2nd-Quadrant App Logo Badge ── */}
                <div style={{ position: 'relative', width: '160px', height: '160px', flexShrink: 0 }}>
                  {/* Outer Bevel Ring */}
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
                            if (rawPic && e.target.src.includes('/proxy/')) {
                              e.target.src = rawPic
                            } else {
                              e.target.src = '/logos/memwault_app_logo.png'
                            }
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

                  {/* Action Buttons (div styled as macOS pill buttons) */}
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <div
                      role="button"
                      onClick={() => {
                        playWin98Click()
                        onClose()
                        window.location.hash = '#/settings'
                      }}
                      style={{
                        padding: '5px 14px',
                        backgroundColor: '#f5f5f7',
                        border: '1px solid #d2d2d7',
                        borderRadius: '6px',
                        color: '#1d1d1f',
                        fontSize: '12px',
                        fontWeight: 500,
                        cursor: 'pointer',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                        transition: 'background 0.15s ease',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e8e8ed'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f5f5f7'}
                    >
                      System Report...
                    </div>

                    <div
                      role="button"
                      onClick={() => {
                        playWin98Click()
                        onClose()
                        window.location.hash = '#/timeline'
                      }}
                      style={{
                        padding: '5px 14px',
                        backgroundColor: '#f5f5f7',
                        border: '1px solid #d2d2d7',
                        borderRadius: '6px',
                        color: '#1d1d1f',
                        fontSize: '12px',
                        fontWeight: 500,
                        cursor: 'pointer',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                        transition: 'background 0.15s ease',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e8e8ed'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f5f5f7'}
                    >
                      Software Update...
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 2. STORAGE TAB */}
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

            {/* 3. DISPLAYS TAB */}
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

            {/* 4. SUPPORT TAB — Links to GitHub */}
            {activeTab === 'Support' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
                <div style={{ fontWeight: 600, fontSize: '15px', color: '#1d1d1f' }}>
                  Developer & Repository Support
                </div>
                <div style={{ color: '#6e6e73', lineHeight: 1.5 }}>
                  MemWault is architected by <strong>Mehul Jain</strong> to permanently preserve your Instagram memories with zero cloud lock-in.
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                  <a
                    href="https://github.com/mehuljain866/MemWault"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => playWin98Click()}
                    style={{
                      padding: '6px 14px',
                      backgroundColor: '#f5f5f7',
                      border: '1px solid #d2d2d7',
                      borderRadius: '6px',
                      color: '#1d1d1f',
                      fontSize: '12px',
                      fontWeight: 600,
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                    }}
                  >
                    <Github size={14} />
                    <span>MemWault on GitHub</span>
                    <ExternalLink size={11} color="#6e6e73" />
                  </a>

                  <a
                    href="https://github.com/mehuljain866"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => playWin98Click()}
                    style={{
                      padding: '6px 14px',
                      backgroundColor: '#f5f5f7',
                      border: '1px solid #d2d2d7',
                      borderRadius: '6px',
                      color: '#1d1d1f',
                      fontSize: '12px',
                      fontWeight: 600,
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                    }}
                  >
                    <span>Mehul Jain (Profile)</span>
                    <ExternalLink size={11} color="#6e6e73" />
                  </a>
                </div>
              </div>
            )}

            {/* 5. SERVICE TAB — Witty, Philosophical & Accurate Local Data Sovereignty Guarantee */}
            {activeTab === 'Service' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
                <div style={{ fontWeight: 600, fontSize: '15px', color: '#1d1d1f', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ShieldCheck size={18} color="#0071e3" />
                  <span>Sovereignty & Local Ownership Guarantee</span>
                </div>
                
                <div style={{ color: '#424245', lineHeight: 1.5, fontSize: '12px' }}>
                  Your memories are not algorithmic fuel, nor are they tenants on someone else's ephemeral cloud server. 
                  Every photograph, story reel, timestamp, and journal entry is preserved in permanent local SQLite storage on this machine.
                </div>

                <div style={{ color: '#6e6e73', lineHeight: 1.4, fontSize: '12px', fontStyle: 'italic' }}>
                  "If the global network goes dark, your vault remains intact, timeless, and completely yours."
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: 'rgba(52, 199, 89, 0.1)',
                  border: '1px solid rgba(52, 199, 89, 0.3)',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  color: '#1b8a3e',
                  fontWeight: 600,
                  marginTop: '4px',
                }}>
                  <CheckCircle2 size={13} color="#34c759" />
                  <span>100% Local SQLite Vault • Zero Telemetry • Physical Hardware Sovereignty</span>
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
            ™ and © 2026 Mehul Jain. All Rights Reserved. &nbsp;•&nbsp;
            <a
              href="https://github.com/mehuljain866/MemWault/blob/main/LICENSE"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => playWin98Click()}
              style={{ color: '#0071e3', textDecoration: 'none', fontWeight: 500 }}
              onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
              onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
            >
              License Agreement
            </a>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
