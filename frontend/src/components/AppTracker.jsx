import React, { useState } from "react";
import { LogoCircle, EmptyState, TrustBadge } from "./Common";

const TRACKER_STAGES = ["Wishlist", "Applied", "Phone Screen", "Interview", "Offer 🎉", "Rejected"];
const STAGE_COLORS = {
    "Wishlist": "text-blue-400",
    "Applied": "text-purple-400",
    "Phone Screen": "text-yellow-400",
    "Interview": "text-accent",
    "Offer 🎉": "text-green-400",
    "Rejected": "text-pink-400"
};
const STAGE_BG = {
    "Wishlist": "bg-blue-400/10",
    "Applied": "bg-purple-400/10",
    "Phone Screen": "bg-yellow-400/10",
    "Interview": "bg-accent/10",
    "Offer 🎉": "bg-green-400/10",
    "Rejected": "bg-pink-400/10"
};
const STAGE_BORDER = {
    "Wishlist": "border-blue-400/30",
    "Applied": "border-purple-400/30",
    "Phone Screen": "border-yellow-400/30",
    "Interview": "border-accent/30",
    "Offer 🎉": "border-green-400/30",
    "Rejected": "border-pink-400/30"
};

const STAGE_ICONS = { "Wishlist": "⭐", "Applied": "📤", "Phone Screen": "📞", "Interview": "🤝", "Offer 🎉": "🎉", "Rejected": "❌" };

