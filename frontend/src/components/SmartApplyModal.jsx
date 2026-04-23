import React, { useState, useEffect, useMemo } from 'react';
import { LogoCircle } from './Common';
import AutoFixEngine from './AutoFixEngine';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// ─── CopyButton ──────────────────────────────────────────────────────────────
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

// ─── Step Header ─────────────────────────────────────────────────────────────
function StepHeader({ step, job }) {
    const meta = step === 1
        ? { num: 1, label: 'Preview', desc: 'Review what GradLaunch will apply on your behalf.' }
        : { num: 2, label: 'Apply',   desc: 'Confirm and dispatch the application.' };

    return (
        <div className="flex items-center justify-between gap-6 border-b border-border/50 p-6 md:p-8 bg-black/20">
            <div className="flex items-center gap-5 min-w-0">
                <LogoCircle letter={job.company?.[0]} logoUrl={job.logo} size={56} />
                <div className="min-w-0">
                    <h2 className="text-lg md:text-xl font-black font-syne text-white uppercase tracking-tight italic truncate">{job.title}</h2>
                    <p className="text-[10px] font-black text-accent uppercase tracking-[0.3em]">{job.company}</p>
                </div>
            </div>

            <div className="hidden md:flex items-center gap-2">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${
                    step === 1 ? 'bg-accent text-black' : 'bg-accent/20 text-accent'
                }`}>1</span>
                <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">
                    {meta.num === 1 ? 'Preview' : '✓ Preview'}
                </span>
                <span className="w-6 h-px bg-white/10" />
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${
                    step === 2 ? 'bg-accent text-black' : 'bg-white/5 text-white/40 border border-white/10'
                }`}>2</span>
                <span className={`text-[10px] font-black uppercase tracking-widest ${step === 2 ? 'text-accent' : 'text-white/40'}`}>
                    Apply
                </span>
            </div>
        </div>
    );
}

