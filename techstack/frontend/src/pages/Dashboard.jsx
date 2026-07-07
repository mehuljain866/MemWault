import { useState, useEffect } from 'react'
import { getDashboardStats, triggerScrape, triggerArchiveImport } from '../services/api'
import { Images, Video, Music, MapPin, Users, Database, Server, HardDrive, RefreshCcw, DownloadCloud } from 'lucide-react'

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
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
        <RefreshCcw size={32} className="spin-anim" />
        <div style={{ fontSize: '18px', fontWeight: 600 }}>Loading Dashboard...</div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '16px', color: 'var(--ios-text-secondary)' }}>
        <Server size={48} color="var(--ios-danger)" />
        <div style={{ fontSize: '20px', fontWeight: 600, color: 'var(--ios-text-primary)' }}>Could not load stats</div>
        <div style={{ fontSize: '16px' }}>Make sure the backend server is running and your session is valid.</div>
        <button className="ios-btn" onClick={loadStats} style={{ marginTop: '16px' }}>Retry Connection</button>
      </div>
    )
  }

  // Helper for Bento Stats
  const BentoStat = ({ icon: Icon, color, label, value }) => (
    <div className="ios-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ 
        width: '48px', height: '48px', borderRadius: '50%', 
        backgroundColor: `${color}20`, color: color, 
        display: 'flex', alignItems: 'center', justifyContent: 'center' 
      }}>
        <Icon size={24} strokeWidth={2.5} />
      </div>
      <div>
        <div style={{ fontSize: '36px', fontWeight: 700, letterSpacing: '-1px', marginBottom: '4px' }}>
          {value}
        </div>
        <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--ios-text-secondary)' }}>
          {label}
        </div>
      </div>
    </div>
  )

  return (
    <div>
      <h2 className="ios-title">Overview</h2>
      
      {/* ── Stats Grid (Bento) ──────────────────────── */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
        gap: '24px', 
        marginBottom: '40px' 
      }}>
        <div className="ios-card" style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '16px', background: 'linear-gradient(135deg, #007aff 0%, #5856d6 100%)', color: 'white' }}>
          <div style={{ fontSize: '20px', fontWeight: 600, opacity: 0.9 }}>Total Stories Archived</div>
          <div style={{ fontSize: '64px', fontWeight: 800, letterSpacing: '-2px', lineHeight: 1 }}>{stats.total_stories}</div>
        </div>
        
        <BentoStat icon={Images} color="#ff9500" label="Photos" value={stats.total_photos} />
        <BentoStat icon={Video} color="#ff2d55" label="Videos" value={stats.total_videos} />
        <BentoStat icon={Music} color="#af52de" label="With Music" value={stats.total_with_music} />
        <BentoStat icon={MapPin} color="#34c759" label="With Location" value={stats.total_with_location} />
        <BentoStat icon={Users} color="#00c7be" label="Mentions" value={stats.total_mentions} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
        {/* ── Quick Actions ───────────────────── */}
        <div className="ios-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h3 style={{ fontSize: '22px', fontWeight: 700 }}>Quick Actions</h3>
          <button className="ios-btn" onClick={() => triggerScrape(true).then(loadStats)}>
            <RefreshCcw size={18} /> Sync Active Stories
          </button>
          <button className="ios-btn-secondary ios-btn" onClick={handleArchiveImport} disabled={importing}>
            {importing ? <><RefreshCcw size={18} className="spin-anim" /> Importing...</> : <><DownloadCloud size={18} /> Import Full Archive</>}
          </button>
        </div>

        {/* ── System & Storage ───────────────────── */}
        <div className="ios-card" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <h3 style={{ fontSize: '22px', fontWeight: 700 }}>System Status</h3>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <HardDrive size={32} color="var(--ios-accent)" />
            <div>
              <div style={{ fontSize: '18px', fontWeight: 700 }}>{stats.storage_used_mb} MB</div>
              <div style={{ fontSize: '14px', color: 'var(--ios-text-secondary)', fontWeight: 600 }}>Total Storage Used</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <Server size={32} color={stats.ig_session_valid ? "var(--ios-success)" : "var(--ios-danger)"} />
            <div>
              <div style={{ fontSize: '18px', fontWeight: 700 }}>Instagram Session</div>
              <div style={{ fontSize: '14px', color: 'var(--ios-text-secondary)', fontWeight: 600 }}>
                {stats.ig_session_valid ? 'Connected & Active' : 'Not Connected'}
              </div>
            </div>
          </div>

          {stats.last_scrape && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <Database size={32} color={stats.last_scrape.status === 'success' ? "var(--ios-success)" : "var(--ios-warning)"} />
              <div>
                <div style={{ fontSize: '18px', fontWeight: 700 }}>Last Scrape</div>
                <div style={{ fontSize: '14px', color: 'var(--ios-text-secondary)', fontWeight: 600 }}>
                  {new Date(stats.last_scrape.started_at).toLocaleString()} · {stats.last_scrape.stories_new} new
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {toast && (
        <div className="ios-glass" style={{
          position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999,
          padding: '12px 20px', borderRadius: 'var(--ios-radius-md)',
          boxShadow: 'var(--ios-shadow-lg)', color: 'var(--ios-text-primary)',
          fontWeight: 600, display: 'flex', alignItems: 'center', gap: '12px',
          border: '1px solid var(--ios-border)'
        }}>
          {toast}
        </div>
      )}
    </div>
  )
}
