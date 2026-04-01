import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '../firebase'
import { getCurrentQuiz, saveCurrentQuiz, saveQuizResults } from '../services/storageService'
import { generateStudyGuidance } from '../services/geminiService'
import { awardSurveyXP, awardQuizXP } from '../services/gamificationService'
import { ArrowLeft, ArrowRight, Check, Circle, Sun, Moon, Zap, BookOpen, Shield, Flame } from 'lucide-react'

// ─── Difficulty badge ──────────────────────────────────────────────────────────
const DIFFICULTY_CONFIG = {
    easy:   { label: 'Easy',   color: '#22c55e', icon: BookOpen },
    medium: { label: 'Medium', color: '#f59e0b', icon: Flame },
    hard:   { label: 'Hard',   color: '#ef4444', icon: Zap },
}

function DifficultyBadge({ level }) {
    const cfg = DIFFICULTY_CONFIG[level]
    if (!cfg) return null
    const Icon = cfg.icon
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
            fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.05em',
            textTransform: 'uppercase', padding: '0.2rem 0.6rem',
            borderRadius: '100px', border: `1px solid ${cfg.color}33`,
            background: `${cfg.color}18`, color: cfg.color,
            marginBottom: '0.75rem'
        }}>
            <Icon size={11} />
            {cfg.label}
        </span>
    )
}

