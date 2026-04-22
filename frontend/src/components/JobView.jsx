import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { TagBadge, LogoCircle, MatchBadgeLarge, MatchChanceBadge, AssistantBubble } from "./Common";
import MatchBreakdown from "./MatchBreakdown";

export default function JobView({ onAddToTracker }) {
    const { id } = useParams();
    const navigate = useNavigate();
    const [job, setJob] = useState(null);
    const [loading, setLoading] = useState(true);
    const [analysis, setAnalysis] = useState(null);
    const [analyzing, setAnalyzing] = useState(false);
    const [analysisError, setAnalysisError] = useState(null);

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
        setAnalysisError(null);
        try {
            const apiBase = import.meta.env.VITE_API_URL || "http://localhost:3001";
            const token = localStorage.getItem("token");
            const res = await fetch(`${apiBase}/api/ai/analyze-job`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({ job }),
            });
            if (!res.ok) throw new Error(`Analysis failed (${res.status})`);
            const data = await res.json();
            setAnalysis(data);
        } catch (err) {
            console.error("Analyze-fit failed", err);
            setAnalysisError(err.message || "Failed to analyze fit.");
        } finally {
            setAnalyzing(false);
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh] flex-col gap-6">
                <div className="w-16 h-16 border-4 border-accent border-t-transparent rounded-full animate-spin" />
                <p className="text-muted font-syne font-black uppercase tracking-widest text-sm italic">Synchronizing Matrix...</p>
            </div>
        );
    }

    if (!job) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-12">
                <div className="text-6xl mb-8">🚫</div>
                <h2 className="text-3xl font-black font-syne italic uppercase tracking-tighter text-white mb-4">Protocol Terminated: Target Lost</h2>
                <button onClick={() => navigate("/jobs")} className="bg-accent px-10 py-4 rounded-[1.5rem] font-black text-black uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all">Return to Matrix</button>
            </div>
        );
    }

    const title = `${job.title} at ${job.company} | GradLaunch`;
    const match = job.match || 75;

    return (
        <div className="max-w-6xl mx-auto space-y-12 pb-48 animate-fade-in px-4">
            <Helmet>
                <title>{title}</title>
            </Helmet>

            <button onClick={() => navigate("/jobs")} className="flex items-center gap-3 text-muted hover:text-white font-black text-[10px] uppercase tracking-widest transition-all group/back">
                <span className="group-hover/back:-translate-x-1 transition-transform">←</span> Back to Job Matrix
            </button>

            {/* Header / Identity */}
            <div className="flex flex-col lg:flex-row items-start gap-10">
                <LogoCircle letter={job.company?.[0]} logoUrl={job.logo} size={120} />
                <div className="flex-1 space-y-4">
                    <div className="flex flex-wrap items-center gap-4">
                        <h1 className="text-5xl lg:text-7xl font-black font-syne uppercase tracking-tighter text-white">{job.title}</h1>
                    </div>
                    <div className="flex flex-wrap items-center gap-6 text-2xl text-muted font-medium italic">
                        <span>{job.company}</span>
                        <span className="w-2 h-2 rounded-full bg-border" />
                        <span>{job.location}</span>
                        {job.salary && (
                            <>
                                <span className="w-2 h-2 rounded-full bg-border" />
                                <span className="text-accent font-black">{job.salary}</span>
                            </>
                        )}
                    </div>
                    <div className="flex flex-wrap gap-3 pt-4">
                        {job.tags?.map(t => <TagBadge key={t} label={t} />)}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
                {/* Left: Job Intelligence */}
                <div className="lg:col-span-8 space-y-16">
                    <section>
                        <h3 className="text-[10px] font-black text-accent uppercase tracking-[0.4em] mb-10 font-syne">Target Description</h3>
                        <div className="text-white/80 text-lg leading-relaxed space-y-6 font-medium italic whitespace-pre-wrap card-glass p-8 lg:p-12 rounded-[3rem] border border-border/50">
                            {job.description}
                        </div>
                    </section>
                </div>

                {/* Right: Decision Engine */}
                <div className="lg:col-span-4 space-y-8">
                    <div className="bg-surface border border-border/50 rounded-[3rem] p-8 lg:p-10 space-y-8 sticky top-10">
                        <div className="space-y-4">
                            <MatchBadgeLarge score={analysis?.matchScore ?? match} />
                            <MatchChanceBadge score={analysis?.matchScore ?? match} />
                        </div>

                        {!analysis && !analyzing && (
                            <div className="space-y-6">
                                <p className="text-muted text-[11px] font-bold italic leading-relaxed">
                                    System is awaiting deep semantic alignment analysis...
                                </p>
                                <button onClick={analyzeFit} disabled={analyzing}
                                    className="w-full bg-accent/10 border border-accent/30 text-accent py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-accent hover:text-black transition-all disabled:opacity-50">
                                    ✨ Generate AI Insight
                                </button>
                                {analysisError && (
                                    <p className="text-[11px] text-pink-400 italic">{analysisError}</p>
                                )}
                            </div>
                        )}

                        {analyzing && (
                            <div className="flex items-center justify-center py-10">
                                <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin" />
                            </div>
                        )}

                        {analysis && (
                            <div className="animate-fade-in">
                                <MatchBreakdown analysis={analysis} compact />
                                <button onClick={analyzeFit}
                                    className="mt-6 w-full text-[10px] font-black uppercase tracking-widest text-muted hover:text-accent transition-all">
                                    ↻ Re-analyze
                                </button>
                            </div>
                        )}

                        <div className="pt-6 border-t border-border/50 space-y-3 text-[11px] font-black uppercase tracking-widest text-muted">
                            <div className="flex justify-between"><span>Type:</span> <span className="text-white">{job.type}</span></div>
                            <div className="flex justify-between"><span>Visa:</span> <span className="text-accent">{analysis?.sponsorshipIntel ? "See Visa Intel" : "OPT/H1B Friendly"}</span></div>
                            {analysis?.ats_type && (
                                <div className="flex justify-between"><span>ATS:</span> <span className="text-white uppercase">{analysis.ats_type}</span></div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* ✨ Sticky Global Action Footer */}
            <div className="fixed bottom-10 left-1/2 -translate-x-1/2 w-full max-w-4xl px-8 z-[50] animate-slide-up">
                <div className="bg-surface/80 backdrop-blur-3xl border border-white/10 rounded-[3rem] p-5 flex flex-col md:flex-row gap-4 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
                    <button 
                        onClick={() => {
                            onAddToTracker({ ...job, match: match });
                            navigate("/tracker");
                        }}
                        className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 py-5 rounded-[2rem] text-[10px] font-black uppercase tracking-widest text-white transition-all"
                    >
                        Push to Tracker
                    </button>
                    
                    <button 
                        onClick={() => window.open(job.link, "_blank")}
                        className="flex-[1.5] bg-accent py-5 rounded-[2rem] text-[10px] font-black uppercase tracking-widest text-black shadow-lg shadow-accent/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                    >
                        Execute Application Now →
                    </button>
                </div>
            </div>
        </div>
    );
}
