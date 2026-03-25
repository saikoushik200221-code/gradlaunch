import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { TagBadge, LogoCircle } from "./Common";

export default function JobView({ onAddToTracker }) {
    const { id } = useParams();
    const navigate = useNavigate();
    const [job, setJob] = useState(null);
    const [loading, setLoading] = useState(true);
    const [analysis, setAnalysis] = useState(null);
    const [analyzing, setAnalyzing] = useState(false);

    useEffect(() => {
        async function fetchJob() {
            setLoading(true);
            try {
                const apiBase = import.meta.env.VITE_API_URL || "http://localhost:3001";
                const res = await fetch(`${apiBase}/api/jobs/${id}`);
                if (res.ok) {
                    const data = await res.json();
                    setJob(data);
                }
            } catch (err) { console.error("Failed to load job:", err); }
            setLoading(false);
        }
        fetchJob();
    }, [id]);

    async function analyzeFit() {
        if (!job) return;
        setAnalyzing(true);
        setTimeout(() => {
            setAnalysis({
                score: job.match || 88,
                reasons: [
                    "Strong semantic alignment with Node.js and React expertise.",
                    "Geographic relevance in your target tech hub.",
                    "Experience with similar scale (Startup focus)."
                ]
            });
            setAnalyzing(false);
        }, 1200);
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh] flex-col gap-6">
                <div className="w-16 h-16 border-4 border-accent border-t-transparent rounded-full animate-spin" />
                <p className="text-muted font-syne font-black uppercase tracking-widest text-sm italic">Decompressing Job Matrix...</p>
            </div>
        );
    }

    if (!job) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-12">
                <div className="text-6xl mb-8">🚫</div>
                <h2 className="text-3xl font-black font-syne italic uppercase tracking-tighter text-white mb-4">Protocol Terminated: Job Not Found</h2>
                <button onClick={() => navigate("/")} className="bg-accent px-10 py-4 rounded-[1.5rem] font-black text-black uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all">Return to Command Center</button>
            </div>
        );
    }

    const title = `${job.title} at ${job.company} | GradLaunch`;
    const description = `Apply for the ${job.title} role at ${job.company} in ${job.location}. ${job.type}. ${job.salary}. Find your next tech career on GradLaunch!`;

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-32 animate-fade-in">
            <Helmet>
                <title>{title}</title>
                <meta name="description" content={description} />
                <meta property="og:title" content={title} />
                <meta property="og:description" content={description} />
                <meta property="og:type" content="website" />
            </Helmet>

            {/* Header Workspace */}
            <div className="bg-surface/50 border border-border/50 rounded-[3rem] overflow-hidden shadow-2xl">
                <div className="bg-gradient-to-tr from-accent/10 to-purple-500/10 p-12 lg:p-16 border-b border-border/50 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-12 text-8xl opacity-5 group-hover:scale-110 transition-transform duration-1000 grayscale group-hover:grayscale-0">🚀</div>
                    
                    <button onClick={() => navigate("/jobs")} className="flex items-center gap-3 text-muted hover:text-white font-black text-[10px] uppercase tracking-widest transition-all mb-10 group/back">
                        <span className="group-hover/back:-translate-x-1 transition-transform">←</span> Return to Matrix
                    </button>

                    <div className="flex flex-col lg:flex-row items-start gap-10">
                        <LogoCircle letter={job.logo} size={100} />
                        <div className="flex-1 space-y-4 min-w-0">
                            <div className="flex flex-wrap items-center gap-4">
                                <h1 className="text-4xl lg:text-5xl font-black font-syne italic uppercase tracking-tighter text-white truncate">{job.title}</h1>
                                {job.is_trusted === 1 && <div className="bg-accent border border-accent/20 text-black text-[9px] font-black px-4 py-1.5 rounded-full uppercase tracking-tighter shadow-lg shadow-accent/20">Verified Path</div>}
                            </div>
                            <div className="flex flex-wrap items-center gap-6 text-xl text-muted font-medium italic">
                                <span>{job.company}</span>
                                <span className="w-1.5 h-1.5 rounded-full bg-border" />
                                <span>{job.location}</span>
                                <span className="w-1.5 h-1.5 rounded-full bg-border" />
                                <span className="text-green-400 font-bold">{job.salary || "Competitive Market Rate"}</span>
                            </div>
                            <div className="flex flex-wrap gap-3 pt-2">
                                {job.tags?.map(t => <TagBadge key={t} label={t} />)}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Content Matrix */}
                <div className="p-12 lg:p-16 grid grid-cols-1 lg:grid-cols-3 gap-16">
                    <div className="lg:col-span-2 space-y-12">
                        <section>
                            <h3 className="text-[11px] font-black text-accent uppercase tracking-[0.4em] mb-8 font-syne italic">Protocol Description</h3>
                            <div className="text-white/80 text-lg leading-relaxed space-y-6 font-medium italic whitespace-pre-wrap">
                                {job.description}
                            </div>
                        </section>

                        <section>
                            <h3 className="text-[11px] font-black text-accent uppercase tracking-[0.4em] mb-8 font-syne italic">Required Skill Vectors</h3>
                            <div className="flex flex-wrap gap-4">
                                {job.skills?.map(s => (
                                    <span key={s} className="bg-card px-6 py-3 rounded-2xl border border-border/50 text-white font-black text-[11px] uppercase tracking-widest hover:border-accent/40 transition-all cursor-default">
                                        {s}
                                    </span>
                                ))}
                            </div>
                        </section>
                    </div>

                    {/* Sidebar / AI Intelligence */}
                    <div className="space-y-8">
                        <div className="bg-accent/5 border border-accent/20 rounded-[2.5rem] p-8 space-y-8 group hover:bg-accent/10 transition-all">
                            <h3 className="text-[10px] font-black text-accent uppercase tracking-[0.3em] font-syne italic mb-4">Orion Match Intelligence</h3>
                            {!analysis ? (
                                <div className="space-y-6">
                                    <p className="text-muted text-xs font-medium italic leading-relaxed">System is awaiting deep analysis. Initiate to simulate your success probability within this job matrix.</p>
                                    <button onClick={analyzeFit} disabled={analyzing} className="w-full bg-accent py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest text-black shadow-lg shadow-accent/10 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50">
                                        {analyzing ? "Simulating Readiness..." : "✨ Calculate Readiness"}
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-8 animate-fade-in">
                                    <div className="flex items-end gap-2">
                                        <span className="text-5xl font-black font-syne italic text-accent leading-none">{analysis.score}%</span>
                                        <span className="text-[9px] font-black text-muted uppercase tracking-widest mb-1">Optimized Fit</span>
                                    </div>
                                    <div className="space-y-4">
                                        {analysis.reasons.map((r, i) => (
                                            <div key={i} className="flex gap-4 items-start border-l-2 border-accent/30 pl-4 py-1">
                                                <p className="text-xs text-white/90 font-medium italic leading-relaxed">{r}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="bg-white/5 border border-border/50 rounded-[2.5rem] p-8 space-y-6">
                            <h3 className="text-[10px] font-black text-muted uppercase tracking-[0.3em] font-syne italic mb-4">Application Intel</h3>
                            <div className="space-y-4 text-[11px] font-bold text-muted italic">
                                <div className="flex justify-between"><span>Type:</span> <span className="text-white">{job.type}</span></div>
                                <div className="flex justify-between"><span>Location:</span> <span className="text-white">{job.location}</span></div>
                                <div className="flex justify-between"><span>Visa Check:</span> <span className="text-accent">OPT Friendly</span></div>
                                <div className="flex justify-between"><span>Posted:</span> <span className="text-white">Active Matrix</span></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Sticky Action Footer */}
            <div className="fixed bottom-10 left-1/2 -translate-x-1/2 w-full max-w-4xl px-8 z-[50] animate-slide-up">
                <div className="bg-surface/80 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-4 flex flex-col md:flex-row gap-4 shadow-2xl shadow-black/50 overflow-hidden relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-accent/0 via-accent/5 to-accent/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                    
                    <button 
                        onClick={() => {
                            onAddToTracker({ ...job, wishlist: true, match: analysis?.score || job.match || 85 });
                            navigate("/tracker");
                        }}
                        className="flex-1 bg-white/5 hover:bg-white/10 border border-white/5 py-5 rounded-[1.8rem] text-xs font-black uppercase tracking-widest text-white transition-all active:scale-[0.98]"
                    >
                        Bookmark System
                    </button>
                    
                    {job.link && (
                        <button 
                            onClick={() => window.open(job.link, "_blank")}
                            className="flex-1 bg-transparent border border-accent/40 hover:border-accent text-accent py-5 rounded-[1.8rem] text-xs font-black uppercase tracking-widest transition-all active:scale-[0.98]"
                        >
                            Open Pipeline
                        </button>
                    )}

                    <button 
                        onClick={() => {
                            onAddToTracker({ ...job, match: analysis?.score || job.match || 85 });
                            navigate("/resume");
                        }}
                        className="flex-[1.5] bg-accent py-5 rounded-[1.8rem] text-xs font-black uppercase tracking-widest text-black shadow-lg shadow-accent/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                    >
                        Apply & Tailor Protocol
                    </button>
                </div>
            </div>
        </div>
    );
}
