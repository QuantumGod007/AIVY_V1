/**
 * geminiService.js — AIVY AI Engine
 *
 * Model Strategy (billing enabled, $300 free credits):
 *   All functions → gemini-2.5-pro
 *   - Best reasoning quality for educational content
 *   - 8192 max output tokens for rich responses
 *   - 30,000 char document context (vs old 5-8k)
 *   - Native multi-turn chat for AI Tutor
 *
 * JSON Parsing: Robust extraction handles markdown fences + thinking blocks
 */


// ─── Model Configuration ──────────────────────────────────────────────────────
const MODEL_PRO   = 'gemini-2.5-pro'
const MODEL_FLASH = 'gemini-2.5-flash'

// Default model name
const MODEL_NAME = MODEL_FLASH 

/**
 * Core Proxy Caller: Replaces direct SDK usage to hide API Keys.
 * @param {string|array} prompt - User prompt or array of parts (text/inlineData)
 */
export async function callGeminiProxy(prompt, options = {}) {
    const { model = MODEL_NAME, history = [], generationConfig = {} } = options;
    
    const contents = [...history];
    if (prompt) {
        const parts = Array.isArray(prompt) ? prompt : [{ text: prompt }];
        contents.push({ role: 'user', parts });
    }

    const payload = {
        model,
        contents,
        generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 8192,
            ...generationConfig
        }
    };

    const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `Proxy failed with status ${response.status}`);
    }

    const data = await response.json();
    if (data.error) {
        throw new Error(data.error.message || 'Gemini API Error via Proxy');
    }

    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

// ─── JSON Parsing Helper ──────────────────────────────────────────────────────

/**
 * Robustly extract a JSON object from AI response text.
 * Handles: markdown code fences, thinking blocks, extra prose.
 * @param {string} text - Raw AI response text
 * @returns {object|null} Parsed JSON or null
 */
function extractJSON(text) {
    if (!text) return null

    let cleaned = text

    // Strip thinking blocks (gemini-2.5-pro extended thinking)
    cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/gi, '')
    cleaned = cleaned.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '')

    // Strip markdown code fences
    if (cleaned.includes('```json')) {
        const parts = cleaned.split('```json')
        cleaned = parts[1]?.split('```')[0] ?? cleaned
    } else if (cleaned.includes('```')) {
        const parts = cleaned.split('```')
        // Take the first code block content
        cleaned = parts[1] ?? cleaned
    }

    cleaned = cleaned.trim()

    // Try to extract first JSON object or array
    const objMatch = cleaned.match(/\{[\s\S]*\}/)
    const arrMatch = cleaned.match(/\[[\s\S]*\]/)

    // Prefer object match unless it appears after an array
    const objIndex = objMatch ? cleaned.indexOf(objMatch[0]) : Infinity
    const arrIndex = arrMatch ? cleaned.indexOf(arrMatch[0]) : Infinity

    const match = objIndex <= arrIndex ? objMatch : arrMatch

    if (match) {
        try {
            return JSON.parse(match[0])
        } catch {
            // Attempt repair: remove trailing commas
            try {
                const repaired = match[0].replace(/,\s*([\]}])/g, '$1')
                return JSON.parse(repaired)
            } catch {
                return null
            }
        }
    }

    return null
}

// ─── 1. Prerequisite Survey Generation ───────────────────────────────────────

/**
 * Generate a 5-question prerequisite survey to assess existing knowledge.
 * @param {string} text - Document content
 * @returns {Promise<Array>} Array of question objects
 */
export async function generatePrerequisiteSurvey(text) {
    try {

        const prompt = `You are an expert academic assessor. Based on the following educational content, generate a prerequisite knowledge survey with exactly 5 questions to assess what the student already knows BEFORE studying this material.

Content:
${text.substring(0, 30000)}

Requirements:
- Create exactly 5 multiple-choice questions
- Each question must have exactly 4 answer options
- Mark the correct answer with its 0-based index (0, 1, 2, or 3)
- Questions must test PREREQUISITE knowledge — foundational concepts the student should know before reading this document
- Questions should be clear, unambiguous, and academically rigorous
- Vary the difficulty from easy to medium

Respond ONLY with valid JSON in this exact format (no extra text, no markdown):
{
  "questions": [
    {
      "question": "Question text here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0
    }
  ]
}`

        const text_resp = await callGeminiProxy(prompt);
        const data = extractJSON(text_resp);

        if (!data?.questions?.length) {
            throw new Error('AI returned no questions — invalid response structure')
        }

        const valid = data.questions.filter(q =>
            q.question && Array.isArray(q.options) && q.options.length === 4 &&
            typeof q.correctAnswer === 'number'
        )

        if (valid.length === 0) throw new Error('No valid questions in AI response')
        return valid

    } catch (error) {
        console.error('generatePrerequisiteSurvey error:', error)
        throw new Error(`Failed to generate prerequisite survey: ${error.message}`)
    }
}

