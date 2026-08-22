import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  BookOpen, MapPin, Plus, CheckSquare, Square, Trash2, 
  Calendar, Edit3, Sparkles, Image, Video, Palette, 
  Search, ExternalLink, ChevronRight, Save, Clock, Compass, Bookmark
} from 'lucide-react'
import { getStories, getStory, updateStory } from '../services/api'
import { getSettings } from '../services/settings'
import { playWin98Click } from '../services/win98Audio'
import MSPaintModal from '../components/MSPaintModal'
import MDEditor from '@uiw/react-md-editor'
import { useNavigate } from 'react-router-dom'

const CUSTOM_STICKER_SETS = [
  { id: 'stamp_vault', label: 'VAULT SEAL', bg: '#A20025', text: 'MEMWAULT ARCHIVE', icon: '🏛️' },
  { id: 'stamp_loc', label: 'PASSPORT', bg: '#0050EF', text: 'VERIFIED LOCATION', icon: '✈️' },
  { id: 'stamp_sound', label: 'VINYL', bg: '#1DB954', text: 'SOUNDTRACK 33⅓', icon: '🎵' },
  { id: 'stamp_date', label: 'TIMECODE', bg: '#FA6800', text: 'ON THIS DAY', icon: '⏳' },
  { id: 'stamp_polaroid', label: 'POLAROID', bg: '#E8E8E8', text: 'ORIGINAL SHOT', icon: '📸', darkText: true },
  { id: 'stamp_fav', label: 'FAVORITE', bg: '#D80073', text: 'CORE MEMORY', icon: '💖' },
]

function getMediaUrl(item) {
  if (!item) return ''
  if (item.media_items && item.media_items.length > 0) {
    const first = item.media_items[0]
    return first.display_url || first.media_url || first.instagram_media_url || first.raw_media_url || ''
  }
  return item.display_url || item.media_url || item.instagram_media_url || item.raw_media_url || ''
}

