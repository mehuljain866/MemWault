import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  X, MapPin, Search, Compass, Globe, Navigation, 
  Building2, Map, Check, ArrowUpDown, Filter, ChevronRight,
  Sparkles, ExternalLink
} from 'lucide-react'
import { getSettings } from '../services/settings'
import { playWin98Click } from '../services/win98Audio'

/**
 * Map Locations Explorer Dialog
 * Displays all visited places sorted and grouped by Country, State/Region, City, or Frequency.
 */
export default function LocationExplorerModal({ 
  isOpen, 
  onClose, 
  locations = [], 
  onSelectLocation,
  onOpenStreetView 
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [sortMode, setSortMode] = useState('country') // 'country' | 'city' | 'frequency' | 'recent'
  const settings = getSettings()
  const isWin98 = settings.themeId === 'win98'

  // Filter locations by search
  const filteredLocations = useMemo(() => {
    if (!searchQuery.trim()) return locations
    const q = searchQuery.toLowerCase()
    return locations.filter(loc => 
      (loc.location_name && loc.location_name.toLowerCase().includes(q)) ||
      (loc.city && loc.city.toLowerCase().includes(q)) ||
      (loc.country && loc.country.toLowerCase().includes(q))
    )
  }, [locations, searchQuery])

  // Group / Sort logic
  const groupedData = useMemo(() => {
    if (sortMode === 'frequency') {
      // Sort by count descending
      return [...filteredLocations].sort((a, b) => (b.count || 1) - (a.count || 1))
    }

    if (sortMode === 'recent') {
      return [...filteredLocations].sort((a, b) => new Date(b.taken_at || 0) - new Date(a.taken_at || 0))
    }

    if (sortMode === 'city') {
      // Group by City
      const groups = {}
      filteredLocations.forEach(loc => {
        const parts = (loc.location_name || '').split(',')
        const city = parts.length > 1 ? parts[parts.length - 2].trim() : (loc.city || 'Other Cities')
        if (!groups[city]) groups[city] = []
        groups[city].push(loc)
      })
      return groups
    }

    // Default: Group by Country
    const groups = {}
    filteredLocations.forEach(loc => {
      const parts = (loc.location_name || '').split(',')
      const country = parts.length > 0 ? parts[parts.length - 1].trim() : (loc.country || 'World Locations')
      if (!groups[country]) groups[country] = []
      groups[country].push(loc)
    })
    return groups
  }, [filteredLocations, sortMode])

  if (!isOpen) return null

  const handleSelect = (loc) => {
    if (isWin98) playWin98Click()
    onSelectLocation(loc)
    onClose()
  }

  const handleStreetView = (e, loc) => {
    e.stopPropagation()
    if (isWin98) playWin98Click()
    if (onOpenStreetView) {
      onOpenStreetView(loc)
    }
  }

  // ═══════════════════════════════════════════════════════════
  // 1. WINDOWS 98 AUTHENTIC DIALOG
  // ═══════════════════════════════════════════════════════════
  if (isWin98) {
    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9998,
        backgroundColor: 'rgba(0, 0, 0, 0.35)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}>
        <div style={{
          width: '540px',
          maxWidth: '95vw',
          maxHeight: '85vh',
          backgroundColor: '#c0c0c0',
          border: '1px solid #000000',
          boxShadow: 'inset 1px 1px #ffffff, inset -1px -1px #808080, 4px 4px 16px rgba(0,0,0,0.5)',
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box',
          fontFamily: '"MS Sans Serif", Tahoma, Arial, sans-serif',
          fontSize: '11px',
          color: '#000000',
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
            fontSize: '11px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Globe size={13} color="#ffffff" />
              <span>Locations Explorer - Visited Places Directory</span>
            </div>
            <button
              onClick={onClose}
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

          {/* Search & Sort Controls */}
          <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: '8px', backgroundColor: '#c0c0c0' }}>
            {/* Search Input */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontWeight: 'bold' }}>Find Place:</span>
              <div style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                backgroundColor: '#ffffff',
                border: '1px solid #000',
                boxShadow: 'inset 1px 1px #808080, inset -1px -1px #fff',
                padding: '2px 6px',
              }}>
                <Search size={12} color="#555" style={{ marginRight: '4px' }} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Type country, city, or venue..."
                  style={{
                    border: 'none',
                    outline: 'none',
                    width: '100%',
                    fontSize: '11px',
                    fontFamily: '"MS Sans Serif", Tahoma, sans-serif',
                  }}
                />
              </div>
            </div>

            {/* Sort Segmented Control */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontWeight: 'bold' }}>Sort by:</span>
                <div className="segmented-container segment-group">
                  {[
                    { id: 'country', label: 'Country' },
                    { id: 'city', label: 'City' },
                    { id: 'frequency', label: 'Most Visited' },
                    { id: 'recent', label: 'Recent' },
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setSortMode(tab.id)}
                      className={`segment-btn ${sortMode === tab.id ? 'active' : ''}`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              <span style={{ color: '#000080', fontWeight: 'bold' }}>
                {filteredLocations.length} locations
              </span>
            </div>
          </div>

          {/* 3D Sunken Location List Viewport */}
          <div style={{
            flex: 1,
            backgroundColor: '#ffffff',
            margin: '0 8px 8px 8px',
            border: '1px solid #000000',
            boxShadow: 'inset 1px 1px #808080, inset -1px -1px #dfdfdf, inset 2px 2px #000, inset -2px -2px #ffffff',
            overflowY: 'auto',
            maxHeight: '380px',
            padding: '4px',
          }}>
            {Array.isArray(groupedData) ? (
              /* Flat sorted list */
              groupedData.map((loc, i) => (
                <LocationRowItem
                  key={loc.id || i}
                  loc={loc}
                  onSelect={handleSelect}
                  onStreetView={handleStreetView}
                  isWin98={true}
                />
              ))
            ) : (
              /* Grouped by Country or City */
              Object.entries(groupedData).map(([groupName, locs]) => (
                <div key={groupName} style={{ marginBottom: '8px' }}>
                  <div style={{
                    backgroundColor: '#e0e0e0',
                    borderBottom: '1px solid #c0c0c0',
                    padding: '3px 6px',
                    fontWeight: 'bold',
                    color: '#000080',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}>
                    <span>🌍 {groupName}</span>
                    <span style={{ fontSize: '10px', color: '#555' }}>{locs.length} places</span>
                  </div>

                  {locs.map((loc, idx) => (
                    <LocationRowItem
                      key={loc.id || idx}
                      loc={loc}
                      onSelect={handleSelect}
                      onStreetView={handleStreetView}
                      isWin98={true}
                    />
                  ))}
                </div>
              ))
            )}

            {filteredLocations.length === 0 && (
              <div style={{ padding: '24px', textAlign: 'center', color: '#888888' }}>
                No recorded locations match your filter.
              </div>
            )}
          </div>

          {/* Dialog Footer */}
          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            padding: '6px 8px',
            backgroundColor: '#c0c0c0',
            borderTop: '1px solid #808080',
            gap: '6px',
          }}>
            <button
              onClick={onClose}
              style={{
                minWidth: '75px',
                height: '23px',
                backgroundColor: '#c0c0c0',
                border: '1px solid #000',
                boxShadow: 'inset 1px 1px #fff, inset -1px -1px #808080',
                fontSize: '11px',
                cursor: 'pointer',
                fontWeight: 'bold',
              }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════════
  // 2. MODERN THEME DIALOG
  // ═══════════════════════════════════════════════════════════
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9998,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
    }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        style={{
          width: '580px',
          maxWidth: '95vw',
          maxHeight: '85vh',
          backgroundColor: 'var(--ios-bg-card, #1c1c1e)',
          borderRadius: '20px',
          border: '1px solid var(--ios-border, rgba(255,255,255,0.12))',
          boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
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
          padding: '16px 20px',
          borderBottom: '1px solid var(--ios-border, rgba(255,255,255,0.08))',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '34px',
              height: '34px',
              borderRadius: '10px',
              backgroundColor: 'rgba(10, 132, 255, 0.15)',
              color: 'var(--ios-accent, #007aff)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Globe size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--ios-text-primary, #fff)' }}>
                Locations Explorer
              </h3>
              <span style={{ fontSize: '12px', color: 'var(--ios-text-secondary, #8e8e93)' }}>
                {filteredLocations.length} Places Visited Across Memories
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="ios-btn-secondary"
            style={{ padding: '8px', borderRadius: '10px' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Search & Sort Bar */}
        <div style={{ padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: 'var(--ios-bg-app, #121214)',
            borderRadius: '12px',
            padding: '8px 12px',
            border: '1px solid var(--ios-border, rgba(255,255,255,0.1))',
          }}>
            <Search size={15} color="var(--ios-text-secondary, #8e8e93)" style={{ marginRight: '8px' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search country, city, or venue name..."
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: 'var(--ios-text-primary, #fff)',
                fontSize: '13px',
                width: '100%',
              }}
            />
          </div>

          {/* Filter Pills */}
          <div className="segmented-container segment-group" style={{
            display: 'flex',
            gap: '4px',
            backgroundColor: 'var(--ios-border, rgba(255,255,255,0.06))',
            borderRadius: '12px',
            padding: '3px',
          }}>
            {[
              { id: 'country', label: 'Country' },
              { id: 'city', label: 'City' },
              { id: 'frequency', label: 'Most Visited' },
              { id: 'recent', label: 'Recent' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setSortMode(tab.id)}
                className={`segment-btn ${sortMode === tab.id ? 'active' : ''}`}
                style={{
                  flex: 1,
                  padding: '5px 10px',
                  borderRadius: '9px',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  backgroundColor: sortMode === tab.id ? 'var(--ios-accent, #007aff)' : 'transparent',
                  color: sortMode === tab.id ? '#fff' : 'var(--ios-text-secondary, #8e8e93)',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Location List */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          maxHeight: '400px',
          padding: '0 20px 20px 20px',
        }}>
          {Array.isArray(groupedData) ? (
            groupedData.map((loc, i) => (
              <LocationRowItem
                key={loc.id || i}
                loc={loc}
                onSelect={handleSelect}
                onStreetView={handleStreetView}
                isWin98={false}
              />
            ))
          ) : (
            Object.entries(groupedData).map(([groupName, locs]) => (
              <div key={groupName} style={{ marginBottom: '16px' }}>
                <div style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  color: 'var(--ios-text-secondary, #8e8e93)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  padding: '8px 0 4px 0',
                  borderBottom: '1px solid var(--ios-border, rgba(255,255,255,0.06))',
                  marginBottom: '6px',
                }}>
                  {groupName} ({locs.length})
                </div>

                {locs.map((loc, idx) => (
                  <LocationRowItem
                    key={loc.id || idx}
                    loc={loc}
                    onSelect={handleSelect}
                    onStreetView={handleStreetView}
                    isWin98={false}
                  />
                ))}
              </div>
            ))
          )}
        </div>
      </motion.div>
    </div>
  )
}

