import { Routes, Route, useLocation, Navigate, useNavigate } from 'react-router-dom'
import { signOut, onAuthStateChanged } from 'firebase/auth'
import { useEffect, useState } from 'react'
import { auth } from './firebase'

import Landing from './pages/Landing'
import Login from './pages/Login'
import Signup from './pages/Signup'
import VerifyEmail from './pages/VerifyEmail'
import Dashboard from './pages/DashboardNew'
import Quiz from './pages/Quiz'
import Progress from './pages/Progress'
import PrivacyPolicy from './pages/PrivacyPolicy'

function Sidebar({ user }) {
  const location = useLocation()
  const navigate = useNavigate()

  const handleLogout = () => {
    signOut(auth)
  }

  const navItems = [
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/quiz', label: 'Quiz' },
    { path: '/progress', label: 'Progress' }
  ]

  return (
    <div className="nb-sidebar">
      <div className="nb-brand">
        <span style={{ 
          background: 'linear-gradient(135deg, #4285f4 0%, #34a853 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          fontWeight: '700',
          fontSize: '28px',
          letterSpacing: '-0.03em'
        }}>AIVY</span>
      </div>

      <div className="nb-profile">
        <div className="nb-profile-name">
          {user?.displayName || user?.email?.split('@')[0]}
        </div>
        <div className="nb-profile-email">
          {user?.email}
        </div>
      </div>

      <nav className="nb-nav">
        {navItems.map(item => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={`nb-nav-item ${location.pathname === item.path ? 'active' : ''}`}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <button onClick={handleLogout} className="nb-nav-item" style={{ marginTop: 'auto' }}>
        Logout
      </button>
    </div>
  )
}

function AppLayout({ children, user }) {
  return (
    <div className="nb-app">
      <Sidebar user={user} />
      <div className="nb-main">
        <div className="nb-content">
          {children}
        </div>
      </div>
    </div>
  )
}

function AuthLayout({ children }) {
  return children
}

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const location = useLocation()

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u)
      setLoading(false)
    })
    return () => unsub()
  }, [])

  if (loading) return (
    <div className="nb-loading">
      Loading...
    </div>
  )

  const isAuthRoute = ['/login', '/signup'].includes(location.pathname)
  const isProtectedRoute = ['/dashboard', '/quiz', '/progress'].includes(location.pathname)
  const isPublicRoute = ['/', '/privacy-policy'].includes(location.pathname)
  const isVerifyRoute = location.pathname === '/verify-email'

  if (!user && isProtectedRoute) {
    return <Navigate to="/login" />
  }

  if (user && isAuthRoute) {
    return <Navigate to="/dashboard" />
  }

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/privacy-policy" element={<PrivacyPolicy />} />
      
      <Route path="/login" element={
        <AuthLayout>
          <Login />
        </AuthLayout>
      } />

      <Route path="/signup" element={
        <AuthLayout>
          <Signup />
        </AuthLayout>
      } />

      <Route path="/verify-email" element={
        <AuthLayout>
          <VerifyEmail />
        </AuthLayout>
      } />

      <Route path="/dashboard" element={<Dashboard />} />

      <Route path="/quiz" element={
        <AppLayout user={user}>
          <Quiz />
        </AppLayout>
      } />

      <Route path="/progress" element={
        <AppLayout user={user}>
          <Progress />
        </AppLayout>
      } />

      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  )
}

export default App
