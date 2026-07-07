import { useState, useEffect } from 'react'
import { createBrowserRouter, RouterProvider, Navigate, Outlet, ScrollRestoration } from 'react-router-dom'
import { isAuthenticated } from './services/api'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import Dashboard from './pages/Dashboard'
import Timeline from './pages/Timeline'
import StoryDetail from './pages/StoryDetail'
import Settings from './pages/Settings'
import Login from './pages/Login'
import MapView from './pages/MapView'

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

  // Apply theme class to body/html
  useEffect(() => {
    const settings = JSON.parse(localStorage.getItem('memwault_settings') || '{}')
    document.documentElement.setAttribute('data-theme', settings.theme || 'dark')
  }, [])

  return (
    <div className="app-container">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="ios-main-content">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
          <Outlet />
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
      { path: "/highlights", element: <Timeline key="highlights" isReelView={false} /> },
      { path: "/story/:id", element: <StoryDetail /> },
      { path: "/map", element: <MapView /> },
      { path: "/settings", element: <Settings /> },
      { path: "*", element: <Navigate to="/" replace /> },
    ]
  }
])

export default function App() {
  return <RouterProvider router={router} />
}
