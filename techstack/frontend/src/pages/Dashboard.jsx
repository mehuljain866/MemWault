import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getDashboardStats, triggerScrape, triggerArchiveImport } from '../services/api'
import { useOutletContext } from 'react-router-dom'
import { 
  Images, Video, Music, MapPin, Users, Database, Server, HardDrive, 
  RefreshCcw, RefreshCw, DownloadCloud, Menu, Star, Layers, Sparkles,
  CheckCircle2, XCircle, Clock, ArrowDown
} from 'lucide-react'
import SevenSegmentDisplay from '../components/SevenSegmentDisplay'

// Animated Cloud Download Icon
function AnimatedCloudDownload({ isImporting }) {
  return (
    <div style={{ position: 'relative', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <DownloadCloud size={20} />
      <motion.div
        animate={isImporting ? { y: [ -2, 4, -2 ] } : { y: [ -1, 3, -1 ] }}
        transition={{ repeat: Infinity, duration: isImporting ? 0.6 : 1.2, ease: "easeInOut" }}
        style={{ position: 'absolute', top: '6px', left: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <ArrowDown size={10} strokeWidth={3} />
      </motion.div>
    </div>
  )
}

export default function Dashboard() {
  const { onMenuClick } = useOutletContext() || {}
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [importing, setImporting] = useState(false)
  const [toast, setToast] = useState(null)

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    loadStats()
  }, [])

  async function loadStats() {
    try {
      const data = await getDashboardStats()
      setStats(data)
    } catch (err) {
      console.error('Failed to load stats:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleSync() {
    if (syncing) return
    setSyncing(true)
    try {
      await triggerScrape(true)
      await loadStats()
      showToast('Active stories synced successfully!')
    } catch (err) {
      showToast(`Sync error: ${err.message}`)
    } finally {
      setSyncing(false)
    }
  }

  async function handleArchiveImport() {
    if (!confirm('Import ALL stories from your Instagram archive? This may take a while.')) return
    setImporting(true)
    try {
      await triggerArchiveImport()
      showToast('Archive import started! Stories will appear in your timeline as they are processed.')
    } catch (err) {
      showToast(`Error: ${err.message}`)
    } finally {
      setImporting(false)
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '16px', color: 'var(--ios-text-secondary)' }}>
        <RefreshCw size={32} className="spin-anim" />
        <div style={{ fontSize: '16px', fontWeight: 600 }}>Loading Dashboard...</div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '16px', color: 'var(--ios-text-secondary)' }}>
        <Server size={48} color="var(--ios-danger)" />
        <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--ios-text-primary)' }}>Could not load stats</div>
        <div style={{ fontSize: '14px' }}>Make sure the backend server is running and your session is valid.</div>
        <button className="ios-btn" onClick={loadStats} style={{ marginTop: '16px' }}>Retry Connection</button>
      </div>
    )
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
        delayChildren: 0.04,
      }
    }
  }

  const cardVariants = {
    hidden: { opacity: 0, y: 14, scale: 0.98 },
    visible: { 
      opacity: 1, y: 0, scale: 1,
      transition: { type: 'spring', stiffness: 380, damping: 26 }
    }
  }

  // Helper for Bento Stats
  const BentoStat = ({ icon: Icon, color, label, value }) => (
    <motion.div 
      variants={cardVariants}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 350, damping: 25 }}
      className="ios-card" 
      style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        justifyContent: 'space-between',
        aspectRatio: '1 / 1',
        padding: '14px',
        cursor: 'pointer' 
      }}
    >
      <div style={{ 
        width: '32px', height: '32px', borderRadius: '10px', 
        backgroundColor: `${color}18`, color: color, 
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0
      }}>
        <Icon size={18} strokeWidth={2.5} />
      </div>
      <div>
        <div style={{ fontSize: '24px', fontWeight: 800, letterSpacing: '-0.5px', marginBottom: '2px', color: 'var(--ios-text-primary)', lineHeight: 1.1 }}>
          {value}
        </div>
        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ios-text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {label}
        </div>
      </div>
    </motion.div>
  )

  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      style={{ paddingTop: '10px' }}
    >
      {/* Header with LED Archive Counter */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        marginBottom: '20px',
        padding: '12px 16px',
        backgroundColor: 'var(--ios-bg-card)',
        borderRadius: '12px',
        border: '1px solid var(--ios-border)',
        boxShadow: 'var(--ios-shadow-sm)'
      }} className="settings-section-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button
            className="ios-btn-secondary"
            onClick={onMenuClick}
            style={{ display: window.innerWidth <= 768 ? 'flex' : 'none', padding: '8px', borderRadius: '8px' }}
          >
            <Menu size={22} />
          </button>
          <div>
            <h2 className="ios-title status-title" style={{ margin: 0, fontSize: '20px', lineHeight: 1.2 }}>MemWault Overview</h2>
            <div className="status-subtitle" style={{ fontSize: '12px', color: 'var(--ios-text-secondary)', marginTop: '2px' }}>
              Personal Archive & Media Vault
            </div>
          </div>
        </div>

        {/* 7-Segment LED Archival Counter */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          backgroundColor: '#050505',
          padding: '6px 12px',
          borderRadius: '8px',
          border: '1px solid var(--win98-dark-shadow, #808080)',
          boxShadow: 'inset 1px 1px #000, 0 2px 8px rgba(0,0,0,0.5)'
        }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '9px', color: '#808080', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Archived Total
            </div>
            <div style={{ fontSize: '10px', color: '#00D26A', fontWeight: 700 }}>
              ONLINE
            </div>
          </div>
          <SevenSegmentDisplay value={stats.total_stories || 0} digits={4} size={30} />
        </div>
      </div>
      
      {/* ── 1. Top Full-Width Ribbon: Stories & Memories ──────── */}
      <motion.div 
        variants={containerVariants}
        style={{ marginBottom: '16px' }}
      >
        <div className="ios-card settings-section-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--ios-border)', paddingBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '14px', color: 'var(--ios-text-primary)' }}>
              <Clock size={16} color="var(--ios-accent)" />
              <span>Stories & Memories</span>
            </div>
            <span style={{
              fontSize: '11px',
              fontWeight: 700,
              color: '#000080',
              background: '#ffffff',
              padding: '1px 10px',
              border: '1px solid #000000',
              boxShadow: 'inset 1px 1px #808080, inset -1px -1px #ffffff',
              fontFamily: '"MS Sans Serif", Tahoma, sans-serif',
              letterSpacing: '0.02em',
            }}>
              {stats.total_stories || 0} Total
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '10px' }}>
            <BentoStat icon={Images} color="#ff9500" label="Photos" value={stats.total_photos} />
            <BentoStat icon={Video} color="#ff2d55" label="Videos" value={stats.total_videos} />
            <BentoStat icon={Star} color="#00D26A" label="Close Friends" value={stats.total_close_friends || 0} />
            <BentoStat icon={Music} color="#af52de" label="With Music" value={stats.total_with_music} />
            <BentoStat icon={MapPin} color="#34c759" label="With Location" value={stats.total_with_location} />
            <BentoStat icon={Users} color="#00c7be" label="Mentions" value={stats.total_mentions} />
          </div>
        </div>
      </motion.div>

      {/* ── 2. Bottom Full-Width Ribbon: Feed Posts & Carousels ──────── */}
      <motion.div 
        variants={containerVariants}
        style={{ marginBottom: '16px' }}
      >
        <div className="ios-card settings-section-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--ios-border)', paddingBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '14px', color: 'var(--ios-text-primary)' }}>
              <Layers size={16} color="#5856d6" />
              <span>Feed Posts & Carousels</span>
            </div>
            <span style={{
              fontSize: '11px',
              fontWeight: 700,
              color: '#000080',
              background: '#ffffff',
              padding: '1px 10px',
              border: '1px solid #000000',
              boxShadow: 'inset 1px 1px #808080, inset -1px -1px #ffffff',
              fontFamily: '"MS Sans Serif", Tahoma, sans-serif',
              letterSpacing: '0.02em',
            }}>
              {stats.total_feed_posts || 0} Total
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '10px' }}>
            <BentoStat icon={Layers} color="#5856d6" label="Feed Posts" value={stats.total_feed_posts || 0} />
            <BentoStat icon={Sparkles} color="#E89E38" label="RAW Masters" value={stats.total_with_raw_master || 0} />
            <BentoStat icon={Images} color="#34c759" label="High-Res Media" value={stats.total_post_media || stats.total_feed_posts || 0} />
          </div>
        </div>
      </motion.div>

      {/* ── 3. Quick Actions (Above System Status) ───────────────────── */}
      <motion.div variants={containerVariants} style={{ marginBottom: '16px' }}>
        <div className="ios-card settings-section-card" style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 className="settings-section-header" style={{ fontSize: '14px', fontWeight: 700, margin: 0 }}>
              Quick Actions
            </h3>
            <span style={{ fontSize: '11px', color: 'var(--ios-text-secondary)' }}>
              Ingestion & Cloud Tasks
            </span>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
            <motion.button 
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              className="ios-btn" 
              onClick={handleSync}
              disabled={syncing}
              style={{
                padding: '12px 18px', fontSize: '13px', fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
              }}
            >
              <RefreshCw size={16} className={syncing ? "spin-anim" : "spin-on-hover"} />
              <span>{syncing ? 'Syncing Active Stories...' : 'Sync Active Stories'}</span>
            </motion.button>

            <motion.button 
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              className="ios-btn-secondary ios-btn" 
              onClick={handleArchiveImport} 
              disabled={importing}
              style={{
                padding: '12px 18px', fontSize: '13px', fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
              }}
            >
              <AnimatedCloudDownload isImporting={importing} />
              <span>{importing ? 'Importing Archive Stories...' : 'Import Full Archive'}</span>
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* ── 4. System Status (Below Quick Actions) ───────────────────── */}
      <motion.div variants={containerVariants}>
        <div className="ios-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px 20px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: 'var(--ios-text-primary)' }}>System Status</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
            {/* Storage Metric */}
            <div className="dashboard-status-row" style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 14px', borderRadius: '12px', background: 'var(--ios-bg-app)',
              border: '1px solid var(--ios-border)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <HardDrive size={22} color="var(--ios-accent)" />
                <div>
                  <div className="status-title" style={{ fontSize: '13px', fontWeight: 700, color: 'var(--ios-text-primary)' }}>
                    Total Storage
                  </div>
                  <div className="status-subtitle" style={{ fontSize: '11px', color: 'var(--ios-text-secondary)' }}>
                    Local disk allocation
                  </div>
                </div>
              </div>
              <div className="status-val" style={{ fontSize: '14px', fontWeight: 800, color: 'var(--ios-text-primary)' }}>
                {stats.storage_used_mb} MB
              </div>
            </div>

            {/* Instagram Session Metric */}
            <div className="dashboard-status-row" style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 14px', borderRadius: '12px', background: 'var(--ios-bg-app)',
              border: '1px solid var(--ios-border)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Server size={22} color={stats.ig_session_valid ? "#34c759" : "var(--ios-danger)"} />
                <div>
                  <div className="status-title" style={{ fontSize: '13px', fontWeight: 700, color: 'var(--ios-text-primary)' }}>
                    Instagram Session
                  </div>
                  <div className="status-subtitle" style={{ fontSize: '11px', color: 'var(--ios-text-secondary)' }}>
                    Automated background scraper
                  </div>
                </div>
              </div>
              <span className={`dashboard-status-badge ${stats.ig_session_valid ? 'badge-active' : ''}`} style={{
                display: 'inline-flex', alignItems: 'center', gap: '4px',
                padding: '3px 8px', borderRadius: '8px', fontSize: '11px', fontWeight: 700,
                backgroundColor: stats.ig_session_valid ? 'rgba(52, 199, 89, 0.15)' : 'rgba(255, 59, 48, 0.15)',
                color: stats.ig_session_valid ? '#34c759' : '#ff3b30'
              }}>
                {stats.ig_session_valid ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                {stats.ig_session_valid ? 'Active' : 'Expired'}
              </span>
            </div>

            {/* Last Ingestion Metric */}
            {stats.last_scrape && (
              <div className="dashboard-status-row" style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 14px', borderRadius: '12px', background: 'var(--ios-bg-app)',
                border: '1px solid var(--ios-border)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Clock size={22} color="var(--ios-accent)" />
                  <div>
                    <div className="status-title" style={{ fontSize: '13px', fontWeight: 700, color: 'var(--ios-text-primary)' }}>
                      Last Sync
                    </div>
                    <div className="status-subtitle" style={{ fontSize: '11px', color: 'var(--ios-text-secondary)' }}>
                      {new Date(stats.last_scrape.started_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
                <span className="dashboard-status-badge badge-sync" style={{
                  padding: '3px 8px', borderRadius: '8px', fontSize: '11px', fontWeight: 700,
                  backgroundColor: 'rgba(232, 158, 56, 0.15)', color: 'var(--ios-accent)'
                }}>
                  +{stats.last_scrape.stories_new} new
                </span>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="ios-glass" 
            style={{
              position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999,
              padding: '12px 20px', borderRadius: 'var(--ios-radius-md)',
              boxShadow: 'var(--ios-shadow-lg)', color: 'var(--ios-text-primary)',
              fontWeight: 600, display: 'flex', alignItems: 'center', gap: '12px',
              border: '1px solid var(--ios-border)'
            }}
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
