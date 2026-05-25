import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import { getUserStats, getBadgeDetails, updateUserProfile, getLeaderboardRank, uploadProfileImage } from '../services/gamificationService'
import { getArchivedSessions } from '../services/storageService'
import { analyzeGlobalProgress } from '../services/geminiService'
import { auth } from '../firebase'
import {
  Award, TrendingUp, Brain, Activity, Camera, Loader2,
  Edit2, Check, X, Trophy, Sparkles, BookOpen
} from 'lucide-react'

const AVATARS = ['🎓', '🧠', '🚀', '🔥', '📚', '🎯', '🧪', '🧬', '🎨', '💻', '🌟', '🦄']

const card = {
  background: 'var(--color-bg-card)',
  border: '1px solid var(--color-border)',
  borderRadius: '20px',
  padding: '1.5rem',
  boxShadow: 'var(--shadow-md)',
}

const sectionLabel = {
  fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase',
  letterSpacing: '0.09em', color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.3rem',
}

function StatChip({ label, value, color }) {
  return (
    <div style={{
      flex: '1 1 70px', background: 'var(--color-bg-secondary)',
      border: '1px solid var(--color-border)', borderRadius: '14px', padding: '0.75rem 1rem',
    }}>
      <span style={sectionLabel}>{label}</span>
      <div style={{ fontSize: '1.2rem', fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
    </div>
  )
}

function Profile() {
  const user = auth.currentUser
  const [stats, setStats]           = useState(null)
  const [rank, setRank]             = useState(0)
  const [sessions, setSessions]     = useState([])
  const [aiInsights, setAiInsights] = useState(null)
  const [loading, setLoading]       = useState(true)
  const [aiLoading, setAiLoading]   = useState(false)
  const [uploading, setUploading]   = useState(false)
  const [isEditing, setIsEditing]   = useState(false)
  const [showAvatarPicker, setShowAvatarPicker] = useState(false)
  const [tempName, setTempName]     = useState('')

  const name = user?.displayName || user?.email?.split('@')[0] || 'Learner'
  const currentAvatar = stats?.avatar || user?.photoURL || user?.email?.charAt(0).toUpperCase() || 'U'
  const isImageAvatar = typeof currentAvatar === 'string' && currentAvatar.startsWith('http')

  useEffect(() => {
    if (user) setTempName(user.displayName || user.email?.split('@')[0] || 'Learner')
  }, [user])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const [statsData, sessionData, r] = await Promise.all([
          getUserStats(), getArchivedSessions(), getLeaderboardRank()
        ])
        setStats(statsData); setSessions(sessionData); setRank(r)
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
    try { await updateUserProfile(tempName, stats?.avatar || currentAvatar); window.location.reload() }
    catch (e) { console.error(e) }
  }

  const handlePickAvatar = async (emoji) => {
    try { await updateUserProfile(name, emoji); setStats({ ...stats, avatar: emoji }); setShowAvatarPicker(false) }
    catch (e) { console.error(e) }
  }

  const handleUpload = async (e) => {
    const file = e.target.files[0]; if (!file) return
    setUploading(true)
    try { const url = await uploadProfileImage(file); setStats({ ...stats, avatar: url }); setShowAvatarPicker(false); window.location.reload() }
    catch { alert('Upload failed') } finally { setUploading(false) }
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
      <main className="app-main" style={{ padding: '1.75rem', maxWidth: 860, margin: '0 auto', width: '100%' }}>

        {/* ── Header Card ── */}
        <div style={{ ...card, marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>

            {/* Avatar */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div
                onClick={() => setShowAvatarPicker(p => !p)}
                style={{
                  width: 72, height: 72, borderRadius: '18px',
                  background: 'linear-gradient(135deg, var(--color-accent), #9333ea)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', overflow: 'hidden', border: '2px solid var(--color-border)',
                  fontSize: isImageAvatar ? undefined : '2rem', position: 'relative',
                }}
              >
                {isImageAvatar
                  ? <img src={currentAvatar} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span>{currentAvatar}</span>}
                {uploading
                  ? <div style={{ position:'absolute',inset:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center' }}><Loader2 size={18} color="#fff" className="processing-spinner"/></div>
                  : <div className="avatar-hover-overlay" style={{ position:'absolute',inset:0,background:'rgba(0,0,0,0.4)',display:'flex',alignItems:'center',justifyContent:'center',opacity:0,transition:'opacity 0.2s' }}
                      onMouseEnter={e=>e.currentTarget.style.opacity='1'} onMouseLeave={e=>e.currentTarget.style.opacity='0'}>
                      <Camera size={16} color="#fff"/>
                    </div>}
              </div>

              {/* Avatar Picker */}
              {showAvatarPicker && (
                <div style={{
                  position:'absolute', top:'110%', left:0, zIndex:300,
                  background:'var(--color-bg-elevated)', border:'1px solid var(--color-border)',
                  borderRadius:'16px', padding:'1rem', boxShadow:'0 16px 40px rgba(0,0,0,0.18)', minWidth:210
                }}>
                  <p style={{ margin:'0 0 0.6rem', fontSize:'0.72rem', fontWeight:600, color:'var(--color-text-muted)' }}>Choose Avatar</p>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'0.35rem', marginBottom:'0.75rem' }}>
                    {AVATARS.map(a => (
                      <button key={a} onClick={() => handlePickAvatar(a)} style={{
                        fontSize:'1.3rem', padding:'0.3rem', background:'var(--color-bg-secondary)',
                        border:'1px solid var(--color-border)', borderRadius:'8px', cursor:'pointer', transition:'all 0.1s'
                      }} onMouseEnter={e=>e.currentTarget.style.background='rgba(99,102,241,0.15)'}
                         onMouseLeave={e=>e.currentTarget.style.background='var(--color-bg-secondary)'}>{a}</button>
                    ))}
                  </div>
                  <label style={{ display:'flex',alignItems:'center',gap:'0.4rem',fontSize:'0.78rem',fontWeight:600,color:'var(--color-accent)',cursor:'pointer' }}>
                    <Camera size={12}/> Upload photo
                    <input type="file" hidden accept="image/*" onChange={handleUpload}/>
                  </label>
                </div>
              )}
            </div>

            {/* Name + Email */}
            <div style={{ flex:1, minWidth:0 }}>
              {isEditing ? (
                <div style={{ display:'flex', alignItems:'center', gap:'0.4rem' }}>
                  <input
                    value={tempName} onChange={e=>setTempName(e.target.value)} autoFocus
                    onKeyDown={e=>{ if(e.key==='Enter') handleSaveName(); if(e.key==='Escape') setIsEditing(false) }}
                    style={{
                      fontSize:'1.15rem', fontWeight:700, flex:1, minWidth:0,
                      background:'var(--color-bg-secondary)', border:'1.5px solid var(--color-accent)',
                      borderRadius:'10px', padding:'0.4rem 0.75rem',
                      color:'var(--color-text-primary)', fontFamily:'inherit', outline:'none'
                    }}
                  />
                  <button onClick={handleSaveName} style={{ background:'var(--color-accent)',border:'none',borderRadius:'8px',padding:'0.45rem',cursor:'pointer',color:'#fff',display:'flex' }}><Check size={15}/></button>
                  <button onClick={()=>setIsEditing(false)} style={{ background:'var(--color-bg-secondary)',border:'1px solid var(--color-border)',borderRadius:'8px',padding:'0.45rem',cursor:'pointer',color:'var(--color-text-muted)',display:'flex' }}><X size={15}/></button>
                </div>
              ) : (
                <h1 style={{ margin:0, fontSize:'1.3rem', fontWeight:800, color:'var(--color-text-primary)' }}>{name}</h1>
              )}
              <p style={{ margin:'0.15rem 0 0', fontSize:'0.82rem', color:'var(--color-text-muted)' }}>{user?.email}</p>
            </div>

            {/* Edit button */}
            {!isEditing && (
              <button onClick={()=>setIsEditing(true)} className="btn btn-secondary btn-icon" style={{ flexShrink:0 }}>
                <Edit2 size={14}/> Edit Profile
              </button>
            )}
          </div>

          {/* Stats row */}
          <div style={{ display:'flex', gap:'0.75rem', marginTop:'1.25rem', flexWrap:'wrap' }}>
            <StatChip label="Level"    value={level}                       color="var(--color-accent)"/>
            <StatChip label="Total XP" value={totalXP.toLocaleString()}    color="#f59e0b"/>
            <StatChip label="Rank"     value={rank>0?`#${rank}`:'—'}       color="#22c55e"/>
            <StatChip label="Streak"   value={`${stats?.loginStreak||1}d`} color="#f87171"/>
            <StatChip label="Sessions" value={sessions.length}             color="#a78bfa"/>
          </div>
        </div>

        {/* ── 2-col Grid ── */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1.25rem' }}>

          {/* XP / Advancement */}
          <div style={card}>
            <div style={{ display:'flex',alignItems:'center',gap:'0.5rem',marginBottom:'1.1rem' }}>
              <TrendingUp size={15} style={{color:'#f59e0b'}}/>
              <span style={{ fontWeight:700, fontSize:'0.85rem', color:'var(--color-text-primary)' }}>Advancement</span>
            </div>
            <div style={{ display:'flex',justifyContent:'space-between',fontSize:'0.72rem',color:'var(--color-text-muted)',marginBottom:'0.4rem' }}>
              <span>Level {level}</span><span>{totalXP} / {nextLevelXP} XP</span>
            </div>
            <div style={{ height:7,background:'var(--color-bg-elevated)',borderRadius:8,overflow:'hidden',marginBottom:'1rem' }}>
              <div style={{ height:'100%',width:`${xpProgress}%`,background:'linear-gradient(90deg,#f59e0b,var(--color-accent))',borderRadius:8,transition:'width 0.6s ease' }}/>
            </div>
            <div style={{ fontSize:'0.78rem',color:'var(--color-text-muted)',padding:'0.75rem',background:'var(--color-bg-secondary)',borderRadius:'10px',border:'1px solid var(--color-border)',lineHeight:1.5 }}>
              <span style={{ fontWeight:600,color:'var(--color-accent)' }}>AI Tip · </span>
              {aiInsights?.nextBigGoal || 'Complete a quiz to get your personalized next goal.'}
            </div>
          </div>

          {/* Badges */}
          <div style={card}>
            <div style={{ display:'flex',alignItems:'center',gap:'0.5rem',marginBottom:'1.1rem' }}>
              <Award size={15} style={{color:'#0ea5e9'}}/>
              <span style={{ fontWeight:700,fontSize:'0.85rem',color:'var(--color-text-primary)' }}>Hall of Fame</span>
              <span style={{ marginLeft:'auto',fontSize:'0.68rem',color:'var(--color-text-muted)' }}>{earnedBadges.length} earned</span>
            </div>
            {earnedBadges.length > 0 ? (
              <div style={{ display:'flex',flexWrap:'wrap',gap:'0.5rem' }}>
                {earnedBadges.map(b => (
                  <div key={b.id} title={b.name} style={{ width:44,height:44,fontSize:'1.35rem',background:'var(--color-bg-secondary)',border:'1px solid var(--color-border)',borderRadius:'11px',display:'flex',alignItems:'center',justifyContent:'center' }}>
                    {b.icon}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign:'center',padding:'1.5rem 0',color:'var(--color-text-muted)' }}>
                <Trophy size={26} style={{opacity:0.2,marginBottom:'0.5rem'}}/>
                <p style={{ margin:0,fontSize:'0.8rem' }}>Complete quizzes to earn badges!</p>
              </div>
            )}
          </div>

          {/* Cognitive Profile — full width */}
          <div style={{ ...card, gridColumn:'1 / -1' }}>
            <div style={{ display:'flex',alignItems:'center',gap:'0.5rem',marginBottom:'1.1rem' }}>
              <Brain size={15} style={{color:'#818cf8'}}/>
              <span style={{ fontWeight:700,fontSize:'0.85rem',color:'var(--color-text-primary)' }}>Cognitive Learning Profile</span>
              {aiLoading && <Loader2 size={13} className="processing-spinner" style={{marginLeft:'auto',color:'var(--color-text-muted)'}}/>}
            </div>

            {aiInsights ? (
              <div style={{ display:'grid',gridTemplateColumns:'2fr 1fr 1fr',gap:'0.875rem' }}>
                {/* Archetype */}
                <div style={{ background:'var(--color-bg-secondary)',borderRadius:'14px',padding:'1rem',border:'1px solid var(--color-border)' }}>
                  <span style={sectionLabel}>Primary Archetype</span>
                  <div style={{ fontSize:'1.4rem',fontWeight:800,color:'var(--color-text-primary)' }}>{aiInsights.learningStyle}</div>
                </div>
                {/* Consistency */}
                <div style={{ background:'var(--color-bg-secondary)',borderRadius:'14px',padding:'1rem',border:'1px solid var(--color-border)' }}>
                  <span style={sectionLabel}>Consistency</span>
                  <div style={{ height:5,background:'var(--color-bg-elevated)',borderRadius:5,overflow:'hidden',margin:'0.5rem 0 0.35rem' }}>
                    <div style={{ height:'100%',width:`${aiInsights.consistencyScore}%`,background:'var(--color-accent)',borderRadius:5 }}/>
                  </div>
                  <span style={{ fontSize:'0.82rem',fontWeight:700,color:'var(--color-text-primary)' }}>{aiInsights.consistencyScore}%</span>
                </div>
                {/* Retention */}
                <div style={{ background:'var(--color-bg-secondary)',borderRadius:'14px',padding:'1rem',border:'1px solid var(--color-border)' }}>
                  <span style={sectionLabel}>Retention</span>
                  <div style={{ height:5,background:'var(--color-bg-elevated)',borderRadius:5,overflow:'hidden',margin:'0.5rem 0 0.35rem' }}>
                    <div style={{ height:'100%',width:`${aiInsights.retentionScore}%`,background:'#a855f7',borderRadius:5 }}/>
                  </div>
                  <span style={{ fontSize:'0.82rem',fontWeight:700,color:'var(--color-text-primary)' }}>{aiInsights.retentionScore}%</span>
                </div>
                {/* Strengths */}
                {aiInsights.topicalStrengths?.length > 0 && (
                  <div style={{ gridColumn:'1 / -1',background:'var(--color-bg-secondary)',borderRadius:'14px',padding:'1rem',border:'1px solid var(--color-border)' }}>
                    <span style={sectionLabel}>Topic Strengths</span>
                    <div style={{ display:'flex',flexWrap:'wrap',gap:'0.35rem',marginTop:'0.35rem' }}>
                      {aiInsights.topicalStrengths.map(s => (
                        <span key={s} style={{ fontSize:'0.72rem',fontWeight:600,padding:'0.25rem 0.65rem',borderRadius:'100px',background:'rgba(99,102,241,0.1)',border:'1px solid rgba(99,102,241,0.25)',color:'var(--color-accent)' }}>{s}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ textAlign:'center',padding:'2rem 0',color:'var(--color-text-muted)' }}>
                {aiLoading
                  ? <><Loader2 size={22} className="processing-spinner"/><p style={{margin:'0.75rem 0 0',fontSize:'0.82rem'}}>Analyzing your learning patterns...</p></>
                  : <><Activity size={22} style={{opacity:0.25}}/><p style={{margin:'0.5rem 0 0',fontSize:'0.82rem'}}>Complete sessions to unlock your cognitive profile.</p></>}
              </div>
            )}
          </div>
        </div>

      </main>
    </div>
  )
}

export default Profile
