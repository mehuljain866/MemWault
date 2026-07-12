import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for Leaflet default icon paths in React
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

  // Only change the view if an explicit centerView is provided (e.g. from search result)
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
  const [mode, setMode] = useState('search'); // 'search' or 'map'
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // Coordinates for the map pin
  const [mapPosition, setMapPosition] = useState(null);
  const [mapCenter, setMapCenter] = useState(null); // Used to command the map to fly to a location
  const [customName, setCustomName] = useState('');

  // When modal opens, initialize map position if we have an existing location
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
        // Default to London or somewhere generic if no initial location
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
      location_name: result.display_name.split(',')[0], // Take first part as name
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
      setMapCenter(pos); // Tell map to center here
    }
    if (name) {
      setCustomName(name.split(',')[0]);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.8)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: isFullscreen ? '0' : 'var(--sv-space-4)'
    }}>
      <div className="sv-card sv-slide-up" style={{
        width: '100%', 
        maxWidth: isFullscreen ? '100%' : 600, 
        height: isFullscreen ? '100%' : 'auto',
        maxHeight: isFullscreen ? '100%' : '90vh',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
        borderRadius: isFullscreen ? '0' : 'var(--sv-radius-md)'
      }}>
        <div style={{ padding: 'var(--sv-space-4)', borderBottom: '1px solid var(--sv-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '1.2rem' }}>Add Location</h2>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="sv-btn sv-btn--ghost" onClick={() => setIsFullscreen(!isFullscreen)} style={{ padding: '0.2rem 0.5rem' }} title="Toggle Fullscreen">
              {isFullscreen ? '🗗' : '🗖'}
            </button>
            <button className="sv-btn sv-btn--ghost" onClick={onClose} style={{ padding: '0.2rem 0.5rem' }} title="Close">✕</button>
          </div>
        </div>

        <div style={{ padding: 'var(--sv-space-4)', overflowY: 'auto', flex: 1 }}>
          {mode === 'search' ? (
            <>
              <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                <input
                  type="text"
                  className="sv-input"
                  placeholder="Search city or place..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{ flex: 1 }}
                  autoFocus
                />
                <button type="submit" className="sv-btn sv-btn--primary" disabled={isSearching}>
                  {isSearching ? '...' : 'Search'}
                </button>
              </form>

              {searchResults.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {searchResults.map((res, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div 
                        className="sv-card sv-card--clickable" 
                        onClick={() => handleSelectResult(res)}
                        style={{ flex: 1, padding: '0.8rem', fontSize: '0.9rem' }}
                      >
                        📍 {res.display_name}
                      </div>
                      <button 
                        className="sv-btn sv-btn--ghost" 
                        onClick={() => switchToMap(res.lat, res.lon, res.display_name)}
                        title="View on Map"
                      >
                        🗺️
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', color: 'var(--sv-text-muted)', margin: '2rem 0' }}>
                  {searchQuery && !isSearching ? 'No results found.' : 'Search for a place above.'}
                </div>
              )}

              <div style={{ marginTop: '2rem', textAlign: 'center' }}>
                <button 
                  className="sv-btn sv-btn--secondary" 
                  onClick={() => {
                    if (searchResults.length > 0) {
                      const first = searchResults[0];
                      switchToMap(first.lat, first.lon, first.display_name);
                    } else {
                      switchToMap(initialLocation?.lat, initialLocation?.lng, initialLocation?.name);
                    }
                  }}
                >
                  Add from Map
                </button>
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', height: isFullscreen ? '100%' : '400px' }}>
              <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem' }}>
                <input 
                  type="text" 
                  className="sv-input" 
                  placeholder="Name this location..." 
                  value={customName}
                  onChange={e => setCustomName(e.target.value)}
                  style={{ flex: 1 }}
                />
              </div>
              <div style={{ flex: 1, borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--sv-border)', minHeight: 0 }}>
                <MapContainer 
                  center={mapPosition ? [mapPosition.lat, mapPosition.lng] : [51.5074, -0.1278]} 
                  zoom={13} 
                  style={{ height: '100%', width: '100%' }}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  />
                  <MapPicker 
                    position={mapPosition} 
                    setPosition={setMapPosition} 
                    centerView={mapCenter} 
                  />
                </MapContainer>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem' }}>
                <button className="sv-btn sv-btn--ghost" onClick={() => setMode('search')}>
                  ← Back to Search
                </button>
                <button className="sv-btn sv-btn--primary" onClick={handleSaveMap} disabled={!mapPosition}>
                  Save Location
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
