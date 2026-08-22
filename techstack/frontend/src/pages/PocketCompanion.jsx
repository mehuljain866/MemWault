import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Image as ImageIcon, Film, BookOpen, Search, 
  Plus, ArrowLeft, RefreshCw, Settings as SettingsIcon, 
  X, Camera, Music, MapPin, Check, ExternalLink, 
  Calendar, Edit3, Save, Trash2, HardDrive, Smartphone, 
  Sparkles, Volume2, VolumeX, Download, Play, Pause, 
  ChevronLeft, ChevronRight, Grid, List, Heart, 
  MessageCircle, Share2, Layers, Bookmark, User as UserIcon, 
  Sliders, Palette, Brush, Eraser, RotateCcw, Compass, 
  CheckSquare, Square, Tag, Move, Paperclip, Info, Eye
} from 'lucide-react';
import { 
  getOfflineMemories, getOfflinePosts, getOfflineHighlights, 
  getStorageStats, syncPocketWithLaptop, getPocketSyncMeta, 
  getOnThisDayMemories, getCachedMediaBlob 
} from '../services/pocketSync';
import { 
  addPendingMobileUpload, getPendingMobileUploads, 
  saveMemoriesOffline, savePostsOffline, openMobileDB 
} from '../services/memwaultMobileDB';
import { 
  updateStory, updatePost, setToken, isAuthenticated, 
  getHighlights, getHighlightStories, getInstagramSession 
} from '../services/api';
import MusicPlayer from '../components/MusicPlayer';

const DRAWING_COLORS = [
  '#007AFF', '#34C759', '#FF9500', '#FF2D55', '#AF52DE', 
  '#5856D6', '#FFCC00', '#5AC8FA', '#FFFFFF', '#000000'
];

const CUSTOM_STICKER_SETS = [
  { id: 'stamp_vault', label: 'VAULT SEAL', bg: '#FF2D55', text: 'MEMWAULT ARCHIVE', icon: '🏛️' },
  { id: 'stamp_loc', label: 'PASSPORT', bg: '#007AFF', text: 'VERIFIED LOCATION', icon: '✈️' },
  { id: 'stamp_sound', label: 'VINYL', bg: '#34C759', text: 'SOUNDTRACK 33⅓', icon: '🎵' },
  { id: 'stamp_date', label: 'TIMECODE', bg: '#FF9500', text: 'ON THIS DAY', icon: '⏳' },
  { id: 'stamp_polaroid', label: 'POLAROID', bg: '#E8E8E8', text: 'ORIGINAL SHOT', icon: '📸', darkText: true },
  { id: 'stamp_fav', label: 'FAVORITE', bg: '#AF52DE', text: 'CORE MEMORY', icon: '💖' },
];

