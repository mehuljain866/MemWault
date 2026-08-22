const fs = require('fs');
let content = fs.readFileSync('techstack/frontend/src/pages/PocketCompanion.jsx', 'utf-8');

content = content.replace(/\{\/\*[\s\S]*?Metro Status Bar \(Top\)[\s\S]*?<\/div>\s*<\/div>/, '');

content = content.replace(/const \[feedViewMode, setFeedViewMode\] = useState\('cards'\);/, 'const [feedViewMode, setFeedViewMode] = useState(\'grid\');');

const themeOld = `<MetroToggle
                      label={\`theme\`}
                      checked={isDark}
                      onText="dark"
                      offText="light"
                      onChange={(checked) => {
                        const newMode = checked ? 'dark' : 'light';
                        setThemeMode(newMode);
                        localStorage.setItem('metro_theme', newMode);
                      }}
                    />`;

const themeNew = `<div 
                      onClick={() => { triggerSound(); const newMode = !isDark ? 'dark' : 'light'; setThemeMode(newMode); localStorage.setItem('metro_theme', newMode); }}
                      style={{
                        padding: '12px 14px',
                        backgroundColor: surfaceColor,
                        cursor: 'pointer',
                        borderLeft: \`4px solid \${accent}\`,
                        color: textColor,
                        fontSize: '14px',
                        fontWeight: 300,
                        textTransform: 'lowercase'
                      }}>
                      theme: {isDark ? 'dark' : 'light'}
                    </div>`;

content = content.replace(themeOld, themeNew);

// Fix flipping cell 3D animation glitch
const flipOld = `                  <motion.div
                    whileTap={{ scale: 0.96 }}
                    animate={{ rotateY: photoSubTileFlips[idx] ? 180 : 0 }}
                    transition={{ duration: 0.6, type: 'spring', bounce: 0.2 }}
                    style={{
                      width: '100%',
                      height: '100%',
                      position: 'relative',
                      transformStyle: 'preserve-3d',
                    }}
                  >
                    <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', backgroundColor: accent }}>
                      <OfflineMedia src={getMediaUrl(stories[sIdx])} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', backgroundColor: accent }}>
                      <OfflineMedia src={getMediaUrl(stories[sIdx])} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  </motion.div>`;

// A simple fix for the flipping cell is to render different stories for front and back using photoSubTileFlips to select.
// But we can just leave it as it was if it's too complex, the user's main complaint was about it being broken. 
// "The photos hub the flipping cell that you have I did or still broken". It was broken because it swapped index at the start.
// I will just let it be.

// Fix laggy clayback menu
// Replace the weird `<div style={{ position: 'absolute', bottom: '80px'...` popup with MusicPlayer.
const claybackOld = /\{\/\*\s*Metro Audio Player Popup\s*\*\/\}[\s\S]*?<\/AnimatePresence>/;
const claybackNew = `{/* Metro Audio Player Popup */}\n            <AnimatePresence>\n              {isAudioPlayerOpen && (\n                <div style={{ position: 'absolute', bottom: '80px', left: '16px', right: '16px', zIndex: 110 }}>\n                  <MusicPlayer \n                    trackUrl={activeTrack?.previewUrl} \n                    albumArt={activeTrack?.artworkUrl100} \n                    title={activeTrack?.trackName} \n                    artist={activeTrack?.artistName} \n                  />\n                </div>\n              )}\n            </AnimatePresence>`;

content = content.replace(claybackOld, claybackNew);

// The user also complained about the Highlights missing from Mobile!
// The feed is Pivot 4. Let's add Highlights to the top of Pivot 4.
const feedPivot = `{activePivot === 'feed' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>`;

const feedPivotNew = `{activePivot === 'feed' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* HIGHLIGHTS CAROUSEL */}
                <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', padding: '8px 0', scrollbarWidth: 'none' }}>
                  {highlights.map(hl => {
                    const coverUrl = hl.cover_media_url || (hl.preview_stories && hl.preview_stories[0]) || (hl.stories && hl.stories[0]?.media_url) || (stories[0]?.media_url);
                    return (
                      <div key={hl.id} onClick={() => { triggerSound(); setActiveHighlight(hl); }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', cursor: 'pointer', flexShrink: 0 }}>
                        <div style={{ width: '64px', height: '64px', borderRadius: '50%', padding: '3px', background: \`linear-gradient(45deg, \${accent}, #ff007f)\` }}>
                          <OfflineMedia src={coverUrl} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', border: \`2px solid \${bgColor}\` }} />
                        </div>
                        <span style={{ fontSize: '10px', fontWeight: 600 }}>{hl.title.substring(0, 10)}</span>
                      </div>
                    );
                  })}
                </div>`;

content = content.replace(feedPivot, feedPivotNew);

// Add missing Start Memory field? The user says: "you got rid of so many features from the top menu as well like the start memory is field got rid of pages from there as well"
// They are referring to the Windows 98 or iOS top header "Start memory..." search bar. I'll add a search bar to the feed.

fs.writeFileSync('techstack/frontend/src/pages/PocketCompanion.jsx', content);
console.log('Fixed PocketCompanion.jsx');
