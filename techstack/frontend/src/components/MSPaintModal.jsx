import React, { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  X, RotateCcw, Download, Save, QrCode, Smartphone, 
  Palette, Square, Circle, Minus, Edit2, Brush, Eraser, 
  PaintBucket, Undo, Redo, ZoomIn
} from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { getSettings } from '../services/settings'
import { playWin98Click } from '../services/win98Audio'

const WIN98_COLORS = [
  '#000000', '#808080', '#800000', '#808000', '#008000', '#008080', '#000080', '#800080',
  '#808040', '#004040', '#0080ff', '#004080', '#8000ff', '#804000', '#ffffff', '#c0c0c0',
  '#ff0000', '#ffff00', '#00ff00', '#00ffff', '#0000ff', '#ff00ff', '#ffff80', '#00ff80',
  '#80ffff', '#8080ff', '#ff0080', '#ff8040'
]

export default function MSPaintModal({ 
  isOpen, 
  onClose, 
  onSaveDoodle,
  initialDoodle = null,
  title = "Untitled - Paint"
}) {
  const canvasRef = useRef(null)
  const [tool, setTool] = useState('pencil') // 'pencil' | 'brush' | 'eraser' | 'bucket' | 'line' | 'rect' | 'ellipse'
  const [selectedColor, setSelectedColor] = useState('#000000')
  const [secondaryColor, setSecondaryColor] = useState('#ffffff')
  const [brushSize, setBrushSize] = useState(3)
  const [isDrawing, setIsDrawing] = useState(false)
  const [startPos, setStartPos] = useState({ x: 0, y: 0 })
  const [snapshot, setSnapshot] = useState(null)
  const [history, setHistory] = useState([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [showQR, setShowQR] = useState(false)
  const [sessionToken] = useState(() => Math.random().toString(36).substring(2, 9))

  const settings = getSettings()
  const isWin98 = settings.themeId === 'win98'

  // Initialize Canvas
  useEffect(() => {
    if (!isOpen) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d', { willReadFrequently: true })

    // Set white canvas background
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    if (initialDoodle) {
      const img = new Image()
      img.onload = () => {
        ctx.drawImage(img, 0, 0)
        saveState()
      }
      img.src = initialDoodle
    } else {
      saveState()
    }
  }, [isOpen])

  // Save undo history state
  const saveState = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    setHistory(prev => {
      const newHist = prev.slice(0, historyIndex + 1)
      return [...newHist, imgData]
    })
    setHistoryIndex(prev => prev + 1)
  }, [historyIndex])

  const undo = () => {
    if (historyIndex > 0) {
      if (isWin98) playWin98Click()
      const newIndex = historyIndex - 1
      setHistoryIndex(newIndex)
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      ctx.putImageData(history[newIndex], 0, 0)
    }
  }

  const redo = () => {
    if (historyIndex < history.length - 1) {
      if (isWin98) playWin98Click()
      const newIndex = historyIndex + 1
      setHistoryIndex(newIndex)
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      ctx.putImageData(history[newIndex], 0, 0)
    }
  }

  const clearCanvas = () => {
    if (isWin98) playWin98Click()
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    saveState()
  }

  // Cross-device tablet synchronization listener
  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === `memwault_paint_sync_${sessionToken}` && e.newValue) {
        try {
          const data = JSON.parse(e.newValue)
          if (data.doodle) {
            const canvas = canvasRef.current
            if (!canvas) return
            const ctx = canvas.getContext('2d')
            const img = new Image()
            img.onload = () => {
              ctx.drawImage(img, 0, 0)
              saveState()
            }
            img.src = data.doodle
          }
        } catch (err) {}
      }
    }

    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [sessionToken, saveState])

  // Mouse / Stylus Drawing handlers
  const getCoordinates = (e) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    }
  }

  const startDraw = (e) => {
    const { x, y } = getCoordinates(e)
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d', { willReadFrequently: true })

    setIsDrawing(true)
    setStartPos({ x, y })
    setSnapshot(ctx.getImageData(0, 0, canvas.width, canvas.height))

    if (tool === 'pencil' || tool === 'brush' || tool === 'eraser') {
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : (e.button === 2 ? secondaryColor : selectedColor)
      ctx.lineWidth = tool === 'pencil' ? 1 : (tool === 'eraser' ? brushSize * 3 : brushSize)
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
    } else if (tool === 'bucket') {
      floodFill(Math.round(x), Math.round(y), selectedColor)
      setIsDrawing(false)
      saveState()
    }
  }

  const draw = (e) => {
    if (!isDrawing) return
    const { x, y } = getCoordinates(e)
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d', { willReadFrequently: true })

    if (tool === 'pencil' || tool === 'brush' || tool === 'eraser') {
      // Stylus pressure sensitivity if available
      if (e.pressure && e.pressure > 0 && tool === 'brush') {
        ctx.lineWidth = brushSize * e.pressure * 2
      }
      ctx.lineTo(x, y)
      ctx.stroke()
    } else if (snapshot && (tool === 'line' || tool === 'rect' || tool === 'ellipse')) {
      ctx.putImageData(snapshot, 0, 0)
      ctx.strokeStyle = selectedColor
      ctx.lineWidth = brushSize

      if (tool === 'line') {
        ctx.beginPath()
        ctx.moveTo(startPos.x, startPos.y)
        ctx.lineTo(x, y)
        ctx.stroke()
      } else if (tool === 'rect') {
        ctx.strokeRect(startPos.x, startPos.y, x - startPos.x, y - startPos.y)
      } else if (tool === 'ellipse') {
        ctx.beginPath()
        const radiusX = Math.abs(x - startPos.x) / 2
        const radiusY = Math.abs(y - startPos.y) / 2
        const centerX = Math.min(startPos.x, x) + radiusX
        const centerY = Math.min(startPos.y, y) + radiusY
        ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI)
        ctx.stroke()
      }
    }
  }

  const stopDraw = () => {
    if (!isDrawing) return
    setIsDrawing(false)
    saveState()
  }

  // Simple Flood Fill Algorithm
  const floodFill = (startX, startY, fillHex) => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const data = imgData.data
    const width = canvas.width
    const height = canvas.height

    const targetIdx = (startY * width + startX) * 4
    const tr = data[targetIdx]
    const tg = data[targetIdx + 1]
    const tb = data[targetIdx + 2]
    const ta = data[targetIdx + 3]

    // Convert hex to rgb
    const fillR = parseInt(fillHex.slice(1, 3), 16)
    const fillG = parseInt(fillHex.slice(3, 5), 16)
    const fillB = parseInt(fillHex.slice(5, 7), 16)

    if (tr === fillR && tg === fillG && tb === fillB && ta === 255) return

    const matchTarget = (idx) => {
      return data[idx] === tr && data[idx + 1] === tg && data[idx + 2] === tb && data[idx + 3] === ta
    }

    const colorPixel = (idx) => {
      data[idx] = fillR
      data[idx + 1] = fillG
      data[idx + 2] = fillB
      data[idx + 3] = 255
    }

    const queue = [[startX, startY]]
    const seen = new Uint8Array(width * height)

    while (queue.length > 0) {
      const [cx, cy] = queue.pop()
      if (cx < 0 || cx >= width || cy < 0 || cy >= height) continue
      const pos = cy * width + cx
      if (seen[pos]) continue
      seen[pos] = 1

      const idx = pos * 4
      if (matchTarget(idx)) {
        colorPixel(idx)
        queue.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1])
      }
    }
    ctx.putImageData(imgData, 0, 0)
  }

  const handleSave = () => {
    if (isWin98) playWin98Click()
    const canvas = canvasRef.current
    if (!canvas) return
    const dataUrl = canvas.toDataURL('image/png')
    if (onSaveDoodle) onSaveDoodle(dataUrl)
    onClose()
  }

  const handleDownload = () => {
    if (isWin98) playWin98Click()
    const canvas = canvasRef.current
    if (!canvas) return
    const a = document.createElement('a')
    a.href = canvas.toDataURL('image/png')
    a.download = `doodle_${Date.now()}.png`
    a.click()
  }

  if (!isOpen) return null

  // Tablet Companion Pairing Link
  const mobilePortalUrl = `${window.location.origin}/mobile-paint?session=${sessionToken}`

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      backgroundColor: 'rgba(0, 0, 0, 0.45)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '12px',
    }}>
      <div style={{
        width: '780px',
        maxWidth: '96vw',
        maxHeight: '92vh',
        backgroundColor: '#c0c0c0',
        border: '1px solid #000000',
        boxShadow: 'inset 1px 1px #ffffff, inset -1px -1px #808080, 4px 4px 20px rgba(0,0,0,0.6)',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        fontFamily: '"MS Sans Serif", Tahoma, Arial, sans-serif',
        fontSize: '11px',
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
            <Palette size={13} color="#ffffff" />
            <span>{title} - MS Paint 98</span>
          </div>
          <button
            onClick={onClose}
            style={{
              width: '16px',
              height: '14px',
              backgroundColor: '#c0c0c0',
              border: '1px solid #000',
              boxShadow: 'inset 1px 1px #fff, inset -1px -1px #808080',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              padding: 0,
              fontWeight: 'bold',
              fontSize: '10px',
            }}
          >
            <X size={10} />
          </button>
        </div>

        {/* Menu Bar */}
        <div style={{
          display: 'flex',
          gap: '12px',
          padding: '2px 6px',
          backgroundColor: '#c0c0c0',
          borderBottom: '1px solid #808080',
        }}>
          <span style={{ cursor: 'pointer' }}><u>F</u>ile</span>
          <span style={{ cursor: 'pointer' }}><u>E</u>dit</span>
          <span style={{ cursor: 'pointer' }}><u>V</u>iew</span>
          <span style={{ cursor: 'pointer' }}><u>I</u>mage</span>
          <span style={{ cursor: 'pointer' }}><u>O</u>ptions</span>
          <span style={{ cursor: 'pointer' }}><u>H</u>elp</span>
        </div>

        {/* Action Quick Bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '4px 6px',
          backgroundColor: '#c0c0c0',
          borderBottom: '1px solid #808080',
          gap: '6px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <button
              onClick={undo}
              disabled={historyIndex <= 0}
              className="segment-btn"
              title="Undo (Ctrl+Z)"
              style={{ padding: '2px 6px', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <Undo size={12} />
              <span>Undo</span>
            </button>
            <button
              onClick={redo}
              disabled={historyIndex >= history.length - 1}
              className="segment-btn"
              title="Redo (Ctrl+Y)"
              style={{ padding: '2px 6px', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <Redo size={12} />
              <span>Redo</span>
            </button>
            <button
              onClick={clearCanvas}
              className="segment-btn"
              title="Clear Canvas"
              style={{ padding: '2px 6px', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <RotateCcw size={12} />
              <span>Clear</span>
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {/* Mobile / Tablet Stylus Companion Button */}
            <button
              onClick={() => setShowQR(!showQR)}
              className={`segment-btn ${showQR ? 'active' : ''}`}
              title="Connect iPad, Samsung S Pen or Phone for drawing"
              style={{
                padding: '2px 8px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                color: '#000080',
                fontWeight: 'bold',
              }}
            >
              <Smartphone size={12} />
              <span>📱 Connect Tablet / Stylus</span>
            </button>

            <button
              onClick={handleDownload}
              className="segment-btn"
              style={{ padding: '2px 8px', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <Download size={12} />
              <span>Export .png</span>
            </button>

            <button
              onClick={handleSave}
              className="segment-btn"
              style={{
                padding: '2px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                backgroundColor: '#000080',
                color: '#ffffff',
                fontWeight: 'bold',
              }}
            >
              <Save size={12} />
              <span>Attach to Journal</span>
            </button>
          </div>
        </div>

        {/* Main Work Area: Tool Palette + Canvas */}
        <div style={{
          display: 'flex',
          flex: 1,
          padding: '6px',
          gap: '6px',
          backgroundColor: '#808080',
          overflow: 'hidden',
        }}>
          {/* Left Classic Tool Box */}
          <div style={{
            width: '56px',
            backgroundColor: '#c0c0c0',
            border: '1px solid #000',
            boxShadow: 'inset 1px 1px #fff, inset -1px -1px #808080',
            padding: '4px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            alignItems: 'center',
          }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '2px',
              width: '100%',
            }}>
              {[
                { id: 'pencil', icon: Edit2, label: 'Pencil' },
                { id: 'brush', icon: Brush, label: 'Brush' },
                { id: 'eraser', icon: Eraser, label: 'Eraser' },
                { id: 'bucket', icon: PaintBucket, label: 'Fill Bucket' },
                { id: 'line', icon: Minus, label: 'Line' },
                { id: 'rect', icon: Square, label: 'Rectangle' },
                { id: 'ellipse', icon: Circle, label: 'Ellipse' },
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => {
                    if (isWin98) playWin98Click()
                    setTool(t.id)
                  }}
                  className={`segment-btn ${tool === t.id ? 'active' : ''}`}
                  title={t.label}
                  style={{
                    width: '22px',
                    height: '22px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 0,
                  }}
                >
                  <t.icon size={13} />
                </button>
              ))}
            </div>

            {/* Brush Size Selector */}
            <div style={{
              marginTop: '8px',
              width: '100%',
              backgroundColor: '#ffffff',
              border: '1px solid #000',
              boxShadow: 'inset 1px 1px #808080, inset -1px -1px #ffffff',
              padding: '4px 2px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              alignItems: 'center',
            }}>
              {[1, 3, 6, 10].map(sz => (
                <div
                  key={sz}
                  onClick={() => setBrushSize(sz)}
                  style={{
                    width: '100%',
                    height: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    backgroundColor: brushSize === sz ? '#000080' : 'transparent',
                  }}
                >
                  <div style={{
                    width: `${sz * 2}px`,
                    height: `${sz * 2}px`,
                    borderRadius: '50%',
                    backgroundColor: brushSize === sz ? '#ffffff' : '#000000',
                  }} />
                </div>
              ))}
            </div>
          </div>

          {/* Center Canvas Viewport */}
          <div style={{
            flex: 1,
            backgroundColor: '#808080',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'auto',
            position: 'relative',
          }}>
            <div style={{
              border: '1px solid #000000',
              boxShadow: '2px 2px 8px rgba(0,0,0,0.4)',
              backgroundColor: '#ffffff',
              lineHeight: 0,
            }}>
              <canvas
                ref={canvasRef}
                width={640}
                height={400}
                onMouseDown={startDraw}
                onMouseMove={draw}
                onMouseUp={stopDraw}
                onMouseLeave={stopDraw}
                onContextMenu={(e) => e.preventDefault()}
                style={{
                  cursor: tool === 'pencil' ? 'crosshair' : (tool === 'bucket' ? 'cell' : 'default'),
                  touchAction: 'none',
                  display: 'block',
                }}
              />
            </div>

            {/* Mobile / Tablet QR Companion Overlay */}
            {showQR && (
              <div style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                backgroundColor: '#c0c0c0',
                border: '1px solid #000',
                boxShadow: 'inset 1px 1px #fff, inset -1px -1px #808080, 4px 4px 12px rgba(0,0,0,0.5)',
                padding: '10px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                zIndex: 50,
                maxWidth: '220px',
                textAlign: 'center',
              }}>
                <div style={{ fontWeight: 'bold', color: '#000080' }}>
                  📱 Stylus & Tablet Companion
                </div>
                <div style={{ backgroundColor: '#ffffff', padding: '6px', border: '1px solid #000' }}>
                  <QRCodeSVG value={mobilePortalUrl} size={130} />
                </div>
                <div style={{ fontSize: '10px', color: '#333' }}>
                  Scan with iPad, Samsung Galaxy Tab, or iPhone to draw with S Pen / Apple Pencil.
                </div>
                <button
                  onClick={() => setShowQR(false)}
                  className="segment-btn"
                  style={{ padding: '2px 8px', fontSize: '10px' }}
                >
                  Dismiss
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Color Palette Bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          padding: '4px 6px',
          backgroundColor: '#c0c0c0',
          borderTop: '1px solid #808080',
          gap: '8px',
        }}>
          {/* Current Color Indicator */}
          <div style={{
            width: '32px',
            height: '32px',
            position: 'relative',
            backgroundColor: '#c0c0c0',
            border: '1px solid #000',
            boxShadow: 'inset 1px 1px #808080, inset -1px -1px #fff',
          }}>
            <div style={{
              position: 'absolute',
              bottom: '2px',
              right: '2px',
              width: '16px',
              height: '16px',
              backgroundColor: secondaryColor,
              border: '1px solid #000',
            }} />
            <div style={{
              position: 'absolute',
              top: '2px',
              left: '2px',
              width: '16px',
              height: '16px',
              backgroundColor: selectedColor,
              border: '1px solid #000',
              zIndex: 2,
            }} />
          </div>

          {/* Swatches Grid */}
          <div style={{
            display: 'grid',
            gridTemplateRows: 'repeat(2, 14px)',
            gridAutoFlow: 'column',
            gap: '2px',
          }}>
            {WIN98_COLORS.map(c => (
              <div
                key={c}
                onClick={() => setSelectedColor(c)}
                onContextMenu={(e) => {
                  e.preventDefault()
                  setSecondaryColor(c)
                }}
                style={{
                  width: '14px',
                  height: '14px',
                  backgroundColor: c,
                  border: '1px solid #000',
                  cursor: 'pointer',
                  boxShadow: selectedColor === c ? 'inset 1px 1px #000, inset -1px -1px #fff' : 'none',
                }}
              />
            ))}
          </div>

          {/* Status Bar */}
          <div style={{
            flex: 1,
            marginLeft: '8px',
            padding: '2px 6px',
            boxShadow: 'inset 1px 1px #808080, inset -1px -1px #fff',
            color: '#000',
            fontSize: '11px',
          }}>
            Tool: {tool.toUpperCase()} | Canvas: 640×400 | Stylus: Ready
          </div>
        </div>
      </div>
    </div>
  )
}
