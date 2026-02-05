import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

// Get the model (supports vision for PDFs)
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

/**
 * Extract text from PDF file
 */
export async function extractTextFromPDF(file) {
    try {
        // Convert PDF to base64
        const reader = new FileReader();

        return new Promise((resolve, reject) => {
            reader.onload = async () => {
                try {
                    const base64Data = reader.result.split(',')[1];

                    // Use Gemini Vision to extract text from PDF
                    const result = await model.generateContent([
                        {
                            inlineData: {
                                data: base64Data,
                                mimeType: file.type
                            }
                        },
                        "Extract all the text content from this PDF document. Return only the text, no additional commentary."
                    ]);

                    const response = await result.response;
                    const text = response.text();
                    resolve(text);
                } catch (error) {
                    reject(error);
                }
            };

            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    } catch (error) {
        console.error("Error extracting text from PDF:", error);
        throw new Error("Failed to extract text from PDF. Please try again.");
    }
}

/**
 * Generate quiz from PDF content
 */
export async function generateQuizFromPDF(pdfText, numQuestions = 10, difficulty = "medium") {
    try {
        const prompt = `Based on the following study material, generate ${numQuestions} multiple-choice quiz questions at ${difficulty} difficulty level.

Study Material:
${pdfText.substring(0, 15000)} // Limit to avoid token limits

For each question, provide:
1. The question text
2. Four options (A, B, C, D)
3. The correct answer (index 0-3)
4. A brief explanation of why that answer is correct

Format as JSON array with this structure:
[
  {
    "question": "Question text here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": 0,
    "explanation": "Explanation here"
  }
]

Make questions educational, clear, and directly based on the study material provided.`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Extract JSON from response
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
        throw new Error("Invalid response format");
    } catch (error) {
        console.error("Error generating quiz from PDF:", error);
        throw new Error("Failed to generate quiz. Please try again.");
    }
}

/**
 * Generate study notes from PDF
 */
export async function generateNotesFromPDF(pdfText) {
    try {
        const prompt = `Create comprehensive study notes from the following material:

${pdfText.substring(0, 15000)}

Include:
1. Main Topics (bullet points)
2. Key Concepts (detailed explanations)
3. Important Terms (with definitions)
4. Summary (2-3 paragraphs)
5. Study Tips

Format the notes in a clear, student-friendly way.`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error("Error generating notes from PDF:", error);
        throw new Error("Failed to generate notes. Please try again.");
    }
}

/**
 * Summarize PDF content
 */
export async function summarizePDF(pdfText) {
    try {
        const prompt = `Summarize the following study material in a concise, easy-to-understand format:

${pdfText.substring(0, 15000)}

Provide:
1. Main topic/subject
2. Key points (5-7 bullet points)
3. Brief conclusion

Keep it concise but comprehensive.`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error("Error summarizing PDF:", error);
        throw new Error("Failed to summarize PDF. Please try again.");
    }
}

/**
 * Generate study notes for a given topic
 */
export async function generateStudyNotes(topic) {
    try {
        const prompt = `You are an expert educator. Generate comprehensive, well-structured study notes for the topic: "${topic}".

Include:
1. Key Concepts (3-5 main points)
2. Detailed Explanation (2-3 paragraphs)
3. Important Terms (with definitions)
4. Real-world Examples (2-3 examples)
5. Quick Tips for remembering

Format the response in a clear, student-friendly way.`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error("Error generating study notes:", error);
        throw new Error("Failed to generate study notes. Please try again.");
    }
}

/**
 * Generate quiz questions for a topic
 */
export async function generateQuiz(topic, difficulty = "medium", numQuestions = 5) {
    try {
        const prompt = `Generate ${numQuestions} multiple-choice quiz questions about "${topic}" at ${difficulty} difficulty level.

For each question, provide:
1. The question text
2. Four options (A, B, C, D)
3. The correct answer (letter)
4. A brief explanation of why that answer is correct

Format as JSON array with this structure:
[
  {
    "question": "Question text here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": 0,
    "explanation": "Explanation here"
  }
]

Make questions educational, clear, and appropriate for the difficulty level.`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Extract JSON from response
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
        throw new Error("Invalid response format");
    } catch (error) {
        console.error("Error generating quiz:", error);
        throw new Error("Failed to generate quiz. Please try again.");
    }
}

/**
 * Chat with AI Tutor
 */
export async function chatWithAI(message, conversationHistory = []) {
    try {
        const chat = model.startChat({
            history: conversationHistory.map(msg => ({
                role: msg.role,
                parts: [{ text: msg.content }]
            })),
            generationConfig: {
                maxOutputTokens: 1000,
            },
        });

        const result = await chat.sendMessage(message);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error("Error in AI chat:", error);
        throw new Error("Failed to get AI response. Please try again.");
    }
}

/**
 * Analyze student performance and provide insights
 */
export async function analyzePerformance(quizResults) {
    try {
        const prompt = `You are an educational AI analyzing student performance. Based on these quiz results:

${JSON.stringify(quizResults, null, 2)}

Provide:
1. Overall Performance Summary (2-3 sentences)
2. Strengths (2-3 points)
3. Areas for Improvement (2-3 points)
4. Personalized Study Recommendations (3-4 specific suggestions)
5. Motivational Message

Be encouraging and constructive.`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error("Error analyzing performance:", error);
        throw new Error("Failed to analyze performance. Please try again.");
    }
}

/**
 * Generate personalized learning path
 */
export async function generateLearningPath(userProfile) {
    try {
        const prompt = `Create a personalized learning path for a student with this profile:

${JSON.stringify(userProfile, null, 2)}

Provide:
1. Recommended Topics (in order of priority)
2. Estimated Time for Each Topic
3. Learning Resources (types of materials)
4. Milestones and Goals
5. Weekly Study Plan

Make it practical and achievable.`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error("Error generating learning path:", error);
        throw new Error("Failed to generate learning path. Please try again.");
    }
}

/**
 * Get AI explanation for a concept
 */
export async function explainConcept(concept, level = "beginner") {
    try {
        const prompt = `Explain "${concept}" to a ${level} level student.

Use:
- Simple, clear language
- Analogies and examples
- Step-by-step breakdown if complex
- Visual descriptions where helpful

Keep it concise but thorough (2-3 paragraphs).`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error("Error explaining concept:", error);
        throw new Error("Failed to get explanation. Please try again.");
    }
}
