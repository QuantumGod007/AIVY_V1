import { useState } from 'react'
import { signOut } from 'firebase/auth'
import { auth } from '../firebase'
import { useNavigate } from 'react-router-dom'
import '../styles/global.css'

const TOPICS = [
  { id: 1, name: 'Mathematics', desc: 'Algebra, Calculus, Statistics' },
  { id: 2, name: 'Python', desc: 'Programming fundamentals' },
  { id: 3, name: 'Artificial Intelligence', desc: 'ML, Neural Networks' },
  { id: 4, name: 'Data Structures', desc: 'Arrays, Trees, Graphs' },
  { id: 5, name: 'Operating Systems', desc: 'Processes, Memory, Scheduling' },
  { id: 6, name: 'DBMS', desc: 'SQL, Normalization, Transactions' },
  { id: 7, name: 'Computer Networks', desc: 'TCP/IP, Protocols, Security' },
]

const QUESTIONS = [
  { id: 1, q: 'Sample question 1 for the selected topic?', opts: ['Option A', 'Option B', 'Option C', 'Option D'] },
  { id: 2, q: 'Sample question 2 for the selected topic?', opts: ['Option A', 'Option B', 'Option C', 'Option D'] },
  { id: 3, q: 'Sample question 3 for the selected topic?', opts: ['Option A', 'Option B', 'Option C', 'Option D'] },
]

