import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { analyzeQuizResults } from '../services/geminiService'
import {
  ArrowLeft,
  TrendingUp,
  Target,
  Award,
  AlertCircle,
  CheckCircle2,
  XCircle,
  BarChart3,
  Brain,
  Sun,
  Moon
} from 'lucide-react'

function Progress() {
  const [results, setResults] = useState(null)
  const [swotAnalysis, setSwotAnalysis] = useState(null)
  const [loadingSwot, setLoadingSwot] = useState(false)
  const navigate = useNavigate()

  // Theme management
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'dark'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'dark' ? 'light' : 'dark')
  }

  useEffect(() => {
    const storedResults = localStorage.getItem('quizResults')
    if (storedResults) {
      const parsedResults = JSON.parse(storedResults)
      setResults(parsedResults)

      // Generate AI SWOT analysis
      generateSwotAnalysis(parsedResults)
    }
  }, [])

  const generateSwotAnalysis = async (resultsData) => {
    setLoadingSwot(true)
    try {
      const swot = await analyzeQuizResults(
        resultsData.questions,
        resultsData.answers,
        resultsData.score,
        resultsData.total
      )
      setSwotAnalysis(swot)
    } catch (error) {
      console.error('Error generating SWOT:', error)
      // Use fallback SWOT based on actual performance
      const accuracy = resultsData.accuracy
      setSwotAnalysis({
        strength: accuracy >= 70 ? 'Strong understanding of core concepts demonstrated through quiz performance' : 'Willingness to engage with learning material and complete assessments',
        weakness: accuracy >= 70 ? 'Minor gaps in advanced topics that could benefit from review' : 'Fundamental concepts need reinforcement based on quiz results',
        opportunity: accuracy >= 70 ? 'Ready for more challenging material and advanced topics' : 'Significant room for growth through focused study and practice',
        threat: accuracy >= 70 ? 'Risk of overconfidence - maintain consistent study habits' : 'May fall behind without dedicated focus on weak areas'
      })
    } finally {
      setLoadingSwot(false)
    }
  }

  // Show empty state if no quiz attempted
  if (!results) {
    return (
      <div className="results-page fade-in">
        <div className="results-container">
          <div className="empty-results-state">
            <div className="empty-results-icon">
              <BarChart3 size={64} />
            </div>
            <h2>No Quiz Results Yet</h2>
            <p>Complete a quiz to see your performance analysis, scores, and AI-powered insights.</p>
            <button
              onClick={() => navigate('/dashboard')}
              className="btn btn-primary btn-large btn-icon mt-xl"
            >
              <ArrowLeft size={20} />
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    )
  }

  const { score, total, accuracy, documentName } = results
  const correctCount = score
  const wrongCount = total - score

  // Determine performance level
  const getPerformanceLevel = () => {
    if (accuracy >= 90) return { text: 'Outstanding', icon: '🌟' }
    if (accuracy >= 80) return { text: 'Excellent', icon: '🎉' }
    if (accuracy >= 70) return { text: 'Good', icon: '👍' }
    if (accuracy >= 60) return { text: 'Fair', icon: '📚' }
    return { text: 'Needs Improvement', icon: '💪' }
  }

  const performanceLevel = getPerformanceLevel()

  return (
    <div className="results-page fade-in">
      <div className="results-container">

        {/* Minimal Header */}
        <div className="results-header-minimal">
          <button
            onClick={() => navigate('/dashboard')}
            className="btn-minimal"
          >
            <ArrowLeft size={20} />
            Dashboard
          </button>
          <div className="results-meta">
            <span className="results-badge">Quiz Results</span>
            <button
              onClick={toggleTheme}
              className="theme-toggle"
              aria-label="Toggle theme"
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>
        </div>

        {/* Document Info */}
        <div className="results-document-info">
          <h1>Performance Analysis</h1>
          <p className="document-name">
            <Brain size={16} />
            {documentName}
          </p>
          <p className="completion-time">
            Completed: {new Date(results.completedAt).toLocaleString()}
          </p>
        </div>

        {/* Section 1: Score Summary */}
        <div className="results-section">
          <div className="section-header-results">
            <Target size={24} />
            <h2>Score & Accuracy</h2>
          </div>

          <div className="score-summary-grid">
            {/* Score Card */}
            <div className="score-card-main">
              <div className="score-display-large">
                <div className="score-number-large">{score}</div>
                <div className="score-divider">/</div>
                <div className="score-total">{total}</div>
              </div>
              <p className="score-label-main">Questions Correct</p>
            </div>

            {/* Accuracy Card */}
            <div className="accuracy-card-main">
              <div className="accuracy-circle">
                <svg width="120" height="120" viewBox="0 0 120 120">
                  <circle
                    cx="60"
                    cy="60"
                    r="54"
                    fill="none"
                    stroke="var(--color-bg-elevated)"
                    strokeWidth="8"
                  />
                  <circle
                    cx="60"
                    cy="60"
                    r="54"
                    fill="none"
                    stroke="var(--color-text-primary)"
                    strokeWidth="8"
                    strokeDasharray={`${(accuracy / 100) * 339.292} 339.292`}
                    strokeLinecap="round"
                    transform="rotate(-90 60 60)"
                  />
                  <text
                    x="60"
                    y="60"
                    textAnchor="middle"
                    dy="0.3em"
                    fontSize="28"
                    fontWeight="700"
                    fill="var(--color-text-primary)"
                  >
                    {accuracy}%
                  </text>
                </svg>
              </div>
              <p className="accuracy-label-main">Accuracy</p>
              <div className="performance-badge-main">
                <span className="performance-icon">{performanceLevel.icon}</span>
                <span>{performanceLevel.text}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Performance Charts */}
        <div className="results-section">
          <div className="section-header-results">
            <BarChart3 size={24} />
            <h2>Performance Charts</h2>
          </div>

          <div className="charts-grid">
            {/* Answer Distribution */}
            <div className="chart-card">
              <h3 className="chart-title-minimal">Answer Distribution</h3>
              <div className="bar-chart-container">
                <div className="bar-chart-item">
                  <div
                    className="bar-chart-bar bar-correct"
                    style={{ height: `${Math.max((correctCount / total) * 100, 10)}%` }}
                  >
                    <span className="bar-value">{correctCount}</span>
                  </div>
                  <div className="bar-chart-label">
                    <CheckCircle2 size={16} />
                    Correct
                  </div>
                </div>
                <div className="bar-chart-item">
                  <div
                    className="bar-chart-bar bar-wrong"
                    style={{ height: `${Math.max((wrongCount / total) * 100, 10)}%` }}
                  >
                    <span className="bar-value">{wrongCount}</span>
                  </div>
                  <div className="bar-chart-label">
                    <XCircle size={16} />
                    Wrong
                  </div>
                </div>
              </div>
            </div>

            {/* Accuracy Breakdown */}
            <div className="chart-card">
              <h3 className="chart-title-minimal">Accuracy Breakdown</h3>
              <div className="accuracy-breakdown">
                <div className="accuracy-stat">
                  <span className="stat-label">Your Score</span>
                  <span className="stat-value">{accuracy}%</span>
                </div>
                <div className="progress-bar-minimal">
                  <div
                    className="progress-fill-minimal"
                    style={{ width: `${accuracy}%` }}
                  />
                </div>
                <div className="benchmark-info">
                  <div className="benchmark-line">
                    <span>Benchmark: 70%</span>
                    {accuracy >= 70 ? (
                      <span className="benchmark-status success">
                        +{accuracy - 70}% above
                      </span>
                    ) : (
                      <span className="benchmark-status below">
                        {70 - accuracy}% below
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: SWOT Analysis */}
        <div className="results-section">
          <div className="section-header-results">
            <TrendingUp size={24} />
            <h2>SWOT Analysis</h2>
          </div>

          {loadingSwot ? (
            <div className="swot-loading">
              <Brain className="loading-spinner" size={32} />
              <p>Analyzing your performance with AI...</p>
            </div>
          ) : swotAnalysis ? (
            <div className="swot-grid-minimal">
              {/* Strengths */}
              <div className="swot-card-minimal">
                <div className="swot-header">
                  <Award size={20} />
                  <h4>Strengths</h4>
                </div>
                <p>{swotAnalysis.strength}</p>
              </div>

              {/* Weaknesses */}
              <div className="swot-card-minimal">
                <div className="swot-header">
                  <AlertCircle size={20} />
                  <h4>Weaknesses</h4>
                </div>
                <p>{swotAnalysis.weakness}</p>
              </div>

              {/* Opportunities */}
              <div className="swot-card-minimal">
                <div className="swot-header">
                  <Target size={20} />
                  <h4>Opportunities</h4>
                </div>
                <p>{swotAnalysis.opportunity}</p>
              </div>

              {/* Threats */}
              <div className="swot-card-minimal">
                <div className="swot-header">
                  <AlertCircle size={20} />
                  <h4>Threats</h4>
                </div>
                <p>{swotAnalysis.threat}</p>
              </div>
            </div>
          ) : null}
        </div>

        {/* Action Buttons */}
        <div className="results-actions">
          <button
            onClick={() => navigate('/dashboard')}
            className="btn btn-primary btn-large btn-icon"
          >
            <ArrowLeft size={20} />
            Back to Dashboard
          </button>
        </div>

      </div>
    </div>
  )
}

export default Progress
