import React, { useState, useEffect } from "react";
import { TagBadge, LogoCircle, MatchRing, SkeletonCard, EmptyState, TrustBadge, RecentlyPostedBadge, MatchChanceBadge } from "./Common";
import JobIntelligenceCard from "./JobIntelligenceCard";
import SmartApplyModal from "./SmartApplyModal";

import ResumeVersionManager from "./ResumeVersionManager";

export default function JobSearch({ onAddToTracker, onToggleSave, savedJobs, profileText, C }) {
    const [jobs, setJobs] = useState([]);
    const [loadingJobs, setLoadingJobs] = useState(false);
    const [search, setSearch] = useState("");
    const [showVerifiedOnly, setShowVerifiedOnly] = useState(true); // Default to verified jobs
    const [filters, setFilters] = useState({
        newGrad: false,
        h1b_sponsor: false,
        stem_opt: false,
        cap_exempt: false,
        remote: false,
        trustedOnly: false,
        minGenuinessScore: 70, // Only show jobs scoring 70+
        minSalary: 0,          // USD, 0 = no filter
        postedWithinDays: 0,   // 0 = any; 1, 7, 30 chips
    });
    const [error, setError] = useState(null);
    const [modalError, setModalError] = useState(null);
    const [selectedJob, setSelectedJob] = useState(null);
    const [analysis, setAnalysis] = useState(null);
    const [deepAnalysis, setDeepAnalysis] = useState(null);
    const [analyzing, setAnalyzing] = useState(false);
    const [tailoring, setTailoring] = useState(false);
    const [tailoredResume, setTailoredResume] = useState(null);
    const [changesMade, setChangesMade] = useState([]);
    const [showSmartApply, setShowSmartApply] = useState(false);
    const [stage, setStage] = useState("ready"); // 'analyzing', 'tailoring', 'ready', 'dispatching'
    const [resolvedLink, setResolvedLink] = useState(null);
    const [showSavedOnly, setShowSavedOnly] = useState(false);
    const [retryCount, setRetryCount] = useState(0);
    const [lastUpdated, setLastUpdated] = useState(null);

    const isSaved = (jobId) => savedJobs?.some(sj => sj.id === jobId);

    useEffect(() => {
        let retryTimer = null;
        async function fetchJobs(silent = false) {
            if (!silent) {
                setLoadingJobs(true);
                setError(null);
            }
            try {
                // Use verified endpoint by default, or regular endpoint if advanced filters needed
                const hasAdvancedFilter = Object.entries(filters).some(([k, v]) => {
                    if (k === "minGenuinessScore") return v !== 70;
                    if (k === "minSalary" || k === "postedWithinDays") return v > 0;
                    return Boolean(v);
                });
                const useVerified = showVerifiedOnly && !search && !hasAdvancedFilter;
                let endpoint = useVerified ? '/api/jobs/verified' : '/api/jobs';

                const params = new URLSearchParams();
                if (search) params.append("q", search);
                if (!useVerified) {
                    if (filters.remote) params.append("remote", "true");
                    if (filters.newGrad) params.append("newGrad", "true");
                    if (filters.trustedOnly || showVerifiedOnly) params.append("verifiedOnly", "true");
                    if (filters.h1b_sponsor) params.append("h1b_sponsor", "true");
                    if (filters.stem_opt) params.append("stem_opt", "true");
                    if (filters.cap_exempt) params.append("cap_exempt", "true");
                    if (filters.minGenuinessScore) params.append("minScore", filters.minGenuinessScore);
                    if (filters.minSalary > 0) params.append("minSalary", filters.minSalary);
                    if (filters.postedWithinDays > 0) params.append("postedWithinDays", filters.postedWithinDays);
                    if (profileText && profileText.toLowerCase() !== "add your resume or profile text here for ai matching...") {
                        params.append("profileText", profileText);
                    }
                }

                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 15000);

                const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:3001"}${endpoint}?${params.toString()}`, { signal: controller.signal });
                clearTimeout(timeoutId);

                if (res.ok) {
                    const data = await res.json();
                    // Extract jobs array from verified response format
                    const jobsArray = useVerified ? (data.jobs || data || []) : (data || []);
                    setJobs(jobsArray);
                    setLastUpdated(new Date());
                    if (!jobsArray || jobsArray.length === 0) {
                        retryTimer = setTimeout(() => setRetryCount(c => c + 1), 10000);
                    }
                } else {
                    if (res.status === 429) {
                        const data = await res.json();
                        throw new Error(`Rate limited: ${data.message || data.error}`);
                    }
                    throw new Error(`Search failed: ${res.status}`);
                }
            } catch (e) {
                console.warn("Backend connection failed.", e);
                if (e.name === 'AbortError') {
                    if (!silent) setError('Request timed out. Please try again.');
                } else {
                    if (!silent) setError(e.message);
                }
                retryTimer = setTimeout(() => setRetryCount(c => c + 1), 15000);
            }
            if (!silent) setLoadingJobs(false);
        }
        const debounce = setTimeout(() => fetchJobs(false), 300);
        const autoRefresh = setInterval(() => fetchJobs(true), 10 * 60 * 1000);
        return () => { clearTimeout(debounce); clearInterval(autoRefresh); if (retryTimer) clearTimeout(retryTimer); };
    }, [search, showVerifiedOnly, filters.remote, filters.newGrad, filters.trustedOnly, filters.h1b_sponsor, filters.stem_opt, filters.cap_exempt, filters.minGenuinessScore, filters.minSalary, filters.postedWithinDays, retryCount]);

    useEffect(() => {
        setAnalysis(null);
        setResolvedLink(null);
        if (selectedJob?.link) {
            (async () => {
                try {
                    const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:3001"}/api/resolve-link?url=${encodeURIComponent(selectedJob.link)}`);
                    const data = await res.json();
                    if (data.resolvedUrl) setResolvedLink(data.resolvedUrl);
                } catch (e) { console.warn("Link resolution failed", e); }
            })();
        }
    }, [selectedJob?.id]);

    const [streamState, setStreamState] = useState(null);

    useEffect(() => {
        setDeepAnalysis(null);
        setTailoredResume(null);
        setChangesMade([]);
        setStreamState(null);
    }, [selectedJob?.id]);

    async function analyzeFitDeep() {
        if (!selectedJob) return;
        setAnalyzing(true);
        setStage("analyzing");
        setShowSmartApply(true); // Open modal early to show progress
        setModalError(null);
        setStreamState({ state: 'INIT', message: 'Connecting to agent orchestrator...' });

        try {
            const token = localStorage.getItem("token");
            const qs = new URLSearchParams({
                title: selectedJob.title || '',
                company: selectedJob.company || '',
                id: selectedJob.id || '',
                link: selectedJob.link || '',
                description: selectedJob.description || ''
            });

            const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:3001"}/api/ai/analyze-stream?${qs.toString()}`, {
                method: "GET",
                headers: { "Authorization": `Bearer ${token}` }
            });

            if (!res.ok) {
                throw new Error(`Analysis failed: ${res.status}`);
            }

            const reader = res.body.getReader();
            const decoder = new TextDecoder("utf-8");
            let done = false;
            let buffer = "";

            while (!done) {
                const { value, done: readerDone } = await reader.read();
                done = readerDone;
                if (value) {
                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n');
                    buffer = lines.pop(); // keep remainder

                    let currentEvent = null;
                    for (const line of lines) {
                        if (line.startsWith('event: ')) {
                            currentEvent = line.replace('event: ', '').trim();
                        } else if (line.startsWith('data: ')) {
                            const dataStr = line.replace('data: ', '').trim();
                            try {
                                const parsed = JSON.parse(dataStr);
                                if (currentEvent === 'step') {
                                    setStreamState(parsed);
                                    if (parsed.state === 'READY') {
                                        setDeepAnalysis(parsed.data);
                                    } else if (parsed.state === 'ERROR') {
                                        throw new Error(parsed.error);
                                    }
                                } else if (currentEvent === 'done') {
                                    // Complete
                                    setAnalyzing(false);
                                    setStage("tailoring");
                                    // Wait for state to settle then tailor
                                    setTimeout(() => handleTailor(), 100);
                                } else if (currentEvent === 'error') {
                                    throw new Error(parsed.error);
                                }
                            } catch (e) {
                                // likely incomplete JSON chunk, wait for next buffer (shouldn't happen with split('\n'))
                                if (line.includes("error")) throw new Error("JSON parse error on SSE stream.");
                            }
                        }
                    }
                }
            }
        } catch (e) {
            console.error("Deep analysis streaming failed", e);
            setModalError(e.message || "Failed to analyze job stream.");
            setStage("failed");
            setAnalyzing(false);
        }
    }

    async function handleTailor(analysisData) {
        if (!selectedJob) return;
        setTailoring(true);
        setStage("tailoring");
        setModalError(null);
        try {
            const token = localStorage.getItem("token");
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000);

            const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:3001"}/api/ai/tailor-resume`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                body: JSON.stringify({
                    jobId: selectedJob.id,
                    resumeText: profileText || "New Grad Software Engineer"
                }),
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (!res.ok) throw new Error(`Material generation failed: ${res.status}`);

            const data = await res.json();
            setTailoredResume(data.tailoredResume);
            setChangesMade(data.changesMade || []);
            setStage("ready");
        } catch (e) {
            console.error("Tailoring failed", e);
            setModalError(e.name === 'AbortError' ? 'Generation timed out after 30 seconds' : e.message);
            setStage("failed");
        }
        setTailoring(false);
    }

    async function handleFinalDispatch() {
        setStage("dispatching");
        setModalError(null);
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:3001"}/api/jobs/dispatch`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                body: JSON.stringify({
                    jobId: selectedJob.id,
                    tier: deepAnalysis?.ats_type === 'greenhouse' || deepAnalysis?.ats_type === 'lever' ? 3 : (deepAnalysis?.ats_type === 'workday' ? 2 : 1),
                    resumeId: "master" // Default for now
                })
            });
            if (res.ok) {
                const result = await res.json();
                onAddToTracker({ ...selectedJob, stage: result.status === 'submitted' ? 'Submitted' : 'Pending' });
                setShowSmartApply(false);
                setSelectedJob(null);
                setStage("ready");
                alert(result.status === 'submitted' ? "Application submitted via Auto-Dispatch! 🚀" : "Application materials prepared for Smart-Assist! 🪄");
            } else {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || 'Submission failed');
            }
        } catch (e) {
            console.error("Dispatch failed", e);
            setModalError(e.message || "Dispatch failed.");
            setStage("failed");
        }
    }

    const baseJobs = showSavedOnly ? savedJobs : jobs;
    const filtered = baseJobs; // Filtering already handled by API mostly, but could add local filter here if needed.

    return (
        <div className="flex flex-col h-full bg-background font-inter text-white overflow-hidden">
            {/* Header & Controls */}
            <div className="flex flex-col md:flex-row gap-4 p-6 bg-surface/50 border-b border-border/50 backdrop-blur-xl sticky top-0 z-20">
                <div className="relative flex-1">
                    <input
                        value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Search roles, companies, or skills..."
                        className="w-full bg-card/80 border border-border focus:border-accent/50 focus:ring-1 focus:ring-accent/20 rounded-2xl py-3.5 px-12 text-sm transition-all outline-none"
                    />
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 opacity-40 text-lg">🔍</span>
                </div>

                <div className="flex flex-wrap gap-2">
                    {[
                        ["newGrad", "🎓 New Grad"],
                        ["opt", "📋 OPT Friendly"],
                        ["trustedOnly", "✅ Direct Apply"],
                    ].map(([key, label]) => (
                        <button
                            key={key}
                            onClick={() => setFilters(f => ({ ...f, [key]: !f[key] }))}
                            className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${filters[key] ? 'bg-accent/10 border-accent text-accent' : 'bg-card border-border text-muted hover:border-muted'}`}
                        >
                            {label}
                        </button>
                    ))}
                    <button
                        onClick={() => setShowVerifiedOnly(!showVerifiedOnly)}
                        className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border flex items-center gap-2 ${showVerifiedOnly ? "bg-green-500/20 border-green-500 text-green-400" : "bg-surface/50 border-border/50 text-white/50 hover:text-white"}`}
                        title="Show only jobs from verified employers (no staffing agencies, no contractors)"
                    >
                        ✅ Verified Jobs Only
                    </button>
                    <button
                        onClick={() => setFilters(prev => ({ ...prev, h1b_sponsor: !prev.h1b_sponsor }))}
                        className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${filters.h1b_sponsor ? "bg-primary/20 border-primary text-primary" : "bg-surface/50 border-border/50 text-white/50 hover:text-white"}`}
                    >
                        🛂 H1B Sponsor
                    </button>
                    <button
                        onClick={() => setFilters(prev => ({ ...prev, stem_opt: !prev.stem_opt }))}
                        className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${filters.stem_opt ? "bg-green-500/20 border-green-500 text-green-400" : "bg-surface/50 border-border/50 text-white/50 hover:text-white"}`}
                    >
                        🎓 STEM OPT
                    </button>
                    <button
                        onClick={() => setFilters(prev => ({ ...prev, cap_exempt: !prev.cap_exempt }))}
                        className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${filters.cap_exempt ? "bg-amber-500/20 border-amber-500 text-amber-400" : "bg-surface/50 border-border/50 text-white/50 hover:text-white"}`}
                    >
                        ⚡ Cap-Exempt
                    </button>
                    <button
                        onClick={() => setFilters(prev => ({ ...prev, remote: !prev.remote }))}
                        className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${filters.remote ? "bg-primary/20 border-primary text-primary shadow-lg shadow-primary/20" : "bg-surface/50 border-border/50 text-white/50 hover:text-white"}`}
                    >
                        Remote Only
                    </button>
                    <button
                        onClick={() => setShowSavedOnly(!showSavedOnly)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold border ml-auto transition-all ${showSavedOnly ? 'bg-purple/20 border-purple text-purple' : 'bg-card border-border text-muted'}`}
                    >
                        {showSavedOnly ? "📚 Saved Only" : "🔖 View Saved"}
                    </button>
                    <button onClick={() => setRetryCount(c => c + 1)} className="p-2 border border-border rounded-xl text-muted hover:text-accent transition-colors">🔄</button>
                </div>
            </div>

            {/* Second row: salary slider + recency chips */}
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center px-6 py-3 bg-surface/30 border-b border-border/40 backdrop-blur-xl">
                {/* Recency chips */}
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-muted uppercase tracking-widest mr-1">Posted</span>
                    {[
                        [0, "Any"],
                        [1, "24h"],
                        [7, "7d"],
                        [30, "30d"],
                    ].map(([days, label]) => (
                        <button
                            key={days}
                            onClick={() => setFilters(prev => ({ ...prev, postedWithinDays: days }))}
                            className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                                filters.postedWithinDays === days
                                    ? "bg-accent/10 border-accent text-accent"
                                    : "bg-card border-border text-muted hover:border-muted"
                            }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                {/* Salary slider */}
                <div className="flex items-center gap-3 md:ml-auto w-full md:w-auto">
                    <span className="text-[10px] font-black text-muted uppercase tracking-widest whitespace-nowrap">Min Salary</span>
                    <input
                        type="range"
                        min="0"
                        max="250000"
                        step="10000"
                        value={filters.minSalary}
                        onChange={(e) => setFilters(prev => ({ ...prev, minSalary: Number(e.target.value) }))}
                        className="flex-1 md:w-48 accent-accent"
                    />
                    <span className={`text-xs font-black tabular-nums min-w-[72px] text-right ${filters.minSalary > 0 ? "text-accent" : "text-muted"}`}>
                        {filters.minSalary === 0 ? "Any" : `$${(filters.minSalary / 1000).toFixed(0)}k+`}
                    </span>
                    {filters.minSalary > 0 && (
                        <button
                            onClick={() => setFilters(prev => ({ ...prev, minSalary: 0 }))}
                            className="text-[10px] text-muted hover:text-white"
                            title="Clear salary filter"
                        >
                            ✕
                        </button>
                    )}
                </div>
            </div>

            {/* Job Grid */}
            <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
                {loadingJobs ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-6">
                        {[1, 2, 3, 4, 5, 6].map(i => <SkeletonCard key={i} />)}
                    </div>
                ) : error ? (
                    <div className="bg-pink/10 border border-pink/30 rounded-[2rem] p-10 flex flex-col items-center justify-center text-center max-w-lg mx-auto mt-10">
                        <div className="text-4xl mb-4">⚠️</div>
                        <h3 className="text-xl font-black font-syne uppercase tracking-tight text-white mb-2">Something went wrong</h3>
                        <p className="text-pink mb-6 font-medium italic">{error}</p>
                        <button onClick={() => setRetryCount(c => c + 1)} className="px-8 py-4 bg-pink text-black font-black uppercase tracking-widest text-xs rounded-2xl hover:bg-white transition-all shadow-lg shadow-pink/20">Try Again</button>
                    </div>
                ) : filtered.length === 0 ? (
                    <EmptyState icon="🔍" title="No results found" description="Try broadening your search or clearing filters." />
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-6">
                        {filtered.map(job => {
                            const match = job.match || 70;
                            const isHigh = match >= 80;
                            const isMed = match >= 60;
                            const colorClass = isHigh ? 'accent' : isMed ? 'purple' : 'pink';

                            return (
                                <div
                                    key={job.id}
                                    onClick={() => setSelectedJob(job)}
                                    className={`group relative bg-card/40 border border-border hover:border-${colorClass}/40 rounded-[2.5rem] p-8 cursor-pointer transition-all hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.3)] hover:-translate-y-2 ${selectedJob?.id === job.id ? `ring-2 ring-${colorClass} border-transparent bg-card/80` : ''}`}
                                >
                                    <div className="flex items-start justify-between mb-6">
                                        <LogoCircle
                                            letter={job.logo?.length === 1 ? job.logo : job.company?.charAt(0).toUpperCase()}
                                            logoUrl={job.logo?.startsWith("http") ? job.logo : null}
                                            size={64}
                                        />
                                        <div className="flex gap-2 flex-wrap">
                                            {job.is_trusted === 1 && <TrustBadge />}
                                            {job.genuinessScore && (
                                                <div className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border flex items-center gap-1 ${job.genuinessScore > 70 ? 'bg-green-500/10 border-green-500 text-green-400' : job.genuinessScore > 50 ? 'bg-amber-500/10 border-amber-500 text-amber-400' : 'bg-red-500/10 border-red-500 text-red-400'}`}
                                                    title={`Job verification score: ${job.genuinessScore}/100`}
                                                >
                                                    {job.genuinessScore > 70 ? '✓ VERIFIED' : job.genuinessScore > 50 ? '⚠ CAUTION' : '✗ RISKY'}
                                                </div>
                                            )}
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onToggleSave(job); }}
                                                className={`p-3 rounded-[1.2rem] transition-all ${isSaved(job.id) ? 'text-accent bg-accent/10 shadow-[0_0_20px_rgba(200,255,0,0.1)]' : 'bg-white/5 text-muted hover:bg-white/10'}`}
                                            >
                                                {isSaved(job.id) ? "🔖" : "➕"}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-1 mb-8">
                                        <h3 className="text-xl font-black font-syne group-hover:text-accent transition-colors truncate uppercase tracking-tight">{job.title}</h3>
                                        <div className="flex items-center gap-2">
                                            <span className="text-muted font-bold tracking-tight text-sm uppercase">{job.company}</span>
                                            <div className="h-1 w-1 bg-border rounded-full" />
                                            <span className="text-muted font-bold text-[10px] uppercase tracking-widest">{job.location}</span>
                                        </div>
                                    </div>

                                    {/* Dominant AI Match Badge */}
                                    <div className={`p-6 rounded-[2rem] border mb-8 flex items-center justify-between transition-all duration-500 overflow-hidden relative ${isHigh ? 'bg-accent/5 border-accent/20' : isMed ? 'bg-purple/5 border-purple/20' : 'bg-pink/5 border-pink/20'}`}>
                                        <div className="absolute top-0 right-0 w-20 h-20 opacity-10 bg-white blur-3xl rounded-full -mr-10 -mt-10" />
                                        <div className="relative z-10 flex flex-col">
                                            <span className={`text-4xl font-black font-syne tracking-tighter ${isHigh ? 'text-accent' : isMed ? 'text-purple' : 'text-pink'}`}>{match}% MATCH</span>
                                            <MatchChanceBadge score={match} />
                                        </div>
                                        <div className="text-3xl animate-pulse">
                                            {isHigh ? '🚀' : isMed ? '🪄' : '⚠️'}
                                        </div>
                                    </div>

                                    <div className="flex gap-3">
                                        {isHigh ? (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); window.open(job.link, "_blank"); }}
                                                className="flex-1 bg-accent hover:brightness-110 text-black py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-accent/10 active:scale-95 transition-all"
                                            >
                                                Apply Now
                                            </button>
                                        ) : (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onAddToTracker({ ...job, optimize: true }); }}
                                                className="flex-1 bg-purple hover:brightness-110 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-purple/10 active:scale-95 transition-all"
                                            >
                                                Optimize First
                                            </button>
                                        )}
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setSelectedJob(job); }}
                                            className="px-6 border border-border/50 hover:bg-white/5 rounded-2xl text-[10px] font-black uppercase tracking-widest text-muted hover:text-white transition-all"
                                        >
                                            View Intel
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Slide-over Drawer */}
            {selectedJob && (
                <div className="fixed inset-y-0 right-0 w-full max-w-2xl bg-surface border-l border-border shadow-2xl z-50 animate-slide-in overflow-hidden flex flex-col">
                    {/* Drawer Header */}
                    <div className="p-8 pb-4 border-b border-border flex justify-between items-start">
                        <div className="flex items-center gap-6">
                            <LogoCircle letter={selectedJob.logo} size={72} />
                            <div>
                                <h2 className="text-3xl font-black font-syne uppercase tracking-tight leading-none mb-2">{selectedJob.title}</h2>
                                <p className="text-lg text-muted font-medium italic">{selectedJob.company} • {selectedJob.location}</p>
                            </div>
                        </div>
                        <button onClick={() => setSelectedJob(null)} className="p-4 bg-white/5 hover:bg-white/10 rounded-2xl transition-all text-xl">✕</button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar pb-32">
                        {/* 🧠 Intelligence Injection */}
                        {!deepAnalysis ? (
                            <button
                                onClick={analyzeFitDeep}
                                disabled={analyzing}
                                className="w-full bg-accent/10 border border-accent/20 rounded-[2.5rem] p-10 group hover:bg-accent/20 transition-all active:scale-[0.99]"
                            >
                                <div className="text-4xl mb-4 group-hover:scale-125 transition-transform duration-500 origin-center">🧠</div>
                                <h3 className="text-[10px] font-black text-accent uppercase tracking-[0.4em] mb-2">Initialize Deep Intelligence</h3>
                                <p className="text-[11px] text-muted italic font-medium">Map keyword gaps, match scores, and sponsorship intel...</p>
                                {analyzing && <div className="mt-6 h-1 w-full bg-white/5 rounded-full overflow-hidden"><div className="h-full bg-accent animate-shimmer w-1/2" /></div>}
                            </button>
                        ) : (
                            <JobIntelligenceCard
                                analysis={deepAnalysis}
                                onTailor={handleTailor}
                                onApply={() => setShowSmartApply(true)}
                                loadingTailor={tailoring}
                                onStartAutoFix={() => { setStage('fixing'); setShowSmartApply(true); }}
                            />
                        )}

                        {/* 🎯 Decision Panel (Legacy/Simpler mode) */}
                        <div className="bg-card/50 border border-border p-8 rounded-[3rem] relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-40 h-40 bg-accent/5 blur-3xl rounded-full -mr-20 -mt-20" />
                            <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
                                <div className="text-center">
                                    <div className="text-xs font-black uppercase tracking-widest text-muted mb-2">Ready to Apply Index</div>
                                    <div className="text-6xl font-black font-syne text-accent">{analysis?.score || selectedJob.match || 70}%</div>
                                </div>
                                <div className="flex-1 space-y-3">
                                    <MatchChanceBadge score={analysis?.score || selectedJob.match || 70} />
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 text-[10px] font-bold text-white/80">
                                            <span className="text-accent">✔</span> Strong skill alignment in React/Node
                                        </div>
                                        <div className="flex items-center gap-2 text-[10px] font-bold text-white/80">
                                            <span className="text-accent">✔</span> Geographic relevance (Remote/US)
                                        </div>
                                        <div className="flex items-center gap-2 text-[10px] font-bold text-pink/80">
                                            <span className="text-pink">⚠️</span> Add metrics to experience for 90%+
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 🧠 Why This Job Fits */}
                        <section className="space-y-6">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-accent">Strategic Alignment</h4>
                            <div className="grid gap-4">
                                {[
                                    `Matches your backend engineering core with Node.js.`,
                                    `H1B sponsorship aligns with your target visa requirements.`,
                                    `Startup environment matches your recorded preference.`
                                ].map((p, i) => (
                                    <div key={i} className="bg-accent/5 p-5 rounded-2xl border border-accent/10 flex gap-4">
                                        <span className="text-accent text-lg">✦</span>
                                        <p className="text-sm font-medium leading-relaxed">{p}</p>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* 🪄 Resume Optimization Preview */}
                        <section className="space-y-6">
                            <div className="flex justify-between items-end">
                                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-purple">Resume Lift Analysis</h4>
                                <span className="text-[9px] font-black text-muted uppercase tracking-widest italic">AI Suggestions</span>
                            </div>
                            <div className="bg-surface border border-border/50 rounded-[2rem] overflow-hidden">
                                <div className="p-6 border-b border-border/50 bg-white/[0.02]">
                                    <p className="text-[10px] font-black text-muted uppercase tracking-widest mb-3">Current Version</p>
                                    <p className="text-sm text-white/40 italic leading-relaxed line-through">"Built a high-performance REST API handling requests."</p>
                                </div>
                                <div className="p-6 bg-purple/5 relative group">
                                    <div className="absolute top-4 right-4 text-xs">✨</div>
                                    <p className="text-[10px] font-black text-purple uppercase tracking-widest mb-3">AI Optimized (Recommended)</p>
                                    <p className="text-sm text-white font-bold leading-relaxed">"Engineered a scalable REST API architecture using Node.js, optimizing throughput for 10k+ concurrent requests/day."</p>
                                    <div className="flex gap-2 mt-6">
                                        <button className="flex-1 bg-purple py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-purple/10 border border-purple/30">Accept Optimization</button>
                                        <button className="px-6 border border-border rounded-xl text-[10px] font-black uppercase tracking-widest text-muted">Reject</button>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Full Description */}
                        <section className="bg-card p-10 rounded-[3rem] border border-border opacity-60">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted mb-6 px-2">Matrix Protocol Details</h4>
                            <div className="text-xs leading-relaxed text-muted whitespace-pre-wrap px-2">
                                {selectedJob.description}
                            </div>
                        </section>

                        {/* Resume Version Repository */}
                        <section className="pt-8 border-t border-white/5">
                            <ResumeVersionManager onSelect={(v) => {
                                setTailoredResume(v.content);
                                setChangesMade(["Loaded from repository"]);
                                setShowSmartApply(true);
                            }} />
                        </section>
                    </div>

                    {/* ✨ Sticky Action Footer */}
                    <div className="p-8 pb-10 bg-surface/90 border-t border-border backdrop-blur-xl flex flex-col md:flex-row gap-4 absolute bottom-0 left-0 w-full z-10 shadow-[0_-20px_40px_rgba(0,0,0,0.5)]">
                        <button
                            onClick={() => onAddToTracker({ ...selectedJob, optimize: true })}
                            className="bg-purple py-5 rounded-[2rem] text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-purple/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 group flex-1"
                        >
                            <span className="text-base group-hover:rotate-12 transition-transform">🪄</span>
                            <span>Optimize & Align Profile</span>
                        </button>

                        <button
                            onClick={() => window.open(selectedJob.link, "_blank")}
                            className="bg-accent py-5 rounded-[2rem] text-black text-[10px] font-black uppercase tracking-widest shadow-lg shadow-accent/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 group flex-1"
                        >
                            <span>Apply Now</span>
                            <span className="text-lg group-hover:translate-x-1 transition-transform">→</span>
                        </button>

                        <button
                            onClick={() => { onAddToTracker(selectedJob); setSelectedJob(null); }}
                            className="bg-white/5 border border-white/10 hover:bg-white/10 px-6 rounded-[2rem] text-[10px] font-black uppercase tracking-widest text-muted hover:text-white transition-all"
                        >
                            Mark Applied
                        </button>
                    </div>
                </div>
            )}
            {/* Smart Apply Modal Overlay */}
            {showSmartApply && (
                <SmartApplyModal
                    job={selectedJob}
                    tailoredResume={tailoredResume}
                    changesMade={changesMade}
                    analysis={deepAnalysis}
                    streamState={streamState}
                    stage={stage}
                    error={modalError}
                    onRetry={() => {
                        // Resumes from where it failed roughly
                        if (!deepAnalysis) analyzeFitDeep();
                        else if (!tailoredResume) handleTailor(deepAnalysis);
                        else handleFinalDispatch();
                    }}
                    onApprove={handleFinalDispatch}
                    onCancel={() => setShowSmartApply(false)}
                />
            )}
        </div>
    );
}
