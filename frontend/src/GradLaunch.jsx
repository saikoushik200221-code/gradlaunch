import { useState, useEffect, useRef } from "react";
// Since npm install is failing, we use jspdf from CDN in index.html
const jsPDF = window.jspdf ? window.jspdf.jsPDF : null;

const COLORS = {
  bg: "#04060A",
  surface: "#0A0F1A",
  card: "#0E1526",
  border: "#1E2D4A",
  accent: "#00F0FF",
  accentGlow: "rgba(0, 240, 255, 0.15)",
  accentDim: "#00B4D8",
  green: "#00FFA3",
  yellow: "#FFD700",
  red: "#FF4D6A",
  purple: "#C084FC",
  text: "#F0F9FF",
  muted: "#8BA3BC",
  tag: "rgba(22, 32, 48, 0.6)",
};

const FONTS = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap');
  @keyframes pulse {
    0% { transform: scale(1); opacity: 0.8; }
    50% { transform: scale(1.05); opacity: 1; }
    100% { transform: scale(1); opacity: 0.8; }
  }
`;

const SAMPLE_JOBS = [
  { id: 1, title: "Software Engineer I", company: "Google", location: "Mountain View, CA", type: "Full-time", posted: "2 days ago", salary: "$130k–$160k", tags: ["New Grad", "H1B Sponsor", "OPT Friendly"], logo: "G", match: 94, description: "Join Google's core engineering team building next-gen cloud infrastructure. We welcome candidates graduating in 2024–2025.", skills: ["Python", "Java", "Distributed Systems", "Algorithms"] },
  { id: 2, title: "Data Analyst (Entry Level)", company: "Meta", location: "Menlo Park, CA (Hybrid)", type: "Full-time", posted: "1 day ago", salary: "$110k–$140k", tags: ["New Grad", "H1B Sponsor", "Remote Friendly"], logo: "M", match: 89, description: "Analyze petabyte-scale data to drive product decisions for 3B+ users. No prior industry experience required.", skills: ["SQL", "Python", "Tableau", "Statistics"] },
  { id: 3, title: "Frontend Developer", company: "Airbnb", location: "San Francisco, CA", type: "Full-time", posted: "3 days ago", salary: "$120k–$150k", tags: ["New Grad", "OPT Friendly"], logo: "A", match: 86, description: "Build beautiful, accessible UI for millions of travelers worldwide. Perfect for recent CS graduates.", skills: ["React", "TypeScript", "CSS", "Node.js"] },
  { id: 4, title: "Machine Learning Engineer", company: "OpenAI", location: "San Francisco, CA", type: "Full-time", posted: "5 hours ago", salary: "$150k–$200k", tags: ["H1B Sponsor", "New Grad"], logo: "O", match: 78, description: "Work on cutting-edge LLM training pipelines. We value fresh perspectives from top academic programs.", skills: ["PyTorch", "Python", "Math", "LLMs"] },
  { id: 5, title: "Product Manager (New Grad)", company: "Microsoft", location: "Redmond, WA", type: "Full-time", posted: "1 week ago", salary: "$100k–$130k", tags: ["New Grad", "H1B Sponsor", "International Friendly"], logo: "MS", match: 81, description: "Microsoft's APM program designed specifically for recent graduates. Rotational program across product teams.", skills: ["Product Thinking", "Analytics", "Communication", "Excel"] },
  { id: 6, title: "DevOps Engineer", company: "Stripe", location: "New York, NY (Remote)", type: "Full-time", posted: "4 days ago", salary: "$125k–$155k", tags: ["Remote", "OPT Friendly", "H1B Sponsor"], logo: "S", match: 83, description: "Build and maintain CI/CD pipelines at one of the world's leading fintech companies.", skills: ["Kubernetes", "AWS", "Terraform", "Go"] },
  { id: 7, title: "UX Designer (Early Career)", company: "Figma", location: "San Francisco, CA", type: "Full-time", posted: "6 days ago", salary: "$90k–$120k", tags: ["New Grad", "Fresher Friendly"], logo: "F", match: 72, description: "Craft intuitive design experiences. We love seeing portfolios from design school grads.", skills: ["Figma", "User Research", "Prototyping", "Design Systems"] },
  { id: 8, title: "Cybersecurity Analyst", company: "CrowdStrike", location: "Austin, TX (Hybrid)", type: "Full-time", posted: "2 days ago", salary: "$85k–$115k", tags: ["New Grad", "H1B Sponsor", "Security Clearance OK"], logo: "CS", match: 68, description: "Protect enterprise clients from sophisticated threats. Recent grads from CS/InfoSec programs encouraged to apply.", skills: ["SIEM", "Python", "Incident Response", "Network Security"] },
];

const TRACKER_STAGES = ["Wishlist", "Applied", "Phone Screen", "Interview", "Offer 🎉", "Rejected"];
const STAGE_COLORS = { "Wishlist": "#6B8099", "Applied": "#00D4FF", "Phone Screen": "#A78BFA", "Interview": "#FFD700", "Offer 🎉": "#00E599", "Rejected": "#FF4D6A" };

const INITIAL_APPLICATIONS = [
  { id: 1, company: "Google", role: "Software Engineer I", stage: "Interview", date: "Feb 28", logo: "G", notes: "Focus on distributed systems and algorithms.", history: [{ date: "Feb 25", stage: "Applied" }, { date: "Feb 27", stage: "Phone Screen" }, { date: "Feb 28", stage: "Interview" }] },
  { id: 2, company: "Meta", role: "Data Analyst", stage: "Applied", date: "Mar 1", logo: "M", notes: "", history: [{ date: "Mar 1", stage: "Applied" }] },
  { id: 3, company: "Airbnb", role: "Frontend Developer", stage: "Phone Screen", date: "Feb 25", logo: "A", notes: "Brush up on React Server Components.", history: [{ date: "Feb 20", stage: "Applied" }, { date: "Feb 25", stage: "Phone Screen" }] },
  { id: 4, company: "Netflix", role: "Backend Engineer", stage: "Rejected", date: "Mar 2", logo: "N", notes: "", history: [{ date: "Feb 15", stage: "Applied" }, { date: "Mar 2", stage: "Rejected" }], rejectionAnalysis: "### 🕵️ Rejection Decoder Analysis\n\n**The Hidden Reason**: High competition. Your React skills are strong, but they prioritized candidates with more AWS experience.\n\n**Next Steps**: Complete an AWS certification to stand out." },
  { id: 5, company: "Stripe", role: "DevOps Engineer", stage: "Offer 🎉", date: "Feb 20", logo: "S", notes: "Negotiating base salary.", history: [{ date: "Feb 5", stage: "Applied" }, { date: "Feb 10", stage: "Phone Screen" }, { date: "Feb 15", stage: "Interview" }, { date: "Feb 20", stage: "Offer 🎉" }] },
];

const LOGO_COLORS = { G: "#4285F4", M: "#1877F2", A: "#FF5A5F", O: "#10A37F", MS: "#00A4EF", S: "#635BFF", F: "#FF7262", CS: "#E01E5A", N: "#E50914" };

function TagBadge({ label }) {
  const colors = {
    "New Grad": { bg: "#0D2A1F", color: "#00E599", border: "#00E59933" },
    "H1B Sponsor": { bg: "#1A1A2E", color: "#A78BFA", border: "#A78BFA33" },
    "OPT Friendly": { bg: "#1A2A0D", color: "#7CDB8E", border: "#7CDB8E33" },
    "International Friendly": { bg: "#1A2030", color: "#00D4FF", border: "#00D4FF33" },
    "Remote Friendly": { bg: "#0D1A2A", color: "#60B8E0", border: "#60B8E033" },
    "Fresher Friendly": { bg: "#2A1A0D", color: "#FFD700", border: "#FFD70033" },
    "Remote": { bg: "#0D1A2A", color: "#60B8E0", border: "#60B8E033" },
    "Security Clearance OK": { bg: "#1A0D0D", color: "#FF9966", border: "#FF996633" },
  };
  const c = colors[label] || { bg: COLORS.tag, color: COLORS.accent, border: COLORS.accentGlow };
  return (
    <span style={{
      background: c.bg,
      color: c.color,
      border: `1px solid ${c.border}`,
      padding: "4px 10px",
      borderRadius: "8px",
      fontSize: "11px",
      fontWeight: "600",
      fontFamily: "'DM Sans', sans-serif",
      letterSpacing: "0.2px",
      backdropFilter: "blur(4px)",
      boxShadow: `0 2px 4px rgba(0,0,0,0.1)`
    }}>
      {label}
    </span>
  );
}

function LogoCircle({ letter, size = 40 }) {
  const bg = LOGO_COLORS[letter] || "#334155";
  return (
    <div style={{ width: size, height: size, borderRadius: size * 0.25, background: bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: size * 0.38, color: "#fff", flexShrink: 0 }}>
      {letter}
    </div>
  );
}

function MatchRing({ score }) {
  const color = score >= 90 ? COLORS.green : score >= 75 ? COLORS.accent : COLORS.yellow;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
      <div style={{ width: 48, height: 48, borderRadius: "50%", background: `conic-gradient(${color} ${score * 3.6}deg, #1E2D40 0deg)`, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
        <div style={{ width: 36, height: 36, borderRadius: "50%", background: COLORS.card, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color, fontFamily: "'Syne', sans-serif" }}>
          {score}%
        </div>
      </div>
      <span style={{ fontSize: 10, color: COLORS.muted, fontFamily: "'DM Sans', sans-serif" }}>Match</span>
    </div>
  );
}

