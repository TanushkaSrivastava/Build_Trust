import React, { useState, useEffect } from 'react';

export default function AuthCard({ initialMode = 'login', onAuthSuccess, onClose }) {
  const [mode, setMode] = useState(initialMode); // 'login', 'signup', 'otp'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('customer'); // 'customer', 'specialist'
  const [otpCode, setOtpCode] = useState('');
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // OTP cooldown timer
  useEffect(() => {
    let interval;
    if (otpCooldown > 0) {
      interval = setInterval(() => {
        setOtpCooldown(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [otpCooldown]);

  const addToast = (message, type = 'success') => {
    const event = new CustomEvent('show-toast', { detail: { message, type } });
    window.dispatchEvent(event);
  };

  // Submit password-based login
  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) {
      addToast('Please enter both email and password', 'info');
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch('http://localhost:8005/api/auth/login-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password })
      });
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        onAuthSuccess(data);
      } else {
        addToast(data.detail || 'Invalid email or password', 'error');
      }
    } catch (err) {
      addToast('Cannot connect to login server.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Submit registration
  const handleRegister = async (e) => {
    if (e) e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!fullName || !cleanEmail || !password) {
      addToast('Please fill out all fields', 'info');
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch('http://localhost:8005/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          password,
          role,
          fullName
        })
      });
      const data = await res.json();
      if (res.ok && (data.status === 'success' || data.status === 'mock_success')) {
        addToast('Account created successfully!');
        onAuthSuccess(data);
      } else {
        addToast(data.detail || 'Registration failed. Try a different email.', 'error');
      }
    } catch (err) {
      addToast('Cannot connect to register server.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Send OTP login request
  const handleSendOtp = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail.includes('@')) {
      addToast('Please enter a valid email address first', 'info');
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch('http://localhost:8005/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail })
      });
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        setMode('otp');
        setOtpCooldown(60);
        addToast('Verification code sent to your inbox!');
      } else {
        addToast(data.message || 'Failed to send OTP code', 'error');
      }
    } catch (err) {
      addToast('Failed to send OTP code.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Verify OTP code
  const handleVerifyOtp = async (e) => {
    if (e) e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!otpCode || otpCode.length !== 6) {
      addToast('Please enter the 6-digit verification code', 'info');
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch('http://localhost:8005/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, code: otpCode })
      });
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        // Check if user profile is already registered
        const checkRes = await fetch('http://localhost:8005/api/auth/check-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cleanEmail })
        });
        const checkData = await checkRes.json();
        
        if (checkData.exists) {
          onAuthSuccess(data);
        } else {
          // Send to signup mode to complete registration details
          setMode('signup');
          addToast('Email verified! Please enter your name and choose your account type.', 'info');
        }
      } else {
        addToast(data.message || 'Invalid verification code', 'error');
      }
    } catch (err) {
      addToast('Verification failed.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Quick Login as Admin bypass (helpful for development/grading)
  const handleAdminShortcut = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('http://localhost:8005/api/auth/login-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@buildtrust.com', password: '1234@' })
      });
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        onAuthSuccess(data);
      } else {
        addToast('Admin shortcut failed.', 'error');
      }
    } catch (err) {
      addToast('Cannot connect to login server.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-card animate-fade">
      {onClose && (
        <button className="auth-close-btn" onClick={onClose} aria-label="Close modal">
          <svg viewBox="0 0 24 24" width="20" height="20">
            <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
        </button>
      )}
      
      <div className="auth-card-header">
        <div className="auth-logo">
          <span className="logo-bold" style={{ color: '#ffffff' }}>Build</span>
          <span className="logo-accent">_Trust</span>
        </div>
        <h3 className="auth-card-title">
          {mode === 'login' && 'Sign In to Your Account'}
          {mode === 'signup' && 'Create Your Account'}
          {mode === 'otp' && 'Verify Your Email'}
        </h3>
      </div>

      <div className="auth-card-body">
        {mode === 'login' && (
          <form className="auth-step-pane" onSubmit={handleLogin}>
            <p className="auth-subtitle">
              Enter your credentials to secure your account, or choose passwordless OTP login.
            </p>
            
            <div className="auth-group">
              <label className="auth-label">Email Address</label>
              <div className="auth-input-wrapper">
                <svg className="auth-input-icon" viewBox="0 0 24 24" width="18" height="18">
                  <path fill="currentColor" d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                </svg>
                <input 
                  type="email" 
                  className="auth-input" 
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="auth-group">
              <label className="auth-label">Password</label>
              <div className="auth-input-wrapper">
                <svg className="auth-input-icon" viewBox="0 0 24 24" width="18" height="18">
                  <path fill="currentColor" d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
                </svg>
                <input 
                  type="password" 
                  className="auth-input" 
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            <button 
              type="submit" 
              className="auth-btn auth-btn-accent" 
              disabled={isLoading}
            >
              {isLoading ? 'Signing In...' : 'Sign In'}
            </button>
            
            <div className="auth-divider">
              <span>OR</span>
            </div>
            
            <button 
              type="button" 
              className="auth-btn auth-btn-outline" 
              onClick={handleSendOtp}
              disabled={isLoading}
            >
              Send Login Code (OTP)
            </button>

            <button 
              type="button" 
              className="auth-btn-link" 
              onClick={() => setMode('signup')}
              disabled={isLoading}
            >
              Don't have an account? Sign Up
            </button>

            <div className="auth-divider">
              <span>Quick Access</span>
            </div>
            
            <div className="auth-admin-shortcut">
              <button 
                type="button" 
                className="auth-btn-admin" 
                onClick={handleAdminShortcut}
                disabled={isLoading}
              >
                <svg viewBox="0 0 24 24" width="16" height="16" style={{ marginRight: '6px' }}>
                  <path fill="currentColor" d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                </svg>
                Quick Login as Admin (Vikram Singh)
              </button>
            </div>
          </form>
        )}

        {mode === 'signup' && (
          <form className="auth-step-pane" onSubmit={handleRegister}>
            <p className="auth-subtitle">
              Enter your details below to register a new account on Build_Trust.
            </p>
            
            <div className="auth-group">
              <label className="auth-label">Full Name</label>
              <div className="auth-input-wrapper">
                <svg className="auth-input-icon" viewBox="0 0 24 24" width="18" height="18">
                  <path fill="currentColor" d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                </svg>
                <input 
                  type="text" 
                  className="auth-input" 
                  placeholder="Arjun Sharma"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="auth-group">
              <label className="auth-label">Email Address</label>
              <div className="auth-input-wrapper">
                <svg className="auth-input-icon" viewBox="0 0 24 24" width="18" height="18">
                  <path fill="currentColor" d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                </svg>
                <input 
                  type="email" 
                  className="auth-input" 
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="auth-group">
              <label className="auth-label">I want to...</label>
              <div className="auth-role-grid">
                <div 
                  className={`auth-role-card ${role === 'customer' ? 'active' : ''}`}
                  onClick={() => !isLoading && setRole('customer')}
                >
                  <div className="auth-role-icon">
                    <svg viewBox="0 0 24 24" width="24" height="24">
                      <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.47 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
                    </svg>
                  </div>
                  <div className="auth-role-text">
                    <h4>Hire Specialists</h4>
                    <p>Find & book top verified talent</p>
                  </div>
                </div>
                
                <div 
                  className={`auth-role-card ${role === 'specialist' ? 'active' : ''}`}
                  onClick={() => !isLoading && setRole('specialist')}
                >
                  <div className="auth-role-icon">
                    <svg viewBox="0 0 24 24" width="24" height="24">
                      <path fill="currentColor" d="M20 6h-4V4c0-1.11-.89-2-2-2h-4c-1.11 0-2 .89-2 2v2H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-6 0h-4V4h4v2z"/>
                    </svg>
                  </div>
                  <div className="auth-role-text">
                    <h4>Work as Specialist</h4>
                    <p>Offer services & grow your leads</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="auth-group">
              <label className="auth-label">Set a Password</label>
              <div className="auth-input-wrapper">
                <svg className="auth-input-icon" viewBox="0 0 24 24" width="18" height="18">
                  <path fill="currentColor" d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
                </svg>
                <input 
                  type="password" 
                  className="auth-input" 
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  minLength="8"
                />
              </div>
            </div>
            
            <button 
              type="submit" 
              className="auth-btn auth-btn-accent" 
              disabled={isLoading}
            >
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </button>

            <button 
              type="button" 
              className="auth-btn-link" 
              onClick={() => setMode('login')}
              disabled={isLoading}
            >
              Already have an account? Sign In
            </button>
          </form>
        )}

        {mode === 'otp' && (
          <form className="auth-step-pane" onSubmit={handleVerifyOtp}>
            <p className="auth-subtitle">
              We've sent a 6-digit confirmation code to <span className="auth-highlight-email">{email}</span>.
            </p>
            <div className="auth-group">
              <label className="auth-label text-center">6-Digit Code</label>
              <div className="auth-input-wrapper otp-wrapper">
                <input 
                  type="text" 
                  className="auth-input text-center otp-input" 
                  placeholder="000000"
                  maxLength="6"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
            </div>
            <button 
              type="submit" 
              className="auth-btn auth-btn-accent" 
              disabled={isLoading}
            >
              {isLoading ? 'Verifying...' : 'Verify & Continue'}
            </button>
            
            <div style={{ textAlign: 'center', marginTop: '16px' }}>
              <button 
                type="button"
                className="auth-btn-link" 
                disabled={otpCooldown > 0 || isLoading}
                onClick={handleSendOtp}
              >
                {otpCooldown > 0 ? `Resend Code in ${otpCooldown}s` : 'Resend Code'}
              </button>
            </div>
            
            <button 
              type="button"
              className="auth-btn-link" 
              onClick={() => setMode('login')}
              disabled={isLoading}
              style={{ marginTop: '8px' }}
            >
              Back to Password Login
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
