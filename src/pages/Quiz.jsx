import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCurrentQuiz, saveCurrentQuiz, saveQuizResults } from '../services/storageService'
import { generateStudyGuidance } from '../services/geminiService'
import { awardSurveyXP, awardQuizXP } from '../services/gamificationService'
import { ArrowLeft, ArrowRight, Check, Circle, Sun, Moon } from 'lucide-react'

function Quiz() {
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [selectedAnswers, setSelectedAnswers] = useState({})
  const [quizData, setQuizData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const navigate = useNavigate()

  // Theme management
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'dark'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'dark' ? 'light' : 'dark')
  }

  useEffect(() => {
    const loadQuiz = async () => {
      try {
        // Load quiz from Firestore
        const quiz = await getCurrentQuiz()

        if (!quiz || !quiz.questions || quiz.questions.length === 0) {
          // No quiz available, redirect to dashboard
          setTimeout(() => {
            navigate('/dashboard')
          }, 100)
          return
        }

        setQuizData(quiz)
      } catch (error) {
        console.error('Error loading quiz:', error)
        navigate('/dashboard')
      } finally {
        setLoading(false)
      }
    }

    loadQuiz()
  }, [navigate])

  if (loading || !quizData) {
    return (
      <div className="quiz-page">
        <div className="quiz-container">
          <div className="loading-state">
            <Circle className="loading-spinner" size={32} />
            <p>Loading quiz...</p>
          </div>
        </div>
      </div>
    )
  }

  const questions = quizData.questions
  const totalQuestions = questions.length
  const currentQ = questions[currentQuestion]
  const isLastQuestion = currentQuestion === totalQuestions - 1
  const isFirstQuestion = currentQuestion === 0

  const handleOptionSelect = (optionIndex) => {
    setSelectedAnswers({
      ...selectedAnswers,
      [currentQuestion]: optionIndex
    })
  }

  const handleNext = () => {
    if (currentQuestion < totalQuestions - 1) {
      setCurrentQuestion(currentQuestion + 1)
    }
  }

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1)
    }
  }

  const handleSubmit = async () => {
    try {
      setSubmitting(true)

      // Calculate score
      let correct = 0
      questions.forEach((q, index) => {
        if (selectedAnswers[index] === q.correctAnswer) {
          correct++
        }
      })

      // Check if this is a prerequisite survey
      const isPrerequisiteSurvey = quizData.isPrerequisiteSurvey

      // Update quiz data with user answers
      const updatedQuiz = {
        ...quizData,
        userAnswers: selectedAnswers,
        completedAt: new Date().toISOString()
      }

      // If prerequisite survey, generate study guidance
      if (isPrerequisiteSurvey && quizData.documentText) {
        try {
          const guidance = await generateStudyGuidance(
            quizData.documentText,
            questions,
            selectedAnswers
          )
          updatedQuiz.studyGuidance = guidance
        } catch (error) {
          console.error('Error generating study guidance:', error)
          // Continue without guidance if generation fails
        }
      }

      // Save updated quiz to Firestore
      await saveCurrentQuiz(updatedQuiz)

      // GAMIFICATION: Award XP
      if (isPrerequisiteSurvey) {
        await awardSurveyXP() // +10 XP + First Steps badge
      }

      // If this is a prerequisite survey, go back to dashboard to show guidance
      if (isPrerequisiteSurvey) {
        navigate('/dashboard')
        return
      }

      // For regular quizzes, save results and go to progress page
      const results = {
        score: correct,
        total: totalQuestions,
        accuracy: Math.round((correct / totalQuestions) * 100),
        answers: selectedAnswers,
        questions: questions,
        documentName: quizData.documentName,
        completedAt: new Date().toISOString()
      }

      await saveQuizResults(results)

      // GAMIFICATION: Award quiz XP (+50 XP, +20 bonus if perfect)
      await awardQuizXP(correct, totalQuestions)

      // Also store in localStorage for immediate access on results page
      localStorage.setItem('quizResults', JSON.stringify(results))

      navigate('/progress')
    } catch (error) {
      console.error('Error submitting quiz:', error)
      alert('Failed to submit quiz. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const progressPercentage = ((currentQuestion + 1) / totalQuestions) * 100
  const answeredCount = Object.keys(selectedAnswers).length
  const currentAnswer = selectedAnswers[currentQuestion]

  return (
    <div className="quiz-page fade-in">
      <div className="quiz-container-minimal">

        {/* Minimal Header */}
        <div className="quiz-header-minimal">
          <button
            onClick={() => navigate('/dashboard')}
            className="btn-minimal"
          >
            <ArrowLeft size={20} />
            Dashboard
          </button>
          <div className="quiz-meta">
            <span className="quiz-type-badge">
              {quizData.isPrerequisiteSurvey ? 'Prerequisite Survey' : 'Quiz'}
            </span>
            <button
              onClick={toggleTheme}
              className="theme-toggle"
              aria-label="Toggle theme"
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>
        </div>

        {/* Progress Indicator */}
        <div className="quiz-progress-minimal">
          <div className="progress-dots">
            {questions.map((_, index) => (
              <div
                key={index}
                className={`progress-dot ${index === currentQuestion ? 'active' : ''
                  } ${selectedAnswers[index] !== undefined ? 'answered' : ''
                  }`}
              />
            ))}
          </div>
          <div className="progress-text-minimal">
            Question {currentQuestion + 1} of {totalQuestions}
          </div>
        </div>

        {/* Question Card - Minimal */}
        <div className="quiz-question-minimal slide-up" key={currentQuestion}>
          <h2 className="question-text-minimal">
            {currentQ.question}
          </h2>

          {/* Options - Clean Grid */}
          <div className="quiz-options-grid">
            {currentQ.options.map((option, index) => (
              <button
                key={index}
                className={`quiz-option-minimal ${currentAnswer === index ? 'selected' : ''
                  }`}
                onClick={() => handleOptionSelect(index)}
              >
                <div className="option-indicator">
                  {currentAnswer === index ? (
                    <Check size={16} />
                  ) : (
                    <span className="option-letter">
                      {String.fromCharCode(65 + index)}
                    </span>
                  )}
                </div>
                <span className="option-text">{option}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Navigation - Minimal */}
        <div className="quiz-navigation-minimal">
          <button
            onClick={handlePrevious}
            className="btn btn-secondary btn-icon"
            disabled={isFirstQuestion}
          >
            <ArrowLeft size={18} />
            Previous
          </button>

          <div className="nav-center-info">
            <span className="answered-count">
              {answeredCount}/{totalQuestions} answered
            </span>
          </div>

          {isLastQuestion ? (
            <button
              onClick={handleSubmit}
              className="btn btn-primary btn-icon"
              disabled={answeredCount < totalQuestions}
            >
              <Check size={18} />
              Submit
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="btn btn-primary btn-icon"
            >
              Next
              <ArrowRight size={18} />
            </button>
          )}
        </div>

      </div>
    </div>
  )
}

export default Quiz
