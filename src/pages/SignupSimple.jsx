import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { createUserWithEmailAndPassword, sendEmailVerification, updatePassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../firebase";
import './SignupNew.css';

function SignupSimple() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: ""
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSendVerification = async () => {
    if (!formData.name.trim() || !formData.email) {
      setError("Please enter name and email");
      return;
    }
    
    try {
      setLoading(true);
      const tempPassword = Math.random().toString(36).slice(-8) + 'Aa1!';
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        tempPassword
      );
      
      await sendEmailVerification(userCredential.user);
      await auth.signOut();
      
      setVerificationSent(true);
      setError("");
    } catch (err) {
      const errorMessages = {
        'auth/email-already-in-use': 'An account with this email already exists',
        'auth/invalid-email': 'Please enter a valid email address'
      };
      setError(errorMessages[err.code] || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleSetPassword = async () => {
    if (!formData.password || !formData.confirmPassword) {
      setError("Please enter password");
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    try {
      setLoading(true);
      
      await setDoc(doc(db, "users", formData.email.replace(/[^a-zA-Z0-9]/g, '')), {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        points: 0,
        level: 1,
        createdAt: new Date(),
      });

      navigate("/login", { state: { message: "Account created! Please login with your credentials." } });
    } catch (err) {
      setError('An error occurred');
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

      {!verificationSent && (
        <>
          <div className="signup-left">
            <div className="signup-brand-card">
              <div className="signup-logo">
                <div className="signup-logo-icon">A</div>
                <div className="signup-logo-text">AIVY</div>
              </div>
              <h1 className="signup-brand-title">Get Started with Us</h1>
              <p className="signup-brand-subtitle">Enter your email to verify first.</p>
            </div>
          </div>

          <div className="signup-right">
            <div className="signup-form-container">
              <h2 className="signup-form-title">Sign Up Account</h2>
              <p className="signup-form-subtitle">We'll send you a verification email first.</p>

              {error && <div className="signup-error">{error}</div>}

              <div className="signup-input-group">
                <input
                  type="text"
                  name="name"
                  placeholder="Full Name"
                  value={formData.name}
                  onChange={handleChange}
                  className="signup-input"
                />
              </div>
              <div className="signup-input-group">
                <input
                  type="email"
                  name="email"
                  placeholder="Email"
                  value={formData.email}
                  onChange={handleChange}
                  className="signup-input"
                />
              </div>

              <button onClick={handleSendVerification} className="signup-submit-btn" disabled={loading}>
                {loading ? 'Sending...' : 'Send Verification Email'}
              </button>

              <div className="signup-footer-text">
                Already have an account? <Link to="/login">Log in</Link>
              </div>
            </div>
          </div>
        </>
      )}

      {verificationSent && step === 1 && (
        <div className="onboarding-container">
          <div className="onboarding-step">
            <h2 className="step-title">Check Your Email</h2>
            <p className="step-subtitle">We sent a verification link to {formData.email}</p>
            <p className="step-subtitle">Click the link to verify, then continue here.</p>
            {error && <div className="auth-error">{error}</div>}
            <button onClick={() => setStep(2)} className="btn-next">
              I've Verified - Continue
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="onboarding-container">
          <div className="onboarding-step">
            <h2 className="step-title">Set Your Password</h2>
            <p className="step-subtitle">Create a secure password for your account</p>

            {error && <div className="auth-error">{error}</div>}

            <div className="signup-input-group">
              <input
                type="password"
                name="password"
                placeholder="Password"
                value={formData.password}
                onChange={handleChange}
                className="signup-input"
              />
            </div>
            <div className="signup-input-group">
              <input
                type="password"
                name="confirmPassword"
                placeholder="Confirm Password"
                value={formData.confirmPassword}
                onChange={handleChange}
                className="signup-input"
              />
            </div>

            <div className="step-actions">
              <button onClick={() => setStep(1)} className="btn-back">Back</button>
              <button onClick={handleSetPassword} className="btn-next" disabled={loading}>
                {loading ? 'Creating...' : 'Complete Setup'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SignupSimple;
