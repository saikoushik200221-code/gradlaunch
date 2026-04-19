import React from 'react';
import MatchFeedback from './MatchFeedback';

const PillarBar = ({ label, value, color }) => (
    <div className="space-y-1.5 flex-1">
        <div className="flex justify-between items-end px-1">
            <span className="text-[8px] font-black text-white/40 uppercase tracking-widest">{label}</span>
            <span className={`text-[10px] font-black ${color}`}>{value}%</span>
        </div>
        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
            <div 
                className={`h-full ${color.replace('text-', 'bg-')} transition-all duration-1000 ease-out rounded-full`} 
                style={{ width: `${value}%` }}
            />
        </div>
    </div>
);

const ATSLiftMeter = ({ current, projected }) => {
    const lift = projected - current;
    return (
        <div className="bg-gradient-to-r from-surface/80 to-accent/5 border border-accent/20 rounded-[2rem] p-6 space-y-4">
            <div className="flex items-center justify-between">
                <h4 className="text-[9px] font-black text-accent uppercase tracking-[0.3em]">ATS Score Lift</h4>
                <span className="text-[9px] font-black text-accent bg-accent/10 px-3 py-1 rounded-full border border-accent/20">
                    +{lift} PTS POTENTIAL
                </span>
            </div>
            <div className="flex items-center gap-4">
                <div className="flex flex-col items-center">
                    <span className="text-3xl font-black font-syne text-white/40">{current}</span>
                    <span className="text-[8px] font-bold text-white/30 uppercase tracking-widest">Current</span>
                </div>
                <div className="flex-1 relative h-3 bg-white/5 rounded-full overflow-hidden">
                    <div 
                        className="absolute left-0 top-0 h-full bg-white/20 rounded-full transition-all duration-1000"
                        style={{ width: `${current}%` }}
                    />
                    <div 
                        className="absolute left-0 top-0 h-full bg-gradient-to-r from-accent/60 to-accent rounded-full transition-all duration-1500 delay-500"
                        style={{ width: `${projected}%` }}
                    />
                    <div className="absolute top-1/2 -translate-y-1/2 text-lg transition-all duration-1000" style={{ left: `calc(${(current + projected) / 2}% - 8px)` }}>→</div>
                </div>
                <div className="flex flex-col items-center">
                    <span className="text-3xl font-black font-syne text-accent">{projected}</span>
                    <span className="text-[8px] font-bold text-accent uppercase tracking-widest">After Fix</span>
                </div>
            </div>
        </div>
    );
};

