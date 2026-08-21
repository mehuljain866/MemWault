import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { triggerScrape, getDashboardStats } from '../../services/api';
import { getSettings, saveSettings } from '../../services/settings';
import { 
  Monitor, Image as ImageIcon, Video, Folder, Settings, Map as MapIcon, 
  RotateCcw, Package, Grid, Layers, Sparkles, Volume2, HardDrive,
  Power, HelpCircle, Search, FileText, ChevronRight, Terminal, Trash2, CheckCircle2,
  Sliders, LayoutGrid, BookOpen, Eye, EyeOff
} from 'lucide-react';

import ShutdownModal from '../ShutdownModal';
import Win98DisplayProperties from '../Win98DisplayProperties';
import Win98BootScreen from '../Win98BootScreen';
import Win98WidgetLayer from '../Win98WidgetLayer';
import AboutMemWaultModal from '../AboutMemWaultModal';
import { playWin98Click, playWin98Minimize, playWin98Maximize, playWin98Startup } from '../../services/win98Audio';

const APPS_LIST = [
  { path: '/', name: 'MemWault.exe', label: 'Vault Main', icon: Monitor },
  { path: '/posts', name: 'FeedViewer.exe', label: 'Feed Posts', icon: Grid },
  { path: '/timeline', name: 'Memories.exe', label: 'Memories', icon: ImageIcon },
  { path: '/journal', name: 'Journal.exe', label: 'Journal', icon: BookOpen },
  { path: '/reels', name: 'StoryReels.exe', label: 'Reel Player', icon: Video },
  { path: '/highlights', name: 'Collections.exe', label: 'Highlights', icon: Layers },
  { path: '/map', name: 'WorldAtlas.exe', label: 'Geo Map', icon: MapIcon },
  { path: '/archives', name: 'Cabinet.exe', label: 'Archives', icon: Package },
  { path: '/settings', name: 'Setup.exe', label: 'Control Panel', icon: Settings }
];

function resolveAppInfo(pathname) {
  if (pathname === '/') {
    return { name: 'MemWault.exe', label: 'Vault Main', title: 'MemWault 98 - [Dashboard]', icon: Monitor };
  }
  if (pathname === '/journal') {
    return { name: 'Journal.exe', label: 'Journal', title: 'MemWault 98 - [Journal.exe : Personal Memory & Travel Log]', icon: BookOpen };
  }
  if (pathname.startsWith('/story/') || pathname.startsWith('/stories/')) {
    const parts = pathname.split('/');
    const id = parts[parts.length - 1] || '';
    return { name: 'StoryViewer.exe', label: 'Story Inspector', title: `MemWault 98 - [StoryViewer.exe : Memory #${id}]`, icon: ImageIcon };
  }
  if (pathname.startsWith('/post/') || pathname.startsWith('/posts/')) {
    const parts = pathname.split('/');
    const id = parts[parts.length - 1] || '';
    return { name: 'PostInspector.exe', label: 'Post Detail', title: `MemWault 98 - [PostInspector.exe : Post #${id}]`, icon: Grid };
  }
  if (pathname.startsWith('/highlight/') || pathname.startsWith('/highlights/')) {
    const parts = pathname.split('/');
    const id = parts[parts.length - 1] || '';
    return { name: 'AlbumViewer.exe', label: 'Album Viewer', title: `MemWault 98 - [AlbumViewer.exe : Collection #${id}]`, icon: Layers };
  }
  if (pathname === '/posts') {
    return { name: 'FeedViewer.exe', label: 'Feed Posts', title: 'MemWault 98 - [FeedViewer.exe]', icon: Grid };
  }
  if (pathname === '/timeline') {
    return { name: 'Memories.exe', label: 'Memories', title: 'MemWault 98 - [Memories.exe]', icon: ImageIcon };
  }
  if (pathname === '/reels') {
    return { name: 'StoryReels.exe', label: 'Reel Player', title: 'MemWault 98 - [StoryReels.exe]', icon: Video };
  }
  if (pathname === '/highlights') {
    return { name: 'Collections.exe', label: 'Highlights', title: 'MemWault 98 - [Collections.exe]', icon: Layers };
  }
  if (pathname === '/map') {
    return { name: 'WorldAtlas.exe', label: 'Geo Map', title: 'MemWault 98 - [WorldAtlas.exe]', icon: MapIcon };
  }
  if (pathname === '/archives') {
    return { name: 'Cabinet.exe', label: 'Archives', title: 'MemWault 98 - [Cabinet.exe]', icon: Package };
  }
  if (pathname === '/settings') {
    return { name: 'Setup.exe', label: 'Control Panel', title: 'MemWault 98 - [Setup.exe : Control Panel]', icon: Settings };
  }
  if (pathname.startsWith('/portal') || pathname.startsWith('/upload')) {
    return { name: 'MobileSync.exe', label: 'Mobile Sync', title: 'MemWault 98 - [MobileSync.exe]', icon: HardDrive };
  }
  return { name: 'Explorer.exe', label: 'Explorer', title: `MemWault 98 - [${pathname}]`, icon: Package };
}

