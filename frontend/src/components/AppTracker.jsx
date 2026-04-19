import React, { useState, useEffect, useRef } from "react";
// import { io } from "socket.io-client"; // Disabled temporarily due to local npm block
import { LogoCircle, EmptyState, TrustBadge, AssistantBubble } from "./Common";

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
    
    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-2xl flex items-center justify-center z-[100] p-6">
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
                        <section className="space-y-6">
                            <h4 className="text-[10px] font-black text-accent uppercase tracking-[0.3em] font-syne">Activity Log</h4>
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
                        
                        <section className="bg-white/5 border border-border/30 rounded-[2.5rem] p-8 space-y-6">
                            <h4 className="text-[10px] font-black text-purple uppercase tracking-[0.3em] font-syne">System Notes</h4>
                            <textarea
                                value={app.notes || ""}
                                onChange={e => onUpdate(app.id, { notes: e.target.value })}
                                className="w-full bg-card/60 border border-border/50 focus:border-accent/30 rounded-3xl p-6 text-white text-sm min-h-[150px] outline-none transition-all resize-none shadow-inner italic"
                                placeholder="Log interview intel..."
                            />
                        </section>
                    </div>
                </div>

                <div className="px-12 py-8 bg-surface/80 border-t border-border/50 backdrop-blur-md flex justify-end gap-4">
                    <button onClick={onClose} className="bg-white/5 px-8 py-4 rounded-3xl text-xs font-black uppercase tracking-widest text-muted hover:text-white transition-all">Dismiss</button>
                    {app.job_link && (
                        <button onClick={() => window.open(app.job_link, "_blank")} className="bg-accent px-8 py-4 rounded-3xl text-black font-black text-xs uppercase tracking-widest transition-all">
                            Review Posting
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

const SuccessPattern = ({ label, value, trend }) => (
    <div className="bg-surface border border-border/50 rounded-2xl p-6 flex flex-col gap-2 group hover:border-accent/30 transition-all">
        <span className="text-[10px] font-black text-muted uppercase tracking-widest">{label}</span>
        <div className="flex items-end justify-between">
            <span className="text-2xl font-black font-syne text-white">{value}</span>
            <span className={`text-[10px] font-black ${trend.startsWith('+') ? 'text-accent' : 'text-pink'}`}>{trend}</span>
        </div>
    </div>
);

export default function AppTracker({ applications, setApplications }) {
    const [selectedAppId, setSelectedAppId] = useState(null);
    const selectedApp = applications.find(a => a.id === selectedAppId);

    const socketRef = useRef(null);
    
    useEffect(() => {
        /*
        // Connect to WebSocket for real-time updates (Disabled temporarily)
        const socketUrl = import.meta.env.VITE_WS_URL || import.meta.env.VITE_API_URL || "http://localhost:3001";
        try {
            socketRef.current = io(socketUrl, {
                path: '/socket.io',
                transports: ['websocket']
            });
            
            socketRef.current.on('application_update', (updatedApp) => {
                setApplications(prev => prev.map(app => 
                    app.id === updatedApp.id ? updatedApp : app
                ));
            });
            
            socketRef.current.on('new_application', (newApp) => {
                setApplications(prev => [newApp, ...prev]);
            });
        } catch (e) {
            console.warn("Socket.io not loaded");
        }
        
        return () => {
            if (socketRef.current) socketRef.current.disconnect();
        };
        */
    }, [setApplications]);

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
        } catch (e) { 
            // Local fallback for demo/unconnected
            setApplications(apps => apps.map(a => a.id === id ? { ...a, ...updates } : a));
        }
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

    return (
        <div className="flex flex-col gap-10 h-full max-w-7xl mx-auto">
            {/* 📊 Weekly Growth Header */}
            <div className="bg-surface/50 border border-border/50 rounded-[2.5rem] p-10 backdrop-blur-xl">
                <div className="flex justify-between items-center mb-10">
                    <h1 className="font-syne text-3xl font-black text-white uppercase tracking-tighter">🚀 Application Velocity</h1>
                    <div className="flex gap-4">
                        <div className="text-right">
                            <p className="text-[9px] font-black text-muted uppercase tracking-widest">Active Trials</p>
                            <p className="text-xl font-black text-accent">{applications.length}</p>
                        </div>
                    </div>
                </div>

                <div className="flex items-end gap-3 h-32 mb-10 pb-6 border-b border-white/5">
                    {[12, 18, 15, 25, 32, 28, 45].map((val, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center gap-3 group">
                            <div className="w-full bg-accent/10 rounded-t-xl overflow-hidden relative" style={{ height: `${val}%` }}>
                                <div className={`absolute inset-0 bg-accent transition-all duration-1000 ${i === 6 ? 'opacity-100' : 'opacity-20 group-hover:opacity-40'}`} />
                            </div>
                            <span className="text-[9px] font-black text-muted uppercase">{['M','T','W','T','F','S','S'][i]}</span>
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <SuccessPattern label="Interview Rate" value="14.2%" trend="+2.4%" />
                    <SuccessPattern label="Avg Match" value="82%" trend="+5%" />
                    <SuccessPattern label="Response Window" value="3.2 Days" trend="-12%" />
                    <SuccessPattern label="Peak Activity" value="Tuesdays" trend="Optimized" />
                </div>
            </div>

            <AssistantBubble 
                message="Pattern Detected: Applying between 8 AM - 10 AM EST has increased your response rate by 22%. Maintain this window for current targets."
                actionLabel="Schedule Applications"
            />

            {/* 📋 Operational Board */}
            <div className="flex-1 flex gap-8 overflow-x-auto pb-10 custom-scrollbar min-h-[600px] select-none">
                {TRACKER_STAGES.map(stage => {
                    const stageApps = applications.filter(a => a.stage === stage);
                    const color = STAGE_COLORS[stage];
                    return (
                        <div key={stage} className="flex-shrink-0 w-80 flex flex-col gap-6">
                            <div className="flex items-center justify-between px-4">
                                <div className="flex items-center gap-3">
                                    <span className="text-xl">{STAGE_ICONS[stage]}</span>
                                    <h3 className={`font-syne font-black text-sm uppercase tracking-widest italic ${color}`}>{stage}</h3>
                                </div>
                                <span className="bg-white/5 text-muted px-3 py-1 rounded-full text-[10px] font-black">{stageApps.length}</span>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto space-y-4 pr-1 custom-scrollbar">
                                {stageApps.map(app => (
                                    <div 
                                        key={app.id} 
                                        onClick={() => setSelectedAppId(app.id)} 
                                        className={`group bg-card/40 border border-border/50 rounded-[2rem] p-6 cursor-pointer hover:border-accent/30 hover:bg-card/60 transition-all relative overflow-hidden`}
                                    >
                                        <div className="absolute top-0 right-0 w-16 h-16 bg-accent/5 blur-2xl rounded-full -mr-8 -mt-8 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        
                                        <div className="flex gap-4 items-start mb-6">
                                            <LogoCircle letter={app.logo} size={40} />
                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-white font-black text-sm truncate uppercase tracking-tight group-hover:text-accent transition-colors">{app.company}</h4>
                                                <p className="text-muted text-[10px] font-bold truncate italic">{app.role}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between mb-6">
                                            <span className="text-[10px] text-muted font-black uppercase tracking-widest">{app.date}</span>
                                            {app.match_score && (
                                                <div className="px-3 py-1 bg-accent/5 border border-accent/20 rounded-full">
                                                    <span className="text-[10px] font-black text-accent">{app.match_score}% Fit</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); moveStage(app.id, -1); }} 
                                                disabled={TRACKER_STAGES.indexOf(stage) === 0}
                                                className="flex-1 bg-white/5 hover:bg-white/10 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all disabled:hidden"
                                            >
                                                ←
                                            </button>
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); moveStage(app.id, 1); }} 
                                                disabled={TRACKER_STAGES.indexOf(stage) === TRACKER_STAGES.length - 1}
                                                className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${STAGE_BG[stage]} ${color} hover:brightness-125 disabled:hidden`}
                                            >
                                                Next →
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {stageApps.length === 0 && (
                                    <div className="h-40 border-2 border-dashed border-border/20 rounded-[2rem] flex items-center justify-center grayscale opacity-20 group">
                                        <span className="text-[10px] font-black uppercase tracking-widest italic group-hover:opacity-100 transition-opacity">Operational Link Space</span>
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
                        icon="🏁"
                        title="Command Matrix Ready"
                        description="Synchronize your first job target to initialize real-time tracking."
                    />
                </div>
            )}

            {selectedApp && <AppDetailModal app={selectedApp} onClose={() => setSelectedAppId(null)} onUpdate={updateApp} />}
        </div>
    );
}
