const fs = require('fs');
const file = "c:\\Users\\saiko\\OneDrive\\Desktop\\jobapplication\\frontend\\src\\components\\AppShell.jsx";
let content = fs.readFileSync(file, 'utf8');

const startTag = 'function JobMatches({ jobs, loading, onRefresh, onOpenJob, onAddToTracker }) {';
const endTag = '// ============ JOB DETAIL MODAL ============';

const startIdx = content.indexOf(startTag);
const endIdx = content.indexOf(endTag);

if (startIdx !== -1 && endIdx !== -1) {
  const replacement = `function JobMatches({ jobs, loading, onRefresh, onOpenJob, onAddToTracker }) {
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
        subtitle={\`\${filtered.length} active roles tailored to your stack\`}
        action={<button onClick={onRefresh} disabled={loading} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 9, background: \`linear-gradient(135deg, \${C.accent} 0%, \${C.accentDim} 100%)\`, border: "none", color: C.bg, fontWeight: 700, fontSize: 13, cursor: loading ? "wait" : "pointer", fontFamily: "DM Sans, sans-serif", boxShadow: \`0 0 20px \${C.accentGlow}\` }}>{loading ? <div style={{width: 14, height: 14, border: \`2px solid \${C.bg}\`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite"}}/> : <Sparkles size={14} />} Refresh feed</button>}
      />

      <div style={{ display: "flex", gap: 32, flex: 1, alignItems: "flex-start" }}>
        {/* DICE-LIKE LEFT SIDEBAR FILTERS */}
        <div style={{ width: 250, flexShrink: 0, display: "flex", flexDirection: "column", gap: 24, position: "sticky", top: 0 }}>
          
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, color: C.textDim, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Keyword / Skill</div>
            <div style={{ position: "relative" }}>
              <Search size={15} color={C.muted} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }} />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="e.g. React, Python" style={{ width: "100%", padding: "12px 14px 12px 40px", borderRadius: 10, background: C.surface, border: \`1px solid \${C.border}\`, color: C.text, fontSize: 13.5, fontFamily: "DM Sans, sans-serif", outline: "none", boxSizing: "border-box" }} onFocus={(e) => e.target.style.borderColor = C.accent} onBlur={(e) => e.target.style.borderColor = C.border} />
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
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ width: "100%", padding: "11px 14px", borderRadius: 10, background: C.surface, border: \`1px solid \${C.border}\`, color: C.text, fontSize: 13, fontFamily: "DM Sans, sans-serif", outline: "none", cursor: "pointer" }}>
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
              <div key={job.id} onClick={() => onOpenJob(job)} style={{ padding: 24, borderRadius: 12, background: C.card, border: \`1px solid \${C.border}\`, cursor: "pointer", transition: "all 0.15s", position: "relative", overflow: "hidden" }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.borderHi; e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 30px rgba(0,0,0,0.2)"; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}>
                
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
                      {job.tags && job.tags.slice(0, 6).map(t => <span key={t} style={{ fontSize: 11, fontWeight: 600, background: C.surfaceHi, color: C.textDim, padding: "4px 10px", borderRadius: 6, border: \`1px solid \${C.border}\` }}>{t}</span>)}
                    </div>
                  </div>

                  {/* Right Column of Card */}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 12 }}>
                    <Logo letter={job.logo?.startsWith("http") ? <img src={job.logo} style={{width:28,height:28,objectFit:"contain",borderRadius:6}} /> : (job.company?.[0] || "?")} color={job.logoColor || "#4285F4"} size={48} radius={10} />
                    <MatchBadge score={Math.round(job.match || job.match_score || 75)} />
                  </div>

                </div>

                {/* Bottom Actions Row */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: \`1px solid \${C.border}\`, paddingTop: 16, marginTop: 4 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <button onClick={(e) => { e.stopPropagation(); onAddToTracker(job); }} style={{ padding: "8px 20px", borderRadius: 8, background: C.accent, border: "none", color: C.bg, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "DM Sans, sans-serif", transition: "0.2s" }} onMouseEnter={e => e.currentTarget.style.filter = "brightness(1.1)"} onMouseLeave={e => e.currentTarget.style.filter = "none"}>Easy Apply</button>
                    <button onClick={(e) => { e.stopPropagation(); onOpenJob(job); }} style={{ padding: "8px 16px", borderRadius: 8, background: "transparent", border: \`1px solid \${C.border}\`, color: C.text, fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: "DM Sans, sans-serif", display: "flex", alignItems: "center", gap: 6 }}><FileText size={14} /> Tailor Resume</button>
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

`;

  content = content.substring(0, startIdx) + replacement + content.substring(endIdx);
  fs.writeFileSync(file, content);
  console.log("Updated AppShell.jsx with Dice.com layout");
} else {
  console.log("Could not find JobMatches component boundaries.");
}
