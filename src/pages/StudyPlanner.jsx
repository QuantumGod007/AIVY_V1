import { useState, useEffect, useRef } from 'react'
import Sidebar from '../components/Sidebar'
import { getCurrentQuiz, getArchivedSessions, restoreSession } from '../services/storageService'
import { generateStudyPlan } from '../services/geminiService'
import { saveStudyPlan, getStudyPlan, saveCompletedDays } from '../services/firestoreService'
import {
    CalendarDays, Loader2, ChevronDown, ChevronUp,
    CheckCircle2, BookOpen, Cloud, CloudOff, Check,
    Search, ChevronRight, FileText, RefreshCw
} from 'lucide-react'

// Sync status badge
function SyncBadge({ status }) {
    const styles = {
        display: 'flex', alignItems: 'center', gap: '0.35rem',
        fontSize: '0.72rem', fontWeight: 600, padding: '0.25rem 0.65rem',
        borderRadius: '100px', border: '1px solid var(--color-border)',
        background: 'var(--color-bg-elevated)',
        color: status === 'saved' ? 'var(--color-success, #22c55e)'
             : status === 'saving' ? 'var(--color-text-muted)'
             : 'var(--color-warning, #f59e0b)',
        transition: 'color 0.3s'
    }
    return (
        <div style={styles}>
            {status === 'saved'  && <><Check size={11} /> Cloud Saved</>}
            {status === 'saving' && <><Cloud size={11} /> Saving…</>}
            {status === 'local'  && <><CloudOff size={11} /> Local Only</>}
        </div>
    )
}

