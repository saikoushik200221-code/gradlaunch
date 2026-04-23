import React, { useState, useEffect } from "react";
import { Toast } from "./components/Common";
import JobSearch from "./components/JobSearch";
import AppShell from "./components/AppShell";
import AppTracker from "./components/AppTracker";
import ResumeTailor from "./components/ResumeTailor";
import Copilot from "./components/Copilot";
import Profile from "./components/Profile";
import Dashboard from "./components/Dashboard";
import { Routes, Route, useNavigate, useLocation, Navigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import Onboarding from "./components/Onboarding";
import JobView from "./components/JobView";
import LandingPage from "./components/LandingPage";
import { Dock } from "./components/ui/dock-two";
import { LayoutDashboard, Search, Bot, FileText, ClipboardList, Sparkles, UserCircle } from "lucide-react";
import useExtensionBridge from "./hooks/useExtensionBridge";
const AIFormFiller = React.lazy(() => import("./components/AIFormFiller"));

// ─── AUTH SCREEN ─────────────────────────────────────────────────────────────
function AuthScreen({ onLogin }) {
  const [isRegister, setIsRegister] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleGoogleLogin(credentialResponse) {
    setLoading(true);
    setError("");
    try {
      const apiBase = import.meta.env.VITE_API_URL || "http://localhost:3001";
      console.log(`[Auth] Google login to ${apiBase}/api/auth/google`);
      const res = await fetch(`${apiBase}/api/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential: credentialResponse.credential }),
        credentials: 'include'
      });
      console.log(`[Auth] Google response status: ${res.status}`);
      const data = await res.json();
      if (res.ok) onLogin(data.user, data.token);
      else setError(data.error || "Google Sign-In failed");
    } catch (err) {
      console.error(`[Auth] Google login error: ${err.message}`);
      setError("Server connection failed: " + err.message);
    }
    setLoading(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const endpoint = isRegister ? "register" : "login";
    try {
      const apiBase = import.meta.env.VITE_API_URL || "http://localhost:3001";
      console.log(`[Auth] Attempting ${endpoint} to ${apiBase}/api/auth/${endpoint}`);
      const res = await fetch(`${apiBase}/api/auth/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
        credentials: 'include'
      });
      console.log(`[Auth] Response status: ${res.status}`);
      const data = await res.json();
      if (res.ok) onLogin(data.user, data.token);
      else setError(data.error || "Authentication failed");
    } catch (err) {
      console.error(`[Auth] Connection error: ${err.message}`);
      setError("Server connection failed: " + err.message);
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-accent/5 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple/5 blur-[120px] rounded-full" />

      <div className="relative w-full max-w-md bg-card/40 border border-border/50 backdrop-blur-2xl rounded-[3rem] p-10 shadow-2xl animate-slide-up">
        <div className="text-center mb-10">
          <div className="text-6xl mb-6 animate-bounce-slow">🚀</div>
          <h1 className="font-syne text-4xl font-black text-white mb-2 uppercase tracking-tight">
            {isRegister ? "Join Elite" : "Welcome Back"}
          </h1>
          <p className="text-muted font-medium text-sm italic">
            {isRegister ? "Accelerating your US career logic" : "Orion AI is online and ready"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="bg-pink/10 border border-pink/30 text-pink text-xs py-3 px-4 rounded-2xl text-center font-bold tracking-tight">{error}</div>}

          {isRegister && (
            <input
              required placeholder="Full Name"
              className="w-full bg-surface/50 border border-border/60 rounded-2xl py-4 px-6 text-white text-sm outline-none focus:border-accent/40 transition-all placeholder:text-muted/50"
              value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
            />
          )}

          <input
            required type="email" placeholder="Email Address"
            className="w-full bg-surface/50 border border-border/60 rounded-2xl py-4 px-6 text-white text-sm outline-none focus:border-accent/40 transition-all placeholder:text-muted/50"
            value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
          />

          <input
            required type="password" placeholder="Password"
            className="w-full bg-surface/50 border border-border/60 rounded-2xl py-4 px-6 text-white text-sm outline-none focus:border-accent/40 transition-all placeholder:text-muted/50"
            value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
          />

          <button
            disabled={loading}
            className="w-full bg-accent hover:brightness-110 active:scale-[0.98] py-5 rounded-2xl text-black font-syne font-black text-sm uppercase tracking-[0.2em] transition-all disabled:opacity-50"
          >
            {loading ? "Decrypting..." : isRegister ? "Initialize Account" : "Access Console"}
          </button>

          <div className="flex items-center gap-4 py-4">
            <div className="flex-1 h-px bg-border/40" />
            <span className="text-[10px] text-muted font-black uppercase tracking-widest">or Secure Entry</span>
            <div className="flex-1 h-px bg-border/40" />
          </div>

          <div className="flex justify-center rounded-2xl overflow-hidden brightness-90 hover:brightness-100 transition-all">
            <GoogleLogin onSuccess={handleGoogleLogin} theme="filled_black" shape="pill" size="large" width="360" />
          </div>
        </form>

        <button
          onClick={() => setIsRegister(!isRegister)}
          className="w-full mt-8 text-[11px] text-accent/70 hover:text-accent font-black uppercase tracking-widest transition-colors cursor-pointer underline underline-offset-4"
        >
          {isRegister ? "Switch to Secure Access" : "Don't have permissions? Join Now"}
        </button>
      </div>
    </div>
  );
}

// ─── ERROR BOUNDARY ────────────────────────────────────────────────────────
class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen bg-background flex flex-col items-center justify-center p-10 text-center space-y-6">
          <div className="text-8xl">🚧</div>
          <h1 className="font-syne text-4xl font-black text-white">SYSTEM ANOMALY</h1>
          <p className="text-muted max-w-md text-sm font-medium leading-relaxed">The GradLaunch core experienced an unexpected interruption. This could be due to a synchronization error.</p>
          <div className="bg-pink/5 border border-pink/10 p-4 rounded-2xl text-pink text-[10px] font-mono max-w-lg overflow-auto">
            {this.state.error?.toString()}
          </div>
          <button onClick={() => window.location.reload()} className="bg-accent px-8 py-4 rounded-2xl text-black font-syne font-black uppercase tracking-widest text-xs">Re-Initialize</button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── MAIN APP ────────────────────────────────────────────────────────────────
function GradLaunchContent() {
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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [authToken, setAuthToken] = useState(() => localStorage.getItem("token"));

  // Keep the Chrome extension's stored JWT in sync with the dashboard login.
  useExtensionBridge(authToken);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    async function restoreSession() {
      const storedToken = localStorage.getItem("token");
      if (storedToken) {
        try {
          const apiBase = import.meta.env.VITE_API_URL || "http://localhost:3001";
          const res = await fetch(`${apiBase}/api/auth/me`, { headers: { "Authorization": `Bearer ${storedToken}` } });
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
          } else { localStorage.removeItem("token"); }
        } catch (e) { console.error("Session restore failed", e); }
      }
      setAuthLoading(false);
    }
    restoreSession();
  }, []);

  function handleLogout() {
    localStorage.removeItem("token");
    setAuthToken(null);
    setCurrentUser(null);
    setShowOnboarding(false);
  }

  async function handleAddToTracker(job) {
    if (!currentUser) { setShowLoginForm(true); return; }
    const apiBase = import.meta.env.VITE_API_URL || "http://localhost:3001";
    const token = localStorage.getItem("token");
    const exists = applications.find(a => a.company === job.company && a.role === job.title);

    if (!exists) {
      try {
        const stage = job.wishlist ? "Wishlist" : "Applied";
        const res = await fetch(`${apiBase}/api/applications`, {
          method: "POST",
          headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ company: job.company, role: job.title, logo: job.logo, stage, job_link: job.link, match_score: job.match || 85, is_trusted: job.is_trusted || 0 })
        });
        if (res.ok) {
          const syncRes = await fetch(`${apiBase}/api/applications`, { headers: { "Authorization": `Bearer ${token}` } });
          if (syncRes.ok) setApplications(await syncRes.json());
          showToast("Added to Job Pipeline!");
        }
      } catch (e) { showToast("Error syncing application", "error"); }
    }

    if (job.wishlist) navigate("/tracker");
    else { setPrefilledJob({ description: job.description, link: job.link, optimize: !!job.optimize }); navigate("/resume"); }
  }

  async function handleToggleSave(job) {
    if (!currentUser) { setShowLoginForm(true); return; }
    const apiBase = import.meta.env.VITE_API_URL || "http://localhost:3001";
    const token = localStorage.getItem("token");
    const isAlreadySaved = savedJobs.some(sj => sj.id === job.id);
    try {
      if (isAlreadySaved) {
        await fetch(`${apiBase}/api/jobs/unsave`, { method: "POST", headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ jobId: job.id }) });
        setSavedJobs(prev => prev.filter(sj => sj.id !== job.id));
        showToast("Removed from Bookmarks");
      } else {
        await fetch(`${apiBase}/api/jobs/save`, { method: "POST", headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ job }) });
        setSavedJobs(prev => [...prev, job]);
        showToast("Saved to Bookmarks!");
      }
    } catch (e) { showToast("Database sync error", "error"); }
  }

  if (authLoading) return <div className="h-screen bg-background flex items-center justify-center font-syne text-accent animate-pulse uppercase tracking-[0.4em] font-black">Initializing Orion AI...</div>;

  const isPublicPath = location.pathname === "/jobs" || location.pathname.startsWith("/jobs/");
  const showAuthOverlay = !currentUser && !isPublicPath;

  if (showAuthOverlay) {
    if (!showLoginForm) {
      return <LandingPage onShowLogin={() => setShowLoginForm(true)} />;
    }
    return <AuthScreen onLogin={(user, token) => {
      localStorage.setItem("token", token);
      setAuthToken(token);
      setCurrentUser(user);
      if (!user.hasProfile) setShowOnboarding(true);
    }} />;
  }

  if (showOnboarding && currentUser) return <Onboarding onComplete={() => setShowOnboarding(false)} currentUser={currentUser} />;



  if (showLoginForm) {
    return <AuthScreen onLogin={(user, token) => {
      localStorage.setItem("token", token);
      setAuthToken(token);
      setCurrentUser(user);
      setShowLoginForm(false);
    }} />;
  }

  return <AppShell currentUser={currentUser} token={authToken} onLogout={handleLogout} />;
}

export default function GradLaunch() {
  return (
    <ErrorBoundary>
      <GradLaunchContent />
    </ErrorBoundary>
  );
}