// ─── Fields Preview Table ────────────────────────────────────────────────────
function FieldPreview({ prefill, onEditField }) {
    const entries = Object.entries(prefill || {});
    if (entries.length === 0) {
        return (
            <div className="text-center py-10 text-white/40 text-xs italic font-medium">
                No fields prefilled yet. The extension will pick these up once it detects the form.
            </div>
        );
    }
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {entries.map(([field, value]) => {
                const filled = value != null && String(value).trim() !== '';
                return (
                    <div
                        key={field}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border ${
                            filled
                                ? 'bg-green-500/5 border-green-500/15'
                                : 'bg-amber-500/5 border-amber-500/15'
                        }`}
                    >
                        <span className="text-sm">{filled ? '✅' : '⚠️'}</span>
                        <div className="flex-1 min-w-0">
                            <div className="text-[9px] font-bold uppercase tracking-widest text-white/50">
                                {field.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim()}
                            </div>
                            <div className="text-[11px] font-medium text-white/90 truncate">
                                {filled ? String(value) : '— missing —'}
                            </div>
                        </div>
                        {onEditField && (
                            <button
                                onClick={() => onEditField(field)}
                                className="text-[8px] font-black uppercase tracking-widest text-white/50 hover:text-white px-2 py-1 rounded border border-white/10"
                            >
                                Edit
                            </button>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

// ─── Main Modal ──────────────────────────────────────────────────────────────
export default function SmartApplyModal({
    job,
    tailoredResume,
    changesMade = [],
    analysis,
    streamState,
    error,
    onRetry,
    onApprove,
    onCancel,
    stage = "ready",
    prefill, // NEW: optional { fields, selectorMap, questions } from the hybrid prefill endpoint
}) {
    if (!job) return null;

    const [step, setStep] = useState(1);
    const [activityLogs, setActivityLogs] = useState([]);
    const [fixesReviewed, setFixesReviewed] = useState(false);
    const [editableResume, setEditableResume] = useState('');
    const [localFields, setLocalFields] = useState({});
    const [editingField, setEditingField] = useState(null);
    const [editingValue, setEditingValue] = useState('');

    useEffect(() => {
        if (tailoredResume) setEditableResume(tailoredResume);
    }, [tailoredResume]);

    useEffect(() => {
        if (prefill?.fields) setLocalFields({ ...prefill.fields });
    }, [prefill?.fields]);

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

    // Derived analysis props (fallbacks)
    const confidence = analysis?.applyConfidence || analysis?.confidence || "MED";
    const chance = analysis?.responseProbability || analysis?.expectedResponseChance || "5-10%";
    const atsType = prefill?.ats || analysis?.ats_type || 'custom';
    const tier = atsType === 'greenhouse' || atsType === 'lever' || atsType === 'ashby' ? 3
        : (atsType === 'workday' || atsType === 'icims' || atsType === 'workable' ? 2 : 1);
    const autoFixable = analysis?.autoFixable || [];
    const atsScore = analysis?.atsScore || { current: 65, projected: 85 };

    const tierConfig = useMemo(() => ({
        3: { label: "FULL AUTO-DISPATCH", icon: "⚡",
             desc: "GradLaunch can submit this application directly via the ATS API.",
             color: "text-accent", cta: "Approve & Auto-Submit" },
        2: { label: "EXTENSION AUTOFILL",  icon: "🪄",
             desc: "Open the job page — the GradLaunch Copilot extension will auto-fill the form.",
             color: "text-purple", cta: "Open & Auto-Fill" },
        1: { label: "COPY-PASTE KIT",      icon: "📋",
             desc: "Your tailored materials are ready. Copy each section into the application.",
             color: "text-blue-400", cta: "Open & Paste" },
    }[tier]), [tier]);

    const confidenceStyles = {
        HIGH: "text-accent border-accent/20 bg-accent/5",
        MED:  "text-purple border-purple/20 bg-purple/5",
        LOW:  "text-pink border-pink/20 bg-pink/5"
    }[confidence];

    // ── FAILED overlay ──
    if (stage === "failed") {
        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 backdrop-blur-md bg-black/70 animate-fade-in">
                <div className="bg-surface border border-pink/30 rounded-[3rem] p-8 max-w-lg w-full shadow-2xl relative z-10 text-center">
                    <div className="text-6xl mb-6 mt-2">⚠️</div>
                    <h3 className="text-2xl font-black font-syne uppercase tracking-tight text-white mb-4">Action Failed</h3>
                    <p className="text-pink mb-8 font-medium italic">{error || "An unexpected error occurred."}</p>
                    <div className="flex gap-3">
                        <button onClick={onRetry} className="flex-1 bg-pink text-black py-4 rounded-2xl font-black uppercase tracking-widest text-xs">Try Again</button>
                        <button onClick={onCancel} className="flex-1 bg-white/5 border border-white/10 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs">Cancel</button>
                    </div>
                </div>
            </div>
        );
    }

    // ── Streaming analysis overlay ──
    if (!analysis && streamState && streamState.state !== 'READY') {
        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-6 animate-fade-in">
                <div className="bg-surface border border-accent/20 rounded-[3rem] w-full max-w-md p-10 text-center space-y-6">
                    <div className="text-6xl animate-bounce">🧠</div>
                    <h2 className="text-xl font-black font-syne text-white uppercase tracking-tight">Orion Agent</h2>
                    <p className="text-sm font-bold text-accent uppercase tracking-widest animate-pulse">{streamState.message}</p>
                </div>
            </div>
        );
    }

    if (!analysis && !prefill) return null;

    const dispatchReady = stage === 'ready';

    // ── RENDER ──
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 md:p-6 animate-fade-in">
            <div className="bg-surface border border-border/50 rounded-[3rem] w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-scale-up">

                <StepHeader step={step} job={job} />

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 custom-scrollbar">

                    {step === 1 && (
                        <>
                            {/* Match / confidence band */}
                            <div className={`border rounded-[2rem] p-5 md:p-6 flex items-center gap-6 ${confidenceStyles}`}>
                                <div>
                                    <div className="text-[9px] font-black uppercase tracking-[0.3em] opacity-60 mb-1">Response Probability</div>
                                    <div className="text-3xl md:text-4xl font-black font-syne italic">{chance}</div>
                                    <div className="text-[9px] font-bold uppercase tracking-widest mt-1">{confidence} Match</div>
                                </div>
                                <div className="flex-1 flex items-center gap-3">
                                    <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">ATS Score:</span>
                                    <span className="text-lg font-black text-white/40">{atsScore.current}</span>
                                    <span className="text-accent text-xs">→</span>
                                    <span className="text-lg font-black text-accent">{atsScore.projected}</span>
                                    <span className="text-[9px] font-bold text-accent bg-accent/10 px-2 py-0.5 rounded-full">
                                        +{atsScore.projected - atsScore.current}
                                    </span>
                                </div>
                            </div>

                            {/* Prefill fields preview */}
                            <div className="bg-white/[0.02] border border-white/10 rounded-[2rem] p-5 md:p-6 space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-[10px] font-black text-white uppercase tracking-[0.3em]">Fields We'll Fill</h3>
                                    <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest">{atsType}</span>
                                </div>
                                <FieldPreview
                                    prefill={localFields}
                                    onEditField={(field) => {
                                        setEditingField(field);
                                        setEditingValue(localFields[field] ?? '');
                                    }}
                                />
                            </div>

                            {/* Inline edit panel */}
                            {editingField && (
                                <div className="bg-accent/5 border border-accent/20 rounded-2xl p-5 space-y-3">
                                    <div className="text-[10px] font-black text-accent uppercase tracking-[0.3em]">
                                        Edit {editingField.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim()}
                                    </div>
                                    <textarea
                                        value={editingValue}
                                        onChange={(e) => setEditingValue(e.target.value)}
                                        className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-white/90 outline-none focus:border-accent/50 min-h-[80px] resize-none"
                                    />
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => {
                                                setLocalFields((prev) => ({ ...prev, [editingField]: editingValue }));
                                                setEditingField(null);
                                            }}
                                            className="px-4 py-2 rounded-xl bg-accent text-black text-[10px] font-black uppercase tracking-widest"
                                        >
                                            Save
                                        </button>
                                        <button
                                            onClick={() => setEditingField(null)}
                                            className="px-4 py-2 rounded-xl border border-white/10 text-white/60 text-[10px] font-black uppercase tracking-widest"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Tailored resume preview */}
                            {tailoredResume && (
                                <div className="bg-white/[0.02] border border-white/10 rounded-[2rem] p-5 md:p-6 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-[10px] font-black text-white uppercase tracking-[0.3em]">Tailored Resume</h3>
                                        <CopyButton text={editableResume} label="Resume" />
                                    </div>
                                    <textarea
                                        value={editableResume}
                                        onChange={(e) => setEditableResume(e.target.value)}
                                        className="w-full bg-black/30 border border-white/5 rounded-xl p-4 text-[11px] text-white/80 font-medium italic leading-relaxed outline-none focus:border-accent/20 resize-none min-h-[180px] max-h-[280px]"
                                    />
                                </div>
                            )}

                            {/* Auto-fix suggestions */}
                            {autoFixable.length > 0 && !fixesReviewed && (
                                <div className="bg-white/[0.02] border border-white/10 rounded-[2rem] p-5 md:p-6">
                                    <AutoFixEngine
                                        fixes={autoFixable}
                                        jobDescription={job.description || ''}
                                        jobId={job.id}
                                        onAllReviewed={() => setFixesReviewed(true)}
                                    />
                                </div>
                            )}

                            {/* Screener questions */}
                            {Array.isArray(prefill?.questions) && prefill.questions.length > 0 && (
                                <div className="bg-white/[0.02] border border-white/10 rounded-[2rem] p-5 md:p-6 space-y-3">
                                    <h3 className="text-[10px] font-black text-white uppercase tracking-[0.3em]">Screener Questions</h3>
                                    <div className="space-y-2">
                                        {prefill.questions.slice(0, 10).map((q) => (
                                            <div key={q.id} className="flex items-center gap-3 px-3 py-2 rounded-xl border border-white/5 bg-black/20">
                                                <span className="text-xs">{q.required ? '•' : '○'}</span>
                                                <span className="text-[11px] text-white/70 flex-1 truncate">{q.label}</span>
                                                <span className="text-[8px] font-bold uppercase text-white/40 tracking-widest">{q.type}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {step === 2 && (
                        <>
                            {/* Tier badge */}
                            <div className="bg-white/5 border border-white/10 rounded-[2rem] p-6 space-y-3">
                                <div className="flex items-center gap-3">
                                    <span className="text-3xl">{tierConfig.icon}</span>
                                    <div>
                                        <div className={`text-[10px] font-black ${tierConfig.color} uppercase tracking-[0.4em]`}>{tierConfig.label}</div>
                                        <div className="text-[11px] text-white/70 italic font-medium">{tierConfig.desc}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Copy-paste kit for tier 1/2 */}
                            {tier < 3 && (
                                <div className="space-y-3 bg-white/[0.02] border border-white/10 rounded-[2rem] p-5 md:p-6">
                                    <h3 className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em]">📋 Copy-Paste Kit</h3>
                                    {Object.entries(localFields).map(([field, value]) => (
                                        <div key={field} className="flex items-center gap-3 p-3 bg-black/30 rounded-xl border border-white/5">
                                            <div className="flex-1 min-w-0">
                                                <div className="text-[9px] font-bold uppercase tracking-widest text-white/40">{field}</div>
                                                <div className="text-[11px] text-white/80 font-medium truncate">{String(value || '—')}</div>
                                            </div>
                                            <CopyButton text={String(value || '')} label="" />
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Changes summary */}
                            {changesMade.length > 0 && (
                                <div className="space-y-2 bg-white/[0.02] border border-white/10 rounded-[2rem] p-5 md:p-6">
                                    <h3 className="text-[10px] font-black text-white uppercase tracking-[0.3em]">Optimization Summary</h3>
                                    {changesMade.slice(0, 6).map((c, i) => (
                                        <div key={i} className="flex gap-2 text-[11px] text-white/80 font-medium italic">
                                            <span className="text-accent">✨</span> {c}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Agent activity */}
                            {activityLogs.length > 0 && (
                                <div className="space-y-2 bg-black/30 rounded-2xl border border-white/5 p-4">
                                    <div className="text-[9px] font-black text-white/40 uppercase tracking-[0.2em]">
                                        Agent Activity · {activityLogs.length} actions
                                    </div>
                                    <div className="max-h-[160px] overflow-y-auto custom-scrollbar font-mono space-y-1">
                                        {activityLogs.map((log, i) => (
                                            <div key={i} className="flex items-center gap-2 py-1 text-[10px]">
                                                <span className="text-accent">●</span>
                                                <span className="text-white/70">{log.action?.replace(/_/g, ' ')}</span>
                                                {log.duration_ms && <span className="text-white/30 ml-auto">{log.duration_ms}ms</span>}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="p-5 md:p-6 border-t border-border/50 bg-black/20 flex items-center gap-3">
                    <button
                        onClick={() => (step === 1 ? onCancel() : setStep(1))}
                        className="px-5 py-4 rounded-[1.25rem] text-[10px] font-black uppercase tracking-widest text-muted hover:text-white transition-all border border-transparent hover:border-white/10"
                    >
                        {step === 1 ? 'Cancel' : '← Back'}
                    </button>

                    <div className="flex-1" />

                    {step === 1 ? (
                        <button
                            onClick={() => setStep(2)}
                            className="px-8 py-4 rounded-[1.25rem] text-[10px] font-black uppercase tracking-[0.4em] bg-accent text-black hover:bg-white shadow-xl shadow-accent/10 transition-all active:scale-[0.98] flex items-center gap-2"
                        >
                            Continue to Apply →
                        </button>
                    ) : tier < 3 ? (
                        <button
                            onClick={() => { if (job.link) window.open(job.link, '_blank'); onApprove?.({ fields: localFields, resume: editableResume }); }}
                            className="px-8 py-4 rounded-[1.25rem] text-[10px] font-black uppercase tracking-[0.4em] bg-blue-500 text-white hover:bg-blue-400 shadow-xl shadow-blue-500/10 transition-all active:scale-[0.98] flex items-center gap-2"
                        >
                            <span>📋</span> {tierConfig.cta}
                        </button>
                    ) : (
                        <button
                            onClick={() => onApprove?.({ fields: localFields, resume: editableResume })}
                            disabled={!dispatchReady}
                            className="px-8 py-4 rounded-[1.25rem] text-[10px] font-black uppercase tracking-[0.4em] bg-accent text-black hover:bg-white shadow-xl shadow-accent/10 transition-all active:scale-[0.98] disabled:opacity-50"
                        >
                            {dispatchReady ? tierConfig.cta : (stage === 'dispatching' ? 'Dispatching…' : 'Preparing…')}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
