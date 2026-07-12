import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-cluster'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { getAllStoryLocations } from '../services/api'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'

// Fix default leaflet icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// A component to extract map bounds and update parent state
function MapEvents({ onBoundsChange }) {
  const map = useMapEvents({
    moveend: () => {
      onBoundsChange(map.getBounds())
    },
    zoomend: () => {
      onBoundsChange(map.getBounds())
    }
  })
  
  // Trigger initial bounds
  useEffect(() => {
    onBoundsChange(map.getBounds())
  }, [map, onBoundsChange])

  return null
}

// Fixes Leaflet rendering issues when container is resized
function MapResizer() {
  const map = useMap()
  useEffect(() => {
    const observer = new ResizeObserver(() => {
      map.invalidateSize()
    })
    observer.observe(map.getContainer())
    return () => observer.disconnect()
  }, [map])
  return null
}

export default function MapView() {
  const [locations, setLocations] = useState([])
  const [visibleLocations, setVisibleLocations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  // Layout States
  const [isVerticalSplit, setIsVerticalSplit] = useState(() => {
    return localStorage.getItem('sv_map_orientation') === 'vertical'
  })
  
  const [splitRatio, setSplitRatio] = useState(() => {
    return parseFloat(localStorage.getItem('sv_map_split')) || 50
  })

  const [isDragging, setIsDragging] = useState(false)
  const containerRef = useRef(null)

  // Fetch data
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

  // Drag logic
  const handleDragStart = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDrag = useCallback((e) => {
    if (!isDragging || !containerRef.current) return

    const containerRect = containerRef.current.getBoundingClientRect()
    let newRatio;
    
    if (isVerticalSplit) {
      // Top/Bottom split
      const deltaY = e.clientY - containerRect.top
      newRatio = (deltaY / containerRect.height) * 100
    } else {
      // Left/Right split
      const deltaX = e.clientX - containerRect.left
      newRatio = (deltaX / containerRect.width) * 100
    }
    
    // Clamp between 20% and 80%
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
    } else {
      window.removeEventListener('mousemove', handleDrag)
      window.removeEventListener('mouseup', handleDragEnd)
    }
    return () => {
      window.removeEventListener('mousemove', handleDrag)
      window.removeEventListener('mouseup', handleDragEnd)
    }
  }, [isDragging, handleDrag, handleDragEnd])

  // Toggle orientation
  const toggleOrientation = () => {
    const newOrientation = !isVerticalSplit
    setIsVerticalSplit(newOrientation)
    localStorage.setItem('sv_map_orientation', newOrientation ? 'vertical' : 'horizontal')
  }

  // Handle map bounds change
  const handleBoundsChange = useCallback((bounds) => {
    if (!bounds) return
    const visible = locations.filter(loc => {
      return bounds.contains([loc.location_lat, loc.location_lng])
    })
    
    // Sort chronological (descending)
    visible.sort((a, b) => new Date(b.taken_at) - new Date(a.taken_at))
    setVisibleLocations(visible)
  }, [locations])

  // Compute Top Cities for quick navigation
  const topCities = useMemo(() => {
    const counts = {}
    locations.forEach(loc => {
      if (loc.location_name) {
        counts[loc.location_name] = (counts[loc.location_name] || 0) + 1
      }
    })
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5) // Top 5
  }, [locations])

  return (
    <div className="sv-card" style={{ padding: 0, height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column', background: 'var(--sv-bg)' }}>
      
      {/* Header overlay or simple row for Top Locations */}
      {topCities.length > 0 && (
        <div style={{ padding: 'var(--sv-space-3) var(--sv-space-4)', display: 'flex', gap: 'var(--sv-space-2)', overflowX: 'auto', background: 'var(--sv-surface)', zIndex: 10 }}>
          <span style={{ color: 'var(--sv-text-muted)', fontSize: 'var(--sv-text-sm)', alignSelf: 'center', marginRight: 'var(--sv-space-2)' }}>
            Top Locations:
          </span>
          {topCities.map(([city, count]) => (
            <div key={city} className="sv-badge" style={{ cursor: 'default' }}>
              📍 {city} ({count})
            </div>
          ))}
        </div>
      )}

      {/* Split Container */}
      <div 
        ref={containerRef}
        style={{ 
          display: 'flex', 
          flexDirection: isVerticalSplit ? 'column' : 'row',
          flex: 1,
          overflow: 'hidden',
          position: 'relative',
          padding: 'var(--sv-space-3)',
          gap: '4px'
        }}
      >
        {/* MAP SECTION */}
        <div style={{ 
          flexBasis: `${splitRatio}%`, 
          flexGrow: 0,
          flexShrink: 0,
          position: 'relative',
          zIndex: 1,
          borderRadius: 'var(--sv-radius-lg)',
          border: '1px solid var(--sv-border-light)',
          overflow: 'hidden',
          background: 'var(--sv-surface)'
        }}>
          {loading ? (
            <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
              <div className="sv-loading-spinner" />
            </div>
          ) : error ? (
            <div style={{ padding: 'var(--sv-space-4)', color: 'var(--sv-danger)' }}>{error}</div>
          ) : (
            <MapContainer 
              center={[20, 0]} 
              zoom={2} 
              style={{ height: '100%', width: '100%', background: '#1a1a1a' }}
              worldCopyJump={true}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                className="map-tiles-dark"
              />
              <MapEvents onBoundsChange={handleBoundsChange} />
              <MapResizer />
              
              <MarkerClusterGroup
                chunkedLoading
                maxClusterRadius={50}
                showCoverageOnHover={false}
              >
                {locations.map(loc => (
                  <Marker key={loc.id} position={[loc.location_lat, loc.location_lng]}>
                    <Popup className="sv-map-popup">
                      <div style={{ textAlign: 'center' }}>
                        {loc.media_url ? (
                          <img 
                            src={loc.media_url} 
                            alt={loc.location_name} 
                            style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '4px', marginBottom: '8px' }} 
                          />
                        ) : (
                          <div style={{ width: '100px', height: '100px', background: '#333', borderRadius: '4px', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ fontSize: '24px' }}>🎥</span>
                          </div>
                        )}
                        <br/>
                        <strong>{loc.location_name}</strong><br/>
                        <span style={{ fontSize: '11px', color: '#666' }}>
                          {format(new Date(loc.taken_at), 'MMM d, yyyy')}
                        </span><br/>
                        <Link to={`/story/${loc.id}`} style={{ display: 'inline-block', marginTop: '4px' }}>View Story</Link>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MarkerClusterGroup>
            </MapContainer>
          )}
        </div>

        {/* DRAGGABLE DIVIDER */}
        <div 
          className="map-divider-container"
          onMouseDown={handleDragStart}
          style={{
            [isVerticalSplit ? 'height' : 'width']: '24px',
            [isVerticalSplit ? 'width' : 'height']: '100%',
            cursor: isVerticalSplit ? 'row-resize' : 'col-resize',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            zIndex: 10,
            flexShrink: 0,
            margin: isVerticalSplit ? '-10px 0' : '0 -10px'
          }}
        >
          {/* Visual Handle */}
          <div className={`map-divider-handle ${isVerticalSplit ? 'vertical' : 'horizontal'}`}>
            <button 
              onClick={(e) => { e.stopPropagation(); toggleOrientation(); }}
              className="rotate-btn"
              title="Rotate Split"
            >
              <svg 
                width="16" height="16" viewBox="0 0 24 24" 
                fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                style={{ transform: isVerticalSplit ? 'rotate(90deg)' : 'none', transition: 'transform 0.3s' }}
              >
                <path d="M21 2v6h-6"></path>
                <path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path>
                <path d="M3 22v-6h6"></path>
                <path d="M21 12a9 9 0 0 1-15 6.7L3 16"></path>
              </svg>
            </button>
          </div>
        </div>

        {/* FEED SECTION */}
        <div style={{ 
          flex: 1, 
          overflowY: 'auto', 
          background: 'var(--sv-surface)',
          padding: 'var(--sv-space-4)',
          borderRadius: 'var(--sv-radius-lg)',
          border: '1px solid var(--sv-border-light)',
          position: 'relative'
        }}>
          <h2 style={{ marginBottom: 'var(--sv-space-4)' }}>
            Stories in View ({visibleLocations.length})
          </h2>
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', 
            gap: 'var(--sv-space-3)' 
          }}>
            {visibleLocations.map(loc => (
              <Link to={`/story/${loc.id}`} key={loc.id} style={{ textDecoration: 'none' }}>
                <div style={{
                  position: 'relative',
                  aspectRatio: '9/16',
                  borderRadius: 'var(--sv-radius-md)',
                  overflow: 'hidden',
                  background: 'var(--sv-bg)',
                  border: '1px solid var(--sv-border-light)'
                }}>
                  {loc.media_url ? (
                    <img 
                      src={loc.media_url} 
                      alt={loc.location_name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      loading="lazy"
                    />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: '24px' }}>🎥</span>
                    </div>
                  )}
                  <div style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    padding: '4px 8px',
                    background: 'rgba(0,0,0,0.7)',
                    color: 'white',
                    fontSize: '10px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {format(new Date(loc.taken_at), 'MMM d, yyyy')}
                  </div>
                </div>
              </Link>
            ))}
            
            {visibleLocations.length === 0 && !loading && (
              <div style={{ gridColumn: '1 / -1', color: 'var(--sv-text-muted)', textAlign: 'center', padding: 'var(--sv-space-8) 0' }}>
                No stories found in this area. Try panning or zooming the map!
              </div>
            )}
          </div>
        </div>
        
      </div>
      
      {/* CSS for Divider Hover & Map Dark Mode */}
      <style>{`
        .map-divider-container {
          /* transparent hit area is handled by inline styles */
        }
        
        .map-divider-handle {
          background: var(--sv-border-light);
          border-radius: 999px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          overflow: hidden;
        }
        
        .map-divider-handle.horizontal {
          width: 4px;
          height: 48px;
        }
        
        .map-divider-handle.vertical {
          height: 4px;
          width: 48px;
        }

        .map-divider-container:hover .map-divider-handle {
          background: var(--sv-surface-raised);
          border: 1px solid var(--sv-border-light);
          box-shadow: 0 4px 12px rgba(0,0,0,0.5);
        }
        
        .map-divider-container:hover .map-divider-handle.horizontal {
          width: 36px;
          height: 64px;
        }
        
        .map-divider-container:hover .map-divider-handle.vertical {
          height: 36px;
          width: 64px;
        }

        .rotate-btn {
          background: transparent;
          border: none;
          color: var(--sv-text-primary);
          cursor: pointer;
          opacity: 0;
          transition: opacity 0.2s, color 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
        }
        
        .map-divider-container:hover .rotate-btn {
          opacity: 1;
        }
        
        .rotate-btn:hover {
          color: var(--sv-accent);
        }

        .map-tiles-dark {
          filter: invert(100%) hue-rotate(180deg) brightness(95%) contrast(90%);
        }
        .sv-map-popup .leaflet-popup-content-wrapper {
          background: var(--sv-surface);
          color: var(--sv-text-primary);
          border: 1px solid var(--sv-border-light);
        }
        .sv-map-popup .leaflet-popup-tip {
          background: var(--sv-surface);
        }
        .marker-cluster-small, .marker-cluster-medium, .marker-cluster-large {
          background-color: rgba(234, 60, 115, 0.6);
        }
        .marker-cluster-small div, .marker-cluster-medium div, .marker-cluster-large div {
          background-color: rgba(234, 60, 115, 0.9);
          color: white;
          font-weight: bold;
        }
      `}</style>
    </div>
  )
}
