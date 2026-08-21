import React, { useState, useRef } from 'react'
import { Monitor, Image as ImageIcon, LayoutGrid, Volume2, Sparkles, Smartphone, Upload, RefreshCcw, Check } from 'lucide-react'
import { getSettings, saveSettings } from '../services/settings'
import { playWin98Startup, playWin98Chord, playWin98Shutdown, playWin98Click } from '../services/win98Audio'
import QRUploadModal from './QRUploadModal'

export default function Win98DisplayProperties({ isOpen, onClose, onApply }) {
  if (!isOpen) return null

  const fileInputRef = useRef(null)
  const [currentSettings, setCurrentSettings] = useState(getSettings())
  const [activeTab, setActiveTab] = useState('background') // 'background' | 'widgets' | 'sounds' | 'appearance'
  const [isQRModalOpen, setIsQRModalOpen] = useState(false)
  const [feedbackMsg, setFeedbackMsg] = useState('')

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
      handleUpdate('win98Wallpaper', event.target.result)
      setFeedbackMsg('Wallpaper loaded from computer!')
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
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 99999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(0,0,0,0.3)',
    }}>
      {/* 3D Window Frame */}
      <div style={{
        width: '480px',
        maxWidth: '95vw',
        backgroundColor: 'var(--win98-face, #c0c0c0)',
        border: '1px solid var(--win98-dark-shadow, #000000)',
        boxShadow: `
          inset 1px 1px 0px 0px var(--win98-highlight, #ffffff),
          inset -1px -1px 0px 0px var(--win98-dark-shadow, #000000),
          inset 2px 2px 0px 0px var(--win98-light, #dfdfdf),
          inset -2px -2px 0px 0px var(--win98-shadow, #808080),
          4px 4px 12px rgba(0,0,0,0.4)
        `,
        padding: '3px',
        fontFamily: 'var(--win98-font, "MS Sans Serif", Tahoma, sans-serif)',
        fontSize: '11px',
        color: '#000000',
        userSelect: 'none',
      }}>
        {/* Title Bar */}
        <div style={{
          background: 'linear-gradient(90deg, #000080 0%, #1084d0 100%)',
          color: '#ffffff',
          fontWeight: 'bold',
          padding: '3px 4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '4px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Monitor size={14} color="#ffffff" />
            <span>Display Properties (MemWault 98)</span>
          </div>
          <button
            onClick={() => { playWin98Click(); onClose() }}
            style={{
              width: '16px',
              height: '14px',
              backgroundColor: '#c0c0c0',
              border: 'none',
              boxShadow: 'inset 1px 1px #fff, inset -1px -1px #000',
              color: '#000000',
              fontSize: '10px',
              fontWeight: 'bold',
              lineHeight: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
            }}
          >
            ✕
          </button>
        </div>

        {/* Tab Strip */}
        <div style={{ display: 'flex', gap: '2px', paddingLeft: '4px', borderBottom: 'none' }}>
          {[
            { id: 'background', label: 'Background' },
            { id: 'widgets', label: 'Widgets & Desktop' },
            { id: 'sounds', label: 'Audio & Startup' },
          ].map(tab => {
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => { playWin98Click(); setActiveTab(tab.id) }}
                style={{
                  padding: '4px 10px',
                  backgroundColor: '#c0c0c0',
                  border: 'none',
                  boxShadow: isActive
                    ? 'inset 1px 1px #fff, inset -1px 0 #000, inset 2px 2px #dfdfdf'
                    : 'inset 1px 1px #dfdfdf, inset -1px 0 #808080',
                  fontWeight: isActive ? 'bold' : 'normal',
                  cursor: 'pointer',
                  borderTopLeftRadius: '3px',
                  borderTopRightRadius: '3px',
                  position: 'relative',
                  top: isActive ? '1px' : '0px',
                  zIndex: isActive ? 2 : 1,
                  fontFamily: 'inherit',
                  fontSize: '11px',
                }}
              >
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Tab Body Canvas */}
        <div style={{
          backgroundColor: '#c0c0c0',
          border: '1px solid #000000',
          boxShadow: 'inset 1px 1px #ffffff, inset -1px -1px #808080, inset 2px 2px #dfdfdf',
          padding: '12px',
          minHeight: '290px',
          position: 'relative',
          zIndex: 1,
        }}>
          {/* TAB 1: BACKGROUND */}
          {activeTab === 'background' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* CRT Monitor Preview */}
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <div style={{
                  width: '170px',
                  height: '110px',
                  backgroundColor: '#e0ded8',
                  borderRadius: '6px',
                  border: '2px solid #808080',
                  boxShadow: 'inset 1px 1px #ffffff, inset -1px -1px #000000, 2px 2px 5px rgba(0,0,0,0.2)',
                  padding: '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  {/* Screen */}
                  <div style={{
                    width: '135px',
                    height: '80px',
                    backgroundColor: currentSettings.win98Wallpaper ? '#000000' : 'var(--win98-desktop, #008080)',
                    backgroundImage: currentSettings.win98Wallpaper ? `url(${currentSettings.win98Wallpaper})` : 'none',
                    backgroundSize: currentSettings.win98WallpaperMode === 'tile' ? 'auto' : (currentSettings.win98WallpaperMode === 'center' ? 'contain' : 'cover'),
                    backgroundRepeat: currentSettings.win98WallpaperMode === 'tile' ? 'repeat' : 'no-repeat',
                    backgroundPosition: 'center',
                    border: '2px solid #404040',
                    boxShadow: 'inset 1px 1px #000000',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    {!currentSettings.win98Wallpaper && (
                      <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '9px', fontWeight: 'bold' }}>
                        Teal (#008080)
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Wallpaper Controls */}
              <fieldset style={{
                border: '1px solid #808080',
                boxShadow: 'inset 1px 1px #ffffff',
                padding: '10px',
                marginTop: '4px',
              }}>
                <legend style={{ padding: '0 4px', fontWeight: 'bold', color: '#000080' }}>
                  Desktop Wallpaper & Backdrops
                </legend>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span>Display Mode:</span>
                  <select
                    value={currentSettings.win98WallpaperMode || 'stretch'}
                    onChange={(e) => handleUpdate('win98WallpaperMode', e.target.value)}
                    style={{
                      padding: '2px 4px',
                      backgroundColor: '#ffffff',
                      border: '1px solid #808080',
                      boxShadow: 'inset 1px 1px #000',
                      fontFamily: 'inherit',
                      fontSize: '11px',
                    }}
                  >
                    <option value="stretch">Stretch to Fit</option>
                    <option value="tile">Tile Pattern</option>
                    <option value="center">Center Image</option>
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '10px' }}>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="btn-win98"
                    style={{
                      padding: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                    }}
                  >
                    <Upload size={13} />
                    <span>Upload from PC...</span>
                  </button>

                  <button
                    onClick={() => setIsQRModalOpen(true)}
                    className="btn-win98"
                    style={{
                      padding: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                    }}
                  >
                    <Smartphone size={13} />
                    <span>Upload from Phone (QR)</span>
                  </button>
                </div>

                <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => {
                      handleUpdate('win98Wallpaper', null)
                      setFeedbackMsg('Restored classic teal backdrop.')
                    }}
                    className="btn-win98"
                    style={{ padding: '4px 8px' }}
                  >
                    Restore Teal Default
                  </button>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />
              </fieldset>
            </div>
          )}

          {/* TAB 2: WIDGETS & DESKTOP */}
          {activeTab === 'widgets' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <fieldset style={{
                border: '1px solid #808080',
                boxShadow: 'inset 1px 1px #ffffff',
                padding: '10px',
              }}>
                <legend style={{ padding: '0 4px', fontWeight: 'bold', color: '#000080' }}>
                  Dashboard Interface Mode
                </legend>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="dashboardMode"
                      value="dashboard"
                      checked={(currentSettings.win98DashboardMode || 'dashboard') === 'dashboard'}
                      onChange={() => handleUpdate('win98DashboardMode', 'dashboard')}
                    />
                    <span><strong>Standard Dashboard Window</strong> (Integrated Control Panel app)</span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="dashboardMode"
                      value="widget"
                      checked={currentSettings.win98DashboardMode === 'widget'}
                      onChange={() => handleUpdate('win98DashboardMode', 'widget')}
                    />
                    <span><strong>Active Desktop Widget Mode</strong> (Floating draggable widgets on desktop)</span>
                  </label>
                </div>
              </fieldset>

              <fieldset style={{
                border: '1px solid #808080',
                boxShadow: 'inset 1px 1px #ffffff',
                padding: '10px',
              }}>
                <legend style={{ padding: '0 4px', fontWeight: 'bold', color: '#000080' }}>
                  Desktop Gadgets & Widget Visibility
                </legend>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {[
                    { key: 'memoryCounter', label: 'Memory LED Counter' },
                    { key: 'statGrid', label: 'Media & Posts Stat Grid' },
                    { key: 'quickActions', label: 'Quick Action Buttons' },
                    { key: 'systemHealth', label: 'System Health Monitor' },
                    { key: 'auditLog', label: 'Sync & Scrape Logs' },
                  ].map(w => (
                    <label key={w.key} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={currentSettings.win98WidgetVisibility?.[w.key] !== false}
                        onChange={() => handleWidgetToggle(w.key)}
                      />
                      <span>{w.label}</span>
                    </label>
                  ))}
                </div>

                <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => {
                      handleUpdate('win98WidgetPositions', {})
                      setFeedbackMsg('Widget positions reset.')
                    }}
                    className="btn-win98"
                    style={{ padding: '4px 8px' }}
                  >
                    Reset Widget Coordinates
                  </button>
                </div>
              </fieldset>
            </div>
          )}

          {/* TAB 3: AUDIO & STARTUP */}
          {activeTab === 'sounds' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <fieldset style={{
                border: '1px solid #808080',
                boxShadow: 'inset 1px 1px #ffffff',
                padding: '10px',
              }}>
                <legend style={{ padding: '0 4px', fontWeight: 'bold', color: '#000080' }}>
                  Sound Scheme & Audio FX
                </legend>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={currentSettings.win98SoundEnabled !== false}
                      onChange={(e) => handleUpdate('win98SoundEnabled', e.target.checked)}
                    />
                    <span><strong>Enable Authentic Windows 98 Synthesizer Sounds</strong></span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={currentSettings.win98BootScreen !== false}
                      onChange={(e) => handleUpdate('win98BootScreen', e.target.checked)}
                    />
                    <span><strong>Show Windows 98 Boot Splash Screen on Startup</strong></span>
                  </label>
                </div>
              </fieldset>

              <fieldset style={{
                border: '1px solid #808080',
                boxShadow: 'inset 1px 1px #ffffff',
                padding: '10px',
              }}>
                <legend style={{ padding: '0 4px', fontWeight: 'bold', color: '#000080' }}>
                  Sound Effect Preview
                </legend>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
                  <button onClick={playWin98Startup} className="btn-win98" style={{ padding: '6px 4px' }}>
                    ▶ Startup Chime
                  </button>
                  <button onClick={playWin98Chord} className="btn-win98" style={{ padding: '6px 4px' }}>
                    ▶ Asterisk Ding
                  </button>
                  <button onClick={playWin98Shutdown} className="btn-win98" style={{ padding: '6px 4px' }}>
                    ▶ Shutdown
                  </button>
                </div>
              </fieldset>
            </div>
          )}

          {feedbackMsg && (
            <div style={{
              position: 'absolute',
              bottom: '8px',
              left: '12px',
              color: '#000080',
              fontWeight: 'bold',
              fontSize: '10px',
            }}>
              ✨ {feedbackMsg}
            </div>
          )}
        </div>

        {/* Dialog Actions */}
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '6px',
          marginTop: '8px',
          padding: '0 4px 4px 4px',
        }}>
          <button
            onClick={handleSaveAndClose}
            className="btn-win98"
            style={{ width: '70px', padding: '4px', fontWeight: 'bold' }}
          >
            OK
          </button>
          <button
            onClick={() => { playWin98Click(); onClose() }}
            className="btn-win98"
            style={{ width: '70px', padding: '4px' }}
          >
            Cancel
          </button>
          <button
            onClick={handleApplyOnly}
            className="btn-win98"
            style={{ width: '70px', padding: '4px' }}
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
              handleUpdate('win98Wallpaper', latestFile.url)
              setFeedbackMsg('Wallpaper received from smartphone!')
              setTimeout(() => setFeedbackMsg(''), 3500)
            }
          }}
        />
      )}
    </div>
  )
}
