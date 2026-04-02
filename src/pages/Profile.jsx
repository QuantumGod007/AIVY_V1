import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import { getUserStats, getBadgeDetails, BADGES, updateUserProfile, getLeaderboardRank } from '../services/gamificationService'
import { getArchivedSessions } from '../services/storageService'
import { analyzeGlobalProgress } from '../services/geminiService'
import { auth } from '../firebase'
import { 
    Award, 
    Trophy, 
    Zap, 
    Calendar, 
    User, 
    TrendingUp, 
    Shield, 
    Flame,
    Loader2,
    Target,
    Activity,
    BarChart3,
    Clock,
    Medal,
    Brain,
    Sparkles
} from 'lucide-react'

function Profile() {
    const user = auth.currentUser
    const [stats, setStats] = useState(null)
    const [rank, setRank] = useState(0)
    const [sessions, setSessions] = useState([])
    const [aiInsights, setAiInsights] = useState(null)
    const [loading, setLoading] = useState(true)
    const [aiLoading, setAiLoading] = useState(false)
    const [isEditing, setIsEditing] = useState(false)
    const [tempName, setTempName] = useState(user?.displayName || user?.email?.split('@')[0] || 'Learner')
    const avatar = user?.email?.charAt(0).toUpperCase() || 'U'
    const name = user?.displayName || user?.email?.split('@')[0] || 'Learner'

    useEffect(() => {
        const loadAllData = async () => {
            setLoading(true)
            try {
                const [statsData, sessionData, currentRank] = await Promise.all([
                    getUserStats(),
                    getArchivedSessions(),
                    getLeaderboardRank()
                ])
                setStats(statsData)
                setSessions(sessionData)
                setRank(currentRank)

                // If sessions exist, triggers AI analysis
                if (sessionData.length > 0) {
                    setAiLoading(true)
                    const insights = await analyzeGlobalProgress(sessionData, statsData)
                    setAiInsights(insights)
                    setAiLoading(false)
                }
            } catch (err) {
                console.error('Profile load error:', err)
            } finally {
                setLoading(false)
            }
        }
        loadAllData()
    }, [])

    const handleUpdateName = async () => {
        if (!tempName.trim()) return
        try {
            await updateUserProfile(tempName)
            setIsEditing(false)
            window.location.reload() // Force sync across all components
        } catch (err) {
            console.error('Update name error:', err)
        }
    }

    if (loading) {
        return (
            <div className="app-layout">
                <Sidebar />
                <main className="app-main">
                    <div className="page-loading">
                        <Loader2 className="processing-spinner" size={32} />
                        <p>Fetching your progress...</p>
                    </div>
                </main>
            </div>
        )
    }

    const earnedBadges = getBadgeDetails(stats?.badges || [])
    const unearnedBadges = Object.values(BADGES).filter(b => !stats?.badges?.includes(b.id))
    const totalXP = stats?.totalXP || 0
    const level = stats?.level || Math.floor(totalXP / 100) + 1
    const nextLevelXP = level * 100
    const progressToNext = ((totalXP % 100) / 100) * 100

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="app-main">
                <div className="page-header">
                    <h1 className="page-title">Profile</h1>
                    <p className="page-subtitle">Your learning identity and achievements</p>
                </div>

                <div className="profile-layout">
                    {/* User Intro */}
                    <div className="profile-card profile-hero">
                        <div className="profile-avatar-large">{avatar}</div>
                        <div className="profile-info" style={{ flex: 1 }}>
                            {isEditing ? (
                                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                    <input 
                                        value={tempName} 
                                        onChange={(e) => setTempName(e.target.value)}
                                        className="profile-edit-input"
                                        placeholder="Display Name"
                                    />
                                    <button className="profile-edit-save" onClick={handleUpdateName}>Save</button>
                                    <button className="profile-edit-cancel" onClick={() => setIsEditing(false)}>Cancel</button>
                                </div>
                            ) : (
                                <h2 className="profile-name" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    {name}
                                    <button className="profile-edit-btn" onClick={() => setIsEditing(true)}>Edit</button>
                                </h2>
                            )}
                            <p className="profile-email">{user?.email}</p>
                            <div className="profile-level-badge">
                                <Shield size={14} /> Level {level}
                            </div>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="profile-stats-grid">
                        <div className="stat-card">
                            <Zap className="stat-icon-xp" size={20} />
                            <div className="stat-content">
                                <span className="stat-label">Total XP</span>
                                <span className="stat-value">{totalXP}</span>
                            </div>
                        </div>
                        <div className="stat-card">
                            <Trophy className="stat-icon-badges" size={20} />
                            <div className="stat-content">
                                <span className="stat-label">Leaderboard Rank</span>
                                <span className="stat-value">{rank > 0 ? `#${rank}` : 'Unranked'}</span>
                            </div>
                        </div>
                        <div className="stat-card">
                            <Flame className="stat-icon-streak" size={20} />
                            <div className="stat-content">
                                <span className="stat-label">Day Streak</span>
                                <span className="stat-value">{stats?.loginStreak || 1}</span>
                            </div>
                        </div>
                    </div>

                    {/* Level Progress */}
                    <div className="profile-card">
                        <div className="card-header-minimal">
                            <h3>Level Progress</h3>
                            <span className="text-muted">{totalXP % 100} / 100 XP to Level {level + 1}</span>
                        </div>
                        <div className="level-bar-container">
                            <div className="level-bar-fill" style={{ width: `${progressToNext}%` }}></div>
                        </div>
                    </div>

                    {/* Badges Section */}
                    <div className="profile-card">
                        <div className="card-header-minimal">
                            <h3>Achievements</h3>
                        </div>
                        <div className="badges-grid-premium">
                            {earnedBadges.map(badge => (
                                <div key={badge.id} className="badge-item-premium earned">
                                    <div className="badge-icon-premium">{badge.icon}</div>
                                    <div className="badge-details-premium">
                                        <h4>{badge.name}</h4>
                                        <p>{badge.description}</p>
                                    </div>
                                    <div className="badge-check-premium"><Target size={14} /></div>
                                </div>
                            ))}
                            {unearnedBadges.map(badge => (
                                <div key={badge.id} className="badge-item-premium locked">
                                    <div className="badge-icon-premium">{badge.icon}</div>
                                    <div className="badge-details-premium">
                                        <h4>{badge.name}</h4>
                                        <p>{badge.description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* AI Insights Section */}
                    <div className="profile-grid">
                      <div className="profile-card">
                        <div className="card-header-minimal">
                          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Brain size={18} style={{ color: 'var(--color-accent)' }} /> 
                            AI Learning Profile
                          </h3>
                          {aiLoading && <Loader2 className="processing-spinner" size={14} />}
                        </div>
                        {aiInsights ? (
                          <div className="focus-chart-mock">
                             <div style={{ marginBottom: '1rem', padding: '0.75rem', background: 'var(--color-bg-secondary)', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
                                <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Learning Style</div>
                                <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-accent)' }}>{aiInsights.learningStyle}</div>
                             </div>

                             <div className="focus-row">
                              <span>Consistency</span>
                              <div className="focus-bar"><div className="focus-bar-fill" style={{ width: `${aiInsights.consistencyScore || 50}%`, background: 'var(--color-accent)' }}></div></div>
                              <span>{aiInsights.consistencyScore || 50}%</span>
                            </div>
                            <div className="focus-row">
                              <span>Retention</span>
                              <div className="focus-bar"><div className="focus-bar-fill" style={{ width: `${aiInsights.retentionScore || 50}%`, background: 'var(--color-accent-secondary)' }}></div></div>
                              <span>{aiInsights.retentionScore || 50}%</span>
                            </div>

                            <div style={{ marginTop: '1rem' }}>
                                <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Topical Strengths</div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                    {aiInsights.topicalStrengths?.map((s, i) => (
                                        <span key={i} style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem', background: 'rgba(52,211,153,0.1)', color: '#34d399', borderRadius: '100px', border: '1px solid rgba(52,211,153,0.2)' }}>{s}</span>
                                    ))}
                                </div>
                            </div>
                          </div>
                        ) : (
                          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                            <Activity size={24} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
                            <p>{aiLoading ? 'Analyzing your progress...' : 'Complete sessions to unlock AI insights'}</p>
                          </div>
                        )}
                      </div>
                      
                      <div className="profile-card">
                        <div className="card-header-minimal">
                          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Target size={18} style={{ color: 'var(--color-warning)' }} /> 
                            AI Growth Strategy
                          </h3>
                        </div>
                        {aiInsights ? (
                           <div className="milestones-list">
                              <div className="milestone-item" style={{ flexDirection: 'column', alignItems: 'flex-start', border: 'none' }}>
                                <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>Mastery Summary</div>
                                <p style={{ fontSize: '0.85rem', lineHeight: 1.5, color: 'var(--color-text-primary)', margin: 0 }}>{aiInsights.masteryInsights}</p>
                              </div>
                              
                              <div style={{ marginTop: '0.5rem', padding: '1rem', background: 'rgba(99,102,241,0.05)', borderRadius: '14px', border: '1px solid rgba(99,102,241,0.1)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                    <Sparkles size={14} style={{ color: 'var(--color-accent)' }} />
                                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-accent)', textTransform: 'uppercase' }}>Next Major Goal</span>
                                </div>
                                <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-primary)', margin: 0 }}>{aiInsights.nextBigGoal}</p>
                              </div>

                              <div style={{ marginTop: '0.5rem' }}>
                                <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Focus Required</div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                    {aiInsights.improvementAreas?.map((a, i) => (
                                        <span key={i} style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem', background: 'rgba(248,113,113,0.1)', color: '#f87171', borderRadius: '100px', border: '1px solid rgba(248,113,113,0.2)' }}>{a}</span>
                                    ))}
                                </div>
                              </div>
                           </div>
                        ) : (
                          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                            <TrendingUp size={24} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
                            <p>Unlock personalized goals by studying more topics</p>
                          </div>
                        )}
                      </div>
                    </div>
                </div>
            </main>

            <style>{`
                .profile-layout {
                    display: flex;
                    flex-direction: column;
                    gap: 1.5rem;
                    max-width: 900px;
                }
                .profile-card {
                    background: var(--color-bg-card);
                    border: 1px solid var(--color-border);
                    border-radius: 20px;
                    padding: 1.5rem;
                }
                .profile-hero {
                    display: flex;
                    align-items: center;
                    gap: 2rem;
                    background: linear-gradient(135deg, var(--color-bg-elevated), rgba(99, 102, 241, 0.1));
                }
                .profile-avatar-large {
                    width: 100px;
                    height: 100px;
                    background: var(--color-accent);
                    color: white;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 2.5rem;
                    font-weight: 800;
                    box-shadow: 0 10px 25px rgba(99, 102, 241, 0.4);
                    border: 4px solid var(--color-bg-primary);
                }
                .profile-info h2 {
                    font-size: 1.8rem;
                    margin-bottom: 0.25rem;
                }
                .profile-email {
                    color: var(--color-text-muted);
                    margin-bottom: 1rem;
                }
                .profile-level-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.5rem;
                    background: var(--color-accent-light);
                    color: var(--color-accent);
                    padding: 0.4rem 1rem;
                    border-radius: 100px;
                    font-size: 0.85rem;
                    font-weight: 700;
                    border: 1px solid var(--color-accent-glow);
                }
                .profile-stats-grid {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 1.5rem;
                }
                .stat-card {
                    background: var(--color-bg-card);
                    border: 1px solid var(--color-border);
                    border-radius: 20px;
                    padding: 1.25rem;
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                }
                .stat-icon-xp { color: var(--color-warning); }
                .stat-icon-streak { color: var(--color-error); }
                .stat-icon-badges { color: var(--color-accent); }
                .stat-label {
                    display: block;
                    font-size: 0.75rem;
                    color: var(--color-text-muted);
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    font-weight: 600;
                }
                .stat-value {
                    font-size: 1.5rem;
                    font-weight: 800;
                }
                .card-header-minimal {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 1.25rem;
                }
                .level-bar-container {
                    height: 10px;
                    background: var(--color-bg-secondary);
                    border-radius: 100px;
                    overflow: hidden;
                    border: 1px solid var(--color-border);
                }
                .level-bar-fill {
                    height: 100%;
                    background: linear-gradient(90deg, var(--color-accent), var(--color-accent-secondary));
                    box-shadow: 0 0 10px var(--color-accent-glow);
                    border-radius: 100px;
                }
                .badges-grid-premium {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
                    gap: 1rem;
                }
                .badge-item-premium {
                    display: flex;
                    align-items: center;
                    padding: 1rem;
                    border-radius: 16px;
                    border: 1px solid var(--color-border);
                    position: relative;
                }
                .badge-item-premium.earned {
                  background: var(--color-bg-elevated);
                  border-color: var(--color-accent-glow);
                }
                .badge-item-premium.locked {
                  opacity: 0.5;
                  filter: grayscale(1);
                  background: var(--color-bg-secondary);
                }
                .badge-icon-premium {
                    font-size: 2rem;
                    margin-right: 1rem;
                }
                .badge-details-premium h4 {
                    font-size: 1rem;
                    margin-bottom: 0.2rem;
                }
                .badge-details-premium p {
                    font-size: 0.75rem;
                    color: var(--color-text-muted);
                }
                .badge-check-premium {
                    position: absolute;
                    top: 0.75rem;
                    right: 0.75rem;
                    color: var(--color-success);
                }
                .profile-grid {
                  display: grid;
                  grid-template-columns: repeat(2, 1fr);
                  gap: 1.5rem;
                }
                .focus-row {
                  display: flex;
                  align-items: center;
                  gap: 1rem;
                  margin-bottom: 1rem;
                  font-size: 0.85rem;
                }
                .focus-row span:first-child { width: 80px; }
                .focus-row span:last-child { width: 35px; text-align: right; font-weight: 600; }
                .focus-bar {
                  flex: 1;
                  height: 6px;
                  background: var(--color-bg-secondary);
                  border-radius: 10px;
                  overflow: hidden;
                }
                .focus-bar-fill {
                  height: 100%;
                  border-radius: 10px;
                }
                .milestones-list {
                  display: flex;
                  flex-direction: column;
                  gap: 1rem;
                }
                .milestone-item {
                  display: flex;
                  align-items: center;
                  gap: 0.75rem;
                  font-size: 0.85rem;
                  padding-bottom: 0.75rem;
                  border-bottom: 1px solid var(--color-border-light);
                }
                .milestone-item:last-child { border: none; }
                .text-accent { color: var(--color-accent); }
                .profile-edit-btn {
                  font-size: 0.7rem;
                  padding: 0.2rem 0.6rem;
                  background: var(--color-bg-secondary);
                  border: 1px solid var(--color-border);
                  border-radius: 6px;
                  color: var(--color-text-muted);
                  cursor: pointer;
                  font-weight: 500;
                }
                .profile-edit-btn:hover { background: var(--color-bg-elevated); color: var(--color-text-primary); }
                .profile-edit-input {
                  background: var(--color-bg-primary);
                  border: 1px solid var(--color-accent);
                  border-radius: 10px;
                  padding: 0.6rem 1rem;
                  color: var(--color-text-primary);
                  font-family: inherit;
                  font-size: 1.1rem;
                  font-weight: 700;
                  width: 250px;
                }
                .profile-edit-save {
                  background: var(--color-accent);
                  color: white;
                  border: none;
                  border-radius: 10px;
                  padding: 0 1rem;
                  font-weight: 600;
                  cursor: pointer;
                }
                .profile-edit-cancel {
                  background: transparent;
                  color: var(--color-text-muted);
                  border: 1px solid var(--color-border);
                  border-radius: 10px;
                  padding: 0 1rem;
                  font-weight: 600;
                  cursor: pointer;
                }
            `}</style>
        </div>
    )
}

export default Profile