export default function JournalApp() {
  const [activeTab, setActiveTab] = useState('memories') // 'memories' | 'places'
  const [allStories, setAllStories] = useState([])
  const [selectedStory, setSelectedStory] = useState(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [isPaintOpen, setIsPaintOpen] = useState(false)
  const [isPickerOpen, setIsPickerOpen] = useState(false)
  const [pickerSearch, setPickerSearch] = useState('')
  const [journalText, setJournalText] = useState('')
  const [doodles, setDoodles] = useState([])
  const [saving, setSaving] = useState(false)
  const [placedStickers, setPlacedStickers] = useState([])
  const scrapbookRef = useRef(null)

  // Places to Visit state
  const [places, setPlaces] = useState(() => {
    const saved = localStorage.getItem('memwault_places_to_visit')
    return saved ? JSON.parse(saved) : [
      { id: '1', title: 'See the Northern Lights in Tromsø', location: 'Norway', category: 'Nature', completed: false, notes: 'Plan for winter months (Dec-Feb)' },
      { id: '2', title: 'Explore Fushimi Inari Shrine at Dawn', location: 'Kyoto, Japan', category: 'Culture', completed: false, notes: 'Walk the thousand vermilion torii gates early morning.' },
      { id: '3', title: 'Road trip across Amalfi Coast', location: 'Italy', category: 'Roadtrip', completed: true, notes: 'Stay in Positano, rent a classic car.' }
    ]
  })
  const [newPlaceTitle, setNewPlaceTitle] = useState('')
  const [newPlaceLocation, setNewPlaceLocation] = useState('')
  const [newPlaceCategory, setNewPlaceCategory] = useState('Travel')

  const settings = getSettings()
  const isWin98 = settings.themeId === 'win98'
  const navigate = useNavigate()

  useEffect(() => {
    loadStories()
  }, [])

  const loadStories = async () => {
    try {
      setLoading(true)
      const data = await getStories({ pageSize: 200 })
      const list = Array.isArray(data) ? data : (data?.stories || data?.items || [])
      setAllStories(list)

      // Filter only stories that have journal notes or doodles
      const journalItems = list.filter(s => 
        (s.journal_note && s.journal_note.trim().length > 0) || 
        Boolean(localStorage.getItem(`memwault_doodles_${s.id}`))
      )

      if (journalItems.length > 0) {
        selectStoryItem(journalItems[0])
      } else if (list.length > 0) {
        // If none have journals, don't force select, leave ready for "+ New Entry"
        setSelectedStory(null)
      }
    } catch (err) {
      console.error('Failed to load stories:', err)
      setAllStories([])
    } finally {
      setLoading(false)
    }
  }

  const selectStoryItem = async (story) => {
    setSelectedStory(story)
    try {
      const full = await getStory(story.id)
      let note = full?.journal_note || story.journal_note || ''
      const stickerMatch = note.match(/\n\nStickers:\s*(.*)/)
      let extractedStickers = []
      if (stickerMatch) {
        const stickerTexts = stickerMatch[1].split(' • ')
        extractedStickers = CUSTOM_STICKER_SETS.filter(s => stickerTexts.includes(s.text))
        note = note.replace(/\n\nStickers:\s*(.*)/, '')
      }
      setJournalText(note)
      setPlacedStickers(extractedStickers)
      // Load any stored doodles
      const savedDoodles = localStorage.getItem(`memwault_doodles_${story.id}`)
      setDoodles(savedDoodles ? JSON.parse(savedDoodles) : [])
    } catch (e) {
      let note = story.journal_note || ''
      const stickerMatch = note.match(/\n\nStickers:\s*(.*)/)
      let extractedStickers = []
      if (stickerMatch) {
        const stickerTexts = stickerMatch[1].split(' • ')
        extractedStickers = CUSTOM_STICKER_SETS.filter(s => stickerTexts.includes(s.text))
        note = note.replace(/\n\nStickers:\s*(.*)/, '')
      }
      setJournalText(note)
      setPlacedStickers(extractedStickers)
      setDoodles([])
    }
  }

  const handleSaveJournal = async () => {
    if (!selectedStory) return
    if (isWin98) playWin98Click()
    setSaving(true)
    try {
      let fullNote = journalText
      if (placedStickers.length > 0) {
        fullNote += `\n\nStickers: ${placedStickers.map(s => s.text).join(' • ')}`
      }
      await updateStory(selectedStory.id, { journal_note: fullNote })
      // Save doodles
      localStorage.setItem(`memwault_doodles_${selectedStory.id}`, JSON.stringify(doodles))
      
      // Update local allStories item
      setAllStories(prev => prev.map(s => s.id === selectedStory.id ? { ...s, journal_note: fullNote } : s))
      setSelectedStory(prev => prev ? { ...prev, journal_note: fullNote } : null)
      alert('Journal saved successfully!')
    } catch (err) {
      alert('Failed to save journal note: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleSaveDoodle = (dataUrl) => {
    const updated = [...doodles, { id: Date.now(), url: dataUrl, date: new Date().toISOString() }]
    setDoodles(updated)
    if (selectedStory) {
      localStorage.setItem(`memwault_doodles_${selectedStory.id}`, JSON.stringify(updated))
    }
  }

  const handleAddPlace = (e) => {
    e.preventDefault()
    if (!newPlaceTitle.trim()) return
    if (isWin98) playWin98Click()
    const newEntry = {
      id: Date.now().toString(),
      title: newPlaceTitle.trim(),
      location: newPlaceLocation.trim() || 'Worldwide',
      category: newPlaceCategory,
      completed: false,
      notes: ''
    }
    const updated = [newEntry, ...places]
    setPlaces(updated)
    localStorage.setItem('memwault_places_to_visit', JSON.stringify(updated))
    setNewPlaceTitle('')
    setNewPlaceLocation('')
  }

  const togglePlaceCompleted = (id) => {
    if (isWin98) playWin98Click()
    const updated = places.map(p => p.id === id ? { ...p, completed: !p.completed } : p)
    setPlaces(updated)
    localStorage.setItem('memwault_places_to_visit', JSON.stringify(updated))
  }

  const deletePlace = (id) => {
    if (isWin98) playWin98Click()
    const updated = places.filter(p => p.id !== id)
    setPlaces(updated)
    localStorage.setItem('memwault_places_to_visit', JSON.stringify(updated))
  }

  // Active journal stories (only those with notes or doodles, plus selectedStory if currently being drafted)
  const activeJournalStories = allStories.filter(s => 
    (s.journal_note && s.journal_note.trim().length > 0) || 
    Boolean(localStorage.getItem(`memwault_doodles_${s.id}`)) ||
    (selectedStory && selectedStory.id === s.id)
  )

  const filteredJournalStories = activeJournalStories.filter(s => 
    (s.location_name && s.location_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (s.caption_text && s.caption_text.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (s.journal_note && s.journal_note.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (!searchQuery)
  )

  const filteredPickerStories = allStories.filter(s =>
    (s.location_name && s.location_name.toLowerCase().includes(pickerSearch.toLowerCase())) ||
    (s.caption_text && s.caption_text.toLowerCase().includes(pickerSearch.toLowerCase())) ||
    (!pickerSearch)
  )

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: 'calc(100vh - 110px)',
      boxSizing: 'border-box',
      fontFamily: isWin98 ? '"MS Sans Serif", Tahoma, Arial, sans-serif' : 'inherit',
      fontSize: isWin98 ? '11px' : 'inherit',
    }}>
      {/* ── App Navigation Bar ─────────────────────────────── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: isWin98 ? '6px 10px' : '12px 18px',
        backgroundColor: isWin98 ? '#c0c0c0' : 'var(--ios-bg-card)',
        borderBottom: isWin98 ? '1px solid #808080' : '1px solid var(--ios-border)',
        borderRadius: isWin98 ? '0' : '16px 16px 0 0',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <BookOpen size={isWin98 ? 16 : 20} color="var(--ios-accent, #007aff)" />
          <h2 style={{ margin: 0, fontSize: isWin98 ? '13px' : '18px', fontWeight: 700 }}>
            {isWin98 ? 'MemJournal98 - Personal Memory & Travel Log' : 'Memory Journal & Travel Planner'}
          </h2>
        </div>

        {/* Tab Switcher */}
        <div className="segmented-container segment-group">
          <button
            onClick={() => { if (isWin98) playWin98Click(); setActiveTab('memories'); }}
            className={`segment-btn ${activeTab === 'memories' ? 'active' : ''}`}
          >
            📓 Memory Journals
          </button>
          <button
            onClick={() => { if (isWin98) playWin98Click(); setActiveTab('places'); }}
            className={`segment-btn ${activeTab === 'places' ? 'active' : ''}`}
          >
            ✈️ Places to Visit & Bucket List
          </button>
        </div>
      </div>

      {/* ── Tab 1: Memory Journals Split View ──────────────── */}
      {activeTab === 'memories' && (
        <div style={{
          display: 'flex',
          flex: 1,
          overflow: 'hidden',
          backgroundColor: isWin98 ? '#808080' : 'var(--ios-bg-app)',
          padding: isWin98 ? '4px' : '12px',
          gap: '8px',
        }}>
          {/* Left Feed / Story List */}
          <div style={{
            width: '320px',
            backgroundColor: isWin98 ? '#ffffff' : 'var(--ios-bg-card)',
            border: isWin98 ? '1px solid #000' : '1px solid var(--ios-border)',
            boxShadow: isWin98 ? 'inset 1px 1px #808080, inset -1px -1px #fff' : 'none',
            borderRadius: isWin98 ? '0' : '14px',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}>
            {/* Header with Search and "+ New Entry" button */}
            <div style={{
              padding: '8px',
              borderBottom: isWin98 ? '1px solid #808080' : '1px solid var(--ios-border)',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: isWin98 ? '11px' : '12px', fontWeight: 700, color: 'var(--ios-text-secondary)' }}>
                  Journal Entries ({filteredJournalStories.length})
                </span>
                <button
                  onClick={() => {
                    if (isWin98) playWin98Click()
                    setIsPickerOpen(true)
                  }}
                  className={isWin98 ? "win98-standard-btn" : "ios-btn"}
                  style={{
                    padding: isWin98 ? '2px 8px' : '4px 10px',
                    fontSize: isWin98 ? '10px' : '11px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    backgroundColor: isWin98 ? '#c0c0c0' : 'var(--ios-accent)',
                    color: isWin98 ? '#000' : '#fff'
                  }}
                  title="Pick a memory to create a new journal entry"
                >
                  <Plus size={12} />
                  <span>New Entry</span>
                </button>
              </div>

              {/* Search Filter */}
              <div style={{ display: 'flex', alignItems: 'center', backgroundColor: isWin98 ? '#fff' : 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: isWin98 ? '0' : '8px', border: isWin98 ? '1px solid #808080' : 'none' }}>
                <Search size={13} color="#888" style={{ marginRight: '6px' }} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search journal entries..."
                  style={{
                    border: 'none',
                    outline: 'none',
                    background: 'transparent',
                    width: '100%',
                    fontSize: isWin98 ? '11px' : '12px',
                    color: 'inherit',
                  }}
                />
              </div>
            </div>

            {/* List Viewport */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '4px' }}>
              {filteredJournalStories.length === 0 ? (
                <div style={{ padding: '36px 14px', textAlign: 'center', color: '#888' }}>
                  <Edit3 size={28} style={{ margin: '0 auto 10px auto', opacity: 0.5 }} />
                  <div style={{ fontSize: isWin98 ? '11px' : '12px', fontWeight: 600, marginBottom: '4px', color: isWin98 ? '#000' : 'inherit' }}>
                    No Journal Entries
                  </div>
                  <div style={{ fontSize: '10px', marginBottom: '12px', lineHeight: 1.4 }}>
                    Click "+ New Entry" to select any memory and add your thoughts.
                  </div>
                  <button
                    onClick={() => {
                      if (isWin98) playWin98Click()
                      setIsPickerOpen(true)
                    }}
                    className={isWin98 ? "win98-standard-btn" : "ios-btn"}
                    style={{ padding: '4px 10px', fontSize: '11px' }}
                  >
                    + Pick a Memory
                  </button>
                </div>
              ) : (
                filteredJournalStories.map(story => {
                  const isSelected = selectedStory?.id === story.id
                  return (
                    <div
                      key={story.id}
                      onClick={() => {
                        if (isWin98) playWin98Click()
                        selectStoryItem(story)
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '6px',
                        marginBottom: '4px',
                        cursor: 'pointer',
                        backgroundColor: isSelected ? (isWin98 ? '#000080' : 'var(--ios-accent)') : 'transparent',
                        color: isSelected ? '#ffffff' : 'inherit',
                        borderRadius: isWin98 ? '0' : '8px',
                      }}
                    >
                      <div style={{ width: '38px', height: '50px', borderRadius: isWin98 ? '0' : '6px', overflow: 'hidden', backgroundColor: '#333', flexShrink: 0 }}>
                        <img src={getMediaUrl(story)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: isWin98 ? '11px' : '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {story.location_name || new Date(story.taken_at).toLocaleDateString()}
                        </div>
                        <div style={{ fontSize: isWin98 ? '10px' : '11px', opacity: 0.8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {story.journal_note || story.caption_text || `${new Date(story.taken_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Right Editor & Media Preview Pane */}
          {selectedStory ? (
            <div style={{
              flex: 1,
              backgroundColor: isWin98 ? '#c0c0c0' : 'var(--ios-bg-card)',
              border: isWin98 ? '1px solid #000' : '1px solid var(--ios-border)',
              boxShadow: isWin98 ? 'inset 1px 1px #fff, inset -1px -1px #808080' : 'none',
              borderRadius: isWin98 ? '0' : '14px',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              padding: isWin98 ? '6px' : '16px',
              gap: '10px',
            }}>
              {/* Media Preview & Metadata Ribbon */}
              <div style={{
                display: 'flex',
                gap: '12px',
                backgroundColor: isWin98 ? '#ffffff' : 'var(--ios-bg-app)',
                padding: '8px',
                border: isWin98 ? '1px solid #000' : '1px solid var(--ios-border)',
                boxShadow: isWin98 ? 'inset 1px 1px #808080, inset -1px -1px #fff' : 'none',
                borderRadius: isWin98 ? '0' : '10px',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '48px', height: '64px', borderRadius: isWin98 ? '0' : '6px', overflow: 'hidden', backgroundColor: '#000' }}>
                    {selectedStory.media_type === 2 ? (
                      <video src={getMediaUrl(selectedStory)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} autoPlay loop muted playsInline />
                    ) : (
                      <img src={getMediaUrl(selectedStory)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    )}
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: isWin98 ? '13px' : '16px', fontWeight: 700 }}>
                      {selectedStory.location_name || 'Archived Story'}
                    </h3>
                    <div style={{ fontSize: isWin98 ? '10px' : '12px', color: isWin98 ? '#555' : 'var(--ios-text-secondary)' }}>
                      Captured {new Date(selectedStory.taken_at).toLocaleString()}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    onClick={() => setIsPaintOpen(true)}
                    className="segment-btn"
                    title="Open MS Paint to doodle or connect tablet"
                    style={{
                      padding: '4px 10px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      color: '#000080',
                      fontWeight: 'bold',
                    }}
                  >
                    <Palette size={13} />
                    <span>🎨 Draw Doodle (MS Paint)</span>
                  </button>

                  <button
                    onClick={handleSaveJournal}
                    disabled={saving}
                    className="segment-btn"
                    style={{
                      padding: '4px 12px',
                      backgroundColor: '#000080',
                      color: '#fff',
                      fontWeight: 'bold',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Save size={13} />
                    <span>{saving ? 'Saving...' : 'Save Journal'}</span>
                  </button>
                </div>
              </div>

              {/* Doodles Gallery (if any) */}
              {doodles.length > 0 && (
                <div style={{
                  display: 'flex',
                  gap: '8px',
                  alignItems: 'center',
                  padding: '6px 8px',
                  backgroundColor: isWin98 ? '#e0e0e0' : 'rgba(255,255,255,0.03)',
                  border: isWin98 ? '1px solid #808080' : '1px solid var(--ios-border)',
                  overflowX: 'auto',
                }}>
                  <span style={{ fontWeight: 'bold', fontSize: '10px', color: '#000080' }}>Doodles:</span>
                  {doodles.map((d, i) => (
                    <img
                      key={d.id || i}
                      src={d.url}
                      alt="Doodle"
                      style={{
                        height: '42px',
                        border: '1px solid #000',
                        backgroundColor: '#fff',
                        cursor: 'pointer',
                      }}
                      title={`Doodle ${i + 1}`}
                    />
                  ))}
                </div>
              )}

              {/* Interactive Scrapbook Canvas */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                backgroundColor: isWin98 ? '#e0e0e0' : 'rgba(255,255,255,0.03)',
                padding: '8px',
                border: isWin98 ? '1px solid #808080' : '1px solid var(--ios-border)',
                borderRadius: isWin98 ? '0' : '10px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', fontWeight: 'bold', color: isWin98 ? '#000080' : 'var(--ios-text-secondary)' }}>
                    Scrapbook Canvas (Drag Stickers Here)
                  </span>
                </div>
                
                <div
                  ref={scrapbookRef}
                  style={{
                    width: '100%',
                    height: '240px',
                    backgroundColor: '#000',
                    position: 'relative',
                    overflow: 'hidden',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {selectedStory.media_type === 2 ? (
                    <video src={getMediaUrl(selectedStory)} style={{ width: '100%', height: '100%', objectFit: 'contain', opacity: 0.8 }} autoPlay loop muted playsInline />
                  ) : (
                    <img src={getMediaUrl(selectedStory)} style={{ width: '100%', height: '100%', objectFit: 'contain', opacity: 0.8 }} />
                  )}
                  {placedStickers.map((stk, idx) => (
                    <motion.div
                      key={idx}
                      drag
                      dragConstraints={scrapbookRef}
                      whileDrag={{ scale: 1.18, zIndex: 100 }}
                      style={{
                        position: 'absolute',
                        backgroundColor: stk.bg,
                        color: stk.darkText ? '#000' : '#FFF',
                        padding: '4px 10px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 800,
                        cursor: 'grab',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        letterSpacing: '0.04em',
                      }}
                    >
                      <span>{stk.icon}</span>
                      <span>{stk.text}</span>
                    </motion.div>
                  ))}
                </div>

                {/* Sticker Tray */}
                <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', padding: '6px 0', scrollbarWidth: 'none' }}>
                  {CUSTOM_STICKER_SETS.map(s => (
                    <button
                      key={s.id}
                      onClick={() => {
                        if (isWin98) playWin98Click()
                        setPlacedStickers([...placedStickers, s])
                      }}
                      style={{
                        backgroundColor: s.bg,
                        color: s.darkText ? '#000' : '#FFF',
                        border: 'none',
                        padding: '4px 8px',
                        borderRadius: '3px',
                        fontSize: '10px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        flexShrink: 0,
                      }}
                    >
                      {s.icon} {s.label}
                    </button>
                  ))}
                  {placedStickers.length > 0 && (
                    <button
                      onClick={() => setPlacedStickers([])}
                      style={{
                        backgroundColor: '#cc0000',
                        color: '#fff',
                        border: 'none',
                        padding: '4px 8px',
                        borderRadius: '3px',
                        fontSize: '10px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        flexShrink: 0,
                      }}
                    >
                      Clear Stickers
                    </button>
                  )}
                </div>
              </div>

              {/* Story Original Caption Callout if available */}
              {selectedStory.caption_text && (
                <div style={{
                  padding: '8px 12px',
                  backgroundColor: isWin98 ? '#ffffcc' : 'rgba(255,255,255,0.05)',
                  border: isWin98 ? '1px solid #808080' : '1px solid var(--ios-border)',
                  borderRadius: isWin98 ? '0' : '8px',
                  fontSize: isWin98 ? '11px' : '12px',
                  color: isWin98 ? '#000' : 'var(--ios-text-secondary)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '6px'
                }}>
                  <span style={{ fontWeight: 'bold', color: isWin98 ? '#000080' : 'var(--ios-accent)' }}>Original Caption:</span>
                  <span style={{ flex: 1, fontStyle: 'italic' }}>{selectedStory.caption_text}</span>
                </div>
              )}

              {/* Full Markdown Note Editor Viewport */}
              <div 
                data-color-mode={isWin98 ? "light" : "dark"}
                style={{
                  flex: 1,
                  backgroundColor: isWin98 ? '#ffffff' : 'var(--ios-bg-card, #161618)',
                  color: isWin98 ? '#000000' : 'var(--ios-text-primary, #ffffff)',
                  border: isWin98 ? '1px solid #000' : '1px solid var(--ios-border)',
                  boxShadow: isWin98 ? 'inset 1px 1px #808080, inset -1px -1px #fff' : 'none',
                  borderRadius: isWin98 ? '0' : '10px',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  minHeight: '200px'
                }}
              >
                <MDEditor
                  value={journalText}
                  onChange={(val) => setJournalText(val || '')}
                  height="100%"
                  preview="edit"
                  style={{
                    backgroundColor: 'transparent',
                    boxShadow: 'none',
                    fontFamily: isWin98 ? '"MS Sans Serif", Courier, monospace' : 'inherit',
                  }}
                />
              </div>
            </div>
          ) : (
            <div style={{
              flex: 1,
              backgroundColor: isWin98 ? '#c0c0c0' : 'var(--ios-bg-card)',
              border: isWin98 ? '1px solid #000' : '1px solid var(--ios-border)',
              boxShadow: isWin98 ? 'inset 1px 1px #fff, inset -1px -1px #808080' : 'none',
              borderRadius: isWin98 ? '0' : '14px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '32px',
              textAlign: 'center',
              color: 'var(--ios-text-secondary, #666)'
            }}>
              <BookOpen size={48} strokeWidth={1.5} color="var(--ios-accent, #007aff)" style={{ marginBottom: '16px', opacity: 0.8 }} />
              <div style={{ fontSize: isWin98 ? '14px' : '18px', fontWeight: 700, color: isWin98 ? '#000' : 'var(--ios-text-primary)', marginBottom: '8px' }}>
                Personal Memory Journal
              </div>
              <div style={{ fontSize: isWin98 ? '11px' : '13px', maxWidth: '380px', lineHeight: 1.5, marginBottom: '20px' }}>
                Select an existing journal entry from the left, or click below to pick any memory and write a new Markdown journal note.
              </div>
              <button
                onClick={() => {
                  if (isWin98) playWin98Click()
                  setIsPickerOpen(true)
                }}
                className={isWin98 ? "win98-standard-btn" : "ios-btn"}
                style={{
                  padding: isWin98 ? '4px 14px' : '10px 20px',
                  fontSize: isWin98 ? '11px' : '14px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Plus size={16} />
                <span>Pick a Memory to Journal</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Story / Memory Picker Modal Grid ─────────────────── */}
      <AnimatePresence>
        {isPickerOpen && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 99999,
              backgroundColor: 'rgba(0, 0, 0, 0.65)',
              backdropFilter: 'blur(8px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px',
            }}
            onClick={() => setIsPickerOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.94 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '740px',
                maxWidth: '95vw',
                maxHeight: '85vh',
                backgroundColor: isWin98 ? '#c0c0c0' : 'var(--ios-bg-card)',
                border: isWin98 ? '2px solid #ffffff' : '1px solid var(--ios-border)',
                boxShadow: isWin98 
                  ? 'inset 1px 1px #dfdfdf, inset -1px -1px #000, 4px 4px 16px rgba(0,0,0,0.5)' 
                  : '0 20px 50px rgba(0,0,0,0.4)',
                borderRadius: isWin98 ? '0' : '20px',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                color: isWin98 ? '#000000' : 'var(--ios-text-primary)',
                fontFamily: isWin98 ? '"MS Sans Serif", Tahoma, Arial, sans-serif' : 'inherit',
              }}
            >
              {/* Modal Titlebar */}
              <div
                style={{
                  padding: isWin98 ? '3px 6px' : '16px 20px',
                  backgroundColor: isWin98 ? 'var(--win98-title-bg, #000080)' : 'transparent',
                  color: isWin98 ? '#ffffff' : 'var(--ios-text-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderBottom: isWin98 ? 'none' : '1px solid var(--ios-border)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <BookOpen size={isWin98 ? 14 : 20} color={isWin98 ? '#ffffff' : 'var(--ios-accent)'} />
                  <span style={{ fontWeight: 700, fontSize: isWin98 ? '12px' : '16px' }}>
                    Select a Memory to Journal
                  </span>
                </div>
                <button
                  onClick={() => {
                    if (isWin98) playWin98Click()
                    setIsPickerOpen(false)
                  }}
                  style={{
                    background: isWin98 ? '#c0c0c0' : 'transparent',
                    border: isWin98 ? '1px solid #000' : 'none',
                    boxShadow: isWin98 ? 'inset 1px 1px #fff, inset -1px -1px #808080' : 'none',
                    color: isWin98 ? '#000' : 'var(--ios-text-secondary)',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    padding: isWin98 ? '1px 6px' : '4px 8px',
                    fontSize: '12px',
                  }}
                >
                  ✕
                </button>
              </div>

              {/* Search Header */}
              <div style={{ padding: '12px 16px', borderBottom: isWin98 ? '1px solid #808080' : '1px solid var(--ios-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', backgroundColor: isWin98 ? '#fff' : 'var(--ios-bg-app)', padding: '6px 10px', borderRadius: isWin98 ? '0' : '10px', border: isWin98 ? '1px solid #808080' : '1px solid var(--ios-border)' }}>
                  <Search size={14} color="#888" style={{ marginRight: '8px' }} />
                  <input
                    type="text"
                    value={pickerSearch}
                    onChange={(e) => setPickerSearch(e.target.value)}
                    placeholder="Search memories by caption, date, or location..."
                    autoFocus
                    style={{
                      border: 'none',
                      outline: 'none',
                      background: 'transparent',
                      width: '100%',
                      fontSize: isWin98 ? '11px' : '13px',
                      color: 'inherit',
                    }}
                  />
                  {pickerSearch && (
                    <button onClick={() => setPickerSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888' }}>✕</button>
                  )}
                </div>
              </div>

              {/* Memory Grid */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '16px', maxHeight: '55vh' }}>
                {filteredPickerStories.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#888' }}>
                    No memories found matching "{pickerSearch}".
                  </div>
                ) : (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(135px, 1fr))',
                    gap: '12px',
                  }}>
                    {filteredPickerStories.map((story) => {
                      const hasJournal = story.journal_note && story.journal_note.trim().length > 0
                      return (
                        <div
                          key={story.id}
                          onClick={() => {
                            if (isWin98) playWin98Click()
                            selectStoryItem(story)
                            setIsPickerOpen(false)
                          }}
                          style={{
                            backgroundColor: isWin98 ? '#ffffff' : 'var(--ios-bg-app)',
                            border: isWin98 ? '1px solid #808080' : '1px solid var(--ios-border)',
                            borderRadius: isWin98 ? '0' : '10px',
                            overflow: 'hidden',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            boxShadow: isWin98 ? 'inset 1px 1px #dfdfdf, inset -1px -1px #808080' : '0 2px 8px rgba(0,0,0,0.1)',
                            transition: 'transform 0.1s ease',
                            position: 'relative',
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.03)'}
                          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                        >
                          <div style={{ width: '100%', aspectRatio: '9/16', backgroundColor: '#000', position: 'relative' }}>
                            {story.media_type === 2 ? (
                              <video src={getMediaUrl(story)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted />
                            ) : (
                              <img src={getMediaUrl(story)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            )}

                            {hasJournal && (
                              <div
                                style={{
                                  position: 'absolute',
                                  top: '4px',
                                  right: '4px',
                                  backgroundColor: '#000080',
                                  color: '#fff',
                                  fontSize: '9px',
                                  fontWeight: 'bold',
                                  padding: '2px 5px',
                                  borderRadius: '4px',
                                  boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
                                }}
                              >
                                📓 Has Note
                              </div>
                            )}
                          </div>

                          <div style={{ padding: '6px', fontSize: '10px' }}>
                            <div style={{ fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {story.location_name || new Date(story.taken_at).toLocaleDateString()}
                            </div>
                            <div style={{ opacity: 0.7, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {story.caption_text || new Date(story.taken_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div
                style={{
                  padding: '10px 16px',
                  borderTop: isWin98 ? '1px solid #808080' : '1px solid var(--ios-border)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '11px',
                  color: isWin98 ? '#404040' : 'var(--ios-text-secondary)',
                }}
              >
                <span>{filteredPickerStories.length} memories available</span>
                <button
                  onClick={() => {
                    if (isWin98) playWin98Click()
                    setIsPickerOpen(false)
                  }}
                  className={isWin98 ? "win98-standard-btn" : "ios-btn"}
                  style={{ padding: '4px 14px' }}
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Tab 2: Places to Visit & Bucket List ───────────── */}
      {activeTab === 'places' && (
        <div style={{
          flex: 1,
          overflowY: 'auto',
          backgroundColor: isWin98 ? '#c0c0c0' : 'var(--ios-bg-app)',
          padding: isWin98 ? '8px' : '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}>
          {/* Add New Place Form Card */}
          <form
            onSubmit={handleAddPlace}
            style={{
              backgroundColor: isWin98 ? '#c0c0c0' : 'var(--ios-bg-card)',
              border: isWin98 ? '1px solid #000' : '1px solid var(--ios-border)',
              boxShadow: isWin98 ? 'inset 1px 1px #fff, inset -1px -1px #808080' : 'none',
              borderRadius: isWin98 ? '0' : '14px',
              padding: isWin98 ? '8px 12px' : '16px',
              display: 'flex',
              gap: '10px',
              alignItems: 'center',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ fontWeight: 'bold', color: '#000080', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Compass size={16} />
              <span>Add Destination:</span>
            </div>

            <input
              type="text"
              value={newPlaceTitle}
              onChange={(e) => setNewPlaceTitle(e.target.value)}
              placeholder="e.g. Hike Mount Fuji or Visit Kyoto..."
              style={{
                flex: 2,
                minWidth: '200px',
                padding: '6px 8px',
                backgroundColor: '#ffffff',
                border: '1px solid #000',
                boxShadow: isWin98 ? 'inset 1px 1px #808080, inset -1px -1px #fff' : 'none',
                fontFamily: 'inherit',
                fontSize: '12px',
              }}
            />

            <input
              type="text"
              value={newPlaceLocation}
              onChange={(e) => setNewPlaceLocation(e.target.value)}
              placeholder="City, Country"
              style={{
                flex: 1,
                minWidth: '130px',
                padding: '6px 8px',
                backgroundColor: '#ffffff',
                border: '1px solid #000',
                boxShadow: isWin98 ? 'inset 1px 1px #808080, inset -1px -1px #fff' : 'none',
                fontFamily: 'inherit',
                fontSize: '12px',
              }}
            />

            <button
              type="submit"
              className="segment-btn"
              style={{
                padding: '6px 14px',
                backgroundColor: '#000080',
                color: '#ffffff',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <Plus size={14} />
              <span>Add to Wishlist</span>
            </button>
          </form>

          {/* Places List */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '12px',
          }}>
            {places.map(place => (
              <div
                key={place.id}
                style={{
                  backgroundColor: isWin98 ? '#ffffff' : 'var(--ios-bg-card)',
                  border: isWin98 ? '1px solid #000' : '1px solid var(--ios-border)',
                  boxShadow: isWin98 ? 'inset 1px 1px #808080, inset -1px -1px #fff' : 'none',
                  borderRadius: isWin98 ? '0' : '12px',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                  <div
                    onClick={() => togglePlaceCompleted(place.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
                  >
                    {place.completed ? (
                      <CheckSquare size={16} color="#008000" />
                    ) : (
                      <Square size={16} color="#888" />
                    )}
                    <span style={{
                      fontWeight: 700,
                      fontSize: isWin98 ? '12px' : '14px',
                      textDecoration: place.completed ? 'line-through' : 'none',
                      color: place.completed ? '#888' : 'inherit',
                    }}>
                      {place.title}
                    </span>
                  </div>

                  <button
                    onClick={() => deletePlace(place.id)}
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#ff3b30', padding: '2px' }}
                    title="Delete item"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#666' }}>
                  <MapPin size={12} color="var(--ios-accent)" />
                  <span>{place.location}</span>
                </div>

                {place.notes && (
                  <div style={{ fontSize: '11px', color: '#444', fontStyle: 'italic' }}>
                    "{place.notes}"
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── MS Paint Modal ───────────────────────────────── */}
      <MSPaintModal
        isOpen={isPaintOpen}
        onClose={() => setIsPaintOpen(false)}
        onSaveDoodle={handleSaveDoodle}
        title={selectedStory ? `Doodle - ${selectedStory.location_name || 'Memory'}` : "MS Paint"}
      />
    </div>
  )
}
