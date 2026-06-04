import React from 'react';
import { useNavigate } from 'react-router-dom';
import AuthCard from './AuthCard';

export default function SignupPage({ loginSuccess }) {
  const navigate = useNavigate();

  const handleAuthSuccess = (data) => {
    loginSuccess(data);
  };

  return (
    <div className="auth-page-container">
      <div className="auth-page-glow-1"></div>
      <div className="auth-page-glow-2"></div>
      <div className="auth-page-content">
        <AuthCard initialMode="signup" onAuthSuccess={handleAuthSuccess} />
      </div>
    </div>
  );
}