function useOfflineMediaUrl(url) {
  const [src, setSrc] = useState(url);

  useEffect(() => {
    if (!url) return;
    let isMounted = true;
    let objectUrl = null;

    getCachedMediaBlob(url).then(blob => {
      if (blob && isMounted) {
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      } else if (isMounted) {
        setSrc(url);
      }
    }).catch(() => {
      if (isMounted) setSrc(url);
    });

    return () => {
      isMounted = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url]);

  return src;
}

function OfflineMedia({ src, alt = '', style = {}, isVideo = false, ...props }) {
  const resolvedUrl = useOfflineMediaUrl(src);
  const [loadError, setLoadError] = useState(false);

  if (!resolvedUrl || loadError) {
    return (
      <div style={{ ...style, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.05)' }}>
        <ImageIcon size={20} color="var(--ios-text-secondary, #888)" opacity={0.4} />
      </div>
    );
  }

  const cleanUrl = typeof resolvedUrl === 'string' ? resolvedUrl.split('?')[0].toLowerCase() : '';
  const detectedVideo = isVideo || cleanUrl.endsWith('.mp4') || cleanUrl.endsWith('.mov') || cleanUrl.endsWith('.webm') || cleanUrl.includes('_n.mp4');

  if (detectedVideo) {
    return (
      <video
        src={resolvedUrl}
        style={{ ...style, objectFit: 'cover' }}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        onError={() => setLoadError(true)}
        {...props}
      />
    );
  }

  return (
    <img
      src={resolvedUrl}
      alt={alt}
      style={{ ...style, objectFit: 'cover' }}
      loading="lazy"
      onError={() => setLoadError(true)}
      {...props}
    />
  );
}

function getMediaUrl(item) {
  if (!item) return '';
  if (typeof item === 'string') return item;
  if (item.display_url) return item.display_url;
  if (item.media_url) return item.media_url;
  if (item.instagram_media_url) return item.instagram_media_url;
  if (item.s3_key_compressed) return `/media/${item.s3_key_compressed}`;
  if (item.media_items && item.media_items.length > 0) {
    const first = item.media_items[0];
    return first.display_url || first.media_url || first.instagram_media_url || (first.s3_key_compressed ? `/media/${first.s3_key_compressed}` : '');
  }
  return '';
}

export default function PocketCompanion() {
  const [activeTab, setActiveTab] = useState('feed'); // 'feed' | 'memories' | 'journal' | 'camera' | 'settings'
  const [themeMode, setThemeMode] = useState(() => localStorage.getItem('pocket_theme') || 'dark');
  const [stories, setStories] = useState([]);
  const [posts, setPosts] = useState([]);
  const [highlights, setHighlights] = useState([]);
  const [onThisDayStories, setOnThisDayStories] = useState([]);
  const [storageStats, setStorageStats] = useState({ totalBytes: 0, formattedMB: '0.00 MB', storyCount: 0, postCount: 0 });
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState({ step: 'Ready', percent: 0, status: 'idle' });
  const [toastMessage, setToastMessage] = useState(null);

  // Story / Post Detail Fullscreen Viewer
  const [activeStoryViewer, setActiveStoryViewer] = useState(null);
  const [storyViewerIndex, setStoryViewerIndex] = useState(0);
  const [storyViewerList, setStoryViewerList] = useState([]);
  const [showMusicPlayerModal, setShowMusicPlayerModal] = useState(false);

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all' | 'photos' | 'videos' | 'journaled' | 'music'
  const [feedViewMode, setFeedViewMode] = useState('grid'); // 'grid' | 'cards'

  // Journal App state
  const [journalActiveSection, setJournalActiveSection] = useState('memories'); // 'memories' | 'places'
  const [selectedJournalStory, setSelectedJournalStory] = useState(null);
  const [journalNoteText, setJournalNoteText] = useState('');
  const [placedStickers, setPlacedStickers] = useState([]);
  const [attachedDoodleUrl, setAttachedDoodleUrl] = useState(null);
  const [isSavingJournal, setIsSavingJournal] = useState(false);
  const scrapbookRef = useRef(null);

  // MS Paint Modal State
  const [isPaintOpen, setIsPaintOpen] = useState(false);
  const [paintTool, setPaintTool] = useState('brush');
  const [paintColor, setPaintColor] = useState('#007AFF');
  const [paintBrushSize, setPaintBrushSize] = useState(4);
  const paintCanvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Places to Visit
  const [places, setPlaces] = useState(() => {
    const saved = localStorage.getItem('memwault_places_to_visit');
    return saved ? JSON.parse(saved) : [
      { id: '1', title: 'See the Northern Lights in Tromsø', location: 'Norway', category: 'Nature', completed: false },
      { id: '2', title: 'Explore Fushimi Inari Shrine at Dawn', location: 'Kyoto, Japan', category: 'Culture', completed: false },
      { id: '3', title: 'Road trip across Amalfi Coast', location: 'Italy', category: 'Roadtrip', completed: true }
    ];
  });
  const [newPlaceTitle, setNewPlaceTitle] = useState('');
  const [newPlaceLocation, setNewPlaceLocation] = useState('');
  const [newPlaceCategory, setNewPlaceCategory] = useState('Travel');

  // Camera capture
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef(null);
  const [capturedPhoto, setCapturedPhoto] = useState(null);

  const isDark = themeMode === 'dark';
  const bgColor = isDark ? '#0a0a0c' : '#F2F2F7';
  const cardBg = isDark ? 'rgba(255, 255, 255, 0.07)' : '#FFFFFF';
  const cardBorder = isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)';
  const textColor = isDark ? '#FFFFFF' : '#000000';
  const subTextColor = isDark ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.55)';
  const accentColor = 'var(--ios-accent, #007AFF)';

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3200);
  };

  useEffect(() => {
    loadAllOfflineData();
  }, []);

  const loadAllOfflineData = async () => {
    try {
      setLoading(true);
      const [memList, postList, hlList, stats] = await Promise.all([
        getOfflineMemories(),
        getOfflinePosts(),
        getOfflineHighlights(),
        getStorageStats()
      ]);
      setStories(memList);
      setPosts(postList);
      setHighlights(hlList);
      setStorageStats(stats);

      const flashbacks = getOnThisDayMemories(memList);
      setOnThisDayStories(flashbacks);
    } catch (err) {
      console.error('Failed to load mobile data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRunSync = async () => {
    setIsSyncing(true);
    showToast('Starting ActiveSync with laptop...');
    try {
      const result = await syncPocketWithLaptop((prog) => {
        setSyncProgress(prog);
      });
      if (result.success) {
        showToast(`✓ Synced ${result.syncedStories} stories, ${result.syncedPosts} posts!`);
        await loadAllOfflineData();
      } else {
        showToast('Sync completed with warnings.');
      }
    } catch (err) {
      showToast('Sync error: ' + err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  // Open Fullscreen Viewer
  const openStoryViewer = (storyList, index) => {
    setStoryViewerList(storyList);
    setStoryViewerIndex(index);
    setActiveStoryViewer(storyList[index]);
  };

  const handleNextStory = () => {
    if (storyViewerIndex < storyViewerList.length - 1) {
      const nextIdx = storyViewerIndex + 1;
      setStoryViewerIndex(nextIdx);
      setActiveStoryViewer(storyViewerList[nextIdx]);
    } else {
      setActiveStoryViewer(null);
    }
  };

  const handlePrevStory = () => {
    if (storyViewerIndex > 0) {
      const prevIdx = storyViewerIndex - 1;
      setStoryViewerIndex(prevIdx);
      setActiveStoryViewer(storyViewerList[prevIdx]);
    }
  };

  // MS Paint Drawing Logic
  const handleStartDraw = (e) => {
    const canvas = paintCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches ? e.touches[0] : e;
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const handleMoveDraw = (e) => {
    if (!isDrawing) return;
    const canvas = paintCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches ? e.touches[0] : e;
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (paintTool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = paintBrushSize * 3;
    } else if (paintTool === 'glow') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = paintColor;
      ctx.shadowColor = paintColor;
      ctx.shadowBlur = 10;
      ctx.lineWidth = paintBrushSize * 2;
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = paintColor;
      ctx.shadowBlur = 0;
      ctx.lineWidth = paintBrushSize;
    }

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const handleEndDraw = () => {
    setIsDrawing(false);
  };

  const handleSavePaintDoodle = () => {
    if (paintCanvasRef.current) {
      const dataUrl = paintCanvasRef.current.toDataURL();
      setAttachedDoodleUrl(dataUrl);
      setIsPaintOpen(false);
      showToast('✓ Doodle attached to Journal!');
    }
  };

  const handleSaveJournal = async () => {
    if (!selectedJournalStory) return;
    setIsSavingJournal(true);
    try {
      let fullNote = journalNoteText;
      if (placedStickers.length > 0) {
        fullNote += `\n\nStickers: ${placedStickers.map(s => s.text).join(' • ')}`;
      }
      if (attachedDoodleUrl) {
        localStorage.setItem(`memwault_doodles_${selectedJournalStory.id}`, JSON.stringify([{ id: Date.now(), url: attachedDoodleUrl }]));
      }
      await updateStory(selectedJournalStory.id, { journal_note: fullNote });
      showToast('✓ Journal note saved to Vault!');
      setSelectedJournalStory(null);
      setJournalNoteText('');
      setPlacedStickers([]);
      setAttachedDoodleUrl(null);
      loadAllOfflineData();
    } catch (err) {
      showToast('Failed to save: ' + err.message);
    } finally {
      setIsSavingJournal(false);
    }
  };

  // Camera Handler
  useEffect(() => {
    if (activeTab === 'camera') {
      navigator.mediaDevices?.getUserMedia({ video: { facingMode: 'environment' } })
        .then(stream => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            setIsCameraActive(true);
          }
        })
        .catch(err => {
          console.error('Camera error:', err);
          showToast('Camera permission needed');
        });
    } else {
      if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(t => t.stop());
      }
      setIsCameraActive(false);
      setCapturedPhoto(null);
    }
  }, [activeTab]);

  const handleCaptureSnapshot = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 720;
    canvas.height = videoRef.current.videoHeight || 1280;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const photoUrl = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedPhoto(photoUrl);
  };

  const handleSaveCapturedPhoto = async () => {
    if (!capturedPhoto) return;
    try {
      await addPendingMobileUpload({
        id: Date.now().toString(),
        dataUrl: capturedPhoto,
        type: 'photo',
        timestamp: new Date().toISOString(),
        caption: 'Captured with MemWault Pocket'
      });
      showToast('✓ Photo saved to Vault uploads queue!');
      setCapturedPhoto(null);
      setActiveTab('feed');
    } catch (err) {
      showToast('Failed to save photo: ' + err.message);
    }
  };

  const filteredStories = stories.filter(s => {
    const matchesSearch = !searchQuery || 
      (s.location_name && s.location_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (s.caption_text && s.caption_text.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (s.music?.track_title && s.music.track_title.toLowerCase().includes(searchQuery.toLowerCase()));
    
    if (!matchesSearch) return false;
    if (filterType === 'photos') return s.media_type === 1;
    if (filterType === 'videos') return s.media_type === 2;
    if (filterType === 'music') return Boolean(s.music?.track_title);
    if (filterType === 'journaled') return Boolean(s.journal_note);
    return true;
  });

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      maxWidth: '100%',
      backgroundColor: bgColor,
      color: textColor,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      position: 'relative'
    }}>
      {/* ── Toast Notification Banner ── */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            style={{
              position: 'fixed',
              top: '16px',
              left: '20px',
              right: '20px',
              backgroundColor: isDark ? 'rgba(30,30,30,0.95)' : 'rgba(255,255,255,0.95)',
              backdropFilter: 'blur(20px)',
              border: `1px solid ${cardBorder}`,
              color: textColor,
              padding: '12px 16px',
              borderRadius: '16px',
              fontSize: '13px',
              fontWeight: 600,
              zIndex: 99999,
              boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
              textAlign: 'center'
            }}
          >
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Top App Bar ── */}
      <div style={{
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: `1px solid ${cardBorder}`,
        backgroundColor: cardBg,
        backdropFilter: 'blur(20px)',
        zIndex: 50,
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #007AFF, #FF2D55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: 800,
            fontSize: '14px'
          }}>
            MW
          </div>
          <span style={{ fontSize: '18px', fontWeight: 800, letterSpacing: '-0.02em' }}>MemWault</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={handleRunSync}
            disabled={isSyncing}
            style={{
              background: 'transparent',
              border: 'none',
              color: isSyncing ? accentColor : subTextColor,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              padding: '6px'
            }}
            title="Sync Vault"
          >
            <RefreshCw size={18} className={isSyncing ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            style={{
              background: 'transparent',
              border: 'none',
              color: activeTab === 'settings' ? accentColor : subTextColor,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              padding: '6px'
            }}
            title="Settings"
          >
            <SettingsIcon size={18} />
          </button>
        </div>
      </div>

      {/* ── Main Tab Content Viewport ── */}
      <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', position: 'relative' }}>
        
        {/* ── TAB 1: FEED (Instagram Grid + Highlights Tray) ── */}
        {activeTab === 'feed' && (
          <div style={{ display: 'flex', flexDirection: 'column', paddingBottom: '80px' }}>
            
            {/* Highlights Tray */}
            {highlights.length > 0 && (
              <div style={{
                display: 'flex',
                gap: '14px',
                padding: '14px 16px',
                overflowX: 'auto',
                borderBottom: `1px solid ${cardBorder}`,
                scrollbarWidth: 'none'
              }}>
                {highlights.map((hl) => {
                  const coverUrl = hl.cover_media_url || (hl.preview_stories && hl.preview_stories[0]) || (hl.stories && hl.stories[0]?.media_url) || (stories[0]?.media_url);
                  return (
                    <div
                      key={hl.id}
                      onClick={() => {
                        const targetStories = hl.stories && hl.stories.length > 0 ? hl.stories : stories;
                        openStoryViewer(targetStories, 0);
                      }}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '6px',
                        cursor: 'pointer',
                        flexShrink: 0
                      }}
                    >
                      <div style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '50%',
                        padding: '2.5px',
                        background: 'linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <div style={{ width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden', border: `2px solid ${bgColor}` }}>
                          <OfflineMedia src={coverUrl} style={{ width: '100%', height: '100%' }} />
                        </div>
                      </div>
                      <span style={{ fontSize: '11px', fontWeight: 600, maxWidth: '64px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {hl.title}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* View Mode Switcher */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px 6px 16px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: subTextColor }}>
                {posts.length > 0 ? `${posts.length} POSTS` : `${stories.length} ARCHIVED STORIES`}
              </span>
              <div style={{ display: 'flex', gap: '4px', background: cardBg, padding: '2px', borderRadius: '8px' }}>
                <button
                  onClick={() => setFeedViewMode('grid')}
                  style={{
                    background: feedViewMode === 'grid' ? accentColor : 'transparent',
                    color: feedViewMode === 'grid' ? '#fff' : subTextColor,
                    border: 'none',
                    borderRadius: '6px',
                    padding: '4px 8px',
                    cursor: 'pointer'
                  }}
                >
                  <Grid size={14} />
                </button>
                <button
                  onClick={() => setFeedViewMode('cards')}
                  style={{
                    background: feedViewMode === 'cards' ? accentColor : 'transparent',
                    color: feedViewMode === 'cards' ? '#fff' : subTextColor,
                    border: 'none',
                    borderRadius: '6px',
                    padding: '4px 8px',
                    cursor: 'pointer'
                  }}
                >
                  <List size={14} />
                </button>
              </div>
            </div>

            {/* Posts Content Grid / Cards */}
            {feedViewMode === 'grid' ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2px' }}>
                {(posts.length > 0 ? posts : stories).map((item, idx) => {
                  const mediaUrl = getMediaUrl(item);
                  return (
                    <div
                      key={item.id || idx}
                      onClick={() => openStoryViewer((posts.length > 0 ? posts : stories), idx)}
                      style={{
                        aspectRatio: '1/1',
                        backgroundColor: '#000',
                        position: 'relative',
                        cursor: 'pointer',
                        overflow: 'hidden'
                      }}
                    >
                      <OfflineMedia src={mediaUrl} style={{ width: '100%', height: '100%' }} />
                      {item.media_type === 2 && (
                        <div style={{ position: 'absolute', top: '6px', right: '6px', color: '#fff', textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
                          <Film size={14} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '12px 16px' }}>
                {(posts.length > 0 ? posts : stories).map((item, idx) => {
                  const mediaUrl = getMediaUrl(item);
                  return (
                    <div
                      key={item.id || idx}
                      style={{
                        backgroundColor: cardBg,
                        border: `1px solid ${cardBorder}`,
                        borderRadius: '16px',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column'
                      }}
                    >
                      <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '13px', fontWeight: 700 }}>
                          {item.location_name || 'MemWault Archive'}
                        </span>
                        <span style={{ fontSize: '11px', color: subTextColor }}>
                          {new Date(item.taken_at).toLocaleDateString()}
                        </span>
                      </div>
                      <div 
                        onClick={() => openStoryViewer((posts.length > 0 ? posts : stories), idx)}
                        style={{ width: '100%', aspectRatio: '1/1', backgroundColor: '#000', cursor: 'pointer' }}
                      >
                        <OfflineMedia src={mediaUrl} style={{ width: '100%', height: '100%' }} />
                      </div>
                      {item.caption_text && (
                        <div style={{ padding: '12px 14px', fontSize: '13px', lineHeight: 1.4 }}>
                          {item.caption_text}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── TAB 2: MEMORIES (Timeline + On This Day Flashback) ── */}
        {activeTab === 'memories' && (
          <div style={{ display: 'flex', flexDirection: 'column', padding: '16px', gap: '16px', paddingBottom: '80px' }}>
            
            {/* On This Day Flashback Hero */}
            {onThisDayStories.length > 0 && (
              <div style={{
                background: 'linear-gradient(135deg, rgba(255,45,85,0.15), rgba(0,122,255,0.15))',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '20px',
                padding: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                cursor: 'pointer'
              }}
              onClick={() => openStoryViewer(onThisDayStories, 0)}
              >
                <div style={{ width: '60px', height: '80px', borderRadius: '10px', overflow: 'hidden', flexShrink: 0, backgroundColor: '#000' }}>
                  <OfflineMedia src={getMediaUrl(onThisDayStories[0])} style={{ width: '100%', height: '100%' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: '#FF2D55', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    ✨ On This Day Flashback
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: 700, margin: '2px 0' }}>
                    {onThisDayStories[0].location_name || 'Special Memory'}
                  </div>
                  <div style={{ fontSize: '12px', color: subTextColor }}>
                    {new Date(onThisDayStories[0].taken_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                  </div>
                </div>
                <ChevronRight size={20} color={subTextColor} />
              </div>
            )}

            {/* Filter Pills & Search */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', backgroundColor: cardBg, padding: '8px 12px', borderRadius: '12px', border: `1px solid ${cardBorder}` }}>
                <Search size={16} color={subTextColor} style={{ marginRight: '8px' }} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search memories, locations, songs..."
                  style={{ border: 'none', background: 'transparent', outline: 'none', color: 'inherit', width: '100%', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: '4px' }}>
                {['all', 'photos', 'videos', 'music', 'journaled'].map((t) => (
                  <button
                    key={t}
                    onClick={() => setFilterType(t)}
                    style={{
                      background: filterType === t ? accentColor : cardBg,
                      color: filterType === t ? '#fff' : textColor,
                      border: `1px solid ${cardBorder}`,
                      padding: '6px 12px',
                      borderRadius: '16px',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      flexShrink: 0,
                      textTransform: 'capitalize'
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Stories Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
              {filteredStories.map((story, idx) => (
                <div
                  key={story.id}
                  onClick={() => openStoryViewer(filteredStories, idx)}
                  style={{
                    backgroundColor: cardBg,
                    border: `1px solid ${cardBorder}`,
                    borderRadius: '16px',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column'
                  }}
                >
                  <div style={{ width: '100%', aspectRatio: '9/16', backgroundColor: '#000', position: 'relative' }}>
                    <OfflineMedia src={getMediaUrl(story)} style={{ width: '100%', height: '100%' }} />
                    {story.music?.track_title && (
                      <div style={{ position: 'absolute', bottom: '6px', left: '6px', backgroundColor: 'rgba(0,0,0,0.6)', padding: '2px 6px', borderRadius: '6px', fontSize: '9px', color: '#fff', display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <Music size={10} color="#34C759" />
                        <span>{story.music.track_title.substring(0, 14)}</span>
                      </div>
                    )}
                  </div>
                  <div style={{ padding: '8px', fontSize: '11px' }}>
                    <div style={{ fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {story.location_name || new Date(story.taken_at).toLocaleDateString()}
                    </div>
                    <div style={{ color: subTextColor, fontSize: '10px' }}>
                      {new Date(story.taken_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── TAB 3: JOURNAL & SCRAPBOOK ── */}
        {activeTab === 'journal' && (
          <div style={{ display: 'flex', flexDirection: 'column', padding: '16px', gap: '14px', paddingBottom: '80px' }}>
            
            {/* Segmented Switcher */}
            <div style={{ display: 'flex', backgroundColor: cardBg, padding: '3px', borderRadius: '12px', border: `1px solid ${cardBorder}` }}>
              <button
                onClick={() => setJournalActiveSection('memories')}
                style={{
                  flex: 1,
                  padding: '8px',
                  borderRadius: '9px',
                  border: 'none',
                  background: journalActiveSection === 'memories' ? accentColor : 'transparent',
                  color: journalActiveSection === 'memories' ? '#fff' : textColor,
                  fontWeight: 700,
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                📓 Memories & Scrapbook
              </button>
              <button
                onClick={() => setJournalActiveSection('places')}
                style={{
                  flex: 1,
                  padding: '8px',
                  borderRadius: '9px',
                  border: 'none',
                  background: journalActiveSection === 'places' ? accentColor : 'transparent',
                  color: journalActiveSection === 'places' ? '#fff' : textColor,
                  fontWeight: 700,
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                ✈️ Places to Visit
              </button>
            </div>

            {journalActiveSection === 'memories' ? (
              selectedJournalStory ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <button
                    onClick={() => setSelectedJournalStory(null)}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: accentColor, fontWeight: 700, fontSize: '13px', cursor: 'pointer', padding: '4px 0' }}
                  >
                    <ArrowLeft size={16} /> Back to Entries
                  </button>

                  {/* Interactive Scrapbooking Canvas with Drag & Drop */}
                  <div style={{
                    backgroundColor: cardBg,
                    border: `1px solid ${cardBorder}`,
                    borderRadius: '16px',
                    padding: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700 }}>Scrapbook Canvas (Drag Stickers)</span>
                      <button
                        onClick={() => setIsPaintOpen(true)}
                        style={{ background: '#34C759', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Brush size={12} /> Draw Doodle
                      </button>
                    </div>

                    <div
                      ref={scrapbookRef}
                      style={{
                        width: '100%',
                        height: '220px',
                        backgroundColor: '#000',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <OfflineMedia src={getMediaUrl(selectedJournalStory)} style={{ width: '100%', height: '100%', opacity: 0.7 }} />
                      
                      {attachedDoodleUrl && (
                        <img src={attachedDoodleUrl} alt="Doodle" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none' }} />
                      )}

                      {placedStickers.map((stk, idx) => (
                        <motion.div
                          key={idx}
                          drag
                          dragConstraints={scrapbookRef}
                          whileDrag={{ scale: 1.15 }}
                          style={{
                            position: 'absolute',
                            backgroundColor: stk.bg,
                            color: stk.darkText ? '#000' : '#FFF',
                            padding: '4px 8px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 800,
                            cursor: 'grab',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            zIndex: 10
                          }}
                        >
                          <span>{stk.icon}</span>
                          <span>{stk.text}</span>
                        </motion.div>
                      ))}
                    </div>

                    {/* Sticker Tray */}
                    <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', padding: '4px 0', scrollbarWidth: 'none' }}>
                      {CUSTOM_STICKER_SETS.map(s => (
                        <button
                          key={s.id}
                          onClick={() => setPlacedStickers([...placedStickers, s])}
                          style={{
                            backgroundColor: s.bg,
                            color: s.darkText ? '#000' : '#fff',
                            border: 'none',
                            padding: '4px 8px',
                            borderRadius: '6px',
                            fontSize: '10px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            flexShrink: 0
                          }}
                        >
                          {s.icon} {s.label}
                        </button>
                      ))}
                      {placedStickers.length > 0 && (
                        <button
                          onClick={() => setPlacedStickers([])}
                          style={{ backgroundColor: '#FF3B30', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Note text area */}
                  <textarea
                    value={journalNoteText}
                    onChange={(e) => setJournalNoteText(e.target.value)}
                    placeholder="Write thoughts, memories, reflections..."
                    rows={5}
                    style={{
                      backgroundColor: cardBg,
                      border: `1px solid ${cardBorder}`,
                      borderRadius: '16px',
                      color: textColor,
                      padding: '12px',
                      fontSize: '13px',
                      outline: 'none',
                      fontFamily: 'inherit',
                      width: '100%',
                      boxSizing: 'border-box'
                    }}
                  />

                  <button
                    onClick={handleSaveJournal}
                    disabled={isSavingJournal}
                    style={{
                      backgroundColor: accentColor,
                      color: '#fff',
                      border: 'none',
                      padding: '12px',
                      borderRadius: '14px',
                      fontSize: '14px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    {isSavingJournal ? 'Saving...' : 'Save Journal Entry'}
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: subTextColor }}>SELECT A MEMORY TO WRITE / SCRAPBOOK:</span>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                    {stories.map((story) => (
                      <div
                        key={story.id}
                        onClick={() => {
                          setSelectedJournalStory(story);
                          setJournalNoteText(story.journal_note || '');
                        }}
                        style={{
                          aspectRatio: '9/16',
                          backgroundColor: '#000',
                          borderRadius: '10px',
                          overflow: 'hidden',
                          position: 'relative',
                          cursor: 'pointer',
                          border: story.journal_note ? `2px solid ${accentColor}` : 'none'
                        }}
                      >
                        <OfflineMedia src={getMediaUrl(story)} style={{ width: '100%', height: '100%' }} />
                        {story.journal_note && (
                          <div style={{ position: 'absolute', bottom: '4px', right: '4px', backgroundColor: accentColor, color: '#fff', fontSize: '9px', fontWeight: 700, padding: '2px 4px', borderRadius: '4px' }}>
                            ✓ Note
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )
            ) : (
              /* Places to Visit Bucket List */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!newPlaceTitle.trim()) return;
                    const newPlace = { id: Date.now().toString(), title: newPlaceTitle, location: newPlaceLocation || 'Worldwide', category: newPlaceCategory, completed: false };
                    const updated = [newPlace, ...places];
                    setPlaces(updated);
                    localStorage.setItem('memwault_places_to_visit', JSON.stringify(updated));
                    setNewPlaceTitle('');
                    setNewPlaceLocation('');
                  }}
                  style={{ display: 'flex', flexDirection: 'column', gap: '8px', backgroundColor: cardBg, padding: '12px', borderRadius: '16px', border: `1px solid ${cardBorder}` }}
                >
                  <input
                    type="text"
                    value={newPlaceTitle}
                    onChange={(e) => setNewPlaceTitle(e.target.value)}
                    placeholder="Add Destination / Bucket list item..."
                    style={{ padding: '8px', borderRadius: '8px', border: `1px solid ${cardBorder}`, background: 'transparent', color: 'inherit', fontSize: '13px', outline: 'none' }}
                  />
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      value={newPlaceLocation}
                      onChange={(e) => setNewPlaceLocation(e.target.value)}
                      placeholder="City, Country"
                      style={{ flex: 1, padding: '8px', borderRadius: '8px', border: `1px solid ${cardBorder}`, background: 'transparent', color: 'inherit', fontSize: '12px', outline: 'none' }}
                    />
                    <button type="submit" style={{ backgroundColor: accentColor, color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: 700, fontSize: '12px' }}>
                      + Add
                    </button>
                  </div>
                </form>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {places.map((place) => (
                    <div
                      key={place.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px',
                        backgroundColor: cardBg,
                        border: `1px solid ${cardBorder}`,
                        borderRadius: '14px'
                      }}
                    >
                      <div
                        onClick={() => {
                          const updated = places.map(p => p.id === place.id ? { ...p, completed: !p.completed } : p);
                          setPlaces(updated);
                          localStorage.setItem('memwault_places_to_visit', JSON.stringify(updated));
                        }}
                        style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', flex: 1 }}
                      >
                        <div style={{ width: '20px', height: '20px', borderRadius: '6px', border: `2px solid ${place.completed ? '#34C759' : subTextColor}`, backgroundColor: place.completed ? '#34C759' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                          {place.completed && <Check size={14} />}
                        </div>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 600, textDecoration: place.completed ? 'line-through' : 'none', opacity: place.completed ? 0.6 : 1 }}>
                            {place.title}
                          </div>
                          <div style={{ fontSize: '11px', color: subTextColor }}>
                            {place.location} · {place.category}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          const updated = places.filter(p => p.id !== place.id);
                          setPlaces(updated);
                          localStorage.setItem('memwault_places_to_visit', JSON.stringify(updated));
                        }}
                        style={{ background: 'none', border: 'none', color: '#FF3B30', cursor: 'pointer', padding: '6px' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── TAB 4: CAMERA CAPTURE ── */}
        {activeTab === 'camera' && (
          <div style={{ width: '100%', height: 'calc(100vh - 130px)', position: 'relative', backgroundColor: '#000', display: 'flex', flexDirection: 'column' }}>
            {capturedPhoto ? (
              <div style={{ flex: 1, position: 'relative' }}>
                <img src={capturedPhoto} alt="Snapshot" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <div style={{ position: 'absolute', bottom: '20px', left: '20px', right: '20px', display: 'flex', gap: '12px' }}>
                  <button onClick={() => setCapturedPhoto(null)} style={{ flex: 1, padding: '12px', borderRadius: '14px', border: 'none', backgroundColor: 'rgba(255,255,255,0.2)', color: '#fff', fontWeight: 700 }}>
                    Retake
                  </button>
                  <button onClick={handleSaveCapturedPhoto} style={{ flex: 1, padding: '12px', borderRadius: '14px', border: 'none', backgroundColor: accentColor, color: '#fff', fontWeight: 700 }}>
                    Save to Vault
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ flex: 1, position: 'relative' }}>
                <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <div style={{ position: 'absolute', bottom: '24px', left: '50%', transform: 'translateX(-50%)' }}>
                  <button
                    onClick={handleCaptureSnapshot}
                    style={{
                      width: '68px',
                      height: '68px',
                      borderRadius: '50%',
                      backgroundColor: '#fff',
                      border: '4px solid rgba(0,0,0,0.3)',
                      boxShadow: '0 0 20px rgba(0,0,0,0.5)',
                      cursor: 'pointer'
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── TAB 5: SETTINGS ── */}
        {activeTab === 'settings' && (
          <div style={{ display: 'flex', flexDirection: 'column', padding: '16px', gap: '16px', paddingBottom: '80px' }}>
            
            {/* Theme Toggle */}
            <div style={{ backgroundColor: cardBg, borderRadius: '16px', border: `1px solid ${cardBorder}`, padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 700 }}>Appearance</div>
                <div style={{ fontSize: '12px', color: subTextColor }}>Toggle app color theme</div>
              </div>
              <button
                onClick={() => {
                  const newTheme = isDark ? 'light' : 'dark';
                  setThemeMode(newTheme);
                  localStorage.setItem('pocket_theme', newTheme);
                }}
                style={{
                  backgroundColor: accentColor,
                  color: '#fff',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '12px',
                  fontWeight: 700,
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                theme: {themeMode}
              </button>
            </div>

            {/* Storage Sense */}
            <div style={{ backgroundColor: cardBg, borderRadius: '16px', border: `1px solid ${cardBorder}`, padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ fontSize: '14px', fontWeight: 700 }}>Offline Vault Storage</div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: accentColor }}>{storageStats.formattedMB}</div>
              <div style={{ fontSize: '12px', color: subTextColor }}>
                {storageStats.storyCount} stories and {storageStats.postCount} posts cached 100% offline in IndexedDB.
              </div>
            </div>

            {/* ActiveSync */}
            <div style={{ backgroundColor: cardBg, borderRadius: '16px', border: `1px solid ${cardBorder}`, padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ fontSize: '14px', fontWeight: 700 }}>Laptop Synchronization</div>
              <div style={{ fontSize: '12px', color: subTextColor }}>
                Sync media blobs, highlight covers, audio previews, and journal notes directly over LAN Wi-Fi.
              </div>
              <button
                onClick={handleRunSync}
                disabled={isSyncing}
                style={{
                  backgroundColor: accentColor,
                  color: '#fff',
                  border: 'none',
                  padding: '12px',
                  borderRadius: '12px',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />
                {isSyncing ? 'Syncing with Laptop...' : 'Sync Vault Now'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Bottom Floating Navigation Bar ── */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: '60px',
        backgroundColor: cardBg,
        backdropFilter: 'blur(20px)',
        borderTop: `1px solid ${cardBorder}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        zIndex: 100
      }}>
        {[
          { id: 'feed', label: 'Feed', icon: <Grid size={20} /> },
          { id: 'memories', label: 'Memories', icon: <Sparkles size={20} /> },
          { id: 'journal', label: 'Journal', icon: <BookOpen size={20} /> },
          { id: 'camera', label: 'Capture', icon: <Camera size={20} /> },
          { id: 'settings', label: 'Settings', icon: <SettingsIcon size={20} /> }
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                background: 'transparent',
                border: 'none',
                color: isActive ? accentColor : subTextColor,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '3px',
                fontSize: '10px',
                fontWeight: isActive ? 700 : 500,
                cursor: 'pointer',
                padding: '6px 12px'
              }}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── Story Fullscreen Player Modal ── */}
      <AnimatePresence>
        {activeStoryViewer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: '#000',
              zIndex: 99999,
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {/* Top Bar */}
            <div style={{ position: 'absolute', top: '16px', left: '16px', right: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 100 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#fff', fontSize: '13px', fontWeight: 700, textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>
                  {activeStoryViewer.location_name || 'Archived Story'}
                </span>
                <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '11px' }}>
                  {new Date(activeStoryViewer.taken_at).toLocaleDateString()}
                </span>
              </div>
              <button
                onClick={() => setActiveStoryViewer(null)}
                style={{ background: 'rgba(0,0,0,0.5)', border: 'none', color: '#fff', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Media Canvas */}
            <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <OfflineMedia
                src={getMediaUrl(activeStoryViewer)}
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />

              {/* Prev / Next Touch Zones */}
              <div onClick={handlePrevStory} style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '30%', cursor: 'pointer' }} />
              <div onClick={handleNextStory} style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '30%', cursor: 'pointer' }} />
            </div>

            {/* Bottom Controls Bar */}
            <div style={{ padding: '16px', backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(20px)', display: 'flex', flexDirection: 'column', gap: '8px', zIndex: 100 }}>
              {activeStoryViewer.music?.track_title && (
                <div 
                  onClick={() => setShowMusicPlayerModal(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#34C759', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                >
                  <Music size={14} />
                  <span>{activeStoryViewer.music.track_title} · {activeStoryViewer.music.artist_name}</span>
                </div>
              )}
              {activeStoryViewer.location_name && (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(activeStoryViewer.location_name)}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#007AFF', fontSize: '11px', textDecoration: 'none', fontWeight: 600 }}
                >
                  <MapPin size={12} />
                  <span>Open Location in Maps ↗</span>
                </a>
              )}
            </div>

            {/* Embedded Polished Music Player */}
            {showMusicPlayerModal && activeStoryViewer.music && (
              <div style={{ position: 'absolute', bottom: '80px', left: '16px', right: '16px', zIndex: 200 }}>
                <MusicPlayer
                  music={activeStoryViewer.music}
                  onExternalOpen={() => setShowMusicPlayerModal(false)}
                />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MS Paint Fullscreen Mobile Doodler Modal ── */}
      <AnimatePresence>
        {isPaintOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: '#000',
              zIndex: 999999,
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {/* Paint Toolbar */}
            <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: cardBg, borderBottom: `1px solid ${cardBorder}` }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                {[
                  { id: 'brush', label: 'Brush' },
                  { id: 'glow', label: 'Glow' },
                  { id: 'eraser', label: 'Eraser' }
                ].map(t => (
                  <button
                    key={t.id}
                    onClick={() => setPaintTool(t.id)}
                    style={{
                      background: paintTool === t.id ? accentColor : 'transparent',
                      color: paintTool === t.id ? '#fff' : textColor,
                      border: `1px solid ${cardBorder}`,
                      padding: '6px 10px',
                      borderRadius: '8px',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setIsPaintOpen(false)}
                  style={{ background: 'none', border: `1px solid ${cardBorder}`, color: textColor, padding: '6px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 600 }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSavePaintDoodle}
                  style={{ background: '#34C759', border: 'none', color: '#fff', padding: '6px 14px', borderRadius: '8px', fontSize: '11px', fontWeight: 700 }}
                >
                  Attach Doodle ✓
                </button>
              </div>
            </div>

            {/* Drawing Canvas */}
            <div style={{ flex: 1, position: 'relative', touchAction: 'none' }}>
              <canvas
                ref={paintCanvasRef}
                width={window.innerWidth}
                height={window.innerHeight - 130}
                onTouchStart={handleStartDraw}
                onTouchMove={handleMoveDraw}
                onTouchEnd={handleEndDraw}
                onMouseDown={handleStartDraw}
                onMouseMove={handleMoveDraw}
                onMouseUp={handleEndDraw}
                style={{ width: '100%', height: '100%', backgroundColor: '#111', cursor: 'crosshair' }}
              />
            </div>

            {/* Color Palette */}
            <div style={{ padding: '10px 16px', display: 'flex', gap: '10px', overflowX: 'auto', backgroundColor: cardBg, borderTop: `1px solid ${cardBorder}`, scrollbarWidth: 'none' }}>
              {DRAWING_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setPaintColor(c)}
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    backgroundColor: c,
                    border: paintColor === c ? '3px solid #fff' : '1px solid rgba(255,255,255,0.3)',
                    flexShrink: 0,
                    cursor: 'pointer'
                  }}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}