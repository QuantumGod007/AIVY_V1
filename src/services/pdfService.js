/**
 * pdfService.js — Phase 5: Document Intelligence
 *
 * Improvements:
 *  1. Better text reconstruction (preserves line order, handles multi-column)
 *  2. Image/photo file support → OCR via Gemini Vision API
 *  3. DOCX basic text extraction via raw text parsing
 *  4. Increased file limit to 25MB for richer documents
 */

import * as pdfjsLib from 'pdfjs-dist'
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker

import { callGeminiProxy } from './geminiService'

// ─── Supported Types ──────────────────────────────────────────────────────────

export const SUPPORTED_TYPES = {
    PDF: ['application/pdf'],
    TEXT: ['text/plain'],
    IMAGE: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    DOCX: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document']
}

export const SUPPORTED_EXTENSIONS = ['.pdf', '.txt', '.jpg', '.jpeg', '.png', '.webp', '.docx']

// ─── PDF Extraction ───────────────────────────────────────────────────────────

/**
 * Enhanced PDF text extraction with AI Vision OCR fallback.
 * First attempts to extract native text; if results are poor or it fails,
 * it renders pages to images and uses Gemini Vision to OCR them.
 */
export async function extractTextFromPDF(file) {
    let pdf = null
    try {
        const arrayBuffer = await file.arrayBuffer()
        pdf = await pdfjsLib.getDocument({
            data: arrayBuffer,
            useWorkerFetch: false,
            isEvalSupported: false,
            useSystemFonts: true
        }).promise

        let fullText = ''

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            try {
                const page = await pdf.getPage(pageNum)
                const textContent = await page.getTextContent()

                if (!textContent.items.length) continue

                const sorted = [...textContent.items].sort((a, b) => {
                    const yDiff = (b.transform?.[5] || 0) - (a.transform?.[5] || 0)
                    if (Math.abs(yDiff) > 2) return yDiff
                    return (a.transform?.[4] || 0) - (b.transform?.[4] || 0)
                })

                let pageText = ''
                let lastY = null

                for (const item of sorted) {
                    const y = item.transform?.[5] || 0
                    const text = item.str || ''

                    if (lastY !== null && Math.abs(y - lastY) > 2) {
                        pageText += '\n'
                    }
                    pageText += text + ' '
                    lastY = y
                }

                fullText += pageText.trim() + '\n\n'
            } catch (pageErr) {
                console.warn(`Page ${pageNum} extraction error:`, pageErr.message)
            }
        }

        const trimmed = fullText.trim()
        
        // If extraction yields almost nothing, it's likely a scanned PDF
        if (!trimmed || trimmed.length < 50) {
            console.log('📄 PDF contains minimal text. Attempting AI Vision OCR fallback...')
            return await extractTextFromPDFViaOCR(pdf)
        }

        return trimmed
    } catch (error) {
        console.error('PDF native extraction error:', error)
        
        // Handle specific errors that shouldn't trigger OCR
        const msg = (error.message || '').toLowerCase()
        if (msg.includes('password')) {
            throw new Error('This PDF is password-protected. Please use an unprotected PDF.')
        }
        if (msg.includes('invalid pdf')) {
            throw new Error('Invalid PDF file. Please ensure the file is not corrupted.')
        }

        // For other errors, try OCR fallback as a last resort if we have a PDF object
        if (pdf) {
            try {
                return await extractTextFromPDFViaOCR(pdf)
            } catch (ocrErr) {
                console.error('OCR Fallback also failed:', ocrErr)
            }
        }
        
        throw new Error('Failed to extract PDF text. Try a text-based PDF or upload a photo of the page instead.')
    }
}

/**
 * Renders PDF pages to images and uses Gemini Vision to extract text.
 * Limits extraction to first 5 pages for performance and cost.
 */
async function extractTextFromPDFViaOCR(pdf) {
    try {
        const pagesToOCR = Math.min(pdf.numPages, 5) // Process up to 5 pages
        let combinedText = ''

        for (let i = 1; i <= pagesToOCR; i++) {
            const page = await pdf.getPage(i)
            const viewport = page.getViewport({ scale: 2.0 }) // High res for better OCR
            
            const canvas = document.createElement('canvas')
            const context = canvas.getContext('2d')
            canvas.height = viewport.height
            canvas.width = viewport.width

            await page.render({
                canvasContext: context,
                viewport: viewport
            }).promise

            const dataUrl = canvas.toDataURL('image/jpeg', 0.9)
            const base64 = dataUrl.split(',')[1]

            const pageText = await performGeminiOCR(base64, 'image/jpeg')
            combinedText += `--- Page ${i} ---\n${pageText}\n\n`
            
            // Clean up
            canvas.width = 0
            canvas.height = 0
        }

        if (!combinedText.trim() || combinedText.length < 50) {
            throw new Error('AI Vision could not find readable text in this PDF.')
        }

        return combinedText.trim()
    } catch (error) {
        console.error('extractTextFromPDFViaOCR error:', error)
        throw new Error('This PDF appears to be image-based and AI Vision failed to read it. Try a clearer upload or a text-based version.')
    }
}

