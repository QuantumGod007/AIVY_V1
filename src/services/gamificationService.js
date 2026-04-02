/**
 * gamificationService.js
 * XP, badges, and leaderboard logic powered by Firebase Firestore.
 *
 * Architecture:
 *  - users/{uid}/gamification/stats  → per-user XP, badges, streak
 *  - leaderboard/{uid}               → denormalized flat doc for fast sorted reads
 *    (written every time XP is awarded — avoids N+1 sub-collection scans)
 */

import {
    doc, getDoc, setDoc, updateDoc, increment,
    collection, query, orderBy, limit,
    getDocs, onSnapshot, serverTimestamp
} from 'firebase/firestore'
import { db, auth } from '../firebase'

// ─── XP Constants ─────────────────────────────────────────────────────────────

const XP_REWARDS = {
    SURVEY_COMPLETE: 10,
    QUIZ_COMPLETE: 50,
    PERFECT_SCORE: 20,
    FIRST_INTERACTION: 5
}

// ─── Badge Definitions ────────────────────────────────────────────────────────

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
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getUserId() {
    const user = auth.currentUser
    if (!user) {
        const local = JSON.parse(localStorage.getItem('user') || 'null')
        if (local?.uid) return local.uid
        throw new Error('User not authenticated')
    }
    return user.uid
}

function getDisplayName() {
    const user = auth.currentUser
    if (!user) return 'Student'
    return user.displayName || user.email?.split('@')[0] || 'Student'
}

// ─── Leaderboard Sync (denormalized) ─────────────────────────────────────────

/**
 * Write/update the flat leaderboard/{uid} doc with latest XP and badges.
 * Called after every XP award — keeps leaderboard queryable in one snapshot.
 */
async function syncLeaderboardEntry(userId, totalXP, badges, avatar = '') {
    try {
        const user = auth.currentUser
        const ref = doc(db, 'leaderboard', userId)
        
        // Use provided avatar or existing one if available
        let finalAvatar = avatar
        if (!finalAvatar) {
            const stats = await getDoc(doc(db, 'users', userId, 'gamification', 'stats'))
            finalAvatar = stats.data()?.avatar || ''
        }

        await setDoc(ref, {
            userId,
            name: user?.displayName || user?.email?.split('@')[0] || 'Student',
            email: user?.email || '',
            totalXP,
            avatar: finalAvatar,
            badges: badges || [],
            updatedAt: serverTimestamp()
        }, { merge: true })
    } catch (err) {
        console.warn('syncLeaderboardEntry error:', err.message)
    }
}

// ─── Initialize User Stats ────────────────────────────────────────────────────

/**
 * Update user's display name and sync to leaderboard
 */
export async function updateUserProfile(newName, avatar = '') {
    try {
        const user = auth.currentUser
        if (!user) throw new Error('Not authenticated')
        
        const { updateProfile } = require('firebase/auth')
        await updateProfile(user, { displayName: newName })
        
        const statsRef = doc(db, 'users', user.uid, 'gamification', 'stats')
        await setDoc(statsRef, { avatar }, { merge: true })

        // Propagate to leaderboard entry immediately
        const stats = await getUserStats()
        if (stats) {
            await syncLeaderboardEntry(user.uid, stats.totalXP || 0, stats.badges || [], avatar)
        }
        
        return true
    } catch (err) {
        console.error('updateUserProfile error:', err)
        return false
    }
}

export async function initializeUserStats(userId) {
    try {
        const statsRef = doc(db, 'users', userId, 'gamification', 'stats')
        const snap = await getDoc(statsRef)
        if (!snap.exists()) {
            await setDoc(statsRef, {
                totalXP: 0,
                level: 1,
                badges: [],
                lastLoginDate: new Date().toISOString().split('T')[0],
                loginStreak: 1,
                createdAt: new Date().toISOString()
            })
            // Seed the leaderboard entry so new users appear immediately
            await syncLeaderboardEntry(userId, 0, [])
        } else {
            await updateLoginStreak(userId)
        }
    } catch (error) {
        console.error('Error initializing stats:', error)
    }
}

// ─── Login Streak ─────────────────────────────────────────────────────────────

