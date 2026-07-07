import { useState, useEffect } from 'react'
import {
  getInstagramSession,
  browserLoginInstagram,
  getScrapeLogs,
  clearToken,
  rescanMetadata,
} from '../services/api'
import { getSettings, saveSettings } from '../services/settings'
import { useNavigate } from 'react-router-dom'

export default function Settings() {
  const navigate = useNavigate()
  const [igSession, setIgSession] = useState(null)
  const [scrapeLogs, setScrapeLogs] = useState([])
  const [connecting, setConnecting] = useState(false)
  const [rescanning, setRescanning] = useState(false)
  const [error, setError] = useState('')
  const [playbackSettings, setPlaybackSettings] = useState(getSettings())

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const [session, logs] = await Promise.all([
        getInstagramSession(),
        getScrapeLogs(10),
      ])
      setIgSession(session)
      setScrapeLogs(logs)
    } catch (err) {
      console.error('Settings load error:', err)
    }
  }

  async function handleBrowserLogin() {
    setError('')
    setConnecting(true)

    try {
      const result = await browserLoginInstagram()
      if (result.status === 'login_success') {
        // Reload session to get the full InstagramSessionRead
        await loadData()
      } else {
        setError(result.message || 'Login failed. Please try again.')
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        setError('Login timed out. Please try again.')
      } else {
        setError(err.message)
      }
    } finally {
      setConnecting(false)
    }
  }

  function handleLogout() {
    if (confirm('Sign out of MemWault?')) {
      clearToken()
      navigate('/login')
    }
  }

  async function handleRescan() {
    if (!confirm('This will rescan all local story metadata to update tags, locations, and reels logic. Continue?')) {
      return
    }
    setRescanning(true)
    try {
      const res = await rescanMetadata()
      alert(`Successfully rescanned! Updated ${res.updated_count} stories.`)
    } catch (err) {
      alert('Rescan failed: ' + err.message)
    } finally {
      setRescanning(false)
    }
  }

  function handleSettingChange(key, value) {
    const newSettings = { ...playbackSettings, [key]: value };
    setPlaybackSettings(newSettings);
    saveSettings(newSettings);
  }

  return (
    <div className="sv-settings sv-fade-in">
      {/* ── Instagram Connection ────────────── */}
      <div className="sv-card">
        <div className="sv-settings__section-header">
          <div>
            <h2 className="sv-settings__section-title">📸 Instagram Connection</h2>
            <p className="sv-settings__section-desc">
              Connect your account to enable automatic story archiving.
            </p>
          </div>
          {igSession && (
            <span className="sv-badge sv-badge--success">
              ✓ Connected
            </span>
          )}
        </div>

        {igSession ? (
          <div style={{ marginTop: 'var(--sv-space-4)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sv-space-4)' }}>
              <div>
                <div className="sv-story-detail__metadata-label">Username</div>
                <div className="sv-story-detail__metadata-value">@{igSession.ig_username}</div>
              </div>
              <div>
                <div className="sv-story-detail__metadata-label">User ID</div>
                <div className="sv-story-detail__metadata-value" style={{ fontFamily: 'var(--sv-font-mono)', fontSize: 'var(--sv-text-xs)' }}>
                  {igSession.ig_user_id || 'N/A'}
                </div>
              </div>
              <div>
                <div className="sv-story-detail__metadata-label">Last Login</div>
                <div className="sv-story-detail__metadata-value">
                  {new Date(igSession.last_login).toLocaleString()}
                </div>
              </div>
              <div>
                <div className="sv-story-detail__metadata-label">Status</div>
                <div className="sv-story-detail__metadata-value">
                  {igSession.is_valid ? '🟢 Active' : '🔴 Expired'}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ marginTop: 'var(--sv-space-5)', maxWidth: 500 }}>
            {error && <div className="sv-login__error">{error}</div>}

            {connecting ? (
              <div style={{ textAlign: 'center', padding: 'var(--sv-space-6) 0' }}>
                <div style={{
                  fontSize: 'var(--sv-text-3xl)',
                  marginBottom: 'var(--sv-space-3)',
                  animation: 'pulse 2s ease-in-out infinite',
                }}>
                  🌐
                </div>
                <p style={{
                  color: 'var(--sv-text-secondary)',
                  fontSize: 'var(--sv-text-sm)',
                  marginBottom: 'var(--sv-space-2)',
                }}>
                  A browser window has opened on your computer.
                </p>
                <p style={{
                  color: 'var(--sv-text-primary)',
                  fontWeight: 600,
                  fontSize: 'var(--sv-text-base)',
                }}>
                  Log into your Instagram account in that window.
                </p>
                <p style={{
                  color: 'var(--sv-text-muted)',
                  fontSize: 'var(--sv-text-xs)',
                  marginTop: 'var(--sv-space-3)',
                }}>
                  Once you're logged in, the window will close automatically and your account will be linked.
                </p>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: 'var(--sv-space-4) 0' }}>
                <p style={{
                  color: 'var(--sv-text-secondary)',
                  fontSize: 'var(--sv-text-sm)',
                  marginBottom: 'var(--sv-space-4)',
                  lineHeight: 1.6,
                }}>
                  Click below to open a secure browser window where you can log into Instagram directly.
                  Your credentials are never stored — only session cookies are saved locally.
                </p>
                <button
                  className="sv-btn sv-btn--primary"
                  onClick={handleBrowserLogin}
                  style={{ padding: '12px 32px', fontSize: 'var(--sv-text-base)' }}
                >
                  🔗 Connect with Instagram
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Playback & Media ────────────────── */}
      <div className="sv-card">
        <h2 className="sv-settings__section-title">▶️ Playback & Media</h2>
        <div style={{ marginTop: 'var(--sv-space-4)', display: 'grid', gap: 'var(--sv-space-5)' }}>
          
          {/* Autoplay Delay */}
          <div>
            <div className="sv-story-detail__metadata-label">Auto-Play Delay (Video Stories)</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sv-space-4)', marginTop: 'var(--sv-space-2)' }}>
              <input 
                type="range" 
                min="-1" 
                max="5" 
                step="1"
                value={playbackSettings.autoplayDelay}
                onChange={(e) => handleSettingChange('autoplayDelay', parseInt(e.target.value))}
                style={{ flex: 1, accentColor: 'var(--sv-primary)' }}
              />
              <div style={{ width: '80px', fontWeight: 600 }}>
                {playbackSettings.autoplayDelay === -1 
                  ? 'Disabled' 
                  : playbackSettings.autoplayDelay === 0 
                    ? 'Instant' 
                    : `${playbackSettings.autoplayDelay}s`}
              </div>
            </div>
            <div style={{ fontSize: 'var(--sv-text-xs)', color: 'var(--sv-text-muted)', marginTop: 'var(--sv-space-1)' }}>
              Controls how many seconds a video waits before playing when you open a story.
            </div>
          </div>

          {/* Preferred Music App */}
          <div>
            <div className="sv-story-detail__metadata-label">Preferred Music App</div>
            <div style={{ display: 'flex', gap: 'var(--sv-space-2)', flexWrap: 'wrap', marginTop: 'var(--sv-space-2)' }}>
              {[
                { id: 'spotify', label: 'Spotify', icon: '🟢' },
                { id: 'apple', label: 'Apple Music', icon: '🍎' },
                { id: 'youtube', label: 'YouTube Music', icon: '▶️' },
                { id: 'amazon', label: 'Amazon Music', icon: '📦' }
              ].map(app => (
                <button
                  key={app.id}
                  className={`sv-btn sv-btn--sm ${playbackSettings.preferredMusicApp === app.id ? 'sv-btn--primary' : 'sv-btn--ghost'}`}
                  onClick={() => handleSettingChange('preferredMusicApp', app.id)}
                >
                  {app.icon} {app.label}
                </button>
              ))}
            </div>
            <div style={{ fontSize: 'var(--sv-text-xs)', color: 'var(--sv-text-muted)', marginTop: 'var(--sv-space-2)' }}>
              Used to generate "Open in App" links for stories with music.
            </div>
          </div>

        </div>
      </div>

      {/* ── Scrape History ──────────────────── */}
      <div className="sv-card">
        <h2 className="sv-settings__section-title">📋 Scrape History</h2>
        <p className="sv-settings__section-desc" style={{ marginBottom: 'var(--sv-space-4)' }}>
          Recent cloud polling activity and results.
        </p>

        {scrapeLogs.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: 'var(--sv-text-sm)',
            }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--sv-border)' }}>
                  <th style={{ textAlign: 'left', padding: 'var(--sv-space-2) var(--sv-space-3)', color: 'var(--sv-text-muted)', fontWeight: 600, fontSize: 'var(--sv-text-xs)' }}>
                    Timestamp
                  </th>
                  <th style={{ textAlign: 'left', padding: 'var(--sv-space-2) var(--sv-space-3)', color: 'var(--sv-text-muted)', fontWeight: 600, fontSize: 'var(--sv-text-xs)' }}>
                    Status
                  </th>
                  <th style={{ textAlign: 'right', padding: 'var(--sv-space-2) var(--sv-space-3)', color: 'var(--sv-text-muted)', fontWeight: 600, fontSize: 'var(--sv-text-xs)' }}>
                    Found
                  </th>
                  <th style={{ textAlign: 'right', padding: 'var(--sv-space-2) var(--sv-space-3)', color: 'var(--sv-text-muted)', fontWeight: 600, fontSize: 'var(--sv-text-xs)' }}>
                    New
                  </th>
                </tr>
              </thead>
              <tbody>
                {scrapeLogs.map((log) => (
                  <tr key={log.id} style={{ borderBottom: '1px solid var(--sv-border)' }}>
                    <td style={{ padding: 'var(--sv-space-3)', fontFamily: 'var(--sv-font-mono)', fontSize: 'var(--sv-text-xs)' }}>
                      {new Date(log.started_at).toLocaleString()}
                    </td>
                    <td style={{ padding: 'var(--sv-space-3)' }}>
                      <span className={`sv-badge ${
                        log.status === 'success' ? 'sv-badge--success' :
                        log.status === 'error' ? 'sv-badge--error' :
                        'sv-badge--warning'
                      }`}>
                        {log.status}
                      </span>
                    </td>
                    <td style={{ padding: 'var(--sv-space-3)', textAlign: 'right' }}>
                      {log.stories_found}
                    </td>
                    <td style={{ padding: 'var(--sv-space-3)', textAlign: 'right', fontWeight: 600 }}>
                      {log.stories_new}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ color: 'var(--sv-text-muted)', fontSize: 'var(--sv-text-sm)' }}>
            No scrape logs yet. Connect Instagram and trigger a sync.
          </div>
        )}
      </div>

      {/* ── Account ─────────────────────────── */}
      <div className="sv-card">
        <h2 className="sv-settings__section-title">👤 Account & Maintenance</h2>
        <div style={{ marginTop: 'var(--sv-space-4)', display: 'flex', gap: 'var(--sv-space-3)' }}>
          <button
            className="sv-btn sv-btn--secondary"
            onClick={handleLogout}
          >
            🚪 Sign Out
          </button>
          
          <button
            className="sv-btn sv-btn--ghost"
            onClick={handleRescan}
            disabled={rescanning}
          >
            {rescanning ? '⏳ Scanning...' : '🔄 Rescan Local Metadata'}
          </button>
        </div>
      </div>
    </div>
  )
}
