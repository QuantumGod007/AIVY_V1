import { useState, useEffect } from 'react'
import Sidebar from '../components/Sidebar'
import { getUserStats, getBadgeDetails, updateUserProfile, getLeaderboardRank, uploadProfileImage } from '../services/gamificationService'
import { getArchivedSessions } from '../services/storageService'
import { analyzeGlobalProgress } from '../services/geminiService'
import { auth } from '../firebase'
import { Award, TrendingUp, Brain, Activity, Camera, Loader2, Edit2, Check, X, Trophy } from 'lucide-react'

const AVATARS = ['🎓', '🧠', '🚀', '🔥', '📚', '🎯', '🧪', '🧬', '🎨', '💻', '🌟', '🦄']

function Profile() {
  const user = auth.currentUser
  const [stats, setStats]           = useState(null)
  const [rank, setRank]             = useState(0)
  const [sessions, setSessions]     = useState([])
  const [aiInsights, setAiInsights] = useState(null)
  const [loading, setLoading]       = useState(true)
  const [aiLoading, setAiLoading]   = useState(false)
  const [uploading, setUploading]   = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [tempName, setTempName]     = useState('')

  const name = user?.displayName || user?.email?.split('@')[0] || 'Learner'
  const currentAvatar = stats?.avatar || user?.photoURL || user?.email?.charAt(0).toUpperCase() || 'U'
  const isImageAvatar = typeof currentAvatar === 'string' && currentAvatar.startsWith('http')

  useEffect(() => {
    setTempName(user?.displayName || user?.email?.split('@')[0] || 'Learner')
  }, [user])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const [s, sess, r] = await Promise.all([getUserStats(), getArchivedSessions(), getLeaderboardRank()])
        setStats(s); setSessions(sess); setRank(r)
      } catch (e) { console.error(e) } finally { setLoading(false) }
    }
    load()
  }, [])

  useEffect(() => {
    if (!sessions.length || !stats) return
    const run = async () => {
      setAiLoading(true)
      try { setAiInsights(await analyzeGlobalProgress(sessions, stats)) }
      catch (e) { console.warn('AI profile failed:', e) }
      finally { setAiLoading(false) }
    }
    run()
  }, [sessions.length, stats?.totalXP])

  const handleSaveName = async () => {
    if (!tempName.trim()) return
    try {
      await updateUserProfile(tempName.trim(), stats?.avatar || currentAvatar)
      window.location.reload()
    } catch (e) { console.error(e) }
  }

  const handlePickAvatar = async (emoji) => {
    try {
      await updateUserProfile(name, emoji)
      setStats(prev => ({ ...prev, avatar: emoji }))
    } catch (e) { console.error(e) }
  }

  const handleUpload = async (e) => {
    const file = e.target.files[0]; if (!file) return
    setUploading(true)
    try {
      const url = await uploadProfileImage(file)
      setStats(prev => ({ ...prev, avatar: url }))
      window.location.reload()
    } catch { alert('Upload failed') } finally { setUploading(false) }
  }

  if (loading) return (
    <div className="app-layout"><Sidebar />
      <main className="app-main">
        <div className="page-loading"><Loader2 className="processing-spinner" size={28} /><p>Loading profile...</p></div>
      </main>
    </div>
  )

  const earnedBadges = getBadgeDetails(stats?.badges || [])
  const totalXP = stats?.totalXP || 0
  const level = stats?.level || Math.floor(totalXP / 100) + 1
  const nextLevelXP = level * 100
  const xpProgress = ((totalXP % 100) / 100) * 100

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="app-main" style={{ maxWidth: 860, margin: '0 auto', width: '100%' }}>

        {/* ── Edit Modal ── */}
        {showEditModal && (
          <div className="profile-edit-modal" onClick={e => e.target === e.currentTarget && setShowEditModal(false)}>
            <div className="profile-edit-panel fade-in">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <h3 style={{ margin: 0 }}>Edit Profile</h3>
                <button onClick={() => setShowEditModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', display: 'flex' }}><X size={18} /></button>
              </div>

              {/* Name */}
              <div className="profile-edit-field">
                <label>Display Name</label>
                <input
                  className="profile-edit-input"
                  value={tempName}
                  onChange={e => setTempName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSaveName()}
                  placeholder="Your name"
                  autoFocus
                />
              </div>

              {/* Avatar picker */}
              <div className="profile-edit-field">
                <label>Avatar</label>
                <div className="avatar-grid">
                  {AVATARS.map(a => (
                    <button key={a} className="avatar-btn" onClick={() => handlePickAvatar(a)}
                      style={{ outline: stats?.avatar === a ? '2px solid var(--color-accent)' : 'none' }}>
                      {a}
                    </button>
                  ))}
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-accent)', cursor: 'pointer' }}>
                  <Camera size={12} />
                  {uploading ? 'Uploading...' : 'Upload custom photo'}
                  <input type="file" hidden accept="image/*" onChange={handleUpload} disabled={uploading} />
                </label>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button className="btn btn-primary btn-icon" style={{ flex: 1 }} onClick={handleSaveName}>
                  <Check size={15} /> Save Changes
                </button>
                <button className="btn btn-secondary" onClick={() => setShowEditModal(false)}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* ── Header Card ── */}
        <div className="profile-card" style={{ marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>

            {/* Avatar */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div onClick={() => setShowEditModal(true)} style={{
                width: 72, height: 72, borderRadius: '18px',
                background: 'linear-gradient(135deg, var(--color-accent), #9333ea)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', overflow: 'hidden', fontSize: isImageAvatar ? undefined : '2rem', position: 'relative',
                border: '2px solid var(--color-border)'
              }}>
                {isImageAvatar
                  ? <img src={currentAvatar} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span>{currentAvatar}</span>}
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '0'}>
                  <Camera size={16} color="#fff" />
                </div>
              </div>
            </div>

            {/* Name + Email */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <h1 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800, color: 'var(--color-text-primary)' }}>{name}</h1>
              <p style={{ margin: '0.15rem 0 0', fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>{user?.email}</p>
            </div>

            <button className="btn btn-secondary btn-icon" onClick={() => setShowEditModal(true)} style={{ flexShrink: 0 }}>
              <Edit2 size={14} /> Edit Profile
            </button>
          </div>

          {/* Stat chips */}
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem', flexWrap: 'wrap' }}>
            {[
              { label: 'Level',    value: level,                      color: 'var(--color-accent)' },
              { label: 'Total XP', value: totalXP.toLocaleString(),   color: '#f59e0b' },
              { label: 'Rank',     value: rank > 0 ? `#${rank}` : '—', color: '#22c55e' },
              { label: 'Streak',   value: `${stats?.loginStreak || 1}d`, color: '#f87171' },
              { label: 'Sessions', value: sessions.length,            color: '#a78bfa' },
            ].map(s => (
              <div key={s.label} className="profile-stat-chip">
                <span className="profile-stat-label">{s.label}</span>
                <div className="profile-stat-value" style={{ color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── 2-col grid ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>

          {/* Advancement */}
          <div className="profile-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.1rem' }}>
              <TrendingUp size={15} style={{ color: '#f59e0b' }} />
              <span className="profile-section-title">Advancement</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--color-text-muted)', marginBottom: '0.4rem' }}>
              <span>Level {level}</span><span>{totalXP} / {nextLevelXP} XP</span>
            </div>
            <div className="profile-xp-track">
              <div style={{ height: '100%', width: `${xpProgress}%`, background: 'linear-gradient(90deg,#f59e0b,var(--color-accent))', borderRadius: 8, transition: 'width 0.6s ease' }} />
            </div>
            <div className="profile-tip-box">
              <span style={{ fontWeight: 600, color: 'var(--color-accent)' }}>AI Tip · </span>
              {aiInsights?.nextBigGoal || 'Complete a quiz to get your personalized next goal.'}
            </div>
          </div>

          {/* Badges */}
          <div className="profile-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.1rem' }}>
              <Award size={15} style={{ color: '#0ea5e9' }} />
              <span className="profile-section-title">Hall of Fame</span>
              <span style={{ marginLeft: 'auto', fontSize: '0.68rem', color: 'var(--color-text-muted)' }}>{earnedBadges.length} earned</span>
            </div>
            {earnedBadges.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {earnedBadges.map(b => (
                  <div key={b.id} title={b.name} className="profile-inner" style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.35rem', padding: 0, borderRadius: '11px' }}>
                    {b.icon}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '1.5rem 0', color: 'var(--color-text-muted)' }}>
                <Trophy size={26} style={{ opacity: 0.2, marginBottom: '0.5rem' }} />
                <p style={{ margin: 0, fontSize: '0.8rem' }}>Complete quizzes to earn badges!</p>
              </div>
            )}
          </div>

          {/* Cognitive Profile — full width */}
          <div className="profile-card" style={{ gridColumn: '1 / -1' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.1rem' }}>
              <Brain size={15} style={{ color: '#818cf8' }} />
              <span className="profile-section-title">Cognitive Learning Profile</span>
              {aiLoading && <Loader2 size={13} className="processing-spinner" style={{ marginLeft: 'auto', color: 'var(--color-text-muted)' }} />}
            </div>

            {aiInsights ? (
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '0.875rem' }}>
                <div className="profile-inner">
                  <span style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', color: 'var(--color-accent)', display: 'block', marginBottom: '0.3rem' }}>Primary Archetype</span>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-text-primary)' }}>{aiInsights.learningStyle}</div>
                </div>
                <div className="profile-inner">
                  <span style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.5rem' }}>Consistency</span>
                  <div className="profile-xp-track" style={{ marginBottom: '0.35rem' }}>
                    <div style={{ height: '100%', width: `${aiInsights.consistencyScore}%`, background: 'var(--color-accent)', borderRadius: 8 }} />
                  </div>
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>{aiInsights.consistencyScore}%</span>
                </div>
                <div className="profile-inner">
                  <span style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.5rem' }}>Retention</span>
                  <div className="profile-xp-track" style={{ marginBottom: '0.35rem' }}>
                    <div style={{ height: '100%', width: `${aiInsights.retentionScore}%`, background: '#a855f7', borderRadius: 8 }} />
                  </div>
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>{aiInsights.retentionScore}%</span>
                </div>
                {aiInsights.topicalStrengths?.length > 0 && (
                  <div className="profile-inner" style={{ gridColumn: '1 / -1' }}>
                    <span style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.5rem' }}>Topic Strengths</span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                      {aiInsights.topicalStrengths.map(s => (
                        <span key={s} style={{ fontSize: '0.72rem', fontWeight: 600, padding: '0.25rem 0.65rem', borderRadius: '100px', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)', color: 'var(--color-accent)' }}>{s}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--color-text-muted)' }}>
                {aiLoading
                  ? <><Loader2 size={22} className="processing-spinner" /><p style={{ margin: '0.75rem 0 0', fontSize: '0.82rem' }}>Analyzing your learning patterns...</p></>
                  : <><Activity size={22} style={{ opacity: 0.25 }} /><p style={{ margin: '0.5rem 0 0', fontSize: '0.82rem' }}>Complete sessions to unlock your cognitive profile.</p></>
                }
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

export default Profile