// ── LocationRowItem Helper ─────────────────────────────────────────
function LocationRowItem({ loc, onSelect, onStreetView, isWin98 }) {
  const lat = loc.location_lat || loc.lat
  const lng = loc.location_lng || loc.lng

  return (
    <div
      onClick={() => onSelect(loc)}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: isWin98 ? '4px 6px' : '10px 12px',
        borderBottom: isWin98 ? '1px dotted #c0c0c0' : '1px solid var(--ios-border, rgba(255,255,255,0.04))',
        cursor: 'pointer',
        backgroundColor: 'transparent',
        borderRadius: isWin98 ? '0' : '10px',
        transition: 'background-color 0.15s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = isWin98 ? '#000080' : 'rgba(255,255,255,0.06)'
        if (isWin98) e.currentTarget.style.color = '#ffffff'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent'
        if (isWin98) e.currentTarget.style.color = '#000000'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
        <MapPin size={isWin98 ? 13 : 16} color="var(--ios-accent, #007aff)" />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: isWin98 ? '11px' : '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {loc.location_name || 'Named Landmark'}
          </div>
          {lat && lng && (
            <div style={{ fontSize: isWin98 ? '10px' : '11px', opacity: 0.65 }}>
              {lat.toFixed(4)}, {lng.toFixed(4)}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        {lat && lng && (
          <button
            onClick={(e) => onStreetView(e, loc)}
            className="segment-btn"
            title="Launch 360° Street View"
            style={{
              padding: isWin98 ? '2px 6px' : '4px 8px',
              fontSize: '11px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              borderRadius: isWin98 ? '0' : '8px',
            }}
          >
            <Compass size={11} />
            <span>Street View</span>
          </button>
        )}
        <ChevronRight size={14} opacity={0.5} />
      </div>
    </div>
  )
}
