import React, { useState, useEffect, useRef } from "react";
import { COLORS, LIGHT_COLORS, FONTS, SHADOWS } from "./theme";
import { Toast } from "./components/Common";
import JobSearch from "./components/JobSearch";
import AppTracker from "./components/AppTracker";
import ResumeTailor from "./components/ResumeTailor";
import Copilot from "./components/Copilot";
import Profile from "./components/Profile";
import Dashboard from "./components/Dashboard";
import JobView from "./components/JobView";
import { Routes, Route, useNavigate, useLocation, Navigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";


// ─── AUTH SCREEN ─────────────────────────────────────────────────────────────
function AuthScreen({ onLogin, C }) {
  const [isRegister, setIsRegister] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [passFeedback, setPassFeedback] = useState("");

  const validatePassword = (pass) => {
    if (pass.length < 8) return "Min 8 characters required";
    if (!/[A-Z]/.test(pass)) return "Add an uppercase letter";
    if (!/[0-9]/.test(pass)) return "Add a number";
    return "";
  };

  const handleGuestEntry = () => {
    onLogin({ name: "Guest Explorer", email: "guest@gradlaunch.ai" }, "demo-token");
  };

  async function handleGoogleLogin(credentialResponse) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:3001"}/api/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential: credentialResponse.credential })
      });
      const data = await res.json();
      if (res.ok) {
        onLogin(data.user, data.token);
      } else {
        setError(data.error || "Google authentication failed");
      }
    } catch (err) {
      setError("Server connection failed");
    }
    setLoading(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const endpoint = isRegister ? "register" : "login";
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:3001"}/api/auth/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (res.ok) {
        onLogin(data.user, data.token);
      } else {
        setError(data.error || "Authentication failed");
      }
    } catch (err) {
      setError("Server connection failed");
    }
    setLoading(false);
  }

  return (
    <div style={{ height: "100vh", background: "#04060A", position: "relative", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
      {/* Background Glows */}
      <div style={{ position: "absolute", top: "-10%", left: "-10%", width: "50%", height: "50%", background: "radial-gradient(circle, #00F0FF15 0%, transparent 70%)", filter: "blur(80px)" }} />
      <div style={{ position: "absolute", bottom: "-10%", right: "-10%", width: "50%", height: "50%", background: "radial-gradient(circle, #00A3FF15 0%, transparent 70%)", filter: "blur(80px)" }} />

      <div style={{ position: "relative", width: "100%", maxWidth: 440, padding: 40, background: "#0D1117", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 32, boxShadow: "0 24px 80px rgba(0,0,0,0.5)" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ fontSize: 56, marginBottom: 20 }}>🚀</div>
          <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 32, fontWeight: 800, color: "#fff", margin: "0 0 10px 0" }}>
            {isRegister ? "Join GradLaunch" : "Welcome Back"}
          </h1>
          <p style={{ fontFamily: "'DM Sans', sans-serif", color: "#94A3B8", fontSize: 16 }}>
            {isRegister ? "Start your elite career journey today" : "Orion AI is waiting for you"}
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {error && <div style={{ color: "#FF3B30", background: "rgba(255, 59, 48, 0.1)", border: "1px solid rgba(255, 59, 48, 0.3)", borderRadius: 12, padding: 12, fontSize: 13, textAlign: "center" }}>{error}</div>}
          {isRegister && (
            <input
              required
              placeholder="Full Name"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              style={{ background: "#161B22", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, padding: "16px 20px", color: "#fff", fontFamily: "'DM Sans', sans-serif", fontSize: 15, outline: "none" }}
            />
          )}
          <input
            required
            type="email"
            placeholder="Email Address"
            value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })}
            style={{ background: "#161B22", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, padding: "16px 20px", color: "#fff", fontFamily: "'DM Sans', sans-serif", fontSize: 15, outline: "none" }}
          />
          <input
            required
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={e => {
              setForm({ ...form, password: e.target.value });
              setPassFeedback(validatePassword(e.target.value));
            }}
            style={{ background: "#161B22", border: `1px solid ${passFeedback && isRegister ? "#FF3B30" : "rgba(255,255,255,0.1)"}`, borderRadius: 14, padding: "16px 20px", color: "#fff", fontFamily: "'DM Sans', sans-serif", fontSize: 15, outline: "none" }}
          />
          {isRegister && passFeedback && (
            <div style={{ fontSize: 11, color: "#FF3B30", marginTop: -8, marginLeft: 10 }}>{passFeedback}</div>
          )}

          <button
            disabled={loading || (isRegister && !!passFeedback)}
            style={{
              marginTop: 10,
              background: loading || (isRegister && !!passFeedback) ? "#30363D" : "linear-gradient(135deg, #00F0FF, #00A3FF)",
              border: "none",
              borderRadius: 14,
              padding: "18px",
              color: "#000",
              fontFamily: "'Syne', sans-serif",
              fontWeight: 800,
              fontSize: 16,
              cursor: (loading || (isRegister && !!passFeedback)) ? "not-allowed" : "pointer",
              transition: "transform 0.2s"
            }}
          >
            {loading ? "Verifying..." : isRegister ? "Create Account" : "Sign In"}
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "10px 0" }}>
            <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.1)" }} />
            <span style={{ fontSize: 12, color: "#94A3B8" }}>OR</span>
            <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.1)" }} />
          </div>

          <div style={{ display: "flex", justifyContent: "center", borderRadius: 14, overflow: "hidden" }}>
            <GoogleLogin
              onSuccess={handleGoogleLogin}
              onError={() => setError("Google Sign-In failed")}
              theme="filled_black"
              shape="pill"
              size="large"
              width="360"
              text={isRegister ? "signup_with" : "signin_with"}
            />
          </div>

          <button
            type="button"
            onClick={handleGuestEntry}
            style={{ background: "transparent", border: "1px solid rgba(0,240,255,0.4)", borderRadius: 14, padding: "14px", color: "#00F0FF", cursor: "pointer", fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 14 }}
          >
            ⚡ Explore as Guest
          </button>
        </form>

        <div style={{ marginTop: 32, textAlign: "center" }}>
          <button
            disabled={loading}
            onClick={() => setIsRegister(!isRegister)}
            style={{
              background: "transparent",
              border: "none",
              color: "#00F0FF",
              fontSize: 14,
              cursor: "pointer",
              textDecoration: "underline",
              padding: "12px 20px", // Increased hit area
              transition: "opacity 0.2s"
            }}
            onMouseOver={e => e.target.style.opacity = 0.8}
            onMouseOut={e => e.target.style.opacity = 1}
          >
            {isRegister ? "Already have an account? Sign In" : "Don't have an account? Join now"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── ERROR BOUNDARY ────────────────────────────────────────────────────────
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 40, background: "#0D1117", color: "#fff", height: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
          <h1 style={{ fontSize: 48 }}>Oops! 🚧</h1>
          <p style={{ color: "#94A3B8", fontSize: 18, maxWidth: 500 }}>
            Something went wrong in the GradLaunch component. This is often due to a state mismatch or an unexpected API response.
          </p>
          <pre style={{ background: "rgba(255,0,0,0.1)", padding: 20, borderRadius: 12, fontSize: 13, color: "#FF3B30", border: "1px solid #FF3B3033" }}>
            {this.state.error?.toString()}
          </pre>
          <button onClick={() => window.location.reload()} style={{ marginTop: 24, padding: "12px 24px", borderRadius: 12, background: "#00F0FF", color: "#000", border: "none", cursor: "pointer", fontWeight: 700 }}>
            Reload Application
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── MAIN APP ────────────────────────────────────────────────────────────────
function GradLaunchContent() {
  const [isDark, setIsDark] = useState(true);
  const C = isDark ? COLORS : LIGHT_COLORS;

  const navigate = useNavigate();
  const location = useLocation();
  const currentTab = location.pathname.split("/")[1] || "dashboard";

  const [applications, setApplications] = useState([]);
  const [savedJobs, setSavedJobs] = useState([]);
  const [prefilledJob, setPrefilledJob] = useState({ description: "", link: "" });
  const [globalProfileContext, setGlobalProfileContext] = useState("");
  const [profileText, setProfileText] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Restore session and data from backend
  useEffect(() => {
    async function restoreSession() {
      const storedToken = localStorage.getItem("token");
      if (storedToken) {
        try {
          const apiBase = import.meta.env.VITE_API_URL || "http://localhost:3001";
          const res = await fetch(`${apiBase}/api/auth/me`, {
            headers: { "Authorization": `Bearer ${storedToken}` }
          });
          if (res.ok) {
            const data = await res.json();
            setCurrentUser(data.user);

            const [appRes, savedRes, profileRes] = await Promise.all([
              fetch(`${apiBase}/api/applications`, { headers: { "Authorization": `Bearer ${storedToken}` } }),
              fetch(`${apiBase}/api/jobs/saved`, { headers: { "Authorization": `Bearer ${storedToken}` } }),
              fetch(`${apiBase}/api/profile`, { headers: { "Authorization": `Bearer ${storedToken}` } })
            ]);

            if (appRes.ok) setApplications(await appRes.json());
            if (savedRes.ok) setSavedJobs(await savedRes.json());
            if (profileRes.ok) {
              const pData = await profileRes.json();
              if (pData.aiContext) setGlobalProfileContext(pData.aiContext);
              if (pData.skills) setProfileText(`${pData.skills} ${pData.targetRole} ${pData.baseResume} ${pData.aiContext || ""}`);
            }
          } else {
            localStorage.removeItem("token");
          }
        } catch (e) {
          console.error("Session restore failed", e);
        }
      }
      setAuthLoading(false);
    }
    restoreSession();
  }, []);

  function handleLogout() {
    localStorage.removeItem("token");
    setCurrentUser(null);
  }

  async function handleAddToTracker(job) {
    const apiBase = import.meta.env.VITE_API_URL || "http://localhost:3001";
    const token = localStorage.getItem("token");

    const exists = applications.find(a => a.company === job.company && a.role === job.title);
    if (!exists) {
      try {
        const stage = job.wishlist ? "Wishlist" : "Applied";
        const res = await fetch(`${apiBase}/api/applications`, {
          method: "POST",
          headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            company: job.company,
            role: job.title,
            logo: job.logo,
            stage,
            job_link: job.link,
            match_score: job.match || 85
          })
        });
        if (res.ok) {
          const syncRes = await fetch(`${apiBase}/api/applications`, { headers: { "Authorization": `Bearer ${token}` } });
          if (syncRes.ok) {
            setApplications(await syncRes.json());
            showToast("\u2705 Added to tracker!");
          }
        }
      } catch (e) {
        console.error("Apply failed", e);
        showToast("Failed to add to tracker", "error");
      }
    }

    if (job.wishlist) {
      navigate("/tracker");
    } else {
      setPrefilledJob({ description: job.description, link: job.link });
      navigate("/resume");
    }
  }

  async function handleToggleSave(job) {
    const apiBase = import.meta.env.VITE_API_URL || "http://localhost:3001";
    const token = localStorage.getItem("token");
    const isSaved = savedJobs.some(sj => sj.id === job.id);

    try {
      if (isSaved) {
        await fetch(`${apiBase}/api/jobs/unsave`, {
          method: "POST",
          headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ jobId: job.id })
        });
        setSavedJobs(prev => prev.filter(sj => sj.id !== job.id));
        showToast("\uD83D\uDCD1 Removed from saved");
      } else {
        await fetch(`${apiBase}/api/jobs/save`, {
          method: "POST",
          headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ job })
        });
        setSavedJobs(prev => [...prev, job]);
        showToast("\uD83D\uDCD6 Saved to bookmarks!");
      }
    } catch (e) {
      console.error("Save toggle failed", e);
      showToast("Error saving job", "error");
    }
  }

  if (authLoading) {
    return (
      <div style={{ height: "100vh", background: "#04060A", display: "flex", alignItems: "center", justifyContent: "center", color: "#00F0FF", fontFamily: "'Syne', sans-serif", fontSize: 18 }}>
        ⚡ GradLaunch is powering up...
      </div>
    );
  }

  if (!currentUser) {
    return <AuthScreen C={C} onLogin={(user, token) => {
      localStorage.setItem("token", token);
      setCurrentUser(user);
    }} />;
  }

  const TABS = [
    { id: "dashboard", label: "Dashboard", icon: "📊", path: "/" },
    { id: "jobs", label: "Job Search", icon: "🔍", path: "/jobs" },
    { id: "copilot", label: "AI Copilot", icon: "🤖", path: "/copilot" },
    { id: "resume", label: "Resume AI", icon: "✨", path: "/resume" },
    { id: "tracker", label: "Kanban Board", icon: "📋", path: "/tracker" },
    { id: "profile", label: "Profile", icon: "👤", path: "/profile" },
  ];

  return (
    <>
      <style>{FONTS}</style>
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; background: ${C.bg}; color: ${C.text}; transition: background 0.3s; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 3px; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideRight { from { transform: translateX(-20px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        
        .sidebar-item { transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); animation: slideRight 0.4s ease-out forwards; opacity: 0; }
        .sidebar-item:nth-child(1) { animation-delay: 0.1s; }
        .sidebar-item:nth-child(2) { animation-delay: 0.15s; }
        .sidebar-item:nth-child(3) { animation-delay: 0.2s; }
        .sidebar-item:nth-child(4) { animation-delay: 0.25s; }
        .sidebar-item:nth-child(5) { animation-delay: 0.3s; }
        
        .sidebar-item:hover { background: ${C.accent}15; color: ${C.accent}; transform: translateX(4px); }
        .sidebar-active { background: ${C.accent}20; border-right: 3px solid ${C.accent}; color: ${C.accent}; opacity: 1 !important; }
      `}</style>
      <div style={{ display: "flex", minHeight: "100vh", background: C.bg, position: "relative", overflow: "hidden" }}>
        {/* Atmosphere Glows */}
        <div style={{ position: "absolute", top: "-10%", left: "20%", width: "40%", height: "40%", background: `radial-gradient(circle, ${C.accent}08 0%, transparent 70%)`, filter: "blur(100px)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: "10%", right: "10%", width: "30%", height: "30%", background: `radial-gradient(circle, ${C.purple}08 0%, transparent 70%)`, filter: "blur(100px)", pointerEvents: "none" }} />

        <aside style={{ width: sidebarOpen ? 260 : 0, background: C.sidebar, borderRight: `1px solid ${C.border}`, display: "flex", flexDirection: "column", overflow: "hidden", transition: "width 0.3s", position: "relative", zIndex: 100 }}>
          <div style={{ padding: "24px", display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: `linear-gradient(135deg, ${C.accent}, ${C.purple})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, boxShadow: SHADOWS.accent }}>🚀</div>
            <span style={{ fontFamily: "Syne", fontWeight: 800, fontSize: 24, letterSpacing: "-0.5px" }}>GradLaunch</span>
          </div>
          <nav style={{ flex: 1, padding: "0 12px", display: "flex", flexDirection: "column", gap: 4 }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => navigate(t.path)} className={`sidebar-item ${currentTab === t.id || (t.id === "dashboard" && currentTab === "dashboard") ? "sidebar-active" : ""}`} style={{ background: "transparent", border: "none", borderRadius: 12, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer", color: (currentTab === t.id || (t.id === "dashboard" && currentTab === "dashboard")) ? C.accent : C.muted, fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 14, textAlign: "left" }}>
                <span style={{ fontSize: 18 }}>{t.icon}</span>
                {t.label}
              </button>
            ))}
          </nav>
          <div style={{ padding: 20, borderTop: `1px solid ${C.border}`, display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: `linear-gradient(135deg, ${C.accent}, ${C.purple})`, display: "flex", alignItems: "center", justifyContent: "center", color: "#000", fontWeight: 800, fontSize: 14 }}>
                {currentUser?.name?.[0]?.toUpperCase() || "U"}
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{currentUser?.name || "User"}</div>
                <div style={{ fontSize: 11, color: C.muted }}>{currentUser?.email || ""}</div>
              </div>
            </div>
            <button onClick={handleLogout} style={{ background: "transparent", border: `1px solid ${C.border}`, borderRadius: 10, padding: "8px", color: C.muted, fontSize: 12, cursor: "pointer", width: "100%" }}>Logout</button>
          </div>
        </aside>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <header style={{ height: 60, borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", padding: "0 24px", background: C.surface, justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ background: "transparent", border: "none", color: C.text, fontSize: 20, cursor: "pointer", display: "flex", alignItems: "center" }}>
                {sidebarOpen ? "⬅\uFE0F" : "\u27A1\uFE0F"}
              </button>
              <button
                onClick={() => setIsDark(!isDark)}
                style={{
                  background: C.card,
                  border: `1px solid ${C.border}`,
                  borderRadius: 12,
                  padding: "6px 12px",
                  color: C.text,
                  fontSize: 12,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontWeight: 600,
                  transition: "all 0.2s"
                }}
              >
                {isDark ? "☀️ Light" : "🌙 Dark"}
              </button>
            </div>
            <div style={{ border: `1px solid ${C.border}`, borderRadius: 20, padding: "4px 12px", fontSize: 12, background: C.card, color: C.accent, fontWeight: 800 }}>8M+ Global Jobs</div>
          </header>
          <main style={{ flex: 1, padding: 24, overflowY: "auto" }}>
            <div style={{ maxWidth: 1200, margin: "0 auto", animation: "fadeIn 0.3s ease-out" }}>
              <Routes>
                <Route path="/" element={<Dashboard C={C} />} />
                <Route path="/jobs" element={<JobSearch onAddToTracker={handleAddToTracker} onToggleSave={handleToggleSave} savedJobs={savedJobs} profileText={profileText} C={C} />} />
                <Route path="/job/:id" element={<JobView C={C} onAddToTracker={handleAddToTracker} savedJobs={savedJobs} />} />
                <Route path="/copilot" element={<Copilot C={C} />} />
                <Route path="/resume" element={<ResumeTailor initialJobDesc={prefilledJob.description} jobUrl={prefilledJob.link} globalContext={globalProfileContext} C={C} />} />
                <Route path="/tracker" element={<AppTracker applications={applications} setApplications={setApplications} C={C} />} />
                <Route path="/profile" element={<Profile C={C} globalContext={globalProfileContext} setGlobalContext={setGlobalProfileContext} setGlobalVector={setProfileText} currentUser={currentUser} onProfileUpdate={(p) => { if (p.name) setCurrentUser(prev => ({ ...prev, name: p.name })); showToast("\u2705 Profile updated!"); }} />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </div>
          </main>
        </div>
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} C={C} />}
      </div>
    </>
  );
}

export default function GradLaunch() {
  return (
    <ErrorBoundary>
      <GradLaunchContent />
    </ErrorBoundary>
  );
}
