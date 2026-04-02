import { useState, useEffect, useRef } from 'react'
import Sidebar from '../components/Sidebar'
import { subscribeToLeaderboard, subscribeToTopicLeaderboard, getUserStats } from '../services/gamificationService'
import { getQuizResults } from '../services/storageService'
import { auth } from '../firebase'
import { Trophy, Crown, Wifi, WifiOff, Globe, BookText, ChevronDown } from 'lucide-react'

function Leaderboard() {
    const [mode, setMode] = useState('global') // global | topic
    const [board, setBoard] = useState([])
    const [loading, setLoading] = useState(true)
    const [live, setLive] = useState(false)
    const [userStats, setUserStats] = useState(null)
    const [topics, setTopics] = useState([])
    const [selectedTopic, setSelectedTopic] = useState('')
    const unsubRef = useRef(null)
    const user = auth.currentUser

    useEffect(() => {
        // Load current user stats
        getUserStats().then(setUserStats).catch(console.error)
        
        // Load studied topics for the filter — deduplicate + normalize
        getQuizResults().then(results => {
            const rawTopics = results.map(r => (r.documentName || '').replace(/ — Recovery/g, ''))
            const uniqueTopics = [...new Set(rawTopics)].filter(Boolean)
            setTopics(uniqueTopics)
            if (uniqueTopics.length > 0 && !selectedTopic) {
                setSelectedTopic(uniqueTopics[0])
            }
        })
    }, [])

    useEffect(() => {
        setLoading(true)
        if (unsubRef.current) unsubRef.current()

        if (mode === 'global') {
            unsubRef.current = subscribeToLeaderboard((data) => {
                setBoard(data)
                setLoading(false)
                setLive(true)
            })
        } else if (mode === 'topic' && selectedTopic) {
            unsubRef.current = subscribeToTopicLeaderboard(selectedTopic, (data) => {
                setBoard(data)
                setLoading(false)
                setLive(true)
            })
        } else {
            setLoading(false)
        }

        return () => {
            if (unsubRef.current) unsubRef.current()
            setLive(false)
        }
    }, [mode, selectedTopic])

    const userRank = board.findIndex(u => u.userId === user?.uid) + 1

    const getLevel = (xp) => {
        if (xp >= 500) return 5
        if (xp >= 250) return 4
        if (xp >= 100) return 3
        if (xp >= 50)  return 2
        return 1
    }

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="app-main">
                <div className="page-header" style={{ marginBottom: '1.5rem' }}>
                    <div>
                        <h1 className="page-title">Leaderboard</h1>
                        <p className="page-subtitle">
                            {mode === 'global' ? 'Top learners globally' : `Rankings for ${selectedTopic}`}
                        </p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        {/* Mode Switcher */}
                        <div style={{
                            display: 'flex', background: 'var(--color-bg-elevated)',
                            padding: '0.2rem', borderRadius: '100px', border: '1px solid var(--color-border)'
                        }}>
                            {[
                                { id: 'global', icon: Globe, label: 'Global' },
                                { id: 'topic', icon: BookText, label: 'Subject' }
                            ].map(btn => (
                                <button
                                    key={btn.id}
                                    onClick={() => setMode(btn.id)}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '0.4rem',
                                        padding: '0.35rem 0.875rem', borderRadius: '100px',
                                        border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                                        fontSize: '0.75rem', fontWeight: 600,
                                        background: mode === btn.id ? 'var(--color-accent)' : 'transparent',
                                        color: mode === btn.id ? '#fff' : 'var(--color-text-muted)',
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    <btn.icon size={13} /> {btn.label}
                                </button>
                            ))}
                        </div>

                        {mode === 'topic' && topics.length > 0 && (
                            <div style={{ position: 'relative' }}>
                                <select 
                                    value={selectedTopic}
                                    onChange={(e) => setSelectedTopic(e.target.value)}
                                    style={{
                                        padding: '0.45rem 1.75rem 0.45rem 0.875rem',
                                        background: 'var(--color-bg-elevated)',
                                        border: '1px solid var(--color-border)',
                                        borderRadius: '10px',
                                        fontFamily: 'inherit', fontWeight: 600, fontSize: '0.75rem',
                                        color: 'var(--color-text-primary)', cursor: 'pointer', appearance: 'none'
                                    }}
                                >
                                    {topics.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                                <ChevronDown size={14} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--color-text-muted)' }} />
                            </div>
                        )}
                        
                        <div
                            title={live ? 'Real-time updates active' : 'Connecting...'}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.4rem',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                color: live ? 'var(--color-success, #22c55e)' : 'var(--color-text-muted)',
                                background: 'var(--color-bg-elevated)',
                                padding: '0.4rem 0.875rem',
                                borderRadius: '100px',
                                border: '1px solid var(--color-border)'
                            }}
                        >
                            {live ? <><Wifi size={13} /> Live</> : <><WifiOff size={13} /> Offline</>}
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="page-loading">
                        <div style={{
                            width: 36, height: 36, borderRadius: '50%',
                            border: '3px solid var(--color-border)',
                            borderTopColor: 'var(--color-accent)',
                            animation: 'spin 0.8s linear infinite'
                        }} />
                        <p style={{ marginTop: '1rem', color: 'var(--color-text-muted)' }}>
                            Connecting to live leaderboard…
                        </p>
                    </div>
                ) : board.length === 0 ? (
                    <div className="empty-page-state">
                        <Trophy size={48} />
                        <h2>No entries yet</h2>
                        <p>Complete quizzes to earn XP and appear on the leaderboard.</p>
                    </div>
                ) : (
                    <div className="leaderboard-layout fade-in">
                        {/* Podium — top 1-3 */}
                        <div className="podium-row">
                            {[1, 0, 2].map((pos) => {
                                const entry = board[pos]
                                if (!entry) return null
                                const actualRank = pos === 0 ? 2 : pos === 1 ? 1 : 3
                                const isMe = entry?.userId === user?.uid
                                return (
                                    <div
                                        key={entry?.userId}
                                        className={`podium-block podium-rank-${actualRank} ${isMe ? 'podium-me' : ''}`}
                                    >
                                        {actualRank === 1 && (
                                            <Crown size={20} className="podium-crown" />
                                        )}
                                        <div className="podium-avatar">
                                            {entry?.name?.[0]?.toUpperCase() || entry?.email?.[0]?.toUpperCase() || '?'}
                                        </div>
                                        <div className="podium-name">
                                            {isMe ? 'You' : (entry?.name || entry?.email?.split('@')[0] || 'User')}
                                        </div>
                                        <div className="podium-xp">{entry?.totalXP ?? 0} XP</div>
                                        <div className="podium-base">#{actualRank}</div>
                                    </div>
                                )
                            })}
                        </div>

                        {/* Full list */}
                        <div className="leaderboard-list">
                            {board.map((entry, i) => {
                                const isMe = entry.userId === user?.uid
                                const rank = i + 1
                                return (
                                    <div
                                        key={entry.userId}
                                        className={`leaderboard-row ${isMe ? 'leaderboard-row-me' : ''}`}
                                    >
                                        <div className="lb-rank">
                                            {rank <= 3 ? (
                                                <span className={`lb-rank-medal rank-${rank}`}>{rank}</span>
                                            ) : (
                                                <span className="lb-rank-num">{rank}</span>
                                            )}
                                        </div>
                                        <div className="lb-avatar">
                                            {entry.name?.[0]?.toUpperCase() || entry.email?.[0]?.toUpperCase() || '?'}
                                        </div>
                                        <div className="lb-info">
                                            <div className="lb-name">
                                                {isMe ? 'You' : (entry.name || entry.email?.split('@')[0] || 'Anonymous')}
                                                {isMe && (
                                                    <span style={{
                                                        fontSize: '0.65rem',
                                                        background: 'var(--color-accent)',
                                                        color: '#fff',
                                                        padding: '1px 6px',
                                                        borderRadius: '4px',
                                                        marginLeft: '0.4rem',
                                                        fontWeight: 700
                                                    }}>YOU</span>
                                                )}
                                            </div>
                                            <div className="lb-meta">
                                                Level {getLevel(entry.totalXP)} · {entry.badges?.length ?? 0} badges
                                            </div>
                                        </div>
                                        <div className="lb-xp">
                                            <span className="lb-xp-value">{entry.totalXP}</span>
                                            <span className="lb-xp-label">XP</span>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}
            </main>
        </div>
    )
}

export default Leaderboard
