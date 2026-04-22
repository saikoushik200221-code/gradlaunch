import React from "react";

/**
 * MatchBreakdown — visual "why this score" panel.
 *
 * Consumes the response shape of POST /api/ai/analyze-job:
 *   {
 *     matchScore, breakdown: { skills, experience, keywords, visa },
 *     missingSkills: [...], keywordGaps: [...], improvements: [...],
 *     atsScore: { current, projected }, confidence, responseProbability,
 *     sponsorshipIntel
 *   }
 *
 * Pure SVG radar — no extra dependencies.
 */
export default function MatchBreakdown({ analysis, compact = false }) {
    if (!analysis) return null;

    const {
        matchScore = 0,
        breakdown = {},
        missingSkills = [],
        keywordGaps = [],
        improvements = [],
        atsScore = {},
        confidence = "MED",
        responseProbability,
        sponsorshipIntel,
    } = analysis;

    // Build strengths from the breakdown (any axis >= 75 is a strength)
    const axes = [
        { key: "skills",     label: "Skills",     value: breakdown.skills ?? 0 },
        { key: "experience", label: "Experience", value: breakdown.experience ?? 0 },
        { key: "keywords",   label: "Keywords",   value: breakdown.keywords ?? 0 },
        { key: "visa",       label: "Visa Fit",   value: breakdown.visa ?? 0 },
    ];

    const strengths = axes.filter(a => a.value >= 75).map(a => `${a.label}: ${a.value}%`);
    const weaknesses = axes.filter(a => a.value < 60).map(a => `${a.label}: ${a.value}%`);

    const confColor = {
        HIGH: "text-accent border-accent/40 bg-accent/10",
        MED:  "text-purple border-purple/40 bg-purple/10",
        LOW:  "text-pink border-pink/40 bg-pink/10",
    }[confidence] || "text-muted border-border bg-surface";

    return (
        <div className="space-y-6">
            <div className="flex items-start gap-6">
                <RadarChart axes={axes} size={compact ? 180 : 220} />

                <div className="flex-1 space-y-4 min-w-0">
                    <div className="flex items-baseline gap-3">
                        <span className="text-5xl font-black font-syne tracking-tighter text-accent">{matchScore}</span>
                        <span className="text-sm text-muted font-black uppercase tracking-widest">Match</span>
                    </div>

                    <div className="flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-widest">
                        <span className={`px-3 py-1.5 rounded-full border ${confColor}`}>
                            {confidence} CONFIDENCE
                        </span>
                        {responseProbability && (
                            <span className="px-3 py-1.5 rounded-full border border-border text-muted bg-surface/50">
                                Response: {responseProbability}
                            </span>
                        )}
                        {atsScore?.current != null && (
                            <span className="px-3 py-1.5 rounded-full border border-border text-muted bg-surface/50">
                                ATS {atsScore.current}
                                {atsScore.projected && atsScore.projected > atsScore.current && (
                                    <span className="text-accent"> → {atsScore.projected}</span>
                                )}
                            </span>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        {axes.map(a => (
                            <AxisBar key={a.key} label={a.label} value={a.value} />
                        ))}
                    </div>
                </div>
            </div>

            {/* Strengths + Weaknesses */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {strengths.length > 0 && (
                    <div className="p-5 bg-accent/5 border border-accent/20 rounded-2xl">
                        <p className="text-[10px] font-black text-accent uppercase tracking-widest mb-3">Strengths</p>
                        <ul className="space-y-2">
                            {strengths.map(s => (
                                <li key={s} className="text-xs text-white/80 font-medium italic flex gap-2">
                                    <span className="text-accent">✓</span>{s}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {weaknesses.length > 0 && (
                    <div className="p-5 bg-pink-500/5 border border-pink-500/20 rounded-2xl">
                        <p className="text-[10px] font-black text-pink-400 uppercase tracking-widest mb-3">Weak Spots</p>
                        <ul className="space-y-2">
                            {weaknesses.map(s => (
                                <li key={s} className="text-xs text-white/80 font-medium italic flex gap-2">
                                    <span className="text-pink-400">!</span>{s}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>

            {/* Missing skills chips */}
            {missingSkills.length > 0 && (
                <div>
                    <p className="text-[10px] font-black text-muted uppercase tracking-widest mb-3">Missing Skills in Resume</p>
                    <div className="flex flex-wrap gap-2">
                        {missingSkills.map(s => (
                            <span key={s}
                                className="px-3 py-1.5 bg-pink-500/10 border border-pink-500/30 text-pink-300 text-xs font-bold rounded-xl uppercase tracking-wider">
                                {s}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Keyword gaps chips */}
            {keywordGaps.length > 0 && keywordGaps.join() !== missingSkills.join() && (
                <div>
                    <p className="text-[10px] font-black text-muted uppercase tracking-widest mb-3">Keyword Gaps</p>
                    <div className="flex flex-wrap gap-2">
                        {keywordGaps.map(s => (
                            <span key={s}
                                className="px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold rounded-xl uppercase tracking-wider">
                                {s}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Improvement list */}
            {improvements.length > 0 && (
                <div className="p-5 bg-surface/60 border border-border rounded-2xl space-y-2">
                    <p className="text-[10px] font-black text-accent uppercase tracking-widest mb-2">What To Do Next</p>
                    {improvements.map((imp, i) => (
                        <div key={i} className="flex gap-3 text-xs text-white/80 font-medium italic">
                            <span className="text-accent font-black">{i + 1}.</span>
                            <span>{imp}</span>
                        </div>
                    ))}
                </div>
            )}

            {sponsorshipIntel && !compact && (
                <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-2xl">
                    <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Visa Intel</p>
                    <p className="text-xs text-white/70 italic">{sponsorshipIntel}</p>
                </div>
            )}
        </div>
    );
}

function AxisBar({ label, value }) {
    const color = value >= 75 ? "bg-accent" : value >= 60 ? "bg-purple" : "bg-pink-400";
    return (
        <div className="space-y-1">
            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                <span className="text-muted">{label}</span>
                <span className="text-white">{value}%</span>
            </div>
            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div className={`h-full ${color} transition-all duration-700 ease-out`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
            </div>
        </div>
    );
}

/**
 * RadarChart — pure-SVG 4-axis radar. Matrix-style neon green on dark.
 */
function RadarChart({ axes, size = 220 }) {
    const cx = size / 2;
    const cy = size / 2;
    const R = size / 2 - 20;

    // Evenly space N axes around the circle, starting at 12 o'clock.
    const n = axes.length;
    const angleFor = (i) => -Math.PI / 2 + (i * 2 * Math.PI) / n;

    const pointFor = (value, i) => {
        const r = (Math.max(0, Math.min(100, value)) / 100) * R;
        const a = angleFor(i);
        return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
    };

    const polygon = axes
        .map((a, i) => pointFor(a.value, i).join(","))
        .join(" ");

    // Reference rings at 25/50/75/100
    const rings = [0.25, 0.5, 0.75, 1].map(p => p * R);

    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
            {/* Grid rings */}
            {rings.map((r, i) => (
                <circle key={i} cx={cx} cy={cy} r={r}
                    fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
            ))}
            {/* Axis lines */}
            {axes.map((_, i) => {
                const [ex, ey] = pointFor(100, i);
                return <line key={i} x1={cx} y1={cy} x2={ex} y2={ey}
                    stroke="rgba(255,255,255,0.08)" strokeWidth="1" />;
            })}
            {/* Data polygon */}
            <polygon points={polygon}
                fill="rgba(200,255,0,0.18)" stroke="rgb(200,255,0)" strokeWidth="2" strokeLinejoin="round" />
            {/* Data points */}
            {axes.map((a, i) => {
                const [px, py] = pointFor(a.value, i);
                return <circle key={i} cx={px} cy={py} r="4" fill="rgb(200,255,0)" />;
            })}
            {/* Axis labels */}
            {axes.map((a, i) => {
                const [lx, ly] = pointFor(118, i);
                return (
                    <text key={i} x={lx} y={ly} textAnchor="middle" dominantBaseline="middle"
                        fontSize="9" fontWeight="900" fill="rgba(255,255,255,0.6)"
                        style={{ letterSpacing: "0.15em", textTransform: "uppercase", fontFamily: "var(--font-syne, ui-sans-serif)" }}>
                        {a.label}
                    </text>
                );
            })}
        </svg>
    );
}
