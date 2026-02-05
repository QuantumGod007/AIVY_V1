import { useState } from 'react'
import { Link } from 'react-router-dom'

const topics = [
  { id: 'javascript', name: 'JavaScript', icon: '🟨' },
  { id: 'react', name: 'React', icon: '⚛️' },
  { id: 'dsa', name: 'Data Structures', icon: '🔗' },
  { id: 'system', name: 'System Design', icon: '🏗️' },
  { id: 'web', name: 'Web Development', icon: '🌐' },
  { id: 'ai', name: 'AI & ML', icon: '🤖' }
]

const difficulties = [
  { id: 'beginner', name: 'Beginner', desc: 'New to the topic' },
  { id: 'intermediate', name: 'Intermediate', desc: 'Some experience' },
  { id: 'advanced', name: 'Advanced', desc: 'Deep knowledge' }
]

const goals = [
  { id: 'practice', name: 'Practice', desc: 'Reinforce what I know' },
  { id: 'learn', name: 'Learn', desc: 'Discover new concepts' },
  { id: 'test', name: 'Test me', desc: 'Challenge my knowledge' }
]

const sampleQuestions = [
  {
    id: 1,
    question: "What is the correct way to create a React component?",
    options: [
      "function Component() { return <div>Hello</div> }",
      "const Component = () => <div>Hello</div>",
      "class Component extends React.Component { render() { return <div>Hello</div> } }",
      "All of the above"
    ],
    correct: 3
  },
  {
    id: 2,
    question: "Which hook is used for side effects in React?",
    options: ["useState", "useEffect", "useContext", "useReducer"],
    correct: 1
  },
  {
    id: 3,
    question: "What does JSX stand for?",
    options: ["JavaScript XML", "Java Syntax Extension", "JavaScript Extension", "Java XML"],
    correct: 0
  }
]

