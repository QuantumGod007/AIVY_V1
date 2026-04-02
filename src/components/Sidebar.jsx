import { useState, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { auth } from '../firebase'
import {
    LayoutDashboard,
    MessageSquare,
    CalendarDays,
    CreditCard,
    Trophy,
    TrendingUp,
    LogOut,
    ChevronLeft,
    ChevronRight,
    Brain,
    Sun,
    Moon,
    User,
    BookOpen,
    RefreshCw,
    FolderOpen
} from 'lucide-react'
import { getActiveContextName, getArchivedSessions, restoreSession } from '../services/storageService'

const NAV_ITEMS = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/ai-tutor', icon: MessageSquare, label: 'Intelligence' },
    { to: '/study-planner', icon: CalendarDays, label: 'Study Planner' },
    { to: '/flashcards', icon: CreditCard, label: 'Flashcards' },
    { to: '/sessions', icon: Brain, label: 'Sessions' },
    { to: '/leaderboard', icon: Trophy, label: 'Leaderboard' },
    { to: '/progress', icon: TrendingUp, label: 'Progress' },
    { to: '/profile', icon: User, label: 'Profile' },
]

function Sidebar() {
    const [collapsed, setCollapsed] = useState(false)
    const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark')
    const [activeContext, setActiveContext] = useState('')
    const [allSessions, setAllSessions] = useState([])
    const [showMenu, setShowMenu] = useState(false)
    const [isSwitching, setIsSwitching] = useState(false)
    const navigate = useNavigate()
    const user = auth.currentUser
    const userInitial = user?.email?.charAt(0).toUpperCase() || 'U'

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme)
        localStorage.setItem('theme', theme)
    }, [theme])

    useEffect(() => {
        // Poll for context changes locally
        const check = () => setActiveContext(getActiveContextName())
        check()
        
        // Load sessions for switcher
        const loadSessions = async () => {
            const sessions = await getArchivedSessions()
            const unique = []
            const names = new Set()
            sessions.forEach(s => {
                if (!names.has(s.documentName)) {
                    names.add(s.documentName); unique.push(s)
                }
            })
            setAllSessions(unique)
        }
        loadSessions()

        const interval = setInterval(check, 1000)
        return () => clearInterval(interval)
    }, [])

    const handleSwitch = async (id) => {
        try {
            // Check if already active
            const session = allSessions.find(s => s.id === id)
            if (session && session.documentName === activeContext) {
                setShowMenu(false)
                return
            }

            setIsSwitching(true)
            setShowMenu(false)
            await restoreSession(id)
            
            // Navigate to dashboard for full context refresh if we are switching
            // This is safer than just reloading on some pages
            window.location.href = '/dashboard' 
        } catch (err) {
            console.error('Sidebar switch err:', err)
        } finally {
            setIsSwitching(false)
        }
    }

    const handleLogout = async () => {
        if (window.confirm('Are you sure you want to logout?')) {
            try {
                await signOut(auth)
                navigate('/login')
            } catch (e) {
                console.error(e)
            }
        }
    }

    return (
        <aside className={`sidebar ${collapsed ? 'sidebar-collapsed' : ''}`}>
            {/* Logo */}
            <div className="sidebar-logo">
                <div className="sidebar-logo-icon">
                    <Brain size={20} />
                </div>
                {!collapsed && <span className="sidebar-logo-text">AIVY</span>}
            </div>

            {/* Toggle */}
            <button
                className="sidebar-toggle"
                onClick={() => setCollapsed(c => !c)}
                aria-label="Toggle sidebar"
            >
                {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>

            {/* Nav */}
            <nav className="sidebar-nav">
                {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
                    <NavLink
                        key={to}
                        to={to}
                        className={({ isActive }) =>
                            `sidebar-nav-item ${isActive ? 'sidebar-nav-item-active' : ''}`
                        }
                        title={collapsed ? label : undefined}
                    >
                        <Icon size={18} className="sidebar-nav-icon" />
                        {!collapsed && <span className="sidebar-nav-label">{label}</span>}
                    </NavLink>
                ))}
            </nav>

            {!collapsed && activeContext && (
                <div style={{ position: 'relative', margin: '1rem' }}>
                    <button 
                        onClick={() => setShowMenu(!showMenu)}
                        style={{
                            width: '100%',
                            padding: '0.875rem',
                            borderRadius: '12px',
                            background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.1) 0%, rgba(139, 92, 246, 0.05) 100%)',
                            border: '1px solid rgba(124, 58, 237, 0.25)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.4rem',
                            textAlign: 'left',
                            cursor: 'pointer',
                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                            position: 'relative'
                        }}
                        onMouseEnter={e => e.currentTarget.style.border = '1px solid rgba(124, 58, 237, 0.5)'}
                        onMouseLeave={e => e.currentTarget.style.border = '1px solid rgba(124, 58, 237, 0.25)'}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--color-accent)', fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                                <Brain size={12} /> Study Context
                            </div>
                            <RefreshCw size={10} color="var(--color-text-muted)" style={{ animation: isSwitching ? 'spin 1.5s linear infinite' : 'none' }} />
                        </div>
                        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {activeContext}
                        </div>
                    </button>

                    {showMenu && (
                        <div style={{
                            position: 'absolute', bottom: '105%', left: 0, right: 0, zIndex: 1000,
                            background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)',
                            borderRadius: '12px', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.25)',
                            maxHeight: '220px', overflowY: 'auto'
                        }}>
                            <div style={{ padding: '0.7rem 0.85rem', fontSize: '0.6rem', fontWeight: 700, borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-muted)', background: 'rgba(255,255,255,0.02)' }}>
                                SWITCH DOCUMENTS
                            </div>
                            {allSessions.map(s => (
                                <button
                                    key={s.id}
                                    onClick={() => handleSwitch(s.id)}
                                    style={{
                                        width: '100%', padding: '0.7rem 0.85rem', border: 'none',
                                        background: 'transparent', display: 'flex', alignItems: 'center', gap: '0.6rem',
                                        cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s'
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(124, 58, 237, 0.05)'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                >
                                    <FolderOpen size={13} color="var(--color-accent)" style={{ opacity: 0.6 }} />
                                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {s.documentName}
                                    </span>
                                </button>
                            ))}
                            {allSessions.length === 0 && (
                                <div style={{ padding: '1rem', fontSize: '0.7rem', color: 'var(--color-text-muted)', textAlign: 'center' }}>
                                    No other sessions
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Bottom controls */}
            <div className="sidebar-bottom">
                <button
                    className="sidebar-nav-item sidebar-theme-btn"
                    onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
                    title={collapsed ? (theme === 'dark' ? 'Light mode' : 'Dark mode') : undefined}
                >
                    {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                    {!collapsed && <span className="sidebar-nav-label">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>}
                </button>

                <div className="sidebar-user">
                    <div className="sidebar-user-avatar">{userInitial}</div>
                    {!collapsed && (
                        <div className="sidebar-user-info">
                            <span className="sidebar-user-email">{user?.email}</span>
                        </div>
                    )}
                </div>

                <button
                    className="sidebar-nav-item sidebar-logout-btn"
                    onClick={handleLogout}
                    title={collapsed ? 'Logout' : undefined}
                >
                    <LogOut size={18} />
                    {!collapsed && <span className="sidebar-nav-label">Logout</span>}
                </button>
            </div>
        </aside>
    )
}

export default Sidebar
