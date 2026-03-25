import React from 'react';

export function TagBadge({ label }) {
    const colors = {
        "New Grad": "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
        "H1B Sponsor": "bg-purple-500/10 text-purple-400 border-purple-500/20",
        "OPT Friendly": "bg-green-500/10 text-green-400 border-green-500/20",
        "Remote Friendly": "bg-blue-500/10 text-blue-400 border-blue-500/20",
        "Fresher Friendly": "bg-amber-500/10 text-amber-400 border-amber-500/20",
        "Remote": "bg-sky-500/10 text-sky-400 border-sky-500/20",
    };
    const colorClass = colors[label] || "bg-zinc-500/10 text-zinc-400 border-zinc-500/20";
    
    return (
        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all hover:brightness-125 cursor-default ${colorClass}`}>
            {label}
        </span>
    );
}

export function LogoCircle({ letter, logoUrl, size = 48 }) {
    return (
        <div 
            className="rounded-2xl bg-zinc-800 flex items-center justify-center font-syne font-black text-white overflow-hidden border border-border/50 transition-all hover:scale-110 hover:-rotate-3 flex-shrink-0"
            style={{ width: size, height: size, fontSize: size * 0.4 }}
        >
            {logoUrl ? (
                <img src={logoUrl} alt={letter} className="w-full h-full object-contain p-2 bg-white" />
            ) : (
                letter
            )}
        </div>
    );
}

export function MatchRing({ score }) {
    const color = score >= 85 ? 'text-accent' : score >= 70 ? 'text-purple' : 'text-zinc-500';
    return (
        <div className="flex flex-col items-center gap-1">
            <div className="relative h-12 w-12 flex items-center justify-center">
                <svg className="h-full w-full -rotate-90">
                    <circle cx="24" cy="24" r="20" fill="transparent" stroke="currentColor" strokeWidth="4" className="text-white/5" />
                    <circle 
                        cx="24" 
                        cy="24" 
                        r="20" 
                        fill="transparent" 
                        stroke="currentColor" 
                        strokeWidth="4" 
                        strokeDasharray={`${2 * Math.PI * 20}`} 
                        strokeDashoffset={`${2 * Math.PI * 20 * (1 - (score || 0) / 100)}`} 
                        className={`${color} stroke-linecap-round transition-all duration-1000`} 
                    />
                </svg>
                <span className={`absolute text-[10px] font-black ${color}`}>{score}%</span>
            </div>
            <span className="text-[9px] font-black uppercase tracking-tighter text-muted">Match</span>
        </div>
    );
}

export function SkeletonCard() {
    return (
        <div className="bg-card/40 border border-border/50 rounded-3xl p-6 animate-pulse space-y-4">
            <div className="flex items-start justify-between">
                <div className="w-14 h-14 bg-zinc-800 rounded-2xl" />
                <div className="w-20 h-8 bg-zinc-800 rounded-xl" />
            </div>
            <div className="space-y-2">
                <div className="h-5 bg-zinc-800 rounded-lg w-3/4" />
                <div className="h-4 bg-zinc-800 rounded-lg w-1/2" />
            </div>
            <div className="flex gap-2">
                <div className="h-6 bg-zinc-800 rounded-lg w-16" />
                <div className="h-6 bg-zinc-800 rounded-lg w-20" />
            </div>
        </div>
    );
}

export function EmptyState({ icon, title, description }) {
    return (
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-4">
            <div className="text-6xl animate-bounce-slow">{icon}</div>
            <h3 className="font-syne text-2xl font-black uppercase tracking-tight text-white">{title}</h3>
            <p className="text-muted max-w-xs text-sm font-medium leading-relaxed">{description}</p>
        </div>
    );
}

export function TrustBadge() {
    return (
        <div className="inline-flex items-center gap-1.5 bg-accent/10 border border-accent/20 rounded-xl px-3 py-1.5 text-accent text-[10px] font-black uppercase tracking-wider shadow-[0_0_15px_rgba(200,255,0,0.1)]">
            <span className="text-xs">✅</span>
            <span>Direct Apply</span>
        </div>
    );
}

export function RecentlyPostedBadge() {
    return (
        <div className="inline-flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-1.5 text-emerald-400 text-[10px] font-black uppercase tracking-wider">
            <span className="text-xs">🔥</span>
            <span>Hot Post</span>
        </div>
    );
}

export function Toast({ message, type = "success", onClose }) {
    const color = type === "success" ? "border-accent text-accent" : "border-pink text-pink";
    return (
        <div className={`fixed bottom-8 right-8 bg-card border-l-4 p-6 rounded-2xl shadow-2xl z-[100] animate-slide-up flex items-center gap-4 ${color}`}>
            <span className="text-xl">{type === "success" ? "✓" : "✕"}</span>
            <div className="text-sm font-bold tracking-tight text-white">{message}</div>
            <button onClick={onClose} className="ml-4 text-muted hover:text-white transition-colors text-xl">×</button>
        </div>
    );
}
