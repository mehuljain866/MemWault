import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { 
  ArrowLeft, Heart, MessageCircle, Music, MapPin, 
  Smartphone, Upload, Sparkles, Layers, ExternalLink, 
  Save, Edit3, Check, Disc, RefreshCw, Trash2, Bookmark
} from 'lucide-react'
import CarouselPlayer from '../components/CarouselPlayer'
import QRUploadModal from '../components/QRUploadModal'
import { getPost, updatePost, replacePostMediaRaw, updatePostMedia } from '../services/api'

export default function PostDetail() {
  const { postId } = useParams()
  const navigate = useNavigate()

  const [post, setPost] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeSlideIndex, setActiveSlideIndex] = useState(0)
  const [isQRModalOpen, setIsQRModalOpen] = useState(false)
  const [journalNote, setJournalNote] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const [noteSaved, setNoteSaved] = useState(false)

  const fileInputRef = useRef(null)

  const loadPostDetail = async () => {
    setLoading(true)
    try {
      const data = await getPost(postId)
      setPost(data)
      setJournalNote(data.journal_note || '')
    } catch (err) {
      console.error('Failed to load post', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPostDetail()
  }, [postId])

  const handleVersionToggle = async (mediaId, newVersion) => {
    try {
      await updatePostMedia(postId, mediaId, { default_version: newVersion })
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
      <div style={{ height: '100vh', backgroundColor: 'var(--ios-bg-app)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <RefreshCw size={32} className="spin-anim" color="var(--ios-accent)" />
      </div>
    )
  }

  if (!post) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--ios-text-primary)' }}>
        <h3>Post not found</h3>
        <Link to="/posts" style={{ color: 'var(--ios-accent)' }}>Back to Feed</Link>
      </div>
    )
  }

  const currentMedia = post.media_items[activeSlideIndex] || post.media_items[0]

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'var(--ios-bg-app)',
      color: 'var(--ios-text-primary)',
      padding: '20px 24px 80px 24px',
    }}>
      <div style={{ marginBottom: '16px' }}>
        <button
          onClick={() => navigate('/posts')}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            background: 'transparent', color: 'var(--ios-accent, #007aff)',
            border: 'none', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
          }}
        >
          <ArrowLeft size={18} />
          <span>Back to Feed</span>
        </button>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
        gap: '24px',
        alignItems: 'start',
      }}>
        <div style={{
          width: '100%', height: '600px',
          backgroundColor: '#111', borderRadius: '24px',
          overflow: 'hidden', border: '1px solid var(--ios-border, rgba(255,255,255,0.1))',
        }}>
          <CarouselPlayer
            post={post}
            activeIndex={activeSlideIndex}
            onIndexChange={(s) => setActiveSlideIndex(s)}
            onVersionToggle={handleVersionToggle}
          />
        </div>

        <div style={{
          backgroundColor: 'var(--ios-bg-card, #1c1c1e)',
          borderRadius: '24px',
          padding: '24px',
          border: '1px solid var(--ios-border, rgba(255,255,255,0.08))',
          display: 'flex', flexDirection: 'column', gap: '20px',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '16px'
          }}>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--ios-text-secondary, #8e8e93)' }}>
                {new Date(post.taken_at).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
              <div style={{ fontSize: '16px', fontWeight: 700, marginTop: '2px' }}>
                Instagram Post
              </div>
            </div>

            {post.ig_shortcode && (
              <a
                href={`https://www.instagram.com/p/${post.ig_shortcode}/`}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'flex', alignItems: 'center', gap: '4px',
                  color: 'var(--ios-accent, #007aff)', fontSize: '13px', fontWeight: 600,
                  textDecoration: 'none'
                }}
              >
                <span>Open on IG</span>
                <ExternalLink size={14} />
              </a>
            )}
          </div>

          {post.audio_title && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              background: 'var(--ios-bg-card)', border: '1px solid var(--ios-border)', padding: '8px 12px', borderRadius: '12px',
              fontSize: '13px', color: 'var(--ios-text-primary)',
            }}>
              <Music size={14} color="var(--ios-accent, #007aff)" />
              <span style={{ fontWeight: 600 }}>{post.audio_title}</span>
              {post.audio_artist && <span style={{ color: 'var(--ios-text-secondary, #8e8e93)' }}>• {post.audio_artist}</span>}
            </div>
          )}

          {post.location_name && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              fontSize: '13px', color: 'var(--ios-text-secondary, #8e8e93)'
            }}>
              <MapPin size={14} />
              <span>{post.location_name}</span>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '14px', fontWeight: 600 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#ff2b55' }}>
              <Heart size={16} fill="#ff2b55" />
              <span>{post.like_count || 0} likes</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--ios-text-secondary, #8e8e93)' }}>
              <MessageCircle size={16} />
              <span>{post.comment_count || 0} comments</span>
            </div>
          </div>

          {post.caption_text && (
            <div style={{
              background: 'var(--ios-bg-card)', border: '1px solid var(--ios-border)', padding: '16px', borderRadius: '16px',
              fontSize: '13px', lineHeight: 1.5, whiteSpace: 'pre-wrap', color: 'var(--ios-text-primary)',
            }}>
              {post.caption_text}
            </div>
          )}

          <div style={{
            background: 'var(--ios-bg-card)',
            border: '1px solid var(--ios-border)',
            borderRadius: '16px', padding: '16px',
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: '12px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sparkles size={16} color="var(--ios-accent)" />
                <span style={{ fontSize: '14px', fontWeight: 700 }}>Lossless Master Media</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={() => setIsQRModalOpen(true)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '4px',
                    background: 'var(--ios-accent, #007aff)', color: '#fff',
                    border: 'none', padding: '6px 12px', borderRadius: '10px',
                    fontSize: '12px', fontWeight: 600, cursor: 'pointer'
                  }}
                >
                  <Smartphone size={14} />
                  <span>Upload from Phone</span>
                </button>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '4px',
                    background: 'var(--ios-border)', color: 'var(--ios-text-primary)',
                    border: 'none', padding: '6px 12px', borderRadius: '10px',
                    fontSize: '12px', fontWeight: 600, cursor: 'pointer'
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

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {post.media_items?.map((slide, idx) => (
                <div
                  key={slide.id}
                  onClick={() => setActiveSlideIndex(idx)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '8px 12px', borderRadius: '12px',
                    background: activeSlideIndex === idx ? 'var(--ios-border)' : 'transparent',
                    border: `1px solid ${activeSlideIndex === idx ? 'var(--ios-accent)' : 'var(--ios-border)'}`,
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ios-text-secondary, #8e8e93)' }}>
                      Slide {idx + 1}
                    </span>
                    <span style={{ fontSize: '12px', color: 'var(--ios-text-primary)' }}>
                      {slide.has_raw_master ? (slide.raw_file_name || 'UNCOMPRESSED MASTER') : 'Instagram 1080p version'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {slide.is_live_photo && (
                      <div style={{
                        background: 'rgba(0, 122, 255, 0.2)', color: 'var(--ios-accent, #007aff)',
                        padding: '2px 6px', borderRadius: '6px', fontSize: '10px', fontWeight: 700,
                      }}>
                        LIVE
                      </div>
                    )}
                    {slide.has_raw_master ? (
                      <div style={{
                        background: 'rgba(255, 215, 0, 0.2)', color: '#ffd700',
                        padding: '2px 6px', borderRadius: '6px', fontSize: '10px', fontWeight: 800,
                      }}>
                        RAW
                      </div>
                    ) : (
                      <span style={{ fontSize: '11px', color: 'var(--ios-text-secondary, #8e8e93)' }}>Compressed</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Dual Metadata Inspector (Original vs Instagram) */}
          <div style={{
            background: 'var(--ios-bg-card)',
            borderRadius: '16px', padding: '16px',
            border: '1px solid var(--ios-border)',
          }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--ios-text-secondary, #8e8e93)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Dual-Version Metadata
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: currentMedia?.has_raw_master ? '1fr 1fr' : '1fr', gap: '16px' }}>
              {/* Instagram Side */}
              <div style={{
                background: 'var(--ios-border)', padding: '12px', borderRadius: '12px',
                border: '1px solid var(--ios-border)', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '8px'
              }}>
                <div style={{ fontWeight: 700, color: 'var(--ios-text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Layers size={14} color="var(--ios-accent, #007aff)" />
                  <span>Instagram Processed</span>
                </div>
                <div style={{ color: 'var(--ios-text-secondary, #8e8e93)' }}>
                  <div><strong>Uploaded:</strong> {new Date(post.taken_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</div>
                  <div><strong>Quality:</strong> 1080 × {Math.round(1080 / (post.aspect_ratio || 1))} (Web compressed)</div>
                  <div><strong>Stats:</strong> {post.like_count || 0} likes • {post.comment_count || 0} comments</div>
                </div>
              </div>

              {/* Original Master Side */}
              {currentMedia?.has_raw_master && (
                <div style={{
                  background: 'rgba(255, 215, 0, 0.08)', padding: '12px', borderRadius: '12px',
                  border: '1px solid rgba(255, 215, 0, 0.3)', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '8px'
                }}>
                  <div style={{ fontWeight: 700, color: '#d4af37', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Sparkles size={14} color="#d4af37" />
                    <span>Original Master File</span>
                  </div>
                  <div style={{ color: 'var(--ios-text-secondary, #8e8e93)' }}>
                    <div><strong>Shot / Taken:</strong> {currentMedia.crop_data?.taken_at ? String(currentMedia.crop_data.taken_at) : new Date(post.taken_at).toLocaleDateString()}</div>
                    {(currentMedia.crop_data?.camera_make || currentMedia.crop_data?.camera_model) && (
                      <div><strong>Camera:</strong> {[currentMedia.crop_data.camera_make, currentMedia.crop_data.camera_model].filter(Boolean).join(' ')}</div>
                    )}
                    {currentMedia.raw_width && (
                      <div><strong>Resolution:</strong> {currentMedia.raw_width} × {currentMedia.raw_height} ({Math.round((currentMedia.raw_width * currentMedia.raw_height) / 1000000)} MP)</div>
                    )}
                    {currentMedia.raw_file_size && (
                      <div><strong>File Size:</strong> {(currentMedia.raw_file_size / (1024 * 1024)).toFixed(1)} MB</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div style={{
            background: 'var(--ios-bg-card)',
            borderRadius: '16px', padding: '16px',
            border: '1px solid var(--ios-border)',
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: '10px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Edit3 size={16} color="var(--ios-accent, #007aff)" />
                <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--ios-text-primary)' }}>Meaning-Making Journal</span>
              </div>
              <button
                onClick={saveJournal}
                disabled={savingNote}
                style={{
                  display: 'flex', alignItems: 'center', gap: '4px',
                  background: noteSaved ? '#34c759' : 'var(--ios-accent, #007aff)', color: '#fff',
                  border: 'none', padding: '6px 12px', borderRadius: '10px',
                  fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
              >
                {noteSaved ? <Check size={14} /> : <Save size={14} />}
                <span>{noteSaved ? 'Saved' : (savingNote ? 'Saving...' : 'Save')}</span>
              </button>
            </div>
            <textarea
              value={journalNote}
              onChange={(e) => setJournalNote(e.target.value)}
              placeholder="Reflect on this memory... where were you, how did you feel, what made this moment special?"
              rows={4}
              style={{
                width: '100%', background: 'transparent',
                border: 'none', outline: 'none',
                color: 'var(--ios-text-primary)', fontSize: '13px', lineHeight: 1.5,
                resize: 'vertical',
              }}
            />
          </div>
        </div>
      </div>

      <QRUploadModal
        isOpen={isQRModalOpen}
        onClose={() => setIsQRModalOpen(false)}
        postId={postId}
        onUploadSuccess={loadPostDetail}
      />
    </div>
  )
}
