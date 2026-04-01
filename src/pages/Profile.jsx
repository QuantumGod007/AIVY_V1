import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import { getUserStats, getBadgeDetails, BADGES } from '../services/gamificationService'
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
    Medal
} from 'lucide-react'

function Profile() {
    const [stats, setStats] = useState(null)
    const [loading, setLoading] = useState(true)
    const user = auth.currentUser
    const avatar = user?.email?.charAt(0).toUpperCase() || 'U'
    const name = user?.displayName || user?.email?.split('@')[0] || 'Learner'

    useEffect(() => {
        const loadStats = async () => {
            setLoading(true)
            try {
                const data = await getUserStats()
                setStats(data)
            } catch (err) {
                console.error(err)
            } finally {
                setLoading(false)
            }
        }
        loadStats()
    }, [])

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
                        <div className="profile-info">
                            <h2 className="profile-name">{name}</h2>
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
                            <Flame className="stat-icon-streak" size={20} />
                            <div className="stat-content">
                                <span className="stat-label">Day Streak</span>
                                <span className="stat-value">{stats?.loginStreak || 1}</span>
                            </div>
                        </div>
                        <div className="stat-card">
                            <Trophy className="stat-icon-badges" size={20} />
                            <div className="stat-content">
                                <span className="stat-label">Badges Earned</span>
                                <span className="stat-value">{earnedBadges.length}</span>
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

                    {/* Activity Summary Mockup */}
                    <div className="profile-grid">
                      <div className="profile-card">
                        <div className="card-header-minimal">
                          <h3>Learning Focus</h3>
                          <BarChart3 size={18} className="text-muted" />
                        </div>
                        <div className="focus-chart-mock">
                          <div className="focus-row">
                            <span>Accuracy</span>
                            <div className="focus-bar"><div className="focus-bar-fill" style={{ width: '85%', background: 'var(--color-success)' }}></div></div>
                            <span>85%</span>
                          </div>
                          <div className="focus-row">
                            <span>Consistency</span>
                            <div className="focus-bar"><div className="focus-bar-fill" style={{ width: '70%', background: 'var(--color-accent)' }}></div></div>
                            <span>70%</span>
                          </div>
                          <div className="focus-row">
                            <span>Retention</span>
                            <div className="focus-bar"><div className="focus-bar-fill" style={{ width: '92%', background: 'var(--color-accent-secondary)' }}></div></div>
                            <span>92%</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="profile-card">
                        <div className="card-header-minimal">
                          <h3>Recent Milestones</h3>
                          <Medal size={18} className="text-muted" />
                        </div>
                        <div className="milestones-list">
                          <div className="milestone-item">
                            <Clock size={14} className="text-muted" />
                            <span>Reached a 3-day study streak</span>
                          </div>
                          <div className="milestone-item">
                            <Medal size={14} className="text-accent" />
                            <span>First perfect quiz score!</span>
                          </div>
                          <div className="milestone-item">
                            <Activity size={14} className="text-muted" />
                            <span>Finished Topic: Data Structures</span>
                          </div>
                        </div>
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
            `}</style>
        </div>
    )
}

export default Profile
