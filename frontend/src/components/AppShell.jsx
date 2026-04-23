import { useState, useRef, useEffect } from "react";
import { Search, Briefcase, FileText, Users, Sparkles, Send, Upload, Check, X, ChevronRight, Zap, Target, TrendingUp, Building2, MapPin, DollarSign, Clock, ExternalLink, Plus, ChevronDown, Filter, Bell, Settings, LogOut, Menu, Bot, User as UserIcon, Paperclip, ArrowRight, Star, Shield, Globe, Linkedin, Mail, MoreVertical, Edit3, Download, AlertCircle } from "lucide-react";

// ============ DESIGN TOKENS ============
const C = {
  bg: "#070A10",
  bgAlt: "#0B1018",
  surface: "#0F1623",
  surfaceHi: "#151E2E",
  card: "#111A28",
  border: "#1C2839",
  borderHi: "#273650",
  accent: "#00E0FF",
  accentDim: "#0099BB",
  accentGlow: "rgba(0, 224, 255, 0.15)",
  green: "#00E599",
  yellow: "#FFD166",
  red: "#FF5C7A",
  purple: "#B09BFF",
  pink: "#FF7AB6",
  text: "#EAF2FF",
  textDim: "#9AB0C9",
  muted: "#5D7291",
};

const FONTS_LINK = "https://fonts.googleapis.com/css2?family=Syne:wght@500;600;700;800&family=DM+Sans:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

// ============ MOCK DATA ============
const JOBS = [
  { id: 1, title: "Software Engineer, New Grad", company: "Google", logo: "G", logoColor: "#4285F4", location: "Mountain View, CA", remote: "Hybrid", type: "Full-time", posted: "4h ago", salary: "$135k–$165k", tags: ["New Grad", "H1B Sponsor", "OPT"], match: 96, applicants: 84, description: "Join Google's core infrastructure team. Build systems that serve billions. We hire new grads who think deeply about scale and care about craft.", skills: ["Python", "Go", "Distributed Systems", "Kubernetes"], atsScore: 92, missingSkills: ["Kubernetes"], insider: 3, applyUrl: "greenhouse.io/google" },
  { id: 2, title: "Data Analyst, Early Career", company: "Meta", logo: "M", logoColor: "#1877F2", location: "Menlo Park, CA", remote: "Hybrid", type: "Full-time", posted: "1d ago", salary: "$115k–$145k", tags: ["New Grad", "H1B Sponsor"], match: 91, applicants: 142, description: "Analyze petabyte-scale product data that shapes decisions affecting 3B+ users. You'll partner directly with PMs and engineers.", skills: ["SQL", "Python", "Tableau", "Experimentation"], atsScore: 88, missingSkills: ["Experimentation"], insider: 2, applyUrl: "workday.com/meta" },
  { id: 3, title: "Frontend Engineer", company: "Airbnb", logo: "A", logoColor: "#FF385C", location: "San Francisco, CA", remote: "Onsite", type: "Full-time", posted: "2d ago", salary: "$125k–$155k", tags: ["New Grad", "OPT"], match: 87, applicants: 201, description: "Build the UI that helps millions find places to stay. React, TypeScript, a design system everyone obsesses over.", skills: ["React", "TypeScript", "GraphQL", "Design Systems"], atsScore: 84, missingSkills: ["GraphQL"], insider: 1, applyUrl: "lever.co/airbnb" },
  { id: 4, title: "ML Engineer, Applied", company: "OpenAI", logo: "O", logoColor: "#10A37F", location: "San Francisco, CA", remote: "Onsite", type: "Full-time", posted: "6h ago", salary: "$180k–$240k", tags: ["H1B Sponsor"], match: 74, applicants: 512, description: "Work on post-training of frontier models. Research-minded engineers with strong systems skills.", skills: ["PyTorch", "Distributed Training", "LLMs", "CUDA"], atsScore: 71, missingSkills: ["CUDA", "Distributed Training"], insider: 0, applyUrl: "openai.com/careers" },
  { id: 5, title: "Product Manager, APM", company: "Microsoft", logo: "MS", logoColor: "#00A4EF", location: "Redmond, WA", remote: "Hybrid", type: "Full-time", posted: "3d ago", salary: "$105k–$135k", tags: ["New Grad", "H1B Sponsor", "International"], match: 82, applicants: 378, description: "Microsoft's Associate PM rotational program. Two years, two teams, one of the best launchpads in tech.", skills: ["Product Sense", "Analytics", "Written Comms"], atsScore: 86, missingSkills: [], insider: 4, applyUrl: "careers.microsoft.com" },
  { id: 6, title: "Backend Engineer", company: "Stripe", logo: "S", logoColor: "#635BFF", location: "New York, NY", remote: "Remote", type: "Full-time", posted: "5d ago", salary: "$130k–$160k", tags: ["Remote", "OPT", "H1B Sponsor"], match: 85, applicants: 267, description: "Build the APIs powering a meaningful chunk of internet commerce. Deep engineering culture, Ruby + Go.", skills: ["Ruby", "Go", "PostgreSQL", "API Design"], atsScore: 79, missingSkills: ["Ruby"], insider: 2, applyUrl: "stripe.com/jobs" },
];

const INITIAL_APPS = [
  { id: 1, company: "Google", role: "Software Engineer, New Grad", stage: "Interview", date: "Apr 18", logo: "G", logoColor: "#4285F4", next: "Onsite • Apr 24" },
  { id: 2, company: "Meta", role: "Data Analyst", stage: "Applied", date: "Apr 19", logo: "M", logoColor: "#1877F2", next: "Awaiting response" },
  { id: 3, company: "Airbnb", role: "Frontend Engineer", stage: "Phone Screen", date: "Apr 15", logo: "A", logoColor: "#FF385C", next: "Recruiter call • Apr 23" },
  { id: 4, company: "Netflix", role: "Backend Engineer", stage: "Wishlist", date: "Apr 20", logo: "N", logoColor: "#E50914", next: "" },
  { id: 5, company: "Stripe", role: "DevOps Engineer", stage: "Offer", date: "Apr 10", logo: "S", logoColor: "#635BFF", next: "Deadline • Apr 30" },
  { id: 6, company: "Figma", role: "Product Designer", stage: "Rejected", date: "Apr 08", logo: "F", logoColor: "#F24E1E", next: "" },
];

const STAGES = ["Wishlist", "Applied", "Phone Screen", "Interview", "Offer", "Rejected"];
const STAGE_COLORS = { "Wishlist": C.muted, "Applied": C.accent, "Phone Screen": C.purple, "Interview": C.yellow, "Offer": C.green, "Rejected": C.red };

const RESUME_BULLETS_ORIG = [
  "Built a full-stack web app for tracking gym workouts using React and Node.js",
  "Interned at a startup where I wrote Python scripts to clean data",
  "Led a team of 4 students on a capstone project about machine learning",
  "Completed coursework in algorithms, data structures, and databases",
];

const RESUME_BULLETS_TAILORED = [
  "Architected full-stack fitness tracking platform serving 1.2k+ users with React 18, Node.js, and PostgreSQL — reduced query latency 40% via strategic indexing",
  "Engineered Python ETL pipelines at Series A startup processing 500k+ records daily, cutting manual ops time by 12 hrs/week",
  "Led cross-functional team of 4 delivering ML-powered recommendation system, shipped to production with 87% accuracy on held-out set",
  "Completed advanced coursework in distributed algorithms, database internals, and systems design with 3.8 GPA",
];

