import { Routes, Route, useLocation, Navigate } from 'react-router-dom'
import { onAuthStateChanged } from 'firebase/auth'
import { useEffect, useState } from 'react'
import { auth } from './firebase'

import Landing from './pages/Landing'
import Login from './pages/Login'
import Signup from './pages/Signup'
import VerifyEmail from './pages/VerifyEmail'
import Quiz from './pages/Quiz'
import Progress from './pages/Progress'
import PrivacyPolicy from './pages/PrivacyPolicy'
import Dashboard from './pages/Dashboard'
import AiTutor from './pages/AiTutor'
import StudyPlanner from './pages/StudyPlanner'
import Flashcards from './pages/Flashcards'
import Leaderboard from './pages/Leaderboard'
import Profile from './pages/Profile'
import Sessions from './pages/Sessions'

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
    <div style={{
      minHeight: '100vh',
      background: 'var(--color-bg-primary)',
      color: 'var(--color-text-primary)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      gap: '1rem',
      fontFamily: 'Inter, sans-serif'
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: '50%',
        border: '3px solid rgba(99,102,241,0.2)',
        borderTopColor: '#6366f1',
        animation: 'spin 0.8s linear infinite'
      }} />
      <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>Loading AIVY...</p>
    </div>
  )

  const isAuthRoute = ['/login', '/signup'].includes(location.pathname)
  const isProtectedRoute = [
    '/dashboard', '/quiz', '/progress',
    '/ai-tutor', '/study-planner', '/flashcards', '/leaderboard',
    '/profile', '/sessions'
  ].includes(location.pathname)

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
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/quiz" element={<Quiz />} />
      <Route path="/progress" element={<Progress />} />
      <Route path="/ai-tutor" element={<AiTutor />} />
      <Route path="/study-planner" element={<StudyPlanner />} />
      <Route path="/flashcards" element={<Flashcards />} />
      <Route path="/leaderboard" element={<Leaderboard />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/sessions" element={<Sessions />} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  )
}

export default App
