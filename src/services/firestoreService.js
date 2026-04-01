/**
 * firestoreService.js
 * Cloud persistence for StudyPlanner and Flashcards.
 * Writes to Firestore per-user; localStorage is kept as an offline cache.
 */

import { db, auth } from '../firebase'
import {
    doc,
    getDoc,
    setDoc,
    updateDoc,
    serverTimestamp
} from 'firebase/firestore'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getUserId() {
    const user = auth.currentUser
    if (!user) throw new Error('User not authenticated')
    return user.uid
}

// Async version — waits for auth to resolve (use in top-level calls if needed)
export async function waitForUserId() {
    return new Promise((resolve, reject) => {
        if (auth.currentUser) { resolve(auth.currentUser.uid); return }
        const { onAuthStateChanged } = require('firebase/auth')
        const unsub = onAuthStateChanged(auth, (user) => {
            unsub()
            if (user) resolve(user.uid)
            else reject(new Error('User not authenticated'))
        })
    })
}

function safeLocalGet(key) {
    try { return JSON.parse(localStorage.getItem(key)) } catch { return null }
}

function safeLocalSet(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* quota */ }
}

// ─── User Profile ──────────────────────────────────────────────────────────────

/**
 * Ensure a top-level user profile doc exists.
 * Called once on login/signup so the leaderboard can display names.
 */
export async function ensureUserProfile(displayName) {
    try {
        const user = auth.currentUser
        if (!user) return
        const profileRef = doc(db, 'users', user.uid)
        const snap = await getDoc(profileRef)
        if (!snap.exists()) {
            await setDoc(profileRef, {
                uid: user.uid,
                email: user.email || '',
                name: displayName || user.displayName || user.email?.split('@')[0] || 'Student',
                createdAt: serverTimestamp()
            })
        }
    } catch (err) {
        console.warn('ensureUserProfile:', err.message)
    }
}

// ─── Study Planner ─────────────────────────────────────────────────────────────

/**
 * Save generated study plan to Firestore + localStorage cache.
 */
export async function saveStudyPlan(plan, subject, examDate) {
    // Always update local cache immediately (optimistic)
    safeLocalSet('studyPlan', plan)
    safeLocalSet('studyPlanMeta', { subject, examDate })

    try {
        const uid = getUserId()
        const ref = doc(db, 'users', uid, 'studyPlans', 'current')
        await setDoc(ref, {
            plan,
            subject,
            examDate,
            completedDays: [],
            updatedAt: serverTimestamp()
        })
        return true
    } catch (err) {
        console.warn('saveStudyPlan Firestore error (local cache used):', err.message)
        return false
    }
}

/**
 * Load study plan from Firestore; fall back to localStorage.
 * Returns { plan, subject, examDate, completedDays } or null.
 */
export async function getStudyPlan() {
    try {
        const uid = getUserId()
        const ref = doc(db, 'users', uid, 'studyPlans', 'current')
        const snap = await getDoc(ref)
        if (snap.exists()) {
            const data = snap.data()
            // Sync local cache
            if (data.plan) safeLocalSet('studyPlan', data.plan)
            if (data.completedDays) safeLocalSet('studyPlanCompleted', data.completedDays)
            return {
                plan: data.plan || null,
                subject: data.subject || '',
                examDate: data.examDate || '',
                completedDays: data.completedDays || []
            }
        }
    } catch (err) {
        console.warn('getStudyPlan Firestore error — falling back to localStorage:', err.message)
    }

    // Offline fallback
    const plan = safeLocalGet('studyPlan')
    const meta = safeLocalGet('studyPlanMeta') || {}
    const completedDays = safeLocalGet('studyPlanCompleted') || []
    if (plan) return { plan, subject: meta.subject || '', examDate: meta.examDate || '', completedDays }
    return null
}

/**
 * Update only the completedDays field (called when user ticks a day).
 */
export async function saveCompletedDays(days) {
    safeLocalSet('studyPlanCompleted', days)
    try {
        const uid = getUserId()
        const ref = doc(db, 'users', uid, 'studyPlans', 'current')
        await updateDoc(ref, { completedDays: days, updatedAt: serverTimestamp() })
        return true
    } catch (err) {
        console.warn('saveCompletedDays Firestore error:', err.message)
        return false
    }
}

// ─── Flashcards ────────────────────────────────────────────────────────────────

/**
 * Save flashcard set to Firestore + localStorage cache.
 */
export async function saveFlashcards(cards, topic) {
    safeLocalSet('flashcards', cards)
    safeLocalSet('flashcardTopic', topic)

    try {
        const uid = getUserId()
        const ref = doc(db, 'users', uid, 'flashcards', 'current')
        await setDoc(ref, {
            cards,
            topic: topic || '',
            updatedAt: serverTimestamp()
        })
        return true
    } catch (err) {
        console.warn('saveFlashcards Firestore error (local cache used):', err.message)
        return false
    }
}

/**
 * Load flashcards from Firestore; fall back to localStorage.
 * Returns { cards, topic } or null.
 */
export async function getFlashcards() {
    try {
        const uid = getUserId()
        const ref = doc(db, 'users', uid, 'flashcards', 'current')
        const snap = await getDoc(ref)
        if (snap.exists()) {
            const data = snap.data()
            if (data.cards?.length) {
                safeLocalSet('flashcards', data.cards)
                safeLocalSet('flashcardTopic', data.topic || '')
                return { cards: data.cards, topic: data.topic || '' }
            }
        }
    } catch (err) {
        console.warn('getFlashcards Firestore error — falling back to localStorage:', err.message)
    }

    const cards = safeLocalGet('flashcards')
    const topic = safeLocalGet('flashcardTopic') || ''
    if (cards?.length) return { cards, topic }
    return null
}
