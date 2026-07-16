import { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';
import api from '../services/api';

export default function HighlightCreatorModal({ isOpen, onClose, onCreated }) {
  const [stories, setStories] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadStories();
      setSelectedIds([]);
      setTitle('');
    }
  }, [isOpen]);

  const loadStories = async () => {
    try {
      setLoading(true);
      const data = await api.getStories();
      // Only show downloaded stories that are not highlights themselves
      setStories(data.filter(s => s.is_downloaded && !s.is_trashed));
    } catch (err) {
      console.error('Failed to load stories:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelection = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    if (!title.trim()) return alert("Please enter a title");
    if (selectedIds.length === 0) return alert("Please select at least one story");
    
    try {
      setSaving(true);
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/highlights/manual`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title,
          story_ids: selectedIds
        })
      });
      if (res.ok) {
        onCreated();
        onClose();
      } else {
        alert("Failed to create highlight");
      }
    } catch (err) {
      console.error(err);
      alert("Error creating highlight");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)',
      display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'var(--ios-bg-card)', borderRadius: 'var(--ios-radius-lg)',
        width: '90%', maxWidth: '600px', height: '80vh', display: 'flex', flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px', borderBottom: '1px solid var(--ios-border)' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600 }}>Create Highlight</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--ios-text-primary)' }}>
            <X size={24} />
          </button>
        </div>

        {/* Input */}
        <div style={{ padding: '16px' }}>
          <input 
            type="text" 
            placeholder="Highlight Name" 
            value={title}
            onChange={e => setTitle(e.target.value)}
            style={{
              width: '100%', padding: '12px', borderRadius: '8px',
              border: '1px solid var(--ios-border)', backgroundColor: 'var(--ios-bg-app)',
              color: 'var(--ios-text-primary)', fontSize: '16px'
            }}
          />
        </div>

        {/* Grid */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '8px' }}>
          {loading ? <p>Loading stories...</p> : stories.map(story => (
            <div 
              key={story.id} 
              onClick={() => toggleSelection(story.id)}
              style={{
                aspectRatio: '9/16', position: 'relative', borderRadius: '8px', overflow: 'hidden',
                border: selectedIds.includes(story.id) ? '3px solid var(--ios-accent)' : 'none',
                cursor: 'pointer'
              }}
            >
              <img 
                src={`${import.meta.env.VITE_API_URL}/api/v1/storage/media/${story.s3_key}`} 
                alt="Story"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              {selectedIds.includes(story.id) && (
                <div style={{ position: 'absolute', bottom: '8px', right: '8px', backgroundColor: 'var(--ios-accent)', borderRadius: '50%', padding: '2px' }}>
                  <Check size={16} color="white" />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px', borderTop: '1px solid var(--ios-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{selectedIds.length} selected</span>
          <button 
            onClick={handleSave}
            disabled={saving || selectedIds.length === 0}
            style={{
              padding: '12px 24px', backgroundColor: 'var(--ios-accent)', color: 'white',
              borderRadius: '20px', border: 'none', fontWeight: 600,
              opacity: (saving || selectedIds.length === 0) ? 0.5 : 1
            }}
          >
            {saving ? 'Saving...' : 'Create Album'}
          </button>
        </div>
      </div>
    </div>
  );
}