const INSIDERS = [
  { name: "Priya Raman", role: "Senior SWE @ Google", connection: "University of Maryland alum", avatar: "PR", color: "#B09BFF", likelihood: 78 },
  { name: "Marcus Chen", role: "Engineering Manager @ Google", connection: "2nd-degree via LinkedIn", avatar: "MC", color: "#00E599", likelihood: 54 },
  { name: "Sarah Okonkwo", role: "Tech Recruiter @ Google", connection: "Followed by 3 of your connections", avatar: "SO", color: "#FF7AB6", likelihood: 41 },
];

// ============ UTILITIES ============
const logoBg = (color) => ({
  background: `linear-gradient(135deg, ${color} 0%, ${color}CC 100%)`,
  boxShadow: `0 2px 12px ${color}40`,
});

function Logo({ letter, color, size = 40, radius = 10 }) {
  return (
    <div style={{ width: size, height: size, borderRadius: radius, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: size * 0.42, color: "#fff", flexShrink: 0, ...logoBg(color) }}>
      {letter}
    </div>
  );
}

function MatchBadge({ score, size = "md" }) {
  const color = score >= 90 ? C.green : score >= 80 ? C.accent : score >= 70 ? C.yellow : C.red;
  const isLg = size === "lg";
  const dim = isLg ? 64 : 48;
  return (
    <div style={{ position: "relative", width: dim, height: dim, flexShrink: 0 }}>
      <svg width={dim} height={dim} viewBox="0 0 48 48" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="24" cy="24" r="20" fill="none" stroke={C.border} strokeWidth="3" />
        <circle cx="24" cy="24" r="20" fill="none" stroke={color} strokeWidth="3" strokeDasharray={`${(score / 100) * 125.6} 125.6`} strokeLinecap="round" style={{ filter: `drop-shadow(0 0 4px ${color}AA)`, transition: "stroke-dasharray 0.8s ease" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: isLg ? 18 : 13, color, lineHeight: 1 }}>{score}</div>
        <div style={{ fontSize: isLg ? 9 : 7, color: C.muted, fontWeight: 600, letterSpacing: "0.5px", marginTop: 1 }}>MATCH</div>
      </div>
    </div>
  );
}

function Tag({ label, variant = "default" }) {
  const styles = {
    "New Grad": { bg: "rgba(0, 229, 153, 0.12)", color: C.green, border: "rgba(0, 229, 153, 0.25)" },
    "H1B Sponsor": { bg: "rgba(176, 155, 255, 0.12)", color: C.purple, border: "rgba(176, 155, 255, 0.25)" },
    "OPT": { bg: "rgba(124, 219, 142, 0.12)", color: "#7CDB8E", border: "rgba(124, 219, 142, 0.25)" },
    "International": { bg: "rgba(0, 224, 255, 0.12)", color: C.accent, border: "rgba(0, 224, 255, 0.25)" },
    "Remote": { bg: "rgba(255, 122, 182, 0.12)", color: C.pink, border: "rgba(255, 122, 182, 0.25)" },
  };
  const s = styles[label] || { bg: C.surfaceHi, color: C.textDim, border: C.border };
  return (
    <span style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}`, padding: "3px 9px", borderRadius: 999, fontSize: 10.5, fontWeight: 600, fontFamily: "DM Sans, sans-serif", letterSpacing: "0.3px", whiteSpace: "nowrap" }}>
      {label}
    </span>
  );
}

// ============ SIDEBAR ============
function Sidebar({ active, setActive, applications, jobsCount, currentUser, onLogout }) {
  const items = [
    { id: "jobs", label: "Job Matches", icon: Target, count: jobsCount },
    { id: "tailor", label: "Resume AI", icon: FileText },
    { id: "tracker", label: "Tracker", icon: Briefcase, count: applications.length },
    { id: "autofill", label: "Auto-Apply", icon: Zap, badge: "NEW" },
    { id: "orion", label: "Orion Copilot", icon: Sparkles },
    { id: "insiders", label: "Insiders", icon: Users },
  ];

  return (
    <aside style={{ width: 248, background: C.bgAlt, borderRight: `1px solid ${C.border}`, height: "100vh", position: "sticky", top: 0, display: "flex", flexDirection: "column", padding: "20px 14px" }}>
      {/* Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 10px 24px" }}>
        <div style={{ width: 34, height: 34, borderRadius: 9, background: `linear-gradient(135deg, ${C.accent} 0%, ${C.purple} 100%)`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 0 20px ${C.accentGlow}` }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M4 20L12 4L20 20L12 15L4 20Z" fill="#070A10" strokeLinejoin="round"/></svg>
        </div>
        <div>
          <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: 17, color: C.text, letterSpacing: "-0.02em" }}>GradLaunch</div>
          <div style={{ fontSize: 9.5, color: C.muted, letterSpacing: "1.2px", fontWeight: 600 }}>AI JOB COPILOT</div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.id;
          return (
            <button key={item.id} onClick={() => setActive(item.id)} style={{ display: "flex", alignItems: "center", gap: 11, padding: "9px 12px", borderRadius: 8, background: isActive ? C.surfaceHi : "transparent", border: `1px solid ${isActive ? C.border : "transparent"}`, color: isActive ? C.text : C.textDim, cursor: "pointer", fontSize: 13.5, fontWeight: isActive ? 600 : 500, fontFamily: "DM Sans, sans-serif", textAlign: "left", transition: "all 0.15s", position: "relative" }} onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = C.surface; }} onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = "transparent"; }}>
              <Icon size={16} strokeWidth={2} color={isActive ? C.accent : C.textDim} />
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.badge && <span style={{ fontSize: 8.5, fontWeight: 700, background: C.accent, color: C.bg, padding: "2px 6px", borderRadius: 4, letterSpacing: "0.5px" }}>{item.badge}</span>}
              {item.count !== undefined && <span style={{ fontSize: 11, color: C.muted, fontWeight: 500 }}>{item.count}</span>}
            </button>
          );
        })}
      </nav>

      {/* Profile chip */}
      <div style={{ padding: "10px 12px", borderRadius: 10, background: C.surface, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
        <div style={{ width: 32, height: 32, borderRadius: "50%", background: `linear-gradient(135deg, ${C.accent} 0%, ${C.purple} 100%)`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: C.bg, fontSize: 12, fontFamily: "Syne, sans-serif" }}>{currentUser?.name?.[0]?.toUpperCase() || "A"}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12.5, color: C.text, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{currentUser?.name || "Alex Student"}</div>
          <div style={{ fontSize: 10, color: C.muted }}>Free plan · 3 credits left</div>
        </div>
        <LogOut size={14} color={C.red} onClick={onLogout} style={{cursor:"pointer"}} />
      </div>
    </aside>
  );
}

