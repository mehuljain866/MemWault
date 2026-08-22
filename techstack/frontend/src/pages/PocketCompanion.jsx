import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Image as ImageIcon, Film, BookOpen, Search, 
  Wifi, Battery, Plus, ArrowLeft, RefreshCw,
  Settings as SettingsIcon, X, Camera, Music, 
  MapPin, Check, ExternalLink, Calendar, Edit3, 
  Save, Trash2, HardDrive, Smartphone, Sparkles, Volume2, VolumeX, ShieldCheck
} from 'lucide-react';
import { 
  getOfflineMemories, getOfflinePosts, getStorageStats, 
  syncPocketWithLaptop, getPocketSyncMeta, getOnThisDayMemory 
} from '../services/pocketSync';
import { 
  addPendingMobileUpload, getPendingMobileUploads, 
  saveMemoriesOffline, openMobileDB 
} from '../services/memwaultMobileDB';
import { updateStory, setToken, isAuthenticated } from '../services/api';
import { playWin98Click } from '../services/win98Audio';

// ── 20 Authentic Windows Phone 8.1 Lumia Accent Colors ───────────────────────
const LUMIA_ACCENTS = [
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

export default function PocketCompanion() {
  // ── Theme & Customization States ──────────────────────────────────────────
  const [accent, setAccent] = useState(() => localStorage.getItem('metro_accent') || '#0050EF');
  const [themeMode, setThemeMode] = useState(() => localStorage.getItem('metro_theme') || 'dark');
  const [enableLiveFlip, setEnableLiveFlip] = useState(() => localStorage.getItem('metro_live_flip') !== 'false');
  const [soundEnabled, setSoundEnabled] = useState(() => localStorage.getItem('metro_sound') !== 'false');
  const [autoSyncOnOpen, setAutoSyncOnOpen] = useState(() => localStorage.getItem('metro_auto_sync') !== 'false');
  const [serverHost, setServerHost] = useState(() => localStorage.getItem('metro_server_host') || window.location.hostname || '192.168.29.50');

  // ── Navigation & Content States ───────────────────────────────────────────
  const [activePivot, setActivePivot] = useState('start'); // 'start' | 'memories' | 'feed' | 'journal' | 'music' | 'settings'
  const [stories, setStories] = useState([]);
  const [posts, setPosts] = useState([]);
  const [pendingUploads, setPendingUploads] = useState([]);
  const [stats, setStats] = useState({ memoryCount: 0, postCount: 0, pendingCount: 0, storageMb: '0.00' });
  const [selectedStory, setSelectedStory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all' | 'photos' | 'videos' | 'journaled' | 'music'
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // ── Journal Editing State ─────────────────────────────────────────────────
  const [editingStoryId, setEditingStoryId] = useState(null);
  const [journalDraft, setJournalDraft] = useState('');
  const [isSavingJournal, setIsSavingJournal] = useState(false);

  // ── Status Bar States ─────────────────────────────────────────────────────
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  const [batteryLevel, setBatteryLevel] = useState(null);
  const [isCharging, setIsCharging] = useState(false);

  // ── 3D Live Tile Flip States ──────────────────────────────────────────────
  const [flipToday, setFlipToday] = useState(false);
  const [flipMemories, setFlipMemories] = useState(false);
  const [flipFeed, setFlipFeed] = useState(false);
  const [flipJournal, setFlipJournal] = useState(false);
  const [flipMusic, setFlipMusic] = useState(false);

  // ── Sync Progress States ──────────────────────────────────────────────────
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState({ step: 'Ready', percent: 0, status: 'idle' });
  const [syncLogs, setSyncLogs] = useState([]);
  const [lastSyncTime, setLastSyncTime] = useState(() => localStorage.getItem('metro_last_sync') || null);

  const fileInputRef = useRef(null);

  const isDark = themeMode === 'dark';
  const bgColor = isDark ? '#000000' : '#FFFFFF';
  const surfaceColor = isDark ? '#1F1F1F' : '#F2F2F2';
  const cardColor = isDark ? '#141414' : '#E8E8E8';
  const textColor = isDark ? '#FFFFFF' : '#000000';
  const subTextColor = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)';
  const borderColor = isDark ? '#333333' : '#D0D0D0';

  const triggerSound = () => {
    if (soundEnabled) {
      try { playWin98Click(); } catch (e) {}
    }
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // ── 1. Pairing & Initial Data Loading ─────────────────────────────────────
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const tokenParam = searchParams.get('token') || searchParams.get('pair') || searchParams.get('auth');
    if (tokenParam) {
      setToken(tokenParam);
      localStorage.setItem('sv_token', tokenParam);
      window.history.replaceState({}, document.title, window.location.pathname);
      showToast('✓ Device Paired with Laptop Vault!');
    }

    async function loadData() {
      const cachedStories = await getOfflineMemories();
      const cachedPosts = await getOfflinePosts();
      const st = await getStorageStats();
      const pending = await getPendingMobileUploads();
      
      setStories(cachedStories || []);
      setPosts(cachedPosts || []);
      setStats(st);
      setPendingUploads(pending || []);

      if (isAuthenticated()) {
        if ((!cachedStories || cachedStories.length === 0) || autoSyncOnOpen) {
          handleRunSync();
        }
      }
    }
    loadData();
  }, []);

  // ── 2. Clock & Battery Status ─────────────────────────────────────────────
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }, 10000);

    if (navigator.getBattery) {
      navigator.getBattery().then(bat => {
        setBatteryLevel(Math.round(bat.level * 100));
        setIsCharging(bat.charging);
        bat.addEventListener('levelchange', () => setBatteryLevel(Math.round(bat.level * 100)));
        bat.addEventListener('chargingchange', () => setIsCharging(bat.charging));
      }).catch(() => {
        setBatteryLevel(null);
      });
    }

    return () => clearInterval(timer);
  }, []);

  // ── 3. Staggered 3D Live Tile Flips ───────────────────────────────────────
  useEffect(() => {
    if (!enableLiveFlip) return;
    const t1 = setInterval(() => setFlipToday(f => !f), 5500);
    const t2 = setInterval(() => setFlipMemories(f => !f), 7000);
    const t3 = setInterval(() => setFlipFeed(f => !f), 8500);
    const t4 = setInterval(() => setFlipJournal(f => !f), 10000);
    const t5 = setInterval(() => setFlipMusic(f => !f), 11500);
    return () => {
      clearInterval(t1);
      clearInterval(t2);
      clearInterval(t3);
      clearInterval(t4);
      clearInterval(t5);
    };
  }, [enableLiveFlip]);

  // ── 4. ActiveSync Execution ───────────────────────────────────────────────
  const handleRunSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    triggerSound();
    const timeStr = new Date().toLocaleTimeString();
    setSyncLogs(prev => [`[${timeStr}] Connecting to Laptop ActiveSync Vault...`, ...prev]);

    try {
      const res = await syncPocketWithLaptop((progress) => {
        setSyncProgress(progress);
        if (progress.step) {
          setSyncLogs(prev => [`[${new Date().toLocaleTimeString()}] ${progress.step}`, ...prev.slice(0, 20)]);
        }
      });

      if (res && res.stories) setStories(res.stories);
      if (res && res.posts) setPosts(res.posts);
      if (res && res.stats) setStats(res.stats);
      const pending = await getPendingMobileUploads();
      setPendingUploads(pending);

      const syncStamp = new Date().toLocaleString();
      setLastSyncTime(syncStamp);
      localStorage.setItem('metro_last_sync', syncStamp);
      showToast(`✓ Synced ${res?.stories?.length || 0} Memories & ${res?.posts?.length || 0} Posts`);
    } catch (err) {
      setSyncLogs(prev => [`[${new Date().toLocaleTimeString()}] Error: ${err.message}`, ...prev]);
      showToast('⚠️ Sync Failed (Using Offline Storage)');
    } finally {
      setIsSyncing(false);
    }
  };

  // ── 5. Add Camera Roll Photo to Vault ─────────────────────────────────────
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
      showToast(`✓ Photo "${file.name}" saved to Lumia Vault!`);
      triggerSound();
    };
    reader.readAsDataURL(file);
  };

  // ── 6. Save Journal Note ──────────────────────────────────────────────────
  const handleSaveJournalNote = async (storyId) => {
    if (!storyId) return;
    setIsSavingJournal(true);
    triggerSound();
    try {
      if (isAuthenticated()) {
        await updateStory(storyId, { journal_note: journalDraft });
      }
      
      const updated = stories.map(s => s.id === storyId ? { ...s, journal_note: journalDraft } : s);
      setStories(updated);
      await saveMemoriesOffline(updated);
      
      if (selectedStory && selectedStory.id === storyId) {
        setSelectedStory({ ...selectedStory, journal_note: journalDraft });
      }
      setEditingStoryId(null);
      showToast('✓ Journal Note Saved!');
    } catch (err) {
      showToast('Error saving note: ' + err.message);
    } finally {
      setIsSavingJournal(false);
    }
  };

  // ── 7. Wipe Offline Storage ───────────────────────────────────────────────
  const handleClearCache = async () => {
    try {
      const db = await openMobileDB();
      const tx = db.transaction(['memories', 'posts'], 'readwrite');
      tx.objectStore('memories').clear();
      tx.objectStore('posts').clear();
      await new Promise(r => { tx.oncomplete = r; });
      setStories([]);
      setPosts([]);
      const st = await getStorageStats();
      setStats(st);
      setConfirmClearOpen(false);
      showToast('✓ Offline Storage Cleared');
      triggerSound();
    } catch (err) {
      showToast('Error clearing storage: ' + err.message);
    }
  };

  const todayMemory = getOnThisDayMemory(stories);

  // ── 8. Filtered Items ─────────────────────────────────────────────────────
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

  const journaledStories = stories.filter(s => s.journal_note && s.journal_note.trim().length > 0);
  const musicStories = stories.filter(s => s.music?.track_title || s.music_title);

  // ── 9. Pivot Tabs ─────────────────────────────────────────────────────────
  const pivotList = [
    { id: 'start', label: 'start' },
    { id: 'memories', label: 'memories' },
    { id: 'feed', label: 'feed' },
    { id: 'journal', label: 'journal' },
    { id: 'music', label: 'music' },
    { id: 'settings', label: 'settings' },
  ];

  // ── Authentic Lumia Metro Toggle Switch Component ─────────────────────────
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
      {/* Hidden File Input for Lumia Camera Master Pick */}
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
              This will remove all cached stories and posts from this phone. You can re-download everything anytime by syncing with your laptop vault.
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

      {/* ── Windows Phone 8.1 Status Bar (Top) ────────────────── */}
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
          <span style={{ letterSpacing: '0.06em', fontSize: '10px' }}>MEMWAULT LTE</span>
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
          MEMWAULT 8.1
        </div>

        {/* Horizontal Pivot Headers with Native WP8.1 Typography */}
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
              onClick={() => { triggerSound(); setActivePivot(tab.id); setSelectedStory(null); }}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                color: textColor,
                fontFamily: '"Segoe UI Light", "Segoe UI", sans-serif',
                fontSize: '36px',
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
              
              {/* Wide 4x2 Flashback Tile (3D Flip) */}
              <motion.div
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  triggerSound();
                  if (todayMemory) {
                    setSelectedStory(todayMemory);
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
                  {/* Front Face: Photo + Today Flashback */}
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    backfaceVisibility: 'hidden',
                    display: 'flex',
                    backgroundColor: accent,
                    color: '#FFFFFF',
                  }}>
                    {todayMemory && (
                      <div style={{ width: '42%', height: '100%', backgroundColor: '#000' }}>
                        {todayMemory.media_type === 2 ? (
                          <video src={todayMemory.media_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted />
                        ) : (
                          <img src={todayMemory.media_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Flashback" />
                        )}
                      </div>
                    )}
                    <div style={{ flex: 1, padding: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', opacity: 0.9 }}>
                          ON THIS DAY FLASHBACK
                        </div>
                        <div style={{ fontSize: '15px', fontWeight: 300, marginTop: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {todayMemory?.location_name || (todayMemory?.taken_at ? new Date(todayMemory.taken_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'MemWault Vault')}
                        </div>
                      </div>
                      <div style={{ fontSize: '11px', opacity: 0.95, lineHeight: 1.3 }}>
                        {todayMemory?.caption_text || 'Relive your archived memories.'}
                      </div>
                    </div>
                  </div>

                  {/* Back Face: Flip details */}
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
                      <div style={{ fontSize: '10px', color: accent, fontWeight: 700, letterSpacing: '0.05em' }}>MEMORY HIGHLIGHT</div>
                      <div style={{ fontSize: '13px', marginTop: '4px', lineHeight: 1.3, fontWeight: 300 }}>
                        {todayMemory?.journal_note || todayMemory?.caption_text || 'Tap to inspect memory details & soundtrack.'}
                      </div>
                    </div>
                    <div style={{ fontSize: '11px', opacity: 0.7 }}>
                      {stories.length} memories stored in vault
                    </div>
                  </div>
                </motion.div>

                <div style={{ position: 'absolute', bottom: '6px', left: '8px', fontSize: '10px', fontWeight: 600, zIndex: 10, color: '#FFFFFF' }}>
                  photos
                </div>
              </motion.div>

              {/* 2x2 Square Live Tiles Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '12px',
              }}>
                {/* Tile 2: Memories Medium Tile (3D Flip) */}
                <motion.div
                  whileTap={{ scale: 0.96 }}
                  onClick={() => { triggerSound(); setActivePivot('memories'); }}
                  style={{
                    aspectRatio: '1/1',
                    backgroundColor: accent,
                    position: 'relative',
                    cursor: 'pointer',
                    perspective: '1000px',
                    overflow: 'hidden',
                  }}
                >
                  <motion.div
                    animate={{ rotateY: (enableLiveFlip && flipMemories) ? 180 : 0 }}
                    transition={{ duration: 0.65, ease: [0.4, 0.0, 0.2, 1] }}
                    style={{
                      width: '100%',
                      height: '100%',
                      transformStyle: 'preserve-3d',
                      position: 'relative',
                    }}
                  >
                    {/* Front */}
                    <div style={{
                      position: 'absolute',
                      inset: 0,
                      backfaceVisibility: 'hidden',
                      padding: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      backgroundColor: accent,
                      color: '#FFFFFF',
                    }}>
                      <ImageIcon size={28} />
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: 400 }}>memories</div>
                        <div style={{ fontSize: '28px', fontWeight: 200, lineHeight: 1 }}>{stories.length}</div>
                      </div>
                    </div>

                    {/* Back */}
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
                      borderLeft: `4px solid ${accent}`,
                    }}>
                      <div style={{ fontSize: '11px', color: accent, fontWeight: 700 }}>stories hub</div>
                      <div style={{ fontSize: '12px' }}>{stats.storageMb} MB offline vault</div>
                      <div style={{ fontSize: '10px', opacity: 0.7 }}>tap to explore</div>
                    </div>
                  </motion.div>
                </motion.div>

                {/* Tile 3: Feed Posts Medium Tile */}
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
                    {/* Front */}
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

                    {/* Back */}
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
                      <div style={{ fontSize: '11px', color: '#D80073', fontWeight: 700 }}>carousels</div>
                      <div style={{ fontSize: '12px' }}>{posts.length} multi-slide posts</div>
                      <div style={{ fontSize: '10px', opacity: 0.7 }}>tap to view feed</div>
                    </div>
                  </motion.div>
                </motion.div>

                {/* Tile 4: Journal Medium Tile */}
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
                        <div style={{ fontSize: '28px', fontWeight: 200, lineHeight: 1 }}>{journaledStories.length}</div>
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
                      <div style={{ fontSize: '11px', color: '#008A00', fontWeight: 700 }}>notes</div>
                      <div style={{ fontSize: '11px', lineHeight: 1.3 }}>{journaledStories[0]?.journal_note?.slice(0, 45) || 'write notes'}...</div>
                      <div style={{ fontSize: '10px', opacity: 0.7 }}>tap to open</div>
                    </div>
                  </motion.div>
                </motion.div>

                {/* Tile 5: Music Soundtracks Tile */}
                <motion.div
                  whileTap={{ scale: 0.96 }}
                  onClick={() => { triggerSound(); setActivePivot('music'); }}
                  style={{
                    aspectRatio: '1/1',
                    backgroundColor: '#A20025',
                    color: '#FFFFFF',
                    position: 'relative',
                    cursor: 'pointer',
                    perspective: '1000px',
                    overflow: 'hidden',
                  }}
                >
                  <motion.div
                    animate={{ rotateY: (enableLiveFlip && flipMusic) ? 180 : 0 }}
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
                      backgroundColor: '#A20025',
                      color: '#FFFFFF',
                    }}>
                      <Music size={28} />
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: 400 }}>soundtracks</div>
                        <div style={{ fontSize: '28px', fontWeight: 200, lineHeight: 1 }}>{musicStories.length}</div>
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
                      borderLeft: `4px solid #A20025`,
                    }}>
                      <div style={{ fontSize: '11px', color: '#A20025', fontWeight: 700 }}>mixradio</div>
                      <div style={{ fontSize: '11px', lineHeight: 1.3 }}>{musicStories[0]?.music?.track_title || 'archived tracks'}</div>
                      <div style={{ fontSize: '10px', opacity: 0.7 }}>tap to listen</div>
                    </div>
                  </motion.div>
                </motion.div>
              </div>

              {/* Tile 6: Lumia Camera Tile (Wide 4x1) */}
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
                    <div style={{ fontSize: '14px', fontWeight: 400 }}>lumia camera</div>
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
                  {editingStoryId !== selectedStory.id && (
                    <button
                      onClick={() => {
                        setEditingStoryId(selectedStory.id);
                        setJournalDraft(selectedStory.journal_note || '');
                      }}
                      style={{ background: 'none', border: 'none', color: accent, fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <Edit3 size={12} />
                      <span>{selectedStory.journal_note ? 'edit' : '+ add note'}</span>
                    </button>
                  )}
                </div>

                {editingStoryId === selectedStory.id ? (
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
                        onClick={() => setEditingStoryId(null)}
                        style={{ background: 'none', border: `1px solid ${borderColor}`, color: textColor, padding: '4px 12px', fontSize: '11px', cursor: 'pointer' }}
                      >
                        cancel
                      </button>
                      <button
                        onClick={() => handleSaveJournalNote(selectedStory.id)}
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
              PIVOT 3: FEED POSTS & CAROUSELS HUB
             ══════════════════════════════════════════════════════ */}
          {activePivot === 'feed' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ fontSize: '11px', color: subTextColor, fontWeight: 600 }}>
                {posts.length} {posts.length === 1 ? 'POST' : 'POSTS'} IN FEED VAULT
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
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {posts.map(post => (
                    <div key={post.id} style={{ backgroundColor: surfaceColor, borderLeft: `4px solid #D80073`, padding: '12px' }}>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        {post.media_url && (
                          <img src={post.media_url} style={{ width: '80px', height: '80px', objectFit: 'cover' }} alt="Post thumbnail" />
                        )}
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '12px', fontWeight: 600 }}>{post.caption_text?.slice(0, 60) || 'Instagram Post'}</div>
                          <div style={{ fontSize: '10px', color: subTextColor, marginTop: '4px' }}>
                            {post.taken_at ? new Date(post.taken_at).toLocaleDateString() : ''}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════
              PIVOT 4: JOURNAL & NOTEBOOK HUB
             ══════════════════════════════════════════════════════ */}
          {activePivot === 'journal' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '11px', color: subTextColor, fontWeight: 600 }}>
                  {journaledStories.length} JOURNAL ENTRIES
                </div>
              </div>

              {journaledStories.length === 0 ? (
                <div style={{ backgroundColor: surfaceColor, padding: '24px', textAlign: 'center' }}>
                  <BookOpen size={36} color="#008A00" style={{ margin: '0 auto 10px auto' }} />
                  <div style={{ fontSize: '14px', fontWeight: 300 }}>no journal entries written</div>
                  <div style={{ fontSize: '11px', color: subTextColor, marginTop: '4px' }}>
                    Open any memory from the "memories" tab and tap "+ add note" to create a journal entry.
                  </div>
                  <button
                    onClick={() => setActivePivot('memories')}
                    style={{ marginTop: '12px', backgroundColor: '#008A00', border: 'none', color: '#FFF', padding: '6px 16px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
                  >
                    browse memories
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {journaledStories.map(story => (
                    <motion.div
                      key={story.id}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => { triggerSound(); setSelectedStory(story); setActivePivot('memories'); }}
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
                        {story.media_type === 2 ? (
                          <video src={story.media_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted />
                        ) : (
                          <img src={story.media_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Thumbnail" />
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: '#008A00' }}>
                          {story.location_name || (story.taken_at ? new Date(story.taken_at).toLocaleDateString() : 'Journal Entry')}
                        </div>
                        <div style={{ fontSize: '12px', marginTop: '2px', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                          {story.journal_note}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════
              PIVOT 5: MUSIC & SOUNDTRACKS (NOKIA MIXRADIO HUB)
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
              PIVOT 6: SETTINGS & STORAGE SENSE
             ══════════════════════════════════════════════════════ */}
          {activePivot === 'settings' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
              
              {/* Personalization Section */}
              <div>
                <div style={{ fontSize: '16px', fontWeight: 300, marginBottom: '10px', color: accent }}>
                  personalization
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {/* Theme Mode Toggle */}
                  <MetroToggle
                    label={`theme: ${themeMode}`}
                    checked={isDark}
                    onChange={(checked) => {
                      const newMode = checked ? 'dark' : 'light';
                      setThemeMode(newMode);
                      localStorage.setItem('metro_theme', newMode);
                    }}
                  />

                  {/* 3D Live Tile Toggle */}
                  <MetroToggle
                    label="3D live tile animations"
                    checked={enableLiveFlip}
                    onChange={(checked) => {
                      setEnableLiveFlip(checked);
                      localStorage.setItem('metro_live_flip', String(checked));
                    }}
                  />

                  {/* System Sound Toggle */}
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

              {/* Accent Colors Grid (20 Authentic Lumia Colors) */}
              <div>
                <div style={{ fontSize: '16px', fontWeight: 300, marginBottom: '10px', color: accent }}>
                  accent color
                </div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(5, 1fr)',
                  gap: '8px',
                }}>
                  {LUMIA_ACCENTS.map(c => {
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
                      <span>{journaledStories.length} Notes</span>
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
                <div style={{ fontSize: '13px', fontWeight: 600 }}>Nokia Lumia 1020 PureView</div>
                <div style={{ fontSize: '11px', color: subTextColor, marginTop: '2px' }}>
                  Windows Phone 8.1 Update 2 (Lumia Denim)
                </div>
                <div style={{ fontSize: '10px', color: subTextColor, marginTop: '2px' }}>
                  Build 8.10.14234.375 • MemWault Companion Engine v2.4
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}