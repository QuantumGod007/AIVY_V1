import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';
import './Landing.css';

function Landing() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState('overview');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [activeTab, setActiveTab] = useState('features');

  // Theme management
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'dark'
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'dark' ? 'light' : 'dark');
  };

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);

      // Scroll spy
      const sections = ['overview', 'features', 'vision', 'help'];
      const scrollPosition = window.scrollY + 200;

      for (const section of sections) {
        const element = document.getElementById(section);
        if (element) {
          const { offsetTop, offsetHeight } = element;
          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            setActiveSection(section);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-in');
          }
        });
      },
      { threshold: 0.1 }
    );

    document.querySelectorAll('.animate-on-scroll').forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveSection(id);
    }
  };

  return (
    <div className="landing">
      <nav className={`landing-nav ${isScrolled ? 'scrolled' : ''}`}>
        {!isScrolled ? (
          <div className="landing-nav-top">
            <div className="landing-logo">AIVY</div>
            <div className="landing-nav-center">
              <button
                onClick={() => scrollToSection('overview')}
                className={`landing-nav-text-link ${activeSection === 'overview' ? 'active' : ''}`}
              >
                Overview
              </button>
              <button
                onClick={() => scrollToSection('features')}
                className={`landing-nav-text-link ${activeSection === 'features' ? 'active' : ''}`}
              >
                Features
              </button>
              <button
                onClick={() => scrollToSection('vision')}
                className={`landing-nav-text-link ${activeSection === 'vision' ? 'active' : ''}`}
              >
                Vision
              </button>
              <button
                onClick={() => scrollToSection('help')}
                className={`landing-nav-text-link ${activeSection === 'help' ? 'active' : ''}`}
              >
                Learn
              </button>
            </div>
            <div className="landing-nav-right">
              <button
                onClick={toggleTheme}
                className="theme-toggle"
                aria-label="Toggle theme"
                title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
              </button>
              <Link to="/login" className="landing-nav-cta-outline">Sign in</Link>
              <Link to="/signup" className="landing-nav-cta-filled">Create account</Link>
            </div>
          </div>
        ) : (
          <div className="landing-nav-pill-container">
            <button
              onClick={() => scrollToSection('overview')}
              className={`landing-pill ${activeSection === 'overview' ? 'active' : ''}`}
            >
              Overview
            </button>
            <button
              onClick={() => scrollToSection('features')}
              className={`landing-pill ${activeSection === 'features' ? 'active' : ''}`}
            >
              Features
            </button>
            <button
              onClick={() => scrollToSection('vision')}
              className={`landing-pill ${activeSection === 'vision' ? 'active' : ''}`}
            >
              Vision
            </button>
            <button
              onClick={() => scrollToSection('help')}
              className={`landing-pill ${activeSection === 'help' ? 'active' : ''}`}
            >
              Learn
            </button>
          </div>
        )}
      </nav>

      <section className="landing-hero">
        <div className="landing-hero-bg"></div>
        <div className="landing-hero-content">
          <h1 className="landing-hero-title">Learn Smarter with AIVY</h1>
          <p className="landing-hero-subtitle" style={{ maxWidth: '700px', margin: '1.5rem auto' }}>
            Transform your study material into interactive quizzes, flashcards, and personalised learning experiences powered by AI.
          </p>
          <div className="landing-hero-actions">
            <Link to="/signup" className="landing-btn-primary">Get Started</Link>
            <button className="landing-btn-secondary">Watch Demo</button>
          </div>
        </div>
      </section>

      <section id="overview" className="landing-hero-secondary animate-on-scroll">
        <img src="/images/Vision Section.jpeg" alt="AI Learning" className="landing-hero-secondary-image" />
        <div className="landing-hero-secondary-overlay"></div>
        <div className="landing-hero-secondary-content">
          <h2 className="landing-hero-secondary-title">Study like never before.</h2>
          <p className="landing-hero-secondary-subtitle">Super-productive learning, powered by AI.</p>
          <p className="landing-hero-secondary-body">
            A learning system that adapts to you in real time — not the other way around.
          </p>
        </div>
      </section>

      <section id="features" className="landing-section landing-features-premium animate-on-scroll">
        <div className="landing-features-header">
          <div className="landing-features-label">AI Learning</div>
          <h2 className="landing-features-heading">Powerful features designed for serious learners</h2>
          <p className="landing-features-subtext">Everything you need to excel with AI-driven personalization</p>
        </div>

        <div className="landing-features-tabs">
          <button
            className={`landing-tab ${activeTab === 'features' ? 'active' : ''}`}
            onClick={() => setActiveTab('features')}
          >
            Features
          </button>
          <button
            className={`landing-tab ${activeTab === 'performance' ? 'active' : ''}`}
            onClick={() => setActiveTab('performance')}
          >
            Performance
          </button>
          <button
            className={`landing-tab ${activeTab === 'security' ? 'active' : ''}`}
            onClick={() => setActiveTab('security')}
          >
            Security
          </button>
        </div>

        <p className="landing-tab-subtitle">
          {activeTab === 'features' && 'AI-powered tools that adapt to your learning style'}
          {activeTab === 'performance' && 'Built for speed, reliability, and scale'}
          {activeTab === 'security' && 'Your data is protected with industry-leading security'}
        </p>

        <div className="landing-features-grid-spacious" key={activeTab}>
          {activeTab === 'features' && (
            <>
              <div className="landing-feature-card-spacious">
                <div className="landing-feature-icon">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" />
                  </svg>
                </div>
                <h3 className="landing-feature-card-title">Personalized Quizzes</h3>
                <p className="landing-feature-card-desc">AI-generated questions tailored to your knowledge level</p>
              </div>

              <div className="landing-feature-card-spacious">
                <div className="landing-feature-icon">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M3 3v18h18" />
                    <path d="M18 17V9l-5 5-3-3-4 4" />
                  </svg>
                </div>
                <h3 className="landing-feature-card-title">Smart Tracking</h3>
                <p className="landing-feature-card-desc">Visualize your progress with intelligent analytics</p>
              </div>

              <div className="landing-feature-card-spacious">
                <div className="landing-feature-icon">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M12 2L2 7l10 5 10-5-10-5z" />
                    <path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
                  </svg>
                </div>
                <h3 className="landing-feature-card-title">Adaptive Difficulty</h3>
                <p className="landing-feature-card-desc">Questions that scale with your growing expertise</p>
              </div>

              <div className="landing-feature-card-spacious">
                <div className="landing-feature-icon">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 6v6l4 2" />
                  </svg>
                </div>
                <h3 className="landing-feature-card-title">Goal-Based Learning</h3>
                <p className="landing-feature-card-desc">Set targets and watch your knowledge compound</p>
              </div>

              <div className="landing-feature-card-spacious">
                <div className="landing-feature-icon">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    <path d="M8 10h.01M12 10h.01M16 10h.01" />
                  </svg>
                </div>
                <h3 className="landing-feature-card-title">AI Assistant</h3>
                <p className="landing-feature-card-desc">Instant help whenever you're stuck</p>
              </div>

              <div className="landing-feature-card-spacious">
                <div className="landing-feature-icon">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <path d="M9 3v18M15 3v18M3 9h18M3 15h18" />
                  </svg>
                </div>
                <h3 className="landing-feature-card-title">Clean Analytics</h3>
                <p className="landing-feature-card-desc">Understand strengths and improvement areas</p>
              </div>
            </>
          )}

          {activeTab === 'performance' && (
            <>
              <div className="landing-feature-card-spacious">
                <div className="landing-feature-icon">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                  </svg>
                </div>
                <h3 className="landing-feature-card-title">Instant Quiz Generation</h3>
                <p className="landing-feature-card-desc">Create quizzes in real time</p>
              </div>

              <div className="landing-feature-card-spacious">
                <div className="landing-feature-icon">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                </div>
                <h3 className="landing-feature-card-title">Low Latency Feedback</h3>
                <p className="landing-feature-card-desc">Answers and explanations instantly</p>
              </div>

              <div className="landing-feature-card-spacious">
                <div className="landing-feature-icon">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="2" y="3" width="20" height="14" rx="2" />
                    <line x1="8" y1="21" x2="16" y2="21" />
                    <line x1="12" y1="17" x2="12" y2="21" />
                  </svg>
                </div>
                <h3 className="landing-feature-card-title">Reliable Infrastructure</h3>
                <p className="landing-feature-card-desc">Always available learning platform</p>
              </div>

              <div className="landing-feature-card-spacious">
                <div className="landing-feature-icon">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                  </svg>
                </div>
                <h3 className="landing-feature-card-title">Optimized Sessions</h3>
                <p className="landing-feature-card-desc">AI tunes study sessions in real time</p>
              </div>

              <div className="landing-feature-card-spacious">
                <div className="landing-feature-icon">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="5" y="2" width="14" height="20" rx="2" />
                    <line x1="12" y1="18" x2="12.01" y2="18" />
                  </svg>
                </div>
                <h3 className="landing-feature-card-title">Cross-Device Sync</h3>
                <p className="landing-feature-card-desc">Learn anywhere, anytime</p>
              </div>

              <div className="landing-feature-card-spacious">
                <div className="landing-feature-icon">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                  </svg>
                </div>
                <h3 className="landing-feature-card-title">Scalable System</h3>
                <p className="landing-feature-card-desc">Works smoothly for many users</p>
              </div>
            </>
          )}

          {activeTab === 'security' && (
            <>
              <div className="landing-feature-card-spacious">
                <div className="landing-feature-icon">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                </div>
                <h3 className="landing-feature-card-title">Data Encryption</h3>
                <p className="landing-feature-card-desc">Secure data storage and transfer</p>
              </div>

              <div className="landing-feature-card-spacious">
                <div className="landing-feature-icon">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                </div>
                <h3 className="landing-feature-card-title">Privacy-First Design</h3>
                <p className="landing-feature-card-desc">No selling of user data</p>
              </div>

              <div className="landing-feature-card-spacious">
                <div className="landing-feature-icon">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>
                <h3 className="landing-feature-card-title">Secure Login</h3>
                <p className="landing-feature-card-desc">Protected authentication system</p>
              </div>

              <div className="landing-feature-card-spacious">
                <div className="landing-feature-icon">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                </div>
                <h3 className="landing-feature-card-title">Safe AI Filters</h3>
                <p className="landing-feature-card-desc">Prevents harmful outputs</p>
              </div>

              <div className="landing-feature-card-spacious">
                <div className="landing-feature-icon">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </div>
                <h3 className="landing-feature-card-title">User Control</h3>
                <p className="landing-feature-card-desc">Export or delete your data</p>
              </div>

              <div className="landing-feature-card-spacious">
                <div className="landing-feature-icon">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                    <polyline points="10 9 9 9 8 9" />
                  </svg>
                </div>
                <h3 className="landing-feature-card-title">Compliance Ready</h3>
                <p className="landing-feature-card-desc">Industry data practices</p>
              </div>
            </>
          )}
        </div>

        <button onClick={() => setShowAdvanced(!showAdvanced)} className="landing-show-more-btn">
          {showAdvanced ? 'Hide advanced tools' : 'Show advanced tools'}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: showAdvanced ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.3s' }}>
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>

        {showAdvanced && (
          <div className="landing-features-grid-advanced">
            <div className="landing-feature-card-spacious">
              <div className="landing-feature-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                </svg>
              </div>
              <h3 className="landing-feature-card-title">Intelligent Study Sessions</h3>
              <p className="landing-feature-card-desc">Adaptive learning paths that evolve with you</p>
            </div>

            <div className="landing-feature-card-spacious">
              <div className="landing-feature-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </div>
              <h3 className="landing-feature-card-title">AI-Powered Insights</h3>
              <p className="landing-feature-card-desc">Deep analytics on your learning patterns</p>
            </div>

            <div className="landing-feature-card-spacious">
              <div className="landing-feature-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="3" y="3" width="7" height="7" />
                  <rect x="14" y="3" width="7" height="7" />
                  <rect x="14" y="14" width="7" height="7" />
                  <rect x="3" y="14" width="7" height="7" />
                </svg>
              </div>
              <h3 className="landing-feature-card-title">Beautiful Analytics</h3>
              <p className="landing-feature-card-desc">Clean, actionable progress visualization</p>
            </div>
          </div>
        )}
      </section>

      <section className="landing-hero-banner animate-on-scroll">
        <div className="landing-hero-banner-text" style={{ textAlign: 'left' }}>
          <h3 className="landing-hero-banner-title" style={{ fontSize: '2.5rem', marginBottom: '1.5rem' }}>Precision Learning</h3>
          <p className="landing-hero-banner-subtitle" style={{ fontSize: '1.1rem', lineHeight: '1.7', opacity: 0.9 }}>
            AIVY analyses your performance, adapts difficulty in real-time, and guides
            you with intelligent learning paths built around <strong>you</strong>.
          </p>
          <div style={{ marginTop: '2rem' }}>
            <Link to="/signup" className="landing-btn-primary" style={{ padding: '0.8rem 2rem' }}>Get Started Free</Link>
          </div>
        </div>
        <div className="landing-hero-banner-image-container">
          <img
            src="/images/aivy_study_workspace.png"
            alt="Student using AIVY AI learning dashboard"
            className="landing-hero-banner-image"
          />
        </div>
      </section>

      <section id="vision" className="landing-vision-clean animate-on-scroll">
        <div className="landing-vision-container">
          <h2 className="landing-vision-title">
            LEARNING SHOULD FEEL <span className="hover-word">DIFFERENT</span>.
          </h2>

          <div className="landing-vision-grid">
            <p className="landing-vision-item">Speed without pressure.</p>
            <p className="landing-vision-item">Memory without effort.</p>
            <p className="landing-vision-item">Focus without force.</p>
            <p className="landing-vision-item">Growth without noise.</p>
          </div>

          <p className="landing-vision-finale">
            Built differently.<br />
            For minds that move forward.
          </p>
        </div>
      </section>

      <section id="help" className="landing-learn animate-on-scroll">
        <div className="landing-learn-hero">
          <h1 className="landing-learn-title">Learn</h1>
          <p className="landing-learn-subtitle">AI that learns how you learn.</p>
        </div>

        <div className="landing-learn-section">
          <h2 className="landing-learn-heading">Start Here</h2>
          <div className="landing-learn-steps">
            <div className="landing-learn-step">
              <span className="landing-learn-step-number">1</span>
              <h3>Choose Your Topic</h3>
              <p>Select what you want to learn. AIVY adapts to your level.</p>
            </div>
            <div className="landing-learn-step">
              <span className="landing-learn-step-number">2</span>
              <h3>Study Smart</h3>
              <p>AI generates questions that match your progress in real time.</p>
            </div>
            <div className="landing-learn-step">
              <span className="landing-learn-step-number">3</span>
              <h3>Track Growth</h3>
              <p>See your improvement with clear metrics and insights.</p>
            </div>
          </div>
        </div>

        <div className="landing-learn-section">
          <h2 className="landing-learn-heading">Study Smarter</h2>
          <div className="landing-learn-tips">
            <div className="landing-learn-tip">
              <h3>Focus in blocks</h3>
              <p>25 minutes on, 5 minutes off. Deep work beats long hours.</p>
            </div>
            <div className="landing-learn-tip">
              <h3>Review early</h3>
              <p>Revisit new material within 24 hours for better retention.</p>
            </div>
            <div className="landing-learn-tip">
              <h3>Explain it simply</h3>
              <p>If you can't teach it, you don't understand it yet.</p>
            </div>
            <div className="landing-learn-tip">
              <h3>Stay consistent</h3>
              <p>Daily practice beats weekend cramming every time.</p>
            </div>
          </div>
        </div>

        <div className="landing-learn-section">
          <h2 className="landing-learn-heading">How AIVY Thinks</h2>
          <div className="landing-learn-ai">
            <p className="landing-learn-ai-text">
              AIVY uses spaced repetition to surface content at optimal intervals. It tracks your responses to identify weak areas and adjusts difficulty in real time. The system learns your pace, preferences, and patterns to create a personalized learning path that evolves with you.
            </p>
          </div>
        </div>

      </section>

      <section className="aivy-marquee">
        <div className="marquee-row speed1">
          <div className="track">
            <p>FOCUS · CLARITY · MEMORY · FLOW · THINKING · GROWTH · DISCIPLINE · AIVY ·</p>
            <p>FOCUS · CLARITY · MEMORY · FLOW · THINKING · GROWTH · DISCIPLINE · AIVY ·</p>
          </div>
        </div>

        <div className="marquee-row speed2">
          <div className="track">
            <p>LEARN · THINK · BUILD · REFINE · REPEAT ·</p>
            <p>LEARN · THINK · BUILD · REFINE · REPEAT ·</p>
          </div>
        </div>

        <div className="marquee-row speed3">
          <div className="track">
            <p>INTELLIGENCE · INSIGHT · MOMENTUM · CLARITY ·</p>
            <p>INTELLIGENCE · INSIGHT · MOMENTUM · CLARITY ·</p>
          </div>
        </div>

        <div className="marquee-row speed4">
          <div className="track">
            <p>CALM · CONTROL · DEPTH · FOCUS ·</p>
            <p>CALM · CONTROL · DEPTH · FOCUS ·</p>
          </div>
        </div>
      </section>

      <section className="landing-cta animate-on-scroll">
        <div className="landing-cta-content">
          <h2 className="landing-cta-title">Start building your future with AIVY</h2>
          <p className="landing-cta-subtitle">Join thousands of learners achieving their goals</p>
          <div className="landing-cta-actions">
            <Link to="/signup" className="landing-btn-primary">Create Account</Link>
            <Link to="/login" className="landing-btn-secondary">Sign In</Link>
          </div>
        </div>
      </section>

      <div id="footer-text">
        <div className="connect-wrap">
          <span className="connect-solid">LET'S CONNECT</span>
          <span className="connect-outline">LET'S CONNECT</span>
        </div>
      </div>

      <footer className="landing-footer">
        <div className="landing-footer-content">
          <div className="landing-footer-brand">
            <div className="landing-logo">AIVY</div>
            <p>Smarter learning for everyone</p>
          </div>
          <div className="landing-footer-links">
            <div className="landing-footer-col">
              <h4>Product</h4>
              <a href="#features">Features</a>
              <a href="#vision">Vision</a>
              <a href="#help">Learn</a>
            </div>
            <div className="landing-footer-col">
              <h4>Company</h4>
              <a href="#about">About</a>
              <a href="#careers">Careers</a>
              <a href="#contact">Contact</a>
            </div>
            <div className="landing-footer-col">
              <h4>Legal</h4>
              <a href="#privacy">Privacy</a>
              <a href="#terms">Terms</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Landing;
