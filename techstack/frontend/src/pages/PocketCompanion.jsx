import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Image as ImageIcon, Film, BookOpen, Search, 
  Wifi, Battery, Plus, ArrowLeft, ArrowRight, RefreshCw,
  Settings as SettingsIcon, X, Camera, Music, 
  MapPin, Check, ExternalLink, Calendar, Edit3, 
  Save, Trash2, HardDrive, Smartphone, Sparkles, Star,
  Volume2, VolumeX, ShieldCheck, Download, Play, 
  Pause, ChevronLeft, ChevronRight, Grid, List, 
  Heart, MessageCircle, Share2, Layers, Bookmark,
  User as UserIcon, CheckCircle2, AlertCircle, Smile,
  Maximize2, Disc, Sliders, Palette, Brush, Eraser,
  RotateCcw, Compass, CheckSquare, Square, Tag,
  Move, Paperclip, Info
} from 'lucide-react';
import { 
  getOfflineMemories, getOfflinePosts, getOfflineHighlights, 
  getStorageStats, syncPocketWithLaptop, getPocketSyncMeta, 
  getOnThisDayMemories, getCachedMediaBlob 
} from '../services/pocketSync';
import { 
  addPendingMobileUpload, getPendingMobileUploads, 
  saveMemoriesOffline, savePostsOffline, openMobileDB,
  saveSyncMeta, getSyncMeta
} from '../services/memwaultMobileDB';
import { 
  updateStory, updatePost, setToken, isAuthenticated, 
  getHighlights, getHighlightStories, getInstagramSession,
  disconnectInstagram, renewInstagramSession, rescanMetadata,
  getStoryViewers, updatePostMedia
} from '../services/api';
import MusicPlayer from '../components/MusicPlayer';
import HighlightPlayerModal from '../components/HighlightPlayerModal';

/**
 * Pure Web Audio API synthesized Metro Tap / Touch Feedback
 * Produces a crisp, authentic Lumia / Windows Phone tap tone without external assets
 */
function playMetroTap() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1100, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(320, ctx.currentTime + 0.035);
    gain.gain.setValueAtTime(0.06, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.035);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.035);
  } catch (e) {}
}

// ── 20 Metro Accent Colors ──────────────────────────────────────────────────
const METRO_ACCENTS = [
  { name: 'Cobalt', hex: '#0050EF' },
  { name: 'Cyan', hex: '#1BA1E2' },
  { name: 'Nokia Blue', hex: '#008299' },
  { name: 'Emerald', hex: '#008A00' },
  { name: 'Lime', hex: '#A4C400' },
  { name: 'Green', hex: '#60A917' },
  { name: 'Mango', hex: '#F09609' },
  { name: 'Orange', hex: '#FA6800' },
  { name: 'Amber', hex: '#F0A30A' },
  { name: 'Yellow', hex: '#E3C800' },
  { name: 'Crimson', hex: '#A20025' },
  { name: 'Red', hex: '#E51400' },
  { name: 'Magenta', hex: '#D80073' },
  { name: 'Pink', hex: '#E671B8' },
  { name: 'Violet', hex: '#AA00FF' },
  { name: 'Purple', hex: '#76608A' },
  { name: 'Indigo', hex: '#6B007B' },
  { name: 'Steel', hex: '#647687' },
  { name: 'Taupe', hex: '#87794E' },
  { name: 'Brown', hex: '#825A2C' },
];

const DRAWING_COLORS = [
  '#0050EF', '#1BA1E2', '#008A00', '#A4C400', '#F09609', 
  '#A20025', '#D80073', '#AA00FF', '#FFFFFF', '#000000'
];

const CUSTOM_STICKER_SETS = [
  { id: 'stamp_vault', label: 'VAULT SEAL', bg: '#A20025', text: 'MEMWAULT ARCHIVE', iconName: 'ShieldCheck' },
  { id: 'stamp_loc', label: 'PASSPORT', bg: '#0050EF', text: 'VERIFIED LOCATION', iconName: 'MapPin' },
  { id: 'stamp_sound', label: 'VINYL', bg: '#1DB954', text: 'SOUNDTRACK 33⅓', iconName: 'Music' },
  { id: 'stamp_date', label: 'TIMECODE', bg: '#FA6800', text: 'ON THIS DAY', iconName: 'Clock' },
  { id: 'stamp_polaroid', label: 'POLAROID', bg: '#E8E8E8', text: 'ORIGINAL SHOT', iconName: 'Camera', darkText: true },
  { id: 'stamp_fav', label: 'FAVORITE', bg: '#D80073', text: 'CORE MEMORY', iconName: 'Heart' },
];

function RenderStickerIcon({ name, size = 16, color = '#FFF' }) {
  switch (name) {
    case 'ShieldCheck': return <ShieldCheck size={size} color={color} />;
    case 'MapPin': return <MapPin size={size} color={color} />;
    case 'Music': return <Music size={size} color={color} />;
    case 'Clock': return <Calendar size={size} color={color} />;
    case 'Camera': return <Camera size={size} color={color} />;
    case 'Heart': return <Heart size={size} color={color} fill={color} />;
    default: return <Sparkles size={size} color={color} />;
  }
}

/**
 * Hook to resolve image/video URLs to offline Blob URLs from IndexedDB/CacheStorage
 */
function getMediaUrl(item) {
  if (!item) return '';
  if (typeof item === 'string') return item;
  if (item.cover_media_url) return item.cover_media_url;
  if (item.thumbnail_url) return item.thumbnail_url;
  if (item.display_url) return item.display_url;
  if (item.media_url) return item.media_url;
  if (item.raw_media_url) return item.raw_media_url;
  if (item.instagram_media_url) return item.instagram_media_url;
  if (item.image_versions2?.candidates?.[0]?.url) return item.image_versions2.candidates[0].url;
  if (item.preview_stories && item.preview_stories.length > 0) {
    const p = item.preview_stories[0];
    return typeof p === 'string' ? p : (p?.media_url || p?.display_url || p?.raw_media_url || '');
  }
  if (item.stories && item.stories.length > 0) {
    const s = item.stories[0];
    return typeof s === 'string' ? s : (s?.media_url || s?.display_url || s?.raw_media_url || '');
  }
  if (item.media_items && item.media_items.length > 0) {
    const first = item.media_items[0];
    return first.display_url || first.media_url || first.instagram_media_url || first.raw_media_url || '';
  }
  if (item.s3_key_compressed) return `/media/${item.s3_key_compressed}`;
  if (item.s3_key) return `/media/${item.s3_key}`;
  return '';
}

/**
 * Hook to resolve image/video URLs to offline Blob URLs from IndexedDB/CacheStorage
 */
