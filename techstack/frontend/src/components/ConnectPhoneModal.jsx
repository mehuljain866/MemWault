import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { QRCodeSVG } from 'qrcode.react'
import { Smartphone, Copy, Check, RefreshCw, Wifi, ExternalLink, ShieldCheck, Download } from 'lucide-react'
import { Win98PhoneSyncIcon, PocketWindowsFlagIcon } from './win98/Win98Icons'
import { playWin98Click } from '../services/win98Audio'

export default function ConnectPhoneModal({ isOpen, onClose }) {
  const [copied, setCopied] = useState(false)
  const [lanUrl, setLanUrl] = useState('')
  const [lanIp, setLanIp] = useState('192.168.29.50')

  useEffect(() => {
    if (!isOpen) return
    const host = window.location.hostname
    const port = window.location.port ? `:${window.location.port}` : ''
    const protocol = window.location.protocol

    // Fetch the real LAN IP from backend if hostname is localhost
    fetch('/api/v1/upload/qr-session', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('sv_token') || ''}`,
        'Content-Type': 'application/json'
      }
    })
      .then(res => res.json())
      .then(data => {
        if (data && data.qr_url) {
          try {
            const urlObj = new URL(data.qr_url)
            const resolvedIp = urlObj.hostname
            setLanIp(resolvedIp)
            setLanUrl(`${protocol}//${resolvedIp}${port}/pocket`)
          } catch (e) {
            setLanUrl(`${protocol}//${host}${port}/pocket`)
          }
        } else {
          setLanUrl(`${protocol}//${host}${port}/pocket`)
        }
      })
      .catch(() => {
        const fallbackIp = host !== 'localhost' && host !== '127.0.0.1' ? host : '192.168.29.50'
        setLanIp(fallbackIp)
        setLanUrl(`${protocol}//${fallbackIp}${port}/pocket`)
      })
  }, [isOpen])

  const copyUrl = () => {
    if (!lanUrl) return
    navigator.clipboard.writeText(lanUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!isOpen) return null

  return (
    <div className="win98-dialog-overlay" onClick={onClose} style={{ zIndex: 100000 }}>
      <div 
        className="win98-dialog-window" 
        onClick={(e) => e.stopPropagation()}
        style={{ width: '480px', maxWidth: '95vw' }}
      >
        {/* Title Bar */}
        <div className="win98-dialog-titlebar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Win98PhoneSyncIcon size={14} />
            <span>Connect to Phone (ActiveSync / Pocket PC Companion)</span>
          </div>
          <button 
            onClick={() => { playWin98Click(); onClose(); }}
            className="win98-dialog-close-btn"
          >
            ✕
          </button>
        </div>

        {/* Dialog Content */}
        <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          
          {/* Header Banner */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            backgroundColor: '#000080',
            color: '#ffffff',
            padding: '8px 12px',
            boxShadow: 'inset 1px 1px #000, inset -1px -1px #fff',
          }}>
            <PocketWindowsFlagIcon size={24} />
            <div>
              <div style={{ fontWeight: 'bold', fontSize: '12px' }}>Pocket MemWault Companion App</div>
              <div style={{ fontSize: '10px', opacity: 0.85 }}>Offline Mobile PWA • Windows Mobile 2003 UI</div>
            </div>
          </div>

          {/* QR Code & Direct URL Container */}
          <div style={{
            display: 'flex',
            gap: '14px',
            backgroundColor: '#ffffff',
            padding: '12px',
            border: '1px solid #000',
            boxShadow: 'inset 1px 1px #808080, inset -1px -1px #fff',
            alignItems: 'center',
          }}>
            {/* QR Code */}
            <div style={{
              backgroundColor: '#ffffff',
              padding: '6px',
              border: '1px solid #808080',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              {lanUrl ? (
                <QRCodeSVG value={lanUrl} size={130} level="M" />
              ) : (
                <div style={{ width: '130px', height: '130px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <RefreshCw size={24} className="spin-anim" />
                </div>
              )}
            </div>

            {/* URL Details */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#000000' }}>
                1. Scan with Phone Camera
              </div>
              <div style={{ fontSize: '10px', color: '#404040', lineHeight: 1.4 }}>
                Connect your smartphone to the same Wi-Fi network and scan the QR code to open the companion app.
              </div>

              <div style={{ fontSize: '10px', fontWeight: 'bold', marginTop: '4px', color: '#000' }}>
                Or type URL on phone:
              </div>
              <div style={{
                fontSize: '10px',
                fontFamily: 'monospace',
                backgroundColor: '#f0f0f0',
                padding: '4px 6px',
                border: '1px solid #808080',
                overflowX: 'auto',
                whiteSpace: 'nowrap',
              }}>
                {lanUrl || `http://${lanIp}:5173/pocket`}
              </div>

              <button
                onClick={copyUrl}
                className="win98-standard-btn"
                style={{
                  padding: '3px 8px',
                  fontSize: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  alignSelf: 'flex-start',
                  marginTop: '2px',
                }}
              >
                {copied ? <Check size={11} color="#008000" /> : <Copy size={11} />}
                <span>{copied ? 'Link Copied!' : 'Copy Mobile Link'}</span>
              </button>
            </div>
          </div>

          {/* PWA Installation Instructions */}
          <fieldset className="win98-fieldset">
            <legend>How to Install on Smartphone (PWA)</legend>
            <div style={{ fontSize: '11px', lineHeight: 1.5, color: '#000000', padding: '4px 2px' }}>
              <div>📱 <b>iPhone (iOS Safari):</b> Tap <b>Share button ⎋</b> at the bottom → Scroll down and tap <b>Add to Home Screen ⊞</b>.</div>
              <div style={{ marginTop: '4px' }}>🤖 <b>Android (Chrome):</b> Tap <b>Menu ⋮</b> in top-right → Tap <b>Install app 📥</b> or <b>Add to Home Screen</b>.</div>
              <div style={{ marginTop: '6px', fontSize: '10px', color: '#000080', fontWeight: 'bold' }}>
                ✓ Once added, Pocket MemWault opens as a standalone full-screen retro app and works offline anytime!
              </div>
            </div>
          </fieldset>

          {/* Bottom Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
            <a
              href={lanUrl || '/pocket'}
              target="_blank"
              rel="noreferrer"
              className="win98-standard-btn"
              style={{
                padding: '4px 14px',
                textDecoration: 'none',
                color: '#000',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <ExternalLink size={11} />
              <span>Preview on PC</span>
            </a>
            <button
              onClick={() => { playWin98Click(); onClose(); }}
              className="win98-standard-btn"
              style={{ padding: '4px 18px', fontWeight: 'bold' }}
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
