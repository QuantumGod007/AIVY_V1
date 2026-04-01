// Test script to verify Gemini API key works
import { GoogleGenerativeAI } from '@google/generative-ai'

const API_KEY = process.env.VITE_GEMINI_API_KEY || 'YOUR_API_KEY_HERE'

async function testGeminiAPI() {
    console.log('🧪 Testing Gemini API...')
    console.log('API Key:', API_KEY ? `${API_KEY.substring(0, 10)}...` : 'MISSING')

    try {
        const genAI = new GoogleGenerativeAI(API_KEY)
        const model = genAI.getGenerativeModel({
            model: 'gemini-2.5-flash'
        })

        console.log('✅ Model initialized successfully')

        const result = await model.generateContent('Say "Hello, AIVY works!" in one sentence.')
        const response = await result.response
        const text = response.text()

        console.log('✅ API Response:', text)
        console.log('✅ SUCCESS! Your Gemini API key is working!')

    } catch (error) {
        console.error('❌ ERROR:', error.message)
        console.error('Full error:', error)

        if (error.message.includes('API_KEY_INVALID')) {
            console.log('\n💡 Solution: Get a new API key from https://aistudio.google.com/app/apikey')
        } else if (error.message.includes('404')) {
            console.log('\n💡 Solution: The model name might be wrong. Try "gemini-pro" instead.')
        } else if (error.message.includes('PERMISSION_DENIED')) {
            console.log('\n💡 Solution: Enable the Generative Language API in your Google Cloud project')
        }
    }
}

testGeminiAPI()