// ============ TOP BAR ============
function TopBar({ title, subtitle, action }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, paddingBottom: 16, borderBottom: `1px solid ${C.border}` }}>
      <div>
        <h1 style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 26, color: C.text, margin: 0, letterSpacing: "-0.02em" }}>{title}</h1>
        {subtitle && <div style={{ fontSize: 13.5, color: C.textDim, marginTop: 4 }}>{subtitle}</div>}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {action}
        <button style={{ width: 36, height: 36, borderRadius: 9, background: C.surface, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", position: "relative" }}>
          <Bell size={15} color={C.textDim} />
          <div style={{ position: "absolute", top: 7, right: 7, width: 7, height: 7, borderRadius: "50%", background: C.accent, boxShadow: `0 0 8px ${C.accent}` }} />
        </button>
      </div>
    </div>
  );
}

// ============ JOB MATCHES VIEW ============
function JobMatches({ jobs, loading, onRefresh, onOpenJob, onAddToTracker }) {
  const [query, setQuery] = useState("");
  const [filterRemote, setFilterRemote] = useState("All");
  const [filterDate, setFilterDate] = useState("Any");
  const [sortBy, setSortBy] = useState("match");

  let filtered = jobs.filter(j =>
    (query === "" || j.title.toLowerCase().includes(query.toLowerCase()) || j.company?.toLowerCase().includes(query.toLowerCase()) || j.tags?.join(" ").toLowerCase().includes(query.toLowerCase())) &&
    (filterRemote === "All" || !j.location || j.location.includes(filterRemote) || (filterRemote === "Remote" && j.title.includes("Remote"))) &&
    (filterDate === "Any" || (j.posted_value && (Date.now() - j.posted_value) < (filterDate === "24h" ? 86400000 : 86400000*7)))
  );
  if (sortBy === "match") filtered = [...filtered].sort((a, b) => (b.match || b.match_score || 0) - (a.match || a.match_score || 0));
  if (sortBy === "recent") filtered = [...filtered].sort((a, b) => (b.posted_value || 0) - (a.posted_value || 0));

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <TopBar
        title="Tech Jobs Discovery"
        subtitle={`${filtered.length} active roles tailored to your stack`}
        action={<button onClick={onRefresh} disabled={loading} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 9, background: `linear-gradient(135deg, ${C.accent} 0%, ${C.accentDim} 100%)`, border: "none", color: C.bg, fontWeight: 700, fontSize: 13, cursor: loading ? "wait" : "pointer", fontFamily: "DM Sans, sans-serif", boxShadow: `0 0 20px ${C.accentGlow}` }}>{loading ? <div style={{width: 14, height: 14, border: `2px solid ${C.bg}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite"}}/> : <Sparkles size={14} />} Refresh feed</button>}
      />

      <div style={{ display: "flex", gap: 32, flex: 1, alignItems: "flex-start" }}>
        {/* DICE-LIKE LEFT SIDEBAR FILTERS */}
        <div style={{ width: 250, flexShrink: 0, display: "flex", flexDirection: "column", gap: 24, position: "sticky", top: 0 }}>
          
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, color: C.textDim, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Keyword / Skill</div>
            <div style={{ position: "relative" }}>
              <Search size={15} color={C.muted} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }} />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="e.g. React, Python" style={{ width: "100%", padding: "12px 14px 12px 40px", borderRadius: 10, background: C.surface, border: `1px solid ${C.border}`, color: C.text, fontSize: 13.5, fontFamily: "DM Sans, sans-serif", outline: "none", boxSizing: "border-box" }} onFocus={(e) => e.target.style.borderColor = C.accent} onBlur={(e) => e.target.style.borderColor = C.border} />
            </div>
          </div>

          <div>
            <div style={{ fontSize: 12, fontWeight: 800, color: C.textDim, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Work Setting</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {["All", "Remote", "Hybrid", "Onsite"].map(opt => (
                <label key={opt} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 13, color: filterRemote === opt ? C.text : C.textDim, fontWeight: filterRemote === opt ? 600 : 400 }}>
                  <input type="radio" name="remote" checked={filterRemote === opt} onChange={() => setFilterRemote(opt)} style={{ accentColor: C.accent, cursor: "pointer", width: 16, height: 16 }} />
                  {opt}
                </label>
              ))}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 12, fontWeight: 800, color: C.textDim, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Date Posted</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[ {label: "Any Time", val: "Any"}, {label: "Last 24 Hours", val: "24h"}, {label: "Last 7 Days", val: "7d"} ].map(opt => (
                <label key={opt.val} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 13, color: filterDate === opt.val ? C.text : C.textDim, fontWeight: filterDate === opt.val ? 600 : 400 }}>
                  <input type="radio" name="date" checked={filterDate === opt.val} onChange={() => setFilterDate(opt.val)} style={{ accentColor: C.accent, cursor: "pointer", width: 16, height: 16 }} />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>

          <div style={{ height: 1, background: C.border, margin: "8px 0" }} />

          <div>
            <div style={{ fontSize: 12, fontWeight: 800, color: C.textDim, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Sort By</div>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ width: "100%", padding: "11px 14px", borderRadius: 10, background: C.surface, border: `1px solid ${C.border}`, color: C.text, fontSize: 13, fontFamily: "DM Sans, sans-serif", outline: "none", cursor: "pointer" }}>
              <option value="match">Highest Match Score</option>
              <option value="recent">Most Recent</option>
            </select>
          </div>

        </div>

        {/* RIGHT FEED */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ fontSize: 14, color: C.muted, fontWeight: 500 }}>
            Showing <strong style={{color: C.text}}>{filtered.length}</strong> jobs matching your criteria
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {filtered.map((job) => (
              <div key={job.id} onClick={() => onOpenJob(job)} style={{ padding: 24, borderRadius: 12, background: C.card, border: `1px solid ${C.border}`, cursor: "pointer", transition: "all 0.15s", position: "relative", overflow: "hidden" }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.borderHi; e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 30px rgba(0,0,0,0.2)"; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}>
                
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
                  
                  {/* Left Column of Card */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: C.textDim, textTransform: "uppercase", letterSpacing: 0.5 }}>{job.company}</span>
                      <span style={{ color: C.border }}>·</span>
                      <span style={{ fontSize: 12, color: C.muted }}>{job.posted || "Recently"}</span>
                    </div>
                    
                    <h3 style={{ margin: "0 0 12px 0", fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 20, color: C.accent, letterSpacing: "-0.01em" }}>{job.title}</h3>
                    
                    <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 13, color: C.text, marginBottom: 16 }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 4 }}><MapPin size={14} color={C.muted} />{job.location || "Remote"}</span>
                      {job.salary && <span style={{ display: "flex", alignItems: "center", gap: 4, color: C.green, fontWeight: 600 }}><DollarSign size={14} />{job.salary}</span>}
                      {job.remote && <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Building2 size={14} color={C.muted} />{job.remote}</span>}
                    </div>

                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
                      {job.tags && job.tags.slice(0, 6).map(t => <span key={t} style={{ fontSize: 11, fontWeight: 600, background: C.surfaceHi, color: C.textDim, padding: "4px 10px", borderRadius: 6, border: `1px solid ${C.border}` }}>{t}</span>)}
                    </div>
                  </div>

                  {/* Right Column of Card */}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 12 }}>
                    <Logo letter={job.logo?.startsWith("http") ? <img src={job.logo} style={{width:28,height:28,objectFit:"contain",borderRadius:6}} /> : (job.company?.[0] || "?")} color={job.logoColor || "#4285F4"} size={48} radius={10} />
                    <MatchBadge score={Math.round(job.match || job.match_score || 75)} />
                  </div>

                </div>

                {/* Bottom Actions Row */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: `1px solid ${C.border}`, paddingTop: 16, marginTop: 4 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <button onClick={(e) => { e.stopPropagation(); onAddToTracker(job); }} style={{ padding: "8px 20px", borderRadius: 8, background: C.accent, border: "none", color: C.bg, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "DM Sans, sans-serif", transition: "0.2s" }} onMouseEnter={e => e.currentTarget.style.filter = "brightness(1.1)"} onMouseLeave={e => e.currentTarget.style.filter = "none"}>Easy Apply</button>
                    <button onClick={(e) => { e.stopPropagation(); onOpenJob(job); }} style={{ padding: "8px 16px", borderRadius: 8, background: "transparent", border: `1px solid ${C.border}`, color: C.text, fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: "DM Sans, sans-serif", display: "flex", alignItems: "center", gap: 6 }}><FileText size={14} /> Tailor Resume</button>
                  </div>
                  {job.insider > 0 && <span style={{ fontSize: 12, color: C.muted, display: "flex", alignItems: "center", gap: 4 }}><Users size={12} color={C.purple} /> {job.insider} active recruiter{job.insider > 1 ? "s" : ""}</span>}
                </div>

              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

// ============ JOB DETAIL MODAL ============
function JobDetail({ job, onClose, onTailor, onApply }) {
  if (!job) return null;
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(5, 8, 14, 0.75)", backdropFilter: "blur(8px)", display: "flex", justifyContent: "flex-end", zIndex: 100 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 520, maxWidth: "100%", height: "100%", background: C.bgAlt, borderLeft: `1px solid ${C.border}`, overflowY: "auto", padding: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <button onClick={onClose} style={{ background: "none", border: "none", color: C.textDim, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontFamily: "DM Sans, sans-serif" }}><X size={16} /> Close</button>
          <button style={{ background: "none", border: `1px solid ${C.border}`, color: C.textDim, padding: "6px 12px", borderRadius: 8, cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", gap: 5 }}><ExternalLink size={12} /> Source</button>
        </div>

        <div style={{ display: "flex", gap: 16, alignItems: "flex-start", marginBottom: 18 }}>
          <Logo letter={job.logo?.startsWith("http") ? <img src={job.logo} style={{width:24,height:24,objectFit:"contain",borderRadius:6}} /> : (job.company?.[0] || "?")} color={job.logoColor || "#4285F4"} size={56} radius={13} />
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: 0, fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 21, color: C.text }}>{job.title}</h2>
            <div style={{ fontSize: 14, color: C.textDim, marginTop: 4 }}>{job.company} · {job.location || "Remote"}</div>
          </div>
          <MatchBadge score={Math.round(job.match || job.match_score || 75)} size="lg" />
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
          {(job.tags || []).map(t => <Tag key={t} label={t} />)}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 22 }}>
          <button onClick={() => onApply(job)} style={{ padding: "12px", borderRadius: 10, background: `linear-gradient(135deg, ${C.accent} 0%, ${C.accentDim} 100%)`, border: "none", color: C.bg, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "DM Sans, sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, boxShadow: `0 0 20px ${C.accentGlow}` }}><Zap size={14} /> Auto-apply now</button>
          <button onClick={() => onTailor(job)} style={{ padding: "12px", borderRadius: 10, background: C.surface, border: `1px solid ${C.border}`, color: C.text, fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: "DM Sans, sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}><FileText size={14} /> Tailor resume</button>
        </div>

        {/* Why you match */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16, marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <Sparkles size={14} color={C.accent} />
            <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 13, color: C.text, letterSpacing: "0.02em" }}>WHY YOU MATCH</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {["Strong overlap on Python & backend work from your capstone", "Recent coursework in distributed systems aligns with scale focus", `GPA above their stated 3.5 threshold`].map((reason, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 12.5, color: C.textDim, lineHeight: 1.5 }}>
                <Check size={14} color={C.green} style={{ flexShrink: 0, marginTop: 1 }} />
                <span>{reason}</span>
              </div>
            ))}
          </div>
          {job.missingSkills.length > 0 && (
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6, fontSize: 11.5, fontWeight: 600, color: C.yellow }}><AlertCircle size={12} /> GAP: add these to your resume if applicable</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {job.missingSkills.map(s => <span key={s} style={{ padding: "3px 9px", borderRadius: 6, background: "rgba(255, 209, 102, 0.1)", color: C.yellow, fontSize: 11.5, fontWeight: 500 }}>{s}</span>)}
              </div>
            </div>
          )}
        </div>

        {/* ATS score */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16, marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 13, color: C.text, letterSpacing: "0.02em" }}>ATS COMPATIBILITY</div>
            <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: 18, color: job.atsScore >= 85 ? C.green : C.yellow }}>{job.atsScore}<span style={{ fontSize: 11, color: C.muted }}>/100</span></div>
          </div>
          <div style={{ height: 6, background: C.border, borderRadius: 999, overflow: "hidden" }}>
            <div style={{ width: `${job.atsScore}%`, height: "100%", background: `linear-gradient(90deg, ${C.accent} 0%, ${C.green} 100%)`, borderRadius: 999 }} />
          </div>
          <div style={{ fontSize: 11.5, color: C.muted, marginTop: 8 }}>Tailoring your resume to this role would likely push this to ~95</div>
        </div>

        {/* Description */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 13, color: C.text, marginBottom: 8, letterSpacing: "0.02em" }}>ABOUT THE ROLE</div>
          <div style={{ fontSize: 13, color: C.textDim, lineHeight: 1.6 }}>{job.description}</div>
        </div>

        {/* Skills */}
        <div>
          <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 13, color: C.text, marginBottom: 8, letterSpacing: "0.02em" }}>KEY SKILLS</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {job.skills.map(s => <span key={s} style={{ padding: "5px 10px", borderRadius: 7, background: C.surfaceHi, border: `1px solid ${C.border}`, color: C.textDim, fontSize: 12, fontFamily: "JetBrains Mono, monospace" }}>{s}</span>)}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============ RESUME TAILOR ============
function ResumeTailor({ targetJob }) {
  const [hasResume, setHasResume] = useState(false);
  const [tailoring, setTailoring] = useState(false);
  const [tailored, setTailored] = useState(false);

  const runTailor = () => {
    setTailoring(true);
    setTimeout(() => { setTailoring(false); setTailored(true); }, 1800);
  };

  if (!hasResume) {
    return (
      <div>
        <TopBar title="Resume AI" subtitle="Upload your resume once. We'll tailor it for every job in seconds." />
        <div style={{ background: C.card, border: `2px dashed ${C.border}`, borderRadius: 14, padding: 48, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: C.surfaceHi, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 18 }}>
            <Upload size={26} color={C.accent} />
          </div>
          <h3 style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 18, color: C.text, margin: 0 }}>Drop your resume here</h3>
          <div style={{ fontSize: 13, color: C.textDim, marginTop: 6, maxWidth: 400 }}>PDF or DOCX. We'll extract your experience, skills, and education — then use them to score every job match and generate tailored versions.</div>
          <button onClick={() => setHasResume(true)} style={{ marginTop: 20, padding: "11px 24px", borderRadius: 10, background: `linear-gradient(135deg, ${C.accent} 0%, ${C.accentDim} 100%)`, border: "none", color: C.bg, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "DM Sans, sans-serif" }}>Choose file</button>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 14, display: "flex", alignItems: "center", gap: 6 }}><Shield size={11} /> Your resume never leaves your account. Not shared with third parties.</div>
        </div>
      </div>
    );
  }

  const jobForTailor = targetJob || JOBS[0];

  return (
    <div>
      <TopBar
        title="Resume AI"
        subtitle={`Tailoring for: ${jobForTailor.title} at ${jobForTailor.company}`}
        action={<button style={{ padding: "8px 14px", borderRadius: 9, background: C.surface, border: `1px solid ${C.border}`, color: C.text, fontWeight: 600, fontSize: 12.5, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}><Download size={13} /> Export DOCX</button>}
      />

      {!tailored && (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 18, marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <Logo letter={jobForTailor.logo} color={jobForTailor.logoColor} size={44} />
            <div>
              <div style={{ fontSize: 14, color: C.text, fontWeight: 600 }}>{jobForTailor.title}</div>
              <div style={{ fontSize: 12, color: C.textDim }}>{jobForTailor.company} · Match will improve from {jobForTailor.match} → ~97</div>
            </div>
          </div>
          <button onClick={runTailor} disabled={tailoring} style={{ padding: "10px 18px", borderRadius: 9, background: tailoring ? C.surface : `linear-gradient(135deg, ${C.accent} 0%, ${C.accentDim} 100%)`, border: tailoring ? `1px solid ${C.border}` : "none", color: tailoring ? C.textDim : C.bg, fontWeight: 700, fontSize: 13, cursor: tailoring ? "wait" : "pointer", fontFamily: "DM Sans, sans-serif", display: "flex", alignItems: "center", gap: 6 }}>
            {tailoring ? <><div style={{ width: 12, height: 12, border: `2px solid ${C.border}`, borderTopColor: C.accent, borderRadius: "50%", animation: "spin 0.7s linear infinite" }} /> Tailoring…</> : <><Sparkles size={13} /> Tailor resume</>}
          </button>
        </div>
      )}

      {/* Side-by-side diff */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        {/* Original */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 18 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, paddingBottom: 10, borderBottom: `1px solid ${C.border}` }}>
            <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 13, color: C.textDim, letterSpacing: "0.04em" }}>ORIGINAL</div>
            <div style={{ fontSize: 11, color: C.muted }}>ATS: 76/100</div>
          </div>
          <div style={{ fontFamily: "DM Sans, sans-serif", fontSize: 13, color: C.text, fontWeight: 600, marginBottom: 4 }}>Alex Student</div>
          <div style={{ fontSize: 11, color: C.muted, marginBottom: 14 }}>alex@umd.edu · github.com/alexstudent</div>
          <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 11, color: C.accent, letterSpacing: "0.08em", marginBottom: 8 }}>EXPERIENCE</div>
          {RESUME_BULLETS_ORIG.map((b, i) => (
            <div key={i} style={{ fontSize: 12, color: C.textDim, marginBottom: 10, lineHeight: 1.5, display: "flex", gap: 6 }}>
              <span style={{ color: C.muted }}>•</span><span>{b}</span>
            </div>
          ))}
        </div>

        {/* Tailored */}
        <div style={{ background: tailored ? `linear-gradient(135deg, ${C.card} 0%, rgba(0, 224, 255, 0.04) 100%)` : C.card, border: `1px solid ${tailored ? C.accent : C.border}`, borderRadius: 12, padding: 18, position: "relative", boxShadow: tailored ? `0 0 0 3px ${C.accentGlow}` : "none", transition: "all 0.4s" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, paddingBottom: 10, borderBottom: `1px solid ${C.border}` }}>
            <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 13, color: tailored ? C.accent : C.muted, letterSpacing: "0.04em", display: "flex", alignItems: "center", gap: 6 }}><Sparkles size={12} /> TAILORED</div>
            <div style={{ fontSize: 11, color: tailored ? C.green : C.muted, fontWeight: 600 }}>{tailored ? "ATS: 94/100 ↑" : "Pending"}</div>
          </div>
          {!tailored && !tailoring && (
            <div style={{ padding: "40px 10px", textAlign: "center", color: C.muted, fontSize: 12.5 }}>
              <FileText size={28} style={{ opacity: 0.3, marginBottom: 10 }} />
              <div>Click "Tailor resume" above to generate a version optimized for this role.</div>
            </div>
          )}
          {tailoring && (
            <div style={{ padding: "40px 10px", textAlign: "center" }}>
              <div style={{ display: "inline-block", width: 32, height: 32, border: `3px solid ${C.border}`, borderTopColor: C.accent, borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
              <div style={{ fontSize: 12, color: C.textDim, marginTop: 12 }}>Analyzing job description…</div>
            </div>
          )}
          {tailored && (
            <>
              <div style={{ fontFamily: "DM Sans, sans-serif", fontSize: 13, color: C.text, fontWeight: 600, marginBottom: 4 }}>Alex Student</div>
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 14 }}>alex@umd.edu · github.com/alexstudent</div>
              <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 11, color: C.accent, letterSpacing: "0.08em", marginBottom: 8 }}>EXPERIENCE</div>
              {RESUME_BULLETS_TAILORED.map((b, i) => (
                <div key={i} style={{ fontSize: 12, color: C.text, marginBottom: 10, lineHeight: 1.5, display: "flex", gap: 6, background: "rgba(0, 224, 255, 0.04)", padding: "6px 8px", borderRadius: 6, borderLeft: `2px solid ${C.accent}` }}>
                  <span style={{ color: C.accent }}>•</span><span>{b}</span>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {tailored && (
        <div style={{ marginTop: 16, padding: 14, background: "rgba(0, 229, 153, 0.08)", border: `1px solid rgba(0, 229, 153, 0.25)`, borderRadius: 10, display: "flex", alignItems: "center", gap: 12 }}>
          <Check size={18} color={C.green} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>Resume tailored — ready to apply</div>
            <div style={{ fontSize: 11.5, color: C.textDim, marginTop: 2 }}>Added 4 keywords from the JD · Rewrote 4 bullets with stronger metrics · Formatted for ATS parsing</div>
          </div>
          <button style={{ padding: "8px 14px", borderRadius: 8, background: C.green, border: "none", color: C.bg, fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "DM Sans, sans-serif" }}>Use this version</button>
        </div>
      )}
    </div>
  );
}

// ============ TRACKER (KANBAN) ============
function Tracker({ applications, setApplications }) {
  const [dragId, setDragId] = useState(null);

  const byStage = STAGES.reduce((acc, s) => { acc[s] = applications.filter(a => a.stage === s); return acc; }, {});

  return (
    <div>
      <TopBar title="Tracker" subtitle="Every application, every stage — drag to update" action={<button style={{ padding: "8px 14px", borderRadius: 9, background: C.surface, border: `1px solid ${C.border}`, color: C.text, fontWeight: 600, fontSize: 12.5, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}><Plus size={13} /> Add manually</button>} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 10, overflowX: "auto", paddingBottom: 10 }}>
        {STAGES.map(stage => (
          <div key={stage}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => { if (dragId) { setApplications(applications.map(a => a.id === dragId ? { ...a, stage } : a)); setDragId(null); } }}
            style={{ background: C.bgAlt, border: `1px solid ${C.border}`, borderRadius: 11, padding: 10, minHeight: 400, display: "flex", flexDirection: "column" }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, padding: "2px 4px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: STAGE_COLORS[stage], boxShadow: `0 0 8px ${STAGE_COLORS[stage]}AA` }} />
                <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 11.5, color: C.text, letterSpacing: "0.04em" }}>{stage.toUpperCase()}</div>
              </div>
              <span style={{ fontSize: 11, color: C.muted, fontWeight: 600 }}>{byStage[stage].length}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {byStage[stage].map(app => (
                <div key={app.id} draggable onDragStart={() => setDragId(app.id)} style={{ padding: 11, borderRadius: 9, background: C.card, border: `1px solid ${C.border}`, cursor: "grab", opacity: dragId === app.id ? 0.4 : 1, transition: "opacity 0.2s" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
                    <Logo letter={app.logo} color={app.logoColor} size={26} radius={7} />
                    <div style={{ fontSize: 12, color: C.text, fontWeight: 600, flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{app.company}</div>
                  </div>
                  <div style={{ fontSize: 11, color: C.textDim, marginBottom: 6, lineHeight: 1.3 }}>{app.role}</div>
                  {app.next && <div style={{ fontSize: 10, color: STAGE_COLORS[stage], fontWeight: 600, padding: "3px 6px", background: `${STAGE_COLORS[stage]}15`, borderRadius: 5, display: "inline-block" }}>{app.next}</div>}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginTop: 20 }}>
        {[
          { label: "Applied", value: applications.filter(a => a.stage !== "Wishlist").length, color: C.accent, icon: Briefcase },
          { label: "Interviewing", value: applications.filter(a => a.stage === "Interview" || a.stage === "Phone Screen").length, color: C.purple, icon: Users },
          { label: "Offers", value: applications.filter(a => a.stage === "Offer").length, color: C.green, icon: Star },
          { label: "Response rate", value: "34%", color: C.yellow, icon: TrendingUp },
        ].map(stat => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} style={{ padding: 14, background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 9, background: `${stat.color}15`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon size={16} color={stat.color} />
              </div>
              <div>
                <div style={{ fontSize: 11.5, color: C.textDim, fontWeight: 500 }}>{stat.label}</div>
                <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 18, color: C.text, marginTop: 2 }}>{stat.value}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============ AUTO-APPLY VIEW ============
function AutoApply() {
  const [step, setStep] = useState(0); // 0 = idle, 1-4 = running, 5 = done
  const [queue, setQueue] = useState(JOBS.slice(0, 4));

  const steps = [
    { label: "Loading application page", icon: Globe },
    { label: "Mapping form fields to your profile", icon: Target },
    { label: "Attaching tailored resume", icon: FileText },
    { label: "Submitting", icon: Send },
  ];

  const runBatch = () => {
    setStep(1);
    let i = 1;
    const iv = setInterval(() => { i++; if (i > 4) { clearInterval(iv); setStep(5); } else { setStep(i); } }, 900);
  };

  return (
    <div>
      <TopBar title="Auto-Apply" subtitle="One click to submit to jobs that match your profile" action={<span style={{ fontSize: 11, padding: "4px 10px", background: "rgba(0, 224, 255, 0.12)", color: C.accent, borderRadius: 999, fontWeight: 700, letterSpacing: "0.05em" }}>BETA</span>} />

      {/* Hero */}
      <div style={{ padding: 24, background: `linear-gradient(135deg, ${C.card} 0%, rgba(0, 224, 255, 0.05) 100%)`, border: `1px solid ${C.border}`, borderRadius: 14, marginBottom: 18, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -30, right: -30, width: 200, height: 200, borderRadius: "50%", background: `radial-gradient(circle, ${C.accentGlow} 0%, transparent 70%)` }} />
        <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20 }}>
          <div>
            <h2 style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 20, color: C.text, margin: 0, letterSpacing: "-0.01em" }}>Submit {queue.length} applications in one click</h2>
            <div style={{ fontSize: 13, color: C.textDim, marginTop: 6, maxWidth: 460, lineHeight: 1.5 }}>We'll tailor your resume for each role, fill the application, attach it, and submit — one job at a time. You'll review every submission before it goes out.</div>
          </div>
          <button onClick={runBatch} disabled={step > 0 && step < 5} style={{ padding: "12px 22px", borderRadius: 10, background: step === 5 ? C.green : `linear-gradient(135deg, ${C.accent} 0%, ${C.accentDim} 100%)`, border: "none", color: C.bg, fontWeight: 700, fontSize: 13.5, cursor: step > 0 && step < 5 ? "wait" : "pointer", fontFamily: "DM Sans, sans-serif", display: "flex", alignItems: "center", gap: 7, whiteSpace: "nowrap", boxShadow: `0 0 24px ${C.accentGlow}` }}>
            {step === 0 && <><Zap size={14} /> Start batch</>}
            {step > 0 && step < 5 && <><div style={{ width: 12, height: 12, border: `2px solid ${C.bg}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} /> Running…</>}
            {step === 5 && <><Check size={14} /> All submitted</>}
          </button>
        </div>
      </div>

      {/* Queue */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
        <div style={{ padding: "14px 18px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 13, color: C.text, letterSpacing: "0.02em" }}>APPLICATION QUEUE</div>
          <div style={{ fontSize: 11.5, color: C.muted }}>All jobs matched 80%+ · Tailored resume will be generated for each</div>
        </div>
        {queue.map((job, idx) => {
          const isCurrent = step >= 1 && step <= 4 && idx === 0;
          const isDone = step === 5 || (step > 1 && idx === 0);
          return (
            <div key={job.id} style={{ padding: 14, display: "flex", alignItems: "center", gap: 14, borderBottom: idx < queue.length - 1 ? `1px solid ${C.border}` : "none", background: isCurrent ? "rgba(0, 224, 255, 0.04)" : "transparent" }}>
              <Logo letter={job.logo} color={job.logoColor} size={38} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, color: C.text, fontWeight: 600 }}>{job.title}</div>
                <div style={{ fontSize: 11.5, color: C.textDim, marginTop: 2 }}>{job.company} · via {job.applyUrl}</div>
                {isCurrent && step > 0 && step < 5 && (
                  <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
                    {steps.slice(0, step).map((s, i) => {
                      const StepIcon = s.icon;
                      const isActiveStep = i === step - 1;
                      return (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: isActiveStep ? C.accent : C.green }}>
                          {isActiveStep ? <div style={{ width: 10, height: 10, border: `2px solid ${C.accent}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} /> : <Check size={11} />}
                          <span>{s.label}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              <MatchBadge score={job.match} />
              <div style={{ minWidth: 90, textAlign: "right" }}>
                {step === 0 && <span style={{ fontSize: 11, color: C.muted }}>Queued</span>}
                {isCurrent && step > 0 && step < 5 && <span style={{ fontSize: 11, color: C.accent, fontWeight: 600 }}>Submitting…</span>}
                {(step === 5 || (isDone && step > 1)) && <span style={{ fontSize: 11, color: C.green, fontWeight: 600, display: "flex", alignItems: "center", gap: 4, justifyContent: "flex-end" }}><Check size={11} /> Submitted</span>}
                {!isCurrent && step > 0 && step < 5 && idx > 0 && <span style={{ fontSize: 11, color: C.muted }}>Waiting</span>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Trust / safety */}
      <div style={{ marginTop: 14, display: "flex", gap: 10, fontSize: 11.5, color: C.muted, padding: "10px 14px", background: C.surface, borderRadius: 9, border: `1px solid ${C.border}` }}>
        <Shield size={13} color={C.accent} />
        <span><strong style={{ color: C.textDim, fontWeight: 600 }}>You're in control.</strong> Every submission pauses for your approval before sending. Credentials stay encrypted on your device.</span>
      </div>
    </div>
  );
}

// ============ ORION COPILOT ============
function Orion() {
  const [messages, setMessages] = useState([
    { role: "orion", text: "Hey Alex — I've looked at your resume and the 6 top matches in your feed. What do you want to tackle first?", chips: ["Why am I a fit for Google?", "Draft a cover letter for the Meta role", "What skills should I learn this week?"] },
  ]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, thinking]);

  const send = (text) => {
    if (!text.trim()) return;
    setMessages(m => [...m, { role: "user", text }]);
    setInput("");
    setThinking(true);
    setTimeout(() => {
      setThinking(false);
      const reply = getReply(text);
      setMessages(m => [...m, reply]);
    }, 1400);
  };

  const getReply = (text) => {
    const lower = text.toLowerCase();
    if (lower.includes("google") || lower.includes("fit")) {
      return { role: "orion", text: "Here's the honest read on your fit for the Google SWE New Grad role:", card: { type: "fit", score: 96, strengths: ["Capstone project used distributed systems concepts they care about", "Strong GPA + CS fundamentals match the bar", "Python experience across 3 projects"], gaps: ["No Kubernetes exposure — mention your Docker work instead", "Their team specifically calls out SRE-adjacent work; your monitoring project helps here"] } };
    }
    if (lower.includes("cover letter") || lower.includes("meta")) {
      return { role: "orion", text: "Drafted a cover letter for the Meta Data Analyst role — leaned on your A/B testing coursework since they emphasize experimentation:", card: { type: "letter", preview: "Dear Hiring Manager,\n\nThe Data Analyst opening on Meta's Growth team caught my attention because of its focus on experimentation at scale — something I've only done at coursework level, but care deeply about…" } };
    }
    if (lower.includes("skill") || lower.includes("learn")) {
      return { role: "orion", text: "Based on the gap between your resume and the top 20 jobs in your feed, here's your learning priority for the next 2 weeks:", card: { type: "skills", items: [{ skill: "SQL window functions", why: "Shows up in 14 of your top 20 matches", time: "3 hours" }, { skill: "Basic Kubernetes concepts", why: "Unlocks 5 more matches above 85%", time: "6 hours" }, { skill: "Product sense case practice", why: "PM roles are your 2nd-highest conversion", time: "4 hours" }] } };
    }
    return { role: "orion", text: `Got it. I'll dig into that and come back with specifics. In the meantime — want me to pull up related jobs or work on your resume for a specific role?`, chips: ["Show related jobs", "Review my resume"] };
  };

  return (
    <div style={{ height: "calc(100vh - 48px)", display: "flex", flexDirection: "column" }}>
      <TopBar title={<span style={{ display: "flex", alignItems: "center", gap: 10 }}><Sparkles size={22} color={C.accent} style={{ filter: `drop-shadow(0 0 8px ${C.accent})` }} /> Orion</span>} subtitle="Your AI career copilot — knows your resume, your goals, and every job in your feed" />

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", paddingRight: 8, display: "flex", flexDirection: "column", gap: 16 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: "flex", gap: 12, flexDirection: m.role === "user" ? "row-reverse" : "row", alignItems: "flex-start" }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: m.role === "orion" ? `linear-gradient(135deg, ${C.accent} 0%, ${C.purple} 100%)` : C.surfaceHi, border: m.role === "user" ? `1px solid ${C.border}` : "none", boxShadow: m.role === "orion" ? `0 0 16px ${C.accentGlow}` : "none" }}>
              {m.role === "orion" ? <Bot size={16} color={C.bg} /> : <UserIcon size={14} color={C.textDim} />}
            </div>
            <div style={{ maxWidth: 560, display: "flex", flexDirection: "column", gap: 10, alignItems: m.role === "user" ? "flex-end" : "flex-start" }}>
              <div style={{ padding: "11px 15px", borderRadius: m.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px", background: m.role === "user" ? C.accent : C.card, color: m.role === "user" ? C.bg : C.text, fontSize: 13.5, lineHeight: 1.55, fontWeight: m.role === "user" ? 500 : 400, border: m.role === "orion" ? `1px solid ${C.border}` : "none" }}>
                {m.text}
              </div>

              {/* Rich cards */}
              {m.card?.type === "fit" && (
                <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 14, width: 420 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, paddingBottom: 10, borderBottom: `1px solid ${C.border}` }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: C.textDim }}>FIT ANALYSIS</div>
                    <MatchBadge score={m.card.score} />
                  </div>
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: C.green, letterSpacing: "0.05em", marginBottom: 6 }}>STRENGTHS</div>
                  {m.card.strengths.map((s, j) => <div key={j} style={{ fontSize: 12, color: C.textDim, marginBottom: 5, display: "flex", gap: 6 }}><Check size={13} color={C.green} style={{ flexShrink: 0, marginTop: 2 }} />{s}</div>)}
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: C.yellow, letterSpacing: "0.05em", margin: "12px 0 6px" }}>GAPS TO ADDRESS</div>
                  {m.card.gaps.map((s, j) => <div key={j} style={{ fontSize: 12, color: C.textDim, marginBottom: 5, display: "flex", gap: 6 }}><AlertCircle size={13} color={C.yellow} style={{ flexShrink: 0, marginTop: 2 }} />{s}</div>)}
                </div>
              )}

              {m.card?.type === "letter" && (
                <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 14, width: 420 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: C.textDim, marginBottom: 10 }}>COVER LETTER DRAFT</div>
                  <div style={{ fontSize: 12.5, color: C.text, lineHeight: 1.6, whiteSpace: "pre-wrap", fontFamily: "DM Sans, serif", padding: 12, background: C.surface, borderRadius: 8, border: `1px solid ${C.border}`, marginBottom: 10 }}>{m.card.preview}</div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button style={{ padding: "7px 12px", borderRadius: 7, background: C.accent, border: "none", color: C.bg, fontWeight: 700, fontSize: 11.5, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}><Download size={11} /> Download</button>
                    <button style={{ padding: "7px 12px", borderRadius: 7, background: "transparent", border: `1px solid ${C.border}`, color: C.text, fontWeight: 600, fontSize: 11.5, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}><Edit3 size={11} /> Refine</button>
                  </div>
                </div>
              )}

              {m.card?.type === "skills" && (
                <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 14, width: 460 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: C.textDim, marginBottom: 12 }}>2-WEEK LEARNING PLAN</div>
                  {m.card.items.map((item, j) => (
                    <div key={j} style={{ padding: 10, marginBottom: 6, background: C.surface, borderRadius: 8, border: `1px solid ${C.border}` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 3 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{item.skill}</div>
                        <div style={{ fontSize: 10.5, color: C.accent, fontFamily: "JetBrains Mono, monospace" }}>{item.time}</div>
                      </div>
                      <div style={{ fontSize: 11.5, color: C.textDim }}>{item.why}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Quick reply chips */}
              {m.chips && (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {m.chips.map(chip => (
                    <button key={chip} onClick={() => send(chip)} style={{ padding: "6px 12px", borderRadius: 999, background: C.surface, border: `1px solid ${C.border}`, color: C.textDim, fontSize: 12, cursor: "pointer", fontFamily: "DM Sans, sans-serif", fontWeight: 500 }} onMouseEnter={(e) => { e.currentTarget.style.color = C.accent; e.currentTarget.style.borderColor = C.accent; }} onMouseLeave={(e) => { e.currentTarget.style.color = C.textDim; e.currentTarget.style.borderColor = C.border; }}>
                      {chip}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {thinking && (
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: `linear-gradient(135deg, ${C.accent} 0%, ${C.purple} 100%)`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 0 16px ${C.accentGlow}` }}><Bot size={16} color={C.bg} /></div>
            <div style={{ padding: "11px 15px", borderRadius: "14px 14px 14px 4px", background: C.card, border: `1px solid ${C.border}`, display: "flex", gap: 5 }}>
              {[0, 1, 2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: C.accent, animation: `bounce 1.2s ${i * 0.15}s infinite` }} />)}
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div style={{ marginTop: 14, padding: 10, background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, display: "flex", alignItems: "center", gap: 10 }}>
        <button style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", padding: 6 }}><Paperclip size={16} /></button>
        <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send(input)} placeholder="Ask Orion anything about your job search…" style={{ flex: 1, background: "none", border: "none", color: C.text, fontSize: 13.5, outline: "none", fontFamily: "DM Sans, sans-serif" }} />
        <button onClick={() => send(input)} disabled={!input.trim()} style={{ width: 34, height: 34, borderRadius: 9, background: input.trim() ? C.accent : C.surface, border: "none", color: input.trim() ? C.bg : C.muted, cursor: input.trim() ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}>
          <Send size={15} />
        </button>
      </div>
    </div>
  );
}

// ============ INSIDERS ============
function Insiders() {
  return (
    <div>
      <TopBar title="Insider Connections" subtitle="People at your target companies who can open doors" />
      <div style={{ padding: 16, background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, marginBottom: 16, display: "flex", alignItems: "center", gap: 14 }}>
        <Logo letter="G" color="#4285F4" size={44} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, color: C.text, fontWeight: 600 }}>Connections at Google</div>
          <div style={{ fontSize: 12, color: C.textDim, marginTop: 2 }}>Related to your application for Software Engineer, New Grad</div>
        </div>
        <button style={{ padding: "8px 14px", borderRadius: 8, background: C.surface, border: `1px solid ${C.border}`, color: C.text, fontWeight: 600, fontSize: 12, cursor: "pointer" }}>Switch company</button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {INSIDERS.map((p, i) => (
          <div key={i} style={{ padding: 16, background: C.card, border: `1px solid ${C.border}`, borderRadius: 11, display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 48, height: 48, borderRadius: "50%", background: `linear-gradient(135deg, ${p.color} 0%, ${p.color}AA 100%)`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "#fff", fontSize: 14, fontFamily: "Syne, sans-serif", boxShadow: `0 2px 12px ${p.color}40` }}>{p.avatar}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, color: C.text, fontWeight: 600 }}>{p.name}</div>
              <div style={{ fontSize: 12, color: C.textDim, marginTop: 2 }}>{p.role}</div>
              <div style={{ fontSize: 11.5, color: C.accent, marginTop: 4, display: "flex", alignItems: "center", gap: 5 }}><Linkedin size={11} /> {p.connection}</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2, marginRight: 8 }}>
              <div style={{ fontSize: 10, color: C.muted, fontWeight: 600, letterSpacing: "0.05em" }}>RESPONSE LIKELIHOOD</div>
              <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 16, color: p.likelihood >= 70 ? C.green : p.likelihood >= 50 ? C.yellow : C.red }}>{p.likelihood}%</div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button style={{ padding: "8px 12px", borderRadius: 8, background: C.accent, border: "none", color: C.bg, fontWeight: 700, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}><Mail size={12} /> Draft intro</button>
              <button style={{ padding: "8px 10px", borderRadius: 8, background: "transparent", border: `1px solid ${C.border}`, color: C.textDim, cursor: "pointer", display: "flex", alignItems: "center" }}><ExternalLink size={13} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============ ROOT ============
export default function AppShell({ currentUser, token, onLogout }) {
  const [active, setActive] = useState("jobs");
  const [applications, setApplications] = useState(INITIAL_APPS);
  const [openJob, setOpenJob] = useState(null);
  const [tailorTarget, setTailorTarget] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/jobs?limit=100`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      const data = await res.json();
      setJobs(Array.isArray(data) ? data : (data.jobs || []));
    } catch (e) {}
    setLoading(false);
  };

  useEffect(() => { fetchJobs(); }, [token]);

  const addToTracker = (job) => {
    if (applications.find(a => a.company === job.company && a.role === job.title)) return;
    const today = new Date().toLocaleDateString("en-US", { month: "short", day: "2-digit" });
    setApplications([...applications, { id: Date.now(), company: job.company, role: job.title, stage: "Applied", date: today, logo: job.logo, logoColor: job.logoColor, next: "Awaiting response" }]);
  };

  const startTailor = (job) => {
    setTailorTarget(job);
    setOpenJob(null);
    setActive("tailor");
  };

  return (
    <>
      <link rel="stylesheet" href={FONTS_LINK} />
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes bounce { 0%, 100% { transform: translateY(0); opacity: 0.4; } 50% { transform: translateY(-4px); opacity: 1; } }
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-track { background: ${C.bg}; }
        ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: ${C.borderHi}; }
        select option { background: ${C.surface}; color: ${C.text}; }
      `}</style>
      <div style={{ display: "flex", background: C.bg, minHeight: "100vh", color: C.text, fontFamily: "DM Sans, sans-serif" }}>
        <Sidebar active={active} setActive={setActive} applications={applications} jobsCount={jobs.length} currentUser={currentUser} onLogout={onLogout} />
        <main style={{ flex: 1, padding: "24px 32px", maxWidth: 1280, margin: "0 auto", width: "100%" }}>
          {active === "jobs" && <JobMatches jobs={jobs.length ? jobs : JOBS} loading={loading} onRefresh={fetchJobs} onOpenJob={setOpenJob} onAddToTracker={addToTracker} />}
          {active === "tailor" && <ResumeTailor targetJob={tailorTarget} />}
          {active === "tracker" && <Tracker applications={applications} setApplications={setApplications} />}
          {active === "autofill" && <AutoApply />}
          {active === "orion" && <Orion />}
          {active === "insiders" && <Insiders />}
        </main>
        <JobDetail job={openJob} onClose={() => setOpenJob(null)} onTailor={startTailor} onApply={(j) => { addToTracker(j); setOpenJob(null); setActive("tracker"); }} />
      </div>
    </>
  );
}
