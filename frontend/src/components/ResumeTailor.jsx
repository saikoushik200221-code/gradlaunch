import React, { useState, useEffect } from "react";
import { EmptyState } from "./Common";
const jsPDF = window.jspdf ? window.jspdf.jsPDF : null;

export default function ResumeTailor({ initialJobDesc, jobUrl, globalContext, C }) {
    const [jobDesc, setJobDesc] = useState(`We are looking for a Software Engineer I...`);
    const [tailored, setTailored] = useState("");
    const [loading, setLoading] = useState(false);
    const [atsScore, setAtsScore] = useState(null);
    const [keywords, setKeywords] = useState([]);
    const [error, setError] = useState("");

    const [matchAnalysis, setMatchAnalysis] = useState(null);
    const [analyzingMatch, setAnalyzingMatch] = useState(false);
    
    const [bullet, setBullet] = useState("");
    const [improvedBullet, setImprovedBullet] = useState("");
    const [improving, setImproving] = useState(false);

    const [background, setBackground] = useState(globalContext || "");

    useEffect(() => {
        if (globalContext && (!background || background.trim() === "")) {
            setBackground(globalContext);
        }
    }, [globalContext]);

    useEffect(() => {
        if (initialJobDesc) setJobDesc(initialJobDesc);
    }, [initialJobDesc]);

    async function tailorResume() {
        if (!background || background.trim() === "") {
            setError("Please provide 'Your Background' before tailoring.");
            return;
        }
        setLoading(true);
        setError("");
        setTailored("");
        setAtsScore(null);
        setKeywords([]);
        try {
            const apiBase = import.meta.env.VITE_API_URL || (window.location.hostname === "localhost" ? "http://localhost:3001" : "");
            const res = await fetch(`${apiBase}/api/anthropic/messages`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    model: "claude-sonnet-4-20250514",
                    max_tokens: 4000,
                    messages: [{
                        role: "user",
                        content: `You are a FAANG recruiter. Rewrite the ENTIRE resume to fully match the job description. Do NOT provide excerpts.
            
Rules:
- Use strong action verbs.
- Add relevant keywords from the JD naturally.
- Use the STAR format for bullet points.
- Keep it highly ATS-friendly.
- Major sections MUST start with "# " (e.g. # PROFESSIONAL SUMMARY, # WORK EXPERIENCE, # TECHNICAL PROJECTS, # EDUCATION, # SKILLS).

Format exactly as:
TAILORED_RESUME:
[Complete revised resume here]
ATS_SCORE: [Number 0-100]
KEYWORDS: [Word, Word, Word]

Resume:
${background}

Job Description:
${jobDesc}`
                    }]
                })
            });
            const data = await res.json();
            const text = data.content?.[0]?.text || "";
            const resumeMatch = text.match(/TAILORED_RESUME:\s*([\s\S]*?)(?=ATS_SCORE:|$)/);
            const scoreMatch = text.match(/ATS_SCORE:\s*(\d+)/);
            const kwMatch = text.match(/KEYWORDS:\s*(.+)/);
            setTailored(resumeMatch ? resumeMatch[1].trim() : text);
            if (scoreMatch) setAtsScore(parseInt(scoreMatch[1]));
            if (kwMatch) setKeywords(kwMatch[1].split(",").map(k => k.trim()));
        } catch (e) {
            setError("Failed to tailor resume: " + e.message);
        }
        setLoading(false);
    }

    async function analyzeDeepMatch() {
        if (!background || background.trim() === "") { setError("Provide 'Your Background' first."); return; }
        setAnalyzingMatch(true); setError(""); setMatchAnalysis(null);
        try {
            const apiBase = import.meta.env.VITE_API_URL || (window.location.hostname === "localhost" ? "http://localhost:3001" : "");
            const res = await fetch(`${apiBase}/api/anthropic/messages`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    model: "claude-sonnet-4-20250514", max_tokens: 1000,
                    messages: [{
                        role: "user",
                        content: `You are an expert recruiter.\nCompare the following resume and job description.\nReturn strictly JSON format ONLY without markdown:\n{\n  "score": 85,\n  "missing_skills": ["Skill1", "Skill2"],\n  "strengths": ["Strength1", "Strength2"],\n  "suggestions": ["Suggestion1", "Suggestion2"]\n}\n\nResume:\n${background}\n\nJob Description:\n${jobDesc}`
                    }]
                })
            });
            const data = await res.json();
            const text = data.content?.[0]?.text || "";
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) setMatchAnalysis(JSON.parse(jsonMatch[0]));
        } catch (e) { setError("Failed to analyze match."); }
        setAnalyzingMatch(false);
    }

    async function improveBulletAction() {
        if (!bullet) return;
        setImproving(true);
        try {
            const apiBase = import.meta.env.VITE_API_URL || (window.location.hostname === "localhost" ? "http://localhost:3001" : "");
            const res = await fetch(`${apiBase}/api/anthropic/messages`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    model: "claude-sonnet-4-20250514", max_tokens: 300,
                    messages: [{ role: "user", content: `Improve this bullet point for impact and ATS. Make it quantified, action-driven, and specific.\nBullet: "${bullet}"\nJust return the improved bullet point.` }]
                })
            });
            const data = await res.json();
            setImprovedBullet(data.content?.[0]?.text || "");
        } catch (e) { setImprovedBullet("Failed to improve bullet."); }
        setImproving(false);
    }

    function downloadAsPDF() {
        if (!tailored || !jsPDF) return;
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 20;
        const lines = tailored.split("\n");
        let y = margin;

        doc.setFont("helvetica", "bold");
        doc.setFontSize(18);

        lines.forEach((line, index) => {
            const trimmedLine = line.trim();
            if (!trimmedLine && index !== 0) { y += 3; return; }
            if (y > pageHeight - margin) { doc.addPage(); y = margin; }

            if (index === 0) {
                doc.text(trimmedLine, pageWidth / 2, y, { align: "center" });
                y += 8;
                doc.setFontSize(10); doc.setFont("helvetica", "normal");
                return;
            }
            if (index === 1) {
                doc.text(trimmedLine, pageWidth / 2, y, { align: "center" });
                y += 10;
                doc.setDrawColor(200); doc.line(margin, y - 5, pageWidth - margin, y - 5);
                return;
            }
            if (trimmedLine.startsWith("# ")) {
                const sectionName = trimmedLine.replace("# ", "").toUpperCase();
                y += 5;
                doc.setFont("helvetica", "bold"); doc.setFontSize(12);
                doc.text(sectionName, margin, y);
                doc.setDrawColor(0); doc.setLineWidth(0.3); doc.line(margin, y + 1.5, pageWidth - margin, y + 1.5);
                y += 8;
                doc.setFont("helvetica", "normal"); doc.setFontSize(10);
            } else {
                const wrapped = doc.splitTextToSize(trimmedLine, pageWidth - (margin * 2));
                wrapped.forEach(l => {
                    if (y > pageHeight - margin) { doc.addPage(); y = margin; }
                    doc.text(l, margin, y);
                    y += 5;
                });
            }
        });

        doc.save("Tailored_Resume.pdf");
    }

    return (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, height: "calc(100vh - 140px)" }}>
            {/* Left Column: Input */}
            <div style={{ display: "flex", flexDirection: "column", gap: 24, overflowY: "auto", paddingRight: 4 }}>
                <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 24, padding: 32 }}>
                    <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 800, margin: "0 0 8px 0" }}>Resume Tailor</h2>
                    <p style={{ color: C.muted, fontSize: 14, margin: "0 0 24px 0" }}>Paste a job description to instantly transform your resume into a top-tier candidate profile.</p>

                    {(!background || background.trim() === "") && (
                        <div style={{ color: C.yellow, background: `${C.yellow}11`, border: `1px solid ${C.yellow}33`, padding: 16, borderRadius: 12, fontSize: 13, marginBottom: 24 }}>
                            ⚠️ Complete profile first: Please go to the Profile tab and click 'Analyze & Save Deep Profile', or manually paste your background below.
                        </div>
                    )}

                    <div style={{ marginBottom: 24 }}>
                        <label style={{ display: "block", fontSize: 12, fontWeight: 800, color: C.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Your Background</label>
                        <textarea
                            value={background} onChange={e => setBackground(e.target.value)}
                            placeholder="Paste your resume, skills, and experience here..."
                            style={{ width: "100%", background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 20, color: C.text, fontFamily: "'DM Sans', sans-serif", fontSize: 14, minHeight: 150, resize: "none", outline: "none" }}
                        />
                    </div>

                    <div style={{ marginBottom: 24 }}>
                        <label style={{ display: "block", fontSize: 12, fontWeight: 800, color: C.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Job Description</label>
                        <textarea
                            value={jobDesc} onChange={e => setJobDesc(e.target.value)}
                            placeholder="Paste the full job description here..."
                            style={{ width: "100%", background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 20, color: C.text, fontFamily: "'DM Sans', sans-serif", fontSize: 14, minHeight: 200, resize: "none", outline: "none" }}
                        />
                    </div>

                    {error && <div style={{ color: C.red, background: `${C.red}11`, border: `1px solid ${C.red}33`, padding: 16, borderRadius: 12, fontSize: 13, marginBottom: 24 }}>{error}</div>}

                    <div style={{ display: "flex", gap: 16 }}>
                        <button
                            onClick={analyzeDeepMatch}
                            disabled={analyzingMatch || !background || background.trim() === ""}
                            style={{ flex: 1, background: "transparent", border: `1px solid ${C.accent}`, color: C.accent, borderRadius: 16, padding: "18px", fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 15, cursor: analyzingMatch ? "wait" : "pointer", transition: "all 0.2s" }}
                        >
                            {analyzingMatch ? "🔍 Analyzing Match..." : "🔍 Deep Match Analysis"}
                        </button>
                        <button
                            onClick={tailorResume}
                            disabled={loading || !background || background.trim() === ""}
                            style={{ flex: 1, background: C.accent, border: "none", borderRadius: 16, padding: "18px", color: "#000", fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 15, cursor: loading ? "wait" : "pointer", boxShadow: `0 8px 24px ${C.accent}33` }}
                        >
                            {loading ? "✨ AI is Tailoring..." : "🚀 Tailor Resume"}
                        </button>
                    </div>
                </div>
            </div>

            {/* Right Column: Output */}
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 24, overflow: "hidden", display: "flex", flexDirection: "column" }}>
                <div style={{ padding: "20px 32px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ background: atsScore > 80 ? C.green : C.accent, width: 44, height: 44, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: "#000" }}>{atsScore || "--"}</div>
                        <div>
                            <div style={{ fontSize: 14, fontWeight: 800 }}>ATS Compatibility</div>
                            <div style={{ fontSize: 11, color: C.muted }}>Prediction based on keywords</div>
                        </div>
                    </div>
                    {tailored && (
                        <button onClick={downloadAsPDF} style={{ background: `${C.green}22`, color: C.green, border: `1px solid ${C.green}44`, padding: "8px 16px", borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                            📄 Download PDF
                        </button>
                    )}
                </div>

                <div style={{ flex: 1, padding: 32, overflowY: "auto", position: "relative", display: "flex", flexDirection: "column", gap: 24 }}>
                    {matchAnalysis && (
                        <div style={{ background: C.bg === "#04060A" ? "#111827" : "#F8FAFC", border: `1px solid ${C.border}`, borderRadius: 16, padding: 24 }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                                <h3 style={{ margin: 0, fontFamily: "'Syne', sans-serif", fontSize: 16, color: C.text }}>Match Analysis</h3>
                                <div style={{ background: `${C.accent}20`, color: C.accent, padding: "4px 12px", borderRadius: 20, fontSize: 13, fontWeight: 800, border: `1px solid ${C.accent}40` }}>{matchAnalysis.score}% FIT</div>
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                                <div>
                                    <div style={{ fontSize: 11, fontWeight: 800, color: C.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Missing Skills</div>
                                    {matchAnalysis.missing_skills?.map((s, idx) => <div key={idx} style={{ color: C.text, fontSize: 13, marginBottom: 4 }}>• {s}</div>)}
                                </div>
                                <div>
                                    <div style={{ fontSize: 11, fontWeight: 800, color: C.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Key Strengths</div>
                                    {matchAnalysis.strengths?.map((s, idx) => <div key={idx} style={{ color: C.green, fontSize: 13, marginBottom: 4 }}>• {s}</div>)}
                                </div>
                            </div>
                            <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${C.border}` }}>
                                <div style={{ fontSize: 11, fontWeight: 800, color: C.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Improvement Suggestions</div>
                                {matchAnalysis.suggestions?.map((s, idx) => <div key={idx} style={{ color: C.text, fontSize: 13, marginBottom: 4 }}>• {s}</div>)}
                            </div>
                        </div>
                    )}

                    {tailored ? (
                        <div style={{ whiteSpace: "pre-wrap", fontFamily: "monospace", fontSize: 13, lineHeight: 1.6, color: C.text }}>{tailored}</div>
                    ) : (
                        <EmptyState
                            icon="✨"
                            title="Ready to Analyze & Tailor"
                            description="Your deep match analysis and newly tailored resume will appear securely here."
                            C={C}
                        />
                    )}
                </div>
                
                <div style={{ padding: 24, borderTop: `1px solid ${C.border}`, background: C.surface }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: C.text, marginBottom: 8, fontFamily: "'Syne', sans-serif" }}>⚡ Bullet Point Improver</div>
                    <div style={{ display: "flex", gap: 12 }}>
                        <input value={bullet} onChange={e => setBullet(e.target.value)} placeholder="Paste a weak bullet point..." style={{ flex: 1, background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 14px", color: C.text, fontFamily: "'DM Sans', sans-serif", fontSize: 13, outline: "none" }} />
                        <button onClick={improveBulletAction} disabled={improving || !bullet} style={{ background: C.accent, color: "#000", border: "none", borderRadius: 10, padding: "0 16px", fontWeight: 800, fontSize: 13, cursor: improving ? "wait" : "pointer" }}>{improving ? "Improving..." : "Improve"}</button>
                    </div>
                    {improvedBullet && <div style={{ marginTop: 12, background: `${C.green}11`, padding: 12, borderRadius: 8, fontSize: 13, color: C.green, border: `1px solid ${C.green}33` }}>{improvedBullet}</div>}
                </div>

                {keywords.length > 0 && (
                    <div style={{ padding: 24, background: C.bg === "#04060A" ? "rgba(0,0,0,0.3)" : "#f1f5f9", borderTop: `1px solid ${C.border}` }}>
                        <div style={{ fontSize: 11, fontWeight: 800, color: C.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Keywords Integrated</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                            {keywords.map(kw => <span key={kw} style={{ background: `${C.accent}15`, color: C.accent, border: `1px solid ${C.accent}33`, padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600 }}>{kw}</span>)}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
