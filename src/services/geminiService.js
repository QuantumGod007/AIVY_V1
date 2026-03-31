import { GoogleGenerativeAI } from '@google/generative-ai'

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY

if (!API_KEY) {
    console.error('Gemini API key is missing!')
}

const genAI = new GoogleGenerativeAI(API_KEY)

/**
 * Helper to get generative model with stable v1 API version
 */
function getModel(config) {
    const model = genAI.getGenerativeModel(
        { model: 'gemini-1.5-flash' },
        { apiVersion: 'v1' }
    )
    if (config) model.generationConfig = config
    return model
}

/**
 * Generate a prerequisite survey to assess user's existing knowledge
 */
export async function generatePrerequisiteSurvey(text) {
    try {
        const model = getModel({
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2048,
        })

        const prompt = `Based on the following educational content, generate a prerequisite knowledge survey with 5 questions to assess what the user already knows BEFORE studying this material.

Content:
${text.substring(0, 6000)}

Requirements:
- Create 5 multiple-choice questions
- Each question should have 4 options
- Mark the correct answer index (0-3)
- Questions should test PREREQUISITE knowledge (what they should know before studying this)
- Questions should assess foundational concepts related to this topic
- Make questions clear and concise

Respond ONLY with valid JSON in this exact format:
{
  "questions": [
    {
      "question": "Question text here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0
    }
  ]
}

Generate exactly 5 prerequisite questions.`

        const result = await model.generateContent(prompt)
        const response = await result.response
        const responseText = response.text()

        console.log('Gemini Response:', responseText)

        // Extract JSON from response - handle markdown code blocks
        let jsonText = responseText

        // Remove markdown code blocks if present
        if (jsonText.includes('```json')) {
            jsonText = jsonText.split('```json')[1].split('```')[0]
        } else if (jsonText.includes('```')) {
            jsonText = jsonText.split('```')[1].split('```')[0]
        }

        // Extract JSON object
        const jsonMatch = jsonText.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
            const data = JSON.parse(jsonMatch[0])
            return data.questions || []
        }

        throw new Error('Failed to parse AI response')
    } catch (error) {
        console.error('Error generating prerequisite survey:', error)
        throw new Error(`Failed to generate prerequisite survey: ${error.message}`)
    }
}

/**
 * Analyze document text and extract key concepts
 */
export async function analyzeDocument(text) {
    try {
        const model = getModel({
            temperature: 0.5,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024,
        })

        const prompt = `Analyze the following educational content and provide:
1. A brief summary (2-3 sentences)
2. Key topics covered (list 5-7 main topics)
3. Difficulty level (Beginner/Intermediate/Advanced)

Content:
${text.substring(0, 5000)}

Respond ONLY with valid JSON in this exact format:
{
  "summary": "...",
  "topics": ["topic1", "topic2", ...],
  "difficulty": "..."
}`

        const result = await model.generateContent(prompt)
        const response = await result.response
        const responseText = response.text()

        // Extract JSON from response
        let jsonText = responseText
        if (jsonText.includes('```json')) {
            jsonText = jsonText.split('```json')[1].split('```')[0]
        } else if (jsonText.includes('```')) {
            jsonText = jsonText.split('```')[1].split('```')[0]
        }

        const jsonMatch = jsonText.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0])
        }

        return {
            summary: 'Document analyzed successfully',
            topics: ['General content'],
            difficulty: 'Intermediate'
        }
    } catch (error) {
        console.error('Error analyzing document:', error)
        throw error
    }
}

/**
 * Generate quiz questions from document text
 */
