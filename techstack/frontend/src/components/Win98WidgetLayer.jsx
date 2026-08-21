import React, { useState, useEffect, useRef } from 'react'
import {
  Layers, HardDrive, Server, Clock, RefreshCw, Upload, Sparkles,
  Images, Video, Star, Music, MapPin, Users, CheckCircle2, XCircle,
  Database, Activity, Minimize2, X
} from 'lucide-react'
import { getSettings, saveSettings } from '../services/settings'
import { playWin98Click, playWin98Minimize } from '../services/win98Audio'

const DEFAULT_POSITIONS = {
  memoryCounter: { x: 24, y: 30 },
  statGrid: { x: 24, y: 160 },
  quickActions: { x: 380, y: 30 },
  systemHealth: { x: 380, y: 180 },
  auditLog: { x: 24, y: 380 },
}

export default function Win98WidgetLayer({ stats, syncing, onSync, onNavigate }) {
  const [settings, setSettings] = useState(getSettings())
  const [positions, setPositions] = useState(settings.win98WidgetPositions || {})
  const [minimizedWidgets, setMinimizedWidgets] = useState({})

  // Active drag state in ref to avoid react state render thrashing
  const dragRef = useRef({
    activeKey: null,
    startX: 0,
    startY: 0,
    initPosX: 0,
    initPosY: 0,
    currentX: 0,
    currentY: 0,
    element: null,
    rafId: null,
  })

  const widgetRefs = {
    memoryCounter: useRef(null),
    statGrid: useRef(null),
    quickActions: useRef(null),
    systemHealth: useRef(null),
    auditLog: useRef(null),
  }

  useEffect(() => {
    const handleSettingsUpdate = () => {
      const s = getSettings()
      setSettings(s)
      setPositions(s.win98WidgetPositions || {})
    }
    window.addEventListener('memwault-settings-changed', handleSettingsUpdate)
    return () => window.removeEventListener('memwault-settings-changed', handleSettingsUpdate)
  }, [])

  const getPos = (key) => {
    return positions[key] || DEFAULT_POSITIONS[key] || { x: 40, y: 40 }
  }

  const startDrag = (e, key) => {
    e.preventDefault()
    e.stopPropagation()

    const current = getPos(key)
    const el = widgetRefs[key]?.current
    if (!el) return

    dragRef.current = {
      activeKey: key,
      startX: e.clientX,
      startY: e.clientY,
      initPosX: current.x,
      initPosY: current.y,
      currentX: current.x,
      currentY: current.y,
      element: el,
      rafId: null,
    }

    el.style.zIndex = '9999'
    el.style.cursor = 'grabbing'
    document.body.style.userSelect = 'none'

    window.addEventListener('mousemove', onGlobalMouseMove, { passive: false })
    window.addEventListener('mouseup', onGlobalMouseUp)
  }

  const onGlobalMouseMove = (e) => {
    const state = dragRef.current
    if (!state.activeKey || !state.element) return

    const deltaX = e.clientX - state.startX
    const deltaY = e.clientY - state.startY

    const newX = Math.max(10, Math.min(window.innerWidth - 220, state.initPosX + deltaX))
    const newY = Math.max(10, Math.min(window.innerHeight - 80, state.initPosY + deltaY))

    state.currentX = newX
    state.currentY = newY

    if (!state.rafId) {
      state.rafId = requestAnimationFrame(() => {
        if (state.element) {
          state.element.style.left = `${state.currentX}px`
          state.element.style.top = `${state.currentY}px`
        }
        state.rafId = null
      })
    }
  }

  const onGlobalMouseUp = () => {
    const state = dragRef.current
    if (!state.activeKey) return

    window.removeEventListener('mousemove', onGlobalMouseMove)
    window.removeEventListener('mouseup', onGlobalMouseUp)
    document.body.style.userSelect = ''

    if (state.element) {
      state.element.style.zIndex = '10'
      state.element.style.cursor = ''
    }

    const key = state.activeKey
    const finalPos = { x: state.currentX, y: state.currentY }

    setPositions(prev => {
      const updated = { ...prev, [key]: finalPos }
      const s = getSettings()
      saveSettings({ ...s, win98WidgetPositions: updated })
      return updated
    })

    dragRef.current.activeKey = null
  }

  const toggleMinimize = (key) => {
    playWin98Minimize()
    setMinimizedWidgets(prev => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  const isVisible = (key) => {
    return settings.win98WidgetVisibility?.[key] !== false
  }

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 5,
        overflow: 'hidden',
      }}
    >
      {/* ── 1. MEMORY COUNTER WIDGET ────────────────────── */}
      {isVisible('memoryCounter') && (
        <div
          ref={widgetRefs.memoryCounter}
          style={{
            position: 'absolute',
            left: `${getPos('memoryCounter').x}px`,
            top: `${getPos('memoryCounter').y}px`,
            width: '320px',
            backgroundColor: 'var(--win98-face, #c0c0c0)',
            border: '1px solid #000',
            boxShadow: 'inset 1px 1px #fff, inset -1px -1px #000, inset 2px 2px #dfdfdf, 3px 3px 10px rgba(0,0,0,0.3)',
            pointerEvents: 'auto',
            userSelect: 'none',
            zIndex: 10,
            willChange: 'left, top',
          }}
        >
          {/* Title Bar */}
          <div
            onMouseDown={(e) => startDrag(e, 'memoryCounter')}
            style={{
              background: 'linear-gradient(90deg, #000080 0%, #1084d0 100%)',
              color: '#fff',
              padding: '2px 4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'grab',
              fontSize: '11px',
              fontWeight: 'bold',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Layers size={13} />
              <span>MemWault Archive Counter</span>
            </div>
            <div style={{ display: 'flex', gap: '2px' }}>
              <button
                onClick={() => toggleMinimize('memoryCounter')}
                style={{ width: '14px', height: '12px', background: '#c0c0c0', border: 'none', boxShadow: 'inset 1px 1px #fff, inset -1px -1px #000', fontSize: '9px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
              >
                _
              </button>
            </div>
          </div>

          {!minimizedWidgets['memoryCounter'] && (
            <div style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{
                background: '#000000',
                border: '2px solid #808080',
                boxShadow: 'inset 1px 1px #000',
                padding: '8px 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <div>
                  <div style={{ fontSize: '9px', color: '#00ff66', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    TOTAL ARCHIVED OBJECTS
                  </div>
                  <div style={{ fontSize: '36px', color: '#00ff66', fontFamily: 'monospace', fontWeight: 900, textShadow: '0 0 8px rgba(0,255,102,0.6)', lineHeight: 1 }}>
                    {String(stats?.total_stories || 0).padStart(4, '0')}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '9px', color: '#ffcc00', fontFamily: 'monospace' }}>
                    VAULT STATUS
                  </div>
                  <div style={{ fontSize: '11px', color: '#ffffff', fontWeight: 'bold' }}>
                    ONLINE
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── 2. STAT GRID WIDGET ────────────────────── */}
      {isVisible('statGrid') && (
        <div
          ref={widgetRefs.statGrid}
          style={{
            position: 'absolute',
            left: `${getPos('statGrid').x}px`,
            top: `${getPos('statGrid').y}px`,
            width: '320px',
            backgroundColor: 'var(--win98-face, #c0c0c0)',
            border: '1px solid #000',
            boxShadow: 'inset 1px 1px #fff, inset -1px -1px #000, inset 2px 2px #dfdfdf, 3px 3px 10px rgba(0,0,0,0.3)',
            pointerEvents: 'auto',
            userSelect: 'none',
            zIndex: 10,
            willChange: 'left, top',
          }}
        >
          {/* Title Bar */}
          <div
            onMouseDown={(e) => startDrag(e, 'statGrid')}
            style={{
              background: 'linear-gradient(90deg, #000080 0%, #1084d0 100%)',
              color: '#fff',
              padding: '2px 4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'grab',
              fontSize: '11px',
              fontWeight: 'bold',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Activity size={13} />
              <span>Media Breakdown Grid</span>
            </div>
            <div style={{ display: 'flex', gap: '2px' }}>
              <button
                onClick={() => toggleMinimize('statGrid')}
                style={{ width: '14px', height: '12px', background: '#c0c0c0', border: 'none', boxShadow: 'inset 1px 1px #fff, inset -1px -1px #000', fontSize: '9px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
              >
                _
              </button>
            </div>
          </div>

          {!minimizedWidgets['statGrid'] && (
            <div style={{
              padding: '8px',
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '6px',
            }}>
              {[
                { icon: Images, label: 'Photos', val: stats?.total_photos || 0, color: '#ff9500' },
                { icon: Video, label: 'Videos', val: stats?.total_videos || 0, color: '#ff2d55' },
                { icon: Layers, label: 'Posts', val: stats?.total_feed_posts || 0, color: '#5856d6' },
                { icon: Sparkles, label: 'RAW', val: stats?.total_with_raw_master || 0, color: '#e89e38' },
                { icon: Star, label: 'Close', val: stats?.total_close_friends || 0, color: '#00d26a' },
                { icon: Music, label: 'Music', val: stats?.total_with_music || 0, color: '#af52de' },
                { icon: MapPin, label: 'Geo', val: stats?.total_with_location || 0, color: '#34c759' },
                { icon: Users, label: 'Tags', val: stats?.total_mentions || 0, color: '#00c7be' },
              ].map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #000',
                    boxShadow: 'inset 1px 1px #808080, inset -1px -1px #fff',
                    padding: '6px 4px',
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '2px',
                  }}
                >
                  <item.icon size={13} color={item.color} />
                  <div style={{ fontSize: '13px', fontWeight: 900, color: '#000000', lineHeight: 1 }}>
                    {item.val}
                  </div>
                  <div style={{ fontSize: '9px', color: '#555555', fontWeight: 600 }}>
                    {item.label}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── 3. QUICK ACTIONS WIDGET ────────────────────── */}
      {isVisible('quickActions') && (
        <div
          ref={widgetRefs.quickActions}
          style={{
            position: 'absolute',
            left: `${getPos('quickActions').x}px`,
            top: `${getPos('quickActions').y}px`,
            width: '280px',
            backgroundColor: 'var(--win98-face, #c0c0c0)',
            border: '1px solid #000',
            boxShadow: 'inset 1px 1px #fff, inset -1px -1px #000, inset 2px 2px #dfdfdf, 3px 3px 10px rgba(0,0,0,0.3)',
            pointerEvents: 'auto',
            userSelect: 'none',
            zIndex: 10,
            willChange: 'left, top',
          }}
        >
          {/* Title Bar */}
          <div
            onMouseDown={(e) => startDrag(e, 'quickActions')}
            style={{
              background: 'linear-gradient(90deg, #000080 0%, #1084d0 100%)',
              color: '#fff',
              padding: '2px 4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'grab',
              fontSize: '11px',
              fontWeight: 'bold',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <RefreshCw size={13} />
              <span>Quick Action Controls</span>
            </div>
            <div style={{ display: 'flex', gap: '2px' }}>
              <button
                onClick={() => toggleMinimize('quickActions')}
                style={{ width: '14px', height: '12px', background: '#c0c0c0', border: 'none', boxShadow: 'inset 1px 1px #fff, inset -1px -1px #000', fontSize: '9px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
              >
                _
              </button>
            </div>
          </div>

          {!minimizedWidgets['quickActions'] && (
            <div style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <button
                onClick={() => { playWin98Click(); if (onSync) onSync() }}
                disabled={syncing}
                className="btn-win98"
                style={{
                  padding: '6px 8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  fontWeight: 'bold',
                }}
              >
                <RefreshCw size={14} className={syncing ? 'spin-anim' : ''} />
                <span>{syncing ? 'Syncing Stories...' : 'Sync Active Stories'}</span>
              </button>

              <button
                onClick={() => { playWin98Click(); if (onNavigate) onNavigate('/archives') }}
                className="btn-win98"
                style={{
                  padding: '6px 8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <Upload size={14} />
                <span>Browse Archive Vault</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── 4. SYSTEM HEALTH WIDGET ────────────────────── */}
      {isVisible('systemHealth') && (
        <div
          ref={widgetRefs.systemHealth}
          style={{
            position: 'absolute',
            left: `${getPos('systemHealth').x}px`,
            top: `${getPos('systemHealth').y}px`,
            width: '280px',
            backgroundColor: 'var(--win98-face, #c0c0c0)',
            border: '1px solid #000',
            boxShadow: 'inset 1px 1px #fff, inset -1px -1px #000, inset 2px 2px #dfdfdf, 3px 3px 10px rgba(0,0,0,0.3)',
            pointerEvents: 'auto',
            userSelect: 'none',
            zIndex: 10,
            willChange: 'left, top',
          }}
        >
          {/* Title Bar */}
          <div
            onMouseDown={(e) => startDrag(e, 'systemHealth')}
            style={{
              background: 'linear-gradient(90deg, #000080 0%, #1084d0 100%)',
              color: '#fff',
              padding: '2px 4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'grab',
              fontSize: '11px',
              fontWeight: 'bold',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <HardDrive size={13} />
              <span>System & Storage Monitor</span>
            </div>
            <div style={{ display: 'flex', gap: '2px' }}>
              <button
                onClick={() => toggleMinimize('systemHealth')}
                style={{ width: '14px', height: '12px', background: '#c0c0c0', border: 'none', boxShadow: 'inset 1px 1px #fff, inset -1px -1px #000', fontSize: '9px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
              >
                _
              </button>
            </div>
          </div>

          {!minimizedWidgets['systemHealth'] && (
            <div style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{
                backgroundColor: '#ffffff',
                border: '1px solid #000',
                boxShadow: 'inset 1px 1px #808080, inset -1px -1px #fff',
                padding: '6px 8px',
                fontSize: '11px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#000080', fontWeight: 'bold' }}>Storage Allocated:</span>
                  <span style={{ fontWeight: 'bold' }}>{stats?.storage_used_mb || 0} MB</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#000080', fontWeight: 'bold' }}>Instagram Session:</span>
                  <span style={{ color: stats?.ig_session_valid ? '#008000' : '#cc0000', fontWeight: 'bold' }}>
                    {stats?.ig_session_valid ? '● Active' : '○ Expired'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#000080', fontWeight: 'bold' }}>Port / DB:</span>
                  <span>SQLite (COM1)</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
