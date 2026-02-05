import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { createUserWithEmailAndPassword, sendEmailVerification, GoogleAuthProvider, OAuthProvider, signInWithPopup } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../firebase";
import './SignupNew.css';

const goals = [
  { id: 'exam', icon: '📚', label: 'Exam Prep', desc: 'Ace your tests' },
  { id: 'practice', icon: '💪', label: 'Practice', desc: 'Build skills' },
  { id: 'explore', icon: '🔍', label: 'Explore', desc: 'Learn new topics' },
  { id: 'mastery', icon: '🎯', label: 'Mastery', desc: 'Deep expertise' }
];

const subjects = [
  'JavaScript', 'React', 'Python', 'Data Structures',
  'System Design', 'AI & ML', 'Web Dev', 'Databases'
];

const levels = [
  { id: 'beginner', label: 'Beginner', desc: 'Just starting out' },
  { id: 'intermediate', label: 'Intermediate', desc: 'Some experience' },
  { id: 'advanced', label: 'Advanced', desc: 'Deep knowledge' }
];

function Signup() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    goal: "",
    subjects: [],
    level: ""
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const toggleSubject = (subject) => {
    setFormData(prev => ({
      ...prev,
      subjects: prev.subjects.includes(subject)
        ? prev.subjects.filter(s => s !== subject)
        : [...prev.subjects, subject]
    }));
  };

  const handleNext = () => {
    setError("");
    setStep(step + 1);
  };

  const handleGoogleSignUp = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      
      await setDoc(doc(db, "users", result.user.uid), {
        name: result.user.displayName,
        email: result.user.email,
        points: 0,
        level: 1,
        createdAt: new Date(),
      });
      
      navigate("/dashboard");
    } catch (err) {
      if (err.code === 'auth/account-exists-with-different-credential') {
        setError('This email is already registered with GitHub. Please use GitHub sign-in.');
      } else {
        setError(err.message);
      }
    }
  };

  const handleGithubSignUp = async () => {
    try {
      const provider = new OAuthProvider('github.com');
      const result = await signInWithPopup(auth, provider);
      
      await setDoc(doc(db, "users", result.user.uid), {
        name: result.user.displayName || 'GitHub User',
        email: result.user.email,
        points: 0,
        level: 1,
        createdAt: new Date(),
      });
      
      navigate("/dashboard");
    } catch (err) {
      if (err.code === 'auth/account-exists-with-different-credential') {
        setError('This email is already registered with Google. Please use Google sign-in.');
      } else {
        setError(err.message);
      }
    }
  };

  const handleSubmit = async () => {
    if (!formData.goal || formData.subjects.length === 0 || !formData.level) {
      setError("Please complete all personalization steps");
      return;
    }

    try {
      setLoading(true);
      const user = auth.currentUser;
      
      if (user) {
        await setDoc(doc(db, "users", user.uid), {
          name: formData.name,
          email: formData.email,
          points: 0,
          level: 1,
          goal: formData.goal,
          subjects: formData.subjects,
          learningLevel: formData.level,
          createdAt: new Date(),
        }, { merge: true });
      }

      await auth.signOut();
      navigate("/login", { state: { message: "Account created! Check your email and verify before logging in." } });
    } catch (err) {
      setError('An error occurred during setup');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signup-split">
      <Link to="/" className="back-button">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 12H5M12 19l-7-7 7-7"/>
        </svg>
        Back
      </Link>
      {step === 1 && (
        <>
          <div className="signup-left">
            <div className="signup-brand-card">
              <div className="signup-logo">
                <div className="signup-logo-icon">A</div>
                <div className="signup-logo-text">AIVY</div>
              </div>
              <h1 className="signup-brand-title">Get Started with Us</h1>
              <p className="signup-brand-subtitle">Complete these easy steps to register your account.</p>
              <div className="signup-steps">
                <div className="signup-step-item active primary">Sign up your account</div>
                <Link to="/login" className="signup-step-item clickable">
                  Already a user? Sign In
                </Link>
                <Link to="/privacy-policy" className="signup-step-item clickable">
                  Privacy Policy
                </Link>
              </div>
            </div>
          </div>

          <div className="signup-right">
            <div className="signup-form-container">
              <h2 className="signup-form-title">Sign Up Account</h2>
              <p className="signup-form-subtitle">Enter your personal data to create your account.</p>

              {error && <div className="signup-error">{error}</div>}

              <div className="signup-social-buttons" style={{ flexDirection: 'column', gap: '1rem' }}>
                <button onClick={handleGoogleSignUp} className="signup-social-btn" style={{ width: '100%', justifyContent: 'center' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Continue with Google
                </button>
                <button onClick={handleGithubSignUp} className="signup-social-btn" style={{ width: '100%', justifyContent: 'center' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                  </svg>
                  Continue with GitHub
                </button>
              </div>

              <div className="signup-footer-text">
                Already have an account? <Link to="/login">Log in</Link>
              </div>
            </div>
          </div>
        </>
      )}

      {step === 2 && (
          <div className="onboarding-container">
            <div className="onboarding-step">
              <div className="step-indicator">
                <div className="step-dot active"></div>
                <div className="step-dot"></div>
                <div className="step-dot"></div>
              </div>

              <h2 className="step-title">What's your goal?</h2>
              <p className="step-subtitle">Choose what you want to achieve with AIVY</p>

              <div className="option-grid">
                {goals.map(goal => (
                  <div
                    key={goal.id}
                    className={`option-card ${formData.goal === goal.id ? 'selected' : ''}`}
                    onClick={() => setFormData(prev => ({ ...prev, goal: goal.id }))}
                  >
                    <div className="option-icon">{goal.icon}</div>
                    <div className="option-label">{goal.label}</div>
                    <div className="option-desc">{goal.desc}</div>
                  </div>
                ))}
              </div>

              {error && <div className="auth-error">{error}</div>}

              <div className="step-actions">
                <button onClick={() => setStep(1)} className="btn-back">Back</button>
                <button onClick={handleNext} className="btn-next" disabled={!formData.goal}>
                  Next
                </button>
              </div>
            </div>
          </div>
        )}

      {step === 3 && (
          <div className="onboarding-container">
            <div className="onboarding-step">
              <div className="step-indicator">
                <div className="step-dot"></div>
                <div className="step-dot active"></div>
                <div className="step-dot"></div>
              </div>

              <h2 className="step-title">What interests you?</h2>
              <p className="step-subtitle">Select topics you want to learn (choose multiple)</p>

              <div className="chip-container">
                {subjects.map(subject => (
                  <div
                    key={subject}
                    className={`interest-chip ${formData.subjects.includes(subject) ? 'selected' : ''}`}
                    onClick={() => toggleSubject(subject)}
                  >
                    {subject}
                  </div>
                ))}
              </div>

              {error && <div className="auth-error">{error}</div>}

              <div className="step-actions">
                <button onClick={() => setStep(2)} className="btn-back">Back</button>
                <button onClick={handleNext} className="btn-next" disabled={formData.subjects.length === 0}>
                  Next
                </button>
              </div>
            </div>
          </div>
        )}

      {step === 4 && (
          <div className="onboarding-container">
            <div className="onboarding-step">
              <div className="step-indicator">
                <div className="step-dot"></div>
                <div className="step-dot"></div>
                <div className="step-dot active"></div>
              </div>

              <h2 className="step-title">Your experience level?</h2>
              <p className="step-subtitle">Help us personalize your learning experience</p>

              <div className="option-grid">
                {levels.map(level => (
                  <div
                    key={level.id}
                    className={`option-card ${formData.level === level.id ? 'selected' : ''}`}
                    onClick={() => setFormData(prev => ({ ...prev, level: level.id }))}
                  >
                    <div className="option-label">{level.label}</div>
                    <div className="option-desc">{level.desc}</div>
                  </div>
                ))}
              </div>

              {error && <div className="auth-error">{error}</div>}

              <div className="step-actions">
                <button onClick={() => setStep(3)} className="btn-back">Back</button>
                <button 
                  onClick={handleSubmit} 
                  className="btn-next" 
                  disabled={!formData.level || loading}
                >
                  {loading ? 'Creating account...' : 'Complete setup'}
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}

export default Signup;
