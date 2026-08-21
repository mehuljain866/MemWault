import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Image as ImageIcon, Film, BookOpen, Compass, 
  Calendar, Search, MapPin, Music, ChevronRight, Upload, 
  CheckCircle2, Wifi, Battery, Play, Pause, Volume2, ShieldCheck,
  ChevronLeft, Plus, ExternalLink, Menu, X, ArrowLeft, RefreshCw,
  Sliders, Folder, Share2, Trash2, Camera, Download, Heart, Eye,
  Check, HardDrive, Smartphone
} from 'lucide-react';
import { 
  getOfflineMemories, getOfflinePosts, getStorageStats, 
  syncPocketWithLaptop, getPocketSyncMeta, getOnThisDayMemory 
} from '../services/pocketSync';
import { addPendingMobileUpload, getPendingMobileUploads } from '../services/memwaultMobileDB';
import { playWin98Click } from '../services/win98Audio';

const METRO_ACCENTS = [
  { name: 'Cobalt', hex: '#0050EF' },
  { name: 'Crimson', hex: '#A20025' },
  { name: 'Emerald', hex: '#008A00' },
  { name: 'Amber', hex: '#F0A30A' },
  { name: 'Magenta', hex: '#D80073' },
  { name: 'Cyan', hex: '#1BA1E2' },
  { name: 'Mango', hex: '#F09609' },
  { name: 'Lime', hex: '#A4C400' },
  { name: 'Violet', hex: '#AA00FF' },
];