export default function JobIntelligenceCard({ analysis, onTailor, onApply, loadingTailor, onStartAutoFix }) {
    if (!analysis) return null;

    const { 
        matchScore, breakdown, applyConfidence, expectedResponseChance, 
        missingSkills = [], keywordGaps = [], improvements = [], 
        sponsorshipIntel, autoFixable = [], atsScore 
    } = analysis;

    const confidenceStyles = {
        HIGH: { icon: "🔥", color: "text-accent", bg: "bg-accent/10", border: "border-accent/20", label: "HIGH CONFIDENCE" },
        MED: { icon: "⚖️", color: "text-purple", bg: "bg-purple/10", border: "border-purple/20", label: "OPTIMAL MATCH" },
        LOW: { icon: "⚠️", color: "text-pink", bg: "bg-pink/10", border: "border-pink/20", label: "VOLATILE MATCH" }
    }[applyConfidence] || { icon: "❓", color: "text-muted", bg: "bg-white/5", border: "border-white/10", label: "ANALYZING" };

    const hasFixes = autoFixable && autoFixable.length > 0;
    const criticalCount = autoFixable.filter(f => f.severity === 'critical').length;

    return (
        <div className="bg-surface/50 border border-accent/20 rounded-[2.5rem] p-8 space-y-6 animate-fade-in relative overflow-hidden group shadow-2xl">
            <div className="absolute top-0 right-0 w-48 h-48 bg-accent/5 blur-[100px] rounded-full translate-x-12 -translate-y-12" />
            
            {/* Header: Match + Confidence + Response Chance */}
            <div className="flex justify-between items-start relative z-10">
                <div className="space-y-1">
                    <h3 className="text-[10px] font-black text-accent uppercase tracking-[0.4em] flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                        Decision Matrix v3.0
                    </h3>
                    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border ${confidenceStyles.bg} ${confidenceStyles.border} ${confidenceStyles.color} text-[9px] font-black uppercase tracking-widest mt-2`}>
                        <span className="text-xs">{confidenceStyles.icon}</span>
                        {confidenceStyles.label}
                    </div>
                </div>
                <div className="flex flex-col items-end">
                    <div className="text-[9px] font-black text-muted uppercase tracking-widest mb-1 italic">Est. Response</div>
                    <div className={`text-3xl font-syne font-black tracking-tighter italic ${confidenceStyles.color}`}>{expectedResponseChance}</div>
                </div>
            </div>

            {/* Explainable AI Pillars */}
            <div className="bg-black/20 rounded-[2rem] p-6 space-y-4 border border-white/5">
                <div className="flex gap-6">
                    <PillarBar label="Skills" value={breakdown?.skills || 0} color="text-accent" />
                    <PillarBar label="Experience" value={breakdown?.experience || 0} color="text-purple" />
                </div>
                <div className="flex gap-6">
                    <PillarBar label="Keywords" value={breakdown?.keywords || 0} color="text-blue-400" />
                    <PillarBar label="Visa Fit" value={breakdown?.visa || 0} color="text-emerald-400" />
                </div>
            </div>

            {/* ATS Score Lift Meter */}
            {atsScore && (
                <ATSLiftMeter current={atsScore.current} projected={atsScore.projected} />
            )}

            {/* Gaps & Fixes Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Missing Skills with Fix Buttons */}
                <div className="space-y-3">
                    <h4 className="text-[10px] font-black text-white/40 uppercase tracking-widest">Missing Skills</h4>
                    <div className="flex flex-wrap gap-2">
                        {missingSkills.length > 0 ? missingSkills.map(skill => (
                            <span key={skill} className="bg-red-500/10 border border-red-500/20 text-red-400 text-[9px] font-bold px-3 py-1.5 rounded-xl uppercase tracking-wider flex items-center gap-1.5 group/skill cursor-default">
                                <span className="text-red-400/60">-</span>{skill}
                            </span>
                        )) : (
                            <span className="text-[10px] text-accent italic font-medium">All skills matched ✓</span>
                        )}
                    </div>
                </div>

                {/* Keyword Gaps */}
                <div className="space-y-3">
                    <h4 className="text-[10px] font-black text-white/40 uppercase tracking-widest">Keyword Gaps</h4>
                    <div className="flex flex-wrap gap-2">
                        {keywordGaps.length > 0 ? keywordGaps.map(kw => (
                            <span key={kw} className="bg-orange-500/10 border border-orange-500/20 text-orange-400 text-[9px] font-bold px-3 py-1.5 rounded-xl uppercase tracking-wider">{kw}</span>
                        )) : (
                            <span className="text-[10px] text-accent italic font-medium">Keywords aligned ✓</span>
                        )}
                    </div>
                </div>
            </div>

            {/* Strategic Improvements */}
            <div className="space-y-3">
                <h4 className="text-[10px] font-black text-white/40 uppercase tracking-widest">Strategic Advice</h4>
                <ul className="space-y-2">
                    {improvements.map((imp, i) => (
                        <li key={i} className="flex gap-3 items-start group/li transition-all">
                            <span className="text-accent mt-0.5 text-xs">✦</span>
                            <span className="text-[11px] text-white/70 font-medium italic leading-relaxed group-hover/li:text-white transition-colors">{imp}</span>
                        </li>
                    ))}
                </ul>
            </div>

            {/* Sponsorship Verification */}
            <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-4 flex items-center gap-4">
                <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center text-xl shadow-inner grayscale opacity-50">🛡️</div>
                <div className="flex-1">
                    <h5 className="text-[9px] font-black text-accent uppercase tracking-widest mb-0.5">Global Mobility Intel</h5>
                    <p className="text-[10px] text-muted leading-relaxed italic font-medium">{sponsorshipIntel}</p>
                </div>
            </div>

            {/* Match Feedback Engine */}
            <div className="pt-4 border-t border-white/5">
                <MatchFeedback 
                    jobId={analysis.job_id || analysis.id || 'unknown'} 
                    initialScore={matchScore || 85} 
                />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t border-white/5">
                {hasFixes && (
                    <button 
                        onClick={onStartAutoFix}
                        className="flex-1 bg-gradient-to-r from-amber-500/10 to-red-500/10 hover:from-amber-500/20 hover:to-red-500/20 border border-amber-500/20 text-amber-400 rounded-2xl py-4 text-[10px] font-black uppercase tracking-[0.15em] transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                    >
                        <span className="text-sm">⚡</span>
                        Fix {criticalCount} Issues
                    </button>
                )}
                <button 
                    onClick={onTailor}
                    disabled={loadingTailor}
                    className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-2xl py-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-50"
                >
                    {loadingTailor ? "Syncing Logic..." : <><span className="text-sm">🪄</span> Tailor v2</>}
                </button>
                <button 
                    onClick={onApply}
                    className="flex-1 bg-accent hover:bg-white text-black rounded-2xl py-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 shadow-lg shadow-accent/10 active:scale-[0.98]"
                >
                    <span className="text-sm">🚀</span> Dispatch Apply
                </button>
            </div>
        </div>
    );
}
