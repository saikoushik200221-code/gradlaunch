import { useState, useEffect, useRef } from "react";

const COLORS = {
  bg: "#080C14",
  surface: "#0E1420",
  card: "#111827",
  border: "#1E2D40",
  accent: "#00D4FF",
  accentGlow: "#00D4FF33",
  accentDim: "#0099BB",
  green: "#00E599",
  yellow: "#FFD700",
  red: "#FF4D6A",
  purple: "#A78BFA",
  text: "#E8F4FF",
  muted: "#6B8099",
  tag: "#162030",
};

const FONTS = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap');
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
  { id: 1, company: "Google", role: "Software Engineer I", stage: "Interview", date: "Feb 28", logo: "G" },
  { id: 2, company: "Meta", role: "Data Analyst", stage: "Applied", date: "Mar 1", logo: "M" },
  { id: 3, company: "Airbnb", role: "Frontend Developer", stage: "Phone Screen", date: "Feb 25", logo: "A" },
  { id: 4, company: "Netflix", role: "Backend Engineer", stage: "Wishlist", date: "Mar 2", logo: "N" },
  { id: 5, company: "Stripe", role: "DevOps Engineer", stage: "Offer 🎉", date: "Feb 20", logo: "S" },
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
    <span style={{ background: c.bg, color: c.color, border: `1px solid ${c.border}`, padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 600, fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.3px" }}>
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

// ─── JOB SEARCH TAB ──────────────────────────────────────────────────────────
function JobSearch({ onAddToTracker }) {
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ newGrad: false, h1b: false, opt: false, remote: false, fresher: false });
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
        const res = await fetch("http://localhost:3001/api/jobs");
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
      const res = await fetch("http://localhost:3001/api/anthropic/messages", {
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
    const matchF = !filters.fresher || j.tags.includes("Fresher Friendly");
    return matchSearch && matchNG && matchH1 && matchOPT && matchR && matchF;
  });

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
            ["opt", "📋 OPT Accepted"],
            ["remote", "🏠 Remote Available"],
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
          {filtered.map(job => (
            <div key={job.id} onClick={() => setSelectedJob(job)}
              style={{ background: selectedJob?.id === job.id ? `linear-gradient(135deg, #0D1E30, #0A1828)` : COLORS.surface, border: `1px solid ${selectedJob?.id === job.id ? COLORS.accent : COLORS.border}`, borderRadius: 14, padding: 14, cursor: "pointer", transition: "all 0.2s", boxShadow: selectedJob?.id === job.id ? `0 0 0 1px ${COLORS.accentGlow}, 0 4px 20px ${COLORS.accentGlow}` : "none" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <LogoCircle letter={job.logo} size={36} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 14, color: COLORS.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{job.title}</div>
                  <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: COLORS.muted }}>{job.company} · {job.location}</div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: job.match >= 90 ? COLORS.green : job.match >= 75 ? COLORS.accent : COLORS.yellow, fontFamily: "'Syne', sans-serif", flexShrink: 0 }}>{job.match}%</div>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 8 }}>
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
                  <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 22, color: COLORS.text, margin: 0 }}>{selectedJob.title}</h2>
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
function ResumeTailor() {
  const [resume, setResume] = useState(`ALEX CHEN
alex.chen@email.com | LinkedIn: linkedin.com/in/alexchen | GitHub: github.com/alexchen

EDUCATION
B.S. Computer Science, University of Illinois Urbana-Champaign
Expected Graduation: May 2025 | GPA: 3.7/4.0

SKILLS
Programming: Python, Java, JavaScript, SQL
Frameworks: React, Node.js, Flask
Tools: Git, Docker, VS Code

EXPERIENCE
Software Engineering Intern | TechCorp Inc. | Summer 2024
- Built REST APIs using Python and Flask
- Worked with databases and wrote SQL queries
- Collaborated with team members on features

PROJECTS
Personal Finance App
- Created a web app using React and Node.js
- Used SQL database to store user data

ACHIEVEMENTS
- Dean's List (3 semesters)
- Hackathon participant`);
  const [jobDesc, setJobDesc] = useState(`We are looking for a Software Engineer I to join our team.

Requirements:
- Bachelor's degree in Computer Science or related field
- Proficiency in Python, distributed systems concepts
- Experience with REST APIs and microservices
- Familiarity with cloud platforms (AWS/GCP)
- Strong problem-solving skills
- Experience with CI/CD pipelines is a plus

Responsibilities:
- Design and implement scalable backend services
- Collaborate with cross-functional teams
- Write clean, well-tested code
- Participate in code reviews`);
  const [tailored, setTailored] = useState("");
  const [loading, setLoading] = useState(false);
  const [atsScore, setAtsScore] = useState(null);
  const [keywords, setKeywords] = useState([]);
  const [error, setError] = useState("");

  async function tailorResume() {
    setLoading(true);
    setError("");
    setTailored("");
    setAtsScore(null);
    setKeywords([]);
    try {
      const res = await fetch("http://localhost:3001/api/anthropic/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{
            role: "user",
            content: `You are an expert resume writer and ATS optimization specialist helping a new graduate / international student get their first job.

Given the ORIGINAL RESUME and JOB DESCRIPTION below, please:
1. Rewrite the resume to perfectly match the job description
2. Add relevant keywords from the JD naturally throughout
3. Quantify achievements where possible (make reasonable assumptions)
4. Use strong action verbs
5. Make it ATS-friendly

Also provide:
- ATS_SCORE: a number 0-100 for how well the tailored resume would pass ATS
- KEYWORDS: comma-separated list of 6-8 key terms added/emphasized

Format your response EXACTLY as:
TAILORED_RESUME:
[full rewritten resume here]

ATS_SCORE: [number]

KEYWORDS: [keyword1, keyword2, ...]

ORIGINAL RESUME:
${resume}

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
      setError("Failed to tailor resume. Please try again.");
    }
    setLoading(false);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, height: "100%" }}>
      {/* Top stats if we have result */}
      {atsScore !== null && (
        <div style={{ display: "flex", gap: 12, flexShrink: 0 }}>
          <div style={{ flex: 1, background: COLORS.surface, border: `1px solid ${COLORS.green}33`, borderRadius: 14, padding: "16px 20px", display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ fontSize: 36, fontFamily: "'Syne', sans-serif", fontWeight: 800, color: COLORS.green }}>{atsScore}</div>
            <div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, color: COLORS.text }}>ATS Score</div>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: COLORS.muted }}>{atsScore >= 80 ? "Excellent — ready to submit!" : atsScore >= 60 ? "Good — minor tweaks needed" : "Needs work"}</div>
            </div>
          </div>
          <div style={{ flex: 2, background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: "16px 20px" }}>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 13, color: COLORS.muted, marginBottom: 8, letterSpacing: 1, textTransform: "uppercase" }}>Keywords Added</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {keywords.map(k => (
                <span key={k} style={{ background: `${COLORS.accent}15`, border: `1px solid ${COLORS.accent}44`, color: COLORS.accent, padding: "3px 10px", borderRadius: 20, fontSize: 12, fontFamily: "'DM Sans', sans-serif" }}>{k}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 16, flex: 1, minHeight: 0 }}>
        {/* Left: Inputs */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12, minHeight: 0 }}>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 13, color: COLORS.muted, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>📄 Your Resume</div>
            <textarea value={resume} onChange={e => setResume(e.target.value)}
              style={{ flex: 1, background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: 16, color: COLORS.text, fontFamily: "'DM Sans', sans-serif", fontSize: 13, lineHeight: 1.6, resize: "none", outline: "none", width: "100%", boxSizing: "border-box" }} />
          </div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 13, color: COLORS.muted, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>📋 Job Description</div>
            <textarea value={jobDesc} onChange={e => setJobDesc(e.target.value)}
              style={{ flex: 1, background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: 16, color: COLORS.text, fontFamily: "'DM Sans', sans-serif", fontSize: 13, lineHeight: 1.6, resize: "none", outline: "none", width: "100%", boxSizing: "border-box" }} />
          </div>
          <button onClick={tailorResume} disabled={loading}
            style={{ background: loading ? COLORS.surface : `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.accentDim})`, border: "none", borderRadius: 12, padding: "15px 0", color: loading ? COLORS.muted : "#000", fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 15, cursor: loading ? "not-allowed" : "pointer", letterSpacing: "0.5px", flexShrink: 0, transition: "all 0.3s" }}>
            {loading ? "⚙️  Tailoring your resume with AI..." : "✨ Tailor Resume & Optimize for ATS"}
          </button>
          {error && <div style={{ color: COLORS.red, fontFamily: "'DM Sans', sans-serif", fontSize: 13 }}>{error}</div>}
        </div>

        {/* Right: Output */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 13, color: COLORS.muted, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>🚀 Tailored Resume</div>
          <div style={{ flex: 1, background: COLORS.surface, border: `1px solid ${tailored ? COLORS.green + "44" : COLORS.border}`, borderRadius: 14, padding: 16, overflowY: "auto", position: "relative" }}>
            {tailored ? (
              <pre style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, lineHeight: 1.7, color: COLORS.text, whiteSpace: "pre-wrap", margin: 0 }}>{tailored}</pre>
            ) : (
              <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: COLORS.muted, gap: 12 }}>
                <div style={{ fontSize: 48, opacity: 0.3 }}>✨</div>
                <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 600, fontSize: 16 }}>AI-tailored resume will appear here</div>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, textAlign: "center", maxWidth: 260, lineHeight: 1.5 }}>Paste your resume & job description, then click Tailor to get an ATS-optimized version</div>
              </div>
            )}
          </div>
          {tailored && (
            <button onClick={() => navigator.clipboard.writeText(tailored)}
              style={{ marginTop: 10, background: "transparent", border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "10px 0", color: COLORS.text, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
              📋 Copy to Clipboard
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── APPLICATION TRACKER TAB ─────────────────────────────────────────────────
function AppTracker({ applications, setApplications }) {
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ company: "", role: "", logo: "?" });

  function moveStage(id, dir) {
    setApplications(apps => apps.map(a => {
      if (a.id !== id) return a;
      const idx = TRACKER_STAGES.indexOf(a.stage);
      const next = TRACKER_STAGES[idx + dir];
      return next ? { ...a, stage: next } : a;
    }));
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

      {/* Add button */}
      <div style={{ flexShrink: 0 }}>
        {!adding ? (
          <button onClick={() => setAdding(true)} style={{ background: `${COLORS.accent}15`, border: `1px dashed ${COLORS.accent}`, borderRadius: 12, padding: "12px 24px", color: COLORS.accent, fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
            + Track New Application
          </button>
        ) : (
          <div style={{ display: "flex", gap: 10, alignItems: "center", background: COLORS.surface, border: `1px solid ${COLORS.accent}44`, borderRadius: 12, padding: "12px 16px" }}>
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
                    <div key={app.id} style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: "12px" }}>
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
    </div>
  );
}

// ─── PROFILE TAB ─────────────────────────────────────────────────────────────
function Profile() {
  const [profile, setProfile] = useState({
    name: "Alex Chen", email: "alex.chen@email.com", university: "UIUC", major: "Computer Science",
    gradYear: "2025", visaStatus: "F-1/OPT", targetRole: "Software Engineer", targetLocation: "Bay Area, CA",
    skills: "Python, Java, React, SQL, Docker", linkedin: "linkedin.com/in/alexchen"
  });
  const [saved, setSaved] = useState(false);

  function save() { setSaved(true); setTimeout(() => setSaved(false), 2000); }

  const F = ({ label, field, type = "text" }) => (
    <div>
      <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: COLORS.muted, marginBottom: 6, fontWeight: 600 }}>{label}</div>
      <input type={type} value={profile[field]} onChange={e => setProfile(p => ({ ...p, [field]: e.target.value }))}
        style={{ width: "100%", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "10px 14px", color: COLORS.text, fontFamily: "'DM Sans', sans-serif", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
    </div>
  );

  const Select = ({ label, field, options }) => (
    <div>
      <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: COLORS.muted, marginBottom: 6, fontWeight: 600 }}>{label}</div>
      <select value={profile[field]} onChange={e => setProfile(p => ({ ...p, [field]: e.target.value }))}
        style={{ width: "100%", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "10px 14px", color: COLORS.text, fontFamily: "'DM Sans', sans-serif", fontSize: 14, outline: "none", boxSizing: "border-box", cursor: "pointer" }}>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );

  return (
    <div style={{ display: "flex", gap: 24, height: "100%" }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 20, overflowY: "auto" }}>
        {/* Avatar section */}
        <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 18, padding: 24, display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ width: 72, height: 72, borderRadius: "50%", background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.purple})`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 28, color: "#fff", flexShrink: 0 }}>
            {profile.name.split(" ").map(n => n[0]).join("")}
          </div>
          <div>
            <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 20, color: COLORS.text, margin: "0 0 4px" }}>{profile.name}</h2>
            <div style={{ fontFamily: "'DM Sans', sans-serif", color: COLORS.muted, fontSize: 14 }}>{profile.major} · {profile.university} · Class of {profile.gradYear}</div>
            <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
              <TagBadge label={profile.visaStatus === "US Citizen" ? "US Citizen" : profile.visaStatus.includes("OPT") ? "OPT Friendly" : "International Friendly"} />
              <TagBadge label="New Grad" />
            </div>
          </div>
        </div>

        {/* Personal Info */}
        <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 18, padding: 24 }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 16, color: COLORS.text, marginBottom: 18 }}>Personal Info</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <F label="Full Name" field="name" />
            <F label="Email Address" field="email" type="email" />
            <F label="University" field="university" />
            <F label="Major" field="major" />
            <F label="Graduation Year" field="gradYear" />
            <F label="LinkedIn Profile" field="linkedin" />
          </div>
        </div>

        {/* Job Preferences */}
        <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 18, padding: 24 }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 16, color: COLORS.text, marginBottom: 18 }}>Job Preferences</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Select label="Visa Status" field="visaStatus" options={["F-1/OPT", "H1B", "Green Card", "US Citizen", "Other"]} />
            <Select label="Target Role" field="targetRole" options={["Software Engineer", "Data Analyst", "Product Manager", "UX Designer", "Data Scientist", "DevOps Engineer", "Other"]} />
            <F label="Target Location" field="targetLocation" />
            <div />
            <div style={{ gridColumn: "1 / -1" }}>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: COLORS.muted, marginBottom: 6, fontWeight: 600 }}>Key Skills (comma-separated)</div>
              <input value={profile.skills} onChange={e => setProfile(p => ({ ...p, skills: e.target.value }))}
                style={{ width: "100%", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "10px 14px", color: COLORS.text, fontFamily: "'DM Sans', sans-serif", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
            </div>
          </div>
        </div>

        <button onClick={save} style={{ background: saved ? COLORS.green : `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.accentDim})`, border: "none", borderRadius: 12, padding: "15px 0", color: saved ? "#fff" : "#000", fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 15, cursor: "pointer", transition: "all 0.3s" }}>
          {saved ? "✓ Profile Saved!" : "Save Profile"}
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
      const res = await fetch("http://localhost:3001/api/anthropic/messages", {
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

// ─── MAIN APP ────────────────────────────────────────────────────────────────
export default function GradLaunch() {
  const [tab, setTab] = useState("jobs");
  const [applications, setApplications] = useState(INITIAL_APPLICATIONS);

  function handleAddToTracker(job) {
    const exists = applications.find(a => a.company === job.company && a.role === job.title);
    if (!exists) {
      setApplications(apps => [...apps, {
        id: Date.now(), company: job.company, role: job.title, logo: job.logo,
        stage: job.wishlist ? "Wishlist" : "Applied",
        date: new Date().toLocaleDateString("en", { month: "short", day: "numeric" })
      }]);
    }
    setTab("tracker");
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
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #1E2D40; border-radius: 3px; }
        textarea, input, select { color-scheme: dark; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes bounce { 0%, 80%, 100% { transform: scale(0); } 40% { transform: scale(1); } }
      `}</style>
      <div style={{ minHeight: "100vh", background: COLORS.bg, color: COLORS.text, fontFamily: "'DM Sans', sans-serif", display: "flex", flexDirection: "column" }}>

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
            <div style={{ display: "flex", gap: 16, background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 30, padding: "8px 18px" }}>
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
          {tab === "jobs" && <JobSearch onAddToTracker={handleAddToTracker} />}
          {tab === "copilot" && <Copilot />}
          {tab === "resume" && <ResumeTailor />}
          {tab === "tracker" && <AppTracker applications={applications} setApplications={setApplications} />}
          {tab === "profile" && <Profile />}
        </main>
      </div>
    </>
  );
}
