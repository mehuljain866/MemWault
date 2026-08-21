import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Maximize2, Minimize2, ExternalLink, MapPin, Compass, Navigation } from 'lucide-react'
import { getSettings } from '../services/settings'
import { playWin98Click } from '../services/win98Audio'

/**
 * Google Street View In-App Window with Fullscreen Toggle
 * Opens an interactive 360° street panorama inside an in-app window with full-screen expansion.
 */
export default function StreetViewModal({ isOpen, onClose, locationName, lat, lng }) {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const containerRef = useRef(null)
  const settings = getSettings()
  const isWin98 = settings.themeId === 'win98'

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        if (isFullscreen) setIsFullscreen(false)
        else onClose()
      }
    }
    if (isOpen) window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [isOpen, isFullscreen, onClose])

  if (!isOpen || !lat || !lng) return null

  const toggleFullscreen = () => {
    if (isWin98) playWin98Click()
    setIsFullscreen(!isFullscreen)
  }

  // Google Maps Street View interactive embed URL
  const embedUrl = `https://maps.google.com/maps?q=${lat},${lng}&layer=c&cbll=${lat},${lng}&cbp=11,0,0,0,0&output=svembed`
  const directMapsUrl = `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lng}`

  // ═══════════════════════════════════════════════════════════
  // 1. WINDOWS 98 AUTHENTIC WINDOW STYLE
  // ═══════════════════════════════════════════════════════════
  if (isWin98) {
    return (
      <AnimatePresence>
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: isFullscreen ? '0' : '16px',
        }}>
          <div
            ref={containerRef}
            style={{
              width: isFullscreen ? '100vw' : '820px',
              height: isFullscreen ? '100vh' : '580px',
              maxWidth: isFullscreen ? '100vw' : '95vw',
              maxHeight: isFullscreen ? '100vh' : '90vh',
              backgroundColor: '#c0c0c0',
              border: '1px solid #000000',
              boxShadow: isFullscreen ? 'none' : 'inset 1px 1px #ffffff, inset -1px -1px #808080, 4px 4px 16px rgba(0,0,0,0.5)',
              display: 'flex',
              flexDirection: 'column',
              boxSizing: 'border-box',
              fontFamily: '"MS Sans Serif", Tahoma, Arial, sans-serif',
            }}
          >
            {/* Title Bar */}
            <div style={{
              background: 'linear-gradient(90deg, #000080 0%, #1084d0 100%)',
              color: '#ffffff',
              fontWeight: 'bold',
              padding: '3px 4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '11px',
              userSelect: 'none',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                <Compass size={13} color="#ffffff" />
                <span style={{ whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                  StreetView.exe - {locationName || `${lat.toFixed(4)}, ${lng.toFixed(4)}`}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '2px' }}>
                <button
                  onClick={toggleFullscreen}
                  title={isFullscreen ? "Restore Window" : "Maximize Full Screen"}
                  style={{
                    width: '16px',
                    height: '14px',
                    backgroundColor: '#c0c0c0',
                    border: '1px solid #000',
                    boxShadow: 'inset 1px 1px #fff, inset -1px -1px #808080',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  {isFullscreen ? <Minimize2 size={10} /> : <Maximize2 size={10} />}
                </button>
                <button
                  onClick={onClose}
                  title="Close"
                  style={{
                    width: '16px',
                    height: '14px',
                    backgroundColor: '#c0c0c0',
                    border: '1px solid #000',
                    boxShadow: 'inset 1px 1px #fff, inset -1px -1px #808080',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    padding: 0,
                    fontWeight: 'bold',
                    fontSize: '10px',
                  }}
                >
                  <X size={10} />
                </button>
              </div>
            </div>

            {/* Menu / Address Bar */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '3px 6px',
              backgroundColor: '#c0c0c0',
              borderBottom: '1px solid #808080',
              fontSize: '11px',
              color: '#000000',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontWeight: 600 }}>Location:</span>
                <span style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #000',
                  boxShadow: 'inset 1px 1px #808080, inset -1px -1px #ffffff',
                  padding: '1px 6px',
                  fontSize: '11px',
                  color: '#000080',
                  fontWeight: 'bold',
                }}>
                  {locationName || 'GPS Coordinates'} ({lat.toFixed(5)}, {lng.toFixed(5)})
                </span>
              </div>

              <a
                href={directMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: '#000080',
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '11px',
                  fontWeight: 600,
                }}
              >
                <span>Open in Google Maps</span>
                <ExternalLink size={11} />
              </a>
            </div>

            {/* 3D Sunken Viewport Canvas */}
            <div style={{
              flex: 1,
              backgroundColor: '#000000',
              margin: '2px',
              border: '1px solid #000000',
              boxShadow: 'inset 1px 1px #808080, inset -1px -1px #dfdfdf, inset 2px 2px #000, inset -2px -2px #ffffff',
              position: 'relative',
              overflow: 'hidden',
            }}>
              <iframe
                src={embedUrl}
                title="Google Street View"
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                  display: 'block',
                }}
                allowFullScreen
                loading="lazy"
              />
            </div>

            {/* Status & Bottom Action Bar */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '2px 4px',
              backgroundColor: '#c0c0c0',
              height: '22px',
              boxSizing: 'border-box',
              fontSize: '11px',
            }}>
              <div style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '0 4px',
                boxShadow: 'inset 1px 1px #808080, inset -1px -1px #ffffff',
                color: '#000000',
                height: '100%',
              }}>
                <Navigation size={11} color="#008000" />
                <span>360° Interactive Street Panorama Active</span>
              </div>

              <button
                onClick={toggleFullscreen}
                style={{
                  height: '100%',
                  backgroundColor: '#c0c0c0',
                  border: '1px solid #000',
                  boxShadow: 'inset 1px 1px #fff, inset -1px -1px #808080',
                  padding: '0 8px',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  color: '#000000',
                  marginLeft: '4px',
                }}
              >
                {isFullscreen ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
                <span>{isFullscreen ? 'Exit Full Screen' : 'Full Screen View'}</span>
              </button>
            </div>
          </div>
        </div>
      </AnimatePresence>
    )
  }

  // ═══════════════════════════════════════════════════════════
  // 2. MODERN / GLASSMORPHIC THEME STYLE
  // ═══════════════════════════════════════════════════════════
  return (
    <AnimatePresence>
      <div style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: isFullscreen ? '0' : '20px',
      }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          ref={containerRef}
          style={{
            width: isFullscreen ? '100vw' : '880px',
            height: isFullscreen ? '100vh' : '620px',
            maxWidth: isFullscreen ? '100vw' : '95vw',
            maxHeight: isFullscreen ? '100vh' : '92vh',
            backgroundColor: 'var(--ios-bg-card, #1c1c1e)',
            borderRadius: isFullscreen ? '0' : '20px',
            border: isFullscreen ? 'none' : '1px solid var(--ios-border, rgba(255,255,255,0.12))',
            boxShadow: isFullscreen ? 'none' : '0 24px 60px rgba(0,0,0,0.5)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 18px',
            borderBottom: '1px solid var(--ios-border, rgba(255,255,255,0.08))',
            backgroundColor: 'rgba(255,255,255,0.03)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '10px',
                backgroundColor: 'rgba(10, 132, 255, 0.15)',
                color: 'var(--ios-accent, #007aff)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <MapPin size={18} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--ios-text-primary, #fff)' }}>
                  {locationName || 'Street View'}
                </h3>
                <span style={{ fontSize: '11px', color: 'var(--ios-text-secondary, #8e8e93)' }}>
                  {lat.toFixed(5)}, {lng.toFixed(5)} • Interactive 360° Walkaround
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <a
                href={directMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="ios-btn-secondary"
                style={{
                  padding: '6px 12px',
                  borderRadius: '10px',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  textDecoration: 'none',
                  color: 'var(--ios-text-primary)',
                }}
              >
                <span>Google Maps</span>
                <ExternalLink size={13} />
              </a>

              <button
                onClick={toggleFullscreen}
                className="ios-btn-secondary"
                style={{ padding: '8px', borderRadius: '10px' }}
                title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
              >
                {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              </button>

              <button
                onClick={onClose}
                className="ios-btn-secondary"
                style={{ padding: '8px', borderRadius: '10px' }}
                title="Close"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Panorama Viewport */}
          <div style={{ flex: 1, backgroundColor: '#000', position: 'relative' }}>
            <iframe
              src={embedUrl}
              title="Google Street View Panorama"
              style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
              allowFullScreen
              loading="lazy"
            />
          </div>

          {/* Bottom Bar with Fullscreen CTA */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 18px',
            borderTop: '1px solid var(--ios-border, rgba(255,255,255,0.08))',
            backgroundColor: 'rgba(0,0,0,0.2)',
          }}>
            <span style={{ fontSize: '12px', color: 'var(--ios-text-secondary, #8e8e93)' }}>
              Drag to pan 360° • Click arrows or roads to walk around
            </span>

            <button
              onClick={toggleFullscreen}
              className="ios-btn"
              style={{
                padding: '6px 16px',
                borderRadius: '12px',
                fontSize: '13px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
              <span>{isFullscreen ? 'Exit Full Screen' : 'Full Screen'}</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
