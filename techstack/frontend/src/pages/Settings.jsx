import { useState, useEffect } from 'react'
import {
  getInstagramSession,
  browserLoginInstagram,
  getScrapeLogs,
  clearToken,
} from '../services/api'
import { useNavigate } from 'react-router-dom'

export default function Settings() {
  const navigate = useNavigate()
  const [igSession, setIgSession] = useState(null)
  const [scrapeLogs, setScrapeLogs] = useState([])
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState('')

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
        <h2 className="sv-settings__section-title">👤 Account</h2>
        <div style={{ marginTop: 'var(--sv-space-4)' }}>
          <button
            className="sv-btn sv-btn--secondary"
            onClick={handleLogout}
          >
            🚪 Sign Out
          </button>
        </div>
      </div>
    </div>
  )
}