export async function generateQuiz(text, numQuestions = 10) {
    try {
        const model = getModel({
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2048
        })

        const prompt = `Based on the following educational content, generate ${numQuestions} multiple-choice quiz questions.

Content:
${text.substring(0, 8000)}

Requirements:
- Each question should have 4 options
- Mark the correct answer index (0-3)
- Questions should test understanding, not just memorization
- Cover different aspects of the content

Respond ONLY with valid JSON in this exact format:
{
  "questions": [
    {
      "question": "Question text here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0
    }
  ]
}

Generate exactly ${numQuestions} questions.`

        const result = await model.generateContent(prompt)
        const response = await result.response
        const responseText = response.text()

        // Extract JSON from response
        let jsonText = responseText
        if (jsonText.includes('```json')) {
            jsonText = jsonText.split('```json')[1].split('```')[0]
        } else if (jsonText.includes('```')) {
            jsonText = jsonText.split('```')[1].split('```')[0]
        }

        const jsonMatch = jsonText.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
            const data = JSON.parse(jsonMatch[0])
            return data.questions || []
        }

        return []
    } catch (error) {
        console.error('Error generating quiz:', error)
        throw error
    }
}

/**
 * Generate topic-wise summary from document text
 */
export async function generateTopicWiseSummary(text) {
    try {
        const model = getModel({
            temperature: 0.5,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2048,
        })

        const prompt = `Analyze the following educational content and break it down into topic-wise summaries.

Content:
${text.substring(0, 8000)}

Task:
1. Identify 4-6 main topics/sections covered in this content
2. For each topic, provide:
   - A clear, descriptive title (3-6 words)
   - A concise summary (2-3 sentences)
   - 3-4 key points or takeaways

Make the summaries clear, academic, and helpful for students studying this material.

Respond ONLY with valid JSON in this exact format:
{
  "topics": [
    {
      "title": "Topic Title Here",
      "summary": "2-3 sentence summary of this topic...",
      "keyPoints": [
        "First key point",
        "Second key point",
        "Third key point"
      ]
    }
  ]
}

Generate 4-6 topics with their summaries.`

        const result = await model.generateContent(prompt)
        const response = await result.response
        const responseText = response.text()

        console.log('Topic Summary Response:', responseText)

        // Extract JSON from response
        let jsonText = responseText

        // Remove markdown code blocks if present
        if (jsonText.includes('```json')) {
            jsonText = jsonText.split('```json')[1].split('```')[0]
        } else if (jsonText.includes('```')) {
            jsonText = jsonText.split('```')[1].split('```')[0]
        }

        // Extract JSON object
        const jsonMatch = jsonText.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
            const data = JSON.parse(jsonMatch[0])
            return data.topics || []
        }

        // Fallback if parsing fails
        return []
    } catch (error) {
        console.error('Error generating topic summary:', error)
        // Return empty array instead of throwing to not break the upload flow
        return []
    }
}

/**
 * Analyze quiz results and provide SWOT analysis
 */
export async function analyzeQuizResults(questions, userAnswers, score, total) {
    try {
        const model = getModel({
            temperature: 0.6,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 512,
        })

        const accuracy = Math.round((score / total) * 100)

        // Identify which questions were wrong
        const wrongQuestions = questions
            .map((q, idx) => ({
                question: q.question,
                userAnswer: q.options[userAnswers[idx]],
                correctAnswer: q.options[q.correctAnswer],
                wasCorrect: userAnswers[idx] === q.correctAnswer
            }))
            .filter(q => !q.wasCorrect)

        const prompt = `A student scored ${score}/${total} (${accuracy}%) on a quiz. 

Questions they got wrong:
${wrongQuestions.map((q, i) => `${i + 1}. ${q.question}
   Their answer: ${q.userAnswer}
   Correct answer: ${q.correctAnswer}`).join('\n\n')}

Provide a SWOT analysis for this student's performance. Be concise (one sentence each).

Respond ONLY with valid JSON in this exact format:
{
  "strength": "One sentence about what they did well",
  "weakness": "One sentence about areas needing improvement",
  "opportunity": "One sentence about learning opportunities",
  "threat": "One sentence about potential risks if not addressed"
}`

        const result = await model.generateContent(prompt)
        const response = await result.response
        const responseText = response.text()

        // Extract JSON from response
        let jsonText = responseText
        if (jsonText.includes('```json')) {
            jsonText = jsonText.split('```json')[1].split('```')[0]
        } else if (jsonText.includes('```')) {
            jsonText = jsonText.split('```')[1].split('```')[0]
        }

        const jsonMatch = jsonText.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0])
        }

        // Fallback SWOT
        return {
            strength: accuracy >= 70 ? 'Strong understanding of core concepts' : 'Willingness to learn and improve',
            weakness: accuracy >= 70 ? 'Minor gaps in advanced topics' : 'Fundamental concepts need reinforcement',
            opportunity: accuracy >= 70 ? 'Ready for more challenging material' : 'Significant room for growth',
            threat: accuracy >= 70 ? 'Risk of overconfidence in basics' : 'May fall behind without focused study'
        }
    } catch (error) {
        console.error('Error analyzing quiz results:', error)
        // Return fallback SWOT
        const accuracy = Math.round((score / total) * 100)
        return {
            strength: accuracy >= 70 ? 'Strong understanding of core concepts' : 'Willingness to learn and improve',
            weakness: accuracy >= 70 ? 'Minor gaps in advanced topics' : 'Fundamental concepts need reinforcement',
            opportunity: accuracy >= 70 ? 'Ready for more challenging material' : 'Significant room for growth',
            threat: accuracy >= 70 ? 'Risk of overconfidence in basics' : 'May fall behind without focused study'
        }
    }
}