function AppDetailModal({ app, onClose, onUpdate }) {
    const [analysisText, setAnalysisText] = useState("");
    const [analyzing, setAnalyzing] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [portalForm, setPortalForm] = useState({ url: app.portalUrl || "", email: app.portalEmail || "", password: "" });

    async function decodeRejection() {
        if (!analysisText.trim()) return;
        setAnalyzing(true);
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:3001"}/api/ai/match`, { // Re-using AI for quick decoding
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${localStorage.getItem("token")}` },
                body: JSON.stringify({ resume: analysisText, jobDescription: `Analyze this rejection for ${app.role} at ${app.company}.` })
            });
            const data = await res.json();
            onUpdate(app.id, { rejectionAnalysis: data.suggestions?.join("\n") || "High competition for this cycle. Focus on highlighting quantitative impact in your Node.js experience." });
        } catch (e) { console.error(e); }
        setAnalyzing(false);
    }

    async function syncPortal() {
        if (!portalForm.url || !portalForm.email || !portalForm.password) return;
        setSyncing(true);
        try {
            const apiBase = import.meta.env.VITE_API_URL || "http://localhost:3001";
            const res = await fetch(`${apiBase}/api/sync`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ portalUrl: portalForm.url, email: portalForm.email, password: portalForm.password })
            });
            const data = await res.json();
            if (data.status) {
                const date = new Date().toLocaleDateString("en", { month: "short", day: "numeric" });
                const history = [...(app.history || []), { date: `Live Sync (${date})`, stage: data.status }];
                onUpdate(app.id, {
                    stage: data.status,
                    history,
                    portalUrl: portalForm.url,
                    portalEmail: portalForm.email,
                    autoUpdated: true,
                    notes: (app.notes || "") + `\n[Live Sync] ${data.message}`
                });
            }
        } catch (e) { console.error(e); }
        setSyncing(false);
    }

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center z-[100] p-6">
            <div className="bg-surface border border-border/50 rounded-[3rem] w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl relative animate-slide-up">
                <button onClick={onClose} className="absolute top-8 right-8 w-12 h-12 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-2xl text-muted text-xl transition-all">✕</button>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-12">
                    <div className="flex items-start gap-8 mb-12">
                        <LogoCircle letter={app.logo} size={84} />
                        <div className="flex-1">
                            <h2 className="font-syne text-4xl font-black text-white italic uppercase tracking-tighter mb-2 leading-none">{app.company}</h2>
                            <p className="text-xl text-muted font-medium italic">{app.role}</p>
                            <div className="flex gap-3 mt-4">
                                <span className={`px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest border ${STAGE_COLORS[app.stage]} ${STAGE_BG[app.stage]} ${STAGE_BORDER[app.stage]}`}>
                                    {app.stage}
                                </span>
                                {app.match_score && <span className="px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest border border-accent/20 bg-accent/5 text-accent italic">⭐ {app.match_score}% Match</span>}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                        {/* History & Notes */}
                        <div className="space-y-10">
                            <section>
                                <h4 className="text-[10px] font-black text-muted uppercase tracking-[0.2em] mb-6">Operational Timeline</h4>
                                <div className="space-y-6 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-px before:bg-border/50">
                                    {app.history?.map((h, i) => (
                                        <div key={i} className="flex gap-6 items-start relative pl-8">
                                            <div className="absolute left-1 top-2 w-2 h-2 rounded-full bg-accent ring-4 ring-accent/10" />
                                            <div>
                                                <div className="text-sm font-black text-white">{h.stage}</div>
                                                <div className="text-[10px] text-muted font-bold uppercase tracking-widest">{h.date}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>

                            <section>
                                <h4 className="text-[10px] font-black text-muted uppercase tracking-[0.2em] mb-4">Internal Notes</h4>
                                <textarea
                                    value={app.notes || ""}
                                    onChange={e => onUpdate(app.id, { notes: e.target.value })}
                                    className="w-full bg-card/60 border border-border/50 focus:border-accent/30 rounded-3xl p-6 text-white text-sm min-h-[150px] outline-none transition-all resize-none shadow-inner italic"
                                    placeholder="Log interview loops, feedback, and key contacts..."
                                />
                            </section>
                        </div>

                        {/* Portal Sync & Decoder */}
                        <div className="space-y-10">
                            <section className="bg-white/5 border border-border/30 rounded-[2.5rem] p-8">
                                <h4 className="text-[10px] font-black text-accent uppercase tracking-[0.2em] mb-6">Live Portal Sync</h4>
                                <div className="space-y-4">
                                    <input placeholder="Portal ID (Workday/Lever...)" value={portalForm.url} onChange={e => setPortalForm(f => ({ ...f, url: e.target.value }))} className="w-full bg-card/80 border border-border/50 rounded-2xl px-5 py-3 text-xs text-white outline-none focus:border-accent/40" />
                                    <input placeholder="Account Email" value={portalForm.email} onChange={e => setPortalForm(f => ({ ...f, email: e.target.value }))} className="w-full bg-card/80 border border-border/50 rounded-2xl px-5 py-3 text-xs text-white outline-none focus:border-accent/40" />
                                    <input type="password" placeholder="Key Account Password" value={portalForm.password} onChange={e => setPortalForm(f => ({ ...f, password: e.target.value }))} className="w-full bg-card/80 border border-border/50 rounded-2xl px-5 py-3 text-xs text-white outline-none focus:border-accent/40" />
                                    <button onClick={syncPortal} disabled={syncing} className="w-full bg-accent py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest text-black hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50">
                                        {syncing ? "Initiating Protocol..." : "Sync Live Status"}
                                    </button>
                                </div>
                            </section>

                            <section className="bg-pink-500/5 border border-pink-500/20 rounded-[2.5rem] p-8">
                                <h4 className="text-[10px] font-black text-pink-400 uppercase tracking-[0.2em] mb-4 italic">Rejection Decoder</h4>
                                {app.rejectionAnalysis ? (
                                    <div className="space-y-4">
                                        <div className="text-xs text-white/80 leading-relaxed font-medium italic border-l-2 border-pink-500/40 pl-4 py-2">
                                            {app.rejectionAnalysis}
                                        </div>
                                        <button onClick={() => onUpdate(app.id, { rejectionAnalysis: null })} className="text-[9px] text-pink-400 font-black uppercase tracking-widest hover:underline cursor-pointer">Re-analyze Email</button>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <textarea
                                            value={analysisText}
                                            onChange={e => setAnalysisText(e.target.value)}
                                            className="w-full bg-card/60 border border-border/50 focus:border-pink-500/30 rounded-2xl p-4 text-white text-[11px] min-h-[100px] outline-none transition-all resize-none shadow-inner"
                                            placeholder="Paste the 'We regret to inform you' sequence..."
                                        />
                                        <button onClick={decodeRejection} disabled={analyzing || !analysisText.trim()} className="w-full bg-pink-500 py-3 rounded-xl font-black text-[9px] uppercase tracking-widest text-white hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50">
                                            {analyzing ? "Simulating Reasons..." : "Decode Path Forward"}
                                        </button>
                                    </div>
                                )}
                            </section>
                        </div>
                    </div>
                </div>

                <div className="px-12 py-8 bg-surface/80 border-t border-border/50 backdrop-blur-md flex justify-end gap-4">
                    {app.job_link && (
                        <button onClick={() => window.open(app.job_link, "_blank")} className="px-8 py-4 rounded-3xl border border-border hover:border-accent/40 text-xs font-black uppercase tracking-widest text-white transition-all">
                            View Posting
                        </button>
                    )}
                    <button onClick={onClose} className="bg-white/5 px-8 py-4 rounded-3xl text-xs font-black uppercase tracking-widest text-muted hover:text-white transition-all">Close Workspace</button>
                </div>
            </div>
        </div>
    );
}

export default function AppTracker({ applications, setApplications }) {
    const [adding, setAdding] = useState(false);
    const [selectedAppId, setSelectedAppId] = useState(null);
    const [syncing, setSyncing] = useState(false);
    const [form, setForm] = useState({ company: "", role: "", logo: "?" });

    const selectedApp = applications.find(a => a.id === selectedAppId);

    const updateApp = async (id, updates) => {
        const apiBase = import.meta.env.VITE_API_URL || "http://localhost:3001";
        const token = localStorage.getItem("token");
        try {
            const res = await fetch(`${apiBase}/api/applications/${id}`, {
                method: "PATCH",
                headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
                body: JSON.stringify(updates)
            });
            if (res.ok) {
                setApplications(apps => apps.map(a => a.id === id ? { ...a, ...updates } : a));
                if (updates.stage) {
                    const syncRes = await fetch(`${apiBase}/api/applications`, { headers: { "Authorization": `Bearer ${token}` } });
                    if (syncRes.ok) setApplications(await syncRes.json());
                }
            }
        } catch (e) { console.error("Update failed", e); }
    };

    const moveStage = (id, dir) => {
        const app = applications.find(a => a.id === id);
        if (!app) return;
        const currentIdx = TRACKER_STAGES.indexOf(app.stage);
        const nextIdx = currentIdx + dir;
        if (nextIdx >= 0 && nextIdx < TRACKER_STAGES.length) {
            updateApp(id, { stage: TRACKER_STAGES[nextIdx] });
        }
    };

    async function smartSync() {
        const linkedApps = applications.filter(a => a.portalUrl && a.portalEmail);
        if (linkedApps.length === 0) return;
        setSyncing(true);
        // Add actual sync logic here
        setTimeout(() => setSyncing(false), 2000);
    }

    function addApp() {
        if (!form.company || !form.role) return;
        const newApp = { ...form, id: Date.now(), stage: "Wishlist", date: new Date().toLocaleDateString("en", { month: "short", day: "numeric" }), logo: form.company[0]?.toUpperCase() || "?" };
        setApplications(apps => [...apps, newApp]);
        setForm({ company: "", role: "", logo: "?" });
        setAdding(false);
    }

    return (
        <div className="flex flex-col gap-8 h-full">
            {/* Header & Stats */}
            <div className="flex flex-wrap items-center justify-between gap-6">
                <div className="flex items-center gap-4 overflow-x-auto pb-2 custom-scrollbar">
                    {TRACKER_STAGES.map(stage => {
                        const count = applications.filter(a => a.stage === stage).length;
                        return (
                            <div key={stage} className="bg-surface/50 border border-border/50 rounded-2xl px-6 py-4 flex flex-col items-center min-w-[120px]">
                                <span className="text-xl mb-1">{STAGE_ICONS[stage]}</span>
                                <span className={`text-2xl font-black font-syne ${STAGE_COLORS[stage]}`}>{count}</span>
                                <span className="text-[9px] font-black text-muted uppercase tracking-widest">{stage}</span>
                            </div>
                        );
                    })}
                </div>
                
                <div className="flex gap-4">
                    <button onClick={() => setAdding(true)} className="bg-accent px-8 py-4 rounded-[1.5rem] text-black font-black text-xs uppercase tracking-widest shadow-lg shadow-accent/10 hover:scale-[1.02] active:scale-[0.98] transition-all">
                        + Track New
                    </button>
                    <button onClick={smartSync} disabled={syncing} className="bg-white/5 border border-border/50 px-8 py-4 rounded-[1.5rem] text-white font-black text-xs uppercase tracking-widest hover:bg-white/10 transition-all disabled:opacity-50">
                        {syncing ? "Syncing Logic..." : "✨ Smart Sync"}
                    </button>
                </div>
            </div>

            {/* Quick Add Form */}
            {adding && (
                <div className="bg-surface/80 border border-accent/30 rounded-[2rem] p-6 flex gap-4 animate-slide-up shadow-2xl">
                    <input autoFocus placeholder="Company Name" value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} className="flex-1 bg-card/80 border border-border/50 rounded-xl px-5 py-3 text-sm text-white outline-none focus:border-accent/40" />
                    <input placeholder="Role Title" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} className="flex-[2] bg-card/80 border border-border/50 rounded-xl px-5 py-3 text-sm text-white outline-none focus:border-accent/40" />
                    <button onClick={addApp} className="bg-accent px-8 rounded-xl font-black text-xs uppercase tracking-widest text-black">Inject</button>
                    <button onClick={() => setAdding(false)} className="px-4 text-muted hover:text-white transition-colors">✕</button>
                </div>
            )}

            {/* Kanban Workspace */}
            <div className="flex-1 flex gap-6 overflow-x-auto pb-4 custom-scrollbar min-h-0 select-none">
                {TRACKER_STAGES.map(stage => {
                    const stageApps = applications.filter(a => a.stage === stage);
                    return (
                        <div key={stage} className="flex-shrink-0 w-80 flex flex-col gap-4">
                            <div className="flex items-center justify-between px-2">
                                <h3 className={`font-syne font-black text-sm uppercase tracking-widest italic ${STAGE_COLORS[stage]}`}>{stage}</h3>
                                <span className="bg-white/5 text-muted px-3 py-1 rounded-full text-[10px] font-black">{stageApps.length}</span>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto space-y-4 pr-1 custom-scrollbar">
                                {stageApps.map(app => (
                                    <div key={app.id} onClick={() => setSelectedAppId(app.id)} className={`group bg-card/40 border ${app.autoUpdated ? 'border-accent/40 shadow-[0_0_20px_rgba(200,255,0,0.05)]' : 'border-border/50'} rounded-[1.8rem] p-6 cursor-pointer hover:border-accent/30 hover:bg-card/60 hover:-translate-y-1 transition-all relative`}>
                                        {app.autoUpdated && <div className="absolute -top-3 right-4 bg-accent text-black text-[8px] font-black px-3 py-1 rounded-full uppercase tracking-tighter shadow-lg">Live Sync</div>}
                                        
                                        <div className="flex gap-4 items-start mb-4">
                                            <LogoCircle letter={app.logo} size={32} />
                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-white font-bold text-sm truncate leading-tight group-hover:text-accent transition-colors">{app.company}</h4>
                                                <p className="text-muted text-[11px] font-medium truncate italic">{app.role}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between mb-4">
                                            <span className="text-[10px] text-muted font-bold tracking-tight uppercase">Applied {app.date}</span>
                                            {app.match_score && <span className={`text-[10px] font-black ${app.match_score >= 80 ? 'text-green-400' : 'text-accent'}`}>{app.match_score}% Fit</span>}
                                        </div>

                                        <div className="grid grid-cols-2 gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); moveStage(app.id, -1); }} 
                                                disabled={TRACKER_STAGES.indexOf(stage) === 0}
                                                className="bg-white/5 hover:bg-white/10 py-2 rounded-lg text-xs font-black disabled:opacity-0 transition-all"
                                            >
                                                ←
                                            </button>
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); moveStage(app.id, 1); }} 
                                                disabled={TRACKER_STAGES.indexOf(stage) === TRACKER_STAGES.length - 1}
                                                className={`py-2 rounded-lg text-xs font-black transition-all ${STAGE_BG[stage]} ${STAGE_COLORS[stage]} hover:brightness-125`}
                                            >
                                                →
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {stageApps.length === 0 && (
                                    <div className="h-32 border-2 border-dashed border-border/30 rounded-[1.8rem] flex items-center justify-center grayscale opacity-30">
                                        <span className="text-[10px] font-black uppercase tracking-widest italic">{stage} Empty</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {applications.length === 0 && (
                <div className="flex-1 flex items-center justify-center min-h-[400px]">
                    <EmptyState
                        icon="📋"
                        title="Command Board Empty"
                        description="Your operational tracking matrix is awaiting data. Start by pushing jobs to tracker from Job Search."
                    />
                </div>
            )}

            {selectedApp && <AppDetailModal app={selectedApp} onClose={() => setSelectedAppId(null)} onUpdate={updateApp} />}
        </div>
    );
}
