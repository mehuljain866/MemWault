import { useState, useEffect } from 'react'
import { getDashboardStats, triggerScrape, triggerArchiveImport } from '../services/api'

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [importing, setImporting] = useState(false)

  useEffect(() => {
    loadStats()
  }, [])

  async function loadStats() {
    try {
      const data = await getDashboardStats()
      setStats(data)
    } catch (err) {
      console.error('Failed to load stats:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleArchiveImport() {
    if (!confirm('Import ALL stories from your Instagram archive? This may take a while.')) return
    setImporting(true)
    try {
      await triggerArchiveImport()
      alert('Archive import started! Stories will appear in your timeline as they are processed.')
    } catch (err) {
      alert(`Error: ${err.message}`)
    } finally {
      setImporting(false)
    }
  }

  if (loading) {
    return (
      <div className="sv-empty">
        <div className="sv-empty__icon">⏳</div>
        <div className="sv-empty__title">Loading Dashboard...</div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="sv-empty">
        <div className="sv-empty__icon">⚠️</div>
        <div className="sv-empty__title">Could not load stats</div>
        <div className="sv-empty__description">
          Make sure the backend server is running and your session is valid.
        </div>
        <button className="sv-btn sv-btn--primary" onClick={loadStats}>
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="sv-fade-in">
      {/* ── Stats Grid ──────────────────────── */}
      <div className="sv-stats-grid">
        <div className="sv-card">
          <div className="sv-stat">
            <div className="sv-stat__value">{stats.total_stories}</div>
            <div className="sv-stat__label">Total Stories</div>
          </div>
        </div>
        <div className="sv-card">
          <div className="sv-stat">
            <div className="sv-stat__value">{stats.total_photos}</div>
            <div className="sv-stat__label">Photos</div>
          </div>
        </div>
        <div className="sv-card">
          <div className="sv-stat">
            <div className="sv-stat__value">{stats.total_videos}</div>
            <div className="sv-stat__label">Videos</div>
          </div>
        </div>
        <div className="sv-card">
          <div className="sv-stat">
            <div className="sv-stat__value">{stats.total_with_music}</div>
            <div className="sv-stat__label">🎵 With Music</div>
          </div>
        </div>
        <div className="sv-card">
          <div className="sv-stat">
            <div className="sv-stat__value">{stats.total_with_location}</div>
            <div className="sv-stat__label">📍 With Location</div>
          </div>
        </div>
        <div className="sv-card">
          <div className="sv-stat">
            <div className="sv-stat__value">{stats.total_mentions}</div>
            <div className="sv-stat__label">👥 Mentions</div>
          </div>
        </div>
      </div>

      {/* ── Quick Actions ───────────────────── */}
      <div style={{ display: 'flex', gap: 'var(--sv-space-4)', marginBottom: 'var(--sv-space-8)', flexWrap: 'wrap' }}>
        <div className="sv-card" style={{ flex: 1, minWidth: 280 }}>
          <h3 style={{ fontSize: 'var(--sv-text-lg)', fontWeight: 700, marginBottom: 'var(--sv-space-3)' }}>
            ⚡ Quick Actions
          </h3>
          <div style={{ display: 'flex', gap: 'var(--sv-space-3)', flexWrap: 'wrap' }}>
            <button
              className="sv-btn sv-btn--primary"
              onClick={() => triggerScrape(true).then(loadStats)}
            >
              🔄 Sync Active Stories
            </button>
            <button
              className="sv-btn sv-btn--secondary"
              onClick={handleArchiveImport}
              disabled={importing}
            >
              {importing ? '⏳ Importing...' : '📥 Import Full Archive'}
            </button>
          </div>
        </div>

        <div className="sv-card" style={{ flex: 1, minWidth: 280 }}>
          <h3 style={{ fontSize: 'var(--sv-text-lg)', fontWeight: 700, marginBottom: 'var(--sv-space-3)' }}>
            💾 Storage
          </h3>
          <div className="sv-stat">
            <div className="sv-stat__value">{stats.storage_used_mb} MB</div>
            <div className="sv-stat__label">Total Storage Used</div>
          </div>
        </div>
      </div>

      {/* ── System Status ───────────────────── */}
      <div className="sv-card">
        <h3 style={{ fontSize: 'var(--sv-text-lg)', fontWeight: 700, marginBottom: 'var(--sv-space-4)' }}>
          🖥️ System Status
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--sv-space-4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sv-space-3)' }}>
            <span
              className={`sv-sidebar__status-dot ${stats.ig_session_valid ? '' : 'sv-sidebar__status-dot--inactive'}`}
            />
            <div>
              <div style={{ fontSize: 'var(--sv-text-sm)', fontWeight: 600 }}>
                Instagram Session
              </div>
              <div style={{ fontSize: 'var(--sv-text-xs)', color: 'var(--sv-text-tertiary)' }}>
                {stats.ig_session_valid ? 'Connected & Active' : 'Not Connected'}
              </div>
            </div>
          </div>

          {stats.last_scrape && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sv-space-3)' }}>
              <span
                className="sv-sidebar__status-dot"
                style={{
                  background: stats.last_scrape.status === 'success'
                    ? 'var(--sv-success)'
                    : stats.last_scrape.status === 'error'
                    ? 'var(--sv-error)'
                    : 'var(--sv-warning)',
                }}
              />
              <div>
                <div style={{ fontSize: 'var(--sv-text-sm)', fontWeight: 600 }}>
                  Last Scrape
                </div>
                <div style={{ fontSize: 'var(--sv-text-xs)', color: 'var(--sv-text-tertiary)' }}>
                  {new Date(stats.last_scrape.started_at).toLocaleString()} ·{' '}
                  {stats.last_scrape.stories_new} new
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
