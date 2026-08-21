import React, { useState, useRef } from 'react'
import { Win98DisplayPropertiesIcon } from './win98/Win98Icons'
import { getSettings, saveSettings } from '../services/settings'
import { playWin98Startup, playWin98Chord, playWin98Shutdown, playWin98Click, playWin98Ding } from '../services/win98Audio'
import QRUploadModal from './QRUploadModal'

const PRESET_WALLPAPERS = [
  { id: 'none', label: '(None - Classic Teal)', url: null },
  { id: 'clouds', label: 'Windows 98 Sky', url: 'https://images.unsplash.com/photo-1513002749550-c59d786b8e6c?auto=format&fit=crop&w=1920&q=80' },
  { id: 'cyber', label: 'Matrix Grid', url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1920&q=80' },
  { id: 'vintage_pc', label: 'Silicon Architecture', url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1920&q=80' },
]

export default function Win98DisplayProperties({ isOpen, onClose, onApply }) {
  if (!isOpen) return null

  const fileInputRef = useRef(null)
  const [currentSettings, setCurrentSettings] = useState(getSettings())
  const [activeTab, setActiveTab] = useState('background') // 'background' | 'widgets' | 'sounds'
  const [isQRModalOpen, setIsQRModalOpen] = useState(false)
  const [feedbackMsg, setFeedbackMsg] = useState('')

  const [customWallpapers, setCustomWallpapers] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('mw_custom_wallpapers') || '[]')
      return Array.isArray(saved) ? saved : []
    } catch {
      return []
    }
  })

  const addCustomWallpaper = (url, label = 'Uploaded Image') => {
    const newItem = {
      id: 'custom_' + Date.now(),
      label,
      url,
      date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }
    setCustomWallpapers(prev => {
      const filtered = prev.filter(p => p.url !== url)
      const updated = [newItem, ...filtered]
      try {
        localStorage.setItem('mw_custom_wallpapers', JSON.stringify(updated))
      } catch (e) {
        console.error('Failed to save wallpaper list', e)
      }
      return updated
    })
    handleUpdate('win98Wallpaper', url)
  }

  const handleUpdate = (key, value) => {
    setCurrentSettings(prev => ({
      ...prev,
      [key]: value,
    }))
  }

  const handleWidgetToggle = (widgetKey) => {
    setCurrentSettings(prev => ({
      ...prev,
      win98WidgetVisibility: {
        ...prev.win98WidgetVisibility,
        [widgetKey]: !prev.win98WidgetVisibility?.[widgetKey],
      }
    }))
  }

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      const name = `📁 ${file.name}`
      addCustomWallpaper(event.target.result, name)
      setFeedbackMsg('Wallpaper loaded from PC.')
      setTimeout(() => setFeedbackMsg(''), 3000)
    }
    reader.readAsDataURL(file)
  }

  const handleSaveAndClose = () => {
    playWin98Click()
    saveSettings(currentSettings)
    if (onApply) onApply(currentSettings)
    window.dispatchEvent(new Event('memwault-settings-changed'))
    onClose()
  }

  const handleApplyOnly = () => {
    playWin98Click()
    saveSettings(currentSettings)
    if (onApply) onApply(currentSettings)
    window.dispatchEvent(new Event('memwault-settings-changed'))
    setFeedbackMsg('Settings applied.')
    setTimeout(() => setFeedbackMsg(''), 2500)
  }

  return (
    <div className="win98-dialog-overlay">
      <div className="win98-dialog-window">
        {/* Title Bar */}
        <div className="win98-dialog-titlebar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Win98DisplayPropertiesIcon size={14} />
            <span>Display Properties</span>
          </div>
          <button
            onClick={() => { playWin98Click(); onClose(); }}
            className="win98-dialog-close-btn"
          >
            ✕
          </button>
        </div>

        {/* Tab Strip */}
        <div className="win98-tabs-header">
          {[
            { id: 'background', label: 'Background' },
            { id: 'widgets', label: 'Widgets & Desktop' },
            { id: 'sounds', label: 'Sound FX' },
          ].map(tab => {
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => { playWin98Click(); setActiveTab(tab.id); }}
                className={`win98-tab-button ${isActive ? 'active' : ''}`}
              >
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Property Sheet Content Body */}
        <div className="win98-tab-pane">
          {/* ── TAB 1: BACKGROUND ── */}
          {activeTab === 'background' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {/* Authentic CRT Monitor Preview */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2px' }}>
                <div style={{
                  width: '152px',
                  height: '104px',
                  backgroundColor: '#dcd8cf',
                  borderRadius: '5px',
                  border: '1px solid #707070',
                  boxShadow: 'inset 2px 2px #ffffff, inset -2px -2px #505050',
                  padding: '5px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  boxSizing: 'border-box',
                }}>
                  <div style={{
                    width: '100%',
                    height: '80px',
                    backgroundColor: '#111111',
                    borderRadius: '3px',
                    border: '2px solid #505050',
                    boxShadow: 'inset 1px 1px #000000',
                    overflow: 'hidden',
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                  }}>
                    {/* Screen Viewport */}
                    <div style={{
                      flex: 1,
                      backgroundColor: currentSettings.win98Wallpaper ? '#000000' : 'var(--win98-desktop, #008080)',
                      backgroundImage: currentSettings.win98Wallpaper ? `url(${currentSettings.win98Wallpaper})` : 'none',
                      backgroundSize: currentSettings.win98WallpaperMode === 'tile' ? 'auto' : (currentSettings.win98WallpaperMode === 'center' ? 'contain' : 'cover'),
                      backgroundRepeat: currentSettings.win98WallpaperMode === 'tile' ? 'repeat' : 'no-repeat',
                      backgroundPosition: 'center',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                    }}>
                      {/* Mini preview desktop icons with dynamic box */}
                      <div style={{ position: 'absolute', top: '3px', left: '3px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        {[
                          { color: '#000080', id: '1' },
                          { color: '#C49A45', id: '2' },
                          { color: '#008000', id: '3' }
                        ].map(item => (
                          <div
                            key={item.id}
                            style={{
                              width: '13px',
                              height: '10px',
                              backgroundColor: currentSettings.win98IconBackdrop ? 'rgba(192,192,192,0.9)' : 'transparent',
                              border: currentSettings.win98IconBackdrop ? '1px solid #000000' : 'none',
                              boxShadow: currentSettings.win98IconBackdrop ? 'inset 1px 1px #ffffff, inset -1px -1px #808080' : 'none',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <div style={{ width: '5px', height: '5px', backgroundColor: item.color }} />
                          </div>
                        ))}
                      </div>

                      {!currentSettings.win98Wallpaper && (
                        <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '8px', fontWeight: 'bold' }}>
                          Teal (#008080)
                        </span>
                      )}
                    </div>
                    {/* Mini Taskbar */}
                    <div style={{
                      height: '9px',
                      backgroundColor: '#c0c0c0',
                      borderTop: '1px solid #ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0 2px',
                    }}>
                      <div style={{ width: '12px', height: '5px', backgroundColor: '#dfdfdf', border: '1px solid #fff' }} />
                      <div style={{ width: '10px', height: '5px', backgroundColor: '#dfdfdf', border: '1px solid #808080' }} />
                    </div>
                  </div>

                  {/* Monitor Controls */}
                  <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px' }}>
                    <div style={{ display: 'flex', gap: '2px' }}>
                      <div style={{ width: '3px', height: '2px', backgroundColor: '#909090' }} />
                      <div style={{ width: '3px', height: '2px', backgroundColor: '#909090' }} />
                    </div>
                    <div style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: '#00ff00', boxShadow: '0 0 3px #00ff00' }} />
                  </div>
                </div>

                {/* CRT Pedestal Stand */}
                <div style={{
                  width: '50px',
                  height: '6px',
                  backgroundColor: '#c4c0b6',
                  border: '1px solid #707070',
                  borderTop: 'none',
                  boxShadow: 'inset 1px 0px #ffffff, inset -1px 0px #505050',
                }} />
                <div style={{
                  width: '76px',
                  height: '4px',
                  backgroundColor: '#b8b4aa',
                  border: '1px solid #707070',
                  borderRadius: '0 0 2px 2px',
                }} />
              </div>

              {/* Wallpaper Selection Controls */}
              <fieldset className="win98-fieldset">
                <legend>Wallpaper</legend>

                <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '8px' }}>
                  {/* Listbox */}
                  <div className="win98-listbox" style={{ height: '90px', overflowY: 'auto' }}>
                    <div style={{ fontSize: '9px', fontWeight: 'bold', color: '#555', padding: '1px 3px', borderBottom: '1px solid #d0d0d0', backgroundColor: '#e4e4e4' }}>
                      ── SYSTEM PRESETS ──
                    </div>
                    {PRESET_WALLPAPERS.map(item => {
                      const isSelected = (item.url === currentSettings.win98Wallpaper) || (!item.url && !currentSettings.win98Wallpaper);
                      return (
                        <div
                          key={item.id}
                          onClick={() => handleUpdate('win98Wallpaper', item.url)}
                          className={`win98-listbox-item ${isSelected ? 'selected' : ''}`}
                        >
                          {item.label}
                        </div>
                      )
                    })}

                    {customWallpapers.length > 0 && (
                      <>
                        <div style={{ fontSize: '9px', fontWeight: 'bold', color: '#555', padding: '1px 3px', borderTop: '1px solid #d0d0d0', borderBottom: '1px solid #d0d0d0', backgroundColor: '#e4e4e4', marginTop: '2px' }}>
                          ── MY UPLOADED WALLPAPERS ──
                        </div>
                        {customWallpapers.map(cw => {
                          const isSelected = (cw.url === currentSettings.win98Wallpaper);
                          return (
                            <div
                              key={cw.id}
                              onClick={() => handleUpdate('win98Wallpaper', cw.url)}
                              className={`win98-listbox-item ${isSelected ? 'selected' : ''}`}
                              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                            >
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '130px' }} title={cw.label}>
                                {cw.label}
                              </span>
                              <span style={{ fontSize: '9px', opacity: 0.7, marginLeft: '4px' }}>
                                {cw.date}
                              </span>
                            </div>
                          )
                        })}
                      </>
                    )}

                    {currentSettings.win98Wallpaper && 
                      !PRESET_WALLPAPERS.some(p => p.url === currentSettings.win98Wallpaper) &&
                      !customWallpapers.some(p => p.url === currentSettings.win98Wallpaper) && (
                      <div className="win98-listbox-item selected">
                        [Active Custom Image]
                      </div>
                    )}
                  </div>

                  {/* Buttons & Display dropdown */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '2px' }}>Display:</label>
                      <select
                        value={currentSettings.win98WallpaperMode || 'stretch'}
                        onChange={(e) => handleUpdate('win98WallpaperMode', e.target.value)}
                        style={{
                          width: '100%',
                          padding: '1px 2px',
                          backgroundColor: '#ffffff',
                          border: '1px solid #000',
                          boxShadow: 'inset 1px 1px #808080',
                          fontFamily: 'inherit',
                          fontSize: '11px',
                        }}
                      >
                        <option value="stretch">Stretch</option>
                        <option value="tile">Tile</option>
                        <option value="center">Center</option>
                      </select>
                    </div>

                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="win98-standard-btn"
                      style={{ width: '100%' }}
                    >
                      Browse PC...
                    </button>

                    <button
                      onClick={() => setIsQRModalOpen(true)}
                      className="win98-standard-btn"
                      style={{ width: '100%' }}
                    >
                      Phone (QR)...
                    </button>
                  </div>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />
              </fieldset>

              {/* Desktop Icons Appearance / Box Toggle */}
              <fieldset className="win98-fieldset" style={{ marginTop: '2px' }}>
                <legend>Icon Appearance & Readability</legend>
                <div style={{ padding: '2px 2px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={currentSettings.win98IconBackdrop === true}
                      onChange={(e) => handleUpdate('win98IconBackdrop', e.target.checked)}
                    />
                    <span style={{ fontSize: '11px', color: '#000000' }}>
                      <b>Show retro backdrop boxes around desktop icons</b> (ensures icons stay clear on busy/bright wallpapers)
                    </span>
                  </label>
                </div>
              </fieldset>
            </div>
          )}

          {/* ── TAB 2: WIDGETS & DESKTOP ── */}
          {activeTab === 'widgets' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <fieldset className="win98-fieldset">
                <legend>Desktop Paradigm</legend>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '4px 2px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="dashboardMode"
                      value="dashboard"
                      checked={(currentSettings.win98DashboardMode || 'dashboard') === 'dashboard'}
                      onChange={() => handleUpdate('win98DashboardMode', 'dashboard')}
                    />
                    <span>Standard Application Window (Dashboard inside Window)</span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="dashboardMode"
                      value="widget"
                      checked={currentSettings.win98DashboardMode === 'widget'}
                      onChange={() => handleUpdate('win98DashboardMode', 'widget')}
                    />
                    <span>Active Desktop Mode (Floating Gadgets on Wallpaper)</span>
                  </label>
                </div>
              </fieldset>

              {/* Icon Appearance in Widgets & Desktop tab as well */}
              <fieldset className="win98-fieldset">
                <legend>Desktop Icon Appearance</legend>
                <div style={{ padding: '2px 2px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={currentSettings.win98IconBackdrop === true}
                      onChange={(e) => handleUpdate('win98IconBackdrop', e.target.checked)}
                    />
                    <span style={{ fontSize: '11px', color: '#000000' }}>
                      Show backdrop boxes around desktop shortcut icons
                    </span>
                  </label>
                </div>
              </fieldset>

              {/* Desktop Assistant (Clippy) */}
              <fieldset className="win98-fieldset">
                <legend>Desktop Assistant</legend>
                <div style={{ padding: '2px 2px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={currentSettings.enableClippy !== false}
                      onChange={(e) => handleUpdate('enableClippy', e.target.checked)}
                    />
                    <span style={{ fontSize: '11px', color: '#000000' }}>
                      Enable interactive Clippy Assistant in bottom-right corner
                    </span>
                  </label>
                </div>
              </fieldset>

              <fieldset className="win98-fieldset">
                <legend>Active Desktop Items</legend>

                <div style={{ fontSize: '11px', color: '#222222', marginBottom: '6px' }}>
                  Select the individual gadget boxes displayed on the wallpaper:
                </div>

                <div className="win98-listbox" style={{ height: '114px', overflowY: 'auto', padding: '2px' }}>
                  {[
                    { key: 'memoryCounter', label: 'Memory Counter (Stories, Reels, Highlights)' },
                    { key: 'statGrid', label: 'Media Breakdown Grid (Photos, Videos, Live Masters)' },
                    { key: 'quickActions', label: 'Quick Action Ribbon (Sync, Search, Phone Transfer)' },
                    { key: 'systemHealth', label: 'System Resource Monitor (CPU, Storage, Net)' },
                    { key: 'auditLog', label: 'Sync & Scrape Activity Log' },
                  ].map(w => (
                    <label 
                      key={w.key} 
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px', 
                        padding: '3px 4px', 
                        cursor: 'pointer',
                        width: '100%',
                        boxSizing: 'border-box',
                        borderBottom: '1px solid #f0f0f0'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={currentSettings.win98WidgetVisibility?.[w.key] !== false}
                        onChange={() => handleWidgetToggle(w.key)}
                      />
                      <span style={{ fontSize: '11px', color: '#000000' }}>{w.label}</span>
                    </label>
                  ))}
                </div>

                <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '10px', color: '#555555' }}>Drag gadget titlebars to reposition.</span>
                  <button
                    onClick={() => {
                      handleUpdate('win98WidgetPositions', {})
                      setFeedbackMsg('Widget coordinates reset to default.')
                      setTimeout(() => setFeedbackMsg(''), 3000)
                    }}
                    className="win98-standard-btn"
                    style={{ height: '22px', fontSize: '10px', padding: '0 8px' }}
                  >
                    Reset Positions
                  </button>
                </div>
              </fieldset>
            </div>
          )}

          {/* ── TAB 3: SOUND FX ── */}
          {activeTab === 'sounds' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <fieldset className="win98-fieldset">
                <legend>Sound Scheme & Visuals</legend>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '4px 2px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={currentSettings.win98SoundEnabled !== false}
                      onChange={(e) => handleUpdate('win98SoundEnabled', e.target.checked)}
                    />
                    <span>Enable authentic Microsoft Windows 98 WAV sound effects</span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={currentSettings.win98BootScreen !== false}
                      onChange={(e) => handleUpdate('win98BootScreen', e.target.checked)}
                    />
                    <span>Show BIOS and Windows 98 boot splash screen on startup</span>
                  </label>
                </div>
              </fieldset>

              <fieldset className="win98-fieldset">
                <legend>Audio Event Preview</legend>

                <div style={{ fontSize: '11px', color: '#222222', marginBottom: '8px' }}>
                  Test bit-for-bit official 1998 Microsoft Windows WAV samples:
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <button onClick={playWin98Startup} className="win98-standard-btn" style={{ height: '26px', gap: '4px' }}>
                    ▶ Start Windows
                  </button>
                  <button onClick={playWin98Chord} className="win98-standard-btn" style={{ height: '26px', gap: '4px' }}>
                    ▶ Critical Stop (Chord)
                  </button>
                  <button onClick={playWin98Shutdown} className="win98-standard-btn" style={{ height: '26px', gap: '4px' }}>
                    ▶ Exit Windows (Logoff)
                  </button>
                  <button onClick={playWin98Ding} className="win98-standard-btn" style={{ height: '26px', gap: '4px' }}>
                    ▶ Default Beep (Ding)
                  </button>
                </div>
              </fieldset>
            </div>
          )}

          {feedbackMsg && (
            <div style={{
              color: '#000080',
              fontWeight: 'bold',
              fontSize: '11px',
              marginTop: '4px',
              padding: '2px 4px',
              backgroundColor: '#ffffcc',
              border: '1px solid #808080'
            }}>
              {feedbackMsg}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="win98-dialog-footer">
          <button
            onClick={handleSaveAndClose}
            className="win98-standard-btn"
            style={{ fontWeight: 'bold', minWidth: '70px' }}
          >
            OK
          </button>
          <button
            onClick={() => { playWin98Click(); onClose(); }}
            className="win98-standard-btn"
            style={{ minWidth: '70px' }}
          >
            Cancel
          </button>
          <button
            onClick={handleApplyOnly}
            className="win98-standard-btn"
            style={{ minWidth: '70px' }}
          >
            Apply
          </button>
        </div>
      </div>

      {/* QR Code Upload Modal for Phone */}
      {isQRModalOpen && (
        <QRUploadModal
          isOpen={isQRModalOpen}
          onClose={() => setIsQRModalOpen(false)}
          onUploadSuccess={(latestFile) => {
            if (latestFile?.url) {
              const name = latestFile.filename ? `📱 ${latestFile.filename}` : '📱 Mobile Wallpaper'
              addCustomWallpaper(latestFile.url, name)
              setFeedbackMsg('Wallpaper received from smartphone and applied!')
              setTimeout(() => setFeedbackMsg(''), 4000)
            }
          }}
        />
      )}
    </div>
  )
}
