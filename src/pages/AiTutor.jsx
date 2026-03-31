import { useState, useEffect, useRef } from 'react'
import Sidebar from '../components/Sidebar'
import { getCurrentQuiz } from '../services/storageService'
import { generateTutorResponse } from '../services/geminiService'
import { MessageSquare, Send, Loader2, RotateCcw } from 'lucide-react'

function AiTutor() {
    const [messages, setMessages] = useState([
        {
            role: 'ai',
            text: "Hello! I'm your AI study tutor. Ask me anything about your study material or any topic you're learning.",
            ts: Date.now()
        }
    ])
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)
    const [documentContext, setDocumentContext] = useState('')
    const bottomRef = useRef(null)
    const inputRef = useRef(null)

    useEffect(() => {
        const loadContext = async () => {
            const quiz = await getCurrentQuiz()
            if (quiz?.documentText) {
                setDocumentContext(quiz.documentText)
            }
        }
        loadContext()
    }, [])

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    const sendMessage = async () => {
        const text = input.trim()
        if (!text || loading) return

        const userMsg = { role: 'user', text, ts: Date.now() }
        setMessages(prev => [...prev, userMsg])
        setInput('')
        setLoading(true)

        try {
            // Pass last 10 messages as history for context
            const history = messages.slice(-10)
            const aiText = await generateTutorResponse(documentContext, text, history)

            setMessages(prev => [...prev, { role: 'ai', text: aiText, ts: Date.now() }])
        } catch (err) {
            setMessages(prev => [...prev, {
                role: 'ai',
                text: 'Sorry, I encountered an error. Please try again.',
                ts: Date.now()
            }])
        } finally {
            setLoading(false)
            inputRef.current?.focus()
        }
    }

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            sendMessage()
        }
    }

    const clearChat = () => {
        setMessages([{
            role: 'ai',
            text: "Hello! I'm your AI study tutor. Ask me anything about your study material or any topic you're learning.",
            ts: Date.now()
        }])
    }

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="app-main">
                <div className="page-header">
                    <div>
                        <h1 className="page-title">AI Tutor</h1>
                        <p className="page-subtitle">
                            {documentContext
                                ? 'Tutor is aware of your study document'
                                : 'Ask anything — no document loaded'}
                        </p>
                    </div>
                    <button className="btn btn-secondary btn-icon" onClick={clearChat}>
                        <RotateCcw size={16} />
                        Clear Chat
                    </button>
                </div>

                <div className="tutor-layout">
                    <div className="chat-window">
                        <div className="chat-messages">
                            {messages.map((msg, i) => (
                                <div key={i} className={`chat-bubble-row ${msg.role === 'user' ? 'chat-row-user' : 'chat-row-ai'}`}>
                                    {msg.role === 'ai' && (
                                        <div className="chat-avatar chat-avatar-ai">
                                            <MessageSquare size={14} />
                                        </div>
                                    )}
                                    <div className={`chat-bubble ${msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-ai'}`}>
                                        <p style={{ whiteSpace: 'pre-wrap', margin: 0, lineHeight: 1.6 }}>{msg.text}</p>
                                    </div>
                                    {msg.role === 'user' && (
                                        <div className="chat-avatar chat-avatar-user">
                                            U
                                        </div>
                                    )}
                                </div>
                            ))}

                            {loading && (
                                <div className="chat-bubble-row chat-row-ai">
                                    <div className="chat-avatar chat-avatar-ai">
                                        <MessageSquare size={14} />
                                    </div>
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
                            <button
                                className="chat-send-btn"
                                onClick={sendMessage}
                                disabled={!input.trim() || loading}
                                aria-label="Send"
                            >
                                <Send size={18} />
                            </button>
                        </div>
                    </div>

                    <div className="tutor-sidebar-panel">
                        <div className="tutor-tip-card">
                            <h3 className="tutor-tip-title">How to use</h3>
                            <ul className="tutor-tip-list">
                                <li>Upload a document on Dashboard first for context-aware answers</li>
                                <li>Ask questions about specific topics or concepts</li>
                                <li>Request summaries, explanations or examples</li>
                                <li>Press Enter to send — Shift + Enter for new line</li>
                            </ul>
                        </div>

                        <div className="tutor-tip-card">
                            <h3 className="tutor-tip-title">Suggested Questions</h3>
                            {[
                                'Explain this topic simply',
                                'What are the key concepts?',
                                'Give me a study strategy',
                                'What should I focus on most?'
                            ].map((q, i) => (
                                <button
                                    key={i}
                                    className="tutor-suggestion-btn"
                                    onClick={() => { setInput(q); inputRef.current?.focus() }}
                                >
                                    {q}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}

export default AiTutor
