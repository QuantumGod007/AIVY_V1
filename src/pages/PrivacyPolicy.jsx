import { Link } from "react-router-dom";
import "./PrivacyPolicy.css";

function PrivacyPolicy() {
  return (
    <div className="privacy-container">
      <Link to="/" className="back-button">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 12H5M12 19l-7-7 7-7"/>
        </svg>
        Back
      </Link>

      <div className="privacy-content">
        <h1>Privacy Policy</h1>
        <p className="last-updated">Last updated: January 2025</p>

        <section>
          <h2>1. Information We Collect</h2>
          <p>We collect information you provide directly to us when you create an account, including your name, email address, and learning preferences.</p>
        </section>

        <section>
          <h2>2. How We Use Your Information</h2>
          <p>We use the information we collect to provide, maintain, and improve our services, including personalizing your learning experience.</p>
        </section>

        <section>
          <h2>3. Data Security</h2>
          <p>We implement appropriate security measures to protect your personal information against unauthorized access, alteration, or destruction.</p>
        </section>

        <section>
          <h2>4. Your Rights</h2>
          <p>You have the right to access, update, or delete your personal information at any time through your account settings.</p>
        </section>

        <section>
          <h2>5. Contact Us</h2>
          <p>If you have any questions about this Privacy Policy, please contact us at privacy@aivy.com</p>
        </section>
      </div>
    </div>
  );
}

export default PrivacyPolicy;
