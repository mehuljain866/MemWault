import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  getInstagramSession,
  browserLoginInstagram,
  disconnectInstagram,
  renewInstagramSession,
  getScrapeLogs,
  clearToken,
  rescanMetadata,
  openStorageFolder,
} from '../services/api'
import { getSettings, saveSettings, applyThemeSettings, THEME_CATALOG } from '../services/settings'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { 
  Camera, Play, List, User as UserIcon, RefreshCcw, RefreshCw, LogOut, 
  Link2, Map, Moon, Sun, Wifi, WifiOff, Folder, Sparkles, Menu,
  ShieldCheck, CheckCircle2, XCircle, Image as ImageIcon, Users, Hash,
  Sliders, Download, Upload as UploadIcon, Monitor, Tv, Palette, Check, Power,
  Layers, Clock, Database, Music as MusicIcon
} from 'lucide-react'
import ShutdownModal from '../components/ShutdownModal'

export default function Settings() {
  const navigate = useNavigate()
  const { onMenuClick } = useOutletContext() || {}
  const [igSession, setIgSession] = useState(null)
  const [scrapeLogs, setScrapeLogs] = useState([])
  const [connecting, setConnecting] = useState(false)
  const [renewing, setRenewing] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [rescanning, setRescanning] = useState(false)
  const [folderMsg, setFolderMsg] = useState('')
  const [error, setError] = useState('')
  const [playbackSettings, setPlaybackSettings] = useState(getSettings())
  const [shutdownModalOpen, setShutdownModalOpen] = useState(false)

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

  async function handleOpenFolder() {
    setFolderMsg('')
    try {
      const res = await openStorageFolder()
      setFolderMsg(res?.path ? `Opened: ${res.path}` : 'Folder opened.')
    } catch (err) {
      setFolderMsg('')
      alert('Failed to open storage folder: ' + err.message)
    }
  }

  function handleSettingChange(key, value) {
    const newSettings = { ...playbackSettings, [key]: value };
    setPlaybackSettings(newSettings);
    saveSettings(newSettings);
    applyThemeSettings(newSettings);
  }

  useEffect(() => {
    applyThemeSettings(playbackSettings);
  }, [playbackSettings.theme, playbackSettings.designPhilosophy]);

  const IosListGroup = ({ children }) => (
    <div className="settings-section-card settings-list-group" style={{
      backgroundColor: 'var(--ios-bg-card)',
      borderRadius: '12px',
      border: '1px solid var(--ios-border)',
      overflow: 'hidden',
      marginBottom: '32px'
    }}>
      {children}
    </div>
  )

  const IosListItem = ({ icon: Icon, iconBg, title, value, onClick, last, children }) => (
    <div 
      onClick={onClick}
      className="settings-list-item"
      style={{
        display: 'flex', alignItems: 'center',
        padding: '14px 16px',
        borderBottom: last ? 'none' : '1px solid var(--ios-border)',
        cursor: onClick ? 'pointer' : 'default',
        backgroundColor: 'var(--ios-bg-card)'
      }}
    >
      {Icon && (
        <div style={{
          width: '28px', height: '28px', borderRadius: '8px',
          backgroundColor: iconBg || '#000', color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginRight: '14px', flexShrink: 0
        }}>
          <Icon size={16} />
        </div>
      )}
      <div className="settings-item-title" style={{ flex: 1, fontSize: '15px', fontWeight: 500, color: 'var(--ios-text-primary)' }}>{title}</div>
      {value && <div className="settings-item-val" style={{ color: 'var(--ios-text-secondary)', fontSize: '14px', fontWeight: 500 }}>{value}</div>}
      {children && <div>{children}</div>}
    </div>
  )

  return (
    <motion.div 
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.25 }}
      style={{ maxWidth: '800px', margin: '0 auto', paddingBottom: '40px' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
        <button
          className="ios-btn-secondary"
          onClick={onMenuClick}
          style={{ display: window.innerWidth <= 768 ? 'flex' : 'none', padding: '8px', borderRadius: '8px' }}
        >
          <Menu size={22} />
        </button>
        <h2 className="ios-title" style={{ margin: 0 }}>Settings</h2>
      </div>

      {/* ── Instagram Connection ────────────── */}
      <div className="settings-section-header" style={{ paddingLeft: '8px', marginBottom: '8px', fontSize: '12px', color: 'var(--ios-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>
        Instagram Account & Status
      </div>
      <div className="settings-section-card" style={{
        backgroundColor: 'var(--ios-bg-card)',
        borderRadius: '16px',
        border: '1px solid var(--ios-border)',
        boxShadow: 'var(--ios-shadow-sm)',
        overflow: 'hidden',
        marginBottom: '32px'
      }}>
        {igSession ? (
          <div>
            {/* Profile Header Banner */}
            <div style={{
              padding: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '16px',
              borderBottom: '1px solid var(--ios-border)',
              background: 'var(--ios-bg-app)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                {/* Avatar with Ring */}
                <div style={{
                  position: 'relative',
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  padding: '2px',
                  background: 'var(--ios-accent, #e89e38)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  flexShrink: 0
                }}>
                  {igSession.profile_pic_url ? (
                    <img
                      src={`/api/v1/proxy/image?url=${encodeURIComponent(igSession.profile_pic_url)}`}
                      alt={igSession.full_name || igSession.ig_username}
                      onError={(e) => {
                        if (e.target.src.includes('/proxy/')) {
                          e.target.src = igSession.profile_pic_url
                        } else {
                          e.target.style.display = 'none'
                        }
                      }}
                      style={{
                        width: '100%',
                        height: '100%',
                        borderRadius: '50%',
                        objectFit: 'cover',
                        backgroundColor: 'var(--ios-bg-card)',
                        display: 'block'
                      }}
                    />
                  ) : (
                    <div style={{
                      width: '100%',
                      height: '100%',
                      borderRadius: '50%',
                      backgroundColor: 'var(--ios-bg-card)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--ios-accent)'
                    }}>
                      <UserIcon size={26} />
                    </div>
                  )}
                  {/* Status Indicator Beacon */}
                  <div style={{
                    position: 'absolute',
                    bottom: '0px',
                    right: '0px',
                    width: '14px',
                    height: '14px',
                    borderRadius: '50%',
                    backgroundColor: igSession.is_valid ? '#34c759' : '#ff3b30',
                    border: '2px solid var(--ios-bg-card)',
                    boxShadow: igSession.is_valid ? '0 0 8px #34c759' : 'none'
                  }} />
                </div>

                {/* User Titles & Handle */}
                <div>
                  <div style={{ fontSize: '17px', fontWeight: 800, color: 'var(--ios-text-primary)', letterSpacing: '-0.3px', lineHeight: 1.2 }}>
                    {igSession.full_name || igSession.ig_username}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '3px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ios-accent)' }}>
                      @{igSession.ig_username}
                    </span>
                    {igSession.is_valid && (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        backgroundColor: '#34c759',
                        color: '#ffffff',
                        padding: '2px 8px',
                        borderRadius: '10px',
                        fontSize: '11px',
                        fontWeight: 700
                      }}>
                        <CheckCircle2 size={11} /> Connected
                      </span>
                    )}
                  </div>
                  {igSession.biography && (
                    <div style={{ fontSize: '12px', color: 'var(--ios-text-secondary)', marginTop: '4px', maxWidth: '360px' }}>
                      {igSession.biography}
                    </div>
                  )}
                </div>
              </div>

              {/* Metrics Strip */}
              {(igSession.media_count !== undefined || igSession.follower_count !== undefined) && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  backgroundColor: 'var(--ios-bg-card)',
                  padding: '8px 16px',
                  borderRadius: '12px',
                  border: '1px solid var(--ios-border)'
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--ios-text-primary)' }}>
                      {igSession.media_count ?? 0}
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--ios-text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>
                      Posts
                    </div>
                  </div>
                  <div style={{ width: '1px', height: '24px', backgroundColor: 'var(--ios-border)' }} />
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--ios-text-primary)' }}>
                      {igSession.follower_count ?? 0}
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--ios-text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>
                      Followers
                    </div>
                  </div>
                  <div style={{ width: '1px', height: '24px', backgroundColor: 'var(--ios-border)' }} />
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--ios-text-primary)' }}>
                      {igSession.following_count ?? 0}
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--ios-text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>
                      Following
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Metadata Items */}
            <IosListItem 
              icon={igSession.is_valid ? Wifi : WifiOff} 
              iconBg={igSession.is_valid ? '#34c759' : '#ff3b30'} 
              title="Connection Status" 
              value={igSession.is_valid ? 'Active & Polling Local Stories' : 'Session Expired'}
            />
            {igSession.ig_user_id && (
              <IosListItem 
                icon={Hash} 
                iconBg="#5856d6" 
                title="Instagram User ID" 
                value={igSession.ig_user_id} 
              />
            )}
            <IosListItem 
              icon={UserIcon} 
              iconBg="#af52de" 
              title="Last Session Update" 
              value={new Date(igSession.last_login).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })} 
              last={true}
            />

            {/* Action Buttons */}
            <div style={{ padding: '16px 20px', display: 'flex', gap: '12px', borderTop: '1px solid var(--ios-border)' }}>
              {renewing ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--ios-text-secondary)', fontSize: '14px' }}>
                  <RefreshCcw size={18} className="spin-anim" color="var(--ios-accent)" />
                  A browser window is open. Please log in there...
                </div>
              ) : (
                <>
                  <button
                    className="ios-btn"
                    onClick={handleRenewSession}
                    style={{ flex: 1, fontSize: '14px', padding: '10px', gap: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
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
                      borderRadius: 'var(--ios-radius-md, 12px)', color: 'var(--ios-danger)',
                      cursor: 'pointer', fontWeight: 600,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    }}
                  >
                    <WifiOff size={16} /> {disconnecting ? 'Disconnecting...' : 'Disconnect'}
                  </button>
                </>
              )}
            </div>
            {error && <div style={{ padding: '8px 20px 16px', color: 'var(--ios-danger)', fontSize: '13px' }}>{error}</div>}
          </div>
        ) : (
          <div style={{ padding: '32px 20px', textAlign: 'center' }}>
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
      </div>

      {/* ── Vault Identity & Universal Theme System ────────── */}
      {/* ── Vault Identity & Universal Theme System ────────── */}
      <div className="settings-section-header" style={{ paddingLeft: '8px', marginBottom: '8px', fontSize: '12px', color: 'var(--ios-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>
        Vault Themes & Visual Chrome (17 Presets)
      </div>

      <div className="settings-section-card" style={{
        backgroundColor: 'var(--ios-bg-card)',
        borderRadius: '16px',
        border: '1px solid var(--ios-border)',
        boxShadow: 'var(--ios-shadow-sm)',
        padding: '24px 20px',
        marginBottom: '32px'
      }}>
        {/* Tier 1: Theme Header & Light/Dark Mode Switcher */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--ios-text-primary)' }}>
              <Palette size={18} color="var(--ios-accent)" />
              <span>Theme Matrix</span>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--ios-text-secondary)', marginTop: '2px' }}>
              Click any style to switch appearance instantly.
            </div>
          </div>

          {/* Light / Dark Mode Toggle */}
          <div className="segmented-container segment-group" style={{
            display: 'flex',
            background: 'var(--ios-bg-app)',
            border: '1px solid var(--ios-border)',
            borderRadius: '12px',
            padding: '3px',
            gap: '3px'
          }}>
            {[['dark', 'Dark', Moon], ['light', 'Light', Sun]].map(([val, label, IconComponent]) => {
              const isSelected = playbackSettings.theme === val;
              return (
                <button
                  key={val}
                  onClick={() => handleSettingChange('theme', val)}
                  className={`segment-btn ${isSelected ? 'active' : ''}`}
                  style={{
                    border: 'none',
                    borderRadius: '8px',
                    backgroundColor: isSelected ? 'var(--ios-accent)' : 'transparent',
                    color: isSelected ? '#ffffff' : 'var(--ios-text-secondary)',
                    padding: '6px 14px',
                    fontWeight: isSelected ? 700 : 500,
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <IconComponent size={14} />
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Group A: Material Worlds */}
        <div style={{ marginBottom: '22px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ios-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Layers size={14} color="var(--ios-accent)" />
            <span>Material Worlds (Tactile Archival Presets)</span>
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
            gap: '12px'
          }}>
            {THEME_CATALOG.filter(t => t.category === 'material').map((t) => {
              const isSelected = (playbackSettings.themeId || 'darkroom') === t.id;
              return (
                <div
                  key={t.id}
                  onClick={() => {
                    handleSettingChange('themeId', t.id);
                    window.dispatchEvent(new Event('memwault-settings-changed'));
                  }}
                  className={`settings-theme-swatch ${isSelected ? 'is-selected' : ''}`}
                  style={{
                    backgroundColor: 'var(--ios-bg-app)',
                    borderRadius: '12px',
                    border: isSelected ? `2px solid ${t.accent}` : '1px solid var(--ios-border)',
                    padding: '12px',
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'all 0.15s ease',
                    boxShadow: isSelected ? `0 0 16px ${t.accent}33` : 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    minHeight: '90px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{
                      width: '18px', height: '18px', borderRadius: '50%',
                      backgroundColor: t.accent, border: '2px solid rgba(255,255,255,0.4)',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                    }} />
                    {isSelected && (
                      <div style={{
                        width: '18px', height: '18px', borderRadius: '50%',
                        backgroundColor: t.accent, color: '#fff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '10px'
                      }}>
                        <Check size={12} strokeWidth={3} />
                      </div>
                    )}
                  </div>
                  <div style={{ marginTop: '8px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--ios-text-primary)' }}>{t.name}</div>
                    <div style={{ fontSize: '10px', color: 'var(--ios-text-secondary)', marginTop: '2px', lineHeight: 1.2 }}>{t.tagline}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Group B: Design Eras */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ios-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Monitor size={14} color="var(--ios-accent)" />
            <span>Design Eras (Operating System Shells & Eras)</span>
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
            gap: '12px'
          }}>
            {THEME_CATALOG.filter(t => t.category === 'era').map((t) => {
              const isSelected = playbackSettings.themeId === t.id;
              return (
                <div
                  key={t.id}
                  onClick={() => {
                    handleSettingChange('themeId', t.id);
                    window.dispatchEvent(new Event('memwault-settings-changed'));
                  }}
                  className={`settings-theme-swatch ${isSelected ? 'is-selected' : ''}`}
                  style={{
                    backgroundColor: 'var(--ios-bg-app)',
                    borderRadius: '12px',
                    border: isSelected ? `2px solid ${t.accent}` : '1px solid var(--ios-border)',
                    padding: '12px',
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'all 0.15s ease',
                    boxShadow: isSelected ? `0 0 16px ${t.accent}33` : 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    minHeight: '90px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{
                      fontSize: '9px', fontWeight: 800,
                      background: t.accent, color: '#fff',
                      padding: '2px 6px', borderRadius: '6px'
                    }}>
                      {t.era}
                    </span>
                    {isSelected && (
                      <div style={{
                        width: '18px', height: '18px', borderRadius: '50%',
                        backgroundColor: t.accent, color: '#fff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '10px'
                      }}>
                        <Check size={12} strokeWidth={3} />
                      </div>
                    )}
                  </div>
                  <div style={{ marginTop: '8px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--ios-text-primary)' }}>{t.name}</div>
                    <div style={{ fontSize: '10px', color: 'var(--ios-text-secondary)', marginTop: '2px', lineHeight: 1.2 }}>{t.tagline}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tactile Sliders */}
        <div style={{
          borderTop: '1px solid var(--ios-border)',
          paddingTop: '18px',
          marginTop: '16px'
        }}>
          <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sliders size={16} color="var(--ios-accent)" />
            <span>Tactile Material Refinements</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            {/* Grain */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>
                <span>Photographic Grain Intensity</span>
                <span style={{ color: 'var(--ios-accent)' }}>{Math.round((playbackSettings.grainIntensity ?? 0.05) * 1000)}%</span>
              </div>
              <input
                type="range"
                min="0" max="0.15" step="0.01"
                value={playbackSettings.grainIntensity ?? 0.05}
                onChange={(e) => handleSettingChange('grainIntensity', parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--ios-accent)' }}
              />
            </div>

            {/* Patina */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>
                <span>Archival Patina & Vignette</span>
                <span style={{ color: 'var(--ios-accent)' }}>{Math.round((playbackSettings.patinaLevel ?? 0.3) * 100)}%</span>
              </div>
              <input
                type="range"
                min="0" max="0.8" step="0.05"
                value={playbackSettings.patinaLevel ?? 0.3}
                onChange={(e) => handleSettingChange('patinaLevel', parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--ios-accent)' }}
              />
            </div>
          </div>

          {/* Retro CRT Scanline Toggle */}
          <div className="settings-row-panel" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '16px', padding: '10px 14px', background: 'var(--ios-bg-app)', borderRadius: '12px', border: '1px solid var(--ios-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Tv size={18} color="var(--ios-accent)" />
              <div>
                <div className="settings-item-title" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ios-text-primary)' }}>Retro CRT Scanlines & Phosphor Mode</div>
                <div className="settings-item-val" style={{ fontSize: '11px', color: 'var(--ios-text-secondary)' }}>Overlays authentic cathode-ray scanlines over viewports</div>
              </div>
            </div>
            <input
              type="checkbox"
              className="ios-toggle"
              checked={!!playbackSettings.crtMode}
              onChange={(e) => handleSettingChange('crtMode', e.target.checked)}
            />
          </div>
        </div>
      </div>

      {/* ── Preferences ────────────── */}
      <div className="settings-section-header" style={{ paddingLeft: '8px', marginBottom: '8px', fontSize: '12px', color: 'var(--ios-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>
        Preferences & Playback
      </div>
      <IosListGroup>
        {/* Map View Mode */}
        <div className="settings-row-panel" style={{ padding: '14px 16px', borderBottom: '1px solid var(--ios-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="settings-item-title" style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '15px', fontWeight: 600, color: 'var(--ios-text-primary)' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '8px', backgroundColor: '#34c759', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Map size={16} />
            </div>
            Map View Mode
          </div>
          <div className="segmented-container segment-group" style={{ display: 'flex', background: 'var(--ios-bg-app)', border: '1px solid var(--ios-border)', borderRadius: '10px', padding: '3px', gap: '3px' }}>
            {[['split','Split Screen'],['immersive','Immersive']].map(([val, label]) => {
              const isSelected = playbackSettings.mapMode === val;
              return (
                <button
                  key={val}
                  onClick={() => handleSettingChange('mapMode', val)}
                  className={`segment-btn ${isSelected ? 'active' : ''}`}
                  style={{
                    border: 'none',
                    borderRadius: '6px',
                    backgroundColor: isSelected ? 'var(--ios-accent)' : 'transparent',
                    color: isSelected ? '#ffffff' : 'var(--ios-text-secondary)',
                    padding: '5px 12px',
                    fontWeight: isSelected ? 700 : 500,
                    fontSize: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Preferred Music App */}
        <div className="settings-row-panel" style={{ padding: '14px 16px', borderBottom: '1px solid var(--ios-border)' }}>
          <div className="settings-item-title" style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '15px', fontWeight: 600, marginBottom: '12px', color: 'var(--ios-text-primary)' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '8px', backgroundColor: '#e89e38', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <MusicIcon size={16} />
            </div>
            Preferred Music App
          </div>
          <div className="segmented-container segment-group" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {[
              { 
                id: 'spotify', 
                label: 'Spotify', 
                color: '#1DB954', 
                icon: (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.494 17.306c-.215.352-.676.464-1.028.249-2.817-1.722-6.363-2.111-10.539-1.157-.402.092-.803-.16-.895-.562-.092-.403.159-.804.562-.896 4.571-1.045 8.492-.595 11.651 1.338.353.215.464.676.249 1.028zm1.464-3.262c-.27.44-.847.577-1.287.307-3.225-1.982-8.142-2.557-11.958-1.398-.498.151-1.026-.135-1.177-.633-.151-.498.135-1.026.633-1.177 4.364-1.324 9.789-.684 13.482 1.587.44.27.577.847.307 1.314zm.126-3.41c-3.868-2.296-10.248-2.508-13.941-1.387-.593.18-1.22-.164-1.4-.757-.18-.593.164-1.22.757-1.4 4.245-1.288 11.286-1.038 15.73 1.601.533.317.708 1.011.392 1.544-.317.534-1.012.709-1.538.4z"/>
                  </svg>
                )
              },
              { 
                id: 'apple', 
                label: 'Apple Music', 
                color: '#FA243C', 
                icon: (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 4.38c.62-.75 1.04-1.8 0.93-2.85-.9.04-1.99.6-2.63 1.35-.57.66-.99 1.73-.85 2.76 1 .08 2.03-.51 2.55-1.26z"/>
                  </svg>
                )
              },
              { 
                id: 'youtube', 
                label: 'YouTube Music', 
                color: '#FF0000', 
                icon: (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0C5.376 0 0 5.376 0 12s5.376 12 12 12 12-5.376 12-12S18.624 0 12 0zm0 19.104c-3.924 0-7.104-3.18-7.104-7.104 0-3.924 3.18-7.104 7.104-7.104 3.924 0 7.104 3.18 7.104 7.104 0 3.924-3.18 7.104-7.104 7.104zm0-11.832c-2.612 0-4.728 2.116-4.728 4.728 0 2.612 2.116 4.728 4.728 4.728 2.612 0 4.728-2.116 4.728-4.728 0-2.612-2.116-4.728-4.728-4.728zm-1.182 6.552V10.18l3.182 1.822-3.182 1.822z"/>
                  </svg>
                )
              },
              { 
                id: 'amazon', 
                label: 'Amazon Music', 
                color: '#00A8E1', 
                icon: (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M13.882 17.127c-3.834 2.827-9.351 1.344-12.87-1.127-.268-.188-.047-.539.255-.387 3.328 1.674 8.271 2.378 11.758-.456.452-.367.973.167.857.97zm1.37-1.611c-.244-.316-1.617-.15-2.235-.075-.188.023-.217-.137-.048-.255 1.096-.77 2.894-.548 3.104-.282.21.265-.058 2.062-1.09 2.919-.159.132-.309.061-.239-.112.23-.568.752-1.879.508-2.195zm-3.41-5.187c0-1.748-.093-3.219-1.92-3.219-2.25 0-2.394 1.866-2.394 3.42 0 1.547.234 3.238 2.253 3.238 1.948 0 2.061-1.747 2.061-3.439zm2.443 6.079h-2.19v-.933c-.663.784-1.579 1.157-2.611 1.157-2.368 0-4.223-1.685-4.223-4.464 0-3.085 2.14-4.524 4.549-4.524 1.026 0 1.684.341 2.285.932v-1.96c0-1.401-.587-2.15-2.222-2.15-1.199 0-2.387.625-2.585 1.777-.038.217-.204.372-.424.372h-2.07c-.24 0-.422-.207-.376-.443.468-2.428 2.65-3.69 5.568-3.69 3.036 0 4.385 1.583 4.385 4.417v6.62c0 1.258.077 2.128.291 2.895.045.163-.075.32-.243.32h-2.189c-.198 0-.323-.153-.377-.327-.086-.279-.176-.782-.246-1.393z"/>
                  </svg>
                )
              },
            ].map(app => {
              const isSelected = (playbackSettings.preferredMusicApp || 'spotify') === app.id;
              return (
                <button
                  key={app.id}
                  onClick={() => handleSettingChange('preferredMusicApp', app.id)}
                  className={`segment-btn ${isSelected ? 'active' : ''}`}
                  style={{
                    border: 'none',
                    borderRadius: '8px',
                    backgroundColor: isSelected ? 'var(--ios-accent)' : 'var(--ios-bg-app)',
                    color: isSelected ? '#ffffff' : 'var(--ios-text-primary)',
                    padding: '8px 14px',
                    fontWeight: isSelected ? 700 : 500,
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.15s ease',
                    boxShadow: isSelected ? '0 2px 8px rgba(0,0,0,0.15)' : 'none'
                  }}
                >
                  <span style={{ color: isSelected ? '#ffffff' : app.color }}>{app.icon}</span>
                  {app.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Auto-Play Toggle */}
        <div className="settings-row-panel" style={{ padding: '14px 16px', borderBottom: '1px solid var(--ios-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div className="settings-item-title" style={{ fontSize: '15px', fontWeight: 600, color: 'var(--ios-text-primary)' }}>Auto-Play Videos</div>
            <div className="settings-item-val" style={{ fontSize: '12px', color: 'var(--ios-text-secondary)' }}>Automatically start playback when opening a memory</div>
          </div>
          <input
            type="checkbox"
            className="ios-toggle"
            checked={playbackSettings.autoplay !== false}
            onChange={(e) => handleSettingChange('autoplay', e.target.checked)}
          />
        </div>

        {/* Looping Toggle */}
        <div className="settings-row-panel" style={{ padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div className="settings-item-title" style={{ fontSize: '15px', fontWeight: 600, color: 'var(--ios-text-primary)' }}>Looping Stories</div>
            <div className="settings-item-val" style={{ fontSize: '12px', color: 'var(--ios-text-secondary)' }}>Continuously loop video playback</div>
          </div>
          <input
            type="checkbox"
            className="ios-toggle"
            checked={playbackSettings.loopVideo !== false}
            onChange={(e) => handleSettingChange('loopVideo', e.target.checked)}
          />
        </div>

        {/* Custom / Themed QR Codes Toggle */}
        <div className="settings-row-panel" style={{ padding: '14px 16px', borderTop: '1px solid var(--ios-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div className="settings-item-title" style={{ fontSize: '15px', fontWeight: 600, color: 'var(--ios-text-primary)' }}>Custom & Era-Styled QR Codes</div>
            <div className="settings-item-val" style={{ fontSize: '12px', color: 'var(--ios-text-secondary)' }}>Render stylized era-themed QR frames (Windows 98, Y2K chrome, etc.) or standard high-contrast matrix</div>
          </div>
          <input
            type="checkbox"
            className="ios-toggle"
            checked={playbackSettings.customQRCodes !== false}
            onChange={(e) => handleSettingChange('customQRCodes', e.target.checked)}
          />
        </div>

        {/* Win98 Quick Toolbar Toggle */}
        {playbackSettings.themeId === 'win98' && (
          <div className="settings-row-panel" style={{ padding: '14px 16px', borderTop: '1px solid var(--ios-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div className="settings-item-title" style={{ fontSize: '15px', fontWeight: 600, color: 'var(--ios-text-primary)' }}>Show Win98 Toolbar</div>
              <div className="settings-item-val" style={{ fontSize: '12px', color: 'var(--ios-text-secondary)' }}>Toggle the redundant Quick Action Toolbar</div>
            </div>
            <input
              type="checkbox"
              className="ios-toggle"
              checked={playbackSettings.win98ShowToolbar !== false}
              onChange={(e) => handleSettingChange('win98ShowToolbar', e.target.checked)}
            />
          </div>
        )}
      </IosListGroup>

      {/* ── Scrape Audit History ────────────── */}
      <div className="settings-section-header" style={{ paddingLeft: '8px', marginBottom: '8px', fontSize: '12px', color: 'var(--ios-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
        <Clock size={14} color="var(--ios-accent)" />
        <span>Scrape & Sync Audit Logs</span>
      </div>
      <div className="settings-section-card settings-list-group" style={{
        backgroundColor: 'var(--ios-bg-card)',
        borderRadius: '12px',
        border: '1px solid var(--ios-border)',
        overflow: 'hidden',
        marginBottom: '32px'
      }}>
        {scrapeLogs.length > 0 ? (
          scrapeLogs.map((log, idx) => (
            <div
              key={log.id}
              className="settings-list-item"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 16px',
                borderBottom: idx === scrapeLogs.length - 1 ? 'none' : '1px solid var(--ios-border)',
                backgroundColor: 'var(--ios-bg-card)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '28px', height: '28px', borderRadius: '8px',
                  backgroundColor: log.status === 'success' ? 'rgba(52, 199, 89, 0.15)' : 'rgba(255, 59, 48, 0.15)',
                  color: log.status === 'success' ? '#34c759' : '#ff3b30',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  {log.status === 'success' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                </div>
                <div>
                  <div className="settings-item-title" style={{ fontSize: '14px', fontWeight: 600, color: 'var(--ios-text-primary)' }}>
                    {new Date(log.started_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div className="settings-item-val" style={{ fontSize: '11px', color: 'var(--ios-text-secondary)' }}>
                    Status: <strong style={{ color: log.status === 'success' ? '#34c759' : '#ff3b30' }}>{log.status.toUpperCase()}</strong>
                  </div>
                </div>
              </div>
              <span className="dashboard-status-badge badge-sync" style={{
                padding: '4px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: 700,
                backgroundColor: 'rgba(232, 158, 56, 0.15)', color: 'var(--ios-accent)'
              }}>
                +{log.stories_new} New Stories
              </span>
            </div>
          ))
        ) : (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--ios-text-secondary)', fontSize: '14px' }}>
            No sync history recorded yet.
          </div>
        )}
      </div>

      {/* ── Maintenance & Power ────────────── */}
      <div className="settings-section-header" style={{ paddingLeft: '8px', marginBottom: '8px', fontSize: '12px', color: 'var(--ios-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>
        Maintenance & Service Power
      </div>
      <IosListGroup>
        <IosListItem
          icon={Folder} iconBg="#007aff"
          title="Open Local Storage Folder"
          onClick={handleOpenFolder}
        />
        {folderMsg && (
          <div style={{
            padding: '0 16px 12px 60px', fontSize: '12px',
            color: 'var(--ios-text-secondary)', wordBreak: 'break-all',
          }}>
            {folderMsg}
          </div>
        )}
        <IosListItem
          icon={RefreshCcw} iconBg="#ff9500"
          title={rescanning ? "Scanning Local Files..." : "Rescan Story Metadata"}
          onClick={handleRescan}
        />
        <IosListItem
          icon={Power} iconBg="#ff3b30"
          title={<span style={{ color: 'var(--ios-danger)', fontWeight: 700 }}>Power Off MemWault System</span>}
          value="Shut Down All Processes"
          onClick={() => setShutdownModalOpen(true)}
        />
        <IosListItem
          icon={LogOut} iconBg="#8e8e93"
          title={<span style={{ color: 'var(--ios-text-secondary)' }}>Sign Out</span>}
          onClick={handleLogout}
          last
        />
      </IosListGroup>

      <ShutdownModal 
        isOpen={shutdownModalOpen}
        onClose={() => setShutdownModalOpen(false)}
      />
    </motion.div>
  )
}
