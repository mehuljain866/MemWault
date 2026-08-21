import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Search, MapPin, Map as MapIcon, ChevronLeft, Maximize2, Minimize2, Check, X, Globe } from 'lucide-react';
import { getSettings } from '../services/settings';
import { playWin98Click } from '../services/win98Audio';

import L from 'leaflet';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: iconRetinaUrl,
  iconUrl: iconUrl,
  shadowUrl: shadowUrl,
});

function MapPicker({ position, setPosition, centerView }) {
  const map = useMapEvents({
    click(e) {
      setPosition(e.latlng);
    },
  });

  useEffect(() => {
    if (centerView && centerView.lat && centerView.lng) {
      map.setView([centerView.lat, centerView.lng], 13);
    }
  }, [centerView, map]);

  return position === null ? null : (
    <Marker position={position}></Marker>
  );
}

export default function LocationModal({ isOpen, onClose, onSave, initialLocation }) {
  const [mode, setMode] = useState('search'); // 'search' | 'map'
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  
  const [mapPosition, setMapPosition] = useState(null);
  const [mapCenter, setMapCenter] = useState(null);
  const [customName, setCustomName] = useState('');

  const settings = getSettings();
  const isWin98 = settings.themeId === 'win98';

  useEffect(() => {
    if (isOpen) {
      setMode('search');
      setIsFullscreen(false);
      setSearchQuery('');
      setSearchResults([]);
      setCustomName(initialLocation?.name || '');
      if (initialLocation?.lat && initialLocation?.lng) {
        const initPos = { lat: initialLocation.lat, lng: initialLocation.lng };
        setMapPosition(initPos);
        setMapCenter(initPos);
      } else {
        const defaultPos = { lat: 20, lng: 0 };
        setMapPosition(defaultPos);
        setMapCenter(defaultPos);
      }
    }
  }, [isOpen, initialLocation]);

  if (!isOpen) return null;

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;
    if (isWin98) playWin98Click();
    
    setIsSearching(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=6`);
      const data = await res.json();
      setSearchResults(data);
    } catch (err) {
      console.error("Search failed:", err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectResult = (result) => {
    if (isWin98) playWin98Click();
    onSave({
      location_name: result.display_name.split(',')[0].trim(),
      location_lat: parseFloat(result.lat),
      location_lng: parseFloat(result.lon)
    });
  };

  const handleSaveMap = () => {
    if (!mapPosition) return;
    if (isWin98) playWin98Click();
    onSave({
      location_name: customName || 'Custom Location',
      location_lat: mapPosition.lat,
      location_lng: mapPosition.lng
    });
  };

  const switchToMap = (lat, lng, name) => {
    if (isWin98) playWin98Click();
    setMode('map');
    if (lat && lng) {
      const pos = { lat: parseFloat(lat), lng: parseFloat(lng) };
      setMapPosition(pos);
      setMapCenter(pos);
    }
    if (name) {
      setCustomName(name.split(',')[0].trim());
    }
  };

  // ═══════════════════════════════════════════════════════════
  // 1. WINDOWS 98 AUTHENTIC DIALOG
  // ═══════════════════════════════════════════════════════════
  if (isWin98) {
    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        padding: '16px',
        fontFamily: '"MS Sans Serif", Tahoma, Arial, sans-serif',
        fontSize: '11px',
      }}>
        <div style={{
          width: '560px',
          maxWidth: '96vw',
          maxHeight: '90vh',
          backgroundColor: '#c0c0c0',
          border: '1px solid #000000',
          boxShadow: 'inset 1px 1px #ffffff, inset -1px -1px #808080, 4px 4px 16px rgba(0,0,0,0.5)',
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box',
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
            userSelect: 'none',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Globe size={13} color="#ffffff" />
              <span>{mode === 'search' ? 'Edit Location - Search Address' : 'Edit Location - Interactive Map Pin'}</span>
            </div>
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
              }}
            >
              <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                <path d="M1 1L7 7M7 1L1 7" stroke="#000000" strokeWidth="1.8" strokeLinecap="square" />
              </svg>
            </button>
          </div>

          {/* Dialog Body */}
          <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, overflow: 'hidden' }}>
            {mode === 'search' ? (
              <>
                {/* Search Input */}
                <form onSubmit={handleSearch} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <span style={{ fontWeight: 'bold' }}>Address:</span>
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
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="Type landmark, venue, city or country..."
                      style={{
                        border: 'none',
                        outline: 'none',
                        width: '100%',
                        fontSize: '11px',
                        fontFamily: '"MS Sans Serif", Tahoma, sans-serif',
                      }}
                      autoFocus
                    />
                  </div>
                  <button
                    type="submit"
                    className="segment-btn"
                    style={{ padding: '2px 10px', fontWeight: 'bold' }}
                  >
                    Find
                  </button>
                </form>

                {/* Sunken Results Viewport */}
                <div style={{
                  height: '240px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #000000',
                  boxShadow: 'inset 1px 1px #808080, inset -1px -1px #dfdfdf, inset 2px 2px #000, inset -2px -2px #ffffff',
                  overflowY: 'auto',
                  padding: '4px',
                }}>
                  {isSearching && (
                    <div style={{ padding: '20px', textAlign: 'center', color: '#555' }}>
                      Querying OpenStreetMap Geocoder...
                    </div>
                  )}

                  {!isSearching && searchResults.length > 0 && (
                    <div>
                      {searchResults.map((res, i) => (
                        <div
                          key={i}
                          onClick={() => handleSelectResult(res)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '4px 6px',
                            borderBottom: '1px dotted #ccc',
                            cursor: 'pointer',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#000080';
                            e.currentTarget.style.color = '#ffffff';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                            e.currentTarget.style.color = '#000000';
                          }}
                        >
                          <div style={{ flex: 1, minWidth: 0, paddingRight: '6px' }}>
                            <div style={{ fontWeight: 'bold' }}>{res.display_name.split(',')[0]}</div>
                            <div style={{ fontSize: '10px', opacity: 0.8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {res.display_name}
                            </div>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              switchToMap(res.lat, res.lon, res.display_name);
                            }}
                            className="segment-btn"
                            style={{ padding: '2px 6px', fontSize: '10px' }}
                          >
                            Map Pin
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {!isSearching && searchResults.length === 0 && searchQuery && (
                    <div style={{ padding: '20px', textAlign: 'center', color: '#888' }}>
                      No matching addresses found for "{searchQuery}".
                    </div>
                  )}

                  {!isSearching && searchResults.length === 0 && !searchQuery && (
                    <div style={{ padding: '20px', textAlign: 'center', color: '#888' }}>
                      Enter a location name or choose to pick directly on the map.
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <button
                    onClick={() => switchToMap(initialLocation?.lat, initialLocation?.lng, initialLocation?.name)}
                    className="segment-btn"
                    style={{ padding: '4px 12px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold', color: '#000080' }}
                  >
                    <MapIcon size={13} />
                    <span>Or Pin Point Directly on Map</span>
                  </button>
                </div>
              </>
            ) : (
              /* Map Mode */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', height: '360px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontWeight: 'bold' }}>Place Name:</span>
                  <div style={{
                    flex: 1,
                    backgroundColor: '#ffffff',
                    border: '1px solid #000',
                    boxShadow: 'inset 1px 1px #808080, inset -1px -1px #fff',
                    padding: '2px 6px',
                  }}>
                    <input
                      type="text"
                      value={customName}
                      onChange={e => setCustomName(e.target.value)}
                      placeholder="Name this location..."
                      style={{
                        border: 'none',
                        outline: 'none',
                        width: '100%',
                        fontSize: '11px',
                        fontFamily: '"MS Sans Serif", Tahoma, sans-serif',
                        fontWeight: 'bold',
                      }}
                    />
                  </div>
                  <button
                    onClick={() => setMode('search')}
                    className="segment-btn"
                    style={{ padding: '2px 8px' }}
                  >
                    Back to Search
                  </button>
                </div>

                {/* Map Viewport */}
                <div style={{
                  flex: 1,
                  backgroundColor: '#ffffff',
                  border: '1px solid #000000',
                  boxShadow: 'inset 1px 1px #808080, inset -1px -1px #fff',
                  overflow: 'hidden',
                  position: 'relative',
                }}>
                  <MapContainer 
                    center={mapPosition ? [mapPosition.lat, mapPosition.lng] : [20, 0]} 
                    zoom={mapPosition ? 13 : 2} 
                    style={{ height: '100%', width: '100%' }}
                    zoomControl={true}
                  >
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <MapPicker position={mapPosition} setPosition={setMapPosition} centerView={mapCenter} />
                  </MapContainer>
                </div>
              </div>
            )}
          </div>

          {/* Footer Buttons */}
          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            padding: '6px 10px',
            backgroundColor: '#c0c0c0',
            borderTop: '1px solid #808080',
            gap: '6px',
          }}>
            {mode === 'map' && (
              <button
                onClick={handleSaveMap}
                disabled={!mapPosition}
                className="segment-btn"
                style={{
                  minWidth: '75px',
                  height: '23px',
                  backgroundColor: '#000080',
                  color: '#ffffff',
                  fontWeight: 'bold',
                }}
              >
                Save Location
              </button>
            )}
            <button
              onClick={onClose}
              className="segment-btn"
              style={{ minWidth: '75px', height: '23px' }}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // 2. MODERN THEME DIALOG
  // ═══════════════════════════════════════════════════════════
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: '20px'
    }}>
      <div style={{
        width: '100%', 
        maxWidth: isFullscreen ? '95vw' : '620px',
        backgroundColor: 'var(--ios-bg-card, #1c1c1e)',
        borderRadius: '20px',
        border: '1px solid var(--ios-border, rgba(255,255,255,0.12))',
        height: isFullscreen ? '92vh' : 'auto',
        maxHeight: '90vh',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--ios-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {mode === 'map' && (
              <button onClick={() => setMode('search')} className="ios-btn-secondary" style={{ padding: '6px 12px', borderRadius: '8px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <ChevronLeft size={16} /> <span>Back</span>
              </button>
            )}
            <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: 'var(--ios-text-primary)' }}>
              {mode === 'search' ? 'Search Location' : 'Pin Location'}
            </h2>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {mode === 'map' && (
              <button onClick={() => setIsFullscreen(!isFullscreen)} className="ios-btn-secondary" style={{ padding: '6px', borderRadius: '8px' }}>
                {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              </button>
            )}
            <button onClick={onClose} className="ios-btn-secondary" style={{ padding: '6px', borderRadius: '8px' }}>
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', padding: '20px' }}>
          {mode === 'search' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <form onSubmit={handleSearch} style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--ios-text-secondary)', zIndex: 5 }}>
                  <Search size={18} />
                </div>
                <input
                  type="text"
                  placeholder="Search for a place, venue, or address"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%', padding: '12px 14px 12px 42px', borderRadius: '12px',
                    border: '1px solid var(--ios-border)', backgroundColor: 'var(--ios-bg-app)', fontSize: '14px',
                    color: 'var(--ios-text-primary)', outline: 'none', boxSizing: 'border-box'
                  }}
                  autoFocus
                />
              </form>

              {isSearching && <div style={{ textAlign: 'center', color: 'var(--ios-text-secondary)', padding: '24px' }}>Searching...</div>}

              {!isSearching && searchResults.length > 0 && (
                <div style={{ background: 'var(--ios-bg-app)', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--ios-border)' }}>
                  {searchResults.map((res, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', borderBottom: i === searchResults.length - 1 ? 'none' : '1px solid var(--ios-border)' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'rgba(10, 132, 255, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '12px', color: 'var(--ios-accent)' }}>
                        <MapPin size={16} />
                      </div>
                      <div onClick={() => handleSelectResult(res)} style={{ flex: 1, cursor: 'pointer' }}>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--ios-text-primary)' }}>{res.display_name.split(',')[0]}</div>
                        <div style={{ fontSize: '12px', color: 'var(--ios-text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '380px' }}>
                          {res.display_name}
                        </div>
                      </div>
                      <button onClick={() => switchToMap(res.lat, res.lon, res.display_name)} className="ios-btn-secondary" style={{ padding: '6px 10px', borderRadius: '8px', fontSize: '12px' }}>
                        Pin on Map
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ textAlign: 'center', marginTop: '10px' }}>
                <button
                  className="ios-btn-secondary"
                  style={{ padding: '10px 18px', borderRadius: '12px', fontSize: '13px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                  onClick={() => switchToMap(initialLocation?.lat, initialLocation?.lng, initialLocation?.name)}
                >
                  <MapIcon size={16} /> <span>Or Choose Directly on Map</span>
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', height: '420px', gap: '12px' }}>
              <input 
                type="text" 
                placeholder="Name this location..." 
                value={customName}
                onChange={e => setCustomName(e.target.value)}
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: '10px',
                  border: '1px solid var(--ios-border)', backgroundColor: 'var(--ios-bg-app)', fontSize: '14px',
                  color: 'var(--ios-text-primary)', outline: 'none', fontWeight: 600, boxSizing: 'border-box'
                }}
              />
              <div style={{ flex: 1, borderRadius: '14px', overflow: 'hidden', border: '1px solid var(--ios-border)', position: 'relative' }}>
                <MapContainer 
                  center={mapPosition ? [mapPosition.lat, mapPosition.lng] : [20, 0]} 
                  zoom={mapPosition ? 13 : 2} 
                  style={{ height: '100%', width: '100%' }}
                  zoomControl={true}
                >
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <MapPicker position={mapPosition} setPosition={setMapPosition} centerView={mapCenter} />
                </MapContainer>
              </div>
              <button 
                onClick={handleSaveMap} 
                disabled={!mapPosition}
                className="ios-btn"
                style={{ padding: '12px', borderRadius: '12px', fontSize: '14px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                <Check size={18} /> <span>Use this location</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
