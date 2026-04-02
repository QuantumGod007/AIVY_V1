import { useState, useEffect } from 'react'
import Sidebar from '../components/Sidebar'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '../firebase'
import { getCurrentQuiz, getArchivedSessions, restoreSession } from '../services/storageService'
import { generateFlashcards } from '../services/geminiService'
import { saveFlashcards, getFlashcards } from '../services/firestoreService'
import {
    Loader2, ChevronLeft, ChevronRight, RotateCcw,
    Check, X, Sparkles, Cloud, CloudOff, Brain,
    BookOpen, RefreshCw, FileText
} from 'lucide-react'

// Sync status pill
function SyncPill({ status }) {
    return (
        <div style={{
            display: 'flex', alignItems: 'center', gap: '0.35rem',
            fontSize: '0.72rem', fontWeight: 600, padding: '0.25rem 0.65rem',
            borderRadius: '100px', border: '1px solid var(--color-border)',
            background: 'var(--color-bg-elevated)',
            color: status === 'saved' ? 'var(--color-success, #22c55e)'
                 : status === 'saving' ? 'var(--color-text-muted)'
                 : 'var(--color-warning, #f59e0b)',
            transition: 'color 0.3s'
        }}>
            {status === 'saved'  && <><Check size={11} /> Cloud Saved</>}
            {status === 'saving' && <><Cloud size={11} /> Saving…</>}
            {status === 'local'  && <><CloudOff size={11} /> Local Only</>}
        </div>
    )
}

