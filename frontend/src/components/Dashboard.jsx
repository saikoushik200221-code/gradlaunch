import React, { useState, useEffect } from "react";

const StatCard = ({ title, value, icon, colorClass }) => (
    <div className={`bg-surface border border-border/50 rounded-[2rem] p-8 flex flex-col gap-4 relative overflow-hidden transition-all duration-300 hover:-translate-y-2 hover:border-${colorClass}/30 hover:shadow-[0_20px_40px_-15px_rgba(200,255,0,0.1)] group`}>
        <div className="absolute -top-4 -right-4 text-7xl opacity-[0.03] rotate-12 transition-transform group-hover:rotate-0">{icon}</div>
        <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl bg-${colorClass}/10 flex items-center justify-center text-lg`}>{icon}</div>
            <span className="text-xs font-black uppercase tracking-widest text-muted">{title}</span>
        </div>
        <div className="text-4xl font-syne font-black text-white tracking-tighter">{value}</div>
    </div>
);

const ChartBar = ({ label, value, max, color }) => {
    const percentage = max > 0 ? (value / max) * 100 : 0;
    return (
        <div className="mb-6">
            <div className="flex justify-between mb-2 text-[10px] font-black uppercase tracking-widest text-muted">
                <span className="text-white">{label}</span>
                <span className="text-accent">{value}</span>
            </div>
            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full transition-all duration-1000 ease-out" 
                  style={{ width: `${percentage}%`, backgroundColor: color }}
                />
            </div>
        </div>
    );
};

const JobCuratedCard = ({ job }) => (
    <div 
        onClick={() => window.open(job.link, "_blank")}
        className="bg-card/40 border border-border/50 rounded-2xl p-5 flex items-center gap-4 cursor-pointer hover:bg-surface hover:border-accent/30 transition-all hover:translate-x-1"
    >
        <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center text-sm font-black text-accent">{job.company?.[0]}</div>
        <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-white truncate uppercase tracking-tight">{job.title}</div>
            <div className="text-[10px] text-muted font-black uppercase tracking-widest">{job.company} • {job.location}</div>
        </div>
        <div className="text-sm font-black text-accent">{job.match_score || 85}%</div>
    </div>
);

export default function Dashboard({ savedJobs, profileText }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [strategy, setStrategy] = useState("");
    const [generatingStrategy, setGeneratingStrategy] = useState(false);
    const [curatedJobs, setCuratedJobs] = useState([]);
    const [loadingCurated, setLoadingCurated] = useState(true);

    const getTopMissingSkills = () => {
        if (!savedJobs || savedJobs.length === 0 || !profileText) return [];
        const userSkills = profileText.toLowerCase();
        const counts = {};
        savedJobs.forEach(job => {
            if (job.skills) {
                job.skills.forEach(skill => {
                    if (!userSkills.includes(skill.toLowerCase())) {
                        counts[skill] = (counts[skill] || 0) + 1;
                    }
                });
            }
        });
        return Object.entries(counts).sort((a,b) => b[1] - a[1]).slice(0, 3).map(([skill]) => skill);
    };

    const topMissing = getTopMissingSkills();

    const generateSkillStrategy = async () => {
        if (topMissing.length === 0) return;
        setGeneratingStrategy(true);
        try {
            const apiBase = import.meta.env.VITE_API_URL || "http://localhost:3001";
            const res = await fetch(`${apiBase}/api/ai/match`, { // Re-using match endpoint for strategy to stay within protected limits
              method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${localStorage.getItem("token")}` },
              body: JSON.stringify({ resume: profileText, jobDescription: `Skills missing: ${topMissing.join(', ')}. Strategy needed.` })
            });
            const d = await res.json();
            setStrategy(d.analysis || "Focus on building a portfolio project demonstrating use of these missing libraries/tools first.");
        } catch (e) { setStrategy("Failed to reach AI advisor."); }
        setGeneratingStrategy(false);
    };

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
        async function fetchCurated() {
            try {
                const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:3001"}/api/jobs/curated`, {
                    headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
                });
                if (res.ok) setCuratedJobs(await res.json());
            } catch (e) { console.error("Curated fetch failed", e); }
            setLoadingCurated(false);
        }
        fetchAnalytics(); fetchCurated();
    }, []);

    if (loading) return (
        <div className="space-y-8 py-6 animate-pulse">
            <div className="h-10 bg-surface w-48 rounded-2xl" />
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-surface rounded-[2rem] border border-border/50" />)}
            </div>
            <div className="h-64 bg-surface rounded-[2rem]" />
        </div>
    );

    const s = data?.summary || { total: 0, offers: 0, interviews: 0, rejections: 0, successRate: 0, avgMatchScore: 0 };
    const stages = data?.stages || [];
    const maxStages = stages.length > 0 ? Math.max(...stages.map(st => st.count || 0)) : 1;
    const scores = data?.scores || [];
    const maxCount = scores.length > 0 ? Math.max(...scores.map(sd => sd.count || 0)) : 1;

    return (
        <div className="space-y-12 py-4">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="font-syne text-4xl font-black text-white uppercase tracking-tighter mb-2">Carrier Insights</h1>
                    <p className="text-muted font-medium italic">Real-time metrics for your high-trust job hunt journey</p>
                </div>
                <div className="bg-accent/10 text-accent font-black uppercase tracking-[0.2em] text-[10px] px-6 py-2 rounded-full border border-accent/20">
                    Live Data Pipeline
                </div>
            </div>

            {/* Top Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <StatCard title="Total Decrypted" value={s.total || 0} icon="📤" colorClass="accent" />
                <StatCard title="Interviews" value={s.interviews || 0} icon="🤝" colorClass="purple" />
                <StatCard title="Offers Found" value={s.offers || 0} icon="🎉" colorClass="pink" />
                <StatCard title="Efficiency" value={`${s.successRate || 0}%`} icon="📈" colorClass="accent" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Column: Pipeline & Skill Dist */}
                <div className="lg:col-span-7 space-y-8">
                    {/* Pipeline Health */}
                    <div className="bg-surface/50 border border-border/50 rounded-[2.5rem] p-10 backdrop-blur-xl">
                        <h3 className="font-syne text-xl font-black text-white uppercase tracking-tighter mb-8">Pipeline Integrity</h3>
                        <div>
                            {stages.map(st => (
                                <ChartBar
                                    key={st.stage}
                                    label={st.stage}
                                    value={st.count}
                                    max={maxStages}
                                    color={st.stage === 'Applied' ? '#c8ff00' : st.stage === 'Interview' ? '#a855f7' : '#ec4899'}
                                />
                            ))}
                            {stages.length === 0 && (
                                <div className="text-center py-12 text-muted">
                                    <div className="text-4xl mb-4 grayscale opacity-40">🌑</div>
                                    <p className="text-xs font-black uppercase tracking-widest italic">No operational data detected.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Skill Distribution */}
                    <div className="bg-surface/50 border border-border/50 rounded-[2.5rem] p-10 backdrop-blur-xl">
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="font-syne text-xl font-black text-white uppercase tracking-tighter">Skill Alignment Matrix</h3>
                            <div className="text-[10px] font-black text-accent bg-accent/10 px-4 py-1.5 rounded-full border border-accent/20">AVG {s.avgMatchScore || 0}%</div>
                        </div>

                        <div className="flex items-flex-end gap-3 h-40 pb-4 border-b border-white/5">
                            {[...Array(10)].map((_, i) => {
                                const bucket = i * 10;
                                const scoreData = scores.find(sd => Number(sd.bucket) === bucket);
                                const count = scoreData ? scoreData.count : 0;
                                const height = maxCount > 0 ? (count / maxCount) * 100 : 0;

                                return (
                                    <div key={bucket} className="flex-1 flex flex-col justify-end items-center gap-2">
                                        <div 
                                          className={`w-full rounded-t-lg transition-all duration-1000 ${count > 0 ? (bucket >= 80 ? 'bg-accent' : bucket >= 60 ? 'bg-purple' : 'bg-pink') : 'bg-white/5'}`} 
                                          style={{ height: `${Math.max(height, 8)}%` }}
                                        />
                                        <span className="text-[9px] font-black text-muted">{bucket}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Right Column: Curated Jobs */}
                <div className="lg:col-span-5 bg-surface/50 border border-border/50 rounded-[2.5rem] p-10 backdrop-blur-xl flex flex-col">
                    <div className="flex justify-between items-center mb-8">
                        <h3 className="font-syne text-xl font-black text-white uppercase tracking-tighter">⚡ Fast Track</h3>
                        <span className="text-[10px] font-black text-muted uppercase tracking-widest">Market Alpha</span>
                    </div>
                    <div className="space-y-4 flex-1">
                        {loadingCurated ? (
                            [1,2,3,4].map(i => <div key={i} className="h-20 bg-card/40 rounded-2xl animate-pulse" />)
                        ) : curatedJobs.length > 0 ? (
                            curatedJobs.map(j => <JobCuratedCard key={j.id} job={j} />)
                        ) : (
                            <div className="text-center py-20 text-muted italic text-[11px] font-black uppercase tracking-widest opacity-50">
                                Scouting for elite opportunities...
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Skill Gap Intelligence */}
            <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-accent/20 to-purple/20 blur-3xl opacity-50 group-hover:opacity-70 transition-opacity" />
                <div className="relative bg-card/60 border border-white/10 rounded-[3rem] p-12 overflow-hidden backdrop-blur-3xl shadow-2xl">
                    <div className="flex flex-col md:flex-row gap-12 items-center">
                        <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-accent to-purple flex items-center justify-center text-5xl shadow-[0_0_50px_rgba(200,255,0,0.3)] animate-bounce-slow flex-shrink-0">🧠</div>
                        <div className="flex-1 text-center md:text-left">
                            <h3 className="font-syne text-3xl font-black text-white uppercase tracking-tight mb-4">Skill Gap Intelligence</h3>
                            
                            {!savedJobs || savedJobs.length === 0 ? (
                                <p className="text-muted font-medium text-lg italic">Intercept and save job listings to initialize market requirement analysis.</p>
                            ) : topMissing.length === 0 ? (
                                <p className="text-accent font-black text-xl uppercase tracking-tighter">Optimal market alignment detected. Profile covers all technical nodes.</p>
                            ) : (
                                <div className="space-y-8">
                                    <p className="text-white/80 font-medium text-lg leading-relaxed">System analysis of {savedJobs.length} targets identifies consistent gaps in your technical matrix:</p>
                                    <div className="flex gap-3 flex-wrap justify-center md:justify-start">
                                        {topMissing.map(skill => (
                                            <span key={skill} className="px-6 py-2 rounded-full bg-accent text-black font-black uppercase tracking-widest text-[10px] shadow-[0_0_30px_rgba(200,255,0,0.2)]">{skill}</span>
                                        ))}
                                    </div>
                                    {!strategy ? (
                                        <button 
                                          onClick={generateSkillStrategy} 
                                          disabled={generatingStrategy} 
                                          className="mt-4 bg-white/5 hover:bg-white/10 border border-white/10 px-8 py-4 rounded-2xl text-accent font-black uppercase tracking-widest text-[10px] transition-all disabled:opacity-50"
                                        >
                                            {generatingStrategy ? "Simulating Strategy..." : "✨ Calculate Action Plan"}
                                        </button>
                                    ) : (
                                        <div className="mt-8 bg-white/5 border border-white/10 rounded-3xl p-8 text-white/90 text-[13px] font-medium leading-relaxed italic animate-fade-in">
                                            <div className="text-accent font-black uppercase tracking-widest text-[9px] mb-4 opacity-70">Strategic Protocol // ORION</div>
                                            {strategy}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