// ─── SEMANTIC MATCHING ENGINE (Pure JS TF-IDF) ───────────────────────────────
// This runs entirely in the browser with no external API calls needed.
// It converts text into a bag-of-words TF vector and computes cosine similarity.
const STOP_WORDS = new Set(['a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been', 'has', 'have', 'had', 'will', 'would', 'could', 'should', 'may', 'might', 'do', 'does', 'did', 'not', 'this', 'that', 'these', 'those', 'i', 'my', 'your', 'we', 'our', 'it', 'its', 'as', 'if', 'so', 'then', 'than', 'can', 'get', 'us']);

function tokenize(text) {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length > 2 && !STOP_WORDS.has(w));
}

function buildTFVector(tokens, vocab) {
  const freq = {};
  for (const t of tokens) freq[t] = (freq[t] || 0) + 1;
  return vocab.map(w => freq[w] || 0);
}

function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length === 0) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function computeSemanticScores(profileText, jobs) {
  if (!profileText || !jobs?.length) return jobs;
  const profileTokens = tokenize(profileText);
  // Build shared vocabulary from profile + all jobs
  const allTokens = new Set(profileTokens);
  jobs.forEach(j => tokenize(`${j.title} ${j.company} ${j.skills?.join(' ')} ${j.description}`).forEach(t => allTokens.add(t)));
  const vocab = Array.from(allTokens);
  const profileVec = buildTFVector(profileTokens, vocab);
  return jobs.map(j => {
    const jobTokens = tokenize(`${j.title} ${j.company} ${j.skills?.join(' ')} ${j.description}`);
    const jobVec = buildTFVector(jobTokens, vocab);
    const sim = cosineSimilarity(profileVec, jobVec);
    // Scale from raw cosine (typically 0.05–0.4 range) to a visible 0-100 display: treat 0.35+ as 99%
    const percent = Math.max(0, Math.min(99, Math.round((sim / 0.35) * 99)));
    return { ...j, match: percent };
  }).sort((a, b) => b.match - a.match);
}


// ─── JOB SEARCH TAB ──────────────────────────────────────────────────────────
function JobSearch({ onAddToTracker, profileText }) {
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ newGrad: false, h1b: false, opt: false, remote: false, onsite: false, fresher: false });
  const [selectedJob, setSelectedJob] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);

  // Real Job Data Fetching
  const [jobs, setJobs] = useState(SAMPLE_JOBS);
  const [loadingJobs, setLoadingJobs] = useState(false);

  useEffect(() => {
    async function fetchJobs() {
      setLoadingJobs(true);
      try {
        const res = await fetch("${import.meta.env.VITE_API_URL || "http://localhost:3001"}/api/jobs");
        if (res.ok) {
          const data = await res.json();
          if (data && data.length > 0) setJobs(data);
        }
      } catch (e) {
        console.warn("Could not connect to local backend, using mock jobs.", e);
      }
      setLoadingJobs(false);
    }
    fetchJobs();
  }, []);

  useEffect(() => {
    setAnalysis(null);
  }, [selectedJob?.id]);

  async function analyzeFit() {
    setAnalyzing(true);
    try {
      const res = await fetch("${import.meta.env.VITE_API_URL || "http://localhost:3001"}/api/anthropic/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 500,
          system: "You are Orion, an expert technical recruiter AI. Analyze the fit between the candidate and the job. Be concise. Format as: SCORE: <number 0-100>\nREASONS:\n- <reason 1>\n- <reason 2>\n- <reason 3>",
          messages: [{
            role: "user",
            content: `Candidate Profile: New Grad, UIUC CS, Skills: Python, Java, React, SQL, Docker. Target: Software Engineer.\nJob Title: ${selectedJob.title}\nJob Company: ${selectedJob.company}\nJob Description: ${selectedJob.description}\nJob Required Skills: ${selectedJob.skills.join(", ")}`
          }]
        })
      });
      const data = await res.json();
      const text = data.content?.[0]?.text || "";
      const scoreMatch = text.match(/SCORE:\s*(\d+)/);
      const reasonsMatch = text.match(/REASONS:([^]+)/i);
      setAnalysis({
        score: scoreMatch ? parseInt(scoreMatch[1]) : selectedJob.match,
        reasons: reasonsMatch ? reasonsMatch[1].trim().split("\n").map(r => r.replace(/^[-*]\s*/, "").trim()).filter(Boolean) : ["Good overall background", "Some skills match"]
      });
    } catch (e) {
      console.error(e);
      setAnalysis({ score: selectedJob.match, reasons: ["Could not connect to AI.", "Showing default basic assessment."] });
    }
    setAnalyzing(false);
  }

  const filtered = jobs.filter(j => {
    const q = search.toLowerCase();
    const matchSearch = !q || j.title.toLowerCase().includes(q) || j.company.toLowerCase().includes(q) || j.skills.some(s => s.toLowerCase().includes(q));
    const matchNG = !filters.newGrad || j.tags.includes("New Grad");
    const matchH1 = !filters.h1b || j.tags.includes("H1B Sponsor");
    const matchOPT = !filters.opt || j.tags.includes("OPT Friendly");
    const matchR = !filters.remote || j.tags.some(t => t.includes("Remote"));
    const matchOnsite = !filters.onsite || !j.tags.some(t => t.includes("Remote"));
    const matchF = !filters.fresher || j.tags.includes("Fresher Friendly");
    return matchSearch && matchNG && matchH1 && matchOPT && matchR && matchOnsite && matchF;
  });

  // Apply true semantic scoring if the user has set up a Deep Profile
  const scored = profileText
    ? computeSemanticScores(profileText, filtered)
    : filtered;

  return (
    <div style={{ display: "flex", gap: 20, height: "100%" }}>
      {/* Left panel */}
      <div style={{ flex: "0 0 340px", display: "flex", flexDirection: "column", gap: 12 }}>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="🔍  Search jobs, skills, companies..."
          style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: "12px 16px", color: COLORS.text, fontFamily: "'DM Sans', sans-serif", fontSize: 14, outline: "none", width: "100%", boxSizing: "border-box" }}
        />
        {/* Filters */}
        <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: 16 }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 13, color: COLORS.muted, marginBottom: 12, letterSpacing: 1, textTransform: "uppercase" }}>Filter For You</div>
          {[
            ["newGrad", "🎓 New Grad Friendly"],
            ["h1b", "🌐 H1B Sponsorship"],
            ["opt", "📋 OPT Friendly"],
            ["remote", "🏠 Remote Available"],
            ["onsite", "🏢 Onsite / Office"],
            ["fresher", "✨ Fresher Friendly"],
          ].map(([key, label]) => (
            <label key={key} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: filters[key] ? COLORS.accent : COLORS.text }}>
              <div onClick={() => setFilters(f => ({ ...f, [key]: !f[key] }))} style={{ width: 18, height: 18, borderRadius: 5, border: `2px solid ${filters[key] ? COLORS.accent : COLORS.border}`, background: filters[key] ? COLORS.accentGlow : "transparent", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s", flexShrink: 0 }}>
                {filters[key] && <span style={{ color: COLORS.accent, fontSize: 12 }}>✓</span>}
              </div>
              {label}
            </label>
          ))}
        </div>
        <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: COLORS.muted, paddingLeft: 4, display: "flex", justifyContent: "space-between" }}>
          <span>{filtered.length} jobs found</span>
          {loadingJobs && <span style={{ color: COLORS.accent }}>↻ Scraping Real Jobs...</span>}
        </div>
        {/* Job list */}
        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10, paddingRight: 4 }}>
          {scored.map(job => (
            <div key={job.id} onClick={() => setSelectedJob(job)}
              className="card-hover"
              style={{
                background: selectedJob?.id === job.id ? `linear-gradient(135deg, #0F253A, #0A1828)` : "rgba(16, 24, 40, 0.6)",
                border: `1px solid ${selectedJob?.id === job.id ? COLORS.accent : "rgba(255,255,255,0.08)"}`,
                borderRadius: 16,
                padding: 16,
                cursor: "pointer",
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                boxShadow: selectedJob?.id === job.id ? `0 0 25px ${COLORS.accent}22` : "0 4px 12px rgba(0,0,0,0.2)",
                backdropFilter: "blur(12px)"
              }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <LogoCircle letter={job.logo} size={40} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "15px", color: COLORS.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", flex: 1 }}>{job.title}</div>
                    <div style={{ fontSize: "14px", fontWeight: 800, color: job.match >= 90 ? COLORS.green : job.match >= 75 ? COLORS.accent : COLORS.yellow, fontFamily: "'Syne', sans-serif", flexShrink: 0, marginLeft: 8 }}>{job.match}%</div>
                  </div>
                  <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "13px", color: COLORS.muted }}>{job.company}</div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                    <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "12px", color: COLORS.muted }}>{job.location}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      {(Date.now() - job.postedValue < 3600000) && (
                        <span style={{
                          background: "rgba(0, 255, 163, 0.15)",
                          color: COLORS.green,
                          fontSize: "9px",
                          fontWeight: "800",
                          padding: "2px 6px",
                          borderRadius: "4px",
                          border: `1px solid ${COLORS.green}44`,
                          animation: "pulse 2s infinite ease-in-out",
                          textTransform: "uppercase"
                        }}>🔥 NEW</span>
                      )}
                      <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "11px", color: COLORS.accent, fontWeight: 600 }}>{job.posted}</div>
                    </div>
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
                {job.tags.slice(0, 2).map(t => <TagBadge key={t} label={t} />)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel - Job Detail */}
      <div style={{ flex: 1, background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 18, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {selectedJob ? (
          <>
            <div style={{ padding: "28px 32px", borderBottom: `1px solid ${COLORS.border}`, background: `linear-gradient(135deg, #0C1824 0%, #080C14 100%)` }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 16 }}>
                <LogoCircle letter={selectedJob.logo} size={56} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 22, color: COLORS.text, margin: 0 }}>{selectedJob.title}</h2>
                    <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: COLORS.accent, fontWeight: 700, background: `${COLORS.accent}15`, padding: "4px 12px", borderRadius: 20 }}>{selectedJob.posted}</span>
                  </div>
                  <div style={{ fontFamily: "'DM Sans', sans-serif", color: COLORS.muted, marginTop: 4 }}>{selectedJob.company} · {selectedJob.location} · {selectedJob.type}</div>
                  <div style={{ fontFamily: "'DM Sans', sans-serif", color: COLORS.green, fontWeight: 600, marginTop: 4 }}>{selectedJob.salary}</div>
                </div>
                <MatchRing score={analysis ? analysis.score : selectedJob.match} />
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {selectedJob.tags.map(t => <TagBadge key={t} label={t} />)}
              </div>
            </div>
            <div style={{ padding: "24px 32px", flex: 1, overflowY: "auto" }}>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 14, color: COLORS.muted, letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 }}>About This Role</div>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: COLORS.text, lineHeight: 1.7, marginBottom: 24 }}>{selectedJob.description}</p>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 14, color: COLORS.muted, letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 }}>Required Skills</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 24 }}>
                {selectedJob.skills.map(s => (
                  <span key={s} style={{ background: COLORS.tag, border: `1px solid ${COLORS.border}`, color: COLORS.text, padding: "6px 14px", borderRadius: 20, fontFamily: "'DM Sans', sans-serif", fontSize: 13 }}>{s}</span>
                ))}
              </div>

              {/* AI Analysis Section */}
              <div style={{ background: `linear-gradient(135deg, ${COLORS.accent}11, ${COLORS.purple}11)`, border: `1px solid ${COLORS.accent}33`, borderRadius: 14, padding: 20, marginBottom: 32 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                  <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 16, color: COLORS.text, display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 20 }}>🤖</span> Orion AI Fit Analysis
                  </div>
                  {!analysis && (
                    <button onClick={analyzeFit} disabled={analyzing} style={{ background: analyzing ? "transparent" : COLORS.accent, border: analyzing ? `1px solid ${COLORS.accent}` : "none", color: analyzing ? COLORS.accent : "#000", padding: "6px 16px", borderRadius: 20, fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 13, cursor: analyzing ? "wait" : "pointer", transition: "all 0.2s" }}>
                      {analyzing ? "Analyzing..." : "Analyze My Fit"}
                    </button>
                  )}
                </div>
                {analysis ? (
                  <ul style={{ margin: 0, padding: "0 0 0 20px", fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: COLORS.text, lineHeight: 1.6 }}>
                    {analysis.reasons.map((r, i) => <li key={i} style={{ marginBottom: 6 }}>{r}</li>)}
                  </ul>
                ) : (
                  <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: COLORS.muted, lineHeight: 1.5 }}>
                    Click analyze to see how your profile matches this role's requirements, identifying your key strengths and missing skills.
                  </div>
                )}
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <button onClick={() => onAddToTracker(selectedJob)} style={{ flex: 1, background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.accentDim})`, border: "none", borderRadius: 12, padding: "14px 0", color: "#000", fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 14, cursor: "pointer", letterSpacing: "0.5px" }}>
                  ⚡ Apply Now
                </button>
                <button onClick={() => onAddToTracker({ ...selectedJob, wishlist: true })} style={{ flex: 1, background: "transparent", border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: "14px 0", color: COLORS.text, fontFamily: "'Syne', sans-serif", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>
                  + Save to Wishlist
                </button>
              </div>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: COLORS.muted }}>
            <div style={{ fontSize: 64, marginBottom: 16, opacity: 0.3 }}>🎯</div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 18, color: COLORS.muted }}>Select a job to view details</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── RESUME TAILOR TAB ───────────────────────────────────────────────────────
function ResumeTailor({ initialJobDesc, jobUrl, globalContext }) {
  const [resume, setResume] = useState("");
  const [jobDesc, setJobDesc] = useState(`We are looking for a Software Engineer I...`);
  const [tailored, setTailored] = useState("");
  const [loading, setLoading] = useState(false);
  const [atsScore, setAtsScore] = useState(null);
  const [keywords, setKeywords] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (initialJobDesc) setJobDesc(initialJobDesc);
  }, [initialJobDesc]);

  async function tailorResume() {
    if (!globalContext) {
      setError("Please go to the Profile tab and click 'Analyze & Save Deep Profile' first!");
      return;
    }
    setLoading(true);
    setError("");
    setTailored("");
    setAtsScore(null);
    setKeywords([]);
    try {
      const res = await fetch("${import.meta.env.VITE_API_URL || "http://localhost:3001"}/api/anthropic/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 4000,
          messages: [{
            role: "user",
            content: `You are an elite professional resume writer. Your goal is to produce a FULL, COMPLETE, SUBMISSION-READY RESUME. Do NOT provide a summary or excerpts. Provide every single line from the header to the final section.
            