function Quiz() {
    const [currentQuestion, setCurrentQuestion] = useState(0)
    const [selectedAnswers, setSelectedAnswers] = useState({})
    const [quizData, setQuizData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [isRecovery, setIsRecovery] = useState(false)
    const navigate = useNavigate()

    const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark')
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme)
        localStorage.setItem('theme', theme)
    }, [theme])

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (!user) {
                navigate('/login')
                return
            }
            try {
                const quiz = await getCurrentQuiz()
                if (!quiz || !quiz.questions || quiz.questions.length === 0) {
                    navigate('/dashboard')
                    return
                }
                setQuizData(quiz)
                setIsRecovery(!!quiz.isRecoveryQuiz)
                // documentText cached in Firestore via getCurrentQuiz — no localStorage needed
            } catch (error) {
                console.error('Error loading quiz:', error)
                navigate('/dashboard')
            } finally {
                setLoading(false)
            }
        })
        return () => unsubscribe()
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

    const questions = quizData.questions || []
    const totalQuestions = questions.length

    // Guard: no valid questions
    if (totalQuestions === 0) {
        navigate('/dashboard')
        return null
    }

    const currentQ = questions[currentQuestion] || {}
    const isPrerequisiteSurvey = !!quizData.isPrerequisiteSurvey  // must be in component scope — used in render
    const isLastQuestion = currentQuestion === totalQuestions - 1
    const isFirstQuestion = currentQuestion === 0
    const answeredCount = Object.keys(selectedAnswers).length
    const currentAnswer = selectedAnswers[currentQuestion]
    const progressPercentage = ((currentQuestion + 1) / totalQuestions) * 100

    // Running accuracy for dynamic difficulty display
    const correct = Object.entries(selectedAnswers).filter(([idx, ans]) =>
        questions[parseInt(idx)]?.correctAnswer === ans
    ).length
    const runningAccuracy = answeredCount > 0 ? Math.round((correct / answeredCount) * 100) : null

    const handleOptionSelect = (optionIndex) => {
        setSelectedAnswers({ ...selectedAnswers, [currentQuestion]: optionIndex })
    }

    const handleNext = () => {
        if (currentQuestion < totalQuestions - 1) setCurrentQuestion(currentQuestion + 1)
    }
    const handlePrevious = () => {
        if (currentQuestion > 0) setCurrentQuestion(currentQuestion - 1)
    }

    const handleSubmit = async () => {
        try {
            setSubmitting(true)
            let correct = 0
            questions.forEach((q, index) => {
                if (selectedAnswers[index] === q.correctAnswer) correct++
            })

            const isPrerequisiteSurvey = quizData.isPrerequisiteSurvey
            const updatedQuiz = {
                ...quizData,
                userAnswers: selectedAnswers,
                completedAt: new Date().toISOString()
            }

            if (isPrerequisiteSurvey && quizData.documentText) {
                try {
                    const guidance = await generateStudyGuidance(
                        quizData.documentText, questions, selectedAnswers
                    )
                    updatedQuiz.studyGuidance = guidance
                } catch (err) {
                    console.warn('Study guidance generation failed:', err.message)
                }
            }

            await saveCurrentQuiz(updatedQuiz)

            if (isPrerequisiteSurvey) {
                await awardSurveyXP()
                navigate('/dashboard')
                return
            }

            const results = {
                score: correct,
                total: totalQuestions,
                accuracy: Math.round((correct / totalQuestions) * 100),
                answers: selectedAnswers,
                questions,
                documentName: quizData.documentName,
                completedAt: new Date().toISOString(),
                isRecovery: isRecovery
            }

            await saveQuizResults(results)
            await awardQuizXP(correct, totalQuestions)
            navigate('/progress', { state: { results } })
        } catch (error) {
            console.error('Error submitting quiz:', error)
            alert('Failed to submit quiz. Please try again.')
        } finally {
            setSubmitting(false)
        }
    }

    // Adaptive notification based on current performance
    const getAdaptiveFeedback = () => {
        if (currentQuestion < 3) return null
        if (runningAccuracy >= 90) return { text: "CRUSHING IT! 🔥 Questions are scaling up.", color: "var(--color-accent)" }
        if (runningAccuracy <= 40) return { text: "Don't worry, AIVY is adjusting level... 🛡️", color: "var(--color-warning)" }
        return null
    }

    const adaptiveFeedback = getAdaptiveFeedback()

    return (
        <div className="quiz-page fade-in">
            <div className="quiz-container-minimal">

                {/* Header */}
                <div className="quiz-header-minimal">
                    <button onClick={() => navigate('/dashboard')} className="btn-minimal">
                        <ArrowLeft size={20} /> Dashboard
                    </button>
                    <div className="quiz-meta">
                        <span className="quiz-type-badge" style={{
                            background: isRecovery ? 'linear-gradient(135deg,#f59e0b,#d97706)' : undefined
                        }}>
                            {isRecovery ? '⚡ Recovery Quiz' :
                             quizData.isPrerequisiteSurvey ? 'Prerequisite Survey' : 'Adaptive Quiz'}
                        </span>
                        {/* Running accuracy pill */}
                        {runningAccuracy !== null && !isPrerequisiteSurvey && (
                            <span style={{
                                fontSize: '0.72rem', fontWeight: 700,
                                padding: '0.2rem 0.65rem', borderRadius: '100px',
                                background: runningAccuracy >= 70 ? '#22c55e18' : runningAccuracy >= 40 ? '#f59e0b18' : '#ef444418',
                                color: runningAccuracy >= 70 ? '#22c55e' : runningAccuracy >= 40 ? '#f59e0b' : '#ef4444',
                                border: `1px solid currentColor`
                            }}>
                                {runningAccuracy}% so far
                            </span>
                        )}
                        <button onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
                            className="theme-toggle" aria-label="Toggle theme">
                            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                        </button>
                    </div>
                </div>

                {/* Recovery Quiz notice */}
                {isRecovery && (
                    <div style={{
                        background: 'linear-gradient(135deg,#f59e0b15,#d9770615)',
                        border: '1px solid #f59e0b44',
                        borderRadius: '12px', padding: '0.85rem 1.25rem',
                        marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem',
                        fontSize: '0.85rem', color: '#f59e0b'
                    }}>
                        <Shield size={16} />
                        <span><strong>Smart Recovery Mode</strong> — These questions are personalised to reinforce the concepts you missed. Take your time!</span>
                    </div>
                )}

                {/* Progress dots */}
                <div className="quiz-progress-minimal">
                    <div className="progress-dots">
                        {questions.map((_, index) => (
                            <div key={index}
                                className={`progress-dot ${index === currentQuestion ? 'active' : ''
                                    } ${selectedAnswers[index] !== undefined ? 'answered' : ''}`}
                            />
                        ))}
                    </div>
                    <div className="progress-text-minimal">
                        Question {currentQuestion + 1} of {totalQuestions}
                    </div>
                </div>

                {/* Progress bar */}
                <div style={{
                    height: 3, background: 'var(--color-border)', borderRadius: 2,
                    marginBottom: '1.5rem', overflow: 'hidden'
                }}>
                    <div style={{
                        height: '100%', width: `${progressPercentage}%`,
                        background: 'linear-gradient(90deg, var(--color-accent), #a78bfa)',
                        borderRadius: 2, transition: 'width 0.4s ease'
                    }} />
                </div>

                {/* Question Card */}
                {adaptiveFeedback && (
                    <div className="adaptive-feedback-mini slide-up" style={{ color: adaptiveFeedback.color }}>
                        {adaptiveFeedback.text}
                    </div>
                )}

                <div className="quiz-question-minimal slide-up" key={currentQuestion}>
                    {/* Difficulty badge (Phase 6 — shown if question has difficulty tag) */}
                    {currentQ.difficulty && <DifficultyBadge level={currentQ.difficulty} />}

                    {/* Hint for recovery questions */}
                    {currentQ.hint && (
                        <div style={{
                            background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)',
                            borderRadius: '10px', padding: '0.6rem 0.9rem', marginBottom: '1rem',
                            fontSize: '0.82rem', color: 'var(--color-text-muted)',
                            display: 'flex', gap: '0.5rem', alignItems: 'flex-start'
                        }}>
                            <span style={{ color: '#f59e0b', fontSize: '0.9rem', marginTop: '0.05rem' }}>💡</span>
                            <span><strong>Hint:</strong> {currentQ.hint}</span>
                        </div>
                    )}

                    {/* Topic origin (recovery) */}
                    {currentQ.targetsConcept && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>
                            Reinforcing: <em>{currentQ.targetsConcept}</em>
                        </div>
                    )}

                    <h2 className="question-text-minimal">{currentQ.question}</h2>

                    <div className="quiz-options-grid">
                        {(currentQ.options || []).map((option, index) => (
                            <button key={index}
                                className={`quiz-option-minimal ${currentAnswer === index ? 'selected' : ''}`}
                                onClick={() => handleOptionSelect(index)}
                            >
                                <div className="option-indicator">
                                    {currentAnswer === index
                                        ? <Check size={16} />
                                        : <span className="option-letter">{String.fromCharCode(65 + index)}</span>
                                    }
                                </div>
                                <span className="option-text">{option}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Navigation */}
                <div className="quiz-navigation-minimal">
                    <button onClick={handlePrevious} className="btn btn-secondary btn-icon"
                        disabled={isFirstQuestion}>
                        <ArrowLeft size={18} /> Previous
                    </button>

                    <div className="nav-center-info">
                        <span className="answered-count">{answeredCount}/{totalQuestions} answered</span>
                    </div>

                    {isLastQuestion ? (
                        <button onClick={handleSubmit}
                            className="btn btn-primary btn-icon"
                            disabled={submitting || answeredCount < totalQuestions}>
                            <Check size={18} />
                            {submitting ? 'Submitting...' : 'Submit'}
                        </button>
                    ) : (
                        <button onClick={handleNext} className="btn btn-primary btn-icon">
                            Next <ArrowRight size={18} />
                        </button>
                    )}
                </div>

            </div>
        </div>
    )
}

export default Quiz
