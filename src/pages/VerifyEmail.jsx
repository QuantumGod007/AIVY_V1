import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { sendEmailVerification } from "firebase/auth";
import { auth } from "../firebase";
import './SignupNew.css';

function VerifyEmail() {
  const [resending, setResending] = useState(false);
  const [message, setMessage] = useState("");
  const [checking, setChecking] = useState(false);
  const navigate = useNavigate();
  const user = auth.currentUser;

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    if (user.emailVerified) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  const handleResend = async () => {
    setResending(true);
    setMessage("");
    try {
      await sendEmailVerification(user);
      setMessage("Verification email sent! Check your inbox.");
    } catch (err) {
      setMessage(err.message);
    } finally {
      setResending(false);
    }
  };

  const handleCheckVerification = async () => {
    setChecking(true);
    try {
      await user.reload();
      if (user.emailVerified) {
        navigate("/dashboard");
      } else {
        setMessage("Email not verified yet. Please check your inbox.");
      }
    } catch (err) {
      setMessage(err.message);
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="signup-split">
      <div className="signup-left">
        <div className="signup-brand-card">
          <div className="signup-logo">
            <div className="signup-logo-icon">A</div>
            <div className="signup-logo-text">AIVY</div>
          </div>
          <h1 className="signup-brand-title">Verify Your Email</h1>
          <p className="signup-brand-subtitle">
            We've sent a verification link to <strong>{user?.email}</strong>
          </p>
        </div>
      </div>

      <div className="signup-right">
        <div className="signup-form-container">
          <h2 className="signup-form-title">Check Your Inbox</h2>
          <p className="signup-form-subtitle">
            Click the verification link in the email we sent you to activate your account.
          </p>

          {message && (
            <div className={message.includes("sent") ? "signup-success" : "signup-error"}>
              {message}
            </div>
          )}

          <div style={{ marginTop: "2rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
            <button 
              onClick={handleCheckVerification} 
              className="signup-submit-btn"
              disabled={checking}
            >
              {checking ? "Checking..." : "I've Verified My Email"}
            </button>

            <button 
              onClick={handleResend} 
              className="signup-submit-btn"
              style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.2)", color: "#fff" }}
              disabled={resending}
            >
              {resending ? "Sending..." : "Resend Verification Email"}
            </button>
          </div>

          <div className="signup-footer-text" style={{ marginTop: "2rem" }}>
            Wrong email? <button onClick={() => auth.signOut()} style={{ background: "none", border: "none", color: "#8b5cf6", cursor: "pointer" }}>Sign out</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default VerifyEmail;
