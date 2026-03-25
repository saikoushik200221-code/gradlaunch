import React, { useState, useEffect } from "react";
import { STAGE_COLORS } from "../theme";

const StatCard = ({ title, value, icon, color, C }) => (
    <div style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 24,
        padding: 24,
        display: "flex",
        flexDirection: "column",
        gap: 12,
        flex: 1,
        minWidth: 200,
        position: "relative",
        overflow: "hidden",
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        cursor: "default"
    }} className="stat-card">
        <div style={{ position: "absolute", top: -20, right: -20, fontSize: 80, opacity: 0.05, transform: "rotate(-15deg)" }}>{icon}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: `${color}15`, display: "flex", alignItems: "center", justifyContent: "center", color, fontSize: 16 }}>{icon}</div>
            <span style={{ fontSize: 14, fontWeight: 700, color: C.muted, fontFamily: "'Syne', sans-serif" }}>{title}</span>
        </div>
        <div style={{ fontSize: 36, fontWeight: 800, color: C.text, fontFamily: "'Syne', sans-serif", letterSpacing: "-1px" }}>{value}</div>
        <style>{`
            .stat-card:hover { transform: translateY(-4px); border-color: ${color}44; box-shadow: 0 12px 30px -10px ${color}22; }
        `}</style>
    </div>
);

const ChartBar = ({ label, value, max, color, C }) => {
    const percentage = max > 0 ? (value / max) * 100 : 0;
    return (
        <div style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 13, fontWeight: 600 }}>
                <span style={{ color: C.text }}>{label}</span>
                <span style={{ color: color }}>{value}</span>
            </div>
            <div style={{ height: 8, background: `${C.border}44`, borderRadius: 10, overflow: "hidden" }}>
                <div style={{ height: "100%", background: color, width: `${percentage}%`, borderRadius: 10, transition: "width 1s ease-out" }} />
            </div>
        </div>
    );
};

const JobCuratedCard = ({ job, C }) => (
    <div 
        onClick={() => window.open(job.link, "_blank")}
        style={{ 
            background: C.card, 
            border: `1px solid ${C.border}`, 
            borderRadius: 16, 
            padding: 16, 
            display: "flex", 
            alignItems: "center", 
            gap: 12, 
            cursor: "pointer",
            transition: "all 0.2s"
        }}
        className="curated-job-card"
    >
        <div style={{ width: 32, height: 32, background: `${C.accent}15`, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: C.accent }}>{job.company?.[0]}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: C.text }}>{job.title}</div>
            <div style={{ fontSize: 11, color: C.muted }}>{job.company} • {job.location}</div>
        </div>
        <div style={{ fontSize: 13, fontWeight: 800, color: C.green }}>{job.match_score || 85}%</div>
        <style>{`
            .curated-job-card:hover { transform: translateX(4px); border-color: ${C.accent}44; background: ${C.surface}; }
        `}</style>
    </div>
);

