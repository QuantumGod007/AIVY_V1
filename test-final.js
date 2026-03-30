// Final test with the correct model
import { GoogleGenerativeAI } from '@google/generative-ai'

const API_KEY = 'AIzaSyBchN3P5wNzmeiVcwd8HBcLdwQiL1j7D0U'

async function finalTest() {
    console.log('🎯 Final Test: gemini-2.5-flash\n')

    try {
        const genAI = new GoogleGenerativeAI(API_KEY)
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

        const result = await model.generateContent('Say "AIVY is ready!" in one sentence.')
        const response = await result.response
        const text = response.text()

        console.log('✅ ✅ ✅ SUCCESS! ✅ ✅ ✅\n')
        console.log(`AI Response: ${text}\n`)
        console.log('🎉 Your Gemini API is working perfectly!')
        console.log('🚀 AIVY is ready to use!\n')
        console.log('Next steps:')
        console.log('1. Go to: http://localhost:5174')
        console.log('2. Login/Signup')
        console.log('3. Upload sample_document.txt')
        console.log('4. Take the prerequisite survey!\n')

    } catch (error) {
        console.log('❌ Error:', error.message)
    }
}

finalTest()
