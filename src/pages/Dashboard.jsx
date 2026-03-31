import { useState, useEffect } from 'react'
import { signOut } from 'firebase/auth'
import { auth } from '../firebase'
import { useNavigate, Link } from 'react-router-dom'
import { extractTextFromFile } from '../services/pdfService'
import { generatePrerequisiteSurvey, generateStudyGuidance, generateAdaptiveQuiz, generateTopicWiseSummary } from '../services/geminiService'
import { saveCurrentQuiz, getCurrentQuiz, archiveCurrentSession } from '../services/storageService'
import { initializeUserStats } from '../services/gamificationService'
import Gamification from '../components/Gamification'
import Sidebar from '../components/Sidebar'
import GamificationSummary from '../components/GamificationSummary'
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
  Trophy
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
    const loadQuizData = async () => {
      try {
        setIsLoading(true)

        // Initialize gamification stats for user
        if (user?.uid) {
          await initializeUserStats(user.uid)
        }

        const quiz = await getCurrentQuiz()
        setCurrentQuiz(quiz)

        // Determine dashboard state based on quiz data
        if (!quiz) {
          setDashboardState(DASHBOARD_STATES.NO_DOCUMENT)
        } else if (quiz.questions && quiz.questions.length > 0) {
          // Check if survey was completed
          if (quiz.userAnswers && Object.keys(quiz.userAnswers).length > 0) {
            // Check if it's a prerequisite survey or adaptive quiz
            if (quiz.isPrerequisiteSurvey) {
              setDashboardState(DASHBOARD_STATES.SURVEY_COMPLETED)
            } else {
              // Adaptive quiz in progress or completed
              const allAnswered = Object.keys(quiz.userAnswers).length === quiz.questions.length
              if (allAnswered) {
                setDashboardState(DASHBOARD_STATES.QUIZ_COMPLETED)
              } else {
                setDashboardState(DASHBOARD_STATES.QUIZ_IN_PROGRESS)
              }
            }
          } else {
            // Survey generated but not taken
            setDashboardState(DASHBOARD_STATES.SURVEY_READY)
          }
        }
      } catch (error) {
        console.error('Error loading quiz data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadQuizData()
  }, [])

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
    setError('')
    setSuccess('')
  }

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select a file first')
      return
    }

    setIsProcessing(true)
    setError('')
    setSuccess('')
    setProcessingStage('Extracting text from document...')

    try {
      const extractedText = await extractTextFromFile(selectedFile)

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
        documentName: selectedFile.name,
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
      console.log('Starting adaptive quiz generation...')
      setIsProcessing(true)
      setProcessingStage('Generating adaptive quiz based on your performance...')
      setError('')

      // Verify we have study guidance
      if (!currentQuiz?.studyGuidance) {
        setError('Study guidance not available. Please complete the survey first.')
        setIsProcessing(false)
        return
      }

      // Get survey data
      const surveyQuestions = currentQuiz.questions
      const surveyAnswers = currentQuiz.userAnswers

      // Generate adaptive quiz
      const adaptiveQuestions = await generateAdaptiveQuiz(
        currentQuiz.documentText,
        surveyQuestions,
        surveyAnswers,
        currentQuiz.studyGuidance
      )

      if (!adaptiveQuestions || adaptiveQuestions.length === 0) {
        throw new Error('No questions generated')
      }

      // Save adaptive quiz (replace survey with adaptive quiz)
      await saveCurrentQuiz({
        documentName: currentQuiz.documentName,
        documentText: currentQuiz.documentText,
        questions: adaptiveQuestions,
        isPrerequisiteSurvey: false, // This is the actual quiz
        studyGuidance: currentQuiz.studyGuidance, // Keep guidance for reference
        userAnswers: {}, // Reset answers
        completedAt: null // Not completed yet
      })

      setSuccess('Adaptive quiz generated! Starting quiz...')

      // Navigate to quiz page
      setTimeout(() => {
        navigate('/quiz')
      }, 1000)
    } catch (error) {
      console.error('Error generating adaptive quiz:', error)
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
      setProcessingStage('Archiving current session...')

      // Archive current session
      await archiveCurrentSession()

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
          <h1 className="db-title">Dashboard</h1>
          <span className="db-state-pill">
            {isState(DASHBOARD_STATES.NO_DOCUMENT) && 'Getting Started'}
            {isState(DASHBOARD_STATES.SURVEY_READY) && 'Survey Ready'}
            {isState(DASHBOARD_STATES.DOCUMENT_UPLOADED) && 'Document Loaded'}
            {isState(DASHBOARD_STATES.SURVEY_COMPLETED) && 'Baseline Set'}
            {isState(DASHBOARD_STATES.QUIZ_IN_PROGRESS) && 'Quiz Active'}
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
                  {isState(DASHBOARD_STATES.SURVEY_READY) && 'Survey Generated'}
                  {isState(DASHBOARD_STATES.SURVEY_COMPLETED) && 'Ready for Quiz'}
                  {isState(DASHBOARD_STATES.QUIZ_IN_PROGRESS) && 'Quiz in Progress'}
                  {isState(DASHBOARD_STATES.QUIZ_COMPLETED) && 'Quiz Complete'}
                </h2>
                <p className="db-action-sub">
                  {isState(DASHBOARD_STATES.NO_DOCUMENT) && 'Start by uploading a PDF or text file'}
                  {isState(DASHBOARD_STATES.DOCUMENT_UPLOADED) && 'Select a file, then generate survey'}
                  {isState(DASHBOARD_STATES.SURVEY_READY) && 'Prerequisite assessment is ready'}
                  {isState(DASHBOARD_STATES.SURVEY_COMPLETED) && 'Baseline established · Adaptive quiz ready'}
                  {isState(DASHBOARD_STATES.QUIZ_IN_PROGRESS) && (currentQuiz?.userAnswers ? `${Object.keys(currentQuiz.userAnswers).length} / ${currentQuiz.questions.length} answered` : 'Continue where you left off')}
                  {isState(DASHBOARD_STATES.QUIZ_COMPLETED) && 'Great work · View your results'}
                </p>
              </div>
            </div>

            {(isState(DASHBOARD_STATES.NO_DOCUMENT) || isState(DASHBOARD_STATES.DOCUMENT_UPLOADED)) && (
              <div className="db-upload-zone">
                <label htmlFor="file-upload" className="db-upload-label">
                  <div className="db-upload-inner">
                    {isProcessing ? <Loader2 className="processing-spinner" size={28} />
                     : selectedFile ? <FileText size={28} style={{ color: 'var(--color-accent)' }} />
                     : <Upload size={28} />}
                    <div>
                      <p className="db-upload-text">
                        {isProcessing ? 'Processing...' : selectedFile ? selectedFile.name : 'Click to choose file'}
                      </p>
                      <p className="db-upload-hint">
                        {selectedFile ? `${(selectedFile.size / 1024).toFixed(1)} KB` : 'PDF or TXT · Max 10 MB'}
                      </p>
                    </div>
                  </div>
                  <input id="file-upload" type="file" accept=".pdf,.txt"
                    onChange={handleFileSelect} disabled={isProcessing} style={{ display: 'none' }} />
                </label>
                <button className="btn btn-primary btn-icon db-upload-btn"
                  onClick={handleUpload} disabled={!selectedFile || isProcessing}>
                  <Sparkles size={18} />{isProcessing ? 'Generating Survey...' : 'Generate Survey'}
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
              <button className="db-new-session-btn" onClick={handleStartNewDocument} disabled={isProcessing}>
                <RefreshCw size={13}/>New Document
              </button>
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
