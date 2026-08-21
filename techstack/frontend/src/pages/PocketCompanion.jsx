import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Image as ImageIcon, Film, BookOpen, Search, 
  Wifi, Battery, Plus, ArrowLeft, RefreshCw,
  Settings as SettingsIcon, X, Camera
} from 'lucide-react';
import { 
  getOfflineMemories, getOfflinePosts, getStorageStats, 
  syncPocketWithLaptop, getPocketSyncMeta 
} from '../services/pocketSync';
import { 
  addPendingMobileUpload, getPendingMobileUploads, 
  openMobileDB 
} from '../services/memwaultMobileDB';
import { playWin98Click } from '../services/win98Audio';

const LUMIA_ACCENTS = [
  { name: 'Cobalt', hex: '#0050EF' },
  { name: 'Cyan', hex: '#1BA1E2' },
  { name: 'Emerald', hex: '#008A00' },
  { name: 'Mango', hex: '#F09609' },
  { name: 'Crimson', hex: '#A20025' },
  { name: 'Magenta', hex: '#D80073' },
  { name: 'Violet', hex: '#AA00FF' },
  { name: 'Steel', hex: '#647687' }
];

export default function PocketCompanion() {
  const [accent, setAccent] = useState(() => localStorage.getItem('metro_accent') || '#0050EF');
  const [themeMode, setThemeMode] = useState(() => localStorage.getItem('metro_theme') || 'dark');
  const [enableLiveFlip, setEnableLiveFlip] = useState(() => localStorage.getItem('metro_live_flip') !== 'false');
  const [autoSyncOnOpen, setAutoSyncOnOpen] = useState(() => localStorage.getItem('metro_auto_sync') === 'true');

  const [activePivot, setActivePivot] = useState('start');
  const [settingsTab, setSettingsTab] = useState('personalization');
  const [stories, setStories] = useState([]);
  const [posts, setPosts] = useState([]);
  const [pendingUploads, setPendingUploads] = useState([]);
  const [stats, setStats] = useState({ memoryCount: 0, postCount: 0, pendingCount: 0, storageMb: '0.00' });
  const [selectedStory, setSelectedStory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  const [batteryLevel, setBatteryLevel] = useState(85);

  const [flipToday, setFlipToday] = useState(false);
  const [flipMemories, setFlipMemories] = useState(false);
  const [flipFeed, setFlipFeed] = useState(false);

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState({ step: 'Ready', percent: 0, status: 'idle' });
  const [lastSyncTime, setLastSyncTime] = useState(() => localStorage.getItem('metro_last_sync') || null);

  const fileInputRef = useRef(null);

  const isDark = themeMode === 'dark';
  const bgColor = isDark ? '#000000' : '#FFFFFF';
  const surfaceColor = isDark ? '#1F1F1F' : '#F2F2F2';
  const textColor = isDark ? '#FFFFFF' : '#000000';
  const subTextColor = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)';
  const borderColor = isDark ? '#333333' : '#E0E0E0';

  const triggerSound = () => playWin98Click();
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  useEffect(() => {
    async function loadData() {
      const cachedStories = await getOfflineMemories();
      const cachedPosts = await getOfflinePosts();
      const st = await getStorageStats();
      const pending = await getPendingMobileUploads();
      setStories(cachedStories);
      setPosts(cachedPosts);
      setStats(st);
      setPendingUploads(pending);
      if (cachedStories.length === 0 && autoSyncOnOpen) handleRunSync();
    }
    loadData();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })), 15000);
    if (navigator.getBattery) {
      navigator.getBattery().then(bat => {
        setBatteryLevel(Math.round(bat.level * 100));
        bat.addEventListener('levelchange', () => setBatteryLevel(Math.round(bat.level * 100)));
      }).catch(() => {});
    }
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!enableLiveFlip) return;
    const t1 = setInterval(() => setFlipToday(f => !f), 6000);
    const t2 = setInterval(() => setFlipMemories(f => !f), 7500);
    const t3 = setInterval(() => setFlipFeed(f => !f), 9000);
    return () => { clearInterval(t1); clearInterval(t2); clearInterval(t3); };
  }, [enableLiveFlip]);

  const handleRunSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    triggerSound();
    try {
      const res = await syncPocketWithLaptop((progress) => setSyncProgress(progress));
      if (res.stories) setStories(res.stories);
      if (res.posts) setPosts(res.posts);
      if (res.stats) setStats(res.stats);
      const pending = await getPendingMobileUploads();
      setPendingUploads(pending);

      const syncStamp = new Date().toLocaleString();
      setLastSyncTime(syncStamp);
      localStorage.setItem('metro_last_sync', syncStamp);
      showToast('✓ ActiveSync Completed Successfully');
    } catch (err) {
      showToast('⚠️ Sync Failed (Using Offline Cache)');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleFilePicked = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      await addPendingMobileUpload({
        name: file.name, size: file.size, type: file.type,
        dataUrl: event.target.result, storyId: null, fileBlob: file,
      });
      const st = await getStorageStats();
      const pending = await getPendingMobileUploads();
      setStats(st);
      setPendingUploads(pending);
      showToast(`✓ Photo saved to Lumia Vault!`);
      triggerSound();
    };
    reader.readAsDataURL(file);
  };

  const handleClearCache = async () => {
    try {
      const db = await openMobileDB();
      const tx = db.transaction(['memories', 'posts'], 'readwrite');
      tx.objectStore('memories').clear();
      tx.objectStore('posts').clear();
      setStories([]); setPosts([]);
      const st = await getStorageStats();
      setStats(st);
      setConfirmClearOpen(false);
      showToast('✓ Offline Storage Cleared');
    } catch (err) {
      showToast('Error clearing cache: ' + err.message);
    }
  };

  const filteredStories = stories.filter(s => {
    if (searchQuery && !(s.location_name?.toLowerCase().includes(searchQuery.toLowerCase()) || s.caption_text?.toLowerCase().includes(searchQuery.toLowerCase()))) return false;
    if (filterType === 'photos') return s.media_type === 1;
    if (filterType === 'videos') return s.media_type === 2;
    return true;
  });

  return (
    <div style={{
      width: '100vw', minHeight: '100vh', margin: '0 auto',
      backgroundColor: bgColor, color: textColor,
      fontFamily: '"Segoe UI", "Segoe UI Light", sans-serif',
      display: 'flex', flexDirection: 'column', position: 'relative',
      userSelect: 'none', overflowX: 'hidden'
    }}>
      <input type="file" ref={fileInputRef} onChange={handleFilePicked} accept="image/*,video/*" style={{ display: 'none' }} />

      <AnimatePresence>
        {toastMessage && (
          <motion.div initial={{ y: -40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -40, opacity: 0 }}
            style={{ position: 'fixed', top: 0, left: 0, right: 0, backgroundColor: accent, color: '#FFFFFF', padding: '8px 16px', fontSize: '12px', fontWeight: 600, zIndex: 99999, display: 'flex', justifyContent: 'space-between' }}>
            <span>{toastMessage}</span>
            <X size={14} style={{ cursor: 'pointer' }} onClick={() => setToastMessage(null)} />
          </motion.div>
        )}
      </AnimatePresence>

      {confirmClearOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 100000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ backgroundColor: surfaceColor, borderLeft: `4px solid ${accent}`, padding: '20px', width: '100%' }}>
            <div style={{ fontSize: '18px', marginBottom: '8px' }}>Clear Offline Storage?</div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button onClick={() => setConfirmClearOpen(false)} style={{ background: 'transparent', border: `2px solid ${borderColor}`, color: textColor, padding: '6px 16px', cursor: 'pointer' }}>cancel</button>
              <button onClick={handleClearCache} style={{ backgroundColor: '#A20025', border: 'none', color: '#FFFFFF', padding: '6px 16px', cursor: 'pointer' }}>clear now</button>
            </div>
          </div>
        </div>
      )}

      {/* Status Bar */}
      <div style={{ height: '24px', padding: '0 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: subTextColor, fontWeight: 600 }}>
        <div style={{ display: 'flex', gap: '6px' }}><Wifi size={12} color={isSyncing ? accent : textColor} /><span>MEMWAULT LTE</span></div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <div style={{ display: 'flex', gap: '4px' }}><span>{batteryLevel}%</span><Battery size={13} color={batteryLevel < 20 ? '#A20025' : textColor} /></div>
          <span>{currentTime}</span>
        </div>
      </div>

      {/* Pivot Headers */}
      <div style={{ padding: '8px 16px 2px 16px', backgroundColor: bgColor }}>
        <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: accent, marginBottom: '2px' }}>MEMWAULT 8.1</div>
        <div style={{ display: 'flex', gap: '22px', overflowX: 'auto', paddingBottom: '4px', scrollbarWidth: 'none' }}>
          {['start', 'memories', 'feed', 'settings'].map(tab => (
            <button key={tab} onClick={() => { triggerSound(); setActivePivot(tab); setSelectedStory(null); }}
              style={{ background: 'none', border: 'none', padding: 0, color: textColor, fontFamily: '"Segoe UI Light", sans-serif', fontSize: '38px', fontWeight: 200, cursor: 'pointer', opacity: activePivot === tab ? 1 : 0.3 }}>
              {tab}
            </button>
          ))}
        </div>
      </div>

      {isSyncing && <div style={{ height: '4px', backgroundColor: surfaceColor }}><motion.div style={{ height: '100%', backgroundColor: accent, width: `${syncProgress.percent || 30}%` }} transition={{ duration: 0.3 }} /></div>}

      <div style={{ flex: 1, padding: '12px 16px', overflowY: 'auto' }}>
        {/* START PIVOT */}
        {activePivot === 'start' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
              <div onClick={() => { triggerSound(); setActivePivot('memories'); }} style={{ aspectRatio: '1/1', backgroundColor: accent, padding: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', color: '#FFF' }}>
                <ImageIcon size={30} /><div><div style={{ fontSize: '12px' }}>memories</div><div style={{ fontSize: '28px', fontWeight: 200 }}>{stories.length}</div></div>
              </div>
              <div onClick={() => { triggerSound(); setActivePivot('feed'); }} style={{ aspectRatio: '1/1', backgroundColor: '#D80073', padding: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', color: '#FFF' }}>
                <Film size={30} /><div><div style={{ fontSize: '12px' }}>feed posts</div><div style={{ fontSize: '28px', fontWeight: 200 }}>{posts.length}</div></div>
              </div>
              <div onClick={() => { triggerSound(); fileInputRef.current?.click(); }} style={{ aspectRatio: '1/1', backgroundColor: '#F09609', padding: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', color: '#FFF' }}>
                <Camera size={30} /><div><div style={{ fontSize: '12px' }}>lumia camera</div><div style={{ fontSize: '10px', opacity: 0.9 }}>+ upload</div></div>
              </div>
            </div>
            
            <div onClick={() => { triggerSound(); handleRunSync(); }} style={{ backgroundColor: surfaceColor, borderLeft: `5px solid ${accent}`, padding: '12px 16px', display: 'flex', justifyContent: 'space-between' }}>
              <div><div style={{ fontSize: '14px' }}>ActiveSync</div><div style={{ fontSize: '11px', color: subTextColor }}>{lastSyncTime ? `Last synced: ${lastSyncTime}` : 'Tap to sync'}</div></div>
              <RefreshCw size={20} className={isSyncing ? 'spin-anim' : ''} color={accent} />
            </div>

            <div onClick={() => { triggerSound(); setActivePivot('settings'); }} style={{ backgroundColor: surfaceColor, borderLeft: `5px solid ${accent}`, padding: '12px 16px', display: 'flex', justifyContent: 'space-between' }}>
              <div><div style={{ fontSize: '14px' }}>Settings</div><div style={{ fontSize: '11px', color: subTextColor }}>Theme, storage, network</div></div>
              <SettingsIcon size={20} color={accent} />
            </div>
          </div>
        )}

        {/* MEMORIES PIVOT */}
        {activePivot === 'memories' && !selectedStory && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px' }}>
              {filteredStories.map(story => (
                <div key={story.id} onClick={() => { triggerSound(); setSelectedStory(story); }} style={{ aspectRatio: '9/16', backgroundColor: '#111', position: 'relative' }}>
                  {story.media_type === 2 ? <video src={story.media_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <img src={story.media_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* MEMORY INSPECTOR */}
        {activePivot === 'memories' && selectedStory && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <button onClick={() => setSelectedStory(null)} style={{ background: 'none', border: 'none', color: accent, display: 'flex', alignItems: 'center', gap: '6px' }}><ArrowLeft size={16} /> back</button>
            <div style={{ width: '100%', backgroundColor: '#000', border: `1px solid ${accent}` }}>
              {selectedStory.media_type === 2 ? <video src={selectedStory.media_url} style={{ width: '100%', maxHeight: '60vh', objectFit: 'contain' }} controls autoPlay /> : <img src={selectedStory.media_url} style={{ width: '100%', maxHeight: '60vh', objectFit: 'contain' }} />}
            </div>
            <div style={{ backgroundColor: surfaceColor, padding: '12px' }}>
              <div style={{ fontSize: '16px' }}>{selectedStory.location_name || 'Archived Memory'}</div>
            </div>
          </div>
        )}

        {/* SETTINGS PIVOT */}
        {activePivot === 'settings' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <div style={{ fontSize: '18px', marginBottom: '8px' }}>personalization</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', backgroundColor: surfaceColor }}>
                <span>Dark Theme</span>
                <input type="checkbox" checked={isDark} onChange={() => { setThemeMode(isDark ? 'light' : 'dark'); localStorage.setItem('metro_theme', isDark ? 'light' : 'dark'); }} />
              </div>
            </div>
            
            <div>
              <div style={{ fontSize: '18px', marginBottom: '8px' }}>accent color</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                {LUMIA_ACCENTS.map(c => (
                  <div key={c.hex} onClick={() => { setAccent(c.hex); localStorage.setItem('metro_accent', c.hex); }} style={{ height: '40px', backgroundColor: c.hex, border: accent === c.hex ? '2px solid #FFF' : 'none' }} />
                ))}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '18px', marginBottom: '8px' }}>storage sense</div>
              <div style={{ backgroundColor: surfaceColor, padding: '12px' }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{stats.storageMb} MB</div>
                <div style={{ fontSize: '11px', color: subTextColor }}>used by MemWault offline</div>
                <button onClick={() => setConfirmClearOpen(true)} style={{ marginTop: '12px', backgroundColor: borderColor, color: textColor, border: 'none', padding: '8px 12px' }}>Clear offline cache</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}