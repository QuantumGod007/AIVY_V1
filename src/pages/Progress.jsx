function Progress() {
  const sampleData = [
    { date: '2024-01-15', score: 95, topic: 'React Hooks', questions: 10 },
    { date: '2024-01-14', score: 87, topic: 'JavaScript ES6', questions: 15 },
    { date: '2024-01-13', score: 78, topic: 'CSS Flexbox', questions: 12 },
    { date: '2024-01-12', score: 92, topic: 'HTML Semantics', questions: 8 },
    { date: '2024-01-11', score: 85, topic: 'Web APIs', questions: 14 }
  ]

  const averageScore = Math.round(sampleData.reduce((acc, item) => acc + item.score, 0) / sampleData.length)
  const totalQuizzes = sampleData.length

  const getScoreColor = (score) => {
    if (score >= 90) return 'var(--nb-success)'
    if (score >= 75) return 'var(--nb-accent)'
    return 'var(--nb-warning)'
  }

  return (
    <div>
      <div className="nb-mb-xl" style={{
        padding: 'var(--nb-space-xl) 0',
        borderBottom: '1px solid var(--nb-border)'
      }}>
        <h1 className="nb-h1" style={{ fontSize: '36px', marginBottom: '8px' }}>
          📊 Learning Progress
        </h1>
        <p className="nb-text" style={{ fontSize: '16px' }}>
          Track your quiz performance and learning journey
        </p>
      </div>

      <div className="nb-card nb-mb-lg" style={{ marginTop: 'var(--nb-space-xl)' }}>
        <div className="nb-card-title" style={{ fontSize: '24px' }}>Performance Summary</div>
        <div className="nb-card-subtitle" style={{ fontSize: '15px' }}>Your overall learning statistics</div>

        <div className="nb-grid nb-grid-3 nb-gap-lg" style={{ marginTop: 'var(--nb-space-xl)' }}>
          <div style={{
            textAlign: 'center',
            padding: 'var(--nb-space-xl)',
            background: 'rgba(66, 133, 244, 0.05)',
            borderRadius: 'var(--nb-radius-lg)',
            border: '1px solid rgba(66, 133, 244, 0.15)'
          }}>
            <div style={{ fontSize: '48px', fontWeight: '800', color: 'var(--nb-accent)', marginBottom: '12px' }}>
              {averageScore}%
            </div>
            <div style={{ fontSize: '14px', color: 'var(--nb-text-muted)', fontWeight: '500' }}>Average Score</div>
          </div>
          <div style={{
            textAlign: 'center',
            padding: 'var(--nb-space-xl)',
            background: 'rgba(52, 168, 83, 0.05)',
            borderRadius: 'var(--nb-radius-lg)',
            border: '1px solid rgba(52, 168, 83, 0.15)'
          }}>
            <div style={{ fontSize: '48px', fontWeight: '800', color: 'var(--nb-success)', marginBottom: '12px' }}>
              {totalQuizzes}
            </div>
            <div style={{ fontSize: '14px', color: 'var(--nb-text-muted)', fontWeight: '500' }}>Quizzes Completed</div>
          </div>
          <div style={{
            textAlign: 'center',
            padding: 'var(--nb-space-xl)',
            background: 'rgba(251, 188, 4, 0.05)',
            borderRadius: 'var(--nb-radius-lg)',
            border: '1px solid rgba(251, 188, 4, 0.15)'
          }}>
            <div style={{ fontSize: '48px', fontWeight: '800', color: 'var(--nb-warning)', marginBottom: '12px' }}>
              5
            </div>
            <div style={{ fontSize: '14px', color: 'var(--nb-text-muted)', fontWeight: '500' }}>Day Streak 🔥</div>
          </div>
        </div>

        <div style={{
          marginTop: 'var(--nb-space-2xl)',
          padding: 'var(--nb-space-xl)',
          background: averageScore >= 85 ? 'rgba(52, 168, 83, 0.08)' : 'rgba(251, 188, 4, 0.08)',
          borderRadius: 'var(--nb-radius-lg)',
          border: `1px solid ${averageScore >= 85 ? 'rgba(52, 168, 83, 0.2)' : 'rgba(251, 188, 4, 0.2)'}`,
          textAlign: 'center'
        }}>
          <div style={{ fontWeight: '600', marginBottom: '8px', fontSize: '18px' }}>
            {averageScore >= 85 ? '🎉 Excellent Progress!' : '💪 Keep Learning!'}
          </div>
          <div style={{ fontSize: '14px', color: 'var(--nb-text-secondary)', lineHeight: '1.5' }}>
            {averageScore >= 85
              ? 'You\'re mastering your topics with consistent high scores'
              : 'Focus on reviewing concepts to improve your performance'
            }
          </div>
        </div>
      </div>

      <div className="nb-card nb-mb-lg">
        <div className="nb-card-title" style={{ fontSize: '20px' }}>Recent Activity</div>
        <div className="nb-card-subtitle" style={{ fontSize: '15px' }}>Your latest quiz attempts and scores</div>

        <div className="nb-flex-col nb-gap-sm" style={{ marginTop: 'var(--nb-space-xl)' }}>
          {sampleData.map((item, index) => (
            <div key={index} className="nb-flex nb-justify-between nb-items-center" style={{
              padding: 'var(--nb-space-xl)',
              background: 'var(--nb-glass)',
              border: '1px solid var(--nb-border)',
              borderRadius: 'var(--nb-radius-lg)',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              cursor: 'pointer'
            }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--nb-border-strong)'
                e.currentTarget.style.transform = 'translateY(-2px)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--nb-border)'
                e.currentTarget.style.transform = 'translateY(0)'
              }}
            >
              <div>
                <div style={{ fontWeight: '600', marginBottom: '6px', fontSize: '15px' }}>{item.topic}</div>
                <div style={{ fontSize: '13px', color: 'var(--nb-text-muted)' }}>
                  {item.date} • {item.questions} questions
                </div>
              </div>
              <div style={{
                padding: '8px 16px',
                borderRadius: '20px',
                fontWeight: '700',
                fontSize: '14px',
                background: getScoreColor(item.score),
                color: 'white'
              }}>
                {item.score}%
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="nb-card">
        <div className="nb-card-title" style={{ fontSize: '20px' }}>🤖 AI Insights</div>
        <div className="nb-card-subtitle" style={{ fontSize: '15px' }}>Personalized recommendations for improvement</div>

        <div className="nb-grid nb-grid-2 nb-gap-lg" style={{ marginTop: 'var(--nb-space-xl)' }}>
          <div style={{
            padding: 'var(--nb-space-lg)',
            background: 'rgba(52, 168, 83, 0.05)',
            borderRadius: 'var(--nb-radius-md)',
            border: '1px solid rgba(52, 168, 83, 0.1)'
          }}>
            <div style={{ fontWeight: '600', marginBottom: '12px', color: 'var(--nb-success)', fontSize: '16px' }}>
              ✓ Strengths
            </div>
            <ul style={{ color: 'var(--nb-text-secondary)', fontSize: '14px', lineHeight: '1.8', paddingLeft: '20px', margin: 0 }}>
              <li>Consistent performance in React concepts</li>
              <li>Strong understanding of JavaScript fundamentals</li>
              <li>Regular study habits</li>
            </ul>
          </div>
          <div style={{
            padding: 'var(--nb-space-lg)',
            background: 'rgba(251, 188, 4, 0.05)',
            borderRadius: 'var(--nb-radius-md)',
            border: '1px solid rgba(251, 188, 4, 0.1)'
          }}>
            <div style={{ fontWeight: '600', marginBottom: '12px', color: 'var(--nb-warning)', fontSize: '16px' }}>
              💡 Focus Areas
            </div>
            <ul style={{ color: 'var(--nb-text-secondary)', fontSize: '14px', lineHeight: '1.8', paddingLeft: '20px', margin: 0 }}>
              <li>CSS layout techniques need more practice</li>
              <li>Review advanced JavaScript concepts</li>
              <li>Practice more system design questions</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Progress
