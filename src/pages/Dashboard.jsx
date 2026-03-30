import { useState, useEffect } from 'react'
import { signOut } from 'firebase/auth'
import { auth } from '../firebase'
import { useNavigate } from 'react-router-dom'
import { extractTextFromFile } from '../services/pdfService'
import { generatePrerequisiteSurvey, generateStudyGuidance, generateAdaptiveQuiz, generateTopicWiseSummary } from '../services/geminiService'
import { saveCurrentQuiz, getCurrentQuiz, archiveCurrentSession } from '../services/storageService'
import { initializeUserStats } from '../services/gamificationService'
import Gamification from '../components/Gamification'
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
  Moon
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
    <div className="dashboard fade-in">
      {/* Header */}
      <div className="dashboard-header">
        <div className="dashboard-header-content">
          <div className="dashboard-greeting">
            <h1 className="greeting-title">
              <Brain size={28} />
              Learning Dashboard
            </h1>
            <p className="greeting-subtitle">
              Track your progress and adaptive learning insights
            </p>
          </div>

          <div className="dashboard-user">
            <GamificationSummary />
            <div className="user-avatar">
              <User size={20} />
            </div>
            <button
              onClick={toggleTheme}
              className="theme-toggle"
              aria-label="Toggle theme"
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button onClick={handleLogout} className="btn btn-secondary btn-icon">
              <LogOut size={18} />
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="dashboard-content">

        {/* Error/Success Messages */}
        {error && (
          <div className="alert alert-error slide-up mb-lg">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        {success && !error && (
          <div className="alert alert-success slide-up mb-lg">
            <CheckCircle2 size={20} />
            <span>{success}</span>
          </div>
        )}

        {/* AI Processing State */}
        {isProcessing && (
          <div className="processing-banner slide-up mb-lg">
            <Loader2 className="processing-spinner" size={20} />
            <span>{processingStage}</span>
          </div>
        )}

        {/* Dashboard Grid Layout */}
        <div className="dashboard-grid">

          {/* Section 1: Learning Overview */}
          <div className={`dashboard-section ${isStateAtLeast(DASHBOARD_STATES.SURVEY_COMPLETED) ? 'section-unlocked' : ''}`}>
            <div className="section-header">
              <BookOpen size={24} />
              <h2>Learning Overview</h2>
              {isStateAtLeast(DASHBOARD_STATES.SURVEY_COMPLETED) && <span className="section-badge">Active</span>}
              {!isStateAtLeast(DASHBOARD_STATES.SURVEY_COMPLETED) && <Lock size={16} className="section-lock" />}
            </div>

            {!isStateAtLeast(DASHBOARD_STATES.SURVEY_COMPLETED) ? (
              <div className="empty-state">
                <div className="empty-icon">
                  <BookOpen size={48} />
                </div>
                <h3>No learning data yet</h3>
                <p>
                  {isState(DASHBOARD_STATES.NO_DOCUMENT) && 'Upload study material to begin'}
                  {isState(DASHBOARD_STATES.SURVEY_READY) && 'Complete the prerequisite survey to unlock'}
                  {isState(DASHBOARD_STATES.DOCUMENT_UPLOADED) && 'Generate and complete survey to unlock'}
                </p>
              </div>
            ) : (
              <div className="overview-content">
                <div className="stat-card">
                  <Clock size={20} />
                  <div>
                    <div className="stat-value">Just started</div>
                    <div className="stat-label">Learning Journey</div>
                  </div>
                </div>
                <div className="stat-card">
                  <Target size={20} />
                  <div>
                    <div className="stat-value">Baseline Established</div>
                    <div className="stat-label">Survey Complete</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Adaptive Learning Insights */}
          <div className={`dashboard-section ${isStateAtLeast(DASHBOARD_STATES.SURVEY_COMPLETED) ? 'section-unlocked' : ''}`}>
            <div className="section-header">
              <Activity size={24} />
              <h2>Adaptive Learning Insights</h2>
              {isStateAtLeast(DASHBOARD_STATES.SURVEY_COMPLETED) && <span className="section-badge">Active</span>}
              {!isStateAtLeast(DASHBOARD_STATES.SURVEY_COMPLETED) && <Lock size={16} className="section-lock" />}
            </div>

            {!isStateAtLeast(DASHBOARD_STATES.SURVEY_COMPLETED) ? (
              <div className="empty-state">
                <div className="empty-icon">
                  <Activity size={48} />
                </div>
                <h3>No insights available</h3>
                <p>
                  {isState(DASHBOARD_STATES.NO_DOCUMENT) && 'Upload study material to begin'}
                  {isState(DASHBOARD_STATES.SURVEY_READY) && 'Complete survey to receive personalized insights'}
                  {isState(DASHBOARD_STATES.DOCUMENT_UPLOADED) && 'Generate and complete survey to unlock insights'}
                </p>
              </div>
            ) : (
              <div className="insights-content">
                {/* Study Guidance Card */}
                {currentQuiz?.studyGuidance ? (
                  <div className="study-guidance-card">
                    <div className="guidance-header">
                      <Lightbulb size={24} />
                      <h3>Adaptive Study Guidance</h3>
                    </div>

                    <div className="guidance-content">
                      <div className="guidance-row">
                        <div className="guidance-label">Learner Level</div>
                        <div className="guidance-value level-badge">
                          {currentQuiz.studyGuidance.learnerLevel}
                        </div>
                      </div>

                      <div className="guidance-row">
                        <div className="guidance-label">Priority Topics</div>
                        <ul className="priority-topics-list">
                          {currentQuiz.studyGuidance.priorityTopics.map((topic, index) => (
                            <li key={index}>{topic}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="guidance-row">
                        <div className="guidance-label">Recommended Study Time</div>
                        <div className="guidance-value">
                          <Clock size={16} />
                          {currentQuiz.studyGuidance.studyDuration}
                        </div>
                      </div>

                      <div className="guidance-action">
                        <div className="guidance-label">Next Action</div>
                        <p className="next-action-text">{currentQuiz.studyGuidance.nextAction}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="insight-card">
                    <Sparkles size={20} />
                    <div>
                      <h4>Prerequisite Assessment Complete</h4>
                      <p>
                        {isState(DASHBOARD_STATES.SURVEY_COMPLETED) && 'Generating personalized study guidance...'}
                        {isState(DASHBOARD_STATES.QUIZ_IN_PROGRESS) && 'Adaptive learning in progress. Insights will update as you answer questions.'}
                        {isState(DASHBOARD_STATES.QUIZ_COMPLETED) && 'Quiz complete! View detailed performance analysis in results.'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section 3: Quiz Actions */}
          <div className="dashboard-section dashboard-section-primary">
            <div className="section-header">
              <Target size={24} />
              <h2>Quiz Actions</h2>
            </div>

            <div className="quiz-actions-content">

              {/* STATE 1 & 2: Upload Document */}
              {(isState(DASHBOARD_STATES.NO_DOCUMENT) || isState(DASHBOARD_STATES.DOCUMENT_UPLOADED)) && (
                <>
                  <label htmlFor="file-upload" className="upload-area-compact">
                    <div className="upload-content-compact">
                      <div className="upload-icon-wrapper">
                        {isProcessing ? (
                          <Loader2 className="processing-spinner" size={32} />
                        ) : selectedFile ? (
                          <FileText className="file-icon" size={32} />
                        ) : (
                          <Upload className="upload-icon-main" size={32} />
                        )}
                      </div>
                      <div className="upload-text-wrapper">
                        <p className="upload-text-compact">
                          {isProcessing
                            ? 'Processing document...'
                            : selectedFile
                              ? selectedFile.name
                              : 'Upload Document'}
                        </p>
                        <small className="upload-hint">
                          {selectedFile
                            ? `${(selectedFile.size / 1024).toFixed(1)} KB`
                            : 'PDF or TXT • Max 10MB'}
                        </small>
                      </div>
                    </div>
                    <input
                      id="file-upload"
                      type="file"
                      accept=".pdf,.txt"
                      onChange={handleFileSelect}
                      disabled={isProcessing}
                      style={{ display: 'none' }}
                    />
                  </label>

                  <button
                    className="btn btn-primary btn-large btn-icon mt-md"
                    onClick={handleUpload}
                    disabled={!selectedFile || isProcessing}
                  >
                    <Sparkles size={20} />
                    {isProcessing ? 'Generating...' : 'Generate Survey'}
                  </button>

                  {isState(DASHBOARD_STATES.NO_DOCUMENT) && (
                    <p className="state-guidance mt-md">
                      <AlertCircle size={16} />
                      Upload study material to begin
                    </p>
                  )}
                </>
              )}

              {/* STATE 2b: Survey Ready */}
              {isState(DASHBOARD_STATES.SURVEY_READY) && (
                <>
                  <div className="state-status-card">
                    <CheckCircle2 size={24} />
                    <div>
                      <h4>Survey Generated</h4>
                      <p>Prerequisite assessment pending</p>
                    </div>
                  </div>

                  {/* Topic-Wise Summary */}
                  {currentQuiz?.topicSummary && currentQuiz.topicSummary.length > 0 && (
                    <div className="topic-summary-container mt-lg">
                      <div className="topic-summary-header">
                        <BookOpen size={20} />
                        <h3>Document Overview</h3>
                      </div>
                      <p className="topic-summary-subtitle">
                        Key topics covered in this material
                      </p>
                      <div className="topics-grid">
                        {currentQuiz.topicSummary.map((topic, index) => (
                          <div key={index} className="topic-card">
                            <div className="topic-number">{index + 1}</div>
                            <h4 className="topic-title">{topic.title}</h4>
                            <p className="topic-summary">{topic.summary}</p>
                            {topic.keyPoints && topic.keyPoints.length > 0 && (
                              <ul className="topic-points">
                                {topic.keyPoints.map((point, i) => (
                                  <li key={i}>{point}</li>
                                ))}
                              </ul>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <button
                    className="btn btn-primary btn-large btn-icon mt-md"
                    onClick={handleStartSurvey}
                  >
                    <Target size={20} />
                    Start Survey
                  </button>
                </>
              )}

              {/* STATE 3: Survey Completed */}
              {isState(DASHBOARD_STATES.SURVEY_COMPLETED) && (
                <>
                  <div className="state-status-card success">
                    <CheckCircle2 size={24} />
                    <div>
                      <h4>Survey Complete</h4>
                      <p>Baseline established • Ready for adaptive quiz</p>
                    </div>
                  </div>
                  <button
                    className="btn btn-primary btn-large btn-icon mt-md"
                    onClick={handleStartAdaptiveQuiz}
                  >
                    <Play size={20} />
                    Start Adaptive Quiz
                  </button>
                </>
              )}

              {/* STATE 4: Quiz In Progress */}
              {isState(DASHBOARD_STATES.QUIZ_IN_PROGRESS) && (
                <>
                  <div className="state-status-card progress">
                    <Loader2 className="processing-spinner" size={24} />
                    <div>
                      <h4>Quiz In Progress</h4>
                      <p>
                        {currentQuiz && currentQuiz.userAnswers
                          ? `${Object.keys(currentQuiz.userAnswers).length}/${currentQuiz.questions.length} questions answered`
                          : 'Continue where you left off'}
                      </p>
                    </div>
                  </div>
                  <button
                    className="btn btn-primary btn-large btn-icon mt-md"
                    onClick={handleContinueQuiz}
                  >
                    <Play size={20} />
                    Continue Quiz
                  </button>
                </>
              )}

              {/* STATE 5: Quiz Completed */}
              {isState(DASHBOARD_STATES.QUIZ_COMPLETED) && (
                <>
                  <div className="state-status-card success">
                    <Award size={24} />
                    <div>
                      <h4>Quiz Complete</h4>
                      <p>View your performance analysis</p>
                    </div>
                  </div>
                  <button
                    className="btn btn-secondary btn-large btn-icon mt-md"
                    onClick={() => navigate('/progress')}
                  >
                    <BarChart3 size={20} />
                    View Results
                  </button>
                  <button
                    className="btn btn-primary btn-large btn-icon mt-sm"
                    onClick={handleStartAdaptiveQuiz}
                  >
                    <Play size={20} />
                    Start New Quiz
                  </button>
                </>
              )}

              {/* Start New Document - Visible when session is active */}
              {!isState(DASHBOARD_STATES.NO_DOCUMENT) && (
                <div className="new-document-divider">
                  <button
                    className="btn btn-secondary btn-outline btn-icon mt-xl"
                    onClick={handleStartNewDocument}
                    disabled={isProcessing}
                  >
                    <RefreshCw size={18} />
                    Start New Document
                  </button>
                </div>
              )}

            </div>
          </div>

          {/* Section 4: Performance Analysis */}
          <div className={`dashboard-section ${isStateAtLeast(DASHBOARD_STATES.SURVEY_COMPLETED) ? 'section-unlocked' : ''}`}>
            <div className="section-header">
              <BarChart3 size={24} />
              <h2>Performance Analysis</h2>
              {isStateAtLeast(DASHBOARD_STATES.SURVEY_COMPLETED) && <span className="section-badge">Active</span>}
              {!isStateAtLeast(DASHBOARD_STATES.SURVEY_COMPLETED) && <Lock size={16} className="section-lock" />}
            </div>

            {!isStateAtLeast(DASHBOARD_STATES.SURVEY_COMPLETED) ? (
              <div className="empty-state">
                <div className="empty-icon">
                  <BarChart3 size={48} />
                </div>
                <h3>No performance data</h3>
                <p>
                  {isState(DASHBOARD_STATES.NO_DOCUMENT) && 'Upload study material to begin'}
                  {isState(DASHBOARD_STATES.SURVEY_READY) && 'Quiz results and performance metrics will appear here'}
                  {isState(DASHBOARD_STATES.DOCUMENT_UPLOADED) && 'Complete survey to unlock performance tracking'}
                </p>
              </div>
            ) : (
              <div className="performance-content">
                <div className="performance-card">
                  <Award size={24} />
                  <div>
                    <h4>
                      {isState(DASHBOARD_STATES.SURVEY_COMPLETED) && 'Baseline Established'}
                      {isState(DASHBOARD_STATES.QUIZ_IN_PROGRESS) && 'Quiz In Progress'}
                      {isState(DASHBOARD_STATES.QUIZ_COMPLETED) && 'Performance Ready'}
                    </h4>
                    <p>
                      {isState(DASHBOARD_STATES.SURVEY_COMPLETED) && 'Performance tracking is now active. Start adaptive quiz to see metrics.'}
                      {isState(DASHBOARD_STATES.QUIZ_IN_PROGRESS) && 'Performance metrics will update as you complete the quiz.'}
                      {isState(DASHBOARD_STATES.QUIZ_COMPLETED) && 'View detailed analysis in the results page.'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Gamification Section */}
        <div className="mt-2xl">
          <Gamification />
        </div>

        {/* Info Section */}
        <div className="info-section mt-2xl">
          <div className="info-box">
            <div className="info-box-header">
              <Sparkles size={20} />
              <strong>Current Status: {dashboardState.replace(/_/g, ' ')}</strong>
            </div>
            <ol className="info-list">
              {isState(DASHBOARD_STATES.NO_DOCUMENT) && (
                <>
                  <li>✓ Upload your study document (PDF or TXT format)</li>
                  <li>○ AI will generate 5 prerequisite questions</li>
                  <li>○ Complete the survey to assess baseline knowledge</li>
                  <li>○ Dashboard sections will unlock with insights</li>
                </>
              )}
              {isState(DASHBOARD_STATES.SURVEY_READY) && (
                <>
                  <li>✓ Document uploaded and analyzed</li>
                  <li>✓ Prerequisite survey generated</li>
                  <li>→ Complete the survey to establish baseline</li>
                  <li>○ Unlock adaptive learning features</li>
                </>
              )}
              {isState(DASHBOARD_STATES.SURVEY_COMPLETED) && (
                <>
                  <li>✓ Document uploaded</li>
                  <li>✓ Prerequisite survey completed</li>
                  <li>✓ Baseline knowledge established</li>
                  <li>→ Start adaptive quiz for personalized learning</li>
                </>
              )}
              {isState(DASHBOARD_STATES.QUIZ_IN_PROGRESS) && (
                <>
                  <li>✓ Baseline established</li>
                  <li>→ Quiz in progress - continue answering</li>
                  <li>○ Complete quiz to see performance analysis</li>
                  <li>○ Unlock detailed insights and recommendations</li>
                </>
              )}
              {isState(DASHBOARD_STATES.QUIZ_COMPLETED) && (
                <>
                  <li>✓ Baseline established</li>
                  <li>✓ Quiz completed</li>
                  <li>→ View performance analysis and SWOT insights</li>
                  <li>○ Start new quiz for continued learning</li>
                </>
              )}
            </ol>
          </div>
        </div>

      </div>

      {/* Confirmation Modal for New Document */}
      {showNewDocModal && (
        <div className="modal-overlay" onClick={handleCancelNewDocument}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Start a new document?</h3>
              <button
                className="modal-close"
                onClick={handleCancelNewDocument}
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <p>Your current session will be saved and you can return to it later.</p>
              <div className="modal-info">
                <AlertCircle size={16} />
                <span>All progress, survey results, and quiz attempts will be preserved.</span>
              </div>
            </div>
            <div className="modal-actions">
              <button
                className="btn btn-secondary"
                onClick={handleCancelNewDocument}
                disabled={isProcessing}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary btn-icon"
                onClick={handleConfirmNewDocument}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="processing-spinner" size={18} />
                    Archiving...
                  </>
                ) : (
                  <>
                    <RefreshCw size={18} />
                    Start New
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

export default Dashboard
