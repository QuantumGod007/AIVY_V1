import { useState, useEffect } from 'react';
import { getUserStats } from '../services/gamificationService';
import { Star, Trophy } from 'lucide-react';
import './Gamification.css'; // Re-use existing CSS

function GamificationSummary() {
    const [stats, setStats] = useState(null);

    useEffect(() => {
        loadStats();

        // Listen for custom event to update stats when XP is added
        const handleStatsUpdate = () => loadStats();
        window.addEventListener('gamification_update', handleStatsUpdate);

        return () => {
            window.removeEventListener('gamification_update', handleStatsUpdate);
        };
    }, []);

    const loadStats = async () => {
        try {
            const userStats = await getUserStats();
            if (userStats) setStats(userStats);
        } catch (error) {
            console.error('Error loading gamification summary:', error);
        }
    };

    if (!stats) return null;

    return (
        <div className="gamification-summary">
            <div className="summary-pill xp-pill">
                <Star size={14} className="pill-icon" />
                <span className="pill-value">{stats.totalXP} XP</span>
            </div>
            <div className="summary-pill level-pill">
                <Trophy size={14} className="pill-icon" />
                <span className="pill-value">Lvl {stats.level}</span>
            </div>
        </div>
    );
}

export default GamificationSummary;
