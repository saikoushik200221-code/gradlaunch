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

    useEffect(() => {
        if (initialJobDesc) setJobDesc(initialJobDesc);
    }, [initialJobDesc]);

    async function tailorResume() {
        if (!globalContext) {
            setError("Please go to the Profile tab and click 'Analyze & Save Deep Profile' first!");
            return;
        }
        setLoading(true);
        setError("");
        setTailored("");
        setAtsScore(null);
        setKeywords([]);
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:3001"}/api/anthropic/messages`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    model: "claude-sonnet-4-20250514",
                    max_tokens: 4000,
                    messages: [{
                        role: "user",
                        content: `You are an elite professional resume writer. Your goal is to produce a FULL, COMPLETE, SUBMISSION-READY RESUME. Do NOT provide a summary or excerpts. Provide every single line from the header to the final section.
            
CORE INSTRUCTIONS:
1. FULL REWRITE: Rewrite the ENTIRE resume based on the CANDIDATE'S DEEP CONTEXT PROFILE. Every section (Summary, Experience, Projects, Skills, Education) must be fully developed and tailored to the JOB DESCRIPTION.
2. USE REAL DATA from CANDIDATE'S DEEP CONTEXT PROFILE as the sole source of truth.
3. STRUCTURE & PARSING (CRITICAL):
   - Line 1: [Full Name]
   - Line 2: [Location | Email | Phone | LinkedIn]
   - Each major section MUST start with "# " (e.g., # PROFESSIONAL SUMMARY, # WORK EXPERIENCE, # TECHNICAL PROJECTS, # EDUCATION, # SKILLS).
4. CONTENT: Use high-impact action verbs and quantifiable metrics. Inject specific keywords from the JOB DESCRIPTION naturally.

Format your response exactly as:
TAILORED_RESUME:
[The COMPLETE revised resume here]

ATS_SCORE: [A realistic number 0-100]

KEYWORDS: [The 8-10 key JD terms you integrated, separated by commas]

CANDIDATE'S DEEP CONTEXT PROFILE:
${globalContext}

JOB DESCRIPTION:
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

                    <div style={{ marginBottom: 24 }}>
                        <label style={{ display: "block", fontSize: 12, fontWeight: 800, color: C.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Job Description</label>
                        <textarea
                            value={jobDesc} onChange={e => setJobDesc(e.target.value)}
                            placeholder="Paste the full job description here..."
                            style={{ width: "100%", background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 20, color: C.text, fontFamily: "'DM Sans', sans-serif", fontSize: 14, minHeight: 300, resize: "none", outline: "none" }}
                        />
                    </div>

                    {error && <div style={{ color: C.red, background: `${C.red}11`, border: `1px solid ${C.red}33`, padding: 16, borderRadius: 12, fontSize: 13, marginBottom: 24 }}>{error}</div>}

                    <button
                        onClick={tailorResume}
                        disabled={loading}
                        style={{ width: "100%", background: C.accent, border: "none", borderRadius: 16, padding: "18px", color: "#000", fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 15, cursor: loading ? "wait" : "pointer", boxShadow: `0 8px 24px ${C.accent}33` }}
                    >
                        {loading ? "✨ AI is Reframing Your Story..." : "🚀 Generate Tailored Submission"}
                    </button>
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

                <div style={{ flex: 1, padding: 32, overflowY: "auto", position: "relative" }}>
                    {tailored ? (
                        <div style={{ whiteSpace: "pre-wrap", fontFamily: "monospace", fontSize: 13, lineHeight: 1.6, color: C.text }}>{tailored}</div>
                    ) : (
                        <EmptyState
                            icon="✨"
                            title="Ready to Tailor"
                            description="Orion's tailored resume will appear here. It will be submission-ready and ATS-optimized."
                            C={C}
                        />
                    )}
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
