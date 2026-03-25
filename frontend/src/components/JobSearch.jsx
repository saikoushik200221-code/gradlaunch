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
                                        <div className="flex gap-2">
                                            {job.is_trusted === 1 && <TrustBadge />}
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
                        {/* 🎯 Decision Panel */}
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
        </div>
    );
}
