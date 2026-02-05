import { useState, useEffect, useRef } from 'react'
import { signOut } from 'firebase/auth'
import { auth, db } from '../firebase'
import { useNavigate } from 'react-router-dom'
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  query,
  orderBy,
  serverTimestamp,
  getDoc,
  setDoc,
  updateDoc
} from 'firebase/firestore'
import { GoogleGenerativeAI } from '@google/generative-ai'
import '../styles/global.css'

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY)
const model = genAI.getGenerativeModel({ model: "gemini-pro" })

function DashboardNew() {
  const [activeScreen, setActiveScreen] = useState('home')
  const [activeMenu, setActiveMenu] = useState('Home')

  // Chat State
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [currentConversationId, setCurrentConversationId] = useState(null)

  // History State
  const [conversations, setConversations] = useState([])
  const [savedNotes, setSavedNotes] = useState([])

  // User Stats
  const [userStats, setUserStats] = useState({
    totalChats: 0,
    savedNotes: 0,
    studyTime: 0
  })

  const navigate = useNavigate()
  const messagesEndRef = useRef(null)
  const user = auth.currentUser

  useEffect(() => {
    if (user) {
      loadUserData()
    }
  }, [user])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const loadUserData = async () => {
    try {
      // Load conversations
      const conversationsRef = collection(db, 'users', user.uid, 'conversations')
      const q = query(conversationsRef, orderBy('timestamp', 'desc'))
      const snapshot = await getDocs(q)
      const convos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      setConversations(convos)

      // Load saved notes
      const notesRef = collection(db, 'users', user.uid, 'savedNotes')
      const notesSnapshot = await getDocs(notesRef)
      const notes = notesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      setSavedNotes(notes)

      // Update stats
      setUserStats({
        totalChats: convos.length,
        savedNotes: notes.length,
        studyTime: convos.length * 15 // Estimate 15 min per chat
      })
    } catch (error) {
      console.error('Error loading user data:', error)
    }
  }

  const handleSignOut = async () => {
    await signOut(auth)
    navigate('/login')
  }

  // Send message to AI
  const sendMessage = async () => {
    if (!input.trim() || loading) return

    const userMessage = input.trim()
    setInput('')
    setLoading(true)

    // Add user message
    const newMessages = [...messages, { role: 'user', content: userMessage }]
    setMessages(newMessages)

    try {
      // Get AI response
      const chat = model.startChat({
        history: messages.map(msg => ({
          role: msg.role,
          parts: [{ text: msg.content }]
        }))
      })

      const result = await chat.sendMessage(userMessage)
      const response = await result.response
      const aiMessage = response.text()

      // Add AI response
      const updatedMessages = [...newMessages, { role: 'model', content: aiMessage }]
      setMessages(updatedMessages)

      // Save to Firestore
      await saveConversation(updatedMessages)
    } catch (error) {
      console.error('Error:', error)
      setMessages([...newMessages, {
        role: 'model',
        content: 'Sorry, I encountered an error. Please try again.'
      }])
    } finally {
      setLoading(false)
    }
  }

  const saveConversation = async (msgs) => {
    try {
      if (!currentConversationId) {
        // Create new conversation
        const conversationsRef = collection(db, 'users', user.uid, 'conversations')
        const docRef = await addDoc(conversationsRef, {
          topic: msgs[0]?.content.substring(0, 50) || 'New Chat',
          messages: msgs,
          timestamp: serverTimestamp()
        })
        setCurrentConversationId(docRef.id)
      } else {
        // Update existing conversation
        const docRef = doc(db, 'users', user.uid, 'conversations', currentConversationId)
        await updateDoc(docRef, {
          messages: msgs,
          timestamp: serverTimestamp()
        })
      }
      await loadUserData()
    } catch (error) {
      console.error('Error saving conversation:', error)
    }
  }

  const saveNote = async (content) => {
    try {
      const notesRef = collection(db, 'users', user.uid, 'savedNotes')
      await addDoc(notesRef, {
        content,
        timestamp: serverTimestamp()
      })
      await loadUserData()
      alert('Note saved!')
    } catch (error) {
      console.error('Error saving note:', error)
    }
  }

  const deleteConversation = async (id) => {
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'conversations', id))
      await loadUserData()
    } catch (error) {
      console.error('Error deleting conversation:', error)
    }
  }

  const deleteNote = async (id) => {
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'savedNotes', id))
      await loadUserData()
    } catch (error) {
      console.error('Error deleting note:', error)
    }
  }

  const loadConversation = (convo) => {
    setMessages(convo.messages || [])
    setCurrentConversationId(convo.id)
    setActiveScreen('assistant')
    setActiveMenu('AI Assistant')
  }

  const startNewChat = () => {
    setMessages([])
    setCurrentConversationId(null)
    setActiveScreen('assistant')
    setActiveMenu('AI Assistant')
  }

  const exportChat = () => {
    const text = messages.map(msg =>
      `${msg.role === 'user' ? 'You' : 'AI'}: ${msg.content}`
    ).join('\n\n')

    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `aivy-chat-${new Date().toISOString()}.txt`
    a.click()
  }

  const useSuggestion = (suggestion) => {
    setInput(suggestion)
  }

  const suggestions = [
    "Explain quantum physics in simple terms",
    "Create study notes on World War 2",
    "Solve: Find the derivative of x^2 + 3x + 2",
    "Summarize the main points of photosynthesis",
    "Create 5 practice questions on Python loops",
    "Explain the concept of machine learning"
  ]

  const navItems = [
    { id: 'home', label: 'Home', icon: '🏠' },
    { id: 'assistant', label: 'AI Assistant', icon: '💬' },
    { id: 'history', label: 'Chat History', icon: '📜' },
    { id: 'saved', label: 'Saved Notes', icon: '⭐' },
  ]

  return (
    <div className="grid grid-cols-[260px_1fr] h-screen bg-gray-950 text-white">
      {/* Sidebar */}
      <div className="bg-gray-900 border-r border-gray-800 flex flex-col">
        <div className="p-6 border-b border-gray-800">
          <div className="text-2xl font-bold bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
            AIVY
          </div>
          <div className="text-xs text-gray-500 mt-1">AI Study Companion</div>
        </div>

        <div className="p-4 border-b border-gray-800">
          <button
            onClick={startNewChat}
            className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:from-blue-500 hover:to-purple-500 transition flex items-center justify-center gap-2"
          >
            <span>✨</span> New Chat
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveMenu(item.label)
                setActiveScreen(item.id)
              }}
              className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition flex items-center gap-3 ${activeMenu === item.label
                  ? 'bg-gradient-to-r from-blue-600/20 to-purple-600/20 text-white border border-blue-500/30'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                }`}
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-800">
          <div className="mb-3 px-3 py-2 bg-gray-800/50 rounded-lg">
            <div className="text-xs text-gray-500 mb-1">Your Stats</div>
            <div className="text-sm font-medium">{userStats.totalChats} Chats</div>
            <div className="text-sm font-medium">{userStats.savedNotes} Notes</div>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full px-4 py-2.5 text-sm text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded-lg transition"
          >
            🚪 Sign out
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col h-screen">
        {/* Home Screen */}
        {activeScreen === 'home' && (
          <div className="flex-1 overflow-y-auto p-8">
            <div className="mb-8">
              <h1 className="text-3xl font-bold mb-2">Welcome back! 👋</h1>
              <p className="text-gray-400">Your AI-powered study companion is ready to help</p>
            </div>

            <div className="grid grid-cols-3 gap-6 mb-8">
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 text-center">
                <div className="text-4xl font-bold text-blue-500 mb-2">{userStats.totalChats}</div>
                <div className="text-sm text-gray-400">Total Chats</div>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 text-center">
                <div className="text-4xl font-bold text-purple-500 mb-2">{userStats.savedNotes}</div>
                <div className="text-sm text-gray-400">Saved Notes</div>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 text-center">
                <div className="text-4xl font-bold text-pink-500 mb-2">{userStats.studyTime}m</div>
                <div className="text-sm text-gray-400">Study Time</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="bg-gradient-to-br from-blue-600/20 to-blue-800/20 border border-blue-500/30 rounded-2xl p-6">
                <div className="text-4xl mb-3">💬</div>
                <div className="text-xl font-semibold mb-2">AI Chat Assistant</div>
                <p className="text-sm text-gray-400 mb-4">Ask any question and get instant, detailed explanations</p>
                <button
                  onClick={startNewChat}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-500 transition"
                >
                  Start Chatting
                </button>
              </div>

              <div className="bg-gradient-to-br from-purple-600/20 to-purple-800/20 border border-purple-500/30 rounded-2xl p-6">
                <div className="text-4xl mb-3">📚</div>
                <div className="text-xl font-semibold mb-2">Study Notes</div>
                <p className="text-sm text-gray-400 mb-4">Generate comprehensive study notes on any topic</p>
                <button
                  onClick={() => useSuggestion("Create study notes on ")}
                  className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-500 transition"
                >
                  Generate Notes
                </button>
              </div>

              <div className="bg-gradient-to-br from-pink-600/20 to-pink-800/20 border border-pink-500/30 rounded-2xl p-6">
                <div className="text-4xl mb-3">🧮</div>
                <div className="text-xl font-semibold mb-2">Problem Solver</div>
                <p className="text-sm text-gray-400 mb-4">Get step-by-step solutions to homework problems</p>
                <button
                  onClick={() => useSuggestion("Solve: ")}
                  className="px-4 py-2 bg-pink-600 text-white text-sm font-medium rounded-lg hover:bg-pink-500 transition"
                >
                  Solve Problem
                </button>
              </div>

              <div className="bg-gradient-to-br from-green-600/20 to-green-800/20 border border-green-500/30 rounded-2xl p-6">
                <div className="text-4xl mb-3">🎯</div>
                <div className="text-xl font-semibold mb-2">Quiz Generator</div>
                <p className="text-sm text-gray-400 mb-4">Create practice questions to test your knowledge</p>
                <button
                  onClick={() => useSuggestion("Create 5 practice questions on ")}
                  className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-500 transition"
                >
                  Create Quiz
                </button>
              </div>
            </div>
          </div>
        )}

        {/* AI Assistant Screen */}
        {activeScreen === 'assistant' && (
          <div className="flex flex-col h-full">
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-800 bg-gray-900">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">AI Assistant</h2>
                  <p className="text-xs text-gray-500">Ask me anything!</p>
                </div>
                {messages.length > 0 && (
                  <button
                    onClick={exportChat}
                    className="px-4 py-2 text-sm bg-gray-800 hover:bg-gray-700 rounded-lg transition"
                  >
                    📥 Export Chat
                  </button>
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.length === 0 && (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">💬</div>
                  <h3 className="text-xl font-semibold mb-2">Start a conversation</h3>
                  <p className="text-gray-400 mb-6">Try one of these suggestions:</p>
                  <div className="grid grid-cols-2 gap-3 max-w-2xl mx-auto">
                    {suggestions.map((sug, i) => (
                      <button
                        key={i}
                        onClick={() => useSuggestion(sug)}
                        className="p-3 bg-gray-900 border border-gray-800 rounded-lg text-sm text-left hover:border-blue-500/50 hover:bg-gray-800 transition"
                      >
                        {sug}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl p-4 ${msg.role === 'user'
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                        : 'bg-gray-900 border border-gray-800 text-gray-200'
                      }`}
                  >
                    <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
                    {msg.role === 'model' && (
                      <div className="mt-3 pt-3 border-t border-gray-800 flex gap-2">
                        <button
                          onClick={() => navigator.clipboard.writeText(msg.content)}
                          className="text-xs px-3 py-1 bg-gray-800 hover:bg-gray-700 rounded-lg transition"
                        >
                          📋 Copy
                        </button>
                        <button
                          onClick={() => saveNote(msg.content)}
                          className="text-xs px-3 py-1 bg-gray-800 hover:bg-gray-700 rounded-lg transition"
                        >
                          ⭐ Save
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
                    <div className="flex gap-2">
                      <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-gray-800 bg-gray-900">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  placeholder="Ask me anything..."
                  className="flex-1 px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                  disabled={loading}
                />
                <button
                  onClick={sendMessage}
                  disabled={loading || !input.trim()}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-medium rounded-lg hover:from-blue-500 hover:to-purple-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Chat History */}
        {activeScreen === 'history' && (
          <div className="flex-1 overflow-y-auto p-8">
            <div className="mb-6">
              <h1 className="text-2xl font-semibold mb-2">📜 Chat History</h1>
              <p className="text-sm text-gray-400">View and manage your past conversations</p>
            </div>

            {conversations.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📭</div>
                <p className="text-gray-400">No conversations yet</p>
                <button
                  onClick={startNewChat}
                  className="mt-4 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition"
                >
                  Start Your First Chat
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {conversations.map((convo) => (
                  <div
                    key={convo.id}
                    className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-blue-500/50 transition"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium mb-1">{convo.topic}</h3>
                        <p className="text-sm text-gray-500">
                          {convo.messages?.length || 0} messages
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => loadConversation(convo)}
                          className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 rounded-lg transition"
                        >
                          Open
                        </button>
                        <button
                          onClick={() => deleteConversation(convo.id)}
                          className="px-4 py-2 text-sm bg-red-600/20 text-red-400 hover:bg-red-600/30 rounded-lg transition"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Saved Notes */}
        {activeScreen === 'saved' && (
          <div className="flex-1 overflow-y-auto p-8">
            <div className="mb-6">
              <h1 className="text-2xl font-semibold mb-2">⭐ Saved Notes</h1>
              <p className="text-sm text-gray-400">Your bookmarked AI responses</p>
            </div>

            {savedNotes.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">⭐</div>
                <p className="text-gray-400">No saved notes yet</p>
                <p className="text-sm text-gray-500 mt-2">Save important AI responses from your chats</p>
              </div>
            ) : (
              <div className="space-y-4">
                {savedNotes.map((note) => (
                  <div
                    key={note.id}
                    className="bg-gray-900 border border-gray-800 rounded-xl p-5"
                  >
                    <div className="text-sm text-gray-300 whitespace-pre-wrap mb-4">
                      {note.content}
                    </div>
                    <div className="flex gap-2 pt-3 border-t border-gray-800">
                      <button
                        onClick={() => navigator.clipboard.writeText(note.content)}
                        className="px-4 py-2 text-sm bg-gray-800 hover:bg-gray-700 rounded-lg transition"
                      >
                        📋 Copy
                      </button>
                      <button
                        onClick={() => deleteNote(note.id)}
                        className="px-4 py-2 text-sm bg-red-600/20 text-red-400 hover:bg-red-600/30 rounded-lg transition"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default DashboardNew
