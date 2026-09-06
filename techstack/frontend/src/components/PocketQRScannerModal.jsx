import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import jsQR from 'jsqr'
import { Camera, X, RefreshCw, Zap, Check, AlertCircle, Globe, Link2, Sparkles } from 'lucide-react'
import { redeemPairingTicket, setToken, setVaultUrl, getVaultUrl } from '../services/api'

export default function PocketQRScannerModal({ isOpen, onClose, onScanSuccess, accent = '#0078D7' }) {
  const [hasCameraPermission, setHasCameraPermission] = useState(null)
  const [cameraError, setCameraError] = useState('')
  const [isScanning, setIsScanning] = useState(false)
  const [isProcessingCode, setIsProcessingCode] = useState(false)
  const [scanFeedback, setScanFeedback] = useState(null) // { success: boolean, message: string }
  const [manualInputOpen, setManualInputOpen] = useState(false)
  const [manualUrlOrCode, setManualUrlOrCode] = useState('')
  const [torchOn, setTorchOn] = useState(false)
  const [hasTorch, setHasTorch] = useState(false)

  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const animFrameRef = useRef(null)

  // Start camera when modal opens
  useEffect(() => {
    if (!isOpen) {
      stopCamera()
      setScanFeedback(null)
      setIsProcessingCode(false)
      return
    }

    startCamera()

    return () => {
      stopCamera()
    }
  }, [isOpen])

  const startCamera = async () => {
    setCameraError('')
    setScanFeedback(null)
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('Camera access is not supported on this browser or connection. (HTTPS or localhost required)')
        setHasCameraPermission(false)
        setManualInputOpen(true)
        return
      }

      const constraints = {
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        // Required for iOS Safari
        videoRef.current.setAttribute('playsinline', 'true')
        await videoRef.current.play()
        setHasCameraPermission(true)
        setIsScanning(true)

        // Check torch capability
        try {
          const track = stream.getVideoTracks()[0]
          const capabilities = track.getCapabilities ? track.getCapabilities() : {}
          if (capabilities.torch) {
            setHasTorch(true)
          }
        } catch (e) {}

        requestScanFrame()
      }
    } catch (err) {
      console.warn('Camera start error:', err)
      setHasCameraPermission(false)
      setCameraError(err.message || 'Unable to open camera. Please grant camera permission or use manual pairing.')
      setManualInputOpen(true)
    }
  }

  const stopCamera = () => {
    setIsScanning(false)
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current)
      animFrameRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }

  const toggleTorch = async () => {
    if (!streamRef.current || !hasTorch) return
    try {
      const track = streamRef.current.getVideoTracks()[0]
      const nextState = !torchOn
      await track.applyConstraints({
        advanced: [{ torch: nextState }],
      })
      setTorchOn(nextState)
    } catch (e) {}
  }

  // Scanning loop using jsQR
  const requestScanFrame = () => {
    if (!isScanning && !videoRef.current) return

    const scan = () => {
      const video = videoRef.current
      const canvas = canvasRef.current

      if (video && video.readyState === video.HAVE_ENOUGH_DATA && canvas) {
        const ctx = canvas.getContext('2d', { willReadFrequently: true })
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert',
        })

        if (code && code.data && code.data.trim().length > 0) {
          handleDetectedCode(code.data.trim())
          return // Stop scanning once detected
        }
      }

      animFrameRef.current = requestAnimationFrame(scan)
    }

    animFrameRef.current = requestAnimationFrame(scan)
  }

  const getDeviceName = () => {
    const ua = navigator.userAgent || ''
    let dev = 'Smartphone'
    if (/iPhone/i.test(ua)) dev = 'iPhone'
    else if (/iPad/i.test(ua)) dev = 'iPad'
    else if (/Android/i.test(ua)) {
      const match = ua.match(/;\s*([^;)]+)\s+Build/i)
      dev = match ? match[1].trim() : 'Android Smartphone'
    }
    let browser = 'Mobile'
    if (/CriOS|Chrome/i.test(ua)) browser = 'Chrome'
    else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = 'Safari'
    else if (/Firefox|FxiOS/i.test(ua)) browser = 'Firefox'
    return `${dev} (${browser})`
  }

  // Process detected QR code string
  const handleDetectedCode = async (rawCode) => {
    if (isProcessingCode) return
    setIsProcessingCode(true)
    stopCamera()

    try {
      let ticket = ''
      let vaultHostUrl = ''

      if (rawCode.startsWith('http://') || rawCode.startsWith('https://')) {
        try {
          const parsedUrl = new URL(rawCode)
          ticket = parsedUrl.searchParams.get('pair_ticket') || parsedUrl.searchParams.get('ticket') || ''
          const tokenParam = parsedUrl.searchParams.get('token') || parsedUrl.searchParams.get('pair')
          
          vaultHostUrl = parsedUrl.origin

          if (tokenParam) {
            // Direct token in URL
            setToken(tokenParam)
            if (vaultHostUrl) setVaultUrl(vaultHostUrl)
            setScanFeedback({ success: true, message: '✓ Session Reconnected Successfully!' })
            if (onScanSuccess) onScanSuccess({ token: tokenParam, vaultUrl: vaultHostUrl })
            setTimeout(() => onClose(), 1200)
            return
          }
        } catch (e) {
          ticket = rawCode
        }
      } else {
        ticket = rawCode
      }

      if (vaultHostUrl) {
        setVaultUrl(vaultHostUrl)
      }

      if (!ticket) {
        throw new Error('No valid pairing ticket found in QR code.')
      }

      // Redeem ticket with laptop backend
      const res = await redeemPairingTicket(ticket, getDeviceName())
      if (res && res.token) {
        setToken(res.token)
        if (vaultHostUrl) setVaultUrl(vaultHostUrl)
        setScanFeedback({ 
          success: true, 
          message: `✓ Linked to ${res.device_name || 'Laptop Vault'}!` 
        })
        if (onScanSuccess) onScanSuccess({ token: res.token, vaultUrl: vaultHostUrl || getVaultUrl(), deviceName: res.device_name })
        setTimeout(() => onClose(), 1200)
      } else {
        throw new Error(res?.message || 'Failed to authenticate pairing ticket.')
      }
    } catch (err) {
      console.error('Scan resolution error:', err)
      setScanFeedback({
        success: false,
        message: err.message || 'Ticket expired or invalid. Please refresh the QR code on your laptop screen and try again.',
      })
      setIsProcessingCode(false)
    }
  }

  const handleManualSubmit = (e) => {
    e.preventDefault()
    if (!manualUrlOrCode.trim()) return
    handleDetectedCode(manualUrlOrCode.trim())
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 999999,
          backgroundColor: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(12px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
        }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 15 }}
          transition={{ type: 'spring', duration: 0.35, bounce: 0.15 }}
          onClick={(e) => e.stopPropagation()}
          style={{
            width: '100%',
            maxWidth: '420px',
            backgroundColor: '#111111',
            borderRadius: '20px',
            border: '1px solid rgba(255,255,255,0.15)',
            boxShadow: '0 24px 60px rgba(0,0,0,0.8)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            color: '#FFFFFF',
          }}
        >
          {/* Modal Header */}
          <div
            style={{
              padding: '16px 20px',
              borderBottom: '1px solid rgba(255,255,255,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: 'rgba(255,255,255,0.03)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  backgroundColor: accent,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Camera size={18} color="#FFFFFF" />
              </div>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 700 }}>Scan Laptop QR Code</div>
                <div style={{ fontSize: '11px', opacity: 0.7 }}>Renew ActiveSync Vault Session</div>
              </div>
            </div>

            <button
              onClick={onClose}
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                color: '#FFF',
                width: '30px',
                height: '30px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <X size={16} />
            </button>
          </div>

          {/* Viewfinder Section */}
          <div
            style={{
              position: 'relative',
              width: '100%',
              aspectRatio: '1/1',
              backgroundColor: '#000000',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {hasCameraPermission === false || manualInputOpen ? (
              /* Fallback Manual Input View */
              <div
                style={{
                  padding: '24px',
                  width: '100%',
                  height: '100%',
                  boxSizing: 'border-box',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  gap: '12px',
                  textAlign: 'center',
                }}
              >
                <Globe size={32} color={accent} style={{ margin: '0 auto' }} />
                <div style={{ fontSize: '14px', fontWeight: 600 }}>Enter Vault URL or Pairing Code</div>
                <div style={{ fontSize: '11px', opacity: 0.7 }}>
                  Paste the full pairing link or LAN address shown on your laptop screen (e.g. <code>http://192.168.29.51:8000/pocket?pair_ticket=...</code>).
                </div>

                <form onSubmit={handleManualSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <input
                    type="text"
                    value={manualUrlOrCode}
                    onChange={(e) => setManualUrlOrCode(e.target.value)}
                    placeholder="http://192.168.29.51:8000/pocket?..."
                    autoFocus
                    style={{
                      width: '100%',
                      padding: '10px',
                      backgroundColor: 'rgba(255,255,255,0.08)',
                      border: `1px solid ${accent}`,
                      borderRadius: '8px',
                      color: '#FFF',
                      fontSize: '12px',
                      fontFamily: 'monospace',
                      boxSizing: 'border-box',
                      outline: 'none',
                    }}
                  />
                  <button
                    type="submit"
                    disabled={isProcessingCode || !manualUrlOrCode.trim()}
                    style={{
                      backgroundColor: accent,
                      color: '#FFF',
                      border: 'none',
                      padding: '10px',
                      borderRadius: '8px',
                      fontWeight: 600,
                      fontSize: '13px',
                      cursor: 'pointer',
                    }}
                  >
                    {isProcessingCode ? 'Connecting...' : 'Connect & Pair'}
                  </button>
                </form>

                {hasCameraPermission !== false && (
                  <button
                    onClick={() => {
                      setManualInputOpen(false)
                      startCamera()
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: accent,
                      fontSize: '12px',
                      cursor: 'pointer',
                      marginTop: '4px',
                    }}
                  >
                    ← Switch back to Camera Scanner
                  </button>
                )}
              </div>
            ) : (
              /* Live Camera Viewfinder */
              <>
                <video
                  ref={videoRef}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
                <canvas ref={canvasRef} style={{ display: 'none' }} />

                {/* Viewfinder Reticle Overlay */}
                <div
                  style={{
                    position: 'absolute',
                    inset: '30px',
                    border: '2px dashed rgba(255,255,255,0.6)',
                    borderRadius: '16px',
                    boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.45)',
                    pointerEvents: 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  {/* Laser Scanline Animation */}
                  <motion.div
                    animate={{ y: [0, 260, 0] }}
                    transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
                    style={{
                      width: '100%',
                      height: '2px',
                      backgroundColor: accent,
                      boxShadow: `0 0 12px 2px ${accent}`,
                    }}
                  />
                </div>

                {/* Flashlight toggle */}
                {hasTorch && (
                  <button
                    onClick={toggleTorch}
                    style={{
                      position: 'absolute',
                      top: '16px',
                      right: '16px',
                      backgroundColor: torchOn ? '#FFFFFF' : 'rgba(0,0,0,0.6)',
                      color: torchOn ? '#000000' : '#FFFFFF',
                      border: 'none',
                      borderRadius: '50%',
                      width: '36px',
                      height: '36px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                    }}
                  >
                    <Zap size={16} />
                  </button>
                )}
              </>
            )}

            {/* Scan Result Feedback Toast inside Viewfinder */}
            {scanFeedback && (
              <div
                style={{
                  position: 'absolute',
                  bottom: '16px',
                  left: '16px',
                  right: '16px',
                  backgroundColor: scanFeedback.success ? '#008000' : '#D13438',
                  color: '#FFFFFF',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  fontSize: '12px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                  zIndex: 20,
                }}
              >
                {scanFeedback.success ? <Check size={18} /> : <AlertCircle size={18} />}
                <span>{scanFeedback.message}</span>
              </div>
            )}
          </div>

          {/* Modal Footer Instructions */}
          <div
            style={{
              padding: '14px 20px',
              backgroundColor: 'rgba(255,255,255,0.02)',
              borderTop: '1px solid rgba(255,255,255,0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '11px',
              opacity: 0.85,
            }}
          >
            <span>Point camera at laptop screen QR code</span>
            {!manualInputOpen && (
              <button
                onClick={() => setManualInputOpen(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: accent,
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                Manual Entry ↗
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
