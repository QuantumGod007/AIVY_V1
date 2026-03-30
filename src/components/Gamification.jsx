import { useState, useEffect } from 'react';
import { getUserStats, getLeaderboard, getBadgeDetails, BADGES } from '../services/gamificationService';
import { Trophy, Award, TrendingUp, Star } from 'lucide-react';
import './Gamification.css';

function Gamification() {
    const [stats, setStats] = useState(null);
    const [leaderboard, setLeaderboard] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('stats'); // stats, badges, leaderboard

    useEffect(() => {
        loadGamificationData();
    }, []);

    const loadGamificationData = async () => {
        try {
            setLoading(true);

            // Load user stats
            const userStats = await getUserStats();
            setStats(userStats);

            // Load leaderboard
            const leaderboardData = await getLeaderboard();
            setLeaderboard(leaderboardData);

        } catch (error) {
            console.error('Error loading gamification data:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="gamification-container">
                <div className="gamification-loading">Loading stats...</div>
            </div>
        );
    }

    if (!stats) {
        return null;
    }

    const userBadges = getBadgeDetails(stats.badges || []);
    const allBadges = Object.values(BADGES);

    return (
        <div className="gamification-container">
            {/* XP Card - Always visible */}
            <div className="xp-card">
                <div className="xp-icon">
                    <Star size={24} />
                </div>
                <div className="xp-info">
                    <div className="xp-label">Total XP</div>
                    <div className="xp-value">{stats.totalXP || 0}</div>
                </div>
                <div className="streak-info">
                    <div className="streak-icon">🔥</div>
                    <div className="streak-value">{stats.loginStreak || 1} day streak</div>
                </div>
            </div>

            {/* Tabs */}
            <div className="gamification-tabs">
                <button
                    className={`tab ${activeTab === 'badges' ? 'active' : ''}`}
                    onClick={() => setActiveTab('badges')}
                >
                    <Award size={16} />
                    Badges ({userBadges.length})
                </button>
                <button
                    className={`tab ${activeTab === 'leaderboard' ? 'active' : ''}`}
                    onClick={() => setActiveTab('leaderboard')}
                >
                    <Trophy size={16} />
                    Leaderboard
                </button>
            </div>

            {/* Badges Tab */}
            {activeTab === 'badges' && (
                <div className="badges-grid">
                    {allBadges.map(badge => {
                        const isEarned = stats.badges.includes(badge.id);
                        return (
                            <div
                                key={badge.id}
                                className={`badge-card ${isEarned ? 'earned' : 'locked'}`}
                            >
                                <div className="badge-icon">{badge.icon}</div>
                                <div className="badge-name">{badge.name}</div>
                                <div className="badge-desc">{badge.description}</div>
                                {isEarned && <div className="badge-earned-mark">✓</div>}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Leaderboard Tab */}
            {activeTab === 'leaderboard' && (
                <div className="leaderboard-container">
                    {leaderboard.length === 0 ? (
                        <div className="leaderboard-empty">
                            No leaderboard data yet. Be the first!
                        </div>
                    ) : (
                        <div className="leaderboard-list">
                            {leaderboard.map((entry, index) => (
                                <div key={entry.userId} className="leaderboard-item">
                                    <div className="leaderboard-rank">
                                        {index === 0 && '🥇'}
                                        {index === 1 && '🥈'}
                                        {index === 2 && '🥉'}
                                        {index > 2 && `#${index + 1}`}
                                    </div>
                                    <div className="leaderboard-user">
                                        <div className="leaderboard-name">{entry.name}</div>
                                        <div className="leaderboard-badges">
                                            {entry.badges.length} badges
                                        </div>
                                    </div>
                                    <div className="leaderboard-xp">
                                        <TrendingUp size={14} />
                                        {entry.totalXP} XP
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default Gamification;
