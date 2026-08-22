import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Image as ImageIcon, Film, BookOpen, Search, 
  Wifi, Battery, Plus, ArrowLeft, RefreshCw,
  Settings as SettingsIcon, X, Camera, Music, 
  MapPin, Check, ExternalLink, Calendar, Edit3, 
  Save, Trash2, HardDrive, Smartphone, Sparkles, 
  Volume2, VolumeX, ShieldCheck, Download, Play, 
  Pause, ChevronLeft, ChevronRight, Grid, List, 
  Heart, MessageCircle, Share2, Layers, Bookmark,
  User as UserIcon, CheckCircle2, AlertCircle, Smile,
  Maximize2, Disc, Sliders, Palette, Brush, Eraser,
  RotateCcw, Compass, CheckSquare, Square, Tag,
  Move, Paperclip, Info, Globe, Music2, Eye
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
import { getSettings, saveSettings } from '../services/settings';

// ── Custom Graphic Stickers ────────────────────────────────────────────────
const GRAPHIC_STICKERS = [
  { id: 'vault_seal', label: 'VAULT SEAL', bg: 'linear-gradient(135deg, #8b0000, #b22222)', text: 'MEMWAULT ARCHIVE', icon: '🏛️' },
  { id: 'passport', label: 'PASSPORT', bg: 'linear-gradient(135deg, #003366, #0050ef)', text: 'VERIFIED LOCATION', icon: '✈️' },
  { id: 'vinyl_33', label: 'VINYL', bg: 'linear-gradient(135deg, #111, #333)', text: 'SOUNDTRACK 33⅓', icon: '🎵' },
  { id: 'timecode', label: 'TIMECODE', bg: 'linear-gradient(135deg, #d35400, #e67e22)', text: 'ON THIS DAY', icon: '⏳' },
  { id: 'polaroid', label: 'POLAROID', bg: 'linear-gradient(135deg, #f5f5f5, #e0e0e0)', text: 'ORIGINAL SHOT', icon: '📸', darkText: true },
  { id: 'core_mem', label: 'FAVORITE', bg: 'linear-gradient(135deg, #c2185b, #e91e63)', text: 'CORE MEMORY', icon: '💖' },
];

const DRAWING_PALETTE = [
  '#E89E38', '#0050EF', '#008A00', '#D80073', '#A20025', 
  '#AA00FF', '#FA6800', '#FFFFFF', '#888888', '#000000'
];

/**
 * Hook to resolve image/video URLs to offline Blob URLs from IndexedDB/CacheStorage
 */
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

/**
 * Offline-aware Media Element
 */
function OfflineMedia({ src, type = 'image', alt = '', style = {}, className = '', fallbackSrc = null, ...props }) {
  const resolvedUrl = useOfflineMediaUrl(src);
  const [hasError, setHasError] = useState(false);

  if (hasError && fallbackSrc) {
    if (type === 'video') {
      return <video src={fallbackSrc} style={style} className={className} {...props} />;
    }
    return <img src={fallbackSrc} alt={alt} style={style} className={className} {...props} />;
  }

  if (type === 'video') {
    return (
      <video
        src={resolvedUrl}
        style={style}
        className={className}
        onError={() => setHasError(true)}
        {...props}
      />
    );
  }
  return (
    <img
      src={resolvedUrl}
      alt={alt}
      style={style}
      className={className}
      onError={() => setHasError(true)}
      {...props}
    />
  );
}

function getMediaUrl(item) {
  if (!item) return '';
  if (item.media_items && item.media_items.length > 0) {
    const first = item.media_items[0];
    return first.display_url || first.media_url || first.instagram_media_url || first.raw_media_url || '';
  }
  return item.display_url || item.media_url || item.instagram_media_url || item.raw_media_url || '';
}

// Live Moving Equalizer Component
function LiveWaveform({ isPlaying = true, color = '#E89E38' }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'flex-end', gap: '2px', height: '14px', marginRight: '6px' }}>
      {[0.8, 0.5, 0.9, 0.6].map((speed, i) => (
        <span
          key={i}
          style={{
            width: '2.5px',
            backgroundColor: color,
            borderRadius: '2px',
            height: isPlaying ? '100%' : '3px',
            animation: isPlaying ? `equalize ${speed}s infinite alternate ease-in-out` : 'none',
          }}
        />
      ))}
    </div>
  );
}

