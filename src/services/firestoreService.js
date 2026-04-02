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

/**
 * Generate a safe ID for Firestore paths from a document name.
 */
function getContextId(docName) {
    if (!docName) return 'default'
    return docName.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 100)
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
export async function saveStudyPlan(plan, subject, examDate, docName) {
    // Always update local cache immediately (optimistic)
    const cacheKey = `studyPlan_${getContextId(docName)}`
    safeLocalSet(cacheKey, plan)
    safeLocalSet(`${cacheKey}_meta`, { subject, examDate })

    try {
        const uid = getUserId()
        const contextId = getContextId(docName)
        const ref = doc(db, 'users', uid, 'contexts', contextId)
        
        await setDoc(ref, {
            studyPlan: {
                plan,
                subject,
                examDate,
                completedDays: [],
                updatedAt: serverTimestamp()
            }
        }, { merge: true })
        return true
    } catch (err) {
        console.warn('saveStudyPlan Firestore error:', err.message)
        return false
    }
}

/**
 * Load study plan from Firestore for a specific document context.
 */
export async function getStudyPlan(docName) {
    try {
        const uid = getUserId()
        const contextId = getContextId(docName)
        const ref = doc(db, 'users', uid, 'contexts', contextId)
        const snap = await getDoc(ref)
        
        if (snap.exists() && snap.data().studyPlan) {
            const data = snap.data().studyPlan
            const cacheKey = `studyPlan_${contextId}`
            safeLocalSet(cacheKey, data.plan)
            return {
                plan: data.plan || null,
                subject: data.subject || '',
                examDate: data.examDate || '',
                completedDays: data.completedDays || []
            }
        }
    } catch (err) {
        console.warn('getStudyPlan Firestore error:', err.message)
    }

    // Local fallback
    const cacheKey = `studyPlan_${getContextId(docName)}`
    const plan = safeLocalGet(cacheKey)
    const meta = safeLocalGet(`${cacheKey}_meta`) || {}
    if (plan) return { plan, subject: meta.subject || '', examDate: meta.examDate || '', completedDays: [] }
    return null
}

/**
 * Update completed days for a specific context.
 */
export async function saveCompletedDays(days, docName) {
    try {
        const uid = getUserId()
        const contextId = getContextId(docName)
        const ref = doc(db, 'users', uid, 'contexts', contextId)
        await setDoc(ref, { 
            studyPlan: { completedDays: days, updatedAt: serverTimestamp() } 
        }, { merge: true })
        return true
    } catch (err) {
        console.warn('saveCompletedDays error:', err.message)
        return false
    }
}

// ─── Flashcards ────────────────────────────────────────────────────────────────

/**
 * Save flashcard set to a specific document context.
 */
export async function saveFlashcards(cards, topic, docName) {
    const contextId = getContextId(docName)
    safeLocalSet(`flashcards_${contextId}`, cards)

    try {
        const uid = getUserId()
        const ref = doc(db, 'users', uid, 'contexts', contextId)
        await setDoc(ref, {
            flashcards: {
                cards,
                topic: topic || '',
                updatedAt: serverTimestamp()
            }
        }, { merge: true })
        return true
    } catch (err) {
        console.warn('saveFlashcards Firestore error:', err.message)
        return false
    }
}

/**
 * Load flashcards for a specific document context.
 */
export async function getFlashcards(docName) {
    try {
        const uid = getUserId()
        const contextId = getContextId(docName)
        const ref = doc(db, 'users', uid, 'contexts', contextId)
        const snap = await getDoc(ref)
        
        if (snap.exists() && snap.data().flashcards) {
            const data = snap.data().flashcards
            safeLocalSet(`flashcards_${contextId}`, data.cards)
            return { cards: data.cards, topic: data.topic || '' }
        }
    } catch (err) {
        console.warn('getFlashcards Firestore error:', err.message)
    }

    const contextId = getContextId(docName)
    const cards = safeLocalGet(`flashcards_${contextId}`)
    if (cards?.length) return { cards, topic: '' }
    return null
}
