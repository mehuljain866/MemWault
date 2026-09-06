import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ChevronLeft, ChevronRight, Heart, MessageCircle, Music, MapPin, 
  Smartphone, Upload, Sparkles, Layers, ExternalLink, 
  Save, Edit3, Check, Disc, RefreshCw, Trash2, Bookmark,
  Calendar, FileType, Code, Info, Images, Film, FileText, Camera,
  Volume2, VolumeX, Headphones
} from 'lucide-react'
import MDEditor from '@uiw/react-md-editor'
import CarouselPlayer from '../components/CarouselPlayer'
import QRUploadModal from '../components/QRUploadModal'
import SyntaxJsonViewer from '../components/SyntaxJsonViewer'
import { getPost, updatePost, replacePostMediaRaw, updatePostMedia, getPosts } from '../services/api'
import { getSettings } from '../services/settings'
import { playWin98Maximize, playWin98Minimize, playWin98Click } from '../services/win98Audio'

export default function PostDetail() {
  const { postId } = useParams()
  const navigate = useNavigate()
  const settings = getSettings()
  const isWin98 = settings.themeId === 'win98'

  const [post, setPost] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeSlideIndex, setActiveSlideIndex] = useState(0)
  const [isQRModalOpen, setIsQRModalOpen] = useState(false)
  const [journalNote, setJournalNote] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const [noteSaved, setNoteSaved] = useState(false)
  const [activeTab, setActiveTab] = useState('metadata') // 'metadata' | 'master' | 'journal' | 'json'
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [albumArtError, setAlbumArtError] = useState(false)
  const win98MediaContainerRef = useRef(null)
  const modernMediaContainerRef = useRef(null)

  // Adjacent post navigation
  const [adjacent, setAdjacent] = useState({ prev_id: null, next_id: null })

  const fileInputRef = useRef(null)

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement))
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  const toggleMediaFullscreen = () => {
    if (isWin98) {
      if (document.fullscreenElement) {
        playWin98Minimize()
      } else {
        playWin98Maximize()
      }
    }
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {})
    } else {
      const container = (isWin98 ? win98MediaContainerRef.current : modernMediaContainerRef.current) || document.querySelector('.carousel-player-root')
      const target = container?.querySelector?.('video, img, .carousel-player-root') || container
      if (target && target.requestFullscreen) {
        target.requestFullscreen().catch(() => {
          if (container && container.requestFullscreen) {
            container.requestFullscreen().catch(() => {})
          }
        })
      }
    }
  }

  const loadPostDetail = async () => {
    setLoading(true)
    setAlbumArtError(false)
    try {
      const data = await getPost(postId)
      setPost(data)
      setJournalNote(data.journal_note || '')

      // Load all posts in background to find prev/next
      getPosts().then(res => {
        const list = res.posts || []
        const currentIndex = list.findIndex(p => String(p.id) === String(postId))
        if (currentIndex !== -1) {
          setAdjacent({
            prev_id: currentIndex > 0 ? list[currentIndex - 1].id : null,
            next_id: currentIndex < list.length - 1 ? list[currentIndex + 1].id : null,
          })
        }
      }).catch(() => {})

    } catch (err) {
      console.error('Failed to load post', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPostDetail()
  }, [postId])

  // Keyboard navigation for adjacent posts
  useEffect(() => {
    function handleKeyDown(e) {
      if (activeTab === 'journal') return
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName) || e.target.isContentEditable) return

      if (e.key === 'ArrowLeft' && adjacent.prev_id) {
        navigate(`/posts/${adjacent.prev_id}`, { replace: true })
      } else if (e.key === 'ArrowRight' && adjacent.next_id) {
        navigate(`/posts/${adjacent.next_id}`, { replace: true })
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [adjacent, navigate, activeTab])

  const handleVersionToggle = async (mediaId, newVersion) => {
    try {
      await updatePostMedia(postId, mediaId, { default_version: newVersion })
      await loadPostDetail()
    } catch (err) {
      console.error('Failed to update version preference', err)
    }
  }

  const handleDesktopFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !post) return
    const currentMedia = post.media_items[activeSlideIndex]
    if (!currentMedia) return

    setLoading(true)
    try {
      await replacePostMediaRaw(postId, currentMedia.id, file)
      await loadPostDetail()
    } catch (err) {
      console.error('Failed to upload RAW master', err)
    } finally {
      setLoading(false)
    }
  }

  const saveJournal = async () => {
    setSavingNote(true)
    try {
      await updatePost(postId, { journal_note: journalNote })
      setNoteSaved(true)
      setTimeout(() => setNoteSaved(false), 2000)
    } catch (err) {
      console.error('Failed to save journal', err)
    } finally {
      setSavingNote(false)
    }
  }

  if (loading && !post) {
    return (
      <div style={{ height: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', color: 'var(--ios-text-secondary)' }}>
        <RefreshCw size={32} className="spin-anim" color="var(--ios-accent)" />
        <div style={{ fontSize: '15px', fontWeight: 600 }}>Loading Feed Post...</div>
      </div>
    )
  }

  if (!post) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--ios-text-primary)' }}>
        <h3>Post not found</h3>
        <button className="ios-btn" onClick={() => navigate('/posts')} style={{ marginTop: '16px' }}>
          Back to Feed
        </button>
      </div>
    )
  }

  const currentMedia = post.media_items?.[activeSlideIndex] || post.media_items?.[0]
  const isVideo = currentMedia?.media_type === 2 || post.media_type === 2
  const isCarousel = (post.media_items && post.media_items.length > 1) || post.media_type === 8

  const tabs = [
    { id: 'metadata', label: 'Overview', icon: Info },
    { id: 'audio', label: 'Audio', icon: Volume2 },
    { id: 'master', label: 'Dual Master / RAW', icon: Sparkles },
    { id: 'journal', label: 'Journal Note', icon: FileText },
    { id: 'json', label: 'Raw JSON', icon: Code },
  ]

  const InfoRow = ({ icon: Icon, label, value, children }) => (
    <div 
      style={{ 
        display: 'flex', 
        alignItems: 'flex-start', 
        padding: isWin98 ? '8px 0' : '12px 0', 
        borderBottom: '1px solid var(--ios-border)',
        gap: '12px'
      }}
    >
      <div style={isWin98 ? {
        color: '#000080',
        background: '#c0c0c0',
        border: '1px solid #000000',
        boxShadow: 'inset 1px 1px #ffffff, inset -1px -1px #808080',
        padding: '5px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        marginTop: '2px'
      } : {
        color: 'var(--ios-accent)',
        background: 'rgba(10, 132, 255, 0.1)',
        padding: '7px',
        borderRadius: '10px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        marginTop: '2px'
      }}>
        <Icon size={16} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '11px', textTransform: 'uppercase', color: isWin98 ? '#444444' : 'var(--ios-text-secondary)', fontWeight: 700, letterSpacing: '0.5px', marginBottom: '2px' }}>{label}</div>
        <div style={{ fontSize: isWin98 ? '12px' : '14px', color: 'var(--ios-text-primary)', fontWeight: 600, wordBreak: 'break-word' }}>{value}</div>
        {children && <div style={{ marginTop: '6px' }}>{children}</div>}
      </div>
    </div>
  )

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
      style={{
        maxWidth: '1200px',
        margin: '0 auto',
        minHeight: '100%',
        color: 'var(--ios-text-primary)',
        padding: '12px 16px 60px 16px',
        boxSizing: 'border-box',
      }}
    >
      {/* ── Top Bar with Navigation ────────────────────────────── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '16px',
        gap: '12px',
        flexWrap: 'wrap'
      }}>
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => navigate('/posts')}
          className="segment-btn"
          style={{ 
            display: 'inline-flex', alignItems: 'center', gap: '6px', 
            fontSize: '14px', fontWeight: 600, cursor: 'pointer', 
            padding: '6px 14px', borderRadius: '8px',
            color: 'var(--ios-accent)'
          }}
        >
          <ChevronLeft size={18} /> Back to Feed
        </motion.button>

        {/* Adjacent Post Navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => adjacent.prev_id && navigate(`/posts/${adjacent.prev_id}`, { replace: true })}
            disabled={!adjacent.prev_id}
            className="segment-btn"
            title="Previous Post (ArrowLeft)"
            style={{
              display: 'flex', alignItems: 'center', gap: '4px',
              padding: '6px 12px', borderRadius: '8px',
              opacity: adjacent.prev_id ? 1 : 0.4,
              cursor: adjacent.prev_id ? 'pointer' : 'default',
              fontSize: '13px', fontWeight: 600,
            }}
          >
            <ChevronLeft size={16} /> Prev Post
          </button>
          <button
            onClick={() => adjacent.next_id && navigate(`/posts/${adjacent.next_id}`, { replace: true })}
            disabled={!adjacent.next_id}
            className="segment-btn"
            title="Next Post (ArrowRight)"
            style={{
              display: 'flex', alignItems: 'center', gap: '4px',
              padding: '6px 12px', borderRadius: '8px',
              opacity: adjacent.next_id ? 1 : 0.4,
              cursor: adjacent.next_id ? 'pointer' : 'default',
              fontSize: '13px', fontWeight: 600,
            }}
          >
            Next Post <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* ── Main Two-Column Layout ─────────────────────────────── */}
      <div className="post-detail-layout">
        
        {/* ── Left Column: Media Player Frame ──────────────────── */}
        <div className="post-detail-player-col" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {isWin98 ? (
            /* Windows 98 Window Frame */
            <div style={{
              backgroundColor: '#c0c0c0',
              border: '1px solid #000000',
              boxShadow: 'inset 1px 1px #ffffff, inset -1px -1px #808080, 3px 3px 12px rgba(0,0,0,0.4)',
              display: 'flex',
              flexDirection: 'column',
              boxSizing: 'border-box',
              fontFamily: '"MS Sans Serif", Tahoma, Arial, sans-serif',
            }}>
              {/* Titlebar */}
              <div style={{
                background: 'linear-gradient(90deg, #000080 0%, #1084d0 100%)',
                color: '#ffffff',
                fontWeight: 'bold',
                padding: '2px 4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '11px',
                userSelect: 'none',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', overflow: 'hidden' }}>
                  {isVideo ? <Film size={12} color="#ffffff" /> : <Images size={12} color="#ffffff" />}
                  <span style={{ whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                    {isVideo ? `PostPlayer.exe - [POST_${post.id}.MP4]` : `PostViewer.exe - [POST_${post.id}.JPG]`}
                  </span>
                </div>
                <div className="win98-title-controls" style={{ display: 'flex', gap: '2px' }}>
                  <button 
                    className="win98-title-btn" 
                    onClick={() => { if (isWin98) playWin98Minimize(); navigate('/posts'); }}
                    title="Minimize / Back"
                    style={{ fontSize: '10px', color: '#000' }}
                  >
                    _
                  </button>
                  <button 
                    className="win98-title-btn" 
                    onClick={toggleMediaFullscreen}
                    title={isFullscreen ? "Restore" : "Maximize / Full Screen Media Player"}
                    style={{ fontSize: '10px', color: '#000' }}
                  >
                    {isFullscreen ? '❐' : '□'}
                  </button>
                  <button 
                    className="win98-title-btn is-close" 
                    onClick={() => { if (isWin98) playWin98Click(); navigate('/posts'); }}
                    title="Close"
                    style={{ fontSize: '10px', color: '#000' }}
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Menu Bar */}
              <div style={{
                display: 'flex',
                gap: '12px',
                padding: '2px 6px',
                backgroundColor: '#c0c0c0',
                borderBottom: '1px solid #808080',
                boxShadow: '0 1px 0 #ffffff',
                fontSize: '11px',
                color: '#000000',
                userSelect: 'none',
              }}>
                <span><u>F</u>ile</span>
                <span><u>E</u>dit</span>
                <span><u>V</u>iew</span>
                <span><u>S</u>lides</span>
                <span><u>H</u>elp</span>
              </div>

              {/* Sunken Viewport */}
              <div 
                ref={win98MediaContainerRef}
                style={{
                  backgroundColor: '#000000',
                  margin: '2px',
                  border: '1px solid #000000',
                  boxShadow: 'inset 1px 1px #808080, inset -1px -1px #dfdfdf, inset 2px 2px #000, inset -2px -2px #ffffff',
                  position: 'relative',
                  overflow: 'hidden',
                  height: '560px',
                  maxHeight: 'calc(100vh - 220px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <CarouselPlayer
                  post={post}
                  activeIndex={activeSlideIndex}
                  onIndexChange={(s) => setActiveSlideIndex(s)}
                  onVersionToggle={handleVersionToggle}
                />
              </div>

              {/* Status Bar */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '2px 4px',
                backgroundColor: '#c0c0c0',
                fontSize: '11px',
                color: '#000000',
                gap: '4px',
              }}>
                <div style={{
                  flex: 1,
                  boxShadow: 'inset 1px 1px #808080, inset -1px -1px #ffffff',
                  padding: '1px 6px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  fontSize: '10px',
                }}>
                  {isCarousel ? `Slide ${activeSlideIndex + 1} of ${post.media_items?.length || 1}` : (isVideo ? '▶ Video Post' : '🖼️ Single Photo')}
                </div>
                <div style={{
                  boxShadow: 'inset 1px 1px #808080, inset -1px -1px #ffffff',
                  padding: '1px 6px',
                  fontWeight: 'bold',
                  fontFamily: 'monospace',
                  fontSize: '10px',
                }}>
                  {currentMedia?.raw_width && currentMedia?.raw_height ? `${currentMedia.raw_width}x${currentMedia.raw_height}` : '1080x1350'}
                </div>
              </div>
            </div>
          ) : (
            /* Modern Application Window Frame */
            <div 
              ref={modernMediaContainerRef}
              style={{
                borderRadius: '24px',
                overflow: 'hidden',
                boxShadow: '0 20px 50px rgba(0,0,0,0.5), 0 0 0 1px var(--ios-border)',
                border: '1px solid var(--ios-border)',
                backgroundColor: '#000',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
              }}>
              {/* Traffic Light Header */}
              <div style={{
                padding: '10px 16px',
                backgroundColor: 'rgba(255,255,255,0.04)',
                backdropFilter: 'blur(10px)',
                borderBottom: '1px solid var(--ios-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--ios-text-secondary)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ display: 'flex', gap: '5px' }}>
                    <span 
                      style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ff5f56', cursor: 'pointer' }}
                      onClick={() => navigate('/posts')}
                      title="Back to Posts"
                    ></span>
                    <span 
                      style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ffbd2e', cursor: 'pointer' }}
                      onClick={() => navigate('/posts')}
                      title="Minimize"
                    ></span>
                    <span 
                      style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#27c93f', cursor: 'pointer' }}
                      onClick={toggleMediaFullscreen}
                      title="Full Screen Media Player"
                    ></span>
                  </div>
                  <span style={{ marginLeft: '8px', fontSize: '12px', color: 'var(--ios-text-primary)' }}>
                    {isCarousel ? `Carousel (${activeSlideIndex + 1}/${post.media_items?.length || 1})` : (isVideo ? 'Video Post' : 'Photo Post')}
                  </span>
                </div>
                <div style={{ fontSize: '11px', opacity: 0.8 }}>
                  {currentMedia?.has_raw_master ? '✨ RAW MASTER' : 'INSTAGRAM 1080P'}
                </div>
              </div>

              {/* Viewport */}
              <div style={{
                height: '560px',
                maxHeight: 'calc(100vh - 220px)',
                backgroundColor: '#111',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
              }}>
                <CarouselPlayer
                  post={post}
                  activeIndex={activeSlideIndex}
                  onIndexChange={(s) => setActiveSlideIndex(s)}
                  onVersionToggle={handleVersionToggle}
                />
              </div>
            </div>
          )}

          {/* ── Slide Filmstrip (for carousels) ─────────────────── */}
          {post.media_items && post.media_items.length > 1 && (
            <div style={{
              display: 'flex',
              gap: '8px',
              overflowX: 'auto',
              padding: '8px 4px',
              borderRadius: isWin98 ? '0' : '16px',
              backgroundColor: isWin98 ? '#c0c0c0' : 'var(--ios-bg-card)',
              border: isWin98 ? '1px solid #808080' : '1px solid var(--ios-border)',
              boxShadow: isWin98 ? 'inset 1px 1px #ffffff, inset -1px -1px #808080' : 'none',
            }}>
              {post.media_items.map((slide, idx) => {
                const isActive = activeSlideIndex === idx
                const thumbUrl = slide.has_raw_master && slide.raw_media_url
                  ? slide.raw_media_url
                  : (slide.instagram_media_url || `/api/v1/proxy/image?url=${encodeURIComponent(slide.instagram_cdn_url || '')}`)

                return (
                  <motion.div
                    key={slide.id || idx}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setActiveSlideIndex(idx)}
                    style={{
                      position: 'relative',
                      width: '64px',
                      height: '64px',
                      borderRadius: isWin98 ? '0' : '10px',
                      overflow: 'hidden',
                      flexShrink: 0,
                      cursor: 'pointer',
                      border: isActive ? '2px solid var(--ios-accent)' : (isWin98 ? '1px solid #000' : '1px solid var(--ios-border)'),
                      boxShadow: isActive ? '0 0 10px rgba(10,132,255,0.4)' : 'none',
                      opacity: isActive ? 1 : 0.65,
                    }}
                  >
                    <img
                      src={thumbUrl}
                      alt={`Slide ${idx + 1}`}
                      referrerPolicy="no-referrer"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    <div style={{
                      position: 'absolute', bottom: '2px', right: '2px',
                      backgroundColor: 'rgba(0,0,0,0.7)', color: '#fff',
                      fontSize: '9px', fontWeight: 800, padding: '1px 3px', borderRadius: '4px',
                    }}>
                      {idx + 1}
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </div>

        {/* ── Right Column: Tabbed Inspector ────────────────────── */}
        <div className="post-detail-meta-col" style={{
          backgroundColor: isWin98 ? '#c0c0c0' : 'var(--ios-bg-card)',
          borderRadius: isWin98 ? '0' : '24px',
          padding: isWin98 ? '12px' : '24px',
          border: isWin98 ? '1px solid #000000' : '1px solid var(--ios-border)',
          boxShadow: isWin98 ? 'inset 1px 1px #ffffff, inset -1px -1px #808080, 2px 2px 10px rgba(0,0,0,0.3)' : 'var(--ios-shadow-md)',
          fontFamily: isWin98 ? '"MS Sans Serif", Tahoma, Arial, sans-serif' : 'inherit',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}>

          {/* Top Post Header & Shortcode Link */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: isWin98 ? '2px groove #ffffff' : '1px solid var(--ios-border)',
            paddingBottom: '12px'
          }}>
            <div>
              <div style={{ fontSize: isWin98 ? '11px' : '12px', color: 'var(--ios-text-secondary)' }}>
                {new Date(post.taken_at).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
              <div style={{ fontSize: isWin98 ? '14px' : '18px', fontWeight: 800, marginTop: '2px' }}>
                {isCarousel ? 'Multi-Slide Carousel' : (isVideo ? 'Video Post' : 'Feed Post')}
              </div>
            </div>

            {post.ig_shortcode && (
              <a
                href={`https://www.instagram.com/p/${post.ig_shortcode}/`}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'flex', alignItems: 'center', gap: '4px',
                  color: 'var(--ios-accent)', fontSize: '13px', fontWeight: 600,
                  textDecoration: 'none'
                }}
              >
                <span>View on IG</span>
                <ExternalLink size={14} />
              </a>
            )}
          </div>

          {/* Tab Strip */}
          <div className="segmented-container segment-group" style={{
            display: 'flex',
            backgroundColor: isWin98 ? '#c0c0c0' : 'var(--ios-border)',
            borderRadius: isWin98 ? '0' : '16px',
            padding: isWin98 ? '0' : '3px',
            borderBottom: isWin98 ? '1px solid #808080' : 'none',
            gap: '2px',
            overflowX: 'auto',
          }}>
            {tabs.map(tab => {
              const isActive = activeTab === tab.id
              const TabIcon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`segment-btn ${isActive ? 'active' : ''}`}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: isWin98 ? '6px 10px' : '8px 12px',
                    border: isWin98 ? '1px solid #000' : 'none',
                    borderBottom: isWin98 && isActive ? 'none' : undefined,
                    backgroundColor: isWin98 ? (isActive ? '#c0c0c0' : '#a0a0a0') : 'transparent',
                    color: isActive ? 'var(--ios-text-primary)' : 'var(--ios-text-secondary)',
                    borderRadius: isWin98 ? '3px 3px 0 0' : '12px',
                    fontWeight: isActive ? 700 : 500,
                    fontSize: '12px',
                    cursor: 'pointer',
                    position: 'relative',
                    zIndex: 1,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {isActive && !isWin98 && (
                    <motion.span
                      layoutId="post-tab-pill"
                      style={{
                        position: 'absolute',
                        inset: 0,
                        borderRadius: '12px',
                        background: 'var(--ios-bg-card)',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
                        zIndex: -1,
                      }}
                      transition={{ type: 'spring', stiffness: 380, damping: 34 }}
                    />
                  )}
                  <TabIcon size={14} />
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </div>

          <AnimatePresence mode="wait">
            {/* ── Tab 1: Overview & Captions ──────────────────────── */}
            {activeTab === 'metadata' && (
              <motion.div
                key="metadata"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
              style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
            >
              {/* Engagement metrics */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px',
              }}>
                <div style={{
                  padding: '12px',
                  borderRadius: isWin98 ? '0' : '14px',
                  backgroundColor: isWin98 ? '#dfdfdf' : 'var(--ios-border)',
                  border: isWin98 ? '1px solid #808080' : 'none',
                  boxShadow: isWin98 ? 'inset 1px 1px #ffffff, inset -1px -1px #808080' : 'none',
                  display: 'flex', alignItems: 'center', gap: '8px',
                }}>
                  <Heart size={18} color="#ff2b55" fill="#ff2b55" />
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--ios-text-secondary)', fontWeight: 700 }}>LIKES</div>
                    <div style={{ fontSize: '16px', fontWeight: 800 }}>{post.like_count || 0}</div>
                  </div>
                </div>

                <div style={{
                  padding: '12px',
                  borderRadius: isWin98 ? '0' : '14px',
                  backgroundColor: isWin98 ? '#dfdfdf' : 'var(--ios-border)',
                  border: isWin98 ? '1px solid #808080' : 'none',
                  boxShadow: isWin98 ? 'inset 1px 1px #ffffff, inset -1px -1px #808080' : 'none',
                  display: 'flex', alignItems: 'center', gap: '8px',
                }}>
                  <MessageCircle size={18} color="var(--ios-accent)" />
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--ios-text-secondary)', fontWeight: 700 }}>COMMENTS</div>
                    <div style={{ fontSize: '16px', fontWeight: 800 }}>{post.comment_count || 0}</div>
                  </div>
                </div>
              </div>

              {/* Audio row */}
              {(post.audio_title || post.has_audio || isVideo) ? (
                <div 
                  onClick={() => setActiveTab('audio')}
                  style={{ cursor: 'pointer' }}
                  title="Click to open Audio Tab"
                >
                  <InfoRow 
                    icon={post.audio_title ? Music : Volume2} 
                    label={post.audio_title ? "Soundtrack / Music" : "Audio Track"} 
                    value={
                      post.audio_title 
                        ? `${post.audio_title}${post.audio_artist ? ` · ${post.audio_artist}` : ''}`
                        : (post.has_audio || isVideo ? 'Original Video Audio' : 'No Audio')
                    }
                  >
                    <span style={{ fontSize: '11px', color: 'var(--ios-accent)', fontWeight: 600 }}>
                      Inspect in Audio Tab →
                    </span>
                  </InfoRow>
                </div>
              ) : (
                <InfoRow icon={VolumeX} label="Audio Track" value="None (Silent Post)" />
              )}

              {/* Location */}
              {post.location_name && (
                <InfoRow icon={MapPin} label="Location Venue" value={post.location_name}>
                  {post.location_lat && post.location_lng && (
                    <span style={{ fontSize: '11px', color: 'var(--ios-text-secondary)' }}>
                      GPS: {post.location_lat.toFixed(4)}, {post.location_lng.toFixed(4)}
                    </span>
                  )}
                </InfoRow>
              )}

              {/* Timestamp */}
              <InfoRow icon={Calendar} label="Archival Timestamp" value={new Date(post.taken_at).toLocaleString()}>
                <span style={{ fontSize: '11px', color: 'var(--ios-text-secondary)' }}>
                  UTC: {post.taken_at}
                </span>
              </InfoRow>

              {/* Caption */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                marginTop: '4px'
              }}>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--ios-text-secondary)', fontWeight: 700, letterSpacing: '0.5px' }}>
                  Caption & Narrative
                </div>
                <div style={{
                  padding: '14px',
                  borderRadius: isWin98 ? '0' : '14px',
                  backgroundColor: isWin98 ? '#ffffff' : 'var(--ios-border)',
                  color: isWin98 ? '#000000' : 'var(--ios-text-primary)',
                  border: isWin98 ? '1px solid #000' : '1px solid var(--ios-border)',
                  boxShadow: isWin98 ? 'inset 1px 1px #808080, inset -1px -1px #ffffff' : 'none',
                  fontSize: '13px',
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap',
                  maxHeight: '220px',
                  overflowY: 'auto',
                }}>
                  {post.caption_text || 'No caption text on this post.'}
                </div>
              </div>
            </motion.div>
          )}

          {/* ── Tab: Audio Inspector & Player ─────────────────── */}
          {activeTab === 'audio' && (
            <motion.div
              key="audio"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
            >
              {/* Header Status Card */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 14px',
                borderRadius: isWin98 ? '0' : '14px',
                backgroundColor: isWin98 ? '#dfdfdf' : 'rgba(10, 132, 255, 0.08)',
                border: isWin98 ? '1px solid #808080' : '1px solid rgba(10, 132, 255, 0.2)',
                boxShadow: isWin98 ? 'inset 1px 1px #ffffff, inset -1px -1px #808080' : 'none',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Volume2 size={18} color="var(--ios-accent)" />
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 800 }}>Audio Inspector</div>
                    <div style={{ fontSize: '11px', color: 'var(--ios-text-secondary)' }}>
                      {post.audio_title ? 'Attached Soundtrack' : (isVideo || post.has_audio ? 'Original Video Audio' : 'No Audio Track')}
                    </div>
                  </div>
                </div>

                <div style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: isWin98 ? '0' : '8px',
                  backgroundColor: isWin98 ? '#c0c0c0' : (post.audio_title || isVideo || post.has_audio ? 'var(--ios-accent)' : 'var(--ios-border)'),
                  color: isWin98 ? '#000000' : (post.audio_title || isVideo || post.has_audio ? '#ffffff' : 'var(--ios-text-secondary)'),
                  border: isWin98 ? '1px solid #000000' : 'none',
                }}>
                  {post.audio_title ? 'LICENSED AUDIO' : (isVideo || post.has_audio ? 'CAMERA SOUND' : 'SILENT')}
                </div>
              </div>

              {/* Primary Audio Player Card */}
              {(post.audio_title || post.music_info) ? (
                /* Case A: Instagram Soundtrack */
                <div style={{
                  padding: '16px',
                  borderRadius: isWin98 ? '0' : '16px',
                  backgroundColor: isWin98 ? '#ffffff' : 'var(--ios-border)',
                  color: isWin98 ? '#000000' : 'var(--ios-text-primary)',
                  border: isWin98 ? '1px solid #808080' : '1px solid var(--ios-border)',
                  boxShadow: isWin98 ? 'inset 1px 1px #808080, inset -1px -1px #ffffff' : 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}>
                  <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                    {/* Album Art or Disc */}
                    {post.music_info?.cover_artwork_uri && !albumArtError ? (
                      <img
                        src={post.music_info.cover_artwork_uri}
                        alt="Album Cover"
                        referrerPolicy="no-referrer"
                        onError={() => setAlbumArtError(true)}
                        style={{
                          width: '56px',
                          height: '56px',
                          borderRadius: isWin98 ? '0' : '12px',
                          objectFit: 'cover',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
                          flexShrink: 0
                        }}
                      />
                    ) : (
                      <div style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: isWin98 ? '0' : '12px',
                        backgroundColor: 'rgba(10, 132, 255, 0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--ios-accent)',
                        flexShrink: 0
                      }}>
                        <Disc size={28} />
                      </div>
                    )}

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '15px', fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {post.music_info?.title || post.audio_title}
                      </div>
                      <div style={{ fontSize: '13px', color: 'var(--ios-text-secondary)', marginTop: '2px', fontWeight: 600 }}>
                        {post.music_info?.artist || post.audio_artist || 'Unknown Artist'}
                      </div>
                      {post.music_info?.duration_ms && (
                        <div style={{ fontSize: '11px', color: 'var(--ios-text-secondary)', marginTop: '4px' }}>
                          Track Duration: {Math.round(post.music_info.duration_ms / 1000)}s
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Audio Element */}
                  {post.music_info?.audio_url ? (
                    <div style={{ marginTop: '4px' }}>
                      <audio
                        controls
                        src={post.music_info.audio_url}
                        style={{ width: '100%', outline: 'none', height: '36px' }}
                      />
                    </div>
                  ) : (
                    <div style={{
                      padding: '10px 12px',
                      borderRadius: isWin98 ? '0' : '10px',
                      backgroundColor: isWin98 ? '#f0f0f0' : 'rgba(255,255,255,0.04)',
                      border: isWin98 ? '1px solid #808080' : '1px solid var(--ios-border)',
                      fontSize: '12px',
                      color: 'var(--ios-text-secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <Info size={14} color="var(--ios-accent)" style={{ flexShrink: 0 }} />
                      <span>Audio track identified. CDN audio streaming link was not retained by Instagram.</span>
                    </div>
                  )}

                  {/* Soundtrack Metadata Box */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '8px',
                    paddingTop: '8px',
                    borderTop: isWin98 ? '1px solid #808080' : '1px solid var(--ios-border)',
                    fontSize: '11px',
                    color: isWin98 ? '#333333' : 'var(--ios-text-secondary)'
                  }}>
                    <div><strong>Type:</strong> Licensed Soundtrack</div>
                    <div><strong>Format:</strong> MPEG-4 Audio (AAC)</div>
                  </div>
                </div>
              ) : (isVideo || post.has_audio || currentMedia?.media_type === 2) ? (
                /* Case B: Video with Original Embedded Sound */
                <div style={{
                  padding: '16px',
                  borderRadius: isWin98 ? '0' : '16px',
                  backgroundColor: isWin98 ? '#ffffff' : 'var(--ios-border)',
                  color: isWin98 ? '#000000' : 'var(--ios-text-primary)',
                  border: isWin98 ? '1px solid #808080' : '1px solid var(--ios-border)',
                  boxShadow: isWin98 ? 'inset 1px 1px #808080, inset -1px -1px #ffffff' : 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}>
                  <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                    <div style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: isWin98 ? '0' : '12px',
                      backgroundColor: 'rgba(52, 199, 89, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#34c759',
                      flexShrink: 0
                    }}>
                      <Headphones size={28} />
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '15px', fontWeight: 800 }}>
                        Original Video Audio
                      </div>
                      <div style={{ fontSize: '13px', color: 'var(--ios-text-secondary)', marginTop: '2px', fontWeight: 600 }}>
                        Embedded audio recorded from camera/video source
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--ios-text-secondary)', marginTop: '4px' }}>
                        Duration: {post.video_duration ? `${post.video_duration.toFixed(1)}s` : (currentMedia?.duration_ms ? `${(currentMedia.duration_ms / 1000).toFixed(1)}s` : 'Full clip')}
                      </div>
                    </div>
                  </div>

                  {/* Standalone Player for Video Sound */}
                  <div style={{ marginTop: '4px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--ios-text-secondary)', marginBottom: '6px', textTransform: 'uppercase' }}>
                      Standalone Audio Stream
                    </div>
                    <audio
                      controls
                      src={currentMedia?.media_url || currentMedia?.instagram_media_url}
                      style={{ width: '100%', outline: 'none', height: '36px' }}
                    />
                  </div>

                  {/* Technical Audio Specs */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '8px',
                    paddingTop: '8px',
                    borderTop: isWin98 ? '1px solid #808080' : '1px solid var(--ios-border)',
                    fontSize: '11px',
                    color: isWin98 ? '#333333' : 'var(--ios-text-secondary)'
                  }}>
                    <div><strong>Channel:</strong> AAC Stereo</div>
                    <div><strong>Sample Rate:</strong> 48.0 kHz</div>
                    <div><strong>Container:</strong> MP4 Audio Track</div>
                    <div><strong>Source:</strong> Vault Master Stream</div>
                  </div>
                </div>
              ) : (
                /* Case C: Silent Photo Post */
                <div style={{
                  padding: '36px 20px',
                  borderRadius: isWin98 ? '0' : '16px',
                  backgroundColor: isWin98 ? '#ffffff' : 'var(--ios-border)',
                  color: 'var(--ios-text-secondary)',
                  border: isWin98 ? '1px solid #808080' : '1px solid var(--ios-border)',
                  boxShadow: isWin98 ? 'inset 1px 1px #808080, inset -1px -1px #ffffff' : 'none',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <VolumeX size={36} style={{ opacity: 0.5 }} />
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--ios-text-primary)' }}>
                    No Audio Attached
                  </div>
                  <div style={{ fontSize: '12px', maxWidth: '320px', lineHeight: 1.5 }}>
                    This feed post is a still photograph without any embedded video audio or tagged Instagram soundtrack.
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* ── Tab 2: Dual Master & RAW ─────────────────────────── */}
          {activeTab === 'master' && (
            <motion.div
              key="master"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
            >
              {/* Master Media Actions */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px',
                borderRadius: isWin98 ? '0' : '14px',
                backgroundColor: isWin98 ? '#dfdfdf' : 'rgba(10, 132, 255, 0.08)',
                border: isWin98 ? '1px solid #808080' : '1px solid rgba(10, 132, 255, 0.2)',
                boxShadow: isWin98 ? 'inset 1px 1px #ffffff, inset -1px -1px #808080' : 'none',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={18} color="#ffd700" />
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 800 }}>RAW Master Replacement</div>
                    <div style={{ fontSize: '11px', color: 'var(--ios-text-secondary)' }}>Slide {activeSlideIndex + 1}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    onClick={() => setIsQRModalOpen(true)}
                    className="segment-btn"
                    style={{
                      display: 'flex', alignItems: 'center', gap: '4px',
                      background: 'var(--ios-accent)', color: '#fff',
                      border: 'none', padding: '6px 12px', borderRadius: isWin98 ? '0' : '8px',
                      fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                    }}
                  >
                    <Smartphone size={14} />
                    <span>Upload from Phone</span>
                  </button>

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="segment-btn"
                    style={{
                      display: 'flex', alignItems: 'center', gap: '4px',
                      background: isWin98 ? '#c0c0c0' : 'var(--ios-border)',
                      color: 'var(--ios-text-primary)',
                      border: isWin98 ? '1px solid #000' : 'none',
                      padding: '6px 12px', borderRadius: isWin98 ? '0' : '8px',
                      fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                    }}
                  >
                    <Upload size={14} />
                    <span>Pick File</span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*"
                    style={{ display: 'none' }}
                    onChange={handleDesktopFileUpload}
                  />
                </div>
              </div>

              {/* Dual-Version Comparison Cards */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: currentMedia?.has_raw_master ? '1fr 1fr' : '1fr',
                gap: '12px',
              }}>
                {/* Instagram Version */}
                <div style={{
                  padding: '14px',
                  borderRadius: isWin98 ? '0' : '14px',
                  backgroundColor: isWin98 ? '#ffffff' : 'var(--ios-border)',
                  color: isWin98 ? '#000000' : 'var(--ios-text-primary)',
                  border: isWin98 ? '1px solid #808080' : '1px solid var(--ios-border)',
                  boxShadow: isWin98 ? 'inset 1px 1px #808080, inset -1px -1px #ffffff' : 'none',
                  fontSize: '12px',
                  display: 'flex', flexDirection: 'column', gap: '8px',
                }}>
                  <div style={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Layers size={14} color="var(--ios-accent)" />
                    <span>Instagram Representation</span>
                  </div>
                  <div style={{ color: isWin98 ? '#333' : 'var(--ios-text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div><strong>Resolution:</strong> 1080 × {Math.round(1080 / (post.aspect_ratio || 1))}</div>
                    <div><strong>Encoding:</strong> JPEG / AVC (Web Compressed)</div>
                    <div><strong>Source:</strong> Instagram Ingested CDN</div>
                  </div>
                </div>

                {/* Master Version */}
                {currentMedia?.has_raw_master ? (
                  <div style={{
                    padding: '14px',
                    borderRadius: isWin98 ? '0' : '14px',
                    backgroundColor: isWin98 ? '#fffbe6' : 'rgba(255, 215, 0, 0.08)',
                    color: isWin98 ? '#000000' : 'var(--ios-text-primary)',
                    border: isWin98 ? '1px solid #d4af37' : '1px solid rgba(255, 215, 0, 0.3)',
                    boxShadow: isWin98 ? 'inset 1px 1px #ffffff, inset -1px -1px #808080' : 'none',
                    fontSize: '12px',
                    display: 'flex', flexDirection: 'column', gap: '8px',
                  }}>
                    <div style={{ fontWeight: 800, color: '#d4af37', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Sparkles size={14} color="#d4af37" />
                      <span>Original Master File</span>
                    </div>
                    <div style={{ color: isWin98 ? '#333' : 'var(--ios-text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {currentMedia.raw_width && (
                        <div><strong>Resolution:</strong> {currentMedia.raw_width} × {currentMedia.raw_height} ({Math.round((currentMedia.raw_width * currentMedia.raw_height) / 1000000)} MP)</div>
                      )}
                      {currentMedia.raw_file_size && (
                        <div><strong>File Size:</strong> {(currentMedia.raw_file_size / (1024 * 1024)).toFixed(1)} MB</div>
                      )}
                      {(currentMedia.crop_data?.camera_make || currentMedia.crop_data?.camera_model) && (
                        <div><strong>Camera:</strong> {[currentMedia.crop_data.camera_make, currentMedia.crop_data.camera_model].filter(Boolean).join(' ')}</div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div style={{
                    padding: '14px',
                    borderRadius: isWin98 ? '0' : '14px',
                    backgroundColor: isWin98 ? '#dfdfdf' : 'var(--ios-border)',
                    textAlign: 'center',
                    color: 'var(--ios-text-secondary)',
                    fontSize: '12px',
                  }}>
                    No RAW master uploaded for this slide yet. Use the upload buttons above to attach your original camera file.
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ── Tab 3: Sidecar Markdown Journal ─────────────────── */}
          {activeTab === 'journal' && (
            <motion.div
              key="journal"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ios-text-secondary)' }}>
                  ON-DISK SIDECAR JOURNAL (.MD)
                </div>
                <button
                  onClick={saveJournal}
                  disabled={savingNote}
                  className="segment-btn"
                  style={{
                    display: 'flex', alignItems: 'center', gap: '4px',
                    background: noteSaved ? '#34c759' : 'var(--ios-accent)',
                    color: '#fff',
                    border: 'none', padding: '6px 14px', borderRadius: isWin98 ? '0' : '8px',
                    fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  {noteSaved ? <Check size={14} /> : <Save size={14} />}
                  <span>{noteSaved ? 'Saved' : (savingNote ? 'Saving...' : 'Save Note')}</span>
                </button>
              </div>

              <div data-color-mode={isWin98 ? 'light' : 'dark'} style={{ borderRadius: isWin98 ? '0' : '12px', overflow: 'hidden' }}>
                <MDEditor
                  value={journalNote}
                  onChange={(val) => setJournalNote(val || '')}
                  preview="edit"
                  height={260}
                />
              </div>
            </motion.div>
          )}

          {/* ── Tab 4: Raw JSON Inspector ───────────────────────── */}
          {activeTab === 'json' && (
            <motion.div
              key="json"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              style={{ maxHeight: '340px', overflowY: 'auto' }}
            >
              <SyntaxJsonViewer data={post} title={`POST_${post.id}.JSON`} />
            </motion.div>
          )}
          </AnimatePresence>
        </div>
      </div>

      {/* QR Upload Modal */}
      <QRUploadModal
        isOpen={isQRModalOpen}
        onClose={() => setIsQRModalOpen(false)}
        postId={postId}
        onUploadSuccess={loadPostDetail}
      />
    </motion.div>
  )
}
