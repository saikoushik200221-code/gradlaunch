import React, { useState } from 'react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const getToken = () => localStorage.getItem('token');

const severityStyles = {
    critical: { bg: 'bg-red-500/10', border: 'border-red-500/20', text: 'text-red-400', icon: '🔴', label: 'CRITICAL' },
    moderate: { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400', icon: '🟡', label: 'MODERATE' },
    minor: { bg: 'bg-blue-400/10', border: 'border-blue-400/20', text: 'text-blue-400', icon: '🔵', label: 'MINOR' }
};

const confidenceStyles = {
    high: 'text-green-400 bg-green-500/10 border-green-500/20',
    medium: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    low: 'text-red-400 bg-red-500/10 border-red-500/20'
};

function getConfidenceLevel(score) {
    if (score >= 80) return { level: 'high', label: '✅ High', color: 'text-green-400' };
    if (score >= 50) return { level: 'medium', label: '⚠️ Medium', color: 'text-amber-400' };
    return { level: 'low', label: '❌ Low', color: 'text-red-400' };
}

function FixDiffPreview({ original, improved, explanation, atsImpact, confidence, confidenceFactors }) {
    const conf = getConfidenceLevel(confidence || 70);
    const [showFactors, setShowFactors] = useState(false);

    return (
        <div className="mt-4 space-y-3 animate-fade-in relative">
            {/* Confidence badge */}
            <div className="flex items-center gap-2 relative">
                <button 
                    onClick={() => setShowFactors(!showFactors)}
                    className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border transition-all hover:brightness-125 ${confidenceStyles[conf.level]}`}
                >
                    {conf.label} conf ({confidence}%)
                </button>
                
                {/* Explainable Confidence Popover */}
                {showFactors && confidenceFactors && (
                    <div className="absolute top-8 left-0 z-10 w-64 bg-surface border border-accent/20 rounded-xl p-3 shadow-xl animate-fade-in">
                        <div className="text-[8px] font-black uppercase tracking-[0.2em] text-white/50 mb-2 font-syne">Confidence Computation</div>
                        <div className="space-y-1.5">
                            {Object.entries(confidenceFactors).map(([factor, weight]) => (
                                <div key={factor} className="flex justify-between items-center text-[9px] font-mono">
                                    <span className="text-white/80">{factor}</span>
                                    <span className="text-accent">{(weight * 100).toFixed(0)}%</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
            {original && (
                <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-4">
                    <div className="text-[9px] font-black text-red-400 uppercase tracking-widest mb-2">BEFORE</div>
                    <p className="text-xs text-white/50 line-through italic leading-relaxed">{original}</p>
                </div>
            )}
            <div className="bg-green-500/5 border border-green-500/10 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-[9px] font-black text-green-400 uppercase tracking-widest">AFTER</span>
                    <span className="text-[9px] font-bold text-accent bg-accent/10 px-2 py-0.5 rounded-full">{atsImpact}</span>
                </div>
                <p className="text-xs text-white/90 font-medium leading-relaxed">{improved}</p>
            </div>
            {explanation && (
                <p className="text-[10px] text-muted italic px-1">{explanation}</p>
            )}
        </div>
    );
}

function SkillVerificationDialog({ skill, options, onSelect, onCancel }) {
    return (
        <div className="mt-4 bg-gradient-to-b from-accent/5 to-transparent border border-accent/20 rounded-2xl p-5 space-y-4 animate-fade-in">
            <div className="flex items-center gap-3">
                <span className="text-lg">🔍</span>
                <div>
                    <h4 className="text-xs font-black text-white uppercase tracking-tight">Skill Verification Required</h4>
                    <p className="text-[10px] text-muted italic">Do you have experience with <span className="text-accent font-bold">{skill}</span>?</p>
                </div>
            </div>
            <div className="grid grid-cols-1 gap-2">
                {options.map(opt => {
                    const conf = getConfidenceLevel(opt.confidence);
                    return (
                        <button
                            key={opt.value}
                            onClick={() => onSelect(opt.value)}
                            className={`text-left px-4 py-3 rounded-xl border transition-all hover:scale-[1.01] active:scale-[0.99] ${
                                opt.value === 'none' 
                                    ? 'bg-white/[0.02] border-white/10 hover:bg-white/5' 
                                    : 'bg-white/[0.03] border-white/10 hover:bg-accent/5 hover:border-accent/20'
                            }`}
                        >
                            <div className="flex items-center justify-between">
                                <span className="text-[11px] font-bold text-white">{opt.label}</span>
                                {opt.confidence > 0 && (
                                    <span className={`text-[8px] font-black uppercase tracking-widest ${conf.color}`}>
                                        {opt.confidence}% conf
                                    </span>
                                )}
                            </div>
                        </button>
                    );
                })}
            </div>
            <button onClick={onCancel} className="w-full text-[9px] text-muted font-bold uppercase tracking-widest hover:text-white transition-colors py-1">
                Cancel
            </button>
        </div>
    );
}

function FixItem({ fix, jobDescription, jobId, onAccepted, onRejected, onError }) {
    const [state, setState] = useState('idle'); // idle, loading, verification, preview, accepted, rejected, error
    const [fixResult, setFixResult] = useState(null);
    const [verificationData, setVerificationData] = useState(null);
    const [retryCount, setRetryCount] = useState(0);
    const style = severityStyles[fix.severity] || severityStyles.minor;

    async function generateFix(verifiedLevel = null) {
        setState('loading');
        try {
            const body = { fixType: fix.fixType, context: fix.context, jobDescription };
            if (verifiedLevel) body.verifiedLevel = verifiedLevel;

            const res = await fetch(`${API}/api/ai/auto-fix`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
                body: JSON.stringify(body)
            });

            if (!res.ok) throw new Error(`Server error: ${res.status}`);
            const data = await res.json();

            if (data.requiresVerification) {
                // Show verification dialog
                setVerificationData(data);
                setState('verification');
            } else if (data.skipped) {
                // User said "no experience"
                setState('rejected');
                onRejected?.(fix);
            } else if (data.success) {
                setFixResult(data);
                setState('preview');
            } else {
                throw new Error('Unknown response');
            }
        } catch (e) {
            setState('error');
            onError?.(`Fix generation failed: ${e.message}`);
        }
    }

    async function handleVerificationSelect(level) {
        setVerificationData(null);
        await generateFix(level);
    }

    async function handleAcceptReject(accepted) {
        const prevState = state;
        setState(accepted ? 'accepted' : 'rejected');
        try {
            const res = await fetch(`${API}/api/ai/auto-fix/accept`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
                body: JSON.stringify({
                    fixType: fix.fixType,
                    accepted,
                    original: fixResult?.original,
                    improved: fixResult?.improved,
                    jobId,
                    fixId: fixResult?.fixId
                })
            });
            const data = await res.json();
            if (data.alreadyApplied) {
                // Idempotency: already applied, just show as accepted
                setState('accepted');
            }
            if (accepted) onAccepted?.(fix, fixResult);
            else onRejected?.(fix);
        } catch (e) {
            // Revert UI on error
            setState(prevState);
            onError?.('Failed to save fix decision');
        }
    }

    function handleRetry() {
        setRetryCount(c => c + 1);
        setState('idle');
        setFixResult(null);
        setVerificationData(null);
    }

    if (state === 'accepted') {
        return (
            <div className="flex items-center gap-3 px-4 py-3 bg-green-500/5 border border-green-500/20 rounded-2xl">
                <span className="text-green-400 text-sm">✓</span>
                <span className="text-xs font-bold text-green-400 uppercase tracking-wider flex-1">{fix.label}</span>
                {fixResult?.confidence && (
                    <span className={`text-[8px] font-bold uppercase tracking-widest ${getConfidenceLevel(fixResult.confidence).color}`}>
                        {fixResult.confidence}%
                    </span>
                )}
                <span className="text-[9px] text-green-400/70 font-bold uppercase tracking-widest">Applied</span>
            </div>
        );
    }

    if (state === 'rejected') {
        return (
            <div className="flex items-center gap-3 px-4 py-3 bg-white/[0.02] border border-white/5 rounded-2xl opacity-40">
                <span className="text-white/30 text-sm">✕</span>
                <span className="text-xs font-bold text-white/30 uppercase tracking-wider flex-1 line-through">{fix.label}</span>
                <span className="text-[9px] text-white/20 font-bold uppercase tracking-widest">Skipped</span>
            </div>
        );
    }

    return (
        <div className={`${style.bg} border ${style.border} rounded-2xl p-4 transition-all`}>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                    <span className="text-sm">{style.icon}</span>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <span className={`text-xs font-bold ${style.text} uppercase tracking-wider`}>{fix.label}</span>
                            <span className={`text-[8px] font-black ${style.text} uppercase tracking-widest opacity-60 border ${style.border} px-1.5 py-0.5 rounded`}>{style.label}</span>
                        </div>
                        <span className="text-[10px] text-muted capitalize">{fix.type} gap</span>
                    </div>
                </div>
                <div className="flex gap-2">
                    {state === 'idle' && (
                        <button
                            onClick={() => generateFix()}
                            className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all 
                                ${fix.fixType === 'add_skill' 
                                    ? 'bg-accent/20 text-accent border border-accent/30 hover:bg-accent hover:text-black' 
                                    : 'bg-white/10 text-white border border-white/10 hover:bg-white/20'}`}
                        >
                            {fix.fixType === 'add_skill' ? '+ Add' : '✨ Fix'}
                        </button>
                    )}
                    {state === 'loading' && (
                        <div className="px-4 py-2 text-[9px] font-black text-accent uppercase tracking-widest flex items-center gap-2">
                            <div className="w-3 h-3 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                            Generating...
                        </div>
                    )}
                    {state === 'error' && (
                        <button
                            onClick={handleRetry}
                            className="px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-all"
                        >
                            ↻ Retry {retryCount > 0 ? `(${retryCount})` : ''}
                        </button>
                    )}
                </div>
            </div>

            {/* Skill Verification Dialog */}
            {state === 'verification' && verificationData && (
                <SkillVerificationDialog
                    skill={verificationData.skill}
                    options={verificationData.verificationOptions}
                    onSelect={handleVerificationSelect}
                    onCancel={() => { setState('idle'); setVerificationData(null); }}
                />
            )}

            {/* Diff Preview with Confidence */}
            {state === 'preview' && fixResult && (
                <>
                    <FixDiffPreview
                        original={fixResult.original}
                        improved={fixResult.improved}
                        explanation={fixResult.explanation}
                        atsImpact={fixResult.atsImpact}
                        confidence={fixResult.confidence}
                        confidenceFactors={fixResult.confidenceFactors}
                    />
                    <div className="flex gap-3 mt-4">
                        <button
                            onClick={() => handleAcceptReject(true)}
                            className="flex-1 bg-accent hover:brightness-110 text-black py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all active:scale-[0.98]"
                        >
                            ✓ Accept Fix
                        </button>
                        <button
                            onClick={() => handleAcceptReject(false)}
                            className="px-6 bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all"
                        >
                            Skip
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}

export default function AutoFixEngine({ fixes = [], jobDescription, jobId, onFixApplied, onAllReviewed }) {
    const [completedCount, setCompletedCount] = useState(0);
    const [undoStack, setUndoStack] = useState([]); // { fixId, label }
    const [undoing, setUndoing] = useState(false);
    const [error, setError] = useState(null);
    const totalFixes = fixes.length;
    const criticalFixes = fixes.filter(f => f.severity === 'critical');
    const otherFixes = fixes.filter(f => f.severity !== 'critical');

    // Fetch persistent undo stack on mount
    React.useEffect(() => {
        (async () => {
            try {
                const res = await fetch(`${API}/api/ai/auto-fix/undo-stack`, {
                    headers: { 'Authorization': `Bearer ${getToken()}` }
                });
                if (res.ok) {
                    const stack = await res.json();
                    if (stack && stack.length > 0) setUndoStack(stack);
                }
            } catch (e) { /* ignore */ }
        })();
    }, []);

    const handleAccepted = (fix, result) => {
        setCompletedCount(c => c + 1);
        if (result?.fixId) {
            setUndoStack(prev => [...prev, { fixId: result.fixId, label: fix.label }]);
        }
        onFixApplied?.(fix, result);
    };

    const handleRejected = () => {
        setCompletedCount(c => c + 1);
    };

    const handleError = (msg) => {
        setError(msg);
        setTimeout(() => setError(null), 5000);
    };

    async function undoLast() {
        if (undoStack.length === 0) return;
        setUndoing(true);
        const last = undoStack[undoStack.length - 1];
        try {
            const res = await fetch(`${API}/api/ai/auto-fix/undo`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
                body: JSON.stringify({ fixId: last.fixId })
            });
            const data = await res.json();
            if (data.success) {
                setUndoStack(prev => prev.slice(0, -1));
                setCompletedCount(c => Math.max(0, c - 1));
            }
        } catch (e) { handleError('Undo failed'); }
        setUndoing(false);
    }

    async function undoAll() {
        setUndoing(true);
        for (const item of [...undoStack].reverse()) {
            try {
                await fetch(`${API}/api/ai/auto-fix/undo`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
                    body: JSON.stringify({ fixId: item.fixId })
                });
            } catch (e) { /* best-effort */ }
        }
        setUndoStack([]);
        setCompletedCount(0);
        setUndoing(false);
    }

    const progress = totalFixes > 0 ? Math.round((completedCount / totalFixes) * 100) : 0;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                        Auto-Fix Engine
                    </h3>
                    <p className="text-[10px] text-muted mt-1 italic">
                        {totalFixes} issues found · {completedCount} reviewed
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {/* Undo buttons */}
                    {undoStack.length > 0 && (
                        <>
                            <button
                                onClick={undoLast}
                                disabled={undoing}
                                className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-[8px] font-black text-white/50 uppercase tracking-widest hover:text-white hover:bg-white/10 transition-all disabled:opacity-30"
                            >
                                {undoing ? '...' : '↩ Undo Last'}
                            </button>
                            <button
                                onClick={undoAll}
                                disabled={undoing}
                                className="px-3 py-1.5 bg-red-500/5 border border-red-500/10 rounded-lg text-[8px] font-black text-red-400/60 uppercase tracking-widest hover:text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-30"
                            >
                                ↩ Undo All
                            </button>
                        </>
                    )}
                    {completedCount === totalFixes && totalFixes > 0 && (
                        <button
                            onClick={onAllReviewed}
                            className="bg-accent text-black px-6 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest hover:brightness-110 transition-all animate-fade-in"
                        >
                            Continue →
                        </button>
                    )}
                </div>
            </div>

            {/* Error Banner */}
            {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-bold rounded-xl px-4 py-3 flex items-center gap-2 animate-fade-in">
                    <span>⚠️</span> {error}
                    <button onClick={() => setError(null)} className="ml-auto text-red-400/60 hover:text-red-400">✕</button>
                </div>
            )}

            {/* Progress */}
            <div className="space-y-2">
                <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                    <div 
                        className="h-full bg-gradient-to-r from-accent to-green-400 transition-all duration-700 ease-out rounded-full"
                        style={{ width: `${progress}%` }}
                    />
                </div>
                <div className="flex justify-between text-[9px] font-bold text-muted uppercase tracking-widest">
                    <span>{progress}% reviewed</span>
                    <span>{criticalFixes.length} critical · {undoStack.length} applied</span>
                </div>
            </div>

            {/* Critical Fixes */}
            {criticalFixes.length > 0 && (
                <div className="space-y-3">
                    <h4 className="text-[9px] font-black text-red-400 uppercase tracking-[0.2em]">Missing Skills</h4>
                    {criticalFixes.map((fix, i) => (
                        <FixItem
                            key={`crit-${i}`}
                            fix={fix}
                            jobDescription={jobDescription}
                            jobId={jobId}
                            onAccepted={handleAccepted}
                            onRejected={handleRejected}
                            onError={handleError}
                        />
                    ))}
                </div>
            )}

            {/* Other Fixes */}
            {otherFixes.length > 0 && (
                <div className="space-y-3">
                    <h4 className="text-[9px] font-black text-amber-400 uppercase tracking-[0.2em]">Optimization Suggestions</h4>
                    {otherFixes.map((fix, i) => (
                        <FixItem
                            key={`opt-${i}`}
                            fix={fix}
                            jobDescription={jobDescription}
                            jobId={jobId}
                            onAccepted={handleAccepted}
                            onRejected={handleRejected}
                            onError={handleError}
                        />
                    ))}
                </div>
            )}

            {totalFixes === 0 && (
                <div className="text-center py-10">
                    <div className="text-4xl mb-4">✅</div>
                    <p className="text-xs font-bold text-accent uppercase tracking-widest">All Clear</p>
                    <p className="text-[10px] text-muted mt-2 italic">Your resume is well-aligned for this role</p>
                </div>
            )}
        </div>
    );
}
