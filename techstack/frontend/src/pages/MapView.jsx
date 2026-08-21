import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-cluster'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { getAllStoryLocations } from '../services/api'
import { Link, useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { getStories } from '../services/api'
import { getSettings } from '../services/settings'
import FastScrollbar from '../components/FastScrollbar'
import LocationExplorerModal from '../components/LocationExplorerModal'
import StreetViewModal from '../components/StreetViewModal'
import { ChevronDown, RotateCw, Map as MapIcon, Maximize2, Minimize2, MapPin, Compass, Globe } from 'lucide-react'

// Fix default leaflet icons
delete L.Icon.Default.prototype._getIconUrl;

// iOS Style Pin Icon
const createIosPin = (mediaUrl, mediaType) => {
  const mediaElement = mediaType === 2 
    ? `<video src="${mediaUrl}#t=0.1" style="width: 100%; height: 100%; object-fit: cover;" muted playsinline></video>`
    : `<img src="${mediaUrl}" style="width: 100%; height: 100%; object-fit: cover;" />`;

  const html = mediaUrl 
    ? `<div style="width: 40px; height: 40px; border-radius: 8px; border: 2px solid white; box-shadow: 0 4px 12px rgba(0,0,0,0.3); overflow: hidden; background: #333; position: relative;">
         ${mediaElement}
         <div style="position: absolute; bottom: -6px; left: 50%; transform: translateX(-50%); width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-top: 6px solid white;"></div>
       </div>`
    : `<div style="width: 40px; height: 40px; border-radius: 8px; border: 2px solid white; box-shadow: 0 4px 12px rgba(0,0,0,0.3); background: #333; display: flex; align-items: center; justify-content: center; position: relative;">
         <span style="font-size: 20px;">📍</span>
         <div style="position: absolute; bottom: -6px; left: 50%; transform: translateX(-50%); width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-top: 6px solid white;"></div>
       </div>`

  return L.divIcon({
    html,
    className: 'ios-map-pin',
    iconSize: [40, 46],
    iconAnchor: [20, 46],
    popupAnchor: [0, -46]
  })
}

// iOS Style Cluster Icon
const createClusterCustomIcon = function (cluster) {
  const count = cluster.getChildCount();
  // Get a representative thumbnail if possible
  const markers = cluster.getAllChildMarkers();
  let bgHtml = '';
  if (markers.length > 0) {
    // Try to dig out the image URL from our custom popup or data. 
    // It's a bit hacky to extract it, but let's just make a clean Apple-style bubble.
  }
  
  return L.divIcon({
    html: `<div style="
      background: rgba(255, 255, 255, 0.9);
      backdrop-filter: blur(10px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      border-radius: 50%;
      width: 44px;
      height: 44px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 16px;
      color: #000;
      border: 1px solid rgba(0,0,0,0.1);
    ">${count}</div>`,
    className: 'ios-cluster-icon',
    iconSize: L.point(44, 44, true),
  });
}

function MapEvents({ onBoundsChange }) {
  const map = useMapEvents({
    moveend: () => onBoundsChange(map.getBounds()),
    zoomend: () => onBoundsChange(map.getBounds())
  })
  useEffect(() => { onBoundsChange(map.getBounds()) }, [map, onBoundsChange])
  return null
}

function MapResizer() {
  const map = useMap()
  useEffect(() => {
    const observer = new ResizeObserver(() => map.invalidateSize())
    observer.observe(map.getContainer())
    return () => observer.disconnect()
  }, [map])
  return null
}

export default function MapView() {
  const navigate = useNavigate()
  const [locations, setLocations] = useState([])
  const [visibleLocations, setVisibleLocations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  const settings = getSettings()
  const isImmersive = settings.mapMode === 'immersive'

  // Split states
  const [isVerticalSplit, setIsVerticalSplit] = useState(() => localStorage.getItem('sv_map_orientation') === 'vertical')
  const [splitRatio, setSplitRatio] = useState(() => parseFloat(localStorage.getItem('sv_map_split')) || 50)
  const [isDragging, setIsDragging] = useState(false)
  const containerRef = useRef(null)

  // Immersive state
  const [sheetState, setSheetState] = useState('half') // 'collapsed', 'half', 'full'
  const [immersiveFullScreen, setImmersiveFullScreen] = useState(false)

  useEffect(() => {
    async function fetchLocations() {
      try {
        const data = await getAllStoryLocations()
        setLocations(data)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchLocations()
  }, [])

  const handleDragStart = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDrag = useCallback((e) => {
    if (!isDragging || !containerRef.current) return
    const containerRect = containerRef.current.getBoundingClientRect()
    let newRatio;
    if (isVerticalSplit) {
      const deltaY = e.clientY - containerRect.top
      newRatio = (deltaY / containerRect.height) * 100
    } else {
      const deltaX = e.clientX - containerRect.left
      newRatio = (deltaX / containerRect.width) * 100
    }
    newRatio = Math.max(20, Math.min(80, newRatio))
    setSplitRatio(newRatio)
  }, [isDragging, isVerticalSplit])

  const handleDragEnd = useCallback(() => {
    setIsDragging(false)
    localStorage.setItem('sv_map_split', splitRatio.toString())
  }, [splitRatio])

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleDrag)
      window.addEventListener('mouseup', handleDragEnd)
    }
    return () => {
      window.removeEventListener('mousemove', handleDrag)
      window.removeEventListener('mouseup', handleDragEnd)
    }
  }, [isDragging, handleDrag, handleDragEnd])

  const toggleOrientation = () => {
    const newOrientation = !isVerticalSplit
    setIsVerticalSplit(newOrientation)
    localStorage.setItem('sv_map_orientation', newOrientation ? 'vertical' : 'horizontal')
  }

  const handleBoundsChange = useCallback((bounds) => {
    if (!bounds) return
    const visible = locations.filter(loc => bounds.contains([loc.location_lat, loc.location_lng]))
    visible.sort((a, b) => new Date(b.taken_at) - new Date(a.taken_at))
    setVisibleLocations(visible)
  }, [locations])

  const [isExplorerOpen, setIsExplorerOpen] = useState(false)
  const [streetViewTarget, setStreetViewTarget] = useState(null)
  const [mapInstance, setMapInstance] = useState(null)

  // Split Screen Render
  if (!isImmersive) {
    return (
      <div className="ios-card" style={{ padding: 0, height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column', background: 'var(--ios-bg-app)' }}>
        <div ref={containerRef} style={{ 
            display: 'flex', flexDirection: isVerticalSplit ? 'column' : 'row', flex: 1, overflow: 'hidden', position: 'relative', padding: '12px', gap: '4px'
        }}>
          {/* MAP */}
          <div style={{ flexBasis: `${splitRatio}%`, flexGrow: 0, flexShrink: 0, position: 'relative', zIndex: 1, borderRadius: 'var(--ios-radius-lg)', border: '1px solid var(--ios-border)', overflow: 'hidden', background: 'var(--ios-bg-card)' }}>
            {loading ? <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>Loading Map...</div> : (
              <MapContainer 
                center={[20, 0]} 
                zoom={2} 
                style={{ height: '100%', width: '100%', background: '#1a1a1a' }} 
                worldCopyJump={true}
                ref={setMapInstance}
              >
                <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" className="map-tiles-dark" />
                <MapEvents onBoundsChange={handleBoundsChange} />
                <MapResizer />
                <MarkerClusterGroup chunkedLoading maxClusterRadius={50} iconCreateFunction={createClusterCustomIcon} showCoverageOnHover={false}>
                  {locations.map(loc => (
                    <Marker key={loc.id} position={[loc.location_lat, loc.location_lng]} icon={createIosPin(loc.media_url, loc.media_type)}>
                      <Popup className="ios-map-popup">
                        <div style={{ textAlign: 'center', padding: '4px' }}>
                          <strong>{loc.location_name}</strong><br/>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '6px' }}>
                            <Link to={`/story/${loc.id}`} style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ios-accent)' }}>View Memory</Link>
                            {loc.location_lat && loc.location_lng && (
                              <button
                                onClick={() => setStreetViewTarget({ name: loc.location_name, lat: loc.location_lat, lng: loc.location_lng })}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: 'var(--ios-accent)',
                                  fontSize: '12px',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '2px'
                                }}
                              >
                                🚶‍♂️ Street View
                              </button>
                            )}
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                </MarkerClusterGroup>
              </MapContainer>
            )}
          </div>

          {/* DIVIDER */}
          <div onMouseDown={handleDragStart} style={{
            [isVerticalSplit ? 'height' : 'width']: '24px', [isVerticalSplit ? 'width' : 'height']: '100%',
            cursor: isVerticalSplit ? 'row-resize' : 'col-resize', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 10, flexShrink: 0, margin: isVerticalSplit ? '-10px 0' : '0 -10px', gap: '8px', flexDirection: isVerticalSplit ? 'row' : 'column'
          }}>
            <div style={{ width: isVerticalSplit ? '36px' : '5px', height: isVerticalSplit ? '5px' : '36px', background: 'rgba(150,150,150,0.5)', borderRadius: '3px' }} />
            <button onClick={(e) => { e.stopPropagation(); toggleOrientation(); }} style={{ background: 'var(--ios-glass)', backdropFilter: 'blur(10px)', border: '1px solid var(--ios-border)', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--ios-text-primary)' }}>
              <RotateCw size={16} />
            </button>
          </div>

          {/* LIST */}
          <div id="map-split-scroll" className="ios-glass" style={{ 
            flex: 1, overflowY: 'auto', background: 'var(--ios-glass)', backdropFilter: 'blur(30px) saturate(200%)', 
            borderRadius: 'var(--ios-radius-lg)', border: '1px solid rgba(255,255,255,0.1)', padding: '0',
            display: 'flex', flexDirection: 'column', position: 'relative'
          }}>
            <FastScrollbar items={visibleLocations} getDate={(loc) => new Date(loc.taken_at)} scrollContainerSelector="#map-split-scroll" />
            <div style={{ padding: '16px 20px 12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>Places</h3>
                <div style={{ fontSize: '12px', color: 'var(--ios-text-secondary)', fontWeight: 600 }}>{visibleLocations.length} memories in this area</div>
              </div>

              {/* Pin Icon - Locations Directory Explorer Button */}
              <button
                onClick={() => setIsExplorerOpen(true)}
                className="segment-btn"
                title="Browse All Visited Locations (by Country/City)"
                style={{
                  padding: '6px 12px',
                  borderRadius: '10px',
                  fontSize: '12px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  backgroundColor: 'var(--ios-bg-card)',
                  color: 'var(--ios-text-primary)',
                  border: '1px solid var(--ios-border)'
                }}
              >
                <MapPin size={14} color="var(--ios-accent)" />
                <span>Places Directory</span>
              </button>
            </div>
            
            <div style={{ flex: 1, padding: '0 20px 20px 20px' }}>
              {Object.entries(
                visibleLocations.reduce((acc, loc) => {
                  const d = format(new Date(loc.taken_at), 'MMMM d, yyyy');
                  if (!acc[d]) acc[d] = [];
                  acc[d].push(loc);
                  return acc;
                }, {})
              ).map(([dateStr, locs]) => (
                <div key={dateStr} style={{ position: 'relative', marginBottom: '24px' }}>
                  {/* Floating Date Bubble */}
                  <div style={{ position: 'sticky', top: '10px', zIndex: 40, pointerEvents: 'none', display: 'flex', padding: '8px 0', marginBottom: '8px' }}>
                    <div style={{
                      background: 'var(--ios-glass)', backdropFilter: 'blur(25px) saturate(180%)',
                      border: '1px solid rgba(255,255,255,0.1)', color: 'var(--ios-text-primary)',
                      padding: '6px 16px', borderRadius: '20px', fontSize: '14px', fontWeight: 600,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                    }}>
                      {dateStr}
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '4px' }}>
                    {locs.map(loc => (
                      <div key={loc.id} onClick={() => navigate(`/story/${loc.id}${loc.location_name ? `?location=${encodeURIComponent(loc.location_name)}` : ''}`)} style={{ aspectRatio: '2/3', cursor: 'pointer', borderRadius: '6px', overflow: 'hidden' }}>
                        {loc.media_type === 2 ? (
                          <video 
                            src={`${loc.media_url}#t=0.1`} 
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                            muted playsInline 
                            onMouseOver={(e) => e.target.play()} 
                            onMouseOut={(e) => { e.target.pause(); e.target.currentTime = 0; }}
                          />
                        ) : (
                          <img 
                            src={loc.media_url} 
                            onError={(e) => { e.target.src = 'https://placehold.co/400x600/1c1c1e/ffffff?text=Image+Error' }}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Immersive Render (Apple Photos Style)
  const getSheetHeight = () => {
    const maxH = immersiveFullScreen ? '100vh' : '100%';
    switch (sheetState) {
      case 'full': return `calc(${maxH} - 40px)`;
      case 'half': return immersiveFullScreen ? '40vh' : '50%';
      case 'collapsed': return '120px';
      default: return immersiveFullScreen ? '40vh' : '50%';
    }
  }

  const containerStyle = immersiveFullScreen 
    ? { position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 1000, background: '#000' }
    : { flex: 1, position: 'relative', height: '100%', overflow: 'hidden', background: '#000', borderRadius: 'var(--ios-radius-lg)' }

  return (
    <motion.div 
      layout
      transition={{ type: 'spring', damping: 26, stiffness: 220 }}
      style={containerStyle}
    >
      {/* Back Button and Full Screen & Explorer Toggle */}
      <div style={{ position: 'absolute', top: immersiveFullScreen ? '40px' : '20px', left: '20px', zIndex: 1010, display: 'flex', gap: '10px', alignItems: 'center' }}>
        {immersiveFullScreen && (
          <button className="ios-glass" onClick={() => navigate('/timeline')} style={{ background: 'rgba(255,255,255,0.8)', border: 'none', borderRadius: '50%', width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
            <ChevronDown size={24} color="#000" style={{ transform: 'rotate(90deg)' }} />
          </button>
        )}
        <button 
          className="ios-glass" 
          onClick={() => setImmersiveFullScreen(!immersiveFullScreen)} 
          style={{ 
            background: 'rgba(255,255,255,0.8)', border: 'none', borderRadius: '50%', 
            width: '44px', height: '44px', display: 'flex', alignItems: 'center', 
            justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', color: '#000' 
          }}
          title={immersiveFullScreen ? 'Minimize to Bento' : 'Full Screen'}
        >
          {immersiveFullScreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
        </button>

        {/* Pin Explorer Action */}
        <button
          className="ios-glass"
          onClick={() => setIsExplorerOpen(true)}
          style={{
            background: 'rgba(255,255,255,0.85)',
            border: 'none',
            borderRadius: '24px',
            height: '44px',
            padding: '0 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            color: '#000',
            fontWeight: 700,
            fontSize: '13px',
          }}
          title="Explore All Visited Locations"
        >
          <MapPin size={18} color="#007aff" />
          <span>Places Directory</span>
        </button>
      </div>

      <MapContainer 
        center={[20, 0]} 
        zoom={3} 
        style={{ height: '100%', width: '100%' }} 
        worldCopyJump={true} 
        zoomControl={false}
        ref={setMapInstance}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" className="map-tiles-dark" />
        <MapEvents onBoundsChange={handleBoundsChange} />
        <MarkerClusterGroup chunkedLoading maxClusterRadius={50} iconCreateFunction={createClusterCustomIcon} showCoverageOnHover={false}>
          {locations.map(loc => (
            <Marker key={loc.id} position={[loc.location_lat, loc.location_lng]} icon={createIosPin(loc.media_url, loc.media_type)}>
              <Popup>
                <div style={{ textAlign: 'center', padding: '4px' }}>
                  <strong>{loc.location_name}</strong><br/>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '6px' }}>
                    <Link to={`/story/${loc.id}${loc.location_name ? `?location=${encodeURIComponent(loc.location_name)}` : ''}`} style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ios-accent)' }}>View</Link>
                    {loc.location_lat && loc.location_lng && (
                      <button
                        onClick={() => setStreetViewTarget({ name: loc.location_name, lat: loc.location_lat, lng: loc.location_lng })}
                        style={{ background: 'transparent', border: 'none', color: 'var(--ios-accent)', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                      >
                        🚶‍♂️ Street View
                      </button>
                    )}
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MarkerClusterGroup>
      </MapContainer>

      {/* Floating Bottom Sheet */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, width: '100%', height: getSheetHeight(),
        background: 'var(--ios-glass)', backdropFilter: 'blur(30px) saturate(200%)',
        borderTopLeftRadius: '24px', borderTopRightRadius: '24px', 
        borderBottomLeftRadius: immersiveFullScreen ? '0' : 'var(--ios-radius-lg)',
        borderBottomRightRadius: immersiveFullScreen ? '0' : 'var(--ios-radius-lg)',
        borderTop: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 -10px 40px rgba(0,0,0,0.2)', transition: 'height 0.4s cubic-bezier(0.25, 1, 0.5, 1)',
        display: 'flex', flexDirection: 'column', zIndex: 1020
      }}>
        {/* Drag Handle Area */}
        <div 
          onClick={() => {
            if (sheetState === 'collapsed') setSheetState('half')
            else if (sheetState === 'half') setSheetState('full')
            else if (sheetState === 'full') setSheetState('half')
          }}
          style={{ width: '100%', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
        >
          <div style={{ width: '36px', height: '5px', background: 'rgba(150,150,150,0.5)', borderRadius: '3px' }} />
        </div>
        
        <div style={{ padding: '0 20px 12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: 'var(--ios-text-primary)' }}>Places</h2>
            <div style={{ fontSize: '13px', color: 'var(--ios-text-secondary)', fontWeight: 600 }}>{visibleLocations.length} memories in this area</div>
          </div>

          <button
            onClick={() => setIsExplorerOpen(true)}
            className="segment-btn"
            style={{
              padding: '6px 12px',
              borderRadius: '10px',
              fontSize: '12px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
            }}
          >
            <Globe size={14} color="var(--ios-accent)" />
            <span>Directory</span>
          </button>
        </div>

        <div id="map-sheet-scroll" style={{ flex: 1, overflowY: 'auto', padding: '0 20px 40px 20px', position: 'relative' }}>
          <FastScrollbar items={visibleLocations} getDate={(loc) => new Date(loc.taken_at)} scrollContainerSelector="#map-sheet-scroll" />
          {Object.entries(
            visibleLocations.reduce((acc, loc) => {
              const d = format(new Date(loc.taken_at), 'MMMM d, yyyy');
              if (!acc[d]) acc[d] = [];
              acc[d].push(loc);
              return acc;
            }, {})
          ).map(([dateStr, locs]) => (
            <div key={dateStr} style={{ position: 'relative', marginBottom: '24px' }}>
              {/* Floating Date Bubble */}
              <div style={{ position: 'sticky', top: '10px', zIndex: 40, pointerEvents: 'none', display: 'flex', padding: '8px 0', marginBottom: '8px' }}>
                <div style={{
                  background: 'var(--ios-glass)', backdropFilter: 'blur(25px) saturate(180%)',
                  border: '1px solid rgba(255,255,255,0.1)', color: 'var(--ios-text-primary)',
                  padding: '6px 16px', borderRadius: '20px', fontSize: '14px', fontWeight: 600,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }}>
                  {dateStr}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '4px' }}>
                {locs.map(loc => (
                  <div key={loc.id} onClick={() => navigate(`/story/${loc.id}${loc.location_name ? `?location=${encodeURIComponent(loc.location_name)}` : ''}`)} style={{ aspectRatio: '2/3', cursor: 'pointer', borderRadius: '6px', overflow: 'hidden' }}>
                    {loc.media_type === 2 ? (
                      <video 
                        src={`${loc.media_url}#t=0.1`} 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                        muted playsInline 
                        onMouseOver={(e) => e.target.play()} 
                        onMouseOut={(e) => { e.target.pause(); e.target.currentTime = 0; }}
                      />
                    ) : (
                      <img 
                        src={loc.media_url} 
                        onError={(e) => { e.target.src = 'https://placehold.co/400x600/1c1c1e/ffffff?text=Image+Error' }}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Locations Explorer Modal ── */}
      <LocationExplorerModal
        isOpen={isExplorerOpen}
        onClose={() => setIsExplorerOpen(false)}
        locations={locations}
        onSelectLocation={(loc) => {
          if (mapInstance && loc.location_lat && loc.location_lng) {
            mapInstance.flyTo([loc.location_lat, loc.location_lng], 14)
          }
        }}
        onOpenStreetView={(loc) => {
          setStreetViewTarget({
            name: loc.location_name,
            lat: loc.location_lat || loc.lat,
            lng: loc.location_lng || loc.lng
          })
        }}
      />

      {/* ── Street View Modal ── */}
      <StreetViewModal
        isOpen={!!streetViewTarget}
        onClose={() => setStreetViewTarget(null)}
        locationName={streetViewTarget?.name}
        lat={streetViewTarget?.lat}
        lng={streetViewTarget?.lng}
        onUpdateLocation={async (loc) => {
          setStreetViewTarget(prev => prev ? { ...prev, name: loc.location_name, lat: loc.location_lat, lng: loc.location_lng } : null)
          loadStories()
        }}
      />
    </motion.div>
  )
}
