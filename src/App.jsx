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
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
      Loading...
    </div>
  )

  const isAuthRoute = ['/login', '/signup'].includes(location.pathname)
  const isProtectedRoute = [
    '/dashboard', '/quiz', '/progress',
    '/ai-tutor', '/study-planner', '/flashcards', '/leaderboard'
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
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  )
}

export default App
