import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  X, Maximize2, Minimize2, ExternalLink, MapPin, Compass, 
  Navigation, Save, Check, Plus, Minus, Layers, Scan
} from 'lucide-react'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { getSettings } from '../services/settings'
import { playWin98Click } from '../services/win98Audio'

// Authentic Google Maps Pegman with Directional Field-Of-View Beam & Compass Cone
const createGooglePegmanIcon = () => {
  return L.divIcon({
    html: `
      <div style="position: relative; width: 64px; height: 64px; display: flex; align-items: center; justify-content: center; pointer-events: none;">
        <!-- Directional Field-Of-View Cone Beam (Authentic Google Maps Radar) -->
        <svg style="position: absolute; top: 2px; left: 2px; width: 60px; height: 60px;" viewBox="0 0 60 60">
          <!-- Circular Radar Ring -->
          <circle cx="30" cy="30" r="26" fill="rgba(66, 133, 244, 0.08)" stroke="rgba(0, 0, 0, 0.25)" stroke-width="1" stroke-dasharray="2 2" />
          <!-- White FOV Cone / Spotlight Beam -->
          <path d="M30 30 L14 54 A 28 28 0 0 0 46 54 Z" fill="rgba(255, 255, 255, 0.85)" stroke="rgba(0, 0, 0, 0.3)" stroke-width="0.8" />
          <!-- Directional Heading Pointer -->
          <polygon points="30,12 36,28 30,24 24,28" fill="#333333" />
        </svg>

        <!-- Google Orange Pegman Character -->
        <div style="position: absolute; top: 12px; z-index: 10; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));">
          <svg width="24" height="32" viewBox="0 0 24 32" fill="none">
            <!-- Head -->
            <circle cx="12" cy="6" r="4.5" fill="#F4B400" stroke="#000000" stroke-width="1.2"/>
            <!-- Torso & Limbs -->
            <path d="M7 11.5C7 10.5 8 9.5 12 9.5C16 9.5 17 10.5 17 11.5L18 20C18 21 16.5 21.5 15 21.5L15 29C15 30 13.5 30.5 12.5 30.5L12.5 22L11.5 22L11.5 30.5C10.5 30.5 9 30 9 29L9 21.5C7.5 21.5 6 21 6 20L7 11.5Z" fill="#F4B400" stroke="#000000" stroke-width="1.2"/>
            <!-- Tie / Collar -->
            <path d="M11 10L12 14L13 10Z" fill="#DB4437"/>
          </svg>
        </div>
      </div>
    `,
    className: 'google-pegman-radar-pin',
    iconSize: [64, 64],
    iconAnchor: [32, 32]
  })
}

const pegmanIcon = createGooglePegmanIcon()

function MiniMapClickEvents({ onMapClick }) {
  useMapEvents({
    click(e) {
      if (onMapClick) onMapClick(e.latlng)
    }
  })
  return null
}

