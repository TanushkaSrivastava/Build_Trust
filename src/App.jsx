import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, useNavigate, useLocation, useParams, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import Header from './components/Header';
import Footer from './components/Footer';
import LandingView from './components/LandingView';
import SearchView from './components/SearchView';
import ProfileView from './components/ProfileView';
import AdminView from './components/AdminView';
import CustomerProfileView from './components/CustomerProfileView';
import WorkerDashboardView from './components/WorkerDashboardView';
import LoginPage from './components/LoginPage';
import SignupPage from './components/SignupPage';
import AuthCard from './components/AuthCard';

import { initialWorkers, initialAdminState } from './data/mockData';

// Wrapper to handle ProfileView with URL params
function ProfileViewWrapper({ 
  workers, 
  changeRoute, 
  setBookingWorkerId, 
  setWizardStep, 
  setActiveModal, 
  chatLogs, 
  setChatLogs, 
  setChattingWorkerId, 
  addToast,
  isLoggedIn,
  currentUser
}) {
  const { id } = useParams();

  // FETCH CHAT HISTORY ON LOAD
  useEffect(() => {
    if (isLoggedIn && id) {
      const fetchChat = async () => {
        try {
          const res = await authenticatedFetch(`http://localhost:8005/api/chat/${id}`);
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            setChatLogs(prev => ({ ...prev, [id]: data }));
          }
        } catch (err) {
          // AUTH_INVALID handled by authenticatedFetch
          console.error("Chat fetch failed", err);
        }
      };
      fetchChat();
    }
  }, [id, isLoggedIn]);

  return (
    <ProfileView 
      workerId={id}
      workers={workers}
      setActiveView={changeRoute}
      onOpenBookingWizard={(workerId) => {
        if (!isLoggedIn) {
          addToast("Please login to book specialists", "info");
          setAuthModalMode('signup');
          setActiveModal('login');
          return;
        }
        setBookingWorkerId(workerId);
        setWizardStep(1);
        setActiveModal('booking');
      }}
      onOpenChatSimulator={(workerId) => {
        if (!isLoggedIn) {
          addToast("Please login to chat with specialists", "info");
          setAuthModalMode('signup');
          setActiveModal('login');
          return;
        }
        setChattingWorkerId(workerId);
        setActiveModal('chat');
      }}
      onCallWorker={(name) => {
        if (!isLoggedIn) {
          addToast("Please login to connect with specialists via direct call", "info");
          setAuthModalMode('signup');
          setActiveModal('login');
          return;
        }
        addToast(`Initiating secure direct call connection with ${name}...`, 'info');
      }}
    />
  );
}

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();

  // Navigation & Location states
  const [currentLocation, setCurrentLocation] = useState('Greater Noida');

  // React Global Databases
  const [workers, setWorkers] = useState([]);
  const [adminState, setAdminState] = useState(initialAdminState);
  const [isLoadingWorkers, setIsLoadingWorkers] = useState(true);
  const [isLoadingAdmin, setIsLoadingAdmin] = useState(true);

  // AUTH STATE
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authModalMode, setAuthModalMode] = useState('login');
  const [authStep, setAuthStep] = useState('identify'); // identify, login_options, verify_otp, register
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authRole, setAuthRole] = useState("customer");
  const [authName, setAuthName] = useState("");
  const [otpValue, setOtpValue] = useState("");
  const [otpCooldown, setOtpCooldown] = useState(0);

  // Restore session from localStorage on load
  useEffect(() => {
    const token = localStorage.getItem('bt_token');
    const cachedUser = localStorage.getItem('bt_user');
    if (token && cachedUser) {
      setIsLoggedIn(true);
      setCurrentUser(JSON.parse(cachedUser));
    }
  }, []);

  // Filter conditions
  const [searchFilters, setSearchFilters] = useState({
    text: "",
    category: "All",
    budget: 1000,
    rating: null,
    distance: 15
  });

  // KEEPALIVE / WAKE UP BACKEND (HuggingFace Cold Start)
  useEffect(() => {
    const wakeup = async () => {
      try {
        await fetch('http://localhost:8005/');
        console.log("Backend wake-up signal sent successfully.");
      } catch (err) {
        console.warn("Backend still sleeping or unreachable.");
      }
    };
    wakeup();
  }, []);

  // AGENTIC AI STATE
  const [aiChatMessages, setAiChatMessages] = useState([]);
  const [aiInput, setAiInput] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiAuditResult, setAiAuditResult] = useState(null);
  const [aiStep, setAiStep] = useState(1); // 1, 2, 3
  const [aiChips, setAiChips] = useState([]);
  const [showAiInput, setShowAiInput] = useState(false);
  const [pendingAiResult, setPendingAiResult] = useState(null);
  const [isPaymentStep, setIsPaymentStep] = useState(false);
  const [isBookingComplete, setIsBookingComplete] = useState(false);
  const aiChatEndRef = useRef(null);

  const openAiTool = () => {
    setAiAuditResult(null);
    setPendingAiResult(null);
    setAiStep(1);
    setAiChips([]);
    setShowAiInput(false);
    setAiChatMessages([{ role: "assistant", content: "Namaste! I am the Build_Trust Project Manager. What kind of construction or repair work do you need today?" }]);
    setActiveModal('ai');
  };

  // OTP Timer Effect
  useEffect(() => {
    let interval;
    if (otpCooldown > 0) {
      interval = setInterval(() => {
        setOtpCooldown(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [otpCooldown]);

  // Scroll AI chat to bottom
  useEffect(() => {
    aiChatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [aiChatMessages]);

  const authenticatedFetch = async (url, options = {}) => {
    const token = localStorage.getItem('bt_token');
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
    
    try {
      const response = await fetch(url, { ...options, headers });
      
      // AUTO LOGOUT ON EXPIRED OR UNAUTHORIZED SESSION
      if (response.status === 401 || response.status === 403) {
        const errorData = await response.json().catch(() => ({}));
        console.warn("🔐 Auth Security Triggered:", errorData.detail || "Session invalid");
        
        // Clear everything
        localStorage.removeItem('bt_token');
        localStorage.removeItem('bt_user');
        setIsLoggedIn(false);
        setCurrentUser(null);
        setActiveModal(null);
        navigate('/login');
        
        addToast(errorData.detail || "Your session has expired. Please login again.", "warning");
        throw new Error("AUTH_INVALID");
      }
      
      return response;
    } catch (err) {
      if (err.message === "AUTH_INVALID") throw err;
      console.error("Fetch failed:", err);
      throw err;
    }
  };

  // FETCH WORKERS FROM BACKEND (with SWR Caching)
  const fetchWorkers = async (filters = searchFilters, page = 1) => {
    setIsLoadingWorkers(true);
    
    // SWR: Load from cache first if first page
    if (page === 1) {
      const cached = localStorage.getItem('bt_cache_workers');
      if (cached) {
        setWorkers(JSON.parse(cached));
        setIsLoadingWorkers(false); // Hide spinner early
      }
    }

    try {
      const queryParams = new URLSearchParams({
        page: page,
        limit: 20,
        category: filters.category,
        text: filters.text,
        min_rating: filters.rating || 0,
        max_rate: filters.budget || 1000000
      });

      const response = await fetch(`http://localhost:8005/api/workers?${queryParams.toString()}`);
      const data = await response.json();
      if (Array.isArray(data)) {
        if (page === 1) {
          setWorkers(data);
          localStorage.setItem('bt_cache_workers', JSON.stringify(data));
        } else {
          setWorkers(prev => [...prev, ...data]);
        }
      } else {
        console.error("Malformed workers data:", data);
      }
    } catch (err) {
      console.error("Failed to fetch workers:", err);
    } finally {
      setIsLoadingWorkers(false);
    }
  };

  useEffect(() => {
    fetchWorkers();
  }, []);

  // Pre-fetching worker profile on hover
  const prefetchWorker = async (workerId) => {
    // Only prefetch if we don't have it cached or in local state
    // For this prototype, we'll just simulate a trigger
    console.log(`Pre-fetching profile for ${workerId}...`);
  };

  const applyFilters = (newFilters) => {
    setSearchFilters(newFilters);
    fetchWorkers(newFilters, 1);
  };

  // FETCH ADMIN STATS FROM BACKEND (with SWR)
  useEffect(() => {
    let interval;
    const fetchAdminStats = async () => {
      // SECURITY: Only poll if user is actually an admin
      if (currentUser?.role !== 'admin') return;

      // SWR Cache: Load full state
      const cached = localStorage.getItem('bt_cache_admin_state');
      if (cached) setAdminState(JSON.parse(cached));

      setIsLoadingAdmin(true);
      try {
        const [statsRes, opsRes] = await Promise.all([
          authenticatedFetch('http://localhost:8005/api/admin/stats'),
          authenticatedFetch('http://localhost:8005/api/admin/live-ops')
        ]);
        
        const statsData = await statsRes.json();
        const opsData = await opsRes.json();
        
        if (statsData && !statsData.error) {
          setAdminState(prev => {
            const newState = { 
              ...prev, 
              ...statsData, 
              liveOps: Array.isArray(opsData) ? opsData : prev.liveOps 
            };
            localStorage.setItem('bt_cache_admin_state', JSON.stringify(newState));
            return newState;
          });
        }
      } catch (err) {
        // AUTH_INVALID error is handled inside authenticatedFetch
        console.error("Failed to fetch admin data:", err);
      } finally {
        setIsLoadingAdmin(false);
      }
    };
    
    if (isLoggedIn && currentUser?.role === 'admin') {
      fetchAdminStats();
      interval = setInterval(fetchAdminStats, 30000); // Sync every 30s
    }
    return () => clearInterval(interval);
  }, [isLoggedIn, currentUser]);
  
  // Modals & Overlays Visibility
  const [activeModal, setActiveModal] = useState(null); 
  const [bookingWorkerId, setBookingWorkerId] = useState(null);
  const [chattingWorkerId, setChattingWorkerId] = useState(null);
  
  // Comparison lists
  const [comparisonList, setComparisonList] = useState([]);

  // Toasts notifications queue
  const [toasts, setToasts] = useState([]);

  // Persistent Chat logs { workerId: [messages] }
  const [chatLogs, setChatLogs] = useState({});

  // Navigation Sync
  const changeRoute = (viewName) => {
    if (viewName === 'home') navigate('/');
    else if (viewName === 'search') navigate('/search');
    else if (viewName === 'admin') navigate('/admin');
    else if (viewName === 'profile') navigate('/profile');
    else if (viewName === 'worker-dashboard') navigate('/worker-dashboard');
    else if (viewName.startsWith('profile/')) {
      const id = viewName.split('/')[1];
      navigate(`/profile/${id}`);
    }
  };

  // 2. TOAST NOTIFICATION HANDLER
  const addToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3500);
  };

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl+K to open AI Tool
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        openAiTool();
      }
      // Esc to close modals and menu
      if (e.key === 'Escape') {
        setActiveModal(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const handleToastEvent = (e) => {
      const { message, type } = e.detail;
      addToast(message, type);
    };
    window.addEventListener('show-toast', handleToastEvent);
    return () => window.removeEventListener('show-toast', handleToastEvent);
  }, []);

  // 3. BOOKING WIZARD HANDLERS
  const [wizardStep, setWizardStep] = useState(1);
  const [wizardForm, setWizardForm] = useState({
    description: "Need masonry stone work repair for my garden patio walls.",
    address: "Sector 62, Noida",
    date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().substring(0,10),
    hours: 8,
    priority: "Standard"
  });

  const handleBookingConfirm = async () => {
    // SECURITY CHECK: MANDATORY LOGIN
    if (!isLoggedIn) {
      setAuthStep('identify');
      setActiveModal('login');
      addToast("Please login to finalize your booking", "info");
      return;
    }

    if (isBookingComplete) {
      setActiveModal(null);
      setIsBookingComplete(false);
      setIsPaymentStep(false);
      navigate('/profile');
      return;
    }

    if (!isPaymentStep) {
      setIsPaymentStep(true);
      setWizardStep(4); // New step for payment
      return;
    }

    const worker = workers.find(w => w.id === bookingWorkerId);
    if (!worker) return;

    const totalCost = worker.rate * wizardForm.hours;
    
    const bookingPayload = {
      workerName: worker.name,
      description: wizardForm.description,
      address: wizardForm.address,
      hours: wizardForm.hours,
      totalCost: totalCost,
      date: wizardForm.date
    };

    try {
      const response = await authenticatedFetch('http://localhost:8005/api/jobs', {
        method: 'POST',
        body: JSON.stringify(bookingPayload)
      });
      const data = await response.json();

      if (data.status === "success" || data.status === "mock_success") {
        setAdminState(prev => {
          const newActiveJobs = (prev.activeJobs || 0) + 1;
          const newOnSchedule = (prev.onSchedule || 0) + 1;
          
          const newLiveOps = [
            {
              id: Date.now(),
              text: `Hired: ${worker.name} at ${wizardForm.address} (₹${totalCost.toLocaleString()})`,
              time: "Just now",
              type: "job",
              icon: "✓",
              color: "green-bg"
            },
            ...(prev.liveOps || [])
          ];

          return { ...prev, activeJobs: newActiveJobs, onSchedule: newOnSchedule, liveOps: newLiveOps };
        });
        
        setIsBookingComplete(true);
        setWizardStep(5);
        addToast(`Payment successful! ${worker.name} is booked.`);
      }
    } catch (err) {
      console.error("Failed to confirm booking:", err);
      addToast("Connection delay: your booking will sync when back online.", "warning");
    }
  };

  // 4. POST JOB WIZARD HANDLERS
  const [postJobForm, setPostJobForm] = useState({
    title: "",
    category: "Electrical",
    location: "Sector 62, Noida",
    budget: "₹15,000",
    desc: ""
  });

  const handlePostJobConfirm = async () => {
    if (postJobForm.title.trim() === "" || postJobForm.location.trim() === "") {
      addToast("Please fill all required project details", "info");
      return;
    }

    // OPTIMISTIC UI
    setActiveModal(null);
    addToast("Posting your project requirements...", "info");

    try {
      const response = await authenticatedFetch('http://localhost:8005/api/leads', {
        method: 'POST',
        body: JSON.stringify(postJobForm)
      });
      const data = await response.json();
      
      if (data.status === "success" || data.status === "mock_success") {
        setAdminState(prev => {
          const newPendingLeads = (prev.pendingLeads || 0) + 1;
          const newLiveOps = [
            {
              id: Date.now(),
              text: `Lead Posted: "${postJobForm.title}" (${postJobForm.category})`,
              time: "Just now",
              type: "lead",
              icon: "★",
              color: "blue-bg"
            },
            ...(prev.liveOps || [])
          ];

          return {
            ...prev,
            pendingLeads: newPendingLeads,
            liveOps: newLiveOps
          };
        });
        addToast("Project requirements live on Dataverse!");
      }
    } catch (err) {
      console.error("Failed to post lead:", err);
    }
  };

  // 5. AUTH HANDLERS (REFACTORED)
  const handleIdentifyEmail = async () => {
    const email = authEmail.trim().toLowerCase();
    if (!email.includes("@")) {
      addToast("Please enter a valid email address", "info");
      return;
    }
    console.log(`Identifying email: ${email}`);
    try {
      const res = await fetch('http://localhost:8005/api/auth/check-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email })
      });
      const data = await res.json();
      console.log("Check-email response:", data);
      if (data.exists) {
        setAuthStep('login_options');
      } else {
        handleSendOtp(true);
      }
    } catch (err) {
      console.error("Identity check failed:", err);
      addToast("Backend unreachable. Ensure FastAPI is running on port 8005.", "error");
    }
  };

  const handleSendOtp = async (isRegistering = false) => {
    try {
      const res = await fetch('http://localhost:8005/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: authEmail })
      });
      const data = await res.json();
      if (data.status === "success") {
        setAuthStep('verify_otp');
        setOtpCooldown(60); 
        addToast("Verification code sent to your inbox!");
      } else {
        addToast(data.message, "error");
      }
    } catch (err) {
      addToast("Failed to send OTP", "error");
    }
  };

  const handleLoginPassword = async () => {
    const email = authEmail.trim().toLowerCase();
    const password = authPassword;
    console.log(`Login attempt for: ${email}`);
    try {
      const res = await fetch('http://localhost:8005/api/auth/login-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email, password: password })
      });
      const data = await res.json();
      console.log("Login-password response:", data);
      if (data.status === "success") {
        loginSuccess(data);
      } else {
        addToast(data.detail || "Invalid credentials", "error");
      }
    } catch (err) {
      console.error("Login failed:", err);
      addToast("Login service unreachable.", "error");
    }
  };

  const handleVerifyOtp = async () => {
    try {
      const res = await fetch('http://localhost:8005/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: authEmail, code: otpValue })
      });
      const data = await res.json();
      if (data.status === "success") {
        // If they exist, log them in. If not, go to register profile.
        const checkRes = await fetch('http://localhost:8005/api/auth/check-email', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ email: authEmail })
        });
        const checkData = await checkRes.json();
        
        if (checkData.exists) {
           loginSuccess(data);
        } else {
           setAuthStep('register');
        }
      } else {
        addToast(data.message, "error");
      }
    } catch (err) {
      addToast("Verification failed", "error");
    }
  };

  const handleRegisterUser = async () => {
     if (!authName || !authPassword) {
        addToast("Please fill all required fields", "info");
        return;
     }
     try {
       const res = await fetch('http://localhost:8005/api/auth/register', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({
           email: authEmail,
           password: authPassword,
           role: authRole,
           fullName: authName
         })
       });
       const data = await res.json();
       
       if (res.status === 400 && data.detail?.includes("already exists")) {
         addToast(data.detail, "info");
         setAuthStep('login_options'); // Switch to login instead of register
         return;
       }

       if (data.status === "success" || data.status === "mock_success") {
         loginSuccess(data);
         addToast("Account created successfully!");
       }
     } catch (err) {
       addToast("Registration failed", "error");
     }
  };

  const loginSuccess = (data) => {
    // Check if user is new (mock logic: if they just registered or have no previous session)
    const isNew = data.isNew || !localStorage.getItem('bt_user');
    const userWithNewFlag = { ...data.user, isNew };

    localStorage.setItem('bt_token', data.token);
    localStorage.setItem('bt_user', JSON.stringify(userWithNewFlag));
    setIsLoggedIn(true);
    setCurrentUser(userWithNewFlag);
    
    const greeting = isNew ? "Welcome to Build_Trust!" : `Welcome back, ${data.user.name || data.user.email}!`;
    addToast(greeting);
    
    // REVEAL AI RESULT IF WAITING
    if (pendingAiResult) {
      setAiAuditResult(pendingAiResult);
      setPendingAiResult(null);
      setAiStep(3);
      setShowAiInput(true);
      setActiveModal('ai');
    } else if (bookingWorkerId) {
      setActiveModal('booking');
      setWizardStep(3); 
    } else {
      setActiveModal(null);
      // Route based on role
      if (data.user.role === 'admin') navigate('/admin');
      else if (data.user.role === 'specialist') navigate('/worker-dashboard');
      else navigate('/profile');
    }
  };

  // 6. REAL CHAT HANDLERS
  const [chatInput, setChatInput] = useState("");

  const handleSendChatMessage = async () => {
    if (chatInput.trim() === "" || !isLoggedIn) return;
    
    const workerId = chattingWorkerId;
    const clientMsg = { sender: 'client', text: chatInput, pending: true };
    
    // OPTIMISTIC UI update
    setChatLogs(prev => {
      const list = prev[workerId] || [];
      return { ...prev, [workerId]: [...list, clientMsg] };
    });
    setChatInput("");

    try {
      await authenticatedFetch('http://localhost:8005/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          workerId: workerId,
          text: clientMsg.text
        })
      });

      // Clear pending state
      setChatLogs(prev => {
        const list = [...(prev[workerId] || [])];
        const last = list[list.length - 1];
        if (last) last.pending = false;
        return { ...prev, [workerId]: list };
      });

    } catch (err) {
      console.error("Chat persistence failed", err);
    }
  };

  // 6. AGENTIC AI CHAT (CHIP-BASED)
  const [aiStatus, setAiStatus] = useState(null);

  const handleAiChatSubmit = async (e, forcedInput = null) => {
    if (e) e.preventDefault();
    const currentInput = forcedInput || aiInput;
    if (!currentInput.trim() || isAiLoading) return;

    if (currentInput === "Login to see results") {
      setAuthStep('identify');
      setActiveModal('login');
      return;
    }

    setAiChips([]);
    setShowAiInput(false);

    const userMsg = { role: "user", content: currentInput };
    const newMessages = [...aiChatMessages, userMsg];
    setAiChatMessages(newMessages);
    setAiInput("");
    setIsAiLoading(true);
    setAiStatus("Analyzing requirements...");

    // Micro-copy sequence for perceived performance
    const statuses = [
      "Consulting construction database...",
      "Matching with NCR specialists...",
      "Calculating cost estimates...",
      "Finalizing project scope..."
    ];
    let statusIdx = 0;
    const statusInterval = setInterval(() => {
      if (statusIdx < statuses.length) {
        setAiStatus(statuses[statusIdx]);
        statusIdx++;
      }
    }, 1500);

    try {
      const response = await fetch('http://localhost:8005/api/ai/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages })
      });
      const data = await response.json();
      clearInterval(statusInterval);
      setAiStatus(null);

      if (data.status === "READY") {
        if (!isLoggedIn) {
          setPendingAiResult(data);
          setAiChatMessages(prev => [...prev, { 
            role: "assistant", 
            content: "Wow, your project sounds incredible! 🛠️ I've just finished running the numbers and found some perfect specialists for you. \n\nTo see your custom cost estimate and view these curated pros, could you please **quickly login**? It helps us keep your project data secure!" 
          }]);
          setAiChips(["Login to see results"]);
          setIsAiLoading(false);
          return;
        }
        setAiAuditResult(data);
        setAiStep(3);
        setShowAiInput(true); 
        setAiChatMessages(prev => [...prev, { role: "assistant", content: data.message }]);
      } else if (data.status === "QUESTION") {
        setAiStep(2);
        setAiChips(data.chips || []);
        setAiChatMessages(prev => [...prev, { role: "assistant", content: data.message }]);
      } else {
        setAiChatMessages(prev => [...prev, { role: "assistant", content: data.message || "I'm not sure how to respond to that." }]);
        setShowAiInput(true);
      }
    } catch (err) {
      clearInterval(statusInterval);
      setAiStatus(null);
      console.error("AI Agent failed", err);
      setAiChatMessages(prev => [...prev, { role: "assistant", content: "Connection timeout. Please check your internet or HuggingFace space status." }]);
      setShowAiInput(true);
    } finally {
      setIsAiLoading(false);
    }
  };

  // 7. ADMIN DASHBOARD ISSUE RESOLVER
  const handleResolveIssue = (issueId) => {
    setAdminState(prev => {
      const remainingIssues = (prev.criticalIssues || []).filter(i => i.id !== issueId);
      const resolvedIssue = (prev.criticalIssues || []).find(i => i.id === issueId);
      
      const newLiveOps = [
        {
          id: Date.now(),
          text: `Resolved critical issue: ${resolvedIssue?.title || 'Unknown Issue'}`,
          time: "Just now",
          type: "job",
          icon: "✓",
          color: "green-bg"
        },
        ...(prev.liveOps || [])
      ];

      const newState = {
        ...prev,
        criticalIssues: remainingIssues,
        issuesCount: remainingIssues.length,
        liveOps: newLiveOps
      };
      
      localStorage.setItem('bt_cache_admin_state', JSON.stringify(newState));
      return newState;
    });

    addToast(`Successfully resolved issue #BT-${issueId.substring(5)}`);
  };

  // 10. FINAL PLATFORM SYNC
  useEffect(() => {
    log("Build_Trust Online Sync: Monitoring for trade-matching events...");
  }, []);

  return (
    <React.Fragment>
      <a href="#main-content" className="skip-to-content">Skip to Main Content</a>
      {/* Client Header */}
      {location.pathname !== '/admin' && (
        <Header 
          activeView={location.pathname === '/' ? 'home' : location.pathname.substring(1)}
          setActiveView={changeRoute}
          currentLocation={currentLocation}
          setCurrentLocation={setCurrentLocation}
          onOpenLogin={(mode = 'login') => {
            setAuthModalMode(mode);
            setActiveModal('login');
          }}
          onOpenAiTool={openAiTool}
          isLoggedIn={isLoggedIn}
          currentUser={currentUser}
        />
      )}

      {/* Main Views Router */}
      <main id="app-container">
        <Routes>
          <Route path="/" element={
            <LandingView 
              workers={workers}
              setActiveView={changeRoute}
              setSearchFilters={applyFilters}
              onOpenBookingWizard={(id, isEmergency) => {
                setBookingWorkerId(id);
                if (isEmergency) setWizardForm(prev => ({ ...prev, priority: 'Emergency' }));
                setWizardStep(1);
                setActiveModal('booking');
              }}
              onOpenAiTool={openAiTool}
              onOpenPostJob={() => {
                setPostJobForm({ title: "", category: "Electrical", location: "Sector 62, Noida", budget: "₹15,000", desc: "" });
                setActiveModal('post-job');
              }}
            />
          } />

          <Route path="/search" element={
            <SearchView 
              workers={workers}
              isLoading={isLoadingWorkers}
              setActiveView={changeRoute}
              searchFilters={searchFilters}
              setSearchFilters={applyFilters}
              comparisonList={comparisonList}
              setComparisonList={setComparisonList}
              onOpenComparison={() => setActiveModal('comparison')}
              onLoadMore={() => {
                const nextPage = Math.floor(workers.length / 20) + 1;
                fetchWorkers(searchFilters, nextPage);
              }}
              onPrefetch={prefetchWorker}
              isLoggedIn={isLoggedIn}
              onOpenLogin={(mode = 'login') => {
                setAuthModalMode(mode);
                setActiveModal('login');
              }}
            />
          } />

          <Route path="/profile/:id" element={
            <ProfileViewWrapper 
              workers={workers}
              changeRoute={changeRoute}
              setBookingWorkerId={setBookingWorkerId}
              setWizardStep={setWizardStep}
              setActiveModal={setActiveModal}
              chatLogs={chatLogs}
              setChatLogs={setChatLogs}
              setChattingWorkerId={setChattingWorkerId}
              addToast={addToast}
              isLoggedIn={isLoggedIn}
              currentUser={currentUser}
            />
          } />

          <Route path="/profile" element={
            isLoggedIn ? (
              <CustomerProfileView 
                currentUser={currentUser}
                adminState={adminState}
                chatLogs={chatLogs}
                workers={workers}
                setActiveView={changeRoute}
              />
            ) : (
              <LoginPage loginSuccess={loginSuccess} />
            )
          } />

          <Route path="/worker-dashboard" element={
            isLoggedIn && currentUser?.role === 'specialist' ? (
              <WorkerDashboardView 
                currentUser={currentUser}
                adminState={adminState}
                setActiveView={changeRoute}
                onCallAdmin={() => addToast("Connecting to administrator...", "info")}
              />
            ) : (
              <LoginPage loginSuccess={loginSuccess} />
            )
          } />

          <Route path="/admin" element={
            isLoggedIn && currentUser?.role === 'admin' ? (
              <AdminView 
                adminState={adminState}
                isLoading={isLoadingAdmin}
                setActiveView={changeRoute}
                onResolveIssue={handleResolveIssue}
                onPostJob={() => {
                  setPostJobForm({ title: "", category: "Electrical", location: "Sector 62, Noida", budget: "₹15,000", desc: "" });
                  setActiveModal('post-job');
                }}
                onReviewProfiles={() => {
                  applyFilters({ text: "", category: "All", budget: 1000, rating: null, distance: 30 });
                  changeRoute('search');
                  addToast("Displaying all registered specialists awaiting review.", "info");
                }}
                currentUser={currentUser}
              />
            ) : (
              <LoginPage loginSuccess={loginSuccess} />
            )
          } />

          <Route path="/login" element={<LoginPage loginSuccess={loginSuccess} />} />
          <Route path="/signup" element={<SignupPage loginSuccess={loginSuccess} />} />
        </Routes>
      </main>

      {/* Client Footer */}
      {location.pathname !== '/admin' && (
        <Footer setActiveView={changeRoute} />
      )}

      {/* LOGIN / AUTH MODAL (OVERHAULED) */}
      {activeModal === 'login' && (
        <div className="auth-backdrop active" onClick={(e) => e.target.classList.contains('auth-backdrop') && setActiveModal(null)}>
          <AuthCard 
            initialMode={authModalMode} 
            onAuthSuccess={loginSuccess} 
            onClose={() => setActiveModal(null)} 
          />
        </div>
      )}

      {/* 2. BOOKING WIZARD MODAL */}
      {activeModal === 'booking' && bookingWorkerId && (
        <div className="modal-backdrop active">
          <div className="modal-card wizard-card">
            <div className="modal-header">
              <h3>Hire {workers.find(w => w.id === bookingWorkerId)?.name}</h3>
              <button className="close-modal-btn" onClick={() => {
                setActiveModal(null);
                setIsPaymentStep(false);
                setIsBookingComplete(false);
              }}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="wizard-steps-indicators">
                <div className={`w-step ${wizardStep >= 1 ? 'active' : ''}`}>1. Details</div>
                <div className={`w-step ${wizardStep >= 2 ? 'active' : ''}`}>2. Schedule</div>
                <div className={`w-step ${wizardStep >= 3 ? 'active' : ''}`}>3. Confirm</div>
                <div className={`w-step ${wizardStep >= 4 ? 'active' : ''}`}>4. Payment</div>
              </div>

              {wizardStep === 1 && (
                <div className="wizard-pane active">
                  <div className="form-group">
                    <label className="form-label">Describe your project requirements</label>
                    <textarea 
                      className="form-input" 
                      rows="3" 
                      value={wizardForm.description}
                      onChange={(e) => setWizardForm(prev => ({ ...prev, description: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Project Site Address</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={wizardForm.address}
                      onChange={(e) => setWizardForm(prev => ({ ...prev, address: e.target.value }))}
                      required 
                    />
                  </div>
                  <div className="wizard-footer">
                    <div></div>
                    <button 
                      className="btn btn-primary"
                      onClick={() => {
                        if (wizardForm.description.trim() === "" || wizardForm.address.trim() === "") {
                          addToast("Please input requirements and site address", "info");
                          return;
                        }
                        setWizardStep(2);
                      }}
                    >
                      Next: Schedule &gt;
                    </button>
                  </div>
                </div>
              )}

              {wizardStep === 2 && (
                <div className="wizard-pane active">
                  <div className="form-row">
                    <div className="form-group flex-1">
                      <label className="form-label">Preferred Date</label>
                      <input 
                        type="date" 
                        className="form-input"
                        value={wizardForm.date}
                        onChange={(e) => setWizardForm(prev => ({ ...prev, date: e.target.value }))}
                        required 
                      />
                    </div>
                    <div className="form-group flex-1">
                      <label className="form-label">Duration (estimated hours)</label>
                      <input 
                        type="number" 
                        className="form-input" 
                        min="1" 
                        max="100"
                        value={wizardForm.hours}
                        onChange={(e) => setWizardForm(prev => ({ ...prev, hours: parseInt(e.target.value) || 1 }))}
                        required 
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Priority Type</label>
                    <select 
                      className="form-select"
                      value={wizardForm.priority}
                      onChange={(e) => setWizardForm(prev => ({ ...prev, priority: e.target.value }))}
                    >
                      <option value="Standard">Standard Schedule</option>
                      <option value="Emergency">Emergency (Dispatch onsite within 2 hrs)</option>
                    </select>
                  </div>
                  <div className="wizard-footer">
                    <button className="btn btn-outline" style={{ color: 'var(--color-primary)', borderColor: '#cbd5e1' }} onClick={() => setWizardStep(1)}>&lt; Back</button>
                    <button className="btn btn-primary" onClick={() => setWizardStep(3)}>Next: Confirm &gt;</button>
                  </div>
                </div>
              )}

              {wizardStep === 3 && (
                <div className="wizard-pane active">
                  <div className="confirmation-summary-box">
                    <div className="summary-row">
                      <strong>Specialist:</strong>
                      <span>{workers.find(w => w.id === bookingWorkerId)?.name}</span>
                    </div>
                    <div className="summary-row">
                      <strong>Project Location:</strong>
                      <span>{wizardForm.address}</span>
                    </div>
                    <div className="summary-row">
                      <strong>Schedule:</strong>
                      <span>{wizardForm.date} (Est. {wizardForm.hours} hrs)</span>
                    </div>
                    <div className="summary-row total-row">
                      <strong>Total Cost:</strong>
                      <span>₹{(workers.find(w => w.id === bookingWorkerId)?.rate * wizardForm.hours).toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="wizard-footer">
                    <button className="btn btn-outline" style={{ color: 'var(--color-primary)', borderColor: '#cbd5e1' }} onClick={() => setWizardStep(2)}>&lt; Back</button>
                    <button className="btn btn-accent btn-large" onClick={handleBookingConfirm}>
                      Proceed to Secure Payment
                    </button>
                  </div>
                </div>
              )}

              {wizardStep === 4 && (
                <div className="wizard-pane active">
                  <div className="payment-mock-ui" style={{ padding: '20px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <div style={{ marginBottom: '20px', textAlign: 'center' }}>
                      <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Amount to Pay</p>
                      <h2 style={{ fontSize: '32px' }}>₹{(workers.find(w => w.id === bookingWorkerId)?.rate * wizardForm.hours).toLocaleString()}</h2>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Payment Method</label>
                      <div className="payment-option selected" style={{ padding: '12px', border: '2px solid var(--color-accent)', borderRadius: '8px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: '5px solid var(--color-accent)' }}></div>
                        <span>UPI / QR Code</span>
                      </div>
                      <div className="payment-option" style={{ padding: '12px', border: '1px solid #cbd5e1', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '12px', opacity: 0.6 }}>
                        <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: '1px solid #cbd5e1' }}></div>
                        <span>Credit/Debit Card</span>
                      </div>
                    </div>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '15px' }}>
                      🔒 Secure 256-bit encrypted transaction via BuildTrust Pay.
                    </p>
                  </div>
                  <div className="wizard-footer">
                    <button className="btn btn-outline" style={{ color: 'var(--color-primary)', borderColor: '#cbd5e1' }} onClick={() => setWizardStep(3)}>&lt; Back</button>
                    <button className="btn btn-accent btn-large" onClick={handleBookingConfirm}>
                      Pay Now & Book
                    </button>
                  </div>
                </div>
              )}

              {wizardStep === 5 && (
                <div className="wizard-pane active text-center" style={{ padding: '40px 0' }}>
                  <div className="success-icon-circle" style={{ width: '80px', height: '80px', background: '#ecfdf5', color: '#10b981', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyCenter: 'center', margin: '0 auto 24px', fontSize: '40px' }}>✓</div>
                  <h2 style={{ marginBottom: '12px' }}>Booking Confirmed!</h2>
                  <p style={{ color: 'var(--text-muted)', marginBottom: '30px' }}>
                    {workers.find(w => w.id === bookingWorkerId)?.name} has been notified and will arrive at <strong>{wizardForm.address}</strong> on <strong>{wizardForm.date}</strong>.
                  </p>
                  <button className="btn btn-primary btn-large" onClick={handleBookingConfirm}>
                    Go to My Bookings
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4. CHAT SIMULATOR MODAL */}
      {activeModal === 'chat' && chattingWorkerId && (
        <div className="modal-backdrop active">
          <div className="modal-card chat-modal-card">
            <div className="modal-header">
              <div className="chat-header-user">
                <div className="admin-avatar" style={{ width: '32px', height: '32px', fontSize: '12px' }}>
                  {workers.find(w => w.id === chattingWorkerId)?.name.charAt(0)}
                </div>
                <div>
                  <h3 style={{ fontSize: '15px' }}>{workers.find(w => w.id === chattingWorkerId)?.name}</h3>
                  <p style={{ fontSize: '11px', opacity: 0.7 }}>Typically replies in 5 mins</p>
                </div>
              </div>
              <button className="close-modal-btn" onClick={() => setActiveModal(null)}>&times;</button>
            </div>
            <div className="chat-body">
              <div className="chat-messages">
                <div className="chat-msg worker">
                  Namaste! How can I help you with your project today?
                </div>
                {(chatLogs[chattingWorkerId] || []).map((msg, idx) => (
                  <div key={idx} className={`chat-msg ${msg.sender} ${msg.pending ? 'msg-pending' : ''}`}>
                    {msg.text}
                    {msg.pending && <span style={{ fontSize: '10px', display: 'block', textAlign: 'right', opacity: 0.5 }}>sending...</span>}
                  </div>
                ))}
              </div>
              <div className="chat-input-bar">
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Type a message..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendChatMessage()}
                />
                <button className="btn btn-primary" onClick={handleSendChatMessage}>Send</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. AGENTIC AI COST ESTIMATION TOOL MODAL */}
      {activeModal === 'ai' && (
        <div className="modal-backdrop active">
          <div className="modal-card ai-agent-modal">
            <div className="ai-modal-header">
              <div className="header-avatar-box">
                <svg viewBox="0 0 24 24" width="20" height="20">
                  <path fill="currentColor" d="M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.3C.5 6.7.9 9.8 2.9 11.8c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.1z"/>
                </svg>
              </div>
              <div className="header-info">
                <div className="header-name">Build_Trust</div>
                <div className="header-status">Online · responds instantly</div>
              </div>
              <button className="close-modal-btn" onClick={() => setActiveModal(null)} style={{ color: 'var(--color-text-secondary)' }}>&times;</button>
            </div>

            <div className="ai-progress-wrap">
              <div className="ai-progress-label">
                <span>{aiStep === 3 ? "Step 3 of 3 — your estimate is ready" : `Step ${aiStep} of 3 — understanding your project`}</span>
                <span>{aiStep === 1 ? '33%' : aiStep === 2 ? '66%' : '100%'}</span>
              </div>
              <div className="ai-progress-track">
                <div className="ai-progress-fill" style={{ width: aiStep === 1 ? '33%' : aiStep === 2 ? '66%' : '100%' }}></div>
              </div>
            </div>

            <div className="ai-chat-body">
              {aiChatMessages.map((msg, idx) => (
                <div key={idx} className={`ai-msg-row ${msg.role}`}>
                  {msg.role === 'assistant' && (
                    <div className="ai-mini-avatar">
                      <svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.3C.5 6.7.9 9.8 2.9 11.8c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.1z"/></svg>
                    </div>
                  )}
                  <div className={`ai-bubble ${msg.role}`}>
                    {msg.role === 'assistant' ? (
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    ) : (
                      msg.content
                    )}
                  </div>
                </div>
              ))}
              
              {isAiLoading && (
                <div className="ai-msg-row assistant">
                  <div className="ai-mini-avatar">...</div>
                  <div className="ai-bubble agent">
                    <div className="ai-status-pulse">
                      <div className="pulse-dot"></div>
                      <span>{aiStatus || "Thinking..."}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Option Chips Turn */}
              {!isAiLoading && aiChips.length > 0 && (
                <div className="ai-chip-container animate-fade">
                  {aiChips.map((chip, cidx) => (
                    <button 
                      key={cidx} 
                      className={`ai-option-chip ${chip.includes('Login') ? 'btn-accent' : ''}`}
                      onClick={() => handleAiChatSubmit(null, chip)}
                    >
                      {chip}
                    </button>
                  ))}
                  {!aiChips.some(c => c.includes('Login')) && (
                    <button 
                      className="ai-option-chip something-else"
                      onClick={() => setShowAiInput(true)}
                    >
                      Something else...
                    </button>
                  )}
                </div>
              )}
              
              {aiAuditResult && (
                <div className="animate-fade">
                  <div className="ai-estimate-card">
                    <div className="ai-estimate-header">
                       <svg viewBox="0 0 24 24" width="14" height="14" style={{ marginRight: '4px' }}><path fill="currentColor" d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 3.98 2.53.47 3.3 1.25 3.3 2.23 0 1.14-1.2 1.94-3.05 1.94-2.11 0-2.85-.94-2.95-2.23H6.04c.1 1.97 1.55 3.19 3.46 3.66V21h3v-2.16c1.94-.39 3.51-1.49 3.51-3.66-.01-2.12-1.21-3.53-4.21-4.28z"/></svg>
                       <span>Estimated cost range</span>
                    </div>
                    <div className="ai-estimate-body">
                      <div className="ai-estimate-range">₹{Math.floor((aiAuditResult.estimate.estimated_cost_inr || 0) * 0.8).toLocaleString()} – ₹{Math.ceil((aiAuditResult.estimate.estimated_cost_inr || 0) * 1.2).toLocaleString()}</div>
                      <div className="ai-estimate-note">Based on local trade rates · Parts + labour · {currentLocation}</div>
                    </div>
                  </div>

                  <div className="ai-workers-label">{aiAuditResult.specialists.length} matches · sorted by rating</div>
                  <div className="ai-worker-cards">
                    {aiAuditResult.specialists.map(w => (
                      <div key={w.id} className="ai-worker-card" onClick={() => { setActiveModal(null); navigate(`/profile/${w.id}`); }}>
                        <div className="ai-worker-initials" style={{ 
                          backgroundColor: w.name.includes('S') ? '#EEEDFE' : '#E1F5EE',
                          color: w.name.includes('S') ? '#3C3489' : '#0F6E56'
                        }}>
                          {w.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div className="ai-worker-info">
                          <div className="ai-worker-name">{w.name}</div>
                          <div className="ai-worker-meta">{w.specialty} · 5+ yrs exp · NCR</div>
                          <div className="ai-worker-stars">
                            <svg viewBox="0 0 24 24" width="10" height="10" style={{ color: '#FF6B2B' }}><path fill="currentColor" d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
                            {w.rating} · 10+ jobs
                          </div>
                        </div>
                        <div className="ai-worker-price">₹{w.rate}<br/><span style={{ fontSize: '9px', fontWeight: 400, color: 'var(--color-text-secondary)' }}>est.</span></div>
                      </div>
                    ))}
                  </div>
                  
                  <div style={{ padding: '10px 0', textAlign: 'center' }}>
                    <button className="btn btn-text btn-small" onClick={() => handleAiChatSubmit(null, "Show more specialists")}>Suggest more workers</button>
                  </div>
                </div>
              )}
              <div ref={aiChatEndRef} />
            </div>

            {/* Input Area (Conditionally visible) */}
            {(showAiInput || aiChatMessages.length === 1) && (
              <form className="ai-input-area" onSubmit={handleAiChatSubmit}>
                <input 
                  className="ai-chat-input" 
                  placeholder="Type your answer…" 
                  value={aiInput}
                  onChange={(e) => setAiInput(e.target.value)}
                  disabled={isAiLoading}
                  autoFocus
                />
                <button type="submit" className="ai-send-btn" disabled={isAiLoading}>
                  <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* TOASTS */}
      <div className="toast-container" aria-live="polite">
        {toasts.map(toast => (
          <div key={toast.id} className={`toast ${toast.type}`}>
            {toast.type === 'success' ? <span>✓</span> : <span style={{ marginRight: '6px' }}>⚠</span>}
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </React.Fragment>
  );
}