CORE INSTRUCTIONS:
1. FULL REWRITE: Rewrite the ENTIRE resume based on the CANDIDATE'S DEEP CONTEXT PROFILE. Every section (Summary, Experience, Projects, Skills, Education) must be fully developed and tailored to the JOB DESCRIPTION.
2. USE REAL DATA from CANDIDATE'S DEEP CONTEXT PROFILE as the sole source of truth.
3. STRUCTURE & PARSING (CRITICAL):
   - Line 1: [Full Name]
   - Line 2: [Location | Email | Phone | LinkedIn]
   - Each major section MUST start with "# " (e.g., # PROFESSIONAL SUMMARY, # WORK EXPERIENCE, # TECHNICAL PROJECTS, # EDUCATION, # SKILLS).
4. CONTENT: Use high-impact action verbs and quantifiable metrics. Inject specific keywords from the JOB DESCRIPTION naturally.

Format your response exactly as:
TAILORED_RESUME:
[The COMPLETE revised resume here]

ATS_SCORE: [A realistic number 0-100]

KEYWORDS: [The 8-10 key JD terms you integrated, separated by commas]

CANDIDATE'S DEEP CONTEXT PROFILE:
${globalContext}

JOB DESCRIPTION:
${jobDesc}`
          }]
        })
      });
      const data = await res.json();
      const text = data.content?.[0]?.text || "";
      const resumeMatch = text.match(/TAILORED_RESUME:\s*([\s\S]*?)(?=ATS_SCORE:|$)/);
      const scoreMatch = text.match(/ATS_SCORE:\s*(\d+)/);
      const kwMatch = text.match(/KEYWORDS:\s*(.+)/);
      setTailored(resumeMatch ? resumeMatch[1].trim() : text);
      if (scoreMatch) setAtsScore(parseInt(scoreMatch[1]));
      if (kwMatch) setKeywords(kwMatch[1].split(",").map(k => k.trim()));
    } catch (e) {
      setError("Failed to tailor resume: " + e.message);
    }
    setLoading(false);
  }

  function downloadAsPDF() {
    if (!tailored || !jsPDF) return;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);
    const lines = tailored.split("\n");
    let y = margin;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);

    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      if (!trimmedLine && index !== 0) { y += 3; return; }
      if (y > pageHeight - margin) { doc.addPage(); y = margin; }

      if (index === 0) {
        doc.text(trimmedLine, pageWidth / 2, y, { align: "center" });
        y += 8;
        doc.setFontSize(10); doc.setFont("helvetica", "normal");
        return;
      }
      if (index === 1) {
        doc.text(trimmedLine, pageWidth / 2, y, { align: "center" });
        y += 10;
        doc.setDrawColor(200); doc.line(margin, y - 5, pageWidth - margin, y - 5);
        return;
      }
      if (trimmedLine.startsWith("# ")) {
        const sectionName = trimmedLine.replace("# ", "").toUpperCase();
        y += 5;
        doc.setFont("helvetica", "bold"); doc.setFontSize(12);
        doc.text(sectionName, margin, y);
        doc.setDrawColor(0); doc.setLineWidth(0.3); doc.line(margin, y + 1.5, pageWidth - margin, y + 1.5);
        y += 8;
        doc.setFont("helvetica", "normal"); doc.setFontSize(10);
        return;
      }
      if (trimmedLine.startsWith("- ") || trimmedLine.startsWith("• ")) {
        const bulletText = trimmedLine.substring(2);
        const splitBullet = doc.splitTextToSize(bulletText, contentWidth - 5);
        splitBullet.forEach((bLine, bIdx) => {
          if (y > pageHeight - margin) { doc.addPage(); y = margin; }
          doc.text((bIdx === 0 ? "• " : "  ") + bLine, margin + 2, y);
          y += 5;
        });
        return;
      }
      const splitText = doc.splitTextToSize(trimmedLine, contentWidth);
      splitText.forEach(tLine => {
        if (y > pageHeight - margin) { doc.addPage(); y = margin; }
        doc.text(tLine, margin, y);
        y += 5;
      });
    });
    const candidateName = lines[0].trim().replace(/\s+/g, "_") || "Tailored";
    doc.save(`${candidateName}_Resume_Orion.pdf`);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, height: "100%" }}>
      {atsScore !== null && (
        <div style={{ display: "flex", gap: 12, flexShrink: 0 }}>
          <div style={{ flex: 1, background: COLORS.surface, border: `1px solid ${COLORS.green}33`, borderRadius: 14, padding: "16px 20px", display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ fontSize: 36, fontFamily: "'Syne', sans-serif", fontWeight: 800, color: COLORS.green }}>{atsScore}</div>
            <div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, color: COLORS.text }}>ATS Score</div>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: COLORS.muted }}>{atsScore >= 80 ? "Excellent!" : "Needs Work"}</div>
            </div>
          </div>
          <div style={{ flex: 2, background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: "16px 20px" }}>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 13, color: COLORS.muted, marginBottom: 8, textTransform: "uppercase" }}>Keywords Added</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {keywords.map(k => <span key={k} style={{ background: `${COLORS.accent}15`, border: `1px solid ${COLORS.accent}44`, color: COLORS.accent, padding: "3px 10px", borderRadius: 20, fontSize: 12 }}>{k}</span>)}
            </div>
          </div>
        </div>
      )}
      <div style={{ display: "flex", gap: 16, flex: 1, minHeight: 0 }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12, minHeight: 0 }}>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 13, color: COLORS.muted, textTransform: "uppercase", marginBottom: 8 }}>📄 Your Background</div>
            {globalContext ? (
              <div style={{ flex: 1, background: `${COLORS.accent}11`, border: `1px solid ${COLORS.accent}44`, borderRadius: 14, padding: 16, overflowY: "auto" }}>
                <div style={{ color: COLORS.accent, fontWeight: 700, marginBottom: 8 }}>🤖 Syncing Deep Profile...</div>
                <div style={{ color: COLORS.muted, fontSize: 13 }}>Orion will use your career history to tailor this resume.</div>
              </div>
            ) : (
              <textarea value={resume} onChange={e => setResume(e.target.value)} style={{ flex: 1, background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: 16, color: COLORS.text, fontSize: 13, resize: "none" }} />
            )}
          </div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 13, color: COLORS.muted }}>📋 Job Description</div>
              {jobUrl && <a href={jobUrl} target="_blank" style={{ color: COLORS.accent, fontSize: 12 }}>🔗 Link ↗</a>}
            </div>
            <textarea value={jobDesc} onChange={e => setJobDesc(e.target.value)} style={{ flex: 1, background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: 16, color: COLORS.text, fontSize: 13, resize: "none" }} />
          </div>
          <button onClick={tailorResume} disabled={loading} style={{ background: loading ? COLORS.surface : `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.accentDim})`, border: "none", borderRadius: 12, padding: "15px 0", color: "#000", fontWeight: 800, cursor: "pointer" }}>
            {loading ? "⚙️ Tailoring..." : "✨ Tailor Resume"}
          </button>
          {error && <div style={{ color: COLORS.red, fontSize: 12 }}>{error}</div>}
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 13, color: COLORS.muted, textTransform: "uppercase", marginBottom: 8 }}>🚀 Output</div>
          <div style={{ flex: 1, background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: 16, overflowY: "auto", position: "relative" }}>
            {tailored ? <pre style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: COLORS.text, whiteSpace: "pre-wrap", margin: 0 }}>{tailored}</pre> : <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: COLORS.muted }}>Results appear here.</div>}
          </div>
          {tailored && (
            <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
              <button onClick={() => navigator.clipboard.writeText(tailored)} style={{ flex: 1, background: "transparent", border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "10px", color: COLORS.text }}>📋 Copy</button>
              <button onClick={downloadAsPDF} style={{ flex: 1, background: COLORS.green, border: "none", borderRadius: 8, padding: "10px", color: "#fff", fontWeight: 700 }}>📄 Download PDF</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


// ─── APPLICATION TRACKER TAB ─────────────────────────────────────────────────
function AppDetailModal({ app, onClose, onUpdate }) {
  const [analysisText, setAnalysisText] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [portalForm, setPortalForm] = useState({ url: app.portalUrl || "", email: app.portalEmail || "", password: "" });

  async function decodeRejection() {
    if (!analysisText.trim()) return;
    setAnalyzing(true);
    try {
      const res = await fetch("${import.meta.env.VITE_API_URL || "http://localhost:3001"}/api/anthropic/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 500,
          messages: [{ role: "user", content: `Analyze this rejection email for the role of ${app.role} at ${app.company}. Provide hidden reasons and growth tips.\n\nREJECTION EMAIL:\n${analysisText}` }]
        })
      });
      const data = await res.json();
      const text = data.content?.[0]?.text || "";
      onUpdate(app.id, { rejectionAnalysis: text });
    } catch (e) {
      console.error(e);
    }
    setAnalyzing(false);
  }

  async function syncPortal() {
    if (!portalForm.url || !portalForm.email || !portalForm.password) return;
    setSyncing(true);
    try {
      const res = await fetch("${import.meta.env.VITE_API_URL || "http://localhost:3001"}/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ portalUrl: portalForm.url, email: portalForm.email, password: portalForm.password })
      });
      const data = await res.json();
      if (data.status) {
        const date = new Date().toLocaleDateString("en", { month: "short", day: "numeric" });
        const history = [...(app.history || []), { date: `Live Sync (${date})`, stage: data.status }];
        onUpdate(app.id, {
          stage: data.status,
          history,
          portalUrl: portalForm.url,
          portalEmail: portalForm.email,
          autoUpdated: true,
          notes: (app.notes || "") + `\n[Live Sync] ${data.message}`
        });
      }
    } catch (e) {
      console.error(e);
    }
    setSyncing(false);
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
      <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 24, width: "100%", maxWidth: 650, maxHeight: "90vh", overflowY: "auto", position: "relative", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)" }}>
        <button onClick={onClose} style={{ position: "absolute", top: 20, right: 20, background: "rgba(255,255,255,0.05)", border: "none", color: COLORS.muted, fontSize: 18, cursor: "pointer", width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>

        <div style={{ padding: 32 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
            <LogoCircle letter={app.logo} size={56} />
            <div>
              <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 24, margin: 0 }}>{app.company}</h2>
              <div style={{ fontFamily: "'DM Sans', sans-serif", color: COLORS.muted, fontSize: 16 }}>{app.role}</div>
            </div>
            <div style={{ marginLeft: "auto", background: `${STAGE_COLORS[app.stage]}15`, color: STAGE_COLORS[app.stage], padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 700, border: `1px solid ${STAGE_COLORS[app.stage]}33` }}>{app.stage}</div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
            <div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 13, color: COLORS.muted, letterSpacing: 1, textTransform: "uppercase", marginBottom: 12 }}>📈 Status Timeline</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {app.history?.map((h, i) => (
                  <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: STAGE_COLORS[h.stage], marginTop: 4, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{h.stage}</div>
                      <div style={{ fontSize: 11, color: COLORS.muted }}>{h.date}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 24 }}>
                <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 13, color: COLORS.muted, letterSpacing: 1, textTransform: "uppercase", marginBottom: 12 }}>📝 Notes</div>
                <textarea
                  value={app.notes || ""}
                  onChange={e => onUpdate(app.id, { notes: e.target.value })}
                  placeholder="Add interview notes, recruiter contacts..."
                  style={{ width: "100%", background: "rgba(0,0,0,0.2)", border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 12, color: COLORS.text, fontFamily: "'DM Sans', sans-serif", fontSize: 13, minHeight: 100, resize: "none", outline: "none" }}
                />
              </div>
            </div>

            <div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 13, color: COLORS.muted, letterSpacing: 1, textTransform: "uppercase", marginBottom: 12 }}>🔗 Live Portal Sync</div>
              <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 16 }}>
                <input placeholder="Portal URL (Workday/Greenhouse...)" value={portalForm.url} onChange={e => setPortalForm(f => ({ ...f, url: e.target.value }))}
                  style={{ width: "100%", background: "rgba(0,0,0,0.3)", border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: 10, color: COLORS.text, fontFamily: "'DM Sans', sans-serif", fontSize: 12, marginBottom: 8, outline: "none" }} />
                <input placeholder="Email" value={portalForm.email} onChange={e => setPortalForm(f => ({ ...f, email: e.target.value }))}
                  style={{ width: "100%", background: "rgba(0,0,0,0.3)", border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: 10, color: COLORS.text, fontFamily: "'DM Sans', sans-serif", fontSize: 12, marginBottom: 8, outline: "none" }} />
                <input type="password" placeholder="Password" value={portalForm.password} onChange={e => setPortalForm(f => ({ ...f, password: e.target.value }))}
                  style={{ width: "100%", background: "rgba(0,0,0,0.3)", border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: 10, color: COLORS.text, fontFamily: "'DM Sans', sans-serif", fontSize: 12, marginBottom: 8, outline: "none" }} />
                <button onClick={syncPortal} disabled={syncing}
                  style={{ width: "100%", background: syncing ? "transparent" : COLORS.accent, border: syncing ? `1px solid ${COLORS.accent}` : "none", color: syncing ? COLORS.accent : "#000", padding: "10px", borderRadius: 8, fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 13, cursor: syncing ? "wait" : "pointer" }}>
                  {syncing ? "⚙️ Syncing Live..." : "✨ Link & Sync Status"}
                </button>
                <div style={{ fontSize: 10, color: COLORS.muted, marginTop: 10, textAlign: "center" }}>🔒 Credentials are used locally only.</div>
              </div>

              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 13, color: COLORS.muted, letterSpacing: 1, textTransform: "uppercase", margin: "24px 0 12px" }}>🕵️ Rejection Decoder (AI)</div>
              {app.rejectionAnalysis ? (
                <div style={{ background: "rgba(0, 240, 255, 0.05)", border: `1px solid ${COLORS.accent}22`, borderRadius: 12, padding: 16, fontSize: 13, lineHeight: 1.6, color: COLORS.text }}>
                  <div style={{ whiteSpace: "pre-wrap" }}>{app.rejectionAnalysis}</div>
                  <button onClick={() => onUpdate(app.id, { rejectionAnalysis: null })} style={{ marginTop: 12, background: "transparent", border: "none", color: COLORS.muted, fontSize: 11, cursor: "pointer", textDecoration: "underline" }}>Clear Analysis</button>
                </div>
              ) : (
                <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 16 }}>
                  <div style={{ fontSize: 12, color: COLORS.muted, marginBottom: 10 }}>Paste the rejection email text below to have Orion AI decode why you were passed over and how to improve.</div>
                  <textarea
                    value={analysisText}
                    onChange={e => setAnalysisText(e.target.value)}
                    placeholder="We regret to inform you..."
                    style={{ width: "100%", background: "rgba(0,0,0,0.3)", border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: 10, color: COLORS.text, fontFamily: "'DM Sans', sans-serif", fontSize: 12, minHeight: 80, resize: "none", outline: "none", marginBottom: 10 }}
                  />
                  <button
                    onClick={decodeRejection}
                    disabled={analyzing || !analysisText.trim()}
                    style={{ width: "100%", background: analyzing ? "transparent" : COLORS.accent, border: analyzing ? `1px solid ${COLORS.accent}` : "none", color: analyzing ? COLORS.accent : "#000", padding: "8px", borderRadius: 8, fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 12, cursor: analyzing ? "wait" : "pointer" }}>
                    {analyzing ? "Decoding..." : "✨ Decode Rejection"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AppTracker({ applications, setApplications }) {
  const [adding, setAdding] = useState(false);
  const [selectedAppId, setSelectedAppId] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [form, setForm] = useState({ company: "", role: "", logo: "?" });

  const selectedApp = applications.find(a => a.id === selectedAppId);

  function updateApp(id, updates) {
    setApplications(apps => apps.map(a => a.id === id ? { ...a, ...updates } : a));
  }

  function moveStage(id, dir) {
    setApplications(apps => apps.map(a => {
      if (a.id !== id) return a;
      const idx = TRACKER_STAGES.indexOf(a.stage);
      const next = TRACKER_STAGES[idx + dir];
      if (!next) return a;
      const history = [...(a.history || []), { date: new Date().toLocaleDateString("en", { month: "short", day: "numeric" }), stage: next }];
      return { ...a, stage: next, history };
    }));
  }

  async function smartSync() {
    const linkedApps = applications.filter(a => a.portalUrl && a.portalEmail);
    if (linkedApps.length === 0) {
      alert("No applications linked! Link a portal in the application details first.");
      return;
    }

    setSyncing(true);
    for (const app of linkedApps) {
      try {
        const res = await fetch("${import.meta.env.VITE_API_URL || "http://localhost:3001"}/api/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ portalUrl: app.portalUrl, email: app.portalEmail, password: "ASK_USER" }) // In a real app, you'd manage sessions better
        });
        // Handle result...
      } catch (e) { }
    }
    setSyncing(false);
  }

  function addApp() {
    if (!form.company || !form.role) return;
    setApplications(apps => [...apps, { ...form, id: Date.now(), stage: "Wishlist", date: new Date().toLocaleDateString("en", { month: "short", day: "numeric" }), logo: form.company[0]?.toUpperCase() || "?" }]);
    setForm({ company: "", role: "", logo: "?" });
    setAdding(false);
  }

  const stats = TRACKER_STAGES.map(s => ({ stage: s, count: applications.filter(a => a.stage === s).length }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, height: "100%" }}>
      {/* Stats row */}
      <div style={{ display: "flex", gap: 10, flexShrink: 0 }}>
        {stats.map(({ stage, count }) => (
          <div key={stage} style={{ flex: 1, background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: "12px 8px", textAlign: "center" }}>
            <div style={{ fontSize: 22, fontFamily: "'Syne', sans-serif", fontWeight: 800, color: STAGE_COLORS[stage] }}>{count}</div>
            <div style={{ fontSize: 10, fontFamily: "'DM Sans', sans-serif", color: COLORS.muted, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{stage}</div>
          </div>
        ))}
      </div>

      {/* Action buttons */}
      <div style={{ flexShrink: 0, display: "flex", gap: 12 }}>
        {!adding ? (
          <>
            <button onClick={() => setAdding(true)} style={{ background: `${COLORS.accent}15`, border: `1px dashed ${COLORS.accent}`, borderRadius: 12, padding: "12px 24px", color: COLORS.accent, fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
              + Track New Application
            </button>
            <button onClick={smartSync} disabled={syncing} style={{ background: "transparent", border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: "12px 24px", color: COLORS.text, fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 13, cursor: syncing ? "wait" : "pointer", opacity: syncing ? 0.6 : 1, display: "flex", alignItems: "center", gap: 8 }}>
              {syncing ? "⚙️ Syncing..." : "✨ Smart Sync Applications"}
            </button>
          </>
        ) : (
          <div style={{ display: "flex", gap: 10, alignItems: "center", background: COLORS.surface, border: `1px solid ${COLORS.accent}44`, borderRadius: 12, padding: "12px 16px", width: "100%" }}>
            <input placeholder="Company" value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))}
              style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "8px 12px", color: COLORS.text, fontFamily: "'DM Sans', sans-serif", fontSize: 14, outline: "none", flex: 1 }} />
            <input placeholder="Role" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
              style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "8px 12px", color: COLORS.text, fontFamily: "'DM Sans', sans-serif", fontSize: 14, outline: "none", flex: 2 }} />
            <button onClick={addApp} style={{ background: COLORS.accent, border: "none", borderRadius: 8, padding: "8px 16px", color: "#000", fontFamily: "'Syne', sans-serif", fontWeight: 700, cursor: "pointer" }}>Add</button>
            <button onClick={() => setAdding(false)} style={{ background: "transparent", border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "8px 14px", color: COLORS.muted, cursor: "pointer" }}>✕</button>
          </div>
        )}
      </div>

      {/* Kanban board */}
      <div style={{ flex: 1, display: "flex", gap: 12, overflowX: "auto", minHeight: 0 }}>
        {TRACKER_STAGES.map(stage => {
          const stageApps = applications.filter(a => a.stage === stage);
          const stageColor = STAGE_COLORS[stage];
          return (
            <div key={stage} style={{ flex: "0 0 200px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 16, display: "flex", flexDirection: "column", overflow: "hidden" }}>
              <div style={{ padding: "14px 16px", borderBottom: `1px solid ${COLORS.border}`, background: `${stageColor}12` }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 13, color: stageColor }}>{stage}</span>
                  <span style={{ background: `${stageColor}22`, color: stageColor, borderRadius: 20, padding: "2px 8px", fontSize: 12, fontWeight: 700 }}>{stageApps.length}</span>
                </div>
              </div>
              <div style={{ flex: 1, overflowY: "auto", padding: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                {stageApps.map(app => {
                  const stageIdx = TRACKER_STAGES.indexOf(app.stage);
                  return (
                    <div key={app.id} onClick={() => setSelectedAppId(app.id)}
                      className="card-hover"
                      style={{ background: COLORS.card, border: app.autoUpdated ? `1px solid ${COLORS.accent}66` : `1px solid ${COLORS.border}`, borderRadius: 12, padding: "12px", cursor: "pointer", position: "relative" }}>
                      {app.autoUpdated && <div style={{ position: "absolute", top: -8, right: 8, background: COLORS.accent, color: "#000", fontSize: 9, fontWeight: 900, padding: "2px 6px", borderRadius: 10, boxShadow: `0 0 10px ${COLORS.accent}44` }}>SYNCED</div>}
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                        <LogoCircle letter={app.logo} size={28} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 12, color: COLORS.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{app.company}</div>
                          <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: COLORS.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{app.role}</div>
                        </div>
                      </div>
                      <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: COLORS.muted, marginBottom: 8 }}>📅 {app.date}</div>
                      <div style={{ display: "flex", gap: 4 }}>
                        {stageIdx > 0 && <button onClick={() => moveStage(app.id, -1)} style={{ flex: 1, background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 6, padding: "4px 0", color: COLORS.muted, fontSize: 12, cursor: "pointer" }}>←</button>}
                        {stageIdx < TRACKER_STAGES.length - 1 && <button onClick={() => moveStage(app.id, 1)} style={{ flex: 1, background: `${stageColor}22`, border: `1px solid ${stageColor}44`, borderRadius: 6, padding: "4px 0", color: stageColor, fontSize: 12, cursor: "pointer", fontWeight: 600 }}>→</button>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {selectedApp && <AppDetailModal app={selectedApp} onClose={() => setSelectedAppId(null)} onUpdate={updateApp} />}
    </div>
  );
}

// ─── PROFILE FIELD HELPERS (defined outside Profile to prevent focus loss) ────
function ProfileField({ label, field, type = "text", profile, setProfile }) {
  return (
    <div>
      <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: COLORS.muted, marginBottom: 6, fontWeight: 600 }}>{label}</div>
      <input type={type} value={profile[field]} onChange={e => setProfile(p => ({ ...p, [field]: e.target.value }))}
        style={{ width: "100%", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "10px 14px", color: COLORS.text, fontFamily: "'DM Sans', sans-serif", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
    </div>
  );
}

function ProfileSelect({ label, field, options, profile, setProfile }) {
  return (
    <div>
      <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: COLORS.muted, marginBottom: 6, fontWeight: 600 }}>{label}</div>
      <select value={profile[field]} onChange={e => setProfile(p => ({ ...p, [field]: e.target.value }))}
        style={{ width: "100%", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "10px 14px", color: COLORS.text, fontFamily: "'DM Sans', sans-serif", fontSize: 14, outline: "none", boxSizing: "border-box", cursor: "pointer" }}>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

// ─── PROFILE TAB ─────────────────────────────────────────────────────────────
function Profile({ globalContext, setGlobalContext, setGlobalVector, onProfileUpdate, currentUser }) {
  const [profile, setProfile] = useState({
    name: currentUser?.name || "", email: currentUser?.email || "",
    university: "", major: "", gradYear: "",
    visaStatus: "F-1/OPT", targetRole: "Software Engineer", targetLocation: "",
    skills: "", linkedin: "", baseResume: ""
  });
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadProfile() {
      const token = localStorage.getItem("token");
      try {
        const res = await fetch("${import.meta.env.VITE_API_URL || "http://localhost:3001"}/api/profile", {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setProfile(data);
          if (data.aiContext) setGlobalContext(data.aiContext);
          if (data.skills) setGlobalVector(`${data.skills} ${data.targetRole} ${data.baseResume} ${data.aiContext || ""}`);
        }
      } catch (e) { console.error("Profile load failed", e); }
    }
    loadProfile();
  }, [setGlobalContext, setGlobalVector]);

  async function saveProfile(updates = {}) {
    setSaving(true);
    setSaved(false);
    setError("");
    const token = localStorage.getItem("token");
    const fullProfile = { ...profile, ...updates };
    try {
      const res = await fetch("${import.meta.env.VITE_API_URL || "http://localhost:3001"}/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify(fullProfile)
      });
      if (res.ok) {
        const data = await res.json();
        setSaved(true);
        if (onProfileUpdate) onProfileUpdate(data.profile);
        setTimeout(() => setSaved(false), 3000);
      } else { setError("Failed to save changes"); }
    } catch (e) { setError("Server connection failed"); }
    setSaving(false);
  }

  async function analyzeAndSave() {
    setAnalyzing(true);
    setSaved(false);
    try {
      const res = await fetch("${import.meta.env.VITE_API_URL || "http://localhost:3001"}/api/anthropic/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1500,
          system: "You are an expert career AI. Analyze the user's raw profile data and base resume. Extract a comprehensive, highly detailed 'Deep Context Profile' that captures all their skills, experiences, projects, metrics, and educational background. Group them logically. Output ONLY the structured context.",
          messages: [{
            role: "user",
            content: `Name: ${profile.name}\nMajor: ${profile.major}\nSkills: ${profile.skills}\nTarget Role: ${profile.targetRole}\n\nBASE RESUME:\n${profile.baseResume}`
          }]
        })
      });
      const data = await res.json();
      const text = data.content?.[0]?.text || "";
      setGlobalContext(text);
      setGlobalVector(`${profile.skills} ${profile.targetRole} ${profile.baseResume} ${text}`);

      // Persist the AI context as well
      await saveProfile({ aiContext: text });
    } catch (e) {
      setError("Analysis failed: " + e.message);
    }
    setAnalyzing(false);
  }

  const inputStyle = { width: "100%", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "10px 14px", color: COLORS.text, fontFamily: "'DM Sans', sans-serif", fontSize: 14, outline: "none", boxSizing: "border-box" };
  const labelStyle = { fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: COLORS.muted, marginBottom: 6, fontWeight: 600 };

  return (
    <div style={{ display: "flex", gap: 24, height: "100%" }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 20, overflowY: "auto" }}>
        {/* Avatar section */}
        <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 18, padding: 24, display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ width: 72, height: 72, borderRadius: "50%", background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.purple})`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 28, color: "#fff", flexShrink: 0 }}>
            {profile.name ? profile.name.split(" ").map(n => n[0]).join("") : "?"}
          </div>
          <div>
            <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 20, color: COLORS.text, margin: "0 0 4px" }}>{profile.name || "Untitled Profile"}</h2>
            <div style={{ fontFamily: "'DM Sans', sans-serif", color: COLORS.muted, fontSize: 14 }}>{profile.major} · {profile.university} · Class of {profile.gradYear}</div>
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button onClick={() => saveProfile()} disabled={saving} style={{ background: "transparent", border: `1px solid ${COLORS.accent}44`, color: COLORS.accent, borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                {saving ? "Saving..." : saved ? "✓ Saved" : "💾 Save Changes"}
              </button>
            </div>
          </div>
        </div>

        {/* Personal Info */}
        <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 18, padding: 24 }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 16, color: COLORS.text, marginBottom: 18 }}>Personal Info</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div><div style={labelStyle}>Full Name</div><input value={profile.name} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} style={inputStyle} /></div>
            <div><div style={labelStyle}>Email Address</div><input type="email" value={profile.email} onChange={e => setProfile(p => ({ ...p, email: e.target.value }))} style={inputStyle} /></div>
            <div><div style={labelStyle}>University</div><input value={profile.university} onChange={e => setProfile(p => ({ ...p, university: e.target.value }))} style={inputStyle} /></div>
            <div><div style={labelStyle}>Major</div><input value={profile.major} onChange={e => setProfile(p => ({ ...p, major: e.target.value }))} style={inputStyle} /></div>
            <div><div style={labelStyle}>Graduation Year</div><input value={profile.gradYear} onChange={e => setProfile(p => ({ ...p, gradYear: e.target.value }))} style={inputStyle} /></div>
            <div><div style={labelStyle}>LinkedIn Profile</div><input value={profile.linkedin} onChange={e => setProfile(p => ({ ...p, linkedin: e.target.value }))} style={inputStyle} /></div>
          </div>
        </div>

        {/* Job Preferences */}
        <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 18, padding: 24 }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 16, color: COLORS.text, marginBottom: 18 }}>Job Preferences</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div>
              <div style={labelStyle}>Visa Status</div>
              <select value={profile.visaStatus} onChange={e => setProfile(p => ({ ...p, visaStatus: e.target.value }))} style={{ ...inputStyle, cursor: "pointer" }}>
                {["F-1/OPT", "H1B", "Green Card", "US Citizen", "Other"].map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <div style={labelStyle}>Target Role</div>
              <select value={profile.targetRole} onChange={e => setProfile(p => ({ ...p, targetRole: e.target.value }))} style={{ ...inputStyle, cursor: "pointer" }}>
                {["Software Engineer", "Data Analyst", "Product Manager", "UX Designer", "Data Scientist", "DevOps Engineer", "Other"].map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div><div style={labelStyle}>Target Location</div><input value={profile.targetLocation} onChange={e => setProfile(p => ({ ...p, targetLocation: e.target.value }))} style={inputStyle} /></div>
            <div />
            <div style={{ gridColumn: "1 / -1" }}>
              <div style={labelStyle}>Key Skills (comma-separated)</div>
              <input value={profile.skills} onChange={e => setProfile(p => ({ ...p, skills: e.target.value }))} style={inputStyle} />
            </div>
          </div>
        </div>

        <div style={{ gridColumn: "1 / -1", marginTop: 12 }}>
          <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: COLORS.muted, marginBottom: 6, fontWeight: 600 }}>📄 Comprehensive Base Resume</div>
          <textarea value={profile.baseResume} onChange={e => setProfile(p => ({ ...p, baseResume: e.target.value }))}
            placeholder="Paste your everything-resume here. Include all projects, courses, and experiences. AI will extract the relevant pieces for each specific job application."
            style={{ width: "100%", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "14px", color: COLORS.text, fontFamily: "'DM Sans', sans-serif", fontSize: 13, outline: "none", boxSizing: "border-box", minHeight: 200, resize: "vertical", lineHeight: 1.6 }} />
        </div>

        {globalContext && (
          <div style={{ background: `linear-gradient(135deg, ${COLORS.accent}11, ${COLORS.purple}11)`, border: `1px solid ${COLORS.accent}44`, borderRadius: 18, padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <span style={{ fontSize: 20 }}>🧠</span>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 16, color: COLORS.text }}>Deep Profile Context Active</div>
            </div>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: COLORS.text, lineHeight: 1.6, whiteSpace: "pre-wrap", maxHeight: 200, overflowY: "auto", padding: 12, background: "rgba(0,0,0,0.3)", borderRadius: 8 }}>
              {globalContext}
            </div>
          </div>
        )}

        {error && <div style={{ color: COLORS.red, fontSize: 13, textAlign: "center" }}>{error}</div>}

        <button onClick={analyzeAndSave} disabled={analyzing} style={{ background: analyzing ? COLORS.surface : `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.accentDim})`, border: analyzing ? `1px solid ${COLORS.border}` : "none", borderRadius: 12, padding: "15px 0", color: analyzing ? COLORS.muted : "#000", fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 15, cursor: analyzing ? "wait" : "pointer", transition: "all 0.3s", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          {analyzing ? (
            <>⚙️ Analyzing Profile Data...</>
          ) : (
            <>🤖 Analyze & Save Deep Profile</>
          )}
        </button>
      </div>

      {/* Right: Tips */}
      <div style={{ flex: "0 0 260px", display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 16, color: COLORS.text }}>🎯 Tips For You</div>
        {[
          { icon: "🌐", title: "International Student?", tip: "Filter jobs by H1B Sponsor to only see companies that will support your visa.", color: COLORS.purple },
          { icon: "📋", title: "OPT Deadline", tip: "Apply 90 days before graduation. Track your STEM OPT extension eligibility.", color: COLORS.accent },
          { icon: "🚀", title: "New Grad Programs", tip: "Companies like Google, Meta, Microsoft have dedicated new grad hiring cycles — apply Oct–Dec.", color: COLORS.green },
          { icon: "✨", title: "ATS Tip", tip: "Use exact keywords from job descriptions. Avoid tables/graphics in your resume PDF.", color: COLORS.yellow },
        ].map(({ icon, title, tip, color }) => (
          <div key={title} style={{ background: COLORS.surface, border: `1px solid ${color}22`, borderRadius: 14, padding: 16, borderLeft: `3px solid ${color}` }}>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 14, color, marginBottom: 6 }}>{icon} {title}</div>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: COLORS.muted, lineHeight: 1.5 }}>{tip}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── AI COPILOT TAB ──────────────────────────────────────────────────────────
function Copilot() {
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hi! I'm Orion, your AI Career Copilot. How can I help you today? I can help you find jobs, tailor your resume, or practice for an interview." }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage() {
    if (!input.trim() || loading) return;

    const userMsg = { role: "user", content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("${import.meta.env.VITE_API_URL || "http://localhost:3001"}/api/anthropic/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: "You are Orion, an expert AI job search copilot. You help students and new grads find jobs, tailor resumes, and prepare for interviews. Be encouraging, concise, and helpful.",
          messages: messages.concat(userMsg).map(m => ({ role: m.role, content: m.content }))
        })
      });
      const data = await res.json();
      const aiText = data.content?.[0]?.text || "I'm sorry, I couldn't process your request right now. Check your API key or connection.";
      setMessages(prev => [...prev, { role: "assistant", content: aiText }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: "assistant", content: "I encountered an error connecting to the AI service. Please try again later." }]);
    }
    setLoading(false);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 18, overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "16px 24px", borderBottom: `1px solid ${COLORS.border}`, background: `linear-gradient(135deg, ${COLORS.surface}, #0A111D)`, display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: "50%", background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.purple})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>🤖</div>
        <div>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 16, color: COLORS.text }}>Orion AI Copilot</div>
          <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: COLORS.green }}>● Online</div>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, padding: 24, overflowY: "auto", display: "flex", flexDirection: "column", gap: 16 }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ alignSelf: msg.role === "user" ? "flex-end" : "flex-start", maxWidth: "80%", display: "flex", gap: 12, flexDirection: msg.role === "user" ? "row-reverse" : "row" }}>
            {msg.role === "assistant" && (
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.purple})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>🤖</div>
            )}
            <div style={{ background: msg.role === "user" ? COLORS.accent : COLORS.card, color: msg.role === "user" ? "#000" : COLORS.text, padding: "12px 16px", borderRadius: 14, borderTopRightRadius: msg.role === "user" ? 4 : 14, borderTopLeftRadius: msg.role === "assistant" ? 4 : 14, border: msg.role === "assistant" ? `1px solid ${COLORS.border}` : "none", fontFamily: "'DM Sans', sans-serif", fontSize: 14, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ alignSelf: "flex-start", display: "flex", gap: 12 }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.purple})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>🤖</div>
            <div style={{ background: COLORS.card, color: COLORS.muted, padding: "12px 16px", borderRadius: 14, borderTopLeftRadius: 4, border: `1px solid ${COLORS.border}`, fontFamily: "'DM Sans', sans-serif", fontSize: 14, display: "flex", alignItems: "center", gap: 6 }}>
              <span className="typing-dot" style={{ width: 6, height: 6, borderRadius: "50%", background: COLORS.accent, animation: "bounce 1.4s infinite ease-in-out both", animationDelay: "-0.32s" }} />
              <span className="typing-dot" style={{ width: 6, height: 6, borderRadius: "50%", background: COLORS.accent, animation: "bounce 1.4s infinite ease-in-out both", animationDelay: "-0.16s" }} />
              <span className="typing-dot" style={{ width: 6, height: 6, borderRadius: "50%", background: COLORS.accent, animation: "bounce 1.4s infinite ease-in-out both", animationDelay: "0s" }} />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div style={{ padding: 16, borderTop: `1px solid ${COLORS.border}`, background: COLORS.card, display: "flex", gap: 12 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), sendMessage())}
          placeholder="Ask Orion to find jobs, review resume, practice interview..."
          style={{ flex: 1, background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 24, padding: "14px 20px", color: COLORS.text, fontFamily: "'DM Sans', sans-serif", fontSize: 14, outline: "none" }}
        />
        <button onClick={sendMessage} disabled={!input.trim() || loading} style={{ width: 48, height: 48, borderRadius: "50%", background: !input.trim() || loading ? COLORS.surface : `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.accentDim})`, border: `1px solid ${COLORS.border}`, color: !input.trim() || loading ? COLORS.muted : "#000", display: "flex", alignItems: "center", justifyContent: "center", cursor: !input.trim() || loading ? "not-allowed" : "pointer", fontSize: 18, transition: "all 0.2s" }}>
          ↑
        </button>
      </div>
    </div>
  );
}

