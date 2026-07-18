import { Archive, Star, X } from 'lucide-react'

/**
 * BulkActionBar – iOS-style floating action bar for multi-select mode.
 *
 * Props:
 *  - selectedCount  {number}   how many items are selected
 *  - onArchive      {function} called when "Move to Archive" is pressed
 *  - onHighlight    {function} called when "Add to Highlight" is pressed
 *  - onCancel       {function} called when "Cancel" is pressed
 *  - loading        {boolean}  disables buttons while an async op is running
 */
export default function BulkActionBar({ selectedCount, onArchive, onHighlight, onCancel, loading = false }) {
  if (selectedCount === 0) return null

  return (
    <div
      role="toolbar"
      aria-label="Bulk actions"
      style={{
        position: 'fixed',
        bottom: '32px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '14px 20px',
        borderRadius: 'var(--ios-radius-md)',
        background: 'var(--ios-glass)',
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        border: '1px solid var(--ios-border)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.12)',
        animation: 'bulkBarSlideUp 0.28s cubic-bezier(0.34,1.56,0.64,1)',
        whiteSpace: 'nowrap',
      }}
    >
      {/* Selected count badge */}
      <span
        style={{
          fontSize: '14px',
          fontWeight: 700,
          color: 'var(--ios-text-primary)',
          minWidth: '80px',
        }}
      >
        {selectedCount} Selected
      </span>

      <div style={{ width: '1px', height: '28px', background: 'var(--ios-border)' }} />

      {/* Archive */}
      <button
        className="ios-btn"
        onClick={onArchive}
        disabled={loading}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '8px 16px',
          fontSize: '13px',
          borderRadius: '20px',
          opacity: loading ? 0.5 : 1,
          transition: 'opacity 0.2s, transform 0.15s',
        }}
        aria-label="Move to Archive"
      >
        <Archive size={15} />
        Move to Archive
      </button>

      {/* Highlight */}
      <button
        className="ios-btn ios-btn-secondary"
        onClick={onHighlight}
        disabled={loading}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '8px 16px',
          fontSize: '13px',
          borderRadius: '20px',
          opacity: loading ? 0.5 : 1,
          transition: 'opacity 0.2s, transform 0.15s',
        }}
        aria-label="Add to Highlight"
      >
        <Star size={15} />
        Add to Highlight
      </button>

      <div style={{ width: '1px', height: '28px', background: 'var(--ios-border)' }} />

      {/* Cancel */}
      <button
        className="ios-btn-secondary"
        onClick={onCancel}
        disabled={loading}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          padding: '8px 12px',
          fontSize: '13px',
          fontWeight: 600,
          borderRadius: '20px',
          border: 'none',
          background: 'transparent',
          color: 'var(--ios-text-secondary)',
          cursor: 'pointer',
          opacity: loading ? 0.5 : 1,
          transition: 'color 0.2s',
        }}
        aria-label="Cancel selection"
      >
        <X size={15} />
        Cancel
      </button>

      <style>{`
        @keyframes bulkBarSlideUp {
          from { opacity: 0; transform: translateX(-50%) translateY(20px) scale(0.95); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0)    scale(1);    }
        }
      `}</style>
    </div>
  )
}
