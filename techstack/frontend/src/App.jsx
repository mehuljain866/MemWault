import { useState, useEffect } from 'react'
import { createBrowserRouter, RouterProvider, Navigate, Outlet, ScrollRestoration, useLocation, useOutlet } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
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
  const location = useLocation()
  
  // By calling useOutlet() instead of rendering <Outlet />, we get the static element.
  // This prevents the exiting page from suddenly re-rendering as the new page during the animation!
  const currentOutlet = useOutlet({ onMenuClick: () => setSidebarOpen(true) })

  // Apply theme class to body/html
  useEffect(() => {
    const settings = JSON.parse(localStorage.getItem('memwault_settings') || '{}')
    document.documentElement.setAttribute('data-theme', settings.theme || 'dark')
  }, [])

  return (
    <div className="app-container">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="ios-main-content">
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
              onAnimationComplete={() => {
                // Force remove transform to prevent trapping position: fixed children
                document.body.style.transform = '';
              }}
            >
              {currentOutlet}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
      <ScrollRestoration />
    </div>
  )
}

const router = createBrowserRouter([
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <AppShell />
      </ProtectedRoute>
    ),
    children: [
      { path: "/", element: <Dashboard /> },
      { path: "/timeline", element: <Timeline key="timeline" isReelView={false} /> },
      { path: "/reels", element: <Timeline key="reels" isReelView={true} /> },
      { path: "/highlights", element: <Highlights /> },
      { path: "/highlights/:id", element: <HighlightViewer /> },
      { path: "/story/:id", element: <StoryDetail /> },
      { path: "/map", element: <MapView /> },
      { path: "/settings", element: <Settings /> },
      { path: "/archives", element: <Archives /> },
      { path: "*", element: <Navigate to="/" replace /> },
    ]
  }
])

export default function App() {
  return <RouterProvider router={router} />
}
