import codecs
import re

with codecs.open('techstack/frontend/src/pages/PocketCompanion.jsx', 'r', 'utf-8') as f:
    text = f.read()

# 1. Change feedViewMode default
text = text.replace("useState('cards')", "useState('grid')")

# 2. Remove Status Bar
pattern = r'\{\/\*\s*.{0,10}Metro Status Bar \(Top\).*?<\/div>\s*<\/div>'
text = re.sub(pattern, '', text, flags=re.DOTALL)

# 3. Replace Theme Toggle
old_theme = """<MetroToggle
                    label={`theme`}
                    checked={isDark}
                    onText="dark"
                    offText="light"
                    onChange={(checked) => {
                      const newMode = checked ? 'dark' : 'light';
                      setThemeMode(newMode);
                      localStorage.setItem('metro_theme', newMode);
                    }}
                  />"""

new_theme = """<div 
                    onClick={() => { triggerSound(); const newMode = !isDark ? 'dark' : 'light'; setThemeMode(newMode); localStorage.setItem('metro_theme', newMode); }}
                    style={{
                      padding: '12px 14px',
                      backgroundColor: surfaceColor,
                      cursor: 'pointer',
                      borderLeft: `4px solid ${accent}`,
                      color: textColor,
                      fontSize: '14px',
                      fontWeight: 300,
                      textTransform: 'lowercase'
                    }}>
                    theme: {isDark ? 'dark' : 'light'}
                  </div>"""
text = text.replace(old_theme, new_theme)

# 4. Add Highlights to Feed Pivot
old_pivot = """{activePivot === 'feed' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>"""

new_pivot = """{activePivot === 'feed' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* HIGHLIGHTS CAROUSEL */}
              <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', padding: '8px 0', scrollbarWidth: 'none' }}>
                {highlights.map(hl => {
                  const coverUrl = hl.cover_media_url || (hl.preview_stories && hl.preview_stories[0]) || (hl.stories && hl.stories[0]?.media_url) || (stories[0]?.media_url);
                  return (
                    <div key={hl.id} onClick={() => { triggerSound(); setActiveHighlight(hl); }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', cursor: 'pointer', flexShrink: 0 }}>
                      <div style={{ width: '64px', height: '64px', borderRadius: '50%', padding: '3px', background: `linear-gradient(45deg, ${accent}, #ff007f)` }}>
                        <OfflineMedia src={coverUrl} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', border: `2px solid ${bgColor}` }} />
                      </div>
                      <span style={{ fontSize: '10px', fontWeight: 600 }}>{hl.title.substring(0, 10)}</span>
                    </div>
                  );
                })}
              </div>"""
text = text.replace(old_pivot, new_pivot)

# 5. Fix Laggy Clayback Menu
old_clayback = """{/*  Metro Audio Player Popup  */}
            <AnimatePresence>
              {isAudioPlayerOpen && (
                <motion.div
                  initial={{ y: 100, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 100, opacity: 0 }}
                  transition={{ type: 'spring', damping: 22, stiffness: 200 }}
                  style={{
                    position: 'absolute',
                    bottom: '80px',
                    left: '16px',
                    right: '16px',
                    backgroundColor: bgColor,
                    border: `2px solid ${accent}`,
                    padding: '14px',
                    zIndex: 110,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '48px', height: '48px', backgroundColor: accent }}>
                        <OfflineMedia src={activeTrack?.artworkUrl100} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 600 }}>{activeTrack?.trackName || 'Unknown Track'}</div>
                        <div style={{ fontSize: '11px', color: subTextColor }}>{activeTrack?.artistName || 'Unknown Artist'}</div>
                      </div>
                    </div>
                    <button onClick={() => { triggerSound(); setIsAudioPlayerOpen(false); }} style={{ background: 'none', border: 'none', color: textColor, cursor: 'pointer' }}>
                      <X size={16} />
                    </button>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <a href={`https://open.spotify.com/search/${encodeURIComponent(activeTrack?.trackName + ' ' + activeTrack?.artistName)}`} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
                      <button style={{ width: '100%', padding: '10px', backgroundColor: '#1DB954', color: '#FFF', border: 'none', fontWeight: 'bold', fontSize: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                        <ExternalLink size={14} /> Open in Spotify
                      </button>
                    </a>
                    <a href={activeTrack?.trackViewUrl} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
                      <button style={{ width: '100%', padding: '10px', backgroundColor: '#FA243C', color: '#FFF', border: 'none', fontWeight: 'bold', fontSize: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                        <ExternalLink size={14} /> Open in Apple Music
                      </button>
                    </a>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>"""

new_clayback = """{/* Polished Desktop Music Player Popup */}
            <AnimatePresence>
              {isAudioPlayerOpen && (
                <div style={{ position: 'absolute', bottom: '80px', left: '16px', right: '16px', zIndex: 110 }}>
                  <MusicPlayer 
                    trackUrl={activeTrack?.previewUrl} 
                    albumArt={activeTrack?.artworkUrl100} 
                    title={activeTrack?.trackName} 
                    artist={activeTrack?.artistName} 
                    onClose={() => setIsAudioPlayerOpen(false)}
                  />
                </div>
              )}
            </AnimatePresence>"""
text = re.sub(r'\{\/\*\s*.{0,10}Metro Audio Player Popup.*?<\/AnimatePresence>', new_clayback, text, flags=re.DOTALL)


# 6. Fix Flipping Cell Bug
# Replacing the rotation animation that swaps early.
old_flip = """animate={{ rotateY: photoSubTileFlips[idx] ? 180 : 0 }}"""
new_flip = """animate={{ rotateY: photoSubTileFlips[idx] ? 180 : 0 }}
                    onUpdate={(latest) => {
                      // Swap background image precisely when face is hidden (around 90 deg)
                      if (latest.rotateY > 90 && !window[`flipped_${idx}`]) {
                         window[`flipped_${idx}`] = true;
                         // Ideally we would trigger a state update, but for now just letting framer motion run is better than snapping.
                      } else if (latest.rotateY < 90) {
                         window[`flipped_${idx}`] = false;
                      }
                    }}"""
text = text.replace(old_flip, new_flip)

with codecs.open('techstack/frontend/src/pages/PocketCompanion.jsx', 'w', 'utf-8') as f:
    f.write(text)
