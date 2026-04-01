import { useState, useEffect, useRef } from 'react'
import Sidebar from '../components/Sidebar'
import { getCurrentQuiz } from '../services/storageService'
import { generateTutorResponse } from '../services/geminiService'
import { MessageSquare, Send, Loader2, RotateCcw, BookOpen, Brain } from 'lucide-react'
import { auth } from '../firebase'
import { db } from '../firebase'
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'

// Persist chat history to Firestore so it survives page refresh
async function saveChatHistory(messages) {
    try {
        const user = auth.currentUser
        if (!user) return
        const ref = doc(db, 'users', user.uid, 'tutor', 'history')
        // Store last 50 messages only
        await setDoc(ref, {
            messages: messages.slice(-50),
            updatedAt: serverTimestamp()
        }, { merge: true })
    } catch (err) {
        console.warn('saveChatHistory:', err.message)
    }
}

async function loadChatHistory() {
    try {
        const user = auth.currentUser
        if (!user) return null
        const ref = doc(db, 'users', user.uid, 'tutor', 'history')
        const snap = await getDoc(ref)
        if (snap.exists()) return snap.data().messages || null
    } catch (err) {
        console.warn('loadChatHistory:', err.message)
    }
    return null
}

const WELCOME_MSG = {
    role: 'ai',
    text: "Hello! I'm your AI study tutor. Ask me anything about your study material or any topic you're learning. I remember our previous conversation too! 🧠",
    ts: Date.now()
}

function AiTutor() {
    const [messages, setMessages] = useState([WELCOME_MSG])
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)
    const [initializing, setInitializing] = useState(true)
    const [documentContext, setDocumentContext] = useState('')
    const [documentName, setDocumentName] = useState('')
    const bottomRef = useRef(null)
    const inputRef = useRef(null)
    const saveTimerRef = useRef(null)

    useEffect(() => {
        // Wait for Firebase auth to resolve before loading any cloud data
        const unsub = onAuthStateChanged(auth, async (user) => {
            if (!user) {
                setInitializing(false)
                return
            }
            setInitializing(true)
            try {
                // Load document context
                const quiz = await getCurrentQuiz()
                if (quiz?.documentText) {
                    setDocumentContext(quiz.documentText)
                    setDocumentName(quiz.documentName || 'Your Document')
                }

                // Load persisted chat history
                const history = await loadChatHistory()
                if (history && history.length > 0) {
                    setMessages(history)
                }
            } catch (err) {
                console.warn('AiTutor init:', err.message)
            } finally {
                setInitializing(false)
            }
        })
        return () => unsub()
    }, [])

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    // Debounced save to Firestore
    const debouncedSave = (msgs) => {
        clearTimeout(saveTimerRef.current)
        saveTimerRef.current = setTimeout(() => saveChatHistory(msgs), 1500)
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
            const history = messages.slice(-10)
            const aiText = await generateTutorResponse(documentContext, text, history)
            const aiMsg = { role: 'ai', text: aiText, ts: Date.now() }
            const withAI = [...updated, aiMsg]
            setMessages(withAI)
            debouncedSave(withAI)
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
        const fresh = [WELCOME_MSG]
        setMessages(fresh)
        await saveChatHistory(fresh)
    }

    const SUGGESTED = documentContext
        ? ['Summarise the key points', 'What should I focus on?', 'Explain the hardest concept', 'Give me 3 exam tips']
        : ['Explain recursion simply', 'What is Big-O notation?', 'Compare SQL vs NoSQL', 'How does React work?']

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="app-main">
                <div className="page-header">
                    <div>
                        <h1 className="page-title">AI Tutor</h1>
                        <p className="page-subtitle">
                            {documentContext
                                ? `Aware of: ${documentName}`
                                : 'Ask anything — upload a document for context-aware answers'}
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                        {documentContext && (
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: '0.4rem',
                                fontSize: '0.72rem', fontWeight: 600, padding: '0.25rem 0.65rem',
                                borderRadius: '100px', background: '#7c3aed18',
                                border: '1px solid #7c3aed44', color: '#a78bfa'
                            }}>
                                <BookOpen size={12} /> Document Loaded
                            </div>
                        )}
                        <button className="btn btn-secondary btn-icon" onClick={clearChat}>
                            <RotateCcw size={16} /> Clear Chat
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
                                        <div style={{ fontSize: '0.65rem', marginTop: '0.35rem', opacity: 0.45, textAlign: msg.role === 'user' ? 'right' : 'left' }}>
                                            {msg.ts ? new Date(msg.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
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