/**
 * Generate adaptive study guidance based on survey responses and document content
 */
export async function generateStudyGuidance(documentText, surveyQuestions, surveyAnswers) {
    try {
        const model = getModel({
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024,
        })

        // Calculate survey score
        let correctAnswers = 0
        surveyQuestions.forEach((q, index) => {
            if (surveyAnswers[index] === q.correctAnswer) {
                correctAnswers++
            }
        })
        const accuracy = Math.round((correctAnswers / surveyQuestions.length) * 100)

        const prompt = `Based on the prerequisite survey results and document content, generate personalized study guidance.

Document Content:
${documentText.substring(0, 4000)}

Survey Performance:
- Score: ${correctAnswers}/${surveyQuestions.length} (${accuracy}%)
- Questions and User Answers:
${surveyQuestions.map((q, i) => `
Q${i + 1}: ${q.question}
Correct: ${q.options[q.correctAnswer]}
User answered: ${q.options[surveyAnswers[i]] || 'Not answered'}
Result: ${surveyAnswers[i] === q.correctAnswer ? 'Correct' : 'Incorrect'}
`).join('\n')}

Generate adaptive study guidance with:
1. Learner Level: Determine if Beginner, Intermediate, or Advanced based on survey performance
2. Priority Topics: List 3-4 specific topics from the document they should focus on (based on what they got wrong)
3. Study Duration: Recommend realistic study time before quiz (15-60 minutes)
4. Next Action: One clear instruction on what to do before attempting the quiz

Respond ONLY with valid JSON in this exact format:
{
  "learnerLevel": "Beginner|Intermediate|Advanced",
  "priorityTopics": ["Topic 1", "Topic 2", "Topic 3"],
  "studyDuration": "30 minutes",
  "nextAction": "Review the sections on X and Y, focusing on understanding Z before attempting the quiz."
}

Be specific and actionable. Reference actual topics from the document.`

        const result = await model.generateContent(prompt)
        const response = await result.response
        const responseText = response.text()

        console.log('Study Guidance Response:', responseText)

        // Extract JSON from response
        let jsonText = responseText

        // Remove markdown code blocks if present
        if (jsonText.includes('```json')) {
            jsonText = jsonText.split('```json')[1].split('```')[0]
        } else if (jsonText.includes('```')) {
            jsonText = jsonText.split('```')[1].split('```')[0]
        }

        // Extract JSON object
        const jsonMatch = jsonText.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0])
        }

        // Fallback guidance based on accuracy
        return {
            learnerLevel: accuracy >= 80 ? 'Advanced' : accuracy >= 60 ? 'Intermediate' : 'Beginner',
            priorityTopics: [
                'Core concepts and fundamentals',
                'Key terminology and definitions',
                'Practical applications'
            ],
            studyDuration: accuracy >= 80 ? '15 minutes' : accuracy >= 60 ? '30 minutes' : '45 minutes',
            nextAction: accuracy >= 80
                ? 'Review the advanced topics briefly to reinforce your strong foundation before the quiz.'
                : accuracy >= 60
                    ? 'Focus on the areas where you struggled in the survey, then review the main concepts.'
                    : 'Start with the fundamentals and work through examples carefully before attempting the quiz.'
        }
    } catch (error) {
        console.error('Error generating study guidance:', error)

        // Calculate accuracy for fallback
        let correctAnswers = 0
        surveyQuestions.forEach((q, index) => {
            if (surveyAnswers[index] === q.correctAnswer) {
                correctAnswers++
            }
        })
        const accuracy = Math.round((correctAnswers / surveyQuestions.length) * 100)

        // Return fallback guidance
        return {
            learnerLevel: accuracy >= 80 ? 'Advanced' : accuracy >= 60 ? 'Intermediate' : 'Beginner',
            priorityTopics: [
                'Core concepts and fundamentals',
                'Key terminology and definitions',
                'Practical applications'
            ],
            studyDuration: accuracy >= 80 ? '15 minutes' : accuracy >= 60 ? '30 minutes' : '45 minutes',
            nextAction: accuracy >= 80
                ? 'Review the advanced topics briefly to reinforce your strong foundation before the quiz.'
                : accuracy >= 60
                    ? 'Focus on the areas where you struggled in the survey, then review the main concepts.'
                    : 'Start with the fundamentals and work through examples carefully before attempting the quiz.'
        }
    }
}

