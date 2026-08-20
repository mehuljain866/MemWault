import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Grid, LayoutGrid, Layers, Film, Image as ImageIcon, 
  Sparkles, RefreshCw, Heart, MessageCircle, Disc, Filter, Check
} from 'lucide-react'
import { getPosts, triggerPostsSync } from '../services/api'

export default function Posts() {
  const navigate = useNavigate()
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [filterType, setFilterType] = useState('all') // 'all', 'carousel', 'photo', 'video', 'raw'
  const [gridAspect, setGridAspect] = useState('square') // 'square' (1:1), 'portrait' (4:5), 'original'

  const loadPosts = async () => {
    setLoading(true)
    try {
      let params = {}
      if (filterType === 'photo') params.mediaType = 1
      if (filterType === 'video') params.mediaType = 2
      if (filterType === 'carousel') params.mediaType = 8
      const data = await getPosts(params)
      let list = data.posts || []
      if (filterType === 'raw') {
        list = list.filter(p => p.media_items?.some(m => m.has_raw_master))
      }
      setPosts(list)
    } catch (err) {
      console.error('Failed to load posts', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPosts()
  }, [filterType])

  const handleSync = async () => {
    setSyncing(true)
    try {
      await triggerPostsSync(50)
      await loadPosts()
    } catch (err) {
      console.error('Sync failed', err)
    } finally {
      setSyncing(false)
    }
  }

  const getAspectRatioStyle = (post) => {
    if (gridAspect === 'square') return { aspectRatio: '1 / 1' }
    if (gridAspect === 'portrait') return { aspectRatio: '4 / 5' }
    if (gridAspect === 'original') return { aspectRatio: post.aspect_ratio ? `${post.aspect_ratio}` : '1 / 1' }
    return { aspectRatio: '1 / 1' }
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'var(--ios-bg-primary, #000000)',
      color: 'var(--ios-text-primary, #ffffff)',
      padding: '24px 32px 100px 32px',
    }}>
      {/* -- Top Header ------------------------------------------- */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: '16px', marginBottom: '24px',
      }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, margin: '0 0 4px 0', letterSpacing: '-0.5px' }}>
            Feed Posts & Carousels
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--ios-text-secondary, #8e8e93)', margin: 0 }}>
            {posts.length} {posts.length === 1 ? 'archived post' : 'archived posts'}  Uncompressed RAW & Live Photos
          </p>
        </div>

        {/* Right Action Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Aspect Ratio Switcher */}
          <div style={{
            display: 'flex', alignItems: 'center',
            backgroundColor: 'var(--ios-bg-card, #1c1c1e)',
            borderRadius: '12px', padding: '3px',
            border: '1px solid var(--ios-border, rgba(255,255,255,0.1))',
          }}>
            <button
              onClick={() => setGridAspect('square')}
              style={{
                background: gridAspect === 'square' ? 'var(--ios-accent, #007aff)' : 'transparent',
                color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '9px',
                fontSize: '12px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              1:1 Square
            </button>
            <button
              onClick={() => setGridAspect('portrait')}
              style={{
                background: gridAspect === 'portrait' ? 'var(--ios-accent, #007aff)' : 'transparent',
                color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '9px',
                fontSize: '12px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              4:5 Portrait
            </button>
            <button
              onClick={() => setGridAspect('original')}
              style={{
                background: gridAspect === 'original' ? 'var(--ios-accent, #007aff)' : 'transparent',
                color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '9px',
                fontSize: '12px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              Original
            </button>
          </div>

          {/* Sync Button */}
          <button
            onClick={handleSync}
            disabled={syncing}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              backgroundColor: 'var(--ios-accent, #007aff)', color: '#fff',
              border: 'none', padding: '8px 16px', borderRadius: '12px',
              fontSize: '13px', fontWeight: 600, cursor: syncing ? 'default' : 'pointer',
              opacity: syncing ? 0.7 : 1, transition: 'opacity 0.2s',
            }}
          >
            <RefreshCw size={15} className={syncing ? 'spin-anim' : ''} />
            <span>{syncing ? 'Syncing...' : 'Sync Feed'}</span>
          </button>
        </div>
      </div>

      {/* -- Filters Segmented Control ----------------------------- */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        overflowX: 'auto', paddingBottom: '8px', marginBottom: '24px',
      }}>
        {[
          { id: 'all', label: 'All Posts', icon: LayoutGrid },
          { id: 'carousel', label: 'Carousels', icon: Layers },
          { id: 'photo', label: 'Photos', icon: ImageIcon },
          { id: 'video', label: 'Videos', icon: Film },
          { id: 'raw', label: 'RAW Masters', icon: Sparkles },
        ].map(item => {
          const Icon = item.icon
          const isActive = filterType === item.id
          return (
            <button
              key={item.id}
              onClick={() => setFilterType(item.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                backgroundColor: isActive ? 'rgba(255,255,255,0.15)' : 'var(--ios-bg-card, #1c1c1e)',
                color: isActive ? '#fff' : 'var(--ios-text-secondary, #8e8e93)',
                border: `1px solid ${isActive ? 'rgba(255,255,255,0.3)' : 'var(--ios-border, rgba(255,255,255,0.08))'}`,
                padding: '8px 16px', borderRadius: '20px', fontSize: '13px', fontWeight: 600,
                cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap',
              }}
            >
              <Icon size={15} />
              <span>{item.label}</span>
            </button>
          )
        })}
      </div>

      {/* -- Feed Grid --------------------------------------------- */}
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px' }}>
          <RefreshCw size={32} className="spin-anim" color="var(--ios-accent, #007aff)" />
        </div>
      ) : posts.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '80px 20px',
          backgroundColor: 'var(--ios-bg-card, #1c1c1e)', borderRadius: '20px',
          border: '1px solid var(--ios-border, rgba(255,255,255,0.08))',
        }}>
          <LayoutGrid size={48} color="var(--ios-text-secondary, #8e8e93)" style={{ marginBottom: '16px' }} />
          <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 8px 0' }}>No Feed Posts Found</h3>
          <p style={{ fontSize: '13px', color: 'var(--ios-text-secondary, #8e8e93)', maxWidth: '400px', margin: '0 auto 20px auto' }}>
            Click "Sync Feed" above to pull your Instagram feed posts, carousels, and captions.
          </p>
          <button
            onClick={handleSync}
            disabled={syncing}
            style={{
              backgroundColor: 'var(--ios-accent, #007aff)', color: '#fff',
              border: 'none', padding: '10px 20px', borderRadius: '12px',
              fontSize: '14px', fontWeight: 600, cursor: 'pointer',
            }}
          >
            {syncing ? 'Syncing...' : 'Sync Feed Now'}
          </button>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '16px',
        }}>
          {posts.map(post => {
            const firstMedia = post.media_items?.[0]
            const isCarousel = post.media_type === 8 || (post.media_items && post.media_items.length > 1)
            const isVideo = post.media_type === 2 || firstMedia?.media_type === 2
            const hasRaw = post.media_items?.some(m => m.has_raw_master)
            const isLive = post.media_items?.some(m => m.is_live_photo)

            const thumbUrl = firstMedia?.has_raw_master && firstMedia?.raw_media_url
              ? firstMedia.raw_media_url
              : (firstMedia?.instagram_media_url || `/api/v1/proxy/image?url=${encodeURIComponent(firstMedia?.instagram_cdn_url || '')}`)

            return (
              <motion.div
                key={post.id}
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.2 }}
                onClick={() => navigate(`/posts/${post.id}`)}
                style={{
                  position: 'relative',
                  backgroundColor: '#111',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  border: '1px solid var(--ios-border, rgba(255,255,255,0.08))',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
                  ...getAspectRatioStyle(post),
                }}
              >
                {/* Media Image Thumbnail */}
                <img
                  src={thumbUrl}
                  alt={post.caption_text || 'Post thumbnail'}
                  referrerPolicy="no-referrer"
                  style={{
                    width: '100%', height: '100%',
                    objectFit: 'cover', display: 'block',
                  }}
                  loading="lazy"
                />

                {/* -- Badges Overlay ---------------------------------- */}
                <div style={{
                  position: 'absolute', top: '10px', right: '10px', zIndex: 10,
                  display: 'flex', alignItems: 'center', gap: '6px',
                }}>
                  {hasRaw && (
                    <div style={{
                      backgroundColor: 'rgba(255, 215, 0, 0.9)', color: '#000',
                      padding: '3px 7px', borderRadius: '8px', fontSize: '10px', fontWeight: 800,
                      boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                    }}>
                      RAW
                    </div>
                  )}

                  {isLive && (
                    <div style={{
                      backgroundColor: 'rgba(0,0,0,0.7)', color: '#fff',
                      padding: '4px 6px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '4px',
                      backdropFilter: 'blur(4px)', fontSize: '10px', fontWeight: 700,
                    }}>
                      <Disc size={12} />
                      <span>LIVE</span>
                    </div>
                  )}

                  {isCarousel && (
                    <div style={{
                      backgroundColor: 'rgba(0,0,0,0.7)', color: '#fff',
                      padding: '4px 6px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '4px',
                      backdropFilter: 'blur(4px)', fontSize: '11px', fontWeight: 700,
                    }}>
                      <Layers size={12} />
                      <span>{post.media_items?.length}</span>
                    </div>
                  )}

                  {isVideo && !isCarousel && (
                    <div style={{
                      backgroundColor: 'rgba(0,0,0,0.7)', color: '#fff',
                      padding: '4px 6px', borderRadius: '8px', display: 'flex', alignItems: 'center',
                      backdropFilter: 'blur(4px)',
                    }}>
                      <Film size={12} />
                    </div>
                  )}
                </div>

                {/* -- Hover Stats Overlay ----------------------------- */}
                <div className="post-grid-overlay" style={{
                  position: 'absolute', inset: 0,
                  background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.2) 60%, transparent 100%)',
                  opacity: 0, transition: 'opacity 0.2s',
                  display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
                  padding: '16px', color: '#fff', pointerEvents: 'none',
                }}>
                  {post.caption_text && (
                    <p style={{
                      fontSize: '12px', margin: '0 0 8px 0',
                      display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                      overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.3,
                    }}>
                      {post.caption_text}
                    </p>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '13px', fontWeight: 600 }}>
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Heart size={14} fill="#fff" />
                      <span>{post.like_count || 0}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <MessageCircle size={14} />
                      <span>{post.comment_count || 0}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
