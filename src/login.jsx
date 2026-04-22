import { useState } from 'react';

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
      const response = await fetch('https://api.xlitecore.xdialnetworks.com/api/v1/auth/login', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'Content-Type': 'application/json',
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
        throw new Error('Unable to process server response. Please try again later.');
      }

      // Handle different error scenarios
      if (!response.ok) {
        // Authentication errors (401 or 403)
        if (response.status === 401 || response.status === 403) {
          const errorMessage = data.detail || 'Invalid username or password. Please check your credentials and try again.';
          setError(errorMessage);

          // Clear any existing tokens
          localStorage.removeItem('access_token');
          localStorage.removeItem('user_id');
          localStorage.removeItem('username');
          localStorage.removeItem('role');

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
        throw new Error('Invalid server response. Please try again or contact support.');
      }

      // Store in localStorage only
      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('user_id', data.user_id);
      localStorage.setItem('username', data.username);
      localStorage.setItem('role', data.role);

      setSuccess('Login successful! Redirecting...');

      // Redirect based on user role
      if (data.role === 'admin' || data.role === 'onboarding' || data.role === 'qa') {
        setTimeout(() => {
          window.location.href = '/admin-dashboard';
        }, 1500);
      } else {
        try {
          let clientId = data.user_id;
          if (data.role === 'client_member') {
            const empRes = await fetch("https://api.xlitecore.xdialnetworks.com/api/v1/client/campaigns/employer", {
              headers: { 'Authorization': `Bearer ${data.access_token}` }
            });
            if (empRes.ok) {
              const empData = await empRes.json();
              clientId = empData.client_id;
            }
          }
          if (clientId) {
            const campRes = await fetch(`https://api.xlitecore.xdialnetworks.com/api/v1/client/campaigns/${clientId}`, {
              headers: { 'Authorization': `Bearer ${data.access_token}` }
            });
            if (campRes.ok) {
              const campData = await campRes.json();
              if (campData?.campaigns?.length > 0) {
                setTimeout(() => {
                  window.location.href = `/dashboard?campaign_id=${campData.campaigns[0].id}&view=dashboard`;
                }, 1500);
                return;
              }
            }
          }
        } catch (e) {
          console.error("Error fetching initial campaign", e);
        }
        
        // Fallback if no campaigns found or error
        setTimeout(() => {
          window.location.href = '/dashboard?view=dashboard';
        }, 1500);
      }

    } catch (err) {
      // Network errors
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        setError('Network error. Please check your internet connection and try again.');
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
        @import url('https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.2/font/bootstrap-icons.css');
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          background: #FFFFFF;
          color: #111827;
          line-height: 1.5;
          min-height: 100vh;
        }
        
        #root {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }

        .login-page-wrapper {
          display: flex;
          min-height: 100vh;
          width: 100%;
          flex: 1;
        }

        /* Left Side */
        .login-left {
          flex: 1;
          background: linear-gradient(135deg, #1C44B2 0%, #17368E 100%);
          color: white;
          padding: 4rem 5rem;
          display: flex;
          flex-direction: column;
          position: relative;
          overflow: hidden;
        }

        .login-left::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: radial-gradient(circle at top right, rgba(255,255,255,0.08) 0%, transparent 40%),
                      radial-gradient(circle at bottom left, rgba(255,255,255,0.05) 0%, transparent 40%);
          pointer-events: none;
        }

        .login-logo {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: auto;
          position: relative;
          z-index: 2;
        }

        .login-logo-icon {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.15);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.25rem;
          border: 1px solid rgba(255,255,255,0.2);
        }

        .login-logo-text {
          font-size: 1.375rem;
          font-weight: 600;
        }

        .login-content {
          margin-top: 5rem;
          margin-bottom: auto;
          max-width: 500px;
          position: relative;
          z-index: 2;
        }

        .login-content h1 {
          font-size: 2.75rem;
          font-weight: 700;
          line-height: 1.2;
          margin-bottom: 1.25rem;
        }

        .login-content p.description {
          font-size: 1.125rem;
          color: rgba(255, 255, 255, 0.9);
          margin-bottom: 3.5rem;
          line-height: 1.6;
        }

        .features-list {
          display: flex;
          flex-direction: column;
          gap: 1.75rem;
        }

        .feature-item {
          display: flex;
          align-items: flex-start;
          gap: 1.25rem;
        }

        .feature-icon {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.15);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.25rem;
          flex-shrink: 0;
        }

        .feature-text {
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .feature-text h3 {
          font-size: 1rem;
          font-weight: 600;
          margin-bottom: 0.25rem;
        }

        .feature-text p {
          font-size: 0.875rem;
          color: rgba(255, 255, 255, 0.75);
          margin-bottom: 0;
        }

        .login-footer {
          font-size: 0.875rem;
          color: rgba(255, 255, 255, 0.7);
          position: relative;
          z-index: 2;
        }

        /* Right Side */
        .login-right {
          flex: 1;
          background: #FFFFFF;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 4rem;
        }

        .login-form-container {
          width: 100%;
          max-width: 420px;
        }

        .login-form-header {
          margin-bottom: 2.5rem;
        }

        .login-form-header h2 {
          font-size: 2.25rem;
          color: #111827;
          font-weight: 600;
          margin-bottom: 0.75rem;
          letter-spacing: -0.025em;
        }

        .login-form-header p {
          font-size: 1rem;
          color: #6B7280;
          line-height: 1.5;
        }

        .login-form {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .form-label {
          font-size: 0.875rem;
          font-weight: 600;
          color: #374151;
        }

        .input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .form-input {
          width: 100%;
          padding: 0.875rem 1rem;
          background: #F9FAFB;
          border: 1px solid #E5E7EB;
          border-radius: 8px;
          font-size: 0.938rem;
          color: #111827;
          font-family: inherit;
          transition: all 0.2s ease;
        }

        .form-input:focus {
          outline: none;
          background: #FFFFFF;
          border-color: #2563EB;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }

        .form-input::placeholder {
          color: #9CA3AF;
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
          color: #9CA3AF;
          cursor: pointer;
          font-size: 1.25rem;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          transition: color 0.2s;
        }

        .password-toggle:hover {
          color: #6B7280;
        }

        .login-btn {
          width: 100%;
          padding: 0.875rem;
          background: #2563EB;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          margin-top: 0.5rem;
        }

        .login-btn:hover:not(:disabled) {
          background: #1D4ED8;
        }

        .login-btn:disabled {
          background: #93C5FD;
          cursor: not-allowed;
        }

        .spin {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .help-box {
          margin-top: 2rem;
          padding: 1.25rem;
          background: #EFF6FF;
          border-radius: 8px;
          color: #1E3A8A;
          font-size: 0.875rem;
          line-height: 1.5;
        }

        .help-box strong {
          font-weight: 600;
        }

        .error-message {
          display: flex;
          padding: 0.875rem 1rem;
          background-color: #FEF2F2;
          border: 1px solid #FECACA;
          border-radius: 8px;
          color: #DC2626;
          font-size: 0.875rem;
          font-weight: 500;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 1.5rem;
        }

        .success-message {
          display: flex;
          padding: 0.875rem 1rem;
          background-color: #ECFDF5;
          border: 1px solid #A7F3D0;
          border-radius: 8px;
          color: #059669;
          font-size: 0.875rem;
          font-weight: 500;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 1.5rem;
        }

        @media (max-width: 992px) {
          .login-page-wrapper {
            flex-direction: column;
          }
          .login-left {
            padding: 3rem 2rem;
            min-height: auto;
          }
          .login-content {
            margin-top: 3rem;
            margin-bottom: 3rem;
          }
          .login-right {
            padding: 3rem 2rem;
          }
        }
      `}</style>

      <div className="login-page-wrapper">
        <div className="login-left">
          <div className="login-logo">
            <div className="login-logo-icon">
              <i className="bi bi-telephone"></i>
            </div>
            <div className="login-logo-text">Xdial Networks</div>
          </div>

          <div className="login-content">
            <h1>Campaign Management Dashboard</h1>
            <p className="description">
              Manage your operations, track campaigns, and optimize performance all in one place.
            </p>

            <div className="features-list">
              <div className="feature-item">
                <div className="feature-icon">
                  <i className="bi bi-bar-chart"></i>
                </div>
                <div className="feature-text">
                  <h3>Real-time Analytics</h3>
                  <p>Track campaign performance live</p>
                </div>
              </div>

              <div className="feature-item">
                <div className="feature-icon">
                  <i className="bi bi-people"></i>
                </div>
                <div className="feature-text">
                  <h3>Agent Management</h3>
                  <p>Monitor and manage your team</p>
                </div>
              </div>

              <div className="feature-item">
                <div className="feature-icon">
                  <i className="bi bi-headset"></i>
                </div>
                <div className="feature-text">
                  <h3>Total Support Tools</h3>
                  <p>Complete suite of features</p>
                </div>
              </div>
            </div>
          </div>

          <div className="login-footer">
            © 2026 Xdial Networks. All rights reserved.
          </div>
        </div>

        <div className="login-right">
          <div className="login-form-container">
            <div className="login-form-header">
              <h2>Sign in to Dashboard</h2>
              <p>Enter your credentials to access the campaign management system</p>
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
                    style={{ paddingRight: '3rem' }}
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

            <div className="help-box">
              <strong>Need help?</strong> Contact your system administrator for login credentials or support.
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default LoginPage;