export default function Dashboard({ C, savedJobs, profileText }) {
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

        return Object.entries(counts)
            .sort((a,b) => b[1] - a[1])
            .slice(0, 3)
            .map(([skill]) => skill);
    };

    const topMissing = getTopMissingSkills();

    const generateSkillStrategy = async () => {
        if (topMissing.length === 0) return;
        setGeneratingStrategy(true);
        try {
            const apiBase = import.meta.env.VITE_API_URL || (window.location.hostname === "localhost" ? "http://localhost:3001" : "");
            const res = await fetch(`${apiBase}/api/anthropic/messages`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    model: "claude-sonnet-4-20250514", max_tokens: 400,
                    messages: [{ role: "user", content: `I am missing these top 3 skills needed for jobs I want: ${topMissing.join(', ')}. Give me exactly 3 highly actionable, very concise bullet points on how to quickly learn them to secure interviews.` }]
                })
            });
            const d = await res.json();
            setStrategy(d.content?.[0]?.text || "Failed to generate strategy.");
        } catch (e) {
            setStrategy("Failed to reach AI advisor.");
        }
        setGeneratingStrategy(false);
    };

    useEffect(() => {
        async function fetchAnalytics() {
            try {
                const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:3001"}/api/analytics`, {
                    headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
                });
                if (res.ok) {
                    setData(await res.json());
                }
            } catch (e) {
                console.error("Analytics fetch failed", e);
            }
            setLoading(false);
        }
        async function fetchCurated() {
            try {
                const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:3001"}/api/jobs/curated`, {
                    headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
                });
                if (res.ok) setCuratedJobs(await res.json());
            } catch (e) {
                console.error("Curated fetch failed", e);
            }
            setLoadingCurated(false);
        }
        fetchAnalytics();
        fetchCurated();
    }, []);

    if (loading) return (
        <div style={{ display: "flex", flexDirection: "column", gap: 24, padding: "20px 0" }}>
            <div style={{ height: 40, background: C.border, width: 200, borderRadius: 12, opacity: 0.3 }} />
            <div style={{ display: "flex", gap: 24 }}>
                {[1, 2, 3, 4].map(i => <div key={i} style={{ height: 140, background: C.surface, flex: 1, borderRadius: 24, border: `1px solid ${C.border}`, opacity: 0.5 }} />)}
            </div>
            <div style={{ height: 300, background: C.surface, borderRadius: 24, border: `1px solid ${C.border}`, opacity: 0.3 }} />
        </div>
    );

    const s = data?.summary || { total: 0, offers: 0, interviews: 0, rejections: 0, successRate: 0, avgMatchScore: 0 };
    const stages = data?.stages || [];
    const maxStages = stages.length > 0 ? Math.max(...stages.map(st => st.count || 0)) : 1;
    const scores = data?.scores || [];
    const maxCount = scores.length > 0 ? Math.max(...scores.map(sd => sd.count || 0)) : 1;

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 32, padding: "10px 0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                <div>
                    <h1 style={{ margin: 0, fontFamily: "'Syne', sans-serif", fontSize: 32, fontWeight: 800 }}>Career Insights</h1>
                    <p style={{ margin: "4px 0 0 0", color: C.muted, fontSize: 16 }}>Real-time metrics for your job hunt journey</p>
                </div>
                <div style={{ background: `${C.accent}15`, color: C.accent, padding: "8px 16px", borderRadius: 14, fontSize: 13, fontWeight: 700, border: `1px solid ${C.accent}33` }}>
                    ⚡ Last Sync: Just Now
                </div>
            </div>

            {/* Top Stats */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 24 }}>
                <StatCard title="Total Applied" value={s.total || 0} icon="📤" color={C.accent} C={C} />
                <StatCard title="Interviews" value={s.interviews || 0} icon="🤝" color={C.purple} C={C} />
                <StatCard title="Offers" value={s.offers || 0} icon="🎉" color={C.green} C={C} />
                <StatCard title="Success Rate" value={`${s.successRate || 0}%`} icon="📈" color={C.yellow} C={C} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 32 }}>
                {/* Pipeline Health & Match Distribution column */}
                <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
                    {/* Pipeline Health */}
                    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 32, padding: 32 }}>
                        <h3 style={{ margin: "0 0 24px 0", fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 800 }}>Pipeline Health</h3>
                        <div style={{ display: "flex", flexDirection: "column" }}>
                            {stages.map(st => (
                                <ChartBar
                                    key={st.stage}
                                    label={st.stage}
                                    value={st.count}
                                    max={maxStages}
                                    color={STAGE_COLORS[st.stage] || C.accent}
                                    C={C}
                                />
                            ))}
                            {stages.length === 0 && (
                                <div style={{ textAlign: "center", padding: "40px 0", color: C.muted }}>
                                    <div style={{ fontSize: 40, marginBottom: 12 }}>🌑</div>
                                    No application data yet. Start tracking to see your pipeline health!
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Match Score Distribution */}
                    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 32, padding: 32 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                            <h3 style={{ margin: 0, fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 800 }}>Skill Alignment</h3>
                            <div style={{ fontSize: 12, fontWeight: 800, color: C.accent, background: `${C.accent}10`, padding: "4px 10px", borderRadius: 8 }}>Avg {s.avgMatchScore || 0}%</div>
                        </div>

                        <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 180, paddingBottom: 20, borderBottom: `1px solid ${C.border}` }}>
                            {[...Array(10)].map((_, i) => {
                                const bucket = i * 10;
                                const scoreData = scores.find(sd => Number(sd.bucket) === bucket);
                                const count = scoreData ? scoreData.count : 0;
                                const height = maxCount > 0 ? (count / maxCount) * 100 : 0;

                                return (
                                    <div key={bucket} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                                        <div style={{
                                            width: "100%",
                                            height: `${Math.max(height, 5)}%`,
                                            background: count > 0 ? (bucket >= 80 ? C.green : bucket >= 60 ? C.accent : C.yellow) : C.border,
                                            borderRadius: "4px 4px 0 0",
                                            opacity: count > 0 ? 1 : 0.2,
                                            transition: "height 1s cubic-bezier(0.175, 0.885, 0.32, 1.275)"
                                        }} />
                                        <span style={{ fontSize: 9, color: C.muted, fontWeight: 700 }}>{bucket}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Top Jobs for You */}
                <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 32, padding: 32, display: "flex", flexDirection: "column" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                        <h3 style={{ margin: 0, fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 800 }}>⚡ Jobs for You</h3>
                        <div style={{ fontSize: 11, fontWeight: 800, color: C.muted, textTransform: "uppercase" }}>Updated Daily</div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>
                        {loadingCurated ? (
                            [1,2,3].map(i => <div key={i} style={{ height: 60, background: C.card, borderRadius: 16, opacity: 0.3 }} />)
                        ) : curatedJobs.length > 0 ? (
                            curatedJobs.map(j => <JobCuratedCard key={j.id} job={j} C={C} />)
                        ) : (
                            <div style={{ textAlign: "center", padding: "20px 0", color: C.muted, fontSize: 13 }}>
                                No curated jobs for today. Check back later!
                            </div>
                        )}
                    </div>
                    {curatedJobs.length > 0 && (
                        <button 
                            style={{ marginTop: 20, background: "transparent", border: `1px solid ${C.border}`, borderRadius: 12, padding: "12px", color: C.text, fontSize: 13, fontWeight: 700, cursor: "pointer", transition: "all 0.2s" }}
                            onClick={() => window.location.hash = "#job-search"}
                        >
                            View All Jobs
                        </button>
                    )}
                </div>
            </div>

            {/* Skill Gap Intelligence */}
            <div style={{
                background: `linear-gradient(135deg, ${C.surface}, ${C.bg})`,
                border: `1px solid ${C.accent}33`,
                borderRadius: 32,
                padding: 32,
                display: "flex",
                flexDirection: "column",
                gap: 24
            }}>
                <div style={{ display: "flex", gap: 32, alignItems: "flex-start" }}>
                    <div style={{ width: 80, height: 80, borderRadius: 24, background: `linear-gradient(135deg, ${C.accent}, ${C.purple})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40, boxShadow: `0 10px 30px ${C.accent}33`, flexShrink: 0 }}>🧠</div>
                    <div style={{ flex: 1 }}>
                        <h3 style={{ margin: "0 0 8px 0", fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 800 }}>Skill Gap Intelligence</h3>
                        
                        {!savedJobs || savedJobs.length === 0 ? (
                            <p style={{ margin: 0, color: C.muted, fontSize: 15 }}>Save some jobs in the Job Search tab to discover which critical skills the market demands but your profile is currently missing!</p>
                        ) : topMissing.length === 0 ? (
                            <p style={{ margin: 0, color: C.green, fontSize: 15, fontWeight: 700 }}>You are a perfect match for all your {savedJobs.length} saved jobs! Your profile text covers all required technical skills.</p>
                        ) : (
                            <div>
                                <p style={{ margin: "0 0 12px 0", color: C.text, fontSize: 15 }}>Based on analyzing your {savedJobs.length} saved jobs, your profile is consistently missing these top requirements:</p>
                                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
                                    {topMissing.map(skill => (
                                        <span key={skill} style={{ background: `${C.yellow}15`, color: C.yellow, padding: "6px 16px", borderRadius: 12, fontWeight: 800, fontSize: 14, border: `1px solid ${C.yellow}40` }}>{skill}</span>
                                    ))}
                                </div>
                                {!strategy ? (
                                    <button onClick={generateSkillStrategy} disabled={generatingStrategy} style={{ background: C.accent, color: "#000", border: "none", borderRadius: 12, padding: "10px 20px", fontWeight: 800, fontSize: 14, cursor: generatingStrategy ? "wait" : "pointer" }}>
                                        {generatingStrategy ? "Orion is calculating strategy..." : "✨ Ask Orion for a Learning Strategy"}
                                    </button>
                                ) : (
                                    <div style={{ background: `${C.accent}10`, border: `1px solid ${C.accent}30`, borderRadius: 16, padding: 20, color: C.text, fontSize: 14, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                                        <div style={{ fontWeight: 800, color: C.accent, marginBottom: 8, textTransform: "uppercase", fontSize: 11, letterSpacing: 1 }}>Orion's Action Plan</div>
                                        {strategy}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