/**
 * Generate adaptive quiz based on survey results and study guidance
 */
export async function generateAdaptiveQuiz(documentText, surveyQuestions, surveyAnswers, studyGuidance) {
    try {
        const model = getModel({
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2048
        })

        // Identify weak areas from survey
        const weakTopics = []
        surveyQuestions.forEach((q, index) => {
            if (surveyAnswers[index] !== q.correctAnswer) {
                weakTopics.push(q.question)
            }
        })

        const learnerLevel = studyGuidance?.learnerLevel || 'Intermediate'
        const priorityTopics = Array.isArray(studyGuidance?.priorityTopics)
            ? studyGuidance.priorityTopics
            : ['General concepts']

        const prompt = `Based on the prerequisite survey results and study guidance, generate an adaptive quiz.

Document Content:
${documentText ? documentText.substring(0, 5000) : 'No document text available.'}

Survey Performance:
- Learner Level: ${learnerLevel}
- Priority Topics: ${priorityTopics.join(', ')}

Questions User Got Wrong:
${weakTopics.map((q, i) => `${i + 1}. ${q}`).join('\n')}

Generate an adaptive quiz with 10 multiple-choice questions that:
1. Focus heavily on the priority topics identified
2. Target the learner's level (${learnerLevel})
3. Include questions related to areas they struggled with in the survey
4. Cover practical applications and deeper understanding
5. Progress from foundational to more challenging concepts

Requirements:
- Create exactly 10 multiple-choice questions
- Each question should have 4 options
- Mark the correct answer index (0-3)
- Questions should be clear, specific, and test understanding
- Adapt difficulty to ${learnerLevel} level

Respond ONLY with valid JSON in this exact format:
{
  "questions": [
    {
      "question": "Question text here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0
    }
  ]
}

Generate exactly 10 adaptive questions.`

        const result = await model.generateContent(prompt)
        const response = await result.response
        const responseText = response.text()

        console.log('Adaptive Quiz Response:', responseText)

        // Extract JSON from response
        let jsonText = responseText

        // Remove markdown code blocks if present
        if (jsonText.includes('```json')) {
            jsonText = jsonText.split('```json')[1].split('```')[0]
        } else if (jsonText.includes('```')) {
            jsonText = jsonText.split('```')[1].split('```')[0]
        }

        // Extract JSON object
        const jsonMatch = jsonText.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
            const data = JSON.parse(jsonMatch[0])
            return data.questions || []
        }

        throw new Error('Failed to parse AI response')
    } catch (error) {
        console.error('Error generating adaptive quiz:', error)
        throw new Error(`Failed to generate adaptive quiz: ${error.message}`)
    }
}

/**
 * Generate a day-by-day study plan based on subject & exam date
 */
