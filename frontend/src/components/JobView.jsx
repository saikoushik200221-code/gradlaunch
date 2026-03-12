import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { TagBadge, LogoCircle, MatchRing } from "./Common";

export default function JobView({ C, onAddToTracker }) {
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
                const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:3001"}/api/jobs/${id}`);
                if (res.ok) {
                    const data = await res.json();
                    setJob(data);
                }
            } catch (err) {
                console.error("Failed to load job:", err);
            }
            setLoading(false);
        }
        fetchJob();
    }, [id]);

    async function analyzeFit() {
        if (!job) return;
        setAnalyzing(true);
        // Using mock fit analysis for SEO build
        setTimeout(() => {
            setAnalysis({
                score: job.match || 85,
                reasons: ["Strong semantic similarity based on job description", "Location matches target profile"]
            });
            setAnalyzing(false);
        }, 1500);
    }

    if (loading) {
        return <div style={{ padding: 40, color: C.text, textAlign: "center", fontFamily: "Syne" }}>Loading job details...</div>;
    }

    if (!job) {
        return <div style={{ padding: 40, color: C.text, textAlign: "center", fontFamily: "Syne" }}>
            <h2>Job Not Found</h2>
            <button onClick={() => navigate("/")} style={{ background: C.accent, border: "none", padding: "10px 20px", borderRadius: 12, cursor: "pointer", fontWeight: "bold", marginTop: 10 }}>Go Home</button>
        </div>;
    }

    const title = `${job.title} at ${job.company} | GradLaunch`;
    const description = `Apply for the ${job.title} role at ${job.company} in ${job.location}. ${job.type}. ${job.salary}. Find your next tech career on GradLaunch!`;

    return (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 24, overflow: "hidden", display: "flex", flexDirection: "column", maxWidth: 1000, margin: "0 auto", height: "calc(100vh - 140px)" }}>
            <Helmet>
                <title>{title}</title>
                <meta name="description" content={description} />
                <meta property="og:title" content={title} />
                <meta property="og:description" content={description} />
                <meta property="og:type" content="website" />
            </Helmet>

            <div style={{ padding: 32, borderBottom: `1px solid ${C.border}`, background: C.bg === "#04060A" ? "linear-gradient(135deg, #0C1824 0%, #080C14 100%)" : "#F8FAFC" }}>
                <button onClick={() => navigate("/jobs")} style={{ background: "transparent", border: "none", color: C.muted, padding: "0 0 20px 0", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}>
                    &larr; Back to Jobs
                </button>
                <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
                    <LogoCircle letter={job.logo} size={64} />
                    <div style={{ flex: 1 }}>
                        <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 24, fontWeight: 800, margin: "0 0 4px 0" }}>{job.title}</h1>
                        <div style={{ color: C.muted, fontSize: 15 }}>{job.company} &middot; {job.location} &middot; {job.type}</div>
                        <div style={{ color: C.green, fontWeight: 700, marginTop: 4 }}>{job.salary}</div>
                    </div>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 20 }}>
                    {job.tags?.map(t => <TagBadge key={t} label={t} C={C} />)}
                </div>
            </div>

            <div style={{ padding: 32, flex: 1, overflowY: "auto" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, marginBottom: 40 }}>
                    <div>
                        <h4 style={{ fontFamily: "'Syne', sans-serif", fontSize: 14, textTransform: "uppercase", letterSpacing: 1, color: C.muted, marginBottom: 16 }}>Required Skills</h4>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                            {job.skills?.map(s => (
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
                            <div>
                                <div style={{ fontSize: 13, color: C.text, lineHeight: 1.6 }}>
                                    {analysis.reasons.map((r, i) => <div key={i} style={{ marginBottom: 8, display: "flex", gap: 8 }}><span style={{ color: C.accent }}>&bull;</span> {r}</div>)}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <h4 style={{ fontFamily: "'Syne', sans-serif", fontSize: 14, textTransform: "uppercase", letterSpacing: 1, color: C.muted, margin: "0 0 16px 0" }}>Job Description</h4>
                <div style={{ color: C.text, fontSize: 15, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{job.description}</div>
            </div>

            <div style={{ padding: 24, background: C.card, borderTop: `1px solid ${C.border}`, display: "flex", gap: 16 }}>
                <button
                    onClick={() => {
                        onAddToTracker({ ...job, wishlist: true, match: analysis?.score || job.match || 85 });
                        navigate("/tracker");
                    }}
                    style={{ flex: 1, background: "transparent", border: `1px solid ${C.border}`, color: C.text, padding: "16px", borderRadius: 14, fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 15, cursor: "pointer", transition: "all 0.2s" }}
                >
                    Bookmark Job
                </button>
                <button
                    onClick={() => {
                        onAddToTracker({ ...job, match: analysis?.score || job.match || 85 });
                        navigate("/resume");
                    }}
                    style={{ flex: 1, background: C.accent, border: "none", color: "#000", padding: "16px", borderRadius: 14, fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 15, cursor: "pointer", transition: "all 0.2s", boxShadow: `0 8px 24px ${C.accent}33` }}
                >
                    Apply & Tailor Resume
                </button>
            </div>
        </div>
    );
}
