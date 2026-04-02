import { useState, useEffect } from 'react'
import { signOut, onAuthStateChanged } from 'firebase/auth'
import { auth } from '../firebase'
import { useNavigate, Link } from 'react-router-dom'
import { extractTextFromFile, isImageFile } from '../services/pdfService'
import { generatePrerequisiteSurvey, generateStudyGuidance, generateAdaptiveQuiz, generateTopicWiseSummary, summarizeSession } from '../services/geminiService'
import { saveCurrentQuiz, getCurrentQuiz, archiveCurrentSession } from '../services/storageService'
import { initializeUserStats } from '../services/gamificationService'
import Gamification from '../components/Gamification'
import Sidebar from '../components/Sidebar'
import GamificationSummary from '../components/GamificationSummary'
import { getArchivedSessions, restoreSession, getActiveContextName } from '../services/storageService'
import {
  Upload,
  FileText,
  Brain,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  LogOut,
  User,
  TrendingUp,
  Target,
  BarChart3,
  BookOpen,
  Clock,
  Award,
  Activity,
  Loader2,
  Lock,
  Play,
  RefreshCw,
  X,
  Lightbulb,
  Sun,
  Moon,
  MessageSquare,
  CalendarDays,
  CreditCard,
  Trophy,
  Camera,
  History,
  ChevronLeft,
  ChevronDown
} from 'lucide-react'

// Dashboard States
const DASHBOARD_STATES = {
  NO_DOCUMENT: 'NO_DOCUMENT',                    // State 1: Nothing uploaded
  DOCUMENT_UPLOADED: 'DOCUMENT_UPLOADED',        // State 2: Document ready, survey not generated
  SURVEY_READY: 'SURVEY_READY',                  // State 2b: Survey generated, not taken
  SURVEY_COMPLETED: 'SURVEY_COMPLETED',          // State 3: Baseline established
  QUIZ_IN_PROGRESS: 'QUIZ_IN_PROGRESS',          // State 4: Quiz started
  QUIZ_COMPLETED: 'QUIZ_COMPLETED'               // State 5: Quiz finished
}

