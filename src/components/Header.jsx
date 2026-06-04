import React, { useState } from 'react';
import { Link } from 'react-router-dom';

export default function Header({ 
  activeView, 
  setActiveView, 
  currentLocation, 
  setCurrentLocation, 
  onOpenLogin,
  onOpenAiTool,
  isLoggedIn,
  currentUser
}) {
  const [locDropdownOpen, setLocDropdownOpen] = useState(false);
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const indianLocations = [
    "Greater Noida",
    "Noida",
    "Delhi NCR",
    "Mumbai",
    "Bangalore",
    "Pune"
  ];

  const handleLocationChange = (loc) => {
    setCurrentLocation(loc);
    setLocDropdownOpen(false);
    const event = new CustomEvent('show-toast', { detail: { message: `Location switched to: ${loc}.`, type: 'info' } });
    window.dispatchEvent(event);
  };

  const handleScrollToServices = (e) => {
    e.preventDefault();
    setActiveView('home');
    setTimeout(() => {
      const el = document.getElementById('services-section');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  return (
    <React.Fragment>
      <header className="site-header">
      <div className="header-container">
        <div className="header-left">
          <Link to="/" className="logo">
            <span className="logo-bold">Build</span><span className="logo-accent">_Trust</span>
          </Link>
          
          <div 
            className="location-selector" 
            onClick={() => setLocDropdownOpen(!locDropdownOpen)}
            onMouseLeave={() => setLocDropdownOpen(false)}
          >
            <svg className="icon-location" viewBox="0 0 24 24" width="16" height="16">
              <path fill="currentColor" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            </svg>
            <span>{currentLocation}</span>
            <svg className="icon-chevron" viewBox="0 0 24 24" width="12" height="12">
              <path fill="currentColor" d="M7 10l5 5 5-5z"/>
            </svg>

            <div className={`dropdown-menu ${locDropdownOpen ? 'show' : ''}`}>
              {indianLocations.map(loc => (
                <button 
                  key={loc} 
                  className={`dropdown-item ${currentLocation === loc ? 'active' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLocationChange(loc);
                  }}
                >
                  {loc}
                </button>
              ))}
            </div>
          </div>
        </div>

        <nav className="header-nav">
          <Link 
            to="/" 
            className={`nav-link ${activeView === 'home' ? 'active' : ''}`}
          >
            Home
          </Link>
          <Link 
            to="/search" 
            className={`nav-link ${activeView === 'search' ? 'active' : ''}`}
          >
            Find Workers
          </Link>
          {/* AI Estimator Button Styled as Link */}
          <button 
            className="nav-link btn-ai-nav" 
            onClick={onOpenAiTool}
          >
            AI Estimator
          </button>
          <a 
            href="#services" 
            className="nav-link"
            onClick={handleScrollToServices}
          >
            Services
          </a>
          
          <div 
            className="nav-dropdown"
            onClick={() => setLangDropdownOpen(!langDropdownOpen)}
            onMouseLeave={() => setLangDropdownOpen(false)}
          >
            <button className="nav-dropdown-btn">
              <svg className="icon-lang" viewBox="0 0 24 24" width="16" height="16" style={{ marginRight: '4px', verticalAlign: 'middle' }}>
                <path fill="currentColor" d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zm6.93 6h-2.95a15.65 15.65 0 0 0-1.38-3.56A8.03 8.03 0 0 1 18.92 8zM12 4.04c.83 1.2 1.48 2.53 1.91 3.96h-3.82c.43-1.43 1.08-2.76 1.91-3.96zM4.26 14C4.1 13.36 4 12.69 4 12s.1-1.36.26-2h3.38c-.08.66-.14 1.32-.14 2 0 .68.06 1.34.14 2H4.26zm.82 2h2.95c.32 1.25.78 2.45 1.38 3.56A7.987 7.987 0 0 1 5.08 16zm2.95-8H5.08a7.987 7.987 0 0 1 3.56-3.56A15.65 15.65 0 0 0 7.31 8zM12 19.96c-.83-1.2-1.48-2.53-1.91-3.96h3.82c-.43 1.43-1.08 2.76-1.91 3.96zM14.34 14H9.66c-.09-.66-.16-1.32-.16-2 0-.68.07-1.35.16-2h4.68c.09.65.16 1.32.16 2 0 .68-.07 1.34-.16 2zm.25 5.56c.6-1.11 1.06-2.31 1.38-3.56h2.95a8.03 8.03 0 0 1-4.33 3.56zM16.36 14c.08-.66.14-1.32.14-2 0-.68-.06-1.34-.14-2h3.38c.16.64.26 1.31.26 2s-.1 1.36-.26 2h-3.38z"/>
              </svg>
              Language
            </button>
            <div className={`dropdown-menu ${langDropdownOpen ? 'show' : ''}`}>
              <a href="#" className="dropdown-item active" onClick={(e) => e.preventDefault()}>English</a>
              <a href="#" className="dropdown-item" onClick={(e) => e.preventDefault()}>Español</a>
              <a href="#" className="dropdown-item" onClick={(e) => e.preventDefault()}>हिन्दी</a>
            </div>
          </div>
        </nav>

        <div className="header-actions">
          {!isLoggedIn ? (
            <>
              <Link to="/login" className="btn btn-text login-btn">Login</Link>
              <Link to="/signup" className="btn btn-outline-dark signup-header-btn" style={{ marginRight: '8px' }}>Sign Up</Link>
              <Link to="/admin" className="btn btn-primary admin-shortcut-btn">Admin Portal</Link>
            </>
          ) : (
            <div 
              className="user-profile-menu"
              onClick={() => setUserDropdownOpen(!userDropdownOpen)}
              onMouseLeave={() => setUserDropdownOpen(false)}
            >
              <div className="user-avatar-circle">
                {currentUser?.email?.charAt(0).toUpperCase() || 'U'}
              </div>
              <span className="user-name-label">
                {currentUser?.role === 'admin' ? 'Admin Vikram' : 'My Account'}
              </span>
              <svg className="icon-chevron" viewBox="0 0 24 24" width="12" height="12">
                <path fill="currentColor" d="M7 10l5 5 5-5z"/>
              </svg>

              <div className={`dropdown-menu ${userDropdownOpen ? 'show' : ''}`} style={{ right: 0, left: 'auto' }}>
                {currentUser?.role === 'admin' ? (
                  <Link to="/admin" className="dropdown-item">Admin Dashboard</Link>
                ) : (
                  <Link to="/profile" className="dropdown-item">My Bookings & Chats</Link>
                )}
                <button 
                  className="dropdown-item" 
                  onClick={() => {
                    localStorage.removeItem('bt_token');
                    window.location.reload();
                  }}
                >
                  Logout
                </button>
              </div>
            </div>
          )}

          {/* Hamburger menu for mobile navigation */}
          <button 
            className="mobile-nav-toggle" 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle mobile menu"
          >
            <svg viewBox="0 0 24 24" width="24" height="24">
              {mobileMenuOpen ? (
                <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              ) : (
                <path fill="currentColor" d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
              )}
            </svg>
          </button>
        </div>
      </div>
    </header>

    {/* Mobile Nav Backdrop */}
    {mobileMenuOpen && (
      <div 
        className="mobile-nav-backdrop" 
        onClick={() => setMobileMenuOpen(false)}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(10, 14, 26, 0.65)',
          backdropFilter: 'blur(6px)',
          zIndex: 190,
          animation: 'fadeIn var(--transition-fast) forwards'
        }}
      ></div>
    )}

    {/* Mobile navigation side drawer overlay */}
    <div className={`mobile-nav-drawer ${mobileMenuOpen ? 'open' : ''}`}>
        <div className="mobile-nav-content">
          <div className="mobile-drawer-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <span className="logo-bold" style={{ color: 'var(--color-white)', fontSize: '20px', fontFamily: 'var(--font-display)', fontWeight: 800 }}>
              Build<span className="logo-accent">_Trust</span>
            </span>
            <button 
              className="mobile-drawer-close" 
              onClick={() => setMobileMenuOpen(false)}
              style={{ color: 'var(--color-white)', fontSize: '28px', cursor: 'pointer', background: 'none', border: 'none' }}
              aria-label="Close menu"
            >
              &times;
            </button>
          </div>

          {/* Location selector for mobile users inside drawer */}
          <div className="mobile-drawer-section" style={{ marginBottom: '24px' }}>
            <h4 style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>
              Select Location
            </h4>
            <div className="mobile-location-chips" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {indianLocations.map(loc => (
                <button
                  key={loc}
                  className={`mobile-location-chip ${currentLocation === loc ? 'active' : ''}`}
                  onClick={() => {
                    handleLocationChange(loc);
                    setMobileMenuOpen(false);
                  }}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '20px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)',
                    backgroundColor: currentLocation === loc ? 'var(--color-accent)' : 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid',
                    borderColor: currentLocation === loc ? 'var(--color-accent)' : 'rgba(255, 255, 255, 0.1)',
                    color: '#ffffff'
                  }}
                >
                  {loc}
                </button>
              ))}
            </div>
          </div>

          <div className="mobile-nav-divider"></div>

          <Link 
            to="/" 
            className={`mobile-nav-link ${activeView === 'home' ? 'active' : ''}`}
            onClick={() => { setMobileMenuOpen(false); setActiveView('home'); }}
          >
            Home
          </Link>
          <Link 
            to="/search" 
            className={`mobile-nav-link ${activeView === 'search' ? 'active' : ''}`}
            onClick={() => { setMobileMenuOpen(false); setActiveView('search'); }}
          >
            Find Workers
          </Link>
          <button 
            className="mobile-nav-link btn-ai-mobile" 
            onClick={() => { setMobileMenuOpen(false); onOpenAiTool(); }}
          >
            AI Estimator
          </button>
          <a 
            href="#services" 
            className="mobile-nav-link"
            onClick={(e) => {
              setMobileMenuOpen(false);
              handleScrollToServices(e);
            }}
          >
            Services
          </a>
          
          <div className="mobile-nav-divider"></div>
          
          {!isLoggedIn ? (
            <div className="mobile-nav-auth">
              <Link to="/login" className="btn btn-outline btn-full" onClick={() => setMobileMenuOpen(false)}>Login</Link>
              <Link to="/signup" className="btn btn-outline btn-full" style={{ marginTop: '10px' }} onClick={() => setMobileMenuOpen(false)}>Sign Up</Link>
              <Link to="/admin" className="btn btn-primary btn-full" style={{ marginTop: '10px' }} onClick={() => setMobileMenuOpen(false)}>Admin Portal</Link>
            </div>
          ) : (
            <div className="mobile-nav-user">
              <div className="mobile-user-header" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                <div className="user-avatar-circle" style={{ width: '40px', height: '40px', fontSize: '16px' }}>
                  {currentUser?.email?.charAt(0).toUpperCase() || 'U'}
                </div>
                <span style={{ fontWeight: 600, color: 'var(--text-light)' }}>
                  {currentUser?.role === 'admin' ? 'Admin Vikram' : currentUser?.email}
                </span>
              </div>
              {currentUser?.role === 'admin' ? (
                <Link to="/admin" className="btn btn-outline btn-full" style={{ marginBottom: '12px' }} onClick={() => setMobileMenuOpen(false)}>Admin Dashboard</Link>
              ) : (
                <Link to="/profile" className="btn btn-outline btn-full" style={{ marginBottom: '12px' }} onClick={() => setMobileMenuOpen(false)}>My Bookings & Chats</Link>
              )}
              <button 
                className="btn btn-accent btn-full" 
                onClick={() => {
                  setMobileMenuOpen(false);
                  localStorage.removeItem('bt_token');
                  window.location.reload();
                }}
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </React.Fragment>
  );
}
