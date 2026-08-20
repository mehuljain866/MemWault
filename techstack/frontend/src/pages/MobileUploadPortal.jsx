import React, { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Smartphone, Upload, CheckCircle2, RefreshCw, 
  Sparkles, Layers, Image as ImageIcon, Film, AlertCircle
} from 'lucide-react'
import { getUploadPortalSession, uploadToPortal } from '../services/api'

export default function MobileUploadPortal() {
  const { token } = useParams()
  const [sessionData, setSessionData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedSlide, setSelectedSlide] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [uploadSuccess, setUploadSuccess] = useState(false)

  const fileInputRef = useRef(null)

  const loadSession = async () => {
    try {
      const data = await getUploadPortalSession(token)
      setSessionData(data)
    } catch (err) {
      setError(err.message || 'Session expired or invalid')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSession()
  }, [token])

  const handleFileSelected = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setUploadSuccess(false)
    try {
      await uploadToPortal(token, selectedSlide, file)
      setUploadSuccess(true)
      await loadSession()
      setTimeout(() => setUploadSuccess(false), 3000)
    } catch (err) {
      alert('Upload failed: ' + err.message)
    } finally {
      setUploading(false)
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <RefreshCw size={32} className="spin-anim" color="#007aff" />
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#000', color: '#fff', padding: '32px 20px', textAlign: 'center' }}>
        <AlertCircle size={48} color="#ff3b30" style={{ marginBottom: '16px' }} />
        <h2 style={{ fontSize: '20px', fontWeight: 700 }}>Connection Expired</h2>
        <p style={{ fontSize: '14px', color: '#8e8e93', margin: '8px 0 24px 0' }}>
          This QR upload session has expired or is no longer valid. Please scan the QR code again from your computer.
        </p>
      </div>
    )
  }

  const post = sessionData?.post
  const mediaItems = post?.media_items || []

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#000000',
      color: '#ffffff',
      padding: '24px 16px 80px 16px',
      maxWidth: '480px',
      margin: '0 auto',
    }}>
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: '56px', height: '56px', borderRadius: '18px',
          background: 'rgba(0, 122, 255, 0.15)', color: '#007aff',
          marginBottom: '12px',
        }}>
          <Sparkles size={28} />
        </div>
        <h1 style={{ fontSize: '22px', fontWeight: 800, margin: '0 0 6px 0' }}>
          MemWault AirDrop
        </h1>
        <p style={{ fontSize: '13px', color: '#8e8e93', margin: 0 }}>
          Uploading uncompressed master files to your computer over local Wi-Fi.
        </p>
      </div>

      <div style={{
        backgroundColor: '#1c1c1e', borderRadius: '20px', padding: '16px',
        border: '1px solid rgba(255,255,255,0.1)', marginBottom: '20px'
      }}>
        <div style={{ fontSize: '12px', fontWeight: 700, color: '#8e8e93', marginBottom: '8px' }}>
          TARGET POST
        </div>
        <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>
          {post?.caption_text || 'Instagram Post'}
        </div>
        <div style={{ fontSize: '12px', color: '#8e8e93' }}>
          {mediaItems.length} {mediaItems.length === 1 ? 'slide' : 'slides in carousel'}
        </div>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontSize: '13px', fontWeight: 700, color: '#8e8e93', marginBottom: '10px' }}>
          SELECT SLIDE TO ATTACH MASTER FILE
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(mediaItems.length, 4)}, 1fr)`, gap: '8px' }}>
          {mediaItems.map((slide, idx) => (
            <button
              key={slide.id}
              onClick={() => setSelectedSlide(idx)}
              style={{
                background: selectedSlide === idx ? 'rgba(0, 122, 255, 0.2)' : '#1c1c1e',
                border: `2px solid ${selectedSlide === idx ? '#007aff' : 'rgba(255,255,255,0.08)'}`,
                borderRadius: '14px', padding: '12px 6px', color: '#fff',
                textAlign: 'center', cursor: 'pointer', transition: 'all 0.15s'
              }}
            >
              <div style={{ fontSize: '13px', fontWeight: 700 }}>Slide {idx + 1}</div>
              <div style={{ fontSize: '10px', color: slide.has_raw_master ? '#ffd700' : '#8e8e93', marginTop: '2px', fontWeight: 600 }}>
                {slide.has_raw_master ? 'RAW attached' : 'Instagram'}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div style={{
        backgroundColor: '#1c1c1e', borderRadius: '24px', padding: '24px',
        border: '1px solid rgba(255,255,255,0.1)', textAlign: 'center'
      }}>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          style={{ display: 'none' }}
          onChange={handleFileSelected}
        />

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          style={{
            width: '100%',
            backgroundColor: '#007aff', color: '#fff',
            border: 'none', padding: '16px', borderRadius: '16px',
            fontSize: '16px', fontWeight: 700, cursor: uploading ? 'default' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            boxShadow: '0 8px 24px rgba(0, 122, 255, 0.3)',
          }}
        >
          {uploading ? (
            <>
              <RefreshCw size={20} className="spin-anim" />
              <span>Streaming to PC...</span>
            </>
          ) : (
            <>
              <Upload size={20} />
              <span>Choose from Photos / Files</span>
            </>
          )}
        </button>

        <p style={{ fontSize: '12px', color: '#8e8e93', marginTop: '12px', margin: '12px 0 0 0' }}>
          Select 48MP ProRAW / HEIC, Motion Photos, or 4K videos directly from your iPhone / Android photo library.
        </p>

        {uploadSuccess && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              marginTop: '16px',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              color: '#34c759', fontSize: '14px', fontWeight: 700
            }}
          >
            <CheckCircle2 size={18} />
            <span>Master file transferred successfully!</span>
          </motion.div>
        )}
      </div>
    </div>
  )
}
