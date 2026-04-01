import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import { getArchivedSessions, restoreSession } from '../services/storageService'
import { 
    History, 
    RefreshCw, 
    FileText, 
    Calendar, 
    ChevronRight, 
    Search,
    Brain,
    Loader2
} from 'lucide-react'

function Sessions() {
    const [sessions, setSessions] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [restoring, setRestoring] = useState(null)
    const navigate = useNavigate()

    useEffect(() => {
        loadSessions()
    }, [])

    const loadSessions = async () => {
        setLoading(true)
        try {
            const data = await getArchivedSessions()
            setSessions(data)
        } catch (error) {
            console.error('Error loading sessions:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleRestore = async (sessionId) => {
        setRestoring(sessionId)
        try {
            await restoreSession(sessionId)
            navigate('/dashboard')
        } catch (error) {
            console.error('Error restoring session:', error)
            alert('Failed to restore session.')
        } finally {
            setRestoring(null)
        }
    }

    const filteredSessions = sessions.filter(s => 
        s.documentName?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="app-main">
                <div className="page-header">
                    <div>
                        <h1 className="page-title">Study Sessions</h1>
                        <p className="page-subtitle">Your archived learning history and study materials</p>
                    </div>
                </div>

                <div className="sessions-search">
                    <div className="search-box">
                        <Search size={18} />
                        <input 
                            type="text" 
                            placeholder="Search by document name..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="page-loading">
                        <Loader2 className="processing-spinner" size={32} />
                        <p>Loading your history...</p>
                    </div>
                ) : filteredSessions.length === 0 ? (
                    <div className="empty-page-state">
                        <History size={48} />
                        <h2>No sessions found</h2>
                        <p>{searchTerm ? 'No matches for your search.' : 'Your archived study sessions will appear here.'}</p>
                    </div>
                ) : (
                    <div className="sessions-list fade-in">
                        {filteredSessions.map((session) => (
                            <div key={session.id} className="session-card">
                                <div className="session-icon">
                                    <FileText size={24} />
                                </div>
                                <div className="session-info">
                                    <h3 className="session-name">{session.documentName || 'Untitled Document'}</h3>
                                    <div className="session-meta">
                                        <span><Calendar size={12} /> {new Date(session.archivedAt).toLocaleDateString()}</span>
                                        <span><Brain size={12} /> {session.questions?.length || 0} Questions</span>
                                    </div>
                                </div>
                                <div className="session-actions">
                                    <button 
                                        className="btn btn-secondary btn-sm btn-icon"
                                        onClick={() => handleRestore(session.id)}
                                        disabled={restoring === session.id}
                                    >
                                        {restoring === session.id ? (
                                            <Loader2 size={14} className="processing-spinner" />
                                        ) : (
                                            <RefreshCw size={14} />
                                        )}
                                        Restore
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            <style>{`
                .sessions-search {
                    margin-bottom: 2rem;
                }
                .search-box {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    background: var(--color-bg-elevated);
                    border: 1px solid var(--color-border);
                    border-radius: 12px;
                    padding: 0.75rem 1.25rem;
                    max-width: 400px;
                }
                .search-box input {
                    background: transparent;
                    border: none;
                    color: var(--color-text-primary);
                    width: 100%;
                    outline: none;
                }
                .sessions-list {
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                }
                .session-card {
                    display: flex;
                    align-items: center;
                    background: var(--color-bg-card);
                    border: 1px solid var(--color-border);
                    border-radius: 16px;
                    padding: 1.25rem;
                    transition: all 0.3s ease;
                }
                .session-card:hover {
                    border-color: var(--color-accent);
                    transform: translateX(4px);
                    background: var(--color-bg-hover);
                }
                .session-icon {
                    width: 48px;
                    height: 48px;
                    background: var(--color-accent-light);
                    color: var(--color-accent);
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-right: 1.25rem;
                }
                .session-info {
                    flex: 1;
                }
                .session-name {
                    font-size: 1.1rem;
                    font-weight: 600;
                    margin-bottom: 0.35rem;
                }
                .session-meta {
                    display: flex;
                    gap: 1.25rem;
                    font-size: 0.8rem;
                    color: var(--color-text-muted);
                }
                .session-meta span {
                    display: flex;
                    align-items: center;
                    gap: 0.35rem;
                }
                .session-actions {
                    display: flex;
                    gap: 0.75rem;
                }
                .btn-sm {
                    padding: 0.5rem 1rem;
                    font-size: 0.8rem;
                }
            `}</style>
        </div>
    )
}

export default Sessions