async function updateLoginStreak(userId) {
    try {
        const statsRef = doc(db, 'users', userId, 'gamification', 'stats')
        const snap = await getDoc(statsRef)
        if (!snap.exists()) return
        const stats = snap.data()
        const today = new Date().toISOString().split('T')[0]
        const lastLogin = stats.lastLoginDate
        const diffDays = Math.floor(
            (new Date(today) - new Date(lastLogin)) / (1000 * 60 * 60 * 24)
        )
        if (diffDays === 1) {
            await updateDoc(statsRef, { loginStreak: increment(1), lastLoginDate: today })
        } else if (diffDays > 1) {
            await updateDoc(statsRef, { loginStreak: 1, lastLoginDate: today })
        }
    } catch (err) {
        console.error('updateLoginStreak:', err)
    }
}

// ─── Add XP ───────────────────────────────────────────────────────────────────

export async function addXP(xpAmount, reason = 'activity') {
    try {
        const userId = getUserId()
        const statsRef = doc(db, 'users', userId, 'gamification', 'stats')

        await updateDoc(statsRef, { totalXP: increment(xpAmount) })
        console.log(`Added ${xpAmount} XP for: ${reason}`)

        // Re-read to get fresh totals for badge check + leaderboard sync
        const updated = await getDoc(statsRef)
        if (updated.exists()) {
            const { totalXP, badges } = updated.data()
            await checkAndAwardBadges(userId, totalXP)
            // Sync denormalized leaderboard entry
            const latest = await getDoc(statsRef)
            const latestBadges = latest.data()?.badges || []
            await syncLeaderboardEntry(userId, totalXP, latestBadges)
        }

        window.dispatchEvent(new Event('gamification_update'))
        return true
    } catch (err) {
        console.error('addXP error:', err)
        return false
    }
}

// ─── Action-Specific XP ───────────────────────────────────────────────────────

export async function awardSurveyXP() {
    await addXP(XP_REWARDS.SURVEY_COMPLETE, 'Survey completed')
    const userId = getUserId()
    await awardBadge(userId, 'first_steps')
}

export async function awardQuizXP(score, total, documentName = 'General') {
    let xpAmount = XP_REWARDS.QUIZ_COMPLETE
    if (score === total) {
        xpAmount += XP_REWARDS.PERFECT_SCORE
        const userId = getUserId()
        await awardBadge(userId, 'perfect_student')
    }
    
    // Add global XP
    await addXP(xpAmount, `Quiz completed: ${documentName}`)
    
    // Add Topic-Specific XP (Private for stats)
    try {
        const userId = getUserId()
        const topicId = documentName.replace(/[^a-zA-Z0-9]/g, '_')
        const topicRef = doc(db, 'users', userId, 'gamification', 'topics', 'data', topicId)
        await setDoc(topicRef, {
            documentName,
            totalXP: increment(xpAmount),
            quizzesCompleted: increment(1),
            lastActive: serverTimestamp()
        }, { merge: true })

        // Sync to Global Topic Leaderboard
        const user = auth.currentUser
        const globalTopicRef = doc(db, 'leaderboard_topics', topicId, 'rankings', userId)
        await setDoc(globalTopicRef, {
            userId,
            name: user?.displayName || user?.email?.split('@')[0] || 'Student',
            totalXP: increment(xpAmount),
            topicName: documentName,
            updatedAt: serverTimestamp()
        }, { merge: true })
    } catch (err) {
        console.warn('awardQuizXP topic tracking error:', err.message)
    }

    const userId = getUserId()
    await awardBadge(userId, 'quiz_master')
}

// ─── Badge Award ──────────────────────────────────────────────────────────────

export async function awardBadge(userId, badgeId) {
    try {
        const statsRef = doc(db, 'users', userId, 'gamification', 'stats')
        const snap = await getDoc(statsRef)
        if (!snap.exists()) return false
        const stats = snap.data()
        const current = stats.badges || []
        if (current.includes(badgeId)) return false
        const updated = [...current, badgeId]
        await updateDoc(statsRef, { badges: updated })
        // Keep leaderboard in sync with new badge
        await syncLeaderboardEntry(userId, stats.totalXP || 0, updated)
        console.log(`Badge awarded: ${badgeId}`)
        return true
    } catch (err) {
        console.error('awardBadge error:', err)
        return false
    }
}

async function checkAndAwardBadges(userId, currentXP) {
    if (currentXP >= 100) await awardBadge(userId, 'century_club')
    const statsRef = doc(db, 'users', userId, 'gamification', 'stats')
    const snap = await getDoc(statsRef)
    if (snap.exists() && snap.data().loginStreak >= 7) {
        await awardBadge(userId, 'week_warrior')
    }
}

// ─── Get User Stats ───────────────────────────────────────────────────────────