export default function PocketCompanion() {
  const [accent, setAccent] = useState(() => localStorage.getItem('metro_accent') || '#0050EF');
  const [activePivot, setActivePivot] = useState('start'); // 'start' | 'memories' | 'feed' | 'journal' | 'sync'
  const [stories, setStories] = useState([]);
  const [posts, setPosts] = useState([]);
  const [stats, setStats] = useState({ memoryCount: 0, postCount: 0, pendingCount: 0, storageMb: '0.00' });
  const [selectedStory, setSelectedStory] = useState(null);
  const [selectedPost, setSelectedPost] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all' | 'photos' | 'videos' | 'journaled'
  const [isAppBarExpanded, setIsAppBarExpanded] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

  // Live Tile 3D Flip Timers
  const [flipToday, setFlipToday] = useState(false);
  const [flipMemories, setFlipMemories] = useState(false);
  const [flipFeed, setFlipFeed] = useState(false);

  // Sync Progress State
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState({ step: 'Ready', percent: 0, status: 'idle' });
  const [syncLogs, setSyncLogs] = useState([]);

  // File Upload Ref
  const fileInputRef = useRef(null);

  // Load Initial Offline Cache
  useEffect(() => {
    async function loadData() {
      const cachedStories = await getOfflineMemories();
      const cachedPosts = await getOfflinePosts();
      const st = await getStorageStats();
      setStories(cachedStories);
      setPosts(cachedPosts);
      setStats(st);

      // Auto sync if empty
      if (cachedStories.length === 0) {
        handleRunSync();
      }
    }
    loadData();
  }, []);

  // Clock
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  // Live Tile Flip Intervals
  useEffect(() => {
    const t1 = setInterval(() => setFlipToday(f => !f), 6500);
    const t2 = setInterval(() => setFlipMemories(f => !f), 8000);
    const t3 = setInterval(() => setFlipFeed(f => !f), 9500);
    return () => {
      clearInterval(t1);
      clearInterval(t2);
      clearInterval(t3);
    };
  }, []);

  const changeAccent = (hex) => {
    setAccent(hex);
    localStorage.setItem('metro_accent', hex);
  };

  const handleRunSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    setSyncLogs(prev => [`[${new Date().toLocaleTimeString()}] Starting Live Sync with Laptop Vault...`, ...prev]);

    try {
      const res = await syncPocketWithLaptop((progress) => {
        setSyncProgress(progress);
        if (progress.step) {
          setSyncLogs(prev => [`[${new Date().toLocaleTimeString()}] ${progress.step}`, ...prev.slice(0, 15)]);
        }
      });

      if (res.stories) setStories(res.stories);
      if (res.posts) setPosts(res.posts);
      if (res.stats) setStats(res.stats);
    } catch (err) {
      setSyncLogs(prev => [`[${new Date().toLocaleTimeString()}] Sync error: ${err.message}`, ...prev]);
    } finally {
      setIsSyncing(false);
    }
  };

  // Add Camera Master / Extra Photo from Phone
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
        fileBlob: file
      });

      const st = await getStorageStats();
      setStats(st);
      alert(`✓ Photo "${file.name}" saved to mobile vault! It will sync to your PC next time you tap Sync.`);
    };
    reader.readAsDataURL(file);
  };

  const todayMemory = getOnThisDayMemory(stories);

  const filteredStories = stories.filter(s => {
    const matchesSearch = !searchQuery || 
      (s.location_name && s.location_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (s.caption_text && s.caption_text.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (s.journal_note && s.journal_note.toLowerCase().includes(searchQuery.toLowerCase()));
    
    if (!matchesSearch) return false;
    if (filterType === 'photos') return s.media_type === 1;
    if (filterType === 'videos') return s.media_type === 2;
    if (filterType === 'journaled') return Boolean(s.journal_note && s.journal_note.trim().length > 0);
    return true;
  });

  const journaledStories = stories.filter(s => s.journal_note && s.journal_note.trim().length > 0);

  return (
    <div style={{
      width: '100vw',
      minHeight: '100vh',
      maxWidth: '600px',
      margin: '0 auto',
      backgroundColor: '#000000',
      color: '#ffffff',
      fontFamily: '"Segoe UI", "Segoe WP", -apple-system, sans-serif',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      userSelect: 'none',
      overflowX: 'hidden',
      paddingBottom: '75px',
      boxSizing: 'border-box',
    }}>
      {/* Hidden File Input for Mobile Camera / Gallery Pick */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFilePicked}
        accept="image/*,video/*"
        style={{ display: 'none' }}
      />

      {/* ── Windows Phone 8 Status Bar (Top) ────────────────── */}
      <div style={{
        height: '24px',
        padding: '0 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '11px',
        color: 'rgba(255,255,255,0.7)',
        backgroundColor: '#000000',
        zIndex: 50,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Wifi size={12} color={isSyncing ? accent : '#ffffff'} />
          <span style={{ letterSpacing: '0.05em' }}>MEMWAULT MOBILE</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>{stats.storageMb} MB</span>
          <span>{currentTime}</span>
        </div>
      </div>

      {/* ── Metro App Header & Pivot Tabs ───────────────────── */}
      <div style={{ padding: '8px 16px 4px 16px', backgroundColor: '#000000' }}>
        <div style={{
          fontSize: '10px',
          fontWeight: 700,
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          color: accent,
          marginBottom: '2px',
        }}>
          MEMWAULT 8.1
        </div>

        {/* Horizontal Pivot Headers */}
        <div style={{
          display: 'flex',
          gap: '20px',
          overflowX: 'auto',
          scrollbarWidth: 'none',
          whiteSpace: 'nowrap',
          paddingBottom: '6px',
        }}>
          {[
            { id: 'start', label: 'start' },
            { id: 'memories', label: 'memories' },
            { id: 'feed', label: 'feed' },
            { id: 'journal', label: 'journal' },
            { id: 'sync', label: 'sync' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => { playWin98Click(); setActivePivot(tab.id); }}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                color: '#ffffff',
                fontFamily: '"Segoe UI Light", "Segoe UI", sans-serif',
                fontSize: '36px',
                fontWeight: 300,
                lineHeight: 1.1,
                cursor: 'pointer',
                opacity: activePivot === tab.id ? 1 : 0.35,
                transition: 'opacity 0.2s ease',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Metro Indeterminate Progress Bar (Bouncing Dots) ── */}
      {isSyncing && (
        <div style={{ position: 'relative', width: '100%', height: '4px', overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.1)' }}>
          <motion.div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              height: '100%',
              backgroundColor: accent,
              width: `${syncProgress.percent || 30}%`,
            }}
            transition={{ duration: 0.3 }}
          />
        </div>
      )}

      {/* ── Main Viewport (Pivot Pages) ────────────────────── */}
      <div style={{ flex: 1, padding: '12px 16px', overflowY: 'auto' }}>

        {/* ══════════════════════════════════════════════════════
            PIVOT 1: START SCREEN (ANIMATED LIVE TILES GRID)
           ══════════════════════════════════════════════════════ */}
        {activePivot === 'start' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            
            {/* Live Tile 1: Wide 4x2 Flashback / Today Tile (3D Flip) */}
            <div
              onClick={() => {
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
                animate={{ rotateX: flipToday ? 180 : 0 }}
                transition={{ duration: 0.6, ease: [0.4, 0.0, 0.2, 1] }}
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
                }}>
                  {todayMemory && (
                    <div style={{ width: '40%', height: '100%', backgroundColor: '#000' }}>
                      {todayMemory.media_type === 2 ? (
                        <video src={todayMemory.media_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted />
                      ) : (
                        <img src={todayMemory.media_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      )}
                    </div>
                  )}
                  <div style={{ flex: 1, padding: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.05em', color: 'rgba(255,255,255,0.85)' }}>
                        ON THIS DAY FLASHBACK
                      </div>
                      <div style={{ fontSize: '16px', fontWeight: 300, marginTop: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {todayMemory?.location_name || new Date(todayMemory?.taken_at || Date.now()).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                    </div>
                    <div style={{ fontSize: '12px', opacity: 0.9 }}>
                      {todayMemory?.caption_text || 'Relive your archived memory.'}
                    </div>
                  </div>
                </div>

                {/* Back Face: Flip details */}
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  backfaceVisibility: 'hidden',
                  transform: 'rotateX(180deg)',
                  backgroundColor: '#1F1F1F',
                  padding: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  borderLeft: `4px solid ${accent}`,
                }}>
                  <div>
                    <div style={{ fontSize: '11px', color: accent, fontWeight: 700 }}>MEMORY HIGHLIGHT</div>
                    <div style={{ fontSize: '14px', marginTop: '4px', lineHeight: 1.3 }}>
                      {todayMemory?.journal_note || todayMemory?.caption_text || 'Tap to inspect memory details.'}
                    </div>
                  </div>
                  <div style={{ fontSize: '11px', opacity: 0.7 }}>
                    {stories.length} memories stored offline
                  </div>
                </div>
              </motion.div>

              <div style={{ position: 'absolute', bottom: '6px', left: '8px', fontSize: '11px', fontWeight: 600, zIndex: 10 }}>
                photos
              </div>
            </div>

            {/* 2x2 Square Live Tiles Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '12px',
            }}>
              {/* Tile 2: Memories Medium Tile (3D Flip) */}
              <div
                onClick={() => { playWin98Click(); setActivePivot('memories'); }}
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
                  animate={{ rotateY: flipMemories ? 180 : 0 }}
                  transition={{ duration: 0.6, ease: [0.4, 0.0, 0.2, 1] }}
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
                    padding: '10px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    backgroundColor: accent,
                  }}>
                    <ImageIcon size={32} />
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 400 }}>memories</div>
                      <div style={{ fontSize: '26px', fontWeight: 300, lineHeight: 1 }}>{stories.length}</div>
                    </div>
                  </div>

                  {/* Back */}
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    backfaceVisibility: 'hidden',
                    transform: 'rotateY(180deg)',
                    backgroundColor: '#1F1F1F',
                    padding: '10px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}>
                    <div style={{ fontSize: '11px', color: accent }}>stories archive</div>
                    <div style={{ fontSize: '12px' }}>{stats.storageMb} MB cached locally</div>
                    <div style={{ fontSize: '11px', opacity: 0.7 }}>tap to browse</div>
                  </div>
                </motion.div>
              </div>

              {/* Tile 3: Feed Posts Medium Tile */}
              <div
                onClick={() => { playWin98Click(); setActivePivot('feed'); }}
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
                  animate={{ rotateY: flipFeed ? 180 : 0 }}
                  transition={{ duration: 0.6, ease: [0.4, 0.0, 0.2, 1] }}
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
                    padding: '10px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    backgroundColor: '#D80073',
                  }}>
                    <Film size={32} />
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 400 }}>feed posts</div>
                      <div style={{ fontSize: '26px', fontWeight: 300, lineHeight: 1 }}>{posts.length}</div>
                    </div>
                  </div>

                  {/* Back */}
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    backfaceVisibility: 'hidden',
                    transform: 'rotateY(180deg)',
                    backgroundColor: '#1F1F1F',
                    padding: '10px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}>
                    <div style={{ fontSize: '11px', color: '#D80073' }}>carousels & reels</div>
                    <div style={{ fontSize: '12px' }}>{posts.length} multi-slide posts</div>
                    <div style={{ fontSize: '11px', opacity: 0.7 }}>swipe through slides</div>
                  </div>
                </motion.div>
              </div>

              {/* Tile 4: Journal Medium Tile */}
              <div
                onClick={() => { playWin98Click(); setActivePivot('journal'); }}
                style={{
                  aspectRatio: '1/1',
                  backgroundColor: '#008A00',
                  padding: '10px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                }}
              >
                <BookOpen size={32} />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 400 }}>journal</div>
                  <div style={{ fontSize: '26px', fontWeight: 300, lineHeight: 1 }}>{journaledStories.length}</div>
                </div>
              </div>

              {/* Tile 5: Add Photo / Camera Master Tile */}
              <div
                onClick={() => { fileInputRef.current?.click(); }}
                style={{
                  aspectRatio: '1/1',
                  backgroundColor: '#F09609',
                  padding: '10px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                }}
              >
                <Camera size={32} />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 400 }}>add photo</div>
                  <div style={{ fontSize: '11px', opacity: 0.9 }}>+ from camera roll</div>
                </div>
              </div>
            </div>

            {/* Live Tile 6: Sync Wide Tile */}
            <div
              onClick={() => { playWin98Click(); setActivePivot('sync'); }}
              style={{
                width: '100%',
                backgroundColor: '#1F1F1F',
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
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)', marginTop: '2px' }}>
                  {stats.pendingCount > 0 ? `⚠️ ${stats.pendingCount} phone photos queued to sync` : '✓ All memories up to date'}
                </div>
              </div>
              <RefreshCw size={20} className={isSyncing ? 'spin-anim' : ''} color={accent} />
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            PIVOT 2: MEMORIES TIMELINE & INSPECTOR
           ══════════════════════════════════════════════════════ */}
        {activePivot === 'memories' && !selectedStory && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Search Bar */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: '#1F1F1F',
              padding: '6px 12px',
              borderBottom: `2px solid ${accent}`,
            }}>
              <Search size={14} color="#888" style={{ marginRight: '8px' }} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="search memories..."
                style={{
                  border: 'none',
                  outline: 'none',
                  background: 'transparent',
                  color: '#ffffff',
                  width: '100%',
                  fontSize: '13px',
                  fontFamily: 'inherit',
                }}
              />
            </div>

            {/* Filter Pills */}
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
              {[
                { id: 'all', label: 'all' },
                { id: 'photos', label: 'photos' },
                { id: 'videos', label: 'videos' },
                { id: 'journaled', label: 'journaled' },
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setFilterType(f.id)}
                  style={{
                    backgroundColor: filterType === f.id ? accent : '#1F1F1F',
                    color: '#ffffff',
                    border: 'none',
                    padding: '4px 12px',
                    fontSize: '11px',
                    fontWeight: 600,
                    textTransform: 'lowercase',
                    cursor: 'pointer',
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Memory Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '4px',
            }}>
              {filteredStories.map(story => (
                <div
                  key={story.id}
                  onClick={() => { playWin98Click(); setSelectedStory(story); }}
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
                    <img src={story.media_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
                  <div style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    background: 'linear-gradient(transparent, rgba(0,0,0,0.9))',
                    padding: '4px',
                    fontSize: '9px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}>
                    {story.location_name || new Date(story.taken_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── MEMORY DETAIL VIEW (LUMIA INSPECTOR) ───────────── */}
        {activePivot === 'memories' && selectedStory && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <button
              onClick={() => setSelectedStory(null)}
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

            {/* Media Canvas */}
            <div style={{
              width: '100%',
              backgroundColor: '#000000',
              position: 'relative',
              borderRadius: '0px',
              border: `1px solid ${accent}`,
              overflow: 'hidden',
            }}>
              {selectedStory.media_type === 2 ? (
                <video src={selectedStory.media_url} style={{ width: '100%', maxHeight: '60vh', objectFit: 'contain' }} controls autoPlay playsInline />
              ) : (
                <img src={selectedStory.media_url} style={{ width: '100%', maxHeight: '60vh', objectFit: 'contain', display: 'block', margin: '0 auto' }} />
              )}
            </div>

            {/* Music & Audio Streaming Links */}
            {selectedStory.music_title && (
              <div style={{
                backgroundColor: '#1F1F1F',
                padding: '10px 14px',
                borderLeft: `4px solid #008A00`,
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#008A00', fontSize: '11px', fontWeight: 'bold' }}>
                  <Music size={12} />
                  <span>SOUNDTRACK: {selectedStory.music_title} — {selectedStory.music_artist}</span>
                </div>
                {/* Streaming Links */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
                  <a
                    href={`https://open.spotify.com/search/${encodeURIComponent(selectedStory.music_title + ' ' + (selectedStory.music_artist || ''))}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ backgroundColor: '#1DB954', color: '#000', padding: '3px 8px', fontSize: '10px', fontWeight: 'bold', textDecoration: 'none' }}
                  >
                    Spotify ↗
                  </a>
                  <a
                    href={`https://music.apple.com/us/search?term=${encodeURIComponent(selectedStory.music_title + ' ' + (selectedStory.music_artist || ''))}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ backgroundColor: '#FC3C44', color: '#fff', padding: '3px 8px', fontSize: '10px', fontWeight: 'bold', textDecoration: 'none' }}
                  >
                    Apple Music ↗
                  </a>
                  <a
                    href={`https://music.youtube.com/search?q=${encodeURIComponent(selectedStory.music_title + ' ' + (selectedStory.music_artist || ''))}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ backgroundColor: '#FF0000', color: '#fff', padding: '3px 8px', fontSize: '10px', fontWeight: 'bold', textDecoration: 'none' }}
                  >
                    YouTube Music ↗
                  </a>
                </div>
              </div>
            )}

            {/* Details & Location */}
            <div style={{ backgroundColor: '#1F1F1F', padding: '12px' }}>
              <div style={{ fontSize: '16px', fontWeight: 300 }}>
                {selectedStory.location_name || 'Archived Memory'}
              </div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', marginTop: '2px' }}>
                {new Date(selectedStory.taken_at).toLocaleString()}
              </div>

              {selectedStory.caption_text && (
                <div style={{ fontSize: '12px', marginTop: '8px', lineHeight: 1.4 }}>
                  {selectedStory.caption_text}
                </div>
              )}
            </div>

            {/* Add Extra Master Photo to this Memory */}
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{
                backgroundColor: accent,
                color: '#ffffff',
                border: 'none',
                padding: '10px',
                fontSize: '12px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                cursor: 'pointer',
              }}
            >
              <Plus size={16} />
              <span>Add Camera Master Photo to Memory</span>
            </button>

            {/* Journal Note */}
            {selectedStory.journal_note && (
              <div style={{
                backgroundColor: '#1F1F1F',
                borderLeft: '4px solid #F0A30A',
                padding: '12px',
              }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#F0A30A', marginBottom: '4px' }}>
                  📓 PERSONAL JOURNAL NOTE
                </div>
                <div style={{ fontSize: '12px', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                  {selectedStory.journal_note}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            PIVOT 3: FEED POSTS & CAROUSELS
           ══════════════════════════════════════════════════════ */}
        {activePivot === 'feed' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {posts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'rgba(255,255,255,0.6)' }}>
                No feed posts cached offline. Tap "sync" to fetch from laptop.
              </div>
            ) : (
              posts.map(post => (
                <div
                  key={post.id}
                  style={{
                    backgroundColor: '#1F1F1F',
                    borderLeft: `4px solid #D80073`,
                    overflow: 'hidden',
                  }}
                >
                  <div style={{ padding: '8px 12px', display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                    <span style={{ fontWeight: 600 }}>{post.location_name || 'Instagram Post'}</span>
                    <span style={{ color: 'rgba(255,255,255,0.6)' }}>{new Date(post.taken_at).toLocaleDateString()}</span>
                  </div>

                  {post.media_items && post.media_items.length > 0 && (
                    <div style={{ aspectRatio: '1/1', backgroundColor: '#000' }}>
                      {post.media_items[0].media_type === 2 ? (
                        <video src={post.media_items[0].media_url} style={{ width: '100%', height: '100%', objectFit: 'contain' }} controls playsInline />
                      ) : (
                        <img src={post.media_items[0].media_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      )}
                    </div>
                  )}

                  {post.caption && (
                    <div style={{ padding: '10px 12px', fontSize: '12px', lineHeight: 1.4 }}>
                      {post.caption}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            PIVOT 4: JOURNAL APPS & ENTRIES
           ══════════════════════════════════════════════════════ */}
        {activePivot === 'journal' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', marginBottom: '4px' }}>
              {journaledStories.length} Memories with Journal Notes
            </div>

            {journaledStories.map(story => (
              <div
                key={story.id}
                onClick={() => { setSelectedStory(story); setActivePivot('memories'); }}
                style={{
                  backgroundColor: '#1F1F1F',
                  borderLeft: '4px solid #008A00',
                  padding: '12px',
                  display: 'flex',
                  gap: '12px',
                  cursor: 'pointer',
                }}
              >
                <div style={{ width: '50px', height: '65px', backgroundColor: '#000', flexShrink: 0 }}>
                  <img src={story.media_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: 600 }}>{story.location_name || 'Journal Entry'}</div>
                  <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>
                    {new Date(story.taken_at).toLocaleDateString()}
                  </div>
                  <div style={{ fontSize: '11px', marginTop: '4px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {story.journal_note}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            PIVOT 5: SYNC & LUMIA SETTINGS
           ══════════════════════════════════════════════════════ */}
        {activePivot === 'sync' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* Sync Progress & Action Card */}
            <div style={{ backgroundColor: '#1F1F1F', padding: '16px', borderLeft: `4px solid ${accent}` }}>
              <div style={{ fontSize: '16px', fontWeight: 300 }}>ActiveSync Wi-Fi Engine</div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', marginTop: '4px' }}>
                Bidirectional sync between your phone and laptop vault.
              </div>

              {/* Progress Percentage Bar */}
              <div style={{ marginTop: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                  <span>{syncProgress.step || 'Idle'}</span>
                  <span>{syncProgress.percent || 0}%</span>
                </div>
                <div style={{ width: '100%', height: '6px', backgroundColor: '#333' }}>
                  <div style={{ width: `${syncProgress.percent || 0}%`, height: '100%', backgroundColor: accent, transition: 'width 0.3s' }} />
                </div>
              </div>

              <button
                onClick={handleRunSync}
                disabled={isSyncing}
                style={{
                  marginTop: '14px',
                  width: '100%',
                  backgroundColor: accent,
                  color: '#ffffff',
                  border: 'none',
                  padding: '10px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <RefreshCw size={14} className={isSyncing ? 'spin-anim' : ''} />
                <span>{isSyncing ? 'Syncing...' : 'Sync Now with Laptop Vault'}</span>
              </button>
            </div>

            {/* Offline Storage Metrics */}
            <div style={{ backgroundColor: '#1F1F1F', padding: '14px' }}>
              <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Device Storage (IndexedDB)</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', fontSize: '12px' }}>
                <div>Memories Cached: <b>{stats.memoryCount}</b></div>
                <div>Feed Posts: <b>{stats.postCount}</b></div>
                <div>Pending Uploads: <b>{stats.pendingCount}</b></div>
                <div>Storage Used: <b>{stats.storageMb} MB</b></div>
              </div>
            </div>

            {/* Lumia Theme Accent Picker */}
            <div style={{ backgroundColor: '#1F1F1F', padding: '14px' }}>
              <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Lumia Accent Color</div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {METRO_ACCENTS.map(col => (
                  <button
                    key={col.hex}
                    onClick={() => changeAccent(col.hex)}
                    style={{
                      width: '32px',
                      height: '32px',
                      backgroundColor: col.hex,
                      border: accent === col.hex ? '2px solid #ffffff' : 'none',
                      cursor: 'pointer',
                    }}
                    title={col.name}
                  />
                ))}
              </div>
            </div>

            {/* Live Sync Logs */}
            {syncLogs.length > 0 && (
              <div style={{
                backgroundColor: '#0a0a0a',
                padding: '10px',
                fontFamily: 'monospace',
                fontSize: '10px',
                maxHeight: '140px',
                overflowY: 'auto',
                border: '1px solid #333',
              }}>
                {syncLogs.map((log, idx) => (
                  <div key={idx} style={{ color: log.includes('error') ? '#ff4444' : '#00ff66' }}>{log}</div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Windows Phone 8 Application Bar (Bottom) ───────── */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        maxWidth: '600px',
        margin: '0 auto',
        backgroundColor: '#1F1F1F',
        borderTop: '1px solid #333',
        zIndex: 1000,
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-around',
          height: '56px',
          padding: '0 8px',
          position: 'relative',
        }}>
          {/* Add Photo Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              background: 'none',
              border: 'none',
              color: '#ffffff',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              cursor: 'pointer',
            }}
          >
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              border: '2px solid #ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Plus size={16} />
            </div>
            <span style={{ fontSize: '9px', marginTop: '2px', textTransform: 'lowercase' }}>add</span>
          </button>

          {/* Memories Button */}
          <button
            onClick={() => { playWin98Click(); setActivePivot('memories'); }}
            style={{
              background: 'none',
              border: 'none',
              color: activePivot === 'memories' ? accent : '#ffffff',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              cursor: 'pointer',
            }}
          >
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              border: `2px solid ${activePivot === 'memories' ? accent : '#ffffff'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <ImageIcon size={16} />
            </div>
            <span style={{ fontSize: '9px', marginTop: '2px', textTransform: 'lowercase' }}>photos</span>
          </button>

          {/* Sync Button */}
          <button
            onClick={handleRunSync}
            disabled={isSyncing}
            style={{
              background: 'none',
              border: 'none',
              color: isSyncing ? accent : '#ffffff',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              cursor: 'pointer',
            }}
          >
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              border: `2px solid ${isSyncing ? accent : '#ffffff'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <RefreshCw size={14} className={isSyncing ? 'spin-anim' : ''} />
            </div>
            <span style={{ fontSize: '9px', marginTop: '2px', textTransform: 'lowercase' }}>sync</span>
          </button>

          {/* Start Screen Button */}
          <button
            onClick={() => { playWin98Click(); setActivePivot('start'); }}
            style={{
              background: 'none',
              border: 'none',
              color: activePivot === 'start' ? accent : '#ffffff',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              cursor: 'pointer',
            }}
          >
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              border: `2px solid ${activePivot === 'start' ? accent : '#ffffff'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Compass size={16} />
            </div>
            <span style={{ fontSize: '9px', marginTop: '2px', textTransform: 'lowercase' }}>start</span>
          </button>

          {/* Ellipsis Menu Toggle */}
          <button
            onClick={() => setIsAppBarExpanded(!isAppBarExpanded)}
            style={{
              background: 'none',
              border: 'none',
              color: '#ffffff',
              fontSize: '18px',
              letterSpacing: '2px',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            •••
          </button>
        </div>

        {/* Expandable Menu */}
        <AnimatePresence>
          {isAppBarExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              style={{
                backgroundColor: '#1F1F1F',
                borderTop: '1px solid #333',
                padding: '12px 20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                fontSize: '14px',
              }}
            >
              <div 
                onClick={() => { setActivePivot('sync'); setIsAppBarExpanded(false); }}
                style={{ cursor: 'pointer' }}
              >
                sync settings & storage
              </div>
              <div 
                onClick={() => { window.location.href = '/'; }}
                style={{ cursor: 'pointer', color: accent }}
              >
                switch to pc desktop view ↗
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
