import { useState, useEffect, useRef } from 'react'
import Sidebar from '../components/Sidebar'
import { getCurrentQuiz } from '../services/storageService'
import { generateTutorResponse } from '../services/geminiService'
import { 
    MessageSquare, Send, Loader2, RotateCcw, 
    BookOpen, Brain, RefreshCw, FileText,
    ChevronRight, ChevronDown, ChevronUp,
    Volume2, VolumeX
} from 'lucide-react'
import { auth } from '../firebase'
import { addXP } from '../services/gamificationService'
import { db } from '../firebase'
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'

// Removed singleton functions for document-specific ones inside component

const WELCOME_MSG = {
    role: 'ai',
    text: "Hello! I'm AIVY Intelligence. Ask me anything about your study material or any topic you're learning. I have full context of our research history. 🧠",
    ts: Date.now()
}

function AiTutor() {
    const [messages, setMessages] = useState([WELCOME_MSG])
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)
    const [initializing, setInitializing] = useState(true)
    const [documentContext, setDocumentContext] = useState('')
    const [documentName, setDocumentName] = useState('')
    const [allSessions, setAllSessions] = useState([])
    const [showTopicList, setShowTopicList] = useState(false)
    const [speakingMsgIdx, setSpeakingMsgIdx] = useState(null)
    const bottomRef = useRef(null)
    const inputRef = useRef(null)
    const saveTimerRef = useRef(null)
    const speechRef = useRef(null)

    const getContextId = (name) => name ? name.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 100) : 'default'

    const sessionRestore = async (id) => {
        const { restoreSession } = await import('../services/storageService')
        await restoreSession(id)
        window.location.reload()
    }

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, async (u) => {
            if (!u) {
                setInitializing(false)
                return
            }
            
            try {
                // 1. Get current document context
                const quiz = await getCurrentQuiz()
                let currentDocName = 'General'
                if (quiz?.documentText) {
                    setDocumentContext(quiz.documentText)
                    setDocumentName(quiz.documentName || 'General')
                    currentDocName = quiz.documentName || 'General'
                }

                // 2. Load context-specific history from cloud
                const ctxId = getContextId(currentDocName)
                const ref = doc(db, 'users', u.uid, 'contexts', ctxId)
                const snap = await getDoc(ref)
                if (snap.exists() && snap.data().tutorHistory) {
                    setMessages(snap.data().tutorHistory)
                } else {
                    setMessages([WELCOME_MSG])
                }

                // 3. Keep list of topics for switcher
                const { getArchivedSessions } = await import('../services/storageService')
                const sessions = await getArchivedSessions()
                const unique = []
                const names = new Set()
                sessions.forEach(s => {
                    if (!names.has(s.documentName)) {
                        names.add(s.documentName); unique.push(s)
                    }
                })
                setAllSessions(unique)

            } catch (err) {
                console.warn('Tutor Init Error:', err)
            } finally {
                setInitializing(false)
            }
        })
        return () => unsub()
    }, [])

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    // Debounced save to Firestore (per context)
    const debouncedSave = (msgs) => {
        if (!documentName) return
        clearTimeout(saveTimerRef.current)
        saveTimerRef.current = setTimeout(async () => {
            const user = auth.currentUser
            if (!user) return
            const ctxId = getContextId(documentName)
            const ref = doc(db, 'users', user.uid, 'contexts', ctxId)
            await setDoc(ref, { 
                tutorHistory: msgs.slice(-50), 
                updatedAt: serverTimestamp() 
            }, { merge: true })
        }, 1500)
    }

    const sendMessage = async () => {
        const text = input.trim()
        if (!text || loading) return

        const userMsg = { role: 'user', text, ts: Date.now() }
        const updated = [...messages, userMsg]
        setMessages(updated)
        setInput('')
        setLoading(true)

        try {
            // Send more history for better context (Gemini 2.5 Pro handles this easily)
            const history = messages.slice(-30)
            const aiText = await generateTutorResponse(documentContext, text, history)
            const aiMsg = { role: 'ai', text: aiText, ts: Date.now() }
            const withAI = [...updated, aiMsg]
            setMessages(withAI)
            debouncedSave(withAI)

            // Award XP for engagement (every 3 user messages)
            const userMsgs = withAI.filter(m => m.role === 'user').length
            if (userMsgs > 0 && userMsgs % 3 === 0) {
                addXP(5, 'AI Tutor Engagement')
            }
        } catch {
            const errMsg = { role: 'ai', text: 'Sorry, I encountered an error. Please try again.', ts: Date.now() }
            setMessages(prev => [...prev, errMsg])
        } finally {
            setLoading(false)
            inputRef.current?.focus()
        }
    }

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
    }

    const clearChat = async () => {
        stopSpeaking()
        const fresh = [WELCOME_MSG]
        setMessages(fresh)
        debouncedSave(fresh)
    }

    const toggleSpeech = (text, index) => {
        if (speakingMsgIdx === index) {
            stopSpeaking()
            return
        }

        stopSpeaking()
        setSpeakingMsgIdx(index)

        const utter = new SpeechSynthesisUtterance(text)
        utter.rate = 1.0
        utter.pitch = 1.0
        utter.onend = () => setSpeakingMsgIdx(null)
        utter.onerror = () => setSpeakingMsgIdx(null)
        
        speechRef.current = utter
        window.speechSynthesis.speak(utter)
    }

    const stopSpeaking = () => {
        window.speechSynthesis.cancel()
        setSpeakingMsgIdx(null)
    }

    useEffect(() => {
        return () => window.speechSynthesis.cancel()
    }, [])

    const SUGGESTED = documentContext
        ? ['Summarise the key points', 'What should I focus on?', 'Explain the hardest concept', 'Give me 3 exam tips']
        : ['Explain recursion simply', 'What is Big-O notation?', 'Compare SQL vs NoSQL', 'How does React work?']

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="app-main intelligence-mode">
                <div className="page-header">
                    <div>
                        <h1 className="page-title">AIVY Intelligence</h1>
                        <p className="page-subtitle">
                            {documentContext
                                ? `Deep Inquiry: ${documentName}`
                                : 'Advanced reasoning and document synthesis engine'}
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                        <div style={{ position: 'relative' }}>
                            <button 
                                className="btn btn-secondary btn-icon"
                                onClick={() => setShowTopicList(!showTopicList)}
                                style={{ borderRadius: '10px', fontSize: '0.72rem', height: 'auto', padding: '0.4rem 0.75rem' }}
                            >
                                <Brain size={13} /> Switch Topic
                            </button>

                            {showTopicList && (
                                <div style={{
                                    position: 'absolute', top: '110%', right: 0, zIndex: 1000,
                                    width: '240px', background: 'var(--color-bg-elevated)',
                                    border: '1px solid var(--color-border)', borderRadius: '10px',
                                    boxShadow: '0 8px 20px -5px rgba(0,0,0,0.15)', overflow: 'hidden'
                                }}>
                                    <div style={{ padding: '0.6rem', fontSize: '0.65rem', fontWeight: 700, borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}>
                                        Recent Sessions
                                    </div>
                                    <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
                                        {allSessions.length === 0 ? (
                                            <div style={{ padding: '1rem', textAlign: 'center', fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>No sessions found</div>
                                        ) : (
                                            allSessions.map(s => (
                                                <button
                                                    key={s.id}
                                                    onClick={() => sessionRestore(s.id)}
                                                    style={{
                                                        width: '100%', padding: '0.6rem 0.8rem', border: 'none',
                                                        background: 'transparent', display: 'flex', alignItems: 'center', gap: '0.6rem',
                                                        cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s'
                                                    }}
                                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(124, 58, 237, 0.05)'}
                                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                                >
                                                    <BookOpen size={12} color="var(--color-text-muted)" />
                                                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.documentName}</span>
                                                </button>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        <button className="btn btn-secondary btn-icon" onClick={clearChat} style={{ fontSize: '0.72rem', height: 'auto', padding: '0.4rem 0.75rem' }}>
                            <RotateCcw size={14} /> Clear Chat
                        </button>
                    </div>
                </div>

                <div className="tutor-layout">
                    <div className="chat-window">
                        <div className="chat-messages">
                            {initializing && (
                                <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
                                    <Loader2 size={16} className="processing-spinner" style={{ marginRight: '0.5rem' }} />
                                    Loading chat history...
                                </div>
                            )}
                            {messages.map((msg, i) => (
                                <div key={i} className={`chat-bubble-row ${msg.role === 'user' ? 'chat-row-user' : 'chat-row-ai'}`}>
                                    {msg.role === 'ai' && (
                                        <div className="chat-avatar chat-avatar-ai">
                                            <Brain size={14} />
                                        </div>
                                    )}
                                    <div className={`chat-bubble ${msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-ai'}`}>
                                        <p style={{ whiteSpace: 'pre-wrap', margin: 0, lineHeight: 1.6 }}>
                                            {msg.text}
                                        </p>
                                        <div style={{ 
                                            display: 'flex', 
                                            justifyContent: 'space-between', 
                                            alignItems: 'center',
                                            fontSize: '0.65rem', 
                                            marginTop: '0.35rem', 
                                            opacity: 0.45 
                                        }}>
                                            <span>
                                                {msg.ts ? new Date(msg.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                            </span>
                                            {msg.role === 'ai' && (
                                                <button 
                                                    onClick={() => toggleSpeech(msg.text, i)}
                                                    style={{ 
                                                        background: 'none', border: 'none', padding: '4px',
                                                        cursor: 'pointer', color: 'inherit', display: 'flex',
                                                        alignItems: 'center', opacity: speakingMsgIdx === i ? 1 : 0.6
                                                    }}
                                                    title={speakingMsgIdx === i ? "Stop speaking" : "Read aloud"}
                                                >
                                                    {speakingMsgIdx === i ? <VolumeX size={12} /> : <Volume2 size={12} />}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    {msg.role === 'user' && (
                                        <div className="chat-avatar chat-avatar-user">
                                            {auth.currentUser?.email?.[0]?.toUpperCase() || 'U'}
                                        </div>
                                    )}
                                </div>
                            ))}

                            {loading && (
                                <div className="chat-bubble-row chat-row-ai">
                                    <div className="chat-avatar chat-avatar-ai"><Brain size={14} /></div>
                                    <div className="chat-bubble chat-bubble-ai chat-bubble-loading">
                                        <Loader2 size={16} className="processing-spinner" />
                                        <span>Thinking...</span>
                                    </div>
                                </div>
                            )}
                            <div ref={bottomRef} />
                        </div>

                        <div className="chat-input-area">
                            <textarea
                                ref={inputRef}
                                className="chat-input"
                                placeholder="Ask a question about your study material..."
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                rows={1}
                                disabled={loading}
                            />
                            <button className="chat-send-btn" onClick={sendMessage}
                                disabled={!input.trim() || loading} aria-label="Send">
                                <Send size={18} />
                            </button>
                        </div>
                    </div>

                    <div className="tutor-sidebar-panel">
                        <div className="tutor-tip-card">
                            <h3 className="tutor-tip-title">How to use</h3>
                            <ul className="tutor-tip-list">
                                <li>Upload a document on Dashboard for context-aware answers</li>
                                <li>Ask questions about specific topics or concepts</li>
                                <li>Request summaries, explanations or examples</li>
                                <li>Press Enter to send — Shift + Enter for new line</li>
                                <li>Chat history is saved automatically ☁️</li>
                            </ul>
                        </div>

                        <div className="tutor-tip-card">
                            <h3 className="tutor-tip-title">Suggested Questions</h3>
                            {SUGGESTED.map((q, i) => (
                                <button key={i} className="tutor-suggestion-btn"
                                    onClick={() => { setInput(q); inputRef.current?.focus() }}>
                                    {q}
                                </button>
                            ))}
                        </div>

                        <div className="tutor-tip-card">
                            <h3 className="tutor-tip-title">Session Stats</h3>
                            <div style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span>Messages</span>
                                    <strong style={{ color: 'var(--color-text-primary)' }}>{messages.length - 1}</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span>Questions asked</span>
                                    <strong style={{ color: 'var(--color-text-primary)' }}>
                                        {messages.filter(m => m.role === 'user').length}
                                    </strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span>Context</span>
                                    <strong style={{ color: documentContext ? '#a78bfa' : 'var(--color-text-muted)' }}>
                                        {documentContext ? 'Active' : 'None'}
                                    </strong>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}

export default AiTutor