function StudyPlanner() {
    const [subject, setSubject] = useState('')
    const [examDate, setExamDate] = useState('')
    const [plan, setPlan] = useState(null)
    const [loading, setLoading] = useState(false)
    const [initializing, setInitializing] = useState(true)
    const [error, setError] = useState('')
    const [documentLoaded, setDocumentLoaded] = useState(false)
    const [documentName, setDocumentName] = useState('')
    const [expandedDay, setExpandedDay] = useState(0)
    const [completedDays, setCompletedDays] = useState([])
    const [syncStatus, setSyncStatus] = useState('local') // 'saving' | 'saved' | 'local'
    const [allSessions, setAllSessions] = useState([])
    const [isSwitching, setIsSwitching] = useState(false)
    const [showTopicList, setShowTopicList] = useState(false)

    useEffect(() => {
        const init = async () => {
            setInitializing(true)
            try {
                // 1. Load quiz document context
                const quiz = await getCurrentQuiz()
                if (quiz?.documentText) {
                    setDocumentLoaded(true)
                    setDocumentName(quiz.documentName || 'Your Document')
                    setSubject(prev => prev || quiz.documentName?.replace(/\.[^.]+$/, '') || '')
                }

                // 2. Load all available sessions for switcher
                const sessions = await getArchivedSessions()
                // Deduplicate by name
                const unique = []
                const names = new Set()
                sessions.forEach(s => {
                    if (!names.has(s.documentName)) {
                        names.add(s.documentName)
                        unique.push(s)
                    }
                })
                setAllSessions(unique)

                // 3. Load plan from Firestore specifically for THIS document
                const cloud = await getStudyPlan(quiz?.documentName || 'Your Document')
                if (cloud?.plan) {
                    setPlan(cloud.plan)
                    setCompletedDays(cloud.completedDays || [])
                    if (cloud.subject) setSubject(cloud.subject)
                    if (cloud.examDate) setExamDate(cloud.examDate)
                    setSyncStatus('saved')
                } else {
                    // Reset if no plan for this context yet
                    setPlan(null)
                    setCompletedDays([])
                    setSyncStatus('local')
                }
            } catch (err) {
                console.warn('StudyPlanner init:', err.message)
            } finally {
                setInitializing(false)
            }
        }
        init()
    }, [])

    const handleGenerate = async () => {
        if (!subject.trim() || !examDate) {
            setError('Please enter a subject and exam date.')
            return
        }
        setError('')
        setLoading(true)
        setPlan(null)
        try {
            const quiz = await getCurrentQuiz()
            const docText = quiz?.documentText || ''
            const learnerLevel = quiz?.studyGuidance?.learnerLevel || 'Intermediate'
            const generatedPlan = await generateStudyPlan(docText, subject, examDate, learnerLevel)
            setPlan(generatedPlan)
            setCompletedDays([])
            // Save to cloud with document context
            setSyncStatus('saving')
            const ok = await saveStudyPlan(generatedPlan, subject, examDate, quiz?.documentName || 'Document')
            setSyncStatus(ok ? 'saved' : 'local')
        } catch (err) {
            setError('Failed to generate plan. Please try again.')
            setSyncStatus('local')
        } finally {
            setLoading(false)
        }
    }

    const toggleComplete = async (dayIndex) => {
        const updated = completedDays.includes(dayIndex)
            ? completedDays.filter(d => d !== dayIndex)
            : [...completedDays, dayIndex]
        setCompletedDays(updated)
        setSyncStatus('saving')
        const quiz = await getCurrentQuiz()
        const ok = await saveCompletedDays(updated, quiz?.documentName || 'Document')
        setSyncStatus(ok ? 'saved' : 'local')
    }

    const handleContextSwitch = async (session) => {
        try {
            setIsSwitching(true)
            setShowTopicList(false)
            await restoreSession(session.id)
            
            // Reload page data
            setDocumentLoaded(true)
            setDocumentName(session.documentName)
            setSubject(session.documentName.replace(/\.[^.]+$/, ''))
            setPlan(null)
            
            const cloud = await getStudyPlan(session.documentName)
            if (cloud?.plan) {
                setPlan(cloud.plan)
                setCompletedDays(cloud.completedDays || [])
                if (cloud.subject) setSubject(cloud.subject)
                if (cloud.examDate) setExamDate(cloud.examDate)
                setSyncStatus('saved')
            } else {
                setPlan(null)
                setCompletedDays([])
                setSyncStatus('local')
            }
        } catch (err) {
            console.error('Switch context error:', err)
        } finally {
            setIsSwitching(false)
        }
    }

    const daysRemaining = examDate
        ? Math.max(0, Math.ceil((new Date(examDate) - new Date()) / (1000 * 60 * 60 * 24)))
        : null

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="app-main">
                <div className="page-header">
                    <div>
                        <h1 className="page-title">Study Planner</h1>
                        <p className="page-subtitle">AI-generated day-by-day study schedule for your exam</p>
                    </div>
                    {plan && <SyncBadge status={syncStatus} />}
                </div>

                {/* Config Card */}
                <div className="planner-config-card">
                    {documentLoaded && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
                            <div className="planner-doc-badge" style={{ marginBottom: 0 }}>
                                <BookOpen size={14} />
                                <span>Using: {documentName}</span>
                            </div>
                            
                            <div style={{ position: 'relative' }}>
                                <button 
                                    className="btn btn-secondary btn-icon" 
                                    style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem', height: 'auto' }}
                                    onClick={() => setShowTopicList(!showTopicList)}
                                    disabled={isSwitching}
                                >
                                    {isSwitching ? <Loader2 size={12} className="processing-spinner" /> : <RefreshCw size={12} />}
                                    Switch Topic
                                </button>

                                {showTopicList && (
                                    <div style={{
                                        position: 'absolute', top: '110%', left: 0, zIndex: 100,
                                        width: '280px', background: 'var(--color-bg-elevated)',
                                        border: '1px solid var(--color-border)', borderRadius: '12px',
                                        boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', overflow: 'hidden'
                                    }}>
                                        <div style={{ padding: '0.75rem', fontSize: '0.75rem', fontWeight: 700, borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}>
                                            Select Previous Content
                                        </div>
                                        <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                                            {allSessions.length === 0 ? (
                                                <div style={{ padding: '1rem', textAlign: 'center', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>No other topics found</div>
                                            ) : (
                                                allSessions.map(s => (
                                                    <button
                                                        key={s.id}
                                                        onClick={() => handleContextSwitch(s)}
                                                        style={{
                                                            width: '100%', padding: '0.75rem 1rem', border: 'none',
                                                            background: s.documentName === documentName ? 'rgba(124, 58, 237, 0.05)' : 'transparent',
                                                            display: 'flex', alignItems: 'center', gap: '0.75rem',
                                                            cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s'
                                                        }}
                                                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(124, 58, 237, 0.05)'}
                                                        onMouseLeave={e => e.currentTarget.style.background = s.documentName === documentName ? 'rgba(124, 58, 237, 0.05)' : 'transparent'}
                                                    >
                                                        <FileText size={14} color={s.documentName === documentName ? 'var(--color-accent)' : 'var(--color-text-muted)'} />
                                                        <div style={{ flex: 1, overflow: 'hidden' }}>
                                                            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-primary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{s.documentName}</div>
                                                            <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>{s.accuracy}% accuracy • {new Date(s.archivedAt || s.completedAt).toLocaleDateString()}</div>
                                                        </div>
                                                        <ChevronRight size={14} color="var(--color-text-muted)" />
                                                    </button>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="planner-form">
                        <div className="form-group">
                            <label className="form-label">Subject / Topic</label>
                            <input
                                className="form-input"
                                type="text"
                                placeholder="e.g. Data Structures, Machine Learning..."
                                value={subject}
                                onChange={e => setSubject(e.target.value)}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Exam Date</label>
                            <input
                                className="form-input"
                                type="date"
                                value={examDate}
                                min={new Date().toISOString().split('T')[0]}
                                onChange={e => setExamDate(e.target.value)}
                            />
                        </div>
                        <button
                            className="btn btn-primary btn-icon"
                            onClick={handleGenerate}
                            disabled={loading || initializing || !subject.trim() || !examDate}
                        >
                            {loading ? <Loader2 size={16} className="processing-spinner" /> : <CalendarDays size={16} />}
                            {loading ? 'Generating...' : 'Generate Plan'}
                        </button>
                    </div>

                    {daysRemaining !== null && (
                        <div className="planner-countdown">
                            <span className="countdown-number">{daysRemaining}</span>
                            <span className="countdown-label">days until exam</span>
                        </div>
                    )}

                    {error && <p className="form-error">{error}</p>}
                </div>

                {/* Loading state while fetching from cloud */}
                {initializing && !plan && (
                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>
                        <Cloud size={24} style={{ opacity: 0.5, marginBottom: '0.5rem' }} />
                        <p style={{ fontSize: '0.85rem' }}>Loading your saved plan…</p>
                    </div>
                )}

                {/* Plan Output */}
                {plan && (
                    <div className="planner-output fade-in">
                        <div className="planner-output-header">
                            <h2 className="planner-output-title">{plan.title || `${subject} Study Plan`}</h2>
                            <span className="planner-output-meta">{plan.days?.length} day plan</span>
                        </div>

                        {plan.overview && (
                            <p className="planner-overview">{plan.overview}</p>
                        )}

                        <div className="planner-progress-row">
                            <span className="planner-progress-label">
                                {completedDays.length} / {plan.days?.length} days complete
                            </span>
                            <div className="planner-progress-bar">
                                <div
                                    className="planner-progress-fill"
                                    style={{ width: `${(completedDays.length / (plan.days?.length || 1)) * 100}%` }}
                                />
                            </div>
                        </div>

                        <div className="plan-days-list">
                            {plan.days?.map((day, i) => (
                                <div
                                    key={i}
                                    className={`plan-day-card ${completedDays.includes(i) ? 'plan-day-done' : ''}`}
                                >
                                    <div
                                        className="plan-day-header"
                                        onClick={() => setExpandedDay(expandedDay === i ? -1 : i)}
                                    >
                                        <div className="plan-day-left">
                                            <button
                                                className={`plan-day-check ${completedDays.includes(i) ? 'checked' : ''}`}
                                                onClick={e => { e.stopPropagation(); toggleComplete(i) }}
                                                aria-label="Mark complete"
                                            >
                                                <CheckCircle2 size={18} />
                                            </button>
                                            <div>
                                                <div className="plan-day-label">Day {day.day || i + 1}</div>
                                                <div className="plan-day-topic">{day.topic}</div>
                                            </div>
                                        </div>
                                        <div className="plan-day-right">
                                            <span className="plan-day-duration">{day.duration}</span>
                                            {expandedDay === i ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                        </div>
                                    </div>

                                    {expandedDay === i && (
                                        <div className="plan-day-body">
                                            {day.goal && <p className="plan-day-goal">{day.goal}</p>}
                                            {day.tasks?.length > 0 && (
                                                <ul className="plan-task-list">
                                                    {day.tasks.map((task, j) => (
                                                        <li key={j} className="plan-task-item">{task}</li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </main>
        </div>
    )
}

export default StudyPlanner
