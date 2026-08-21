import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { triggerScrape } from '../../services/api';
import { RefreshCw } from 'lucide-react';

const PAGE_NAMES = {
  '/': 'Dashboard',
  '/posts': 'Feed Archive',
  '/timeline': 'Memories Timeline',
  '/reels': 'Reels & Stories',
  '/highlights': 'Collections',
  '/map': 'Locations',
  '/settings': 'System Preferences',
  '/archives': 'Storage Vault'
};

export default function AquaShell({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [syncing, setSyncing] = useState(false);
  const [trafficHover, setTrafficHover] = useState(false);

  const title = PAGE_NAMES[location.pathname] || 'MemWault';

  const handleSync = () => {
    setSyncing(true);
    triggerScrape(true)
      .then(() => setTimeout(() => setSyncing(false), 2000))
      .catch(() => setSyncing(false));
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
            className="aqua-gel-btn primary is-breathing"
            onClick={handleSync}
            disabled={syncing}
          >
            <RefreshCw size={12} className={syncing ? "spin-anim" : ""} />
            <span>{syncing ? "Updating..." : "Sync Archive"}</span>
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
    </div>
  );
}
