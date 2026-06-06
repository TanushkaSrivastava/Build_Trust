import React, { useState } from 'react';
import Breadcrumbs from './Breadcrumbs';

export default function WorkerDashboardView({ 
  currentUser, 
  adminState, 
  setActiveView,
  onCallAdmin 
}) {
  const [activeTab, setActiveTab] = useState('bookings');
  const [stats, setStats] = useState({
    earnings: "₹0",
    completedJobs: 0,
    rating: 0,
    profileViews: 0
  });
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  // Fetch real specialist stats from API
  React.useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem('bt_token');
        const res = await fetch('http://localhost:8005/api/specialist/stats', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data && !data.detail) {
          setStats(data);
        }
      } catch (err) {
        console.error("Failed to fetch specialist stats:", err);
      } finally {
        setIsLoadingStats(false);
      }
    };
    fetchStats();
  }, []);

  // Filter jobs specific to this worker (matching by name in mock or email)
  const myBookings = (adminState.liveOps || []).filter(op => 
    op.type === 'job' && op.text.includes(currentUser.name || currentUser.email)
  );

  const isNewUser = currentUser?.isNew || false;

  return (
    <div id="view-worker-dashboard" className="app-view active-view container" style={{ padding: '40px 0' }}>
      <Breadcrumbs paths={[{ label: "Specialist Dashboard", active: true }]} />
      
      <header className="dashboard-header" style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '32px' }}>
              {isNewUser ? `Welcome to the Team, ${currentUser.name || 'Specialist'}!` : `Welcome back, ${currentUser.name || 'Specialist'}!`}
            </h1>
            <p style={{ color: 'var(--text-muted)' }}>
              {isNewUser ? 'Set up your profile to start receiving job bookings.' : 'Manage your active projects and track your earnings.'}
            </p>
          </div>
          <div className="status-badge" style={{ padding: '8px 16px', background: '#ecfdf5', color: '#10b981', borderRadius: '20px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="live-pulse" style={{ width: '8px', height: '8px' }}></span> Available for Work
          </div>
        </div>
      </header>

      {/* WORKER STATS */}
      <section className="admin-metrics-grid" style={{ marginBottom: '40px' }}>
        <div className="metric-card">
          <div className="metric-header"><span>Monthly Earnings</span></div>
          <div className="metric-value">{isNewUser ? '₹0' : stats.earnings}</div>
          {!isNewUser && <p style={{ fontSize: '12px', color: '#10b981', marginTop: '4px' }}>▲ 15% from last month</p>}
        </div>
        <div className="metric-card">
          <div className="metric-header"><span>Completed Jobs</span></div>
          <div className="metric-value">{isNewUser ? '0' : stats.completedJobs}</div>
        </div>
        <div className="metric-card">
          <div className="metric-header"><span>Average Rating</span></div>
          <div className="metric-value">{isNewUser ? 'New' : `★ ${stats.rating}`}</div>
        </div>
        <div className="metric-card">
          <div className="metric-header"><span>Profile Views</span></div>
          <div className="metric-value">{isNewUser ? '0' : stats.profileViews}</div>
        </div>
      </section>

      <div className="admin-layout" style={{ background: 'white', borderRadius: '16px', border: '1px solid #cbd5e1', overflow: 'hidden' }}>
        {/* TAB NAVIGATION */}
        <div className="panel-header" style={{ borderBottom: '1px solid #f1f5f9', padding: '0 20px' }}>
          <div className="toggle-buttons" style={{ margin: '10px 0' }}>
            <button className={`toggle-btn ${activeTab === 'bookings' ? 'active' : ''}`} onClick={() => setActiveTab('bookings')}>Upcoming Bookings</button>
            <button className={`toggle-btn ${activeTab === 'messages' ? 'active' : ''}`} onClick={() => setActiveTab('messages')}>Customer Messages</button>
            <button className={`toggle-btn ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>Profile Settings</button>
          </div>
        </div>

        <div style={{ padding: '24px' }}>
          {activeTab === 'bookings' && (
            <div className="bookings-list">
              {myBookings.length === 0 ? (
                <div className="text-center" style={{ padding: '60px 0' }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>📅</div>
                  <h3>No Bookings Yet</h3>
                  <p style={{ color: 'var(--text-muted)', maxWidth: '400px', margin: '0 auto' }}>
                    Once customers hire you for projects, their booking requests will appear here for you to accept.
                  </p>
                </div>
              ) : (
                myBookings.map((job, idx) => (
                  <div key={idx} className="feed-item" style={{ padding: '16px', border: '1px solid #f1f5f9', borderRadius: '12px', marginBottom: '12px' }}>
                    <div className="feed-icon-box blue-bg">J</div>
                    <div className="feed-body" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <p style={{ fontWeight: 600 }}>{job.text}</p>
                        <span className="feed-time">Assigned {job.time}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                         <button className="btn btn-primary btn-small">Accept</button>
                         <button className="btn btn-outline btn-small">Decline</button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'messages' && (
            <div className="text-center" style={{ padding: '60px 0' }}>
               <div style={{ fontSize: '48px', marginBottom: '16px' }}>💬</div>
               <h3>No Customer Messages</h3>
               <p style={{ color: 'var(--text-muted)', maxWidth: '400px', margin: '0 auto' }}>
                 Customer inquiries and project discussions will be synced securely with Dataverse here.
               </p>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="settings-form" style={{ maxWidth: '600px' }}>
              <div className="form-group">
                <label className="form-label">Professional Bio</label>
                <textarea className="form-input" rows="4" defaultValue={isNewUser ? "" : `I am a professional specialist with over ${stats.completedJobs} successful projects on Build_Trust.`} placeholder="Describe your experience and specialties..."></textarea>
              </div>
              <div className="form-row">
                <div className="form-group flex-1">
                  <label className="form-label">Hourly Rate (₹)</label>
                  <input type="number" className="form-input" defaultValue={isNewUser ? "" : "450"} placeholder="e.g. 500" />
                </div>
                <div className="form-group flex-1">
                  <label className="form-label">Available Radius (km)</label>
                  <input type="number" className="form-input" defaultValue={isNewUser ? "" : "15"} placeholder="e.g. 10" />
                </div>
              </div>
              <button className="btn btn-accent">Save Profile Changes</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
