import * as pdfjsLib from 'pdfjs-dist'

// Use the worker from node_modules - Vite will handle it
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker

/**
 * Extract text from a PDF file
 * @param {File} file - The PDF file to extract text from
 * @returns {Promise<string>} - The extracted text
 */
export async function extractTextFromPDF(file) {
    try {
        const arrayBuffer = await file.arrayBuffer()

        const loadingTask = pdfjsLib.getDocument({
            data: arrayBuffer,
            useWorkerFetch: false,
            isEvalSupported: false,
            useSystemFonts: true
        })

        const pdf = await loadingTask.promise

        let fullText = ''

        // Extract text from each page
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            try {
                const page = await pdf.getPage(pageNum)
                const textContent = await page.getTextContent()
                const pageText = textContent.items
                    .map(item => item.str)
                    .join(' ')
                fullText += pageText + '\n\n'
            } catch (pageError) {
                console.error(`Error extracting page ${pageNum}:`, pageError)
                // Continue with other pages even if one fails
            }
        }

        const trimmedText = fullText.trim()

        if (!trimmedText || trimmedText.length < 50) {
            throw new Error('PDF appears to be empty or contains very little text. It might be an image-based PDF.')
        }

        return trimmedText
    } catch (error) {
        console.error('Error extracting PDF text:', error)

        // Provide more specific error messages
        if (error.message?.includes('Invalid PDF')) {
            throw new Error('Invalid PDF file. Please ensure the file is not corrupted.')
        } else if (error.message?.includes('password')) {
            throw new Error('This PDF is password-protected. Please use an unprotected PDF.')
        } else if (error.message?.includes('image-based')) {
            throw error // Re-throw our custom message
        } else {
            throw new Error('Failed to extract text from PDF. The file might be corrupted or image-based. Try using a text-based PDF or TXT file instead.')
        }
    }
}

/**
 * Extract text from a text file
 * @param {File} file - The text file
 * @returns {Promise<string>} - The file content
 */
export async function extractTextFromTextFile(file) {
    try {
        const text = await file.text()

        if (!text || text.trim().length < 50) {
            throw new Error('Text file appears to be empty or too short.')
        }

        return text.trim()
    } catch (error) {
        console.error('Error reading text file:', error)
        throw new Error('Failed to read text file. Please ensure the file is a valid text document.')
    }
}

/**
 * Extract text from any supported file type
 * @param {File} file - The file to extract text from
 * @returns {Promise<string>} - The extracted text
 */
export async function extractTextFromFile(file) {
    if (!file) {
        throw new Error('No file provided')
    }

    const fileType = file.type
    const fileName = file.name.toLowerCase()

    // Check file size (limit to 10MB)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
        throw new Error('File is too large. Please upload a file smaller than 10MB.')
    }

    if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
        return await extractTextFromPDF(file)
    } else if (fileType === 'text/plain' || fileName.endsWith('.txt')) {
        return await extractTextFromTextFile(file)
    } else {
        throw new Error('Unsupported file type. Please upload a PDF or TXT file.')
    }
}
