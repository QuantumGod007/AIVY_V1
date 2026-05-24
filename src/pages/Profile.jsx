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
    Sparkles,
    Camera,
    Plus
} from 'lucide-react'
import { uploadProfileImage } from '../services/gamificationService'

function Profile() {
    const user = auth.currentUser
    const [stats, setStats] = useState(null)
    const [rank, setRank] = useState(0)
    const [sessions, setSessions] = useState([])
    const [aiInsights, setAiInsights] = useState(null)
    const [loading, setLoading] = useState(true)
    const [aiLoading, setAiLoading] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [isEditing, setIsEditing] = useState(false)
    const [isEditingAvatar, setIsEditingAvatar] = useState(false)
    const [tempName, setTempName] = useState('')

    useEffect(() => {
        if (user) {
            setTempName(user.displayName || user.email?.split('@')[0] || 'Learner')
        }
    }, [user])
    
    // Available Avatars
    const AVATARS = ['🎓', '🧠', '🚀', '🔥', '📚', '🎯', '🧪', '🧬', '🎨', '💻', '🌟', '🦄']
    const currentAvatar = stats?.avatar || user?.photoURL || (user?.email?.charAt(0).toUpperCase() || 'U')
    const name = user?.displayName || user?.email?.split('@')[0] || 'Learner'

    const isImageAvatar = typeof currentAvatar === 'string' && currentAvatar.startsWith('http')

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
            // Use current stats avatar or fallback
            const av = stats?.avatar || currentAvatar
            await updateUserProfile(tempName, av)
            setIsEditing(false)
            window.location.reload() 
        } catch (err) {
            console.error('Update name error:', err)
        }
    }

    const handleUpdateAvatar = async (emoji) => {
        try {
            await updateUserProfile(name, emoji)
            setStats({ ...stats, avatar: emoji })
            setIsEditingAvatar(false)
            // Optionally reload or use state to reflect change
        } catch (err) {
            console.error('Update avatar error:', err)
        }
    }

    const handleFileUpload = async (e) => {
        const file = e.target.files[0]
        if (!file) return
        
        setUploading(true)
        try {
            const url = await uploadProfileImage(file)
            setStats({ ...stats, avatar: url })
            setIsEditingAvatar(false)
            window.location.reload()
        } catch (err) {
            alert('Failed to upload image. Please try again.')
        } finally {
            setUploading(false)
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
    const totalXP = stats?.totalXP || 0
    const level = stats?.level || Math.floor(totalXP / 100) + 1
    const nextLevelXP = level * 100
    const progressToNext = ((totalXP % 100) / 100) * 100

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="app-main">
                <div className="profile-dashboard">
                    {/* Top Section: Identity & Quick Stats */}
                    <header className="profile-identity-strip">
                        <div className="identity-left">
                            <div className="avatar-container-premium">
                                <div className="avatar-hex-outer" onClick={() => setIsEditingAvatar(!isEditingAvatar)}>
                                    {isImageAvatar ? (
                                        <img src={currentAvatar} alt="Profile" className="avatar-img" />
                                    ) : (
                                        <span className="avatar-emoji">{currentAvatar}</span>
                                    )}
                                    <div className="hex-border"></div>
                                    <div className="hex-edit-overlay"><Camera size={18} /></div>
                                </div>
                                <div className="user-text-basic">
                                    {isEditing ? (
                                        <div className="name-edit-box">
                                            <input 
                                                value={tempName} 
                                                onChange={(e) => setTempName(e.target.value)}
                                                onBlur={handleUpdateName}
                                                onKeyDown={(e) => e.key === 'Enter' && handleUpdateName()}
                                                autoFocus
                                            />
                                        </div>
                                    ) : (
                                        <h1 className="user-name-h1" onClick={() => setIsEditing(true)}>
                                            {name} <Sparkles size={16} className="spark-ico" />
                                        </h1>
                                    )}
                                    <p className="user-email-subtitle">{user?.email}</p>
                                </div>
                                {isEditingAvatar && (
                                    <div className="avatar-popover-minimal bounce-in">
                                        <div className="emoji-row-minimal">
                                            {AVATARS.map(a => (
                                                <button key={a} onClick={() => handleUpdateAvatar(a)}>{a}</button>
                                            ))}
                                        </div>
                                        <label className="upload-link-mini">
                                            <Plus size={14} /> Upload Custom
                                            <input type="file" hidden accept="image/*" onChange={handleFileUpload} />
                                        </label>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="identity-right-stats">
                            <div className="mini-stat-chip">
                                <label>LEVEL</label>
                                <span>{level}</span>
                            </div>
                            <div className="mini-stat-chip">
                                <label>XP</label>
                                <span>{totalXP.toLocaleString()}</span>
                            </div>
                            <div className="mini-stat-chip">
                                <label>RANK</label>
                                <span>{rank > 0 ? `#${rank}` : '--'}</span>
                            </div>
                            <div className="mini-stat-chip highlight">
                                <label>STREAK</label>
                                <span>{stats?.loginStreak || 1}D</span>
                            </div>
                        </div>
                    </header>

                    {/* Main Content Grid */}
                    <div className="dashboard-main-grid">
                        {/* Area 1: Cognitive Analysis (The Star) */}
                        <div className="grid-area-ai">
                            <div className="glass-panel cognitive-panel">
                                <div className="panel-header">
                                    <Brain className="panel-icon purple" size={20} />
                                    <h2>Cognitive Learning Profile</h2>
                                    {aiLoading && <Loader2 className="spinning loader-mini" size={14} />}
                                </div>

                                {aiInsights ? (
                                    <div className="cognitive-content">
                                        <div className="archetype-banner">
                                            <label>Primary Archetype</label>
                                            <h3>{aiInsights.learningStyle}</h3>
                                        </div>
                                        <div className="metrics-grid-mini">
                                            <div className="m-card">
                                                <span>Consistency</span>
                                                <div className="m-bar"><div style={{ width: `${aiInsights.consistencyScore}%` }}></div></div>
                                            </div>
                                            <div className="m-card">
                                                <span>Retention</span>
                                                <div className="m-bar secondary"><div style={{ width: `${aiInsights.retentionScore}%` }}></div></div>
                                            </div>
                                        </div>
                                        <div className="strength-pills">
                                            {aiInsights.topicalStrengths?.map(s => <span key={s} className="v-pill">{s}</span>)}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="panel-placeholder">
                                        <Activity size={24} />
                                        <p>Expand your knowledge base to unlock DNA-level analytics.</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Area 2: Strategic Progress */}
                        <div className="grid-area-meta">
                            <div className="glass-panel progress-panel">
                                <div className="panel-header">
                                    <TrendingUp className="panel-icon amber" size={20} />
                                    <h2>Advancement</h2>
                                </div>
                                <div className="xp-progress-complex">
                                    <div className="xp-labels">
                                        <span>Current: {totalXP} XP</span>
                                        <span>Next: {nextLevelXP} XP</span>
                                    </div>
                                    <div className="xp-track-premium">
                                        <div className="xp-fill-premium" style={{ width: `${progressToNext}%` }}></div>
                                    </div>
                                </div>
                                <div className="strategic-tip">
                                    <label>AI RECOMMENDATION</label>
                                    <p>{aiInsights?.nextBigGoal || 'Start a new study session to get strategic guidance.'}</p>
                                </div>
                            </div>

                            <div className="glass-panel badges-panel">
                                <div className="panel-header">
                                    <Award className="panel-icon blue" size={20} />
                                    <h2>Hall of Fame</h2>
                                </div>
                                <div className="mini-badge-list">
                                    {earnedBadges.slice(0, 3).map(b => (
                                        <div key={b.id} className="badge-thumb-mini" title={b.name}>{b.icon}</div>
                                    ))}
                                    {earnedBadges.length > 3 && <div className="more-count">+{earnedBadges.length - 3}</div>}
                                    {earnedBadges.length === 0 && <p className="no-badges">No trophies yet. Keep studying!</p>}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <style>{`
                    .profile-dashboard {
                        padding: 2.5rem;
                        max-width: 1100px;
                        margin: 0 auto;
                        display: flex;
                        flex-direction: column;
                        gap: 2rem;
                        color: #fff;
                    }

                    .profile-identity-strip {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        background: rgba(255, 255, 255, 0.02);
                        padding: 2rem;
                        border-radius: 32px;
                        border: 1px solid rgba(255, 255, 255, 0.05);
                    }

                    .identity-left {
                        display: flex;
                        align-items: center;
                        gap: 2rem;
                        position: relative;
                    }

                    .avatar-container-premium {
                        display: flex;
                        align-items: center;
                        gap: 1.5rem;
                    }

                    .avatar-hex-outer {
                        width: 90px;
                        height: 90px;
                        position: relative;
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        background: linear-gradient(135deg, #6366f1, #a855f7);
                        border-radius: 24px;
                    }

                    .avatar-img {
                        width: 100%;
                        height: 100%;
                        object-fit: cover;
                        border-radius: 24px;
                    }

                    .avatar-emoji { font-size: 2.5rem; }

                    .hex-edit-overlay {
                        position: absolute;
                        top: 0; left: 0; right: 0; bottom: 0;
                        background: rgba(0,0,0,0.4);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        opacity: 0;
                        transition: opacity 0.2s;
                        border-radius: 24px;
                    }

                    .avatar-hex-outer:hover .hex-edit-overlay { opacity: 1; }

                    .user-name-h1 {
                        font-size: 2rem;
                        font-weight: 800;
                        display: flex;
                        align-items: center;
                        gap: 0.75rem;
                        cursor: pointer;
                        margin: 0;
                    }

                    .user-email-subtitle {
                        color: rgba(255, 255, 255, 0.5);
                        margin: 0;
                        font-size: 0.9rem;
                    }

                    .identity-right-stats {
                        display: flex;
                        gap: 1rem;
                    }

                    .mini-stat-chip {
                        background: rgba(255, 255, 255, 0.03);
                        border: 1px solid rgba(255, 255, 255, 0.08);
                        padding: 0.75rem 1.25rem;
                        border-radius: 16px;
                        min-width: 90px;
                        display: flex;
                        flex-direction: column;
                    }

                    .mini-stat-chip label { font-size: 0.6rem; font-weight: 800; color: rgba(255,255,255,0.4); letter-spacing: 0.1em; }
                    .mini-stat-chip span { font-size: 1.2rem; font-weight: 800; }
                    .mini-stat-chip.highlight { border-color: #f59e0b; color: #f59e0b; }

                    .dashboard-main-grid {
                        display: grid;
                        grid-template-columns: 1.6fr 1fr;
                        gap: 2rem;
                    }

                    .glass-panel {
                        background: rgba(255, 255, 255, 0.03);
                        backdrop-filter: blur(20px);
                        border: 1px solid rgba(255, 255, 255, 0.06);
                        border-radius: 32px;
                        padding: 2rem;
                    }

                    .panel-header {
                        display: flex;
                        align-items: center;
                        gap: 0.75rem;
                        margin-bottom: 2rem;
                    }

                    .panel-header h2 { font-size: 1rem; font-weight: 700; margin: 0; text-transform: uppercase; letter-spacing: 0.05em; color: rgba(255,255,255,0.7); }
                    .panel-icon.purple { color: #818cf8; }
                    .panel-icon.amber { color: #f59e0b; }
                    .panel-icon.blue { color: #0ea5e9; }

                    .archetype-banner {
                        margin-bottom: 2rem;
                    }

                    .archetype-banner label { font-size: 0.75rem; color: #818cf8; font-weight: 700; }
                    .archetype-banner h3 { font-size: 2.2rem; font-weight: 900; margin: 0.25rem 0 0 0; }

                    .metrics-grid-mini { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 2rem; }
                    .m-card span { font-size: 0.8rem; font-weight: 600; color: rgba(255,255,255,0.5); }
                    .m-bar { height: 6px; background: rgba(255,255,255,0.05); border-radius: 10px; margin-top: 0.5rem; overflow: hidden; }
                    .m-bar div { height: 100%; background: #6366f1; border-radius: 10px; }
                    .m-bar.secondary div { background: #a855f7; }

                    .strength-pills { display: flex; flex-wrap: wrap; gap: 0.5rem; }
                    .v-pill { background: rgba(99, 102, 241, 0.1); border: 1px solid rgba(99, 102, 241, 0.2); padding: 0.4rem 0.8rem; border-radius: 100px; font-size: 0.75rem; font-weight: 600; color: #818cf8; }

                    .xp-progress-complex { margin-bottom: 2rem; }
                    .xp-labels { display: flex; justify-content: space-between; font-size: 0.8rem; font-weight: 600; color: rgba(255,255,255,0.5); margin-bottom: 0.75rem; }
                    .xp-track-premium { height: 10px; background: rgba(255,255,255,0.05); border-radius: 10px; overflow: hidden; }
                    .xp-fill-premium { height: 100%; background: linear-gradient(90deg, #f59e0b, #6366f1); }

                    .strategic-tip {
                        background: rgba(245, 158, 11, 0.05);
                        border: 1px solid rgba(245, 158, 11, 0.1);
                        padding: 1.25rem;
                        border-radius: 20px;
                    }
                    .strategic-tip label { display: block; font-size: 0.65rem; font-weight: 800; color: #f59e0b; margin-bottom: 0.5rem; }
                    .strategic-tip p { font-size: 0.85rem; line-height: 1.5; margin: 0; color: rgba(255,255,255,0.8); }

                    .grid-area-meta { display: flex; flex-direction: column; gap: 2rem; }

                    .mini-badge-list { display: flex; gap: 1rem; align-items: center; }
                    .badge-thumb-mini { font-size: 1.8rem; background: rgba(255,255,255,0.03); width: 50px; height: 50px; display: flex; align-items: center; justify-content: center; border-radius: 14px; }
                    .more-count { font-size: 0.9rem; font-weight: 700; color: rgba(255,255,255,0.4); }

                    .avatar-popover-minimal {
                        position: absolute;
                        top: 110%;
                        left: 0;
                        background: #111;
                        border: 1px solid rgba(255,255,255,0.1);
                        padding: 1rem;
                        border-radius: 20px;
                        z-index: 100;
                        box-shadow: 0 20px 40px rgba(0,0,0,0.5);
                    }

                    .emoji-row-minimal { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.5rem; margin-bottom: 1rem; }
                    .emoji-row-minimal button { font-size: 1.2rem; padding: 0.4rem; background: rgba(255,255,255,0.05); border: none; border-radius: 8px; cursor: pointer; transition: background 0.2s; }
                    .emoji-row-minimal button:hover { background: rgba(99, 102, 241, 0.2); }

                    .upload-link-mini { display: flex; align-items: center; gap: 0.5rem; font-size: 0.8rem; font-weight: 700; color: #818cf8; cursor: pointer; }

                    .loader-mini { margin-left: auto; }
                    .spinning { animation: spin 1s linear infinite; }
                    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                    
                    .spark-ico { color: #f59e0b; opacity: 0.6; }

                    @media (max-width: 900px) {
                        .dashboard-main-grid { grid-template-columns: 1fr; }
                        .profile-identity-strip { flex-direction: column; gap: 1.5rem; align-items: flex-start; }
                    }
                `}</style>
            </main>
        </div>
    )
}

export default Profile