// ─── 2. Document Analysis ─────────────────────────────────────────────────────

/**
 * Analyze document and extract summary, topics, difficulty.
 * @param {string} text - Document content
 * @returns {Promise<object>} { summary, topics, difficulty }
 */
export async function analyzeDocument(text) {
    try {

        const prompt = `Analyze the following educational content and extract key information.

Content:
${text.substring(0, 30000)}

Respond ONLY with valid JSON:
{
  "summary": "2-3 sentence overview of the content",
  "topics": ["topic1", "topic2", "topic3", "topic4", "topic5"],
  "difficulty": "Beginner"
}

Difficulty must be exactly one of: "Beginner", "Intermediate", "Advanced"
Topics should be 5-7 specific subject areas covered.`

        const text_resp = await callGeminiProxy(prompt);
        const data = extractJSON(text_resp);

        if (data?.summary) return data

        return {
            summary: 'Document analyzed successfully.',
            topics: ['Core Concepts', 'Key Terminology', 'Practical Applications'],
            difficulty: 'Intermediate'
        }
    } catch (error) {
        console.error('analyzeDocument error:', error)
        return {
            summary: 'Document uploaded and ready for study.',
            topics: ['General Content'],
            difficulty: 'Intermediate'
        }
    }
}

// ─── 3. Topic-wise Summary ────────────────────────────────────────────────────

/**
 * Break document into topic-wise summaries with key points.
 * @param {string} text - Document content
 * @returns {Promise<Array>} Array of topic summary objects
 */
export async function generateTopicWiseSummary(text) {
    try {

        const prompt = `You are an expert academic summarizer. Analyze the following educational content and break it into clear topic-wise summaries.

Content:
${text.substring(0, 30000)}

Instructions:
- Identify 4-6 distinct main topics or sections in this content
- For each topic, provide a descriptive title, a concise summary, and 3-4 key points
- Make summaries useful for students preparing for exams
- Be specific — reference actual content, not generic platitudes

Respond ONLY with valid JSON:
{
  "topics": [
    {
      "title": "Descriptive Topic Title",
      "summary": "2-3 sentence explanation of this topic and its significance.",
      "keyPoints": [
        "Specific key point 1",
        "Specific key point 2",
        "Specific key point 3"
      ]
    }
  ]
}`

        const text_resp = await callGeminiProxy(prompt);
        const data = extractJSON(text_resp);

        return data?.topics || []
    } catch (error) {
        console.error('generateTopicWiseSummary error:', error)
        return []
    }
}

// ─── 4. Quiz Generation ───────────────────────────────────────────────────────

/**
 * Generate quiz questions from document content.
 * @param {string} text - Document content
 * @param {number} numQuestions - Number of questions to generate
 * @returns {Promise<Array>} Array of question objects
 */
export async function generateQuiz(text, numQuestions = 10) {
    try {

        const prompt = `You are an expert exam setter. Based on the following educational content, generate exactly ${numQuestions} high-quality multiple-choice quiz questions.

Content:
${text.substring(0, 30000)}

Requirements:
- Each question must have exactly 4 answer choices
- Mark the correct answer with its 0-based index
- Questions must test comprehension and application, not just memorization
- Cover different sections of the content
- Include a mix of difficulty levels

Respond ONLY with valid JSON:
{
  "questions": [
    {
      "question": "Clear, specific question text?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0,
      "difficulty": "easy",
      "topic": "Topic area"
    }
  ]
}`

        const text_resp = await callGeminiProxy(prompt, { model: MODEL_FLASH, generationConfig: { temperature: 0.7 } });
        const data = extractJSON(text_resp);

        return data?.questions?.filter(q =>
            q.question && Array.isArray(q.options) && q.options.length === 4
        ) || []
    } catch (error) {
        console.error('generateQuiz error:', error)
        throw error
    }
}

