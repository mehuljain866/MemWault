import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { triggerScrape, getDashboardStats } from '../../services/api';
import { Radio, Sparkles, RefreshCw } from 'lucide-react';

export default function Y2KShell({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ total_stories: 0, total_feed_posts: 0 });
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    getDashboardStats().then(setStats).catch(() => {});
  }, []);

  const handleSync = () => {
    setSyncing(true);
    triggerScrape(true)
      .then(() => setTimeout(() => setSyncing(false), 2000))
      .catch(() => setSyncing(false));
  };

  const navLinks = [
    { path: '/', label: 'VAULT_CORE' },
    { path: '/posts', label: 'FEED_MATRIX' },
    { path: '/timeline', label: 'CHRONO_LOG' },
    { path: '/reels', label: 'STREAM_VIEW' },
    { path: '/map', label: 'GEO_RADAR' },
    { path: '/settings', label: 'SYS_CONFIG' },
  ];

  const totalItems = (stats.total_stories || 0) + (stats.total_feed_posts || 0);

  return (
    <div className="y2k-cyber-shell">
      {/* ── Brushed Aluminum Hardware Header ─────────────────── */}
      <header className="y2k-hardware-chassis">
        {/* Hex Rivets */}
        <div className="y2k-hex-screw top-left" />
        <div className="y2k-hex-screw top-right" />
        <div className="y2k-hex-screw bottom-left" />
        <div className="y2k-hex-screw bottom-right" />

        <div className="y2k-chassis-inner">
          {/* Liquid Chrome Brand */}
          <div className="y2k-brand-badge" onClick={() => navigate('/')}>
            <span className="y2k-chrome-text">MEMWAULT 2000</span>
            <span className="y2k-sparkle">✦</span>
          </div>

          {/* VFD Fluorescent LED Telemetry Screen */}
          <div className="y2k-vfd-display">
            <span className="y2k-vfd-dot">•</span>
            <span className="y2k-vfd-text">
              REC: {String(totalItems).padStart(4, '0')} MEMORIES [ONLINE] // PROTOCOL: v3.2 // SYS_TEMP: 38°C
            </span>
          </div>

          {/* Hardware Sync Action */}
          <button 
            className="y2k-action-btn"
            onClick={handleSync}
            disabled={syncing}
            title="Sync Satellite Uplink"
          >
            <RefreshCw size={14} className={syncing ? "spin-anim" : ""} />
            <span>{syncing ? "SYNCING..." : "SYNC_UPLINK"}</span>
          </button>
        </div>

        {/* ── Sub-Chassis Horizontal Nav Bar ────────────────── */}
        <nav className="y2k-subnav">
          {navLinks.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                className={`y2k-nav-pill ${isActive ? 'is-active' : ''}`}
                onClick={() => navigate(item.path)}
              >
                {isActive && <span className="y2k-pill-glint">✦</span>}
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </header>

      {/* ── Viewport Canvas with Ice Plastic Accents ──────────── */}
      <main className="y2k-viewport-canvas">
        {children}
      </main>
    </div>
  );
}
