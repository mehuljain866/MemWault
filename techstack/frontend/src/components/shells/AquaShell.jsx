import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSync } from '../../context/SyncContext';
import { 
  RefreshCw, Layers, LayoutGrid, Clock, MapPin, 
  SlidersHorizontal, Smartphone, FolderArchive 
} from 'lucide-react';
import ConnectPhoneModal from '../ConnectPhoneModal';

const PAGE_NAMES = {
  '/': 'Archive Overview',
  '/posts': 'Instagram Posts & Reels',
  '/timeline': 'Chronological Archive',
  '/map': 'Geo Intelligence',
  '/settings': 'System Preferences',
  '/archives': 'Storage Vault'
};

export default function AquaShell({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { isSyncing, triggerSync } = useSync();
  const [trafficHover, setTrafficHover] = useState(false);
  const [connectPhoneOpen, setConnectPhoneOpen] = useState(false);

  const title = PAGE_NAMES[location.pathname] || 'MemWault';

  const handleSync = () => {
    if (isSyncing) return;
    triggerSync(true).catch(() => {});
  };

  return (
    <div className="aqua-window-shell">
      {/* ── Mac OS X Pinstripe Header ────────────────────────── */}
      <header className="aqua-header">
        {/* Top-Left Traffic Light Controls */}
        <div 
          className="aqua-traffic-lights"
          onMouseEnter={() => setTrafficHover(true)}
          onMouseLeave={() => setTrafficHover(false)}
        >
          <button className="aqua-light red" onClick={() => navigate('/')} title="Close">
            {trafficHover && <span>✕</span>}
          </button>
          <button className="aqua-light yellow" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} title="Minimize">
            {trafficHover && <span>—</span>}
          </button>
          <button className="aqua-light green" onClick={() => {}} title="Zoom">
            {trafficHover && <span>+</span>}
          </button>
        </div>

        {/* Center Brushed Title */}
        <div className="aqua-window-title">
          <span>{title}</span>
        </div>

        {/* Top-Right Aqua Gel Action Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button 
            className="aqua-gel-btn"
            onClick={() => setConnectPhoneOpen(true)}
            title="Connect Phone (ActiveSync)"
            style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <Smartphone size={12} />
            <span>Connect Phone</span>
          </button>
          <button 
            className="aqua-gel-btn primary is-breathing"
            onClick={handleSync}
            disabled={isSyncing}
            style={{ cursor: isSyncing ? 'not-allowed' : 'pointer', opacity: isSyncing ? 0.6 : 1 }}
          >
            <RefreshCw size={12} className={isSyncing ? "spin-anim" : ""} />
            <span>{isSyncing ? "Updating..." : "Sync Archive"}</span>
          </button>
        </div>
      </header>

      {/* ── Aqua Sub-Navigation Tab Strip ─────────────────────── */}
      <div className="aqua-tab-bar">
        {[
          { path: '/', label: 'Dashboard' },
          { path: '/posts', label: 'Feed' },
          { path: '/timeline', label: 'Memories' },
          { path: '/map', label: 'Map' },
          { path: '/settings', label: 'Preferences' }
        ].map((tab) => {
          const isActive = location.pathname === tab.path;
          return (
            <button
              key={tab.path}
              className={`aqua-tab-btn ${isActive ? 'is-active' : ''}`}
              onClick={() => navigate(tab.path)}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── Viewport Canvas ──────────────────────────────────── */}
      <main className="aqua-viewport">
        {children}
      </main>

      <ConnectPhoneModal
        isOpen={connectPhoneOpen}
        onClose={() => setConnectPhoneOpen(false)}
      />
    </div>
  );
}