// ─── 5. Quiz Results Analysis (SWOT) ─────────────────────────────────────────

/**
 * Analyze quiz results and generate a SWOT analysis.
 * @param {Array} questions - Quiz questions
 * @param {object} userAnswers - User's answers (index → choice)
 * @param {number} score - Number of correct answers
 * @param {number} total - Total number of questions
 * @returns {Promise<object>} SWOT analysis object
 */
export async function analyzeQuizResults(questions, userAnswers, score, total) {
    const accuracy = Math.round((score / total) * 100)

    try {

        const wrongQuestions = questions
            .map((q, idx) => ({
                question: q.question,
                yourAnswer: q.options?.[userAnswers[idx]] || 'Not answered',
                correctAnswer: q.options?.[q.correctAnswer] || '—',
                wasCorrect: userAnswers[idx] === q.correctAnswer
            }))
            .filter(q => !q.wasCorrect)

        const prompt = `You are an educational performance analyst. A student scored ${score}/${total} (${accuracy}%) on a quiz.

Wrong answers breakdown:
${wrongQuestions.length > 0
    ? wrongQuestions.map((q, i) => `${i + 1}. "${q.question}"\n   Student answered: "${q.yourAnswer}"\n   Correct answer: "${q.correctAnswer}"`).join('\n\n')
    : 'No wrong answers — perfect score!'
}

Provide a thorough, personalized SWOT analysis for this student's performance. Be specific, constructive, and encouraging.

Respond ONLY with valid JSON:
{
  "strength": "Specific observation about what they demonstrated knowledge in (1-2 sentences)",
  "weakness": "Specific areas where understanding broke down, with reference to the wrong answers (1-2 sentences)",
  "opportunity": "Concrete learning opportunities and recommended next steps (1-2 sentences)",
  "threat": "Academic risks if these gaps are not addressed (1 sentence)"
}`

        const text_resp = await callGeminiProxy(prompt);
        const data = extractJSON(text_resp);

        if (data?.strength) return data

        throw new Error('Invalid SWOT response')
    } catch (error) {
        console.error('analyzeQuizResults error:', error)
        // Reliable fallback
        return {
            strength: accuracy >= 70
                ? 'Strong grasp of core concepts demonstrated — you answered the majority of questions correctly.'
                : 'You showed commitment by completing the assessment, which is the first step toward improvement.',
            weakness: accuracy >= 70
                ? 'Some advanced or nuanced topics showed minor gaps that need targeted review.'
                : `Foundational understanding of ${Math.round(total - score)} key concepts needs reinforcement before the next attempt.`,
            opportunity: accuracy >= 70
                ? 'Ready to advance to more challenging material — consider exploring related advanced topics.'
                : 'Focused study on the wrong-answer topics will yield rapid score improvement.',
            threat: accuracy >= 70
                ? 'Without reviewing edge cases, confidence may exceed actual comprehension in exams.'
                : 'Unaddressed knowledge gaps may compound over time — prioritize remediation now.'
        }
    }
}

// ─── 6. Study Guidance ────────────────────────────────────────────────────────

/**
 * Generate personalized study guidance after prerequisite survey.
 * @param {string} documentText - Document content
 * @param {Array} surveyQuestions - Survey questions
 * @param {object} surveyAnswers - User's survey answers
 * @returns {Promise<object>} Study guidance object
 */
