/**
 * Document storage service using Firebase Firestore
 */

import { db, auth } from '../firebase'
import {
    collection,
    doc,
    setDoc,
    getDoc,
    getDocs,
    deleteDoc,
    query,
    where,
    orderBy,
    serverTimestamp
} from 'firebase/firestore'

/**
 * Get current user ID
 */
function getUserId() {
    const user = auth.currentUser
    if (!user) {
        throw new Error('User not authenticated')
    }
    return user.uid
}

/**
 * Global Active Context Management
 * We use localStorage for the active context name so it's instant across tabs/refreshes.
 */
export function setActiveContext(docName) {
    if (!docName) return
    localStorage.setItem('aivy_active_context', docName)
}

export function getActiveContextName() {
    return localStorage.getItem('aivy_active_context') || ''
}

/**
 * Firestore has a 1MB document limit.
 * Large PDFs can easily exceed this — truncate documentText to be safe.
 */
function safeTruncate(obj) {
    if (!obj) return obj
    const MAX_CHARS = 100000 // ~100KB of text
    if (obj.documentText && obj.documentText.length > MAX_CHARS) {
        return {
            ...obj,
            documentText: obj.documentText.substring(0, MAX_CHARS),
            documentTextTruncated: true
        }
    }
    return obj
}

/**
 * Save a document
 */
export async function saveDocument(document) {
    try {
        const userId = getUserId()
        const docId = Date.now().toString()
        const docRef = doc(db, 'users', userId, 'documents', docId)

        const newDoc = {
            id: docId,
            ...document,
            uploadedAt: serverTimestamp()
        }

        await setDoc(docRef, newDoc)
        return { ...newDoc, uploadedAt: new Date().toISOString() }
    } catch (error) {
        console.error('Error saving document:', error)
        throw error
    }
}

/**
 * Get all documents for current user
 */
export async function getDocuments() {
    try {
        const userId = getUserId()
        const docsRef = collection(db, 'users', userId, 'documents')
        const q = query(docsRef, orderBy('uploadedAt', 'desc'))
        const querySnapshot = await getDocs(q)

        const documents = []
        querySnapshot.forEach((doc) => {
            const data = doc.data()
            documents.push({
                ...data,
                uploadedAt: data.uploadedAt?.toDate?.()?.toISOString() || data.uploadedAt
            })
        })

        return documents
    } catch (error) {
        console.error('Error getting documents:', error)
        return []
    }
}

/**
 * Get a specific document by ID
 */
export async function getDocument(id) {
    try {
        const userId = getUserId()
        const docRef = doc(db, 'users', userId, 'documents', id)
        const docSnap = await getDoc(docRef)

        if (docSnap.exists()) {
            const data = docSnap.data()
            return {
                ...data,
                uploadedAt: data.uploadedAt?.toDate?.()?.toISOString() || data.uploadedAt
            }
        }
        return null
    } catch (error) {
        console.error('Error getting document:', error)
        return null
    }
}

/**
 * Delete a document
 */
export async function deleteDocument(id) {
    try {
        const userId = getUserId()
        const docRef = doc(db, 'users', userId, 'documents', id)
        await deleteDoc(docRef)
        return true
    } catch (error) {
        console.error('Error deleting document:', error)
        return false
    }
}

/**
 * Save current quiz for user
 */
export async function saveCurrentQuiz(quiz) {
    try {
        const userId = getUserId()
        const quizRef = doc(db, 'users', userId, 'quizzes', 'current')

        await setDoc(quizRef, {
            ...safeTruncate(quiz),
            updatedAt: serverTimestamp()
        })
        if (quiz.documentName) setActiveContext(quiz.documentName)
    } catch (error) {
        console.error('Error saving quiz:', error)
        throw error
    }
}

/**
 * Get current quiz for user
 */
export async function getCurrentQuiz() {
    try {
        const userId = getUserId()
        const quizRef = doc(db, 'users', userId, 'quizzes', 'current')
        const quizSnap = await getDoc(quizRef)

        if (quizSnap.exists()) {
            const data = quizSnap.data()
            if (data.documentName) setActiveContext(data.documentName)
            return {
                ...data,
                updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt
            }
        }
        return null
    } catch (error) {
        console.error('Error getting quiz:', error)
        return null
    }
}

/**
 * Clear current quiz
 */
export async function clearCurrentQuiz() {
    try {
        const userId = getUserId()
        const quizRef = doc(db, 'users', userId, 'quizzes', 'current')
        await deleteDoc(quizRef)
    } catch (error) {
        console.error('Error clearing quiz:', error)
    }
}

