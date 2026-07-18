import { useState, useEffect, useCallback, useMemo } from 'react';
import { X, Check, Image as ImageIcon, Play, Film } from 'lucide-react';
import { getStories, createHighlight } from '../services/api';
import StoryCard from './StoryCard';
import FastScrollbar from './FastScrollbar';

const SegmentButton = ({ active, onClick, icon: Icon, label }) => (
  <button
    onClick={onClick}
    style={{
      flex: 1, padding: '8px', border: 'none', background: active ? 'var(--ios-bg-app)' : 'transparent',
      borderRadius: '7px', color: active ? 'var(--ios-text-primary)' : 'var(--ios-text-secondary)',
      fontWeight: active ? 600 : 500, fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center',
      gap: '6px', cursor: 'pointer', transition: 'all var(--ios-spring-fast)',
      boxShadow: active ? '0 3px 8px rgba(0,0,0,0.12), 0 3px 1px rgba(0,0,0,0.04)' : 'none'
    }}
  >
    <Icon size={16} /> {label}
  </button>
);

export default function HighlightCreatorModal({ isOpen, onClose, onCreated }) {
  const [stories, setStories] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('memories'); // 'memories' | 'reels'
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const loadStories = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getStories({ 
        pageSize: 200,
        isReel: activeTab === 'reels',
        isMemory: activeTab === 'memories',
        search: searchQuery.trim() || undefined
      });
      const list = Array.isArray(data) ? data : (data.stories || []);
      setStories(list.filter(s => s.is_downloaded && !s.is_trashed));
    } catch (err) {
      console.error('Failed to load stories:', err);
    } finally {
      setLoading(false);
    }
  }, [activeTab, searchQuery]);

  useEffect(() => {
    if (isOpen) {
      loadStories();
    }
  }, [isOpen, loadStories]);

  useEffect(() => {
    if (!isOpen) {
      setSelectedIds([]);
      setTitle('');
      setActiveTab('memories');
      setSearchInput('');
      setSearchQuery('');
    }
  }, [isOpen]);

  const toggleSelection = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    if (!title.trim()) return alert('Please enter a title');
    if (selectedIds.length === 0) return alert('Please select at least one story');
    try {
      setSaving(true);
      await createHighlight(title.trim(), selectedIds);
      onCreated?.();
      onClose();
    } catch (err) {
      console.error(err);
      alert('Error creating highlight: ' + (err.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        backgroundColor: 'rgba(0,0,0,0.75)',
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        zIndex: 1000,
        backdropFilter: 'blur(4px)',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="ios-card"
        style={{
          backgroundColor: 'var(--ios-bg-card)',
          borderRadius: 'var(--ios-radius-lg)',
          width: '90%', maxWidth: '620px',
          height: '82vh', display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
          transform: 'translateZ(0)',
        }}
      >
        {/* ── Header ────────────────────────── */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '18px 20px', borderBottom: '1px solid var(--ios-border)',
        }}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--ios-text-primary)' }}>
            Create Highlight
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

        {/* ── Title input ───────────────────── */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--ios-border)' }}>
          <input
            type="text"
            placeholder="Highlight name…"
            value={title}
            onChange={e => setTitle(e.target.value)}
            style={{
              width: '100%', padding: '12px 16px', borderRadius: '12px',
              border: '1.5px solid var(--ios-border)',
              backgroundColor: 'var(--ios-bg-app)',
              color: 'var(--ios-text-primary)', fontSize: '15px',
              outline: 'none', boxSizing: 'border-box',
              transition: 'border-color 0.2s',
            }}
            onFocus={e => { e.target.style.borderColor = 'var(--ios-accent)' }}
            onBlur={e => { e.target.style.borderColor = 'var(--ios-border)' }}
          />
        </div>

        {/* ── Tabs & Search ─────────────────────── */}
        <div style={{ padding: '0 20px 16px 20px', borderBottom: '1px solid var(--ios-border)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{
            display: 'flex', background: 'var(--ios-border)', padding: '2px',
            borderRadius: '9px', width: '100%'
          }}>
            <SegmentButton active={activeTab === 'memories'} onClick={() => setActiveTab('memories')} icon={ImageIcon} label="Memories" />
            <SegmentButton active={activeTab === 'reels'} onClick={() => setActiveTab('reels')} icon={Film} label="Reels" />
          </div>
          <input
            type="text"
            placeholder="Search by location, song, artist..."
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            style={{
              width: '100%', padding: '10px 16px', borderRadius: '12px',
              border: '1.5px solid var(--ios-border)',
              backgroundColor: 'var(--ios-bg-app)',
              color: 'var(--ios-text-primary)', fontSize: '14px',
              outline: 'none', boxSizing: 'border-box',
              transition: 'border-color 0.2s',
            }}
            onFocus={e => { e.target.style.borderColor = 'var(--ios-accent)' }}
            onBlur={e => { e.target.style.borderColor = 'var(--ios-border)' }}
          />
        </div>

        {/* ── Story grid ────────────────────── */}
        <div id="modal-grid-scroll" style={{
          flex: 1, overflowY: 'auto', padding: '16px 20px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
          gridAutoRows: 'max-content',
          gap: '8px',
          alignContent: 'start',
          position: 'relative'
        }}>
          <FastScrollbar items={stories} getDate={(s) => new Date(s.taken_at + (s.taken_at.endsWith('Z') ? '' : 'Z'))} scrollContainerSelector="#modal-grid-scroll" />
          {loading ? (
            Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                style={{
                  aspectRatio: '9/16', borderRadius: '8px',
                  background: 'var(--ios-border)',
                }}
              />
            ))
          ) : stories.length === 0 ? (
            <div style={{
              gridColumn: '1 / -1', display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: '12px',
              padding: '40px 0', color: 'var(--ios-text-secondary)',
            }}>
              <ImageIcon size={40} strokeWidth={1} />
              <div style={{ fontSize: '14px' }}>No {activeTab} found{searchQuery ? ' for search' : ''}</div>
            </div>
          ) : (
            stories.map(story => (
              <StoryCard
                key={story.id}
                story={story}
                hideTitle={true}
                zoomLevel="month"
                isSelectMode={true}
                isSelected={selectedIds.includes(story.id)}
                onSelect={toggleSelection}
              />
            ))
          )}
        </div>

        {/* ── Footer ────────────────────────── */}
        <div style={{
          padding: '16px 20px', borderTop: '1px solid var(--ios-border)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontSize: '14px', color: 'var(--ios-text-secondary)', fontWeight: 500 }}>
            {selectedIds.length} selected
          </span>
          <button
            className="ios-btn"
            onClick={handleSave}
            disabled={saving || selectedIds.length === 0 || !title.trim()}
            style={{
              padding: '10px 28px', borderRadius: '20px', fontWeight: 600, fontSize: '14px',
              opacity: (saving || selectedIds.length === 0 || !title.trim()) ? 0.4 : 1,
              transition: 'opacity 0.2s',
            }}
          >
            {saving ? 'Creating…' : 'Create Album'}
          </button>
        </div>
      </div>
    </div>
  );
}