export async function generateStudyGuidance(documentText, surveyQuestions, surveyAnswers) {
    let correctAnswers = 0
    surveyQuestions.forEach((q, index) => {
        if (surveyAnswers[index] === q.correctAnswer) correctAnswers++
    })
    const accuracy = surveyQuestions.length > 0
        ? Math.round((correctAnswers / surveyQuestions.length) * 100)
        : 50

    try {

        const wrongTopics = surveyQuestions
            .filter((q, i) => surveyAnswers[i] !== q.correctAnswer)
            .map(q => q.question)

        const prompt = `You are an adaptive learning specialist. Based on a student's prerequisite survey results, generate personalized study guidance.

Document Content (first section):
${documentText.substring(0, 20000)}

Survey Performance:
- Score: ${correctAnswers}/${surveyQuestions.length} (${accuracy}%)
- Topics the student struggled with:
${wrongTopics.length > 0 ? wrongTopics.map((t, i) => `  ${i + 1}. ${t}`).join('\n') : '  None — excellent prerequisite knowledge!'}

Generate specific, actionable study guidance calibrated to this student's demonstrated knowledge level.

Respond ONLY with valid JSON:
{
  "learnerLevel": "Intermediate",
  "priorityTopics": ["Specific topic from document 1", "Specific topic 2", "Specific topic 3"],
  "studyDuration": "30 minutes",
  "nextAction": "One specific, actionable instruction referencing actual content from the document."
}

learnerLevel must be exactly one of: "Beginner", "Intermediate", "Advanced"
studyDuration should be "15 minutes", "30 minutes", "45 minutes", or "60 minutes"
priorityTopics must reference actual topics from the document content above`

        const text_resp = await callGeminiProxy(prompt);
        const data = extractJSON(text_resp);

        if (data?.learnerLevel) return data

        throw new Error('Invalid guidance response')
    } catch (error) {
        console.error('generateStudyGuidance error:', error)
        return {
            learnerLevel: accuracy >= 80 ? 'Advanced' : accuracy >= 55 ? 'Intermediate' : 'Beginner',
            priorityTopics: ['Core Concepts', 'Key Definitions', 'Practical Applications'],
            studyDuration: accuracy >= 80 ? '15 minutes' : accuracy >= 55 ? '30 minutes' : '45 minutes',
            nextAction: accuracy >= 80
                ? 'Review the advanced topics briefly to reinforce your strong foundation before the quiz.'
                : accuracy >= 55
                    ? 'Focus on the areas where you struggled in the survey, then review the main concepts.'
                    : 'Start with the fundamentals and work through examples carefully before attempting the quiz.'
        }
    }
}

// ─── 7. Adaptive Quiz Generation ─────────────────────────────────────────────

/**
 * Generate an adaptive quiz calibrated to learner level and weak areas.
 * @param {string} documentText - Document content
 * @param {Array} surveyQuestions - Survey questions
 * @param {object} surveyAnswers - Survey answers
 * @param {object} studyGuidance - Result from generateStudyGuidance
 * @returns {Promise<Array>} Array of quiz question objects with difficulty tags
 */
export async function generateAdaptiveQuiz(documentText, surveyQuestions, surveyAnswers, studyGuidance) {
    try {

        const weakTopics = surveyQuestions
            .filter((q, i) => surveyAnswers[i] !== q.correctAnswer)
            .map(q => q.question)

        const learnerLevel = studyGuidance?.learnerLevel || 'Intermediate'
        const priorityTopics = Array.isArray(studyGuidance?.priorityTopics)
            ? studyGuidance.priorityTopics
            : ['Core concepts', 'Key definitions', 'Applications']

        const difficultyDistribution =
            learnerLevel === 'Beginner'  ? '5 easy, 4 medium, 1 hard' :
            learnerLevel === 'Advanced'  ? '1 easy, 3 medium, 6 hard' :
                                          '2 easy, 5 medium, 3 hard'

        const prompt = `You are an adaptive exam creator. Generate a personalized 10-question quiz for a ${learnerLevel}-level learner.

Study Material:
${documentText ? documentText.substring(0, 30000) : 'General academic content.'}

Personalization Parameters:
- Learner Level: ${learnerLevel}
- Priority Focus Topics: ${priorityTopics.join(', ')}  
- Weak areas from prerequisite survey: ${weakTopics.length > 0 ? weakTopics.slice(0, 5).join('; ') : 'None identified'}
- Required difficulty distribution: ${difficultyDistribution}

Difficulty definitions:
- easy: Direct factual recall, single concept, clear answer
- medium: Application of concepts, comparison between ideas, multi-step reasoning
- hard: Synthesis of multiple concepts, edge cases, deep analysis required

Rules:
- Weight more questions toward the priority focus topics
- Questions must be answerable from the study material
- Each option must be plausible (avoid obviously wrong distractors)
- Order questions from easy → hard

Respond ONLY with valid JSON:
{
  "questions": [
    {
      "question": "Specific, clear question?",
      "options": ["Plausible A", "Plausible B", "Plausible C", "Plausible D"],
      "correctAnswer": 0,
      "difficulty": "easy",
      "topic": "Topic name from document"
    }
  ]
}

Generate exactly 10 questions.`

        const text_resp = await callGeminiProxy(prompt);
        const data = extractJSON(text_resp);

        const valid = (data?.questions || []).filter(q =>
            q.question && Array.isArray(q.options) && q.options.length === 4
        )

        if (valid.length === 0) throw new Error('No valid questions generated')
        return valid

    } catch (error) {
        console.error('generateAdaptiveQuiz error:', error)
        throw new Error(`Failed to generate adaptive quiz: ${error.message}`)
    }
}

