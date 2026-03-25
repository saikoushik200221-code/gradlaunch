import React, { useState, useEffect } from "react";
import { TagBadge, LogoCircle, MatchRing, SkeletonCard, EmptyState, TrustBadge, RecentlyPostedBadge } from "./Common";

export default function JobSearch({ onAddToTracker, onToggleSave, savedJobs, profileText, C }) {
    const [jobs, setJobs] = useState([]);
    const [loadingJobs, setLoadingJobs] = useState(false);
    const [search, setSearch] = useState("");
    const [filters, setFilters] = useState({ newGrad: false, h1b: false, opt: false, remote: false, trustedOnly: false });
    const [selectedJob, setSelectedJob] = useState(null);
    const [analysis, setAnalysis] = useState(null);
    const [analyzing, setAnalyzing] = useState(false);
    const [resolvedLink, setResolvedLink] = useState(null);
    const [showSavedOnly, setShowSavedOnly] = useState(false);
    const [retryCount, setRetryCount] = useState(0);
    const [lastUpdated, setLastUpdated] = useState(null);

    const isSaved = (jobId) => savedJobs?.some(sj => sj.id === jobId);

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
                    if (!data || data.length === 0) {
                        retryTimer = setTimeout(() => setRetryCount(c => c + 1), 10000);
                    }
                }
            } catch (e) {
                console.warn("Backend connection failed. Retrying...");
                retryTimer = setTimeout(() => setRetryCount(c => c + 1), 15000);
            }
            if (!silent) setLoadingJobs(false);
        }
        const debounce = setTimeout(() => fetchJobs(false), 300);
        const autoRefresh = setInterval(() => fetchJobs(true), 10 * 60 * 1000);
        return () => { clearTimeout(debounce); clearInterval(autoRefresh); if (retryTimer) clearTimeout(retryTimer); };
    }, [search, filters.remote, filters.newGrad, filters.trustedOnly, filters.opt, retryCount]);

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
                readinessScore: data.readinessScore || 70,
                missingSkills: data.missingSkills || [],
                suggestions: data.suggestions || [],
                whyFit: data.whyFit || ["Matches your core stack."]
            });
        } catch (e) { setAnalysis({ score: selectedJob.match, whyFit: ["Could not connect to AI."] }); }
        setAnalyzing(false);
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
                        ["remote", "🏠 Remote"],
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
                        onClick={() => setShowSavedOnly(!showSavedOnly)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold border ml-auto transition-all ${showSavedOnly ? 'bg-purple/20 border-purple text-purple' : 'bg-card border-border text-muted'}`}
                    >
                        {showSavedOnly ? "📚 Saved Only" : "🔖 View Saved"}
                    </button>
                    <button onClick={() => setRetryCount(c => c + 1)} className="p-2 border border-border rounded-xl text-muted hover:text-accent transition-colors">🔄</button>
                </div>
            </div>

            {/* Job Grid */}
            <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
                {loadingJobs ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-6">
                        {[1, 2, 3, 4, 5, 6].map(i => <SkeletonCard key={i} />)}
                    </div>
                ) : filtered.length === 0 ? (
                    <EmptyState icon="🔍" title="No results found" description="Try broadening your search or clearing filters." />
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-6">
                        {filtered.map(job => (
                            <div
                                key={job.id}
                                onClick={() => setSelectedJob(job)}
                                className={`group relative bg-card/40 border border-border hover:border-accent/40 rounded-3xl p-6 cursor-pointer transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:-translate-y-1 ${selectedJob?.id === job.id ? 'ring-2 ring-accent border-transparent bg-card/80' : ''}`}
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <LogoCircle 
                                        letter={job.logo?.length === 1 ? job.logo : job.company?.charAt(0).toUpperCase()} 
                                        logoUrl={job.logo?.startsWith("http") ? job.logo : null} 
                                        size={56} 
                                    />
                                    <div className="flex gap-2">
                                        {job.is_trusted === 1 && <TrustBadge />}
                                        {(Date.now() - job.posted_value < 48 * 60 * 60 * 1000) && <RecentlyPostedBadge />}
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); onToggleSave(job); }}
                                            className={`p-2 rounded-xl transition-all ${isSaved(job.id) ? 'text-accent bg-accent/10' : 'text-muted hover:bg-white/5'}`}
                                        >
                                            {isSaved(job.id) ? "🔖" : "➕"}
                                        </button>
                                    </div>
                                </div>

                                <h3 className="text-lg font-bold font-syne group-hover:text-accent transition-colors truncate">{job.title}</h3>
                                <div className="flex items-center gap-2 mt-1 mb-4">
                                    <span className="text-muted font-bold tracking-tight">{job.company}</span>
                                    {job.company_type !== 'Company' && (
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest ${job.company_type === 'Big MNC' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-orange-500/10 text-orange-400 border border-orange-500/20'}`}>
                                            {job.company_type}
                                        </span>
                                    )}
                                </div>

                                <div className="flex flex-wrap gap-2 mt-auto">
                                    {job.tags.slice(0, 3).map(t => <TagBadge key={t} label={t} />)}
                                    {job.match && <div className="ml-auto flex items-center gap-1.5 text-xs font-bold text-accent bg-accent/5 px-2.5 py-1 rounded-lg">⭐ {job.match}%</div>}
                                </div>
                            </div>
                        ))}
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
                                <p className="text-lg text-muted font-medium">{selectedJob.company} • {selectedJob.location}</p>
                            </div>
                        </div>
                        <button onClick={() => setSelectedJob(null)} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all text-xl">✕</button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
                        {/* Match & AI Section */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-inter">
                            <div className="bg-card/50 border border-border p-6 rounded-[2.5rem]">
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="text-xs font-black uppercase tracking-widest text-muted">Match Score</h4>
                                    <div className="bg-accent/10 text-accent px-3 py-1 rounded-full text-xs font-black tracking-tighter">PREMIUM</div>
                                </div>
                                <div className="flex items-end gap-3">
                                    <span className="text-6xl font-black text-accent">{analysis?.score || selectedJob.match || 70}%</span>
                                    <span className="text-xs text-muted font-bold mb-2 uppercase">Semantic Match</span>
                                </div>
                                <div className="mt-4 h-2 w-full bg-white/5 rounded-full overflow-hidden">
                                    <div className="h-full bg-accent transition-all duration-1000" style={{ width: `${analysis?.score || selectedJob.match || 70}%` }} />
                                </div>
                            </div>

                            <div className="bg-card/50 border border-border p-6 rounded-[2.5rem]">
                                <h4 className="text-xs font-black uppercase tracking-widest text-muted mb-4">Readiness</h4>
                                {analyzing ? (
                                    <div className="flex flex-col items-center justify-center py-4 gap-3">
                                        <div className="animate-spin text-accent text-3xl">✦</div>
                                        <span className="text-[10px] font-black uppercase tracking-tighter text-accent">Orion AI Thinking...</span>
                                    </div>
                                ) : !analysis ? (
                                    <button onClick={analyzeFit} className="w-full h-full min-h-[100px] flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border hover:border-accent group rounded-3xl transition-all">
                                        <span className="text-xl group-hover:scale-125 transition-transform">✨</span>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-muted group-hover:text-accent">Generate Analysis</span>
                                    </button>
                                ) : (
                                    <div className="flex items-center gap-4 h-full">
                                        <div className="relative h-20 w-20 flex items-center justify-center">
                                            <svg className="h-full w-full -rotate-90">
                                                <circle cx="40" cy="40" r="36" fill="transparent" stroke="currentColor" strokeWidth="8" className="text-white/5" />
                                                <circle cx="40" cy="40" r="36" fill="transparent" stroke="currentColor" strokeWidth="8" strokeDasharray={`${2 * Math.PI * 36}`} strokeDashoffset={`${2 * Math.PI * 36 * (1 - (analysis.readinessScore || 70) / 100)}`} className="text-purple stroke-linecap-round" />
                                            </svg>
                                            <span className="absolute text-xl font-black text-white">{analysis.readinessScore || 70}%</span>
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-muted uppercase tracking-tighter">Application Ready</p>
                                            <p className="text-xs text-purple/80 mt-1 font-medium italic leading-tight">"Tailor skills to hit 90%+"</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* AI Insights Panel */}
                        {analysis && (
                            <div className="space-y-6 animate-fade-in">
                                <section>
                                    <h4 className="text-xs font-black uppercase tracking-[0.2em] text-accent mb-4">Why This Job Fits You</h4>
                                    <div className="grid gap-3">
                                        {analysis.whyFit?.map((point, i) => (
                                            <div key={i} className="flex gap-4 items-start bg-accent/5 p-4 rounded-2xl border border-accent/10">
                                                <span className="text-accent text-lg">✦</span>
                                                <p className="text-sm font-medium leading-relaxed">{point}</p>
                                            </div>
                                        ))}
                                    </div>
                                </section>

                                {analysis.missingSkills?.length > 0 && (
                                    <section>
                                        <h4 className="text-xs font-black uppercase tracking-[0.2em] text-pink mb-4">Missing Skills (Gap Analysis)</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {analysis.missingSkills.map(s => (
                                                <span key={s} className="px-4 py-1.5 bg-pink/10 border border-pink/30 text-pink rounded-xl text-xs font-bold">{s}</span>
                                            ))}
                                        </div>
                                    </section>
                                )}

                                <button 
                                    onClick={() => onAddToTracker({ ...selectedJob, optimize: true })}
                                    className="w-full bg-gradient-to-r from-purple to-pink py-5 rounded-[2rem] text-sm font-black uppercase tracking-widest shadow-lg shadow-purple/20 hover:shadow-purple/40 hover:-translate-y-1 transition-all"
                                >
                                    🪄 Optimize My Resume with AI
                                </button>
                            </div>
                        )}

                        {/* Job Description */}
                        <section className="bg-card p-8 rounded-[3rem] border border-border">
                            <h4 className="text-xs font-black uppercase tracking-[0.2em] text-muted mb-6">Original Job Description</h4>
                            <div className="prose prose-invert max-w-none text-sm leading-relaxed text-muted whitespace-pre-wrap">
                                {selectedJob.description}
                            </div>
                        </section>
                    </div>

                    {/* Drawer Footer Actions */}
                    <div className="p-8 bg-surface/80 border-t border-border backdrop-blur-md flex gap-4">
                        <button
                            onClick={() => window.open(resolvedLink || selectedJob.link, "_blank")}
                            className="flex-1 bg-accent py-5 rounded-[2rem] text-black text-sm font-black uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 group"
                        >
                            <span>Apply Directly</span>
                            <span className="group-hover:translate-x-1 duration-300">→</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
