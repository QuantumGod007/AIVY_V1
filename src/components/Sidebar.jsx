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
    Moon
} from 'lucide-react'

const NAV_ITEMS = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/ai-tutor', icon: MessageSquare, label: 'AI Tutor' },
    { to: '/study-planner', icon: CalendarDays, label: 'Study Planner' },
    { to: '/flashcards', icon: CreditCard, label: 'Flashcards' },
    { to: '/sessions', icon: Brain, label: 'Sessions' },
    { to: '/leaderboard', icon: Trophy, label: 'Leaderboard' },
    { to: '/progress', icon: TrendingUp, label: 'Progress' },
]

function Sidebar() {
    const [collapsed, setCollapsed] = useState(false)
    const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark')
    const navigate = useNavigate()
    const user = auth.currentUser
    const userInitial = user?.email?.charAt(0).toUpperCase() || 'U'

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme)
        localStorage.setItem('theme', theme)
    }, [theme])

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