function useOfflineMediaUrl(url) {
  const [src, setSrc] = useState(() => {
    if (!url) return '';
    return typeof url === 'object' ? getMediaUrl(url) : url;
  });

  useEffect(() => {
    if (!url) {
      setSrc('');
      return;
    }
    const rawUrl = typeof url === 'object' ? getMediaUrl(url) : url;
    if (!rawUrl) {
      setSrc('');
      return;
    }

    let isMounted = true;
    let objectUrl = null;

    getCachedMediaBlob(rawUrl).then(blob => {
      if (blob && isMounted) {
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      } else if (isMounted) {
        setSrc(rawUrl);
      }
    }).catch(() => {
      if (isMounted) setSrc(rawUrl);
    });

    return () => {
      isMounted = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url]);

  return src;
}

/**
 * Desktop-Grade Offline-aware Media Element
 * Automatically detects whether media is an image or video (.mp4/.mov/media_type 2)
 * and renders video previews with smooth autoplay & muted looping exactly like desktop!
 * Includes automatic proxying fallback for CDN expiration.
 */
function OfflineMedia({ 
  src, 
  type, 
  alt = '', 
  style = {}, 
  className = '', 
  autoPlay = true, 
  loop = true, 
  muted = true, 
  playsInline = true, 
  controls = false,
  ...props 
}) {
  const resolvedUrl = useOfflineMediaUrl(src);
  const [hasError, setHasError] = useState(false);
  const [triedProxy, setTriedProxy] = useState(false);

  if (!resolvedUrl) {
    return (
      <div style={{ ...style, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#141414' }}>
        <ImageIcon size={18} style={{ opacity: 0.25, color: '#FFF' }} />
      </div>
    );
  }

  const isVideo = !hasError && (type === 'video' || (typeof resolvedUrl === 'string' && (
    resolvedUrl.includes('.mp4') || 
    resolvedUrl.includes('.mov') || 
    resolvedUrl.includes('video') ||
    resolvedUrl.startsWith('data:video')
  )));

  if (isVideo) {
    return (
      <video
        src={resolvedUrl}
        style={{ ...style, display: 'block' }}
        className={className}
        autoPlay={autoPlay}
        loop={loop}
        muted={muted}
        playsInline={playsInline}
        controls={controls}
        preload="metadata"
        onError={() => setHasError(true)}
        {...props}
      />
    );
  }

  const displaySrc = (hasError && !triedProxy && typeof resolvedUrl === 'string' && resolvedUrl.startsWith('http'))
    ? `/api/v1/proxy/image?url=${encodeURIComponent(resolvedUrl)}`
    : resolvedUrl;

  return (
    <img
      src={displaySrc}
      alt={alt}
      style={{ ...style, display: 'block' }}
      className={className}
      loading="lazy"
      onError={(e) => {
        if (!triedProxy && typeof resolvedUrl === 'string' && resolvedUrl.startsWith('http')) {
          setTriedProxy(true);
          e.target.src = `/api/v1/proxy/image?url=${encodeURIComponent(resolvedUrl)}`;
        } else {
          e.target.style.opacity = '0.35';
        }
      }}
      {...props}
    />
  );
}

export default function PocketCompanion() {
  // ── Theme & Customization States ──────────────────────────────────────────
  const [accent, setAccent] = useState(() => localStorage.getItem('metro_accent') || '#0050EF');
  const [themeMode, setThemeMode] = useState(() => localStorage.getItem('metro_theme') || 'dark');
  const [enableLiveFlip, setEnableLiveFlip] = useState(() => localStorage.getItem('metro_live_flip') !== 'false');
  const [soundEnabled, setSoundEnabled] = useState(() => localStorage.getItem('metro_sound') !== 'false');
  const [autoSyncOnOpen, setAutoSyncOnOpen] = useState(() => localStorage.getItem('metro_auto_sync') !== 'false');
  const [serverHost, setServerHost] = useState(() => localStorage.getItem('metro_server_host') || window.location.hostname || '192.168.29.50');

  // ── Navigation & Content States ───────────────────────────────────────────
  const PIVOT_TABS = ['start', 'memories', 'highlights', 'feed', 'journal', 'settings'];
  const [activePivot, setActivePivot] = useState('start'); // 'start' | 'memories' | 'highlights' | 'feed' | 'journal' | 'settings'
  const [journalSubTab, setJournalSubTab] = useState('notes'); // 'notes' | 'places'
  const [stories, setStories] = useState([]);
  const [posts, setPosts] = useState([]);
  const [highlights, setHighlights] = useState([]);
  const [pendingUploads, setPendingUploads] = useState([]);
  const [stats, setStats] = useState({ memoryCount: 0, postCount: 0, pendingCount: 0, highlightCount: 0, storageMb: '0.00' });
  const [igSession, setIgSession] = useState(null);

  // ── All Apps Lumia Drawer State ───────────────────────────────────────────
  const [showAllAppsModal, setShowAllAppsModal] = useState(false);
  const [allAppsSearch, setAllAppsSearch] = useState('');

  // ── Places to Visit State (Full Desktop Parity) ───────────────────────────
  const [places, setPlaces] = useState(() => {
    const saved = localStorage.getItem('memwault_places_to_visit');
    return saved ? JSON.parse(saved) : [
      { id: '1', title: 'Northern Lights in Tromsø', location: 'Norway', category: 'Nature', completed: false, notes: 'Winter trip' },
      { id: '2', title: 'Fushimi Inari at Dawn', location: 'Kyoto, Japan', category: 'Culture', completed: false, notes: 'Walk the thousand torii gates' },
      { id: '3', title: 'Roadtrip across Amalfi Coast', location: 'Italy', category: 'Roadtrip', completed: true, notes: 'Stay in Positano' }
    ];
  });
  const [newPlaceTitle, setNewPlaceTitle] = useState('');
  const [newPlaceLocation, setNewPlaceLocation] = useState('');
  const [newPlaceCategory, setNewPlaceCategory] = useState('Travel');

  // ── Selection & Filter States ─────────────────────────────────────────────
  const [selectedStory, setSelectedStory] = useState(null);
  const [storyDetailTab, setStoryDetailTab] = useState('info'); // 'info' | 'journal' | 'music' | 'viewers' | 'data'
  const [storyViewersList, setStoryViewersList] = useState([]);
  const [loadingViewers, setLoadingViewers] = useState(false);
  const [viewerSearch, setViewerSearch] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all' | 'photos' | 'videos' | 'journaled' | 'music'
  const [feedViewMode, setFeedViewMode] = useState('grid'); // 'grid' | 'cards'
  const [selectedPostIndex, setSelectedPostIndex] = useState(null);
  const [postSlideIndex, setPostSlideIndex] = useState(0);
  const [postDetailTab, setPostDetailTab] = useState('info'); // 'info' | 'journal' | 'music' | 'data'
  const [postVersionMap, setPostVersionMap] = useState({}); // { [mediaId]: 'raw' | 'instagram' }

  // ── Custom Desktop Parity Stickers for Scrapbook ──────────────────────────
  const CUSTOM_STICKER_SETS = [
    { id: 'stamp_vault', label: 'VAULT SEAL', bg: '#A20025', text: 'MEMWAULT ARCHIVE', icon: '🏛️' },
    { id: 'stamp_loc', label: 'PASSPORT', bg: '#0050EF', text: 'VERIFIED LOCATION', icon: '✈️' },
    { id: 'stamp_sound', label: 'VINYL', bg: '#1DB954', text: 'SOUNDTRACK 33⅓', icon: '🎵' },
    { id: 'stamp_date', label: 'TIMECODE', bg: '#FA6800', text: 'ON THIS DAY', icon: '⏳' },
    { id: 'stamp_polaroid', label: 'POLAROID', bg: '#E8E8E8', text: 'ORIGINAL SHOT', icon: '📸', darkText: true },
    { id: 'stamp_fav', label: 'FAVORITE', bg: '#D80073', text: 'CORE MEMORY', icon: '💖' },
  ];

  // ── On This Day Flashback States ──────────────────────────────────────────
  const [flashbackIndex, setFlashbackIndex] = useState(0);

  // ── Highlights Story Player States ────────────────────────────────────────
  const [activeHighlight, setActiveHighlight] = useState(null);
  const [highlightStories, setHighlightStories] = useState([]);
  const [highlightStoryIndex, setHighlightStoryIndex] = useState(0);
  const [isHighlightPaused, setIsHighlightPaused] = useState(false);
  const [highlightProgress, setHighlightProgress] = useState(0);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isHoldingToPause, setIsHoldingToPause] = useState(false);
  const highlightVideoRef = useRef(null);
  const touchStartTime = useRef(0);
  const touchStartX = useRef(0);

  // ── 30-Second iTunes Preview & Music Modal States ─────────────────────────
  const [musicModalTrack, setMusicModalTrack] = useState(null);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState(null);
  const [audioArtworkUrl, setAudioArtworkUrl] = useState(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioDuration, setAudioDuration] = useState(30);
  const previewAudioRef = useRef(null);

  // ── Live Camera Viewfinder Modal States ───────────────────────────────────
  const [cameraModalOpen, setCameraModalOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // ── Journal & Scrapbook Interactive Canvas States ─────────────────────────
  const [newJournalModalOpen, setNewJournalModalOpen] = useState(false);
  const [journalAttachType, setJournalAttachType] = useState('story'); // 'story' | 'post'
  const [selectedItemForJournal, setSelectedItemForJournal] = useState(null);
  const [journalNoteText, setJournalNoteText] = useState('');
  const [placedStickers, setPlacedStickers] = useState([]);
  const [attachedDoodleUrl, setAttachedDoodleUrl] = useState(null);
  const [editingItemId, setEditingItemId] = useState(null);
  const [journalDraft, setJournalDraft] = useState('');
  const [isSavingJournal, setIsSavingJournal] = useState(false);

  // ── MS Paint / Finger Doodling Studio States ──────────────────────────────
  const [paintModalOpen, setPaintModalOpen] = useState(false);
  const [paintColor, setPaintColor] = useState('#FF0000');
  const [paintBrushSize, setPaintBrushSize] = useState(4);
  const [paintTool, setPaintTool] = useState('pen'); // 'pen' | 'highlighter' | 'eraser'
  const paintCanvasRef = useRef(null);
  const isPainting = useRef(false);
  const lastPaintPos = useRef({ x: 0, y: 0 });

  // ── PWA Installation States ───────────────────────────────────────────────
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showIosInstructions, setShowIosInstructions] = useState(false);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);

  // ── System Status Engine ──────────────────────────────────────────────────
  const [toastMessage, setToastMessage] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  const [batteryLevel, setBatteryLevel] = useState(null);

  // ── Authentic Lumia Live Tile Sizing, Order & Customization ───────────────
  const DEFAULT_TILE_ORDER = ['onThisDay', 'photos', 'highlights', 'feed', 'journal', 'places', 'camera', 'settings'];
  const [tileOrder, setTileOrder] = useState(() => {
    try {
      const saved = localStorage.getItem('metro_tile_order');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const missing = DEFAULT_TILE_ORDER.filter(k => !parsed.includes(k));
          return [...parsed, ...missing];
        }
      }
      return DEFAULT_TILE_ORDER;
    } catch (e) {
      return DEFAULT_TILE_ORDER;
    }
  });

  const [tileSizes, setTileSizes] = useState(() => {
    try {
      const saved = localStorage.getItem('metro_tile_sizes');
      return saved ? JSON.parse(saved) : {
        onThisDay: 'wide',
        photos: 'wide',
        highlights: 'medium',
        feed: 'medium',
        journal: 'medium',
        places: 'medium',
        camera: 'small',
        settings: 'small'
      };
    } catch (e) {
      return { onThisDay: 'wide', photos: 'wide', highlights: 'medium', feed: 'medium', journal: 'medium', places: 'medium', camera: 'small', settings: 'small' };
    }
  });
  const [customizeTilesMode, setCustomizeTilesMode] = useState(false);

  const cycleTileSize = (tileKey, e) => {
    if (e) e.stopPropagation();
    triggerSound();
    const order = ['small', 'medium', 'wide'];
    const current = tileSizes[tileKey] || 'medium';
    const next = order[(order.indexOf(current) + 1) % order.length];
    const updated = { ...tileSizes, [tileKey]: next };
    setTileSizes(updated);
    try {
      localStorage.setItem('metro_tile_sizes', JSON.stringify(updated));
    } catch (err) {}
    showToast(`Tile resized to ${next.toUpperCase()}`);
  };

  const moveTile = (tileKey, direction, e) => {
    if (e) e.stopPropagation();
    triggerSound();
    const idx = tileOrder.indexOf(tileKey);
    if (idx === -1) return;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= tileOrder.length) return;

    const newOrder = [...tileOrder];
    const [removed] = newOrder.splice(idx, 1);
    newOrder.splice(targetIdx, 0, removed);
    setTileOrder(newOrder);
    try {
      localStorage.setItem('metro_tile_order', JSON.stringify(newOrder));
    } catch (err) {}
    showToast(`Moved tile ${direction === 'up' ? 'earlier' : 'later'}`);
  };

  const resetTileLayout = () => {
    triggerSound();
    setTileOrder(DEFAULT_TILE_ORDER);
    const defaultSizes = {
      onThisDay: 'wide',
      photos: 'wide',
      highlights: 'medium',
      feed: 'medium',
      journal: 'medium',
      places: 'medium',
      camera: 'small',
      settings: 'small'
    };
    setTileSizes(defaultSizes);
    localStorage.removeItem('metro_tile_order');
    localStorage.setItem('metro_tile_sizes', JSON.stringify(defaultSizes));
    showToast('Tile layout reset to default Lumia grid');
  };

  // ── Manual & Automated 3D Live Tile Flip States ───────────────────────────
  const [tileFlips, setTileFlips] = useState({
    onThisDay: false,
    photos: false,
    highlights: false,
    feed: false,
    journal: false,
    places: false,
    camera: false,
    settings: false,
  });

  const toggleTileFlip = (key, e) => {
    if (e) e.stopPropagation();
    triggerSound();
    setTileFlips(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Touch tracking for swiping tiles to flip vs clicking to navigate
  const touchStartCoords = useRef({});
  const swipedTileRecently = useRef(false);

  const handleTileTouchStart = (key, e) => {
    if (e.touches && e.touches[0]) {
      touchStartCoords.current[key] = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        time: Date.now()
      };
    }
  };

  const handleTileTouchEnd = (key, e) => {
    const start = touchStartCoords.current[key];
    if (!start) return;
    const endX = e.changedTouches ? e.changedTouches[0].clientX : 0;
    const endY = e.changedTouches ? e.changedTouches[0].clientY : 0;
    const deltaX = endX - start.x;
    const deltaY = endY - start.y;

    if (Math.abs(deltaX) > 24 || Math.abs(deltaY) > 24) {
      if (e) e.stopPropagation();
      swipedTileRecently.current = true;
      setTimeout(() => { swipedTileRecently.current = false; }, 300);
      toggleTileFlip(key, e);
    }
    delete touchStartCoords.current[key];
  };

  const handleTileClick = (key, onAction, e) => {
    if (customizeTilesMode) return;
    if (swipedTileRecently.current) return;
    triggerSound();
    if (onAction) onAction(e);
  };

  // ── Viewport Horizontal Swipe Gesture for Metro Pivot Tabs ───────────────
  const touchStartPivotCoords = useRef({ x: 0, y: 0, time: 0 });

  const handleViewportTouchStart = (e) => {
    if (e.touches && e.touches[0]) {
      touchStartPivotCoords.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        time: Date.now()
      };
    }
  };

  const handleViewportTouchEnd = (e) => {
    const start = touchStartPivotCoords.current;
    if (!start || !start.time) return;
    const endX = e.changedTouches ? e.changedTouches[0].clientX : 0;
    const endY = e.changedTouches ? e.changedTouches[0].clientY : 0;
    const deltaX = endX - start.x;
    const deltaY = endY - start.y;
    const elapsed = Date.now() - start.time;

    // Fast horizontal swipe on main viewport (dominant horizontal delta > 50px)
    if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > 1.3 * Math.abs(deltaY) && elapsed < 600) {
      if (!selectedStory && !activeHighlight && selectedPostIndex === null && !paintModalOpen && !newJournalModalOpen && !cameraModalOpen && !musicModalTrack && !showAllAppsModal) {
        const currentIdx = PIVOT_TABS.indexOf(activePivot);
        if (currentIdx !== -1) {
          if (deltaX < -50 && currentIdx < PIVOT_TABS.length - 1) {
            navigateToPivot(PIVOT_TABS[currentIdx + 1]);
          } else if (deltaX > 50 && currentIdx > 0) {
            navigateToPivot(PIVOT_TABS[currentIdx - 1]);
          }
        }
      }
    }
    touchStartPivotCoords.current = { x: 0, y: 0, time: 0 };
  };

  // ── Swipe Gestures Between Memories/Stories in Story View ─────────────────
  const touchStartMemoryCoords = useRef({ x: 0, y: 0, time: 0 });

  const handlePrevMemoryStory = () => {
    if (!selectedStory || stories.length === 0) return;
    triggerSound();
    const currentIdx = stories.findIndex(s => s.id === selectedStory.id);
    const prevIdx = currentIdx <= 0 ? stories.length - 1 : currentIdx - 1;
    setSelectedStory(stories[prevIdx]);
  };

  const handleNextMemoryStory = () => {
    if (!selectedStory || stories.length === 0) return;
    triggerSound();
    const currentIdx = stories.findIndex(s => s.id === selectedStory.id);
    const nextIdx = (currentIdx + 1) % stories.length;
    setSelectedStory(stories[nextIdx]);
  };

  const handleMemoryTouchStart = (e) => {
    if (e.touches && e.touches[0]) {
      touchStartMemoryCoords.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        time: Date.now()
      };
    }
  };

  const handleMemoryTouchEnd = (e) => {
    const start = touchStartMemoryCoords.current;
    if (!start || !start.time) return;
    const endX = e.changedTouches ? e.changedTouches[0].clientX : 0;
    const endY = e.changedTouches ? e.changedTouches[0].clientY : 0;
    const deltaX = endX - start.x;
    const deltaY = endY - start.y;
    const elapsed = Date.now() - start.time;

    if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > 1.2 * Math.abs(deltaY) && elapsed < 500) {
      if (deltaX < -40) {
        handleNextMemoryStory();
      } else if (deltaX > 40) {
        handlePrevMemoryStory();
      }
    }
    touchStartMemoryCoords.current = { x: 0, y: 0, time: 0 };
  };

  const [flipToday, setFlipToday] = useState(false);
  const [flipFeed, setFlipFeed] = useState(false);
  const [flipJournal, setFlipJournal] = useState(false);
  const [flipHighlights, setFlipHighlights] = useState(false);
  
  // Independent 4-cell Photos Live Tile flips
  const [photoSubTileFlips, setPhotoSubTileFlips] = useState([false, false, false, false]);
  const [photoSubTileIndices, setPhotoSubTileIndices] = useState([0, 1, 2, 3]);

  // ── Desktop Settings Parity Engine ────────────────────────────────────────
  const [playbackSettings, setPlaybackSettings] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('memwault_settings')) || {};
      const savedTurntable = localStorage.getItem('metro_show_turntable');
      return {
        autoplay: saved.autoplay !== undefined ? saved.autoplay : true,
        loopVideo: saved.loopVideo !== undefined ? saved.loopVideo : true,
        showTurntable: savedTurntable !== null ? savedTurntable !== 'false' : (saved.showTurntable !== undefined ? saved.showTurntable : true),
        preferredMusicApp: saved.preferredMusicApp || 'spotify',
        skipDuration: saved.skipDuration || 5,
        showAITags: saved.showAITags !== undefined ? saved.showAITags : true,
        crtMode: saved.crtMode || false,
        grainIntensity: saved.grainIntensity || 0.05,
        patinaLevel: saved.patinaLevel || 0.3,
      };
    } catch (e) {
      return { autoplay: true, loopVideo: true, showTurntable: true, preferredMusicApp: 'spotify', skipDuration: 5, showAITags: true, crtMode: false, grainIntensity: 0.05, patinaLevel: 0.3 };
    }
  });

  const updatePlaybackSetting = (key, val) => {
    triggerSound();
    const next = { ...playbackSettings, [key]: val };
    setPlaybackSettings(next);
    try {
      localStorage.setItem('memwault_settings', JSON.stringify(next));
      if (key === 'showTurntable') {
        localStorage.setItem('metro_show_turntable', String(val));
      }
    } catch (e) {}
  };

  // ── Sync States ───────────────────────────────────────────────────────────
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState({ step: 'Ready', percent: 0, status: 'idle' });
  const [syncLogs, setSyncLogs] = useState([]);
  const [lastSyncTime, setLastSyncTime] = useState(() => localStorage.getItem('metro_last_sync') || null);

  const fileInputRef = useRef(null);
  const highlightTimerRef = useRef(null);
  const scrapbookRef = useRef(null);

  const isDark = themeMode === 'dark';
  const bgColor = isDark ? '#000000' : '#FFFFFF';
  const surfaceColor = isDark ? '#1C1C1C' : '#F4F4F4';
  const cardColor = isDark ? '#121212' : '#E8E8E8';
  const textColor = isDark ? '#FFFFFF' : '#000000';
  const subTextColor = isDark ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.65)';
  const borderColor = isDark ? '#333333' : '#D4D4D4';

  const triggerSound = () => {
    if (soundEnabled) {
      try { playMetroTap(); } catch (e) {}
    }
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // ── Mobile In-App Navigation Stack Router (History + Hardware Back Button) ─
  const navigateToPivot = (targetPivot) => {
    triggerSound();
    if (targetPivot === activePivot && !selectedStory && selectedPostIndex === null && !activeHighlight) return;
    try {
      window.history.pushState({ view: 'pivot', pivot: targetPivot }, '');
    } catch (e) {}
    setActivePivot(targetPivot);
    setSelectedStory(null);
    setSelectedPostIndex(null);
    setActiveHighlight(null);
  };

  const openStoryView = (story) => {
    triggerSound();
    try {
      window.history.pushState({ view: 'story', id: story.id }, '');
    } catch (e) {}
    setSelectedStory(story);
    setStoryDetailTab('info');
  };

  const openPostView = (pIdx) => {
    triggerSound();
    try {
      window.history.pushState({ view: 'post', index: pIdx }, '');
    } catch (e) {}
    setSelectedPostIndex(pIdx);
    setPostSlideIndex(0);
    setPostDetailTab('info');
  };

  const openHighlightView = (hl) => {
    triggerSound();
    try {
      window.history.pushState({ view: 'highlight', id: hl.id }, '');
    } catch (e) {}
    handleOpenHighlight(hl);
  };

  const navigateBack = () => {
    triggerSound();
    if (window.history.state && window.history.length > 1) {
      window.history.back();
    } else {
      if (musicModalTrack) setMusicModalTrack(null);
      else if (paintModalOpen) setPaintModalOpen(false);
      else if (newJournalModalOpen) setNewJournalModalOpen(false);
      else if (cameraModalOpen) setCameraModalOpen(false);
      else if (activeHighlight) setActiveHighlight(null);
      else if (selectedPostIndex !== null) setSelectedPostIndex(null);
      else if (selectedStory) setSelectedStory(null);
      else if (customizeTilesMode) setCustomizeTilesMode(false);
      else if (activePivot !== 'start') setActivePivot('start');
    }
  };

  // ── Mobile Back Navigation Stack (Handles Phone Edge Swipes & Back Button) ──
  useEffect(() => {
    if (!window.history.state) {
      try {
        window.history.replaceState({ view: 'pivot', pivot: 'start' }, '');
      } catch (e) {}
    }

    const handlePopState = () => {
      if (musicModalTrack) {
        setMusicModalTrack(null);
        return;
      }
      if (paintModalOpen) {
        setPaintModalOpen(false);
        return;
      }
      if (newJournalModalOpen) {
        setNewJournalModalOpen(false);
        return;
      }
      if (cameraModalOpen) {
        setCameraModalOpen(false);
        return;
      }
      if (showIosInstructions) {
        setShowIosInstructions(false);
        return;
      }
      if (activeHighlight) {
        setActiveHighlight(null);
        return;
      }
      if (selectedPostIndex !== null) {
        setSelectedPostIndex(null);
        return;
      }
      if (selectedStory) {
        setSelectedStory(null);
        return;
      }
      if (customizeTilesMode) {
        setCustomizeTilesMode(false);
        return;
      }
      if (activePivot !== 'start') {
        setActivePivot('start');
        return;
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [
    musicModalTrack, 
    paintModalOpen, 
    newJournalModalOpen, 
    cameraModalOpen, 
    showIosInstructions, 
    activeHighlight, 
    selectedPostIndex, 
    selectedStory, 
    customizeTilesMode, 
    activePivot
  ]);

  // ── 1. Pairing & Initial Offline Data Load ────────────────────────────────
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const tokenParam = searchParams.get('token') || searchParams.get('pair') || searchParams.get('auth');
    if (tokenParam) {
      setToken(tokenParam);
      localStorage.setItem('sv_token', tokenParam);
      window.history.replaceState({}, document.title, window.location.pathname);
      showToast('✓ Pocket Companion Paired with Vault!');
    }

    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
      setIsInstalled(true);
    }

    async function loadData() {
      const cachedStories = await getOfflineMemories();
      const cachedPosts = await getOfflinePosts();
      const cachedHl = await getOfflineHighlights();
      const st = await getStorageStats();
      const pending = await getPendingMobileUploads();
      const cachedSession = (await getSyncMeta('ig_session')) || (localStorage.getItem('cached_ig_session') ? JSON.parse(localStorage.getItem('cached_ig_session')) : null);
      
      setStories(cachedStories || []);
      setPosts(cachedPosts || []);
      setHighlights(cachedHl || []);
      setStats(st);
      setPendingUploads(pending || []);
      if (cachedSession) setIgSession(cachedSession);

      if (isAuthenticated()) {
        try {
          const session = await getInstagramSession();
          if (session) {
            setIgSession(session);
            await saveSyncMeta('ig_session', session);
            localStorage.setItem('cached_ig_session', JSON.stringify(session));
          }
        } catch (e) {}

        try {
          const hl = await getHighlights();
          if (Array.isArray(hl)) setHighlights(hl);
        } catch (e) {}

        if ((!cachedStories || cachedStories.length === 0) || autoSyncOnOpen) {
          handleRunSync();
        }
      }
    }
    loadData();

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  // Fetch story viewers when a story is selected
  useEffect(() => {
    if (selectedStory?.id && isAuthenticated()) {
      setLoadingViewers(true);
      getStoryViewers(selectedStory.id)
        .then(v => setStoryViewersList(Array.isArray(v) ? v : []))
        .catch(() => setStoryViewersList([]))
        .finally(() => setLoadingViewers(false));
    } else {
      setStoryViewersList([]);
    }
  }, [selectedStory?.id]);

  // ── 2. Clock & Battery Status ─────────────────────────────────────────────
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }, 10000);

    if (navigator.getBattery) {
      navigator.getBattery().then(bat => {
        setBatteryLevel(Math.round(bat.level * 100));
        bat.addEventListener('levelchange', () => setBatteryLevel(Math.round(bat.level * 100)));
      }).catch(() => setBatteryLevel(null));
    }

    return () => clearInterval(timer);
  }, []);

  // ── 3. WP8.1 Photos Hub Multi-Cell Staggered Live Tile Flips ─────────────
  useEffect(() => {
    if (!enableLiveFlip || stories.length === 0) return;

    const t1 = setInterval(() => setFlipToday(f => !f), 7000);
    const t2 = setInterval(() => setFlipFeed(f => !f), 9500);
    const t3 = setInterval(() => setFlipJournal(f => !f), 11000);
    const t4 = setInterval(() => setFlipHighlights(f => !f), 12500);

    const cellTimers = [0, 1, 2, 3].map((cellIdx, i) => {
      const interval = 3500 + i * 1800;
      return setInterval(() => {
        setPhotoSubTileFlips(prev => {
          const next = [...prev];
          next[cellIdx] = !next[cellIdx];
          return next;
        });
        setPhotoSubTileIndices(prev => {
          const next = [...prev];
          next[cellIdx] = (next[cellIdx] + 4) % Math.max(1, stories.length);
          return next;
        });
      }, interval);
    });

    return () => {
      clearInterval(t1); clearInterval(t2); clearInterval(t3); clearInterval(t4);
      cellTimers.forEach(clearInterval);
    };
  }, [enableLiveFlip, stories.length]);

  // ── 4. Highlights Story Player Progress & Progression ─────────────────────
  const handlePrevHighlightStory = () => {
    triggerSound();
    if (highlightStoryIndex > 0) {
      setHighlightStoryIndex(i => i - 1);
      setHighlightProgress(0);
      setIsHighlightPaused(false);
    } else {
      setHighlightProgress(0);
    }
  };

  const handleNextHighlightStory = () => {
    triggerSound();
    if (highlightStories && highlightStoryIndex < highlightStories.length - 1) {
      setHighlightStoryIndex(i => i + 1);
      setHighlightProgress(0);
      setIsHighlightPaused(false);
    } else {
      setActiveHighlight(null);
      setHighlightStories([]);
      setHighlightProgress(0);
      setHighlightStoryIndex(0);
      setIsHighlightPaused(false);
    }
  };

  useEffect(() => {
    if (!activeHighlight || highlightStories.length === 0) return;
    
    const curStory = highlightStories[highlightStoryIndex];
    if (!curStory) return;

    // Reset progress when index changes
    setHighlightProgress(0);

    const isVideo = curStory.media_type === 2 || (typeof curStory.media_url === 'string' && (curStory.media_url.includes('.mp4') || curStory.media_url.includes('.mov')));
    if (isVideo) {
      if (highlightVideoRef.current) {
        if (isHighlightPaused || !!musicModalTrack || isHoldingToPause) {
          highlightVideoRef.current.pause();
        } else {
          highlightVideoRef.current.play().catch(() => {});
        }
      }
      return; // Video progress is driven by onTimeUpdate & onEnded!
    }

    if (isHighlightPaused || !!musicModalTrack || isHoldingToPause) return;

    const duration = 5000;
    const interval = 50;
    const increment = (interval / duration) * 100;

    highlightTimerRef.current = setInterval(() => {
      setHighlightProgress(prev => {
        if (prev >= 100) {
          clearInterval(highlightTimerRef.current);
          handleNextHighlightStory();
          return 100;
        }
        return prev + increment;
      });
    }, interval);

    return () => clearInterval(highlightTimerRef.current);
  }, [activeHighlight, highlightStories, highlightStoryIndex, isHighlightPaused, musicModalTrack, isHoldingToPause]);

  const handleOpenHighlight = async (hl) => {
    if (!hl) return;
    triggerSound();
    setMusicModalTrack(null);
    setIsAudioMuted(false);
    setIsHighlightPaused(false);
    setIsHoldingToPause(false);
    setActiveHighlight(hl);
    setHighlightStoryIndex(0);
    setHighlightProgress(0);

    // Initial stories from cached preview while async fetch runs
    let initialList = [];
    if (hl.stories && hl.stories.length > 0) {
      initialList = hl.stories;
    } else if (hl.story_ids && hl.story_ids.length > 0) {
      initialList = stories.filter(s => hl.story_ids.includes(s.id));
    } else if (hl.preview_stories && hl.preview_stories.length > 0) {
      initialList = hl.preview_stories.map((u, idx) => ({ 
        id: `p_${idx}`, 
        media_url: typeof u === 'string' ? u : (u?.media_url || u?.display_url || ''), 
        media_type: (typeof u === 'string' && (u.includes('.mp4') || u.includes('.mov'))) ? 2 : 1 
      }));
    }
    setHighlightStories(initialList.length > 0 ? initialList : stories.slice(0, 6));

    try {
      const data = await getHighlightStories(hl.id);
      const list = Array.isArray(data) ? data : (data?.stories || data?.items || []);
      if (list.length > 0) {
        setHighlightStories(list);
        setHighlightStoryIndex(0);
        setHighlightProgress(0);
      }
    } catch (e) {
      // Keep initial list
    }
  };

  // ── 5. iTunes 30-Second Music Preview Fetcher & Player ────────────────────
  const handleOpenMusicModal = async (trackTitle, artistName) => {
    if (!trackTitle) return;
    triggerSound();
    setIsHighlightPaused(true);
    setIsAudioMuted(true);
    setMusicModalTrack({ title: trackTitle, artist: artistName });
    setAudioPreviewUrl(null);
    setAudioArtworkUrl(null);
    setIsPlayingAudio(false);
    setAudioProgress(0);

    try {
      const query = encodeURIComponent(`${trackTitle} ${artistName || ''}`);
      const res = await fetch(`https://itunes.apple.com/search?term=${query}&limit=1&entity=song`);
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        const item = data.results[0];
        setAudioPreviewUrl(item.previewUrl);
        if (item.artworkUrl100) {
          setAudioArtworkUrl(item.artworkUrl100.replace('100x100bb', '400x400bb'));
        }
        setIsPlayingAudio(true);
      }
    } catch (err) {
      console.warn('Failed to fetch iTunes preview:', err);
    }
  };

  const handleTogglePlayAudio = () => {
    if (!previewAudioRef.current) return;
    if (isPlayingAudio) {
      previewAudioRef.current.pause();
      setIsPlayingAudio(false);
    } else {
      previewAudioRef.current.play().then(() => setIsPlayingAudio(true)).catch(() => {});
    }
  };

  // ── 6. Live Camera Viewfinder Engine ──────────────────────────────────────
  const handleStartCamera = async () => {
    triggerSound();
    setCameraModalOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.warn('Camera access denied, fallback to file picker:', err);
      setCameraModalOpen(false);
      fileInputRef.current?.click();
    }
  };

  const handleStopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(t => t.stop());
      setCameraStream(null);
    }
    setCameraModalOpen(false);
  };

  const handleCaptureSnapshot = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    triggerSound();
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 1080;
    canvas.height = video.videoHeight || 1920;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    handleStopCamera();

    await addPendingMobileUpload({
      name: `Camera_Capture_${Date.now()}.jpg`,
      size: Math.round(dataUrl.length * 0.75),
      type: 'image/jpeg',
      dataUrl,
      storyId: selectedStory?.id || null,
    });

    const st = await getStorageStats();
    const pending = await getPendingMobileUploads();
    setStats(st);
    setPendingUploads(pending);
    showToast('✓ Photo captured and saved to offline vault!');
  };

  // ── 7. MS Paint / Touch Doodle Canvas Engine ──────────────────────────────
  const handleOpenPaint = () => {
    triggerSound();
    setPaintModalOpen(true);
    setTimeout(() => {
      const canvas = paintCanvasRef.current;
      if (canvas && canvas.parentElement) {
        const rect = canvas.parentElement.getBoundingClientRect();
        canvas.width = Math.round(rect.width) || 360;
        canvas.height = Math.round(rect.height) || 420;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }, 150);
  };

  const getCanvasPos = (e) => {
    const canvas = paintCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches ? e.touches[0] : (e.changedTouches ? e.changedTouches[0] : e);
    const clientX = touch.clientX;
    const clientY = touch.clientY;
    const scaleX = rect.width > 0 ? (canvas.width / rect.width) : 1;
    const scaleY = rect.height > 0 ? (canvas.height / rect.height) : 1;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const handlePaintStart = (e) => {
    if (e.touches && e.cancelable) e.preventDefault();
    const canvas = paintCanvasRef.current;
    if (!canvas) return;
    setIsDrawing(true);
    const ctx = canvas.getContext('2d');
    const pos = getCanvasPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    ctx.strokeStyle = paintTool === 'eraser' ? '#FFFFFF' : drawingColor;
    ctx.lineWidth = paintTool === 'highlighter' ? brushSize * 3 : brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalAlpha = paintTool === 'highlighter' ? 0.35 : 1.0;
  };

  const handlePaintMove = (e) => {
    if (e.touches && e.cancelable) e.preventDefault();
    if (!isDrawing) return;
    const canvas = paintCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const pos = getCanvasPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const handlePaintEnd = () => {
    setIsDrawing(false);
  };

  const handleSavePaintDoodle = () => {
    const canvas = paintCanvasRef.current;
    if (!canvas) return;
    triggerSound();
    const dataUrl = canvas.toDataURL('image/png');
    setAttachedDoodleUrl(dataUrl);

    // If attached from a specific story, save directly to story's doodles
    if (selectedStory?.id) {
      try {
        localStorage.setItem(`memwault_doodles_${selectedStory.id}`, JSON.stringify([{ id: Date.now(), url: dataUrl }]));
      } catch (e) {}
    }
    // If attached from a specific post, save directly to post's doodles
    if (selectedPostIndex !== null && posts[selectedPostIndex]?.id) {
      try {
        localStorage.setItem(`memwault_doodles_${posts[selectedPostIndex].id}`, JSON.stringify([{ id: Date.now(), url: dataUrl }]));
      } catch (e) {}
    }

    setPaintModalOpen(false);
    showToast('✓ Doodle attached to Journal!');
  };

  // ── 8. Places to Visit Functions (Full Desktop Parity) ─────────────────────
  const handleAddPlace = (e) => {
    e.preventDefault();
    if (!newPlaceTitle.trim()) return;
    triggerSound();
    const newEntry = {
      id: Date.now().toString(),
      title: newPlaceTitle.trim(),
      location: newPlaceLocation.trim() || 'Worldwide',
      category: newPlaceCategory,
      completed: false,
      notes: ''
    };
    const updated = [newEntry, ...places];
    setPlaces(updated);
    localStorage.setItem('memwault_places_to_visit', JSON.stringify(updated));
    setNewPlaceTitle('');
    setNewPlaceLocation('');
    showToast('✓ Travel Goal Added!');
  };

  const togglePlaceCompleted = (id) => {
    triggerSound();
    const updated = places.map(p => p.id === id ? { ...p, completed: !p.completed } : p);
    setPlaces(updated);
    localStorage.setItem('memwault_places_to_visit', JSON.stringify(updated));
  };

  const deletePlace = (id) => {
    triggerSound();
    const updated = places.filter(p => p.id !== id);
    setPlaces(updated);
    localStorage.setItem('memwault_places_to_visit', JSON.stringify(updated));
  };

  // ── 9. Native PWA Install Prompt ──────────────────────────────────────────
  const handleInstallPwa = async () => {
    triggerSound();
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
        showToast('✓ MemWault installed as standalone application!');
      }
      setDeferredPrompt(null);
    } else {
      const isIos = /iPhone|iPad|iPod/i.test(navigator.userAgent);
      if (isIos) {
        setShowIosInstructions(true);
      } else {
        showToast('Tip: In Chrome/Edge menu (⋮), tap "Install App"');
      }
    }
  };

  // ── 10. ActiveSync Engine ─────────────────────────────────────────────────
  const handleRunSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    triggerSound();
    const timeStr = new Date().toLocaleTimeString();
    setSyncLogs(prev => [`[${timeStr}] Connecting to ActiveSync Vault...`, ...prev]);

    try {
      const res = await syncPocketWithLaptop((progress) => {
        setSyncProgress(progress);
        if (progress.step) {
          setSyncLogs(prev => [`[${new Date().toLocaleTimeString()}] ${progress.step}`, ...prev.slice(0, 20)]);
        }
      });

      if (res && res.stories) setStories(res.stories);
      if (res && res.posts) setPosts(res.posts);
      if (res && res.highlights) setHighlights(res.highlights);
      if (res && res.stats) setStats(res.stats);
      const pending = await getPendingMobileUploads();
      setPendingUploads(pending);

      try {
        const session = await getInstagramSession();
        setIgSession(session);
      } catch (e) {}

      const syncStamp = new Date().toLocaleString();
      setLastSyncTime(syncStamp);
      localStorage.setItem('metro_last_sync', syncStamp);
      showToast(`✓ Synced ${res?.stories?.length || 0} Memories & ${res?.posts?.length || 0} Posts (${res?.stats?.storageMb || '0.00'} MB offline)`);
    } catch (err) {
      setSyncLogs(prev => [`[${new Date().toLocaleTimeString()}] Error: ${err.message}`, ...prev]);
      showToast('⚠️ Sync Failed (Using Offline Vault)');
    } finally {
      setIsSyncing(false);
    }
  };

  // ── 11. Save Journal Note from Modal or Inline ────────────────────────────
  const handleSaveNewJournalEntry = async () => {
    const isStoryTarget = journalAttachType === 'story';
    const targetItem = selectedItemForJournal || (isStoryTarget ? stories[0] : posts[0]);
    if (!targetItem) {
      showToast('Please select a photo or post first');
      return;
    }

    setIsSavingJournal(true);
    triggerSound();
    try {
      let fullNote = journalNoteText;
      if (placedStickers.length > 0) {
        fullNote += `\n\nStickers: ${placedStickers.map(s => s.text).join(' • ')}`;
      }

      if (attachedDoodleUrl) {
        localStorage.setItem(`memwault_doodles_${targetItem.id}`, JSON.stringify([{ id: Date.now(), url: attachedDoodleUrl }]));
      }

      if (isAuthenticated()) {
        if (isStoryTarget) {
          await updateStory(targetItem.id, { journal_note: fullNote });
        } else {
          await updatePost(targetItem.id, { journal_note: fullNote });
        }
      }
      
      if (isStoryTarget) {
        const updated = stories.map(s => s.id === targetItem.id ? { ...s, journal_note: fullNote } : s);
        setStories(updated);
        await saveMemoriesOffline(updated);
      } else {
        const updated = posts.map(p => p.id === targetItem.id ? { ...p, journal_note: fullNote } : p);
        setPosts(updated);
        await savePostsOffline(updated);
      }
      
      setNewJournalModalOpen(false);
      setJournalNoteText('');
      setPlacedStickers([]);
      setAttachedDoodleUrl(null);
      setSelectedItemForJournal(null);
      showToast('✓ Journal Entry Saved to Vault!');
    } catch (err) {
      showToast('Error saving journal: ' + err.message);
    } finally {
      setIsSavingJournal(false);
    }
  };

  const handleSaveInlineJournal = async (itemId, isPost = false) => {
    if (!itemId) return;
    setIsSavingJournal(true);
    triggerSound();
    try {
      if (isAuthenticated()) {
        if (isPost) {
          await updatePost(itemId, { journal_note: journalDraft });
        } else {
          await updateStory(itemId, { journal_note: journalDraft });
        }
      }
      
      if (!isPost) {
        const updated = stories.map(s => s.id === itemId ? { ...s, journal_note: journalDraft } : s);
        setStories(updated);
        await saveMemoriesOffline(updated);
        if (selectedStory && selectedStory.id === itemId) {
          setSelectedStory({ ...selectedStory, journal_note: journalDraft });
        }
      } else {
        const updated = posts.map(p => p.id === itemId ? { ...p, journal_note: journalDraft } : p);
        setPosts(updated);
        await savePostsOffline(updated);
      }
      
      setEditingItemId(null);
      showToast('✓ Journal Note Saved!');
    } catch (err) {
      showToast('Error saving note: ' + err.message);
    } finally {
      setIsSavingJournal(false);
    }
  };

  // ── 12. File Pick Fallback ────────────────────────────────────────────────
  const handleFilePicked = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target.result;
      await addPendingMobileUpload({
        name: file.name,
        size: file.size,
        type: file.type,
        dataUrl,
        storyId: selectedStory?.id || null,
        fileBlob: file,
      });

      const st = await getStorageStats();
      const pending = await getPendingMobileUploads();
      setStats(st);
      setPendingUploads(pending);
      showToast(`✓ Photo "${file.name}" saved to Vault!`);
      triggerSound();
    };
    reader.readAsDataURL(file);
  };

  // ── 13. Clear Offline Storage ─────────────────────────────────────────────
  const handleClearCache = async () => {
    try {
      const db = await openMobileDB();
      const tx = db.transaction(['memories', 'posts', 'highlights', 'media_blobs'], 'readwrite');
      tx.objectStore('memories').clear();
      tx.objectStore('posts').clear();
      tx.objectStore('highlights').clear();
      tx.objectStore('media_blobs').clear();
      await new Promise(r => { tx.oncomplete = r; });
      
      if (typeof caches !== 'undefined') {
        caches.delete('memwault-media-vault-v2').catch(() => {});
      }

      setStories([]);
      setPosts([]);
      setHighlights([]);
      const st = await getStorageStats();
      setStats(st);
      setConfirmClearOpen(false);
      showToast('✓ Offline Storage Cleared');
      triggerSound();
    } catch (err) {
      showToast('Error clearing storage: ' + err.message);
    }
  };

  // ── 14. Flashback Memories Array ──────────────────────────────────────────
  const flashbacks = getOnThisDayMemories(stories);
  const currentFlashback = flashbacks[flashbackIndex] || flashbacks[0] || stories[0] || null;

  // ── 15. Filtered Stories ──────────────────────────────────────────────────
  const filteredStories = stories.filter(s => {
    const musicTitle = s.music?.track_title || s.music_title || '';
    const musicArtist = s.music?.artist_name || s.music_artist || '';
    const matchesSearch = !searchQuery || 
      (s.location_name && s.location_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (s.caption_text && s.caption_text.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (s.journal_note && s.journal_note.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (musicTitle && musicTitle.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (musicArtist && musicArtist.toLowerCase().includes(searchQuery.toLowerCase()));
    
    if (!matchesSearch) return false;
    if (filterType === 'photos') return s.media_type === 1;
    if (filterType === 'videos') return s.media_type === 2;
    if (filterType === 'journaled') return Boolean(s.journal_note && s.journal_note.trim().length > 0);
    if (filterType === 'music') return Boolean(s.music?.track_title || s.music_title);
    if (filterType === 'cf') return Boolean(s.is_close_friends || s.audience === 'close_friends');
    return true;
  });

  const journaledItems = [
    ...stories.filter(s => s.journal_note && s.journal_note.trim().length > 0).map(s => ({ ...s, _isPost: false })),
    ...posts.filter(p => p.journal_note && p.journal_note.trim().length > 0).map(p => ({ ...p, _isPost: true }))
  ];

  // ── Auto-Extracted Visited Places Engine (Full Desktop Parity) ────────────
  const visitedLocations = useMemo(() => {
    const map = new Map();
    
    // 1. Extract from stories with location geotags
    stories.forEach(s => {
      if (s.location_name && s.location_name.trim()) {
        const loc = s.location_name.trim();
        if (!map.has(loc)) {
          map.set(loc, {
            id: `loc_${loc}`,
            title: loc,
            location: loc,
            category: 'Travel',
            visited: true,
            count: 1,
            lastVisited: s.taken_at,
            sampleItem: s
          });
        } else {
          const item = map.get(loc);
          item.count += 1;
          if (s.taken_at && (!item.lastVisited || new Date(s.taken_at) > new Date(item.lastVisited))) {
            item.lastVisited = s.taken_at;
            item.sampleItem = s;
          }
        }
      }
    });

    // 2. Extract from posts with location geotags
    posts.forEach(p => {
      if (p.location_name && p.location_name.trim()) {
        const loc = p.location_name.trim();
        if (!map.has(loc)) {
          map.set(loc, {
            id: `loc_${loc}`,
            title: loc,
            location: loc,
            category: 'Travel',
            visited: true,
            count: 1,
            lastVisited: p.taken_at || p.timestamp,
            sampleItem: p
          });
        } else {
          const item = map.get(loc);
          item.count += 1;
        }
      }
    });

    // 3. Include completed bucket list destinations
    places.filter(p => p.completed).forEach(p => {
      const loc = p.location ? `${p.title} (${p.location})` : p.title;
      if (!map.has(loc)) {
        map.set(loc, {
          id: p.id,
          title: p.title,
          location: p.location || p.title,
          category: p.category || 'Travel',
          visited: true,
          count: 1,
          lastVisited: null,
          sampleItem: null,
          notes: p.notes
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [stories, posts, places]);

  // ── Pivot Tabs ────────────────────────────────────────────────────────────
  const pivotList = [
    { id: 'start', label: 'start' },
    { id: 'memories', label: 'memories' },
    { id: 'highlights', label: 'highlights' },
    { id: 'feed', label: 'feed' },
    { id: 'journal', label: 'journal' },
    { id: 'settings', label: 'settings' },
  ];

  // ── Authentic Metro Toggle Switch Component ───────────────────────────────
  const MetroToggle = ({ label, checked, onText = 'on', offText = 'off', onChange }) => (
    <div 
      onClick={() => { triggerSound(); onChange(!checked); }}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 14px',
        backgroundColor: surfaceColor,
        cursor: 'pointer',
        borderLeft: checked ? `4px solid ${accent}` : `4px solid ${borderColor}`,
        transition: 'border-color 0.2s ease',
      }}
    >
      <div>
        <div style={{ fontSize: '14px', fontWeight: 300, textTransform: 'lowercase' }}>{label}</div>
        <div style={{ fontSize: '11px', color: checked ? accent : subTextColor, fontWeight: 600 }}>
          {checked ? onText : offText}
        </div>
      </div>
      <div style={{
        width: '48px',
        height: '24px',
        border: `2px solid ${checked ? accent : borderColor}`,
        backgroundColor: checked ? accent : 'transparent',
        display: 'flex',
        alignItems: 'center',
        padding: '2px',
        boxSizing: 'border-box',
        position: 'relative',
        transition: 'all 0.2s ease',
      }}>
        <motion.div
          layout
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          style={{
            width: '16px',
            height: '16px',
            backgroundColor: checked ? '#FFFFFF' : (isDark ? '#FFFFFF' : '#000000'),
            marginLeft: checked ? 'auto' : 0,
          }}
        />
      </div>
    </div>
  );

  return (
    <div style={{
      width: '100%',
      minHeight: '100dvh',
      maxWidth: '100%',
      margin: 0,
      backgroundColor: bgColor,
      color: textColor,
      fontFamily: '"Segoe UI", "Segoe WP", "Segoe UI Light", -apple-system, BlinkMacSystemFont, "Helvetica Neue", sans-serif',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      userSelect: 'none',
      overflowX: 'hidden',
      paddingLeft: 'env(safe-area-inset-left, 0px)',
      paddingRight: 'env(safe-area-inset-right, 0px)',
      paddingTop: 'env(safe-area-inset-top, 0px)',
      paddingBottom: 'calc(40px + env(safe-area-inset-bottom, 0px))',
      boxSizing: 'border-box',
      WebkitOverflowScrolling: 'touch',
      overscrollBehaviorY: 'contain',
      transition: 'background-color 0.25s ease, color 0.25s ease',
    }}>
      {/* Hidden File Input & Canvas */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFilePicked}
        accept="image/*,video/*"
        style={{ display: 'none' }}
      />
      <canvas ref={canvasRef} style={{ display: 'none' }} />



      {/* ── Toast Notification Banner ───────────────────────── */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ y: -45, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -45, opacity: 0 }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              width: '100%',
              backgroundColor: accent,
              color: '#FFFFFF',
              padding: '10px 16px',
              fontSize: '12px',
              fontWeight: 600,
              zIndex: 99999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 4px 16px rgba(0,0,0,0.6)',
            }}
          >
            <span>{toastMessage}</span>
            <X size={16} style={{ cursor: 'pointer' }} onClick={() => setToastMessage(null)} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── LIVE CAMERA VIEWFINDER MODAL ────────────────────── */}
      {cameraModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: '#000000',
          zIndex: 100000,
          display: 'flex',
          flexDirection: 'column',
        }}>
          <div style={{ padding: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#FFF' }}>
            <div style={{ fontSize: '13px', fontWeight: 600, letterSpacing: '0.1em' }}>VAULT CAMERA</div>
            <X size={24} style={{ cursor: 'pointer' }} onClick={handleStopCamera} />
          </div>

          <div style={{ flex: 1, position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>

          <div style={{ padding: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-around', backgroundColor: '#000' }}>
            <button
              onClick={() => { handleStopCamera(); fileInputRef.current?.click(); }}
              style={{ background: 'none', border: 'none', color: '#FFF', fontSize: '12px', cursor: 'pointer' }}
            >
              Gallery
            </button>

            {/* Circular Shutter Button */}
            <div
              onClick={handleCaptureSnapshot}
              style={{
                width: '68px',
                height: '68px',
                borderRadius: '50%',
                border: '4px solid #FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <div style={{ width: '52px', height: '52px', borderRadius: '50%', backgroundColor: accent }} />
            </div>

            <div style={{ width: '40px' }} />
          </div>
        </div>
      )}

      {/* ── MS PAINT / FINGER DOODLING STUDIO MODAL ─────────── */}
      {paintModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.92)',
          zIndex: 100005,
          display: 'flex',
          flexDirection: 'column',
          padding: '12px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', color: '#FFF' }}>
            <div style={{ fontSize: '14px', fontWeight: 300, color: '#008A00' }}>🎨 MS Paint Doodle Studio</div>
            <X size={20} style={{ cursor: 'pointer' }} onClick={() => setPaintModalOpen(false)} />
          </div>

          {/* Tool Selector Bar */}
          <div style={{ display: 'flex', gap: '6px', marginBottom: '8px', backgroundColor: surfaceColor, padding: '6px' }}>
            <button
              onClick={() => setPaintTool('brush')}
              style={{ backgroundColor: paintTool === 'brush' ? accent : 'transparent', color: '#FFF', border: 'none', padding: '6px 10px', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <Brush size={12} /> Brush
            </button>
            <button
              onClick={() => setPaintTool('highlighter')}
              style={{ backgroundColor: paintTool === 'highlighter' ? accent : 'transparent', color: '#FFF', border: 'none', padding: '6px 10px', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <Palette size={12} /> Glow
            </button>
            <button
              onClick={() => setPaintTool('eraser')}
              style={{ backgroundColor: paintTool === 'eraser' ? accent : 'transparent', color: '#FFF', border: 'none', padding: '6px 10px', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <Eraser size={12} /> Eraser
            </button>
          </div>

          {/* Color Palette Row */}
          <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '6px', marginBottom: '8px', scrollbarWidth: 'none' }}>
            {DRAWING_COLORS.map(c => (
              <div
                key={c}
                onClick={() => setDrawingColor(c)}
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  backgroundColor: c,
                  border: drawingColor === c ? '3px solid #FFF' : '1px solid #666',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              />
            ))}
          </div>

          {/* Drawing Canvas */}
          <div style={{ flex: 1, backgroundColor: '#FFF', borderRadius: '4px', overflow: 'hidden', touchAction: 'none' }}>
            <canvas
              ref={paintCanvasRef}
              onMouseDown={handlePaintStart}
              onMouseMove={handlePaintMove}
              onMouseUp={handlePaintEnd}
              onTouchStart={handlePaintStart}
              onTouchMove={handlePaintMove}
              onTouchEnd={handlePaintEnd}
              style={{ width: '100%', height: '100%', display: 'block' }}
            />
          </div>

          {/* Bottom Action Row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
            <button
              onClick={() => {
                const canvas = paintCanvasRef.current;
                if (canvas) {
                  const ctx = canvas.getContext('2d');
                  ctx.fillStyle = '#FFFFFF';
                  ctx.fillRect(0, 0, canvas.width, canvas.height);
                }
              }}
              style={{ background: 'none', border: `1px solid ${borderColor}`, color: '#FFF', padding: '6px 12px', fontSize: '11px', cursor: 'pointer' }}
            >
              Clear
            </button>

            <button
              onClick={handleSavePaintDoodle}
              style={{ backgroundColor: '#008A00', border: 'none', color: '#FFF', padding: '8px 20px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              Attach Doodle ✓
            </button>
          </div>
        </div>
      )}

      {/* ── 30-SECOND MUSIC PREVIEW MODAL ───────────────────── */}
      {musicModalTrack && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.88)',
          zIndex: 10000005,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
        }}>
          <div style={{
            backgroundColor: surfaceColor,
            border: `1px solid ${borderColor}`,
            padding: '16px',
            maxWidth: '420px',
            width: '100%',
            color: textColor,
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            boxShadow: '0 12px 48px rgba(0,0,0,0.9)',
          }}>
            <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${borderColor}`, paddingBottom: '8px' }}>
              <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#1DB954', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Music size={14} /> SOUNDTRACK PREVIEW
              </div>
              <X 
                size={18} 
                style={{ cursor: 'pointer' }} 
                onClick={() => {
                  setMusicModalTrack(null);
                }} 
              />
            </div>

            <MusicPlayer
              music={{
                track_title: musicModalTrack.title,
                artist_name: musicModalTrack.artist || 'Artist'
              }}
              showTurntable={playbackSettings.showTurntable !== false}
              onPlayStateChange={(isMusicPlaying) => {
                if (isMusicPlaying) {
                  setIsHighlightPaused(true);
                  setIsAudioMuted(true);
                }
              }}
              onExternalOpen={() => {
                setIsHighlightPaused(true);
                setIsAudioMuted(true);
              }}
            />
          </div>
        </div>
      )}

      {/* ── iOS Install Instructions Modal ──────────────────── */}
      {showIosInstructions && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.85)',
          zIndex: 100000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
        }}>
          <div style={{
            backgroundColor: surfaceColor,
            borderLeft: `4px solid ${accent}`,
            padding: '20px',
            maxWidth: '400px',
            width: '100%',
            color: textColor,
          }}>
            <div style={{ fontSize: '18px', fontWeight: 300, marginBottom: '8px' }}>install as application</div>
            <div style={{ fontSize: '12px', opacity: 0.9, lineHeight: 1.6, marginBottom: '18px' }}>
              1. Tap the <b>Share icon ⎋</b> at the bottom of Safari.<br/>
              2. Scroll down and tap <b>Add to Home Screen ⊞</b>.<br/>
              3. Tap <b>Add</b> in the top right.
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowIosInstructions(false)}
                style={{ backgroundColor: accent, border: 'none', color: '#FFFFFF', padding: '6px 16px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
              >
                got it
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirmation Modal for Cache Clear ──────────────── */}
      {confirmClearOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.85)',
          zIndex: 100000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
        }}>
          <div style={{
            backgroundColor: surfaceColor,
            borderLeft: `4px solid ${accent}`,
            padding: '20px',
            maxWidth: '400px',
            width: '100%',
            color: textColor,
          }}>
            <div style={{ fontSize: '18px', fontWeight: 300, marginBottom: '8px' }}>clear offline storage?</div>
            <div style={{ fontSize: '13px', opacity: 0.8, lineHeight: 1.4, marginBottom: '18px' }}>
              This will remove all cached media files, stories, and posts from this phone. You can re-download everything anytime by syncing with your laptop vault.
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setConfirmClearOpen(false)}
                style={{ background: 'transparent', border: `2px solid ${borderColor}`, color: textColor, padding: '6px 16px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
              >
                cancel
              </button>
              <button
                onClick={handleClearCache}
                style={{ backgroundColor: '#A20025', border: 'none', color: '#FFFFFF', padding: '6px 16px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
              >
                clear now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── HIGHLIGHT STORIES PLAYER MODAL (EXACT SAME AS DESKTOP UI WITH BOTTOM MUSIC WIDGET) ── */}
      <HighlightPlayerModal
        isOpen={Boolean(activeHighlight && highlightStories.length > 0)}
        onClose={() => {
          setActiveHighlight(null);
          setHighlightStories([]);
          setHighlightStoryIndex(0);
          setMusicModalTrack(null);
        }}
        stories={highlightStories}
        initialIndex={highlightStoryIndex}
        highlightTitle={activeHighlight?.title || 'Highlight'}
      />

      {/* ── CREATE NEW JOURNAL ENTRY & SCRAPBOOK MODAL ─────── */}
      {newJournalModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.88)',
          zIndex: 100000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '12px',
        }}>
          <div style={{
            backgroundColor: surfaceColor,
            borderLeft: `4px solid #008A00`,
            padding: '16px',
            maxWidth: '520px',
            width: '100%',
            color: textColor,
            maxHeight: '92vh',
            overflowY: 'auto',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div style={{ fontSize: '18px', fontWeight: 300, color: '#008A00' }}>+ new journal scrap & note</div>
              <X size={18} style={{ cursor: 'pointer' }} onClick={() => setNewJournalModalOpen(false)} />
            </div>

            {/* Target Type Selector */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
              <button
                onClick={() => { setJournalAttachType('story'); setSelectedItemForJournal(null); }}
                style={{
                  backgroundColor: journalAttachType === 'story' ? '#008A00' : cardColor,
                  color: journalAttachType === 'story' ? '#FFF' : textColor,
                  border: 'none',
                  padding: '6px 12px',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Memories ({stories.length})
              </button>
              <button
                onClick={() => { setJournalAttachType('post'); setSelectedItemForJournal(null); }}
                style={{
                  backgroundColor: journalAttachType === 'post' ? '#008A00' : cardColor,
                  color: journalAttachType === 'post' ? '#FFF' : textColor,
                  border: 'none',
                  padding: '6px 12px',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Feed Posts ({posts.length})
              </button>
            </div>

            <div style={{ fontSize: '11px', color: subTextColor, marginBottom: '6px' }}>
              1. TAP PHOTO FOR JOURNAL ENTRY:
            </div>

            {/* Item Picker */}
            <div style={{
              display: 'flex',
              gap: '6px',
              overflowX: 'auto',
              paddingBottom: '6px',
              scrollbarWidth: 'none',
              marginBottom: '10px',
            }}>
              {(journalAttachType === 'story' ? stories : posts).map(item => {
                const isSelected = selectedItemForJournal?.id === item.id;
                const mediaUrl = getMediaUrl(item);
                return (
                  <div
                    key={item.id}
                    onClick={() => { triggerSound(); setSelectedItemForJournal(item); }}
                    style={{
                      width: '64px',
                      height: '90px',
                      flexShrink: 0,
                      backgroundColor: '#000',
                      cursor: 'pointer',
                      border: isSelected ? '3px solid #008A00' : '1px solid #444',
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                  >
                    <OfflineMedia
                      src={mediaUrl}
                      type={item.media_type === 2 ? 'video' : 'image'}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      alt="Thumb"
                    />
                    {isSelected && (
                      <div style={{ position: 'absolute', top: '2px', right: '2px', backgroundColor: '#008A00', borderRadius: '50%', padding: '2px' }}>
                        <Check size={10} color="#FFF" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Interactive Scrapbooking Canvas with Drag & Drop Stickers */}
            <div style={{ marginBottom: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <span style={{ fontSize: '11px', color: subTextColor }}>
                  2. DRAG & DROP CUSTOM STICKERS ON CANVAS:
                </span>
                <button
                  onClick={handleOpenPaint}
                  style={{ backgroundColor: '#008A00', border: 'none', color: '#FFF', padding: '3px 8px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <Brush size={10} /> Draw Doodle
                </button>
              </div>

              {/* Scrapbook Viewport */}
              <div
                ref={scrapbookRef}
                style={{
                  width: '100%',
                  height: '140px',
                  backgroundColor: '#000',
                  position: 'relative',
                  overflow: 'hidden',
                  borderRadius: '4px',
                  border: `1px solid ${borderColor}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {selectedItemForJournal ? (
                  <OfflineMedia
                    src={getMediaUrl(selectedItemForJournal)}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.6 }}
                    alt="Scrapbook Background"
                  />
                ) : (
                  <div style={{ fontSize: '11px', color: subTextColor }}>Select a photo above</div>
                )}

                {/* Attached Doodle Layer */}
                {attachedDoodleUrl && (
                  <img
                    src={attachedDoodleUrl}
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none' }}
                    alt="Doodle Layer"
                  />
                )}

                {/* Draggable Custom Stickers */}
                {placedStickers.map((stk, idx) => (
                  <motion.div
                    key={idx}
                    drag
                    dragConstraints={scrapbookRef}
                    whileDrag={{ scale: 1.18, zIndex: 100 }}
                    style={{
                      position: 'absolute',
                      backgroundColor: stk.bg,
                      color: stk.darkText ? '#000' : '#FFF',
                      padding: '4px 10px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 800,
                      cursor: 'grab',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      letterSpacing: '0.04em',
                    }}
                  >
                    <span>{stk.icon}</span>
                    <span>{stk.text}</span>
                  </motion.div>
                ))}
              </div>

              {/* Sticker Tray (Tap to add to scrapbook) */}
              <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', padding: '6px 0', scrollbarWidth: 'none' }}>
                {CUSTOM_STICKER_SETS.map(s => (
                  <button
                    key={s.id}
                    onClick={() => {
                      triggerSound();
                      setPlacedStickers([...placedStickers, s]);
                      showToast(`+ Added ${s.text} to Scrapbook! (Drag to position)`);
                    }}
                    style={{
                      backgroundColor: s.bg,
                      color: s.darkText ? '#000' : '#FFF',
                      border: 'none',
                      padding: '4px 8px',
                      borderRadius: '3px',
                      fontSize: '10px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      flexShrink: 0,
                    }}
                  >
                    {s.icon} {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ fontSize: '11px', color: subTextColor, marginBottom: '4px' }}>
              3. WRITE YOUR JOURNAL REFLECTIONS:
            </div>
            <textarea
              value={journalNoteText}
              onChange={(e) => setJournalNoteText(e.target.value)}
              placeholder="What happened on this day? Write thoughts, reflections, and context..."
              rows={4}
              style={{
                width: '100%',
                backgroundColor: cardColor,
                color: textColor,
                border: `1px solid ${borderColor}`,
                padding: '10px',
                fontSize: '12px',
                fontFamily: 'inherit',
                boxSizing: 'border-box',
                outline: 'none',
                marginBottom: '12px',
              }}
            />

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setNewJournalModalOpen(false)}
                style={{ background: 'none', border: `1px solid ${borderColor}`, color: textColor, padding: '6px 14px', fontSize: '11px', cursor: 'pointer' }}
              >
                cancel
              </button>
              <button
                onClick={handleSaveNewJournalEntry}
                disabled={isSavingJournal || (!journalNoteText.trim() && placedStickers.length === 0 && !attachedDoodleUrl)}
                style={{
                  backgroundColor: '#008A00',
                  border: 'none',
                  color: '#FFFFFF',
                  padding: '6px 18px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  opacity: (journalNoteText.trim() || placedStickers.length > 0 || attachedDoodleUrl) ? 1 : 0.5,
                }}
              >
                {isSavingJournal ? 'saving...' : 'save to vault'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Metro Status Bar (Top) ────────────────────────────── */}
      <div style={{
        height: '24px',
        padding: '0 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '11px',
        color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)',
        backgroundColor: bgColor,
        zIndex: 50,
        fontWeight: 600,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Wifi size={12} color={isSyncing ? accent : textColor} />
          <span style={{ letterSpacing: '0.06em', fontSize: '10px' }}>MEMWAULT</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {batteryLevel !== null && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: '10px' }}>{batteryLevel}%</span>
              <Battery size={13} color={batteryLevel < 20 ? '#A20025' : textColor} />
            </div>
          )}
          <span>{currentTime}</span>
        </div>
      </div>

      {/* ── Metro App Header & Horizontal Pivot Tabs ─────────── */}
      <div style={{ padding: '8px 16px 2px 16px', backgroundColor: bgColor }}>
        <div style={{
          fontSize: '11px',
          fontWeight: 700,
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          color: accent,
          marginBottom: '2px',
        }}>
          MEMWAULT
        </div>

        {/* Horizontal Pivot Headers with Metro Typography */}
        <div style={{
          display: 'flex',
          gap: '22px',
          overflowX: 'auto',
          scrollbarWidth: 'none',
          whiteSpace: 'nowrap',
          paddingBottom: '4px',
          alignItems: 'baseline',
        }}>
          {pivotList.map(tab => (
            <button
              key={tab.id}
              onClick={() => { triggerSound(); setActivePivot(tab.id); setSelectedStory(null); setSelectedPostIndex(null); }}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                color: textColor,
                fontFamily: '"Segoe UI Light", "Segoe UI", sans-serif',
                fontSize: '34px',
                fontWeight: 200,
                lineHeight: 1.1,
                cursor: 'pointer',
                opacity: activePivot === tab.id ? 1 : 0.3,
                transition: 'opacity 0.2s ease, transform 0.2s ease',
                transform: activePivot === tab.id ? 'scale(1)' : 'scale(0.96)',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Metro Indeterminate Sync Progress Bar ───────────── */}
      {isSyncing && (
        <div style={{ position: 'relative', width: '100%', height: '4px', overflow: 'hidden', backgroundColor: surfaceColor }}>
          <motion.div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              height: '100%',
              backgroundColor: accent,
              width: `${syncProgress.percent || 35}%`,
            }}
            transition={{ duration: 0.3 }}
          />
        </div>
      )}

      {/* ── Main Viewport (Animated Pivot Pages) ─────────────── */}
      <AnimatePresence mode="wait">
        <motion.div 
          key={activePivot}
          initial={{ opacity: 0, x: 18 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -18 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          onTouchStart={handleViewportTouchStart}
          onTouchEnd={handleViewportTouchEnd}
          style={{ flex: 1, padding: '12px 16px', overflowY: 'auto' }}
        >

          {/* ══════════════════════════════════════════════════════
              PIVOT 1: START SCREEN (AUTHENTIC LUMIA LIVE TILE GRID)
             ══════════════════════════════════════════════════════ */}
          {activePivot === 'start' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              
              {/* Customize Mode Bar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ fontSize: '11px', color: subTextColor, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>
                  {customizeTilesMode ? 'CUSTOMIZE TILES (MOVE ▲▼ & RESIZE ⤢)' : 'PINNED LIVE TILES'}
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {customizeTilesMode && (
                    <button
                      onClick={resetTileLayout}
                      style={{
                        backgroundColor: 'transparent',
                        color: textColor,
                        border: `1px solid ${borderColor}`,
                        padding: '4px 8px',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Reset Layout
                    </button>
                  )}
                  <button
                    onClick={() => { triggerSound(); setCustomizeTilesMode(!customizeTilesMode); }}
                    style={{
                      backgroundColor: customizeTilesMode ? accent : surfaceColor,
                      color: customizeTilesMode ? '#FFFFFF' : textColor,
                      border: `1px solid ${borderColor}`,
                      padding: '4px 10px',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Sliders size={12} />
                    <span>{customizeTilesMode ? 'Done ✓' : 'Customize Tiles'}</span>
                  </button>
                </div>
              </div>

              {/* Responsive 4-Column Reorderable Live Tiles Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '10px',
                width: '100%',
              }}>
                {tileOrder.map((tileKey, orderIdx) => {
                  const size = tileSizes[tileKey] || 'medium';
                  const isSmall = size === 'small';
                  const isWide = size === 'wide';
                  const gridSpan = isWide ? 'span 4' : (isSmall ? 'span 1' : 'span 2');
                  const height = isWide ? '140px' : 'auto';
                  const aspectRatio = !isWide ? '1/1' : 'unset';

                  // Move controls for customize mode
                  const moveControls = customizeTilesMode && (
                    <>
                      {orderIdx > 0 && (
                        <button
                          onClick={(e) => moveTile(tileKey, 'up', e)}
                          title="Move earlier"
                          style={{ position: 'absolute', top: '4px', left: '4px', backgroundColor: 'rgba(0,0,0,0.85)', color: '#FFF', border: '1px solid rgba(255,255,255,0.7)', width: '22px', height: '22px', borderRadius: '50%', fontSize: '10px', cursor: 'pointer', zIndex: 35, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          ▲
                        </button>
                      )}
                      {orderIdx < tileOrder.length - 1 && (
                        <button
                          onClick={(e) => moveTile(tileKey, 'down', e)}
                          title="Move later"
                          style={{ position: 'absolute', top: '4px', right: isSmall ? '4px' : '30px', backgroundColor: 'rgba(0,0,0,0.85)', color: '#FFF', border: '1px solid rgba(255,255,255,0.7)', width: '22px', height: '22px', borderRadius: '50%', fontSize: '10px', cursor: 'pointer', zIndex: 35, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          ▼
                        </button>
                      )}
                      <button
                        onClick={(e) => cycleTileSize(tileKey, e)}
                        title="Resize"
                        style={{ position: 'absolute', bottom: '4px', right: '4px', backgroundColor: 'rgba(0,0,0,0.85)', color: '#FFF', border: '1px solid rgba(255,255,255,0.7)', width: '22px', height: '22px', borderRadius: '50%', fontSize: '11px', cursor: 'pointer', zIndex: 35, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        ⤢
                      </button>
                    </>
                  );

                  // ── 1. ON THIS DAY FLASHBACK TILE ──
                  if (tileKey === 'onThisDay') {
                    return (
                      <motion.div
                        key="onThisDay"
                        whileTap={{ scale: 0.97 }}
                        onContextMenu={(e) => { e.preventDefault(); setCustomizeTilesMode(true); }}
                        onTouchStart={(e) => handleTileTouchStart('onThisDay', e)}
                        onTouchEnd={(e) => handleTileTouchEnd('onThisDay', e)}
                        onClick={(e) => handleTileClick('onThisDay', () => {
                          if (currentFlashback) openStoryView(currentFlashback);
                          else navigateToPivot('memories');
                        }, e)}
                        style={{
                          gridColumn: gridSpan,
                          height: height,
                          aspectRatio: aspectRatio,
                          backgroundColor: accent,
                          position: 'relative',
                          cursor: 'pointer',
                          perspective: '1000px',
                          overflow: 'hidden',
                          outline: customizeTilesMode ? `2px dashed #FFF` : 'none',
                        }}
                      >
                        <motion.div
                          animate={{ rotateX: ((enableLiveFlip && flipToday) || tileFlips.onThisDay) ? 180 : 0 }}
                          transition={{ duration: 0.65, ease: [0.4, 0.0, 0.2, 1] }}
                          style={{ width: '100%', height: '100%', transformStyle: 'preserve-3d', position: 'relative' }}
                        >
                          {/* Front Face */}
                          <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', display: 'flex', backgroundColor: accent, color: '#FFFFFF' }}>
                            {isSmall ? (
                              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                                <Calendar size={34} color="#FFF" strokeWidth={1.8} />
                                <span style={{ position: 'absolute', bottom: '4px', right: '6px', fontSize: '11px', fontWeight: 800 }}>
                                  {flashbacks.length}
                                </span>
                              </div>
                            ) : (
                              <>
                                {currentFlashback && (
                                  <div style={{ width: isWide ? '40%' : '50%', height: '100%', backgroundColor: '#000', position: 'relative' }}>
                                    <OfflineMedia
                                      src={getMediaUrl(currentFlashback)}
                                      type={currentFlashback.media_type === 2 ? 'video' : 'image'}
                                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                      alt="Flashback"
                                    />
                                    {(currentFlashback.media_type === 2 || currentFlashback.is_reel) && (
                                      <div style={{ position: 'absolute', bottom: '4px', right: '4px', backgroundColor: 'rgba(0,0,0,0.6)', padding: '2px 4px', borderRadius: '2px' }}>
                                        <Film size={10} color="#FFF" />
                                      </div>
                                    )}
                                  </div>
                                )}
                                <div style={{ flex: 1, padding: '10px 12px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minWidth: 0 }}>
                                  <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                                      <div style={{ display: 'inline-block', backgroundColor: 'rgba(0,0,0,0.4)', padding: '2px 6px', fontSize: '9px', fontWeight: 800, letterSpacing: '0.08em' }}>
                                        {currentFlashback?.badgeText || 'ON THIS DAY'}
                                      </div>
                                      {(currentFlashback?.is_close_friends || currentFlashback?.audience === 'close_friends') && (
                                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', backgroundColor: '#00D26A', color: '#FFFFFF', padding: '2px 4px', borderRadius: '2px', fontSize: '8px', fontWeight: 800 }}>
                                          <Star size={7} fill="#FFFFFF" color="#FFFFFF" />
                                          <span>CF</span>
                                        </div>
                                      )}
                                    </div>
                                    <div style={{ fontSize: '14px', fontWeight: 300, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                      {currentFlashback?.location_name || (currentFlashback?.taken_at ? new Date(currentFlashback.taken_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'MemWault Vault')}
                                    </div>
                                  </div>
                                  <div style={{ fontSize: '10px', opacity: 0.9, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                                    {currentFlashback?.relativeLabel || currentFlashback?.caption_text || 'Relive your archived memories.'}
                                  </div>
                                </div>
                              </>
                            )}
                          </div>

                          {/* Back Face */}
                          <div style={{
                            position: 'absolute',
                            inset: 0,
                            backfaceVisibility: 'hidden',
                            transform: 'rotateX(180deg)',
                            backgroundColor: surfaceColor,
                            color: textColor,
                            padding: isSmall ? '6px' : '12px',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            borderLeft: `4px solid ${accent}`,
                          }}>
                            {isSmall ? (
                              <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                <Sparkles size={24} color={accent} />
                                <span style={{ fontSize: '9px', fontWeight: 700, marginTop: '2px' }}>today</span>
                              </div>
                            ) : (
                              <>
                                <div>
                                  <div style={{ fontSize: '10px', color: accent, fontWeight: 700, letterSpacing: '0.05em' }}>
                                    {currentFlashback?.badgeText || 'ANNIVERSARY FLASHBACK'}
                                  </div>
                                  <div style={{ fontSize: '12px', marginTop: '4px', lineHeight: 1.3, fontWeight: 300 }}>
                                    {currentFlashback?.journal_note || currentFlashback?.caption_text || 'Tap to inspect memory details & soundtrack.'}
                                  </div>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10px', opacity: 0.7 }}>
                                  <span>{flashbacks.length} throwback memories</span>
                                  <span>swipe to flip</span>
                                </div>
                              </>
                            )}
                          </div>
                        </motion.div>
                        {moveControls}
                      </motion.div>
                    );
                  }

                  // ── 2. PHOTOS HUB TILE ──
                  if (tileKey === 'photos') {
                    const mediaPool = stories.length > 0 ? stories : (highlights.length > 0 ? highlights : posts);
                    return (
                      <motion.div
                        key="photos"
                        whileTap={{ scale: 0.97 }}
                        onContextMenu={(e) => { e.preventDefault(); setCustomizeTilesMode(true); }}
                        onTouchStart={(e) => handleTileTouchStart('photos', e)}
                        onTouchEnd={(e) => handleTileTouchEnd('photos', e)}
                        onClick={(e) => handleTileClick('photos', () => navigateToPivot('memories'), e)}
                        style={{
                          gridColumn: gridSpan,
                          height: height,
                          aspectRatio: aspectRatio,
                          backgroundColor: accent,
                          position: 'relative',
                          cursor: 'pointer',
                          perspective: '1000px',
                          overflow: 'hidden',
                          outline: customizeTilesMode ? `2px dashed #FFF` : 'none',
                        }}
                      >
                        <motion.div
                          animate={{ rotateY: tileFlips.photos ? 180 : 0 }}
                          transition={{ duration: 0.65, ease: [0.4, 0.0, 0.2, 1] }}
                          style={{ width: '100%', height: '100%', transformStyle: 'preserve-3d', position: 'relative' }}
                        >
                          {/* Front Face */}
                          <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', width: '100%', height: '100%' }}>
                            {isSmall ? (
                              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', color: '#FFF' }}>
                                <ImageIcon size={34} color="#FFF" strokeWidth={1.8} />
                                <span style={{ position: 'absolute', bottom: '4px', right: '6px', fontSize: '11px', fontWeight: 800 }}>
                                  {stories.length || mediaPool.length}
                                </span>
                              </div>
                            ) : mediaPool.length > 0 ? (
                              <div style={{
                                display: 'grid',
                                gridTemplateColumns: isWide ? 'repeat(4, 1fr)' : '1fr 1fr',
                                gridTemplateRows: isWide ? '1fr' : '1fr 1fr',
                                width: '100%',
                                height: '100%',
                                gap: '2px',
                                backgroundColor: '#000',
                              }}>
                                {[0, 1, 2, 3].map(cellIdx => {
                                  const s = mediaPool[photoSubTileIndices[cellIdx] % mediaPool.length];
                                  const sNext = mediaPool[(photoSubTileIndices[cellIdx] + 1) % mediaPool.length];
                                  const isFlipped = photoSubTileFlips[cellIdx];
                                  return (
                                    <div key={cellIdx} style={{ width: '100%', height: '100%', perspective: '600px', overflow: 'hidden', position: 'relative' }}>
                                      <motion.div
                                        animate={{ rotateY: isFlipped ? 180 : 0 }}
                                        transition={{ duration: 0.6, ease: 'easeInOut' }}
                                        style={{ width: '100%', height: '100%', transformStyle: 'preserve-3d' }}
                                      >
                                        <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden' }}>
                                          <OfflineMedia src={getMediaUrl(s)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Cell" />
                                        </div>
                                        <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
                                          <OfflineMedia src={getMediaUrl(sNext)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Cell Back" />
                                        </div>
                                      </motion.div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div style={{ padding: '12px', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', color: '#FFF' }}>
                                <ImageIcon size={26} />
                                <div>
                                  <div style={{ fontSize: '11px', fontWeight: 400 }}>memories</div>
                                  <div style={{ fontSize: '24px', fontWeight: 200, lineHeight: 1 }}>{stories.length}</div>
                                </div>
                              </div>
                            )}

                            {!isSmall && (
                              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.7)', padding: '4px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#FFF', fontSize: '10px', fontWeight: 600 }}>
                                <span>photos hub</span>
                                <span>{stories.length}</span>
                              </div>
                            )}
                          </div>

                          {/* Back Face */}
                          <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', backgroundColor: surfaceColor, color: textColor, padding: isSmall ? '6px' : '12px', display: 'flex', flexDirection: 'column', justifyContent: isSmall ? 'center' : 'space-between', borderLeft: `4px solid ${accent}` }}>
                            {isSmall ? (
                              <div style={{ textAlign: 'center', fontSize: '10px', fontWeight: 700, color: accent }}>
                                PHOTOS
                              </div>
                            ) : (
                              <>
                                <div style={{ fontSize: '11px', color: accent, fontWeight: 700 }}>photos hub</div>
                                <div style={{ fontSize: '12px', lineHeight: 1.3 }}>{stories.length} stories • {flashbacks.length} flashbacks</div>
                                <div style={{ fontSize: '10px', opacity: 0.7 }}>swipe to flip</div>
                              </>
                            )}
                          </div>
                        </motion.div>
                        {moveControls}
                      </motion.div>
                    );
                  }

                  // ── 3. HIGHLIGHTS HUB TILE ──
                  if (tileKey === 'highlights') {
                    return (
                      <motion.div
                        key="highlights"
                        whileTap={{ scale: 0.97 }}
                        onContextMenu={(e) => { e.preventDefault(); setCustomizeTilesMode(true); }}
                        onTouchStart={(e) => handleTileTouchStart('highlights', e)}
                        onTouchEnd={(e) => handleTileTouchEnd('highlights', e)}
                        onClick={(e) => handleTileClick('highlights', () => navigateToPivot('highlights'), e)}
                        style={{
                          gridColumn: gridSpan,
                          height: height,
                          aspectRatio: aspectRatio,
                          backgroundColor: '#FA6800',
                          position: 'relative',
                          cursor: 'pointer',
                          perspective: '1000px',
                          overflow: 'hidden',
                          outline: customizeTilesMode ? `2px dashed #FFF` : 'none',
                        }}
                      >
                        <motion.div
                          animate={{ rotateY: ((enableLiveFlip && flipHighlights) || tileFlips.highlights) ? 180 : 0 }}
                          transition={{ duration: 0.65, ease: [0.4, 0.0, 0.2, 1] }}
                          style={{ width: '100%', height: '100%', transformStyle: 'preserve-3d', position: 'relative' }}
                        >
                          {/* Front Face */}
                          <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', padding: isSmall ? '8px' : '12px', display: 'flex', flexDirection: 'column', justifyContent: isSmall ? 'center' : 'space-between', alignItems: isSmall ? 'center' : 'flex-start', backgroundColor: '#FA6800', color: '#FFFFFF' }}>
                            <Sparkles size={isSmall ? 34 : 26} color="#FFF" strokeWidth={1.8} />
                            {isSmall ? (
                              <span style={{ position: 'absolute', bottom: '4px', right: '6px', fontSize: '11px', fontWeight: 800 }}>
                                {highlights.length}
                              </span>
                            ) : (
                              <div>
                                <div style={{ fontSize: '11px', fontWeight: 400 }}>highlights</div>
                                <div style={{ fontSize: '24px', fontWeight: 200, lineHeight: 1 }}>{highlights.length || '0'}</div>
                              </div>
                            )}
                          </div>

                          {/* Back Face */}
                          <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', backgroundColor: surfaceColor, color: textColor, padding: isSmall ? '6px' : '12px', display: 'flex', flexDirection: 'column', justifyContent: isSmall ? 'center' : 'space-between', alignItems: isSmall ? 'center' : 'flex-start', borderLeft: `4px solid #FA6800` }}>
                            {isSmall ? (
                              <div style={{ textAlign: 'center', fontSize: '10px', fontWeight: 700, color: '#FA6800' }}>
                                REELS
                              </div>
                            ) : (
                              <>
                                <div style={{ fontSize: '11px', color: '#FA6800', fontWeight: 700 }}>story reels</div>
                                <div style={{ fontSize: '12px', lineHeight: 1.3 }}>{highlights.length} curated reels with music</div>
                                <div style={{ fontSize: '10px', opacity: 0.7 }}>swipe to flip</div>
                              </>
                            )}
                          </div>
                        </motion.div>
                        {moveControls}
                      </motion.div>
                    );
                  }

                  // ── 4. FEED POSTS TILE ──
                  if (tileKey === 'feed') {
                    return (
                      <motion.div
                        key="feed"
                        whileTap={{ scale: 0.97 }}
                        onContextMenu={(e) => { e.preventDefault(); setCustomizeTilesMode(true); }}
                        onTouchStart={(e) => handleTileTouchStart('feed', e)}
                        onTouchEnd={(e) => handleTileTouchEnd('feed', e)}
                        onClick={(e) => handleTileClick('feed', () => navigateToPivot('feed'), e)}
                        style={{
                          gridColumn: gridSpan,
                          height: height,
                          aspectRatio: aspectRatio,
                          backgroundColor: '#D80073',
                          position: 'relative',
                          cursor: 'pointer',
                          perspective: '1000px',
                          overflow: 'hidden',
                          outline: customizeTilesMode ? `2px dashed #FFF` : 'none',
                        }}
                      >
                        <motion.div
                          animate={{ rotateY: ((enableLiveFlip && flipFeed) || tileFlips.feed) ? 180 : 0 }}
                          transition={{ duration: 0.65, ease: [0.4, 0.0, 0.2, 1] }}
                          style={{ width: '100%', height: '100%', transformStyle: 'preserve-3d', position: 'relative' }}
                        >
                          {/* Front Face */}
                          <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', padding: isSmall ? '8px' : '12px', display: 'flex', flexDirection: 'column', justifyContent: isSmall ? 'center' : 'space-between', alignItems: isSmall ? 'center' : 'flex-start', backgroundColor: '#D80073', color: '#FFFFFF' }}>
                            <Film size={isSmall ? 34 : 26} color="#FFF" strokeWidth={1.8} />
                            {isSmall ? (
                              <span style={{ position: 'absolute', bottom: '4px', right: '6px', fontSize: '11px', fontWeight: 800 }}>
                                {posts.length}
                              </span>
                            ) : (
                              <div>
                                <div style={{ fontSize: '11px', fontWeight: 400 }}>feed posts</div>
                                <div style={{ fontSize: '24px', fontWeight: 200, lineHeight: 1 }}>{posts.length}</div>
                              </div>
                            )}
                          </div>

                          {/* Back Face */}
                          <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', backgroundColor: surfaceColor, color: textColor, padding: isSmall ? '6px' : '12px', display: 'flex', flexDirection: 'column', justifyContent: isSmall ? 'center' : 'space-between', alignItems: isSmall ? 'center' : 'flex-start', borderLeft: `4px solid #D80073` }}>
                            {isSmall ? (
                              <div style={{ textAlign: 'center', fontSize: '10px', fontWeight: 700, color: '#D80073' }}>
                                FEED
                              </div>
                            ) : (
                              <>
                                <div style={{ fontSize: '11px', color: '#D80073', fontWeight: 700 }}>instagram carousels</div>
                                <div style={{ fontSize: '11px', lineHeight: 1.3 }}>@{igSession?.ig_username || 'vault'} • {posts.length} posts</div>
                                <div style={{ fontSize: '10px', opacity: 0.7 }}>swipe to flip</div>
                              </>
                            )}
                          </div>
                        </motion.div>
                        {moveControls}
                      </motion.div>
                    );
                  }

                  // ── 5. JOURNAL & SCRAPBOOK TILE ──
                  if (tileKey === 'journal') {
                    return (
                      <motion.div
                        key="journal"
                        whileTap={{ scale: 0.97 }}
                        onContextMenu={(e) => { e.preventDefault(); setCustomizeTilesMode(true); }}
                        onTouchStart={(e) => handleTileTouchStart('journal', e)}
                        onTouchEnd={(e) => handleTileTouchEnd('journal', e)}
                        onClick={(e) => handleTileClick('journal', () => navigateToPivot('journal'), e)}
                        style={{
                          gridColumn: gridSpan,
                          height: height,
                          aspectRatio: aspectRatio,
                          backgroundColor: '#008A00',
                          color: '#FFFFFF',
                          position: 'relative',
                          cursor: 'pointer',
                          perspective: '1000px',
                          overflow: 'hidden',
                          outline: customizeTilesMode ? `2px dashed #FFF` : 'none',
                        }}
                      >
                        <motion.div
                          animate={{ rotateY: ((enableLiveFlip && flipJournal) || tileFlips.journal) ? 180 : 0 }}
                          transition={{ duration: 0.65, ease: [0.4, 0.0, 0.2, 1] }}
                          style={{ width: '100%', height: '100%', transformStyle: 'preserve-3d', position: 'relative' }}
                        >
                          {/* Front Face */}
                          <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', padding: isSmall ? '8px' : '12px', display: 'flex', flexDirection: 'column', justifyContent: isSmall ? 'center' : 'space-between', alignItems: isSmall ? 'center' : 'flex-start', backgroundColor: '#008A00', color: '#FFFFFF' }}>
                            <BookOpen size={isSmall ? 34 : 26} color="#FFF" strokeWidth={1.8} />
                            {isSmall ? (
                              <span style={{ position: 'absolute', bottom: '4px', right: '6px', fontSize: '11px', fontWeight: 800 }}>
                                {journaledItems.length + places.length}
                              </span>
                            ) : (
                              <div>
                                <div style={{ fontSize: '11px', fontWeight: 400 }}>journal & bucket</div>
                                <div style={{ fontSize: '24px', fontWeight: 200, lineHeight: 1 }}>{journaledItems.length + places.length}</div>
                              </div>
                            )}
                          </div>

                          {/* Back Face */}
                          <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', backgroundColor: surfaceColor, color: textColor, padding: isSmall ? '6px' : '12px', display: 'flex', flexDirection: 'column', justifyContent: isSmall ? 'center' : 'space-between', alignItems: isSmall ? 'center' : 'flex-start', borderLeft: `4px solid #008A00` }}>
                            {isSmall ? (
                              <div style={{ textAlign: 'center', fontSize: '10px', fontWeight: 700, color: '#008A00' }}>
                                NOTES
                              </div>
                            ) : (
                              <>
                                <div style={{ fontSize: '11px', color: '#008A00', fontWeight: 700 }}>scrapbook hub</div>
                                <div style={{ fontSize: '11px', lineHeight: 1.3 }}>{journaledItems.length} journal notes • {places.length} places</div>
                                <div style={{ fontSize: '10px', opacity: 0.7 }}>swipe to flip</div>
                              </>
                            )}
                          </div>
                        </motion.div>
                        {moveControls}
                      </motion.div>
                    );
                  }

                  // ── 6. PLACES TO VISIT TILE ──
                  if (tileKey === 'places') {
                    return (
                      <motion.div
                        key="places"
                        whileTap={{ scale: 0.97 }}
                        onContextMenu={(e) => { e.preventDefault(); setCustomizeTilesMode(true); }}
                        onTouchStart={(e) => handleTileTouchStart('places', e)}
                        onTouchEnd={(e) => handleTileTouchEnd('places', e)}
                        onClick={(e) => handleTileClick('places', () => {
                          setJournalSubTab('visited');
                          navigateToPivot('journal');
                        }, e)}
                        style={{
                          gridColumn: gridSpan,
                          height: height,
                          aspectRatio: aspectRatio,
                          backgroundColor: '#0050EF',
                          color: '#FFFFFF',
                          position: 'relative',
                          cursor: 'pointer',
                          perspective: '1000px',
                          overflow: 'hidden',
                          outline: customizeTilesMode ? `2px dashed #FFF` : 'none',
                        }}
                      >
                        <motion.div
                          animate={{ rotateY: tileFlips.places ? 180 : 0 }}
                          transition={{ duration: 0.65, ease: [0.4, 0.0, 0.2, 1] }}
                          style={{ width: '100%', height: '100%', transformStyle: 'preserve-3d', position: 'relative' }}
                        >
                          {/* Front Face */}
                          <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', padding: isSmall ? '8px' : '12px', display: 'flex', flexDirection: 'column', justifyContent: isSmall ? 'center' : 'space-between', alignItems: isSmall ? 'center' : 'flex-start', backgroundColor: '#0050EF', color: '#FFFFFF', boxSizing: 'border-box' }}>
                            <MapPin size={isSmall ? 34 : 26} color="#FFF" strokeWidth={1.8} />
                            {isSmall ? (
                              <span style={{ position: 'absolute', bottom: '4px', right: '6px', fontSize: '11px', fontWeight: 800 }}>
                                {visitedLocations.length + places.length}
                              </span>
                            ) : (
                              <div>
                                <div style={{ fontSize: '11px', fontWeight: 400 }}>places & visited</div>
                                <div style={{ fontSize: '24px', fontWeight: 200, lineHeight: 1 }}>{visitedLocations.length + places.length}</div>
                              </div>
                            )}
                          </div>

                          {/* Back Face */}
                          <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', backgroundColor: surfaceColor, color: textColor, padding: isSmall ? '6px' : '12px', display: 'flex', flexDirection: 'column', justifyContent: isSmall ? 'center' : 'space-between', alignItems: isSmall ? 'center' : 'flex-start', borderLeft: `4px solid #0050EF` }}>
                            {isSmall ? (
                              <div style={{ textAlign: 'center', fontSize: '10px', fontWeight: 700, color: '#0050EF' }}>
                                PLACES
                              </div>
                            ) : (
                              <>
                                <div style={{ fontSize: '11px', color: '#0050EF', fontWeight: 700 }}>places & travel</div>
                                <div style={{ fontSize: '12px', lineHeight: 1.3 }}>{visitedLocations.length} visited • {places.filter(p => !p.completed).length} to visit</div>
                                <div style={{ fontSize: '10px', opacity: 0.7 }}>swipe to flip</div>
                              </>
                            )}
                          </div>
                        </motion.div>
                        {moveControls}
                      </motion.div>
                    );
                  }

                  // ── 7. VAULT LIVE CAMERA TILE ──
                  if (tileKey === 'camera') {
                    return (
                      <motion.div
                        key="camera"
                        whileTap={{ scale: 0.97 }}
                        onContextMenu={(e) => { e.preventDefault(); setCustomizeTilesMode(true); }}
                        onTouchStart={(e) => handleTileTouchStart('camera', e)}
                        onTouchEnd={(e) => handleTileTouchEnd('camera', e)}
                        onClick={(e) => handleTileClick('camera', handleStartCamera, e)}
                        style={{
                          gridColumn: gridSpan,
                          height: height,
                          aspectRatio: aspectRatio,
                          backgroundColor: '#F09609',
                          color: '#FFFFFF',
                          position: 'relative',
                          cursor: 'pointer',
                          perspective: '1000px',
                          overflow: 'hidden',
                          outline: customizeTilesMode ? `2px dashed #FFF` : 'none',
                        }}
                      >
                        <motion.div
                          animate={{ rotateY: tileFlips.camera ? 180 : 0 }}
                          transition={{ duration: 0.65, ease: [0.4, 0.0, 0.2, 1] }}
                          style={{ width: '100%', height: '100%', transformStyle: 'preserve-3d', position: 'relative' }}
                        >
                          {/* Front Face */}
                          <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', padding: isSmall ? '8px' : '12px', display: 'flex', flexDirection: 'column', justifyContent: isSmall ? 'center' : 'space-between', alignItems: isSmall ? 'center' : 'flex-start', backgroundColor: '#F09609', color: '#FFFFFF', boxSizing: 'border-box' }}>
                            <Camera size={isSmall ? 36 : 26} color="#FFF" strokeWidth={1.8} />
                            {isSmall ? (
                              <span style={{ position: 'absolute', bottom: '4px', left: 0, right: 0, textAlign: 'center', fontSize: '8px', fontWeight: 800, letterSpacing: '0.08em' }}>
                                CAMERA
                              </span>
                            ) : (
                              <div>
                                <div style={{ fontSize: '11px', fontWeight: 400 }}>vault camera</div>
                                <div style={{ fontSize: '12px', opacity: 0.9 }}>+ take live photo</div>
                              </div>
                            )}
                          </div>

                          {/* Back Face */}
                          <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', backgroundColor: surfaceColor, color: textColor, padding: isSmall ? '6px' : '12px', display: 'flex', flexDirection: 'column', justifyContent: isSmall ? 'center' : 'space-between', alignItems: isSmall ? 'center' : 'flex-start', borderLeft: `4px solid #F09609` }}>
                            {isSmall ? (
                              <div style={{ textAlign: 'center', fontSize: '10px', fontWeight: 700, color: '#F09609' }}>
                                PRO CAM
                              </div>
                            ) : (
                              <>
                                <div style={{ fontSize: '11px', color: '#F09609', fontWeight: 700 }}>lumia camera</div>
                                <div style={{ fontSize: '12px', lineHeight: 1.3 }}>Instant vault snapshot studio</div>
                                <div style={{ fontSize: '10px', opacity: 0.7 }}>swipe to flip</div>
                              </>
                            )}
                          </div>
                        </motion.div>
                        {moveControls}
                      </motion.div>
                    );
                  }

                  // ── 8. SETTINGS & STORAGE SENSE TILE ──
                  if (tileKey === 'settings') {
                    return (
                      <motion.div
                        key="settings"
                        whileTap={{ scale: 0.97 }}
                        onContextMenu={(e) => { e.preventDefault(); setCustomizeTilesMode(true); }}
                        onTouchStart={(e) => handleTileTouchStart('settings', e)}
                        onTouchEnd={(e) => handleTileTouchEnd('settings', e)}
                        onClick={(e) => handleTileClick('settings', () => navigateToPivot('settings'), e)}
                        style={{
                          gridColumn: gridSpan,
                          height: height,
                          aspectRatio: aspectRatio,
                          backgroundColor: surfaceColor,
                          borderLeft: `4px solid ${accent}`,
                          position: 'relative',
                          cursor: 'pointer',
                          perspective: '1000px',
                          overflow: 'hidden',
                          outline: customizeTilesMode ? `2px dashed #FFF` : 'none',
                        }}
                      >
                        <motion.div
                          animate={{ rotateY: tileFlips.settings ? 180 : 0 }}
                          transition={{ duration: 0.65, ease: [0.4, 0.0, 0.2, 1] }}
                          style={{ width: '100%', height: '100%', transformStyle: 'preserve-3d', position: 'relative' }}
                        >
                          {/* Front Face */}
                          <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', padding: isSmall ? '8px' : '12px', display: 'flex', flexDirection: 'column', justifyContent: isSmall ? 'center' : 'space-between', alignItems: isSmall ? 'center' : 'flex-start', backgroundColor: surfaceColor, color: textColor, boxSizing: 'border-box' }}>
                            <SettingsIcon size={isSmall ? 36 : 26} color={accent} strokeWidth={1.8} />
                            {isSmall ? (
                              <span style={{ position: 'absolute', bottom: '4px', left: 0, right: 0, textAlign: 'center', fontSize: '8px', fontWeight: 800, letterSpacing: '0.08em', color: subTextColor }}>
                                SETTINGS
                              </span>
                            ) : (
                              <div>
                                <div style={{ fontSize: '11px', fontWeight: 600 }}>settings</div>
                                <div style={{ fontSize: '10px', color: subTextColor }}>{stats.storageMb} MB offline</div>
                              </div>
                            )}
                          </div>

                          {/* Back Face */}
                          <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', backgroundColor: surfaceColor, color: textColor, padding: isSmall ? '6px' : '12px', display: 'flex', flexDirection: 'column', justifyContent: isSmall ? 'center' : 'space-between', alignItems: isSmall ? 'center' : 'flex-start', borderLeft: `4px solid ${accent}` }}>
                            {isSmall ? (
                              <div style={{ textAlign: 'center', fontSize: '10px', fontWeight: 700, color: accent }}>
                                SYSTEM
                              </div>
                            ) : (
                              <>
                                <div style={{ fontSize: '11px', color: accent, fontWeight: 700 }}>storage sense</div>
                                <div style={{ fontSize: '12px', lineHeight: 1.3 }}>ActiveSync • {stats.memoryCount} media blobs</div>
                                <div style={{ fontSize: '10px', opacity: 0.7 }}>swipe to flip</div>
                              </>
                            )}
                          </div>
                        </motion.div>
                        {moveControls}
                      </motion.div>
                    );
                  }

                  return null;
                })}
              </div>

              {/* Lumia All Apps Navigation Circle Button */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px', marginBottom: '8px' }}>
                <motion.button
                  whileTap={{ scale: 0.92 }}
                  onClick={() => { triggerSound(); setShowAllAppsModal(true); }}
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '50%',
                    border: `2px solid ${textColor}`,
                    backgroundColor: 'transparent',
                    color: textColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                  title="All Apps List"
                >
                  <ArrowRight size={20} />
                </motion.button>
              </div>

              {/* ActiveSync Status Bar */}
              <motion.div
                whileTap={{ scale: 0.98 }}
                onClick={() => { triggerSound(); handleRunSync(); }}
                style={{
                  width: '100%',
                  backgroundColor: surfaceColor,
                  borderLeft: `5px solid ${accent}`,
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  marginTop: '2px',
                }}
              >
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 400 }}>ActiveSync with Laptop</div>
                  <div style={{ fontSize: '11px', color: subTextColor, marginTop: '2px' }}>
                    {stats.pendingCount > 0 
                      ? `⚠️ ${stats.pendingCount} phone photos queued to sync` 
                      : (lastSyncTime ? `✓ Last synced: ${lastSyncTime}` : 'Tap to sync with laptop vault')}
                  </div>
                </div>
                <RefreshCw size={20} className={isSyncing ? 'spin-anim' : ''} color={accent} />
              </motion.div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════
              LUMIA ALL APPS DRAWER MODAL
             ══════════════════════════════════════════════════════ */}
          {showAllAppsModal && (
            <div style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: surfaceColor,
              zIndex: 100005,
              display: 'flex',
              flexDirection: 'column',
              padding: '18px 20px',
              overflowY: 'auto',
            }}>
              {/* Header & Search */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ fontSize: '28px', fontWeight: 200, letterSpacing: '-0.5px' }}>apps</div>
                <button
                  onClick={() => setShowAllAppsModal(false)}
                  style={{ background: 'none', border: 'none', color: textColor, cursor: 'pointer' }}
                >
                  <X size={24} />
                </button>
              </div>

              {/* Search Box */}
              <div style={{ position: 'relative', marginBottom: '20px' }}>
                <input
                  type="text"
                  placeholder="search apps..."
                  value={allAppsSearch}
                  onChange={(e) => setAllAppsSearch(e.target.value)}
                  style={{
                    width: '100%',
                    backgroundColor: cardColor,
                    border: `2px solid ${borderColor}`,
                    color: textColor,
                    padding: '10px 12px 10px 36px',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                <Search size={16} color={subTextColor} style={{ position: 'absolute', left: '12px', top: '12px' }} />
              </div>

              {/* Filtered Apps List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[
                  { id: 'archives', name: 'Archives & Timeline', letter: 'A', icon: Film, pivot: 'memories', desc: 'Browse full media timeline & year filter' },
                  { id: 'camera', name: 'Camera (Vault Studio)', letter: 'C', icon: Camera, action: 'camera', desc: 'Snap instant photos & attach to vault' },
                  { id: 'doodle', name: 'Doodle Studio (MS Paint)', letter: 'D', icon: Palette, action: 'doodle', desc: 'Draw sketches & handwritten notes' },
                  { id: 'feed', name: 'Feed & Carousels', letter: 'F', icon: Film, pivot: 'feed', desc: 'Multi-photo carousels & captions' },
                  { id: 'highlights', name: 'Highlights & Story Reels', letter: 'H', icon: Sparkles, pivot: 'highlights', desc: 'Curated story albums with soundtracks' },
                  { id: 'journal', name: 'Journal & Scrapbook', letter: 'J', icon: BookOpen, pivot: 'journal', desc: 'Rich memory entries, stickers & places' },
                  { id: 'map', name: 'Map & Travel Geotags', letter: 'M', icon: MapPin, pivot: 'journal', subTab: 'places', desc: 'Explore geotagged memories & destinations' },
                  { id: 'memories', name: 'Memories & Flashbacks', letter: 'M', icon: ImageIcon, pivot: 'memories', desc: 'Daily flashbacks, videos & photos' },
                  { id: 'music', name: 'Music Player & Vinyl', letter: 'M', icon: Music, action: 'music', desc: 'Integrated turntable vinyl player' },
                  { id: 'places', name: 'Places to Visit', letter: 'P', icon: Compass, pivot: 'journal', subTab: 'places', desc: 'Bucket list & destination tracker' },
                  { id: 'settings', name: 'Settings & Storage Sense', letter: 'S', icon: SettingsIcon, pivot: 'settings', desc: 'Manage offline storage & aesthetics' },
                  { id: 'sync', name: 'Sync Hub (ActiveSync)', letter: 'S', icon: RefreshCw, action: 'sync', desc: 'Wireless sync with laptop & IndexedDB' },
                ].filter(app => !allAppsSearch || app.name.toLowerCase().includes(allAppsSearch.toLowerCase())).map((app) => {
                  const IconComp = app.icon;
                  return (
                    <motion.div
                      key={app.id}
                      whileTap={{ scale: 0.98, backgroundColor: accent, color: '#FFF' }}
                      onClick={() => {
                        triggerSound();
                        setShowAllAppsModal(false);
                        if (app.action === 'camera') handleStartCamera();
                        else if (app.action === 'doodle') setPaintModalOpen(true);
                        else if (app.action === 'music') {
                          if (musicModalTrack) setMusicModalTrack(null);
                          else setMusicModalTrack(stories.find(s => s.music)?.music || { track_title: 'MemWault Soundtrack' });
                        }
                        else if (app.action === 'sync') handleRunSync();
                        else if (app.pivot) {
                          if (app.subTab) setJournalSubTab(app.subTab);
                          navigateToPivot(app.pivot);
                        }
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '14px',
                        padding: '10px 8px',
                        cursor: 'pointer',
                        borderBottom: `1px solid ${borderColor}`,
                      }}
                    >
                      <div style={{
                        width: '38px',
                        height: '38px',
                        backgroundColor: accent,
                        color: '#FFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        <IconComp size={20} />
                      </div>
                      <div>
                        <div style={{ fontSize: '15px', fontWeight: 400 }}>{app.name}</div>
                        <div style={{ fontSize: '11px', color: subTextColor }}>{app.desc}</div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════
              PIVOT 2: MEMORIES TIMELINE & FULLSCREEN INSPECTOR
             ══════════════════════════════════════════════════════ */}
          {activePivot === 'memories' && !selectedStory && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              
              {/* Dynamic Highlights Story Circles Bar */}
              {highlights.length > 0 && (
                <div style={{
                  display: 'flex',
                  gap: '14px',
                  overflowX: 'auto',
                  padding: '6px 2px 10px 2px',
                  scrollbarWidth: 'none',
                }}>
                  {highlights.map(hl => {
                    const coverUrl = hl.cover_media_url || (hl.preview_stories && hl.preview_stories[0]) || (hl.stories && hl.stories[0]?.media_url) || (stories[0]?.media_url);
                    return (
                      <motion.div
                        key={hl.id}
                        whileTap={{ scale: 0.92 }}
                        onClick={() => handleOpenHighlight(hl)}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '4px',
                          cursor: 'pointer',
                          flexShrink: 0,
                        }}
                      >
                        <div style={{
                          width: '58px',
                          height: '58px',
                          borderRadius: '50%',
                          padding: '2px',
                          background: `linear-gradient(45deg, ${accent}, #D80073, #F09609)`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                          <div style={{
                            width: '100%',
                            height: '100%',
                            borderRadius: '50%',
                            backgroundColor: bgColor,
                            padding: '2px',
                            overflow: 'hidden',
                          }}>
                            {coverUrl ? (
                              <OfflineMedia src={coverUrl} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} alt={hl.title} />
                            ) : (
                              <div style={{ width: '100%', height: '100%', backgroundColor: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF', fontWeight: 'bold', fontSize: '14px', borderRadius: '50%' }}>
                                {hl.title?.slice(0, 2).toUpperCase() || 'HL'}
                              </div>
                            )}
                          </div>
                        </div>
                        <div style={{ fontSize: '10px', maxWidth: '64px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'center' }}>
                          {hl.title}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}

              {/* Search Bar */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                backgroundColor: surfaceColor,
                padding: '8px 12px',
                borderBottom: `2px solid ${accent}`,
              }}>
                <Search size={16} color={subTextColor} style={{ marginRight: '8px' }} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="search memories, locations, songs..."
                  style={{
                    border: 'none',
                    outline: 'none',
                    background: 'transparent',
                    color: textColor,
                    width: '100%',
                    fontSize: '13px',
                    fontFamily: 'inherit',
                  }}
                />
                {searchQuery && (
                  <X size={14} color={subTextColor} style={{ cursor: 'pointer' }} onClick={() => setSearchQuery('')} />
                )}
              </div>

              {/* Filter Pills */}
              <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px', scrollbarWidth: 'none' }}>
                {[
                  { id: 'all', label: 'all' },
                  { id: 'photos', label: 'photos' },
                  { id: 'videos', label: 'videos' },
                  { id: 'cf', label: 'close friends', isCF: true },
                  { id: 'journaled', label: 'journaled' },
                  { id: 'music', label: 'soundtracks' },
                ].map(f => (
                  <button
                    key={f.id}
                    onClick={() => { triggerSound(); setFilterType(f.id); }}
                    style={{
                      backgroundColor: filterType === f.id ? (f.isCF ? '#00D26A' : accent) : surfaceColor,
                      color: filterType === f.id ? '#FFFFFF' : (f.isCF ? '#00D26A' : textColor),
                      border: f.isCF ? `1px solid #00D26A` : 'none',
                      padding: '6px 14px',
                      fontSize: '11px',
                      fontWeight: 600,
                      textTransform: 'lowercase',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    {f.isCF && <Star size={10} fill={filterType === f.id ? '#FFFFFF' : '#00D26A'} color={filterType === f.id ? '#FFFFFF' : '#00D26A'} />}
                    <span>{f.label}</span>
                  </button>
                ))}
              </div>

              {/* Memory Count */}
              <div style={{ fontSize: '11px', color: subTextColor, fontWeight: 600 }}>
                {filteredStories.length} {filteredStories.length === 1 ? 'MEMORY' : 'MEMORIES'} IN VAULT
              </div>

              {/* 3-Column Photos Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '4px',
              }}>
                {filteredStories.map(story => {
                  const track = story.music?.track_title || story.music_title;
                  const isCF = story.is_close_friends || story.audience === 'close_friends';
                  return (
                    <motion.div
                      key={story.id}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => { triggerSound(); setSelectedStory(story); setStoryDetailTab('info'); }}
                      style={{
                        aspectRatio: '9/16',
                        backgroundColor: '#111',
                        position: 'relative',
                        cursor: 'pointer',
                        overflow: 'hidden',
                        border: isCF ? '2px solid #00D26A' : 'none',
                        boxShadow: isCF ? '0 0 8px rgba(0, 210, 106, 0.3)' : 'none',
                        boxSizing: 'border-box',
                      }}
                    >
                      <OfflineMedia
                        src={story.media_url}
                        type={story.media_type === 2 ? 'video' : 'image'}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        alt="Memory"
                      />
                      
                      {/* Close Friends Emerald Badge (Top Left) */}
                      {isCF && (
                        <div style={{
                          position: 'absolute',
                          top: '4px',
                          left: '4px',
                          backgroundColor: '#00D26A',
                          color: '#FFFFFF',
                          fontSize: '8px',
                          fontWeight: 800,
                          padding: '2px 4px',
                          borderRadius: '2px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '2px',
                          boxShadow: '0 2px 6px rgba(0,210,106,0.4)',
                          zIndex: 3,
                        }}>
                          <Star size={8} fill="#FFFFFF" color="#FFFFFF" />
                          <span>CF</span>
                        </div>
                      )}

                      {story.journal_note && (
                        <div style={{
                          position: 'absolute',
                          top: '4px',
                          right: '4px',
                          backgroundColor: '#008A00',
                          color: '#ffffff',
                          fontSize: '8px',
                          fontWeight: 'bold',
                          padding: '2px 4px',
                        }}>
                          NOTE
                        </div>
                      )}
                      
                      {track && (
                        <div style={{
                          position: 'absolute',
                          bottom: '22px',
                          left: '4px',
                          backgroundColor: '#1DB954',
                          color: '#000000',
                          fontSize: '8px',
                          fontWeight: 'bold',
                          padding: '2px 4px',
                        }}>
                          ♫
                        </div>
                      )}

                      <div style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        background: 'linear-gradient(transparent, rgba(0,0,0,0.85))',
                        padding: '4px',
                        fontSize: '9px',
                        color: '#FFFFFF',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}>
                        {story.location_name || (story.taken_at ? new Date(story.taken_at).toLocaleDateString() : '')}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── MEMORY DETAIL VIEW (LUMIA INSPECTOR) ───────────── */}
          {activePivot === 'memories' && selectedStory && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button
                  onClick={() => { triggerSound(); setSelectedStory(null); }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'none',
                    border: 'none',
                    color: accent,
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  <ArrowLeft size={16} />
                  <span>back to memories</span>
                </button>

                {stories.length > 1 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      onClick={handlePrevMemoryStory}
                      title="Previous Memory"
                      style={{ backgroundColor: surfaceColor, border: `1px solid ${borderColor}`, color: textColor, padding: '4px 10px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                    >
                      ◀
                    </button>
                    <span style={{ fontSize: '11px', color: subTextColor, fontWeight: 600 }}>
                      {stories.findIndex(s => s.id === selectedStory.id) + 1} / {stories.length}
                    </span>
                    <button
                      onClick={handleNextMemoryStory}
                      title="Next Memory"
                      style={{ backgroundColor: surfaceColor, border: `1px solid ${borderColor}`, color: textColor, padding: '4px 10px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                    >
                      ▶
                    </button>
                  </div>
                )}
              </div>

              {/* Fullscreen Media Canvas with Touch Swipe Gestures */}
              <div 
                onTouchStart={handleMemoryTouchStart}
                onTouchEnd={handleMemoryTouchEnd}
                style={{
                  width: '100%',
                  backgroundColor: '#000000',
                  position: 'relative',
                  border: `1px solid ${accent}`,
                  overflow: 'hidden',
                  touchAction: 'pan-y',
                }}
              >
                <OfflineMedia
                  src={getMediaUrl(selectedStory)}
                  type={selectedStory.media_type === 2 ? 'video' : 'image'}
                  style={{ width: '100%', maxHeight: '55vh', objectFit: 'contain', display: 'block', margin: '0 auto' }}
                  controls={selectedStory.media_type === 2}
                  autoPlay={selectedStory.media_type === 2}
                  playsInline
                  alt="Detail"
                />
              </div>

              {/* Contextual Pivot Strip below Media Canvas */}
              <div style={{
                display: 'flex',
                borderBottom: `2px solid ${borderColor}`,
                gap: '12px',
                overflowX: 'auto',
                scrollbarWidth: 'none',
                paddingBottom: '2px',
              }}>
                {[
                  { id: 'info', label: 'INFO' },
                  { id: 'journal', label: 'JOURNAL' },
                  { id: 'music', label: 'MUSIC' },
                  { id: 'viewers', label: `VIEWERS (${storyViewersList.length || selectedStory.viewers_count || 0})` },
                  { id: 'data', label: 'DATA' },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => { triggerSound(); setStoryDetailTab(tab.id); }}
                    style={{
                      background: 'none',
                      border: 'none',
                      borderBottom: storyDetailTab === tab.id ? `3px solid ${accent}` : '3px solid transparent',
                      color: storyDetailTab === tab.id ? (isDark ? '#FFFFFF' : '#000000') : subTextColor,
                      padding: '6px 4px',
                      fontSize: '12px',
                      fontWeight: storyDetailTab === tab.id ? '700' : '400',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      letterSpacing: '0.5px',
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* ── TAB 1: INFO ── */}
              {storyDetailTab === 'info' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {/* Location & Map */}
                  <div style={{ backgroundColor: surfaceColor, padding: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontSize: '18px', fontWeight: 300 }}>
                          {selectedStory.location_name || 'Archived Story Memory'}
                        </div>
                        <div style={{ fontSize: '11px', color: subTextColor, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Calendar size={11} />
                          <span>{selectedStory.taken_at ? new Date(selectedStory.taken_at).toLocaleString() : 'Undated Memory'}</span>
                          {(selectedStory.is_close_friends || selectedStory.audience === 'close_friends') && (
                            <span style={{
                              backgroundColor: '#00D26A',
                              color: '#FFFFFF',
                              padding: '2px 6px',
                              borderRadius: '2px',
                              fontSize: '9px',
                              fontWeight: 800,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              letterSpacing: '0.04em'
                            }}>
                              <Star size={9} fill="#FFFFFF" color="#FFFFFF" />
                              <span>CLOSE FRIENDS</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {selectedStory.location_name && (
                        <a
                          href={`https://maps.google.com/?q=${encodeURIComponent(selectedStory.location_name)}`}
                          target="_blank"
                          rel="noreferrer"
                          style={{ backgroundColor: accent, color: '#FFF', padding: '4px 8px', fontSize: '10px', fontWeight: 'bold', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                          <MapPin size={10} /> Map ↗
                        </a>
                      )}
                    </div>

                    {selectedStory.caption_text && (
                      <div style={{ fontSize: '12px', marginTop: '8px', lineHeight: 1.4, borderTop: `1px solid ${borderColor}`, paddingTop: '6px' }}>
                        {selectedStory.caption_text}
                      </div>
                    )}
                  </div>

                  {/* 3-Tier Archival Metadata */}
                  <div style={{ backgroundColor: surfaceColor, padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '11px' }}>
                    <div style={{ fontWeight: 700, color: accent, letterSpacing: '0.5px' }}>ARCHIVE & METADATA</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: `1px solid ${borderColor}`, paddingBottom: '4px' }}>
                      <span style={{ color: subTextColor }}>Media Type:</span>
                      <span style={{ fontWeight: 600 }}>{selectedStory.media_type === 2 ? 'Video (MP4 / H.264)' : 'Photograph (JPEG / High Quality)'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: `1px solid ${borderColor}`, paddingBottom: '4px' }}>
                      <span style={{ color: subTextColor }}>Resolution:</span>
                      <span>{selectedStory.media_type === 2 ? '1080 × 1920 (9:16 Vertical Story)' : '1080 × 1920 HD'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: `1px solid ${borderColor}`, paddingBottom: '4px' }}>
                      <span style={{ color: subTextColor }}>Archive Integrity:</span>
                      <span style={{ color: '#008A00', fontWeight: 'bold' }}>✓ Verified Local IndexedDB Blob</span>
                    </div>
                    {selectedStory.story_id && (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: subTextColor }}>Story ID:</span>
                        <span style={{ fontFamily: 'monospace', fontSize: '10px' }}>{selectedStory.story_id}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── TAB 2: JOURNAL & SCRAPBOOK ── */}
              {storyDetailTab === 'journal' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{
                    backgroundColor: surfaceColor,
                    borderLeft: '4px solid #008A00',
                    padding: '12px',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: '#008A00' }}>
                        📓 JOURNAL NOTE & MEMORIES
                      </div>
                      {editingItemId !== selectedStory.id && (
                        <button
                          onClick={() => {
                            setEditingItemId(selectedStory.id);
                            setJournalDraft(selectedStory.journal_note || '');
                          }}
                          style={{ background: 'none', border: `1px solid ${borderColor}`, color: textColor, padding: '2px 8px', fontSize: '10px', cursor: 'pointer' }}
                        >
                          edit note
                        </button>
                      )}
                    </div>

                    {editingItemId === selectedStory.id ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <textarea
                          value={journalDraft}
                          onChange={(e) => setJournalDraft(e.target.value)}
                          placeholder="Write your thoughts about this memory..."
                          style={{
                            width: '100%',
                            minHeight: '80px',
                            backgroundColor: cardColor,
                            color: textColor,
                            border: `1px solid ${accent}`,
                            padding: '8px',
                            fontSize: '12px',
                            fontFamily: 'inherit',
                            outline: 'none',
                            boxSizing: 'border-box',
                          }}
                        />
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                          <button
                            onClick={() => setEditingItemId(null)}
                            style={{ background: 'none', border: `1px solid ${borderColor}`, color: textColor, padding: '4px 12px', fontSize: '11px', cursor: 'pointer' }}
                          >
                            cancel
                          </button>
                          <button
                            onClick={() => handleSaveInlineJournal(selectedStory.id, false)}
                            disabled={isSavingJournal}
                            style={{ backgroundColor: accent, border: 'none', color: '#FFF', padding: '4px 14px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
                          >
                            {isSavingJournal ? 'saving...' : 'save note'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ fontSize: '12px', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                        {selectedStory.journal_note || <span style={{ opacity: 0.5, fontStyle: 'italic' }}>No journal entry written yet. Tap edit note to record your thoughts.</span>}
                      </div>
                    )}

                    {/* Attached Stickers */}
                    {placedStickers.length > 0 && (
                      <div style={{ marginTop: '10px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {placedStickers.map(stk => (
                          <div
                            key={stk.id}
                            style={{
                              backgroundColor: stk.bg,
                              color: stk.darkText ? '#000' : '#FFF',
                              padding: '3px 8px',
                              fontSize: '10px',
                              fontWeight: 700,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <span>{stk.icon}</span>
                            <span>{stk.label}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Attached Doodle if present */}
                    {(() => {
                      let doodles = [];
                      try {
                        doodles = JSON.parse(localStorage.getItem(`memwault_doodles_${selectedStory.id}`) || '[]');
                      } catch (e) {}
                      if (!doodles || doodles.length === 0) return null;
                      return (
                        <div style={{ marginTop: '10px', backgroundColor: cardColor, padding: '8px', border: `1px solid ${borderColor}` }}>
                          <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#AA00FF', marginBottom: '6px' }}>
                            ATTACHED DOODLE 🎨
                          </div>
                          <img src={doodles[0].url} alt="Doodle" style={{ width: '100%', maxHeight: '180px', objectFit: 'contain', backgroundColor: '#FFFFFF', borderRadius: '2px', display: 'block' }} />
                        </div>
                      );
                    })()}
                  </div>

                  {/* Sticker Tray */}
                  <div style={{ backgroundColor: surfaceColor, padding: '10px' }}>
                    <div style={{ fontSize: '10px', fontWeight: 700, color: subTextColor, marginBottom: '6px', letterSpacing: '0.05em' }}>
                      STICKER STAMPS (TAP TO ATTACH):
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {CUSTOM_STICKER_SETS.map(sticker => {
                        const isSelected = placedStickers.some(s => s.id === sticker.id);
                        return (
                          <button
                            key={sticker.id}
                            onClick={() => {
                              triggerSound();
                              if (isSelected) {
                                setPlacedStickers(prev => prev.filter(s => s.id !== sticker.id));
                              } else {
                                setPlacedStickers(prev => [...prev, sticker]);
                              }
                            }}
                            style={{
                              backgroundColor: isSelected ? sticker.bg : cardColor,
                              color: isSelected ? (sticker.darkText ? '#000' : '#FFF') : textColor,
                              border: `1px solid ${isSelected ? sticker.bg : borderColor}`,
                              padding: '4px 8px',
                              fontSize: '10px',
                              fontWeight: 700,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              cursor: 'pointer',
                            }}
                          >
                            <span>{sticker.icon}</span>
                            <span>{sticker.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Actions: Paint Doodle & Camera Snapshot */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <button
                      onClick={() => setPaintModalOpen(true)}
                      style={{
                        backgroundColor: '#AA00FF',
                        color: '#ffffff',
                        border: 'none',
                        padding: '10px',
                        fontSize: '11px',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        cursor: 'pointer',
                      }}
                    >
                      <Brush size={14} />
                      <span>Draw Doodle 🎨</span>
                    </button>
                    <button
                      onClick={handleStartCamera}
                      style={{
                        backgroundColor: accent,
                        color: '#ffffff',
                        border: 'none',
                        padding: '10px',
                        fontSize: '11px',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        cursor: 'pointer',
                      }}
                    >
                      <Camera size={14} />
                      <span>Attach Photo 📷</span>
                    </button>
                  </div>
                </div>
              )}

              {/* ── TAB 3: MUSIC ── */}
              {storyDetailTab === 'music' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {(selectedStory.music?.track_title || selectedStory.music_title) ? (
                    <div>
                      <MusicPlayer 
                        music={selectedStory.music || {
                          track_title: selectedStory.music_title,
                          artist_name: selectedStory.music_artist || 'Artist'
                        }} 
                        showTurntable={playbackSettings.showTurntable !== false}
                      />
                    </div>
                  ) : (
                    <div style={{ backgroundColor: surfaceColor, padding: '24px', textAlign: 'center', color: subTextColor, fontSize: '12px' }}>
                      <Music size={28} style={{ opacity: 0.4, margin: '0 auto 8px' }} />
                      <div>No soundtrack attached to this story.</div>
                    </div>
                  )}
                </div>
              )}

              {/* ── TAB 4: VIEWERS ── */}
              {storyDetailTab === 'viewers' && (
                <div style={{ backgroundColor: surfaceColor, padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700 }}>
                      STORY VIEWERS ({storyViewersList.length || selectedStory.viewers_count || 0})
                    </div>
                  </div>

                  {storyViewersList.length > 5 && (
                    <div style={{ position: 'relative' }}>
                      <input
                        type="text"
                        placeholder="search viewers..."
                        value={viewerSearch}
                        onChange={(e) => setViewerSearch(e.target.value)}
                        style={{
                          width: '100%',
                          backgroundColor: cardColor,
                          border: `1px solid ${borderColor}`,
                          color: textColor,
                          padding: '6px 8px 6px 28px',
                          fontSize: '11px',
                          outline: 'none',
                          boxSizing: 'border-box',
                        }}
                      />
                      <Search size={13} color={subTextColor} style={{ position: 'absolute', left: '8px', top: '8px' }} />
                    </div>
                  )}

                  {storyViewersList.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '240px', overflowY: 'auto' }}>
                      {storyViewersList.filter(v => !viewerSearch || (v.username || v.user_name || v.full_name || '').toLowerCase().includes(viewerSearch.toLowerCase())).map((viewer, vIdx) => {
                        const vPic = viewer.profile_pic_url || viewer.profile_picture || viewer.profile_image_url;
                        const username = viewer.username || viewer.user_name || '';
                        return (
                          <a
                            key={vIdx}
                            href={username ? `https://www.instagram.com/${encodeURIComponent(username)}/` : 'https://www.instagram.com/'}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '8px 4px',
                              borderBottom: `1px solid ${borderColor}`,
                              textDecoration: 'none',
                              color: 'inherit',
                              cursor: 'pointer',
                              borderRadius: '4px',
                              transition: 'background-color 0.15s ease',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div style={{ width: '34px', height: '34px', borderRadius: '50%', overflow: 'hidden', backgroundColor: accent, color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                {vPic ? (
                                  <img
                                    src={`/api/v1/proxy/image?url=${encodeURIComponent(vPic)}`}
                                    alt={username}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    onError={(e) => { e.target.src = vPic; }}
                                  />
                                ) : (
                                  <span style={{ fontSize: '11px', fontWeight: 'bold' }}>{(username || 'U')[0].toUpperCase()}</span>
                                )}
                              </div>
                              <div>
                                <div style={{ fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <span>{username || 'Viewer'}</span>
                                  <ExternalLink size={11} color={accent} />
                                </div>
                                {viewer.full_name && (
                                  <div style={{ fontSize: '11px', color: subTextColor }}>{viewer.full_name}</div>
                                )}
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              {viewer.is_verified && (
                                <span style={{ fontSize: '10px', color: '#1DA1F2', fontWeight: 'bold' }}>✓ Verified</span>
                              )}
                              <span style={{ fontSize: '11px', color: accent, fontWeight: 600 }}>Profile ↗</span>
                            </div>
                          </a>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{ fontSize: '11px', color: subTextColor, padding: '12px 0', textAlign: 'center' }}>
                      {loadingViewers ? 'Loading viewer data...' : 'No external viewers recorded in archive.'}
                    </div>
                  )}
                </div>
              )}

              {/* ── TAB 5: DATA / MANIFEST ── */}
              {storyDetailTab === 'data' && (
                <div style={{ backgroundColor: surfaceColor, padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: accent }}>RAW JSON ARCHIVAL MANIFEST</div>
                  <pre style={{
                    backgroundColor: cardColor,
                    color: textColor,
                    padding: '8px',
                    fontSize: '10px',
                    fontFamily: 'Consolas, Monaco, monospace',
                    overflowX: 'auto',
                    maxHeight: '220px',
                    overflowY: 'auto',
                    border: `1px solid ${borderColor}`,
                  }}>
                    {JSON.stringify(selectedStory, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════
              PIVOT 3: HIGHLIGHTS HUB
             ══════════════════════════════════════════════════════ */}
          {activePivot === 'highlights' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ fontSize: '11px', color: subTextColor, fontWeight: 600 }}>
                {highlights.length} STORY HIGHLIGHTS IN VAULT
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '12px',
              }}>
                {highlights.map(hl => {
                  const previewStories = hl.preview_stories || (hl.stories ? hl.stories.map(s => s.media_url).filter(Boolean) : []);
                  const singleCover = hl.cover_media_url || (previewStories[0]) || (stories[0]?.media_url);
                  const isMulti = previewStories.length >= 2;

                  return (
                    <motion.div
                      key={hl.id}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => handleOpenHighlight(hl)}
                      style={{
                        aspectRatio: '1/1',
                        backgroundColor: '#1C1C1C',
                        color: '#FFFFFF',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        position: 'relative',
                        overflow: 'hidden',
                        border: `1px solid ${borderColor}`,
                      }}
                    >
                      {/* Cover Background */}
                      {isMulti ? (
                        <div style={{ position: 'absolute', inset: 0, display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: '2px', opacity: 0.65 }}>
                          {previewStories.slice(0, 4).map((u, pIdx) => (
                            <div key={pIdx} style={{ position: 'relative', overflow: 'hidden' }}>
                              <OfflineMedia src={u} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} alt="hl-cell" />
                            </div>
                          ))}
                        </div>
                      ) : singleCover ? (
                        <OfflineMedia
                          src={singleCover}
                          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.6 }}
                          alt="Highlight Cover"
                        />
                      ) : null}

                      {/* Top Bar with Accent Badge */}
                      <div style={{ zIndex: 2, padding: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ backgroundColor: accent, color: '#FFF', padding: '3px 8px', fontSize: '9px', fontWeight: 'bold', letterSpacing: '0.5px' }}>
                          HIGHLIGHT
                        </div>
                        <Sparkles size={16} color="#FFF" />
                      </div>

                      {/* Bottom Info Gradient */}
                      <div style={{
                        zIndex: 2,
                        padding: '12px',
                        background: 'linear-gradient(transparent, rgba(0,0,0,0.92))',
                      }}>
                        <div style={{ fontSize: '15px', fontWeight: 600 }}>{hl.title}</div>
                        <div style={{ fontSize: '10px', opacity: 0.85, marginTop: '2px' }}>
                          {previewStories.length > 0 ? `${previewStories.length} stories • Tap to play` : 'Tap to play stories'}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════
              PIVOT 4: FEED POSTS & CAROUSELS (INSTAGRAM MOBILE UI)
             ══════════════════════════════════════════════════════ */}
          {activePivot === 'feed' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              
              {/* View Toggle Bar (Grid vs Cards) */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '11px', color: subTextColor, fontWeight: 600 }}>
                  {posts.length} {posts.length === 1 ? 'POST' : 'POSTS'} IN FEED
                </div>

                <div style={{ display: 'flex', gap: '4px', backgroundColor: surfaceColor, padding: '2px' }}>
                  <button
                    onClick={() => setFeedViewMode('grid')}
                    style={{
                      backgroundColor: feedViewMode === 'grid' ? accent : 'transparent',
                      color: feedViewMode === 'grid' ? '#FFF' : textColor,
                      border: 'none',
                      padding: '4px 8px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <Grid size={14} />
                  </button>
                  <button
                    onClick={() => setFeedViewMode('cards')}
                    style={{
                      backgroundColor: feedViewMode === 'cards' ? accent : 'transparent',
                      color: feedViewMode === 'cards' ? '#FFF' : textColor,
                      border: 'none',
                      padding: '4px 8px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <List size={14} />
                  </button>
                </div>
              </div>

              {posts.length === 0 ? (
                <div style={{ backgroundColor: surfaceColor, padding: '24px', textAlign: 'center' }}>
                  <Film size={36} color={accent} style={{ margin: '0 auto 10px auto' }} />
                  <div style={{ fontSize: '14px', fontWeight: 300 }}>no feed posts cached</div>
                  <div style={{ fontSize: '11px', color: subTextColor, marginTop: '4px' }}>
                    Sync with your laptop to download archived Instagram carousels and feed posts.
                  </div>
                  <button
                    onClick={handleRunSync}
                    style={{ marginTop: '12px', backgroundColor: accent, border: 'none', color: '#FFF', padding: '6px 16px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
                  >
                    sync feed now
                  </button>
                </div>
              ) : feedViewMode === 'grid' ? (
                /* Instagram 3-Column Square Grid */
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '3px',
                }}>
                  {posts.map((post, pIdx) => {
                    const mediaUrl = getMediaUrl(post);
                    const isCarousel = (post.media_items && post.media_items.length > 1);
                    const postMusicTrack = post.music?.track_title || post.music_title;

                    return (
                      <motion.div
                        key={post.id}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          triggerSound();
                          setSelectedPostIndex(pIdx);
                          setPostSlideIndex(0);
                        }}
                        style={{
                          aspectRatio: '1/1',
                          backgroundColor: '#111',
                          position: 'relative',
                          cursor: 'pointer',
                          overflow: 'hidden',
                        }}
                      >
                        <OfflineMedia src={mediaUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Post" />
                        {isCarousel && (
                          <div style={{
                            position: 'absolute',
                            top: '4px',
                            right: '4px',
                            backgroundColor: 'rgba(0,0,0,0.65)',
                            padding: '2px 5px',
                            borderRadius: '2px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '2px',
                          }}>
                            <Layers size={11} color="#FFF" />
                            <span style={{ fontSize: '9px', color: '#FFF', fontWeight: 'bold' }}>{post.media_items.length}</span>
                          </div>
                        )}
                        {postMusicTrack && (
                          <div style={{
                            position: 'absolute',
                            top: '4px',
                            left: '4px',
                            backgroundColor: 'rgba(29, 185, 84, 0.9)',
                            padding: '2px 4px',
                            borderRadius: '2px',
                          }}>
                            <Music size={10} color="#000" />
                          </div>
                        )}
                        {post.journal_note && (
                          <div style={{
                            position: 'absolute',
                            bottom: '4px',
                            right: '4px',
                            backgroundColor: '#008A00',
                            color: '#FFF',
                            fontSize: '8px',
                            fontWeight: 'bold',
                            padding: '2px 4px',
                          }}>
                            NOTE
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                /* Instagram Mobile Cards Feed */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {posts.map((post, pIdx) => {
                    const mediaUrl = getMediaUrl(post);
                    const postMusicTrack = post.music?.track_title || post.music_title;
                    const postMusicArtist = post.music?.artist_name || post.music_artist || 'Artist';
                    const isCarousel = (post.media_items && post.media_items.length > 1);

                    return (
                      <div key={post.id} style={{ backgroundColor: surfaceColor, borderBottom: `2px solid ${accent}` }}>
                        {/* Card Header */}
                        <div style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF', fontSize: '12px', fontWeight: 'bold', overflow: 'hidden', flexShrink: 0 }}>
                              {igSession?.profile_pic_url ? (
                                <OfflineMedia src={igSession.profile_pic_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="IG" />
                              ) : (
                                <span>{(igSession?.ig_username || igSession?.username || 'MW').slice(0, 2).toUpperCase()}</span>
                              )}
                            </div>
                            <div>
                              <div style={{ fontSize: '13px', fontWeight: 600 }}>
                                @{igSession?.ig_username || igSession?.username || 'user'}
                              </div>
                              <div style={{ fontSize: '10px', color: subTextColor }}>
                                {post.taken_at ? new Date(post.taken_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'ARCHIVED POST'}
                              </div>
                            </div>
                          </div>

                          {post.location_name && (
                            <a
                              href={`https://maps.google.com/?q=${encodeURIComponent(post.location_name)}`}
                              target="_blank"
                              rel="noreferrer"
                              style={{ color: accent, fontSize: '11px', display: 'flex', alignItems: 'center', gap: '3px', textDecoration: 'none', maxWidth: '40%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                            >
                              <MapPin size={11} /> {post.location_name}
                            </a>
                          )}
                        </div>

                        {/* Image Canvas */}
                        <div 
                          onClick={() => {
                            triggerSound();
                            setSelectedPostIndex(pIdx);
                            setPostSlideIndex(0);
                          }}
                          style={{ width: '100%', aspectRatio: '1/1', backgroundColor: '#000', position: 'relative', cursor: 'pointer' }}
                        >
                          <OfflineMedia src={mediaUrl} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="Post" />
                          {isCarousel && (
                            <div style={{ position: 'absolute', top: '8px', right: '8px', backgroundColor: 'rgba(0,0,0,0.7)', color: '#FFF', padding: '3px 7px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Layers size={12} /> 1/{post.media_items.length}
                            </div>
                          )}
                        </div>

                        {/* Card Details & Music Badge */}
                        <div style={{ padding: '12px' }}>
                          {postMusicTrack && (
                            <div 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenMusicModal(postMusicTrack, postMusicArtist);
                              }}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                backgroundColor: '#1DB954',
                                color: '#000000',
                                padding: '4px 10px',
                                borderRadius: '2px',
                                fontSize: '11px',
                                fontWeight: 700,
                                marginBottom: '8px',
                                cursor: 'pointer'
                              }}
                            >
                              <Music size={12} />
                              <span>{postMusicTrack}</span>
                              <span style={{ opacity: 0.75 }}>• {postMusicArtist}</span>
                              <span style={{ fontSize: '9px', backgroundColor: 'rgba(0,0,0,0.15)', padding: '1px 4px', borderRadius: '2px' }}>♫ PLAY</span>
                            </div>
                          )}

                          {post.like_count !== undefined && (
                            <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>
                              ❤️ {Number(post.like_count).toLocaleString()} likes
                            </div>
                          )}
                          {post.caption_text && (
                            <div style={{ fontSize: '12px', lineHeight: 1.4, marginBottom: '6px' }}>
                              {post.caption_text}
                            </div>
                          )}
                          {post.journal_note && (
                            <div style={{ backgroundColor: cardColor, borderLeft: '3px solid #008A00', padding: '8px', fontSize: '11px', marginTop: '6px' }}>
                              <b style={{ color: '#008A00' }}>Journal:</b> {post.journal_note}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Instagram Feed Post Fullscreen Continuous Carousel Viewer with Next/Prev */}
              {selectedPostIndex !== null && posts[selectedPostIndex] && (
                <div style={{
                  position: 'fixed',
                  inset: 0,
                  backgroundColor: 'rgba(0,0,0,0.96)',
                  zIndex: 100000,
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '12px',
                }}>
                  {(() => {
                    const curPost = posts[selectedPostIndex];
                    const mediaList = curPost.media_items || (curPost.media_url ? [{ display_url: curPost.media_url }] : []);
                    const activeMedia = mediaList[postSlideIndex] || mediaList[0];
                    const activeVersion = postVersionMap[activeMedia?.id] || activeMedia?.default_version || (activeMedia?.has_raw_master ? 'raw' : 'instagram');
                    const activeUrl = (activeVersion === 'raw' && activeMedia?.raw_media_url) 
                      ? activeMedia.raw_media_url 
                      : (activeMedia?.instagram_media_url || activeMedia?.display_url || activeMedia?.media_url || curPost.media_url);

                    const toggleVersion = async () => {
                      if (!activeMedia?.has_raw_master) return;
                      triggerSound();
                      const newVer = activeVersion === 'raw' ? 'instagram' : 'raw';
                      setPostVersionMap(prev => ({ ...prev, [activeMedia.id]: newVer }));
                      try {
                        await updatePostMedia(curPost.id, activeMedia.id, { default_version: newVer });
                        showToast(`Swapped to ${newVer === 'raw' ? 'Original High-Res Master' : 'Instagram Version'}`);
                      } catch (e) {}
                    };

                    return (
                      <>
                        {/* Top Bar with Post Counter, Version Toggle & Close */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', color: '#FFF' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <button
                              onClick={() => {
                                triggerSound();
                                setSelectedPostIndex(i => (i - 1 + posts.length) % posts.length);
                                setPostSlideIndex(0);
                              }}
                              style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#FFF', padding: '4px 8px', fontSize: '11px', cursor: 'pointer' }}
                            >
                              ◀
                            </button>
                            <span style={{ fontSize: '12px', opacity: 0.85 }}>
                              {selectedPostIndex + 1} / {posts.length} {mediaList.length > 1 && `(Slide ${postSlideIndex + 1}/${mediaList.length})`}
                            </span>
                            <button
                              onClick={() => {
                                triggerSound();
                                setSelectedPostIndex(i => (i + 1) % posts.length);
                                setPostSlideIndex(0);
                              }}
                              style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#FFF', padding: '4px 8px', fontSize: '11px', cursor: 'pointer' }}
                            >
                              ▶
                            </button>
                          </div>

                          {/* ORIGINAL vs INSTAGRAM Dual-Version Master Switch */}
                          {activeMedia?.has_raw_master ? (
                            <button
                              onClick={toggleVersion}
                              style={{
                                backgroundColor: activeVersion === 'raw' ? accent : 'rgba(255,255,255,0.15)',
                                border: `1px solid ${activeVersion === 'raw' ? accent : 'rgba(255,255,255,0.3)'}`,
                                color: '#FFFFFF',
                                padding: '4px 10px',
                                fontSize: '10px',
                                fontWeight: 700,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                cursor: 'pointer',
                              }}
                            >
                              <span>{activeVersion === 'raw' ? '◐ ORIGINAL (RAW)' : '○ INSTAGRAM'}</span>
                            </button>
                          ) : (
                            <div style={{ fontSize: '10px', opacity: 0.6, color: '#FFF' }}>
                              INSTAGRAM ARCHIVE
                            </div>
                          )}

                          <X size={22} style={{ cursor: 'pointer' }} onClick={() => setSelectedPostIndex(null)} />
                        </div>

                        {/* Main Media Viewport */}
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', minHeight: '38vh' }}>
                          <OfflineMedia src={activeUrl} style={{ maxWidth: '100%', maxHeight: '45vh', objectFit: 'contain' }} alt="Fullscreen Post" />

                          {/* Multi-slide carousel indicator */}
                          {mediaList.length > 1 && (
                            <div style={{ position: 'absolute', bottom: '6px', display: 'flex', gap: '4px', backgroundColor: 'rgba(0,0,0,0.6)', padding: '4px 8px' }}>
                              {mediaList.map((_, sIdx) => (
                                <div
                                  key={sIdx}
                                  onClick={() => { triggerSound(); setPostSlideIndex(sIdx); }}
                                  style={{
                                    width: postSlideIndex === sIdx ? '16px' : '6px',
                                    height: '6px',
                                    backgroundColor: postSlideIndex === sIdx ? '#FFFFFF' : 'rgba(255,255,255,0.4)',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                  }}
                                />
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Contextual Pivot Strip for Post */}
                        <div style={{
                          display: 'flex',
                          borderBottom: `2px solid ${borderColor}`,
                          gap: '12px',
                          marginTop: '6px',
                          overflowX: 'auto',
                          scrollbarWidth: 'none',
                        }}>
                          {[
                            { id: 'info', label: 'INFO' },
                            { id: 'journal', label: 'JOURNAL' },
                            { id: 'music', label: 'MUSIC' },
                            { id: 'data', label: 'DATA' },
                          ].map(tab => (
                            <button
                              key={tab.id}
                              onClick={() => { triggerSound(); setPostDetailTab(tab.id); }}
                              style={{
                                background: 'none',
                                border: 'none',
                                borderBottom: postDetailTab === tab.id ? `3px solid ${accent}` : '3px solid transparent',
                                color: postDetailTab === tab.id ? '#FFFFFF' : 'rgba(255,255,255,0.6)',
                                padding: '6px 4px',
                                fontSize: '11px',
                                fontWeight: postDetailTab === tab.id ? '700' : '400',
                                cursor: 'pointer',
                                letterSpacing: '0.5px',
                              }}
                            >
                              {tab.label}
                            </button>
                          ))}
                        </div>

                        {/* Bottom Context Content */}
                        <div style={{ backgroundColor: surfaceColor, padding: '12px', marginTop: '6px', color: textColor, maxHeight: '28vh', overflowY: 'auto' }}>
                          {/* TAB 1: INFO */}
                          {postDetailTab === 'info' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', color: subTextColor }}>
                                <span>{curPost.taken_at ? new Date(curPost.taken_at).toLocaleString() : ''}</span>
                                {curPost.like_count !== undefined && (
                                  <span style={{ fontWeight: 'bold' }}>❤️ {curPost.like_count} likes</span>
                                )}
                              </div>
                              {curPost.location_name && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: accent }}>
                                  <MapPin size={11} />
                                  <span>{curPost.location_name}</span>
                                </div>
                              )}
                              {curPost.caption_text && (
                                <div style={{ fontSize: '12px', marginTop: '4px', lineHeight: 1.4 }}>
                                  {curPost.caption_text}
                                </div>
                              )}
                              <div style={{ marginTop: '6px', paddingTop: '6px', borderTop: `1px solid ${borderColor}`, display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: subTextColor }}>Source Version:</span>
                                <span style={{ fontWeight: 'bold', color: activeVersion === 'raw' ? '#008A00' : accent }}>
                                  {activeVersion === 'raw' ? 'Uncompressed RAW Master' : 'Instagram Compressed Copy'}
                                </span>
                              </div>
                            </div>
                          )}

                          {/* TAB 2: JOURNAL */}
                          {postDetailTab === 'journal' && (
                            <div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                <div style={{ fontSize: '11px', fontWeight: 700, color: '#008A00' }}>📓 JOURNAL NOTE</div>
                                {editingItemId !== curPost.id && (
                                  <button
                                    onClick={() => {
                                      setEditingItemId(curPost.id);
                                      setJournalDraft(curPost.journal_note || '');
                                    }}
                                    style={{ background: 'none', border: 'none', color: accent, fontSize: '11px', cursor: 'pointer' }}
                                  >
                                    {curPost.journal_note ? 'edit note' : '+ add note'}
                                  </button>
                                )}
                              </div>

                              {editingItemId === curPost.id ? (
                                <div>
                                  <textarea
                                    value={journalDraft}
                                    onChange={(e) => setJournalDraft(e.target.value)}
                                    rows={3}
                                    style={{ width: '100%', backgroundColor: cardColor, color: textColor, border: `1px solid ${accent}`, padding: '6px', fontSize: '11px', outline: 'none', boxSizing: 'border-box' }}
                                  />
                                  <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', marginTop: '6px' }}>
                                    <button onClick={() => setEditingItemId(null)} style={{ background: 'none', border: `1px solid ${borderColor}`, color: textColor, padding: '4px 10px', fontSize: '10px' }}>cancel</button>
                                    <button onClick={() => handleSaveInlineJournal(curPost.id, true)} style={{ backgroundColor: accent, color: '#FFF', border: 'none', padding: '4px 12px', fontSize: '10px', fontWeight: 'bold' }}>save</button>
                                  </div>
                                </div>
                              ) : (
                                <div style={{ fontSize: '11px', opacity: 0.9 }}>{curPost.journal_note || 'No journal note attached yet.'}</div>
                              )}

                              {/* Attached Doodle if present */}
                              {(() => {
                                let doodles = [];
                                try {
                                  doodles = JSON.parse(localStorage.getItem(`memwault_doodles_${curPost.id}`) || '[]');
                                } catch (e) {}
                                if (!doodles || doodles.length === 0) return null;
                                return (
                                  <div style={{ marginTop: '8px', backgroundColor: cardColor, padding: '6px', border: `1px solid ${borderColor}` }}>
                                    <div style={{ fontSize: '9px', fontWeight: 'bold', color: '#AA00FF', marginBottom: '4px' }}>
                                      ATTACHED DOODLE 🎨
                                    </div>
                                    <img src={doodles[0].url} alt="Doodle" style={{ width: '100%', maxHeight: '140px', objectFit: 'contain', backgroundColor: '#FFFFFF', borderRadius: '2px', display: 'block' }} />
                                  </div>
                                );
                              })()}

                              <div style={{ marginTop: '8px' }}>
                                <button
                                  onClick={() => setPaintModalOpen(true)}
                                  style={{
                                    backgroundColor: '#AA00FF',
                                    color: '#ffffff',
                                    border: 'none',
                                    padding: '6px 12px',
                                    fontSize: '10px',
                                    fontWeight: 600,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    cursor: 'pointer',
                                  }}
                                >
                                  <Brush size={12} />
                                  <span>Draw Doodle 🎨</span>
                                </button>
                              </div>
                            </div>
                          )}

                          {/* TAB 3: MUSIC */}
                          {postDetailTab === 'music' && (
                            <div style={{ padding: '6px 0' }}>
                              {(curPost.music?.track_title || curPost.music_title) ? (
                                <MusicPlayer
                                  music={curPost.music || {
                                    track_title: curPost.music_title,
                                    artist_name: curPost.music_artist || 'Artist'
                                  }}
                                  showTurntable={playbackSettings.showTurntable !== false}
                                />
                              ) : (
                                <div style={{ color: subTextColor, fontSize: '11px', textAlign: 'center', padding: '16px 0' }}>
                                  No soundtrack linked to this feed post.
                                </div>
                              )}
                            </div>
                          )}

                          {/* TAB 4: DATA */}
                          {postDetailTab === 'data' && (
                            <pre style={{
                              backgroundColor: cardColor,
                              color: textColor,
                              padding: '6px',
                              fontSize: '10px',
                              fontFamily: 'monospace',
                              overflowX: 'auto',
                              maxHeight: '120px',
                              border: `1px solid ${borderColor}`,
                            }}>
                              {JSON.stringify(curPost, null, 2)}
                            </pre>
                          )}
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════
              PIVOT 5: JOURNAL, PLACES VISITED & BUCKET LIST
             ══════════════════════════════════════════════════════ */}
          {activePivot === 'journal' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              
              {/* Segmented Tab: [Memories Notes] vs [Places Visited] vs [Places to Visit] */}
              <div style={{ display: 'flex', gap: '6px', borderBottom: `2px solid ${borderColor}`, paddingBottom: '6px', overflowX: 'auto' }}>
                <button
                  onClick={() => setJournalSubTab('notes')}
                  style={{
                    backgroundColor: journalSubTab === 'notes' ? '#008A00' : 'transparent',
                    color: journalSubTab === 'notes' ? '#FFF' : textColor,
                    border: 'none',
                    padding: '6px 10px',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Notes ({journaledItems.length})
                </button>
                <button
                  onClick={() => setJournalSubTab('visited')}
                  style={{
                    backgroundColor: journalSubTab === 'visited' ? '#0050EF' : 'transparent',
                    color: journalSubTab === 'visited' ? '#FFF' : textColor,
                    border: 'none',
                    padding: '6px 10px',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Places Visited ({visitedLocations.length})
                </button>
                <button
                  onClick={() => setJournalSubTab('places')}
                  style={{
                    backgroundColor: journalSubTab === 'places' ? '#FA6800' : 'transparent',
                    color: journalSubTab === 'places' ? '#FFF' : textColor,
                    border: 'none',
                    padding: '6px 10px',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Places to Visit ({places.filter(p => !p.completed).length})
                </button>
              </div>

              {journalSubTab === 'notes' && (
                /* Sub-tab 1: Notes & Scrapbooks */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '11px', color: subTextColor, fontWeight: 600 }}>
                      {journaledItems.length} JOURNAL ENTRIES
                    </div>

                    <button
                      onClick={() => { triggerSound(); setNewJournalModalOpen(true); }}
                      style={{
                        backgroundColor: '#008A00',
                        border: 'none',
                        color: '#FFF',
                        padding: '6px 12px',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <Plus size={14} />
                      <span>+ NEW ENTRY / SCRAP</span>
                    </button>
                  </div>

                  {journaledItems.length === 0 ? (
                    <div style={{ backgroundColor: surfaceColor, padding: '24px', textAlign: 'center' }}>
                      <BookOpen size={36} color="#008A00" style={{ margin: '0 auto 10px auto' }} />
                      <div style={{ fontSize: '14px', fontWeight: 300 }}>no journal entries written yet</div>
                      <div style={{ fontSize: '11px', color: subTextColor, marginTop: '4px' }}>
                        Tap "+ NEW ENTRY" above to select a memory or post and write your reflections and attach custom stickers.
                      </div>
                      <button
                        onClick={() => setNewJournalModalOpen(true)}
                        style={{ marginTop: '12px', backgroundColor: '#008A00', border: 'none', color: '#FFF', padding: '6px 16px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
                      >
                        create first entry
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {journaledItems.map(item => {
                        const mediaUrl = getMediaUrl(item);
                        return (
                          <motion.div
                            key={item.id}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => {
                              triggerSound();
                              if (item._isPost) {
                                const pIdx = posts.findIndex(p => p.id === item.id);
                                setSelectedPostIndex(pIdx >= 0 ? pIdx : 0);
                                setActivePivot('feed');
                              } else {
                                setSelectedStory(item);
                                setActivePivot('memories');
                              }
                            }}
                            style={{
                              backgroundColor: surfaceColor,
                              borderLeft: `4px solid #008A00`,
                              padding: '12px',
                              cursor: 'pointer',
                              display: 'flex',
                              gap: '12px',
                            }}
                          >
                            <div style={{ width: '60px', height: '60px', backgroundColor: '#000', flexShrink: 0 }}>
                              <OfflineMedia
                                src={mediaUrl}
                                type={item.media_type === 2 ? 'video' : 'image'}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                alt="Thumbnail"
                              />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: '11px', fontWeight: 700, color: '#008A00' }}>
                                {item.location_name || (item.taken_at ? new Date(item.taken_at).toLocaleDateString() : (item._isPost ? 'Feed Post Journal' : 'Story Journal'))}
                              </div>
                              <div style={{ fontSize: '12px', marginTop: '2px', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                                {item.journal_note}
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Sub-tab 2: Places Visited (Auto Geotags + Completed Bucket List) */}
              {journalSubTab === 'visited' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '11px', color: subTextColor, fontWeight: 600 }}>
                      {visitedLocations.length} VISITED PLACES & GEOTAGS
                    </div>
                  </div>

                  {visitedLocations.length === 0 ? (
                    <div style={{ backgroundColor: surfaceColor, padding: '24px', textAlign: 'center' }}>
                      <MapPin size={36} color="#0050EF" style={{ margin: '0 auto 10px auto' }} />
                      <div style={{ fontSize: '14px', fontWeight: 300 }}>no visited places detected yet</div>
                      <div style={{ fontSize: '11px', color: subTextColor, marginTop: '4px' }}>
                        Geotagged locations from your Instagram stories and completed bucket list destinations automatically appear here.
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {visitedLocations.map((loc, idx) => (
                        <motion.div
                          key={loc.id || idx}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => {
                            triggerSound();
                            setSearchQuery(loc.title || loc.location);
                            setActivePivot('memories');
                          }}
                          style={{
                            backgroundColor: surfaceColor,
                            borderLeft: `4px solid #0050EF`,
                            padding: '12px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '12px',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                            {loc.sampleItem ? (
                              <div style={{ width: '48px', height: '48px', backgroundColor: '#000', flexShrink: 0, overflow: 'hidden' }}>
                                <OfflineMedia
                                  src={getMediaUrl(loc.sampleItem)}
                                  type={loc.sampleItem.media_type === 2 ? 'video' : 'image'}
                                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                  alt={loc.title}
                                />
                              </div>
                            ) : (
                              <div style={{ width: '48px', height: '48px', backgroundColor: '#0050EF', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <MapPin size={22} />
                              </div>
                            )}

                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: '13px', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {loc.title || loc.location}
                              </div>
                              <div style={{ fontSize: '11px', color: subTextColor, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ color: '#0050EF', fontWeight: 600 }}>{loc.count} {loc.count === 1 ? 'memory' : 'memories'}</span>
                                {loc.lastVisited && (
                                  <span>• Last visited: {new Date(loc.lastVisited).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}</span>
                                )}
                              </div>
                            </div>
                          </div>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              triggerSound();
                              setSearchQuery(loc.title || loc.location);
                              setActivePivot('memories');
                            }}
                            style={{
                              backgroundColor: '#0050EF',
                              color: '#FFFFFF',
                              border: 'none',
                              padding: '6px 10px',
                              fontSize: '10px',
                              fontWeight: 'bold',
                              cursor: 'pointer',
                              flexShrink: 0,
                            }}
                          >
                            Explore ↗
                          </button>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Sub-tab 3: Places to Visit / Bucket List (Full Desktop Feature) */}
              {journalSubTab === 'places' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {/* Add Place Form */}
                  <form onSubmit={handleAddPlace} style={{ backgroundColor: surfaceColor, padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#FA6800' }}>+ ADD PLACE TO VISIT</div>
                    <input
                      type="text"
                      placeholder="Destination / Experience name..."
                      value={newPlaceTitle}
                      onChange={(e) => setNewPlaceTitle(e.target.value)}
                      style={{ backgroundColor: cardColor, color: textColor, border: `1px solid ${borderColor}`, padding: '8px', fontSize: '12px', outline: 'none' }}
                    />
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <input
                        type="text"
                        placeholder="Location (e.g. Kyoto, Japan)"
                        value={newPlaceLocation}
                        onChange={(e) => setNewPlaceLocation(e.target.value)}
                        style={{ flex: 1, backgroundColor: cardColor, color: textColor, border: `1px solid ${borderColor}`, padding: '6px', fontSize: '11px', outline: 'none' }}
                      />
                      <select
                        value={newPlaceCategory}
                        onChange={(e) => setNewPlaceCategory(e.target.value)}
                        style={{ backgroundColor: cardColor, color: textColor, border: `1px solid ${borderColor}`, padding: '6px', fontSize: '11px', outline: 'none' }}
                      >
                        <option value="Travel">Travel</option>
                        <option value="Nature">Nature</option>
                        <option value="Culture">Culture</option>
                        <option value="Roadtrip">Roadtrip</option>
                        <option value="Food">Food</option>
                      </select>
                      <button
                        type="submit"
                        style={{ backgroundColor: '#FA6800', color: '#FFF', border: 'none', padding: '6px 14px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
                      >
                        Add
                      </button>
                    </div>
                  </form>

                  {/* Places to Visit List */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {places.map(p => (
                      <div
                        key={p.id}
                        style={{
                          backgroundColor: surfaceColor,
                          borderLeft: p.completed ? '4px solid #0050EF' : '4px solid #FA6800',
                          padding: '10px 12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          opacity: p.completed ? 0.75 : 1.0,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                          <div onClick={() => togglePlaceCompleted(p.id)} style={{ cursor: 'pointer', color: p.completed ? '#0050EF' : '#FA6800' }}>
                            {p.completed ? <CheckSquare size={18} /> : <Square size={18} />}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: '13px', fontWeight: 600, textDecoration: p.completed ? 'line-through' : 'none' }}>
                              {p.title}
                            </div>
                            <div style={{ fontSize: '10px', color: subTextColor }}>
                              📍 {p.location} • <span style={{ color: p.completed ? '#0050EF' : '#FA6800' }}>{p.category}</span>
                              {p.completed && <span style={{ color: '#0050EF', fontWeight: 'bold', marginLeft: '6px' }}>✓ Visited</span>}
                            </div>
                          </div>
                        </div>

                        <Trash2 size={16} color="#A20025" style={{ cursor: 'pointer' }} onClick={() => deletePlace(p.id)} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════
              PIVOT 6: SETTINGS & STORAGE SENSE (DESKTOP PARITY)
             ══════════════════════════════════════════════════════ */}
          {activePivot === 'settings' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
              
              {/* Instagram Account Card & Session Actions (Topmost Profile) */}
              <div>
                <div style={{ fontSize: '16px', fontWeight: 300, marginBottom: '10px', color: accent }}>
                  instagram archive & account
                </div>
                {igSession ? (
                  <div style={{ backgroundColor: surfaceColor, borderLeft: `4px solid ${accent}`, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '46px', height: '46px', borderRadius: '50%', backgroundColor: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF', fontWeight: 'bold', fontSize: '16px', overflow: 'hidden', flexShrink: 0 }}>
                          {igSession.profile_pic_url ? (
                            <OfflineMedia src={igSession.profile_pic_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="IG" />
                          ) : (
                            <span>{(igSession.full_name || igSession.ig_username || igSession.username || 'U').charAt(0).toUpperCase()}</span>
                          )}
                        </div>
                        <div>
                          {igSession.full_name && (
                            <div style={{ fontSize: '15px', fontWeight: 700 }}>{igSession.full_name}</div>
                          )}
                          <div style={{ fontSize: '13px', fontWeight: 600, opacity: igSession.full_name ? 0.85 : 1 }}>
                            @{igSession.ig_username || igSession.username || 'user'}
                          </div>
                          <div style={{ fontSize: '11px', color: '#008A00', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                            <CheckCircle2 size={12} />
                            <span>Vault Paired & Active</span>
                          </div>
                        </div>
                      </div>

                      {(igSession.ig_username || igSession.username) && (
                        <a
                          href={`https://instagram.com/${igSession.ig_username || igSession.username}`}
                          target="_blank"
                          rel="noreferrer"
                          style={{ backgroundColor: accent, color: '#FFF', padding: '6px 12px', fontSize: '11px', fontWeight: 'bold', textDecoration: 'none', borderRadius: '2px' }}
                        >
                          Profile ↗
                        </a>
                      )}
                    </div>

                    {/* Actions: Renew Session & Rescan Metadata */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1px', backgroundColor: borderColor, borderTop: `1px solid ${borderColor}` }}>
                      <button
                        onClick={async () => {
                          triggerSound();
                          try {
                            const res = await renewInstagramSession();
                            showToast(res?.message || 'Instagram session refreshed');
                          } catch (e) {
                            showToast(`Renewal failed: ${e.message}`);
                          }
                        }}
                        style={{ backgroundColor: cardColor, color: textColor, border: 'none', padding: '10px 4px', fontSize: '10px', fontWeight: 600, cursor: 'pointer' }}
                      >
                        Renew Session
                      </button>
                      <button
                        onClick={async () => {
                          triggerSound();
                          try {
                            const res = await rescanMetadata();
                            showToast(`Rescanned ${res.updated_count || 0} items`);
                          } catch (e) {
                            showToast(`Rescan failed: ${e.message}`);
                          }
                        }}
                        style={{ backgroundColor: cardColor, color: textColor, border: 'none', padding: '10px 4px', fontSize: '10px', fontWeight: 600, cursor: 'pointer' }}
                      >
                        Rescan Meta
                      </button>
                      <button
                        onClick={async () => {
                          if (!confirm('Disconnect Instagram account from this vault?')) return;
                          triggerSound();
                          try {
                            await disconnectInstagram();
                            setIgSession(null);
                            showToast('Disconnected Instagram');
                          } catch (e) {
                            showToast(`Failed: ${e.message}`);
                          }
                        }}
                        style={{ backgroundColor: cardColor, color: '#A20025', border: 'none', padding: '10px 4px', fontSize: '10px', fontWeight: 600, cursor: 'pointer' }}
                      >
                        Disconnect
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ backgroundColor: surfaceColor, padding: '14px', borderLeft: `4px solid #666` }}>
                    <div style={{ fontSize: '13px', fontWeight: 600 }}>No Instagram Account Active</div>
                    <div style={{ fontSize: '11px', color: subTextColor, marginTop: '2px' }}>
                      Connect Instagram on your laptop desktop vault and run ActiveSync to sync sessions.
                    </div>
                  </div>
                )}
              </div>

              {/* Standalone Installation Card */}
              {!isInstalled && (
                <div style={{
                  backgroundColor: surfaceColor,
                  borderLeft: `4px solid ${accent}`,
                  padding: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 'bold' }}>Install Standalone App</div>
                    <div style={{ fontSize: '11px', color: subTextColor, marginTop: '2px' }}>Install on home screen without browser bars</div>
                  </div>
                  <button
                    onClick={handleInstallPwa}
                    style={{
                      backgroundColor: accent,
                      color: '#FFFFFF',
                      border: 'none',
                      padding: '6px 14px',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                    }}
                  >
                    Install Now
                  </button>
                </div>
              )}

              {/* ── Playback & Media Engine (Full Desktop Parity) ── */}
              <div>
                <div style={{ fontSize: '16px', fontWeight: 300, marginBottom: '10px', color: accent }}>
                  playback & media engine
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <MetroToggle
                    label="autoplay stories & video reels"
                    checked={playbackSettings.autoplay}
                    onText="on"
                    offText="off"
                    onChange={(checked) => updatePlaybackSetting('autoplay', checked)}
                  />

                  <MetroToggle
                    label="loop video playback"
                    checked={playbackSettings.loopVideo}
                    onText="on"
                    offText="off"
                    onChange={(checked) => updatePlaybackSetting('loopVideo', checked)}
                  />

                  <MetroToggle
                    label="turntable vinyl in music widget"
                    checked={playbackSettings.showTurntable !== false}
                    onText="turntable"
                    offText="album art"
                    onChange={(checked) => updatePlaybackSetting('showTurntable', checked)}
                  />

                  <div style={{ backgroundColor: surfaceColor, padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600 }}>preferred music app</div>
                      <div style={{ fontSize: '10px', color: subTextColor }}>used when tapping sound badges</div>
                    </div>
                    <select
                      value={playbackSettings.preferredMusicApp || 'spotify'}
                      onChange={(e) => updatePlaybackSetting('preferredMusicApp', e.target.value)}
                      style={{ backgroundColor: cardColor, color: textColor, border: `1px solid ${borderColor}`, padding: '6px 10px', fontSize: '11px', outline: 'none' }}
                    >
                      <option value="spotify">Spotify</option>
                      <option value="apple">Apple Music</option>
                      <option value="youtube">YouTube Music</option>
                      <option value="amazon">Amazon Music</option>
                    </select>
                  </div>

                  <div style={{ backgroundColor: surfaceColor, padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600 }}>video skip duration</div>
                      <div style={{ fontSize: '10px', color: subTextColor }}>seconds per double tap</div>
                    </div>
                    <select
                      value={playbackSettings.skipDuration || 5}
                      onChange={(e) => updatePlaybackSetting('skipDuration', Number(e.target.value))}
                      style={{ backgroundColor: cardColor, color: textColor, border: `1px solid ${borderColor}`, padding: '6px 10px', fontSize: '11px', outline: 'none' }}
                    >
                      <option value={5}>5 seconds</option>
                      <option value={10}>10 seconds</option>
                      <option value={15}>15 seconds</option>
                    </select>
                  </div>

                  <MetroToggle
                    label="show computer vision & ai tags"
                    checked={playbackSettings.showAITags}
                    onText="on"
                    offText="off"
                    onChange={(checked) => updatePlaybackSetting('showAITags', checked)}
                  />
                </div>
              </div>

              {/* Personalization Section */}
              <div>
                <div style={{ fontSize: '16px', fontWeight: 300, marginBottom: '10px', color: accent }}>
                  personalization & aesthetics
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <MetroToggle
                    label={`theme`}
                    checked={isDark}
                    onText="dark"
                    offText="light"
                    onChange={(checked) => {
                      const newMode = checked ? 'dark' : 'light';
                      setThemeMode(newMode);
                      localStorage.setItem('metro_theme', newMode);
                    }}
                  />

                  <MetroToggle
                    label="3D live tile animations"
                    checked={enableLiveFlip}
                    onText="on"
                    offText="off"
                    onChange={(checked) => {
                      setEnableLiveFlip(checked);
                      localStorage.setItem('metro_live_flip', String(checked));
                    }}
                  />

                  <MetroToggle
                    label="system sound effects"
                    checked={soundEnabled}
                    onText="on"
                    offText="off"
                    onChange={(checked) => {
                      setSoundEnabled(checked);
                      localStorage.setItem('metro_sound', String(checked));
                    }}
                  />

                  <MetroToggle
                    label="crt retro scanlines"
                    checked={playbackSettings.crtMode}
                    onText="on"
                    offText="off"
                    onChange={(checked) => updatePlaybackSetting('crtMode', checked)}
                  />
                </div>
              </div>

              {/* Accent Colors Grid (20 Metro Colors) */}
              <div>
                <div style={{ fontSize: '16px', fontWeight: 300, marginBottom: '10px', color: accent }}>
                  accent color
                </div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(5, 1fr)',
                  gap: '8px',
                }}>
                  {METRO_ACCENTS.map(c => {
                    const isSelected = accent.toLowerCase() === c.hex.toLowerCase();
                    return (
                      <motion.div
                        key={c.hex}
                        whileTap={{ scale: 0.92 }}
                        onClick={() => {
                          setAccent(c.hex);
                          localStorage.setItem('metro_accent', c.hex);
                          triggerSound();
                        }}
                        style={{
                          aspectRatio: '1/1',
                          backgroundColor: c.hex,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: isSelected ? '3px solid #FFFFFF' : 'none',
                          boxShadow: isSelected ? '0 0 8px rgba(255,255,255,0.8)' : 'none',
                        }}
                        title={c.name}
                      >
                        {isSelected && <Check size={18} color="#FFFFFF" strokeWidth={3} />}
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              {/* ActiveSync & Network */}
              <div>
                <div style={{ fontSize: '16px', fontWeight: 300, marginBottom: '10px', color: accent }}>
                  activesync & vault
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ backgroundColor: surfaceColor, padding: '12px' }}>
                    <div style={{ fontSize: '11px', color: subTextColor }}>LAPTOP VAULT HOST IP</div>
                    <input
                      type="text"
                      value={serverHost}
                      onChange={(e) => {
                        setServerHost(e.target.value);
                        localStorage.setItem('metro_server_host', e.target.value);
                      }}
                      style={{
                        width: '100%',
                        backgroundColor: cardColor,
                        color: textColor,
                        border: `1px solid ${borderColor}`,
                        padding: '8px',
                        fontSize: '13px',
                        fontFamily: 'monospace',
                        marginTop: '4px',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  <MetroToggle
                    label="auto-sync on app launch"
                    checked={autoSyncOnOpen}
                    onText="on"
                    offText="off"
                    onChange={(checked) => {
                      setAutoSyncOnOpen(checked);
                      localStorage.setItem('metro_auto_sync', String(checked));
                    }}
                  />

                  <button
                    onClick={handleRunSync}
                    disabled={isSyncing}
                    style={{
                      backgroundColor: accent,
                      color: '#FFFFFF',
                      border: 'none',
                      padding: '12px',
                      fontSize: '13px',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                    }}
                  >
                    <RefreshCw size={16} className={isSyncing ? 'spin-anim' : ''} />
                    <span>{isSyncing ? 'ActiveSync in Progress...' : 'ActiveSync with Laptop Now'}</span>
                  </button>

                  {/* Sync Logs Terminal */}
                  {syncLogs.length > 0 && (
                    <div style={{
                      backgroundColor: isDark ? '#080808' : '#F0F0F0',
                      border: `1px solid ${borderColor}`,
                      padding: '8px 10px',
                      fontSize: '10px',
                      fontFamily: 'monospace',
                      maxHeight: '80px',
                      overflowY: 'auto',
                      lineHeight: 1.4,
                      color: subTextColor,
                    }}>
                      {syncLogs.map((log, i) => <div key={i}>{log}</div>)}
                    </div>
                  )}
                </div>
              </div>

              {/* Storage Sense */}
              <div>
                <div style={{ fontSize: '16px', fontWeight: 300, marginBottom: '10px', color: accent }}>
                  storage sense
                </div>
                <div style={{ backgroundColor: surfaceColor, padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <div style={{ fontSize: '28px', fontWeight: 200 }}>{stats.storageMb} MB</div>
                    <div style={{ fontSize: '11px', color: subTextColor }}>used by MemWault offline</div>
                  </div>

                  {/* Segmented Color Bar */}
                  <div style={{ height: '8px', width: '100%', backgroundColor: borderColor, display: 'flex', overflow: 'hidden' }}>
                    <div style={{ width: '60%', backgroundColor: accent }} />
                    <div style={{ width: '25%', backgroundColor: '#D80073' }} />
                    <div style={{ width: '15%', backgroundColor: '#008A00' }} />
                  </div>

                  <div style={{ display: 'flex', gap: '12px', fontSize: '10px', color: subTextColor }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <div style={{ width: '8px', height: '8px', backgroundColor: accent }} />
                      <span>{stories.length} Memories</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <div style={{ width: '8px', height: '8px', backgroundColor: '#D80073' }} />
                      <span>{posts.length} Posts</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <div style={{ width: '8px', height: '8px', backgroundColor: '#008A00' }} />
                      <span>{journaledItems.length + places.length} Journal/Places</span>
                    </div>
                  </div>

                  <button
                    onClick={() => setConfirmClearOpen(true)}
                    style={{
                      marginTop: '6px',
                      backgroundColor: 'transparent',
                      color: '#A20025',
                      border: '1px solid #A20025',
                      padding: '8px',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    clear offline storage
                  </button>
                </div>
              </div>

              {/* About & System Info */}
              <div style={{ backgroundColor: surfaceColor, padding: '14px', borderLeft: `4px solid ${accent}` }}>
                <div style={{ fontSize: '13px', fontWeight: 600 }}>MemWault Pocket Companion</div>
                <div style={{ fontSize: '11px', color: subTextColor, marginTop: '2px' }}>
                  Mobile Vault Edition
                </div>
                <div style={{ fontSize: '10px', color: subTextColor, marginTop: '2px' }}>
                  MemWault Companion Engine v2.5
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}