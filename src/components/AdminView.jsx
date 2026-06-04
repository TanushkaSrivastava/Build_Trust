import React, { useState } from 'react';

export default function AdminView({
  adminState,
  isLoading,
  setActiveView,
  onResolveIssue,
  onPostJob,
  onReviewProfiles,
  currentUser
}) {
  const [activeSubView, setActiveSubView] = useState('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [heatMapActive, setHeatMapActive] = useState(false);
  const [revenueToggle, setRevenueToggle] = useState('week'); // 'week' or 'month'

  const toggleSidebar = () => setIsSidebarCollapsed(!isSidebarCollapsed);

  // Use adminState directly, with fallbacks
  const liveOps = adminState.liveOps || [];
  const criticalIssues = adminState.criticalIssues || [];

  const handleExport = () => {
    const event = new CustomEvent('show-toast', { detail: { message: "CSV report generated. Export process running in background...", type: 'info' } });
    window.dispatchEvent(event);
    setTimeout(() => {
      const finishEvent = new CustomEvent('show-toast', { detail: { message: "CSV export completed. Downloaded 'BuildTrust_Ops_Oct2024.csv'", type: 'success' } });
      window.dispatchEvent(finishEvent);
    }, 1500);
  };

  const handleGisClick = () => {
    const event = new CustomEvent('show-toast', { detail: { message: "Clustering predictions loaded: high demand predicted in Sector 62.", type: 'info' } });
    window.dispatchEvent(event);
  };

  // SVGs Paths coordinates for Revenue trends
  const linePathWeek = "M 40,170 C 120,150 180,80 260,110 C 340,135 420,95 500,50 C 530,30 550,25 570,25";
  const areaPathWeek = "M 40,170 C 120,150 180,80 260,110 C 340,135 420,95 500,50 C 530,30 550,25 570,25 L 570,170 Z";

  const linePathMonth = "M 40,130 C 100,120 160,160 220,110 C 300,50 380,80 440,40 C 500,10 540,55 570,10";
  const areaPathMonth = "M 40,130 C 100,120 160,160 220,110 C 300,50 380,80 440,40 C 500,10 540,55 570,10 L 570,170 Z";

  const currentLinePath = revenueToggle === 'week' ? linePathWeek : linePathMonth;
  const currentAreaPath = revenueToggle === 'week' ? areaPathWeek : areaPathMonth;

  // Extract initials from name
  const getInitials = (name) => {
    if (!name) return 'VS';
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const adminName = currentUser?.name || 'Vikram Singh';

  return (
    <div id="view-admin" className="app-view active-view admin-view">
      <div className={`admin-layout ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        {/* Sidebar */}
        <aside className="admin-sidebar">
          <button className="sidebar-toggle-btn" onClick={toggleSidebar}>
            {isSidebarCollapsed ? '→' : '←'}
          </button>
          <div className="admin-logo-box">
            <svg className="admin-logo-icon" viewBox="0 0 24 24" width="24" height="24">
              <path fill="currentColor" d="M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.3C.5 6.7.9 9.8 2.9 11.8c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.1z" />
            </svg>
            {!isSidebarCollapsed && (
              <div>
                <h2>Build_Trust</h2>
                <span className="sub-portal">ADMIN PORTAL</span>
              </div>
            )}
          </div>

          <nav className="admin-nav">
            {['dashboard', 'leads', 'workers', 'payments', 'analytics', 'settings'].map(sub => (
              <button
                key={sub}
                className={`admin-nav-item ${activeSubView === sub ? 'active' : ''}`}
                onClick={() => {
                  setActiveSubView(sub);
                  const event = new CustomEvent('show-toast', { detail: { message: `Switched view to ${sub.toUpperCase()} panel.`, type: 'info' } });
                  window.dispatchEvent(event);
                }}
                title={isSidebarCollapsed ? sub.charAt(0).toUpperCase() + sub.slice(1) : ''}
              >
                <span className="nav-icon">{sub.charAt(0).toUpperCase()}</span>
                {!isSidebarCollapsed && <span style={{ textTransform: 'capitalize' }}>{sub}</span>}
              </button>
            ))}
          </nav>

          <button
            className={`btn btn-accent ${isSidebarCollapsed ? 'btn-icon' : 'btn-full post-job-btn-sidebar'}`}
            onClick={onPostJob}
            title={isSidebarCollapsed ? 'Post New Job' : ''}
          >
            {isSidebarCollapsed ? '+' : '+ Post New Job'}
          </button>

          <div className="admin-user-profile">
            <div className="admin-avatar">{getInitials(adminName)}</div>
            <div className="admin-user-info">
              <h4>{adminName}</h4>
              <p>Administrator</p>
            </div>
            <a
              href="#home"
              className="logout-link"
              title="Exit Admin Portal"
              onClick={(e) => {
                e.preventDefault();
                setActiveView('home');
              }}
            >
              <svg viewBox="0 0 24 24" width="18" height="18">
                <path fill="currentColor" d="M10.09 15.59L11.5 17l5-5-5-5-1.41 1.41L12.67 11H3v2h9.67l-2.58 2.59zM19 3H5c-1.11 0-2 .9-2 2v4h2V5h14v14H5v-4H3v4c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z" />
              </svg>
            </a>
          </div>
        </aside>

        {/* Content Area */}
        <main className="admin-content">
          <header className="admin-content-header">
            <div>
              <h1>Operational Overview</h1>
              <p>Real-time infrastructure management & field analytics (India Operations).</p>
            </div>
            <div className="admin-header-actions">
              <div className="date-selector">
                <svg viewBox="0 0 24 24" width="16" height="16" style={{ marginRight: '8px' }}>
                  <path fill="currentColor" d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2z" />
                </svg>
                <span>Oct 24, 2024</span>
              </div>

              <button className="btn btn-primary" onClick={handleExport}>
                <svg viewBox="0 0 24 24" width="16" height="16" style={{ marginRight: '6px' }}>
                  <path fill="currentColor" d="M19.35 10.04A7.49 7.49 0 0 0 12 4C9.11 4 6.6 5.64 5.35 8.04A5.994 5.994 0 0 0 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13l-5 5-5-5h3V9h4v4h3z" />
                </svg>
                Export Reports
              </button>
            </div>
          </header>

          {/* Metrics row */}
          <section className="admin-metrics-grid">
            {isLoading ? (
              // SKELETON LOADERS
              [1, 2, 3, 4].map(i => (
                <div key={i} className="metric-card skeleton-metric skeleton"></div >
              ))
            ) : (
              <>
                <div className="metric-card">
                  <div className="metric-header">
                    <span>Active Jobs</span>
                    <span className="metric-trend trend-up">▲ 8%</span>
                  </div>
                  <div className="metric-value">{adminState.activeJobs}</div>
                </div>
                <div className="metric-card">
                  <div className="metric-header">
                    <span>Pending Leads</span>
                    <span className="metric-trend trend-down">▼ 3%</span>
                  </div>
                  <div className="metric-value">{adminState.pendingLeads}</div>
                </div>
                <div className="metric-card">
                  <div className="metric-header">
                    <span>Total Revenue</span>
                    <span className="metric-trend trend-up">▲ 12%</span>
                  </div>
                  <div className="metric-value">₹8.2L</div>
                </div>
                <div className="metric-card">
                  <div className="metric-header">
                    <span>Worker Pool</span>
                    <span className="metric-trend trend-up">▲ 5%</span>
                  </div>
                  <div className="metric-value">88%</div>
                </div>
              </>
            )}
          </section>

          {/* Revenue and Live feed panels */}
          <section className="admin-double-column">
            <div className="admin-panel panel-revenue">
              <div className="panel-header">
                <div>
                  <h3>Revenue Trends</h3>
                  <p>Performance metrics across all workers.</p>
                </div>

                <div className="toggle-buttons">
                  <button
                    className={`toggle-btn ${revenueToggle === 'week' ? 'active' : ''}`}
                    onClick={() => {
                      setRevenueToggle('week');
                      const event = new CustomEvent('show-toast', { detail: { message: "Revenue trends rendered by weekly increments.", type: 'info' } });
                      window.dispatchEvent(event);
                    }}
                  >
                    Week
                  </button>
                  <button
                    className={`toggle-btn ${revenueToggle === 'month' ? 'active' : ''}`}
                    onClick={() => {
                      setRevenueToggle('month');
                      const event = new CustomEvent('show-toast', { detail: { message: "Revenue trends rendered by monthly increments.", type: 'info' } });
                      window.dispatchEvent(event);
                    }}
                  >
                    Month
                  </button>
                </div>
              </div>

              <div className="chart-container">
                <svg id="revenueChart" className="svg-chart" viewBox="0 0 600 220">
                  <defs>
                    <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ff6f00" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#ff6f00" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Grid Lines */}
                  <line x1="40" y1="20" x2="570" y2="20" className="chart-grid-line" />
                  <line x1="40" y1="70" x2="570" y2="70" className="chart-grid-line" />
                  <line x1="40" y1="120" x2="570" y2="120" className="chart-grid-line" />
                  <line x1="40" y1="170" x2="570" y2="170" className="chart-grid-line" />

                  {/* Y-Axis Labels */}
                  <text x="30" y="25" className="chart-label y-label">₹10L</text>
                  <text x="30" y="75" className="chart-label y-label">₹7L</text>
                  <text x="30" y="125" className="chart-label y-label">₹4L</text>
                  <text x="30" y="175" className="chart-label y-label">₹1L</text>

                  {/* SVG paths with smooth coordinate transitions */}
                  <path d={currentAreaPath} fill="url(#chartGradient)" style={{ transition: 'd 0.3s ease' }} />
                  <path d={currentLinePath} fill="none" stroke="#ff6f00" strokeWidth="3" style={{ transition: 'd 0.3s ease' }} />

                  {/* X-Axis Labels */}
                  <text x="40" y="195" className="chart-label x-label">Oct 01</text>
                  <text x="146" y="195" className="chart-label x-label">Oct 08</text>
                  <text x="252" y="195" className="chart-label x-label">Oct 15</text>
                  <text x="358" y="195" className="chart-label x-label">Oct 22</text>
                  <text x="464" y="195" className="chart-label x-label">Oct 29</text>
                </svg>
              </div>
            </div>

            <div className="admin-panel panel-live-ops">
              <div className="panel-header">
                <div>
                  <h3 className="flex-align">
                    Live Operations
                    <span className="live-pulse"></span>
                  </h3>
                  <p>Real-time updates & activities.</p>
                </div>
              </div>
              <div className="live-feed-list">
                {isLoading ? (
                  [1, 2, 3].map(i => (
                    <div key={i} className="feed-item skeleton skeleton-text" style={{ height: '40px', marginBottom: '10px' }}></div>
                  ))
                ) : liveOps.length === 0 ? (
                  <div className="text-center" style={{ padding: '20px', color: 'var(--text-muted)' }}>No recent activity.</div>
                ) : (
                  liveOps.map(op => (
                    <div key={op.id} className="feed-item">
                      <div className={`feed-icon-box ${op.color}`}>
                        <span style={{ fontWeight: 'bold', color: 'white', fontSize: '11px' }}>{op.icon}</span>
                      </div>
                      <div className="feed-body">
                        <p>{op.text}</p>
                        <span className="feed-time">{op.time}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>

          {/* Radial progress and issues columns */}
          <section className="admin-three-column">
            <div className="admin-panel panel-completion">
              <h3>Completion Rate</h3>
              <div className="completion-content">
                <div className="radial-progress-wrapper">
                  <svg className="radial-svg" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" className="radial-bg" />
                    <circle
                      cx="50" cy="50" r="40"
                      className="radial-fill"
                      strokeDasharray="251.2"
                      strokeDashoffset={251.2 - (251.2 * adminState.completionRate) / 100}
                    />
                  </svg>
                  <div className="radial-text">
                    <span className="radial-val">{adminState.completionRate}%</span>
                    <span className="radial-trend">+2.4%</span>
                  </div>
                </div>

                <div className="completion-legend">
                  <div className="legend-item">
                    <span className="legend-dot green-dot"></span>
                    <span className="legend-label">On Schedule</span>
                    <span className="legend-val">{adminState.onSchedule}</span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-dot red-dot"></span>
                    <span className="legend-label">Delayed</span>
                    <span className="legend-val">{adminState.delayed}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="admin-panel panel-tasks dark-bg">
              <span className="task-badge-label">PRIORITY TASKS</span>
              <h3>Awaiting Verification</h3>
              <div className="awaiting-number-box">
                <span className="num-val">{adminState.unverifiedCount}</span>
                <span className="num-unit"> workers</span>
              </div>
              <button className="btn btn-accent btn-full" onClick={onReviewProfiles}>
                Review Profiles
              </button>
            </div>

            <div className="admin-panel panel-issues red-border">
              <div className="issues-header">
                <span className="critical-icon">⚠</span>
                <h3>CRITICAL ISSUES</h3>
                <span className="issues-badge-count">{adminState.issuesCount}</span>
              </div>
              <div className="issues-list">
                {criticalIssues.map(issue => (
                  <div key={issue.id} className="issue-item-card">
                    <div className="issue-body">
                      <h4>{issue.title}</h4>
                      <p>{issue.desc}</p>
                    </div>
                    <button
                      className="btn btn-outline btn-small resolve-issue-btn"
                      onClick={() => onResolveIssue(issue.id)}
                    >
                      Resolve
                    </button>
                  </div>
                ))}
                {criticalIssues.length === 0 && (
                  <div className="text-center" style={{ padding: '20px', fontSize: '13px', color: 'var(--text-muted)' }}>
                    No critical issues pending. All systems running optimal.
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Sector Intelligence */}
          <section className="admin-panel panel-intelligence">
            <div className="intelligence-layout">
              <div className="intelligence-left">
                <span className="panel-label">INFRASTRUCTURE GIS</span>
                <h2>Dynamic Sector Intelligence</h2>
                <p>Access real-time worker density and project clustering data. Predictive analysis for resource allocation across NCR.</p>
                <div className="intelligence-actions">
                  <button
                    className="btn btn-accent"
                    onClick={() => {
                      setHeatMapActive(!heatMapActive);
                      const event = new CustomEvent('show-toast', {
                        detail: {
                          message: heatMapActive ? "GIS Heat Map layers disabled." : "GIS Heat Map layers initialized successfully.",
                          type: heatMapActive ? 'info' : 'success'
                        }
                      });
                      window.dispatchEvent(event);
                    }}
                  >
                    {heatMapActive ? "Disable Heat Map" : "Initialize Heat Map"}
                  </button>

                  <button className="btn btn-outline" onClick={handleGisClick}>
                    Advanced GIS Tools
                  </button>
                </div>
              </div>

              <div className="intelligence-right">
                <div className="gis-map-container">
                  <div className="map-grid-layer"></div>

                  {/* Sector Node coordinates */}
                  <div className="sector-node sec-62" style={{ top: '30%', left: '40%' }} title="Sector 62 (Noida) - High Density">
                    <span className="pulse-ring"></span>
                    <span className="sector-dot font-dot"></span>
                  </div>
                  <div className="sector-node sec-44" style={{ top: '60%', left: '25%' }} title="Sector 44 (Noida) - Overdue Safety Audit">
                    <span className="pulse-ring pulse-red"></span>
                    <span className="sector-dot font-dot red-dot"></span>
                  </div>
                  <div className="sector-node sec-goida" style={{ top: '75%', left: '70%' }} title="Greater Noida - Optimal Density">
                    <span className="pulse-ring pulse-green"></span>
                    <span className="sector-dot font-dot green-dot"></span>
                  </div>

                  <div className={`heat-map-overlay ${heatMapActive ? 'active' : ''}`}></div>

                  <div className="map-labels">
                    <div className="map-lbl-item"><span className="legend-dot green-dot"></span> Noida Sector 62 (Optimal)</div>
                    <div className="map-lbl-item"><span className="legend-dot red-dot"></span> Sector 44 (Safety Alert)</div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