export async function getUserStats() {
    try {
        const userId = getUserId()
        const statsRef = doc(db, 'users', userId, 'gamification', 'stats')
        const snap = await getDoc(statsRef)
        if (snap.exists()) return snap.data()
        await initializeUserStats(userId)
        return { totalXP: 0, level: 1, badges: [], loginStreak: 1 }
    } catch (err) {
        console.error('getUserStats error:', err)
        return null
    }
}

// ─── Leaderboard — Single Query (replaces N+1 pattern) ───────────────────────

/**
 * One-time fetch of top 20 from the flat `leaderboard` collection.
 * Returns sorted array by totalXP desc.
 */
export async function getLeaderboard() {
    try {
        const lb = collection(db, 'leaderboard')
        const q = query(lb, orderBy('totalXP', 'desc'), limit(20))
        const snap = await getDocs(q)
        const results = []
        snap.forEach(d => results.push({ ...d.data(), userId: d.id }))
        return results
    } catch (err) {
        console.error('getLeaderboard error:', err)
        return []
    }
}

/**
 * Real-time leaderboard subscription using onSnapshot.
 * @param {function} callback - called with sorted leaderboard array whenever data changes
 * @returns {function} unsubscribe function — call this on component unmount
 */
/**
 * Get internal rank of current user
 */
export async function getLeaderboardRank() {
    try {
        const userId = getUserId()
        const lb = collection(db, 'leaderboard')
        const q = query(lb, orderBy('totalXP', 'desc'))
        const snap = await getDocs(q)
        let rank = 1
        let found = false
        snap.forEach(doc => {
            if (doc.id === userId) found = true
            if (!found) rank++
        })
        return found ? rank : 0
    } catch (err) {
        return 0
    }
}

const MOCK_BOTS = [
    { userId: 'bot_1', name: 'Quantum Sage', totalXP: 550, avatar: '🤖', badges: ['quiz_master', 'century_club'], isBot: true },
    { userId: 'bot_2', name: 'DeepMind', totalXP: 420, avatar: '🧠', badges: ['first_steps'], isBot: true },
    { userId: 'bot_3', name: 'SpeedLearner', totalXP: 310, avatar: '🚀', badges: ['quiz_master'], isBot: true },
    { userId: 'bot_4', name: 'NightOwl', totalXP: 240, avatar: '🦉', badges: [], isBot: true },
    { userId: 'bot_5', name: 'Curious Cat', totalXP: 145, avatar: '🐱', badges: [], isBot: true }
]

function injectBots(realUsers) {
    // Merge real users with bots and sort
    const all = [...realUsers, ...MOCK_BOTS]
    // Deduplicate in case real user has same ID as bot (unlikely but safe)
    const unique = Array.from(new Map(all.map(u => [u.userId, u])).values())
    return unique.sort((a, b) => (b.totalXP || 0) - (a.totalXP || 0)).slice(0, 15)
}

/**
 * Real-time leaderboard subscription using onSnapshot.
 */
export function subscribeToLeaderboard(callback) {
    try {
        const lb = collection(db, 'leaderboard')
        const q = query(lb, orderBy('totalXP', 'desc'), limit(20))
        const unsub = onSnapshot(q, (snap) => {
            const results = []
            snap.forEach(d => results.push({ ...d.data(), userId: d.id }))
            callback(injectBots(results))
        }, (err) => {
            console.error('leaderboard onSnapshot error:', err)
            callback(injectBots([]))
        })
        return unsub
    } catch (err) {
        return () => {}
    }
}

// ─── Badge Display Helpers ────────────────────────────────────────────────────

export function getBadgeDetails(badgeIds) {
    return badgeIds
        .map(id => Object.values(BADGES).find(b => b.id === id) || null)
        .filter(Boolean)
}

/**
 * Real-time leaderboard subscription for a SPECIFIC TOPIC.
 */
export function subscribeToTopicLeaderboard(topicName, callback) {
    try {
        const topicId = topicName.replace(/[^a-zA-Z0-9]/g, '_')
        const lb = collection(db, 'leaderboard_topics', topicId, 'rankings')
        const q = query(lb, orderBy('totalXP', 'desc'), limit(15))
        
        return onSnapshot(q, (snap) => {
            const results = []
            snap.forEach(d => results.push({ ...d.data(), userId: d.id }))
            callback(results)
        }, (err) => {
            console.error('topic leaderboard error:', err)
            callback([])
        })
    } catch (err) {
        console.error('subscribeToTopicLeaderboard:', err)
        return () => {}
    }
}
