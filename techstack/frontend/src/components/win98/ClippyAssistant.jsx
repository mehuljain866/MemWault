import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { getSettings } from '../../services/settings';
import { playWin98Click, playWin98Ding, playWin98Minimize, playWin98Maximize } from '../../services/win98Audio';

export function ClippySVG({ size = 90, isBlinking = false }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ filter: 'drop-shadow(2px 3px 6px rgba(0,0,0,0.35))' }}
    >
      {/* ── Paperclip Wire (Silver metallic with highlights & shadows) ── */}
      <path
        d="M 32 30 C 32 15, 68 15, 68 30 L 68 75 C 68 90, 40 90, 40 75 L 40 38 C 40 28, 60 28, 60 38 L 60 70"
        stroke="#404040"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M 32 30 C 32 15, 68 15, 68 30 L 68 75 C 68 90, 40 90, 40 75 L 40 38 C 40 28, 60 28, 60 38 L 60 70"
        stroke="#C0C0C0"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M 32 30 C 32 15, 68 15, 68 30 L 68 75 C 68 90, 40 90, 40 75 L 40 38 C 40 28, 60 28, 60 38 L 60 70"
        stroke="#FFFFFF"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="20 40 15 30"
      />

      {/* ── Expressive Eyebrows ── */}
      <path d="M 33 28 Q 42 22 47 28" stroke="#101010" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M 53 28 Q 58 22 67 28" stroke="#101010" strokeWidth="2.5" strokeLinecap="round" />

      {/* ── Big Googly Eyes ── */}
      {/* Left Eye */}
      <ellipse cx="40" cy="35" rx="8" ry="9.5" fill="#FFFFFF" stroke="#101010" strokeWidth="1.8" />
      {!isBlinking ? (
        <>
          <ellipse cx="42" cy="36" rx="4.5" ry="5.5" fill="#101010" />
          <circle cx="44" cy="33.5" r="1.5" fill="#FFFFFF" />
          <circle cx="41" cy="38" r="0.8" fill="#FFFFFF" />
        </>
      ) : (
        <line x1="33" y1="35" x2="47" y2="35" stroke="#101010" strokeWidth="2" strokeLinecap="round" />
      )}

      {/* Right Eye */}
      <ellipse cx="60" cy="35" rx="8" ry="9.5" fill="#FFFFFF" stroke="#101010" strokeWidth="1.8" />
      {!isBlinking ? (
        <>
          <ellipse cx="58" cy="36" rx="4.5" ry="5.5" fill="#101010" />
          <circle cx="60" cy="33.5" r="1.5" fill="#FFFFFF" />
          <circle cx="57" cy="38" r="0.8" fill="#FFFFFF" />
        </>
      ) : (
        <line x1="53" y1="35" x2="67" y2="35" stroke="#101010" strokeWidth="2" strokeLinecap="round" />
      )}
    </svg>
  );
}

