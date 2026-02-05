import { useState, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { signInWithEmailAndPassword, sendEmailVerification, GoogleAuthProvider, OAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "../firebase";
import './SignupNew.css';

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showResend, setShowResend] = useState(false);
  const [resending, setResending] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.state?.message) {
      setSuccessMessage(location.state.message);
    }
  }, [location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setShowResend(false);
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      if (!userCredential.user.emailVerified) {
        await auth.signOut();
        setError("Please verify your email before logging in. Check your inbox.");
        setShowResend(true);
        setLoading(false);
        return;
      }
      navigate("/dashboard");
    } catch (err) {
      const errorMessages = {
        'auth/invalid-credential': 'Invalid email or password',
        'auth/user-not-found': 'No account found with this email',
        'auth/wrong-password': 'Incorrect password',
        'auth/too-many-requests': 'Too many failed attempts. Try again later'
      };
      setError(errorMessages[err.code] || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setResending(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      await sendEmailVerification(userCredential.user);
      setError("Verification email sent! Check your inbox.");
      setTimeout(() => {
        auth.signOut();
        navigate("/verify-email");
      }, 2000);
    } catch (err) {
      setError("Failed to resend verification email.");
    } finally {
      setResending(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      navigate("/dashboard");
    } catch (err) {
      if (err.code === 'auth/account-exists-with-different-credential') {
        setError('This email is already registered with GitHub. Please use GitHub sign-in.');
      } else {
        setError(err.message);
      }
    }
  };

  const handleGithubSignIn = async () => {
    try {
      const provider = new OAuthProvider('github.com');
      await signInWithPopup(auth, provider);
      navigate("/dashboard");
    } catch (err) {
      if (err.code === 'auth/account-exists-with-different-credential') {
        setError('This email is already registered with Google. Please use Google sign-in.');
      } else {
        setError(err.message);
      }
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
      <div className="signup-left">
        <div className="signup-brand-card">
          <div className="signup-logo">
            <div className="signup-logo-icon">A</div>
            <div className="signup-logo-text">AIVY</div>
          </div>
          <h1 className="signup-brand-title">Welcome Back</h1>
          <p className="signup-brand-subtitle">Sign in to continue your learning journey.</p>
          <div className="signup-steps">
            <div className="signup-step-item active primary">Access your account</div>
            <Link to="/signup" className="signup-step-item clickable">
              New here? Sign Up
            </Link>
            <Link to="/privacy-policy" className="signup-step-item clickable">
              Privacy Policy
            </Link>
          </div>
        </div>
      </div>

      <div className="signup-right">
        <div className="signup-form-container">
          <h2 className="signup-form-title">Sign In</h2>
          <p className="signup-form-subtitle">Enter your credentials to access your account.</p>

          {successMessage && (
            <div className="signup-success">
              {successMessage}
            </div>
          )}

          {error && (
            <div className="signup-error">
              {error}
            </div>
          )}

          <div className="signup-social-buttons" style={{ flexDirection: 'column', gap: '1rem' }}>
            <button onClick={handleGoogleSignIn} className="signup-social-btn" style={{ width: '100%', justifyContent: 'center' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>
            <button onClick={handleGithubSignIn} className="signup-social-btn" style={{ width: '100%', justifyContent: 'center' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              Continue with GitHub
            </button>
          </div>

          <div className="signup-footer-text">
            Don't have an account? <Link to="/signup">Create one</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
