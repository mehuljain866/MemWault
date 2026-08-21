import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Smartphone, RefreshCw, Sparkles, Image as ImageIcon, Film, 
  BookOpen, Compass, Calendar, Search, MapPin, Music, ChevronRight,
  Upload, CheckCircle2, Wifi, Battery, Play, Pause, Volume2, ShieldCheck,
  ChevronLeft, Plus, ExternalLink, Menu, X, ArrowLeft
} from 'lucide-react';
import { 
  getCachedPocketMemories, getCachedPocketPosts, 
  getPocketSyncMeta, syncPocketWithLaptop, getOnThisDayMemory 
} from '../services/pocketSync';
import { PocketWindowsFlagIcon } from '../components/win98/Win98Icons';
import { playWin98Click } from '../services/win98Audio';

export default function PocketCompanion() {
  const [currentView, setCurrentView] = useState('today'); // 'today' | 'memories' | 'posts' | 'detail'
  const [stories, setStories] = useState(() => getCachedPocketMemories());
  const [posts, setPosts] = useState(() => getCachedPocketPosts());
  const [syncMeta, setSyncMeta] = useState(() => getPocketSyncMeta());
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all' | 'photos' | 'videos'
  const [isStartMenuOpen, setIsStartMenuOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    handleSync();
  }, []);

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncMessage('Connecting to Laptop Vault...');
    try {
      const res = await syncPocketWithLaptop();
      if (res.success) {
        setStories(res.stories);
        setPosts(res.posts);
        setSyncMeta(res.meta);
        setSyncMessage('✓ Synced with Laptop Vault');
      } else {
        setSyncMessage('Offline Mode (Showing Cached)');
      }
    } catch (e) {
      setSyncMessage('Offline Mode');
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncMessage(''), 4000);
    }
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
    return true;
  });

  return (
    <div style={{
      width: '100vw',
      minHeight: '100vh',
      maxWidth: '600px',
      margin: '0 auto',
      backgroundColor: '#0055aa',
      backgroundImage: 'linear-gradient(180deg, #0055aa 0%, #003366 100%)',
      color: '#ffffff',
      fontFamily: 'Tahoma, "MS Sans Serif", Arial, sans-serif',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      userSelect: 'none',
      overflowX: 'hidden',
    }}>
      {/* ── Pocket PC Top Navigation Bar ───────────────────── */}
      <div style={{
        height: '38px',
        backgroundColor: '#003366',
        backgroundImage: 'linear-gradient(180deg, #004080 0%, #002b55 100%)',
        borderBottom: '1px solid #001f3f',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 8px',
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        boxShadow: '0 2px 5px rgba(0,0,0,0.3)',
      }}>
        {/* Start Button with 4-Color Windows Flag */}
        <button
          onClick={() => { playWin98Click(); setIsStartMenuOpen(!isStartMenuOpen); }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: isStartMenuOpen ? '#002040' : 'linear-gradient(180deg, #0055aa 0%, #003366 100%)',
            border: '1px solid #002244',
            borderRadius: '4px',
            padding: '3px 8px',
            color: '#ffffff',
            fontWeight: 'bold',
            fontSize: '11px',
            cursor: 'pointer',
            boxShadow: isStartMenuOpen ? 'inset 1px 1px 2px #000' : '1px 1px 2px rgba(0,0,0,0.4)',
          }}
        >
          <PocketWindowsFlagIcon size={14} />
          <span>Start</span>
        </button>

        {/* View Title */}
        <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#ffffff', textShadow: '1px 1px 2px rgba(0,0,0,0.6)' }}>
          {currentView === 'today' && 'Pocket MemWault'}
          {currentView === 'memories' && 'Pocket Memories'}
          {currentView === 'posts' && 'Pocket Feed Posts'}
          {currentView === 'detail' && 'Memory Detail'}
        </div>

        {/* Status Indicators: Signal, Clock, Close */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px' }}>
          <Wifi size={12} color={syncMeta.status === 'synced' ? '#00ff66' : '#ffcc00'} />
          <span>{currentTime}</span>
          <button
            onClick={() => {
              if (currentView !== 'today') {
                setCurrentView('today');
              } else {
                window.location.href = '/';
              }
            }}
            style={{
              width: '18px',
              height: '18px',
              backgroundColor: '#cc0000',
              border: '1px solid #ffffff',
              borderRadius: '2px',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '10px',
              fontWeight: 'bold',
              cursor: 'pointer',
              marginLeft: '4px',
            }}
            title="Close"
          >
            ✕
          </button>
        </div>
      </div>

      {/* ── Pocket Start Menu Dropdown ───────────────────────── */}
      <AnimatePresence>
        {isStartMenuOpen && (
          <>
            <div 
              style={{ position: 'fixed', inset: 0, zIndex: 998 }}
              onClick={() => setIsStartMenuOpen(false)} 
            />
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              style={{
                position: 'absolute',
                top: '39px',
                left: '6px',
                width: '210px',
                backgroundColor: '#ffffff',
                border: '2px solid #002244',
                boxShadow: '4px 4px 12px rgba(0,0,0,0.5)',
                zIndex: 999,
                color: '#000000',
                fontSize: '12px',
              }}
            >
              <div style={{ backgroundColor: '#003366', color: '#ffffff', padding: '6px 10px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <PocketWindowsFlagIcon size={14} />
                <span>Windows Mobile 2003</span>
              </div>
              {[
                { id: 'today', label: 'Today Screen', icon: Calendar },
                { id: 'memories', label: 'Pocket Memories', icon: ImageIcon },
                { id: 'posts', label: 'Feed Posts & Reels', icon: Film },
              ].map(item => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      playWin98Click();
                      setCurrentView(item.id);
                      setIsStartMenuOpen(false);
                    }}
                    style={{
                      padding: '8px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      cursor: 'pointer',
                      borderBottom: '1px solid #e0e0e0',
                      backgroundColor: currentView === item.id ? '#000080' : 'transparent',
                      color: currentView === item.id ? '#ffffff' : '#000000',
                    }}
                  >
                    <Icon size={16} color={currentView === item.id ? '#ffffff' : '#0055aa'} />
                    <span style={{ fontWeight: 600 }}>{item.label}</span>
                  </div>
                );
              })}
              <div
                onClick={() => { handleSync(); setIsStartMenuOpen(false); }}
                style={{
                  padding: '8px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  cursor: 'pointer',
                  backgroundColor: '#f5f5f5',
                  color: '#000000',
                  fontWeight: 'bold',
                }}
              >
                <RefreshCw size={14} className={isSyncing ? 'spin-anim' : ''} color="#008000" />
                <span>Sync with Laptop</span>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Main Viewport ──────────────────────────────────── */}
      <div style={{ flex: 1, padding: '10px 10px 50px 10px', overflowY: 'auto' }}>

        {/* ── VIEW 1: TODAY SCREEN ───────────────────────────── */}
        {currentView === 'today' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {/* Pocket PC Date Banner */}
            <div style={{
              backgroundColor: 'rgba(255,255,255,0.15)',
              border: '1px solid rgba(255,255,255,0.25)',
              borderRadius: '4px',
              padding: '8px 12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 'bold' }}>
                  {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                </div>
                <div style={{ fontSize: '10px', opacity: 0.85 }}>
                  {stories.length} Memories • {posts.length} Posts Saved Locally
                </div>
              </div>
              <button
                onClick={() => handleSync()}
                disabled={isSyncing}
                style={{
                  backgroundColor: '#ffffff',
                  color: '#003366',
                  border: '1px solid #002244',
                  borderRadius: '3px',
                  padding: '4px 8px',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <RefreshCw size={11} className={isSyncing ? 'spin-anim' : ''} />
                <span>Sync</span>
              </button>
            </div>

            {syncMessage && (
              <div style={{
                backgroundColor: '#ffffff',
                color: '#003366',
                padding: '6px 10px',
                borderRadius: '3px',
                fontSize: '11px',
                fontWeight: 'bold',
                textAlign: 'center',
                boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
              }}>
                {syncMessage}
              </div>
            )}

            {/* "On This Day" / Flashback Widget */}
            {todayMemory && (
              <div
                onClick={() => { playWin98Click(); setSelectedItem(todayMemory); setCurrentView('detail'); }}
                style={{
                  backgroundColor: '#ffffff',
                  color: '#000000',
                  borderRadius: '4px',
                  border: '1px solid #002244',
                  padding: '8px',
                  display: 'flex',
                  gap: '10px',
                  cursor: 'pointer',
                  boxShadow: '0 3px 6px rgba(0,0,0,0.3)',
                }}
              >
                <div style={{ width: '65px', height: '90px', borderRadius: '3px', overflow: 'hidden', backgroundColor: '#000', flexShrink: 0 }}>
                  {todayMemory.media_type === 2 ? (
                    <video src={todayMemory.media_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted />
                  ) : (
                    <img src={todayMemory.media_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#0055aa', fontSize: '10px', fontWeight: 'bold' }}>
                      <Sparkles size={11} color="#e89e38" />
                      <span>ON THIS DAY FLASHBACK</span>
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: 'bold', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {todayMemory.location_name || new Date(todayMemory.taken_at).toLocaleDateString()}
                    </div>
                    <div style={{ fontSize: '11px', color: '#555', marginTop: '2px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {todayMemory.caption_text || todayMemory.journal_note || 'Personal memory captured.'}
                    </div>
                  </div>
                  <div style={{ fontSize: '10px', color: '#0055aa', fontWeight: 'bold' }}>
                    Tap to open memory →
                  </div>
                </div>
              </div>
            )}

            {/* Pocket PC Launch Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '8px',
            }}>
              <div
                onClick={() => { playWin98Click(); setCurrentView('memories'); }}
                style={{
                  backgroundColor: '#ffffff',
                  color: '#000000',
                  borderRadius: '4px',
                  padding: '10px',
                  cursor: 'pointer',
                  border: '1px solid #002244',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <ImageIcon size={20} color="#0055aa" />
                  <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#0055aa' }}>{stories.length}</span>
                </div>
                <div style={{ fontSize: '12px', fontWeight: 'bold' }}>Pocket Memories</div>
                <div style={{ fontSize: '10px', color: '#666' }}>Stories & Moments</div>
              </div>

              <div
                onClick={() => { playWin98Click(); setCurrentView('posts'); }}
                style={{
                  backgroundColor: '#ffffff',
                  color: '#000000',
                  borderRadius: '4px',
                  padding: '10px',
                  cursor: 'pointer',
                  border: '1px solid #002244',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Film size={20} color="#e81123" />
                  <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#e81123' }}>{posts.length}</span>
                </div>
                <div style={{ fontSize: '12px', fontWeight: 'bold' }}>Feed Posts</div>
                <div style={{ fontSize: '10px', color: '#666' }}>Carousels & Reels</div>
              </div>
            </div>

            {/* PWA / Install Instructions Callout */}
            <div style={{
              backgroundColor: 'rgba(0,0,0,0.3)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '4px',
              padding: '10px 12px',
              fontSize: '11px',
              lineHeight: 1.4,
            }}>
              <div style={{ fontWeight: 'bold', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Smartphone size={14} color="#00ff66" />
                <span>Add to Home Screen (Standalone App)</span>
              </div>
              <div>
                On iOS: Tap <b>Share ⎋</b> → <b>Add to Home Screen ⊞</b>.<br />
                On Android: Tap <b>Menu ⋮</b> → <b>Install App 📥</b> to run full-screen offline!
              </div>
            </div>
          </div>
        )}

        {/* ── VIEW 2: POCKET MEMORIES GRID ───────────────────── */}
        {currentView === 'memories' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {/* Search & Filter Bar */}
            <div style={{ display: 'flex', gap: '6px' }}>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', backgroundColor: '#ffffff', padding: '4px 8px', borderRadius: '3px', color: '#000' }}>
                <Search size={12} color="#888" style={{ marginRight: '6px' }} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search memories..."
                  style={{ border: 'none', outline: 'none', background: 'transparent', width: '100%', fontSize: '11px' }}
                />
              </div>
              <button
                onClick={() => setFilterType(filterType === 'all' ? 'photos' : filterType === 'photos' ? 'videos' : 'all')}
                style={{
                  backgroundColor: '#ffffff',
                  color: '#003366',
                  border: '1px solid #002244',
                  borderRadius: '3px',
                  padding: '4px 8px',
                  fontSize: '10px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                }}
              >
                {filterType === 'all' ? 'All Media' : filterType === 'photos' ? 'Photos Only' : 'Videos Only'}
              </button>
            </div>

            {/* Memory Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '6px',
            }}>
              {filteredStories.map(story => (
                <div
                  key={story.id}
                  onClick={() => {
                    playWin98Click();
                    setSelectedItem(story);
                    setCurrentView('detail');
                  }}
                  style={{
                    aspectRatio: '9/16',
                    backgroundColor: '#000000',
                    borderRadius: '3px',
                    overflow: 'hidden',
                    position: 'relative',
                    cursor: 'pointer',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                    border: '1px solid rgba(255,255,255,0.2)',
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
                      top: '3px',
                      right: '3px',
                      backgroundColor: '#000080',
                      color: '#ffffff',
                      fontSize: '8px',
                      padding: '1px 3px',
                      borderRadius: '2px',
                    }}>
                      📓 Note
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
                    color: '#ffffff',
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

        {/* ── VIEW 3: POCKET FEED POSTS ──────────────────────── */}
        {currentView === 'posts' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {posts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px', backgroundColor: '#ffffff', color: '#000', borderRadius: '4px' }}>
                No feed posts cached. Tap "Sync" to fetch from laptop.
              </div>
            ) : (
              posts.map(post => (
                <div
                  key={post.id}
                  style={{
                    backgroundColor: '#ffffff',
                    color: '#000000',
                    borderRadius: '4px',
                    border: '1px solid #002244',
                    overflow: 'hidden',
                    boxShadow: '0 2px 5px rgba(0,0,0,0.3)',
                  }}
                >
                  <div style={{ padding: '6px 10px', backgroundColor: '#f0f0f0', borderBottom: '1px solid #ddd', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', fontWeight: 'bold' }}>
                    <span>{post.location_name || 'Instagram Post'}</span>
                    <span style={{ color: '#666', fontSize: '10px' }}>{new Date(post.taken_at).toLocaleDateString()}</span>
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
                    <div style={{ padding: '8px 10px', fontSize: '11px', lineHeight: 1.4 }}>
                      {post.caption}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* ── VIEW 4: MEMORY DETAIL VIEWER ───────────────────── */}
        {currentView === 'detail' && selectedItem && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button
              onClick={() => { playWin98Click(); setCurrentView('memories'); }}
              style={{
                alignSelf: 'flex-start',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                backgroundColor: '#ffffff',
                color: '#003366',
                border: '1px solid #002244',
                borderRadius: '3px',
                padding: '4px 10px',
                fontSize: '11px',
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              <ArrowLeft size={12} />
              <span>Back to Memories</span>
            </button>

            <div style={{
              backgroundColor: '#ffffff',
              color: '#000000',
              borderRadius: '4px',
              border: '1px solid #002244',
              overflow: 'hidden',
              boxShadow: '0 3px 8px rgba(0,0,0,0.4)',
            }}>
              <div style={{ aspectRatio: '9/16', backgroundColor: '#000000', position: 'relative' }}>
                {selectedItem.media_type === 2 ? (
                  <video src={selectedItem.media_url} style={{ width: '100%', height: '100%', objectFit: 'contain' }} controls autoPlay playsInline />
                ) : (
                  <img src={selectedItem.media_url} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                )}
              </div>

              <div style={{ padding: '10px' }}>
                <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#003366' }}>
                  {selectedItem.location_name || 'Memory Archive'}
                </div>
                <div style={{ fontSize: '10px', color: '#666', marginTop: '2px' }}>
                  {new Date(selectedItem.taken_at).toLocaleString()}
                </div>

                {selectedItem.caption_text && (
                  <div style={{ fontSize: '11px', marginTop: '8px', padding: '6px', backgroundColor: '#f5f5f5', borderRadius: '3px', borderLeft: '3px solid #0055aa' }}>
                    {selectedItem.caption_text}
                  </div>
                )}

                {selectedItem.journal_note && (
                  <div style={{ marginTop: '10px', padding: '8px', backgroundColor: '#ffffee', border: '1px solid #eedd88', borderRadius: '3px' }}>
                    <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#886600', marginBottom: '4px' }}>
                      📓 PERSONAL JOURNAL NOTE
                    </div>
                    <div style={{ fontSize: '11px', lineHeight: 1.4 }}>
                      {selectedItem.journal_note}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Pocket PC Command Bar (Bottom) ─────────────────── */}
      <div style={{
        height: '36px',
        backgroundColor: '#002b55',
        backgroundImage: 'linear-gradient(180deg, #003366 0%, #001f3f 100%)',
        borderTop: '1px solid #001830',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 8px',
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        maxWidth: '600px',
        margin: '0 auto',
        zIndex: 1000,
        boxShadow: '0 -2px 5px rgba(0,0,0,0.3)',
      }}>
        <button
          onClick={() => { playWin98Click(); setCurrentView('today'); }}
          style={{
            background: 'transparent',
            border: 'none',
            color: currentView === 'today' ? '#00ffcc' : '#ffffff',
            fontWeight: 'bold',
            fontSize: '11px',
            cursor: 'pointer',
            padding: '4px 8px',
          }}
        >
          Today
        </button>

        <button
          onClick={() => { playWin98Click(); setCurrentView('memories'); }}
          style={{
            background: 'transparent',
            border: 'none',
            color: currentView === 'memories' ? '#00ffcc' : '#ffffff',
            fontWeight: 'bold',
            fontSize: '11px',
            cursor: 'pointer',
            padding: '4px 8px',
          }}
        >
          Memories
        </button>

        <button
          onClick={() => { playWin98Click(); setCurrentView('posts'); }}
          style={{
            background: 'transparent',
            border: 'none',
            color: currentView === 'posts' ? '#00ffcc' : '#ffffff',
            fontWeight: 'bold',
            fontSize: '11px',
            cursor: 'pointer',
            padding: '4px 8px',
          }}
        >
          Feed
        </button>

        <button
          onClick={() => handleSync()}
          disabled={isSyncing}
          style={{
            background: 'linear-gradient(180deg, #0066cc 0%, #004080 100%)',
            border: '1px solid #002244',
            borderRadius: '3px',
            color: '#ffffff',
            fontWeight: 'bold',
            fontSize: '10px',
            cursor: 'pointer',
            padding: '3px 8px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <RefreshCw size={10} className={isSyncing ? 'spin-anim' : ''} />
          <span>Sync PC</span>
        </button>
      </div>
    </div>
  );
}