function Flashcards() {
    const [cards, setCards] = useState([])
    const [current, setCurrent] = useState(0)
    const [flipped, setFlipped] = useState(false)
    const [loading, setLoading] = useState(false)
    const [initializing, setInitializing] = useState(true)
    const [error, setError] = useState('')
    const [topic, setTopic] = useState('')
    const [known, setKnown] = useState([])
    const [review, setReview] = useState([])
    const [mode, setMode] = useState('all') // 'all' | 'review'
    const [documentLoaded, setDocumentLoaded] = useState(false)
    const [phase, setPhase] = useState('setup') // 'setup' | 'study'
    const [syncStatus, setSyncStatus] = useState('local')
    const [allSessions, setAllSessions] = useState([])
    const [showTopicList, setShowTopicList] = useState(false)
    const [isSwitching, setIsSwitching] = useState(false)
    const [activeQuiz, setActiveQuiz] = useState(null)

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (!user) { setInitializing(false); return }
            setInitializing(true)
            try {
                const quiz = await getCurrentQuiz()
                setActiveQuiz(quiz)
                if (quiz?.documentText) {
                    setDocumentLoaded(true)
                    const docName = quiz.documentName || 'Your Document'
                    setTopic(prev => prev || docName.replace(/\.[^.]+$/, '') || '')
                    
                    // Load cards specifically for THIS document
                    const cloud = await getFlashcards(docName)
                    if (cloud?.cards?.length) {
                        setCards(cloud.cards)
                        if (cloud.topic) setTopic(cloud.topic)
                        setPhase('study')
                        setSyncStatus('saved')
                    } else {
                        // Reset if no cards for this context yet
                        setCards([])
                        setPhase('setup')
                    }
                }

                // 2. Load all available sessions for switcher
                const sessions = await getArchivedSessions()
                const unique = []
                const names = new Set()
                
                // Add current if not in archives
                if (quiz) {
                    names.add(quiz.documentName)
                    unique.push({ ...quiz, id: 'current', archivedAt: new Date() })
                }

                sessions.forEach(s => {
                    if (!names.has(s.documentName)) {
                        names.add(s.documentName); unique.push(s)
                    }
                })
                setAllSessions(unique)

            } catch (err) {
                console.warn('Flashcards init:', err.message)
            } finally {
                setInitializing(false)
            }
        })
        return () => unsubscribe()
    }, [])

    const sessionRestore = async (id) => {
        try {
            setIsSwitching(true)
            setShowTopicList(false)
            await restoreSession(id)
            // Reload window to re-trigger context init for simple integration
            window.location.reload()
        } catch (err) {
            console.error('Switch context error:', err)
        } finally {
            setIsSwitching(false)
        }
    }

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
            setCurrent(0)
            setFlipped(false)
            setKnown([])
            setReview([])
            setPhase('study')
            // Save to cloud with document context
            setSyncStatus('saving')
            const ok = await saveFlashcards(result, topic, quiz?.documentName || 'Document')
            setSyncStatus(ok ? 'saved' : 'local')
        } catch {
            setError('Failed to generate flashcards. Please try again.')
            setSyncStatus('local')
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        {phase === 'study' && <SyncPill status={syncStatus} />}
                        
                        <div style={{ position: 'relative' }}>
                            <button 
                                className="btn btn-secondary btn-icon"
                                onClick={() => setShowTopicList(!showTopicList)}
                                style={{ borderRadius: '10px', fontSize: '0.75rem', padding: '0.4rem 0.8rem' }}
                                disabled={isSwitching}
                            >
                                {isSwitching ? <Loader2 size={13} className="processing-spinner" /> : <Brain size={13} />}
                                Switch Topic
                            </button>

                            {showTopicList && (
                                <div style={{
                                    position: 'absolute', top: '110%', right: 0, zIndex: 1000,
                                    width: '260px', background: 'var(--color-bg-elevated)',
                                    border: '1px solid var(--color-border)', borderRadius: '12px',
                                    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.15)', overflow: 'hidden'
                                }}>
                                    <div style={{ padding: '0.75rem', fontSize: '0.7rem', fontWeight: 700, borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                                        Study Contexts
                                    </div>
                                    <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
                                        {allSessions.length === 0 ? (
                                            <div style={{ padding: '1rem', textAlign: 'center', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>No sessions found</div>
                                        ) : (
                                            allSessions.map(s => (
                                                <button
                                                    key={s.id}
                                                    onClick={() => s.id === 'current' ? setShowTopicList(false) : sessionRestore(s.id)}
                                                    style={{
                                                        width: '100%', padding: '0.875rem 1rem', border: 'none',
                                                        background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                        cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s',
                                                        borderBottom: '1px solid var(--color-border)'
                                                    }}
                                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(124, 58, 237, 0.05)'}
                                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                                >
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', overflow: 'hidden' }}>
                                                        <BookOpen size={13} color={s.documentName === activeQuiz?.documentName ? "var(--color-accent)" : "var(--color-text-muted)"} />
                                                        <div style={{ overflow: 'hidden' }}>
                                                            <div style={{ fontSize: '0.78rem', color: 'var(--color-text-primary)', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                                {s.documentName}
                                                            </div>
                                                            {s.documentName === activeQuiz?.documentName && <div style={{ fontSize: '0.6rem', color: 'var(--color-accent)', fontWeight: 800 }}>ACTIVE NOW</div>}
                                                        </div>
                                                    </div>
                                                    {s.accuracy !== undefined && (
                                                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                                            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-text-primary)' }}>{s.accuracy}%</div>
                                                            <div style={{ fontSize: '0.55rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Acc</div>
                                                        </div>
                                                    )}
                                                </button>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {phase === 'study' && (
                            <>
                                <button className="btn btn-secondary btn-icon" onClick={reset}>
                                    <RotateCcw size={16} /> Reset
                                </button>
                                <button className="btn btn-secondary btn-icon" onClick={() => setPhase('setup')}>
                                    <Sparkles size={16} /> New Set
                                </button>
                            </>
                        )}
                    </div>
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
                                disabled={loading || initializing}
                            >
                                {loading
                                    ? <><Loader2 size={18} className="processing-spinner" /> Generating...</>
                                    : <><Sparkles size={18} /> Generate Flashcards</>}
                            </button>

                            {/* If cloud cards loaded, offer to continue */}
                            {cards.length > 0 && !loading && (
                                <button
                                    className="btn btn-outline btn-icon mt-sm"
                                    onClick={() => setPhase('study')}
                                >
                                    {syncStatus === 'saved'
                                        ? <><Cloud size={15} /> Continue saved set ({cards.length} cards)</>
                                        : <>Continue with existing cards ({cards.length})</>
                                    }
                                </button>
                            )}

                            {initializing && (
                                <p style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '1rem' }}>
                                    <Cloud size={14} style={{ verticalAlign: 'middle', marginRight: '0.35rem' }} />
                                    Loading saved cards…
                                </p>
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
                                        <ChevronLeft size={18} /> Previous
                                    </button>

                                    <div className="flashcard-mark-btns">
                                        <button className="flashcard-mark-btn mark-review" onClick={markReview}>
                                            <X size={16} /> Review
                                        </button>
                                        <button className="flashcard-mark-btn mark-known" onClick={markKnown}>
                                            <Check size={16} /> Known
                                        </button>
                                    </div>

                                    <button
                                        className="btn btn-secondary btn-icon"
                                        onClick={next}
                                        disabled={current === activeCards.length - 1}
                                    >
                                        Next <ChevronRight size={18} />
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div className="flashcard-complete">
                                <h2>Session Complete</h2>
                                <p>You've gone through all {mode === 'review' ? 'review ' : ''}cards.</p>
                                <button className="btn btn-primary btn-icon mt-lg" onClick={reset}>
                                    <RotateCcw size={16} /> Start Over
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