export default function StreetViewModal({ 
  isOpen, 
  onClose, 
  locationName, 
  lat: initialLat, 
  lng: initialLng,
  onUpdateLocation 
}) {
  const [currentLat, setCurrentLat] = useState(initialLat)
  const [currentLng, setCurrentLng] = useState(initialLng)
  const [currentName, setCurrentName] = useState(locationName || '')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showRadar, setShowRadar] = useState(true)
  const [isRadarMinimized, setIsRadarMinimized] = useState(false)
  const [isRadarExpanded, setIsRadarExpanded] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [updatedSuccess, setUpdatedSuccess] = useState(false)
  const [miniMapZoom, setMiniMapZoom] = useState(15)

  const settings = getSettings()
  const isWin98 = settings.themeId === 'win98'

  useEffect(() => {
    if (isOpen) {
      setCurrentLat(initialLat)
      setCurrentLng(initialLng)
      setCurrentName(locationName || '')
      setUpdatedSuccess(false)
    }
  }, [isOpen, initialLat, initialLng, locationName])

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

  if (!isOpen || !currentLat || !currentLng) return null

  const toggleFullscreen = () => {
    if (isWin98) playWin98Click()
    setIsFullscreen(!isFullscreen)
  }

  const handleMiniMapClick = (latlng) => {
    if (isWin98) playWin98Click()
    setCurrentLat(latlng.lat)
    setCurrentLng(latlng.lng)
    fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latlng.lat}&lon=${latlng.lng}&format=json`)
      .then(res => res.json())
      .then(data => {
        if (data && data.display_name) {
          setCurrentName(data.display_name.split(',')[0].trim())
        }
      })
      .catch(() => {})
  }

  const handleUpdateLocation = async () => {
    if (isWin98) playWin98Click()
    setUpdating(true)
    try {
      if (onUpdateLocation) {
        await onUpdateLocation({
          location_name: currentName,
          location_lat: currentLat,
          location_lng: currentLng
        })
      }
      setUpdatedSuccess(true)
      setTimeout(() => setUpdatedSuccess(false), 2500)
    } catch (err) {
      alert('Failed to update location: ' + err.message)
    } finally {
      setUpdating(false)
    }
  }

  const embedUrl = `https://maps.google.com/maps?q=${currentLat},${currentLng}&layer=c&cbll=${currentLat},${currentLng}&cbp=11,0,0,0,0&output=svembed`
  const directMapsUrl = `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${currentLat},${currentLng}`

  // ═══════════════════════════════════════════════════════════
  // 1. WINDOWS 98 AUTHENTIC WINDOW STYLE
  // ═══════════════════════════════════════════════════════════
  if (isWin98) {
    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(0, 0, 0, 0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: isFullscreen ? '0' : '16px',
        fontFamily: '"MS Sans Serif", Tahoma, Arial, sans-serif',
        fontSize: '11px',
      }}>
        <div
          style={{
            width: isFullscreen ? '100vw' : '880px',
            height: isFullscreen ? '100vh' : '630px',
            maxWidth: isFullscreen ? '100vw' : '96vw',
            maxHeight: isFullscreen ? '100vh' : '94vh',
            backgroundColor: '#c0c0c0',
            border: '1px solid #000000',
            boxShadow: isFullscreen ? 'none' : 'inset 1px 1px #ffffff, inset -1px -1px #808080, 4px 4px 18px rgba(0,0,0,0.6)',
            display: 'flex',
            flexDirection: 'column',
            boxSizing: 'border-box',
          }}
        >
          {/* Title Bar with Guaranteed Visible High-Contrast Black Icons */}
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
                StreetView.exe - {currentName || `${currentLat.toFixed(4)}, ${currentLng.toFixed(4)}`}
              </span>
            </div>
            
            <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
              {/* Maximize / Restore */}
              <button
                onClick={toggleFullscreen}
                title={isFullscreen ? "Restore" : "Maximize"}
                style={{
                  width: '16px',
                  height: '14px',
                  backgroundColor: '#c0c0c0',
                  border: '1px solid #000000',
                  boxShadow: 'inset 1px 1px #ffffff, inset -1px -1px #808080',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                {isFullscreen ? (
                  <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                    <rect x="2" y="0" width="6" height="6" stroke="#000000" strokeWidth="1.2" fill="none" />
                    <rect x="0" y="2" width="6" height="6" stroke="#000000" strokeWidth="1.2" fill="#c0c0c0" />
                  </svg>
                ) : (
                  <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                    <rect x="0.5" y="0.5" width="8" height="8" stroke="#000000" strokeWidth="1.2" fill="none" />
                    <line x1="0" y1="2" x2="9" y2="2" stroke="#000000" strokeWidth="1.5" />
                  </svg>
                )}
              </button>

              {/* Close Button */}
              <button
                onClick={onClose}
                title="Close"
                style={{
                  width: '16px',
                  height: '14px',
                  backgroundColor: '#c0c0c0',
                  border: '1px solid #000000',
                  boxShadow: 'inset 1px 1px #ffffff, inset -1px -1px #808080',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                  <path d="M1 1L7 7M7 1L1 7" stroke="#000000" strokeWidth="1.8" strokeLinecap="square" />
                </svg>
              </button>
            </div>
          </div>

          {/* Action Toolbar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '3px 6px',
            backgroundColor: '#c0c0c0',
            borderBottom: '1px solid #808080',
            fontSize: '11px',
            gap: '8px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, minWidth: 0 }}>
              <span style={{ fontWeight: 'bold' }}>Location:</span>
              <span style={{
                backgroundColor: '#ffffff',
                border: '1px solid #000',
                boxShadow: 'inset 1px 1px #808080, inset -1px -1px #ffffff',
                padding: '1px 8px',
                fontSize: '11px',
                color: '#000080',
                fontWeight: 'bold',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>
                {currentName || 'GPS Location'} ({currentLat.toFixed(5)}, {currentLng.toFixed(5)})
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                onClick={handleUpdateLocation}
                disabled={updating}
                className="segment-btn"
                title="Save current coordinates & metadata to memory"
                style={{
                  padding: '2px 10px',
                  backgroundColor: updatedSuccess ? '#008000' : '#000080',
                  color: '#ffffff',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                {updatedSuccess ? <Check size={12} /> : <MapPin size={12} />}
                <span>{updating ? 'Updating...' : (updatedSuccess ? 'Location Updated!' : '📍 Update Location')}</span>
              </button>

              <a
                href={directMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="segment-btn"
                style={{
                  color: '#000080',
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '2px 8px',
                  fontWeight: 'bold',
                }}
              >
                <span>Open in Google Maps</span>
                <ExternalLink size={11} />
              </a>
            </div>
          </div>

          {/* 3D Sunken Viewport Canvas with Authentic Google Pegman Mini-Map Radar Box */}
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

            {/* ── EXACT GOOGLE PEGMAN MINI-MAP RADAR (Wrapped in Win98 skin) ── */}
            {showRadar && !isRadarMinimized && (
              <div style={{
                position: 'absolute',
                bottom: '12px',
                left: '12px',
                width: isRadarExpanded ? '280px' : '200px',
                height: isRadarExpanded ? '210px' : '160px',
                backgroundColor: '#ffffff',
                border: '1.5px solid #000000',
                borderRadius: '8px',
                boxShadow: '0 4px 16px rgba(0,0,0,0.6)',
                zIndex: 50,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                transition: 'width 0.2s ease, height 0.2s ease',
              }}>
                {/* Top Mini Control Strip */}
                <div style={{
                  position: 'absolute',
                  top: '4px',
                  right: '4px',
                  zIndex: 1000,
                  display: 'flex',
                  gap: '3px',
                }}>
                  {/* Minimize Button */}
                  <button
                    onClick={() => { playWin98Click(); setIsRadarMinimized(true); }}
                    title="Minimize radar"
                    style={{
                      width: '16px',
                      height: '16px',
                      backgroundColor: 'rgba(255,255,255,0.95)',
                      border: '1px solid #333',
                      borderRadius: '3px',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      fontSize: '10px',
                      fontWeight: 'bold',
                      padding: 0,
                    }}
                  >
                    _
                  </button>

                  {/* Close Button */}
                  <button
                    onClick={() => { playWin98Click(); setShowRadar(false); }}
                    title="Close radar"
                    style={{
                      width: '16px',
                      height: '16px',
                      backgroundColor: 'rgba(255,255,255,0.95)',
                      border: '1px solid #333',
                      borderRadius: '3px',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      fontSize: '9px',
                      fontWeight: 'bold',
                      padding: 0,
                    }}
                  >
                    ✕
                  </button>
                </div>

                {/* Leaflet Mini-Map Canvas */}
                <div style={{ flex: 1, position: 'relative' }}>
                  <MapContainer
                    center={[currentLat, currentLng]}
                    zoom={miniMapZoom}
                    style={{ height: '100%', width: '100%' }}
                    zoomControl={false}
                    attributionControl={false}
                  >
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <Marker position={[currentLat, currentLng]} icon={pegmanIcon} />
                    <MiniMapClickEvents onMapClick={handleMiniMapClick} />
                  </MapContainer>

                  {/* Google Expand Button (Bottom Left) */}
                  <button
                    onClick={() => { playWin98Click(); setIsRadarExpanded(!isRadarExpanded); }}
                    title={isRadarExpanded ? "Shrink map" : "Expand map"}
                    style={{
                      position: 'absolute',
                      bottom: '8px',
                      left: '8px',
                      zIndex: 1000,
                      width: '24px',
                      height: '24px',
                      backgroundColor: '#ffffff',
                      border: '1px solid rgba(0,0,0,0.2)',
                      borderRadius: '4px',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2.5">
                      <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>
                    </svg>
                  </button>

                  {/* Google Zoom Controls (Bottom Right Pill) */}
                  <div style={{
                    position: 'absolute',
                    bottom: '8px',
                    right: '8px',
                    zIndex: 1000,
                    backgroundColor: '#ffffff',
                    border: '1px solid rgba(0,0,0,0.2)',
                    borderRadius: '4px',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                  }}>
                    <button
                      onClick={() => setMiniMapZoom(z => Math.min(18, z + 1))}
                      title="Zoom In"
                      style={{
                        width: '24px',
                        height: '22px',
                        backgroundColor: '#ffffff',
                        border: 'none',
                        borderBottom: '1px solid #e0e0e0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: 'bold',
                        color: '#444',
                        padding: 0,
                      }}
                    >+</button>
                    <button
                      onClick={() => setMiniMapZoom(z => Math.max(10, z - 1))}
                      title="Zoom Out"
                      style={{
                        width: '24px',
                        height: '22px',
                        backgroundColor: '#ffffff',
                        border: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: 'bold',
                        color: '#444',
                        padding: 0,
                      }}
                    >−</button>
                  </div>
                </div>
              </div>
            )}

            {/* Minimized Docked Tab */}
            {showRadar && isRadarMinimized && (
              <div
                onClick={() => { playWin98Click(); setIsRadarMinimized(false); }}
                title="Click to restore Pegman Radar"
                style={{
                  position: 'absolute',
                  bottom: '10px',
                  left: '10px',
                  backgroundColor: '#c0c0c0',
                  border: '1px solid #000000',
                  boxShadow: 'inset 1px 1px #ffffff, inset -1px -1px #808080, 2px 2px 8px rgba(0,0,0,0.5)',
                  padding: '4px 8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  zIndex: 50,
                  fontSize: '10px',
                  fontWeight: 'bold',
                }}
              >
                <span>🗺️ Pegman Radar</span>
                <span style={{ fontSize: '9px', color: '#000080' }}>▲ Expand</span>
              </div>
            )}
          </div>

          {/* Status & Bottom Action Bar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '2px 6px',
            backgroundColor: '#c0c0c0',
            height: '24px',
            boxSizing: 'border-box',
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
              <span>360° Walkaround Active • Click roads to teleport Pegman</span>
            </div>

            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
              {!showRadar && (
                <button
                  onClick={() => { playWin98Click(); setShowRadar(true); setIsRadarMinimized(false); }}
                  className="segment-btn"
                  style={{ height: '100%', padding: '0 6px', fontSize: '10px', fontWeight: 'bold' }}
                >
                  🗺️ Show Radar
                </button>
              )}

              <button
                onClick={toggleFullscreen}
                className="segment-btn"
                style={{
                  height: '100%',
                  padding: '0 8px',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  marginLeft: '4px',
                }}
              >
                {isFullscreen ? <Minimize2 size={11} /> : <Maximize2 size={11} />}
                <span>{isFullscreen ? 'Exit Full Screen' : 'Full Screen View'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════════
  // 2. MODERN / GLASSMORPHIC THEME STYLE
  // ═══════════════════════════════════════════════════════════
  return (
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
        style={{
          width: isFullscreen ? '100vw' : '900px',
          height: isFullscreen ? '100vh' : '640px',
          maxWidth: isFullscreen ? '100vw' : '96vw',
          maxHeight: isFullscreen ? '100vh' : '94vh',
          backgroundColor: 'var(--ios-bg-card, #1c1c1e)',
          borderRadius: isFullscreen ? '0' : '20px',
          border: isFullscreen ? 'none' : '1px solid var(--ios-border, rgba(255,255,255,0.12))',
          boxShadow: isFullscreen ? 'none' : '0 24px 60px rgba(0,0,0,0.5)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header Bar */}
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
                {currentName || 'Street View'}
              </h3>
              <span style={{ fontSize: '11px', color: 'var(--ios-text-secondary, #8e8e93)' }}>
                {currentLat.toFixed(5)}, {currentLng.toFixed(5)} • Interactive 360° Walkaround
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* UPDATE LOCATION CTA */}
            <button
              onClick={handleUpdateLocation}
              disabled={updating}
              className="ios-btn"
              style={{
                padding: '6px 14px',
                borderRadius: '10px',
                fontSize: '12px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: updatedSuccess ? 'var(--ios-success, #34c759)' : 'var(--ios-accent, #007aff)',
              }}
            >
              {updatedSuccess ? <Check size={14} /> : <MapPin size={14} />}
              <span>{updating ? 'Updating...' : (updatedSuccess ? 'Location Saved!' : 'Update Location')}</span>
            </button>

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
            >
              {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>

            <button
              onClick={onClose}
              className="ios-btn-secondary"
              style={{ padding: '8px', borderRadius: '10px' }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Viewport Canvas + Exact Google Pegman Mini-Map */}
        <div style={{ flex: 1, backgroundColor: '#000', position: 'relative' }}>
          <iframe
            src={embedUrl}
            title="Google Street View"
            style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
            allowFullScreen
            loading="lazy"
          />

          {/* Pegman Mini-Map Box */}
          {showRadar && !isRadarMinimized && (
            <div style={{
              position: 'absolute',
              bottom: '16px',
              left: '16px',
              width: isRadarExpanded ? '300px' : '220px',
              height: isRadarExpanded ? '230px' : '170px',
              backgroundColor: 'var(--ios-bg-card, #1c1c1e)',
              border: '1.5px solid #000000',
              borderRadius: '12px',
              boxShadow: '0 8px 30px rgba(0,0,0,0.6)',
              zIndex: 50,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              transition: 'width 0.2s ease, height 0.2s ease',
            }}>
              {/* Top controls (Minimize & Close) */}
              <div style={{
                position: 'absolute',
                top: '6px',
                right: '6px',
                zIndex: 1000,
                display: 'flex',
                gap: '4px',
              }}>
                <button
                  onClick={() => setIsRadarMinimized(true)}
                  title="Minimize"
                  style={{
                    width: '20px',
                    height: '20px',
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    backdropFilter: 'blur(4px)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '5px',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    padding: 0,
                  }}
                >
                  _
                </button>
                <button
                  onClick={() => setShowRadar(false)}
                  title="Close"
                  style={{
                    width: '20px',
                    height: '20px',
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    backdropFilter: 'blur(4px)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '5px',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    fontSize: '10px',
                    fontWeight: 'bold',
                    padding: 0,
                  }}
                >
                  ✕
                </button>
              </div>

              {/* Map Container */}
              <div style={{ flex: 1, position: 'relative' }}>
                <MapContainer
                  center={[currentLat, currentLng]}
                  zoom={miniMapZoom}
                  style={{ height: '100%', width: '100%' }}
                  zoomControl={false}
                  attributionControl={false}
                >
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <Marker position={[currentLat, currentLng]} icon={pegmanIcon} />
                  <MiniMapClickEvents onMapClick={handleMiniMapClick} />
                </MapContainer>

                {/* Google Expand Button (Bottom Left) */}
                <button
                  onClick={() => setIsRadarExpanded(!isRadarExpanded)}
                  title={isRadarExpanded ? "Shrink map" : "Expand map"}
                  style={{
                    position: 'absolute',
                    bottom: '8px',
                    left: '8px',
                    zIndex: 1000,
                    width: '26px',
                    height: '26px',
                    backgroundColor: '#ffffff',
                    border: '1px solid rgba(0,0,0,0.2)',
                    borderRadius: '6px',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2.5">
                    <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>
                  </svg>
                </button>

                {/* Google Zoom Controls (Bottom Right Pill) */}
                <div style={{
                  position: 'absolute',
                  bottom: '8px',
                  right: '8px',
                  zIndex: 1000,
                  backgroundColor: '#ffffff',
                  border: '1px solid rgba(0,0,0,0.2)',
                  borderRadius: '6px',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                }}>
                  <button
                    onClick={() => setMiniMapZoom(z => Math.min(18, z + 1))}
                    title="Zoom In"
                    style={{
                      width: '26px',
                      height: '24px',
                      backgroundColor: '#ffffff',
                      border: 'none',
                      borderBottom: '1px solid #e0e0e0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      fontSize: '15px',
                      fontWeight: 'bold',
                      color: '#333',
                      padding: 0,
                    }}
                  >+</button>
                  <button
                    onClick={() => setMiniMapZoom(z => Math.max(10, z - 1))}
                    title="Zoom Out"
                    style={{
                      width: '26px',
                      height: '24px',
                      backgroundColor: '#ffffff',
                      border: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      fontSize: '15px',
                      fontWeight: 'bold',
                      color: '#333',
                      padding: 0,
                    }}
                  >−</button>
                </div>
              </div>
            </div>
          )}

          {/* Minimized Pill */}
          {showRadar && isRadarMinimized && (
            <button
              onClick={() => setIsRadarMinimized(false)}
              className="ios-glass"
              title="Click to expand Pegman Radar"
              style={{
                position: 'absolute',
                bottom: '16px',
                left: '16px',
                zIndex: 50,
                padding: '8px 14px',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                border: '1px solid var(--ios-border)',
                color: 'var(--ios-text-primary)',
                fontSize: '12px',
                fontWeight: 600,
                backgroundColor: 'rgba(28, 28, 30, 0.85)',
                backdropFilter: 'blur(8px)',
              }}
            >
              <span>🗺️ Pegman Radar</span>
              <Maximize2 size={12} />
            </button>
          )}
        </div>

        {/* Bottom Bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 18px',
          borderTop: '1px solid var(--ios-border, rgba(255,255,255,0.08))',
          backgroundColor: 'rgba(0,0,0,0.3)',
        }}>
          <span style={{ fontSize: '12px', color: 'var(--ios-text-secondary, #8e8e93)' }}>
            Drag to look around 360° • Click arrows to move • Click Mini-Map to teleport Pegman
          </span>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {!showRadar && (
              <button
                onClick={() => { setShowRadar(true); setIsRadarMinimized(false); }}
                className="ios-btn-secondary"
                style={{ padding: '6px 12px', borderRadius: '10px', fontSize: '12px' }}
              >
                🗺️ Show Radar
              </button>
            )}

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
        </div>
      </motion.div>
    </div>
  )
}
