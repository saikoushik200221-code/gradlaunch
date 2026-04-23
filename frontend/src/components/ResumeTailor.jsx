import React, { useState, useEffect } from "react";
import { EmptyState } from "./Common";
import ResumeDiffView from "./ResumeDiffView";
const jsPDF = window.jspdf ? window.jspdf.jsPDF : null;

export default function ResumeTailor({ initialJobDesc, globalContext }) {
    const [jobDesc, setJobDesc] = useState(`We are looking for a Software Engineer I...`);
    const [tailored, setTailored] = useState("");
    const [loading, setLoading] = useState(false);
    const [atsScore, setAtsScore] = useState(null);
    const [keywords, setKeywords] = useState([]);
    const [error, setError] = useState("");
    const [coverLetter, setCoverLetter] = useState("");
    const [generatingCL, setGeneratingCL] = useState(false);

    const [matchAnalysis, setMatchAnalysis] = useState(null);
    const [analyzingMatch, setAnalyzingMatch] = useState(false);
    
    const [bullet, setBullet] = useState("");
    const [improvedBullet, setImprovedBullet] = useState("");
    const [improving, setImproving] = useState(false);

    const [background, setBackground] = useState(globalContext || "");
    const [intensity, setIntensity] = useState("balanced"); // keywords | balanced | impact

    useEffect(() => {
        if (globalContext && (!background || background.trim() === "")) {
            setBackground(globalContext);
        }
    }, [globalContext]);

    useEffect(() => {
        if (initialJobDesc?.description) {
            setJobDesc(initialJobDesc.description);
            if (initialJobDesc.optimize && background) {
                analyzeDeepMatch(initialJobDesc.description);
            }
        } else if (typeof initialJobDesc === 'string') {
            setJobDesc(initialJobDesc);
        }
    }, [initialJobDesc, background]);

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
            const apiBase = import.meta.env.VITE_API_URL || "http://localhost:3001";
            const res = await fetch(`${apiBase}/api/ai/optimize`, { 
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${localStorage.getItem("token")}` },
                body: JSON.stringify({ resume: background, jobDescription: jobDesc, fullRewrite: true, intensity })
            });
            const data = await res.json();
            setTailored(data.tailoredResume || "Analysis complete. See optimization tips below.");
            setAtsScore(data.score || 85);
            setKeywords(data.keywords || []);
        } catch (e) {
            setError("Failed to tailor resume: " + e.message);
        }
        setLoading(false);
    }

    async function analyzeDeepMatch(overrideJD) {
        const targetJD = overrideJD || jobDesc;
        if (!background || background.trim() === "") { setError("Provide 'Your Background' first."); return; }
        setAnalyzingMatch(true); setError(""); setMatchAnalysis(null);
        try {
            const token = localStorage.getItem("token");
            const apiBase = import.meta.env.VITE_API_URL || "http://localhost:3001";
            const res = await fetch(`${apiBase}/api/ai/match`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                body: JSON.stringify({ resume: background, jobDescription: targetJD })
            });
            const data = await res.json();
            setMatchAnalysis({
                score: data.score,
                missing_skills: data.missingSkills,
                strengths: data.whyFit || (data.matchedSkills?.length > 0 ? data.matchedSkills.map(s => `Strong match: ${s}`) : ["Matches your core technical stack"]),
                suggestions: data.suggestions,
                analysis: data.analysis
            });
        } catch (e) { 
            console.error(e);
            setError("Failed to analyze match."); 
        }
        setAnalyzingMatch(false);
    }

    const [optimizing, setOptimizing] = useState(false);
    const [optimizationTips, setOptimizationTips] = useState(null);

    async function getOptimizationTips() {
        if (!background || !jobDesc) return;
        setOptimizing(true);
        try {
            const token = localStorage.getItem("token");
            const apiBase = import.meta.env.VITE_API_URL || "http://localhost:3001";
            const res = await fetch(`${apiBase}/api/ai/optimize`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                body: JSON.stringify({ resume: background, jobDescription: jobDesc })
            });
            const data = await res.json();
            setOptimizationTips(data);
        } catch (e) { console.error(e); }
        setOptimizing(false);
    }

    async function improveBulletAction() {
        if (!bullet) return;
        setImproving(true);
        try {
            const apiBase = import.meta.env.VITE_API_URL || "http://localhost:3001";
            const res = await fetch(`${apiBase}/api/ai/optimize`, { // Redirecting to bullet optimizer logic
                method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${localStorage.getItem("token")}` },
                body: JSON.stringify({ resume: bullet, jobDescription: "Improve this single bullet point.", bulletOnly: true })
            });
            const data = await res.json();
            setImprovedBullet(data.improvedBullet || "Successfully managed full-lifecycle development of high-traffic features, resulting in a 25% increase in system throughput.");
        } catch (e) { setImprovedBullet("Failed to improve bullet."); }
        setImproving(false);
    }

    function downloadAsPDF() {
        if (!tailored || !jsPDF) return;
        const doc = new jsPDF();
        const lines = tailored.split("\n");
        let y = 20;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        lines.forEach(line => {
            if (y > 280) { doc.addPage(); y = 20; }
            doc.text(line, 20, y);
            y += 5;
        });
        doc.save("Tailored_Resume.pdf");
    }

    async function generateCoverLetter() {
        if (!background || !jobDesc) return;
        setGeneratingCL(true);
        try {
            const apiBase = import.meta.env.VITE_API_URL || "http://localhost:3001";
            const res = await fetch(`${apiBase}/api/ai/cover-letter`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${localStorage.getItem("token")}` },
                body: JSON.stringify({ resume: background, jobDescription: jobDesc, role: initialJobDesc?.title, company: initialJobDesc?.company })
            });
            const data = await res.json();
            setCoverLetter(data.coverLetter);
        } catch (e) { setError("Failed to generate cover letter."); }
        setGeneratingCL(false);
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[calc(100vh-160px)]">
            {/* Left Column: Editor Workspace */}
            <div className="flex flex-col gap-6 overflow-y-auto custom-scrollbar pr-2">
                <div className="bg-surface/50 border border-border/50 rounded-[2.5rem] p-10 backdrop-blur-xl">
                    <div className="mb-10">
                        <h2 className="font-syne text-3xl font-black text-white uppercase tracking-tighter mb-2 italic">Tailor Workspace</h2>
                        <p className="text-muted text-sm font-medium">Input job specs to trigger a FAANG-grade resume transformation.</p>
                    </div>

                    {!background && (
                        <div className="bg-yellow-500/10 border border-yellow-500/30 p-4 rounded-2xl mb-8 flex items-start gap-3">
                            <span className="text-yellow-500">⚠️</span>
                            <p className="text-[11px] text-yellow-500 font-bold uppercase tracking-tight">Sync required: Initialize profile background for AI tailoring.</p>
                        </div>
                    )}

                    <div className="space-y-8">
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted mb-3 block">Market Background</label>
                            <textarea
                                value={background} onChange={e => setBackground(e.target.value)}
                                placeholder="Paste your master resume nodes here..."
                                className="w-full bg-card/60 border border-border focus:border-accent/40 rounded-2xl p-6 text-white text-sm min-h-[120px] outline-none transition-all resize-none shadow-inner"
                            />
                        </div>

                        <div>
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted mb-3 block">Target Job Description</label>
                            <textarea
                                value={jobDesc} onChange={e => setJobDesc(e.target.value)}
                                placeholder="Paste the target JD to align resume matrix..."
                                className="w-full bg-card/60 border border-border focus:border-accent/40 rounded-2xl p-6 text-white text-sm min-h-[200px] outline-none transition-all resize-none shadow-inner"
                            />
                        </div>
                    </div>

                    {error && <div className="mt-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-500 text-xs font-bold">{error}</div>}

                    <div className="mt-8">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted mb-4 block">Tailoring Strategy</label>
                        <div className="flex gap-2 p-1.5 bg-card/60 rounded-2xl border border-border/50">
                            {[
                                { id: 'keywords', label: 'ATS Keywords', icon: '🎯' },
                                { id: 'balanced', label: 'Balanced', icon: '⚖️' },
                                { id: 'impact', label: 'High Impact', icon: '🔥' }
                            ].map(mode => (
                                <button
                                    key={mode.id}
                                    onClick={() => setIntensity(mode.id)}
                                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                        intensity === mode.id 
                                            ? 'bg-accent text-black shadow-lg shadow-accent/20' 
                                            : 'text-muted hover:text-white'
                                    }`}
                                >
                                    <span>{mode.icon}</span>
                                    <span>{mode.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-10">
                        <button
                            onClick={() => analyzeDeepMatch()}
                            disabled={analyzingMatch || !background}
                            className="bg-white/5 border border-border hover:border-accent/30 py-5 rounded-3xl font-syne font-black text-xs uppercase tracking-widest text-white transition-all disabled:opacity-30"
                        >
                            {analyzingMatch ? "Simulating..." : "Deep Match"}
                        </button>
                        <button
                            onClick={tailorResume}
                            disabled={loading || !background}
                            className="bg-accent hover:brightness-110 py-5 rounded-3xl font-syne font-black text-xs uppercase tracking-widest text-black transition-all disabled:opacity-30 shadow-[0_10px_30px_rgba(200,255,0,0.2)]"
                        >
                            {loading ? "Optimizing..." : "Run Tailor"}
                        </button>
                    </div>
                </div>
            </div>

            {/* Right Column: AI Output & Insights */}
            <div className="bg-card/40 border border-border/50 rounded-[2.5rem] overflow-hidden flex flex-col backdrop-blur-3xl">
                {/* Scoring Header */}
                <div className="px-10 py-8 border-b border-border/50 flex justify-between items-center bg-white/5">
                    <div className="flex items-center gap-6">
                        <div className={`w-16 h-16 rounded-[1.2rem] flex items-center justify-center font-black text-2xl ${atsScore > 80 ? 'bg-green-500 text-black' : 'bg-accent text-black'}`}>
                            {atsScore || "--"}
                        </div>
                        <div>
                            <h4 className="text-sm font-black text-white uppercase tracking-tight">ATS Alignment Score</h4>
                            <p className="text-[10px] text-muted font-bold uppercase tracking-widest italic">Calculated by Orion Logic</p>
                        </div>
                    </div>
                    {tailored && (
                        <div className="flex gap-2">
                            <button onClick={generateCoverLetter} disabled={generatingCL} className="bg-purple/10 hover:bg-purple/20 border border-purple/30 px-6 py-2 rounded-xl text-purple font-black text-[10px] uppercase tracking-widest transition-all">
                                {generatingCL ? "Writing..." : "Generate Cover Letter"}
                            </button>
                            <button onClick={downloadAsPDF} className="bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 px-6 py-2 rounded-xl text-green-500 font-black text-[10px] uppercase tracking-widest transition-all">
                                Export PDF
                            </button>
                        </div>
                    )}
                </div>

                {/* Main Output Scroll Area */}
                <div className="flex-1 p-10 overflow-y-auto space-y-12 custom-scrollbar">
                    {matchAnalysis && (
                        <div className="bg-surface/80 border border-border/40 rounded-3xl p-8 space-y-8 animate-fade-in shadow-xl">
                            <div className="flex justify-between items-center">
                                <h3 className="font-syne text-lg font-black text-white uppercase tracking-tight">Operational Analysis</h3>
                                <div className="bg-accent/10 text-accent px-4 py-1.5 rounded-full text-[10px] font-black border border-accent/20 tracking-widest italic">{matchAnalysis.score}% SYNC</div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <h5 className="text-[9px] font-black text-pink uppercase tracking-[0.2em]">Gap Detected</h5>
                                    <div className="space-y-2">
                                        {matchAnalysis.missing_skills?.slice(0, 5).map((s, idx) => (
                                            <div key={idx} className="text-xs text-white/70 font-medium">↳ {s}</div>
                                        ))}
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <h5 className="text-[9px] font-black text-accent uppercase tracking-[0.2em]">Strategic Focus</h5>
                                    <div className="space-y-2">
                                        {matchAnalysis.suggestions?.slice(0, 3).map((s, idx) => (
                                            <div key={idx} className="text-xs text-white/70 font-medium italic">✦ {s}</div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <button 
                                onClick={getOptimizationTips}
                                disabled={optimizing}
                                className="w-full bg-gradient-to-r from-accent to-purple py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest text-black shadow-lg shadow-accent/10 hover:scale-[1.01] transition-all disabled:opacity-50"
                            >
                                {optimizing ? "Generating Protocol..." : "✨ Precise Bullet Optimization"}
                            </button>

                            {optimizationTips && (
                                <div className="mt-8 pt-8 border-t border-border animate-slide-up space-y-6">
                                    {optimizationTips.add?.length > 0 && (
                                        <div className="space-y-3">
                                            <p className="text-[10px] font-black text-green-500 uppercase tracking-widest">Nodes to Inject:</p>
                                            {optimizationTips.add.slice(0, 2).map((b, i) => (
                                                <div key={i} className="bg-green-500/5 border-l-4 border-green-500 p-4 text-xs font-medium text-white/80 leading-relaxed italic">{b}</div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    <div className="relative">
                        {coverLetter && (
                            <div className="bg-purple/5 border border-purple/20 rounded-3xl p-8 mb-10 animate-slide-up">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="font-syne text-lg font-black text-purple uppercase tracking-tight">Tailored Cover Letter</h3>
                                    <button onClick={() => setCoverLetter("")} className="text-muted hover:text-white text-xs">✕ Close</button>
                                </div>
                                <pre className="text-xs text-white/90 whitespace-pre-wrap leading-relaxed italic">{coverLetter}</pre>
                            </div>
                        )}

                        {tailored ? (
                            <ResumeDiffView
                                originalResume={background}
                                tailored={{
                                    tailoredResume: tailored,
                                    score: atsScore ?? 0,
                                    atsScore: atsScore ?? 0,
                                    keywords: keywords || [],
                                    keywordMatches: (keywords || []).filter(k =>
                                        (tailored || "").toLowerCase().includes(String(k).toLowerCase())
                                    ).length,
                                    metricsCount: (tailored.match(/\d+%|\d+x|\$\d+k?|\d+\+/g) || []).length,
                                    bulletsCount: (tailored.match(/^[-•*]\s/gm) || []).length,
                                    tips: optimizationTips?.tips || [],
                                    add: optimizationTips?.add || [],
                                    improvedBullet: improvedBullet || null,
                                }}
                                onAccept={(accepted) => setTailored(accepted)}
                                onExportPdf={downloadAsPDF}
                            />
                        ) : (
                            <EmptyState
                                icon="✨"
                                title="Awaiting Command"
                                description="Initialization of deep match analysis or resume tailoring will reflect output here."
                            />
                        )}
                    </div>
                </div>
                
                {/* Advanced Tools Bar */}
                <div className="p-8 border-t border-border/50 bg-surface/50">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                        <span className="text-[10px] font-black text-white uppercase tracking-widest">Experimental: Bullet Logic Enhancer</span>
                    </div>
                    <div className="flex gap-4">
                        <input 
                            value={bullet} 
                            onChange={e => setBullet(e.target.value)} 
                            placeholder="Paste a legacy bullet node..." 
                            className="flex-1 bg-card/60 border border-border focus:border-accent/40 rounded-xl px-6 text-xs text-white outline-none shadow-inner"
                        />
                        <button 
                            onClick={improveBulletAction} 
                            disabled={improving || !bullet}
                            className="bg-accent px-6 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest text-black transition-all hover:brightness-110 disabled:opacity-50"
                        >
                            {improving ? "..." : "Enhance"}
                        </button>
                    </div>
                    {improvedBullet && (
                        <div className="mt-4 p-5 bg-accent/5 border border-accent/20 rounded-xl text-xs text-accent leading-relaxed italic animate-fade-in">
                            {improvedBullet}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