function Dashboard() {
  const [activeScreen, setActiveScreen] = useState('topic')
  const [activeMenu, setActiveMenu] = useState('Get Started Quiz')
  const [step, setStep] = useState('topic')
  const [selectedTopic, setSelectedTopic] = useState(null)
  const [currentQ, setCurrentQ] = useState(0)
  const [answers, setAnswers] = useState({})
  const [selected, setSelected] = useState(null)
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut(auth)
    navigate('/login')
  }

  const startQuiz = () => {
    if (selectedTopic) setStep('quiz')
  }

  const selectOption = (opt) => {
    setSelected(opt)
  }

  const nextQ = () => {
    setAnswers({ ...answers, [currentQ]: selected })
    setSelected(null)
    if (currentQ < QUESTIONS.length - 1) {
      setCurrentQ(currentQ + 1)
    } else {
      setStep('result')
    }
  }

  const prevQ = () => {
    if (currentQ > 0) {
      setCurrentQ(currentQ - 1)
      setSelected(answers[currentQ - 1] || null)
    }
  }

  const reset = () => {
    setStep('topic')
    setSelectedTopic(null)
    setCurrentQ(0)
    setAnswers({})
    setSelected(null)
  }

  const score = Math.floor(Math.random() * 30) + 60
  const level = score >= 80 ? 'Advanced' : score >= 60 ? 'Intermediate' : 'Beginner'

  return (
    <div className="grid grid-cols-[240px_1fr_300px] h-screen bg-gray-950 text-white">
      {/* Sidebar */}
      <div className="bg-gray-900 border-r border-gray-800 flex flex-col">
        <div className="p-6 border-b border-gray-800">
          <div className="text-xl font-semibold tracking-wide text-blue-500">AIVY</div>
          <div className="text-xs text-gray-500 mt-1">Student Dashboard</div>
        </div>
        <nav className="flex-1 p-4 space-y-3">
          {['Home', 'Get Started Quiz', 'Learning Path', 'My Progress', 'AI Tutor', 'Challenges', 'Rewards', 'SWOT Report', 'Settings'].map((item) => (
            <button
              key={item}
              onClick={() => {
                setActiveMenu(item)
                if (item === 'Get Started Quiz') setActiveScreen('topic')
                else setActiveScreen(item.toLowerCase().replace(/\s+/g, '-'))
              }}
              className={`w-full text-left px-4 py-2.5 rounded-md text-sm font-medium transition ${activeMenu === item ? 'bg-gray-800 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'}`}
            >
              {item}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-800">
          <button onClick={handleSignOut} className="w-full px-4 py-2 text-sm text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded-md transition">Sign out</button>
        </div>
      </div>

      {/* Main */}
      <div className="overflow-y-auto">
        <div className="p-8">
          {activeScreen === 'home' && (
            <div>
              <div className="mb-6">
                <h1 className="text-2xl font-semibold">Welcome to AIVY</h1>
                <p className="text-sm text-gray-400">Your AI-powered learning companion</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
                  <div className="text-lg font-semibold mb-2">Quick Start</div>
                  <p className="text-sm text-gray-400 mb-4">Begin your learning journey</p>
                  <button onClick={() => { setActiveMenu('Get Started Quiz'); setActiveScreen('topic'); }} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-500 transition">Start Quiz</button>
                </div>
                <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
                  <div className="text-lg font-semibold mb-2">Your Progress</div>
                  <p className="text-sm text-gray-400 mb-4">Track your learning stats</p>
                  <button onClick={() => { setActiveMenu('My Progress'); setActiveScreen('my-progress'); }} className="px-4 py-2 border border-gray-700 text-gray-300 text-sm font-medium rounded-md hover:bg-gray-800 transition">View Progress</button>
                </div>
              </div>
            </div>
          )}

          {activeScreen === 'learning-path' && (
            <div>
              <div className="mb-6">
                <h1 className="text-2xl font-semibold">Learning Path</h1>
                <p className="text-sm text-gray-400">Your personalized learning journey</p>
              </div>
              <div className="space-y-4">
                {['Beginner Level', 'Intermediate Level', 'Advanced Level'].map((level, i) => (
                  <div key={i} className="bg-gray-900 border border-gray-800 rounded-lg p-6">
                    <div className="flex justify-between items-center mb-3">
                      <div className="text-base font-semibold">{level}</div>
                      <div className="text-sm text-gray-400">{i * 30}% Complete</div>
                    </div>
                    <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-600" style={{ width: `${i * 30}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeScreen === 'my-progress' && (
            <div>
              <div className="mb-6">
                <h1 className="text-2xl font-semibold">My Progress</h1>
                <p className="text-sm text-gray-400">Track your learning achievements</p>
              </div>
              <div className="grid grid-cols-3 gap-4 mb-6">
                {[{ label: 'Quizzes Taken', value: '12' }, { label: 'Avg Score', value: '78%' }, { label: 'Time Spent', value: '8h' }].map((stat, i) => (
                  <div key={i} className="bg-gray-900 border border-gray-800 rounded-lg p-6 text-center">
                    <div className="text-3xl font-semibold mb-2">{stat.value}</div>
                    <div className="text-sm text-gray-400">{stat.label}</div>
                  </div>
                ))}
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
                <div className="text-base font-semibold mb-4">Recent Activity</div>
                <div className="space-y-3">
                  {['Completed Python Quiz', 'Earned 50 XP', 'Unlocked Badge'].map((activity, i) => (
                    <div key={i} className="flex justify-between items-center py-2 border-b border-gray-800 last:border-0">
                      <span className="text-sm text-gray-300">{activity}</span>
                      <span className="text-xs text-gray-500">2h ago</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeScreen === 'ai-tutor' && (
            <div>
              <div className="mb-6">
                <h1 className="text-2xl font-semibold">AI Tutor</h1>
                <p className="text-sm text-gray-400">Get personalized help from AI</p>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 h-96 flex flex-col">
                <div className="flex-1 mb-4 space-y-3">
                  <div className="bg-gray-800 rounded-lg p-4 max-w-md">
                    <p className="text-sm">Hello! How can I help you today?</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <input type="text" placeholder="Ask me anything..." className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-600" />
                  <button className="px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-500 transition">Send</button>
                </div>
              </div>
            </div>
          )}

          {activeScreen === 'challenges' && (
            <div>
              <div className="mb-6">
                <h1 className="text-2xl font-semibold">Challenges</h1>
                <p className="text-sm text-gray-400">Complete challenges to earn rewards</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {['Daily Challenge', 'Weekly Challenge', 'Monthly Challenge', 'Special Event'].map((challenge, i) => (
                  <div key={i} className="bg-gray-900 border border-gray-800 rounded-lg p-6 hover:border-blue-600 transition cursor-pointer">
                    <div className="text-base font-semibold mb-2">{challenge}</div>
                    <p className="text-sm text-gray-400 mb-4">Complete 5 quizzes</p>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500">3/5 Complete</span>
                      <span className="text-sm text-blue-500 font-medium">+100 XP</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeScreen === 'rewards' && (
            <div>
              <div className="mb-6">
                <h1 className="text-2xl font-semibold">Rewards</h1>
                <p className="text-sm text-gray-400">Your earned badges and achievements</p>
              </div>
              <div className="grid grid-cols-4 gap-4">
                {['First Quiz', 'Week Streak', 'Top Scorer', 'Fast Learner', 'Night Owl', 'Consistent', 'Explorer', 'Master'].map((badge, i) => (
                  <div key={i} className="bg-gray-900 border border-gray-800 rounded-lg p-6 text-center hover:border-blue-600 transition cursor-pointer">
                    <div className="w-16 h-16 bg-gray-800 rounded-full mx-auto mb-3 flex items-center justify-center text-xl font-bold">{i < 3 ? '★' : '○'}</div>
                    <div className="text-sm font-medium">{badge}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeScreen === 'swot-report' && (
            <div>
              <div className="mb-6">
                <h1 className="text-2xl font-semibold">SWOT Report</h1>
                <p className="text-sm text-gray-400">Detailed analysis of your learning</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { title: 'Strengths', items: ['Quick learner', 'Strong basics', 'Consistent practice'] },
                  { title: 'Weaknesses', items: ['Time management', 'Advanced topics', 'Test anxiety'] },
                  { title: 'Opportunities', items: ['New courses', 'Study groups', 'Advanced modules'] },
                  { title: 'Threats', items: ['Inconsistency', 'Distractions', 'Burnout risk'] },
                ].map((section, i) => (
                  <div key={i} className="bg-gray-900 border border-gray-800 rounded-lg p-6">
                    <div className="text-base font-semibold mb-4">{section.title}</div>
                    <ul className="space-y-2">
                      {section.items.map((item, j) => (
                        <li key={j} className="text-sm text-gray-400">{item}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeScreen === 'settings' && (
            <div>
              <div className="mb-6">
                <h1 className="text-2xl font-semibold">Settings</h1>
                <p className="text-sm text-gray-400">Manage your account and preferences</p>
              </div>
              <div className="space-y-4">
                {['Profile Settings', 'Notification Preferences', 'Privacy Settings', 'Account Security'].map((setting, i) => (
                  <div key={i} className="bg-gray-900 border border-gray-800 rounded-lg p-6 flex justify-between items-center hover:border-gray-700 transition cursor-pointer">
                    <div className="text-base font-medium">{setting}</div>
                    <div className="text-gray-500">→</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(activeScreen === 'topic' || activeScreen === 'get-started-quiz') && step === 'topic' && (
            <div>
              <div className="mb-6">
                <h1 className="text-2xl font-semibold">Start Your Learning Journey</h1>
                <p className="text-sm text-gray-400">Choose a topic to begin assessment</p>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-6">
                {TOPICS.map(t => (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTopic(t.name)}
                    className={`bg-gray-900 border rounded-lg p-4 cursor-pointer transition ${
                      selectedTopic === t.name
                        ? 'border-blue-600 ring-2 ring-blue-600'
                        : 'border-gray-800 hover:ring-2 hover:ring-blue-600'
                    }`}
                  >
                    <div className="text-base font-semibold mb-1">{t.name}</div>
                    <div className="text-sm text-gray-400">{t.desc}</div>
                  </div>
                ))}
              </div>
              <button
                onClick={startQuiz}
                disabled={!selectedTopic}
                className="px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-md disabled:opacity-40 disabled:cursor-not-allowed hover:bg-blue-500 transition"
              >
                Start Assessment
              </button>
            </div>
          )}

          {step === 'quiz' && (
            <div className="max-w-xl mx-auto">
              <div className="mb-6">
                <div className="text-xs uppercase tracking-wide text-gray-500 mb-3">Topic: {selectedTopic}</div>
                <div className="flex items-center gap-4">
                  <div className="text-sm text-gray-400">Question {currentQ + 1} of {QUESTIONS.length}</div>
                  <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-600 transition-all" style={{ width: `${((currentQ + 1) / QUESTIONS.length) * 100}%` }} />
                  </div>
                </div>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 mb-6">
                <div className="text-xl font-medium mb-6">{QUESTIONS[currentQ].q}</div>
                <div className="space-y-3">
                  {QUESTIONS[currentQ].opts.map((opt, i) => (
                    <button
                      key={i}
                      onClick={() => selectOption(opt)}
                      className={`w-full text-left px-5 py-4 rounded-lg border transition text-sm ${
                        selected === opt
                          ? 'bg-gray-800 border-blue-600 ring-2 ring-blue-600'
                          : 'bg-gray-900 border-gray-800 hover:border-gray-700 hover:bg-gray-800/50'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex justify-between">
                <button
                  onClick={prevQ}
                  disabled={currentQ === 0}
                  className="px-6 py-2.5 border border-gray-700 text-gray-300 text-sm font-medium rounded-md disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-800 transition"
                >
                  Previous
                </button>
                <button
                  onClick={nextQ}
                  disabled={!selected}
                  className="px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-md disabled:opacity-40 disabled:cursor-not-allowed hover:bg-blue-500 transition"
                >
                  {currentQ === QUESTIONS.length - 1 ? 'Submit Quiz' : 'Next'}
                </button>
              </div>
            </div>
          )}

          {step === 'result' && (
            <div className="max-w-xl mx-auto">
              <div className="bg-gray-900 border border-gray-800 rounded-lg p-12 text-center mb-6">
                <div className="text-6xl font-semibold mb-3">{score}%</div>
                <div className="text-sm text-gray-400 mb-6">Your Score</div>
                <div className="inline-block px-4 py-1.5 bg-gray-800 text-gray-200 rounded-md text-sm">
                  Level: {level}
                </div>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 mb-6">
                <div className="text-base font-semibold mb-4">What's next?</div>
                <ul className="space-y-2 text-sm text-gray-400">
                  <li>Review your weak areas with AI-generated study materials</li>
                  <li>Practice with adaptive quizzes tailored to your level</li>
                  <li>Track your progress and earn rewards as you improve</li>
                </ul>
              </div>
              <button onClick={reset} className="px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-500 transition">
                Retake Quiz
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Right Panel */}
      <div className="bg-gray-900 border-l border-gray-800 p-4 space-y-4 overflow-y-auto">
        {/* Gamification */}
        <div className="rounded-lg border border-gray-800 bg-gray-900/70 p-4 hover:border-gray-700 transition cursor-pointer">
          <div className="text-sm font-medium text-gray-200 mb-4">Progress</div>
          <div className="mb-4">
            <div className="flex justify-between text-xs text-gray-400 mb-2">
              <span>Level 3</span>
              <span>320/500 XP</span>
            </div>
            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
              <div className="h-full bg-blue-600" style={{ width: '64%' }} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <div className="text-xs text-gray-500 mb-1">Coins</div>
              <div className="text-xl font-semibold">120</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Streak</div>
              <div className="text-xl font-semibold">5</div>
            </div>
          </div>
          <button className="w-full py-2 border border-gray-700 text-gray-300 text-sm font-medium rounded-md hover:bg-gray-800 transition">
            View Rewards
          </button>
        </div>

        {/* SWOT */}
        <div className="rounded-lg border border-gray-800 bg-gray-900/70 p-4 hover:border-gray-700 transition cursor-pointer" onClick={() => { setActiveMenu('SWOT Report'); setActiveScreen('swot-report'); }}>
          <div className="text-sm font-medium text-gray-200 mb-4">SWOT Analysis</div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { title: 'Strength', text: 'Strong in basics' },
              { title: 'Weakness', text: 'Time management' },
              { title: 'Opportunity', text: 'Advanced topics' },
              { title: 'Threat', text: 'Consistency needed' },
            ].map((item, i) => (
              <div key={i} className="bg-gray-800 p-3 rounded-md text-xs">
                <div className="font-medium text-gray-300 mb-1">{item.title}</div>
                <div className="text-gray-500">{item.text}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="rounded-lg border border-gray-800 bg-gray-900/70 p-4 hover:border-gray-700 transition cursor-pointer" onClick={() => { setActiveMenu('My Progress'); setActiveScreen('my-progress'); }}>
          <div className="text-sm font-medium text-gray-200 mb-4">Statistics</div>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Sessions</span>
              <span className="text-white font-medium">8</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Avg Accuracy</span>
              <span className="text-white font-medium">76%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Time Learned</span>
              <span className="text-white font-medium">3h 20m</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
