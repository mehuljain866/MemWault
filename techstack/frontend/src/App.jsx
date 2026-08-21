import { useState, useEffect } from 'react'
import { createBrowserRouter, RouterProvider, Navigate, Outlet, ScrollRestoration, useLocation, useOutlet, useRouteError } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import { isAuthenticated } from './services/api'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import Timeline from './pages/Timeline'
import StoryDetail from './pages/StoryDetail'
import Settings from './pages/Settings'
import Login from './pages/Login'
import MapView from './pages/MapView'
import Highlights from './pages/Highlights'
import HighlightViewer from './pages/HighlightViewer'
import Archives from './pages/Archives'
import Posts from './pages/Posts'
import PostDetail from './pages/PostDetail'
import MobileUploadPortal from './pages/MobileUploadPortal'
import JournalApp from './pages/JournalApp'
import MobilePaintPortal from './pages/MobilePaintPortal'
import PocketCompanion from './pages/PocketCompanion'

import ThemeShellWrapper from './components/shells/ThemeShellWrapper'
import ClippyAssistant from './components/win98/ClippyAssistant'
import { applyThemeSettings, getSettings } from './services/settings'

/**
 * Protected route wrapper — redirects to /login if not authenticated.
 */
function ProtectedRoute({ children }) {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />
  }
  return children
}

/**
 * App Shell — sidebar + header + routed content area.
 */
function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [themeId, setThemeId] = useState(() => getSettings().themeId || 'darkroom')
  const location = useLocation()
  
  // By calling useOutlet() instead of rendering <Outlet />, we get the static element.
  // This prevents the exiting page from suddenly re-rendering as the new page during the animation!
  const currentOutlet = useOutlet({ onMenuClick: () => setSidebarOpen(true) })

  // Apply theme & design philosophy to body/html and listen to theme updates
  useEffect(() => {
    applyThemeSettings()
    const handleUpdate = () => {
      const current = getSettings()
      setThemeId(current.themeId || 'darkroom')
    }
    window.addEventListener('storage', handleUpdate)
    window.addEventListener('memwault-settings-changed', handleUpdate)
    return () => {
      window.removeEventListener('storage', handleUpdate)
      window.removeEventListener('memwault-settings-changed', handleUpdate)
    }
  }, [])

  const isWin98 = themeId === 'win98'

  return (
    <div className={`app-container ${isWin98 ? 'win98-root-container' : ''}`}>
      {!isWin98 && <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />}
      <div className={`ios-main-content ${isWin98 ? 'win98-main-content' : ''}`}>
        <ThemeShellWrapper onMenuClick={() => setSidebarOpen(true)}>
          <div style={{ width: '100%', minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: isWin98 ? 0 : 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: isWin98 ? 0 : -10 }}
                transition={{ duration: isWin98 ? 0.05 : 0.18, ease: "easeOut" }}
                style={{ width: '100%', flex: 1 }}
                onAnimationComplete={() => {
                  document.body.style.transform = '';
                }}
              >
                {currentOutlet}
              </motion.div>
            </AnimatePresence>
          </div>
        </ThemeShellWrapper>
      </div>
      {!isWin98 && <ClippyAssistant />}
      <ScrollRestoration />
    </div>
  )
}

function RouteErrorBoundary() {
  const error = useRouteError()

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      minHeight: '70vh', padding: '32px', textAlign: 'center', gap: '16px', color: 'var(--ios-text-primary)'
    }}>
      <div style={{
        width: '56px', height: '56px', borderRadius: '50%',
        backgroundColor: 'rgba(255, 59, 48, 0.15)', color: 'var(--ios-danger, #ff3b30)',
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        <AlertTriangle size={28} />
      </div>
      <h2 style={{ fontSize: '22px', fontWeight: 700, margin: 0 }}>Something went wrong</h2>
      <p style={{ color: 'var(--ios-text-secondary)', maxWidth: '440px', fontSize: '14px', margin: 0 }}>
        {error?.message || error?.statusText || 'An unexpected error occurred while loading this view.'}
      </p>
      <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
        <button
          className="ios-btn"
          onClick={() => window.location.reload()}
          style={{ padding: '8px 18px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <RefreshCw size={14} /> Reload Page
        </button>
        <button
          className="ios-btn-secondary ios-btn"
          onClick={() => window.location.href = '/'}
          style={{ padding: '8px 18px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <Home size={14} /> Back to Dashboard
        </button>
      </div>
    </div>
  )
}

const router = createBrowserRouter([
  {
    path: "/login",
    element: <Login />,
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: "/upload-link/:token",
    element: <MobileUploadPortal />,
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: "/mobile-paint",
    element: <MobilePaintPortal />,
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: "/pocket",
    element: <PocketCompanion />,
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <AppShell />
      </ProtectedRoute>
    ),
    errorElement: <RouteErrorBoundary />,
    children: [
      { path: "/", element: <Dashboard />, errorElement: <RouteErrorBoundary /> },
      { path: "/posts", element: <Posts />, errorElement: <RouteErrorBoundary /> },
      { path: "/posts/:postId", element: <PostDetail />, errorElement: <RouteErrorBoundary /> },
      { path: "/timeline", element: <Timeline key="timeline" isReelView={false} />, errorElement: <RouteErrorBoundary /> },
      { path: "/reels", element: <Timeline key="reels" isReelView={true} />, errorElement: <RouteErrorBoundary /> },
      { path: "/journal", element: <JournalApp />, errorElement: <RouteErrorBoundary /> },
      { path: "/highlights", element: <Highlights />, errorElement: <RouteErrorBoundary /> },
      { path: "/highlights/:id", element: <HighlightViewer />, errorElement: <RouteErrorBoundary /> },
      { path: "/story/:id", element: <StoryDetail />, errorElement: <RouteErrorBoundary /> },
      { path: "/map", element: <MapView />, errorElement: <RouteErrorBoundary /> },
      { path: "/settings", element: <Settings />, errorElement: <RouteErrorBoundary /> },
      { path: "/archives", element: <Archives />, errorElement: <RouteErrorBoundary /> },
      { path: "*", element: <Navigate to="/" replace /> },
    ]
  }
])

export default function App() {
  return <RouterProvider router={router} />
}