// ─── AUTH SCREEN ─────────────────────────────────────────────────────────────
function AuthScreen({ onLogin }) {
  const [isRegister, setIsRegister] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
    <div style={{ height: "100vh", background: COLORS.bg, position: "relative", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
      {/* Background Glows */}
      <div style={{ position: "absolute", top: "-10%", left: "-10%", width: "50%", height: "50%", background: `radial-gradient(circle, ${COLORS.accent}15 0%, transparent 70%)`, filter: "blur(80px)" }} />
      <div style={{ position: "absolute", bottom: "-10%", right: "-10%", width: "50%", height: "50%", background: `radial-gradient(circle, ${COLORS.accentDim}15 0%, transparent 70%)`, filter: "blur(80px)" }} />

      <div style={{ position: "relative", width: "100%", maxWidth: 440, padding: 40, background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 32, boxShadow: "0 24px 80px rgba(0,0,0,0.5)" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ fontSize: 56, marginBottom: 20 }}>🚀</div>
          <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 32, fontWeight: 800, color: COLORS.text, margin: "0 0 10px 0" }}>
            {isRegister ? "Join GradLaunch" : "Welcome Back"}
          </h1>
          <p style={{ fontFamily: "'DM Sans', sans-serif", color: COLORS.muted, fontSize: 16 }}>
            {isRegister ? "Start your elite career journey today" : "Orion AI is waiting for you"}
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {isRegister && (
            <input
              required
              placeholder="Full Name"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: "16px 20px", color: COLORS.text, fontFamily: "'DM Sans', sans-serif", fontSize: 15, outline: "none" }}
            />
          )}
          <input
            required
            type="email"
            placeholder="Email Address"
            value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })}
            style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: "16px 20px", color: COLORS.text, fontFamily: "'DM Sans', sans-serif", fontSize: 15, outline: "none" }}
          />
          <input
            required
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={e => setForm({ ...form, password: e.target.value })}
            style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: "16px 20px", color: COLORS.text, fontFamily: "'DM Sans', sans-serif", fontSize: 15, outline: "none" }}
          />

          <button
            disabled={loading}
            style={{
              marginTop: 10,
              background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.accentDim})`,
              border: "none",
              borderRadius: 14,
              padding: "18px",
              color: "#000",
              fontFamily: "'Syne', sans-serif",
              fontWeight: 800,
              fontSize: 16,
              cursor: loading ? "wait" : "pointer",
              transition: "transform 0.2s"
            }}
          >
            {loading ? "Verifying..." : isRegister ? "Create Account" : "Sign In"}
          </button>
        </form>

        {error && (
          <div style={{ marginTop: 20, color: COLORS.red, textAlign: "center", fontSize: 14, background: `${COLORS.red}15`, padding: 10, borderRadius: 8, border: `1px solid ${COLORS.red}33` }}>
            {error}
          </div>
        )}

        <div style={{ marginTop: 32, textAlign: "center" }}>
          <button
            disabled={loading}
            onClick={() => setIsRegister(!isRegister)}
            style={{ background: "transparent", border: "none", color: COLORS.accent, fontSize: 14, cursor: "pointer", textDecoration: "underline" }}
          >
            {isRegister ? "Already have an account? Sign In" : "Don't have an account? Join now"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN APP ────────────────────────────────────────────────────────────────
export default function GradLaunch() {
  const [tab, setTab] = useState("jobs");
  const [applications, setApplications] = useState(INITIAL_APPLICATIONS);
  const [prefilledJob, setPrefilledJob] = useState({ description: "", link: "" });
  const [globalProfileContext, setGlobalProfileContext] = useState("");
  const [profileText, setProfileText] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Restore session from localStorage on load
  useEffect(() => {
    async function restoreSession() {
      const storedToken = localStorage.getItem("token");
      if (storedToken) {
        try {
          const res = await fetch("${import.meta.env.VITE_API_URL || "http://localhost:3001"}/api/auth/me", {
            headers: { "Authorization": `Bearer ${storedToken}` }
          });
          if (res.ok) {
            const data = await res.json();
            setCurrentUser(data.user);
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

  if (authLoading) {
    return (
      <div style={{ height: "100vh", background: COLORS.bg, display: "flex", alignItems: "center", justifyContent: "center", color: COLORS.accent, fontFamily: "'Syne', sans-serif", fontSize: 18 }}>
        ⚡ GradLaunch is powering up...
      </div>
    );
  }

  if (!currentUser) {
    return <AuthScreen onLogin={(user, token) => {
      localStorage.setItem("token", token);
      setCurrentUser(user);
    }} />;
  }

  function handleAddToTracker(job) {
    const exists = applications.find(a => a.company === job.company && a.role === job.title);
    if (!exists) {
      const date = new Date().toLocaleDateString("en", { month: "short", day: "numeric" });
      const stage = job.wishlist ? "Wishlist" : "Applied";
      setApplications(apps => [...apps, {
        id: Date.now(), company: job.company, role: job.title, logo: job.logo,
        stage, date, history: [{ date, stage }], notes: ""
      }]);
    }

    if (job.wishlist) {
      setTab("tracker");
    } else {
      setPrefilledJob({ description: job.description, link: job.link });
      setTab("resume");
    }
  }

  const TABS = [
    { id: "jobs", label: "Job Search", icon: "🔍" },
    { id: "copilot", label: "AI Copilot", icon: "🤖" },
    { id: "resume", label: "Resume AI", icon: "✨" },
    { id: "tracker", label: "My Applications", icon: "📊" },
    { id: "profile", label: "Profile", icon: "👤" },
  ];

  return (
    <>
      <style>{FONTS}</style>
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; background: ${COLORS.bg}; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #1E2D4A; border-radius: 3px; }
        textarea, input, select { color-scheme: dark; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes bounce { 0%, 80%, 100% { transform: scale(0); } 40% { transform: scale(1); } }
        @keyframes glow { 0% { box-shadow: 0 0 5px ${COLORS.accent}22; } 50% { box-shadow: 0 0 20px ${COLORS.accent}44; } 100% { box-shadow: 0 0 5px ${COLORS.accent}22; } }
        .glass { backdrop-filter: blur(16px) saturate(180%); background-color: rgba(14, 21, 38, 0.7); border: 1px solid rgba(255, 255, 255, 0.08); }
        .tab-btn { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
        .tab-btn:hover { background: rgba(0, 240, 255, 0.08); transform: translateY(-1px); }
        .card-hover { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
        .card-hover:hover { transform: scale(1.02); filter: brightness(1.1); }
      `}</style>
      <div style={{ minHeight: "100vh", background: `radial-gradient(circle at 50% -20%, #112240 0%, ${COLORS.bg} 100%)`, color: COLORS.text, fontFamily: "'DM Sans', sans-serif", display: "flex", flexDirection: "column" }}>

        {/* Header */}
        <header style={{ borderBottom: `1px solid ${COLORS.border}`, background: `${COLORS.surface}CC`, backdropFilter: "blur(20px)", position: "sticky", top: 0, zIndex: 100, padding: "0 32px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 0, height: 64 }}>
            {/* Logo */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginRight: 40 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.purple})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🚀</div>
              <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 20, color: COLORS.text }}>GradLaunch</span>
              <span style={{ background: `${COLORS.accent}20`, color: COLORS.accent, border: `1px solid ${COLORS.accent}44`, borderRadius: 20, padding: "2px 8px", fontSize: 10, fontWeight: 700, letterSpacing: 1 }}>AI</span>
            </div>

            {/* Nav Tabs */}
            <nav style={{ display: "flex", gap: 4, flex: 1 }}>
              {TABS.map(t => (
                <button key={t.id} onClick={() => setTab(t.id)}
                  style={{ background: tab === t.id ? `${COLORS.accent}18` : "transparent", border: tab === t.id ? `1px solid ${COLORS.accent}33` : "1px solid transparent", borderRadius: 10, padding: "8px 16px", color: tab === t.id ? COLORS.accent : COLORS.muted, fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, transition: "all 0.2s" }}>
                  {t.icon} {t.label}
                  {t.id === "tracker" && applications.filter(a => a.stage === "Interview").length > 0 && (
                    <span style={{ background: COLORS.yellow, color: "#000", borderRadius: 20, padding: "0 6px", fontSize: 10, fontWeight: 800 }}>{applications.filter(a => a.stage === "Interview").length}</span>
                  )}
                </button>
              ))}
            </nav>

            {/* Stats pill */}
            <div style={{ display: "flex", gap: 16, background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 30, padding: "8px 18px", marginRight: 16 }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 14, color: COLORS.accent }}>8M+</div>
                <div style={{ fontSize: 10, color: COLORS.muted }}>Jobs</div>
              </div>
              <div style={{ width: 1, background: COLORS.border }} />
              <div style={{ textAlign: "center" }}>
                <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 14, color: COLORS.green }}>{applications.length}</div>
                <div style={{ fontSize: 10, color: COLORS.muted }}>Tracked</div>
              </div>
            </div>

            {/* Auth/User Section */}
            <div style={{ display: "flex", alignItems: "center", gap: 15 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.purple})`, display: "flex", alignItems: "center", justifyContent: "center", color: "#000", fontWeight: 800, fontSize: 14 }}>
                  {currentUser.name?.[0]?.toUpperCase() || "U"}
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.text }}>{currentUser.name}</div>
              </div>
              <button onClick={handleLogout} style={{ background: "transparent", border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "6px 14px", color: COLORS.muted, fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }}>
                Logout
              </button>
            </div>
          </div>
        </header>

        {/* Hero banner (jobs tab only) */}
        {tab === "jobs" && (
          <div style={{ background: `linear-gradient(135deg, #070D1A 0%, #0C1524 50%, #070D1A 100%)`, padding: "32px 32px 24px", borderBottom: `1px solid ${COLORS.border}`, position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: -40, right: 80, width: 300, height: 300, background: `radial-gradient(circle, ${COLORS.accent}08 0%, transparent 70%)`, pointerEvents: "none" }} />
            <div style={{ position: "absolute", top: -20, right: 300, width: 200, height: 200, background: `radial-gradient(circle, ${COLORS.purple}08 0%, transparent 70%)`, pointerEvents: "none" }} />
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 28, color: COLORS.text, marginBottom: 6 }}>
              Find Jobs That <span style={{ color: COLORS.accent }}>Welcome You</span> 🎓
            </div>
            <div style={{ fontFamily: "'DM Sans', sans-serif", color: COLORS.muted, fontSize: 15 }}>
              Curated for new graduates · freshers · international students · OPT/H1B seekers
            </div>
          </div>
        )}

        {/* Main content */}
        <main style={{ flex: 1, padding: 24, overflow: "hidden", display: "flex", flexDirection: "column", animation: "fadeIn 0.3s ease" }} key={tab}>
          {tab === "jobs" && <JobSearch onAddToTracker={handleAddToTracker} profileText={profileText} />}
          {tab === "copilot" && <Copilot />}
          {tab === "resume" && <ResumeTailor initialJobDesc={prefilledJob.description} jobUrl={prefilledJob.link} globalContext={globalProfileContext} />}
          {tab === "tracker" && <AppTracker applications={applications} setApplications={setApplications} />}
          {tab === "profile" && (
            <Profile
              globalContext={globalProfileContext}
              setGlobalContext={setGlobalProfileContext}
              setGlobalVector={setProfileText}
              currentUser={currentUser}
              onProfileUpdate={(newProfile) => {
                if (newProfile.name) setCurrentUser(prev => ({ ...prev, name: newProfile.name }));
              }}
            />
          )}
        </main>
      </div>
    </>
  );
}

