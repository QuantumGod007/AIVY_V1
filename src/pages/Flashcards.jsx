import { useState, useEffect } from 'react'
import Sidebar from '../components/Sidebar'
import { getCurrentQuiz } from '../services/storageService'
import { generateFlashcards } from '../services/geminiService'
import { Loader2, ChevronLeft, ChevronRight, RotateCcw, Check, X, Sparkles } from 'lucide-react'

function Flashcards() {
    const [cards, setCards] = useState([])
    const [current, setCurrent] = useState(0)
    const [flipped, setFlipped] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [topic, setTopic] = useState('')
    const [known, setKnown] = useState([])
    const [review, setReview] = useState([])
    const [mode, setMode] = useState('all') // 'all' | 'review'
    const [documentLoaded, setDocumentLoaded] = useState(false)
    const [phase, setPhase] = useState('setup') // 'setup' | 'study'

    useEffect(() => {
        const loadDoc = async () => {
            const quiz = await getCurrentQuiz()
            if (quiz?.documentText) {
                setDocumentLoaded(true)
                setTopic(quiz.documentName?.replace(/\.[^.]+$/, '') || '')
            }
        }
        const saved = localStorage.getItem('flashcards')
        if (saved) {
            setCards(JSON.parse(saved))
            setPhase('study')
        }
        loadDoc()
    }, [])

    const activeCards = mode === 'review'
        ? cards.filter((_, i) => review.includes(i))
        : cards

    const currentCard = activeCards[current] || null

    const generate = async () => {
        setError('')
        setLoading(true)
        try {
            const quiz = await getCurrentQuiz()
            const docText = quiz?.documentText || ''
            const result = await generateFlashcards(docText, topic)
            setCards(result)
            localStorage.setItem('flashcards', JSON.stringify(result))
            setCurrent(0)
            setFlipped(false)
            setKnown([])
            setReview([])
            setPhase('study')
        } catch {
            setError('Failed to generate flashcards. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    const next = () => {
        setFlipped(false)
        setTimeout(() => setCurrent(c => Math.min(c + 1, activeCards.length - 1)), 150)
    }

    const prev = () => {
        setFlipped(false)
        setTimeout(() => setCurrent(c => Math.max(c - 1, 0)), 150)
    }

    const markKnown = () => {
        const globalIndex = cards.indexOf(currentCard)
        if (!known.includes(globalIndex)) setKnown(k => [...k, globalIndex])
        setReview(r => r.filter(i => i !== globalIndex))
        next()
    }

    const markReview = () => {
        const globalIndex = cards.indexOf(currentCard)
        if (!review.includes(globalIndex)) setReview(r => [...r, globalIndex])
        setKnown(k => k.filter(i => i !== globalIndex))
        next()
    }

    const reset = () => {
        setCurrent(0)
        setFlipped(false)
        setKnown([])
        setReview([])
        setMode('all')
    }

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="app-main">
                <div className="page-header">
                    <div>
                        <h1 className="page-title">Flashcards</h1>
                        <p className="page-subtitle">AI-generated cards from your study material</p>
                    </div>
                    {phase === 'study' && (
                        <div className="flashcard-header-actions">
                            <button className="btn btn-secondary btn-icon" onClick={reset}>
                                <RotateCcw size={16} />
                                Reset
                            </button>
                            <button className="btn btn-secondary btn-icon" onClick={() => setPhase('setup')}>
                                <Sparkles size={16} />
                                New Set
                            </button>
                        </div>
                    )}
                </div>

                {phase === 'setup' && (
                    <div className="flashcard-setup fade-in">
                        <div className="flashcard-setup-card">
                            <h2 className="setup-title">Generate Flashcards</h2>
                            <p className="setup-subtitle">
                                {documentLoaded
                                    ? 'Cards will be generated from your uploaded document'
                                    : 'Enter a topic to generate flashcards'}
                            </p>
                            <div className="form-group mt-lg">
                                <label className="form-label">Topic (optional override)</label>
                                <input
                                    className="form-input"
                                    type="text"
                                    placeholder="e.g. Operating Systems, Sorting Algorithms..."
                                    value={topic}
                                    onChange={e => setTopic(e.target.value)}
                                />
                            </div>
                            {error && <p className="form-error mt-sm">{error}</p>}
                            <button
                                className="btn btn-primary btn-large btn-icon mt-lg"
                                onClick={generate}
                                disabled={loading}
                            >
                                {loading
                                    ? <><Loader2 size={18} className="processing-spinner" /> Generating...</>
                                    : <><Sparkles size={18} /> Generate Flashcards</>
                                }
                            </button>

                            {cards.length > 0 && (
                                <button
                                    className="btn btn-outline btn-icon mt-sm"
                                    onClick={() => setPhase('study')}
                                >
                                    Continue with existing cards ({cards.length})
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {phase === 'study' && cards.length > 0 && (
                    <div className="flashcard-study fade-in">
                        {/* Stats row */}
                        <div className="flashcard-stats-row">
                            <div className="flashcard-stat">
                                <span className="flashcard-stat-value">{cards.length}</span>
                                <span className="flashcard-stat-label">Total</span>
                            </div>
                            <div className="flashcard-stat">
                                <span className="flashcard-stat-value">{known.length}</span>
                                <span className="flashcard-stat-label">Known</span>
                            </div>
                            <div className="flashcard-stat">
                                <span className="flashcard-stat-value">{review.length}</span>
                                <span className="flashcard-stat-label">Review</span>
                            </div>
                            <div className="flashcard-mode-toggle">
                                <button
                                    className={`mode-btn ${mode === 'all' ? 'mode-btn-active' : ''}`}
                                    onClick={() => { setMode('all'); setCurrent(0); setFlipped(false) }}
                                >
                                    All Cards
                                </button>
                                <button
                                    className={`mode-btn ${mode === 'review' ? 'mode-btn-active' : ''}`}
                                    onClick={() => { setMode('review'); setCurrent(0); setFlipped(false) }}
                                    disabled={review.length === 0}
                                >
                                    Review Only ({review.length})
                                </button>
                            </div>
                        </div>

                        {currentCard ? (
                            <>
                                {/* Progress */}
                                <div className="flashcard-progress-row">
                                    <span className="flashcard-progress-text">
                                        {current + 1} of {activeCards.length}
                                    </span>
                                    <div className="flashcard-progress-bar">
                                        <div
                                            className="flashcard-progress-fill"
                                            style={{ width: `${((current + 1) / activeCards.length) * 100}%` }}
                                        />
                                    </div>
                                </div>

                                {/* Card */}
                                <div
                                    className={`flashcard-wrapper ${flipped ? 'flipped' : ''}`}
                                    onClick={() => setFlipped(f => !f)}
                                >
                                    <div className="flashcard-inner">
                                        <div className="flashcard-face flashcard-front">
                                            <div className="flashcard-face-label">Question</div>
                                            <p className="flashcard-text">{currentCard.front}</p>
                                            <div className="flashcard-tap-hint">Tap to reveal answer</div>
                                        </div>
                                        <div className="flashcard-face flashcard-back">
                                            <div className="flashcard-face-label">Answer</div>
                                            <p className="flashcard-text">{currentCard.back}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Navigation */}
                                <div className="flashcard-nav">
                                    <button
                                        className="btn btn-secondary btn-icon"
                                        onClick={prev}
                                        disabled={current === 0}
                                    >
                                        <ChevronLeft size={18} />
                                        Previous
                                    </button>

                                    <div className="flashcard-mark-btns">
                                        <button className="flashcard-mark-btn mark-review" onClick={markReview}>
                                            <X size={16} />
                                            Review
                                        </button>
                                        <button className="flashcard-mark-btn mark-known" onClick={markKnown}>
                                            <Check size={16} />
                                            Known
                                        </button>
                                    </div>

                                    <button
                                        className="btn btn-secondary btn-icon"
                                        onClick={next}
                                        disabled={current === activeCards.length - 1}
                                    >
                                        Next
                                        <ChevronRight size={18} />
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div className="flashcard-complete">
                                <h2>Session Complete</h2>
                                <p>You've gone through all {mode === 'review' ? 'review' : ''} cards.</p>
                                <button className="btn btn-primary btn-icon mt-lg" onClick={reset}>
                                    <RotateCcw size={16} />
                                    Start Over
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    )
}

export default Flashcards