export default function PocketCompanion() {
  // ── Theme & Global Settings ───────────────────────────────────────────────
  const [settings, setLocalSettings] = useState(() => getSettings());
  const [activeTab, setActiveTab] = useState('memories'); // 'memories' | 'highlights' | 'feed' | 'journal' | 'settings'
  const [journalSubTab, setJournalSubTab] = useState('notes'); // 'notes' | 'places'

  // ── Data States ───────────────────────────────────────────────────────────
  const [stories, setStories] = useState([]);
  const [posts, setPosts] = useState([]);
  const [highlights, setHighlights] = useState([]);
  const [pendingUploads, setPendingUploads] = useState([]);
  const [stats, setStats] = useState({ memoryCount: 0, postCount: 0, pendingCount: 0, highlightCount: 0, storageMb: '0.00' });
  const [igSession, setIgSession] = useState(null);

  // ── Places to Visit State (Desktop Parity) ────────────────────────────────
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
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all' | 'photos' | 'videos' | 'journaled' | 'music'
  const [selectedPostIndex, setSelectedPostIndex] = useState(null);
  const [postSlideIndex, setPostSlideIndex] = useState(0);

  // ── On This Day Flashback States ──────────────────────────────────────────
  const [flashbackIndex, setFlashbackIndex] = useState(0);

  // ── Highlights Story Player States ────────────────────────────────────────
  const [activeHighlight, setActiveHighlight] = useState(null);
  const [highlightStories, setHighlightStories] = useState([]);
  const [highlightStoryIndex, setHighlightStoryIndex] = useState(0);
  const [isHighlightPaused, setIsHighlightPaused] = useState(false);
  const [highlightProgress, setHighlightProgress] = useState(0);
  const [isAudioMuted, setIsAudioMuted] = useState(false);

  // ── Vinyl & 30-Second iTunes Preview Modal States ─────────────────────────
  const [vinylModalTrack, setVinylModalTrack] = useState(null);
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
  const [paintTool, setPaintTool] = useState('brush'); // 'brush' | 'highlighter' | 'eraser'
  const [drawingColor, setDrawingColor] = useState('#E89E38');
  const [brushSize, setBrushSize] = useState(4);
  const [isDrawing, setIsDrawing] = useState(false);
  const paintCanvasRef = useRef(null);

  // ── PWA Installation & Toast States ───────────────────────────────────────
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // ── Status Bar States ─────────────────────────────────────────────────────
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  const [batteryLevel, setBatteryLevel] = useState(null);

  // ── Sync States ───────────────────────────────────────────────────────────
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState({ step: 'Ready', percent: 0, status: 'idle' });
  const [lastSyncTime, setLastSyncTime] = useState(() => localStorage.getItem('metro_last_sync') || null);

  const fileInputRef = useRef(null);
  const highlightTimerRef = useRef(null);
  const scrapbookRef = useRef(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // ── 1. Pairing & Initial Offline Data Load ────────────────────────────────
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const tokenParam = searchParams.get('token') || searchParams.get('pair') || searchParams.get('auth');
    if (tokenParam) {
      setToken(tokenParam);
      localStorage.setItem('sv_token', tokenParam);
      window.history.replaceState({}, document.title, window.location.pathname);
      showToast('✓ Mobile Companion Paired with Vault!');
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
      
      setStories(cachedStories || []);
      setPosts(cachedPosts || []);
      setHighlights(cachedHl || []);
      setStats(st);
      setPendingUploads(pending || []);

      if (isAuthenticated()) {
        try {
          const session = await getInstagramSession();
          setIgSession(session);
        } catch (e) {}

        try {
          const hl = await getHighlights();
          if (Array.isArray(hl)) setHighlights(hl);
        } catch (e) {}

        if (!cachedStories || cachedStories.length === 0) {
          handleRunSync();
        }
      }
    }
    loadData();

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstallPwa = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
        setDeferredPrompt(null);
        showToast('✓ MemWault Standalone App Installed!');
      }
    } else {
      showToast('Tap browser menu (⋮) -> "Add to Home screen" or "Install app"');
    }
  };

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

  // ── 3. Highlights Story Player Progress ───────────────────────────────────
  useEffect(() => {
    if (!activeHighlight || highlightStories.length === 0 || isHighlightPaused) return;

    const interval = 50;
    highlightTimerRef.current = setInterval(() => {
      setHighlightProgress(prev => {
        if (prev >= 100) {
          if (highlightStoryIndex < highlightStories.length - 1) {
            setHighlightStoryIndex(i => i + 1);
            return 0;
          } else {
            setActiveHighlight(null);
            return 0;
          }
        }
        return prev + (interval / 5000) * 100;
      });
    }, interval);

    return () => clearInterval(highlightTimerRef.current);
  }, [activeHighlight, highlightStories, highlightStoryIndex, isHighlightPaused]);

  const handleOpenHighlight = async (hl) => {
    setActiveHighlight(hl);
    setHighlightProgress(0);
    setHighlightStoryIndex(0);
    try {
      const data = await getHighlightStories(hl.id);
      const list = Array.isArray(data) ? data : (data?.stories || data?.items || []);
      if (list.length > 0) {
        setHighlightStories(list);
      } else {
        const matched = stories.filter(s => hl.story_ids?.includes(s.id));
        setHighlightStories(matched.length > 0 ? matched : stories.slice(0, 6));
      }
    } catch (e) {
      setHighlightStories(stories.slice(0, 6));
    }
  };

  // ── 4. Vinyl & 30-Second iTunes Preview Fetcher ───────────────────────────
  const handleOpenVinylPlayer = async (trackTitle, artistName) => {
    if (!trackTitle) return;
    setVinylModalTrack({ title: trackTitle, artist: artistName });
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

  // ── 5. Live Camera Viewfinder Engine ──────────────────────────────────────
  const handleStartCamera = async () => {
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
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 1080;
    canvas.height = video.videoHeight || 1920;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    handleStopCamera();

    await addPendingMobileUpload({
      name: `Capture_${Date.now()}.jpg`,
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

  // ── 6. MS Paint Touch Doodling ────────────────────────────────────────────
  const handleOpenPaint = () => {
    setPaintModalOpen(true);
    setTimeout(() => {
      const canvas = paintCanvasRef.current;
      if (canvas) {
        canvas.width = canvas.parentElement.clientWidth || 360;
        canvas.height = canvas.parentElement.clientHeight || 420;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#1A1A1E';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }, 150);
  };

  const getCanvasPos = (e) => {
    const canvas = paintCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const handlePaintStart = (e) => {
    const canvas = paintCanvasRef.current;
    if (!canvas) return;
    setIsDrawing(true);
    const ctx = canvas.getContext('2d');
    const pos = getCanvasPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    ctx.strokeStyle = paintTool === 'eraser' ? '#1A1A1E' : drawingColor;
    ctx.lineWidth = paintTool === 'highlighter' ? brushSize * 3 : brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalAlpha = paintTool === 'highlighter' ? 0.35 : 1.0;
  };

  const handlePaintMove = (e) => {
    if (!isDrawing) return;
    const canvas = paintCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const pos = getCanvasPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const handlePaintEnd = () => setIsDrawing(false);

  const handleSavePaintDoodle = () => {
    const canvas = paintCanvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    setAttachedDoodleUrl(dataUrl);
    setPaintModalOpen(false);
    showToast('✓ Doodle attached to Journal!');
  };

  // ── 7. Places to Visit Functions ──────────────────────────────────────────
  const handleAddPlace = (e) => {
    e.preventDefault();
    if (!newPlaceTitle.trim()) return;
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
    const updated = places.map(p => p.id === id ? { ...p, completed: !p.completed } : p);
    setPlaces(updated);
    localStorage.setItem('memwault_places_to_visit', JSON.stringify(updated));
  };

  const deletePlace = (id) => {
    const updated = places.filter(p => p.id !== id);
    setPlaces(updated);
    localStorage.setItem('memwault_places_to_visit', JSON.stringify(updated));
  };

  // ── 8. ActiveSync Engine ─────────────────────────────────────────────────
  const handleRunSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);

    try {
      const res = await syncPocketWithLaptop((progress) => {
        setSyncProgress(progress);
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
      showToast('⚠️ Sync Failed (Using Offline Vault)');
    } finally {
      setIsSyncing(false);
    }
  };

  // ── 9. Save Journal Note ──────────────────────────────────────────────────
  const handleSaveNewJournalEntry = async () => {
    const isStoryTarget = journalAttachType === 'story';
    const targetItem = selectedItemForJournal || (isStoryTarget ? stories[0] : posts[0]);
    if (!targetItem) {
      showToast('Please select a photo first');
      return;
    }

    setIsSavingJournal(true);
    try {
      if (placedStickers.length > 0) {
        localStorage.setItem(`memwault_stickers_${targetItem.id}`, JSON.stringify(placedStickers));
      }
      if (attachedDoodleUrl) {
        localStorage.setItem(`memwault_doodles_${targetItem.id}`, JSON.stringify([{ id: Date.now(), url: attachedDoodleUrl }]));
      }

      if (isAuthenticated()) {
        if (isStoryTarget) {
          await updateStory(targetItem.id, { journal_note: journalNoteText });
        } else {
          await updatePost(targetItem.id, { journal_note: journalNoteText });
        }
      }
      
      if (isStoryTarget) {
        const updated = stories.map(s => s.id === targetItem.id ? { ...s, journal_note: journalNoteText } : s);
        setStories(updated);
        await saveMemoriesOffline(updated);
      } else {
        const updated = posts.map(p => p.id === targetItem.id ? { ...p, journal_note: journalNoteText } : p);
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

  // ── 10. File Pick Fallback ────────────────────────────────────────────────
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
    };
    reader.readAsDataURL(file);
  };

  // ── 11. Clear Offline Storage ─────────────────────────────────────────────
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
      showToast('✓ Offline Storage Cleared');
    } catch (err) {
      showToast('Error clearing storage: ' + err.message);
    }
  };

  // ── 12. Flashback Memories Array ──────────────────────────────────────────
  const flashbacks = getOnThisDayMemories(stories);
  const currentFlashback = flashbacks[flashbackIndex] || flashbacks[0] || stories[0] || null;

  // ── 13. Filtered Stories ──────────────────────────────────────────────────
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
    return true;
  });

  const journaledItems = [
    ...stories.filter(s => s.journal_note && s.journal_note.trim().length > 0).map(s => ({ ...s, _isPost: false })),
    ...posts.filter(p => p.journal_note && p.journal_note.trim().length > 0).map(p => ({ ...p, _isPost: true }))
  ];

  return (
    <div style={{
      width: '100vw',
      minHeight: '100vh',
      maxWidth: '640px',
      margin: '0 auto',
      backgroundColor: '#09090C',
      color: '#FFFFFF',
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      userSelect: 'none',
      overflowX: 'hidden',
      paddingBottom: '74px',
      boxSizing: 'border-box',
    }}>
      {/* Hidden File Input & Canvas */}
      <input type="file" ref={fileInputRef} onChange={handleFilePicked} accept="image/*,video/*" style={{ display: 'none' }} />
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Hidden Audio Element for 30s iTunes Previews */}
      {audioPreviewUrl && (
        <audio
          ref={previewAudioRef}
          src={audioPreviewUrl}
          autoPlay
          onEnded={() => setIsPlayingAudio(false)}
          onTimeUpdate={(e) => {
            if (e.target.duration) {
              setAudioProgress((e.target.currentTime / e.target.duration) * 100);
              setAudioDuration(Math.round(e.target.duration));
            }
          }}
        />
      )}

      {/* ── Toast Notification Banner ───────────────────────── */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ y: -45, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -45, opacity: 0 }}
            style={{
              position: 'fixed',
              top: '12px',
              left: '16px',
              right: '16px',
              maxWidth: '608px',
              margin: '0 auto',
              backgroundColor: 'rgba(232, 158, 56, 0.95)',
              backdropFilter: 'blur(20px)',
              color: '#000000',
              padding: '10px 16px',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: 700,
              zIndex: 99999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
            }}
          >
            <span>{toastMessage}</span>
            <X size={16} style={{ cursor: 'pointer' }} onClick={() => setToastMessage(null)} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── LIVE CAMERA VIEWFINDER MODAL ────────────────────── */}
      {cameraModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: '#000', zIndex: 100000, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#FFF' }}>
            <div style={{ fontSize: '14px', fontWeight: 600, letterSpacing: '0.08em' }}>VAULT CAMERA</div>
            <X size={24} style={{ cursor: 'pointer' }} onClick={handleStopCamera} />
          </div>

          <div style={{ flex: 1, position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>

          <div style={{ padding: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-around', backgroundColor: '#000' }}>
            <button onClick={() => { handleStopCamera(); fileInputRef.current?.click(); }} style={{ background: 'none', border: 'none', color: '#FFF', fontSize: '13px', cursor: 'pointer' }}>
              Gallery
            </button>
            <div onClick={handleCaptureSnapshot} style={{ width: '68px', height: '68px', borderRadius: '50%', border: '4px solid #FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <div style={{ width: '52px', height: '52px', borderRadius: '50%', backgroundColor: '#E89E38' }} />
            </div>
            <div style={{ width: '40px' }} />
          </div>
        </div>
      )}

      {/* ── MS PAINT / FINGER DOODLE STUDIO MODAL ───────────── */}
      {paintModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.94)', zIndex: 100005, display: 'flex', flexDirection: 'column', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', color: '#FFF' }}>
            <div style={{ fontSize: '15px', fontWeight: 600, color: '#E89E38' }}>🎨 Touch Doodle Studio</div>
            <X size={20} style={{ cursor: 'pointer' }} onClick={() => setPaintModalOpen(false)} />
          </div>

          <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
            {['brush', 'highlighter', 'eraser'].map(tool => (
              <button
                key={tool}
                onClick={() => setPaintTool(tool)}
                style={{
                  backgroundColor: paintTool === tool ? '#E89E38' : '#222',
                  color: paintTool === tool ? '#000' : '#FFF',
                  border: 'none',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                }}
              >
                {tool}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px', marginBottom: '8px', scrollbarWidth: 'none' }}>
            {DRAWING_PALETTE.map(c => (
              <div
                key={c}
                onClick={() => setDrawingColor(c)}
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  backgroundColor: c,
                  border: drawingColor === c ? '3px solid #FFF' : '1px solid #444',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              />
            ))}
          </div>

          <div style={{ flex: 1, backgroundColor: '#1A1A1E', borderRadius: '12px', overflow: 'hidden', touchAction: 'none', border: '1px solid rgba(255,255,255,0.1)' }}>
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

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
            <button
              onClick={() => {
                const canvas = paintCanvasRef.current;
                if (canvas) {
                  const ctx = canvas.getContext('2d');
                  ctx.fillStyle = '#1A1A1E';
                  ctx.fillRect(0, 0, canvas.width, canvas.height);
                }
              }}
              style={{ background: 'none', border: '1px solid #444', color: '#FFF', padding: '8px 16px', borderRadius: '8px', fontSize: '11px', cursor: 'pointer' }}
            >
              Clear
            </button>
            <button
              onClick={handleSavePaintDoodle}
              style={{ backgroundColor: '#E89E38', color: '#000', border: 'none', padding: '10px 24px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              Attach Doodle ✓
            </button>
          </div>
        </div>
      )}

      {/* ── DESKTOP-GRADE VINYL TURNTABLE PLAYER MODAL ──────── */}
      {vinylModalTrack && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(25px)', zIndex: 100000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            style={{
              backgroundColor: '#16161A',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '24px',
              padding: '24px',
              maxWidth: '380px',
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              boxShadow: '0 24px 64px rgba(0,0,0,0.8)',
            }}
          >
            <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#E89E38', letterSpacing: '0.1em' }}>
                MEMWAULT VINYL DECK
              </div>
              <X size={20} style={{ cursor: 'pointer', color: '#888' }} onClick={() => setVinylModalTrack(null)} />
            </div>

            {/* Realistic Vinyl Disc Turntable */}
            <div style={{ position: 'relative', width: '200px', height: '200px', marginBottom: '20px' }}>
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: '50%',
                  background: 'radial-gradient(circle at center, #111 0%, #1c1c1c 20%, #111 25%, #2a2a2a 40%, #111 45%, #222 65%, #0d0d0d 100%)',
                  boxShadow: '0 12px 36px rgba(0,0,0,0.9), inset 0 0 12px rgba(255,255,255,0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  animation: isPlayingAudio ? 'spin-record 1.818s linear infinite' : 'none',
                }}
              >
                {/* Center Label Artwork */}
                <div style={{ width: '74px', height: '74px', borderRadius: '50%', overflow: 'hidden', border: '3px solid #000', position: 'relative', backgroundColor: '#E89E38' }}>
                  {audioArtworkUrl ? (
                    <img src={audioArtworkUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Album Art" />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontWeight: 'bold', fontSize: '20px' }}>
                      MW
                    </div>
                  )}
                  <div style={{ position: 'absolute', inset: 0, margin: 'auto', width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#16161A', border: '2px solid #000' }} />
                </div>
              </div>
            </div>

            {/* Track Info */}
            <div style={{ textAlign: 'center', marginBottom: '14px', width: '100%' }}>
              <div style={{ fontSize: '17px', fontWeight: 700, color: '#FFF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {vinylModalTrack.title}
              </div>
              <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginTop: '2px' }}>
                {vinylModalTrack.artist || 'Original Soundtrack'}
              </div>
            </div>

            {/* Audio Scrubber */}
            <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <span style={{ fontSize: '11px', color: '#888', fontFamily: 'monospace' }}>
                0:{Math.round((audioProgress / 100) * audioDuration).toString().padStart(2, '0')}
              </span>
              <div style={{ flex: 1, height: '4px', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{ height: '100%', backgroundColor: '#E89E38', width: `${audioProgress}%` }} />
              </div>
              <span style={{ fontSize: '11px', color: '#888', fontFamily: 'monospace' }}>0:30</span>
            </div>

            {/* Play/Pause Button */}
            <button
              onClick={handleTogglePlayAudio}
              style={{
                width: '54px',
                height: '54px',
                borderRadius: '50%',
                backgroundColor: '#E89E38',
                border: 'none',
                color: '#000',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                marginBottom: '16px',
                boxShadow: '0 6px 20px rgba(232, 158, 56, 0.4)',
              }}
            >
              {isPlayingAudio ? <Pause size={24} fill="#000" /> : <Play size={24} fill="#000" style={{ marginLeft: '3px' }} />}
            </button>

            {/* Single Clean Streaming App Launch Button based on User Preference */}
            <a
              href={`https://open.spotify.com/search/${encodeURIComponent(vinylModalTrack.title + ' ' + (vinylModalTrack.artist || ''))}`}
              target="_blank"
              rel="noreferrer"
              style={{
                width: '100%',
                backgroundColor: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '12px',
                color: '#FFF',
                padding: '10px',
                fontSize: '12px',
                fontWeight: 600,
                textAlign: 'center',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              <Music size={14} color="#1DB954" />
              <span>Open in Spotify ↗</span>
            </a>
          </motion.div>
        </div>
      )}

      {/* ── FULLSCREEN INSTAGRAM HIGHLIGHT STORY PLAYER ─────── */}
      <AnimatePresence>
        {activeHighlight && highlightStories.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, zIndex: 999999, backgroundColor: '#000000', display: 'flex', flexDirection: 'column' }}
          >
            {/* Top Segmented Progress Bars */}
            <div style={{ position: 'absolute', top: '10px', left: '10px', right: '10px', display: 'flex', gap: '4px', zIndex: 20 }}>
              {highlightStories.map((_, idx) => (
                <div key={idx} style={{ flex: 1, height: '2.5px', backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    backgroundColor: '#FFFFFF',
                    width: idx < highlightStoryIndex ? '100%' : (idx === highlightStoryIndex ? `${highlightProgress}%` : '0%'),
                  }} />
                </div>
              ))}
            </div>

            {/* Story Header */}
            <div style={{ position: 'absolute', top: '22px', left: '14px', right: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 20, color: '#FFF' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '34px', height: '34px', borderRadius: '50%', overflow: 'hidden', border: '2px solid #E89E38' }}>
                  <OfflineMedia
                    src={activeHighlight.cover_media_url || highlightStories[0]?.media_url}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    alt="Cover"
                  />
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700 }}>{activeHighlight.title}</div>
                  <div style={{ fontSize: '10px', opacity: 0.7 }}>
                    {highlightStories[highlightStoryIndex]?.taken_at ? new Date(highlightStories[highlightStoryIndex].taken_at).toLocaleDateString() : 'Highlight'}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button onClick={() => setIsHighlightPaused(!isHighlightPaused)} style={{ background: 'rgba(0,0,0,0.5)', border: 'none', color: '#FFF', borderRadius: '50%', padding: '6px', cursor: 'pointer' }}>
                  {isHighlightPaused ? <Play size={16} /> : <Pause size={16} />}
                </button>
                <button onClick={() => setIsAudioMuted(!isAudioMuted)} style={{ background: 'rgba(0,0,0,0.5)', border: 'none', color: '#FFF', borderRadius: '50%', padding: '6px', cursor: 'pointer' }}>
                  {isAudioMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                </button>
                <button onClick={() => setActiveHighlight(null)} style={{ background: 'rgba(0,0,0,0.5)', border: 'none', color: '#FFF', borderRadius: '50%', padding: '6px', cursor: 'pointer' }}>
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Media Viewport */}
            <div
              style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              onMouseDown={() => setIsHighlightPaused(true)}
              onMouseUp={() => setIsHighlightPaused(false)}
              onTouchStart={() => setIsHighlightPaused(true)}
              onTouchEnd={() => setIsHighlightPaused(false)}
            >
              {highlightStories[highlightStoryIndex]?.media_type === 2 ? (
                <OfflineMedia
                  key={highlightStories[highlightStoryIndex]?.id}
                  src={highlightStories[highlightStoryIndex]?.media_url}
                  type="video"
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  autoPlay
                  playsInline
                  muted={isAudioMuted}
                />
              ) : (
                <OfflineMedia
                  key={highlightStories[highlightStoryIndex]?.id}
                  src={highlightStories[highlightStoryIndex]?.media_url}
                  type="image"
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  alt="Story"
                />
              )}

              {/* Tap Left 30% / Right 70% */}
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  if (highlightStoryIndex > 0) {
                    setHighlightStoryIndex(i => i - 1);
                    setHighlightProgress(0);
                  }
                }}
                style={{ position: 'absolute', top: '70px', bottom: '90px', left: 0, width: '35%', zIndex: 15 }}
              />
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  if (highlightStoryIndex < highlightStories.length - 1) {
                    setHighlightStoryIndex(i => i + 1);
                    setHighlightProgress(0);
                  } else {
                    setActiveHighlight(null);
                  }
                }}
                style={{ position: 'absolute', top: '70px', bottom: '90px', right: 0, width: '65%', zIndex: 15 }}
              />
            </div>

            {/* Story Caption & Live Waveform Music Pill */}
            <div style={{ padding: '16px', background: 'linear-gradient(transparent, rgba(0,0,0,0.95))', color: '#FFF', zIndex: 20 }}>
              {highlightStories[highlightStoryIndex]?.caption_text && (
                <div style={{ fontSize: '13px', lineHeight: 1.4, marginBottom: '8px' }}>
                  {highlightStories[highlightStoryIndex].caption_text}
                </div>
              )}
              {(highlightStories[highlightStoryIndex]?.music?.track_title || highlightStories[highlightStoryIndex]?.music_title) && (
                <div
                  onClick={() => handleOpenVinylPlayer(
                    highlightStories[highlightStoryIndex]?.music?.track_title || highlightStories[highlightStoryIndex]?.music_title,
                    highlightStories[highlightStoryIndex]?.music?.artist_name || highlightStories[highlightStoryIndex]?.music_artist
                  )}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    backgroundColor: 'rgba(232, 158, 56, 0.2)',
                    border: '1px solid rgba(232, 158, 56, 0.5)',
                    padding: '6px 14px',
                    borderRadius: '20px',
                    fontSize: '11px',
                    color: '#E89E38',
                    cursor: 'pointer',
                  }}
                >
                  <LiveWaveform isPlaying={!isHighlightPaused} color="#E89E38" />
                  <span style={{ fontWeight: 600 }}>{highlightStories[highlightStoryIndex]?.music?.track_title || highlightStories[highlightStoryIndex]?.music_title}</span>
                  <span style={{ opacity: 0.75 }}>• {highlightStories[highlightStoryIndex]?.music?.artist_name || highlightStories[highlightStoryIndex]?.music_artist || 'Artist'}</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── CREATE NEW JOURNAL SCRAPBOOK MODAL ──────────────── */}
      {newJournalModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(20px)', zIndex: 100000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ backgroundColor: '#18181C', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '20px', padding: '20px', maxWidth: '520px', width: '100%', maxHeight: '92vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ fontSize: '17px', fontWeight: 700, color: '#E89E38' }}>+ New Journal Reflection</div>
              <X size={20} style={{ cursor: 'pointer', color: '#888' }} onClick={() => setNewJournalModalOpen(false)} />
            </div>

            {/* Target Selector */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              <button
                onClick={() => { setJournalAttachType('story'); setSelectedItemForJournal(null); }}
                style={{ flex: 1, backgroundColor: journalAttachType === 'story' ? '#E89E38' : 'rgba(255,255,255,0.06)', color: journalAttachType === 'story' ? '#000' : '#FFF', border: 'none', padding: '8px', borderRadius: '10px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
              >
                Memories ({stories.length})
              </button>
              <button
                onClick={() => { setJournalAttachType('post'); setSelectedItemForJournal(null); }}
                style={{ flex: 1, backgroundColor: journalAttachType === 'post' ? '#E89E38' : 'rgba(255,255,255,0.06)', color: journalAttachType === 'post' ? '#000' : '#FFF', border: 'none', padding: '8px', borderRadius: '10px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
              >
                Feed Posts ({posts.length})
              </button>
            </div>

            {/* Item Thumbnails Carousel */}
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px', scrollbarWidth: 'none', marginBottom: '14px' }}>
              {(journalAttachType === 'story' ? stories : posts).map(item => {
                const isSelected = selectedItemForJournal?.id === item.id;
                const mediaUrl = getMediaUrl(item);
                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedItemForJournal(item)}
                    style={{
                      width: '68px',
                      height: '92px',
                      borderRadius: '10px',
                      overflow: 'hidden',
                      flexShrink: 0,
                      cursor: 'pointer',
                      border: isSelected ? '2px solid #E89E38' : '1px solid rgba(255,255,255,0.1)',
                      position: 'relative',
                    }}
                  >
                    <OfflineMedia src={mediaUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Thumb" />
                    {isSelected && (
                      <div style={{ position: 'absolute', top: '4px', right: '4px', backgroundColor: '#E89E38', borderRadius: '50%', padding: '2px' }}>
                        <Check size={10} color="#000" strokeWidth={3} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Custom Graphic Stamps Tray */}
            <div style={{ marginBottom: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>Attach Graphic Stamps</span>
                <button onClick={handleOpenPaint} style={{ backgroundColor: 'rgba(232, 158, 56, 0.15)', border: '1px solid #E89E38', color: '#E89E38', padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Brush size={12} /> MS Paint Doodle
                </button>
              </div>

              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {GRAPHIC_STICKERS.map(s => {
                  const isAttached = placedStickers.some(p => p.id === s.id);
                  return (
                    <button
                      key={s.id}
                      onClick={() => {
                        if (isAttached) setPlacedStickers(placedStickers.filter(p => p.id !== s.id));
                        else setPlacedStickers([...placedStickers, s]);
                      }}
                      style={{
                        background: s.bg,
                        color: s.darkText ? '#000' : '#FFF',
                        border: isAttached ? '2px solid #FFF' : 'none',
                        padding: '6px 10px',
                        borderRadius: '8px',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                      }}
                    >
                      <span>{s.icon}</span>
                      <span>{s.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Notes Textarea */}
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.7)', marginBottom: '6px' }}>
              Your Reflection & Notes:
            </div>
            <textarea
              value={journalNoteText}
              onChange={(e) => setJournalNoteText(e.target.value)}
              placeholder="What made this memory special? Write notes, reflections, and story context..."
              rows={4}
              style={{
                width: '100%',
                backgroundColor: 'rgba(0,0,0,0.4)',
                color: '#FFF',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '12px',
                padding: '12px',
                fontSize: '13px',
                fontFamily: 'inherit',
                boxSizing: 'border-box',
                outline: 'none',
                marginBottom: '16px',
              }}
            />

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setNewJournalModalOpen(false)} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.2)', color: '#FFF', padding: '8px 16px', borderRadius: '10px', fontSize: '12px', cursor: 'pointer' }}>
                Cancel
              </button>
              <button
                onClick={handleSaveNewJournalEntry}
                disabled={isSavingJournal || (!journalNoteText.trim() && placedStickers.length === 0 && !attachedDoodleUrl)}
                style={{
                  backgroundColor: '#E89E38',
                  color: '#000',
                  border: 'none',
                  padding: '8px 24px',
                  borderRadius: '10px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  opacity: (journalNoteText.trim() || placedStickers.length > 0 || attachedDoodleUrl) ? 1 : 0.5,
                }}
              >
                {isSavingJournal ? 'Saving...' : 'Save to Vault'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Status Bar ────────────────────────────────────────── */}
      <div style={{ height: '32px', padding: '0 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', color: 'rgba(255,255,255,0.7)', fontWeight: 600, backgroundColor: '#09090C' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Wifi size={13} color={isSyncing ? '#E89E38' : '#FFF'} />
          <span style={{ letterSpacing: '0.08em', fontSize: '11px', fontWeight: 800 }}>MEMWAULT</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {batteryLevel !== null && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: '11px' }}>{batteryLevel}%</span>
              <Battery size={14} color="#FFF" />
            </div>
          )}
          <span>{currentTime}</span>
        </div>
      </div>

      {/* ── Main Viewport Content ─────────────────────────────── */}
      <div style={{ flex: 1, padding: '12px 16px', overflowY: 'auto' }}>

        {/* ══════════════════════════════════════════════════════
            TAB 1: MEMORIES & FULL TIMELINE
           ══════════════════════════════════════════════════════ */}
        {activeTab === 'memories' && !selectedStory && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* On This Day Flashback Hero Banner */}
            {currentFlashback && (
              <motion.div
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedStory(currentFlashback)}
                style={{
                  width: '100%',
                  height: '160px',
                  borderRadius: '20px',
                  overflow: 'hidden',
                  position: 'relative',
                  cursor: 'pointer',
                  boxShadow: '0 12px 32px rgba(0,0,0,0.6)',
                  border: '1px solid rgba(255,255,255,0.12)',
                }}
              >
                <OfflineMedia
                  src={currentFlashback.media_url}
                  type={currentFlashback.media_type === 2 ? 'video' : 'image'}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  alt="Flashback"
                />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.3) 60%, transparent 100%)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '16px' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: '#E89E38', color: '#000', padding: '3px 8px', borderRadius: '12px', fontSize: '10px', fontWeight: 800, width: 'fit-content', marginBottom: '6px' }}>
                    <Sparkles size={10} />
                    <span>{currentFlashback.badgeText || 'ON THIS DAY'}</span>
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: '#FFF' }}>
                    {currentFlashback.location_name || 'Archived Vault Memory'}
                  </div>
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)', marginTop: '2px' }}>
                    {currentFlashback.relativeLabel || (currentFlashback.taken_at ? new Date(currentFlashback.taken_at).toLocaleDateString() : '')}
                  </div>
                </div>

                {flashbacks.length > 1 && (
                  <div style={{ position: 'absolute', top: '12px', right: '12px', display: 'flex', gap: '6px', zIndex: 10 }} onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => setFlashbackIndex(i => (i - 1 + flashbacks.length) % flashbacks.length)} style={{ background: 'rgba(0,0,0,0.6)', border: 'none', color: '#FFF', borderRadius: '50%', width: '28px', height: '28px', cursor: 'pointer' }}>◀</button>
                    <button onClick={() => setFlashbackIndex(i => (i + 1) % flashbacks.length)} style={{ background: 'rgba(0,0,0,0.6)', border: 'none', color: '#FFF', borderRadius: '50%', width: '28px', height: '28px', cursor: 'pointer' }}>▶</button>
                  </div>
                )}
              </motion.div>
            )}

            {/* Highlights Bubbles Row */}
            {highlights.length > 0 && (
              <div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'rgba(255,255,255,0.6)', marginBottom: '8px', letterSpacing: '0.05em' }}>
                  STORY HIGHLIGHTS
                </div>
                <div style={{ display: 'flex', gap: '14px', overflowX: 'auto', paddingBottom: '4px', scrollbarWidth: 'none' }}>
                  {highlights.map(hl => {
                    const coverUrl = hl.cover_media_url || (hl.stories && hl.stories[0]?.media_url) || (stories[0]?.media_url);
                    return (
                      <div key={hl.id} onClick={() => handleOpenHighlight(hl)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', cursor: 'pointer', flexShrink: 0 }}>
                        <div style={{ width: '60px', height: '60px', borderRadius: '50%', padding: '2px', background: 'linear-gradient(45deg, #E89E38, #C2185B, #0050EF)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <div style={{ width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden', backgroundColor: '#000' }}>
                            <OfflineMedia src={coverUrl} fallbackSrc={stories[0]?.media_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={hl.title} />
                          </div>
                        </div>
                        <span style={{ fontSize: '11px', maxWidth: '64px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'center' }}>{hl.title}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Search & Filter Bar */}
            <div style={{ display: 'flex', gap: '8px', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: '12px', padding: '8px 12px', alignItems: 'center' }}>
              <Search size={16} color="rgba(255,255,255,0.4)" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search memories, places, songs..."
                style={{ flex: 1, background: 'transparent', border: 'none', color: '#FFF', fontSize: '13px', outline: 'none' }}
              />
              {searchQuery && <X size={14} color="#888" style={{ cursor: 'pointer' }} onClick={() => setSearchQuery('')} />}
            </div>

            {/* 3-Column Stories Masonry/Grid */}
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginBottom: '8px' }}>
                {filteredStories.length} MEMORIES ARCHIVED
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px' }}>
                {filteredStories.map(story => (
                  <motion.div
                    key={story.id}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => setSelectedStory(story)}
                    style={{ aspectRatio: '9/16', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#111', position: 'relative', cursor: 'pointer' }}
                  >
                    <OfflineMedia src={story.media_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Memory" />
                    {story.journal_note && (
                      <div style={{ position: 'absolute', top: '4px', right: '4px', backgroundColor: '#E89E38', color: '#000', borderRadius: '4px', padding: '2px 4px', fontSize: '8px', fontWeight: 800 }}>
                        NOTE
                      </div>
                    )}
                    {(story.music?.track_title || story.music_title) && (
                      <div style={{ position: 'absolute', top: '4px', left: '4px', backgroundColor: 'rgba(0,0,0,0.6)', color: '#E89E38', borderRadius: '4px', padding: '2px 4px', fontSize: '8px' }}>
                        ♫
                      </div>
                    )}
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '4px', background: 'linear-gradient(transparent, rgba(0,0,0,0.85))', fontSize: '9px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {story.location_name || (story.taken_at ? new Date(story.taken_at).toLocaleDateString() : '')}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── MEMORY DETAIL INSPECTOR ─────────────────────────── */}
        {activeTab === 'memories' && selectedStory && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <button
              onClick={() => setSelectedStory(null)}
              style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: '#E89E38', fontSize: '13px', fontWeight: 700, cursor: 'pointer', padding: 0 }}
            >
              <ArrowLeft size={16} /> Back to Vault
            </button>

            {/* Media Canvas */}
            <div style={{ width: '100%', backgroundColor: '#000', borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
              <OfflineMedia
                src={selectedStory.media_url}
                type={selectedStory.media_type === 2 ? 'video' : 'image'}
                style={{ width: '100%', maxHeight: '55vh', objectFit: 'contain', display: 'block', margin: '0 auto' }}
                controls={selectedStory.media_type === 2}
                autoPlay={selectedStory.media_type === 2}
                playsInline
                alt="Story"
              />
            </div>

            {/* Soundtrack Live Waveform Bar */}
            {(selectedStory.music?.track_title || selectedStory.music_title) && (
              <div
                onClick={() => handleOpenVinylPlayer(
                  selectedStory.music?.track_title || selectedStory.music_title,
                  selectedStory.music?.artist_name || selectedStory.music_artist
                )}
                style={{
                  backgroundColor: 'rgba(232, 158, 56, 0.12)',
                  border: '1px solid rgba(232, 158, 56, 0.35)',
                  borderRadius: '14px',
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <LiveWaveform isPlaying={true} color="#E89E38" />
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#E89E38' }}>
                      {selectedStory.music?.track_title || selectedStory.music_title}
                    </div>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>
                      {selectedStory.music?.artist_name || selectedStory.music_artist || 'Artist'} • Tap to spin vinyl ♫
                    </div>
                  </div>
                </div>
                <Disc size={18} color="#E89E38" />
              </div>
            )}

            {/* Metadata Card */}
            <div style={{ backgroundColor: '#16161A', borderRadius: '16px', padding: '14px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: '17px', fontWeight: 700 }}>{selectedStory.location_name || 'Archived Story'}</div>
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>{selectedStory.taken_at ? new Date(selectedStory.taken_at).toLocaleString() : ''}</span>
                    {selectedStory.is_close_friends && <span style={{ color: '#008A00', fontWeight: 'bold' }}>🟢 Close Friends</span>}
                  </div>
                </div>

                {selectedStory.location_name && (
                  <a
                    href={`https://maps.google.com/?q=${encodeURIComponent(selectedStory.location_name)}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: '#FFF', padding: '6px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <MapPin size={12} color="#E89E38" /> Map ↗
                  </a>
                )}
              </div>

              {selectedStory.caption_text && (
                <div style={{ fontSize: '13px', marginTop: '10px', lineHeight: 1.4, color: 'rgba(255,255,255,0.9)' }}>
                  {selectedStory.caption_text}
                </div>
              )}
            </div>

            {/* Journal Note Card */}
            <div style={{ backgroundColor: '#16161A', borderRadius: '16px', padding: '14px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#E89E38' }}>📓 Journal Reflection</div>
                {editingItemId !== selectedStory.id && (
                  <button
                    onClick={() => { setEditingItemId(selectedStory.id); setJournalDraft(selectedStory.journal_note || ''); }}
                    style={{ background: 'none', border: 'none', color: '#E89E38', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    {selectedStory.journal_note ? 'Edit Note' : '+ Add Note'}
                  </button>
                )}
              </div>

              {editingItemId === selectedStory.id ? (
                <div>
                  <textarea
                    value={journalDraft}
                    onChange={(e) => setJournalDraft(e.target.value)}
                    rows={4}
                    style={{ width: '100%', backgroundColor: 'rgba(0,0,0,0.5)', color: '#FFF', border: '1px solid #E89E38', borderRadius: '10px', padding: '10px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                  />
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '8px' }}>
                    <button onClick={() => setEditingItemId(null)} style={{ background: 'none', border: '1px solid #444', color: '#FFF', padding: '6px 12px', borderRadius: '8px', fontSize: '11px' }}>Cancel</button>
                    <button onClick={() => handleSaveInlineJournal(selectedStory.id, false)} style={{ backgroundColor: '#E89E38', color: '#000', border: 'none', padding: '6px 16px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold' }}>Save</button>
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: '13px', lineHeight: 1.5, color: selectedStory.journal_note ? '#FFF' : '#666', fontStyle: selectedStory.journal_note ? 'normal' : 'italic' }}>
                  {selectedStory.journal_note || 'No reflections written yet.'}
                </div>
              )}
            </div>

            {/* Camera Attach Button */}
            <button
              onClick={handleStartCamera}
              style={{ backgroundColor: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '14px', color: '#FFF', padding: '14px', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer' }}
            >
              <Camera size={18} color="#E89E38" />
              <span>Capture / Attach Live Camera Photo</span>
            </button>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            TAB 2: HIGHLIGHTS HUB
           ══════════════════════════════════════════════════════ */}
        {activeTab === 'highlights' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>
              {highlights.length} STORY HIGHLIGHTS IN VAULT
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
              {highlights.map(hl => {
                const coverUrl = hl.cover_media_url || (hl.stories && hl.stories[0]?.media_url) || (stories[0]?.media_url);
                return (
                  <motion.div
                    key={hl.id}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => handleOpenHighlight(hl)}
                    style={{
                      aspectRatio: '1/1',
                      borderRadius: '16px',
                      overflow: 'hidden',
                      position: 'relative',
                      cursor: 'pointer',
                      border: '1px solid rgba(255,255,255,0.1)',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                    }}
                  >
                    <OfflineMedia
                      src={coverUrl}
                      fallbackSrc={stories[0]?.media_url}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      alt={hl.title}
                    />
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 60%)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '12px' }}>
                      <div style={{ fontSize: '15px', fontWeight: 700, color: '#FFF' }}>{hl.title}</div>
                      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)', marginTop: '2px' }}>Tap to play stories</div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            TAB 3: INSTAGRAM FEED POSTS & CAROUSELS
           ══════════════════════════════════════════════════════ */}
        {activeTab === 'feed' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>
              {posts.length} POSTS IN FEED
            </div>

            {posts.length === 0 ? (
              <div style={{ backgroundColor: '#16161A', borderRadius: '16px', padding: '32px', textAlign: 'center' }}>
                <Film size={36} color="#E89E38" style={{ margin: '0 auto 12px auto' }} />
                <div style={{ fontSize: '15px', fontWeight: 600 }}>No Feed Posts Synced</div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginTop: '4px' }}>
                  Sync with your laptop to download archived Instagram carousels and posts.
                </div>
                <button
                  onClick={handleRunSync}
                  style={{ marginTop: '14px', backgroundColor: '#E89E38', color: '#000', border: 'none', padding: '8px 20px', borderRadius: '10px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                >
                  Sync Feed Now
                </button>
              </div>
            ) : (
              /* Instagram 3-Column Square Grid */
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '3px' }}>
                {posts.map((post, pIdx) => {
                  const mediaUrl = getMediaUrl(post);
                  const isCarousel = (post.media_items && post.media_items.length > 1);
                  return (
                    <motion.div
                      key={post.id}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => { setSelectedPostIndex(pIdx); setPostSlideIndex(0); }}
                      style={{ aspectRatio: '1/1', position: 'relative', overflow: 'hidden', backgroundColor: '#111', cursor: 'pointer' }}
                    >
                      <OfflineMedia src={mediaUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Post" />
                      {isCarousel && (
                        <div style={{ position: 'absolute', top: '4px', right: '4px', backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: '4px', padding: '2px 4px' }}>
                          <Layers size={11} color="#FFF" />
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            )}

            {/* Fullscreen Post Carousel Viewer with Touch Swipe */}
            {selectedPostIndex !== null && posts[selectedPostIndex] && (
              <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.96)', zIndex: 100000, display: 'flex', flexDirection: 'column', padding: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', color: '#FFF' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700 }}>Post {selectedPostIndex + 1} of {posts.length}</span>
                  </div>
                  <X size={22} style={{ cursor: 'pointer' }} onClick={() => setSelectedPostIndex(null)} />
                </div>

                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                  {(() => {
                    const curPost = posts[selectedPostIndex];
                    const mediaList = curPost.media_items || (curPost.media_url ? [{ display_url: curPost.media_url }] : []);
                    const activeMedia = mediaList[postSlideIndex] || mediaList[0];
                    const url = activeMedia?.display_url || activeMedia?.media_url || activeMedia?.instagram_media_url || curPost.media_url;

                    return (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                        <OfflineMedia src={url} style={{ maxWidth: '100%', maxHeight: '60vh', objectFit: 'contain' }} alt="Post" />
                        
                        {mediaList.length > 1 && (
                          <div style={{ position: 'absolute', bottom: '10px', display: 'flex', gap: '5px', backgroundColor: 'rgba(0,0,0,0.6)', padding: '4px 8px', borderRadius: '12px' }}>
                            {mediaList.map((_, sIdx) => (
                              <div
                                key={sIdx}
                                onClick={() => setPostSlideIndex(sIdx)}
                                style={{ width: postSlideIndex === sIdx ? '16px' : '6px', height: '6px', borderRadius: '3px', backgroundColor: postSlideIndex === sIdx ? '#E89E38' : 'rgba(255,255,255,0.4)', cursor: 'pointer', transition: 'all 0.2s' }}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* Bottom Details & Nav */}
                <div style={{ backgroundColor: '#16161A', borderRadius: '16px', padding: '14px', color: '#FFF' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => setSelectedPostIndex(i => (i - 1 + posts.length) % posts.length)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#FFF', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer' }}>◀ Prev</button>
                      <button onClick={() => setSelectedPostIndex(i => (i + 1) % posts.length)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#FFF', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer' }}>Next ▶</button>
                    </div>
                    {posts[selectedPostIndex]?.like_count !== undefined && (
                      <span style={{ fontSize: '12px', fontWeight: 600, color: '#E89E38' }}>❤️ {posts[selectedPostIndex].like_count} likes</span>
                    )}
                  </div>
                  {posts[selectedPostIndex]?.caption_text && (
                    <div style={{ fontSize: '13px', lineHeight: 1.4 }}>{posts[selectedPostIndex].caption_text}</div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            TAB 4: JOURNAL & PLACES TO VISIT (DESKTOP PARITY)
           ══════════════════════════════════════════════════════ */}
        {activeTab === 'journal' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Sub-tab Switcher */}
            <div style={{ display: 'flex', gap: '8px', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: '12px', padding: '4px' }}>
              <button
                onClick={() => setJournalSubTab('notes')}
                style={{ flex: 1, backgroundColor: journalSubTab === 'notes' ? '#E89E38' : 'transparent', color: journalSubTab === 'notes' ? '#000' : '#FFF', border: 'none', padding: '8px', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
              >
                Journal Entries ({journaledItems.length})
              </button>
              <button
                onClick={() => setJournalSubTab('places')}
                style={{ flex: 1, backgroundColor: journalSubTab === 'places' ? '#E89E38' : 'transparent', color: journalSubTab === 'places' ? '#000' : '#FFF', border: 'none', padding: '8px', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
              >
                Places to Visit ({places.length})
              </button>
            </div>

            {journalSubTab === 'notes' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>
                    {journaledItems.length} JOURNAL ENTRIES
                  </span>
                  <button
                    onClick={() => setNewJournalModalOpen(true)}
                    style={{ backgroundColor: '#E89E38', color: '#000', border: 'none', padding: '6px 14px', borderRadius: '8px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Plus size={14} /> + New Reflection
                  </button>
                </div>

                {journaledItems.map(item => (
                  <motion.div
                    key={item.id}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      if (item._isPost) {
                        const pIdx = posts.findIndex(p => p.id === item.id);
                        setSelectedPostIndex(pIdx >= 0 ? pIdx : 0);
                        setActiveTab('feed');
                      } else {
                        setSelectedStory(item);
                        setActiveTab('memories');
                      }
                    }}
                    style={{
                      backgroundColor: '#16161A',
                      borderRadius: '14px',
                      padding: '12px',
                      border: '1px solid rgba(255,255,255,0.08)',
                      display: 'flex',
                      gap: '12px',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ width: '60px', height: '60px', borderRadius: '10px', overflow: 'hidden', backgroundColor: '#000', flexShrink: 0 }}>
                      <OfflineMedia src={getMediaUrl(item)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Thumb" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#E89E38' }}>
                        {item.location_name || (item.taken_at ? new Date(item.taken_at).toLocaleDateString() : 'Journal Entry')}
                      </div>
                      <div style={{ fontSize: '12px', marginTop: '3px', lineHeight: 1.3, color: 'rgba(255,255,255,0.85)', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                        {item.journal_note}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              /* Places to Visit Bucket List */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <form onSubmit={handleAddPlace} style={{ backgroundColor: '#16161A', borderRadius: '14px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#E89E38' }}>+ Add Travel Bucket List Goal</div>
                  <input
                    type="text"
                    placeholder="Destination / Goal..."
                    value={newPlaceTitle}
                    onChange={(e) => setNewPlaceTitle(e.target.value)}
                    style={{ backgroundColor: 'rgba(0,0,0,0.4)', color: '#FFF', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '8px 12px', fontSize: '12px', outline: 'none' }}
                  />
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <input
                      type="text"
                      placeholder="Location (e.g. Kyoto, Japan)"
                      value={newPlaceLocation}
                      onChange={(e) => setNewPlaceLocation(e.target.value)}
                      style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', color: '#FFF', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '6px 10px', fontSize: '11px', outline: 'none' }}
                    />
                    <select
                      value={newPlaceCategory}
                      onChange={(e) => setNewPlaceCategory(e.target.value)}
                      style={{ backgroundColor: '#222', color: '#FFF', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '6px 8px', fontSize: '11px', outline: 'none' }}
                    >
                      <option value="Travel">Travel</option>
                      <option value="Nature">Nature</option>
                      <option value="Culture">Culture</option>
                      <option value="Roadtrip">Roadtrip</option>
                      <option value="Food">Food</option>
                    </select>
                    <button type="submit" style={{ backgroundColor: '#E89E38', color: '#000', border: 'none', padding: '6px 14px', borderRadius: '8px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}>
                      Add
                    </button>
                  </div>
                </form>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {places.map(p => (
                    <div key={p.id} style={{ backgroundColor: '#16161A', borderRadius: '12px', padding: '12px', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', opacity: p.completed ? 0.5 : 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                        <div onClick={() => togglePlaceCompleted(p.id)} style={{ cursor: 'pointer', color: p.completed ? '#888' : '#E89E38' }}>
                          {p.completed ? <CheckSquare size={18} /> : <Square size={18} />}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: '13px', fontWeight: 600, textDecoration: p.completed ? 'line-through' : 'none' }}>{p.title}</div>
                          <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)' }}>📍 {p.location} • <span style={{ color: '#E89E38' }}>{p.category}</span></div>
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
            TAB 5: SETTINGS & STORAGE SENSE (DESKTOP PARITY)
           ══════════════════════════════════════════════════════ */}
        {activeTab === 'settings' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Instagram Connected Profile Card */}
            {igSession && (
              <div style={{ backgroundColor: '#16161A', borderRadius: '16px', padding: '16px', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', overflow: 'hidden', border: '2px solid #E89E38' }}>
                    {igSession.profile_pic_url ? (
                      <img src={igSession.profile_pic_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="IG" />
                    ) : (
                      <div style={{ width: '100%', height: '100%', backgroundColor: '#E89E38', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontWeight: 'bold' }}>IG</div>
                    )}
                  </div>
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: 700 }}>@{igSession.username || 'instagram_user'}</div>
                    <div style={{ fontSize: '11px', color: '#008A00', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                      <CheckCircle2 size={12} /> Connected & Archiving Active
                    </div>
                  </div>
                </div>

                {igSession.username && (
                  <a
                    href={`https://instagram.com/${igSession.username}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: '#FFF', padding: '6px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 600, textDecoration: 'none' }}
                  >
                    Profile ↗
                  </a>
                )}
              </div>
            )}

            {/* ActiveSync Action Card */}
            <div style={{ backgroundColor: '#16161A', borderRadius: '16px', padding: '16px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '4px' }}>ActiveSync Vault</div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', marginBottom: '12px' }}>
                {lastSyncTime ? `Last synced: ${lastSyncTime}` : 'Tap to sync with laptop vault'}
              </div>
              <button
                onClick={handleRunSync}
                disabled={isSyncing}
                style={{ width: '100%', backgroundColor: '#E89E38', color: '#000', border: 'none', padding: '12px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer' }}
              >
                <RefreshCw size={16} className={isSyncing ? 'spin-anim' : ''} />
                <span>{isSyncing ? 'Syncing Full Media Archive...' : 'Sync with Laptop Vault Now'}</span>
              </button>
            </div>

            {/* Storage Sense Card */}
            <div style={{ backgroundColor: '#16161A', borderRadius: '16px', padding: '16px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' }}>
                <div style={{ fontSize: '26px', fontWeight: 800, color: '#E89E38' }}>{stats.storageMb} MB</div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>Offline Media Vault</div>
              </div>

              <div style={{ height: '6px', width: '100%', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden', display: 'flex', marginBottom: '10px' }}>
                <div style={{ width: '65%', backgroundColor: '#E89E38' }} />
                <div style={{ width: '25%', backgroundColor: '#C2185B' }} />
                <div style={{ width: '10%', backgroundColor: '#008A00' }} />
              </div>

              <div style={{ display: 'flex', gap: '12px', fontSize: '11px', color: 'rgba(255,255,255,0.7)', marginBottom: '12px' }}>
                <span>{stories.length} Memories</span>
                <span>{posts.length} Posts</span>
                <span>{journaledItems.length + places.length} Journal/Goals</span>
              </div>

              <button
                onClick={handleClearCache}
                style={{ width: '100%', background: 'none', border: '1px solid #A20025', color: '#A20025', padding: '8px', borderRadius: '8px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
              >
                Clear Offline Storage Cache
              </button>
            </div>

            {/* Standalone Installation Card */}
            {!isInstalled && (
              <div style={{ backgroundColor: '#16161A', borderRadius: '16px', padding: '16px', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700 }}>Install Standalone App</div>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>Add to home screen</div>
                </div>
                <button onClick={handleInstallPwa} style={{ backgroundColor: '#E89E38', color: '#000', border: 'none', padding: '8px 14px', borderRadius: '8px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}>
                  Install App
                </button>
              </div>
            )}
          </div>
        )}

      </div>

      {/* ── Modern Glassmorphic Bottom Navigation Bar ────────── */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        maxWidth: '640px',
        margin: '0 auto',
        height: '62px',
        backgroundColor: 'rgba(15, 15, 18, 0.92)',
        backdropFilter: 'blur(25px)',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        zIndex: 90,
      }}>
        {[
          { id: 'memories', label: 'Memories', icon: ImageIcon },
          { id: 'highlights', label: 'Highlights', icon: Sparkles },
          { id: 'feed', label: 'Feed', icon: Film },
          { id: 'journal', label: 'Journal', icon: BookOpen },
          { id: 'settings', label: 'Vault', icon: SettingsIcon },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setSelectedStory(null); }}
              style={{
                background: 'none',
                border: 'none',
                color: isActive ? '#E89E38' : 'rgba(255,255,255,0.5)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                cursor: 'pointer',
                padding: '4px 8px',
                transition: 'color 0.15s ease',
              }}
            >
              <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
              <span style={{ fontSize: '10px', fontWeight: isActive ? 700 : 500 }}>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}