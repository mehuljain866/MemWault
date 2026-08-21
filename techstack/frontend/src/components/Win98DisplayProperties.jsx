import React, { useState, useRef } from 'react'
import { Monitor, Smartphone, Upload, Sliders, Volume2, Layers } from 'lucide-react'
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
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 99999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(0,0,0,0.35)',
    }}>
      {/* 3D Window Frame */}
      <div style={{
        width: '420px',
        maxWidth: '95vw',
        backgroundColor: 'var(--win98-face, #c0c0c0)',
        border: '1px solid var(--win98-dark-shadow, #000000)',
        boxShadow: `
          inset 1px 1px 0px 0px var(--win98-highlight, #ffffff),
          inset -1px -1px 0px 0px var(--win98-dark-shadow, #000000),
          inset 2px 2px 0px 0px var(--win98-light, #dfdfdf),
          inset -2px -2px 0px 0px var(--win98-shadow, #808080),
          4px 4px 16px rgba(0,0,0,0.5)
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
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Monitor size={13} color="#ffffff" />
            <span>Display Properties</span>
          </div>
          <button
            onClick={() => { playWin98Click(); onClose(); }}
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

        {/* Tab Strip Container */}
        <div style={{ display: 'flex', paddingLeft: '4px', marginTop: '4px', gap: '2px', position: 'relative', zIndex: 2 }}>
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
                style={{
                  padding: '3px 8px 4px 8px',
                  backgroundColor: '#c0c0c0',
                  border: '1px solid #000',
                  borderBottom: isActive ? 'none' : '1px solid #000',
                  boxShadow: isActive
                    ? 'inset 1px 1px #ffffff, inset -1px 0px #808080'
                    : 'inset 1px 1px #dfdfdf',
                  fontWeight: isActive ? 'bold' : 'normal',
                  cursor: 'pointer',
                  borderTopLeftRadius: '3px',
                  borderTopRightRadius: '3px',
                  position: 'relative',
                  top: isActive ? '1px' : '0px',
                  marginBottom: isActive ? '-1px' : '0px',
                  zIndex: isActive ? 3 : 1,
                  fontFamily: 'inherit',
                  fontSize: '11px',
                }}
              >
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Property Sheet Main Canvas */}
        <div style={{
          backgroundColor: '#c0c0c0',
          border: '1px solid #000000',
          boxShadow: 'inset 1px 1px #ffffff, inset -1px -1px #808080',
          padding: '10px',
          position: 'relative',
          zIndex: 1,
          minHeight: '310px',
        }}>
          {/* TAB 1: BACKGROUND */}
          {activeTab === 'background' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {/* Authentic CRT Desktop Monitor with Pedestal */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                {/* CRT Housing */}
                <div style={{
                  width: '160px',
                  height: '110px',
                  backgroundColor: '#dcd8cf',
                  borderRadius: '6px',
                  border: '1px solid #707070',
                  boxShadow: 'inset 2px 2px #ffffff, inset -2px -2px #505050, 1px 1px 3px rgba(0,0,0,0.3)',
                  padding: '6px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  boxSizing: 'border-box',
                }}>
                  {/* CRT Screen Bezel */}
                  <div style={{
                    width: '100%',
                    height: '84px',
                    backgroundColor: '#111111',
                    borderRadius: '4px',
                    border: '2px solid #505050',
                    boxShadow: 'inset 2px 2px #000000',
                    overflow: 'hidden',
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                  }}>
                    {/* Screen Wallpaper Surface */}
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
                    }}>
                      {!currentSettings.win98Wallpaper && (
                        <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '8px', fontWeight: 'bold' }}>
                          Teal (#008080)
                        </span>
                      )}
                    </div>

                    {/* Mini CRT Taskbar */}
                    <div style={{
                      height: '10px',
                      backgroundColor: '#c0c0c0',
                      borderTop: '1px solid #ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0 2px',
                    }}>
                      <div style={{ width: '14px', height: '6px', backgroundColor: '#dfdfdf', border: '1px outset #fff' }} />
                      <div style={{ width: '12px', height: '6px', backgroundColor: '#dfdfdf', border: '1px inset #808080' }} />
                    </div>
                  </div>

                  {/* Monitor Controls & Power LED */}
                  <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px' }}>
                    <div style={{ display: 'flex', gap: '2px' }}>
                      <div style={{ width: '4px', height: '2px', backgroundColor: '#909090' }} />
                      <div style={{ width: '4px', height: '2px', backgroundColor: '#909090' }} />
                    </div>
                    {/* Glowing Green Power LED */}
                    <div style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: '#00ff00', boxShadow: '0 0 3px #00ff00' }} />
                  </div>
                </div>

                {/* CRT Swivel Stand Pedestal */}
                <div style={{
                  width: '60px',
                  height: '8px',
                  backgroundColor: '#c4c0b6',
                  border: '1px solid #707070',
                  borderTop: 'none',
                  boxShadow: 'inset 1px 0px #ffffff, inset -1px 0px #505050',
                }} />
                <div style={{
                  width: '90px',
                  height: '4px',
                  backgroundColor: '#b8b4aa',
                  border: '1px solid #707070',
                  borderRadius: '0 0 2px 2px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                }} />
              </div>

              {/* Wallpaper Selection Controls (Authentic Win98 GroupBox) */}
              <fieldset style={{
                border: '1px solid #808080',
                boxShadow: 'inset 1px 1px #ffffff',
                padding: '8px 10px',
                marginTop: '4px',
              }}>
                <legend style={{ padding: '0 4px', color: '#000080', fontWeight: 'bold' }}>
                  Wallpaper
                </legend>

                <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '10px' }}>
                  {/* Sunken ListBox */}
                  <div style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #000',
                    boxShadow: 'inset 1px 1px #808080, inset -1px -1px #dfdfdf',
                    height: '92px',
                    overflowY: 'auto',
                    padding: '1px',
                  }}>
                    {PRESET_WALLPAPERS.map(item => {
                      const isSelected = (item.url === currentSettings.win98Wallpaper) || (!item.url && !currentSettings.win98Wallpaper);
                      return (
                        <div
                          key={item.id}
                          onClick={() => handleUpdate('win98Wallpaper', item.url)}
                          style={{
                            padding: '2px 4px',
                            backgroundColor: isSelected ? '#000080' : 'transparent',
                            color: isSelected ? '#ffffff' : '#000000',
                            cursor: 'pointer',
                            fontSize: '11px',
                          }}
                        >
                          {item.label}
                        </div>
                      )
                    })}
                    {currentSettings.win98Wallpaper && !PRESET_WALLPAPERS.some(p => p.url === currentSettings.win98Wallpaper) && (
                      <div
                        style={{
                          padding: '2px 4px',
                          backgroundColor: '#000080',
                          color: '#ffffff',
                          cursor: 'pointer',
                          fontSize: '11px',
                        }}
                      >
                        [Custom User Image]
                      </div>
                    )}
                  </div>

                  {/* Sizing & Action Buttons */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '2px' }}>Display:</label>
                      <select
                        value={currentSettings.win98WallpaperMode || 'stretch'}
                        onChange={(e) => handleUpdate('win98WallpaperMode', e.target.value)}
                        style={{
                          width: '100%',
                          padding: '2px',
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
                      className="btn-win98"
                      style={{ padding: '4px', width: '100%' }}
                    >
                      Browse PC...
                    </button>

                    <button
                      onClick={() => setIsQRModalOpen(true)}
                      className="btn-win98"
                      style={{ padding: '4px', width: '100%' }}
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
            </div>
          )}

          {/* TAB 2: WIDGETS & DESKTOP */}
          {activeTab === 'widgets' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <fieldset style={{
                border: '1px solid #808080',
                boxShadow: 'inset 1px 1px #ffffff',
                padding: '8px 10px',
              }}>
                <legend style={{ padding: '0 4px', color: '#000080', fontWeight: 'bold' }}>
                  Desktop Paradigm
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
                    <span>Standard Dashboard Application Window</span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="dashboardMode"
                      value="widget"
                      checked={currentSettings.win98DashboardMode === 'widget'}
                      onChange={() => handleUpdate('win98DashboardMode', 'widget')}
                    />
                    <span>Active Desktop Gadgets (Floating on Wallpaper)</span>
                  </label>
                </div>
              </fieldset>

              <fieldset style={{
                border: '1px solid #808080',
                boxShadow: 'inset 1px 1px #ffffff',
                padding: '8px 10px',
              }}>
                <legend style={{ padding: '0 4px', color: '#000080', fontWeight: 'bold' }}>
                  Gadget Items
                </legend>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                  {[
                    { key: 'memoryCounter', label: 'Memory Counter' },
                    { key: 'statGrid', label: 'Media Breakdown Grid' },
                    { key: 'quickActions', label: 'Quick Action Buttons' },
                    { key: 'systemHealth', label: 'System Resource Monitor' },
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

                <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => {
                      handleUpdate('win98WidgetPositions', {})
                      setFeedbackMsg('Widget coordinates reset.')
                    }}
                    className="btn-win98"
                    style={{ padding: '3px 8px' }}
                  >
                    Reset Positions
                  </button>
                </div>
              </fieldset>
            </div>
          )}

          {/* TAB 3: SOUNDS */}
          {activeTab === 'sounds' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <fieldset style={{
                border: '1px solid #808080',
                boxShadow: 'inset 1px 1px #ffffff',
                padding: '8px 10px',
              }}>
                <legend style={{ padding: '0 4px', color: '#000080', fontWeight: 'bold' }}>
                  System Audio Scheme
                </legend>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={currentSettings.win98SoundEnabled !== false}
                      onChange={(e) => handleUpdate('win98SoundEnabled', e.target.checked)}
                    />
                    <span><strong>Enable Authentic Microsoft Windows 98 WAV Audio</strong></span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={currentSettings.win98BootScreen !== false}
                      onChange={(e) => handleUpdate('win98BootScreen', e.target.checked)}
                    />
                    <span><strong>Show Boot Splash Screen on Startup</strong></span>
                  </label>
                </div>
              </fieldset>

              <fieldset style={{
                border: '1px solid #808080',
                boxShadow: 'inset 1px 1px #ffffff',
                padding: '8px 10px',
              }}>
                <legend style={{ padding: '0 4px', color: '#000080', fontWeight: 'bold' }}>
                  Audio Test
                </legend>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
                  <button onClick={playWin98Startup} className="btn-win98" style={{ padding: '6px 2px' }}>
                    ▶ Startup.wav
                  </button>
                  <button onClick={playWin98Chord} className="btn-win98" style={{ padding: '6px 2px' }}>
                    ▶ Chord.wav
                  </button>
                  <button onClick={playWin98Shutdown} className="btn-win98" style={{ padding: '6px 2px' }}>
                    ▶ Logoff.wav
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
              {feedbackMsg}
            </div>
          )}
        </div>

        {/* Dialog Actions (Right Aligned Win98 Buttons) */}
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '6px',
          padding: '8px 4px 4px 4px',
        }}>
          <button
            onClick={handleSaveAndClose}
            className="btn-win98"
            style={{ width: '70px', padding: '4px', fontWeight: 'bold' }}
          >
            OK
          </button>
          <button
            onClick={() => { playWin98Click(); onClose(); }}
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
