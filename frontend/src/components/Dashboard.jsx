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

export default function Dashboard({ C }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

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
        fetchAnalytics();
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

    // Defensive check for stages array
    const stages = data?.stages || [];
    const maxStages = stages.length > 0 ? Math.max(...stages.map(st => st.count || 0)) : 1;

    // Defensive check for scores array
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

            {/* Charts Row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
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
                    <p style={{ marginTop: 20, fontSize: 13, color: C.muted, lineHeight: 1.6 }}>
                        Shows how well your profile matches the jobs you've applied for. Aim for 80%+ for best results.
                    </p>
                </div>
            </div>

            {/* Smart Insights */}
            <div style={{
                background: `linear-gradient(135deg, ${C.surface}, ${C.bg})`,
                border: `1px solid ${C.accent}33`,
                borderRadius: 32,
                padding: 32,
                display: "flex",
                gap: 32,
                alignItems: "center"
            }}>
                <div style={{ width: 80, height: 80, borderRadius: 24, background: `linear-gradient(135deg, ${C.accent}, ${C.purple})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40, boxShadow: `0 10px 30px ${C.accent}33` }}>🤖</div>
                <div>
                    <h3 style={{ margin: "0 0 8px 0", fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 800 }}>Orion Strategy Advisor</h3>
                    <p style={{ margin: 0, color: C.text, fontSize: 15, opacity: 0.9 }}>
                        {s.total < 5 ?
                            "Welcome to GradLaunch! Apply to at least 10 jobs to unlock customized success strategy insights." :
                            s.successRate < 5 ?
                                "Your application volume is good, but conversion to interviews is low. Try using the 'Resume Tailor' more often to boost your match scores." :
                                "Great job! Your funnel is healthy. Focus on 'Interview Prep' in the Copilot tab to close the gap on your next offer."
                        }
                    </p>
                </div>
            </div>
        </div>
    );
}
