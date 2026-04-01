// List available models
import { GoogleGenerativeAI } from '@google/generative-ai'

const API_KEY = process.env.VITE_GEMINI_API_KEY

async function listModels() {
    console.log('📋 Fetching list of available Gemini models...\n')

    try {
        const genAI = new GoogleGenerativeAI(API_KEY)

        // Try to list models
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`
        )

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const data = await response.json()

        console.log('✅ Available models:\n')

        if (data.models && data.models.length > 0) {
            data.models.forEach(model => {
                console.log(`📌 ${model.name}`)
                if (model.supportedGenerationMethods) {
                    console.log(`   Methods: ${model.supportedGenerationMethods.join(', ')}`)
                }
                console.log()
            })

            // Find models that support generateContent
            const contentModels = data.models.filter(m =>
                m.supportedGenerationMethods?.includes('generateContent')
            )

            console.log('\n✅ Models that support generateContent:')
            contentModels.forEach(m => console.log(`   - ${m.name}`))

            if (contentModels.length > 0) {
                const modelToUse = contentModels[0].name.replace('models/', '')
                console.log(`\n🎯 Recommended model to use: "${modelToUse}"`)
            }

        } else {
            console.log('No models found.')
        }

    } catch (error) {
        console.log('❌ Error listing models:', error.message)
        console.log('\nTrying alternative approach...\n')

        // Try common model names
        const modelsToTry = [
            'gemini-2.0-flash-exp',
            'gemini-exp-1206',
            'gemini-1.5-flash-latest',
            'gemini-1.5-pro-latest'
        ]

        for (const modelName of modelsToTry) {
            try {
                console.log(`Testing: ${modelName}...`)
                const genAI = new GoogleGenerativeAI(API_KEY)
                const model = genAI.getGenerativeModel({ model: modelName })
                const result = await model.generateContent('Hi')
                const response = await result.response
                console.log(`✅ ${modelName} WORKS!`)
                console.log(`Response: ${response.text()}\n`)
                return
            } catch (err) {
                console.log(`❌ ${modelName} failed\n`)
            }
        }
    }
}

listModels()