function Quiz() {
  const [step, setStep] = useState('setup') // setup, loading, quiz, results
  const [selectedTopic, setSelectedTopic] = useState('')
  const [selectedDifficulty, setSelectedDifficulty] = useState('')
  const [selectedGoal, setSelectedGoal] = useState('')
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState(null)
  const [answers, setAnswers] = useState([])
  const [score, setScore] = useState(0)

  const handleStartQuiz = () => {
    if (!selectedTopic || !selectedDifficulty || !selectedGoal) return
    setStep('loading')
    setTimeout(() => setStep('quiz'), 2000)
  }

  const handleAnswerSelect = (index) => {
    setSelectedAnswer(index)
  }

  const handleNext = () => {
    const isCorrect = selectedAnswer === sampleQuestions[currentQuestion].correct
    setAnswers([...answers, { questionId: currentQuestion, selected: selectedAnswer, correct: isCorrect }])

    if (isCorrect) {
      setScore(score + 1)
    }

    if (currentQuestion + 1 < sampleQuestions.length) {
      setCurrentQuestion(currentQuestion + 1)
      setSelectedAnswer(null)
    } else {
      setStep('results')
    }
  }

  // STEP 1: Personalization
  if (step === 'setup') {
    return (
      <div className="nb-card" style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 'var(--nb-space-2xl)' }}>
          <div style={{ fontSize: '48px', marginBottom: 'var(--nb-space-md)' }}>🎯</div>
          <div className="nb-card-title" style={{ fontSize: '32px', marginBottom: 'var(--nb-space-sm)' }}>
            Create Your Quiz
          </div>
          <div className="nb-card-subtitle" style={{ fontSize: '16px' }}>
            Personalize your learning experience with AI-powered questions
          </div>
        </div>

        <div className="nb-mb-xl">
          <h3 className="nb-h3" style={{ marginBottom: 'var(--nb-space-lg)', fontSize: '18px' }}>📚 Choose Topic</h3>
          <div className="nb-flex" style={{ flexWrap: 'wrap', gap: 'var(--nb-space-md)' }}>
            {topics.map(topic => (
              <div
                key={topic.id}
                className={`nb-chip ${selectedTopic === topic.id ? 'selected' : ''}`}
                onClick={() => setSelectedTopic(topic.id)}
                style={{
                  padding: '14px 24px',
                  fontSize: '15px',
                  fontWeight: '500',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  cursor: 'pointer'
                }}
              >
                <span style={{ marginRight: '10px', fontSize: '18px' }}>{topic.icon}</span>
                {topic.name}
              </div>
            ))}
          </div>
        </div>

        <div className="nb-mb-xl">
          <h3 className="nb-h3" style={{ marginBottom: 'var(--nb-space-lg)', fontSize: '18px' }}>🎚️ Difficulty Level</h3>
          <div className="nb-grid nb-grid-3 nb-gap-md">
            {difficulties.map(diff => (
              <div
                key={diff.id}
                className={`nb-card ${selectedDifficulty === diff.id ? 'selected' : ''}`}
                onClick={() => setSelectedDifficulty(diff.id)}
                style={{
                  cursor: 'pointer',
                  padding: 'var(--nb-space-xl)',
                  borderColor: selectedDifficulty === diff.id ? 'var(--nb-accent)' : 'var(--nb-border)',
                  background: selectedDifficulty === diff.id ? 'rgba(66, 133, 244, 0.08)' : 'var(--nb-glass)',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
              >
                <div style={{ fontWeight: '600', marginBottom: '6px', fontSize: '16px' }}>{diff.name}</div>
                <div style={{ fontSize: '13px', color: 'var(--nb-text-muted)' }}>{diff.desc}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="nb-mb-xl">
          <h3 className="nb-h3" style={{ marginBottom: 'var(--nb-space-lg)', fontSize: '18px' }}>🎯 Learning Goal</h3>
          <div className="nb-grid nb-grid-3 nb-gap-md">
            {goals.map(goal => (
              <div
                key={goal.id}
                className={`nb-card ${selectedGoal === goal.id ? 'selected' : ''}`}
                onClick={() => setSelectedGoal(goal.id)}
                style={{
                  cursor: 'pointer',
                  padding: 'var(--nb-space-xl)',
                  borderColor: selectedGoal === goal.id ? 'var(--nb-accent)' : 'var(--nb-border)',
                  background: selectedGoal === goal.id ? 'rgba(66, 133, 244, 0.08)' : 'var(--nb-glass)',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
              >
                <div style={{ fontWeight: '600', marginBottom: '6px', fontSize: '16px' }}>{goal.name}</div>
                <div style={{ fontSize: '13px', color: 'var(--nb-text-muted)' }}>{goal.desc}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="nb-flex nb-justify-between" style={{
          paddingTop: 'var(--nb-space-xl)',
          borderTop: '1px solid var(--nb-border)'
        }}>
          <Link to="/dashboard" className="nb-btn nb-btn-ghost" style={{ padding: '12px 24px' }}>
            ← Back to Dashboard
          </Link>
          <button
            onClick={handleStartQuiz}
            className="nb-btn nb-btn-primary"
            disabled={!selectedTopic || !selectedDifficulty || !selectedGoal}
            style={{
              opacity: (!selectedTopic || !selectedDifficulty || !selectedGoal) ? 0.5 : 1,
              padding: '12px 32px',
              fontSize: '15px',
              fontWeight: '600'
            }}
          >
            🚀 Generate Quiz
          </button>
        </div>
      </div>
    )
  }

  // STEP 2: AI Loading
  if (step === 'loading') {
    return (
      <div className="nb-card" style={{ maxWidth: '500px', margin: '0 auto', textAlign: 'center' }}>
        <div style={{ fontSize: '64px', marginBottom: 'var(--nb-space-xl)' }}>🤖</div>
        <div className="nb-card-title" style={{ fontSize: '28px', marginBottom: 'var(--nb-space-sm)' }}>
          Generating Your Quiz...
        </div>
        <div className="nb-card-subtitle" style={{ fontSize: '15px', marginBottom: 'var(--nb-space-2xl)' }}>
          AI is crafting personalized questions just for you
        </div>
        <div style={{
          width: '100%',
          height: '6px',
          background: 'var(--nb-surface)',
          borderRadius: '3px',
          overflow: 'hidden',
          marginTop: 'var(--nb-space-xl)'
        }}>
          <div style={{
            width: '60%',
            height: '100%',
            background: 'linear-gradient(90deg, #4285f4 0%, #34a853 100%)',
            animation: 'loading 2s ease-in-out infinite'
          }}></div>
        </div>
        <div style={{
          marginTop: 'var(--nb-space-xl)',
          fontSize: '13px',
          color: 'var(--nb-text-muted)'
        }}>
          This usually takes a few seconds...
        </div>
      </div>
    )
  }

  // STEP 4: Results
  if (step === 'results') {
    const percentage = Math.round((score / sampleQuestions.length) * 100)
    return (
      <div className="nb-card" style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
        <div style={{ fontSize: '80px', marginBottom: 'var(--nb-space-lg)' }}>
          {percentage >= 80 ? '🎉' : percentage >= 60 ? '👏' : '💪'}
        </div>
        <div className="nb-card-title" style={{ fontSize: '32px', marginBottom: 'var(--nb-space-md)' }}>
          Quiz Complete!
        </div>
        <div style={{
          fontSize: '64px',
          fontWeight: '800',
          background: 'linear-gradient(135deg, #4285f4 0%, #34a853 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          margin: 'var(--nb-space-xl) 0',
          letterSpacing: '-0.02em'
        }}>
          {score}/{sampleQuestions.length}
        </div>
        <div style={{
          fontSize: '20px',
          fontWeight: '600',
          color: percentage >= 80 ? 'var(--nb-success)' : percentage >= 60 ? 'var(--nb-accent)' : 'var(--nb-warning)',
          marginBottom: 'var(--nb-space-md)'
        }}>
          {percentage}% Score
        </div>
        <div className="nb-card-subtitle" style={{ marginBottom: 'var(--nb-space-2xl)', fontSize: '15px' }}>
          {percentage >= 80 ? 'Excellent work! You\'ve mastered this topic.' :
            percentage >= 60 ? 'Great job! Keep practicing to improve.' :
              'Good effort! Review the concepts and try again.'}
        </div>

        <div className="nb-card" style={{
          marginBottom: 'var(--nb-space-2xl)',
          textAlign: 'left',
          background: 'rgba(66, 133, 244, 0.05)',
          borderColor: 'rgba(66, 133, 244, 0.2)'
        }}>
          <div className="nb-card-title" style={{ fontSize: '18px' }}>🤖 AI Analysis</div>
          <div style={{ color: 'var(--nb-text-secondary)', fontSize: '14px', lineHeight: '1.6' }}>
            Based on your performance, we recommend focusing on React hooks and component lifecycle methods
            to strengthen your understanding.
          </div>
        </div>

        <div className="nb-flex nb-gap-md nb-justify-between">
          <Link to="/dashboard" className="nb-btn nb-btn-secondary" style={{
            flex: 1,
            padding: '14px 24px',
            fontSize: '15px'
          }}>
            ← Dashboard
          </Link>
          <button onClick={() => window.location.reload()} className="nb-btn nb-btn-primary" style={{
            flex: 1,
            padding: '14px 24px',
            fontSize: '15px',
            fontWeight: '600'
          }}>
            🔄 New Quiz
          </button>
        </div>
      </div>
    )
  }

  // STEP 3: Quiz Screen
  const question = sampleQuestions[currentQuestion]
  const progress = ((currentQuestion + 1) / sampleQuestions.length) * 100

  return (
    <div className="nb-card" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div className="nb-mb-xl">
        <div className="nb-flex nb-justify-between nb-items-center nb-mb-md">
          <span style={{ fontSize: '15px', color: 'var(--nb-text-secondary)', fontWeight: '500' }}>
            Question {currentQuestion + 1} of {sampleQuestions.length}
          </span>
          <span style={{
            fontSize: '15px',
            color: 'var(--nb-accent)',
            fontWeight: '600',
            padding: '6px 12px',
            background: 'rgba(66, 133, 244, 0.1)',
            borderRadius: '12px'
          }}>
            {Math.round(progress)}% Complete
          </span>
        </div>
        <div className="nb-progress" style={{ height: '8px' }}>
          <div className="nb-progress-fill" style={{
            width: `${progress}%`,
            background: 'linear-gradient(90deg, #4285f4 0%, #34a853 100%)'
          }}></div>
        </div>
      </div>

      <h2 className="nb-h2" style={{
        marginBottom: 'var(--nb-space-2xl)',
        fontSize: '26px',
        lineHeight: '1.4',
        fontWeight: '600'
      }}>
        {question.question}
      </h2>

      <div className="nb-mb-xl">
        {question.options.map((option, index) => (
          <div
            key={index}
            className={`nb-quiz-option ${selectedAnswer === index ? 'selected' : ''}`}
            onClick={() => handleAnswerSelect(index)}
            style={{
              padding: 'var(--nb-space-xl)',
              fontSize: '15px',
              fontWeight: '500',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              cursor: 'pointer'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                border: selectedAnswer === index ? '2px solid var(--nb-accent)' : '2px solid var(--nb-border)',
                background: selectedAnswer === index ? 'var(--nb-accent)' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
              }}>
                {selectedAnswer === index && (
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'white' }}></div>
                )}
              </div>
              <span>{option}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="nb-flex nb-justify-between nb-items-center" style={{
        paddingTop: 'var(--nb-space-xl)',
        borderTop: '1px solid var(--nb-border)'
      }}>
        <div style={{ fontSize: '14px', color: 'var(--nb-text-muted)' }}>
          {selectedAnswer !== null ? '✓ Answer selected' : 'Select an answer to continue'}
        </div>
        <button
          onClick={handleNext}
          disabled={selectedAnswer === null}
          className="nb-btn nb-btn-primary"
          style={{
            opacity: selectedAnswer === null ? 0.5 : 1,
            cursor: selectedAnswer === null ? 'not-allowed' : 'pointer',
            padding: '12px 28px',
            fontSize: '15px',
            fontWeight: '600'
          }}
        >
          {currentQuestion + 1 === sampleQuestions.length ? 'Finish Quiz →' : 'Next Question →'}
        </button>
      </div>
    </div>
  )
}

export default Quiz

// Add loading animation keyframes
const style = document.createElement('style')
style.textContent = `
  @keyframes loading {
    0% { transform: translateX(-100%); }
    50% { transform: translateX(0%); }
    100% { transform: translateX(100%); }
  }
`
document.head.appendChild(style)
