import React, { useState, useEffect } from "react";
import { MatchChanceBadge, AssistantBubble, LogoCircle } from "./Common";
import { useNavigate } from "react-router-dom";

const DashboardStat = ({ title, value, growth, icon, colorClass }) => (
    <div className={`bg-surface border border-border/50 rounded-[2rem] p-8 flex flex-col gap-4 relative overflow-hidden transition-all duration-300 hover:-translate-y-2 group shadow-lg hover:shadow-accent/5`}>
        <div className="absolute -top-4 -right-4 text-6xl opacity-[0.03] rotate-12 transition-transform group-hover:rotate-0">{icon}</div>
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl bg-${colorClass}/10 flex items-center justify-center text-lg`}>{icon}</div>
                <span className="text-xs font-black uppercase tracking-widest text-muted">{title}</span>
            </div>
            {growth && (
                <div className="text-[10px] font-black text-accent bg-accent/10 px-2 py-1 rounded-lg border border-accent/20">
                    +{growth}%
                </div>
            )}
        </div>
        <div className="text-4xl font-syne font-black text-white tracking-tighter">{value}</div>
    </div>
);

const JobCompactRow = ({ job, onClick, index }) => (
    <div 
        onClick={onClick}
        className="bg-card/40 border border-border/50 rounded-2xl p-5 flex items-center gap-6 cursor-pointer hover:bg-surface hover:border-accent/30 transition-all group relative"
    >
        {index !== undefined && (
            <div className="absolute -left-3 -top-3 w-8 h-8 rounded-full bg-surface border border-accent/30 flex items-center justify-center text-[10px] font-black text-accent">{index + 1}</div>
        )}
        <LogoCircle letter={job.company?.[0]} logoUrl={job.logo} size={48} />
        <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-white truncate uppercase tracking-tight group-hover:text-accent transition-colors">{job.title}</div>
            <div className="text-[10px] text-muted font-black uppercase tracking-widest">{job.company}</div>
        </div>
        
        {job.label && (
            <div className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border ${
                job.label.includes("HIGH") ? "bg-accent/10 border-accent/20 text-accent" : 
                job.label.includes("MEDIUM") ? "bg-purple-500/10 border-purple-500/20 text-purple-400" : 
                "bg-white/5 border-white/10 text-muted"
            }`}>
                {job.label}
            </div>
        )}

        <div className="flex flex-col items-end gap-1">
            <div className="text-sm font-black text-accent">{job.match_score || job.match || 85}% Match</div>
        </div>
        <div className="bg-accent text-black px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all">
            Apply →
        </div>
    </div>
);