/**
 * Save quiz results
 */
export async function saveQuizResults(results) {
    try {
        const userId = getUserId()
        const resultId = Date.now().toString()
        const resultRef = doc(db, 'users', userId, 'results', resultId)

        await setDoc(resultRef, {
            ...results,
            id: resultId,
            createdAt: serverTimestamp()
        })

        return resultId
    } catch (error) {
        console.error('Error saving quiz results:', error)
        throw error
    }
}

/**
 * Get quiz results
 */
export async function getQuizResults() {
    try {
        const userId = getUserId()
        const resultsRef = collection(db, 'users', userId, 'results')
        const q = query(resultsRef, orderBy('createdAt', 'desc'))
        const querySnapshot = await getDocs(q)

        const results = []
        querySnapshot.forEach((doc) => {
            const data = doc.data()
            results.push({
                ...data,
                createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt
            })
        })

        return results
    } catch (error) {
        console.error('Error getting quiz results:', error)
        return []
    }
}

/**
 * Get quiz results for a specific document
 */
export async function getQuizResultsByDocument(documentName) {
    try {
        const userId = getUserId()
        const resultsRef = collection(db, 'users', userId, 'results')
        const q = query(
            resultsRef, 
            where('documentName', '==', documentName),
            orderBy('createdAt', 'desc')
        )
        const snap = await getDocs(q)
        const results = []
        snap.forEach(d => {
            const data = d.data()
            results.push({ 
                ...data, 
                id: d.id,
                createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt
            })
        })
        return results
    } catch (error) {
        console.error('getQuizResultsByDocument:', error)
        return []
    }
}

/**
 * Archive current session (document + quiz + results)
 * Preserves all learning activity before starting new document
 */
export async function archiveCurrentSession(summary = '') {
    try {
        const userId = getUserId()
        const sessionId = Date.now().toString()

        // Get current quiz data
        const currentQuiz = await getCurrentQuiz()

        if (!currentQuiz) {
            // No active session to archive
            return null
        }

        const score = currentQuiz.score || 0
        const total = currentQuiz.questions?.length || 0
        const acc = total > 0 ? Math.round((score / total) * 100) : 0

        // Create session archive
        const sessionRef = doc(db, 'users', userId, 'sessions', sessionId)
        const sessionData = safeTruncate({
            id: sessionId,
            documentName: currentQuiz.documentName,
            documentText: currentQuiz.documentText,
            isPrerequisiteSurvey: currentQuiz.isPrerequisiteSurvey || false,
            questions: currentQuiz.questions || [],
            userAnswers: currentQuiz.userAnswers || {},
            score: score,
            total: total,
            accuracy: acc,
            summary: summary,
            completedAt: currentQuiz.completedAt || null,
            archivedAt: serverTimestamp()
        })

        await setDoc(sessionRef, sessionData)

        // Clear current quiz to reset dashboard
        await clearCurrentQuiz()

        return sessionId
    } catch (error) {
        console.error('Error archiving session:', error)
        throw error
    }
}

/**
 * Get all archived sessions
 */
export async function getArchivedSessions() {
    try {
        const userId = getUserId()
        const sessionsRef = collection(db, 'users', userId, 'sessions')
        const q = query(sessionsRef, orderBy('archivedAt', 'desc'))
        const querySnapshot = await getDocs(q)

        const sessions = []
        querySnapshot.forEach((doc) => {
            const data = doc.data()
            sessions.push({
                ...data,
                archivedAt: data.archivedAt?.toDate?.()?.toISOString() || data.archivedAt
            })
        })

        return sessions
    } catch (error) {
        console.error('Error getting archived sessions:', error)
        return []
    }
}

/**
 * Restore an archived session
 */
export async function restoreSession(sessionId) {
    try {
        const userId = getUserId()
        const sessionRef = doc(db, 'users', userId, 'sessions', sessionId)
        const sessionSnap = await getDoc(sessionRef)

        if (!sessionSnap.exists()) {
            throw new Error('Session not found')
        }

        const sessionData = sessionSnap.data()

        // Restore as current quiz
        await saveCurrentQuiz({
            documentName: sessionData.documentName,
            documentText: sessionData.documentText,
            questions: sessionData.questions,
            userAnswers: sessionData.userAnswers,
            isPrerequisiteSurvey: sessionData.isPrerequisiteSurvey,
            completedAt: sessionData.completedAt
        })

        setActiveContext(sessionData.documentName)
        return true
    } catch (error) {
        console.error('Error restoring session:', error)
        throw error
    }
}