// ─── 8. Dynamic Difficulty Question ──────────────────────────────────────────

/**
 * Generate a single question at adjusted difficulty based on running accuracy.
 * Called mid-quiz to dynamically escalate or de-escalate.
 * @param {string} documentText - Document content
 * @param {Array} answeredQuestions - Questions answered so far
 * @param {number} runningAccuracy - Current accuracy 0-100
 * @param {string} currentDifficulty - 'easy' | 'medium' | 'hard'
 * @returns {Promise<object>} Single question object
 */
export async function generateNextDynamicQuestion(documentText, answeredQuestions, runningAccuracy, currentDifficulty) {
    try {

        // Escalation / de-escalation logic
        let targetDifficulty = currentDifficulty
        if (runningAccuracy >= 80) {
            targetDifficulty = currentDifficulty === 'easy' ? 'medium'
                : currentDifficulty === 'medium' ? 'hard' : 'hard'
        } else if (runningAccuracy < 40) {
            targetDifficulty = currentDifficulty === 'hard' ? 'medium'
                : currentDifficulty === 'medium' ? 'easy' : 'easy'
        }

        const coveredTopics = answeredQuestions
            .map(q => q.topic || q.question?.substring(0, 40))
            .filter(Boolean)
            .join(', ')

        const prompt = `Generate exactly ONE ${targetDifficulty}-difficulty multiple-choice question.

Study material:
${documentText ? documentText.substring(0, 15000) : 'General academic content.'}

Constraints:
- Topics already covered (DO NOT repeat): ${coveredTopics || 'none yet'}
- Student's current accuracy: ${runningAccuracy}%
- Required difficulty: ${targetDifficulty}
  - easy: direct factual recall
  - medium: concept application
  - hard: synthesis, multi-step reasoning, edge cases

Respond ONLY with valid JSON:
{
  "question": "Clear question text?",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correctAnswer": 0,
  "difficulty": "${targetDifficulty}",
  "topic": "Topic name"
}`

        const text_resp = await callGeminiProxy(prompt);
        const data = extractJSON(text_resp);

        if (!data?.question) throw new Error('Invalid dynamic question response')
        return data

    } catch (error) {
        console.error('generateNextDynamicQuestion error:', error)
        throw error
    }
}

// ─── 9. Recovery Quiz ─────────────────────────────────────────────────────────

/**
 * Generate a targeted recovery quiz for concepts the student missed.
 * @param {string} documentText - Document content
 * @param {Array} missedQuestions - Questions the student got wrong
 * @returns {Promise<Array>} Array of recovery question objects with hints
 */
export async function generateRecoveryQuiz(documentText, missedQuestions) {
    try {

        const missedSummary = missedQuestions
            .map((q, i) => `${i + 1}. "${q.question}" — Correct: "${q.options?.[q.correctAnswer] || q.correctAnswer}"`)
            .join('\n')

        const prompt = `You are a remedial learning specialist. A student struggled with these specific concepts:

${missedSummary}

Study material for reference:
${documentText ? documentText.substring(0, 25000) : 'General academic content.'}

Generate a "Smart Recovery Quiz" — exactly 5 questions specifically designed to rebuild understanding of the missed concepts.

Recovery Quiz Rules:
1. Each question must directly target one of the missed concepts above
2. Approach from a DIFFERENT angle than the original question — don't just rephrase it
3. Start slightly easier than the original to rebuild confidence
4. Include a short hint (1-2 sentences) that guides thinking without giving away the answer
5. Questions should help the student understand WHY the correct answer is right

Respond ONLY with valid JSON:
{
  "recoveryQuestions": [
    {
      "question": "Targeted question approaching concept from new angle?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0,
      "hint": "Think about how X relates to Y — the key is understanding...",
      "targetsConcept": "Name of the original missed concept",
      "difficulty": "easy"
    }
  ]
}

Generate exactly 5 recovery questions.`

        const text_resp = await callGeminiProxy(prompt);
        const data = extractJSON(text_resp);

        const questions = data?.recoveryQuestions || []
        if (questions.length === 0) throw new Error('No recovery questions generated')
        return questions

    } catch (error) {
        console.error('generateRecoveryQuiz error:', error)
        throw error
    }
}

