import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Search, MapPin, Map as MapIcon, ChevronLeft, Maximize2, Minimize2, Check } from 'lucide-react';

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
  const [mode, setMode] = useState('search');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  
  const [mapPosition, setMapPosition] = useState(null);
  const [mapCenter, setMapCenter] = useState(null);
  const [customName, setCustomName] = useState('');

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
        const defaultPos = { lat: 51.5074, lng: -0.1278 };
        setMapPosition(defaultPos);
        setMapCenter(defaultPos);
      }
    }
  }, [isOpen, initialLocation]);

  if (!isOpen) return null;

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=5`);
      const data = await res.json();
      setSearchResults(data);
    } catch (err) {
      console.error("Search failed:", err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectResult = (result) => {
    onSave({
      location_name: result.display_name.split(',')[0],
      location_lat: parseFloat(result.lat),
      location_lng: parseFloat(result.lon)
    });
  };

  const handleSaveMap = () => {
    if (!mapPosition) return;
    onSave({
      location_name: customName || 'Custom Location',
      location_lat: mapPosition.lat,
      location_lng: mapPosition.lng
    });
  };

  const switchToMap = (lat, lng, name) => {
    setMode('map');
    if (lat && lng) {
      const pos = { lat: parseFloat(lat), lng: parseFloat(lng) };
      setMapPosition(pos);
      setMapCenter(pos);
    }
    if (name) {
      setCustomName(name.split(',')[0]);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      zIndex: 1000, animation: 'fade-in 0.3s ease'
    }}>
      <div style={{
        width: isFullscreen ? '100%' : '100%', 
        maxWidth: isFullscreen ? '100%' : '600px',
        backgroundColor: 'var(--ios-bg)',
        borderTopLeftRadius: isFullscreen ? '0' : '24px', 
        borderTopRightRadius: isFullscreen ? '0' : '24px',
        height: isFullscreen ? '100dvh' : '85dvh',
        maxHeight: '100dvh',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 -10px 40px rgba(0,0,0,0.2)',
        animation: 'slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        overflow: 'hidden',
        transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        position: 'relative'
      }}>
        {/* iOS Grabber */}
        <div style={{ width: '100%', display: 'flex', justifyContent: 'center', paddingTop: '12px', paddingBottom: '4px' }}>
          <div style={{ width: '36px', height: '5px', borderRadius: '3px', backgroundColor: 'var(--ios-border)' }}></div>
        </div>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px 12px 16px', borderBottom: '1px solid var(--ios-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {mode === 'map' && (
              <button onClick={() => setMode('search')} style={{ background: 'transparent', border: 'none', color: 'var(--ios-accent)', display: 'flex', alignItems: 'center', padding: 0, cursor: 'pointer' }}>
                <ChevronLeft size={24} /> <span style={{ fontSize: '17px' }}>Back</span>
              </button>
            )}
            <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 600 }}>{mode === 'search' ? 'Search Location' : 'Pin Location'}</h2>
          </div>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            {mode === 'map' && (
              <button onClick={() => setIsFullscreen(!isFullscreen)} style={{ background: 'transparent', border: 'none', color: 'var(--ios-accent)', padding: 0, cursor: 'pointer' }}>
                {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
              </button>
            )}
            <button onClick={onClose} style={{ background: 'var(--ios-border)', border: 'none', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--ios-text-primary)' }}>
              <span style={{ fontSize: '14px', fontWeight: 'bold' }}>✕</span>
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
          {mode === 'search' ? (
            <div style={{ padding: '16px' }}>
              <form onSubmit={handleSearch} style={{ position: 'relative', marginBottom: '24px' }}>
                <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--ios-text-secondary)' }}>
                  <Search size={18} />
                </div>
                <input
                  type="text"
                  placeholder="Search for a place or address"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%', padding: '12px 12px 12px 40px', borderRadius: '10px',
                    border: 'none', backgroundColor: 'var(--ios-bg-card)', fontSize: '16px',
                    color: 'var(--ios-text-primary)', outline: 'none'
                  }}
                  autoFocus
                />
                <button type="submit" style={{ display: 'none' }}></button>
              </form>

              {isSearching && <div style={{ textAlign: 'center', color: 'var(--ios-text-secondary)', padding: '24px' }}>Searching...</div>}

              {!isSearching && searchResults.length > 0 && (
                <div style={{ background: 'var(--ios-bg-card)', borderRadius: '12px', overflow: 'hidden' }}>
                  {searchResults.map((res, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', borderBottom: i === searchResults.length - 1 ? 'none' : '1px solid var(--ios-border)' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--ios-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '12px', color: 'var(--ios-text-secondary)' }}>
                        <MapPin size={16} />
                      </div>
                      <div onClick={() => handleSelectResult(res)} style={{ flex: 1, cursor: 'pointer' }}>
                        <div style={{ fontSize: '16px', fontWeight: 500 }}>{res.display_name.split(',')[0]}</div>
                        <div style={{ fontSize: '13px', color: 'var(--ios-text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '250px' }}>
                          {res.display_name.split(',').slice(1).join(',')}
                        </div>
                      </div>
                      <button onClick={() => switchToMap(res.lat, res.lon, res.display_name)} style={{ background: 'transparent', border: 'none', color: 'var(--ios-accent)', padding: '8px', cursor: 'pointer' }}>
                        <MapIcon size={20} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {!isSearching && searchResults.length === 0 && searchQuery && (
                <div style={{ textAlign: 'center', color: 'var(--ios-text-secondary)', padding: '48px 24px' }}>
                  No results found for "{searchQuery}"
                </div>
              )}

              <div style={{ marginTop: '24px', textAlign: 'center' }}>
                <button
                  style={{ background: 'transparent', border: 'none', color: 'var(--ios-accent)', fontSize: '16px', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%' }}
                  onClick={() => {
                    if (searchResults.length > 0) {
                      const first = searchResults[0];
                      switchToMap(first.lat, first.lon, first.display_name);
                    } else {
                      switchToMap(initialLocation?.lat, initialLocation?.lng, initialLocation?.name);
                    }
                  }}
                >
                  <MapIcon size={18} /> Or choose from map
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div style={{ padding: '16px', borderBottom: '1px solid var(--ios-border)' }}>
                <input 
                  type="text" 
                  placeholder="Name this location..." 
                  value={customName}
                  onChange={e => setCustomName(e.target.value)}
                  style={{
                    width: '100%', padding: '12px', borderRadius: '10px',
                    border: 'none', backgroundColor: 'var(--ios-bg-card)', fontSize: '16px',
                    color: 'var(--ios-text-primary)', outline: 'none', fontWeight: 600
                  }}
                />
              </div>
              <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
                <MapContainer 
                  center={mapPosition ? [mapPosition.lat, mapPosition.lng] : [51.5074, -0.1278]} 
                  zoom={13} 
                  style={{ height: '100%', width: '100%' }}
                  zoomControl={false}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <MapPicker position={mapPosition} setPosition={setMapPosition} centerView={mapCenter} />
                </MapContainer>
                
                <div style={{ position: 'absolute', bottom: '24px', left: '24px', right: '24px', zIndex: 1000 }}>
                  <button 
                    onClick={handleSaveMap} 
                    disabled={!mapPosition}
                    className="ios-btn"
                    style={{ width: '100%', boxShadow: '0 4px 12px rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                  >
                    <Check size={20} /> Use this location
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