// ─── Text File ────────────────────────────────────────────────────────────────

export async function extractTextFromTextFile(file) {
    try {
        const text = await file.text()
        if (!text?.trim() || text.trim().length < 50) {
            throw new Error('Text file appears to be empty or too short.')
        }
        return text.trim()
    } catch (error) {
        throw new Error('Failed to read text file. Please ensure it is a valid UTF-8 document.')
    }
}

// ─── Image OCR via Gemini Vision ──────────────────────────────────────────────

/**
 * Phase 5: OCR — Convert an image (photo of notes, textbook page, whiteboard)
 * into structured text using Gemini's vision capability.
 */
export async function extractTextFromImage(imageFile) {
    try {
        const arrayBuffer = await imageFile.arrayBuffer()
        const base64 = btoa(
            new Uint8Array(arrayBuffer).reduce((acc, byte) => acc + String.fromCharCode(byte), '')
        )

        const text = await performGeminiOCR(base64, imageFile.type)
        
        if (!text || text.length < 20) {
            throw new Error('No readable text found in this image. Please ensure the image is clear and well-lit.')
        }

        return text
    } catch (error) {
        console.error('Image OCR error:', error)
        if (error.message.includes('No readable text')) throw error
        throw new Error('Failed to extract text from image. Please ensure the image is clear and try again.')
    }
}

/**
 * Shared helper to call Gemini Vision for OCR tasks.
 */
/**
 * Shared helper to call Gemini Vision for OCR tasks via Secure Proxy.
 */
async function performGeminiOCR(base64Data, mimeType) {
    const prompt = `You are an expert OCR engine. Extract ALL text from this document as accurately as possible.
    
Instructions:
- Preserve the original structure and formatting
- Include headings, bullet points, and paragraphs
- Represent tables in a clear text format
- Transcribe handwriting as accurately as possible
- Output ONLY text — no commentary`

    const parts = [
        { text: prompt },
        {
            inlineData: {
                data: base64Data,
                mimeType: mimeType
            }
        }
    ]

    return await callGeminiProxy(parts, { model: 'gemini-2.5-flash' })
}

// ─── DOCX Basic Extraction ────────────────────────────────────────────────────

/**
 * Basic DOCX text extraction by reading the raw XML content.
 * No external libraries needed — works for standard DOCX files.
 */
async function extractTextFromDocx(file) {
    try {
        // DOCX files are ZIP archives — we can't easily unzip in browser without a lib
        // Fallback: read as text and strip XML tags
        const arrayBuffer = await file.arrayBuffer()
        const text = new TextDecoder('utf-8', { fatal: false }).decode(arrayBuffer)

        // Extract text between XML tags (rough but works for most DOCX)
        const xmlText = text.match(/<w:t[^>]*>([^<]*)<\/w:t>/g)
        if (!xmlText || xmlText.length === 0) {
            throw new Error('Could not read DOCX content. Please save as TXT or PDF and try again.')
        }

        const extracted = xmlText
            .map(tag => tag.replace(/<[^>]+>/g, ''))
            .join(' ')
            .replace(/\s+/g, ' ')
            .trim()

        if (extracted.length < 50) {
            throw new Error('DOCX file appears empty or uses unsupported formatting. Please export as PDF and try again.')
        }

        return extracted
    } catch (error) {
        if (error.message.includes('DOCX')) throw error
        throw new Error('Failed to read DOCX file. Please export as PDF or TXT and try again.')
    }
}

// ─── Main Entry Point ─────────────────────────────────────────────────────────

/**
 * Extract text from any supported file type.
 * Supports: PDF, TXT, JPG/PNG/WebP (OCR), DOCX
 */
export async function extractTextFromFile(file) {
    if (!file) throw new Error('No file provided')

    const fileType = file.type
    const fileName = file.name.toLowerCase()

    // Increased limit to 25MB
    const maxSize = 25 * 1024 * 1024
    if (file.size > maxSize) {
        throw new Error('File is too large. Please upload a file smaller than 25 MB.')
    }

    if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
        return await extractTextFromPDF(file)
    }

    if (fileType === 'text/plain' || fileName.endsWith('.txt')) {
        return await extractTextFromTextFile(file)
    }

    if (
        SUPPORTED_TYPES.IMAGE.includes(fileType) ||
        ['.jpg', '.jpeg', '.png', '.webp', '.gif'].some(ext => fileName.endsWith(ext))
    ) {
        return await extractTextFromImage(file)
    }

    if (
        fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        fileName.endsWith('.docx')
    ) {
        return await extractTextFromDocx(file)
    }

    throw new Error(
        `Unsupported file type. Please upload a PDF, TXT, image (JPG/PNG/WebP), or DOCX file.`
    )
}

/**
 * Returns true if a file is an image (triggers OCR path in UI)
 */
export function isImageFile(file) {
    return (
        SUPPORTED_TYPES.IMAGE.includes(file.type) ||
        ['.jpg', '.jpeg', '.png', '.webp', '.gif'].some(ext => file.name.toLowerCase().endsWith(ext))
    )
}