export async function generateStudyPlan(documentText, subject, examDate, learnerLevel = 'Intermediate') {
    try {
        const model = getModel({ temperature: 0.6, maxOutputTokens: 3000 })

        const today = new Date().toISOString().split('T')[0]
        const daysRemaining = Math.max(1, Math.ceil((new Date(examDate) - new Date()) / (1000 * 60 * 60 * 24)))
        const planDays = Math.min(daysRemaining, 14)

        const docSummary = documentText
            ? `Study Material Summary:\n${documentText.substring(0, 4000)}`
            : `Subject: ${subject}`

        const prompt = `Create a detailed ${planDays}-day study plan for a ${learnerLevel} student.
Subject: ${subject}
Exam Date: ${examDate} (${daysRemaining} days away from today ${today})
${docSummary}

Generate a practical, structured day-by-day plan.

Respond ONLY with valid JSON:
{
  "title": "Study Plan for ${subject}",
  "overview": "One sentence plan summary",
  "days": [
    {
      "day": 1,
      "topic": "Topic name for this day",
      "goal": "What the student will achieve today",
      "duration": "45 minutes",
      "tasks": [
        "Specific task 1",
        "Specific task 2",
        "Specific task 3"
      ]
    }
  ]
}

Generate exactly ${planDays} days.`

        const result = await model.generateContent(prompt)
        let text = result.response.text()
        if (text.includes('```json')) text = text.split('```json')[1].split('```')[0]
        else if (text.includes('```')) text = text.split('```')[1].split('```')[0]
        const match = text.match(/\{[\s\S]*\}/)
        if (match) return JSON.parse(match[0])
        throw new Error('Failed to parse study plan')
    } catch (error) {
        console.error('Error generating study plan:', error)
        throw error
    }
}

/**
 * Generate flashcards from document text or topic
 */
export async function generateFlashcards(documentText, topic = '') {
    try {
        const model = getModel({ temperature: 0.6, maxOutputTokens: 3000 })

        const source = documentText
            ? `Based on this study material:\n${documentText.substring(0, 7000)}`
            : `Based on the topic: ${topic}`

        const prompt = `${source}

Generate 20 high-quality flashcards for studying.

Rules:
- Questions should test understanding, not just recall
- Answers should be concise (1-3 sentences max)
- Cover a variety of concepts from the material
- Progress from foundational to advanced

Respond ONLY with valid JSON:
{
  "cards": [
    {
      "front": "Clear question here?",
      "back": "Concise, accurate answer here."
    }
  ]
}

Generate exactly 20 flashcards.`

        const result = await model.generateContent(prompt)
        let text = result.response.text()
        if (text.includes('```json')) text = text.split('```json')[1].split('```')[0]
        else if (text.includes('```')) text = text.split('```')[1].split('```')[0]
        const match = text.match(/\{[\s\S]*\}/)
        if (match) {
            const data = JSON.parse(match[0])
            return data.cards || []
        }
        throw new Error('Failed to parse flashcards')
    } catch (error) {
        console.error('Error generating flashcards:', error)
        throw error
    }
}

/**
 * Generate AI Tutor response based on document context and user message
 */
export async function generateTutorResponse(documentText, message, chatHistory = []) {
    try {
        const model = getModel({
            temperature: 0.8,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024,
        })

        const historyPrompt = chatHistory.length > 0
            ? `\n\nRecent Chat History:\n${chatHistory.map(m => `${m.role.toUpperCase()}: ${m.text}`).join('\n')}`
            : ''

        const contextPrompt = documentText
            ? `You are an expert academic tutor. The student is studying the following material:\n\n${documentText.substring(0, 6000)}\n\nAnswer the student's question clearly, educationally, and concisely, referencing the material when relevant.${historyPrompt}`
            : `You are an expert academic tutor. Answer the student's question clearly, concisely, and educationally.${historyPrompt}`

        const prompt = `${contextPrompt}\n\nSTUDENT QUESTION: ${message}`

        const result = await model.generateContent(prompt)
        const response = await result.response
        return response.text()
    } catch (error) {
        console.error('Error generating tutor response:', error)
        throw error
    }
}