// ─── 10. Study Plan ───────────────────────────────────────────────────────────

/**
 * Generate a detailed day-by-day study plan.
 * @param {string} documentText - Document content
 * @param {string} subject - Subject name
 * @param {string} examDate - ISO date string for exam
 * @param {string} learnerLevel - 'Beginner' | 'Intermediate' | 'Advanced'
 * @returns {Promise<object>} Study plan object
 */
export async function generateStudyPlan(documentText, subject, examDate, learnerLevel = 'Intermediate') {
    try {

        const today = new Date().toISOString().split('T')[0]
        const daysRemaining = Math.max(1, Math.ceil((new Date(examDate) - new Date()) / (1000 * 60 * 60 * 24)))
        const planDays = Math.min(daysRemaining, 14)

        const docContext = documentText
            ? `Study Material (use real topics from this):\n${documentText.substring(0, 20000)}`
            : `Subject to study: ${subject}`

        const prompt = `You are an expert academic planner. Create a detailed, practical ${planDays}-day study plan.

Subject: ${subject}
Student Level: ${learnerLevel}
Exam Date: ${examDate} (${daysRemaining} days from today, ${today})
Plan Duration: ${planDays} days

${docContext}

Create a realistic, structured day-by-day plan that:
- Progresses from foundational → advanced (building on prior days)
- Balances active recall, reading, and practice
- Includes specific tasks referencing actual topics from the material
- Allocates appropriate time per day based on learner level
- Ends with a review/practice day before the exam

Respond ONLY with valid JSON:
{
  "title": "Study Plan for ${subject}",
  "overview": "One sentence summarizing the plan's strategy and approach.",
  "days": [
    {
      "day": 1,
      "topic": "Specific topic name for this day",
      "goal": "What the student will be able to do/understand after this session",
      "duration": "45 minutes",
      "tasks": [
        "Specific task 1 referencing actual content",
        "Specific task 2",
        "Specific task 3"
      ]
    }
  ]
}

Generate exactly ${planDays} days.`

        const text_resp = await callGeminiProxy(prompt);
        const data = extractJSON(text_resp);

        if (!data?.days?.length) throw new Error('No study plan days generated')
        return data

    } catch (error) {
        console.error('generateStudyPlan error:', error)
        throw error
    }
}

// ─── 11. Flashcard Generation ─────────────────────────────────────────────────

/**
 * Generate high-quality study flashcards.
 * @param {string} documentText - Document content (optional)
 * @param {string} topic - Topic name (used if no document)
 * @returns {Promise<Array>} Array of { front, back } card objects
 */
export async function generateFlashcards(documentText, topic = '') {
    try {

        const source = documentText
            ? `Based on this study material:\n${documentText.substring(0, 30000)}`
            : `Based on the topic: ${topic}`

        const prompt = `You are an expert study card creator. Generate exactly 20 high-quality flashcards for active recall practice.

${source}

Flashcard Rules:
- Questions (front) should test understanding, application, and reasoning — not just definitions
- Answers (back) should be concise but complete (1-3 sentences maximum)
- Cover a broad range of concepts from the material
- Progress from foundational → advanced
- Avoid trivial, obvious questions
- Make each card genuinely useful for exam preparation

Respond ONLY with valid JSON:
{
  "cards": [
    {
      "front": "Specific, thought-provoking question?",
      "back": "Concise, accurate answer that reinforces understanding."
    }
  ]
}

Generate exactly 20 flashcards.`

        const text_resp = await callGeminiProxy(prompt);
        const data = extractJSON(text_resp);

        const cards = data?.cards || []
        if (cards.length === 0) throw new Error('No flashcards generated')
        return cards

    } catch (error) {
        console.error('generateFlashcards error:', error)
        throw error
    }
}