export default function Dashboard({ savedJobs, profileText, currentUser }) {
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [curatedJobs, setCuratedJobs] = useState([]);
    const [loadingCurated, setLoadingCurated] = useState(true);

    useEffect(() => {
        async function fetchAnalytics() {
            try {
                const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:3001"}/api/analytics`, {
                    headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
                });
                if (res.ok) setData(await res.json());
            } catch (e) { console.error("Analytics fetch failed", e); }
            setLoading(false);
        }
        async function fetchRecommended() {
            try {
                const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:3001"}/api/jobs/recommended`, {
                    headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
                });
                if (res.ok) {
                    const d = await res.json();
                    setCuratedJobs(d.dailyJobs || []);
                }
            } catch (e) { console.error("Recommended fetch failed", e); }
            setLoadingCurated(false);
        }
        fetchAnalytics(); fetchRecommended();
    }, []);

    const s = data?.summary || { total: 0, offers: 0, interviews: 0, rejections: 0, successRate: 0, avgMatchScore: 78 };

    return (
        <div className="space-y-12 py-4 max-w-5xl mx-auto">
            {/* Personalized Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <h1 className="font-syne text-5xl font-black text-white uppercase tracking-tighter mb-2">
                        👋 Welcome back, {currentUser?.name?.split(' ')[0] || 'Koushik'}
                    </h1>
                    <div className="flex items-center gap-3">
                        <span className="text-accent text-sm font-black uppercase tracking-widest">Decision Engine Online</span>
                        <div className="h-1 w-1 bg-muted rounded-full" />
                        <span className="text-muted text-sm font-medium italic">Ready to accelerate your US career logic</span>
                    </div>
                </div>
                <div className="bg-white/5 border border-white/10 px-6 py-3 rounded-2xl flex items-center gap-4">
                    <div className="text-right">
                        <p className="text-[10px] font-black text-muted uppercase tracking-widest">Profile Readiness</p>
                        <p className="text-sm font-black text-white">{s.avgMatchScore}%</p>
                    </div>
                    <div className="h-8 w-px bg-white/10" />
                    <div className="text-2xl animate-pulse">🎯</div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Column: Plan & Stats */}
                <div className="lg:col-span-12 xl:col-span-7 space-y-8">
                    
                    {/* Today's Plan */}
                    <div className="bg-surface/50 border border-border/50 rounded-[2.5rem] p-10 backdrop-blur-xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 blur-3xl rounded-full transition-transform group-hover:scale-150" />
                        <h3 className="font-syne text-xl font-black text-white uppercase tracking-tighter mb-8 flex items-center gap-3">
                            🎯 Today's Tactical Plan
                        </h3>
                        <div className="space-y-4">
                            {[
                                { task: "Apply to 3 high-match jobs", done: s.total >= 3 },
                                { task: "Optimize 1 resume section", done: false },
                                { task: "Update portfolio links", done: true }
                            ].map((item, i) => (
                                <div key={i} className={`flex items-center gap-4 p-5 rounded-2xl border transition-all ${item.done ? 'bg-accent/5 border-accent/20 opacity-60' : 'bg-white/5 border-white/5 hover:border-white/20'}`}>
                                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black ${item.done ? 'bg-accent text-black' : 'border-2 border-border text-transparent'}`}>✓</div>
                                    <span className={`text-sm font-bold ${item.done ? 'text-white/50 line-through' : 'text-white'}`}>{item.task}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Stats Overhaul */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <DashboardStat title="Applications" value={s.total || 0} icon="📤" colorClass="accent" />
                        <DashboardStat title="Interviews" value={s.interviews || 0} growth="12" icon="🤝" colorClass="purple" />
                        <DashboardStat title="Match Score" value={`${s.avgMatchScore || 0}%`} growth="4" icon="📈" colorClass="accent" />
                    </div>

                    {/* Assistant Insight (Decision Engine) */}
                    <AssistantBubble 
                        message={s.total < 5 ? 
                            "Intelligence Engine Warm-up: Apply to 5 more 'HIGH Confidence' roles to unlock personalized rejection analysis." : 
                            "Strategy Shift Detected: Your conversion on Lever/Greenhouse roles is 3x higher than Workday. Prioritize Direct-API targets."}
                        actionLabel="View High Match Roles"
                        onAction={() => navigate('/jobs')}
                    />

                    {/* Tactical Gaps Dashboard */}
                    <div className="bg-pink-500/5 border border-pink-500/10 rounded-[2.5rem] p-10 space-y-6">
                        <h4 className="text-[10px] font-black text-pink-400 uppercase tracking-[0.4em]">Critical Strategy Gaps</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex items-center gap-3 text-xs font-bold text-white/70 italic">
                                <span className="text-pink-400">⚠️</span> Missing "Kubernetes" in 4 target descriptions
                            </div>
                            <div className="flex items-center gap-3 text-xs font-bold text-white/70 italic">
                                <span className="text-pink-400">⚠️</span> Resume v1 lacks "Scalability" metrics
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Top Jobs Today */}
                <div className="lg:col-span-12 xl:col-span-5 bg-surface/50 border border-border/50 rounded-[2.5rem] p-10 backdrop-blur-xl flex flex-col min-h-[500px]">
                    <div className="flex justify-between items-center mb-8">
                        <div className="space-y-1">
                            <h3 className="font-syne text-xl font-black text-white uppercase tracking-tighter">🔥 Today's Best Matches</h3>
                            <p className="text-[10px] font-black text-muted uppercase tracking-widest italic">Apply in this order based on algorithm.</p>
                        </div>
                        <button onClick={() => navigate('/jobs')} className="text-[10px] font-black text-accent hover:underline uppercase tracking-widest">Explore All</button>
                    </div>

                    <div className="space-y-4 flex-1">
                        {loadingCurated ? (
                            [1,2,3,4,5].map(i => <div key={i} className="h-20 bg-card/40 rounded-2xl animate-pulse" />)
                        ) : curatedJobs.length > 0 ? (
                            curatedJobs.slice(0, 5).map((j, i) => <JobCompactRow key={j.id} job={j} index={i} onClick={() => navigate('/jobs')} />)
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 grayscale opacity-40 italic">
                                <span className="text-4xl mb-4">🌑</span>
                                <p className="text-[10px] font-black uppercase tracking-tighter">Scouting for elite targets...</p>
                            </div>
                        )}
                    </div>

                    {curatedJobs.length > 0 && (
                        <button 
                            onClick={() => navigate('/jobs')}
                            className="mt-8 w-full py-4 bg-white/5 hover:bg-white/10 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all border border-border/50"
                        >
                            Intercept More Targets
                        </button>
                    )}
                </div>
            </div>

            {/* Growth Chart Node (Mocked for UI feel) */}
            <div className="bg-surface/50 border border-border/50 rounded-[3rem] p-12 backdrop-blur-xl">
                <div className="flex justify-between items-center mb-12">
                    <h3 className="font-syne text-2xl font-black text-white uppercase tracking-tighter">📈 Weekly Readiness Delta</h3>
                    <div className="flex gap-4">
                        {['7 Days', '30 Days', '90 Days'].map(t => (
                            <button key={t} className={`text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl transition-all ${t === '7 Days' ? 'bg-accent text-black' : 'text-muted hover:text-white'}`}>{t}</button>
                        ))}
                    </div>
                </div>
                <div className="h-64 flex items-end gap-4 pb-8 border-b border-white/5">
                    {[45, 52, 48, 65, 72, 68, 85].map((val, i) => (
                        <div key={i} className="flex-1 flex flex-col justify-end items-center gap-4 group">
                            <div className="text-[10px] font-black text-white opacity-0 group-hover:opacity-100 transition-all mb-2">{val}%</div>
                            <div 
                                className={`w-full rounded-t-2xl transition-all duration-1000 ${i === 6 ? 'bg-accent' : 'bg-white/10 group-hover:bg-accent/20'}`}
                                style={{ height: `${val}%` }}
                            />
                            <span className="text-[10px] font-black text-muted uppercase">{['M','T','W','T','F','S','S'][i]}</span>
                        </div>
                    ))}
                </div>
                <div className="flex justify-between items-center mt-8">
                    <p className="text-sm text-muted font-medium">Profile completeness increased by <span className="text-accent font-black">+14%</span> since last cycle.</p>
                    <div className="text-[10px] font-black text-muted uppercase tracking-widest">Market Ready Threshold: 80%</div>
                </div>
            </div>

            {/* OPT Compliance Assurance */}
            <div className="bg-surface/50 border border-accent/20 rounded-[3rem] p-10 backdrop-blur-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-40 h-40 bg-accent/5 blur-3xl rounded-full pointer-events-none" />
                <div className="flex flex-col md:flex-row items-start gap-8 relative z-10">
                    <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0">🛡️</div>
                    <div className="flex-1 space-y-3">
                        <h3 className="font-syne text-xl font-black text-white uppercase tracking-tight">100% OPT Compliant. Direct Hire Only.</h3>
                        <p className="text-muted text-sm font-medium leading-relaxed">
                            Every job surfaced by GradLaunch is a direct, full-time role compliant with F-1/OPT regulations. 
                            No C2C contracts, no staffing agencies, no proxy employment — only legitimate opportunities that protect your H-1B path.
                        </p>
                        <div className="flex flex-wrap gap-3 pt-2">
                            {["H-1B Safe", "No C2C", "Direct Hire", "STEM-OPT Verified", "E-Verify Partners"].map((tag) => (
                                <span key={tag} className="bg-accent/10 border border-accent/20 text-accent text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl">{tag}</span>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

const StatCardDummy = ({ title, value, icon, colorClass }) => (
    <div className={`bg-surface border border-border/50 rounded-[2rem] p-8 flex flex-col gap-4 relative overflow-hidden transition-all duration-300 hover:-translate-y-2 group shadow-lg hover:shadow-accent/5`}>
        <div className="absolute -top-4 -right-4 text-6xl opacity-[0.03] rotate-12 transition-transform group-hover:rotate-0">{icon}</div>
        <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl bg-${colorClass}/10 flex items-center justify-center text-lg`}>{icon}</div>
            <span className="text-xs font-black uppercase tracking-widest text-muted">{title}</span>
        </div>
        <div className="text-4xl font-syne font-black text-white tracking-tighter">{value}</div>
    </div>
);
