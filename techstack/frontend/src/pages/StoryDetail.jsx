import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { getStory, getStoryViewers, refreshStoryViewers, locateStoryMedia, updateStoryLocation, updateStory, getAdjacentStories } from '../services/api'
import StoryPlayer from '../components/StoryPlayer'
import LocationModal from '../components/LocationModal'
import MusicPlayer from '../components/MusicPlayer'
import SyntaxJsonViewer from '../components/SyntaxJsonViewer'
import StreetViewModal from '../components/StreetViewModal'
import MDEditor, { commands } from '@uiw/react-md-editor'
import { ChevronLeft, ChevronRight, MapPin, MessageCircle, Eye, Music, Users, Link2, BarChart2, Calendar, FileType, Check, Clock, X, Video, Save, Sparkles, Star, Heart, RefreshCw, ExternalLink, Compass, Edit3, Images, FileText } from 'lucide-react'
import { getSettings } from '../services/settings'

export default function StoryDetail() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const locationParam = searchParams.get('location') || ''
  const settings = getSettings()
  const isWin98 = settings.themeId === 'win98'
  const navigate = useNavigate()
  const [story, setStory] = useState(null)
  const [viewers, setViewers] = useState([])
  const [adjacent, setAdjacent] = useState({ prev_id: null, next_id: null })
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('metadata')
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false)
  const [isStreetViewOpen, setIsStreetViewOpen] = useState(false)
  const [isMusicPlaying, setIsMusicPlaying] = useState(false)
  const [refreshingViewers, setRefreshingViewers] = useState(false)
  
  const [journalNote, setJournalNote] = useState('')
  const [savingJournal, setSavingJournal] = useState(false)

  useEffect(() => {
    loadStory()
  }, [id, locationParam])

  // Keydown listener for arrow navigation
  useEffect(() => {
    function handleKeyDown(e) {
      // Don't navigate if user is in the journal editor or typing in any input
      if (activeTab === 'journal') return
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName) || e.target.isContentEditable) return

      const qs = locationParam ? `?location=${encodeURIComponent(locationParam)}` : ''
      if (e.key === 'ArrowLeft' && adjacent.prev_id) {
        navigate(`/story/${adjacent.prev_id}${qs}`, { replace: true })
      } else if (e.key === 'ArrowRight' && adjacent.next_id) {
        navigate(`/story/${adjacent.next_id}${qs}`, { replace: true })
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [adjacent, navigate, activeTab, locationParam])

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
        getAdjacentStories(id, { location: locationParam || undefined }).catch(() => ({ prev_id: null, next_id: null }))
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
    <div className="segmented-container segment-group" style={{
      display: 'flex',
      backgroundColor: 'var(--ios-border)',
      borderRadius: '20px',
      padding: '3px',
      marginBottom: '20px',
      position: 'relative',
      gap: '2px',
    }}>
      {tabs.map(tab => {
        const isActive = activeTab === tab.id
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`segment-btn ${isActive ? 'active' : ''}`}
            style={{
              flex: 1,
              padding: '7px 12px',
              border: 'none',
              backgroundColor: 'transparent',
              color: isActive ? 'var(--ios-text-primary)' : 'var(--ios-text-secondary)',
              borderRadius: '16px',
              fontWeight: isActive ? 700 : 500,
              fontSize: '13px',
              cursor: 'pointer',
              position: 'relative',
              zIndex: 1,
              transition: 'color 0.2s ease',
              whiteSpace: 'nowrap',
            }}
          >
            {isActive && !isWin98 && (
              <motion.span
                layoutId="story-tab-pill"
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: '16px',
                  background: 'var(--ios-bg-card)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
                  zIndex: -1,
                }}
                transition={{ type: 'spring', stiffness: 380, damping: 34 }}
              />
            )}
            {tab.label}
          </button>
        )
      })}
    </div>
  )


  const InfoRow = ({ icon: Icon, label, value, children }) => (
    <div 
      style={{ display: 'flex', alignItems: 'flex-start', padding: '16px 0', borderBottom: '1px solid var(--ios-border)' }}
    >
      <div style={{ color: 'var(--ios-accent)', marginRight: '16px', marginTop: '2px', background: 'rgba(10, 132, 255, 0.1)', padding: '8px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={18} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--ios-text-secondary)', fontWeight: 700, letterSpacing: '0.5px', marginBottom: '4px' }}>{label}</div>
        <div style={{ fontSize: '15px', color: 'var(--ios-text-primary)', fontWeight: 500 }}>{value}</div>
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
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.25 }}
      style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', minHeight: '100%', padding: '12px 12px 40px 12px' }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
        <motion.button
          whileHover={{ scale: 1.03, x: -2 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => navigate(-1)}
          className="segment-btn"
          style={{ 
            display: 'inline-flex', alignItems: 'center', gap: '6px', 
            fontSize: '14px', fontWeight: 600, cursor: 'pointer', 
            padding: '6px 14px', borderRadius: '8px',
            color: 'var(--ios-accent)'
          }}
        >
          <ChevronLeft size={18} /> Back
        </motion.button>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '32px', alignItems: 'flex-start' }}>
        {/* ── Media Player (Windowed Application Frame) ──────────────────── */}
        <div style={{ flex: '1 1 350px', maxWidth: '400px', margin: '0 auto', position: 'relative' }}>
          {isWin98 ? (
            /* Windows 98 MediaPlayer.exe / ImageViewer.exe Window */
            <div style={{
              backgroundColor: '#c0c0c0',
              border: '1px solid #000000',
              boxShadow: 'inset 1px 1px #ffffff, inset -1px -1px #808080, 3px 3px 12px rgba(0,0,0,0.4)',
              display: 'flex',
              flexDirection: 'column',
              boxSizing: 'border-box',
              fontFamily: '"MS Sans Serif", Tahoma, Arial, sans-serif',
            }}>
              {/* Win98 App Title Bar */}
              <div style={{
                background: 'linear-gradient(90deg, #000080 0%, #1084d0 100%)',
                color: '#ffffff',
                fontWeight: 'bold',
                padding: '2px 4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '11px',
                userSelect: 'none',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', overflow: 'hidden' }}>
                  {isVideo ? <Video size={12} color="#ffffff" /> : <Images size={12} color="#ffffff" />}
                  <span style={{ whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                    {isVideo ? `MediaPlayer.exe - [STORY_${story.id?.slice(0, 8).toUpperCase()}.MP4]` : `ImageViewer.exe - [STORY_${story.id?.slice(0, 8).toUpperCase()}.JPG]`}
                  </span>
                </div>
                <div className="win98-title-controls" style={{ display: 'flex', gap: '2px' }}>
                  <button className="win98-title-btn" style={{ fontSize: '10px', color: '#000' }}>_</button>
                  <button className="win98-title-btn" style={{ fontSize: '10px', color: '#000' }}>□</button>
                  <button className="win98-title-btn is-close" style={{ fontSize: '10px', color: '#000' }}>✕</button>
                </div>
              </div>

              {/* Classic Win98 Menu Bar */}
              <div style={{
                display: 'flex',
                gap: '12px',
                padding: '2px 6px',
                backgroundColor: '#c0c0c0',
                borderBottom: '1px solid #808080',
                boxShadow: '0 1px 0 #ffffff',
                fontSize: '11px',
                color: '#000000',
                userSelect: 'none',
              }}>
                <span><u>F</u>ile</span>
                <span><u>E</u>dit</span>
                <span><u>V</u>iew</span>
                <span><u>P</u>lay</span>
                <span><u>H</u>elp</span>
              </div>

              {/* 3D Sunken Black Canvas Viewport */}
              <div style={{
                backgroundColor: '#000000',
                margin: '2px',
                border: '1px solid #000000',
                boxShadow: 'inset 1px 1px #808080, inset -1px -1px #dfdfdf, inset 2px 2px #000, inset -2px -2px #ffffff',
                position: 'relative',
                overflow: 'hidden',
              }}>
                {story.is_ai_generated && settings.showAITags && (
                  <div style={{
                    position: 'absolute', top: '8px', right: '8px', zIndex: 50,
                    background: 'rgba(0,0,0,0.6)', border: '1px solid #00ff66',
                    color: '#00ff66', fontSize: '10px', fontWeight: 800, padding: '2px 6px',
                    fontFamily: 'monospace',
                  }}>
                    ✨ AI MEDIA
                  </div>
                )}
                {story.primary_view === 'reel' && story.og_reel_url ? (
                   <StoryPlayer story={{ ...story, media_url: story.og_reel_url, media_type: 2 }} isMusicPlaying={isMusicPlaying} />
                ) : (
                   <StoryPlayer story={story} isMusicPlaying={isMusicPlaying} />
                )}
              </div>

              {/* Classic Bottom Status Ribbon */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '2px 4px',
                backgroundColor: '#c0c0c0',
                fontSize: '11px',
                color: '#000000',
                gap: '4px',
              }}>
                <div style={{
                  flex: 1,
                  boxShadow: 'inset 1px 1px #808080, inset -1px -1px #ffffff',
                  padding: '1px 6px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  fontSize: '10px',
                }}>
                  {isVideo ? '▶ Stream Active' : '🖼️ Static Frame'}
                </div>
                <div style={{
                  boxShadow: 'inset 1px 1px #808080, inset -1px -1px #ffffff',
                  padding: '1px 6px',
                  fontWeight: 'bold',
                  fontFamily: 'monospace',
                  fontSize: '10px',
                }}>
                  {story.width && story.height ? `${story.width}x${story.height}` : '720x1280'}
                </div>
              </div>
            </div>
          ) : (
            /* Modern Theme Application Window Frame */
            <div style={{
              borderRadius: '20px',
              overflow: 'hidden',
              boxShadow: '0 20px 50px rgba(0,0,0,0.5), 0 0 0 1px var(--ios-border)',
              border: '1px solid var(--ios-border)',
              backgroundColor: '#000',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
            }}>
              {/* Sleek App Window Header */}
              <div style={{
                padding: '8px 14px',
                backgroundColor: 'rgba(255,255,255,0.05)',
                backdropFilter: 'blur(10px)',
                borderBottom: '1px solid var(--ios-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--ios-text-secondary)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ display: 'flex', gap: '5px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ff5f56' }}></span>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ffbd2e' }}></span>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#27c93f' }}></span>
                  </div>
                  <span style={{ marginLeft: '6px', fontSize: '11px', color: 'var(--ios-text-primary)' }}>
                    {isVideo ? 'Video Player' : 'Photo Viewer'}
                  </span>
                </div>
                <span style={{ fontSize: '10px', opacity: 0.7 }}>
                  {story.width && story.height ? `${story.width}×${story.height}` : 'HD'}
                </span>
              </div>

              <div style={{ position: 'relative' }}>
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
            </div>
          )}
          
          {(story.is_reel || story.og_reel_media_id) && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '16px' }}>
              <div className="segmented-container segment-group" style={{ background: 'var(--ios-bg-card)', borderRadius: '20px', padding: '4px', display: 'flex', gap: '4px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                <button
                  onClick={async () => {
                    setStory(s => ({...s, primary_view: 'story'}));
                    try { await updateStory(id, { primary_view: 'story' }); } catch (e) {}
                  }}
                  className={`segment-btn ${story.primary_view !== 'reel' ? 'active' : ''}`}
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
                  className={`segment-btn ${story.primary_view === 'reel' ? 'active' : ''}`}
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
            <div style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', zIndex: 10 }}>
              <motion.button
                whileHover={{ scale: 1.15, x: -2 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => navigate(`/story/${adjacent.prev_id}`, { replace: true })}
                style={{ background: 'rgba(30, 30, 32, 0.75)', backdropFilter: 'blur(20px) saturate(180%)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ios-text-primary)', cursor: 'pointer', boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}
              >
                <ChevronLeft size={22} />
              </motion.button>
            </div>
          )}
          
          {adjacent.next_id && (
            <div style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', zIndex: 10 }}>
              <motion.button
                whileHover={{ scale: 1.15, x: 2 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => navigate(`/story/${adjacent.next_id}`, { replace: true })}
                style={{ background: 'rgba(30, 30, 32, 0.75)', backdropFilter: 'blur(20px) saturate(180%)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ios-text-primary)', cursor: 'pointer', boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}
              >
                <ChevronRight size={22} />
              </motion.button>
            </div>
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

          <div style={{ position: 'relative' }}>
            <AnimatePresence>
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15 }}
              >
              {/* ── Metadata Tab ──────────────── */}
              {activeTab === 'metadata' && (
                <div>
                  <InfoRow icon={Calendar} label="Date" value={`${date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} at ${date.toLocaleTimeString()}`} />
                  <InfoRow icon={FileType} label="Type" value={`${isVideo ? 'Video' : 'Photo'}${story.width && story.height ? ` · ${story.width}×${story.height}` : ''}${story.duration_ms ? ` · ${(story.duration_ms / 1000).toFixed(1)}s` : ''}`} />
                  
                  <InfoRow icon={MapPin} label="Location" value={story.location_name || <span style={{ color: 'var(--ios-text-muted)' }}>No location</span>}>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                      <button 
                        onClick={() => setIsLocationModalOpen(true)} 
                        className="segment-btn"
                        style={{
                          padding: '3px 10px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: 600,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          cursor: 'pointer',
                          color: 'var(--ios-accent)'
                        }}
                      >
                        <Edit3 size={13} />
                        <span>Edit Location</span>
                      </button>
                      
                      {story.location_lat && story.location_lng && (
                        <button
                          onClick={() => setIsStreetViewOpen(true)}
                          className="segment-btn"
                          style={{
                            padding: '3px 10px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: 600,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            cursor: 'pointer',
                            color: 'var(--ios-accent)'
                          }}
                        >
                          <Compass size={13} />
                          <span>View Street View</span>
                        </button>
                      )}
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

                  {story.is_close_friends && (
                    <InfoRow icon={Star} label="Close Friends Audience" value="">
                      <div style={{ fontSize: '13px', color: '#00D26A', fontWeight: 600, marginTop: '4px' }}>
                        ⭐ Shared exclusively with Close Friends
                      </div>
                      {story.audience_snapshot && story.audience_snapshot.length > 0 ? (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                          {story.audience_snapshot.map((u, i) => (
                            <span key={i} style={{ background: 'rgba(0,210,106,0.15)', color: '#00D26A', padding: '3px 8px', borderRadius: '8px', fontSize: '12px', fontWeight: 600 }}>
                              @{u}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <div style={{ fontSize: '12px', color: 'var(--ios-text-secondary)', marginTop: '4px' }}>
                          Audience snapshot protected.
                        </div>
                      )}
                    </InfoRow>
                  )}

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
                <div>
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
                <div>
                  {/* Viewers & Likes Control Header */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid var(--ios-border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '15px', fontWeight: 700 }}>{viewers.length} {viewers.length === 1 ? 'Viewer' : 'Viewers'}</span>
                      {viewers.filter(v => v.has_liked).length > 0 && (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '4px',
                          background: 'rgba(255, 45, 85, 0.15)', color: '#ff2d55',
                          padding: '3px 8px', borderRadius: '10px', fontSize: '12px', fontWeight: 700
                        }}>
                          ❤️ {viewers.filter(v => v.has_liked).length} {viewers.filter(v => v.has_liked).length === 1 ? 'Like' : 'Likes'}
                        </span>
                      )}
                    </div>
                    <button 
                      onClick={async () => {
                        try {
                          setRefreshingViewers(true)
                          const data = await refreshStoryViewers(id)
                          const fresh = await getStoryViewers(id)
                          setViewers(fresh)
                          setStory(prev => ({ ...prev, viewer_count: data.viewer_count, like_count: data.like_count }))
                        } catch (err) {
                          alert(`Could not refresh viewers: ${err.message}`)
                        } finally {
                          setRefreshingViewers(false)
                        }
                      }}
                      disabled={refreshingViewers}
                      className="ios-btn-secondary"
                      style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
                    >
                      <RefreshCw size={13} className={refreshingViewers ? "spin-anim" : ""} />
                      {refreshingViewers ? "Syncing..." : "Refresh Live"}
                    </button>
                  </div>

                  {viewers.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {viewers.map((v) => (
                        <div 
                          key={v.id} 
                          style={{ 
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
                            padding: '10px 12px', borderRadius: '12px',
                            background: 'var(--ios-bg-card, rgba(255,255,255,0.03))',
                            border: '1px solid var(--ios-border)',
                            transition: 'all 0.2s ease',
                          }}
                        >
                          <a
                            href={`https://www.instagram.com/${v.username}/`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'flex', alignItems: 'center', gap: '12px',
                              textDecoration: 'none', color: 'inherit',
                              flex: 1, minWidth: 0,
                            }}
                            title={`Open @${v.username} on Instagram`}
                          >
                            {v.profile_pic_url ? (
                              <img 
                                src={`/api/v1/proxy/image?url=${encodeURIComponent(v.profile_pic_url)}`} 
                                alt={v.username}
                                referrerPolicy="no-referrer"
                                onError={(e) => {
                                  // Fallback to direct URL or icon if proxy fails
                                  if (e.target.src.includes('/api/v1/proxy/image')) {
                                    e.target.src = v.profile_pic_url;
                                  } else {
                                    e.target.style.display = 'none';
                                    if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                                  }
                                }}
                                style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', border: '1.5px solid var(--ios-border)' }} 
                              />
                            ) : null}
                            <div style={{
                              width: 44, height: 44, borderRadius: '50%',
                              background: 'var(--ios-border)', display: v.profile_pic_url ? 'none' : 'flex',
                              alignItems: 'center', justifyContent: 'center'
                            }}>
                              <Users size={20} color="var(--ios-text-secondary)" />
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontWeight: 700, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--ios-text-primary)', flexWrap: 'wrap' }}>
                                @{v.username}
                                <ExternalLink size={13} style={{ color: 'var(--ios-accent)', opacity: 0.8 }} />
                                {v.view_count > 1 && (
                                  <span 
                                    style={{
                                      display: 'inline-flex', alignItems: 'center', gap: '3px',
                                      background: 'rgba(10, 132, 255, 0.15)',
                                      color: 'var(--ios-accent, #007aff)',
                                      border: '1px solid rgba(10, 132, 255, 0.35)',
                                      padding: '1px 7px', borderRadius: '10px',
                                      fontSize: '11px', fontWeight: 800, letterSpacing: '0.2px'
                                    }}
                                    title={`Watched this story ${v.view_count} times`}
                                  >
                                    <Eye size={11} /> {v.view_count}×
                                  </span>
                                )}
                              </div>
                              {v.full_name && <div style={{ fontSize: '12px', color: 'var(--ios-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.full_name}</div>}
                            </div>
                          </a>

                          {v.has_liked ? (
                            <div style={{
                              display: 'flex', alignItems: 'center', gap: '6px',
                              background: 'linear-gradient(135deg, rgba(255, 45, 85, 0.2), rgba(255, 45, 85, 0.08))',
                              border: '1px solid rgba(255, 45, 85, 0.4)',
                              color: '#ff2d55', padding: '6px 12px', borderRadius: '20px',
                              fontSize: '12px', fontWeight: 800, flexShrink: 0,
                              boxShadow: '0 2px 8px rgba(255, 45, 85, 0.25)'
                            }}>
                              <Heart size={15} fill="#ff2d55" color="#ff2d55" />
                              <span>Liked</span>
                            </div>
                          ) : (
                            <div 
                              style={{ 
                                display: 'flex', alignItems: 'center', gap: '4px', 
                                opacity: 0.3, padding: '6px 8px', flexShrink: 0,
                                color: 'var(--ios-text-secondary)'
                              }} 
                              title="Viewed (not liked)"
                            >
                              <Heart size={16} />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--ios-text-secondary)' }}>
                      <Eye size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
                      <div>No viewer data available yet.</div>
                      <div style={{ fontSize: '12px', marginTop: '6px', color: 'var(--ios-text-secondary)' }}>
                        Click "Refresh Live" above while the story is active on Instagram.
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── Manifest Tab (Era-Appropriate Syntax Code) ── */}
              {activeTab === 'manifest' && (
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, paddingBottom: '16px' }}>
                  <SyntaxJsonViewer
                    data={story}
                    filename={`STORY_${story.id?.slice(0, 8).toUpperCase()}.JSON`}
                  />
                </div>
              )}

              {/* ── Journal Tab ───────────────── */}
              {activeTab === 'journal' && (
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                  {isWin98 ? (
                    /* Windows 98 Notepad / WordPad Window Style */
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      backgroundColor: '#c0c0c0',
                      border: '1px solid #000000',
                      boxShadow: 'inset 1px 1px #ffffff, inset -1px -1px #808080',
                      fontFamily: '"MS Sans Serif", Tahoma, Arial, sans-serif',
                      fontSize: '11px',
                      color: '#000000',
                    }}>
                      {/* Notepad Title Bar */}
                      <div style={{
                        background: 'linear-gradient(90deg, #000080 0%, #1084d0 100%)',
                        color: '#ffffff',
                        fontWeight: 'bold',
                        padding: '2px 4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '11px',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <FileText size={12} color="#ffffff" />
                          <span>Notepad.exe - [JOURNAL_NOTE.TXT]</span>
                        </div>
                        <button
                          onClick={handleSaveJournal}
                          disabled={savingJournal || journalNote === story.journal_note}
                          style={{
                            backgroundColor: '#c0c0c0',
                            border: '1px solid #000',
                            boxShadow: 'inset 1px 1px #fff, inset -1px -1px #808080',
                            padding: '1px 8px',
                            fontSize: '10px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            color: '#000000',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          {journalNote === story.journal_note && story.journal_note ? <Check size={10} color="#008000" /> : <Save size={10} />}
                          <span>{savingJournal ? 'Saving...' : (journalNote === story.journal_note && story.journal_note ? 'Saved' : 'Save Note')}</span>
                        </button>
                      </div>

                      {/* Notepad Menu Bar */}
                      <div style={{
                        display: 'flex',
                        gap: '12px',
                        padding: '2px 6px',
                        backgroundColor: '#c0c0c0',
                        borderBottom: '1px solid #808080',
                        boxShadow: '0 1px 0 #ffffff',
                        fontSize: '11px',
                        color: '#000000',
                        userSelect: 'none',
                      }}>
                        <span><u>F</u>ile</span>
                        <span><u>E</u>dit</span>
                        <span><u>F</u>ormat</span>
                        <span><u>H</u>elp</span>
                      </div>

                      {/* Sunken Notepad Paper Area */}
                      <div style={{
                        backgroundColor: '#ffffff',
                        border: '1px solid #000000',
                        boxShadow: 'inset 1px 1px #808080, inset -1px -1px #dfdfdf, inset 2px 2px #000, inset -2px -2px #ffffff',
                        margin: '2px',
                        padding: '8px',
                        minHeight: '360px',
                        display: 'flex',
                      }}>
                        <textarea
                          value={journalNote}
                          onChange={(e) => setJournalNote(e.target.value)}
                          placeholder="Reflect on this memory... where were you, how did you feel, what made this moment special?"
                          style={{
                            width: '100%',
                            flex: 1,
                            minHeight: '340px',
                            backgroundColor: 'transparent',
                            border: 'none',
                            outline: 'none',
                            color: '#000000',
                            fontFamily: '"Lucida Console", "Courier New", Courier, monospace',
                            fontSize: '12px',
                            lineHeight: 1.5,
                            resize: 'none',
                          }}
                        />
                      </div>

                      {/* Status Bar */}
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '2px 6px',
                        backgroundColor: '#c0c0c0',
                        fontSize: '10px',
                        color: '#000',
                      }}>
                        <div style={{ flex: 1, boxShadow: 'inset 1px 1px #808080, inset -1px -1px #fff', padding: '1px 6px' }}>
                          Characters: {journalNote?.length || 0}
                        </div>
                        <div style={{ marginLeft: '4px', boxShadow: 'inset 1px 1px #808080, inset -1px -1px #fff', padding: '1px 6px', fontFamily: 'monospace' }}>
                          ANSI Windows
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Modern Theme Journal View */
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--ios-text-secondary)', fontSize: '14px', textTransform: 'uppercase' }}>
                          Meaning-Making Journal
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
                          {journalNote === story.journal_note && story.journal_note ? <Check size={16} /> : <Save size={16} />}
                          {savingJournal ? 'Saving...' : (journalNote === story.journal_note && story.journal_note ? 'Saved' : 'Save Note')}
                        </button>
                      </div>
                      
                      {settings.editorStyle === 'modern' ? (
                        <div style={{
                          flex: 1,
                          background: 'var(--ios-bg-card)',
                          borderRadius: '16px',
                          padding: '16px',
                          border: '1px solid var(--ios-border)',
                          display: 'flex',
                          flexDirection: 'column',
                        }}>
                          <textarea
                            value={journalNote}
                            onChange={(e) => setJournalNote(e.target.value)}
                            placeholder="Reflect on this memory... where were you, how did you feel, what made this moment special?"
                            style={{
                              width: '100%',
                              flex: 1,
                              minHeight: '350px',
                              background: 'transparent',
                              border: 'none',
                              outline: 'none',
                              color: 'var(--ios-text-primary)',
                              fontSize: '14px',
                              lineHeight: 1.6,
                              resize: 'none',
                              fontFamily: 'inherit',
                            }}
                          />
                        </div>
                      ) : (
                        <div 
                          data-color-mode={document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark'} 
                          style={{ 
                            flex: 1, 
                            display: 'flex', 
                            flexDirection: 'column', 
                            minHeight: '400px', 
                            borderRadius: settings.editorStyle === 'invisible' ? '0' : '12px', 
                            overflow: 'hidden', 
                            border: settings.editorStyle === 'invisible' ? 'none' : '1px solid var(--ios-border)',
                            backgroundColor: 'var(--ios-bg-card)'
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
                      )}
                    </>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
      
      <LocationModal 
        isOpen={isLocationModalOpen} 
        onClose={() => setIsLocationModalOpen(false)} 
        onSave={handleSaveLocation}
        initialLocation={story.location_name ? { name: story.location_name, lat: story.location_lat, lng: story.location_lng } : null}
      />

      <StreetViewModal
        isOpen={isStreetViewOpen}
        onClose={() => setIsStreetViewOpen(false)}
        locationName={story.location_name}
        lat={story.location_lat}
        lng={story.location_lng}
        onUpdateLocation={handleSaveLocation}
      />
    </motion.div>
  )
}