function Dashboard() {
  const [isProcessing, setIsProcessing] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [selectedFile, setSelectedFile] = useState(null)
  const [processingStage, setProcessingStage] = useState('')
  const [showNewDocModal, setShowNewDocModal] = useState(false)
  const [recentSessions, setRecentSessions] = useState([])
  const [inputMode, setInputMode] = useState('upload') // 'upload' | 'paste'
  const [pastedText, setPastedText] = useState('')
  const [allSessions, setAllSessions] = useState([])
  const [showSwitcher, setShowSwitcher] = useState(false)

  const navigate = useNavigate()
  const user = auth.currentUser
  const userInitial = user?.email?.charAt(0).toUpperCase() || 'U'

  // State management
  const [currentQuiz, setCurrentQuiz] = useState(null)
  const [dashboardState, setDashboardState] = useState(DASHBOARD_STATES.NO_DOCUMENT)

  // Theme management
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'dark'
  })

  // Apply theme on mount and when it changes
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'dark' ? 'light' : 'dark')
  }


  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { setIsLoading(false); navigate('/login'); return }
      try {
        setIsLoading(true)
        await initializeUserStats(user.uid)

        const quiz = await getCurrentQuiz()
        setCurrentQuiz(quiz)

        const sessions = await getArchivedSessions()
        setRecentSessions(sessions.slice(0, 3))

        if (!quiz) {
          setDashboardState(DASHBOARD_STATES.NO_DOCUMENT)
        } else if (quiz.questions && quiz.questions.length > 0) {
          const answeredCount = Object.keys(quiz.userAnswers || {}).length
          if (answeredCount > 0) {
            if (quiz.isPrerequisiteSurvey) {
              setDashboardState(DASHBOARD_STATES.SURVEY_COMPLETED)
            } else {
              const allAnswered = answeredCount >= quiz.questions.length
              setDashboardState(allAnswered
                ? DASHBOARD_STATES.QUIZ_COMPLETED
                : DASHBOARD_STATES.QUIZ_IN_PROGRESS)
            }
          } else {
            // No answers yet
            setDashboardState(quiz.isPrerequisiteSurvey ? DASHBOARD_STATES.SURVEY_READY : DASHBOARD_STATES.QUIZ_IN_PROGRESS)
          }
        } else {
          setDashboardState(DASHBOARD_STATES.NO_DOCUMENT)
        }
      } catch (error) {
        console.error('Error loading dashboard:', error)
      } finally {
        // Load sessions for switcher
        getArchivedSessions().then(sessions => {
          const unique = []
          const names = new Set()
          sessions.forEach(s => {
            if (!names.has(s.documentName)) {
              names.add(s.documentName); unique.push(s)
            }
          })
          setAllSessions(unique)
        })
        setIsLoading(false)
      }
    })
    return () => unsub()
  }, [])

  const handleRestoreSession = async (id) => {
    try {
      setIsProcessing(true)
      await restoreSession(id)
      window.location.reload()
    } catch (err) {
      console.error('Session restore err:', err)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleLogout = async () => {
    try {
      await signOut(auth)
      navigate('/login')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setSelectedFile(file)
    setInputMode('upload')
    setError('')
    setSuccess('')
  }

  const handleUpload = async () => {
    if (inputMode === 'upload' && !selectedFile) {
      setError('Please select a file first')
      return
    }
    if (inputMode === 'paste' && (!pastedText || pastedText.length < 100)) {
      setError('Please paste at least 100 characters of study material')
      return
    }

    setIsProcessing(true)
    setError('')
    setSuccess('')
    if (inputMode === 'upload') {
      const isImg = isImageFile(selectedFile)
      setProcessingStage(isImg ? 'Reading image with AI Vision (OCR)...' : 'Extracting text from document...')
    } else {
      setProcessingStage('Processing pasted text...')
    }

    try {
      let extractedText = ''
      if (inputMode === 'upload') {
        extractedText = await extractTextFromFile(selectedFile)
      } else {
        extractedText = pastedText
      }

      if (!extractedText || extractedText.length < 100) {
        throw new Error('Document appears to be empty or too short')
      }

      setProcessingStage('Generating topic summaries...')

      // Generate topic-wise summary (non-blocking)
      const topicSummary = await generateTopicWiseSummary(extractedText)

      setProcessingStage('Analyzing content with AI...')

      const surveyQuestions = await generatePrerequisiteSurvey(extractedText)

      if (!surveyQuestions || surveyQuestions.length === 0) {
        throw new Error('Failed to generate prerequisite survey')
      }

      setProcessingStage('Saving survey to database...')

      const quizData = {
        documentName: inputMode === 'upload' ? selectedFile.name : `Pasted Content (${new Date().toLocaleDateString()})`,
        documentText: extractedText,
        questions: surveyQuestions,
        isPrerequisiteSurvey: true,
        topicSummary: topicSummary // Save the summary
      }

      await saveCurrentQuiz(quizData)

      // Reload quiz data and update state
      const updatedQuiz = await getCurrentQuiz()
      setCurrentQuiz(updatedQuiz)
      setDashboardState(DASHBOARD_STATES.SURVEY_READY)
      setSuccess(`Survey ready! Click "Start Survey" to begin.`)
      setProcessingStage('')

      setSelectedFile(null)
      setPastedText('')
      const fileInput = document.getElementById('file-upload')
      if (fileInput) fileInput.value = ''

    } catch (err) {
      console.error('Upload error:', err)
      setError(err.message || 'Failed to process document')
      setProcessingStage('')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleStartSurvey = () => {
    // Only allow if in SURVEY_READY state
    if (dashboardState !== DASHBOARD_STATES.SURVEY_READY) {
      setError('Survey not available. Please upload a document first.')
      return
    }

    navigate('/quiz')
  }

  const handleContinueQuiz = () => {
    navigate('/quiz')
  }

  const handleStartAdaptiveQuiz = async () => {
    try {
      setIsProcessing(true)
      setProcessingStage('Generating adaptive quiz based on your performance...')
      setError('')

      const surveyQuestions = currentQuiz?.questions || []
      const surveyAnswers   = currentQuiz?.userAnswers || {}

      // Build studyGuidance inline if not saved (never block on this)
      let guidance = currentQuiz?.studyGuidance
      if (!guidance) {
        const correct = surveyQuestions.filter((q, i) => surveyAnswers[i] === q.correctAnswer).length
        const acc = surveyQuestions.length > 0 ? Math.round((correct / surveyQuestions.length) * 100) : 50
        const weak = surveyQuestions
          .filter((q, i) => surveyAnswers[i] !== q.correctAnswer)
          .map(q => q.question.split(' ').slice(0, 5).join(' '))
        guidance = {
          learnerLevel: acc >= 80 ? 'Advanced' : acc >= 55 ? 'Intermediate' : 'Beginner',
          priorityTopics: weak.slice(0, 4).length > 0 ? weak.slice(0, 4) : ['Core concepts', 'Key definitions', 'Practical applications'],
          studyDuration: acc >= 80 ? '15 minutes' : acc >= 55 ? '30 minutes' : '45 minutes',
          nextAction: acc >= 80 ? 'Review advanced topics before the quiz.' : 'Focus on the areas you found difficult in the survey.'
        }
      }

      const adaptiveQuestions = await generateAdaptiveQuiz(
        currentQuiz?.documentText || '',
        surveyQuestions,
        surveyAnswers,
        guidance
      )

      if (!adaptiveQuestions || adaptiveQuestions.length === 0) {
        throw new Error('No questions generated — please try again')
      }

      await saveCurrentQuiz({
        documentName: currentQuiz?.documentName || 'Document',
        documentText: currentQuiz?.documentText || '',
        questions: adaptiveQuestions,
        isPrerequisiteSurvey: false,
        studyGuidance: guidance,
        userAnswers: {},
        completedAt: null
      })

      setSuccess('Adaptive quiz ready! Starting now...')
      setTimeout(() => navigate('/quiz'), 800)
    } catch (error) {
      console.error('Adaptive quiz error:', error)
      setError('Failed to generate adaptive quiz. Please try again.')
    } finally {
      setIsProcessing(false)
      setProcessingStage('')
    }
  }

  const handleStartNewDocument = () => {
    // Show confirmation modal
    setShowNewDocModal(true)
  }

  const handleConfirmNewDocument = async () => {
    try {
      setIsProcessing(true)
      setProcessingStage('Generating AI takeaways for your session...')
      
      const summary = currentQuiz ? await summarizeSession(currentQuiz) : ''

      setProcessingStage('Archiving current session...')

      // Archive current session with AI summary
      await archiveCurrentSession(summary)

      // Reset state
      setCurrentQuiz(null)
      setDashboardState(DASHBOARD_STATES.NO_DOCUMENT)
      setShowNewDocModal(false)
      setSuccess('Session archived. You can now upload a new document.')
      setProcessingStage('')
    } catch (error) {
      console.error('Error starting new document:', error)
      setError('Failed to archive session. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleCancelNewDocument = () => {
    setShowNewDocModal(false)
  }

  const handleRestore = async (sessionId) => {
    try {
      setIsProcessing(true)
      setProcessingStage('Restoring previous session...')
      await restoreSession(sessionId)
      
      // Reload page data
      const updatedQuiz = await getCurrentQuiz()
      setCurrentQuiz(updatedQuiz)
      
      // Navigate or update state
      if (updatedQuiz.questions && updatedQuiz.questions.length > 0) {
        if (updatedQuiz.userAnswers && Object.keys(updatedQuiz.userAnswers).length > 0) {
            setDashboardState(DASHBOARD_STATES.QUIZ_COMPLETED)
        } else {
            setDashboardState(DASHBOARD_STATES.SURVEY_READY)
        }
      }
      
      setSuccess('Session restored successfully!')
    } catch (error) {
      console.error('Restore error:', error)
      setError('Failed to restore session')
    } finally {
      setIsProcessing(false)
      setProcessingStage('')
    }
  }

  // Helper functions for state checks
  const isState = (state) => dashboardState === state
  const isStateAtLeast = (state) => {
    const stateOrder = [
      DASHBOARD_STATES.NO_DOCUMENT,
      DASHBOARD_STATES.DOCUMENT_UPLOADED,
      DASHBOARD_STATES.SURVEY_READY,
      DASHBOARD_STATES.SURVEY_COMPLETED,
      DASHBOARD_STATES.QUIZ_IN_PROGRESS,
      DASHBOARD_STATES.QUIZ_COMPLETED
    ]
    const currentIndex = stateOrder.indexOf(dashboardState)
    const targetIndex = stateOrder.indexOf(state)
    return currentIndex >= targetIndex
  }

  if (isLoading) {
    return (
      <div className="dashboard fade-in">
        <div className="dashboard-header">
          <div className="dashboard-header-content">
            <div className="dashboard-greeting">
              <h1 className="greeting-title">
                <Brain size={28} />
                Loading Dashboard...
              </h1>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="app-layout">
    <Sidebar />
    <div className="dashboard fade-in" style={{ flex: 1, minWidth: 0 }}>

      {/* Top Bar */}
      <div className="db-topbar">
        <div className="db-topbar-left">
          <h1 className="db-title" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
             Welcome back, {user?.displayName || user?.email?.split('@')[0] || 'Learner'}!
          </h1>
          <span className="db-state-pill">
            {isState(DASHBOARD_STATES.NO_DOCUMENT) && 'Getting Started'}
            {isState(DASHBOARD_STATES.SURVEY_READY) && 'Survey Ready'}
            {isState(DASHBOARD_STATES.DOCUMENT_UPLOADED) && 'Document Loaded'}
            {isState(DASHBOARD_STATES.SURVEY_COMPLETED) && 'Baseline Set'}
            {isState(DASHBOARD_STATES.QUIZ_IN_PROGRESS) && (currentQuiz?.isPrerequisiteSurvey ? 'Survey Active' : 'Quiz Active')}
            {isState(DASHBOARD_STATES.QUIZ_COMPLETED) && 'Quiz Done'}
          </span>
        </div>
        <div className="db-topbar-right">
          <GamificationSummary />
          <button onClick={toggleTheme} className="theme-toggle" aria-label="Toggle theme">
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <div className="db-user-avatar"><User size={16} /></div>
          <button onClick={handleLogout} className="btn btn-secondary btn-sm btn-icon">
            <LogOut size={15} />Logout
          </button>
        </div>
      </div>

      {error && <div className="db-alert db-alert-error"><AlertCircle size={16}/><span>{error}</span></div>}
      {success && !error && <div className="db-alert db-alert-success"><CheckCircle2 size={16}/><span>{success}</span></div>}
      {isProcessing && <div className="db-alert db-alert-info"><Loader2 className="processing-spinner" size={16}/><span>{processingStage}</span></div>}

      <div className="db-layout">

        {/* LEFT COLUMN */}
        <div className="db-col-left">

          <div className="db-action-card">
            <div className="db-action-header">
              <div className="db-action-icon">
                {isState(DASHBOARD_STATES.QUIZ_COMPLETED) ? <Award size={20} /> :
                 isState(DASHBOARD_STATES.QUIZ_IN_PROGRESS) ? <Play size={20} /> :
                 isState(DASHBOARD_STATES.SURVEY_COMPLETED) ? <Sparkles size={20} /> :
                 isState(DASHBOARD_STATES.SURVEY_READY) ? <Target size={20} /> :
                 <Upload size={20} />}
              </div>
              <div>
                <h2 className="db-action-title">
                  {(isState(DASHBOARD_STATES.NO_DOCUMENT) || isState(DASHBOARD_STATES.DOCUMENT_UPLOADED)) && 'Upload Study Material'}
                  {isState(DASHBOARD_STATES.SURVEY_READY) && 'Prerequisite Survey'}
                  {isState(DASHBOARD_STATES.SURVEY_COMPLETED) && 'Adaptive Quiz Ready'}
                  {isState(DASHBOARD_STATES.QUIZ_IN_PROGRESS) && (currentQuiz?.isPrerequisiteSurvey ? 'Survey in Progress' : 'Adaptive Quiz')}
                  {isState(DASHBOARD_STATES.QUIZ_COMPLETED) && 'Analysis Ready'}
                </h2>
                <p className="db-action-sub">
                  {isState(DASHBOARD_STATES.NO_DOCUMENT) && 'Start by uploading a PDF or text file'}
                  {isState(DASHBOARD_STATES.DOCUMENT_UPLOADED) && 'Select a file, then generate assessment'}
                  {isState(DASHBOARD_STATES.SURVEY_READY) && 'Initial baseline survey is ready'}
                  {isState(DASHBOARD_STATES.SURVEY_COMPLETED) && 'Baseline established · Learning path ready'}
                  {isState(DASHBOARD_STATES.QUIZ_IN_PROGRESS) && (currentQuiz?.isPrerequisiteSurvey ? 'Establishing your knowledge baseline...' : 'Targeted learning session active...')}
                  {isState(DASHBOARD_STATES.QUIZ_COMPLETED) && 'Great work · View your SWOT analysis'}
                </p>
              </div>
            </div>

            {(isState(DASHBOARD_STATES.NO_DOCUMENT) || isState(DASHBOARD_STATES.DOCUMENT_UPLOADED)) && (
              <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                {/* Segmented tab control */}
                <div style={{
                  display: 'flex',
                  background: 'var(--color-bg-secondary)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '10px',
                  padding: '3px',
                  gap: '3px'
                }}>
                  {[
                    { key: 'upload', icon: <Upload size={13} />, label: 'Upload File' },
                    { key: 'paste', icon: <FileText size={13} />, label: 'Paste Text' }
                  ].map(tab => (
                    <button
                      key={tab.key}
                      onClick={() => setInputMode(tab.key)}
                      style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.4rem',
                        padding: '0.5rem 1rem',
                        border: 'none',
                        borderRadius: '7px',
                        background: inputMode === tab.key ? 'var(--color-bg-elevated)' : 'transparent',
                        color: inputMode === tab.key ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                        fontWeight: inputMode === tab.key ? '600' : '400',
                        fontSize: '0.8125rem',
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        boxShadow: inputMode === tab.key ? '0 1px 3px rgba(0,0,0,0.12), 0 0 0 1px var(--color-border)' : 'none',
                        transition: 'all 0.15s ease',
                        letterSpacing: '0.01em'
                      }}
                    >
                      {tab.icon}{tab.label}
                    </button>
                  ))}
                </div>

                {/* Upload zone */}
                {inputMode === 'upload' ? (
                  <label htmlFor="file-upload" style={{ cursor: isProcessing ? 'not-allowed' : 'pointer', display: 'block' }}>
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.6rem',
                      padding: '2.25rem 1.5rem',
                      border: `2px dashed ${selectedFile ? 'var(--color-accent)' : 'var(--color-border)'}`,
                      borderRadius: '14px',
                      background: selectedFile ? 'rgba(99,102,241,0.04)' : 'var(--color-bg-secondary)',
                      textAlign: 'center',
                      transition: 'all 0.2s ease',
                    }}
                      onMouseEnter={e => { if (!selectedFile) { e.currentTarget.style.borderColor = 'var(--color-accent)'; e.currentTarget.style.background = 'rgba(99,102,241,0.04)'; }}}
                      onMouseLeave={e => { if (!selectedFile) { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.background = 'var(--color-bg-secondary)'; }}}
                    >
                      <div style={{ color: selectedFile ? 'var(--color-accent)' : 'var(--color-text-muted)', lineHeight: 0 }}>
                        {isProcessing ? <Loader2 size={28} className="processing-spinner" />
                          : selectedFile && isImageFile(selectedFile) ? <Camera size={28} />
                          : selectedFile ? <FileText size={28} />
                          : <Upload size={28} />}
                      </div>
                      <div>
                        <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-text-primary)', lineHeight: 1.4 }}>
                          {isProcessing ? 'Processing...' : selectedFile ? selectedFile.name : 'Click to upload a file'}
                        </p>
                        <p style={{ margin: '0.25rem 0 0', fontSize: '0.72rem', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
                          {selectedFile
                            ? `${(selectedFile.size / 1024).toFixed(1)} KB${isImageFile(selectedFile) ? ' · OCR enabled ✨' : ''}`
                            : 'PDF · TXT · JPG/PNG · DOCX — Max 25 MB'}
                        </p>
                      </div>
                    </div>
                    <input id="file-upload" type="file" accept=".pdf,.txt,.jpg,.jpeg,.png,.webp,.docx"
                      onChange={handleFileSelect} disabled={isProcessing} style={{ display: 'none' }} />
                  </label>
                ) : (
                  <div>
                    <textarea
                      placeholder="Paste your notes, article, or study material here (min 100 characters)…"
                      value={pastedText}
                      onChange={(e) => setPastedText(e.target.value)}
                      disabled={isProcessing}
                      style={{
                        width: '100%',
                        minHeight: '160px',
                        maxHeight: '380px',
                        background: 'var(--color-bg-secondary)',
                        border: '1.5px solid var(--color-border)',
                        borderRadius: '12px',
                        padding: '1rem 1.125rem',
                        color: 'var(--color-text-primary)',
                        fontFamily: 'inherit',
                        fontSize: '0.875rem',
                        lineHeight: '1.7',
                        resize: 'vertical',
                        boxSizing: 'border-box',
                        outline: 'none',
                        transition: 'border-color 0.2s ease',
                      }}
                      onFocus={e => { e.target.style.borderColor = 'var(--color-accent)'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.12)'; }}
                      onBlur={e => { e.target.style.borderColor = 'var(--color-border)'; e.target.style.boxShadow = 'none'; }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: '0.35rem' }}>
                      {pastedText.length} / 100 min chars
                    </div>
                  </div>
                )}

                {/* Generate button */}
                <button
                  onClick={handleUpload}
                  disabled={(inputMode === 'upload' && !selectedFile) || (inputMode === 'paste' && pastedText.length < 100) || isProcessing}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    width: '100%',
                    padding: '0.9rem 1.5rem',
                    border: 'none',
                    borderRadius: '12px',
                    fontFamily: 'inherit',
                    fontSize: '0.9375rem',
                    fontWeight: 600,
                    letterSpacing: '0.01em',
                    cursor: ((inputMode === 'upload' && !selectedFile) || (inputMode === 'paste' && pastedText.length < 100) || isProcessing) ? 'not-allowed' : 'pointer',
                    background: ((inputMode === 'upload' && !selectedFile) || (inputMode === 'paste' && pastedText.length < 100) || isProcessing)
                      ? 'var(--color-bg-elevated)'
                      : 'linear-gradient(135deg, #6366f1 0%, #9333ea 100%)',
                    color: ((inputMode === 'upload' && !selectedFile) || (inputMode === 'paste' && pastedText.length < 100) || isProcessing)
                      ? 'var(--color-text-muted)'
                      : '#fff',
                    boxShadow: ((inputMode === 'upload' && !selectedFile) || (inputMode === 'paste' && pastedText.length < 100) || isProcessing)
                      ? 'none'
                      : '0 4px 14px rgba(99,102,241,0.35)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <Sparkles size={16} />
                  {isProcessing ? processingStage || 'Processing…' : 'Generate Study Features'}
                </button>
              </div>
            )}

            {isState(DASHBOARD_STATES.SURVEY_READY) && (
              <div className="db-action-btns">
                {currentQuiz?.topicSummary?.length > 0 && (
                  <div className="db-topics-preview">
                    {currentQuiz.topicSummary.slice(0, 3).map((t, i) => (
                      <div key={i} className="db-topic-chip"><span className="db-topic-num">{i + 1}</span><span>{t.title}</span></div>
                    ))}
                    {currentQuiz.topicSummary.length > 3 && (
                      <div className="db-topic-chip db-topic-more">+{currentQuiz.topicSummary.length - 3} more</div>
                    )}
                  </div>
                )}
                <button className="btn btn-primary btn-icon" onClick={handleStartSurvey}>
                  <Target size={18} />Start Prerequisite Survey
                </button>
              </div>
            )}

            {isState(DASHBOARD_STATES.SURVEY_COMPLETED) && (
              <button className="btn btn-primary btn-icon db-main-btn" onClick={handleStartAdaptiveQuiz} disabled={isProcessing}>
                {isProcessing ? <><Loader2 className="processing-spinner" size={18}/> Generating...</> : <><Sparkles size={18}/>Start Adaptive Quiz</>}
              </button>
            )}

            {isState(DASHBOARD_STATES.QUIZ_IN_PROGRESS) && (
              <button className="btn btn-primary btn-icon db-main-btn" onClick={handleContinueQuiz}>
                <Play size={18}/>Continue Quiz
              </button>
            )}

            {isState(DASHBOARD_STATES.QUIZ_COMPLETED) && (
              <div className="db-action-btns">
                <button className="btn btn-primary btn-icon" onClick={() => navigate('/progress')}><BarChart3 size={18}/>View Results</button>
                <button className="btn btn-secondary btn-icon" onClick={handleStartAdaptiveQuiz} disabled={isProcessing}><RefreshCw size={18}/>New Quiz</button>
              </div>
            )}

            {!isState(DASHBOARD_STATES.NO_DOCUMENT) && (
              <div style={{ marginTop: '1.25rem', display: 'flex', justifyContent: 'center', gap: '0.75rem', position: 'relative' }}>
                <button className="db-new-session-btn" onClick={handleStartNewDocument} disabled={isProcessing}>
                  <RefreshCw size={13} /> New Document
                </button>
                
                <button 
                  className="db-new-session-btn" 
                  onClick={() => setShowSwitcher(!showSwitcher)}
                  style={{ background: 'transparent', border: '1px solid var(--color-border)', width: 'auto', padding: '0 1rem' }}
                  disabled={isProcessing}
                >
                  <History size={13} /> Switch Topic
                </button>

                {showSwitcher && (
                  <div style={{
                    position: 'absolute', top: '110%', left: '50%', transform: 'translateX(-50%)',
                    width: '260px', background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)',
                    borderRadius: '12px', boxShadow: '0 10px 30px -5px rgba(0,0,0,0.3)', zIndex: 1000,
                    overflow: 'hidden'
                  }}>
                    <div style={{ padding: '0.75rem', fontSize: '0.625rem', fontWeight: 800, color: 'var(--color-text-muted)', borderBottom: '1px solid var(--color-border)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Recent Study Contexts</div>
                    <div style={{ maxHeight: '220px', overflowY: 'auto' }}>
                      {allSessions.length === 0 ? (
                        <div style={{ padding: '1rem', textAlign: 'center', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>No previous documents</div>
                      ) : (
                        allSessions.map(session => (
                          <button
                            key={session.id}
                            onClick={() => handleRestoreSession(session.id)}
                            style={{
                              width: '100%', padding: '0.75rem 1rem', border: 'none', background: 'transparent',
                              display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', textAlign: 'left',
                              transition: 'background 0.2s', borderBottom: '1px solid rgba(255,255,255,0.02)'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(124, 58, 237, 0.05)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                          >
                            <BookOpen size={13} color="var(--color-accent)" />
                            <span style={{ fontSize: '0.78rem', color: 'var(--color-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{session.documentName}</span>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Step Progress Tracker */}
          <div className="db-steps">
            {[
              { label: 'Upload', done: isStateAtLeast(DASHBOARD_STATES.SURVEY_READY) },
              { label: 'Survey', done: isStateAtLeast(DASHBOARD_STATES.SURVEY_COMPLETED) },
              { label: 'Quiz', done: isStateAtLeast(DASHBOARD_STATES.QUIZ_COMPLETED) },
              { label: 'Results', done: isState(DASHBOARD_STATES.QUIZ_COMPLETED) },
            ].map((step, i, arr) => (
              <div key={i} className="db-step">
                <div className={`db-step-dot ${step.done ? 'done' : ''}`}>
                  {step.done ? <CheckCircle2 size={12} /> : <span>{i + 1}</span>}
                </div>
                <span className={`db-step-label ${step.done ? 'done' : ''}`}>{step.label}</span>
                {i < arr.length - 1 && <div className={`db-step-line ${step.done ? 'done' : ''}`} />}
              </div>
            ))}
          </div>

          <div className="db-gamification-wrap"><Gamification /></div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="db-col-right">

          <div className="db-feature-grid">
            <Link to="/ai-tutor" className="db-feature-card">
              <div className="db-feature-icon"><MessageSquare size={20}/></div>
              <div><div className="db-feature-name">AI Tutor</div><div className="db-feature-desc">Ask questions about your material</div></div>
            </Link>
            <Link to="/flashcards" className="db-feature-card">
              <div className="db-feature-icon"><CreditCard size={20}/></div>
              <div><div className="db-feature-name">Flashcards</div><div className="db-feature-desc">Auto-generated study cards</div></div>
            </Link>
            <Link to="/study-planner" className="db-feature-card">
              <div className="db-feature-icon"><CalendarDays size={20}/></div>
              <div><div className="db-feature-name">Study Planner</div><div className="db-feature-desc">Day-by-day schedule</div></div>
            </Link>
            <Link to="/leaderboard" className="db-feature-card">
              <div className="db-feature-icon"><Trophy size={20}/></div>
              <div><div className="db-feature-name">Leaderboard</div><div className="db-feature-desc">Your XP ranking</div></div>
            </Link>
          </div>

          <div className="db-insights-panel">
            <div className="db-panel-header">
              <Activity size={18}/><h3>Learning Insights</h3>
              {isStateAtLeast(DASHBOARD_STATES.SURVEY_COMPLETED) && <span className="db-panel-badge">Active</span>}
            </div>
            {!isStateAtLeast(DASHBOARD_STATES.SURVEY_COMPLETED) ? (
              <div className="db-locked-state">
                <Lock size={32}/>
                <p>Complete the prerequisite survey to unlock personalized insights</p>
              </div>
            ) : currentQuiz?.studyGuidance ? (
              <div className="db-guidance-rows">
                <div className="db-guidance-row">
                  <span className="db-g-label">Learner Level</span>
                  <span className="db-level-badge">{currentQuiz.studyGuidance.learnerLevel}</span>
                </div>
                <div className="db-guidance-row">
                  <span className="db-g-label">Study Time</span>
                  <span className="db-g-value"><Clock size={13}/>{currentQuiz.studyGuidance.studyDuration}</span>
                </div>
                <div className="db-guidance-row db-guidance-topics">
                  <span className="db-g-label">Focus Areas</span>
                  <div className="db-topic-tags">
                    {currentQuiz.studyGuidance.priorityTopics.map((t,i) => <span key={i} className="db-topic-tag">{t}</span>)}
                  </div>
                </div>
                <div className="db-next-action"><Lightbulb size={14}/><p>{currentQuiz.studyGuidance.nextAction}</p></div>
              </div>
            ) : (
              <div className="db-locked-state">
                <Sparkles size={28}/>
                <p>
                  {isState(DASHBOARD_STATES.SURVEY_COMPLETED) && 'Generating your personalized guidance...'}
                  {isState(DASHBOARD_STATES.QUIZ_IN_PROGRESS) && 'Insights will update as you complete the quiz.'}
                  {isState(DASHBOARD_STATES.QUIZ_COMPLETED) && 'Check your full analysis in Results.'}
                </p>
              </div>
            )}
          </div>

          {isStateAtLeast(DASHBOARD_STATES.SURVEY_COMPLETED) && (
            <div className="db-perf-card" onClick={() => navigate('/progress')} style={{ cursor: 'pointer' }}>
              <div className="db-perf-icon"><BarChart3 size={18}/></div>
              <div>
                <div className="db-perf-title">{isState(DASHBOARD_STATES.QUIZ_COMPLETED) ? 'View Full Results' : 'Performance Tracking Active'}</div>
                <div className="db-perf-sub">{isState(DASHBOARD_STATES.QUIZ_COMPLETED) ? 'SWOT analysis and breakdown ready' : 'Complete a quiz to generate your report'}</div>
              </div>
              <TrendingUp size={18} style={{ marginLeft: 'auto', color: 'var(--color-accent)' }}/>
            </div>
          )}

          {/* Intelligence Hub / Recent Sessions Quick Access */}
          {allSessions.length > 0 && (
            <div style={{
              background: 'var(--color-bg-card)',
              border: '1px solid var(--color-border)',
              borderRadius: '20px',
              padding: '1.25rem',
              backdropFilter: 'blur(12px)',
              boxShadow: 'var(--shadow-md)',
              marginTop: '1.5rem'
            }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <History size={16} style={{ color: 'var(--color-accent)' }} />
                  <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-text-primary)', letterSpacing: '-0.01em' }}>
                    Intelligence Hub
                  </h3>
                </div>
                <Link to="/progress" style={{
                  fontSize: '0.75rem',
                  color: 'var(--color-accent)',
                  textDecoration: 'none',
                  fontWeight: 500,
                  opacity: 0.8
                }}>
                  View all →
                </Link>
              </div>

              {/* List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {allSessions.slice(0, 3).map((session, i) => {
                  const isActive = session.documentName === getActiveContextName()
                  return (
                    <button
                      key={session.id}
                      onClick={() => handleRestoreSession(session.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '1rem',
                        padding: '0.875rem',
                        background: 'var(--color-bg-secondary)',
                        border: isActive ? '1px solid var(--color-accent)' : '1px solid var(--color-border)',
                        borderRadius: '14px',
                        cursor: 'pointer',
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                        textAlign: 'left'
                      }}
                      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = 'var(--color-accent)'; }}
                      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = isActive ? 'var(--color-accent)' : 'var(--color-border)'; }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', overflow: 'hidden', flex: 1 }}>
                        <div style={{ 
                          width: 32, height: 32, borderRadius: '8px', flexShrink: 0,
                          background: isActive ? 'var(--color-accent)' : 'var(--color-bg-elevated)', 
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: isActive ? '#fff' : 'var(--color-text-muted)' 
                        }}>
                          <BookOpen size={16} />
                        </div>
                        <div style={{ overflow: 'hidden' }}>
                          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {session.documentName}
                          </div>
                          <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', marginTop: '0.1rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <History size={10} /> 
                            {new Date(session.updatedAt || session.id).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                            {isActive && <span style={{ color: 'var(--color-accent)', fontWeight: 800, marginLeft: '0.3rem' }}>· ACTIVE</span>}
                          </div>
                        </div>
                      </div>
                      
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--color-text-primary)' }}>
                          {session.lastStats?.accuracy || 0}%
                        </div>
                        <div style={{ fontSize: '0.6rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Accuracy</div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {showNewDocModal && (
        <div className="modal-overlay" onClick={handleCancelNewDocument}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Start a new document?</h3>
              <button className="modal-close" onClick={handleCancelNewDocument}><X size={20}/></button>
            </div>
            <div className="modal-body">
              <p>Your current session will be archived and can be restored anytime.</p>
              <div className="modal-info"><AlertCircle size={16}/><span>All progress and quiz results will be preserved.</span></div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={handleCancelNewDocument} disabled={isProcessing}>Cancel</button>
              <button className="btn btn-primary btn-icon" onClick={handleConfirmNewDocument} disabled={isProcessing}>
                {isProcessing ? <><Loader2 className="processing-spinner" size={16}/>Archiving...</> : <><RefreshCw size={16}/>Archive & Start New</>}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
    </div>
  )
}

export default Dashboard
