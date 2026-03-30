# 🎓 AIVY - AI-Powered Study Companion

A premium, academic-grade web application that uses **Gemini AI** to analyze study materials, generate quizzes, and provide personalized learning insights.

## ✨ Features

### 📚 **Document Upload & Analysis**
- Upload PDF or TXT files
- **AI-powered text extraction** using pdf.js
- **Automatic content analysis** with Gemini AI
- Identifies key topics, difficulty level, and provides summaries

### 🧠 **AI-Generated Quizzes**
- **Automatically generates 10 quiz questions** from uploaded documents
- Multiple-choice format with 4 options each
- Questions test understanding, not just memorization
- Covers different aspects of the content

### 📊 **Performance Analytics**
- Real-time score tracking
- Visual charts showing correct vs wrong answers
- Accuracy percentage with benchmarks
- **AI-powered SWOT analysis** of your performance

### 🤖 **Gemini AI Integration**
- Document summarization
- Topic extraction
- Quiz question generation
- Personalized performance insights
- Strategic learning recommendations

## 🚀 How It Works

### 1. **Upload a Document**
   - Go to Dashboard
   - Click "Upload Study Material"
   - Select a PDF or TXT file
   - Click "Upload & Analyze with AI"

### 2. **AI Processing**
   The system will:
   - Extract text from your document
   - Analyze content with Gemini AI
   - Generate 10 custom quiz questions
   - Save everything for later use

### 3. **Take the Quiz**
   - Click "Start Quiz" on the Dashboard
   - Answer all 10 questions
   - Navigate back/forward to review answers
   - Submit when ready

### 4. **View Results**
   - See your score and accuracy
   - View visual charts
   - Get **AI-powered SWOT analysis**
   - Understand your strengths and areas for improvement

## 🛠️ Technology Stack

- **Frontend**: React + Vite
- **Styling**: Custom CSS (Premium Academic Design)
- **Authentication**: Firebase Auth
- **AI**: Google Gemini API
- **PDF Processing**: pdf.js
- **Storage**: LocalStorage

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd AIVY_V1
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   - Copy `.env.example` to `.env`
   - Add your Firebase credentials
   - Add your Gemini API key

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open in browser**
   - Navigate to `http://localhost:5173` (or the port shown)

## 🔑 Environment Variables

Create a `.env` file with:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# Gemini AI Configuration
VITE_GEMINI_API_KEY=your_gemini_api_key
```

## 🎨 Design Philosophy

AIVY follows a **premium, academic-grade design** with:

- **Soft neutral colors** (off-white backgrounds, deep indigo primary)
- **Clean typography** (Inter font family)
- **Generous spacing** (no clutter)
- **Subtle animations** (smooth transitions, hover effects)
- **Professional aesthetics** (calm, confident, academic)

## 📁 Project Structure

```
src/
├── pages/
│   ├── Dashboard.jsx    # Main dashboard with upload
│   ├── Quiz.jsx         # Quiz interface
│   ├── Progress.jsx     # Results & analytics
│   ├── Login.jsx        # Authentication
│   └── Signup.jsx       # User registration
├── services/
│   ├── geminiService.js    # AI analysis & quiz generation
│   ├── pdfService.js       # PDF text extraction
│   └── storageService.js   # LocalStorage management
├── firebase.js          # Firebase configuration
├── index.css           # Premium design system
└── App.jsx             # Main app component
```

## 🔥 Key Services

### **geminiService.js**
- `analyzeDocument(text)` - Analyzes content and extracts topics
- `generateQuiz(text, numQuestions)` - Creates quiz questions
- `analyzeQuizResults(questions, answers, score, total)` - Generates SWOT analysis

### **pdfService.js**
- `extractTextFromPDF(file)` - Extracts text from PDF files
- `extractTextFromTextFile(file)` - Reads text files
- `extractTextFromFile(file)` - Universal file handler

### **storageService.js**
- `saveDocument(document)` - Saves uploaded documents
- `getDocuments()` - Retrieves all documents
- `saveCurrentQuiz(quiz)` - Stores active quiz
- `getCurrentQuiz()` - Loads quiz for taking

## 🎯 Usage Flow

```
1. User uploads PDF/TXT
   ↓
2. System extracts text (pdfService)
   ↓
3. Gemini AI analyzes content (geminiService)
   ↓
4. AI generates 10 quiz questions
   ↓
5. Document + Quiz saved (storageService)
   ↓
6. User takes quiz (Quiz page)
   ↓
7. Results calculated
   ↓
8. AI generates SWOT analysis (geminiService)
   ↓
9. User views insights (Progress page)
```

## 🚀 Deployment

### Build for production
```bash
npm run build
```

### Deploy to GitHub Pages
```bash
npm run deploy
```

## 📝 Notes

- **PDF Processing**: Uses pdf.js for client-side PDF text extraction
- **AI Analysis**: Powered by Google Gemini Pro model
- **Data Storage**: All data stored locally in browser (no backend needed)
- **Authentication**: Firebase handles user auth
- **Responsive**: Works on desktop and mobile devices

## 🎓 Perfect For

- Students studying for exams
- Self-learners wanting to test knowledge
- Educators creating quick assessments
- Anyone wanting AI-powered study assistance

## 🌟 Premium Features

- ✅ **No backend required** - runs entirely in browser
- ✅ **AI-powered** - uses Google Gemini for intelligence
- ✅ **Beautiful UI** - academic-grade design
- ✅ **Fast** - instant quiz generation
- ✅ **Smart** - personalized insights
- ✅ **Free** - just needs API keys

---

**Built with ❤️ for students, by students**
