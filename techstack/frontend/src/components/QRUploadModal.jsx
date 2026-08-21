import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Smartphone, Copy, Check, Upload, RefreshCw, CheckCircle2 } from 'lucide-react'
import { createQRSession, getUploadPortalSession } from '../services/api'
import ThemedQRCodeCard from './ThemedQRCode'

export default function QRUploadModal({ isOpen, onClose, postId, onUploadSuccess }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [uploadedCount, setUploadedCount] = useState(0)

  useEffect(() => {
    if (!isOpen || !postId) {
      setSession(null)
      return
    }

    let isMounted = true
    setLoading(true)

    createQRSession(postId)
      .then((data) => {
        if (isMounted) {
          setSession(data)
          setLoading(false)
        }
      })
      .catch((err) => {
        console.error('Failed to create QR session', err)
        if (isMounted) setLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [isOpen, postId])

  useEffect(() => {
    if (!session || !session.token || !isOpen) return

    const interval = setInterval(async () => {
      try {
        const data = await getUploadPortalSession(session.token)
        if (data.uploaded_files && data.uploaded_files.length > uploadedCount) {
          setUploadedCount(data.uploaded_files.length)
          if (onUploadSuccess) onUploadSuccess()
        }
      } catch (err) {
        console.error('Poll error', err)
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [session, isOpen, uploadedCount, onUploadSuccess])

  const copyLink = () => {
    if (!session?.qr_url) return
    navigator.clipboard.writeText(session.qr_url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div 
        style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(10px)',
          padding: '16px',
        }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          style={{
            width: '100%', maxWidth: '440px',
            backgroundColor: 'var(--ios-bg-card, #1c1c1e)',
            borderRadius: '24px',
            border: '1px solid var(--ios-border, rgba(255,255,255,0.1))',
            boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
            padding: '24px',
            position: 'relative',
            color: 'var(--ios-text-primary, #fff)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            style={{
              position: 'absolute', top: '18px', right: '18px',
              background: 'var(--ios-border)', border: 'none',
              width: '32px', height: '32px', borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: 'inherit'
            }}
          >
            <X size={18} />
          </button>

          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: '48px', height: '48px', borderRadius: '16px',
              background: 'rgba(136, 116, 74, 0.15)', color: 'var(--ios-accent, #007aff)',
              marginBottom: '12px',
            }}>
              <Smartphone size={26} />
            </div>
            <h3 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 6px 0' }}>
              Upload Original Media
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--ios-text-secondary, #8e8e93)', margin: 0, lineHeight: 1.4 }}>
              Scan this QR code with your phone camera on local Wi-Fi to upload your original, uncompressed photos and videos.
            </p>
          </div>

          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            marginBottom: '18px', width: '100%'
          }}>
            {loading ? (
              <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <RefreshCw size={28} className="spin-anim" color="var(--ios-accent, #007aff)" />
              </div>
            ) : session?.qr_url ? (
              <ThemedQRCodeCard
                url={session.qr_url}
                title="UPLOAD_PORTAL.EXE"
                caption="Scan on Wi-Fi 📷"
              />
            ) : (
              <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>
                Could not generate QR session
              </div>
            )}
          </div>

          {uploadedCount > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              background: 'rgba(52, 199, 89, 0.15)', color: '#34c759',
              padding: '10px 14px', borderRadius: '14px', fontSize: '13px', fontWeight: 600,
              marginBottom: '16px', justifyContent: 'center'
            }}>
              <CheckCircle2 size={16} />
              <span>{uploadedCount} {uploadedCount === 1 ? 'file' : 'files'} received from phone!</span>
            </div>
          )}

          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            background: 'var(--ios-border)', borderRadius: '14px', padding: '6px 6px 6px 12px',
            fontSize: '12px', color: 'var(--ios-text-secondary, #8e8e93)',
          }}>
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--ios-text-primary)' }}>
              {session?.qr_url || 'Generating link...'}
            </span>
            <button
              onClick={copyLink}
              disabled={!session?.qr_url}
              style={{
                display: 'flex', alignItems: 'center', gap: '4px',
                background: 'var(--ios-accent, #007aff)', color: '#fff',
                border: 'none', padding: '6px 12px', borderRadius: '10px',
                fontSize: '12px', fontWeight: 600, cursor: 'pointer',
              }}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
