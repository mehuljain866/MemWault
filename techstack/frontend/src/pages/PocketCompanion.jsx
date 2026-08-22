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
  User as UserIcon, CheckCircle2, AlertCircle
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
import { playWin98Click } from '../services/win98Audio';

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

/**
 * Safely extracts display image URL from post or story
 */
function getMediaUrl(item) {
  if (!item) return '';
  if (item.media_items && item.media_items.length > 0) {
    const first = item.media_items[0];
    return first.display_url || first.media_url || first.instagram_media_url || first.raw_media_url || '';
  }
  return item.display_url || item.media_url || item.instagram_media_url || item.raw_media_url || '';
}

export default function PocketCompanion() {
  // ── Theme & Customization States ──────────────────────────────────────────
  const [accent, setAccent] = useState(() => localStorage.getItem('metro_accent') || '#0050EF');
  const [themeMode, setThemeMode] = useState(() => localStorage.getItem('metro_theme') || 'dark');
  const [enableLiveFlip, setEnableLiveFlip] = useState(() => localStorage.getItem('metro_live_flip') !== 'false');
  const [soundEnabled, setSoundEnabled] = useState(() => localStorage.getItem('metro_sound') !== 'false');
  const [autoSyncOnOpen, setAutoSyncOnOpen] = useState(() => localStorage.getItem('metro_auto_sync') !== 'false');
  const [serverHost, setServerHost] = useState(() => localStorage.getItem('metro_server_host') || window.location.hostname || '192.168.29.50');

  // ── Navigation & Data States ──────────────────────────────────────────────
  const [activePivot, setActivePivot] = useState('start'); // 'start' | 'memories' | 'highlights' | 'feed' | 'journal' | 'music' | 'settings'
  const [stories, setStories] = useState([]);
  const [posts, setPosts] = useState([]);
  const [highlights, setHighlights] = useState([]);
  const [pendingUploads, setPendingUploads] = useState([]);
  const [stats, setStats] = useState({ memoryCount: 0, postCount: 0, pendingCount: 0, highlightCount: 0, storageMb: '0.00' });
  const [igSession, setIgSession] = useState(null);

  // ── Selection & Filter States ─────────────────────────────────────────────
  const [selectedStory, setSelectedStory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all' | 'photos' | 'videos' | 'journaled' | 'music'
  const [feedViewMode, setFeedViewMode] = useState('grid'); // 'grid' | 'cards'
  const [selectedPostIndex, setSelectedPostIndex] = useState(null);
  const [postSlideIndex, setPostSlideIndex] = useState(0);

  // ── On This Day Flashback States ──────────────────────────────────────────
  const [flashbackIndex, setFlashbackIndex] = useState(0);
  const [isAudioMuted, setIsAudioMuted] = useState(false);

  // ── Highlights Player States ──────────────────────────────────────────────
  const [activeHighlight, setActiveHighlight] = useState(null);
  const [highlightStories, setHighlightStories] = useState([]);
  const [highlightStoryIndex, setHighlightStoryIndex] = useState(0);
  const [isHighlightPaused, setIsHighlightPaused] = useState(false);
  const [highlightProgress, setHighlightProgress] = useState(0);

  // ── Journal Creator States ────────────────────────────────────────────────
  const [newJournalModalOpen, setNewJournalModalOpen] = useState(false);
  const [journalAttachType, setJournalAttachType] = useState('story'); // 'story' | 'post'
  const [selectedItemForJournal, setSelectedItemForJournal] = useState(null);
  const [journalNoteText, setJournalNoteText] = useState('');
  const [editingItemId, setEditingItemId] = useState(null);
  const [journalDraft, setJournalDraft] = useState('');
  const [isSavingJournal, setIsSavingJournal] = useState(false);

  // ── PWA Installation States ───────────────────────────────────────────────
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showIosInstructions, setShowIosInstructions] = useState(false);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // ── Status Bar States ─────────────────────────────────────────────────────
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  const [batteryLevel, setBatteryLevel] = useState(null);

  // ── 3D Live Tile Flip States ──────────────────────────────────────────────
  const [flipToday, setFlipToday] = useState(false);
  const [flipMemories, setFlipMemories] = useState(false);
  const [flipFeed, setFlipFeed] = useState(false);
  const [flipJournal, setFlipJournal] = useState(false);
  const [flipHighlights, setFlipHighlights] = useState(false);
  const [photoCollageIndex, setPhotoCollageIndex] = useState(0);

  // ── Sync States ───────────────────────────────────────────────────────────
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState({ step: 'Ready', percent: 0, status: 'idle' });
  const [syncLogs, setSyncLogs] = useState([]);
  const [lastSyncTime, setLastSyncTime] = useState(() => localStorage.getItem('metro_last_sync') || null);

  const fileInputRef = useRef(null);
  const highlightTimerRef = useRef(null);
  const storyAudioRef = useRef(null);

  const isDark = themeMode === 'dark';
  const bgColor = isDark ? '#000000' : '#FFFFFF';
  const surfaceColor = isDark ? '#1C1C1C' : '#F4F4F4';
  const cardColor = isDark ? '#121212' : '#E8E8E8';
  const textColor = isDark ? '#FFFFFF' : '#000000';
  const subTextColor = isDark ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.65)';
  const borderColor = isDark ? '#333333' : '#D4D4D4';

  const triggerSound = () => {
    if (soundEnabled) {
      try { playWin98Click(); } catch (e) {}
    }
  };

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

  // ── 3. Live Tile Flipping & WP8.1 Photo Collage Cycling ───────────────────
  useEffect(() => {
    if (!enableLiveFlip) return;
    const t1 = setInterval(() => setFlipToday(f => !f), 6000);
    const t2 = setInterval(() => setFlipMemories(f => !f), 7500);
    const t3 = setInterval(() => setFlipFeed(f => !f), 9000);
    const t4 = setInterval(() => setFlipJournal(f => !f), 10500);
    const t5 = setInterval(() => setFlipHighlights(f => !f), 12000);
    const tPhoto = setInterval(() => {
      setPhotoCollageIndex(i => (i + 1) % Math.max(1, stories.length));
    }, 4000);

    return () => {
      clearInterval(t1); clearInterval(t2); clearInterval(t3);
      clearInterval(t4); clearInterval(t5); clearInterval(tPhoto);
    };
  }, [enableLiveFlip, stories.length]);

  // ── 4. Highlight Story Player Timer with Real Audio ───────────────────────
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
    triggerSound();
    setActiveHighlight(hl);
    setHighlightProgress(0);
    setHighlightStoryIndex(0);
    try {
      const data = await getHighlightStories(hl.id);
      const list = Array.isArray(data) ? data : (data?.stories || data?.items || []);
      if (list.length > 0) {
        setHighlightStories(list);
      } else {
        // Fallback: match from local stories
        const matched = stories.filter(s => hl.story_ids?.includes(s.id));
        setHighlightStories(matched.length > 0 ? matched : stories.slice(0, 6));
      }
    } catch (e) {
      setHighlightStories(stories.slice(0, 6));
    }
  };

  // ── 5. Trigger Native PWA App Installation ────────────────────────────────
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

  // ── 6. ActiveSync Execution ───────────────────────────────────────────────
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

  // ── 7. Save Journal Note from Modal or Inline ─────────────────────────────
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

  // ── 8. Add Camera Roll Photo to Vault ─────────────────────────────────────
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

  // ── 9. Wipe Offline Storage ───────────────────────────────────────────────
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

  // ── 10. Flashback Memories Multi-tier Array ───────────────────────────────
  const flashbacks = getOnThisDayMemories(stories);
  const currentFlashback = flashbacks[flashbackIndex] || flashbacks[0] || stories[0] || null;

  // ── 11. Filtered Story Grid Items ─────────────────────────────────────────
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

  const musicStories = stories.filter(s => s.music?.track_title || s.music_title);

  // ── Pivot Tabs ────────────────────────────────────────────────────────────
  const pivotList = [
    { id: 'start', label: 'start' },
    { id: 'memories', label: 'memories' },
    { id: 'highlights', label: 'highlights' },
    { id: 'feed', label: 'feed' },
    { id: 'journal', label: 'journal' },
    { id: 'music', label: 'music' },
    { id: 'settings', label: 'settings' },
  ];

  // ── Authentic Metro Toggle Switch Component ───────────────────────────────
  const MetroToggle = ({ label, checked, onChange }) => (
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
          {checked ? 'on' : 'off'}
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
      width: '100vw',
      minHeight: '100vh',
      maxWidth: '640px',
      margin: '0 auto',
      backgroundColor: bgColor,
      color: textColor,
      fontFamily: '"Segoe UI", "Segoe WP", "Segoe UI Light", -apple-system, BlinkMacSystemFont, "Helvetica Neue", sans-serif',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      userSelect: 'none',
      overflowX: 'hidden',
      paddingBottom: '40px',
      boxSizing: 'border-box',
      transition: 'background-color 0.25s ease, color 0.25s ease',
    }}>
      {/* Hidden File Input for Camera Roll Master Pick */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFilePicked}
        accept="image/*,video/*"
        style={{ display: 'none' }}
      />

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
              maxWidth: '640px',
              margin: '0 auto',
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
                style={{
                  backgroundColor: accent,
                  border: 'none',
                  color: '#FFFFFF',
                  padding: '6px 16px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
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
                style={{
                  background: 'transparent',
                  border: `2px solid ${borderColor}`,
                  color: textColor,
                  padding: '6px 16px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                cancel
              </button>
              <button
                onClick={handleClearCache}
                style={{
                  backgroundColor: '#A20025',
                  border: 'none',
                  color: '#FFFFFF',
                  padding: '6px 16px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                clear now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── FULLSCREEN INSTAGRAM HIGHLIGHT STORY PLAYER ─────── */}
      <AnimatePresence>
        {activeHighlight && highlightStories.length > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 999999,
              backgroundColor: '#000000',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Top Segmented Progress Bars */}
            <div style={{
              position: 'absolute',
              top: '8px',
              left: '8px',
              right: '8px',
              display: 'flex',
              gap: '4px',
              zIndex: 20,
            }}>
              {highlightStories.map((_, idx) => (
                <div
                  key={idx}
                  style={{
                    flex: 1,
                    height: '2.5px',
                    backgroundColor: 'rgba(255,255,255,0.35)',
                    borderRadius: '2px',
                    overflow: 'hidden',
                  }}
                >
                  <div style={{
                    height: '100%',
                    backgroundColor: '#FFFFFF',
                    width: idx < highlightStoryIndex ? '100%' : (idx === highlightStoryIndex ? `${highlightProgress}%` : '0%'),
                    transition: idx === highlightStoryIndex ? 'width 0.05s linear' : 'none',
                  }} />
                </div>
              ))}
            </div>

            {/* Story Header with Title & Audio Mute Toggle */}
            <div style={{
              position: 'absolute',
              top: '18px',
              left: '12px',
              right: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              zIndex: 20,
              color: '#FFFFFF',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: accent,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                  fontSize: '12px',
                  border: '2px solid #FFF',
                  overflow: 'hidden',
                }}>
                  {activeHighlight.cover_media_url || activeHighlight.preview_stories?.[0] ? (
                    <img src={activeHighlight.cover_media_url || activeHighlight.preview_stories?.[0]} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Cover" />
                  ) : (
                    activeHighlight.title?.slice(0, 2).toUpperCase() || 'HL'
                  )}
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600 }}>{activeHighlight.title}</div>
                  <div style={{ fontSize: '10px', opacity: 0.75 }}>
                    {highlightStories[highlightStoryIndex]?.taken_at ? new Date(highlightStories[highlightStoryIndex].taken_at).toLocaleDateString() : 'Highlight'}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  onClick={() => setIsAudioMuted(!isAudioMuted)}
                  style={{ background: 'rgba(0,0,0,0.5)', border: 'none', color: '#FFF', borderRadius: '50%', padding: '6px', cursor: 'pointer' }}
                >
                  {isAudioMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                </button>
                <button
                  onClick={() => { triggerSound(); setActiveHighlight(null); }}
                  style={{ background: 'rgba(0,0,0,0.5)', border: 'none', color: '#FFF', borderRadius: '50%', padding: '6px', cursor: 'pointer' }}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Main Media Viewport with Tap Navigation & Video/Audio Playback */}
            <div
              style={{
                flex: 1,
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#000',
              }}
              onMouseDown={() => setIsHighlightPaused(true)}
              onMouseUp={() => setIsHighlightPaused(false)}
              onTouchStart={() => setIsHighlightPaused(true)}
              onTouchEnd={() => setIsHighlightPaused(false)}
            >
              {highlightStories[highlightStoryIndex]?.media_type === 2 ? (
                <video
                  key={highlightStories[highlightStoryIndex]?.id}
                  src={highlightStories[highlightStoryIndex]?.media_url}
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  autoPlay
                  playsInline
                  muted={isAudioMuted}
                />
              ) : (
                <img
                  key={highlightStories[highlightStoryIndex]?.id}
                  src={highlightStories[highlightStoryIndex]?.media_url}
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  alt="Story"
                />
              )}

              {/* Tap Left 30% -> Previous Slide */}
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  if (highlightStoryIndex > 0) {
                    setHighlightStoryIndex(i => i - 1);
                    setHighlightProgress(0);
                  }
                }}
                style={{ position: 'absolute', top: '60px', bottom: '80px', left: 0, width: '35%', zIndex: 15 }}
              />

              {/* Tap Right 70% -> Next Slide */}
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
                style={{ position: 'absolute', top: '60px', bottom: '80px', right: 0, width: '65%', zIndex: 15 }}
              />
            </div>

            {/* Bottom Story Caption & Animated Soundwave Music Sticker */}
            <div style={{
              padding: '16px',
              background: 'linear-gradient(transparent, rgba(0,0,0,0.92))',
              color: '#FFFFFF',
              zIndex: 20,
            }}>
              {highlightStories[highlightStoryIndex]?.caption_text && (
                <div style={{ fontSize: '13px', lineHeight: 1.4, marginBottom: '8px' }}>
                  {highlightStories[highlightStoryIndex].caption_text}
                </div>
              )}
              {(highlightStories[highlightStoryIndex]?.music?.track_title || highlightStories[highlightStoryIndex]?.music_title) && (
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: 'rgba(0, 80, 239, 0.35)',
                  border: `1px solid ${accent}`,
                  padding: '6px 12px',
                  borderRadius: '16px',
                  fontSize: '11px',
                  color: '#FFFFFF',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '2px', height: '12px' }}>
                    <div style={{ width: '2px', height: '100%', backgroundColor: accent, animation: 'equalize 0.8s infinite alternate' }} />
                    <div style={{ width: '2px', height: '60%', backgroundColor: accent, animation: 'equalize 0.5s infinite alternate-reverse' }} />
                    <div style={{ width: '2px', height: '80%', backgroundColor: accent, animation: 'equalize 0.7s infinite alternate' }} />
                  </div>
                  <span style={{ fontWeight: 600 }}>{highlightStories[highlightStoryIndex]?.music?.track_title || highlightStories[highlightStoryIndex]?.music_title}</span>
                  <span style={{ opacity: 0.75 }}>• {highlightStories[highlightStoryIndex]?.music?.artist_name || highlightStories[highlightStoryIndex]?.music_artist || 'Artist'}</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── CREATE NEW JOURNAL ENTRY MODAL ─────────────────── */}
      {newJournalModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.88)',
          zIndex: 100000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
        }}>
          <div style={{
            backgroundColor: surfaceColor,
            borderLeft: `4px solid #008A00`,
            padding: '18px',
            maxWidth: '480px',
            width: '100%',
            color: textColor,
            maxHeight: '90vh',
            overflowY: 'auto',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ fontSize: '18px', fontWeight: 300, color: '#008A00' }}>+ new journal entry</div>
              <X size={18} style={{ cursor: 'pointer' }} onClick={() => setNewJournalModalOpen(false)} />
            </div>

            {/* Target Type Selector (Memories vs Feed Posts) */}
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

            <div style={{ fontSize: '11px', color: subTextColor, marginBottom: '8px' }}>
              1. TAP PHOTO TO ATTACH JOURNAL NOTE:
            </div>

            {/* Item Picker Horizontal Scroll */}
            <div style={{
              display: 'flex',
              gap: '6px',
              overflowX: 'auto',
              paddingBottom: '8px',
              scrollbarWidth: 'none',
              marginBottom: '14px',
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
                    {item.media_type === 2 ? (
                      <video src={mediaUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted />
                    ) : (
                      <img src={mediaUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Thumb" />
                    )}
                    {isSelected && (
                      <div style={{ position: 'absolute', top: '2px', right: '2px', backgroundColor: '#008A00', borderRadius: '50%', padding: '2px' }}>
                        <Check size={10} color="#FFF" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {selectedItemForJournal && (
              <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#008A00', marginBottom: '6px' }}>
                Attached to: {selectedItemForJournal.location_name || (selectedItemForJournal.taken_at ? new Date(selectedItemForJournal.taken_at).toLocaleDateString() : 'Selected Item')}
              </div>
            )}

            <div style={{ fontSize: '11px', color: subTextColor, marginBottom: '4px' }}>
              2. WRITE YOUR JOURNAL NOTE:
            </div>
            <textarea
              value={journalNoteText}
              onChange={(e) => setJournalNoteText(e.target.value)}
              placeholder="What happened on this day? Write thoughts, reflections, and context..."
              rows={5}
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
                marginBottom: '14px',
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
                disabled={isSavingJournal || !journalNoteText.trim()}
                style={{
                  backgroundColor: '#008A00',
                  border: 'none',
                  color: '#FFFFFF',
                  padding: '6px 18px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  opacity: journalNoteText.trim() ? 1 : 0.5,
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
          style={{ flex: 1, padding: '12px 16px', overflowY: 'auto' }}
        >

          {/* ══════════════════════════════════════════════════════
              PIVOT 1: START SCREEN (ANIMATED 3D LIVE TILES GRID)
             ══════════════════════════════════════════════════════ */}
          {activePivot === 'start' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              
              {/* Revamped On This Day Flashback Tile (with Carousel Controls & Year Badge) */}
              <motion.div
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  triggerSound();
                  if (currentFlashback) {
                    setSelectedStory(currentFlashback);
                    setActivePivot('memories');
                  }
                }}
                style={{
                  width: '100%',
                  height: '150px',
                  backgroundColor: accent,
                  position: 'relative',
                  cursor: 'pointer',
                  perspective: '1000px',
                  overflow: 'hidden',
                }}
              >
                <motion.div
                  animate={{ rotateX: (enableLiveFlip && flipToday) ? 180 : 0 }}
                  transition={{ duration: 0.65, ease: [0.4, 0.0, 0.2, 1] }}
                  style={{
                    width: '100%',
                    height: '100%',
                    transformStyle: 'preserve-3d',
                    position: 'relative',
                  }}
                >
                  {/* Front Face: Photo + Flashback Label */}
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    backfaceVisibility: 'hidden',
                    display: 'flex',
                    backgroundColor: accent,
                    color: '#FFFFFF',
                  }}>
                    {currentFlashback && (
                      <div style={{ width: '42%', height: '100%', backgroundColor: '#000' }}>
                        {currentFlashback.media_type === 2 ? (
                          <video src={currentFlashback.media_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted />
                        ) : (
                          <img src={currentFlashback.media_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Flashback" />
                        )}
                      </div>
                    )}
                    <div style={{ flex: 1, padding: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{
                          display: 'inline-block',
                          backgroundColor: 'rgba(0,0,0,0.35)',
                          padding: '2px 6px',
                          fontSize: '9px',
                          fontWeight: 800,
                          letterSpacing: '0.08em',
                          marginBottom: '4px',
                        }}>
                          {currentFlashback?.badgeText || 'ON THIS DAY FLASHBACK'}
                        </div>
                        <div style={{ fontSize: '15px', fontWeight: 300, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {currentFlashback?.location_name || (currentFlashback?.taken_at ? new Date(currentFlashback.taken_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'MemWault Vault')}
                        </div>
                      </div>
                      <div style={{ fontSize: '11px', opacity: 0.95, lineHeight: 1.3 }}>
                        {currentFlashback?.relativeLabel || currentFlashback?.caption_text || 'Relive your archived memories.'}
                      </div>
                    </div>
                  </div>

                  {/* Back Face */}
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    backfaceVisibility: 'hidden',
                    transform: 'rotateX(180deg)',
                    backgroundColor: surfaceColor,
                    color: textColor,
                    padding: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    borderLeft: `4px solid ${accent}`,
                  }}>
                    <div>
                      <div style={{ fontSize: '10px', color: accent, fontWeight: 700, letterSpacing: '0.05em' }}>
                        {currentFlashback?.badgeText || 'FLASHBACK HIGHLIGHT'}
                      </div>
                      <div style={{ fontSize: '13px', marginTop: '4px', lineHeight: 1.3, fontWeight: 300 }}>
                        {currentFlashback?.journal_note || currentFlashback?.caption_text || 'Tap to inspect memory details & soundtrack.'}
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10px', opacity: 0.7 }}>
                      <span>{flashbacks.length} throwback memories found</span>
                      <span>tap to open</span>
                    </div>
                  </div>
                </motion.div>

                {/* Next/Prev Cycle Controls for Flashbacks */}
                {flashbacks.length > 1 && (
                  <div
                    style={{ position: 'absolute', bottom: '6px', right: '6px', display: 'flex', gap: '4px', zIndex: 20 }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => setFlashbackIndex(i => (i - 1 + flashbacks.length) % flashbacks.length)}
                      style={{ background: 'rgba(0,0,0,0.5)', border: 'none', color: '#FFF', padding: '2px 6px', fontSize: '10px', cursor: 'pointer' }}
                    >
                      ◀
                    </button>
                    <button
                      onClick={() => setFlashbackIndex(i => (i + 1) % flashbacks.length)}
                      style={{ background: 'rgba(0,0,0,0.5)', border: 'none', color: '#FFF', padding: '2px 6px', fontSize: '10px', cursor: 'pointer' }}
                    >
                      ▶
                    </button>
                  </div>
                )}

                <div style={{ position: 'absolute', bottom: '6px', left: '8px', fontSize: '10px', fontWeight: 600, zIndex: 10, color: '#FFFFFF' }}>
                  photos • on this day
                </div>
              </motion.div>

              {/* 2x2 Square Live Tiles Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '12px',
              }}>
                {/* Tile 2: Dynamic Multi-Photo Live Tile (WP8.1 Collage) */}
                <motion.div
                  whileTap={{ scale: 0.96 }}
                  onClick={() => { triggerSound(); setActivePivot('memories'); }}
                  style={{
                    aspectRatio: '1/1',
                    backgroundColor: accent,
                    position: 'relative',
                    cursor: 'pointer',
                    overflow: 'hidden',
                  }}
                >
                  {stories.length >= 4 ? (
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gridTemplateRows: '1fr 1fr',
                      width: '100%',
                      height: '100%',
                      gap: '2px',
                      backgroundColor: '#000',
                    }}>
                      {[0, 1, 2, 3].map(offset => {
                        const s = stories[(photoCollageIndex + offset) % stories.length];
                        return (
                          <div key={offset} style={{ width: '100%', height: '100%', overflow: 'hidden', position: 'relative' }}>
                            <img src={s.media_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Collage" />
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{ padding: '12px', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', color: '#FFF' }}>
                      <ImageIcon size={28} />
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: 400 }}>memories</div>
                        <div style={{ fontSize: '28px', fontWeight: 200, lineHeight: 1 }}>{stories.length}</div>
                      </div>
                    </div>
                  )}

                  <div style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    backgroundColor: 'rgba(0,0,0,0.65)',
                    padding: '4px 8px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    color: '#FFF',
                    fontSize: '10px',
                    fontWeight: 600,
                  }}>
                    <span>photos hub</span>
                    <span>{stories.length}</span>
                  </div>
                </motion.div>

                {/* Tile 3: Highlights Hub Tile */}
                <motion.div
                  whileTap={{ scale: 0.96 }}
                  onClick={() => { triggerSound(); setActivePivot('highlights'); }}
                  style={{
                    aspectRatio: '1/1',
                    backgroundColor: '#FA6800',
                    position: 'relative',
                    cursor: 'pointer',
                    perspective: '1000px',
                    overflow: 'hidden',
                  }}
                >
                  <motion.div
                    animate={{ rotateY: (enableLiveFlip && flipHighlights) ? 180 : 0 }}
                    transition={{ duration: 0.65, ease: [0.4, 0.0, 0.2, 1] }}
                    style={{
                      width: '100%',
                      height: '100%',
                      transformStyle: 'preserve-3d',
                      position: 'relative',
                    }}
                  >
                    <div style={{
                      position: 'absolute',
                      inset: 0,
                      backfaceVisibility: 'hidden',
                      padding: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      backgroundColor: '#FA6800',
                      color: '#FFFFFF',
                    }}>
                      <Sparkles size={28} />
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: 400 }}>highlights</div>
                        <div style={{ fontSize: '28px', fontWeight: 200, lineHeight: 1 }}>{highlights.length || '3'}</div>
                      </div>
                    </div>

                    <div style={{
                      position: 'absolute',
                      inset: 0,
                      backfaceVisibility: 'hidden',
                      transform: 'rotateY(180deg)',
                      backgroundColor: surfaceColor,
                      color: textColor,
                      padding: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      borderLeft: `4px solid #FA6800`,
                    }}>
                      <div style={{ fontSize: '11px', color: '#FA6800', fontWeight: 700 }}>story reels</div>
                      <div style={{ fontSize: '12px' }}>play full-screen stories with sound</div>
                      <div style={{ fontSize: '10px', opacity: 0.7 }}>tap to play</div>
                    </div>
                  </motion.div>
                </motion.div>

                {/* Tile 4: Feed Posts Tile */}
                <motion.div
                  whileTap={{ scale: 0.96 }}
                  onClick={() => { triggerSound(); setActivePivot('feed'); }}
                  style={{
                    aspectRatio: '1/1',
                    backgroundColor: '#D80073',
                    position: 'relative',
                    cursor: 'pointer',
                    perspective: '1000px',
                    overflow: 'hidden',
                  }}
                >
                  <motion.div
                    animate={{ rotateY: (enableLiveFlip && flipFeed) ? 180 : 0 }}
                    transition={{ duration: 0.65, ease: [0.4, 0.0, 0.2, 1] }}
                    style={{
                      width: '100%',
                      height: '100%',
                      transformStyle: 'preserve-3d',
                      position: 'relative',
                    }}
                  >
                    <div style={{
                      position: 'absolute',
                      inset: 0,
                      backfaceVisibility: 'hidden',
                      padding: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      backgroundColor: '#D80073',
                      color: '#FFFFFF',
                    }}>
                      <Film size={28} />
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: 400 }}>feed posts</div>
                        <div style={{ fontSize: '28px', fontWeight: 200, lineHeight: 1 }}>{posts.length}</div>
                      </div>
                    </div>

                    <div style={{
                      position: 'absolute',
                      inset: 0,
                      backfaceVisibility: 'hidden',
                      transform: 'rotateY(180deg)',
                      backgroundColor: surfaceColor,
                      color: textColor,
                      padding: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      borderLeft: `4px solid #D80073`,
                    }}>
                      <div style={{ fontSize: '11px', color: '#D80073', fontWeight: 700 }}>instagram feed</div>
                      <div style={{ fontSize: '12px' }}>{posts.length} carousel posts</div>
                      <div style={{ fontSize: '10px', opacity: 0.7 }}>tap to view feed</div>
                    </div>
                  </motion.div>
                </motion.div>

                {/* Tile 5: Journal Tile */}
                <motion.div
                  whileTap={{ scale: 0.96 }}
                  onClick={() => { triggerSound(); setActivePivot('journal'); }}
                  style={{
                    aspectRatio: '1/1',
                    backgroundColor: '#008A00',
                    color: '#FFFFFF',
                    position: 'relative',
                    cursor: 'pointer',
                    perspective: '1000px',
                    overflow: 'hidden',
                  }}
                >
                  <motion.div
                    animate={{ rotateY: (enableLiveFlip && flipJournal) ? 180 : 0 }}
                    transition={{ duration: 0.65, ease: [0.4, 0.0, 0.2, 1] }}
                    style={{
                      width: '100%',
                      height: '100%',
                      transformStyle: 'preserve-3d',
                      position: 'relative',
                    }}
                  >
                    <div style={{
                      position: 'absolute',
                      inset: 0,
                      backfaceVisibility: 'hidden',
                      padding: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      backgroundColor: '#008A00',
                      color: '#FFFFFF',
                    }}>
                      <BookOpen size={28} />
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: 400 }}>journal</div>
                        <div style={{ fontSize: '28px', fontWeight: 200, lineHeight: 1 }}>{journaledItems.length}</div>
                      </div>
                    </div>

                    <div style={{
                      position: 'absolute',
                      inset: 0,
                      backfaceVisibility: 'hidden',
                      transform: 'rotateY(180deg)',
                      backgroundColor: surfaceColor,
                      color: textColor,
                      padding: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      borderLeft: `4px solid #008A00`,
                    }}>
                      <div style={{ fontSize: '11px', color: '#008A00', fontWeight: 700 }}>notes hub</div>
                      <div style={{ fontSize: '11px', lineHeight: 1.3 }}>{journaledItems[0]?.journal_note?.slice(0, 45) || 'write notes'}...</div>
                      <div style={{ fontSize: '10px', opacity: 0.7 }}>tap to open</div>
                    </div>
                  </motion.div>
                </motion.div>
              </div>

              {/* Tile 6: Vault Camera Tile (Wide 4x1) */}
              <motion.div
                whileTap={{ scale: 0.98 }}
                onClick={() => { triggerSound(); fileInputRef.current?.click(); }}
                style={{
                  width: '100%',
                  backgroundColor: '#F09609',
                  color: '#FFFFFF',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Camera size={24} />
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 400 }}>vault camera</div>
                    <div style={{ fontSize: '11px', opacity: 0.9 }}>+ upload master photo to vault</div>
                  </div>
                </div>
                <Plus size={20} />
              </motion.div>

              {/* Tile 7: ActiveSync Wide Banner */}
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

              {/* Tile 8: Settings Wide Banner */}
              <motion.div
                whileTap={{ scale: 0.98 }}
                onClick={() => { triggerSound(); setActivePivot('settings'); }}
                style={{
                  width: '100%',
                  backgroundColor: surfaceColor,
                  borderLeft: `5px solid ${accent}`,
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                }}
              >
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 400 }}>Settings & Storage Sense</div>
                  <div style={{ fontSize: '11px', color: subTextColor, marginTop: '2px' }}>
                    Theme accents, storage sense & options
                  </div>
                </div>
                <SettingsIcon size={20} color={accent} />
              </motion.div>
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
                              <img src={coverUrl} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} alt={hl.title} />
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
                  { id: 'journaled', label: 'journaled' },
                  { id: 'music', label: 'soundtracks' },
                ].map(f => (
                  <button
                    key={f.id}
                    onClick={() => { triggerSound(); setFilterType(f.id); }}
                    style={{
                      backgroundColor: filterType === f.id ? accent : surfaceColor,
                      color: filterType === f.id ? '#FFFFFF' : textColor,
                      border: 'none',
                      padding: '6px 14px',
                      fontSize: '11px',
                      fontWeight: 600,
                      textTransform: 'lowercase',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {f.label}
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
                  return (
                    <motion.div
                      key={story.id}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => { triggerSound(); setSelectedStory(story); }}
                      style={{
                        aspectRatio: '9/16',
                        backgroundColor: '#111',
                        position: 'relative',
                        cursor: 'pointer',
                        overflow: 'hidden',
                      }}
                    >
                      {story.media_type === 2 ? (
                        <video src={story.media_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted />
                      ) : (
                        <img src={story.media_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" alt="Memory" />
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
                          top: '4px',
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
              <button
                onClick={() => { triggerSound(); setSelectedStory(null); }}
                style={{
                  alignSelf: 'flex-start',
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

              {/* Fullscreen Media Canvas */}
              <div style={{
                width: '100%',
                backgroundColor: '#000000',
                position: 'relative',
                border: `1px solid ${accent}`,
                overflow: 'hidden',
              }}>
                {selectedStory.media_type === 2 ? (
                  <video src={selectedStory.media_url} style={{ width: '100%', maxHeight: '55vh', objectFit: 'contain' }} controls autoPlay playsInline />
                ) : (
                  <img src={selectedStory.media_url} style={{ width: '100%', maxHeight: '55vh', objectFit: 'contain', display: 'block', margin: '0 auto' }} alt="Detail" />
                )}
              </div>

              {/* Music & Audio Streaming Links */}
              {(selectedStory.music?.track_title || selectedStory.music_title) && (
                <div style={{
                  backgroundColor: surfaceColor,
                  padding: '10px 14px',
                  borderLeft: `4px solid #1DB954`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#1DB954', fontSize: '11px', fontWeight: 'bold' }}>
                    <Music size={12} />
                    <span>SOUNDTRACK: {selectedStory.music?.track_title || selectedStory.music_title} — {selectedStory.music?.artist_name || selectedStory.music_artist || 'Artist'}</span>
                  </div>
                  
                  {/* Streaming Badges */}
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
                    <a
                      href={`https://open.spotify.com/search/${encodeURIComponent((selectedStory.music?.track_title || selectedStory.music_title) + ' ' + (selectedStory.music?.artist_name || selectedStory.music_artist || ''))}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{ backgroundColor: '#1DB954', color: '#000', padding: '4px 10px', fontSize: '10px', fontWeight: 'bold', textDecoration: 'none' }}
                    >
                      Spotify ↗
                    </a>
                    <a
                      href={`https://music.apple.com/us/search?term=${encodeURIComponent((selectedStory.music?.track_title || selectedStory.music_title) + ' ' + (selectedStory.music?.artist_name || selectedStory.music_artist || ''))}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{ backgroundColor: '#FC3C44', color: '#fff', padding: '4px 10px', fontSize: '10px', fontWeight: 'bold', textDecoration: 'none' }}
                    >
                      Apple Music ↗
                    </a>
                    <a
                      href={`https://music.youtube.com/search?q=${encodeURIComponent((selectedStory.music?.track_title || selectedStory.music_title) + ' ' + (selectedStory.music?.artist_name || selectedStory.music_artist || ''))}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{ backgroundColor: '#FF0000', color: '#fff', padding: '4px 10px', fontSize: '10px', fontWeight: 'bold', textDecoration: 'none' }}
                    >
                      YouTube Music ↗
                    </a>
                  </div>
                </div>
              )}

              {/* Location & Metadata */}
              <div style={{ backgroundColor: surfaceColor, padding: '12px' }}>
                <div style={{ fontSize: '16px', fontWeight: 300 }}>
                  {selectedStory.location_name || 'Archived Memory'}
                </div>
                <div style={{ fontSize: '11px', color: subTextColor, marginTop: '2px' }}>
                  {selectedStory.taken_at ? new Date(selectedStory.taken_at).toLocaleString() : ''}
                </div>

                {selectedStory.caption_text && (
                  <div style={{ fontSize: '12px', marginTop: '8px', lineHeight: 1.4 }}>
                    {selectedStory.caption_text}
                  </div>
                )}
              </div>

              {/* Journal Note Section */}
              <div style={{
                backgroundColor: surfaceColor,
                borderLeft: '4px solid #008A00',
                padding: '12px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#008A00' }}>
                    📓 JOURNAL NOTE
                  </div>
                  {editingItemId !== selectedStory.id && (
                    <button
                      onClick={() => {
                        setEditingItemId(selectedStory.id);
                        setJournalDraft(selectedStory.journal_note || '');
                      }}
                      style={{ background: 'none', border: 'none', color: accent, fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <Edit3 size={12} />
                      <span>{selectedStory.journal_note ? 'edit' : '+ add note'}</span>
                    </button>
                  )}
                </div>

                {editingItemId === selectedStory.id ? (
                  <div>
                    <textarea
                      value={journalDraft}
                      onChange={(e) => setJournalDraft(e.target.value)}
                      placeholder="Write your personal memories, feelings, or thoughts about this story..."
                      rows={4}
                      style={{
                        width: '100%',
                        backgroundColor: cardColor,
                        color: textColor,
                        border: `1px solid ${accent}`,
                        padding: '8px',
                        fontSize: '12px',
                        fontFamily: 'inherit',
                        boxSizing: 'border-box',
                        outline: 'none',
                      }}
                    />
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '8px' }}>
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
                    {selectedStory.journal_note || <span style={{ opacity: 0.5, fontStyle: 'italic' }}>No journal entry written yet. Tap edit to add one.</span>}
                  </div>
                )}
              </div>

              {/* Add Master Photo Button */}
              <button
                onClick={() => { triggerSound(); fileInputRef.current?.click(); }}
                style={{
                  backgroundColor: accent,
                  color: '#ffffff',
                  border: 'none',
                  padding: '12px',
                  fontSize: '12px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                }}
              >
                <Plus size={16} />
                <span>Add Camera Roll Photo to this Memory</span>
              </button>
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
                  const coverUrl = hl.cover_media_url || (hl.preview_stories && hl.preview_stories[0]) || (hl.stories && hl.stories[0]?.media_url) || (stories[0]?.media_url);
                  return (
                    <motion.div
                      key={hl.id}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => handleOpenHighlight(hl)}
                      style={{
                        aspectRatio: '1/1',
                        backgroundColor: '#FA6800',
                        color: '#FFFFFF',
                        padding: '12px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        position: 'relative',
                        overflow: 'hidden',
                      }}
                    >
                      {coverUrl && (
                        <img
                          src={coverUrl}
                          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.45 }}
                          alt="Highlight Cover"
                        />
                      )}
                      <Sparkles size={24} style={{ zIndex: 2 }} />
                      <div style={{ zIndex: 2 }}>
                        <div style={{ fontSize: '14px', fontWeight: 600 }}>{hl.title}</div>
                        <div style={{ fontSize: '10px', opacity: 0.85, marginTop: '2px' }}>Tap to play stories</div>
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
                        {mediaUrl && (
                          <img src={mediaUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Post" />
                        )}
                        {isCarousel && (
                          <div style={{
                            position: 'absolute',
                            top: '4px',
                            right: '4px',
                            backgroundColor: 'rgba(0,0,0,0.6)',
                            padding: '2px 4px',
                            borderRadius: '2px',
                          }}>
                            <Layers size={10} color="#FFF" />
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
                    return (
                      <div key={post.id} style={{ backgroundColor: surfaceColor, borderBottom: `2px solid ${accent}` }}>
                        {/* Card Header */}
                        <div style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF', fontSize: '11px', fontWeight: 'bold' }}>
                            MW
                          </div>
                          <div>
                            <div style={{ fontSize: '12px', fontWeight: 600 }}>Instagram Post</div>
                            <div style={{ fontSize: '10px', color: subTextColor }}>
                              {post.taken_at ? new Date(post.taken_at).toLocaleDateString() : ''}
                            </div>
                          </div>
                        </div>

                        {/* Image Carousel */}
                        <div style={{ width: '100%', aspectRatio: '1/1', backgroundColor: '#000', position: 'relative' }}>
                          {mediaUrl && (
                            <img src={mediaUrl} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="Post" />
                          )}
                        </div>

                        {/* Card Details */}
                        <div style={{ padding: '12px' }}>
                          {post.like_count !== undefined && (
                            <div style={{ fontSize: '11px', fontWeight: 'bold', marginBottom: '4px' }}>
                              ❤️ {post.like_count} likes
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
                  backgroundColor: 'rgba(0,0,0,0.94)',
                  zIndex: 100000,
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '12px',
                }}>
                  {/* Top Bar with Post Counter & Next/Prev */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', color: '#FFF' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <button
                        onClick={() => {
                          setSelectedPostIndex(i => (i - 1 + posts.length) % posts.length);
                          setPostSlideIndex(0);
                        }}
                        style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#FFF', padding: '4px 8px', fontSize: '12px', cursor: 'pointer' }}
                      >
                        ◀ Prev
                      </button>
                      <span style={{ fontSize: '12px', opacity: 0.8 }}>
                        {selectedPostIndex + 1} of {posts.length}
                      </span>
                      <button
                        onClick={() => {
                          setSelectedPostIndex(i => (i + 1) % posts.length);
                          setPostSlideIndex(0);
                        }}
                        style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#FFF', padding: '4px 8px', fontSize: '12px', cursor: 'pointer' }}
                      >
                        Next ▶
                      </button>
                    </div>

                    <X size={22} style={{ cursor: 'pointer' }} onClick={() => setSelectedPostIndex(null)} />
                  </div>

                  {/* Main Media Viewport */}
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                    {(() => {
                      const curPost = posts[selectedPostIndex];
                      const mediaList = curPost.media_items || (curPost.media_url ? [{ display_url: curPost.media_url }] : []);
                      const activeMedia = mediaList[postSlideIndex] || mediaList[0];
                      const url = activeMedia?.display_url || activeMedia?.media_url || activeMedia?.instagram_media_url || curPost.media_url;

                      return (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                          <img src={url} style={{ maxWidth: '100%', maxHeight: '60vh', objectFit: 'contain' }} alt="Fullscreen Post" />

                          {/* Multi-slide carousel indicator */}
                          {mediaList.length > 1 && (
                            <div style={{ position: 'absolute', bottom: '8px', display: 'flex', gap: '4px', backgroundColor: 'rgba(0,0,0,0.5)', padding: '4px 8px', borderRadius: '12px' }}>
                              {mediaList.map((_, sIdx) => (
                                <div
                                  key={sIdx}
                                  onClick={() => setPostSlideIndex(sIdx)}
                                  style={{
                                    width: postSlideIndex === sIdx ? '14px' : '6px',
                                    height: '6px',
                                    borderRadius: '3px',
                                    backgroundColor: postSlideIndex === sIdx ? '#FFFFFF' : 'rgba(255,255,255,0.4)',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                  }}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Bottom Post Details & Journal */}
                  <div style={{ backgroundColor: surfaceColor, padding: '12px', marginTop: '10px', color: textColor, maxHeight: '35vh', overflowY: 'auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: subTextColor }}>
                      <span>{posts[selectedPostIndex]?.taken_at ? new Date(posts[selectedPostIndex].taken_at).toLocaleString() : ''}</span>
                      {posts[selectedPostIndex]?.like_count !== undefined && (
                        <span>❤️ {posts[selectedPostIndex].like_count} likes</span>
                      )}
                    </div>
                    {posts[selectedPostIndex]?.caption_text && (
                      <div style={{ fontSize: '12px', marginTop: '6px', lineHeight: 1.4 }}>
                        {posts[selectedPostIndex].caption_text}
                      </div>
                    )}

                    {/* Journal Note for Post */}
                    <div style={{ marginTop: '10px', borderTop: `1px solid ${borderColor}`, paddingTop: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: '#008A00' }}>📓 JOURNAL NOTE</div>
                        {editingItemId !== posts[selectedPostIndex]?.id && (
                          <button
                            onClick={() => {
                              setEditingItemId(posts[selectedPostIndex].id);
                              setJournalDraft(posts[selectedPostIndex].journal_note || '');
                            }}
                            style={{ background: 'none', border: 'none', color: accent, fontSize: '11px', cursor: 'pointer' }}
                          >
                            {posts[selectedPostIndex]?.journal_note ? 'edit note' : '+ add note'}
                          </button>
                        )}
                      </div>

                      {editingItemId === posts[selectedPostIndex]?.id ? (
                        <div>
                          <textarea
                            value={journalDraft}
                            onChange={(e) => setJournalDraft(e.target.value)}
                            rows={3}
                            style={{ width: '100%', backgroundColor: cardColor, color: textColor, border: `1px solid ${accent}`, padding: '6px', fontSize: '11px', outline: 'none', boxSizing: 'border-box' }}
                          />
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', marginTop: '6px' }}>
                            <button onClick={() => setEditingItemId(null)} style={{ background: 'none', border: `1px solid ${borderColor}`, color: textColor, padding: '4px 10px', fontSize: '10px' }}>cancel</button>
                            <button onClick={() => handleSaveInlineJournal(posts[selectedPostIndex].id, true)} style={{ backgroundColor: accent, color: '#FFF', border: 'none', padding: '4px 12px', fontSize: '10px', fontWeight: 'bold' }}>save</button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ fontSize: '11px', opacity: 0.9 }}>{posts[selectedPostIndex]?.journal_note || 'No journal note attached yet.'}</div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════
              PIVOT 5: JOURNAL & NOTEBOOK HUB
             ══════════════════════════════════════════════════════ */}
          {activePivot === 'journal' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
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
                  <span>+ NEW ENTRY</span>
                </button>
              </div>

              {journaledItems.length === 0 ? (
                <div style={{ backgroundColor: surfaceColor, padding: '24px', textAlign: 'center' }}>
                  <BookOpen size={36} color="#008A00" style={{ margin: '0 auto 10px auto' }} />
                  <div style={{ fontSize: '14px', fontWeight: 300 }}>no journal entries written yet</div>
                  <div style={{ fontSize: '11px', color: subTextColor, marginTop: '4px' }}>
                    Tap "+ NEW ENTRY" above to select a memory or post and write your first journal entry.
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
                          {item.media_type === 2 ? (
                            <video src={mediaUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted />
                          ) : (
                            <img src={mediaUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Thumbnail" />
                          )}
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

          {/* ══════════════════════════════════════════════════════
              PIVOT 6: MUSIC & SOUNDTRACKS HUB
             ══════════════════════════════════════════════════════ */}
          {activePivot === 'music' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ fontSize: '11px', color: subTextColor, fontWeight: 600 }}>
                {musicStories.length} STORY SOUNDTRACKS IN VAULT
              </div>

              {musicStories.length === 0 ? (
                <div style={{ backgroundColor: surfaceColor, padding: '24px', textAlign: 'center' }}>
                  <Music size={36} color="#A20025" style={{ margin: '0 auto 10px auto' }} />
                  <div style={{ fontSize: '14px', fontWeight: 300 }}>no soundtrack metadata found</div>
                  <div style={{ fontSize: '11px', color: subTextColor, marginTop: '4px' }}>
                    Stories with attached Spotify/Instagram music will appear here with instant streaming links.
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {musicStories.map(story => {
                    const title = story.music?.track_title || story.music_title;
                    const artist = story.music?.artist_name || story.music_artist || 'Artist';
                    return (
                      <div
                        key={story.id}
                        style={{
                          backgroundColor: surfaceColor,
                          borderLeft: `4px solid #A20025`,
                          padding: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '10px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                          <div style={{ width: '44px', height: '44px', backgroundColor: '#A20025', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF', flexShrink: 0 }}>
                            <Music size={20} />
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</div>
                            <div style={{ fontSize: '11px', color: subTextColor }}>{artist}</div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                          <a
                            href={`https://open.spotify.com/search/${encodeURIComponent(title + ' ' + artist)}`}
                            target="_blank"
                            rel="noreferrer"
                            style={{ backgroundColor: '#1DB954', color: '#000', padding: '4px 8px', fontSize: '9px', fontWeight: 'bold', textDecoration: 'none' }}
                          >
                            Spotify
                          </a>
                          <a
                            href={`https://music.apple.com/us/search?term=${encodeURIComponent(title + ' ' + artist)}`}
                            target="_blank"
                            rel="noreferrer"
                            style={{ backgroundColor: '#FC3C44', color: '#FFF', padding: '4px 8px', fontSize: '9px', fontWeight: 'bold', textDecoration: 'none' }}
                          >
                            Apple
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════
              PIVOT 7: SETTINGS & STORAGE SENSE
             ══════════════════════════════════════════════════════ */}
          {activePivot === 'settings' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
              
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

              {/* Instagram Account Card */}
              {igSession && (
                <div>
                  <div style={{ fontSize: '16px', fontWeight: 300, marginBottom: '10px', color: accent }}>
                    instagram archive
                  </div>
                  <div style={{ backgroundColor: surfaceColor, padding: '14px', borderLeft: `4px solid ${accent}`, display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '50%', backgroundColor: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF', fontWeight: 'bold', fontSize: '14px', overflow: 'hidden' }}>
                      {igSession.profile_pic_url ? (
                        <img src={igSession.profile_pic_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="IG" />
                      ) : (
                        <UserIcon size={22} />
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '14px', fontWeight: 600 }}>@{igSession.username || 'instagram_user'}</div>
                      <div style={{ fontSize: '11px', color: '#008A00', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                        <CheckCircle2 size={12} />
                        <span>Connected & Archiving Active</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Personalization Section */}
              <div>
                <div style={{ fontSize: '16px', fontWeight: 300, marginBottom: '10px', color: accent }}>
                  personalization
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <MetroToggle
                    label={`theme: ${themeMode}`}
                    checked={isDark}
                    onChange={(checked) => {
                      const newMode = checked ? 'dark' : 'light';
                      setThemeMode(newMode);
                      localStorage.setItem('metro_theme', newMode);
                    }}
                  />

                  <MetroToggle
                    label="3D live tile animations"
                    checked={enableLiveFlip}
                    onChange={(checked) => {
                      setEnableLiveFlip(checked);
                      localStorage.setItem('metro_live_flip', String(checked));
                    }}
                  />

                  <MetroToggle
                    label="system sound effects"
                    checked={soundEnabled}
                    onChange={(checked) => {
                      setSoundEnabled(checked);
                      localStorage.setItem('metro_sound', String(checked));
                    }}
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
                      <span>{journaledItems.length} Notes</span>
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