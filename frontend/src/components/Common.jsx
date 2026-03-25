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

export function HeroSection({ title, subtitle, bullets, ctas }) {
    return (
        <div className="relative bg-surface/30 border border-border/50 rounded-[3rem] p-12 overflow-hidden mb-12">
            <div className="absolute top-0 right-0 w-1/2 h-full bg-accent/5 blur-[120px] rounded-full -mr-24 -mt-24 pointer-events-none" />
            <div className="relative z-10 flex flex-col md:flex-row items-center gap-12">
                <div className="flex-1 space-y-6">
                    <h1 className="font-syne text-5xl font-black text-white leading-tight uppercase tracking-tight">
                        {title}
                    </h1>
                    <p className="text-muted text-lg font-medium max-w-xl">
                        {subtitle}
                    </p>
                    <div className="space-y-3">
                        {bullets.map((b, i) => (
                            <div key={i} className="flex items-center gap-3 text-white/80 font-bold tracking-tight">
                                <span className="text-accent">✔</span> {b}
                            </div>
                        ))}
                    </div>
                    <div className="flex gap-4 pt-4">
                        {ctas.map((cta, i) => (
                            <button 
                                key={i} 
                                onClick={cta.onClick}
                                className={`px-8 py-4 rounded-2xl font-syne font-black uppercase tracking-widest text-xs transition-colors ${cta.primary ? 'bg-accent text-black hover:brightness-110' : 'bg-white/5 text-white hover:bg-white/10 border border-border'}`}
                            >
                                {cta.label}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="hidden lg:block w-1/3 aspect-square bg-gradient-to-tr from-accent/20 to-purple/20 rounded-[3rem] border border-white/10 flex items-center justify-center text-8xl animate-bounce-slow">
                    🚀
                </div>
            </div>
        </div>
    );
}

export function FlowStepper({ steps, currentStep }) {
    return (
        <div className="flex items-center justify-between w-full mb-12 px-4">
            {steps.map((step, i) => {
                const isActive = i <= currentStep;
                const isCurrent = i === currentStep;
                return (
                    <React.Fragment key={i}>
                        <div className="flex flex-col items-center gap-2 group relative">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs transition-all duration-500 ${isActive ? 'bg-accent text-black shadow-[0_0_20px_rgba(200,255,0,0.3)]' : 'bg-surface border border-border text-muted opacity-50'}`}>
                                {i + 1}
                            </div>
                            <span className={`text-[10px] font-black uppercase tracking-widest absolute -bottom-6 whitespace-nowrap transition-colors ${isCurrent ? 'text-white' : 'text-muted'}`}>
                                {step}
                            </span>
                        </div>
                        {i < steps.length - 1 && (
                            <div className={`flex-1 h-px transition-colors duration-500 mx-4 ${i < currentStep ? 'bg-accent' : 'bg-border'}`} />
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
}

export function MatchBadgeLarge({ score }) {
    const isHigh = score >= 80;
    const color = isHigh ? 'text-accent border-accent/20 bg-accent/5' : 'text-purple border-purple/20 bg-purple/5';
    return (
        <div className={`flex flex-col items-center p-6 rounded-[2rem] border ${color} transition-all hover:scale-105`}>
            <span className="text-4xl font-black font-syne">{score}%</span>
            <span className="text-[10px] font-black uppercase tracking-widest mt-1">Match Score</span>
        </div>
    );
}

export function MatchChanceBadge({ score }) {
    if (score >= 80) return <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-400">🟢 High Interview Chance</div>;
    if (score >= 60) return <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-amber-400">🟡 Medium Interview Chance</div>;
    return <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-pink">🔴 Low Match - Skip</div>;
}

export function AssistantBubble({ message, actionLabel, onAction }) {
    return (
        <div className="bg-gradient-to-r from-accent/10 to-purple/10 border border-white/10 rounded-[2.5rem] p-8 flex items-center gap-8 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 blur-3xl rounded-full -mr-16 -mt-16 group-hover:bg-accent/10 transition-colors" />
            <div className="w-16 h-16 rounded-2xl bg-accent flex items-center justify-center text-3xl animate-bounce-slow flex-shrink-0 shadow-lg shadow-accent/20">💡</div>
            <div className="flex-1 space-y-2">
                <span className="text-[10px] font-black text-accent uppercase tracking-[0.2em]">Assistant Insight</span>
                <p className="text-white text-lg font-medium leading-tight">{message}</p>
            </div>
            {actionLabel && (
                <button 
                    onClick={onAction}
                    className="px-6 py-3 bg-white/5 hover:bg-white text-[10px] text-white hover:text-black font-black uppercase tracking-widest rounded-xl border border-white/10 transition-all hover:scale-110 active:scale-95"
                >
                    {actionLabel}
                </button>
            )}
        </div>
    );
}
