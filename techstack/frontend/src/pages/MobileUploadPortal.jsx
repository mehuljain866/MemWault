import React, { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Smartphone, Upload, CheckCircle2, RefreshCw, 
  Sparkles, Layers, Image as ImageIcon, Film, AlertCircle,
  Wifi, Sun, Moon, Check, Disc, ArrowRight, ShieldCheck, Monitor, FileImage
} from 'lucide-react'
import { getUploadPortalSession, uploadToPortal } from '../services/api'

function MemWaultVaultIcon({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
      <rect width="32" height="32" rx="8" fill="var(--ios-accent, #E89E38)" />
      <path d="M7 25V13C7 9.68629 9.68629 7 13 7H19C22.3137 7 25 9.68629 25 13V25" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M11 25V16C11 14.3431 12.3431 13 14 13H18C19.6569 13 21 14.3431 21 16V25" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" opacity="0.85" />
      <circle cx="16" cy="18" r="1.5" fill="#ffffff" />
      <path d="M16 19.5V22" stroke="#ffffff" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

export default function MobileUploadPortal() {
  const { token } = useParams()
  const [sessionData, setSessionData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedSlide, setSelectedSlide] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const [lastUploadedName, setLastUploadedName] = useState('')
  const [theme, setTheme] = useState(() => localStorage.getItem('mw_mobile_theme') || 'dark')

  const fileInputRef = useRef(null)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('mw_mobile_theme', theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark')
  }

  const loadSession = async () => {
    try {
      const data = await getUploadPortalSession(token)
      setSessionData(data)
    } catch (err) {
      setError(err.message || 'Session expired or invalid')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSession()
  }, [token])

  const handleFileSelected = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setUploadSuccess(false)
    setLastUploadedName(file.name)
    try {
      if (window.navigator?.vibrate) {
        window.navigator.vibrate(50)
      }
      await uploadToPortal(token, selectedSlide, file)
      setUploadSuccess(true)
      if (window.navigator?.vibrate) {
        window.navigator.vibrate([100, 50, 100])
      }
      await loadSession()
      setTimeout(() => setUploadSuccess(false), 5000)
    } catch (err) {
      alert('Upload failed: ' + err.message)
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: 'var(--ios-bg-app, #000000)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px',
        color: 'var(--ios-text-primary, #ffffff)'
      }}>
        <MemWaultVaultIcon size={44} />
        <RefreshCw size={28} className="spin-anim" color="var(--ios-accent, #007aff)" />
        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ios-text-secondary)' }}>
          Establishing Local Secure Link...
        </span>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: 'var(--ios-bg-app, #000000)',
        color: 'var(--ios-text-primary, #ffffff)',
        padding: '48px 24px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        textAlign: 'center'
      }}>
        <div style={{
          width: '64px', height: '64px', borderRadius: '50%',
          backgroundColor: 'rgba(255, 59, 48, 0.15)', color: 'var(--ios-danger, #ff3b30)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px'
        }}>
          <AlertCircle size={36} />
        </div>
        <h2 style={{ fontSize: '22px', fontWeight: 800, margin: '0 0 8px 0' }}>Session Expired</h2>
        <p style={{ fontSize: '14px', color: 'var(--ios-text-secondary)', maxWidth: '320px', lineHeight: 1.5, margin: '0 0 24px 0' }}>
          This transfer link has expired or the QR code was re-generated. Please scan the latest code from your desktop screen.
        </p>
        <button
          onClick={loadSession}
          style={{
            padding: '12px 24px', borderRadius: '14px',
            backgroundColor: 'var(--ios-bg-card)', color: 'var(--ios-text-primary)',
            border: '1px solid var(--ios-border)', fontSize: '14px', fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer'
          }}
        >
          <RefreshCw size={16} /> Retry Connection
        </button>
      </div>
    )
  }

  const isGeneralTransfer = sessionData?.is_general_transfer || !sessionData?.post || sessionData?.post?.id === 'general-transfer'
  const post = sessionData?.post
  const mediaItems = post?.media_items || []
  const activeSlideData = mediaItems[selectedSlide] || mediaItems[0]
  const uploadedFiles = sessionData?.uploaded_files || []

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--ios-bg-app, #000000)',
        color: 'var(--ios-text-primary, #ffffff)',
        padding: '20px 16px 60px 16px',
        maxWidth: '480px',
        margin: '0 auto',
        fontFamily: 'var(--font-ios, -apple-system, sans-serif)'
      }}
    >
      {/* ── Top Header Navigation ───────────────────────────────── */}
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: '20px', padding: '4px 0'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <MemWaultVaultIcon size={28} />
          <div>
            <div style={{ fontSize: '16px', fontWeight: 800, letterSpacing: '-0.3px', lineHeight: 1.1 }}>
              MemWault
            </div>
            <div className="archive-label" style={{ fontSize: '8px', letterSpacing: '0.12em', color: 'var(--ios-text-secondary)' }}>
              {isGeneralTransfer ? 'DESKTOP AIR-TRANSFER' : 'LOCAL AIR-SYNC'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Live Wi-Fi Beacon */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            backgroundColor: 'rgba(52, 199, 89, 0.12)', color: '#34c759',
            padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 700,
            border: '1px solid rgba(52, 199, 89, 0.25)'
          }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#34c759', display: 'inline-block', boxShadow: '0 0 6px #34c759' }} />
            <span>Connected</span>
          </div>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            style={{
              width: '34px', height: '34px', borderRadius: '50%',
              backgroundColor: 'var(--ios-bg-card)', border: '1px solid var(--ios-border)',
              color: 'var(--ios-text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer'
            }}
            title="Toggle theme"
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </header>

      {/* ── MODE 1: General Wallpaper & Media Transfer ── */}
      {isGeneralTransfer ? (
        <>
          {/* Hero Banner for Wallpaper Upload */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(0, 122, 255, 0.18) 0%, rgba(88, 86, 214, 0.12) 100%)',
            border: '1px solid rgba(0, 122, 255, 0.25)',
            borderRadius: '20px', padding: '20px', marginBottom: '20px',
            position: 'relative', overflow: 'hidden'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
              <div style={{
                width: '44px', height: '44px', borderRadius: '14px',
                backgroundColor: 'var(--ios-accent, #007aff)', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                boxShadow: '0 4px 14px rgba(0, 122, 255, 0.35)'
              }}>
                <Monitor size={24} />
              </div>
              <div>
                <h1 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 4px 0', letterSpacing: '-0.3px' }}>
                  Desktop Wallpaper Transfer
                </h1>
                <p style={{ fontSize: '12px', color: 'var(--ios-text-secondary)', margin: 0, lineHeight: 1.4 }}>
                  Select high-res photos or wallpapers from your phone. They will instantly transfer to your PC and appear in your Display Properties wallpaper list.
                </p>
              </div>
            </div>
          </div>

          {/* Upload Button Card */}
          <div style={{
            backgroundColor: 'var(--ios-bg-card)',
            borderRadius: '24px', padding: '24px 20px',
            border: '1px solid var(--ios-border)',
            boxShadow: 'var(--ios-shadow-md)',
            textAlign: 'center', marginBottom: '20px'
          }}>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              style={{ display: 'none' }}
              onChange={handleFileSelected}
            />

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              style={{
                width: '100%',
                backgroundColor: 'var(--ios-accent, #007aff)',
                color: '#ffffff',
                border: 'none', padding: '16px 20px', borderRadius: '16px',
                fontSize: '15px', fontWeight: 700, cursor: uploading ? 'default' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                boxShadow: '0 8px 24px rgba(0, 122, 255, 0.35)',
                transition: 'background-color 0.2s',
                opacity: uploading ? 0.75 : 1
              }}
            >
              {uploading ? (
                <>
                  <RefreshCw size={20} className="spin-anim" />
                  <span>Sending Wallpaper to PC...</span>
                </>
              ) : (
                <>
                  <Upload size={20} />
                  <span>Choose Wallpaper from Photos</span>
                </>
              )}
            </motion.button>

            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              marginTop: '14px', fontSize: '11px', color: 'var(--ios-text-secondary)'
            }}>
              <ShieldCheck size={14} color="var(--ios-accent, #007aff)" />
              <span>Transferred losslessly over your private Wi-Fi network</span>
            </div>

            {/* Success Alert Banner */}
            <AnimatePresence>
              {uploadSuccess && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: -10 }}
                  transition={{ duration: 0.25 }}
                  style={{
                    marginTop: '16px',
                    padding: '14px',
                    borderRadius: '14px',
                    backgroundColor: 'rgba(52, 199, 89, 0.15)',
                    border: '1px solid rgba(52, 199, 89, 0.3)',
                    color: '#34c759',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    fontSize: '13px', fontWeight: 700
                  }}
                >
                  <CheckCircle2 size={18} />
                  <span>Transferred! Wallpaper is now active on your PC!</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* List of Uploaded Wallpapers in this Session */}
          {uploadedFiles.length > 0 && (
            <div style={{
              backgroundColor: 'var(--ios-bg-card)',
              borderRadius: '20px', padding: '18px 16px',
              border: '1px solid var(--ios-border)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div className="archive-label" style={{ fontSize: '11px', fontWeight: 800 }}>
                  WALLPAPERS SENT TO PC ({uploadedFiles.length})
                </div>
                <span style={{ fontSize: '11px', color: '#34c759', fontWeight: 700 }}>
                  ✓ In Display Properties
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {uploadedFiles.map((file, idx) => (
                  <div 
                    key={idx}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '12px',
                      padding: '8px 12px', borderRadius: '12px',
                      backgroundColor: 'rgba(255,255,255,0.04)',
                      border: '1px solid var(--ios-border)'
                    }}
                  >
                    {file.url ? (
                      <img 
                        src={file.url} 
                        alt={file.filename || 'Uploaded Wallpaper'} 
                        style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'cover' }}
                      />
                    ) : (
                      <div style={{
                        width: '48px', height: '48px', borderRadius: '8px',
                        backgroundColor: 'rgba(0,122,255,0.1)', color: 'var(--ios-accent)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                        <FileImage size={24} />
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {file.filename || `Wallpaper ${idx + 1}`}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--ios-text-secondary)', marginTop: '2px' }}>
                        {file.size_bytes ? `${(file.size_bytes / (1024 * 1024)).toFixed(2)} MB` : 'Transferred'} • Ready on PC
                      </div>
                    </div>
                    <div style={{
                      backgroundColor: 'rgba(52, 199, 89, 0.15)', color: '#34c759',
                      padding: '4px 8px', borderRadius: '8px', fontSize: '10px', fontWeight: 800
                    }}>
                      SAVED
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        /* ── MODE 2: Instagram Post Slide Master RAW Replacement ── */
        <>
          {/* Hero Instruction Card */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(136, 116, 74, 0.15) 0%, rgba(0, 122, 255, 0.08) 100%)',
            border: '1px solid var(--ios-border)',
            borderRadius: '20px', padding: '18px 20px', marginBottom: '20px',
            position: 'relative', overflow: 'hidden'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
              <div style={{
                width: '42px', height: '42px', borderRadius: '12px',
                backgroundColor: 'var(--ios-accent, #E89E38)', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                boxShadow: '0 4px 12px rgba(232, 158, 56, 0.3)'
              }}>
                <Sparkles size={22} />
              </div>
              <div>
                <h1 style={{ fontSize: '17px', fontWeight: 800, margin: '0 0 4px 0', letterSpacing: '-0.3px' }}>
                  Attach Original Master Media
                </h1>
                <p style={{ fontSize: '12px', color: 'var(--ios-text-secondary)', margin: 0, lineHeight: 1.4 }}>
                  Stream your uncompressed full-resolution RAW photo, 4K video, or Live Photo directly to your PC desktop vault.
                </p>
              </div>
            </div>
          </div>

          {/* Target Post Summary */}
          <div style={{
            backgroundColor: 'var(--ios-bg-card)', borderRadius: '20px', padding: '16px',
            border: '1px solid var(--ios-border)', marginBottom: '20px',
            boxShadow: 'var(--ios-shadow-sm)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div className="archive-label">TARGET MEMORY</div>
              <span style={{ fontSize: '11px', color: 'var(--ios-text-secondary)' }}>
                {new Date(post?.taken_at || Date.now()).toLocaleDateString(undefined, { dateStyle: 'medium' })}
              </span>
            </div>
            <div style={{
              fontSize: '13px', fontWeight: 600, color: 'var(--ios-text-primary)',
              lineHeight: 1.4, marginBottom: '6px',
              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden'
            }}>
              {post?.caption_text || 'Instagram Post Archive'}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--ios-text-secondary)' }}>
              <Layers size={13} color="var(--ios-accent, #E89E38)" />
              <span>{mediaItems.length} {mediaItems.length === 1 ? 'Media Item' : 'Carousel Slides'}</span>
            </div>
          </div>

          {/* Interactive Slide Carousel Selector with REAL Thumbnails */}
          {mediaItems.length > 1 && (
            <div style={{ marginBottom: '20px' }}>
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                marginBottom: '10px'
              }}>
                <div className="archive-label">SELECT CAROUSEL SLIDE</div>
                <div style={{ fontSize: '11px', color: 'var(--ios-accent, #E89E38)', fontWeight: 700 }}>
                  Slide {selectedSlide + 1} of {mediaItems.length}
                </div>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${Math.min(mediaItems.length, 4)}, 1fr)`,
                gap: '10px'
              }}>
                {mediaItems.map((slide, idx) => {
                  const isSelected = selectedSlide === idx
                  const slidePreviewUrl = slide.display_url || slide.media_url || slide.instagram_media_url || slide.raw_media_url
                  return (
                    <motion.button
                      key={slide.id || idx}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => setSelectedSlide(idx)}
                      style={{
                        background: isSelected ? 'var(--ios-bg-card)' : 'transparent',
                        border: isSelected ? '2px solid var(--ios-accent, #E89E38)' : '1px solid var(--ios-border)',
                        borderRadius: '16px', padding: '6px',
                        display: 'flex', flexDirection: 'column', alignItems: 'center',
                        cursor: 'pointer', transition: 'all 0.2s cubic-bezier(0.25, 1, 0.5, 1)',
                        boxShadow: isSelected ? '0 4px 16px rgba(136, 116, 74, 0.25)' : 'none',
                        position: 'relative', overflow: 'hidden'
                      }}
                    >
                      {/* Thumbnail Preview */}
                      <div style={{
                        width: '100%', aspectRatio: '1', borderRadius: '10px',
                        overflow: 'hidden', backgroundColor: 'rgba(0,0,0,0.2)',
                        marginBottom: '6px', position: 'relative'
                      }}>
                        {slidePreviewUrl ? (
                          <img 
                            src={slidePreviewUrl} 
                            alt={`Slide ${idx + 1}`}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
                          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ios-text-secondary)' }}>
                            <ImageIcon size={18} />
                          </div>
                        )}
                        {slide.has_raw_master && (
                          <div style={{
                            position: 'absolute', bottom: '2px', right: '2px',
                            backgroundColor: '#ffd700', color: '#000',
                            borderRadius: '4px', padding: '1px 4px', fontSize: '8px', fontWeight: 900
                          }}>
                            RAW
                          </div>
                        )}
                      </div>

                      <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ios-text-primary)' }}>
                        Slide {idx + 1}
                      </div>
                      <div style={{
                        fontSize: '9px', fontWeight: 600,
                        color: slide.has_raw_master ? '#34c759' : 'var(--ios-text-secondary)',
                        marginTop: '1px'
                      }}>
                        {slide.has_raw_master ? '✓ Master' : 'Compressed'}
                      </div>
                    </motion.button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Active Slide Image Preview & Status Inspector */}
          <div style={{
            backgroundColor: 'var(--ios-bg-card)',
            borderRadius: '20px', padding: '16px',
            border: '1px solid var(--ios-border)',
            marginBottom: '20px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--ios-text-primary)' }}>
                Slide {selectedSlide + 1} Preview & Status
              </span>
              {activeSlideData?.has_raw_master ? (
                <span style={{
                  backgroundColor: 'rgba(52, 199, 89, 0.15)', color: '#34c759',
                  padding: '3px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 800,
                  display: 'flex', alignItems: 'center', gap: '4px'
                }}>
                  <Check size={12} /> RAW MASTER ATTACHED
                </span>
              ) : (
                <span style={{
                  backgroundColor: 'rgba(255, 149, 0, 0.15)', color: '#ff9500',
                  padding: '3px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 700
                }}>
                  IG COMPRESSED ONLY
                </span>
              )}
            </div>

            {/* Current Slide Visual Preview */}
            <div style={{
              width: '100%', height: '180px', borderRadius: '14px',
              overflow: 'hidden', backgroundColor: 'rgba(0,0,0,0.3)',
              marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              {(activeSlideData?.display_url || activeSlideData?.media_url || activeSlideData?.instagram_media_url || activeSlideData?.raw_media_url) ? (
                <img 
                  src={activeSlideData.display_url || activeSlideData.media_url || activeSlideData.instagram_media_url || activeSlideData.raw_media_url} 
                  alt={`Slide ${selectedSlide + 1} Current`}
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', color: 'var(--ios-text-secondary)' }}>
                  <ImageIcon size={32} />
                  <span style={{ fontSize: '11px' }}>Slide {selectedSlide + 1}</span>
                </div>
              )}
            </div>

            <div style={{ fontSize: '12px', color: 'var(--ios-text-secondary)', lineHeight: 1.5 }}>
              {activeSlideData?.has_raw_master ? (
                <div>
                  Preserved as <strong>{activeSlideData.raw_file_name || 'Lossless Master'}</strong>
                  {activeSlideData.raw_file_size && (
                    <span> ({((activeSlideData.raw_file_size) / (1024 * 1024)).toFixed(1)} MB)</span>
                  )}
                </div>
              ) : (
                <div>Currently showing Instagram's compressed copy. Choose below to stream your full original file.</div>
              )}
            </div>
          </div>

          {/* Upload / Transfer Controls */}
          <div style={{
            backgroundColor: 'var(--ios-bg-card)',
            borderRadius: '24px', padding: '24px 20px',
            border: '1px solid var(--ios-border)',
            boxShadow: 'var(--ios-shadow-md)',
            textAlign: 'center'
          }}>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              style={{ display: 'none' }}
              onChange={handleFileSelected}
            />

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              style={{
                width: '100%',
                backgroundColor: 'var(--ios-accent, #007aff)',
                color: '#ffffff',
                border: 'none', padding: '16px 20px', borderRadius: '16px',
                fontSize: '15px', fontWeight: 700, cursor: uploading ? 'default' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                boxShadow: '0 8px 24px rgba(136, 116, 74, 0.35)',
                transition: 'background-color 0.2s',
                opacity: uploading ? 0.75 : 1
              }}
            >
              {uploading ? (
                <>
                  <RefreshCw size={20} className="spin-anim" />
                  <span>Streaming Lossless Copy to PC...</span>
                </>
              ) : (
                <>
                  <Upload size={20} />
                  <span>{activeSlideData?.has_raw_master ? `Replace Master for Slide ${selectedSlide + 1}` : `Select Master for Slide ${selectedSlide + 1}`}</span>
                </>
              )}
            </motion.button>

            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              marginTop: '14px', fontSize: '11px', color: 'var(--ios-text-secondary)'
            }}>
              <ShieldCheck size={14} color="var(--ios-accent, #007aff)" />
              <span>Transferred peer-to-peer over your private local network</span>
            </div>

            {/* Success Alert Banner */}
            <AnimatePresence>
              {uploadSuccess && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: -10 }}
                  transition={{ duration: 0.25 }}
                  style={{
                    marginTop: '18px',
                    padding: '14px',
                    borderRadius: '14px',
                    backgroundColor: 'rgba(52, 199, 89, 0.15)',
                    border: '1px solid rgba(52, 199, 89, 0.3)',
                    color: '#34c759',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    fontSize: '13px', fontWeight: 700
                  }}
                >
                  <CheckCircle2 size={18} />
                  <span>Master copy synced with desktop vault!</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </>
      )}
    </motion.div>
  )
}