// ─── 12. AI Tutor — Native Multi-turn Chat ────────────────────────────────────

/**
 * Active chat session store — keeps native Gemini chat session alive per component mount.
 * Using module-level singleton so the session persists across multiple sendMessage calls.
 */
let _activeChatSession = null
let _activeChatDocumentText = null

/**
 * Get or create a Gemini native chat session.
 * Creates a new session if document context changes.
 * @param {string} documentText - Current document context
 * @param {Array} historyMessages - Existing chat history [{ role, text, ts }]
 * @returns {object} Gemini chat session
 */
function getOrCreateChatSession(documentText, historyMessages = []) {
    // Re-create session if document context changed
    if (_activeChatDocumentText !== documentText) {
        _activeChatSession = null
        _activeChatDocumentText = documentText
    }

    if (!_activeChatSession) {

        const systemContext = documentText
            ? `You are AIVY Intelligence, an expert academic research assistant. The student is engaging with the following source material:\n\n${documentText.substring(0, 30000)}\n\nProvide sophisticated, synthesised, and professional responses. Use structured analysis and deep reasoning. Always guide understanding through rigorous academic principles rather than just giving answers.`
            : `You are AIVY Intelligence, a high-level academic research agent. Synthesize information clearly and provide professional, data-driven reasoning based on user inquiries.`

        // Convert existing history to Gemini format (Strict user/model alternation)
        const geminiHistory = []
        if (historyMessages && historyMessages.length > 0) {
            let firstUserFound = false
            for (const msg of historyMessages) {
                if (!firstUserFound && msg.role !== 'user') continue
                firstUserFound = true

                if (msg.role === 'user') {
                    geminiHistory.push({ role: 'user', parts: [{ text: msg.text || "" }] })
                } else if (msg.role === 'ai') {
                    geminiHistory.push({ role: 'model', parts: [{ text: msg.text || "" }] })
                }
            }
        }

        // Inject system context as first user/model exchange if no history
        const initialHistory = geminiHistory.length > 0 ? geminiHistory : [
            { role: 'user', parts: [{ text: `System: ${systemContext}\n\nPlease acknowledge you are ready to help.` }] },
            { role: 'model', parts: [{ text: "Hello! I'm AIVY Intelligence, your advanced research engine. I'm ready to synthesize your documents and answer any inquiries. How can I assist your study session today? 🧠" }] }
        ]

        _activeChatSession = model.startChat({ history: initialHistory })
    }

    return _activeChatSession
}

/**
 * Reset the active chat session (call when user clears chat).
 */
export function resetChatSession() {
    _activeChatSession = null
    _activeChatDocumentText = null
}

/**
 * Generate AI Tutor response using native Gemini multi-turn chat.
 * @param {string} documentText - Document context (can be empty)
 * @param {string} message - User's current message
 * @param {Array} chatHistory - Existing chat history for session initialization
 * @returns {Promise<string>} AI response text
 */
export async function generateTutorResponse(documentText, message, chatHistory = []) {
    try {
        const chat = getOrCreateChatSession(documentText, chatHistory)
        const result = await chat.sendMessage(message)
        return result.response.text()
    } catch (error) {
        console.error('generateTutorResponse error:', error)
        // Reset session on error so next message starts fresh
        _activeChatSession = null
        throw new Error(`Tutor error: ${error.message}`)
    }
}

/**
 * Analyze a student's entire learning history across multiple documents and quizzes.
 * @param {Array} sessions - Array of archived sessions { documentName, accuracy, score, total }
 * @param {object} stats - User gamification stats { totalXP, badges, loginStreak }
 * @returns {Promise<object>} Global learning profile and recommendations
 */
