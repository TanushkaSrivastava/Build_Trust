import React from 'react';
import { Link } from 'react-router-dom';
import Breadcrumbs from './Breadcrumbs';

export default function CustomerProfileView({ 
  currentUser, 
  adminState, 
  chatLogs, 
  workers,
  setActiveView 
}) {
  // Mock data for customer specific bookings if not present in liveOps
  const customerBookings = (adminState.liveOps || []).filter(op => 
    op.type === 'job' && (op.text.includes('Hired') || op.text.includes('accepted'))
  );

  const activeChats = Object.keys(chatLogs).map(workerId => {
    const worker = workers.find(w => w.id === workerId);
    const lastMsg = chatLogs[workerId][chatLogs[workerId].length - 1];
    return {
      id: workerId,
      name: worker?.name || 'Specialist',
      specialty: worker?.specialty || 'General',
      lastMessage: lastMsg?.text || 'No messages yet',
      time: lastMsg?.time || 'Just now',
      image: worker?.image
    };
  });

  const isNewUser = currentUser?.isNew || false;

  return (
    <div className="container" style={{ padding: '40px 0' }}>
      <Breadcrumbs paths={[{ label: "My Profile", active: true }]} />
      
      <div className="profile-header-card" style={{ marginBottom: '40px', padding: '30px', background: 'white', borderRadius: '16px', border: '1px solid #cbd5e1', display: 'flex', alignItems: 'center', gap: '24px' }}>
        <div className="user-avatar-large" style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--color-accent)', color: 'white', display: 'flex', alignItems: 'center', justifyCenter: 'center', fontSize: '32px', fontWeight: 'bold' }}>
          {currentUser?.email?.charAt(0).toUpperCase()}
        </div>
        <div>
          <h1 style={{ fontSize: '28px', marginBottom: '4px' }}>
            {isNewUser ? 'Welcome to Build_Trust!' : 'Welcome back!'}
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>{currentUser?.email}</p>
          <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
            <span className="badge badge-blue">Verified Customer</span>
            <span className="badge badge-green">{customerBookings.length} Active Bookings</span>
          </div>
        </div>
      </div>

      <div className="admin-double-column">
        {/* ACTIVE BOOKINGS */}
        <div className="admin-panel">
          <div className="panel-header">
            <h3>My Active Bookings</h3>
          </div>
          <div className="live-feed-list" style={{ minHeight: '300px' }}>
            {customerBookings.length === 0 ? (
              <div className="text-center" style={{ padding: '60px 20px' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>🛠️</div>
                <h3>No Bookings Yet</h3>
                <p style={{ color: 'var(--text-muted)', marginBottom: '24px', maxWidth: '300px', margin: '0 auto 24px' }}>
                  Find and book verified specialists for your construction or repair projects.
                </p>
                <Link to="/search" className="btn btn-primary">Browse Specialists</Link>
              </div>
            ) : (
              customerBookings.map((booking, idx) => (
                <div key={idx} className="feed-item" style={{ padding: '16px', borderBottom: '1px solid #f1f5f9' }}>
                  <div className="feed-icon-box green-bg">✓</div>
                  <div className="feed-body">
                    <p style={{ fontWeight: 500 }}>{booking.text}</p>
                    <span className="feed-time">{booking.time}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* RECENT CHATS */}
        <div className="admin-panel">
          <div className="panel-header">
            <h3>Recent Conversations</h3>
          </div>
          <div className="chat-list" style={{ minHeight: '300px' }}>
            {activeChats.length === 0 ? (
              <div className="text-center" style={{ padding: '60px 20px' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>💬</div>
                <h3>No Messages</h3>
                <p style={{ color: 'var(--text-muted)', maxWidth: '300px', margin: '0 auto' }}>
                  When you message a specialist, your conversations will appear here.
                </p>
              </div>
            ) : (
              activeChats.map(chat => (
                <div 
                  key={chat.id} 
                  className="feed-item" 
                  style={{ cursor: 'pointer', padding: '16px', borderBottom: '1px solid #f1f5f9' }}
                  onClick={() => {
                    setActiveView(`profile/${chat.id}`);
                  }}
                >
                  <div className="user-avatar-circle" style={{ width: '40px', height: '40px', fontSize: '14px' }}>
                    {chat.name.charAt(0)}
                  </div>
                  <div className="feed-body">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <p style={{ fontWeight: 600 }}>{chat.name}</p>
                      <span className="feed-time">{chat.time}</span>
                    </div>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {chat.lastMessage}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
