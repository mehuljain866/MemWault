import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getStory, getStoryViewers, locateStoryMedia, updateStoryLocation, updateStory, getAdjacentStories } from '../services/api'
import StoryPlayer from '../components/StoryPlayer'
import LocationModal from '../components/LocationModal'
import MusicPlayer from '../components/MusicPlayer'
import { ChevronLeft, ChevronRight, MapPin, MessageCircle, Eye, Music, Users, Link2, BarChart2, Calendar, FileType, Check, Clock, X, Video, Save, Sparkles } from 'lucide-react'
import MDEditor, { commands } from '@uiw/react-md-editor'
import { getSettings } from '../services/settings'

export default function StoryDetail() {
  const { id } = useParams()
  const settings = getSettings()
  const navigate = useNavigate()
  const [story, setStory] = useState(null)
  const [viewers, setViewers] = useState([])
  const [adjacent, setAdjacent] = useState({ prev_id: null, next_id: null })
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('metadata')
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false)
  const [isMusicPlaying, setIsMusicPlaying] = useState(false)
  
  const [journalNote, setJournalNote] = useState('')
  const [savingJournal, setSavingJournal] = useState(false)

  useEffect(() => {
    loadStory()
  }, [id])

  // Keydown listener for arrow navigation
  useEffect(() => {
    function handleKeyDown(e) {
      // Don't navigate if user is in the journal editor or typing in any input
      if (activeTab === 'journal') return
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName) || e.target.isContentEditable) return

      if (e.key === 'ArrowLeft' && adjacent.prev_id) {
        navigate(`/story/${adjacent.prev_id}`, { replace: true })
      } else if (e.key === 'ArrowRight' && adjacent.next_id) {
        navigate(`/story/${adjacent.next_id}`, { replace: true })
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [adjacent, navigate, activeTab])

  async function handleLocate() {
    try {
      await locateStoryMedia(id)
    } catch (err) {
      alert('Failed to locate file: ' + err.message)
    }
  }

  async function loadStory() {
    setLoading(true)
    try {
      const data = await getStory(id)
      setStory(data)
      setJournalNote(data.journal_note || '')

      // Load viewers and adjacent stories in background
      Promise.all([
        getStoryViewers(id).catch(() => []),
        getAdjacentStories(id).catch(() => ({ prev_id: null, next_id: null }))
      ]).then(([v, adj]) => {
        setViewers(v)
        setAdjacent(adj)
      })

    } catch (err) {
      console.error('Failed to load story:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleSaveLocation(locData) {
    try {
      const res = await updateStoryLocation(id, locData);
      setStory(prev => ({
        ...prev,
        location_name: locData.location_name,
        location_lat: locData.location_lat,
        location_lng: locData.location_lng,
      }));
      setIsLocationModalOpen(false);
    } catch (err) {
      alert('Failed to update location: ' + err.message);
    }
  }

  async function handleSaveJournal() {
    setSavingJournal(true)
    try {
      await updateStory(id, { journal_note: journalNote })
      setStory(prev => ({ ...prev, journal_note: journalNote }))
    } catch (err) {
      alert('Failed to save journal: ' + err.message)
    } finally {
      setSavingJournal(false)
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '16px', color: 'var(--ios-text-secondary)' }}>
        <Clock size={32} className="spin-anim" />
        <div style={{ fontSize: '18px', fontWeight: 600 }}>Loading Story...</div>
      </div>
    )
  }

  if (!story) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '16px', color: 'var(--ios-text-secondary)' }}>
        <X size={48} color="var(--ios-danger)" />
        <div style={{ fontSize: '20px', fontWeight: 600, color: 'var(--ios-text-primary)' }}>Story Not Found</div>
        <button className="ios-btn" onClick={() => navigate('/timeline')}>
          Back to Timeline
        </button>
      </div>
    )
  }

  const dateStrUtc = story.taken_at + (story.taken_at.endsWith('Z') ? '' : 'Z')
  const date = new Date(dateStrUtc)
  const isVideo = story.media_type === 2

  const SegmentedControl = ({ tabs, activeTab, onChange }) => (
    <div style={{
      display: 'flex',
      backgroundColor: 'var(--ios-border)',
      borderRadius: '8px',
      padding: '2px',
      marginBottom: '16px',
    }}>
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          style={{
            flex: 1,
            padding: '6px 12px',
            border: 'none',
            backgroundColor: activeTab === tab.id ? 'var(--ios-bg-card)' : 'transparent',
            color: activeTab === tab.id ? 'var(--ios-text-primary)' : 'var(--ios-text-secondary)',
            borderRadius: '6px',
            fontWeight: activeTab === tab.id ? 600 : 500,
            fontSize: '13px',
            cursor: 'pointer',
            boxShadow: activeTab === tab.id ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            transition: 'all var(--ios-spring-fast)',
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )

  const InfoRow = ({ icon: Icon, label, value, children }) => (
    <div style={{ display: 'flex', alignItems: 'flex-start', padding: '16px 0', borderBottom: '1px solid var(--ios-border)' }}>
      <div style={{ color: 'var(--ios-text-secondary)', marginRight: '16px', marginTop: '2px' }}>
        <Icon size={20} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--ios-text-secondary)', fontWeight: 600, marginBottom: '4px' }}>{label}</div>
        <div style={{ fontSize: '16px', color: 'var(--ios-text-primary)' }}>{value}</div>
        {children && <div style={{ marginTop: '8px' }}>{children}</div>}
      </div>
    </div>
  )

  const ToggleSwitch = ({ checked, onChange, label }) => (
    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', padding: '8px 0', width: '100%' }}>
      <span style={{ fontSize: '15px', fontWeight: 500, color: 'var(--ios-text-primary)' }}>{label}</span>
      <div style={{
        position: 'relative', width: '50px', height: '30px', borderRadius: '15px',
        background: checked ? 'var(--ios-success)' : 'var(--ios-border)',
        transition: 'background 0.3s'
      }}>
        <div style={{
          position: 'absolute', top: '2px', left: checked ? '22px' : '2px',
          width: '26px', height: '26px', borderRadius: '50%', background: '#fff',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)', transition: 'left 0.3s'
        }} />
      </div>
      <input type="checkbox" checked={checked} onChange={onChange} style={{ display: 'none' }} />
    </label>
  )

  return (
    <div style={{ maxWidth: '1000px', margin: '-20px auto 0 auto', display: 'flex', flexDirection: 'column', height: '100%', paddingBottom: '40px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px' }}>
        <button
          onClick={() => navigate(-1)}
          style={{ background: 'transparent', border: 'none', color: 'var(--ios-accent)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '17px', cursor: 'pointer', padding: 0 }}
        >
          <ChevronLeft size={24} /> Back
        </button>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '32px', alignItems: 'flex-start' }}>
        {/* ── Media Player ──────────────────── */}
        <div style={{ flex: '1 1 350px', maxWidth: '400px', margin: '0 auto', position: 'relative' }}>
          <div style={{
            borderRadius: '24px', overflow: 'hidden', boxShadow: 'var(--ios-shadow-lg)',
            backgroundColor: '#000', position: 'relative'
          }}>
            {story.is_ai_generated && settings.showAITags && (
              <div style={{
                position: 'absolute', top: '16px', right: '16px', zIndex: 50,
                background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)',
                color: '#fff', fontSize: '12px', fontWeight: 600, padding: '4px 10px',
                borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '4px',
                border: '1px solid rgba(255,255,255,0.2)', pointerEvents: 'none'
              }}>
                ✨ AI
              </div>
            )}
            {story.primary_view === 'reel' && story.og_reel_url ? (
               <StoryPlayer story={{ ...story, media_url: story.og_reel_url, media_type: 2 }} isMusicPlaying={isMusicPlaying} />
            ) : (
               <StoryPlayer story={story} isMusicPlaying={isMusicPlaying} />
            )}
          </div>
          
          {(story.is_reel || story.og_reel_media_id) && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '16px' }}>
              <div style={{ background: 'var(--ios-bg-card)', borderRadius: '20px', padding: '4px', display: 'flex', gap: '4px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                <button
                  onClick={async () => {
                    setStory(s => ({...s, primary_view: 'story'}));
                    try { await updateStory(id, { primary_view: 'story' }); } catch (e) {}
                  }}
                  style={{
                    padding: '8px 16px', borderRadius: '16px', border: 'none', cursor: 'pointer',
                    background: story.primary_view !== 'reel' ? 'var(--ios-accent)' : 'transparent',
                    color: story.primary_view !== 'reel' ? '#fff' : 'var(--ios-text-secondary)',
                    fontWeight: 600, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px'
                  }}
                >
                  <FileType size={16}/> Story
                </button>
                <button
                  onClick={async () => {
                    setStory(s => ({...s, primary_view: 'reel'}));
                    try { await updateStory(id, { primary_view: 'reel' }); } catch (e) {}
                  }}
                  style={{
                    padding: '8px 16px', borderRadius: '16px', border: 'none', cursor: 'pointer',
                    background: story.primary_view === 'reel' ? 'var(--ios-accent)' : 'transparent',
                    color: story.primary_view === 'reel' ? '#fff' : 'var(--ios-text-secondary)',
                    fontWeight: 600, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px'
                  }}
                >
                  <Video size={16}/> Original Reel
                </button>
              </div>
            </div>
          )}
          
          {/* Navigation Arrows */}
          {adjacent.prev_id && (
            <button
              onClick={() => navigate(`/story/${adjacent.prev_id}`, { replace: true })}
              style={{ position: 'absolute', left: '-20px', top: '50%', transform: 'translateY(-50%)', background: 'var(--ios-glass)', backdropFilter: 'blur(20px) saturate(180%)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '50%', width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ios-text-primary)', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 10 }}
            >
              <ChevronLeft size={24} />
            </button>
          )}
          
          {adjacent.next_id && (
            <button
              onClick={() => navigate(`/story/${adjacent.next_id}`, { replace: true })}
              style={{ position: 'absolute', right: '-20px', top: '50%', transform: 'translateY(-50%)', background: 'var(--ios-glass)', backdropFilter: 'blur(20px) saturate(180%)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '50%', width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ios-text-primary)', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 10 }}
            >
              <ChevronRight size={24} />
            </button>
          )}
        </div>

        {/* ── Metadata Panel (Slide up feel) ────────────────── */}
        <div style={{
          flex: '1 1 400px',
          minWidth: 0,
          backgroundColor: 'var(--ios-bg-card)',
          borderRadius: '24px',
          padding: '24px',
          boxShadow: 'var(--ios-shadow-md)',
          border: '1px solid var(--ios-border)',
        }}>
          {/* Tab Nav */}
          <SegmentedControl 
            tabs={[
              { id: 'metadata', label: 'Info' },
              { id: 'journal', label: story.journal_note ? 'Journal 📝' : 'Journal' },
              { id: 'music', label: 'Music' },
              { id: 'viewers', label: 'Viewers' },
              { id: 'manifest', label: 'Data' }
            ]}
            activeTab={activeTab}
            onChange={setActiveTab}
          />

          {/* ── Metadata Tab ──────────────── */}
          {activeTab === 'metadata' && (
            <div style={{ animation: 'fade-in 0.3s ease' }}>
              <InfoRow icon={Calendar} label="Date" value={`${date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} at ${date.toLocaleTimeString()}`} />
              <InfoRow icon={FileType} label="Type" value={`${isVideo ? 'Video' : 'Photo'}${story.width && story.height ? ` · ${story.width}×${story.height}` : ''}${story.duration_ms ? ` · ${(story.duration_ms / 1000).toFixed(1)}s` : ''}`} />
              
              <InfoRow icon={MapPin} label="Location" value={story.location_name || <span style={{ color: 'var(--ios-text-muted)' }}>No location</span>}>
                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                  <button onClick={() => setIsLocationModalOpen(true)} style={{ background: 'transparent', border: 'none', color: 'var(--ios-accent)', fontWeight: 600, padding: 0, cursor: 'pointer' }}>Edit Location</button>
                </div>
              </InfoRow>

              {story.caption_text && <InfoRow icon={MessageCircle} label="Caption" value={story.caption_text} />}
              {story.is_ai_generated != null && <InfoRow icon={Sparkles} label="AI Generation" value={story.is_ai_generated ? "True" : "False"} />}
              {story.viewer_count != null && <InfoRow icon={Eye} label="Views" value={story.viewer_count} />}
              <InfoRow icon={FileType} label="Visibility" value="">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '8px' }}>
                  <ToggleSwitch 
                    label="Show in Memories Tab"
                    checked={story.is_memory}
                    onChange={async (e) => {
                      const val = e.target.checked;
                      try {
                        await updateStory(id, { is_memory: val });
                        setStory(prev => ({ ...prev, is_memory: val }));
                      } catch (err) { alert('Update failed'); e.target.checked = !val; }
                    }}
                  />
                  <ToggleSwitch 
                    label="Show in Reels Tab"
                    checked={story.is_reel}
                    onChange={async (e) => {
                      const val = e.target.checked;
                      try {
                        await updateStory(id, { is_reel: val });
                        setStory(prev => ({ ...prev, is_reel: val }));
                      } catch (err) { alert('Update failed'); e.target.checked = !val; }
                    }}
                  />
                </div>
              </InfoRow>

              {story.og_reel_media_id && (
                <InfoRow icon={BarChart2} label="Original Reel Stats" value="">
                  <div style={{ display: 'flex', gap: '16px', marginTop: '4px' }}>
                    <div><span style={{ fontWeight: 600 }}>{story.og_reel_likes?.toLocaleString() || 0}</span> Likes</div>
                    <div><span style={{ fontWeight: 600 }}>{story.og_reel_plays?.toLocaleString() || 0}</span> Plays</div>
                  </div>
                  <button className="ios-btn ios-btn-secondary" onClick={() => alert("Manual refresh not fully wired yet but it will call an endpoint")} style={{ padding: '6px 12px', fontSize: '13px', marginTop: '12px' }}>
                    Manual Refresh
                  </button>
                  {story.og_reel_url && (
                    <a href={story.og_reel_url} download={`reel_${story.og_reel_media_id}.mp4`} target="_blank" rel="noopener noreferrer" className="ios-btn ios-btn-secondary" style={{ padding: '6px 12px', fontSize: '13px', marginTop: '8px', textDecoration: 'none', display: 'inline-block' }}>
                      Download OG Reel
                    </a>
                  )}
                </InfoRow>
              )}

              {/* Music Quick Link */}
              {story.music && (
                <div 
                  style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', background: 'var(--ios-bg)', borderRadius: '12px', marginTop: '16px', cursor: 'pointer' }}
                  onClick={() => setActiveTab('music')}
                >
                  <Music size={24} color="var(--ios-accent)" />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>{story.music.track_title}</div>
                    <div style={{ fontSize: '13px', color: 'var(--ios-text-secondary)' }}>{story.music.artist_name}</div>
                  </div>
                  <ChevronRight size={20} color="var(--ios-text-secondary)" />
                </div>
              )}

              {story.mentions?.length > 0 && (
                <InfoRow icon={Users} label="Mentions" value={
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {story.mentions.map((m) => (
                      <span key={m.id} style={{ background: 'var(--ios-bg)', padding: '4px 8px', borderRadius: '6px', fontSize: '13px', fontWeight: 600 }}>@{m.username}</span>
                    ))}
                  </div>
                } />
              )}

              {story.links?.length > 0 && (
                <InfoRow icon={Link2} label="Links" value={
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {story.links.map((l) => (
                      <a key={l.id} href={l.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--ios-accent)', textDecoration: 'none', fontWeight: 600 }}>
                        {l.link_title || l.display_url || l.url}
                      </a>
                    ))}
                  </div>
                } />
              )}

              {story.polls?.length > 0 && (
                <InfoRow icon={BarChart2} label="Polls" value={
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {story.polls.map((p) => (
                      <div key={p.id} style={{ background: 'var(--ios-bg)', padding: '12px', borderRadius: '8px' }}>
                        <div style={{ fontWeight: 600, marginBottom: '4px' }}>{p.question_text || 'Poll'}</div>
                        <div style={{ fontSize: '13px', color: 'var(--ios-text-secondary)' }}>{p.total_votes} votes · {p.poll_type}</div>
                      </div>
                    ))}
                  </div>
                } />
              )}

              <div style={{ marginTop: '24px', padding: '16px', background: 'var(--ios-bg)', borderRadius: '12px' }}>
                <div style={{ fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--ios-text-secondary)', marginBottom: '12px' }}>Management</div>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                  {story.is_downloaded && (
                    <button className="ios-btn ios-btn-secondary" onClick={handleLocate} style={{ padding: '6px 12px', fontSize: '13px' }}>
                      Show File
                    </button>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', fontSize: '12px', fontWeight: 600 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: story.is_downloaded ? 'var(--ios-success)' : 'var(--ios-warning)' }}>
                    {story.is_downloaded ? <Check size={14}/> : <Clock size={14}/>} Downloaded
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: story.is_metadata_written ? 'var(--ios-success)' : 'var(--ios-warning)' }}>
                    {story.is_metadata_written ? <Check size={14}/> : <Clock size={14}/>} Metadata
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ── Music Tab ─────────────────── */}
          {activeTab === 'music' && (
            <div style={{ animation: 'fade-in 0.3s ease' }}>
              {story.music ? (
                <div>
                  <MusicPlayer music={story.music} onPlayStateChange={setIsMusicPlaying} />
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--ios-text-secondary)' }}>
                  <Music size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
                  <div>No music attached to this story.</div>
                </div>
              )}
            </div>
          )}

          {/* ── Viewers Tab ───────────────── */}
          {activeTab === 'viewers' && (
            <div style={{ animation: 'fade-in 0.3s ease' }}>
              {viewers.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {viewers.map((v) => (
                    <div key={v.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 0', borderBottom: '1px solid var(--ios-border)' }}>
                      {v.profile_pic_url ? (
                        <img src={v.profile_pic_url} alt={v.username} style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--ios-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Users size={20} color="var(--ios-text-secondary)" /></div>
                      )}
                      <div>
                        <div style={{ fontWeight: 600 }}>{v.username}</div>
                        {v.full_name && <div style={{ fontSize: '13px', color: 'var(--ios-text-secondary)' }}>{v.full_name}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--ios-text-secondary)' }}>
                  <Eye size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
                  <div>No viewer data available.</div>
                </div>
              )}
            </div>
          )}

          {/* ── Manifest Tab ──────────────── */}
          {activeTab === 'manifest' && (
            <div style={{ animation: 'fade-in 0.3s ease', display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
              <pre style={{
                background: '#1e1e1e', color: '#d4d4d4', padding: '16px', borderRadius: '12px',
                overflow: 'auto', flex: 1, maxHeight: '500px', fontSize: '12px', fontFamily: 'monospace',
                whiteSpace: 'pre-wrap', wordBreak: 'break-word'
              }}>
                {JSON.stringify(story, null, 2)}
              </pre>
            </div>
          )}

          {/* ── Journal Tab ───────────────── */}
          {activeTab === 'journal' && (
            <div style={{ animation: 'fade-in 0.3s ease', display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ fontWeight: 600, color: 'var(--ios-text-secondary)', fontSize: '14px', textTransform: 'uppercase' }}>
                  Meaning-Making Editor
                </div>
                <button 
                  onClick={handleSaveJournal}
                  disabled={savingJournal || journalNote === story.journal_note}
                  style={{
                    background: (journalNote === story.journal_note) ? 'var(--ios-bg)' : 'var(--ios-accent)',
                    color: (journalNote === story.journal_note) ? 'var(--ios-text-muted)' : '#fff',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '16px',
                    fontWeight: 600,
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: (journalNote === story.journal_note) ? 'default' : 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <Save size={16} />
                  {savingJournal ? 'Saving...' : (journalNote === story.journal_note && story.journal_note ? 'Saved' : 'Save Note')}
                </button>
              </div>
              
              <div 
                data-color-mode="dark" 
                style={{ 
                  flex: 1, 
                  display: 'flex', 
                  flexDirection: 'column', 
                  minHeight: '400px', 
                  borderRadius: settings.editorStyle === 'invisible' ? '0' : '12px', 
                  overflow: 'hidden', 
                  border: settings.editorStyle === 'invisible' ? 'none' : '1px solid var(--ios-border)',
                  backgroundColor: 'transparent'
                }}
              >
                <MDEditor
                  value={journalNote}
                  onChange={setJournalNote}
                  height="100%"
                  visibleDragbar={false}
                  preview={settings.editorSplitPane ? 'live' : 'edit'}
                  commands={
                    settings.editorRibbonMode === 'advanced' 
                      ? undefined 
                      : [
                          commands.bold,
                          commands.italic,
                          commands.strikethrough,
                          commands.divider,
                          ...(settings.editorCustomTools || []).includes('image') ? [commands.image] : [],
                          ...(settings.editorCustomTools || []).includes('link') ? [commands.link] : [],
                          ...(settings.editorCustomTools || []).includes('code') ? [commands.codeBlock] : [],
                          ...(settings.editorCustomTools || []).includes('quote') ? [commands.quote] : [],
                          ...(settings.editorCustomTools || []).includes('unordered-list') ? [commands.unorderedListCommand] : [],
                        ]
                  }
                  style={{ 
                    backgroundColor: 'transparent',
                    boxShadow: settings.editorStyle === 'invisible' ? 'none' : undefined,
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
      
      <LocationModal 
        isOpen={isLocationModalOpen} 
        onClose={() => setIsLocationModalOpen(false)} 
        onSave={handleSaveLocation}
        initialLocation={story.location_name ? { name: story.location_name, lat: story.location_lat, lng: story.location_lng } : null}
      />
    </div>
  )
}
