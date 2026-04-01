import { useState, useEffect, useRef } from 'react'
import Sidebar from '../components/Sidebar'
import { subscribeToLeaderboard, getUserStats } from '../services/gamificationService'
import { auth } from '../firebase'
import { Trophy, Crown, Wifi, WifiOff } from 'lucide-react'

function Leaderboard() {
    const [board, setBoard] = useState([])
    const [loading, setLoading] = useState(true)
    const [live, setLive] = useState(false)
    const [userStats, setUserStats] = useState(null)
    const unsubRef = useRef(null)
    const user = auth.currentUser

    useEffect(() => {
        // Load current user stats
        getUserStats().then(setUserStats).catch(console.error)

        // Subscribe to real-time leaderboard
        setLoading(true)
        unsubRef.current = subscribeToLeaderboard((data) => {
            setBoard(data)
            setLoading(false)
            setLive(true)
        })

        // Handle offline — if no data after 6s, show empty state
        const timeout = setTimeout(() => {
            setLoading(false)
        }, 6000)

        return () => {
            clearTimeout(timeout)
            if (unsubRef.current) unsubRef.current()
            setLive(false)
        }
    }, [])

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
                <div className="page-header">
                    <div>
                        <h1 className="page-title">Leaderboard</h1>
                        <p className="page-subtitle">Top learners ranked by experience points</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        {/* Live indicator */}
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
                                padding: '0.3rem 0.75rem',
                                borderRadius: '100px',
                                border: '1px solid var(--color-border)'
                            }}
                        >
                            {live
                                ? <><Wifi size={13} /> Live</>
                                : <><WifiOff size={13} /> Connecting</>
                            }
                        </div>

                        {userRank > 0 && (
                            <div className="your-rank-badge">
                                <Trophy size={16} />
                                <span>Your Rank: #{userRank}</span>
                            </div>
                        )}
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
                        {/* Podium — top 3 */}
                        {board.length >= 3 && (
                            <div className="podium-row">
                                {[board[1], board[0], board[2]].map((entry, pos) => {
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
                        )}

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
