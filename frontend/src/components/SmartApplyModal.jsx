import React, { useState, useEffect } from 'react';
import { LogoCircle } from './Common';
import AutoFixEngine from './AutoFixEngine';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function CopyButton({ text, label }) {
    const [copied, setCopied] = useState(false);
    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (e) { /* fallback */ }
    };
    return (
        <button
            onClick={handleCopy}
            className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                copied ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-white/5 text-white/60 border border-white/10 hover:bg-white/10'
            }`}
        >
            {copied ? '✓ Copied' : `📋 Copy ${label}`}
        </button>
    );
}

function AgentReplayLog({ logs }) {
    const [expanded, setExpanded] = useState(false);
    const [playing, setPlaying] = useState(false);
    const [visibleLogs, setVisibleLogs] = useState([]);
    
    useEffect(() => {
        if (!playing && expanded && logs && visibleLogs.length === 0) {
            setVisibleLogs(logs); // fallback to immediate display
        }
    }, [expanded, logs, playing]);

    if (!logs || logs.length === 0) return null;

    const actionIcons = {
        'analyze_jd': '🔍', 'analyze_jd_orchestrator': '🔍',
        'extract_keywords': '📝',
        'score_resume': '📊',
        'generate_fix': '⚡', 'auto_fix': '⚡',
        'apply_fix': '✅',
        'tailor_resume': '🪄',
        'dispatch': '🚀',
        'default': '⚙️'
    };

    const handleReplay = async (e) => {
        e.stopPropagation();
        setExpanded(true);
        setPlaying(true);
        setVisibleLogs([]);
        
        for (let i = 0; i < logs.length; i++) {
            await new Promise(r => setTimeout(r, Math.max(200, Math.min(800, logs[i].duration_ms || 400))));
            setVisibleLogs(prev => [...prev, logs[i]]);
        }
        setPlaying(false);
    };

    return (
        <div className="border-t border-white/5 pt-6 mt-6">
            <div className="flex items-center justify-between w-full group">
                <button
                    onClick={() => setExpanded(!expanded)}
                    className="flex items-center gap-2 flex-1 text-left"
                >
                    <span className={`w-1.5 h-1.5 rounded-full ${playing ? 'bg-green-400 animate-pulse' : 'bg-accent'}`} />
                    <span className="text-[9px] font-black text-white/40 uppercase tracking-[0.2em] group-hover:text-white/60 transition-colors">
                        Agent Activity Log ({logs.length} actions)
                    </span>
                    <span className="text-white/20 text-xs ml-2">{expanded ? '▲' : '▼'}</span>
                </button>
                <button 
                    onClick={handleReplay}
                    disabled={playing}
                    className="px-3 py-1.5 rounded-lg bg-accent/10 border border-accent/20 text-accent hover:bg-accent/20 text-[8px] font-black uppercase tracking-widest disabled:opacity-50"
                >
                    {playing ? 'Playing...' : '▶ Replay Session'}
                </button>
            </div>
            {expanded && (
                <div className="mt-4 bg-black/30 rounded-2xl border border-white/5 p-4 space-y-1 max-h-[250px] overflow-y-auto custom-scrollbar font-mono">
                    {visibleLogs.map((log, i) => (
                        <div key={i} className="flex items-start gap-3 py-1.5 border-b border-white/[0.03] last:border-0 animate-fade-in">
                            <span className="text-xs mt-0.5">{actionIcons[log.action] || actionIcons.default}</span>
                            <div className="flex-1 min-w-0">
                                <span className="text-[10px] text-white/70 font-medium">{log.action.replace(/_/g, ' ')}</span>
                                {log.duration_ms && <span className="text-[9px] text-white/30 ml-2">{log.duration_ms}ms</span>}
                            </div>
                            <span className={`text-[8px] font-bold uppercase tracking-widest ${
                                log.status === 'complete' ? 'text-green-400' : log.status === 'failed' ? 'text-red-400' : 'text-accent'
                            }`}>
                                {log.status === 'complete' ? '✓' : log.status === 'failed' ? '✕' : '...'}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default function SmartApplyModal({ 
    job, tailoredResume, changesMade, analysis, streamState, error, 
    onRetry, onApprove, onCancel, stage = "ready" 
}) {
    if (!job) return null;

    const [activityLogs, setActivityLogs] = useState([]);
    const [fixesReviewed, setFixesReviewed] = useState(false);
    const [editableResume, setEditableResume] = useState('');

    useEffect(() => {
        if (tailoredResume) setEditableResume(tailoredResume);
    }, [tailoredResume]);

    // Fetch activity logs for replay
    useEffect(() => {
        if (analysis?.sessionId) {
            (async () => {
                try {
                    const token = localStorage.getItem('token');
                    const res = await fetch(`${API}/api/agent/activity/${analysis.sessionId}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    const data = await res.json();
                    if (Array.isArray(data)) setActivityLogs(data);
                } catch (e) { /* non-critical */ }
            })();
        }
    }, [analysis?.sessionId]);

    const confidence = analysis?.applyConfidence || analysis?.confidence || "MED";
    const chance = analysis?.responseProbability || analysis?.expectedResponseChance || "5-10%";
    const atsType = analysis?.ats_type || 'custom';
    const tier = atsType === 'greenhouse' || atsType === 'lever' ? 3 : (atsType === 'workday' ? 2 : 1);
    const autoFixable = analysis?.autoFixable || [];
    const atsScore = analysis?.atsScore || { current: 65, projected: 85 };
    const fieldConfidence = analysis?.fieldConfidence || {};

    const tierConfig = {
        3: { label: "FULL AUTO-DISPATCH", icon: "⚡", desc: "Our engine will complete and submit this application directly via API.", color: "text-accent" },
        2: { label: "SMART COPY-PASTE KIT", icon: "🪄", desc: "We'll prepare all your tailored answers for easy copy-paste into the portal.", color: "text-purple" },
        1: { label: "COPY-PASTE KIT", icon: "📋", desc: "Your tailored materials are ready. Copy each section and paste into the application.", color: "text-blue-400" }
    }[tier];

    const confidenceStyles = {
        HIGH: "text-accent border-accent/20 bg-accent/5",
        MED: "text-purple border-purple/20 bg-purple/5",
        LOW: "text-pink border-pink/20 bg-pink/5"
    }[confidence];

    // 5-step pipeline
    const steps = [
        { id: 'analyzing', label: 'Analyzing Job', icon: '🔍' },
        { id: 'scoring', label: 'Scoring Resume', icon: '📊' },
        { id: 'fixing', label: 'Auto-Fix', icon: '⚡' },
        { id: 'review', label: 'Review & Edit', icon: '📝' },
        { id: 'ready', label: 'Dispatch', icon: '🚀' }
    ];

    const currentStepIdx = steps.findIndex(s => s.id === stage);

    if (stage === "failed") {
        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 backdrop-blur-md bg-transparent animate-fade-in">
                <div className="absolute inset-0 bg-black/60 cursor-pointer" onClick={onCancel}></div>
                <div className="bg-surface border border-pink/30 rounded-[3rem] p-8 max-w-lg w-full shadow-2xl relative z-10 overflow-hidden text-center">
                    <div className="absolute inset-0 bg-pink/5" />
                    <div className="relative z-10">
                        <div className="text-6xl mb-6 mt-4">⚠️</div>
                        <h3 className="text-2xl font-black font-syne uppercase tracking-tight text-white mb-4">Action Failed</h3>
                        <p className="text-pink mb-8 font-medium italic">{error || "An unexpected error occurred during the Smart Apply process."}</p>
                        <div className="flex gap-4 p-2">
                            <button onClick={onRetry} className="flex-1 bg-pink text-black py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-white transition-all shadow-lg shadow-pink/20">Try Again</button>
                            <button onClick={onCancel} className="flex-1 bg-white/5 border border-white/10 text-white hover:bg-white/10 py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all">Cancel</button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
    
    // SSE Stream State Early UI overlay (while analysis is null)
    if (!analysis && streamState && streamState.state !== 'READY') {
        const pState = streamState.state;
        
        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 md:p-6 animate-fade-in">
                <div className="bg-surface border border-accent/20 rounded-[3rem] w-full max-w-2xl overflow-hidden flex flex-col shadow-2xl relative">
                    <div className="absolute top-0 left-0 h-1 bg-accent w-1/3 animate-pulse"></div>
                    <div className="p-8 md:p-12 flex flex-col items-center justify-center text-center space-y-6">
                        <div className="text-6xl animate-bounce">
                            {pState === 'INIT' ? '⚙️' : pState === 'ANALYZING' ? '🔍' : pState === 'SCORING' ? '📊' : pState === 'FIXING' ? '⚡' : '🧠'}
                        </div>
                        <div>
                            <h2 className="text-xl md:text-2xl font-black font-syne text-white uppercase tracking-tight italic mb-2">Agent Orchestrator</h2>
                            <p className="text-sm font-bold text-accent uppercase tracking-widest animate-pulse">{streamState.message}</p>
                        </div>
                        
                        {streamState.data?.matchScore && (
                            <div className="mt-4 px-6 py-3 border border-white/10 rounded-2xl bg-white/5 animate-fade-in">
                                <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-50 block mb-1">Live Match Scoring</span>
                                <span className="text-main font-syne font-black text-3xl">{streamState.data.matchScore}</span>
                            </div>
                        )}
                        
                        {streamState.data?.autoFixableCount !== undefined && (
                            <div className="mt-4 text-[10px] font-bold text-purple uppercase tracking-widest bg-purple/10 border border-purple/20 px-4 py-2 rounded-xl animate-fade-in">
                                Generating {streamState.data.autoFixableCount} auto-fixes...
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    if (!analysis) return null; // fallback

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 md:p-6 animate-fade-in">
            <div className="bg-surface border border-border/50 rounded-[3rem] w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-scale-up">
                
                {/* Header */}
                <div className="p-6 md:p-8 border-b border-border/50 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <LogoCircle letter={job.company?.[0]} logoUrl={job.logo} size={64} />
                        <div>
                            <h2 className="text-xl md:text-2xl font-black font-syne text-white uppercase tracking-tight italic truncate max-w-[200px] md:max-w-none">{job.title}</h2>
                            <p className="text-[10px] font-black text-accent uppercase tracking-[0.3em]">{job.company} · Smart Apply Agent</p>
                        </div>
                    </div>
                    <button onClick={onCancel} className="w-10 h-10 md:w-12 md:h-12 rounded-full hover:bg-white/5 flex items-center justify-center text-muted hover:text-white transition-all text-xl">✕</button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-10 custom-scrollbar">
                    
                    {/* 5-Step Progress Pipeline */}
                    <div className="flex items-center justify-between px-4 md:px-10 relative">
                        <div className="absolute top-1/2 left-10 right-10 h-1 bg-white/5 -translate-y-1/2 z-0" />
                        {steps.map((s, idx) => (
                            <div key={s.id} className="relative z-10 flex flex-col items-center gap-2">
                                <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center text-sm md:text-lg border-2 transition-all duration-500 ${
                                    stage === s.id ? "bg-accent border-accent text-black scale-110 shadow-lg shadow-accent/20" : 
                                    (currentStepIdx > idx ? "bg-accent/20 border-accent/50 text-accent" : "bg-surface border-white/10 text-white/30")
                                }`}>
                                    {currentStepIdx > idx ? "✓" : s.icon}
                                </div>
                                <span className={`text-[8px] md:text-[9px] font-black uppercase tracking-widest ${stage === s.id ? "text-accent" : "text-white/40"}`}>{s.label}</span>
                            </div>
                        ))}
                    </div>

                    {/* Confidence + ATS Score Band */}
                    <div className={`border rounded-[2.5rem] p-6 md:p-8 flex flex-col md:flex-row items-center gap-6 md:gap-8 ${confidenceStyles}`}>
                        <div className="text-center md:text-left">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.4em] mb-1 opacity-60">Apply Confidence</h3>
                            <div className="text-4xl md:text-5xl font-black font-syne italic">{chance}</div>
                            <p className="text-[10px] font-bold uppercase tracking-widest mt-2">{confidence} Probability Score</p>
                        </div>
                        <div className="flex-1 space-y-3">
                            {/* ATS Score Lift inline */}
                            <div className="flex items-center gap-3">
                                <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">ATS:</span>
                                <span className="text-lg font-black text-white/40">{atsScore.current}</span>
                                <span className="text-accent text-xs">→</span>
                                <span className="text-lg font-black text-accent">{atsScore.projected}</span>
                                <span className="text-[9px] font-bold text-accent bg-accent/10 px-2 py-0.5 rounded-full">
                                    +{atsScore.projected - atsScore.current}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest opacity-60">
                                <span className={stage === 'dispatching' ? 'animate-pulse text-accent' : ''}>●</span>
                                {stage === 'dispatching' ? 'DISPATCHING...' : 
                                 stage === 'ready' ? 'DISPATCH READY' :
                                 stage === 'fixing' ? 'REVIEWING FIXES...' :
                                 stage === 'review' ? 'AWAITING REVIEW...' : 'PROCESSING...'}
                            </div>
                        </div>
                    </div>

                    {/* Field Confidence Indicators */}
                    {Object.keys(fieldConfidence).length > 0 && (
                        <div className="bg-white/[0.02] border border-white/10 rounded-[2.5rem] p-6 md:p-8 space-y-4">
                            <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em]">Form Field Readiness</h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                {Object.entries(fieldConfidence).map(([field, level]) => {
                                    const conf = {
                                        high: { icon: '✅', color: 'text-green-400 bg-green-500/5 border-green-500/10' },
                                        medium: { icon: '⚠️', color: 'text-amber-400 bg-amber-500/5 border-amber-500/10' },
                                        missing: { icon: '❌', color: 'text-red-400 bg-red-500/5 border-red-500/10' },
                                        ai_generated: { icon: '🤖', color: 'text-purple bg-purple/5 border-purple/10' }
                                    }[level] || { icon: '❓', color: 'text-muted bg-white/5 border-white/10' };
                                    
                                    return (
                                        <div key={field} className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl border ${conf.color}`}>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs">{conf.icon}</span>
                                                <span className="text-[9px] font-bold uppercase tracking-wider">{field.replace(/_/g, ' ')}</span>
                                            </div>
                                            {level === 'missing' && (
                                                <button className="text-[8px] font-black uppercase border border-red-400 px-1.5 py-0.5 rounded hover:bg-red-400 hover:text-black transition-colors">Fix Now</button>
                                            )}
                                            {level === 'medium' && (
                                                <button className="text-[8px] font-black uppercase border border-amber-400/50 px-1.5 py-0.5 rounded hover:bg-amber-400/20 transition-colors">Verify</button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Auto-Fix Section (Stage: fixing) */}
                    {(stage === 'fixing' || autoFixable.length > 0) && !fixesReviewed && (
                        <div className="bg-white/[0.02] border border-white/10 rounded-[2.5rem] p-6 md:p-8">
                            <AutoFixEngine
                                fixes={autoFixable}
                                jobDescription={job.description || ''}
                                jobId={job.id}
                                onFixApplied={(fix, result) => {
                                    // Could update tailored resume here
                                }}
                                onAllReviewed={() => setFixesReviewed(true)}
                            />
                        </div>
                    )}

                    {/* Hybrid Strategy Tier */}
                    <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-6 md:p-8 space-y-4">
                        <div className="flex items-center gap-3">
                            <span className="text-2xl">{tierConfig.icon}</span>
                            <div>
                                <h4 className={`text-[10px] font-black ${tierConfig.color} uppercase tracking-[0.4em]`}>{tierConfig.label}</h4>
                                <p className="text-[11px] text-white/70 italic font-medium">{tierConfig.desc}</p>
                            </div>
                        </div>
                        {tier < 3 && (
                            <div className="bg-accent/5 p-4 rounded-2xl border border-accent/20 flex gap-3 text-[10px] font-medium italic text-accent">
                                <span>🛡️</span> Direct automation is restricted for this portal to protect your account. We've prepared a smart copy-paste kit instead.
                            </div>
                        )}
                    </div>

                    {/* Copy-Paste Kit (for Tier 1/2) */}
                    {tier < 3 && tailoredResume && (
                        <div className="space-y-4 bg-white/[0.02] border border-white/10 rounded-[2.5rem] p-6 md:p-8">
                            <div className="flex items-center justify-between">
                                <h3 className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em]">📋 Copy-Paste Kit</h3>
                                <span className="text-[9px] text-muted font-bold uppercase tracking-widest">Click to copy each section</span>
                            </div>
                            
                            <div className="space-y-4">
                                {/* Resume */}
                                <div className="bg-black/20 border border-white/5 rounded-2xl p-5 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-black text-white uppercase tracking-widest">Tailored Resume</span>
                                        <CopyButton text={editableResume} label="Resume" />
                                    </div>
                                    <textarea
                                        value={editableResume}
                                        onChange={(e) => setEditableResume(e.target.value)}
                                        className="w-full bg-transparent text-[11px] text-white/70 font-medium italic leading-relaxed resize-none outline-none min-h-[150px] focus:text-white/90 transition-colors"
                                    />
                                </div>

                                {/* Quick-copy fields */}
                                {changesMade.length > 0 && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {changesMade.map((change, i) => (
                                            <div key={i} className="bg-black/20 border border-white/5 rounded-xl p-4 flex items-start justify-between gap-3">
                                                <div className="flex-1 min-w-0">
                                                    <span className="text-[10px] text-white/80 font-medium italic">{change}</span>
                                                </div>
                                                <CopyButton text={change} label="" />
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Resume Preview (Tier 3 — editable) */}
                    {tier === 3 && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between px-2">
                                <h3 className="text-[10px] font-black text-white uppercase tracking-[0.2em] opacity-40 italic">Review Tailored Resume</h3>
                                <span className="text-[9px] text-accent font-bold italic tracking-widest">AI OPTIMIZED · EDITABLE</span>
                            </div>
                            <textarea
                                value={editableResume}
                                onChange={(e) => setEditableResume(e.target.value)}
                                className="w-full bg-black/40 border border-white/5 rounded-3xl p-8 md:p-10 text-xs text-white/80 leading-relaxed font-medium italic whitespace-pre-wrap max-h-[400px] overflow-y-auto custom-scrollbar-accent shadow-inner outline-none focus:border-accent/20 transition-colors resize-none min-h-[200px]"
                            />
                        </div>
                    )}

                    {/* Optimization Logs */}
                    {changesMade.length > 0 && tier === 3 && (
                        <div className="space-y-4">
                            <h3 className="text-[10px] font-black text-white uppercase tracking-[0.2em] opacity-40 italic">Optimization Logs</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {changesMade.map((change, i) => (
                                    <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-4 flex gap-3 text-[11px] text-white/80 font-medium italic">
                                        <span className="text-accent">✨</span> {change}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Agent Activity Replay */}
                    <AgentReplayLog logs={activityLogs} />
                </div>

                {/* Footer */}
                <div className="p-6 md:p-8 border-t border-border/50 bg-black/20 flex gap-4">
                    <button 
                        onClick={onCancel}
                        className="hidden md:block flex-1 py-5 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest text-muted hover:text-white transition-all border border-transparent hover:border-white/10"
                    >
                        Re-evaluate Logic
                    </button>
                    {tier < 3 ? (
                        <button 
                            onClick={() => { window.open(job.link, '_blank'); onApprove?.(); }}
                            disabled={stage !== 'ready'}
                            className="flex-1 py-5 rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.4em] bg-blue-500 text-white hover:bg-blue-400 shadow-xl shadow-blue-500/10 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            <span>📋</span> Open Site & Apply with Kit
                        </button>
                    ) : (
                        <button 
                            onClick={onApprove}
                            disabled={stage !== 'ready'}
                            className="flex-1 py-5 rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.4em] bg-accent text-black hover:bg-white shadow-xl shadow-accent/10 transition-all active:scale-[0.98] disabled:opacity-50"
                        >
                            {stage === 'ready' ? "Approve & Auto-Submit" : (stage === 'dispatching' ? "Dispatching..." : "Preparing...")}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