export async function analyzeGlobalProgress(sessions, stats) {
    try {

        const historySummary = sessions.length > 0
            ? sessions.map((s, i) => `${i + 1}. ${s.documentName || 'Unknown doc'}: ${s.accuracy || 0}% accuracy (${s.score || 0}/${s.total || 0})`).join('\n')
            : 'No sessions recorded yet.'

        const prompt = `You are a meta-learning analyst. Analyze this student's overall learning progress across multiple subjects.

Learning History:
${historySummary}

Gamification Stats:
- Total XP: ${stats?.totalXP || 0}
- Badges: ${stats?.badges?.join(', ') || 'None'}
- Current Streak: ${stats?.loginStreak || 1} days

Provide a high-level "Master Learning Profile" with specific insights into their learning behavior, consistency, and topical strengths.

Respond ONLY with valid JSON:
{
  "learningStyle": "e.g. Visual & Analytical",
  "topicalStrengths": ["Topic 1", "Topic 2"],
  "improvementAreas": ["Area 1", "Area 2"],
  "consistencyScore": 85,
  "retentionScore": 90,
  "masteryInsights": "A 2-3 sentence summary of their growth and mastery level across all documents.",
  "nextBigGoal": "A specific recommendation for their next learning milestone."
}

Ensure the insights are encouraging, data-driven based on the history provided, and academically professional.`

        const text_resp = await callGeminiProxy(prompt);
        const data = extractJSON(text_resp);

        if (data?.learningStyle) return data

        throw new Error('Invalid global progress response')
    } catch (error) {
        console.error('analyzeGlobalProgress error:', error)
        return {
            learningStyle: 'Self-Directed Learner',
            topicalStrengths: ['Core Fundamentals', 'Information Recall'],
            improvementAreas: ['Advanced Synthesis', 'Consistent Practice'],
            consistencyScore: stats?.loginStreak > 3 ? 90 : 65,
            retentionScore: 75,
            masteryInsights: 'You are building a solid foundation across your study materials. Your consistent effort is showing in your XP growth.',
            nextBigGoal: 'Complete 3 more adaptive quizzes with >80% accuracy to reach the next level.'
        }
    }
}

/**
 * Generate a concise "Key Takeaways" summary for an archived session.
 * @param {object} quizData - { documentName, questions, userAnswers, score, total }
 * @returns {Promise<string>} 2-3 bullet point summary
 */
export async function summarizeSession(quizData) {
    try {

        const accuracy = Math.round((quizData.score / quizData.total) * 100)
        const missedCount = quizData.total - quizData.score

        const prompt = `Summarize a student's study session for their records.
        
Document: ${quizData.documentName || 'Unknown'}
Performance: ${quizData.score || 0}/${quizData.total || 0} (${accuracy}%)
Concept missed: ${missedCount > 0 ? "Several gaps detected" : "Perfect mastery"}

Provide exactly 2-3 bullet points (using •) summarizing what was learned and what needs review. 
Be specific to the document name and performance level. 
Max 60 words total.`

        const result = await model.generateContent(prompt)
        return result.response.text().trim()
    } catch {
        return "• Completed study session for " + (quizData.documentName || 'Document') + ".\n• Performance: " + (quizData.score || 0) + "/" + (quizData.total || 0) + "."
    }
}

/**
 * Generate a "Smart Re-Study" micro-lesson for missed concepts.
 * @param {object} quizResult - { questions, userAnswers, score, total }
 * @param {string} fullDocumentText 
 * @returns {Promise<object>} Micro-lesson object { title, refresher, tips, nextGoal }
 */
export async function generateSmartReStudyPath(quizResult, fullDocumentText) {
    try {

        const missed = (quizResult.questions || []).filter((q, i) => quizResult.userAnswers[i] !== q.correctAnswer)
        const missedTopics = missed.map(m => m.topic || m.question).slice(0, 3)

        const prompt = `You are an adaptive tutor. The student just finished a quiz and missed questions on these specific topics:
${missedTopics.join('; ')}

Based on the original study material, create a highly targetted 10-minute refresher lesson.
Output ONLY valid JSON:
{
  "title": "Refresher: [Short, Punchy Title]",
  "refresher": "A 2-paragraph targeted explanation of the core concepts missed.",
  "keyTips": ["Focus tip 1", "Common mistake to avoid", "Memory anchor"],
  "nextGoal": "One specific task to try now to confirm understanding."
}

Study Material:
${fullDocumentText ? fullDocumentText.substring(0, 15000) : 'General content.'}`

        const text_resp = await callGeminiProxy(prompt);
        return extractJSON(text_resp);
    } catch (error) {
        console.error('generateSmartReStudyPath error:', error)
        return {
            title: 'Concept Refresher',
            refresher: 'Review the topics you missed in your recent quiz to build a stronger baseline.',
            keyTips: ['Check the definitions again', 'Look for examples in the text'],
            nextGoal: 'Attempt a practice quiz on specifically these concepts.'
        }
    }
}
