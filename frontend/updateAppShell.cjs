const fs = require('fs');
const file = "c:\\Users\\saiko\\OneDrive\\Desktop\\jobapplication\\frontend\\src\\components\\AppShell.jsx";
let c = fs.readFileSync(file, 'utf8');

c = c.replace(
  'const FONTS_LINK = "https://fonts.googleapis.com/css2?family=Syne:wght@500;600;700;800&family=DM+Sans:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap";',
  'const FONTS_LINK = "https://fonts.googleapis.com/css2?family=Syne:wght@500;600;700;800&family=DM+Sans:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap";\n\nconst API = import.meta.env.VITE_API_URL || "http://localhost:3001";'
);

c = c.replace(
  'function JobMatches({ onOpenJob, onAddToTracker }) {',
  'function JobMatches({ jobs, loading, onRefresh, onOpenJob, onAddToTracker }) {'
);

c = c.replace(
  'let filtered = JOBS.filter(j =>',
  'let filtered = jobs.filter(j =>'
);

c = c.replace(
  'action={<button style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 9, background: `linear-gradient(135deg, ${C.accent} 0%, ${C.accentDim} 100%)`, border: "none", color: C.bg, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "DM Sans, sans-serif", boxShadow: `0 0 20px ${C.accentGlow}` }}><Sparkles size={14} /> Refresh matches</button>}',
  'action={<button onClick={onRefresh} disabled={loading} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 9, background: `linear-gradient(135deg, ${C.accent} 0%, ${C.accentDim} 100%)`, border: "none", color: C.bg, fontWeight: 700, fontSize: 13, cursor: loading ? "wait" : "pointer", fontFamily: "DM Sans, sans-serif", boxShadow: `0 0 20px ${C.accentGlow}` }}>{loading ? <div style={{width: 14, height: 14, border: `2px solid ${C.bg}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite"}}/> : <Sparkles size={14} />} Refresh matches</button>}'
);

c = c.replace(
  '{filtered.length} roles ranked by your resume — refreshed 12 min ago',
  '{filtered.length} roles ranked by your resume'
);

c = c.replace(
  '<Logo letter={job.logo} color={job.logoColor} size={52} radius={12} />',
  '<Logo letter={job.logo?.startsWith("http") ? <img src={job.logo} style={{width:24,height:24,objectFit:"contain",borderRadius:6}} /> : (job.company?.[0] || "?")} color={job.logoColor || "#4285F4"} size={52} radius={12} />'
);

c = c.replace(
  '<MatchBadge score={job.match} />',
  '<MatchBadge score={Math.round(job.match || job.match_score || 75)} />'
);

c = c.replace(
  '{job.tags.map(t => <Tag key={t} label={t} />)}',
  '{job.tags && job.tags.slice(0, 4).map(t => <Tag key={t} label={t} />)}'
);

c = c.replace(
  'function Sidebar({ active, setActive, applications }) {',
  'function Sidebar({ active, setActive, applications, jobsCount, currentUser, onLogout }) {'
);

c = c.replace(
  'count: JOBS.length',
  'count: jobsCount'
);

c = c.replace(
  '<div style={{ width: 32, height: 32, borderRadius: "50%", background: `linear-gradient(135deg, ${C.accent} 0%, ${C.purple} 100%)`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: C.bg, fontSize: 12, fontFamily: "Syne, sans-serif" }}>AS</div>',
  '<div style={{ width: 32, height: 32, borderRadius: "50%", background: `linear-gradient(135deg, ${C.accent} 0%, ${C.purple} 100%)`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: C.bg, fontSize: 12, fontFamily: "Syne, sans-serif" }}>{currentUser?.name?.[0]?.toUpperCase() || "A"}</div>'
);

c = c.replace(
  '<div style={{ fontSize: 12.5, color: C.text, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Alex Student</div>',
  '<div style={{ fontSize: 12.5, color: C.text, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{currentUser?.name || "Alex Student"}</div>'
);

c = c.replace(
  '<Settings size={14} color={C.muted} />',
  '<LogOut size={14} color={C.red} onClick={onLogout} style={{cursor:"pointer"}} />'
);

c = c.replace(
  'export default function GradLaunch() {',
  'export default function AppShell({ currentUser, token, onLogout }) {'
);

c = c.replace(
  'const [tailorTarget, setTailorTarget] = useState(null);',
  `const [tailorTarget, setTailorTarget] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const res = await fetch(\`\${API}/api/jobs?limit=100\`, { headers: token ? { Authorization: \`Bearer \${token}\` } : {} });
      const data = await res.json();
      setJobs(Array.isArray(data) ? data : (data.jobs || []));
    } catch (e) {}
    setLoading(false);
  };

  useEffect(() => { fetchJobs(); }, [token]);`
);

c = c.replace(
  '<Sidebar active={active} setActive={setActive} applications={applications} />',
  '<Sidebar active={active} setActive={setActive} applications={applications} jobsCount={jobs.length} currentUser={currentUser} onLogout={onLogout} />'
);

c = c.replace(
  '{active === "jobs" && <JobMatches onOpenJob={setOpenJob} onAddToTracker={addToTracker} />}',
  '{active === "jobs" && <JobMatches jobs={jobs.length ? jobs : JOBS} loading={loading} onRefresh={fetchJobs} onOpenJob={setOpenJob} onAddToTracker={addToTracker} />}'
);

// Fix the location filter since mock data uses location string directly, but real data might vary
c = c.replace(
  '(filterRemote === "All" || j.remote === filterRemote)',
  '(filterRemote === "All" || !j.location || j.location.includes(filterRemote) || (filterRemote === "Remote" && j.title.includes("Remote")))'
);

fs.writeFileSync(file, c);
console.log("AppShell replaced properly!");
