import { useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
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
function AppShell({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="sv-app">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="sv-main">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <div className="sv-content sv-fade-in">
          {children}
        </div>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppShell><Dashboard /></AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/timeline"
        element={
          <ProtectedRoute>
            <AppShell><Timeline key="timeline" isReelView={false} /></AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/reels"
        element={
          <ProtectedRoute>
            <AppShell><Timeline key="reels" isReelView={true} /></AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/story/:id"
        element={
          <ProtectedRoute>
            <AppShell><StoryDetail /></AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/map"
        element={
          <ProtectedRoute>
            <AppShell><MapView /></AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <AppShell><Settings /></AppShell>
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
