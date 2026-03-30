import { doc, getDoc, setDoc, updateDoc, increment, collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db, auth } from '../firebase';

// ============================================
// XP CONSTANTS
// ============================================
const XP_REWARDS = {
    SURVEY_COMPLETE: 10,      // Complete prerequisite survey
    QUIZ_COMPLETE: 50,        // Complete adaptive quiz
    PERFECT_SCORE: 20,        // Get 100% on quiz (bonus)
    FIRST_INTERACTION: 5      // First time using the app
};

// ============================================
// BADGE DEFINITIONS (Static)
// ============================================
export const BADGES = {
    FIRST_STEPS: {
        id: 'first_steps',
        name: 'First Steps',
        description: 'Complete your first survey',
        icon: '🎯',
        requirement: 'survey_complete'
    },
    QUIZ_MASTER: {
        id: 'quiz_master',
        name: 'Quiz Master',
        description: 'Complete your first quiz',
        icon: '📚',
        requirement: 'quiz_complete'
    },
    CENTURY_CLUB: {
        id: 'century_club',
        name: 'Century Club',
        description: 'Earn 100 XP',
        icon: '💯',
        requirement: 'xp_100'
    },
    PERFECT_STUDENT: {
        id: 'perfect_student',
        name: 'Perfect Student',
        description: 'Get a perfect score',
        icon: '⭐',
        requirement: 'perfect_score'
    },
    WEEK_WARRIOR: {
        id: 'week_warrior',
        name: 'Week Warrior',
        description: 'Use the app 7 days in a row',
        icon: '🔥',
        requirement: '7_day_streak'
    }
};

// ============================================
// HELPER: Get User ID
// ============================================
function getUserId() {
    const user = auth.currentUser;
    if (!user) {
        // Fallback to localStorage if/when we implement that
        const localUser = JSON.parse(localStorage.getItem('user'));
        if (localUser && localUser.uid) return localUser.uid;
        throw new Error('User not authenticated');
    }
    return user.uid;
}

// ============================================
// INITIALIZE USER STATS (Call on first login)
// ============================================
export async function initializeUserStats(userId) {
    try {
        const statsRef = doc(db, 'users', userId, 'gamification', 'stats');
        const statsDoc = await getDoc(statsRef);

        if (!statsDoc.exists()) {
            await setDoc(statsRef, {
                totalXP: 0,
                level: 1,
                badges: [],
                lastLoginDate: new Date().toISOString().split('T')[0],
                loginStreak: 1,
                createdAt: new Date().toISOString()
            });
            console.log('User stats initialized');
        } else {
            // Update streak if returning user
            await updateLoginStreak(userId);
        }
    } catch (error) {
        console.error('Error initializing stats:', error);
    }
}

// ============================================
// UPDATE LOGIN STREAK (for streak badges)
// ============================================
async function updateLoginStreak(userId) {
    try {
        const statsRef = doc(db, 'users', userId, 'gamification', 'stats');
        const statsDoc = await getDoc(statsRef);

        if (statsDoc.exists()) {
            const stats = statsDoc.data();
            const today = new Date().toISOString().split('T')[0];
            const lastLogin = stats.lastLoginDate;

            // Calculate day difference
            const lastDate = new Date(lastLogin);
            const currentDate = new Date(today);
            const diffTime = currentDate - lastDate;
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays === 1) {
                // Consecutive day - increment streak
                await updateDoc(statsRef, {
                    loginStreak: increment(1),
                    lastLoginDate: today
                });
            } else if (diffDays > 1) {
                // Streak broken - reset to 1
                await updateDoc(statsRef, {
                    loginStreak: 1,
                    lastLoginDate: today
                });
            }
            // If diffDays === 0, same day - do nothing
        }
    } catch (error) {
        console.error('Error updating streak:', error);
    }
}

// ============================================
// ADD XP (Main function)
// ============================================
export async function addXP(xpAmount, reason = 'activity') {
    try {
        const userId = getUserId();
        const statsRef = doc(db, 'users', userId, 'gamification', 'stats');

        // Update XP
        await updateDoc(statsRef, {
            totalXP: increment(xpAmount)
        });

        console.log(`Added ${xpAmount} XP for: ${reason}`);

        // Check for badge eligibility after XP update
        const statsDoc = await getDoc(statsRef);
        if (statsDoc.exists()) {
            const currentXP = statsDoc.data().totalXP;
            await checkAndAwardBadges(userId, currentXP);
        }

        // Notify UI components
        window.dispatchEvent(new Event('gamification_update'));

        return true;
    } catch (error) {
        console.error('Error adding XP:', error);
        return false;
    }
}

