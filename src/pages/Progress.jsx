import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '../firebase'
import { analyzeQuizResults, generateRecoveryQuiz, generateSmartReStudyPath } from '../services/geminiService'
import { saveCurrentQuiz, getQuizResults, getCurrentQuiz } from '../services/storageService'
import {
  ArrowLeft, TrendingUp, Target, Award, AlertCircle,
  CheckCircle2, XCircle, BarChart3, Brain, RefreshCw,
  Zap, ChevronDown, ChevronUp, Lightbulb, BookOpen,
  Loader2, Sparkles
} from 'lucide-react'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getGrade(accuracy) {
  if (accuracy >= 90) return { label: 'Outstanding', emoji: '🌟', color: '#a78bfa' }
  if (accuracy >= 80) return { label: 'Excellent',    emoji: '🎉', color: '#34d399' }
  if (accuracy >= 70) return { label: 'Good',         emoji: '👍', color: '#60a5fa' }
  if (accuracy >= 60) return { label: 'Fair',         emoji: '📚', color: '#f59e0b' }
  return                      { label: 'Keep Going',  emoji: '💪', color: '#f87171' }
}

// ─── Question Review Item ─────────────────────────────────────────────────────
function QuestionReviewItem({ q, index, userAnswer }) {
  const [open, setOpen] = useState(false)
  const isCorrect = userAnswer === q.correctAnswer
  const userAnswerText = q.options?.[userAnswer] ?? 'Not answered'
  const correctAnswerText = q.options?.[q.correctAnswer] ?? '—'

  return (
    <div
      style={{
        border: `1px solid ${isCorrect ? 'rgba(52,211,153,0.3)' : 'rgba(248,113,113,0.3)'}`,
        borderRadius: '12px',
        background: isCorrect ? 'rgba(52,211,153,0.04)' : 'rgba(248,113,113,0.04)',
        overflow: 'hidden',
        transition: 'all 0.2s ease'
      }}
    >
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
          padding: '0.875rem 1rem', background: 'transparent', border: 'none',
          cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit'
        }}
      >
        <div style={{
          width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: isCorrect ? '#34d399' : '#f87171', marginTop: 1
        }}>
          {isCorrect
            ? <CheckCircle2 size={14} color="#fff" />
            : <XCircle size={14} color="#fff" />}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: '0.8rem', fontWeight: 500, color: 'var(--color-text-muted)',
            marginBottom: '0.25rem'
          }}>Q{index + 1}</div>
          <div style={{
            fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-primary)',
            lineHeight: 1.4
          }}>{q.question}</div>
        </div>
        {open ? <ChevronUp size={16} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
               : <ChevronDown size={16} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />}
      </button>

      {open && (
        <div style={{ padding: '0 1rem 1rem 3.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{
            padding: '0.6rem 0.875rem', borderRadius: '8px',
            background: isCorrect ? 'rgba(52,211,153,0.1)' : 'rgba(248,113,113,0.1)',
            border: `1px solid ${isCorrect ? 'rgba(52,211,153,0.25)' : 'rgba(248,113,113,0.25)'}`
          }}>
            <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)', marginBottom: '0.2rem' }}>
              Your answer
            </div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: isCorrect ? '#34d399' : '#f87171' }}>
              {userAnswerText}
            </div>
          </div>
          {!isCorrect && (
            <div style={{
              padding: '0.6rem 0.875rem', borderRadius: '8px',
              background: 'rgba(52,211,153,0.08)',
              border: '1px solid rgba(52,211,153,0.25)'
            }}>
              <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)', marginBottom: '0.2rem' }}>
                Correct answer
              </div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#34d399' }}>
                {correctAnswerText}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
function Progress() {
  const [results, setResults]               = useState(null)
  const [loading, setLoading]               = useState(true)
  const [swot, setSwot]                     = useState(null)
  const [swotLoading, setSwotLoading]       = useState(false)
  const [recoveryLoading, setRecoveryLoading] = useState(false)
  const [recoveryDone, setRecoveryDone]     = useState(false)
  const [activeTab, setActiveTab]           = useState('overview') // overview | review
  const [reStudyLoading, setReStudyLoading] = useState(false)
  const [reStudyData, setReStudyData]       = useState(null)
  const [error, setError]                   = useState('')
  const navigate = useNavigate()
  const location = useLocation()

  // Auth-gated data load — router state first, then Firestore
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { setLoading(false); navigate('/login'); return }
      try {
        let data = null

        // 1. Router state — passed directly from Quiz.jsx (no disk, no latency)
        if (location.state?.results) {
          data = location.state.results
        }

        // 2. Firestore fallback — for direct page refresh or history navigation
        if (!data) {
          try {
            const firestoreResults = await getQuizResults()
            if (firestoreResults?.length > 0) {
              data = firestoreResults.sort((a, b) =>
                new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
              )[0]
            }
          } catch (e) { console.warn('Firestore results fetch failed:', e.message) }
        }

        if (data) {
          setResults(data)
          generateSwot(data)
        }
      } catch (err) {
        console.error('Error loading results:', err)
      } finally {
        setLoading(false)
      }
    })
    return () => unsub()
  }, [navigate, location.state])

  const generateSwot = async (data) => {
    setSwotLoading(true)
    try {
      const swotData = await analyzeQuizResults(data.questions, data.answers, data.score, data.total)
      setSwot(swotData)
    } catch {
      const acc = data.accuracy
      setSwot({
        strength: acc >= 70 ? 'Strong grasp of core concepts demonstrated in assessment' : 'Commitment to completing the assessment and learning process',
        weakness: acc >= 70 ? 'Some advanced topics may need deeper review' : 'Foundational concepts need reinforcement based on quiz performance',
        opportunity: acc >= 70 ? 'Ready to advance to more challenging material' : 'Significant growth possible through focused study on weak areas',
        threat: acc >= 70 ? 'Maintain consistent study pace to retain knowledge' : 'Risk of knowledge gaps widening without targeted practice'
      })
    } finally {
      setSwotLoading(false)
    }
  }

  const handleRecoveryQuiz = async () => {
    if (!results?.questions || !results?.answers) return
    setRecoveryLoading(true)
    try {
      const missed = results.questions
        .map((q, i) => ({ ...q, userAnswerIndex: results.answers[i] }))
        .filter(q => q.userAnswerIndex !== q.correctAnswer)
      if (missed.length === 0) { navigate('/dashboard'); return }

      let docText = ''
      try {
        const cq = await getCurrentQuiz()
        if (cq?.documentText) docText = cq.documentText
      } catch {}
      if (!docText) docText = '' // documentText lives in Firestore via getCurrentQuiz above

      const recoveryQs = await generateRecoveryQuiz(docText, missed)
      if (!recoveryQs.length) throw new Error('No recovery questions')

      await saveCurrentQuiz({
        documentName: (results.documentName || 'Document') + ' — Recovery',
        documentText: docText,
        questions: recoveryQs,
        isPrerequisiteSurvey: false,
        isRecoveryQuiz: true,
        userAnswers: {},
        completedAt: null
      })
      setRecoveryDone(true)
      setTimeout(() => navigate('/quiz'), 800)
    } catch (err) {
      console.error('Recovery quiz error:', err)
    } finally {
      setRecoveryLoading(false)
    }
  }

  const handleSmartReStudy = async () => {
    if (!results?.questions || !results?.answers) return
    setReStudyLoading(true)
    setError('')
    try {
      let docText = ''
      try {
        const cq = await getCurrentQuiz()
        if (cq?.documentText) docText = cq.documentText
      } catch {}
      
      const lesson = await generateSmartReStudyPath(results, docText)
      setReStudyData(lesson)
    } catch (err) {
      console.error('Re-study error:', err)
    } finally {
      setReStudyLoading(false)
    }
  }

  // ── Loading state ────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg-primary)' }}>
        <div style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>
          <Brain size={32} style={{ animation: 'spin 1s linear infinite', marginBottom: '0.75rem' }} />
          <p style={{ margin: 0, fontSize: '0.9rem' }}>Loading your results…</p>
        </div>
      </div>
    )
  }

  // ── Empty state ──────────────────────────────────────────────────────────────
  if (!results) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg-primary)', padding: '2rem' }}>
        <div style={{ textAlign: 'center', maxWidth: 400 }}>
          <div style={{ width: 72, height: 72, borderRadius: '20px', background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem', color: 'var(--color-text-muted)' }}>
            <BarChart3 size={32} />
          </div>
          <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>No Results Yet</h2>
          <p style={{ margin: '0 0 1.5rem', color: 'var(--color-text-muted)', fontSize: '0.9rem', lineHeight: 1.6 }}>Complete an adaptive quiz to see your performance analysis, improvement zones, and AI-powered insights.</p>
          <button onClick={() => navigate('/dashboard')} style={{ padding: '0.75rem 1.5rem', background: 'linear-gradient(135deg,#6366f1,#9333ea)', color: '#fff', border: 'none', borderRadius: '10px', fontFamily: 'inherit', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer' }}>
            Go to Dashboard
          </button>
        </div>
      </div>
    )
  }

  // ── Derived data ─────────────────────────────────────────────────────────────
  const { score, total, accuracy, documentName, questions = [], answers = {} } = results
  const wrongCount = total - score
  const grade = getGrade(accuracy)
  const missedQuestions = questions.filter((_, i) => answers[i] !== questions[i]?.correctAnswer)

  // Group missed questions by concept/topic for improvement zones
  const improvementZones = missedQuestions.slice(0, 5).map(q => ({
    topic: q.targetsConcept || q.question?.split(' ').slice(0, 6).join(' ') + '…' || 'Review needed',
    question: q.question
  }))

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg-primary)', paddingBottom: '4rem' }}>

      {/* Top nav bar */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'var(--color-bg-card)', borderBottom: '1px solid var(--color-border)',
        backdropFilter: 'blur(12px)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0.875rem 2rem'
      }}>
        <button onClick={() => navigate('/dashboard')} style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          background: 'transparent', border: '1px solid var(--color-border)',
          borderRadius: '8px', padding: '0.45rem 0.875rem',
          color: 'var(--color-text-primary)', cursor: 'pointer',
          fontFamily: 'inherit', fontWeight: 500, fontSize: '0.85rem'
        }}>
          <ArrowLeft size={16} /> Dashboard
        </button>
        <span style={{
          fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase',
          letterSpacing: '0.08em', color: 'var(--color-text-muted)'
        }}>Quiz Results</span>
        <div style={{ width: 100 }} />
      </div>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '2rem 1.5rem' }}>

        {/* ── HERO: Score Card ──────────────────────────────────────────────── */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(147,51,234,0.08) 100%)',
          border: '1px solid rgba(99,102,241,0.2)',
          borderRadius: '24px', padding: '2.5rem 2rem',
          textAlign: 'center', marginBottom: '1.5rem', position: 'relative', overflow: 'hidden'
        }}>
          {/* Background glow */}
          <div style={{
            position: 'absolute', top: -60, left: '50%', transform: 'translateX(-50%)',
            width: 200, height: 200, borderRadius: '50%',
            background: `radial-gradient(circle, ${grade.color}20 0%, transparent 70%)`,
            pointerEvents: 'none'
          }} />

          <p style={{ margin: '0 0 0.5rem', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-muted)' }}>
            {documentName || 'Quiz Complete'}
          </p>

          {/* Score big number */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', margin: '1rem 0' }}>
            <span style={{ fontSize: '5rem', fontWeight: 800, color: grade.color, lineHeight: 1, letterSpacing: '-0.03em' }}>
              {score}
            </span>
            <span style={{ fontSize: '2.5rem', fontWeight: 400, color: 'var(--color-text-muted)', lineHeight: 1 }}>
              / {total}
            </span>
          </div>

          {/* Grade badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.5rem 1.25rem', borderRadius: '100px',
            background: `${grade.color}18`, border: `1px solid ${grade.color}40`,
            color: grade.color, fontSize: '0.875rem', fontWeight: 700,
            marginBottom: '1.5rem'
          }}>
            <span>{grade.emoji}</span> {grade.label}
          </div>

          {/* Stats row */}
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            {[
              { label: 'Accuracy', value: `${accuracy}%`, color: grade.color },
              { label: 'Correct',  value: score,           color: '#34d399' },
              { label: 'Missed',   value: wrongCount,      color: '#f87171' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{
                background: 'var(--color-bg-card)', border: '1px solid var(--color-border)',
                borderRadius: '12px', padding: '0.875rem 1.25rem', minWidth: 90, textAlign: 'center'
              }}>
                <div style={{ fontSize: '1.625rem', fontWeight: 800, color, lineHeight: 1, marginBottom: '0.25rem' }}>{value}</div>
                <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)', fontWeight: 600 }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Accuracy bar */}
          <div style={{ marginTop: '1.5rem', maxWidth: 400, margin: '1.5rem auto 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--color-text-muted)', marginBottom: '0.4rem' }}>
              <span>0%</span>
              <span style={{ color: accuracy >= 70 ? '#34d399' : '#f59e0b' }}>
                {accuracy >= 70 ? `+${accuracy - 70}% above pass mark` : `${70 - accuracy}% below pass mark (70%)`}
              </span>
              <span>100%</span>
            </div>
            <div style={{ height: 8, background: 'var(--color-bg-elevated)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: `${accuracy}%`,
                background: `linear-gradient(90deg, ${grade.color}, ${grade.color}88)`,
                borderRadius: 4, transition: 'width 1s ease'
              }} />
            </div>
            {/* 70% pass mark */}
            <div style={{ position: 'relative', marginTop: 2 }}>
              <div style={{
                position: 'absolute', left: '70%', transform: 'translateX(-50%)',
                width: 1, height: 8, background: 'var(--color-text-muted)', opacity: 0.5
              }} />
            </div>
          </div>
        </div>

        {/* ── Tab selector ─────────────────────────────────────────────────── */}
        <div style={{
          display: 'flex', background: 'var(--color-bg-secondary)',
          border: '1px solid var(--color-border)', borderRadius: '10px',
          padding: '3px', gap: '3px', marginBottom: '1.5rem'
        }}>
          {[
            { key: 'overview', label: 'Overview & Insights', icon: <TrendingUp size={13} /> },
            { key: 'review',   label: 'Question Review',     icon: <BookOpen size={13} /> },
          ].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: '0.4rem', padding: '0.55rem 1rem', border: 'none', borderRadius: '7px',
              background: activeTab === tab.key ? 'var(--color-bg-elevated)' : 'transparent',
              color: activeTab === tab.key ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
              fontWeight: activeTab === tab.key ? 600 : 400,
              fontSize: '0.8125rem', cursor: 'pointer', fontFamily: 'inherit',
              boxShadow: activeTab === tab.key ? '0 1px 3px rgba(0,0,0,0.12), 0 0 0 1px var(--color-border)' : 'none',
              transition: 'all 0.15s ease'
            }}>
              {tab.icon}{tab.label}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW TAB ─────────────────────────────────────────────────── */}
        {activeTab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            {/* Improvement Zones */}
            {missedQuestions.length > 0 && (
              <div style={{
                background: 'var(--color-bg-card)', border: '1px solid rgba(248,113,113,0.2)',
                borderRadius: '18px', padding: '1.5rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '1.125rem' }}>
                  <div style={{ width: 32, height: 32, borderRadius: '8px', background: 'rgba(248,113,113,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f87171' }}>
                    <AlertCircle size={16} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>Improvement Zones</h3>
                    <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>Topics to focus on based on your wrong answers</p>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {missedQuestions.map((q, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
                      padding: '0.75rem', background: 'rgba(248,113,113,0.05)',
                      border: '1px solid rgba(248,113,113,0.15)', borderRadius: '10px'
                    }}>
                      <div style={{
                        width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                        background: 'rgba(248,113,113,0.15)', color: '#f87171',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.7rem', fontWeight: 700
                      }}>{i + 1}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-primary)', lineHeight: 1.4 }}>
                          {q.question}
                        </div>
                        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.375rem', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.7rem', color: '#f87171' }}>
                            ✗ You: {q.options?.[answers[questions.indexOf(q)]] ?? 'No answer'}
                          </span>
                          <span style={{ fontSize: '0.7rem', color: '#34d399' }}>
                            ✓ Correct: {q.options?.[q.correctAnswer] ?? '—'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Strong areas */}
            {score > 0 && (
              <div style={{
                background: 'var(--color-bg-card)', border: '1px solid rgba(52,211,153,0.2)',
                borderRadius: '18px', padding: '1.5rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '1.125rem' }}>
                  <div style={{ width: 32, height: 32, borderRadius: '8px', background: 'rgba(52,211,153,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#34d399' }}>
                    <Award size={16} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>Strong Areas</h3>
                    <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>{score} questions answered correctly</p>
                  </div>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {questions.filter((_, i) => answers[i] === questions[i]?.correctAnswer).map((q, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: '0.35rem',
                      padding: '0.35rem 0.75rem', borderRadius: '100px',
                      background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)',
                      fontSize: '0.72rem', color: '#34d399', fontWeight: 500
                    }}>
                      <CheckCircle2 size={11} /> Q{questions.indexOf(q) + 1} correct
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* How to improve */}
            <div style={{
              background: 'var(--color-bg-card)', border: '1px solid rgba(99,102,241,0.2)',
              borderRadius: '18px', padding: '1.5rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '1.125rem' }}>
                <div style={{ width: 32, height: 32, borderRadius: '8px', background: 'rgba(99,102,241,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366f1' }}>
                  <Lightbulb size={16} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>How to Improve</h3>
                  <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>Personalized next steps</p>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                {(accuracy >= 90
                  ? ['Review any tricky areas from the full breakdown below', 'Try a harder topic or advanced quiz', 'Great job — share your results!']
                  : accuracy >= 70
                  ? ['Focus on the Improvement Zones listed above', 'Try the Smart Recovery Quiz to reinforce weak areas', 'Re-read sections related to the wrong answers']
                  : ['Start with the Improvement Zones — these are your priorities', 'Use AI Tutor to ask specific questions about concepts you missed', 'Try the Smart Recovery Quiz — it generates targeted questions just for your gaps', 'Review the material before attempting another quiz']
                ).map((tip, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
                    padding: '0.75rem', background: 'rgba(99,102,241,0.04)',
                    border: '1px solid rgba(99,102,241,0.1)', borderRadius: '10px'
                  }}>
                    <div style={{
                      width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                      background: 'rgba(99,102,241,0.15)', color: '#6366f1',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.65rem', fontWeight: 800, marginTop: 1
                    }}>{i + 1}</div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-text-primary)', lineHeight: 1.5 }}>{tip}</span>
                  </div>
                ))}
                
                {!reStudyData ? (
                  <button 
                    onClick={handleSmartReStudy}
                    disabled={reStudyLoading || wrongCount === 0}
                    style={{
                      width: '100%', marginTop: '0.5rem', padding: '0.75rem',
                      background: 'var(--color-bg-elevated)', border: '1px dashed var(--color-accent)',
                      borderRadius: '10px', color: 'var(--color-accent)', fontWeight: 600,
                      fontSize: '0.8rem', cursor: 'pointer', display: 'flex', 
                      alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
                    }}
                  >
                    {reStudyLoading ? <Loader2 size={14} className="processing-spinner" /> : <Sparkles size={14} />}
                    {reStudyLoading ? 'Generating personalized refresher...' : 'Generate AI Smart Re-Study Lesson'}
                  </button>
                ) : (
                  <div style={{
                    marginTop: '1rem', padding: '1.25rem', borderRadius: '12px',
                    background: 'var(--color-bg-secondary)', borderLeft: '4px solid var(--color-accent)',
                    animation: 'fadeInUp 0.4s ease'
                  }}>
                    <h4 style={{ margin: '0 0 0.5rem', color: 'var(--color-accent)', fontSize: '0.9rem' }}>{reStudyData.title}</h4>
                    <p style={{ margin: '0 0 1rem', fontSize: '0.825rem', lineHeight: 1.6, color: 'var(--color-text-primary)' }}>{reStudyData.refresher}</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1rem' }}>
                      {reStudyData.keyTips?.map((tip, i) => (
                        <div key={i} style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'flex', gap: '0.4rem' }}>
                          <CheckCircle2 size={12} style={{ color: 'var(--color-success)', marginTop: 2, flexShrink: 0 }} />
                          {tip}
                        </div>
                      ))}
                    </div>
                    <div style={{ 
                      padding: '0.6rem 0.8rem', borderRadius: '8px', 
                      background: 'rgba(99,102,241,0.08)', fontSize: '0.75rem', 
                      fontWeight: 600, color: 'var(--color-accent)',
                      display: 'flex', alignItems: 'center', gap: '0.5rem'
                    }}>
                      <Target size={14} /> Next Goal: {reStudyData.nextGoal}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* SWOT analysis */}
            <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: '18px', padding: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '1.125rem' }}>
                <div style={{ width: 32, height: 32, borderRadius: '8px', background: 'rgba(167,139,250,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a78bfa' }}>
                  <Brain size={16} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>AI SWOT Analysis</h3>
                  <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>Strengths, Weaknesses, Opportunities, Threats</p>
                </div>
              </div>
              {swotLoading ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--color-text-muted)', fontSize: '0.875rem', padding: '1rem 0' }}>
                  <Brain size={20} style={{ animation: 'spin 1s linear infinite', color: '#a78bfa' }} />
                  Analysing with AI…
                </div>
              ) : swot ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  {[
                    { key: 'strength',    label: 'Strengths',    icon: <Award size={14} />,     color: '#34d399', bg: 'rgba(52,211,153,0.08)',   border: 'rgba(52,211,153,0.2)' },
                    { key: 'weakness',    label: 'Weaknesses',   icon: <AlertCircle size={14} />, color: '#f87171', bg: 'rgba(248,113,113,0.08)', border: 'rgba(248,113,113,0.2)' },
                    { key: 'opportunity', label: 'Opportunities', icon: <Target size={14} />,     color: '#60a5fa', bg: 'rgba(96,165,250,0.08)',   border: 'rgba(96,165,250,0.2)' },
                    { key: 'threat',      label: 'Threats',      icon: <Zap size={14} />,         color: '#f59e0b', bg: 'rgba(245,158,11,0.08)',   border: 'rgba(245,158,11,0.2)' },
                  ].map(({ key, label, icon, color, bg, border }) => (
                    <div key={key} style={{
                      padding: '1rem', borderRadius: '12px',
                      background: bg, border: `1px solid ${border}`
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color, fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                        {icon}{label}
                      </div>
                      <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--color-text-primary)', lineHeight: 1.55 }}>
                        {swot[key]}
                      </p>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        )}

        {/* ── QUESTION REVIEW TAB ───────────────────────────────────────────── */}
        {activeTab === 'review' && (
          <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: '18px', padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '1.25rem' }}>
              <div style={{ width: 32, height: 32, borderRadius: '8px', background: 'rgba(99,102,241,0.12)', color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <BookOpen size={16} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>All Questions</h3>
                <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>Tap any question to see your answer vs the correct one</p>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              {questions.map((q, i) => (
                <QuestionReviewItem key={i} q={q} index={i} userAnswer={answers[i]} />
              ))}
            </div>
          </div>
        )}

        {/* ── Action Buttons ────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
          <button onClick={() => navigate('/dashboard')} style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: '0.5rem', padding: '0.9rem 1.25rem', border: '1px solid var(--color-border)',
            borderRadius: '12px', background: 'var(--color-bg-elevated)',
            color: 'var(--color-text-primary)', fontFamily: 'inherit',
            fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer'
          }}>
            <ArrowLeft size={16} /> Dashboard
          </button>

          {wrongCount > 0 && (
            <button onClick={handleRecoveryQuiz} disabled={recoveryLoading || recoveryDone} style={{
              flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: '0.5rem', padding: '0.9rem 1.25rem', border: 'none',
              borderRadius: '12px', fontFamily: 'inherit',
              fontWeight: 600, fontSize: '0.875rem',
              cursor: recoveryLoading || recoveryDone ? 'not-allowed' : 'pointer',
              background: recoveryDone
                ? '#34d399'
                : 'linear-gradient(135deg, #f59e0b, #d97706)',
              color: '#fff',
              boxShadow: '0 4px 14px rgba(245,158,11,0.35)',
              transition: 'all 0.2s ease'
            }}>
              {recoveryDone
                ? <><CheckCircle2 size={16} /> Launching Recovery Quiz…</>
                : recoveryLoading
                ? <><RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /> Generating…</>
                : <><Zap size={16} /> Smart Recovery Quiz ({wrongCount} missed)</>
              }
            </button>
          )}
        </div>

      </div>
    </div>
  )
}

export default Progress
