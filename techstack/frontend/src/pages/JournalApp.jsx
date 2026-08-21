import React, { useState, useEffect } from 'react'
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

export default function JournalApp() {
  const [activeTab, setActiveTab] = useState('memories') // 'memories' | 'places'
  const [stories, setStories] = useState([])
  const [selectedStory, setSelectedStory] = useState(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [isPaintOpen, setIsPaintOpen] = useState(false)
  const [journalText, setJournalText] = useState('')
  const [doodles, setDoodles] = useState([])
  const [saving, setSaving] = useState(false)

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
      const data = await getStories({ pageSize: 100 })
      const list = Array.isArray(data) ? data : (data?.stories || data?.items || [])
      setStories(list)
      if (list.length > 0) {
        selectStoryItem(list[0])
      }
    } catch (err) {
      console.error('Failed to load stories:', err)
      setStories([])
    } finally {
      setLoading(false)
    }
  }

  const selectStoryItem = async (story) => {
    setSelectedStory(story)
    try {
      const full = await getStory(story.id)
      setJournalText(full.journal_note || '')
      // Load any stored doodles
      const savedDoodles = localStorage.getItem(`memwault_doodles_${story.id}`)
      setDoodles(savedDoodles ? JSON.parse(savedDoodles) : [])
    } catch (e) {
      setJournalText('')
      setDoodles([])
    }
  }

  const handleSaveJournal = async () => {
    if (!selectedStory) return
    if (isWin98) playWin98Click()
    setSaving(true)
    try {
      await updateStory(selectedStory.id, { journal_note: journalText })
      // Save doodles
      localStorage.setItem(`memwault_doodles_${selectedStory.id}`, JSON.stringify(doodles))
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

  const filteredStories = (Array.isArray(stories) ? stories : []).filter(s => 
    (s.location_name && s.location_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (s.caption_text && s.caption_text.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (!searchQuery)
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
            {/* Search Input */}
            <div style={{ padding: '8px', borderBottom: isWin98 ? '1px solid #808080' : '1px solid var(--ios-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', backgroundColor: isWin98 ? '#fff' : 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: isWin98 ? '0' : '8px' }}>
                <Search size={13} color="#888" style={{ marginRight: '6px' }} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter memories..."
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
              {filteredStories.map(story => {
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
                      <img src={story.media_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: isWin98 ? '11px' : '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {story.location_name || new Date(story.taken_at).toLocaleDateString()}
                      </div>
                      <div style={{ fontSize: isWin98 ? '10px' : '11px', opacity: 0.75, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {story.caption_text || `${new Date(story.taken_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                      </div>
                    </div>
                  </div>
                )
              })}
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
                      <video src={selectedStory.media_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} autoPlay loop muted playsInline />
                    ) : (
                      <img src={selectedStory.media_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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

              {/* Full Markdown Note Editor Viewport */}
              <div style={{
                flex: 1,
                backgroundColor: '#ffffff',
                border: isWin98 ? '1px solid #000' : '1px solid var(--ios-border)',
                boxShadow: isWin98 ? 'inset 1px 1px #808080, inset -1px -1px #fff' : 'none',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
              }}>
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
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888' }}>
              Select a memory to read or write its journal.
            </div>
          )}
        </div>
      )}

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
