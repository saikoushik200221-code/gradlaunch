import React, { useState, useEffect } from "react";
import { TagBadge, LogoCircle, MatchRing, SkeletonCard, EmptyState, TrustBadge, RecentlyPostedBadge } from "./Common";
import { computeSemanticScores } from "../utils/matching";

export default function JobSearch({ onAddToTracker, onToggleSave, savedJobs, profileText, C }) {
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [filter, setFilter] = useState("All");

    const isSaved = (jobId) => savedJobs?.some(sj => sj.id === jobId);
    const [search, setSearch] = useState("");
    const [filters, setFilters] = useState({ newGrad: false, h1b: false, opt: false, remote: false, onsite: false, fresher: false, trustedOnly: false });
    const [roleFilter, setRoleFilter] = useState("All");
    const [expFilter, setExpFilter] = useState("All");
    const [companyTypeFilter, setCompanyTypeFilter] = useState("All");
    const [selectedJob, setSelectedJob] = useState(null);
    const [analysis, setAnalysis] = useState(null);
    const [analyzing, setAnalyzing] = useState(false);
    const [resolvedLink, setResolvedLink] = useState(null);

    // Real Job Data Fetching
    const [loadingJobs, setLoadingJobs] = useState(false);
    const [showSavedOnly, setShowSavedOnly] = useState(false);
    const [retryCount, setRetryCount] = useState(0);
    const [lastUpdated, setLastUpdated] = useState(null);

    useEffect(() => {
        let retryTimer = null;

        async function fetchJobs(silent = false) {
            if (!silent) setLoadingJobs(true);
            try {
                const params = new URLSearchParams();
                if (search) params.append("q", search);
                if (filters.remote) params.append("remote", "true");
                if (filters.newGrad) params.append("newGrad", "true");
                if (filters.trustedOnly) params.append("trustedOnly", "true");
                if (filters.opt) params.append("sponsorship", "true");

                const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:3001"}/api/jobs?${params.toString()}`);
                if (res.ok) {
                    const data = await res.json();
                    setJobs(data || []);
                    setLastUpdated(new Date());
                    // If no jobs returned (DB empty on first boot), retry in 10s
                    if (!data || data.length === 0) {
                        retryTimer = setTimeout(() => setRetryCount(c => c + 1), 10000);
                    }
                }
            } catch (e) {
                console.warn("Could not connect to backend.", e);
                retryTimer = setTimeout(() => setRetryCount(c => c + 1), 15000);
            }
            if (!silent) setLoadingJobs(false);
        }
        const debounce = setTimeout(() => fetchJobs(false), 300);
        // Auto-refresh every 10 minutes silently (no loading spinner)
        const autoRefresh = setInterval(() => fetchJobs(true), 10 * 60 * 1000);
        return () => { clearTimeout(debounce); clearInterval(autoRefresh); if (retryTimer) clearTimeout(retryTimer); };
    }, [search, filters.remote, filters.newGrad, retryCount]);

    useEffect(() => {
        setAnalysis(null);
        setResolvedLink(null);

        if (selectedJob?.link) {
            const resolve = async () => {
                try {
                    const apiBase = import.meta.env.VITE_API_URL || "http://localhost:3001";
                    const url = `${apiBase}/api/resolve-link?url=${encodeURIComponent(selectedJob.link)}`;
                    const res = await fetch(url);
                    const data = await res.json();
                    if (data.resolvedUrl) setResolvedLink(data.resolvedUrl);
                } catch (e) {
                    console.warn("Link resolution failed", e);
                }
            };
            resolve();
        }
    }, [selectedJob?.id]);

    async function analyzeFit() {
        if (!selectedJob) return;
        setAnalyzing(true);
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:3001"}/api/ai/match`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                body: JSON.stringify({
                    resume: profileText || "New Grad Software Engineer with React and Node.js experience.",
                    jobDescription: selectedJob.description
                })
            });
            const data = await res.json();
            setAnalysis({
                score: data.score || selectedJob.match,
                missingSkills: data.missingSkills || [],
                suggestions: data.suggestions || ["Tailor your summary to match the job title."]
            });
        } catch (e) {
            console.error(e);
            setAnalysis({ score: selectedJob.match, missingSkills: [], suggestions: ["Could not connect to AI."] });
        }
        setAnalyzing(false);
    }

    const baseJobs = showSavedOnly ? savedJobs : jobs;

    const ROLE_KEYWORDS = {
        "SDE": ["software", "engineer", "developer", "backend", "frontend", "fullstack", "full-stack", "swe"],
        "Data": ["data", "analyst", "analytics", "bi ", "business intelligence", "sql"],
        "AI/ML": ["machine learning", "ai ", "deep learning", "nlp", "computer vision", "data scientist", "ml "],
        "PM": ["product manager", "program manager", " pm ", "apm ", "tpm"],
        "Design": ["design", "ux", "ui ", "figma", "product design"]
    };

    const EXP_KEYWORDS = {
        "Intern": ["intern", "internship", "co-op", "coop"],
        "Entry": ["entry", "junior", "new grad", "associate", "fresher", "early career"],
        "Mid": ["mid", "ii ", "iii ", "2-", "3-", "4-"],
        "Senior": ["senior", "staff", "lead", "principal", "sr."]
    };

    const filtered = baseJobs.filter(j => {
        const q = search.toLowerCase();
        const titleLower = j.title.toLowerCase();
        const matchSearch = !q || titleLower.includes(q) || j.company.toLowerCase().includes(q) || j.skills.some(s => s.toLowerCase().includes(q));
        const matchNG = !filters.newGrad || j.tags.includes("New Grad");
        const matchH1 = !filters.h1b || j.sponsorship_friendly === 1 || j.tags.includes("H1B Sponsor");
        const matchOPT = !filters.opt || j.sponsorship_friendly === 1 || j.tags.includes("OPT Accepted");
        const matchR = !filters.remote || j.tags.some(t => t.includes("Remote"));
        const matchOnsite = !filters.onsite || !j.tags.some(t => t.includes("Remote"));
        const matchF = !filters.fresher || j.tags.includes("Fresher Friendly");

        let categoryMatch = true;
        if (filter === "New Grad") categoryMatch = j.tags.includes("New Grad") || j.tags.includes("Fresher Friendly");
        if (filter === "Remote") categoryMatch = j.tags.includes("Remote");
        if (filter === "US Only") categoryMatch = j.location.toLowerCase().includes("us") || j.location.toLowerCase().includes("united states") || j.location.toLowerCase().includes("remote");
        if (filter === "Direct Apply") categoryMatch = j.is_trusted === 1;

        const matchRole = roleFilter === "All" || ROLE_KEYWORDS[roleFilter]?.some(kw => titleLower.includes(kw));
        const matchExp = expFilter === "All" || EXP_KEYWORDS[expFilter]?.some(kw => titleLower.includes(kw));
        const matchCompanyType = companyTypeFilter === "All" || j.company_type === companyTypeFilter;

        return matchSearch && matchNG && matchH1 && matchOPT && matchR && matchOnsite && matchF && categoryMatch && matchRole && matchExp && matchCompanyType;
    });

    const scored = profileText
        ? [...computeSemanticScores(profileText, filtered)].sort((a, b) => (b.match || 0) - (a.match || 0))
        : filtered;

    return (
        <div style={{ display: "flex", gap: 24, height: "calc(100vh - 140px)", minHeight: 600 }}>
            {/* List Panel */}
            <div style={{ flex: "0 0 380px", display: "flex", flexDirection: "column", gap: 16 }}>
                <input
                    value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="\uD83D\uDD0D  Search jobs, skills, companies..."
                    style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 18px", color: C.text, fontFamily: "'DM Sans', sans-serif", fontSize: 14, outline: "none", width: "100%", boxSizing: "border-box" }}
                />

                <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
                    {["All", "New Grad", "Direct Apply", "Remote"].map(f => (
                        <button
                            key={f}
                            onClick={() => { setFilter(f); setShowSavedOnly(false); }}
                            style={{
                                padding: "8px 16px",
                                borderRadius: 20,
                                fontSize: 13,
                                fontWeight: 600,
                                background: filter === f && !showSavedOnly ? C.accent : C.card,
                                color: filter === f && !showSavedOnly ? "#000" : C.text,
                                border: `1px solid ${C.border}`,
                                cursor: "pointer",
                                transition: "all 0.2s"
                            }}
                        >
                            {f}
                        </button>
                    ))}
                    <button
                        onClick={() => setShowSavedOnly(!showSavedOnly)}
                        style={{
                            padding: "8px 16px",
                            borderRadius: 20,
                            fontSize: 13,
                            fontWeight: 600,
                            background: showSavedOnly ? C.accent : C.card,
                            color: showSavedOnly ? "#000" : C.text,
                            border: `1px solid ${C.border}`,
                            cursor: "pointer",
                            transition: "all 0.2s",
                            marginLeft: "auto"
                        }}
                    >
                        {showSavedOnly ? "\uD83D\uDCD6 Saved Only" : "\uD83D\uDCD1 Show Saved"}
                    </button>
                </div>

                {/* Visa/Job Type filters */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {[
                        ["newGrad", "🎓 New Grad"],
                        ["h1b", "🌐 H1B"],
                        ["opt", "📋 OPT Friendly"],
                        ["trustedOnly", "✅ Direct Apply"],
                        ["remote", "🏠 Remote"],
                        ["fresher", "✨ Fresher"],
                    ].map(([key, label]) => (
                        <button
                            key={key}
                            onClick={() => setFilters(f => ({ ...f, [key]: !f[key] }))}
                            style={{
                                background: filters[key] ? `${C.accent}22` : C.card,
                                border: `1px solid ${filters[key] ? C.accent : C.border}`,
                                color: filters[key] ? C.accent : C.muted,
                                padding: "6px 12px",
                                borderRadius: "20px",
                                fontSize: 12,
                                fontWeight: 600,
                                cursor: "pointer",
                                transition: "all 0.2s"
                            }}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                {/* Role Category filters */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    <span style={{ fontSize: 11, color: C.muted, alignSelf: "center", fontWeight: 600, marginRight: 4 }}>ROLE</span>
                    {["All", "SDE", "Data", "AI/ML", "PM", "Design"].map(r => (
                        <button
                            key={r}
                            onClick={() => setRoleFilter(r)}
                            style={{
                                background: roleFilter === r ? `${C.purple}22` : C.card,
                                border: `1px solid ${roleFilter === r ? C.purple : C.border}`,
                                color: roleFilter === r ? C.purple : C.muted,
                                padding: "5px 11px",
                                borderRadius: "20px",
                                fontSize: 11,
                                fontWeight: 600,
                                cursor: "pointer",
                                transition: "all 0.2s"
                            }}
                        >
                            {r}
                        </button>
                    ))}
                </div>

                {/* Experience Level filters */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    <span style={{ fontSize: 11, color: C.muted, alignSelf: "center", fontWeight: 600, marginRight: 4 }}>EXP</span>
                    {["All", "Intern", "Entry", "Mid", "Senior"].map(e => (
                        <button
                            key={e}
                            onClick={() => setExpFilter(e)}
                            style={{
                                background: expFilter === e ? `${C.green}22` : C.card,
                                border: `1px solid ${expFilter === e ? C.green : C.border}`,
                                color: expFilter === e ? C.green : C.muted,
                                padding: "5px 11px",
                                borderRadius: "20px",
                                fontSize: 11,
                                fontWeight: 600,
                                cursor: "pointer",
                                transition: "all 0.2s"
                            }}
                        >
                            {e}
                        </button>
                    ))}
                </div>

                {/* Company Type filters */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    <span style={{ fontSize: 11, color: C.muted, alignSelf: "center", fontWeight: 600, marginRight: 4 }}>TYPE</span>
                    {["All", "Big MNC", "Startup"].map(t => (
                        <button
                            key={t}
                            onClick={() => setCompanyTypeFilter(t)}
                            style={{
                                background: companyTypeFilter === t ? `${C.accent}22` : C.card,
                                border: `1px solid ${companyTypeFilter === t ? C.accent : C.border}`,
                                color: companyTypeFilter === t ? C.accent : C.muted,
                                padding: "5px 11px",
                                borderRadius: "20px",
                                fontSize: 11,
                                fontWeight: 600,
                                cursor: "pointer",
                                transition: "all 0.2s"
                            }}
                        >
                            {t}
                        </button>
                    ))}
                </div>

                <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12, paddingRight: 4 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 11, color: C.muted, marginBottom: 4 }}>
                        <span>{scored.length} jobs found {lastUpdated && `· Updated ${lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}</span>
                        <button
                            onClick={() => setRetryCount(c => c + 1)}
                            style={{ background: "transparent", border: `1px solid ${C.border}`, borderRadius: 8, padding: "3px 10px", color: C.accent, fontSize: 11, cursor: "pointer", fontWeight: 600 }}
                        >
                            🔄 Refresh
                        </button>
                    </div>
                    {loadingJobs && [1, 2, 3, 4, 5].map(i => <SkeletonCard key={i} C={C} />)}

                    {!loadingJobs && scored.length === 0 && (
                        <EmptyState
                            icon="🔍"
                            title="No Jobs Found"
                            description="We couldn't find any jobs matching your current filters. Try adjust your search or clearing some tags."
                            C={C}
                        />
                    )}
                    {scored.map(job => (
                        <div
                            key={job.id}
                            onClick={() => setSelectedJob(job)}
                            style={{
                                background: selectedJob?.id === job.id ? (C.bg === "#04060A" ? "#111827" : "#F1F5F9") : C.card,
                                border: `1px solid ${selectedJob?.id === job.id ? C.accent : C.border}`,
                                borderRadius: 16,
                                padding: 16,
                                cursor: "pointer",
                                transition: "all 0.2s",
                                boxShadow: selectedJob?.id === job.id ? `0 4px 20px ${C.accent}15` : "none",
                                position: "relative"
                            }}
                        >
                            <div style={{ position: "absolute", top: 12, right: 60, display: "flex", gap: 8 }}>
                                {job.is_trusted === 1 && <TrustBadge C={C} />}
                                {(Date.now() - job.posted_value < 48 * 60 * 60 * 1000) && <RecentlyPostedBadge C={C} />}
                            </div>
                            <div
                                onClick={(e) => { e.stopPropagation(); onToggleSave(job); }}
                                style={{ position: "absolute", top: 12, right: 12, cursor: "pointer", fontSize: 18, zIndex: 5, padding: 4, background: `${C.surface}80`, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}
                            >
                                {isSaved(job.id) ? "\uD83D\uDCD6" : "\uD83D\uDCD1"}
                            </div>
                            <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                                <LogoCircle 
                                    letter={job.logo?.length === 1 ? job.logo : job.company?.charAt(0).toUpperCase()} 
                                    logoUrl={job.logo?.startsWith("http") ? job.logo : null} 
                                    size={44} 
                                />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
                                        <h3 style={{ margin: 0, fontSize: 13, fontWeight: 500, color: C.muted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{job.title}</h3>
                                        {job.match && <MatchRing score={job.match} color={C.accent} />}
                                    </div>
                                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
                                        <span style={{ fontSize: 16, fontWeight: 800, color: C.accent, fontFamily: "'Syne', sans-serif" }}>{job.company}</span>
                                        {job.company_type && job.company_type !== 'Company' && (
                                            <span style={{ 
                                                fontSize: 10, 
                                                background: job.company_type === 'Big MNC' ? '#3b82f622' : '#f59e0b22', 
                                                color: job.company_type === 'Big MNC' ? '#60a5fa' : '#fbbf24', 
                                                padding: "2px 8px", 
                                                borderRadius: 6, 
                                                fontWeight: 800, 
                                                textTransform: "uppercase",
                                                border: `1px solid ${job.company_type === 'Big MNC' ? '#3b82f644' : '#f59e0b44'}`
                                            }}>
                                                {job.company_type}
                                            </span>
                                        )}
                                    </div>
                                    <div style={{ fontSize: 12, color: C.muted, display: "flex", alignItems: "center", gap: 4, marginBottom: 8 }}>
                                        <span>{job.location}</span>
                                    </div>
                                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                                        {job.tags.includes("OPT Accepted") && (
                                            <span style={{ background: `${C.green}15`, color: C.green, padding: "2px 8px", borderRadius: 6, fontSize: 10, fontWeight: 700, border: `1px solid ${C.green}33` }}>
                                                🟢 OPT/CPT
                                            </span>
                                        )}
                                        {job.tags.includes("H1B Sponsor") && (
                                            <span style={{ background: `${C.purple}15`, color: C.purple, padding: "2px 8px", borderRadius: 6, fontSize: 10, fontWeight: 700, border: `1px solid ${C.purple}33` }}>
                                                🌐 H1B SPONSOR
                                            </span>
                                        )}
                                        {job.tags.filter(t => t !== "OPT Accepted" && t !== "H1B Sponsor").slice(0, 2).map(t => <TagBadge key={t} label={t} C={C} />)}
                                        {job.salary_max >= 100000 && (
                                            <span style={{ background: `${C.green}15`, color: C.green, padding: "2px 8px", borderRadius: 6, fontSize: 10, fontWeight: 700, border: `1px solid ${C.green}33` }}>
                                                \uD83D\uDCB0 HIGH PAYING
                                            </span>
                                        )}
                                        {job.source && (
                                            <span style={{ background: `${C.accent}10`, color: C.accent, padding: "2px 8px", borderRadius: 6, fontSize: 10, fontWeight: 600, opacity: 0.8 }}>
                                                {job.source}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Detail Panel */}
            <div style={{ flex: 1, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 24, overflow: "hidden", display: "flex", flexDirection: "column" }}>
                {selectedJob ? (
                    <>
                        <div style={{ padding: 32, borderBottom: `1px solid ${C.border}`, background: C.bg === "#04060A" ? "linear-gradient(135deg, #0C1824 0%, #080C14 100%)" : "#F8FAFC" }}>
                            <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
                                <LogoCircle letter={selectedJob.logo} size={64} />
                                <div style={{ flex: 1 }}>
                                    <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 24, fontWeight: 800, margin: "0 0 4px 0" }}>{selectedJob.title}</h2>
                                    <div style={{ color: C.muted, fontSize: 15 }}>{selectedJob.company} \u00B7 {selectedJob.location} \u00B7 {selectedJob.type}</div>
                                    <div style={{ color: C.green, fontWeight: 700, marginTop: 4 }}>{selectedJob.salary}</div>
                                </div>
                                <MatchRing score={analysis?.score || selectedJob.match} C={C} />
                            </div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 20 }}>
                                        {selectedJob.tags.includes("OPT Accepted") && (
                                            <span style={{ background: `${C.green}15`, color: C.green, padding: "4px 12px", borderRadius: 8, fontSize: 12, fontWeight: 700, border: `1px solid ${C.green}33` }}>
                                                🟢 OPT/CPT Friendly
                                            </span>
                                        )}
                                        {selectedJob.tags.includes("H1B Sponsor") && (
                                            <span style={{ background: `${C.purple}15`, color: C.purple, padding: "4px 12px", borderRadius: 8, fontSize: 12, fontWeight: 700, border: `1px solid ${C.purple}33` }}>
                                                🌐 H1B Sponsorship Available
                                            </span>
                                        )}
                                {selectedJob.tags.filter(t => t !== "OPT Accepted" && t !== "H1B Sponsor").map(t => <TagBadge key={t} label={t} C={C} />)}
                            </div>
                            <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
                                {selectedJob.is_trusted === 1 && <TrustBadge C={C} />}
                                {(Date.now() - selectedJob.posted_value < 48 * 60 * 60 * 1000) && <RecentlyPostedBadge C={C} />}
                            </div>
                        </div>

                        <div style={{ padding: 32, flex: 1, overflowY: "auto" }}>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, marginBottom: 40 }}>
                                <div>
                                    <h4 style={{ fontFamily: "'Syne', sans-serif", fontSize: 14, textTransform: "uppercase", letterSpacing: 1, color: C.muted, marginBottom: 16 }}>Required Skills</h4>
                                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                                        {selectedJob.skills.map(s => (
                                            <span key={s} style={{ background: `${C.accent}10`, color: C.accent, padding: "6px 12px", borderRadius: 8, fontSize: 13, fontWeight: 600, border: `1px solid ${C.accent}20` }}>{s}</span>
                                        ))}
                                    </div>
                                </div>
                                <div style={{ background: C.card, borderRadius: 20, padding: 24, border: `1px solid ${C.border}` }}>
                                    <h4 style={{ fontFamily: "'Syne', sans-serif", fontSize: 14, textTransform: "uppercase", letterSpacing: 1, color: C.muted, margin: "0 0 16px 0" }}>Orion Fit Analysis</h4>
                                    {!analysis ? (
                                        <div style={{ textAlign: "center" }}>
                                            <p style={{ fontSize: 13, color: C.muted, marginBottom: 16 }}>Generate a deep AI analysis of how your background fits this specific role.</p>
                                            <button onClick={analyzeFit} disabled={analyzing} style={{ background: C.accent, color: "#000", border: "none", borderRadius: 12, padding: "10px 20px", fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 13, cursor: "pointer", width: "100%" }}>
                                                {analyzing ? "Analyzing Fit..." : "✨ Analyze Fit"}
                                            </button>
                                        </div>
                                    ) : (
                                        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                                            {analysis.missingSkills?.length > 0 && (
                                                <div>
                                                    <div style={{ fontSize: 11, fontWeight: 800, color: C.red, textTransform: "uppercase", marginBottom: 8 }}>Missing Skills</div>
                                                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                                                        {analysis.missingSkills.map(s => (
                                                            <span key={s} style={{ background: `${C.red}10`, color: C.red, padding: "4px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700, border: `1px solid ${C.red}20` }}>{s}</span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                            <div>
                                                <div style={{ fontSize: 11, fontWeight: 800, color: C.accent, textTransform: "uppercase", marginBottom: 8 }}>Suggestions</div>
                                                <div style={{ fontSize: 13, color: C.text, lineHeight: 1.6 }}>
                                                    {analysis.suggestions?.map((s, i) => <div key={i} style={{ marginBottom: 6, display: "flex", gap: 8 }}><span style={{ color: C.accent }}>\u2022</span> {s}</div>)}
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => onAddToTracker({ ...selectedJob, optimize: true })}
                                                style={{ 
                                                    background: "linear-gradient(135deg, #00F0FF, #00A3FF)", 
                                                    color: "#000", 
                                                    border: "none", 
                                                    borderRadius: 12, 
                                                    padding: "12px", 
                                                    fontFamily: "'Syne', sans-serif", 
                                                    fontWeight: 800, 
                                                    fontSize: 13, 
                                                    cursor: "pointer",
                                                    marginTop: 8
                                                }}
                                            >
                                                🪄 Optimize Resume for this Job
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <h4 style={{ fontFamily: "'Syne', sans-serif", fontSize: 14, textTransform: "uppercase", letterSpacing: 1, color: C.muted, margin: "0 0 16px 0" }}>Job Description</h4>
                            <div style={{ color: C.text, fontSize: 15, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{selectedJob.description}</div>
                        </div>

                        <div style={{ padding: 24, background: C.card, borderTop: `1px solid ${C.border}`, display: "flex", gap: 16 }}>
                            <button
                                onClick={() => onAddToTracker({ ...selectedJob, wishlist: true, match: analysis?.score || selectedJob.match || 85 })}
                                style={{ flex: 1, background: "transparent", border: `1px solid ${C.border}`, color: C.text, padding: "16px", borderRadius: 14, fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 15, cursor: "pointer", transition: "all 0.2s" }}
                            >
                                Bookmark Job
                            </button>
                            {selectedJob.link && (
                                <button
                                    onClick={() => window.open(resolvedLink || selectedJob.link, "_blank")}
                                    style={{ flex: 1, background: "transparent", border: `1px solid ${C.accent}`, color: C.accent, padding: "16px", borderRadius: 14, fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 15, cursor: "pointer", transition: "all 0.2s" }}
                                >
                                    {resolvedLink && resolvedLink !== selectedJob.link ? "View Direct Apply" : "View Job Application"}
                                </button>
                            )}
                            <button
                                onClick={() => onAddToTracker({ ...selectedJob, match: analysis?.score || selectedJob.match || 85 })}
                                style={{ flex: 1, background: C.accent, border: "none", color: "#000", padding: "16px", borderRadius: 14, fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 15, cursor: "pointer", transition: "all 0.2s", boxShadow: `0 8px 24px ${C.accent}33` }}
                            >
                                Apply & Tailor Resume
                            </button>
                        </div>
                    </>
                ) : (
                    <EmptyState
                        icon="📋"
                        title="Select a Job to View Details"
                        description="Click on any job card from the list to see the full description and AI fit analysis."
                        C={C}
                    />
                )}
            </div>
        </div>
    );
}