const CLIPPY_KNOWLEDGE_BASE = [
  {
    id: 'wallpaper_phone',
    keywords: ['wallpaper', 'phone', 'upload', 'mobile', 'qr', 'transfer', 'camera', 'photo', 'desktop'],
    question: 'How do I upload custom wallpapers from my phone?',
    answer: `To upload wallpapers directly from your smartphone via local Wi-Fi:
1. Right-click the Windows 98 desktop and choose **Properties** (or double-click the **Display** icon).
2. Click **"Phone (QR)..."** to display your local network QR code.
3. Scan the QR code using your phone camera (both devices must be on the same local Wi-Fi).
4. Pick any photo from your phone's photo library and tap **"Send to Computer"**!
5. Leave the PC QR window open until transfer completes, and your new wallpaper will appear immediately!`,
    actionLabel: 'Open Display Properties',
    actionType: 'display_properties',
  },
  {
    id: 'icon_boxes',
    keywords: ['box', 'boxes', 'icon', 'icons', 'visibility', 'readability', 'wallpaper', 'see'],
    question: 'How do I make desktop icons readable on busy wallpapers?',
    answer: `If your desktop shortcut text or icons blend into a bright or colorful wallpaper:
1. Open **Display Properties** (right-click desktop -> Properties).
2. Under either the **Background** or **Widgets & Desktop** tab, look for **"Icon Appearance & Readability"**.
3. Check **"Show retro backdrop boxes around desktop icons"**.
4. All desktop icons will instantly get classic 3D beveled silver boxes with high-contrast text!`,
    actionLabel: 'Open Display Properties',
    actionType: 'display_properties',
  },
  {
    id: 'sync_instagram',
    keywords: ['sync', 'scrape', 'instagram', 'download', 'ingest', 'stories', 'archive', 'com1', 'reels'],
    question: 'How do I sync or scrape stories from Instagram?',
    answer: `To archive stories and engagement data from Instagram:
1. Click the **"Sync"** button in the Quick Action toolbar or dashboard.
2. If connecting for the first time, go to **Control Panel (Setup.exe)** -> **Instagram Connection** to launch the secure local login browser session.
3. Stories, music soundtrack metadata, viewer counts, and reposted reels are saved directly into your local database!`,
    actionLabel: 'Open Control Panel (Settings)',
    actionRoute: '/settings',
  },
  {
    id: 'feed_posts_carousels',
    keywords: ['feed', 'posts', 'carousel', 'post', 'slides', 'photos', 'videos', 'camera'],
    question: 'How do I view multi-slide Carousels and Feed Posts?',
    answer: `To view your Instagram Feed Posts & Carousels:
1. Open **FeedViewer.exe (Feed Posts)** from the desktop shortcut or Start Menu.
2. Click any post card to open the **Post Detail Inspector**.
3. Swipe through carousel slides, play video clips, and inspect EXIF metadata, timestamps, and captions!`,
    actionLabel: 'Open Feed Posts',
    actionRoute: '/posts',
  },
  {
    id: 'journal_notes',
    keywords: ['journal', 'markdown', 'notes', 'write', 'sidecar', 'diary', 'text', 'doc'],
    question: 'How do I write markdown journal notes for my memories?',
    answer: `MemWault supports sidecar Markdown notes that save directly onto your disk:
1. Open **Journal.exe** from your desktop, or click any memory in **Memories.exe** and switch to the **"Journal"** tab.
2. Type formatted notes, travel reflections, and tags using standard Markdown.
3. Your notes auto-save as \`.md\` files right next to \`photo.jpg\` on your filesystem, ensuring your thoughts are never locked in a database!`,
    actionLabel: 'Open Journal',
    actionRoute: '/journal',
  },
  {
    id: 'change_themes',
    keywords: ['theme', 'themes', 'win98', 'y2k', 'aqua', 'darkroom', 'ios', 'modern', 'style', 'color'],
    question: 'How do I switch visual themes (Win98, Y2K, Aqua, Modern)?',
    answer: `MemWault includes a Multi-Era Design Architecture:
1. Go to **Setup.exe (Control Panel / Settings)**.
2. Scroll to **Visual Themes & Eras**.
3. Choose from **System Vault '98**, **Chrome Cyber (Y2K)**, **Aqua Dream (Mac OS X)**, **Darkroom**, **Field Notes**, or **iOS Modern**!`,
    actionLabel: 'Go to Theme Settings',
    actionRoute: '/settings',
  },
  {
    id: 'raw_replacement',
    keywords: ['raw', 'master', 'replace', 'high-res', 'original', 'quality', 'compression', 'uncompressed', 'phone'],
    question: 'How do I replace compressed photos with RAW camera originals?',
    answer: `Instagram compresses uploaded photos, but MemWault lets you swap in the original camera master:
1. Open any Story or Feed Post detail page.
2. Click **"Replace RAW Master"** or the Phone QR icon.
3. Upload the uncompressed RAW file from your PC or smartphone.
4. MemWault links your high-res original while preserving the original Instagram metadata!`,
    actionLabel: 'Go to Timeline',
    actionRoute: '/timeline',
  },
  {
    id: 'archives_restore',
    keywords: ['archive', 'archives', 'trash', 'recycle', 'bin', 'delete', 'restore', 'cabinet', 'recover'],
    question: 'How do I restore deleted memories from Archives (Cabinet)?',
    answer: `When you delete a story, it is moved to the **Cabinet.exe (Archives / Recycle Bin)**:
1. Open **Cabinet.exe** from the desktop shortcut or Start Menu -> Documents & Archives.
2. Find any soft-deleted memory.
3. Click the **"Restore"** button to immediately bring it back to your active timeline!`,
    actionLabel: 'Open Archives (Cabinet)',
    actionRoute: '/archives',
  },
  {
    id: 'geo_map',
    keywords: ['map', 'geo', 'world', 'atlas', 'location', 'gps', 'places', 'travel', 'pins'],
    question: 'How do I explore memories geographically on the World Map?',
    answer: `To view your memories on an interactive map:
1. Open **WorldAtlas.exe (Geo Map)** from the desktop.
2. Stories with tagged locations appear as spatial markers on the world map with cluster zooming.
3. Click any pin or place card to view that exact moment!`,
    actionLabel: 'Open Geo Map',
    actionRoute: '/map',
  },
  {
    id: 'highlight_albums',
    keywords: ['highlight', 'highlights', 'album', 'collections', 'curate', 'albums', 'cover'],
    question: 'How do I create and manage custom Highlight Albums?',
    answer: `To curate stories into custom collections:
1. Open **Collections.exe (Highlights)**.
2. Click **"Create Album"** and select the memories you wish to group together.
3. Album covers dynamically render as 4-image photo grids or custom uploaded artwork!`,
    actionLabel: 'Open Highlights',
    actionRoute: '/highlights',
  },
  {
    id: 'active_desktop_widgets',
    keywords: ['widget', 'widgets', 'gadgets', 'active desktop', 'drag', 'move', 'reset'],
    question: 'How do I use Active Desktop floating widgets in Windows 98?',
    answer: `In Windows 98 mode, you can float gadgets directly on your wallpaper:
1. Open **Display Properties** -> **Widgets & Desktop** tab.
2. Switch mode to **"Active Desktop Mode (Floating Gadgets on Wallpaper)"**.
3. You can toggle widgets (Memory Counter, Media Grid, System Health) and drag their title bars to customize your layout!`,
    actionLabel: 'Open Display Properties',
    actionType: 'display_properties',
  },
];