// ============================================
// AWARD XP FOR SPECIFIC ACTIONS
// ============================================
export async function awardSurveyXP() {
    await addXP(XP_REWARDS.SURVEY_COMPLETE, 'Survey completed');
    const userId = getUserId();
    await awardBadge(userId, 'first_steps');
}

export async function awardQuizXP(score, total) {
    const baseXP = XP_REWARDS.QUIZ_COMPLETE;
    let totalXP = baseXP;

    // Bonus for perfect score
    if (score === total) {
        totalXP += XP_REWARDS.PERFECT_SCORE;
        const userId = getUserId();
        await awardBadge(userId, 'perfect_student');
    }

    await addXP(totalXP, 'Quiz completed');
    const userId = getUserId();
    await awardBadge(userId, 'quiz_master');
}

// ============================================
// AWARD BADGE (Check if not already earned)
// ============================================
export async function awardBadge(userId, badgeId) {
    try {
        const statsRef = doc(db, 'users', userId, 'gamification', 'stats');
        const statsDoc = await getDoc(statsRef);

        if (statsDoc.exists()) {
            const stats = statsDoc.data();
            const currentBadges = stats.badges || [];

            // Check if badge already awarded
            if (!currentBadges.includes(badgeId)) {
                currentBadges.push(badgeId);
                await updateDoc(statsRef, {
                    badges: currentBadges
                });
                console.log(`Badge awarded: ${badgeId}`);
                return true;
            }
        }
        return false;
    } catch (error) {
        console.error('Error awarding badge:', error);
        return false;
    }
}

// ============================================
// CHECK AND AWARD BADGES BASED ON XP
// ============================================
async function checkAndAwardBadges(userId, currentXP) {
    // Award Century Club badge at 100 XP
    if (currentXP >= 100) {
        await awardBadge(userId, 'century_club');
    }

    // Check for streak badges
    const statsRef = doc(db, 'users', userId, 'gamification', 'stats');
    const statsDoc = await getDoc(statsRef);

    if (statsDoc.exists()) {
        const stats = statsDoc.data();
        if (stats.loginStreak >= 7) {
            await awardBadge(userId, 'week_warrior');
        }
    }
}

// ============================================
// GET USER STATS (for dashboard display)
// ============================================
export async function getUserStats() {
    try {
        const userId = getUserId();
        const statsRef = doc(db, 'users', userId, 'gamification', 'stats');
        const statsDoc = await getDoc(statsRef);

        if (statsDoc.exists()) {
            return statsDoc.data();
        }

        // Initialize if doesn't exist
        await initializeUserStats(userId);
        return {
            totalXP: 0,
            level: 1,
            badges: [],
            loginStreak: 1
        };
    } catch (error) {
        console.error('Error getting stats:', error);
        return null;
    }
}

// ============================================
// GET LEADERBOARD (Top 10 users by XP)
// ============================================
export async function getLeaderboard() {
    try {
        // Query all users' gamification stats
        const leaderboardData = [];

        // Get all users
        const usersRef = collection(db, 'users');
        const usersSnapshot = await getDocs(usersRef);

        // For each user, get their stats
        for (const userDoc of usersSnapshot.docs) {
            const statsRef = doc(db, 'users', userDoc.id, 'gamification', 'stats');
            const statsDoc = await getDoc(statsRef);

            if (statsDoc.exists()) {
                const stats = statsDoc.data();
                const userData = userDoc.data();

                leaderboardData.push({
                    userId: userDoc.id,
                    name: userData.name || 'Anonymous',
                    email: userData.email || '',
                    totalXP: stats.totalXP || 0,
                    level: stats.level || 1,
                    badges: stats.badges || []
                });
            }
        }

        // Sort by XP (descending) and take top 10
        leaderboardData.sort((a, b) => b.totalXP - a.totalXP);
        return leaderboardData.slice(0, 10);

    } catch (error) {
        console.error('Error fetching leaderboard:', error);
        return [];
    }
}

// ============================================
// GET USER BADGES (formatted for display)
// ============================================
export function getBadgeDetails(badgeIds) {
    return badgeIds.map(id => {
        // Find badge definition
        const badge = Object.values(BADGES).find(b => b.id === id);
        return badge || null;
    }).filter(Boolean); // Remove nulls
}
