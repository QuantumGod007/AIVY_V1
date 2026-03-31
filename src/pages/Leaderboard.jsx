import { useState, useEffect } from 'react'
import Sidebar from '../components/Sidebar'
import { getLeaderboard, getUserStats } from '../services/gamificationService'
import { auth } from '../firebase'
import { Trophy, Loader2, Crown } from 'lucide-react'

function Leaderboard() {
    const [board, setBoard] = useState([])
    const [loading, setLoading] = useState(true)
    const [userStats, setUserStats] = useState(null)
    const user = auth.currentUser

    useEffect(() => {
        const load = async () => {
            try {
                const [lb, stats] = await Promise.all([getLeaderboard(), getUserStats()])
                setBoard(lb)
                setUserStats(stats)
            } catch (e) {
                console.error(e)
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [])

    const userRank = board.findIndex(u => u.userId === user?.uid) + 1

    const getLevel = (xp) => {
        if (xp >= 500) return 5
        if (xp >= 250) return 4
        if (xp >= 100) return 3
        if (xp >= 50) return 2
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
                    {userRank > 0 && (
                        <div className="your-rank-badge">
                            <Trophy size={16} />
                            <span>Your Rank: #{userRank}</span>
                        </div>
                    )}
                </div>

                {loading ? (
                    <div className="page-loading">
                        <Loader2 size={32} className="processing-spinner" />
                        <p>Loading leaderboard...</p>
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
                                            </div>
                                            <div className="lb-meta">Level {getLevel(entry.totalXP)} · {entry.badges?.length ?? 0} badges</div>
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
