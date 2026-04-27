import { useState } from "react";

const LoginPage = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.username || !formData.password) {
      setError('Please fill in all fields');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("https://api.xlitecore.xdialnetworks.com/api/v1/auth/login", {
        method: "POST",
        headers: {
          accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: formData.username,
          password: formData.password
        })
      });

      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        throw new Error("Unable to process server response. Please try again later.");
      }

      // Handle different error scenarios
      if (!response.ok) {
        // Authentication errors (401 or 403)
        if (response.status === 401 || response.status === 403) {
          const errorMessage =
            data.detail ||
            "Invalid username or password. Please check your credentials and try again.";
          setError(errorMessage);

          // Clear any existing tokens
          localStorage.removeItem("access_token");
          localStorage.removeItem("user_id");
          localStorage.removeItem("username");
          localStorage.removeItem("role");

          // Reset form after a delay
          setTimeout(() => {
            setFormData({
              username: '',
              password: ''
            });
          }, 2000);

          setLoading(false);
          return;
        }

        // Rate limiting (429)
        if (response.status === 429) {
          setError('Too many login attempts. Please wait a few minutes before trying again.');
          setLoading(false);
          return;
        }

        // Server errors (5xx)
        if (response.status >= 500) {
          setError('Server error occurred. Please try again later or contact support if the problem persists.');
          setLoading(false);
          return;
        }

        // Other errors
        throw new Error(data.detail || data.message || 'Login failed. Please try again.');
      }

      // Validate response data
      if (!data.access_token || !data.user_id || !data.role) {
        throw new Error("Invalid server response. Please try again or contact support.");
      }

      // Store in localStorage only
      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("user_id", data.user_id);
      localStorage.setItem("username", data.username);
      localStorage.setItem("role", data.role);

      // Redirect based on user role
      if (data.role === "admin" || data.role === "onboarding" || data.role === "qa") {
        setTimeout(() => {
          window.location.href = "/admin-dashboard";
        }, 1500);
      } else {
        if (data.role === "client" || data.role === "client_member") {
          setTimeout(() => {
            window.location.href = "/client-landing";
          }, 1500);
        }
      }

    } catch (err) {
      // Network errors
      if (err.name === "TypeError" && err.message.includes("fetch")) {
        setError("Network error. Please check your internet connection and try again.");
      } else {
        setError(err.message || 'An unexpected error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <>
      <style>{`
        @import url("https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.2/font/bootstrap-icons.css");
        @import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap");

        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          line-height: 1.5;
          min-height: 100vh;
          background: #080c14;
          color: rgba(255, 255, 255, 0.92);
        }
        
        #root {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }

        .login-page-wrapper {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          padding: 32px 20px;
          position: relative;
          overflow: hidden;
        }

        .login-page-wrapper::before,
        .login-page-wrapper::after {
          content: "";
          position: absolute;
          border-radius: 50%;
          filter: blur(100px);
          z-index: 0;
          pointer-events: none;
        }

        .login-page-wrapper::before {
          width: 500px;
          height: 500px;
          top: -180px;
          left: -120px;
          background: rgba(10, 132, 255, 0.15);
        }

        .login-page-wrapper::after {
          width: 360px;
          height: 360px;
          right: -100px;
          bottom: -80px;
          background: rgba(94, 92, 230, 0.12);
        }

        .login-card {
          width: 100%;
          max-width: 460px;
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          padding: 28px;
          box-shadow: 0 2px 24px rgba(0, 0, 0, 0.4);
          position: relative;
          z-index: 1;
        }

        .login-logo {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 18px;
        }

        .login-logo-icon {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: linear-gradient(135deg, #0a84ff, #5e5ce6);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1rem;
          box-shadow: 0 4px 16px rgba(10, 132, 255, 0.35);
        }

        .login-logo-text {
          font-size: 18px;
          font-weight: 700;
          letter-spacing: -0.4px;
        }

        .login-logo-text span {
          color: #0a84ff;
        }

        .login-form-header {
          margin-bottom: 18px;
        }

        .login-form-header h2 {
          font-size: 24px;
          color: rgba(255, 255, 255, 0.92);
          font-weight: 600;
          margin-bottom: 6px;
          letter-spacing: -0.2px;
        }

        .login-form-header p {
          font-size: 13px;
          color: rgba(255, 255, 255, 0.5);
        }

        .login-form {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .form-label,
        label.form-label,
        .form-group .form-label {
          font-size: 12px;
          font-weight: 600;
          color: #ffffff !important;
          opacity: 1 !important;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        .input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .form-input {
          width: 100%;
          padding: 10px 12px;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 10px;
          font-size: 13px;
          color: rgba(255, 255, 255, 0.92);
          caret-color: rgba(255, 255, 255, 0.92);
          color-scheme: dark;
          font-family: inherit;
          transition: all 0.2s ease;
        }

        .form-input:focus {
          outline: none;
          border-color: rgba(255, 255, 255, 0.14);
          box-shadow: 0 0 0 3px rgba(10, 132, 255, 0.12);
        }

        .form-input::placeholder {
          color: rgba(255, 255, 255, 0.28);
        }

        .form-input:-webkit-autofill,
        .form-input:-webkit-autofill:hover,
        .form-input:-webkit-autofill:focus,
        .form-input:-webkit-autofill:active,
        .form-input:autofill {
          -webkit-text-fill-color: rgba(255, 255, 255, 0.96) !important;
          caret-color: rgba(255, 255, 255, 0.96) !important;
          -webkit-box-shadow: 0 0 0px 1000px rgba(16, 21, 36, 0.92) inset !important;
          box-shadow: 0 0 0px 1000px rgba(16, 21, 36, 0.92) inset !important;
          border: 1px solid rgba(255, 255, 255, 0.08) !important;
          -webkit-background-clip: padding-box;
          transition: background-color 9999s ease-in-out 0s, color 9999s ease-in-out 0s;
        }

        .form-input::-ms-reveal,
        .form-input::-ms-clear {
          display: none;
        }
        
        .form-input::-webkit-credentials-auto-fill-button {
          visibility: hidden;
          display: none !important;
          pointer-events: none;
        }

        .password-toggle {
          position: absolute;
          right: 1rem;
          background: none;
          border: none;
          color: rgba(255, 255, 255, 0.5);
          cursor: pointer;
          font-size: 1.25rem;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          transition: color 0.2s;
        }

        .password-toggle:hover {
          color: rgba(255, 255, 255, 0.92);
        }

        .login-btn {
          width: 100%;
          padding: 10px 14px;
          background: #0a84ff;
          color: #fff;
          border: none;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          margin-top: 2px;
          box-shadow: 0 4px 16px rgba(10, 132, 255, 0.3);
        }

        .login-btn:hover:not(:disabled) {
          opacity: 0.88;
          transform: translateY(-1px);
        }

        .login-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .spin {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .error-message {
          display: flex;
          padding: 10px 12px;
          background-color: rgba(255, 69, 58, 0.12);
          border: 1px solid rgba(255, 69, 58, 0.25);
          border-radius: 8px;
          color: #fca5a5;
          font-size: 13px;
          font-weight: 500;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 14px;
        }

        .success-message {
          display: flex;
          padding: 10px 12px;
          background-color: rgba(48, 209, 88, 0.12);
          border: 1px solid rgba(48, 209, 88, 0.25);
          border-radius: 8px;
          color: #86efac;
          font-size: 13px;
          font-weight: 500;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 14px;
        }

        @media (max-width: 560px) {
          .login-card {
            padding: 22px 16px;
          }
        }
      `}</style>

      <div className="login-page-wrapper">
        <div className="login-card">
          <div className="login-logo">
            <div className="login-logo-text">
              Nanomight <span>AI</span>
            </div>
          </div>
            <div className="login-form-header">
              <h2>Sign In</h2>
              <p>Access your Nanomight AI workspace</p>
            </div>

            {error && (
              <div className="error-message">
                <i className="bi bi-exclamation-circle-fill"></i>
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="success-message">
                <i className="bi bi-check-circle-fill"></i>
                <span>{success}</span>
              </div>
            )}

            <form className="login-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Username</label>
                <div className="input-wrapper">
                  <input
                    type="text"
                    name="username"
                    className="form-input"
                    placeholder="Enter your username"
                    value={formData.username}
                    onChange={handleChange}
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Password</label>
                <div className="input-wrapper">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    className="form-input"
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    disabled={loading}
                    style={{ paddingRight: "3rem" }}
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={togglePasswordVisibility}
                    tabIndex="-1"
                  >
                    <i className={showPassword ? "bi bi-eye-slash" : "bi bi-eye"}></i>
                  </button>
                </div>
              </div>

              <button type="submit" className="login-btn" disabled={loading}>
                {loading ? (
                  <>
                    <i className="bi bi-arrow-repeat spin"></i>
                    Signing In...
                  </>
                ) : (
                  "Sign In"
                )}
              </button>
            </form>

        </div>
      </div>
    </>
  );
};

export default LoginPage;