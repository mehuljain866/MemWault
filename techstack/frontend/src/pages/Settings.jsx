import { useState, useEffect } from 'react'
import {
  getInstagramSession,
  browserLoginInstagram,
  disconnectInstagram,
  renewInstagramSession,
  getScrapeLogs,
  clearToken,
  rescanMetadata,
} from '../services/api'
import { getSettings, saveSettings } from '../services/settings'
import { useNavigate } from 'react-router-dom'
import { Camera, Play, List, User as UserIcon, RefreshCcw, LogOut, Link2, Map, Moon, Sun, Wifi, WifiOff } from 'lucide-react'

export default function Settings() {
  const navigate = useNavigate()
  const [igSession, setIgSession] = useState(null)
  const [scrapeLogs, setScrapeLogs] = useState([])
  const [connecting, setConnecting] = useState(false)
  const [renewing, setRenewing] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
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

  async function handleDisconnectInstagram() {
    if (!confirm('Disconnect your Instagram account? Your archived stories will remain, but syncing will stop.')) return
    setDisconnecting(true)
    try {
      await disconnectInstagram()
      setIgSession(null)
    } catch (err) {
      alert('Failed to disconnect: ' + err.message)
    } finally {
      setDisconnecting(false)
    }
  }

  async function handleRenewSession() {
    setError('')
    setRenewing(true)
    try {
      const result = await renewInstagramSession()
      if (result.status === 'login_success') {
        await loadData()
      } else {
        setError(result.message || 'Renewal failed. Please try again.')
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        setError('Login timed out. Please try again.')
      } else {
        setError(err.message)
      }
    } finally {
      setRenewing(false)
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
    
    // Apply theme immediately
    if (key === 'theme') {
      document.documentElement.setAttribute('data-theme', value);
    }
  }

  // Ensure initial theme is set correctly (this is also done in App.jsx but good to be safe here)
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', playbackSettings.theme || 'dark');
  }, [playbackSettings.theme]);

  const IosListGroup = ({ children }) => (
    <div style={{
      backgroundColor: 'var(--ios-bg-card)',
      borderRadius: '10px',
      overflow: 'hidden',
      marginBottom: '32px'
    }}>
      {children}
    </div>
  )

  const IosListItem = ({ icon: Icon, iconBg, title, value, onClick, last, children }) => (
    <div 
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center',
        padding: '12px 16px',
        borderBottom: last ? 'none' : '1px solid var(--ios-border)',
        cursor: onClick ? 'pointer' : 'default',
        backgroundColor: 'var(--ios-bg-card)'
      }}
    >
      {Icon && (
        <div style={{
          width: '28px', height: '28px', borderRadius: '6px',
          backgroundColor: iconBg || '#000', color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginRight: '16px'
        }}>
          <Icon size={18} />
        </div>
      )}
      <div style={{ flex: 1, fontSize: '16px', fontWeight: 400 }}>{title}</div>
      {value && <div style={{ color: 'var(--ios-text-secondary)', fontSize: '16px' }}>{value}</div>}
      {children && <div>{children}</div>}
    </div>
  )

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', paddingBottom: '40px' }}>
      <h2 className="ios-title">Settings</h2>

      {/* ── Instagram Connection ────────────── */}
      <div style={{ paddingLeft: '16px', marginBottom: '8px', fontSize: '13px', color: 'var(--ios-text-secondary)', textTransform: 'uppercase' }}>
        Instagram Connection
      </div>
      <IosListGroup>
        {igSession ? (
          <>
            <IosListItem icon={UserIcon} iconBg="#007aff" title="Username" value={`@${igSession.ig_username}`} />
            <IosListItem 
              icon={igSession.is_valid ? Wifi : WifiOff} 
              iconBg={igSession.is_valid ? '#34c759' : '#ff3b30'} 
              title="Status" 
              value={igSession.is_valid ? 'Connected ✓' : 'Session Expired'}
            />
            <IosListItem icon={UserIcon} iconBg="#5856d6" title="Last Login" value={new Date(igSession.last_login).toLocaleDateString()} />
            {/* Action Buttons */}
            <div style={{ padding: '16px', display: 'flex', gap: '12px', borderTop: '1px solid var(--ios-border)' }}>
              {(renewing) ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--ios-text-secondary)', fontSize: '14px' }}>
                  <RefreshCcw size={18} className="spin-anim" color="var(--ios-accent)" />
                  A browser window is open. Please log in there...
                </div>
              ) : (
                <>
                  <button
                    className="ios-btn"
                    onClick={handleRenewSession}
                    style={{ flex: 1, fontSize: '14px', padding: '10px', gap: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <RefreshCcw size={16} /> Renew Session
                  </button>
                  <button
                    onClick={handleDisconnectInstagram}
                    disabled={disconnecting}
                    style={{
                      flex: 1, fontSize: '14px', padding: '10px',
                      background: 'rgba(255, 59, 48, 0.1)',
                      border: '1px solid rgba(255, 59, 48, 0.3)',
                      borderRadius: '12px', color: 'var(--ios-danger)',
                      cursor: 'pointer', fontWeight: 600,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                      fontFamily: 'inherit',
                    }}
                  >
                    <WifiOff size={16} /> {disconnecting ? 'Disconnecting...' : 'Disconnect'}
                  </button>
                </>
              )}
            </div>
            {error && <div style={{ padding: '8px 16px 16px', color: 'var(--ios-danger)', fontSize: '13px' }}>{error}</div>}
          </>
        ) : (
          <div style={{ padding: '24px 16px', textAlign: 'center' }}>
            {error && <div style={{ color: 'var(--ios-danger)', marginBottom: '16px' }}>{error}</div>}
            
            {connecting ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                <RefreshCcw size={32} className="spin-anim" color="var(--ios-accent)" />
                <div>A browser window is open. Please log in there.</div>
              </div>
            ) : (
              <button className="ios-btn" onClick={handleBrowserLogin} style={{ width: '100%', maxWidth: '300px' }}>
                <Link2 size={18} /> Connect with Instagram
              </button>
            )}
          </div>
        )}
      </IosListGroup>

      {/* ── Preferences ────────────── */}
      <div style={{ paddingLeft: '16px', marginBottom: '8px', fontSize: '13px', color: 'var(--ios-text-secondary)', textTransform: 'uppercase' }}>
        Preferences
      </div>
      <IosListGroup>
        {/* Theme Toggle */}
        <div style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '16px' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '6px', backgroundColor: '#5856d6', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {playbackSettings.theme === 'light' ? <Sun size={18} /> : <Moon size={18} />}
            </div>
            Appearance
          </div>
          <div style={{ display: 'flex', background: 'var(--ios-border)', borderRadius: '20px', padding: '2px' }}>
            <button 
              onClick={() => handleSettingChange('theme', 'light')}
              style={{ border: 'none', background: playbackSettings.theme === 'light' ? 'var(--ios-bg-card)' : 'transparent', color: playbackSettings.theme === 'light' ? 'var(--ios-text-primary)' : 'var(--ios-text-secondary)', padding: '6px 12px', borderRadius: '18px', fontWeight: 600, fontSize: '13px', cursor: 'pointer', boxShadow: playbackSettings.theme === 'light' ? '0 2px 8px rgba(0,0,0,0.1)' : 'none' }}
            >Light</button>
            <button 
              onClick={() => handleSettingChange('theme', 'dark')}
              style={{ border: 'none', background: playbackSettings.theme === 'dark' ? '#333' : 'transparent', color: playbackSettings.theme === 'dark' ? '#fff' : 'var(--ios-text-secondary)', padding: '6px 12px', borderRadius: '18px', fontWeight: 600, fontSize: '13px', cursor: 'pointer', boxShadow: playbackSettings.theme === 'dark' ? '0 2px 8px rgba(0,0,0,0.1)' : 'none' }}
            >Dark</button>
          </div>
        </div>

        {/* Map View Mode */}
        <div style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--ios-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '16px' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '6px', backgroundColor: '#34c759', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Map size={18} />
            </div>
            Map Style
          </div>
          <div style={{ display: 'flex', background: 'var(--ios-border)', borderRadius: '20px', padding: '2px' }}>
            <button 
              onClick={() => handleSettingChange('mapMode', 'split')}
              style={{ border: 'none', background: playbackSettings.mapMode === 'split' ? 'var(--ios-bg-card)' : 'transparent', color: playbackSettings.mapMode === 'split' ? 'var(--ios-text-primary)' : 'var(--ios-text-secondary)', padding: '6px 12px', borderRadius: '18px', fontWeight: 600, fontSize: '13px', cursor: 'pointer', boxShadow: playbackSettings.mapMode === 'split' ? '0 2px 8px rgba(0,0,0,0.1)' : 'none' }}
            >Split Screen</button>
            <button 
              onClick={() => handleSettingChange('mapMode', 'immersive')}
              style={{ border: 'none', background: playbackSettings.mapMode === 'immersive' ? 'var(--ios-bg-card)' : 'transparent', color: playbackSettings.mapMode === 'immersive' ? 'var(--ios-text-primary)' : 'var(--ios-text-secondary)', padding: '6px 12px', borderRadius: '18px', fontWeight: 600, fontSize: '13px', cursor: 'pointer', boxShadow: playbackSettings.mapMode === 'immersive' ? '0 2px 8px rgba(0,0,0,0.1)' : 'none' }}
            >Immersive</button>
          </div>
        </div>
      </IosListGroup>

      {/* ── Playback ────────────── */}
      <div style={{ paddingLeft: '16px', marginBottom: '8px', fontSize: '13px', color: 'var(--ios-text-secondary)', textTransform: 'uppercase' }}>
        Playback & Media
      </div>
      <IosListGroup>
        <div style={{ padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '16px' }}>Auto-Play Delay (Video)</span>
            <span style={{ color: 'var(--ios-text-secondary)' }}>
              {playbackSettings.autoplayDelay === -1 ? 'Disabled' : `${playbackSettings.autoplayDelay}s`}
            </span>
          </div>
          <input 
            type="range" min="-1" max="5" step="1"
            value={playbackSettings.autoplayDelay}
            onChange={(e) => handleSettingChange('autoplayDelay', parseInt(e.target.value))}
            style={{ width: '100%', accentColor: 'var(--ios-accent)' }}
          />
        </div>

        <div style={{ padding: '16px', borderTop: '1px solid var(--ios-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '16px' }}>Music Skip Duration</div>
          <div style={{ display: 'flex', background: 'var(--ios-border)', borderRadius: '20px', padding: '2px' }}>
            {[3, 4, 5].map(val => (
              <button 
                key={val}
                onClick={() => handleSettingChange('skipDuration', val)}
                style={{ 
                  border: 'none', 
                  background: playbackSettings.skipDuration === val ? 'var(--ios-bg-card)' : 'transparent', 
                  color: playbackSettings.skipDuration === val ? 'var(--ios-text-primary)' : 'var(--ios-text-secondary)', 
                  padding: '6px 16px', 
                  borderRadius: '18px', 
                  fontWeight: 600, 
                  fontSize: '13px', 
                  cursor: 'pointer', 
                  boxShadow: playbackSettings.skipDuration === val ? '0 2px 8px rgba(0,0,0,0.1)' : 'none' 
                }}
              >{val}s</button>
            ))}
          </div>
        </div>
        
        <div style={{ padding: '16px', borderTop: '1px solid var(--ios-border)' }}>
          <div style={{ fontSize: '16px', marginBottom: '12px' }}>Preferred Music App</div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {[
              { id: 'spotify', label: 'Spotify', color: '#1DB954', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.54.659.301 1.02zm1.44-3.3c-.301.42-.84.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.84.241 1.2zM19.08 9.3C15.12 6.96 8.76 6.78 5.1 7.86c-.6.18-1.2-.18-1.38-.72-.18-.6.18-1.2.72-1.38 4.2-1.2 11.28-1.02 15.72 1.62.539.3.719 1.02.419 1.56-.239.48-.959.66-1.5.36z"/></svg> },
              { id: 'apple', label: 'Apple Music', color: '#fa243c', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm3.333 13.585c-.092.17-.225.298-.387.382-.162.083-.342.12-.533.12H9.587c-.19 0-.37-.037-.533-.12a1.053 1.053 0 0 1-.387-.382c-.092-.17-.144-.36-.144-.564V8.425c0-.204.052-.394.144-.564.092-.17.225-.298.387-.382.162-.084.342-.12.533-.12h4.826c.19 0 .37.036.533.12.162.084.295.212.387.382.092.17.144.36.144.564v6.596c0 .204-.052.394-.144.564z"/></svg> },
              { id: 'youtube', label: 'YouTube Music', color: '#FF0000', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg> },
              { id: 'amazon', label: 'Amazon Music', color: '#00A8E1', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm3.17 14.18c-1.3.8-3.05 1.15-4.59 1.15-1.9 0-3.92-.48-5.34-1.39-.18-.12-.21-.36-.06-.51l1.1-1.12c.12-.13.3-.15.46-.05.95.58 2.3 1 3.57 1 1.7 0 2.68-.45 2.68-1.36 0-1-.87-1.34-2.81-1.85-2.22-.59-3.79-1.46-3.79-3.4 0-1.96 1.55-3.32 4.14-3.32 1.52 0 2.87.39 3.86.88.16.08.19.3.08.45l-1 1.25c-.1.13-.28.16-.43.07-.72-.39-1.74-.75-3.08-.75-1.42 0-2.07.57-2.07 1.25 0 .8.71 1.23 2.55 1.73 2.45.66 4.07 1.53 4.07 3.52 0 2.15-1.57 3.32-4.32 3.32z"/></svg> },
            ].map(app => (
              <button
                key={app.id}
                onClick={() => handleSettingChange('preferredMusicApp', app.id)}
                style={{
                  padding: '6px 12px', borderRadius: '16px', border: 'none',
                  backgroundColor: playbackSettings.preferredMusicApp === app.id ? app.color : 'var(--ios-border)',
                  color: playbackSettings.preferredMusicApp === app.id ? '#fff' : 'var(--ios-text-primary)',
                  fontWeight: 600, fontSize: '14px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '6px'
                }}
              >
                {app.icon}
                {app.label}
              </button>
            ))}
          </div>
        </div>
      </IosListGroup>

      {/* ── Journal Editor ────────────── */}
      <div style={{ paddingLeft: '16px', marginBottom: '8px', fontSize: '13px', color: 'var(--ios-text-secondary)', textTransform: 'uppercase' }}>
        Journal Editor
      </div>
      <IosListGroup>
        <div style={{ padding: '16px', borderBottom: '1px solid var(--ios-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '16px' }}>Split Pane Preview</div>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <div style={{ position: 'relative', width: '50px', height: '30px', borderRadius: '15px', background: playbackSettings.editorSplitPane ? 'var(--ios-success)' : 'var(--ios-border)', transition: 'background 0.3s' }}>
              <div style={{ position: 'absolute', top: '2px', left: playbackSettings.editorSplitPane ? '22px' : '2px', width: '26px', height: '26px', borderRadius: '50%', background: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.2)', transition: 'left 0.3s' }} />
            </div>
            <input type="checkbox" checked={playbackSettings.editorSplitPane} onChange={(e) => handleSettingChange('editorSplitPane', e.target.checked)} style={{ display: 'none' }} />
          </label>
        </div>

        <div style={{ padding: '16px', borderBottom: '1px solid var(--ios-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '16px' }}>Design Philosophy</div>
          <div style={{ display: 'flex', background: 'var(--ios-border)', borderRadius: '20px', padding: '2px' }}>
            {['docs', 'invisible'].map(style => (
              <button key={style} onClick={() => handleSettingChange('editorStyle', style)} style={{ border: 'none', background: playbackSettings.editorStyle === style ? 'var(--ios-bg-card)' : 'transparent', color: playbackSettings.editorStyle === style ? 'var(--ios-text-primary)' : 'var(--ios-text-secondary)', padding: '6px 12px', borderRadius: '18px', fontWeight: 600, fontSize: '13px', cursor: 'pointer', boxShadow: playbackSettings.editorStyle === style ? '0 2px 8px rgba(0,0,0,0.1)' : 'none', textTransform: 'capitalize' }}>
                {style === 'docs' ? 'Modern (Docs)' : 'Apple Notes (Invisible)'}
              </button>
            ))}
          </div>
        </div>

        <div style={{ padding: '16px', borderBottom: playbackSettings.editorRibbonMode === 'simple' ? '1px solid var(--ios-border)' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '16px' }}>Ribbon Complexity</div>
          <div style={{ display: 'flex', background: 'var(--ios-border)', borderRadius: '20px', padding: '2px' }}>
            {['simple', 'advanced'].map(mode => (
              <button key={mode} onClick={() => handleSettingChange('editorRibbonMode', mode)} style={{ border: 'none', background: playbackSettings.editorRibbonMode === mode ? 'var(--ios-bg-card)' : 'transparent', color: playbackSettings.editorRibbonMode === mode ? 'var(--ios-text-primary)' : 'var(--ios-text-secondary)', padding: '6px 12px', borderRadius: '18px', fontWeight: 600, fontSize: '13px', cursor: 'pointer', boxShadow: playbackSettings.editorRibbonMode === mode ? '0 2px 8px rgba(0,0,0,0.1)' : 'none', textTransform: 'capitalize' }}>
                {mode}
              </button>
            ))}
          </div>
        </div>

        {playbackSettings.editorRibbonMode === 'simple' && (
          <div style={{ padding: '16px' }}>
            <div style={{ fontSize: '14px', marginBottom: '12px', color: 'var(--ios-text-secondary)' }}>Add Custom Tools to Simple Ribbon:</div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {['image', 'link', 'code', 'quote', 'unordered-list'].map(tool => {
                const isActive = (playbackSettings.editorCustomTools || []).includes(tool);
                return (
                  <button key={tool} onClick={() => {
                    const tools = new Set(playbackSettings.editorCustomTools || []);
                    if (isActive) tools.delete(tool);
                    else tools.add(tool);
                    handleSettingChange('editorCustomTools', Array.from(tools));
                  }} style={{ padding: '6px 12px', borderRadius: '16px', border: isActive ? 'none' : '1px solid var(--ios-border)', backgroundColor: isActive ? 'var(--ios-accent)' : 'transparent', color: isActive ? '#fff' : 'var(--ios-text-primary)', fontWeight: 600, fontSize: '13px', cursor: 'pointer', textTransform: 'capitalize' }}>
                    {tool.replace('-', ' ')}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </IosListGroup>

      {/* ── Media Tagging ────────────── */}
      <div style={{ paddingLeft: '16px', marginTop: '24px', marginBottom: '8px', fontSize: '13px', color: 'var(--ios-text-secondary)', textTransform: 'uppercase' }}>
        Media Tagging
      </div>
      <IosListGroup>
        <div style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '16px' }}>
            <div>Show AI Labels on Media</div>
            <div style={{ fontSize: '13px', color: 'var(--ios-text-secondary)', marginTop: '4px' }}>Displays a visual badge over AI-generated or assisted content.</div>
          </div>
          <div 
            onClick={() => handleSettingChange('showAITags', !playbackSettings.showAITags)}
            style={{
              width: '50px', height: '30px', borderRadius: '15px',
              backgroundColor: playbackSettings.showAITags ? '#34c759' : 'var(--ios-border)',
              position: 'relative', cursor: 'pointer', transition: 'background-color 0.2s'
            }}
          >
            <div style={{
              position: 'absolute', top: '2px', left: playbackSettings.showAITags ? '22px' : '2px',
              width: '26px', height: '26px', borderRadius: '50%', backgroundColor: '#fff',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)', transition: 'left 0.2s'
            }} />
          </div>
        </div>
      </IosListGroup>

      {/* ── Scrape History ────────────── */}
      <div style={{ paddingLeft: '16px', marginBottom: '8px', fontSize: '13px', color: 'var(--ios-text-secondary)', textTransform: 'uppercase' }}>
        Scrape History
      </div>
      <IosListGroup>
        {scrapeLogs.length > 0 ? (
          scrapeLogs.map((log, idx) => (
            <IosListItem
              key={log.id}
              icon={List} iconBg={log.status === 'success' ? '#34c759' : '#ff3b30'}
              title={new Date(log.started_at).toLocaleString()}
              value={`${log.stories_new} New`}
              last={idx === scrapeLogs.length - 1}
            />
          ))
        ) : (
          <IosListItem title="No history yet" last />
        )}
      </IosListGroup>

      {/* ── Maintenance ────────────── */}
      <div style={{ paddingLeft: '16px', marginBottom: '8px', fontSize: '13px', color: 'var(--ios-text-secondary)', textTransform: 'uppercase' }}>
        Maintenance
      </div>
      <IosListGroup>
        <IosListItem
          icon={RefreshCcw} iconBg="#ff9500"
          title={rescanning ? "Scanning..." : "Rescan Local Metadata"}
          onClick={handleRescan}
        />
        <IosListItem
          icon={LogOut} iconBg="#ff3b30"
          title={<span style={{ color: 'var(--ios-danger)' }}>Sign Out</span>}
          onClick={handleLogout}
          last
        />
      </IosListGroup>

    </div>
  )
}