export default function Win98Shell({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [settings, setSettings] = useState(getSettings());
  const [stats, setStats] = useState({ total_stories: 0, total_feed_posts: 0, storage_used_mb: 54.77 });
  const [activeMenu, setActiveMenu] = useState(null);
  const [statusMsg, setStatusMsg] = useState('READY');
  const [currentTime, setCurrentTime] = useState('');
  const [shutdownModalOpen, setShutdownModalOpen] = useState(false);
  const [displayPropsOpen, setDisplayPropsOpen] = useState(false);
  const [aboutModalOpen, setAboutModalOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Boot Screen state (run once per session if enabled)
  const [showBootScreen, setShowBootScreen] = useState(() => {
    const hasBooted = sessionStorage.getItem('win98_has_booted');
    return !hasBooted && settings.win98BootScreen !== false;
  });

  // Desktop & Window Management states
  const [isMinimized, setIsMinimized] = useState(settings.win98DashboardMode === 'widget' && location.pathname === '/');
  const [isMaximized, setIsMaximized] = useState(true);
  const [isStartMenuOpen, setIsStartMenuOpen] = useState(false);
  const [showProgramsMenu, setShowProgramsMenu] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);

  // System Tray Resource Monitor state
  const [showResourcePopup, setShowResourcePopup] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);

  const startMenuRef = useRef(null);
  const resourcePopupRef = useRef(null);

  const currentApp = resolveAppInfo(location.pathname);
  const CurrentIcon = currentApp.icon;

  useEffect(() => {
    // Play startup chime on session init
    playWin98Startup();
  }, []);

  useEffect(() => {
    const loadStats = () => {
      getDashboardStats().then(setStats).catch(() => {});
    };
    loadStats();

    const handleSettingsChanged = () => {
      const s = getSettings();
      setSettings(s);
      if (s.win98DashboardMode === 'widget' && location.pathname === '/') {
        setIsMinimized(true);
      }
    };
    window.addEventListener('memwault-settings-changed', handleSettingsChanged);

    const updateTime = () => {
      const d = new Date();
      setCurrentTime(d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => {
      clearInterval(timer);
      window.removeEventListener('memwault-settings-changed', handleSettingsChanged);
    };
  }, [location.pathname]);

  // Close start menu & context menu when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (startMenuRef.current && !startMenuRef.current.contains(e.target) && !e.target.closest('.win98-start-btn')) {
        setIsStartMenuOpen(false);
        setShowProgramsMenu(false);
        setShowSettingsMenu(false);
      }
      if (resourcePopupRef.current && !resourcePopupRef.current.contains(e.target) && !e.target.closest('.win98-tray-resource-btn')) {
        setShowResourcePopup(false);
      }
      setContextMenu(null);
    }
    if (isStartMenuOpen || showResourcePopup || contextMenu) {
      window.addEventListener('mousedown', handleClickOutside);
      return () => window.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isStartMenuOpen, showResourcePopup, contextMenu]);

  const handleSync = () => {
    playWin98Click();
    setSyncing(true);
    setStatusMsg('CONNECTING TO COM1... SYNCING');
    triggerScrape(true)
      .then(() => {
        setStatusMsg('SYNC COMPLETE: 0 ERRORS');
        setSyncing(false);
        setTimeout(() => setStatusMsg('READY'), 3000);
        getDashboardStats().then(setStats).catch(() => {});
      })
      .catch((err) => {
        setStatusMsg(`ERROR 0x0042: ${err.message}`);
        setSyncing(false);
        setTimeout(() => setStatusMsg('READY'), 4000);
      });
  };

  const handleShowAllWidgets = () => {
    playWin98Click();
    const s = getSettings();
    const newVis = {
      memoryCounter: true,
      statGrid: true,
      quickActions: true,
      systemHealth: true,
    };
    saveSettings({ ...s, win98WidgetVisibility: newVis });
    setSettings({ ...s, win98WidgetVisibility: newVis });
    setContextMenu(null);
  };

  const handleHideAllWidgets = () => {
    playWin98Click();
    const s = getSettings();
    const newVis = {
      memoryCounter: false,
      statGrid: false,
      quickActions: false,
      systemHealth: false,
    };
    saveSettings({ ...s, win98WidgetVisibility: newVis });
    setSettings({ ...s, win98WidgetVisibility: newVis });
    setContextMenu(null);
  };

  const handleResetWidgetPositions = () => {
    playWin98Click();
    const s = getSettings();
    saveSettings({ ...s, win98WidgetPositions: {} });
    setSettings({ ...s, win98WidgetPositions: {} });
    setContextMenu(null);
  };

  const menuItems = {
    File: [
      { label: 'Sync Archive Now', action: handleSync },
      { label: 'Import Stories...', action: () => { playWin98Click(); navigate('/timeline'); setIsMinimized(false); } },
      { label: 'Control Panel', action: () => { playWin98Click(); navigate('/settings'); setIsMinimized(false); } },
      { label: 'Shut Down MemWault...', action: () => { playWin98Click(); setShutdownModalOpen(true); } }
    ],
    Edit: [
      { label: 'Select All Items', action: () => {} },
      { label: 'Display Properties...', action: () => { playWin98Click(); setDisplayPropsOpen(true); } },
      { label: 'Clear Cache', action: () => localStorage.clear() }
    ],
    View: [
      { label: 'Feed Grid (Large Icons)', action: () => { playWin98Click(); navigate('/posts'); setIsMinimized(false); } },
      { label: 'Story Timeline (List)', action: () => { playWin98Click(); navigate('/timeline'); setIsMinimized(false); } },
      { label: 'World Atlas Map', action: () => { playWin98Click(); navigate('/map'); setIsMinimized(false); } },
      { label: 'Story Highlights', action: () => { playWin98Click(); navigate('/highlights'); setIsMinimized(false); } },
      { label: '----------------', action: () => {} },
      { label: 'Show Desktop Widgets', action: handleShowAllWidgets },
      { label: 'Hide All Desktop Widgets', action: handleHideAllWidgets },
      { label: 'Reset Widget Positions', action: handleResetWidgetPositions },
    ],
    Options: [
      { label: 'Display Properties...', action: () => { playWin98Click(); setDisplayPropsOpen(true); } },
      { label: 'Toggle Full Screen Window', action: () => { playWin98Maximize(); setIsMaximized(!isMaximized); } }
    ]
  };

  const handleTaskbarAppClick = (app) => {
    playWin98Click();
    if (location.pathname === app.path) {
      if (isMinimized) {
        playWin98Maximize();
        setIsMinimized(false);
      } else {
        playWin98Minimize();
        setIsMinimized(true);
      }
    } else {
      playWin98Maximize();
      navigate(app.path);
      setIsMinimized(false);
    }
  };

  const handleDesktopIconClick = (path) => {
    playWin98Click();
    playWin98Maximize();
    navigate(path);
    setIsMinimized(false);
  };

  const toggleShowDesktop = () => {
    playWin98Click();
    if (!isMinimized) {
      playWin98Minimize();
      setIsMinimized(true);
    } else {
      playWin98Maximize();
      setIsMinimized(false);
    }
  };

  // Build Desktop Wallpaper Style
  const desktopStyle = settings.win98Wallpaper ? {
    backgroundColor: '#000000',
    backgroundImage: `url(${settings.win98Wallpaper})`,
    backgroundSize: settings.win98WallpaperMode === 'tile' ? 'auto' : (settings.win98WallpaperMode === 'center' ? 'contain' : 'cover'),
    backgroundRepeat: settings.win98WallpaperMode === 'tile' ? 'repeat' : 'no-repeat',
    backgroundPosition: 'center',
  } : {
    backgroundColor: 'var(--win98-desktop, #008080)',
  };

  return (
    <div 
      className="win98-desktop-environment" 
      style={desktopStyle}
      onContextMenu={(e) => {
        if (e.target.closest('.win98-outer-window') || e.target.closest('.win98-start-menu') || e.target.closest('.win98-taskbar') || e.target.closest('.win98-modal')) return;
        e.preventDefault();
        playWin98Click();
        setContextMenu({ x: Math.min(e.clientX, window.innerWidth - 190), y: Math.min(e.clientY, window.innerHeight - 240) });
      }}
      onClick={() => { if (contextMenu) setContextMenu(null); }}
    >
      {/* ── Boot Splash Screen (Startup) ── */}
      {showBootScreen && (
        <Win98BootScreen
          onComplete={() => {
            sessionStorage.setItem('win98_has_booted', 'true');
            setShowBootScreen(false);
          }}
        />
      )}

      {/* ── Classic Win98 Desktop Right-Click Context Menu ── */}
      {contextMenu && (
        <div
          style={{
            position: 'fixed',
            left: `${contextMenu.x}px`,
            top: `${contextMenu.y}px`,
            backgroundColor: '#c0c0c0',
            border: '1px solid #000000',
            boxShadow: 'inset 1px 1px #ffffff, inset -1px -1px #808080, 3px 3px 10px rgba(0,0,0,0.5)',
            zIndex: 99999,
            padding: '2px',
            minWidth: '180px',
            fontFamily: '"MS Sans Serif", Tahoma, Arial, sans-serif',
            fontSize: '11px',
            userSelect: 'none',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            onClick={handleShowAllWidgets}
            className="win98-context-item"
            style={{ padding: '3px 12px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
          >
            <Eye size={12} color="#000080" />
            <span>Show Desktop Widgets</span>
          </div>
          <div
            onClick={handleHideAllWidgets}
            className="win98-context-item"
            style={{ padding: '3px 12px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
          >
            <EyeOff size={12} color="#800000" />
            <span>Hide Desktop Widgets</span>
          </div>
          <div
            onClick={handleResetWidgetPositions}
            className="win98-context-item"
            style={{ padding: '3px 12px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
          >
            <RotateCcw size={12} />
            <span>Reset Widget Layout</span>
          </div>
          <div style={{ height: '1px', backgroundColor: '#808080', borderBottom: '1px solid #ffffff', margin: '2px 0' }} />
          <div
            onClick={() => { playWin98Click(); setContextMenu(null); }}
            className="win98-context-item"
            style={{ padding: '3px 12px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
          >
            <RefreshCw size={12} />
            <span>Refresh Desktop</span>
          </div>
          <div style={{ height: '1px', backgroundColor: '#808080', borderBottom: '1px solid #ffffff', margin: '2px 0' }} />
          <div
            onClick={() => { playWin98Click(); setDisplayPropsOpen(true); setContextMenu(null); }}
            className="win98-context-item"
            style={{ padding: '3px 12px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            <Monitor size={12} color="#000080" />
            <span>Properties</span>
          </div>
        </div>
      )}

      {/* ── Desktop Layer: Active Desktop Widgets ── */}
      {(settings.win98DashboardMode === 'widget' || isMinimized) && (
        <Win98WidgetLayer
          stats={stats}
          syncing={syncing}
          onSync={handleSync}
          onNavigate={(p) => { navigate(p); setIsMinimized(false); }}
        />
      )}

      {/* ── Desktop Icons (Visible on Desktop Workspace) ── */}
      <div className="win98-desktop-shortcuts">
        {APPS_LIST.map((app) => {
          const Icon = app.icon;
          const isSelected = location.pathname === app.path && !isMinimized;
          return (
            <div
              key={app.path}
              className={`win98-desktop-icon ${isSelected ? 'is-selected' : ''}`}
              onClick={() => handleDesktopIconClick(app.path)}
              onDoubleClick={() => handleDesktopIconClick(app.path)}
              title={`Open ${app.name}`}
            >
              <div className="win98-desktop-icon-img">
                <Icon size={32} />
              </div>
              <span className="win98-desktop-icon-label">{app.label}</span>
            </div>
          );
        })}

        {/* Win98 Display Properties Shortcut */}
        <div
          className="win98-desktop-icon"
          onClick={() => { playWin98Click(); setDisplayPropsOpen(true); }}
          title="Display Properties & Wallpaper Customizer"
        >
          <div className="win98-desktop-icon-img">
            <Monitor size={32} color="#000080" />
          </div>
          <span className="win98-desktop-icon-label">Display</span>
        </div>

        {/* Recycle Bin */}
        <div
          className="win98-desktop-icon"
          onClick={() => { playWin98Click(); navigate('/archives'); setIsMinimized(false); }}
          title="Recycle Bin (Deleted Memories)"
        >
          <div className="win98-desktop-icon-img">
            <Trash2 size={32} />
          </div>
          <span className="win98-desktop-icon-label">Recycle Bin</span>
        </div>
      </div>

      {/* ── Active Application Window ── */}
      {!isMinimized && (
        <div className={`win98-outer-window ${isMaximized ? 'is-maximized' : 'is-windowed'}`}>
          {/* ── Title Bar ── */}
          <div className="win98-title-bar" onDoubleClick={() => { playWin98Maximize(); setIsMaximized(!isMaximized); }}>
            <div className="win98-title-text">
              <CurrentIcon size={14} style={{ marginRight: '6px' }} />
              <span>{currentApp.title}</span>
            </div>
            <div className="win98-title-controls">
              <button 
                className="win98-title-btn" 
                onClick={(e) => { e.stopPropagation(); playWin98Minimize(); setIsMinimized(true); }} 
                title="Minimize"
              >
                _
              </button>
              <button 
                className="win98-title-btn" 
                onClick={(e) => { e.stopPropagation(); playWin98Maximize(); setIsMaximized(!isMaximized); }} 
                title={isMaximized ? "Restore" : "Maximize"}
              >
                {isMaximized ? '❐' : '□'}
              </button>
              <button 
                className="win98-title-btn is-close" 
                onClick={(e) => { e.stopPropagation(); playWin98Minimize(); setIsMinimized(true); }} 
                title="Close"
              >
                ✕
              </button>
            </div>
          </div>

          {/* ── Menu Bar ── */}
          <div className="win98-menu-bar">
            {Object.keys(menuItems).map((menu) => (
              <div key={menu} style={{ position: 'relative' }}>
                <button
                  className={`win98-menu-item-btn ${activeMenu === menu ? 'is-active' : ''}`}
                  onClick={() => { playWin98Click(); setActiveMenu(activeMenu === menu ? null : menu); }}
                >
                  <u>{menu[0]}</u>{menu.slice(1)}
                </button>
                {activeMenu === menu && (
                  <div className="win98-menu-dropdown" onClick={() => setActiveMenu(null)}>
                    {menuItems[menu].map((item, idx) => (
                      <div key={idx} className="win98-dropdown-row" onClick={item.action}>
                        {item.label}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Direct About Button on the Menu Ribbon */}
            <button
              className="win98-menu-item-btn"
              onClick={() => { playWin98Click(); setAboutModalOpen(true); }}
              title="About MemWault Overview"
              style={{ fontWeight: 600 }}
            >
              <u>A</u>bout
            </button>
          </div>

          {/* ── Quick Action Toolbar (if enabled in settings) ── */}
          {settings.win98ShowToolbar && (
            <div className="win98-toolbar">
              <button className="win98-toolbar-btn" onClick={() => { playWin98Click(); navigate('/'); }} title="Dashboard">
                <Monitor size={16} /><span>Dashboard</span>
              </button>
              <button className="win98-toolbar-btn" onClick={() => { playWin98Click(); navigate('/posts'); }} title="Posts">
                <Grid size={16} /><span>Feed</span>
              </button>
              <button className="win98-toolbar-btn" onClick={() => { playWin98Click(); navigate('/timeline'); }} title="Memories">
                <ImageIcon size={16} /><span>Memories</span>
              </button>
              <button className="win98-toolbar-btn" onClick={() => { playWin98Click(); navigate('/map'); }} title="Map">
                <MapIcon size={16} /><span>Map</span>
              </button>
              <button className="win98-toolbar-btn" onClick={() => { playWin98Click(); setDisplayPropsOpen(true); }} title="Display Properties">
                <Sliders size={16} /><span>Display</span>
              </button>
              <button className="win98-toolbar-btn" onClick={() => { playWin98Click(); navigate('/settings'); }} title="Settings">
                <Settings size={16} /><span>Setup</span>
              </button>
              <div style={{ width: '1px', height: '18px', background: '#808080', borderRight: '1px solid #ffffff', margin: '0 4px' }} />
              <button className="win98-toolbar-btn" onClick={handleSync} title="Sync Archive">
                <RotateCcw size={16} className={syncing ? 'spin-anim' : ''} /><span>Sync</span>
              </button>
            </div>
          )}

          {/* ── Sunken Viewport Canvas ── */}
          <div className="win98-sunken-viewport">
            {children}
          </div>

          {/* ── Window Status Bar ── */}
          <div className="win98-status-bar">
            <div className="win98-status-panel" style={{ flex: 2 }}>
              <span>{statusMsg}</span>
            </div>
            <div className="win98-status-panel" style={{ flex: 1 }}>
              <span>{(stats.total_stories || 0) + (stats.total_feed_posts || 0)} OBJECTS</span>
            </div>
            <div className="win98-status-panel" style={{ width: '110px', textAlign: 'center' }}>
              <span>COM1 : 8000</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Windows 98 Authentic Start Menu ── */}
      {isStartMenuOpen && (
        <div className="win98-start-menu" ref={startMenuRef}>
          {/* Vertical Blue Gradient Banner */}
          <div className="win98-start-menu-banner">
            <span className="win98-start-menu-banner-text">MemWault<b>98</b></span>
          </div>

          {/* Menu Items List */}
          <div className="win98-start-menu-items">
            {/* Programs Submenu */}
            <div 
              className="win98-start-menu-item has-submenu"
              onMouseEnter={() => { setShowProgramsMenu(true); setShowSettingsMenu(false); }}
            >
              <div className="win98-start-menu-item-left">
                <Folder size={18} color="#000080" />
                <span><u>P</u>rograms</span>
              </div>
              <ChevronRight size={14} />

              {showProgramsMenu && (
                <div className="win98-start-submenu">
                  {APPS_LIST.map(app => {
                    const AppIcon = app.icon;
                    return (
                      <div 
                        key={app.path} 
                        className="win98-start-menu-item"
                        onClick={() => {
                          playWin98Click();
                          navigate(app.path);
                          setIsMinimized(false);
                          setIsStartMenuOpen(false);
                        }}
                      >
                        <AppIcon size={16} />
                        <span>{app.name}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Documents / Archives */}
            <div 
              className="win98-start-menu-item"
              onClick={() => {
                playWin98Click();
                navigate('/archives');
                setIsMinimized(false);
                setIsStartMenuOpen(false);
              }}
            >
              <div className="win98-start-menu-item-left">
                <Package size={18} color="#000080" />
                <span><u>D</u>ocuments & Archives</span>
              </div>
            </div>

            {/* Settings */}
            <div 
              className="win98-start-menu-item has-submenu"
              onMouseEnter={() => { setShowSettingsMenu(true); setShowProgramsMenu(false); }}
            >
              <div className="win98-start-menu-item-left">
                <Settings size={18} color="#000080" />
                <span><u>S</u>ettings</span>
              </div>
              <ChevronRight size={14} />

              {showSettingsMenu && (
                <div className="win98-start-submenu">
                  <div 
                    className="win98-start-menu-item"
                    onClick={() => {
                      playWin98Click();
                      setDisplayPropsOpen(true);
                      setIsStartMenuOpen(false);
                    }}
                  >
                    <Sliders size={16} />
                    <span>Display Properties...</span>
                  </div>
                  <div 
                    className="win98-start-menu-item"
                    onClick={() => {
                      playWin98Click();
                      navigate('/settings');
                      setIsMinimized(false);
                      setIsStartMenuOpen(false);
                    }}
                  >
                    <Settings size={16} />
                    <span>Control Panel</span>
                  </div>
                </div>
              )}
            </div>

            {/* Find Stories */}
            <div 
              className="win98-start-menu-item"
              onClick={() => {
                playWin98Click();
                navigate('/timeline');
                setIsMinimized(false);
                setIsStartMenuOpen(false);
              }}
            >
              <div className="win98-start-menu-item-left">
                <Search size={18} color="#000080" />
                <span><u>F</u>ind Stories...</span>
              </div>
            </div>

            {/* Help */}
            <div 
              className="win98-start-menu-item"
              onClick={() => {
                playWin98Click();
                setIsStartMenuOpen(false);
                setAboutModalOpen(true);
              }}
            >
              <div className="win98-start-menu-item-left">
                <HelpCircle size={18} color="#000080" />
                <span><u>A</u>bout MemWault...</span>
              </div>
            </div>

            {/* Divider */}
            <div className="win98-menu-divider" />

            {/* Shut Down */}
            <div 
              className="win98-start-menu-item is-shutdown"
              onClick={() => {
                playWin98Click();
                setIsStartMenuOpen(false);
                setShutdownModalOpen(true);
              }}
            >
              <div className="win98-start-menu-item-left">
                <Power size={18} color="#cc0000" />
                <span><u>S</u>hut Down...</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── System Resources & Connectivity Mini-Window Popup ── */}
      {showResourcePopup && (
        <div 
          className="win98-resource-popup" 
          ref={resourcePopupRef}
        >
          {/* Mini Title Bar */}
          <div className="win98-title-bar" style={{ height: '18px', padding: '1px 3px' }}>
            <div className="win98-title-text" style={{ fontSize: '11px' }}>
              <HardDrive size={12} style={{ marginRight: '5px' }} />
              <span>System Resource Monitor</span>
            </div>
            <button 
              className="win98-title-btn is-close" 
              style={{ width: '14px', height: '12px', fontSize: '8px' }}
              onClick={() => setShowResourcePopup(false)}
            >
              ✕
            </button>
          </div>

          {/* Mini Sunken Panel */}
          <div className="win98-resource-body">
            <div className="win98-resource-row">
              <span className="res-label">Storage Allocated:</span>
              <span className="res-val bold">{(stats.storage_used_mb || 54.77).toFixed(2)} MB</span>
            </div>
            <div className="win98-resource-row">
              <span className="res-label">Instagram Link:</span>
              <span className="res-val status-ok">● Connected (Active)</span>
            </div>
            <div className="win98-resource-row">
              <span className="res-label">Database Port:</span>
              <span className="res-val">SQLite (COM1:8000)</span>
            </div>
            <div className="win98-resource-row">
              <span className="res-label">Total Objects:</span>
              <span className="res-val bold">{(stats.total_stories || 0) + (stats.total_feed_posts || 0)} Items</span>
            </div>
            <div className="win98-resource-row">
              <span className="res-label">Photos / Videos:</span>
              <span className="res-val">{stats.total_photos || 4} photos / {stats.total_videos || 19} videos</span>
            </div>
            <div className="win98-resource-row">
              <span className="res-label">Background Scraper:</span>
              <span className="res-val">{stats.last_scrape_at ? new Date(stats.last_scrape_at).toLocaleTimeString() : 'Automated'}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button 
                className="win98-start-btn" 
                style={{ padding: '2px 12px', height: '20px', fontSize: '10px' }}
                onClick={() => setShowResourcePopup(false)}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Windows 98 Authentic Bottom Taskbar ── */}
      <div className="win98-taskbar">
        {/* Start Button */}
        <button 
          className={`win98-start-btn ${isStartMenuOpen ? 'is-active' : ''}`}
          onClick={() => { playWin98Click(); setIsStartMenuOpen(!isStartMenuOpen); }}
        >
          {/* MemWault Era-Appropriate Win98 Start Logo */}
          <img 
            src="/win98-memwault-logo.png" 
            alt="MemWault" 
            style={{ width: '16px', height: '16px', objectFit: 'contain', imageRendering: 'pixelated' }} 
          />
          <span className="win98-start-text">Start</span>
        </button>

        {/* Taskbar App Tasks */}
        <div className="win98-taskbar-tasks">
          {APPS_LIST.map((app) => {
            const AppIcon = app.icon;
            const isActive = location.pathname === app.path;
            const isWindowOpen = isActive && !isMinimized;
            return (
              <button
                key={app.path}
                className={`win98-task-btn ${isWindowOpen ? 'is-active' : ''}`}
                onClick={() => handleTaskbarAppClick(app)}
                title={app.name}
              >
                <AppIcon size={14} />
                <span>{app.label}</span>
              </button>
            );
          })}
        </div>

        {/* System Tray & Show Desktop Strip */}
        <div className="win98-system-tray">
          <button
            onClick={toggleShowDesktop}
            className="win98-title-btn"
            title="Show Desktop (Minimize/Restore All Windows)"
            style={{ width: '18px', height: '16px', fontSize: '10px', marginRight: '4px', cursor: 'pointer', padding: 0 }}
          >
            🗔
          </button>
          <div 
            className="win98-tray-resource-btn"
            onClick={() => setShowResourcePopup(!showResourcePopup)}
            onMouseEnter={() => setShowResourcePopup(true)}
            title="Click to view System Resources & Connectivity"
            style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', padding: '1px 2px' }}
          >
            <HardDrive size={13} style={{ color: '#000', opacity: 0.9 }} />
          </div>
          <Volume2 size={14} style={{ color: '#000', opacity: 0.8 }} title="Sound Blaster 16 Ready" />
          <div className="win98-tray-divider" />
          <span className="win98-tray-clock">{currentTime || '12:00 PM'}</span>
        </div>
      </div>

      {/* Display Properties Dialog Modal */}
      {displayPropsOpen && (
        <Win98DisplayProperties
          isOpen={displayPropsOpen}
          onClose={() => setDisplayPropsOpen(false)}
          onApply={(updated) => setSettings(updated)}
        />
      )}

      {/* About MemWault Modal (Apple About This Mac inspired) */}
      <AboutMemWaultModal
        isOpen={aboutModalOpen}
        onClose={() => setAboutModalOpen(false)}
        stats={stats}
      />

      {/* Shutdown Modal */}
      <ShutdownModal 
        isOpen={shutdownModalOpen}
        onClose={() => setShutdownModalOpen(false)}
      />
    </div>
  );
}