export default function ClippyAssistant({
  isOpen,
  onClose,
  defaultOpen = false,
  onOpenDisplayProps,
  isResourcePopupOpen = false,
}) {
  const navigate = useNavigate();
  const [enabled, setEnabled] = useState(() => getSettings().enableClippy !== false);
  const [expanded, setExpanded] = useState(isOpen !== undefined ? isOpen : defaultOpen);
  const [blinking, setBlinking] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTopic, setActiveTopic] = useState(null);
  const [customAnswer, setCustomAnswer] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const handleSettingsUpdate = () => {
      const current = getSettings();
      setEnabled(current.enableClippy !== false);
    };
    window.addEventListener('storage', handleSettingsUpdate);
    window.addEventListener('memwault-settings-changed', handleSettingsUpdate);
    return () => {
      window.removeEventListener('storage', handleSettingsUpdate);
      window.removeEventListener('memwault-settings-changed', handleSettingsUpdate);
    };
  }, []);

  useEffect(() => {
    if (isOpen !== undefined) {
      setExpanded(isOpen);
    }
  }, [isOpen]);

  useEffect(() => {
    if (expanded) {
      playWin98Ding();
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [expanded]);

  // Periodic natural blinking animation
  useEffect(() => {
    const interval = setInterval(() => {
      setBlinking(true);
      setTimeout(() => setBlinking(false), 180);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  if (!enabled) return null;

  const handleToggle = () => {
    if (!expanded) {
      playWin98Maximize();
      setExpanded(true);
      setActiveTopic(null);
      setCustomAnswer(null);
    } else {
      playWin98Minimize();
      setExpanded(false);
      if (onClose) onClose();
    }
  };

  const handleSearch = (e) => {
    if (e) e.preventDefault();
    const query = searchQuery.trim().toLowerCase();
    if (!query) return;

    // Search knowledge base
    const matched = CLIPPY_KNOWLEDGE_BASE.filter(item => {
      const matchKeywords = item.keywords.some(k => query.includes(k) || k.includes(query));
      const matchQuestion = item.question.toLowerCase().includes(query);
      return matchKeywords || matchQuestion;
    });

    if (matched.length > 0) {
      setActiveTopic(matched[0]);
      setCustomAnswer(null);
    } else {
      setActiveTopic(null);
      setCustomAnswer({
        question: `How do I "${searchQuery}" in MemWault?`,
        answer: `I couldn't find an exact match for "${searchQuery}", but here are the main things you can do in MemWault:
- **Feed Posts & Carousels**: Open **FeedViewer.exe** to inspect multi-slide carousels and RAW masters.
- **Stories & Timeline**: Open **Memories.exe** to explore by year, month, or day.
- **Phone Uploads & Wallpapers**: Open **Display Properties** to generate a QR transfer link.
- **Markdown Journaling**: Open **Journal.exe** to write notes auto-synced as \`.md\` files.
- **Archives & Recovery**: Open **Cabinet.exe** to restore soft-deleted stories.
- **System Sync**: Click **Sync** in the toolbar to pull your Instagram data.`,
        actionLabel: 'Go to Dashboard',
        actionRoute: '/',
      });
    }
  };

  const handleAction = (item) => {
    playWin98Click();
    if (item.actionType === 'display_properties') {
      if (onOpenDisplayProps) {
        onOpenDisplayProps();
      } else {
        window.dispatchEvent(new CustomEvent('memwault-open-display-properties'));
      }
      setExpanded(false);
      if (onClose) onClose();
    } else if (item.actionRoute) {
      navigate(item.actionRoute);
      setExpanded(false);
      if (onClose) onClose();
    }
  };

  const displayedContent = activeTopic || customAnswer;

  return (
    <motion.div
      animate={{
        bottom: isResourcePopupOpen ? '250px' : '36px',
        right: '20px',
      }}
      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      style={{
        position: 'fixed',
        zIndex: 999999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        pointerEvents: 'auto',
        userSelect: 'none',
        fontFamily: '"MS Sans Serif", Tahoma, Arial, sans-serif',
      }}
    >
      {/* ── Classic Yellow Assistant Balloon Window ── */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 20 }}
            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
            style={{
              backgroundColor: '#FFFFE1',
              border: '1px solid #000000',
              boxShadow: '3px 4px 12px rgba(0,0,0,0.35)',
              borderRadius: '4px',
              padding: '12px 14px',
              width: '330px',
              maxHeight: '460px',
              overflowY: 'auto',
              marginBottom: '12px',
              position: 'relative',
              color: '#000000',
              boxSizing: 'border-box',
            }}
          >
            {/* Header / Title bar */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid #D4D0C8',
                paddingBottom: '5px',
                marginBottom: '10px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '15px' }}>📎</span>
                <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#000080' }}>
                  MemWault Assistant (Clippy)
                </span>
              </div>
              <button
                onClick={handleToggle}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  color: '#404040',
                  padding: '0 4px',
                }}
                title="Close Clippy"
              >
                ✕
              </button>
            </div>

            {/* If a topic is selected / answered */}
            {displayedContent ? (
              <div>
                <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#000080', marginBottom: '8px' }}>
                  {displayedContent.question}
                </div>
                <div
                  style={{
                    fontSize: '11px',
                    lineHeight: '1.45',
                    color: '#202020',
                    whiteSpace: 'pre-line',
                    marginBottom: '12px',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #C0C0C0',
                    padding: '8px',
                    borderRadius: '2px',
                  }}
                >
                  {displayedContent.answer}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px' }}>
                  <button
                    onClick={() => {
                      playWin98Click();
                      setActiveTopic(null);
                      setCustomAnswer(null);
                    }}
                    style={{
                      backgroundColor: '#C0C0C0',
                      border: '1px solid #000000',
                      boxShadow: 'inset 1px 1px #FFFFFF, inset -1px -1px #808080',
                      padding: '3px 8px',
                      fontSize: '11px',
                      fontFamily: 'inherit',
                      cursor: 'pointer',
                    }}
                  >
                    ← Ask another
                  </button>

                  {(displayedContent.actionLabel || displayedContent.actionRoute || displayedContent.actionType) && (
                    <button
                      onClick={() => handleAction(displayedContent)}
                      style={{
                        backgroundColor: '#C0C0C0',
                        border: '1px solid #000000',
                        boxShadow: 'inset 1px 1px #FFFFFF, inset -1px -1px #808080',
                        padding: '3px 10px',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        color: '#000080',
                        fontFamily: 'inherit',
                        cursor: 'pointer',
                      }}
                    >
                      {displayedContent.actionLabel || 'Take me there →'}
                    </button>
                  )}
                </div>
              </div>
            ) : (
              /* Topic search & suggestion view */
              <div>
                <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '8px' }}>
                  What would you like to do in MemWault?
                </div>

                {/* Question Search Box */}
                <form onSubmit={handleSearch} style={{ display: 'flex', gap: '4px', marginBottom: '10px' }}>
                  <input
                    ref={inputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Type what you want to do..."
                    style={{
                      flex: 1,
                      padding: '4px 6px',
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #000000',
                      boxShadow: 'inset 1px 1px #808080',
                      fontSize: '11px',
                      fontFamily: 'inherit',
                      outline: 'none',
                    }}
                  />
                  <button
                    type="submit"
                    style={{
                      backgroundColor: '#C0C0C0',
                      border: '1px solid #000000',
                      boxShadow: 'inset 1px 1px #FFFFFF, inset -1px -1px #808080',
                      padding: '3px 8px',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      fontFamily: 'inherit',
                      cursor: 'pointer',
                    }}
                  >
                    Search
                  </button>
                </form>

                {/* Suggested Topics List */}
                <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#555555', marginBottom: '4px' }}>
                  Popular topics:
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  {CLIPPY_KNOWLEDGE_BASE.slice(0, 5).map((topic) => (
                    <div
                      key={topic.id}
                      onClick={() => {
                        playWin98Click();
                        setActiveTopic(topic);
                      }}
                      style={{
                        padding: '4px 6px',
                        backgroundColor: '#FFFFF2',
                        border: '1px dotted #808080',
                        fontSize: '11px',
                        color: '#000080',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        transition: 'background-color 0.1s',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#E8E8FF')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FFFFF2')}
                    >
                      <span>•</span>
                      <span style={{ textDecoration: 'underline' }}>{topic.question}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Speech Bubble Pointer Triangle */}
            <div
              style={{
                position: 'absolute',
                bottom: '-8px',
                right: '35px',
                width: 0,
                height: 0,
                borderLeft: '8px solid transparent',
                borderRight: '8px solid transparent',
                borderTop: '8px solid #000000',
              }}
            />
            <div
              style={{
                position: 'absolute',
                bottom: '-7px',
                right: '36px',
                width: 0,
                height: 0,
                borderLeft: '7px solid transparent',
                borderRight: '7px solid transparent',
                borderTop: '7px solid #FFFFE1',
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Interactive Animated Clippy Character Button ── */}
      <motion.div
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        animate={{
          y: [0, -3, 0],
        }}
        transition={{
          repeat: Infinity,
          duration: 3.5,
          ease: 'easeInOut',
        }}
        onClick={handleToggle}
        style={{
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '2px',
          marginRight: '6px',
        }}
        title="Click Clippy for help in MemWault!"
      >
        <ClippySVG size={expanded ? 85 : 70} isBlinking={blinking} />
        {!expanded && (
          <div
            style={{
              backgroundColor: '#FFFFE1',
              border: '1px solid #000000',
              boxShadow: '1px 1px 4px rgba(0,0,0,0.3)',
              padding: '1px 6px',
              fontSize: '10px',
              fontWeight: 'bold',
              color: '#000080',
              borderRadius: '2px',
              marginTop: '-4px',
            }}
          >
            Ask Clippy
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
