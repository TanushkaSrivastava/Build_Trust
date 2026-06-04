import React, { useState } from 'react';

export default function LandingView({ 
  workers, 
  setActiveView, 
  setSearchFilters, 
  onOpenBookingWizard, 
  onOpenAiTool, 
  onOpenPostJob 
}) {
  const [activeFaq, setActiveFaq] = useState(null);
  const [activeTab, setActiveTab] = useState('ai'); // 'ai' or 'search'
  const [category, setCategory] = useState('Electrical');
  const [location, setLocation] = useState('Sector 62, Noida');
  const [priority, setPriority] = useState('Standard');
  const [searchSkill, setSearchSkill] = useState('');
  
  // Reserve scheduling states
  const [reserveDate, setReserveDate] = useState(new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10));
  const [reserveHours, setReserveHours] = useState(8);

  const featuredWorkers = workers.slice(0, 3); // Featured specialists

  const handleServiceClick = (specialty) => {
    setSearchFilters(prev => ({
      ...prev,
      category: specialty,
      text: specialty
    }));
    setActiveView('search');
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSearchFilters(prev => ({
      ...prev,
      category: 'All',
      text: searchSkill || ''
    }));
    setActiveView('search');
  };

  const handleAiSubmit = (e) => {
    e.preventDefault();
    // Open the AI Estimator tool
    onOpenAiTool();
  };

  const handleReserveSubmit = (e) => {
    e.preventDefault();
    setSearchFilters(prev => ({
      ...prev,
      category: 'All',
      text: ''
    }));
    setActiveView('search');
    // Directing to search page so they can book with these dates
    const event = new CustomEvent('show-toast', { 
      detail: { 
        message: `Reserve schedule set: ${reserveDate} (${reserveHours} hrs). Select a worker to book.`, 
        type: 'info' 
      } 
    });
    window.dispatchEvent(event);
  };

  const faqs = [
    {
      q: "How does Build_Trust verify specialists?",
      a: "Every tradesperson on our platform undergoes a thorough verification process. This includes national identity verification, trade license checks, background checks, and standard skills assessments to ensure quality craftsmanship."
    },
    {
      q: "How does the Escrow Payment system work?",
      a: "When you book a specialist, your payment is placed in a secure escrow account. The funds are held safely and are only released to the worker once you inspect and approve the completed job."
    }
  ];

  return (
    <div id="view-home" className="app-view active-view landing-uber-style">
      {/* 1. HERO SPLIT GRID SECTION */}
      <section className="hero-split-section">
        <div className="container hero-split-grid">
          
          {/* Left Column: Uber-style Booking Widget */}
          <div className="hero-widget-column">
            <div className="uber-style-widget">
              {/* Tab headers */}
              <div className="widget-tabs">
                <button 
                  className={`tab-btn ${activeTab === 'ai' ? 'active' : ''}`}
                  onClick={() => setActiveTab('ai')}
                >
                  <svg viewBox="0 0 24 24" width="18" height="18" className="tab-icon">
                    <path fill="currentColor" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/>
                  </svg>
                  AI Project Scoper
                </button>
                <button 
                  className={`tab-btn ${activeTab === 'search' ? 'active' : ''}`}
                  onClick={() => setActiveTab('search')}
                >
                  <svg viewBox="0 0 24 24" width="18" height="18" className="tab-icon">
                    <path fill="currentColor" d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
                  </svg>
                  Search Workers
                </button>
              </div>

              {/* Tab Panel: AI Scoper Form */}
              {activeTab === 'ai' && (
                <form className="widget-form animate-fade" onSubmit={handleAiSubmit}>
                  <h2>Request a specialist for now or later</h2>
                  <span className="promo-badge">🛡️ Upfront AI estimates & 100% verified trade professionals.</span>
                  
                  <div className="widget-inputs-wrap">
                    <div className="vertical-timeline-line">
                      <div className="timeline-dot dot-start"></div>
                      <div className="timeline-dot dot-end"></div>
                    </div>

                    <div className="form-group-widget">
                      <label>Project Specialty</label>
                      <select 
                        className="widget-select" 
                        value={category} 
                        onChange={(e) => setCategory(e.target.value)}
                      >
                        <option value="Electrical">Electrical Works</option>
                        <option value="Masonry">Masonry & Concrete</option>
                        <option value="Painting">Painting & Drywall</option>
                        <option value="Plumbing">Plumbing Works</option>
                        <option value="General">General Repairs</option>
                      </select>
                    </div>

                    <div className="form-group-widget">
                      <label>Project Site Address</label>
                      <div className="widget-input-icon-wrapper">
                        <input 
                          type="text" 
                          className="widget-input"
                          placeholder="Enter project site address..."
                          value={location}
                          onChange={(e) => setLocation(e.target.value)}
                          required
                        />
                        <button type="button" className="gps-btn" title="Use current location" onClick={() => setLocation('Greater Noida, NCR')}>
                          <svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17.93c-3.95-.49-7-3.85-7-7.93s3.05-7.44 7-7.93v15.86zm2 0V4.07c3.95.49 7 3.85 7 7.93s-3.05 7.44-7 7.93z"/></svg>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="form-group-widget inline-priority">
                    <select 
                      className="widget-select select-priority" 
                      value={priority} 
                      onChange={(e) => setPriority(e.target.value)}
                    >
                      <option value="Standard">📅 Book with Standard Schedule</option>
                      <option value="Emergency">🚨 Dispatch onsite within 2 hours</option>
                    </select>
                  </div>

                  <button type="submit" className="btn btn-accent btn-full widget-submit-btn">
                    Request AI Estimate
                  </button>
                </form>
              )}

              {/* Tab Panel: Search Form */}
              {activeTab === 'search' && (
                <form className="widget-form animate-fade" onSubmit={handleSearchSubmit}>
                  <h2>Find verified local specialists</h2>
                  <span className="promo-badge">🛡️ Direct search from NCR's largest vended worker pool.</span>
                  
                  <div className="widget-inputs-wrap">
                    <div className="vertical-timeline-line">
                      <div className="timeline-dot dot-start"></div>
                      <div className="timeline-dot dot-end"></div>
                    </div>

                    <div className="form-group-widget">
                      <label>What trade or skill do you need?</label>
                      <input 
                        type="text" 
                        className="widget-input"
                        placeholder="e.g. Mason, Electrician, Plumber..."
                        value={searchSkill}
                        onChange={(e) => setSearchSkill(e.target.value)}
                        required
                      />
                    </div>

                    <div className="form-group-widget">
                      <label>Project Site Location</label>
                      <div className="widget-input-icon-wrapper">
                        <input 
                          type="text" 
                          className="widget-input"
                          placeholder="e.g. Sector 62, Noida"
                          value={location}
                          onChange={(e) => setLocation(e.target.value)}
                          required
                        />
                        <button type="button" className="gps-btn" title="Use current location" onClick={() => setLocation('Greater Noida, NCR')}>
                          <svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17.93c-3.95-.49-7-3.85-7-7.93s3.05-7.44 7-7.93v15.86zm2 0V4.07c3.95.49 7 3.85 7 7.93s-3.05 7.44-7 7.93z"/></svg>
                        </button>
                      </div>
                    </div>
                  </div>

                  <button type="submit" className="btn btn-accent btn-full widget-submit-btn">
                    Search Specialists
                  </button>
                </form>
              )}

            </div>
          </div>

          {/* Right Column: Uber-style Hero Graphic Card */}
          <div className="hero-graphic-column">
            <div 
              className="uber-hero-graphic-card"
              style={{ backgroundImage: `url('/assets/images/hero_worker_architect.png')` }}
            >
              {/* Graphic element matches visual layout in Screenshot 1 */}
            </div>
          </div>

        </div>
      </section>

      {/* 2. TRUST METRICS SECTION */}
      <section className="stats-strip-landing">
        <div className="container stats-container-landing">
          <div className="stat-card-landing">
            <h3>150+</h3>
            <p>Completed Projects</p>
          </div>
          <div className="stat-card-landing">
            <h3>₹5 Lakhs+</h3>
            <p>Protected Payments</p>
          </div>
          <div className="stat-card-landing">
            <h3>50+</h3>
            <p>Verified Specialists</p>
          </div>
          <div className="stat-card-landing">
            <h3>4.9★</h3>
            <p>Average Rating</p>
          </div>
        </div>
      </section>

      {/* 3. EXPLORE SERVICES SECTION (Uber Grid Style) */}
      <section className="explore-services-section container">
        <h2 className="section-title">Explore what you can build with Build_Trust</h2>
        <p className="section-subtitle">Vetted local specialists ready to deploy for any project scope.</p>
        
        <div className="explore-grid">
          
          <div className="explore-card">
            <div className="explore-icon-box">
              <svg viewBox="0 0 24 24" width="32" height="32" style={{ color: 'var(--color-accent)' }}>
                <path fill="currentColor" d="M7 2v11h3v9l7-12h-4l4-8z"/>
              </svg>
            </div>
            <h3>Electrical</h3>
            <p>Certified wiremen for home installations, panel upgrades, and smart home automation.</p>
            <button className="btn-details-link" onClick={() => handleServiceClick('Electrical')}>
              Details &gt;
            </button>
          </div>

          <div className="explore-card">
            <div className="explore-icon-box">
              <svg viewBox="0 0 24 24" width="32" height="32" style={{ color: 'var(--color-accent)' }}>
                <path fill="currentColor" d="M19 4H5c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-9 14H5v-4h5v4zm0-5H5V9h5v4zm9 5h-8v-4h8v4zm0-5h-8V9h8v4z"/>
              </svg>
            </div>
            <h3>Masonry</h3>
            <p>Stone walls, concrete paving, and structural masonry repairs by verified bricklayers.</p>
            <button className="btn-details-link" onClick={() => handleServiceClick('Masonry')}>
              Details &gt;
            </button>
          </div>

          <div className="explore-card">
            <div className="explore-icon-box">
              <svg viewBox="0 0 24 24" width="32" height="32" style={{ color: 'var(--color-accent)' }}>
                <path fill="currentColor" d="M19 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h4l3 3 3-3h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-7 16c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z"/>
              </svg>
            </div>
            <h3>Painting</h3>
            <p>Exterior coatings, interior finishings, and drywall texturing by professional painters.</p>
            <button className="btn-details-link" onClick={() => handleServiceClick('Painting')}>
              Details &gt;
            </button>
          </div>

          <div className="explore-card">
            <div className="explore-icon-box">
              <svg viewBox="0 0 24 24" width="32" height="32" style={{ color: 'var(--color-accent)' }}>
                <path fill="currentColor" d="M12 2c-4.97 0-9 4.03-9 9 0 5.25 9 11 9 11s9-5.75 9-11c0-4.97-4.03-9-9-9zm0 13c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z"/>
              </svg>
            </div>
            <h3>Plumbing</h3>
            <p>Leak repairs, pipe installations, and water fixture replacements by trade plumbing experts.</p>
            <button className="btn-details-link" onClick={() => handleServiceClick('Plumbing')}>
              Details &gt;
            </button>
          </div>

          <div className="explore-card">
            <div className="explore-icon-box">
              <svg viewBox="0 0 24 24" width="32" height="32" style={{ color: 'var(--color-accent)' }}>
                <path fill="currentColor" d="M19 13H5v-2h14v2z"/>
              </svg>
            </div>
            <h3>Carpentry</h3>
            <p>Custom wood furniture, cabinet installations, and structural timber framing repairs.</p>
            <button className="btn-details-link" onClick={() => handleServiceClick('Carpentry')}>
              Details &gt;
            </button>
          </div>

          <div className="explore-card">
            <div className="explore-icon-box">
              <svg viewBox="0 0 24 24" width="32" height="32" style={{ color: 'var(--color-accent)' }}>
                <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
              </svg>
            </div>
            <h3>AI Cost Audit</h3>
            <p>Comprehensive scoping, materials estimation, and average NCR trade pricing audits.</p>
            <button className="btn-details-link" onClick={onOpenAiTool}>
              Details &gt;
            </button>
          </div>

        </div>
      </section>

      {/* 4. PLATFORM MEMBERSHIP / GUARANTEE BANNER (Uber One Style) */}
      <section className="escrow-membership-section container">
        <div className="escrow-membership-banner">
          <div className="membership-left">
            <h2>Build_Trust Secure Escrow</h2>
            <p>100% financial protection. Milestone payments are held in secure escrow and released only after you sign off on work completion.</p>
            <button className="btn btn-outline" onClick={onOpenPostJob}>Post a Job Requirements</button>
          </div>
          <div className="membership-right">
            <img 
              src="/assets/images/secure_escrow_banner.png" 
              alt="Secure Escrow graphic illustration" 
              className="membership-image"
            />
          </div>
        </div>
      </section>

      {/* 5. PLAN FOR LATER / RESERVE SECTION (Uber Reserve Style) */}
      <section className="reserve-section container">
        <h2 className="section-title">Plan for later</h2>
        
        <div className="reserve-wrapper">
          {/* Left Block: Date/Time Picker Form */}
          <div className="reserve-form-box">
            <h3>Get your specialist scheduled with Build_Trust Reserve</h3>
            <form onSubmit={handleReserveSubmit}>
              <div className="form-group-reserve">
                <label>Preferred Project Date</label>
                <input 
                  type="date" 
                  className="reserve-input"
                  value={reserveDate}
                  onChange={(e) => setReserveDate(e.target.value)}
                  required 
                />
              </div>

              <div className="form-group-reserve">
                <label>Estimated Hours Required</label>
                <input 
                  type="number" 
                  className="reserve-input" 
                  min="1" 
                  max="100"
                  value={reserveHours}
                  onChange={(e) => setReserveHours(parseInt(e.target.value) || 1)}
                  required 
                />
              </div>

              <button type="submit" className="btn btn-accent btn-large reserve-next-btn">Next</button>
            </form>
          </div>

          {/* Right Block: Benefits list */}
          <div className="reserve-benefits-box">
            <h3>Benefits</h3>
            <ul className="benefits-list">
              <li>
                <div className="benefit-icon">📅</div>
                <div className="benefit-text">
                  <strong>Flexible Booking</strong>
                  <p>Choose your exact schedule up to 90 days in advance.</p>
                </div>
              </li>
              <li>
                <div className="benefit-icon">🔒</div>
                <div className="benefit-text">
                  <strong>Secure Billing</strong>
                  <p>Funds are held safely and only released when milestones are completed.</p>
                </div>
              </li>
              <li>
                <div className="benefit-icon">✓</div>
                <div className="benefit-text">
                  <strong>Free Cancellations</strong>
                  <p>Cancel or reschedule for free up to 24 hours in advance.</p>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* 6. HOW IT WORKS SECTION */}
      <section className="how-it-works container">
        <h2 className="section-title">How Build_Trust Works</h2>
        <p className="section-subtitle">Secure, transparent, and verified hiring in three simple steps.</p>
        <div className="how-steps-grid">
          <div className="how-step-card">
            <div className="step-badge">1</div>
            <h4>Define Project</h4>
            <p>Describe your repair or maintenance needs. Get instant cost estimates using our AI tool.</p>
          </div>
          <div className="how-step-card">
            <div className="step-badge">2</div>
            <h4>Match Experts</h4>
            <p>Compare background-checked local specialists, verified reviews, and ratings side-by-side.</p>
          </div>
          <div className="how-step-card">
            <div className="step-badge">3</div>
            <h4>Secure & Book</h4>
            <p>Fund escrow to lock your slot. Payment is released only after you approve the completed work.</p>
          </div>
        </div>
      </section>

      {/* 7. TOP-RATED PROFESSIONALS SECTION */}
      <section className="professionals-section container">
        <div className="section-header">
          <div>
            <h2 className="section-title">Top-Rated Professionals</h2>
            <p className="section-subtitle">Highly skilled workers with 4.8+ ratings and full certification.</p>
          </div>
        </div>
        
        <div className="professionals-carousel-wrapper">
          <div className="professionals-grid" style={{ minWidth: 'auto', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}>
            {featuredWorkers.map(worker => (
              <div key={worker.id} className="worker-card-flat">
                <div 
                  className="worker-card-image" 
                  style={{ backgroundImage: `url('${worker.image}')` }}
                >
                  <span className="rating-badge">★ {worker.rating}</span>
                </div>
                <div className="worker-card-body">
                  <h3>{worker.name} {worker.verified && <span className="verified-icon">✓</span>}</h3>
                  <p className="worker-tagline">{worker.specialty} • {worker.experience || '5'} yrs exp.</p>
                  <div className="worker-card-footer">
                    <div className="rate-info">
                      <span className="rate-label">STARTS AT</span>
                      <span className="rate-val">₹{worker.rate}</span><span className="rate-unit">/hr</span>
                    </div>
                    <button 
                      className="btn btn-primary"
                      onClick={() => {
                        setActiveView(`profile/${worker.id}`);
                      }}
                    >
                      View Profile
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 8. FAQs SECTION */}
      <section className="faq-accordion container">
        <h2 className="section-title">Frequently Asked Questions</h2>
        <p className="section-subtitle">Answers to common queries about our secure booking marketplace.</p>
        <div className="faq-list">
          {faqs.map((faq, index) => (
            <div 
              key={index} 
              className={`faq-item ${activeFaq === index ? 'active' : ''}`}
              onClick={() => setActiveFaq(activeFaq === index ? null : index)}
            >
              <div className="faq-question">
                <h4>{faq.q}</h4>
                <span className="faq-icon-toggle">{activeFaq === index ? '−' : '+'}</span>
              </div>
              <div className="faq-answer">
                <p>{faq.a}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 9. READY TO START CTA */}
      <section className="cta-banner">
        <div className="container cta-container">
          <h2>Ready to start your project?</h2>
          <p>Join over 150 project managers and homeowners who trust Build_Trust for their structural and maintenance needs.</p>
          <div className="cta-actions">
            <button className="btn btn-accent btn-large" onClick={onOpenPostJob}>Post a Job</button>
            <button className="btn btn-outline btn-large" onClick={() => setActiveView('search')}>Browse Workers</button>
          </div>
        </div>
      </section>
    </div>
  );
}
