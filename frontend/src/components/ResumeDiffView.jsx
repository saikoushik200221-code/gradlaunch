import React, { useMemo, useState } from "react";

/**
 * ResumeDiffView — side-by-side/inline diff of tailored resume changes.
 *
 * Consumes the response shape of POST /api/ai/tailor-resume:
 *   { tailoredResume: string, improvedBullet?: string,
 *     score: number, keywords: string[], tips: string[], add: string[],
 *     atsScore, keywordMatches, metricsCount, bulletsCount }
 *
 * Also accepts an optional `originalResume` string to render a line-level diff.
 * Each change has accept/reject — state is tracked locally and exposed via onAccept.
 */
export default function ResumeDiffView({
    originalResume = "",
    tailored,
    onAccept,
    onExportPdf,
}) {
    const [mode, setMode] = useState("diff"); // diff | side | inline

    if (!tailored) return null;

    const {
        tailoredResume = "",
        improvedBullet,
        score = 0,
        keywords = [],
        tips = [],
        add = [],
        atsScore,
        keywordMatches = 0,
        metricsCount = 0,
        bulletsCount = 0,
    } = tailored;

    const lineDiff = useMemo(
        () => computeLineDiff(originalResume || "", tailoredResume || ""),
        [originalResume, tailoredResume]
    );

    // Accept/reject state keyed by diff hunk index.
    const [decisions, setDecisions] = useState({});
    const decide = (i, v) =>
        setDecisions(d => ({ ...d, [i]: d[i] === v ? null : v }));

    const acceptedLines = useMemo(() => {
        // Rebuild accepted resume: for each hunk, take original unless user accepted.
        const out = [];
        lineDiff.forEach((hunk, i) => {
            if (hunk.type === "same") out.push(hunk.line);
            else if (hunk.type === "change") {
                const d = decisions[i];
                if (d === "accept") out.push(hunk.next);
                else out.push(hunk.prev);
            } else if (hunk.type === "add") {
                if (decisions[i] === "accept") out.push(hunk.line);
            } else if (hunk.type === "remove") {
                if (decisions[i] !== "accept") out.push(hunk.line);
            }
        });
        return out.join("\n");
    }, [lineDiff, decisions]);

    const coverage = keywords.length ? Math.round((keywordMatches / keywords.length) * 100) : 0;

    return (
        <div className="space-y-6">
            {/* Header stats */}
            <div className="flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-widest">
                <Stat label="ATS" value={atsScore ?? score} accent />
                <Stat label="Keyword Coverage" value={`${coverage}%`} />
                <Stat label="Metrics" value={metricsCount} />
                <Stat label="Bullets" value={bulletsCount} />
            </div>

            {/* View mode switcher */}
            <div className="flex gap-2 text-[10px] font-black uppercase tracking-widest">
                {[
                    ["diff", "Diff"],
                    ["side", "Side by side"],
                    ["inline", "Tailored only"],
                ].map(([k, l]) => (
                    <button key={k} onClick={() => setMode(k)}
                        className={`px-3 py-1.5 rounded-xl border transition-all ${
                            mode === k
                                ? "bg-accent/10 border-accent text-accent"
                                : "bg-surface/50 border-border text-muted hover:text-white"
                        }`}>
                        {l}
                    </button>
                ))}
                {onExportPdf && (
                    <button onClick={onExportPdf}
                        className="ml-auto px-3 py-1.5 rounded-xl border border-border bg-surface/50 text-muted hover:text-white transition-all">
                        ↓ Export PDF
                    </button>
                )}
            </div>

            {/* Diff body */}
            {mode === "diff" && (
                <div className="card-glass rounded-2xl border border-border/50 overflow-hidden">
                    <div className="max-h-[50vh] overflow-y-auto custom-scrollbar">
                        {lineDiff.length === 0 ? (
                            <EmptyDiff text={tailoredResume} />
                        ) : (
                            lineDiff.map((hunk, i) => (
                                <DiffRow key={i} hunk={hunk} idx={i} decision={decisions[i]} onDecide={decide} />
                            ))
                        )}
                    </div>
                </div>
            )}

            {mode === "side" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Pane title="Original" text={originalResume || "(no baseline resume)"} />
                    <Pane title="Tailored" text={tailoredResume} accent />
                </div>
            )}

            {mode === "inline" && (
                <Pane title="Tailored Resume" text={tailoredResume} accent />
            )}

            {/* Secondary content: keywords, tips, bullet suggestions */}
            {improvedBullet && (
                <div className="p-5 rounded-2xl bg-accent/5 border border-accent/20">
                    <p className="text-[10px] font-black text-accent uppercase tracking-widest mb-2">Suggested Bullet</p>
                    <p className="text-sm text-white/90 italic">{improvedBullet}</p>
                </div>
            )}

            {add.length > 0 && (
                <div className="p-5 rounded-2xl bg-surface/60 border border-border space-y-2">
                    <p className="text-[10px] font-black text-muted uppercase tracking-widest mb-2">Tailoring Suggestions</p>
                    {add.map((a, i) => (
                        <p key={i} className="text-xs text-white/80 italic">{a}</p>
                    ))}
                </div>
            )}

            {tips.length > 0 && (
                <div className="p-5 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-2">
                    <p className="text-[10px] font-black text-amber-300 uppercase tracking-widest mb-2">Tips</p>
                    {tips.map((t, i) => (
                        <p key={i} className="text-xs text-white/80 italic">{t}</p>
                    ))}
                </div>
            )}

            {keywords.length > 0 && (
                <div>
                    <p className="text-[10px] font-black text-muted uppercase tracking-widest mb-3">
                        Keywords in JD ({keywordMatches}/{keywords.length} present)
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {keywords.map(k => {
                            const present = (tailoredResume || "").toLowerCase().includes(k.toLowerCase());
                            return (
                                <span key={k}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider border ${
                                        present
                                            ? "bg-accent/10 border-accent/30 text-accent"
                                            : "bg-pink-500/10 border-pink-500/30 text-pink-300"
                                    }`}>
                                    {present ? "✓" : "○"} {k}
                                </span>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Accept CTA */}
            {onAccept && (
                <div className="flex gap-3 pt-2">
                    <button
                        onClick={() => onAccept(acceptedLines, decisions)}
                        className="flex-1 bg-accent text-black py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-accent/10 hover:brightness-110 transition-all">
                        Save Accepted Changes
                    </button>
                    <button
                        onClick={() => setDecisions({})}
                        className="px-6 border border-border bg-surface/50 text-muted hover:text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">
                        Reset
                    </button>
                </div>
            )}
        </div>
    );
}

function Stat({ label, value, accent }) {
    return (
        <span className={`px-3 py-1.5 rounded-full border ${
            accent ? "bg-accent/10 border-accent/40 text-accent" : "bg-surface/50 border-border text-muted"
        }`}>
            {label}: <span className="text-white">{value}</span>
        </span>
    );
}

function Pane({ title, text, accent }) {
    return (
        <div className={`card-glass rounded-2xl border ${accent ? "border-accent/30" : "border-border/50"} overflow-hidden`}>
            <div className={`px-4 py-2 border-b ${accent ? "border-accent/20 bg-accent/5 text-accent" : "border-border/50 bg-surface/40 text-muted"} text-[10px] font-black uppercase tracking-widest`}>
                {title}
            </div>
            <pre className="p-4 text-xs text-white/80 whitespace-pre-wrap font-mono max-h-[50vh] overflow-y-auto custom-scrollbar">
                {text}
            </pre>
        </div>
    );
}

function EmptyDiff({ text }) {
    return (
        <pre className="p-4 text-xs text-white/70 whitespace-pre-wrap font-mono">
            {text || "(no diff produced)"}
        </pre>
    );
}

function DiffRow({ hunk, idx, decision, onDecide }) {
    if (hunk.type === "same") {
        return (
            <div className="px-4 py-1 text-xs text-white/50 font-mono whitespace-pre-wrap border-l-2 border-transparent">
                {hunk.line || "\u00A0"}
            </div>
        );
    }

    const isAdd = hunk.type === "add";
    const isRm  = hunk.type === "remove";
    const isCh  = hunk.type === "change";

    const accepted = decision === "accept";
    const rejected = decision === "reject";

    return (
        <div className={`border-l-2 ${
            accepted ? "border-accent" :
            rejected ? "border-pink-500" :
            isAdd ? "border-accent/40" : isRm ? "border-pink-400/40" : "border-purple/40"
        }`}>
            {isCh && (
                <>
                    <DiffLine sign="-" text={hunk.prev} tone="remove" muted={accepted} />
                    <DiffLine sign="+" text={hunk.next} tone="add"    muted={rejected} />
                </>
            )}
            {isAdd && <DiffLine sign="+" text={hunk.line} tone="add"    muted={rejected} />}
            {isRm  && <DiffLine sign="-" text={hunk.line} tone="remove" muted={accepted} />}

            <div className="flex gap-2 px-4 py-1.5 bg-surface/40 text-[10px] font-black uppercase tracking-widest">
                <button onClick={() => onDecide(idx, "accept")}
                    className={`px-2 py-0.5 rounded-md border transition-all ${accepted ? "bg-accent text-black border-accent" : "border-accent/40 text-accent hover:bg-accent/10"}`}>
                    ✓ Accept
                </button>
                <button onClick={() => onDecide(idx, "reject")}
                    className={`px-2 py-0.5 rounded-md border transition-all ${rejected ? "bg-pink-500 text-black border-pink-500" : "border-pink-500/40 text-pink-400 hover:bg-pink-500/10"}`}>
                    ✕ Reject
                </button>
            </div>
        </div>
    );
}

function DiffLine({ sign, text, tone, muted }) {
    const color =
        tone === "add"    ? "text-accent bg-accent/5" :
        tone === "remove" ? "text-pink-300 bg-pink-500/5" :
                            "text-white/70";
    return (
        <div className={`px-4 py-1 text-xs font-mono whitespace-pre-wrap ${color} ${muted ? "opacity-40 line-through" : ""}`}>
            <span className="inline-block w-4 opacity-60">{sign}</span>
            {text || "\u00A0"}
        </div>
    );
}

/**
 * computeLineDiff — minimal LCS-free diff. Greedy, line-level, good enough
 * for resume-scale inputs. Returns an array of hunks:
 *   { type: "same"   , line }
 *   { type: "change" , prev, next }
 *   { type: "add"    , line }
 *   { type: "remove" , line }
 */
function computeLineDiff(a, b) {
    const A = (a || "").split("\n");
    const B = (b || "").split("\n");
    const out = [];

    let i = 0, j = 0;
    while (i < A.length || j < B.length) {
        const la = A[i], lb = B[j];

        if (la === lb && la !== undefined) {
            out.push({ type: "same", line: la });
            i++; j++;
            continue;
        }

        // Look ahead within a small window to re-sync.
        const WINDOW = 6;
        const idxInB = la !== undefined ? B.slice(j, j + WINDOW).indexOf(la) : -1;
        const idxInA = lb !== undefined ? A.slice(i, i + WINDOW).indexOf(lb) : -1;

        if (idxInB !== -1 && (idxInA === -1 || idxInB <= idxInA)) {
            // B has inserted idxInB new lines before catching up.
            for (let k = 0; k < idxInB; k++) out.push({ type: "add", line: B[j + k] });
            j += idxInB;
            continue;
        }
        if (idxInA !== -1) {
            for (let k = 0; k < idxInA; k++) out.push({ type: "remove", line: A[i + k] });
            i += idxInA;
            continue;
        }

        // Neither side syncs — treat as a change (or pure add/remove if one side exhausted).
        if (la !== undefined && lb !== undefined) {
            if (la.trim() === "" && lb.trim() === "") {
                out.push({ type: "same", line: la });
            } else {
                out.push({ type: "change", prev: la, next: lb });
            }
            i++; j++;
        } else if (la !== undefined) {
            out.push({ type: "remove", line: la }); i++;
        } else if (lb !== undefined) {
            out.push({ type: "add", line: lb }); j++;
        }
    }

    return out;
}
