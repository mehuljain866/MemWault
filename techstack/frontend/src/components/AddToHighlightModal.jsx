import { useState, useEffect } from 'react'
import { X, Plus, Layers, Image as ImageIcon } from 'lucide-react'
import { getHighlights, addStoriesToHighlight } from '../services/api'
import { motion } from 'framer-motion'

export default function AddToHighlightModal({ isOpen, onClose, selectedStoryIds, onAdded, onCreateNewRequest }) {
  const [highlights, setHighlights] = useState([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState(null)

  useEffect(() => {
    if (isOpen) {
      loadHighlights()
    } else {
      setHighlights([])
      setSavingId(null)
    }
  }, [isOpen])

  const loadHighlights = async () => {
    try {
      setLoading(true)
      const data = await getHighlights()
      setHighlights(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleAddToExisting = async (highlightId) => {
    try {
      setSavingId(highlightId)
      await addStoriesToHighlight(highlightId, selectedStoryIds)
      onAdded?.()
      onClose()
    } catch (err) {
      alert('Failed to add to highlight: ' + err.message)
    } finally {
      setSavingId(null)
    }
  }

  if (!isOpen) return null

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        backgroundColor: 'rgba(0,0,0,0.75)',
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        zIndex: 1000,
        backdropFilter: 'blur(4px)',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="ios-card"
        style={{
          backgroundColor: 'var(--ios-bg-card)',
          borderRadius: 'var(--ios-radius-lg)',
          width: '90%', maxWidth: '400px',
          maxHeight: '80vh', display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
        }}
      >
        {/* ── Header ────────────────────────── */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '16px 20px', borderBottom: '1px solid var(--ios-border)',
        }}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--ios-text-primary)' }}>
            Add to Highlight
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'var(--ios-border)', border: 'none', borderRadius: '50%',
              width: '32px', height: '32px', display: 'flex', alignItems: 'center',
              justifyContent: 'center', cursor: 'pointer', color: 'var(--ios-text-primary)',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Create New Button ────────────────────────── */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--ios-border)' }}>
          <button
            className="ios-btn"
            onClick={() => {
              onClose()
              onCreateNewRequest?.()
            }}
            style={{
              width: '100%', padding: '12px', borderRadius: '12px',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              fontSize: '15px', fontWeight: 600
            }}
          >
            <Plus size={18} /> Create New Highlight
          </button>
        </div>

        {/* ── Existing Highlights List ────────────────────────── */}
        <div style={{ padding: '12px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0', color: 'var(--ios-text-secondary)' }}>
              Loading...
            </div>
          ) : highlights.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--ios-text-secondary)', fontSize: '14px' }}>
              No existing highlights found.
            </div>
          ) : (
            highlights.map(hl => (
              <motion.button
                whileHover={{ scale: 0.98 }}
                whileTap={{ scale: 0.95 }}
                key={hl.id}
                onClick={() => handleAddToExisting(hl.id)}
                disabled={savingId === hl.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '12px', borderRadius: '12px', border: 'none',
                  background: 'var(--ios-bg-app)', cursor: 'pointer',
                  textAlign: 'left',
                  opacity: savingId === hl.id ? 0.6 : 1
                }}
              >
                <div style={{
                  width: '48px', height: '48px', borderRadius: '8px', overflow: 'hidden',
                  background: 'var(--ios-border)', display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  {hl.cover_media_url ? (
                    <img src={hl.cover_media_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <ImageIcon size={20} color="var(--ios-text-secondary)" />
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '15px', color: 'var(--ios-text-primary)' }}>{hl.title}</div>
                  <div style={{ fontSize: '13px', color: 'var(--ios-text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                    <Layers size={12} /> {hl.story_count} stories
                  </div>
                </div>
                {savingId === hl.id && (
                  <span style={{ fontSize: '13px', color: 'var(--ios-accent)', fontWeight: 600 }}>Adding...</span>
                )}
              </motion.button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
