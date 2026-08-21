import React, { useState, useRef, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { 
  Brush, Eraser, RotateCcw, Send, Check, Undo, Redo, 
  Palette, Smartphone, Tablet, ChevronLeft, ShieldCheck 
} from 'lucide-react'

const PALETTE = [
  '#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff', 
  '#ffff00', '#00ffff', '#ff00ff', '#ff8800', '#8800ff', 
  '#008800', '#884400', '#888888', '#000080'
]

export default function MobilePaintPortal() {
  const [searchParams] = useSearchParams()
  const session = searchParams.get('session') || 'default'
  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  
  const [tool, setTool] = useState('brush') // 'brush' | 'pencil' | 'eraser'
  const [color, setColor] = useState('#000000')
  const [brushSize, setBrushSize] = useState(4)
  const [isDrawing, setIsDrawing] = useState(false)
  const [synced, setSynced] = useState(false)
  const [history, setHistory] = useState([])
  const [historyIndex, setHistoryIndex] = useState(-1)

  // Setup Responsive Canvas size matching device screen & pixel ratio
  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const resizeCanvas = () => {
      const rect = container.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      canvas.style.width = `${rect.width}px`
      canvas.style.height = `${rect.height}px`

      const ctx = canvas.getContext('2d')
      ctx.scale(dpr, dpr)
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, rect.width, rect.height)
      saveHistory()
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)
    window.addEventListener('orientationchange', resizeCanvas)
    return () => {
      window.removeEventListener('resize', resizeCanvas)
      window.removeEventListener('orientationchange', resizeCanvas)
    }
  }, [])

  const saveHistory = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    setHistory(prev => [...prev.slice(0, historyIndex + 1), imgData])
    setHistoryIndex(prev => prev + 1)
  }

  const undo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1
      setHistoryIndex(newIndex)
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      ctx.putImageData(history[newIndex], 0, 0)
    }
  }

  const clearCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    saveHistory()
  }

  // Pointer Event Stylus / Touch drawing
  const getCoordinates = (e) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      pressure: e.pressure || 0.5
    }
  }

  const startDraw = (e) => {
    e.preventDefault()
    setIsDrawing(true)
    const { x, y, pressure } = getCoordinates(e)
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')

    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : color
    ctx.lineWidth = tool === 'pencil' ? 1 : (tool === 'eraser' ? brushSize * 4 : brushSize * (pressure * 2 || 1))
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }

  const draw = (e) => {
    if (!isDrawing) return
    e.preventDefault()
    const { x, y, pressure } = getCoordinates(e)
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')

    if (e.pointerType === 'pen' || e.pressure > 0) {
      ctx.lineWidth = tool === 'eraser' ? brushSize * 4 : brushSize * (pressure * 2 || 1)
    }
    ctx.lineTo(x, y)
    ctx.stroke()
  }

  const stopDraw = () => {
    if (!isDrawing) return
    setIsDrawing(false)
    saveHistory()
  }

  // Broadcast Doodle to Desktop Session in real-time
  const syncToDesktop = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dataUrl = canvas.toDataURL('image/png')

    const payload = JSON.stringify({
      session,
      doodle: dataUrl,
      timestamp: Date.now()
    })

    localStorage.setItem(`memwault_paint_sync_${session}`, payload)
    setSynced(true)
    setTimeout(() => setSynced(false), 3000)
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      width: '100vw',
      backgroundColor: '#121214',
      color: '#ffffff',
      userSelect: 'none',
      overflow: 'hidden',
      touchAction: 'none',
    }}>
      {/* Top Header Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 14px',
        backgroundColor: '#1c1c1e',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '8px',
            backgroundColor: 'rgba(0, 122, 255, 0.2)',
            color: '#007aff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Tablet size={16} />
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700 }}>MemWault Stylus Companion</div>
            <div style={{ fontSize: '10px', color: '#8e8e93' }}>Session: {session} • Apple Pencil / S Pen Ready</div>
          </div>
        </div>

        <button
          onClick={syncToDesktop}
          style={{
            backgroundColor: synced ? '#34c759' : '#007aff',
            color: '#ffffff',
            border: 'none',
            borderRadius: '12px',
            padding: '8px 14px',
            fontSize: '12px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0, 122, 255, 0.3)',
          }}
        >
          {synced ? <Check size={14} /> : <Send size={14} />}
          <span>{synced ? 'Synced to Desktop!' : 'Sync to PC'}</span>
        </button>
      </div>

      {/* Tool & Color Selection Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 12px',
        backgroundColor: '#242426',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        overflowX: 'auto',
        gap: '8px',
      }}>
        {/* Tools */}
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            onClick={() => setTool('brush')}
            style={{
              backgroundColor: tool === 'brush' ? '#007aff' : 'rgba(255,255,255,0.1)',
              border: 'none',
              borderRadius: '8px',
              padding: '6px 10px',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '12px',
            }}
          >
            <Brush size={14} />
            <span>Brush</span>
          </button>
          <button
            onClick={() => setTool('eraser')}
            style={{
              backgroundColor: tool === 'eraser' ? '#007aff' : 'rgba(255,255,255,0.1)',
              border: 'none',
              borderRadius: '8px',
              padding: '6px 10px',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '12px',
            }}
          >
            <Eraser size={14} />
            <span>Eraser</span>
          </button>
          <button
            onClick={undo}
            style={{
              backgroundColor: 'rgba(255,255,255,0.1)',
              border: 'none',
              borderRadius: '8px',
              padding: '6px 10px',
              color: '#fff',
              fontSize: '12px',
            }}
          >
            <Undo size={14} />
          </button>
          <button
            onClick={clearCanvas}
            style={{
              backgroundColor: 'rgba(255,255,255,0.1)',
              border: 'none',
              borderRadius: '8px',
              padding: '6px 10px',
              color: '#fff',
              fontSize: '12px',
            }}
          >
            <RotateCcw size={14} />
          </button>
        </div>

        {/* Color Palette */}
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          {PALETTE.map(c => (
            <div
              key={c}
              onClick={() => {
                setColor(c)
                if (tool === 'eraser') setTool('brush')
              }}
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                backgroundColor: c,
                border: color === c ? '2px solid #ffffff' : '1px solid rgba(255,255,255,0.3)',
                boxShadow: color === c ? '0 0 6px rgba(255,255,255,0.8)' : 'none',
                cursor: 'pointer',
                flexShrink: 0,
              }}
            />
          ))}
        </div>
      </div>

      {/* Main Touch & Stylus Canvas */}
      <div 
        ref={containerRef}
        style={{
          flex: 1,
          backgroundColor: '#ffffff',
          position: 'relative',
          touchAction: 'none',
        }}
      >
        <canvas
          ref={canvasRef}
          onPointerDown={startDraw}
          onPointerMove={draw}
          onPointerUp={stopDraw}
          onPointerCancel={stopDraw}
          style={{
            display: 'block',
            width: '100%',
            height: '100%',
            touchAction: 'none',
          }}
        />
      </div>
    </div>
  )
}
