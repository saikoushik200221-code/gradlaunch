import React, { useState } from "react";
import { LogoCircle, EmptyState } from "./Common";
import { TRACKER_STAGES, STAGE_COLORS } from "../theme";

const STAGE_ICONS = { "Wishlist": "⭐", "Applied": "📤", "Phone Screen": "📞", "Interview": "🤝", "Offer 🎉": "🎉", "Rejected": "❌" };

function AppDetailModal({ app, onClose, onUpdate, C }) {
    const [analysisText, setAnalysisText] = useState("");
    const [analyzing, setAnalyzing] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [portalForm, setPortalForm] = useState({ url: app.portalUrl || "", email: app.portalEmail || "", password: "" });

    async function decodeRejection() {
        if (!analysisText.trim()) return;
        setAnalyzing(true);
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:3001"}/api/anthropic/messages`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    model: "claude-sonnet-4-20250514",
                    max_tokens: 500,
                    messages: [{ role: "user", content: `Analyze this rejection email for the role of ${app.role} at ${app.company}. Provide hidden reasons and growth tips.\n\nREJECTION EMAIL:\n${analysisText}` }]
                })
            });
            const data = await res.json();
            const text = data.content?.[0]?.text || "";
            onUpdate(app.id, { rejectionAnalysis: text });
        } catch (e) {
            console.error(e);
        }
        setAnalyzing(false);
    }

    async function syncPortal() {
        if (!portalForm.url || !portalForm.email || !portalForm.password) return;
        setSyncing(true);
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:3001"}/api/sync`, {
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
        } catch (e) {
            console.error(e);
        }
        setSyncing(false);
    }

    return (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 24, width: "100%", maxWidth: 650, maxHeight: "90vh", overflowY: "auto", position: "relative", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)" }}>
                <button onClick={onClose} style={{ position: "absolute", top: 20, right: 20, background: "rgba(255,255,255,0.05)", border: "none", color: C.muted, fontSize: 18, cursor: "pointer", width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>

                <div style={{ padding: 32 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
                        <LogoCircle letter={app.logo} size={56} />
                        <div>
                            <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 24, margin: 0 }}>{app.company}</h2>
                            <div style={{ fontFamily: "'DM Sans', sans-serif", color: C.muted, fontSize: 16 }}>{app.role}</div>
                        </div>
                        <div style={{ marginLeft: "auto", background: `${STAGE_COLORS[app.stage]}15`, color: STAGE_COLORS[app.stage], padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 700, border: `1px solid ${STAGE_COLORS[app.stage]}33` }}>{app.stage}</div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
                        <div>
                            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 13, color: C.muted, letterSpacing: 1, textTransform: "uppercase", marginBottom: 12 }}>📈 Status Timeline</div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                                {app.history?.map((h, i) => (
                                    <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: STAGE_COLORS[h.stage], marginTop: 4, flexShrink: 0 }} />
                                        <div>
                                            <div style={{ fontSize: 13, fontWeight: 600 }}>{h.stage}</div>
                                            <div style={{ fontSize: 11, color: C.muted }}>{h.date}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div style={{ marginTop: 24 }}>
                                <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 13, color: C.muted, letterSpacing: 1, textTransform: "uppercase", marginBottom: 12 }}>📝 Notes</div>
                                <textarea
                                    value={app.notes || ""}
                                    onChange={e => onUpdate(app.id, { notes: e.target.value })}
                                    placeholder="Add interview notes, recruiter contacts..."
                                    style={{ width: "100%", background: "rgba(0,0,0,0.2)", border: `1px solid ${C.border}`, borderRadius: 12, padding: 12, color: C.text, fontFamily: "'DM Sans', sans-serif", fontSize: 13, minHeight: 100, resize: "none", outline: "none" }}
                                />
                            </div>
                        </div>

                        <div>
                            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 13, color: C.muted, letterSpacing: 1, textTransform: "uppercase", marginBottom: 12 }}>🔗 Live Portal Sync</div>
                            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16 }}>
                                <input placeholder="Portal URL (Workday/Greenhouse...)" value={portalForm.url} onChange={e => setPortalForm(f => ({ ...f, url: e.target.value }))}
                                    style={{ width: "100%", background: "rgba(0,0,0,0.3)", border: `1px solid ${C.border}`, borderRadius: 8, padding: 10, color: C.text, fontFamily: "'DM Sans', sans-serif", fontSize: 12, marginBottom: 8, outline: "none" }} />
                                <input placeholder="Email" value={portalForm.email} onChange={e => setPortalForm(f => ({ ...f, email: e.target.value }))}
                                    style={{ width: "100%", background: "rgba(0,0,0,0.3)", border: `1px solid ${C.border}`, borderRadius: 8, padding: 10, color: C.text, fontFamily: "'DM Sans', sans-serif", fontSize: 12, marginBottom: 8, outline: "none" }} />
                                <input type="password" placeholder="Password" value={portalForm.password} onChange={e => setPortalForm(f => ({ ...f, password: e.target.value }))}
                                    style={{ width: "100%", background: "rgba(0,0,0,0.3)", border: `1px solid ${C.border}`, borderRadius: 8, padding: 10, color: C.text, fontFamily: "'DM Sans', sans-serif", fontSize: 12, marginBottom: 8, outline: "none" }} />
                                <button onClick={syncPortal} disabled={syncing}
                                    style={{ width: "100%", background: syncing ? "transparent" : C.accent, border: syncing ? `1px solid ${C.accent}` : "none", color: syncing ? C.accent : "#000", padding: "10px", borderRadius: 8, fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 13, cursor: syncing ? "wait" : "pointer" }}>
                                    {syncing ? "⚙️ Syncing Live..." : "✨ Link & Sync Status"}
                                </button>
                                <div style={{ fontSize: 10, color: C.muted, marginTop: 10, textAlign: "center" }}>🔒 Credentials are used locally only.</div>
                            </div>

                            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 13, color: C.muted, letterSpacing: 1, textTransform: "uppercase", margin: "24px 0 12px" }}>🕵️ Rejection Decoder (AI)</div>
                            {app.rejectionAnalysis ? (
                                <div style={{ background: "rgba(0, 240, 255, 0.05)", border: `1px solid ${C.accent}22`, borderRadius: 12, padding: 16, fontSize: 13, lineHeight: 1.6, color: C.text }}>
                                    <div style={{ whiteSpace: "pre-wrap" }}>{app.rejectionAnalysis}</div>
                                    <button onClick={() => onUpdate(app.id, { rejectionAnalysis: null })} style={{ marginTop: 12, background: "transparent", border: "none", color: C.muted, fontSize: 11, cursor: "pointer", textDecoration: "underline" }}>Clear Analysis</button>
                                </div>
                            ) : (
                                <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16 }}>
                                    <div style={{ fontSize: 12, color: C.muted, marginBottom: 10 }}>Paste the rejection email text below to have Orion AI decode why you were passed over and how to improve.</div>
                                    <textarea
                                        value={analysisText}
                                        onChange={e => setAnalysisText(e.target.value)}
                                        placeholder="We regret to inform you..."
                                        style={{ width: "100%", background: "rgba(0,0,0,0.3)", border: `1px solid ${C.border}`, borderRadius: 8, padding: 10, color: C.text, fontFamily: "'DM Sans', sans-serif", fontSize: 12, minHeight: 80, resize: "none", outline: "none", marginBottom: 10 }}
                                    />
                                    <button
                                        onClick={decodeRejection}
                                        disabled={analyzing || !analysisText.trim()}
                                        style={{ width: "100%", background: analyzing ? "transparent" : C.accent, border: analyzing ? `1px solid ${C.accent}` : "none", color: analyzing ? C.accent : "#000", padding: "8px", borderRadius: 8, fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 12, cursor: analyzing ? "wait" : "pointer" }}>
                                        {analyzing ? "Decoding..." : "✨ Decode Rejection"}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function AppTracker({ applications, setApplications, C }) {
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
                // Optimistic update
                setApplications(apps => apps.map(a => a.id === id ? { ...a, ...updates } : a));
                // Refresh to get history if stage changed
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
        if (linkedApps.length === 0) {
            alert("No applications linked! Link a portal in the application details first.");
            return;
        }

        setSyncing(true);
        for (const app of linkedApps) {
            try {
                await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:3001"}/api/sync`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ portalUrl: app.portalUrl, email: app.portalEmail, password: "ASK_USER_PROMPT" })
                });
            } catch (e) { }
        }
        setSyncing(false);
    }

    function addApp() {
        if (!form.company || !form.role) return;
        setApplications(apps => [...apps, { ...form, id: Date.now(), stage: "Wishlist", date: new Date().toLocaleDateString("en", { month: "short", day: "numeric" }), logo: form.company[0]?.toUpperCase() || "?" }]);
        setForm({ company: "", role: "", logo: "?" });
        setAdding(false);
    }

    const stats = TRACKER_STAGES.map(s => ({ stage: s, count: applications.filter(a => a.stage === s).length }));

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 20, height: "100%" }}>
            {/* Stats row */}
            <div style={{ display: "flex", gap: 10, flexShrink: 0, overflowX: "auto", paddingBottom: 4 }}>
                {stats.map(({ stage, count }) => (
                    <div key={stage} style={{ flex: 1, minWidth: 100, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "12px 8px", textAlign: "center", position: "relative" }}>
                        <div style={{ position: "absolute", top: 8, right: 8, fontSize: 14 }}>{STAGE_ICONS[stage]}</div>
                        <div style={{ fontSize: 22, fontFamily: "'Syne', sans-serif", fontWeight: 800, color: STAGE_COLORS[stage] }}>{count}</div>
                        <div style={{ fontSize: 10, fontFamily: "'DM Sans', sans-serif", color: C.muted, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{stage}</div>
                    </div>
                ))}
            </div>

            {/* Action buttons */}
            <div style={{ flexShrink: 0, display: "flex", gap: 12 }}>
                {!adding ? (
                    <>
                        <button onClick={() => setAdding(true)} style={{ background: `${C.accent}15`, border: `1px dashed ${C.accent}`, borderRadius: 12, padding: "12px 24px", color: C.accent, fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
                            + Track New Application
                        </button>
                        <button onClick={smartSync} disabled={syncing} style={{ background: "transparent", border: `1px solid ${C.border}`, borderRadius: 12, padding: "12px 24px", color: C.text, fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 13, cursor: syncing ? "wait" : "pointer", opacity: syncing ? 0.6 : 1, display: "flex", alignItems: "center", gap: 8 }}>
                            {syncing ? "⚙\uFE0F Syncing..." : "\u2728 Smart Sync"}
                        </button>
                    </>
                ) : (
                    <div style={{ display: "flex", gap: 10, alignItems: "center", background: C.surface, border: `1px solid ${C.accent}44`, borderRadius: 12, padding: "12px 16px", width: "100%" }}>
                        <input placeholder="Company" value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))}
                            style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 12px", color: C.text, fontFamily: "'DM Sans', sans-serif", fontSize: 14, outline: "none", flex: 1 }} />
                        <input placeholder="Role" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                            style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 12px", color: C.text, fontFamily: "'DM Sans', sans-serif", fontSize: 14, outline: "none", flex: 2 }} />
                        <button onClick={addApp} style={{ background: C.accent, border: "none", borderRadius: 8, padding: "8px 16px", color: "#000", fontFamily: "'Syne', sans-serif", fontWeight: 700, cursor: "pointer" }}>Add</button>
                        <button onClick={() => setAdding(false)} style={{ background: "transparent", border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 14px", color: C.muted, cursor: "pointer" }}>\u2715</button>
                    </div>
                )}
            </div>

            {/* Kanban board */}
            <div style={{ flex: 1, display: "flex", gap: 12, overflowX: "auto", minHeight: 0 }}>
                {TRACKER_STAGES.map(stage => {
                    const stageApps = applications.filter(a => a.stage === stage);
                    const stageColor = STAGE_COLORS[stage];
                    return (
                        <div key={stage} style={{ flex: "0 0 200px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                            <div style={{ padding: "14px 16px", borderBottom: `1px solid ${C.border}`, background: `${stageColor}12` }}>
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                    <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 13, color: stageColor }}>{stage}</span>
                                    <span style={{ background: `${stageColor}22`, color: stageColor, borderRadius: 20, padding: "2px 8px", fontSize: 12, fontWeight: 700 }}>{stageApps.length}</span>
                                </div>
                            </div>
                            <div style={{ flex: 1, overflowY: "auto", padding: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                                {stageApps.map(app => {
                                    const stageIdx = TRACKER_STAGES.indexOf(app.stage);
                                    return (
                                        <div key={app.id} onClick={() => setSelectedAppId(app.id)}
                                            style={{ background: C.card, border: app.autoUpdated ? `1px solid ${C.accent}66` : `1px solid ${C.border}`, borderRadius: 12, padding: "12px", cursor: "pointer", position: "relative" }}>
                                            {app.autoUpdated && <div style={{ position: "absolute", top: -8, right: 8, background: C.accent, color: "#000", fontSize: 9, fontWeight: 900, padding: "2px 6px", borderRadius: 10, boxShadow: `0 0 10px ${C.accent}44` }}>SYNCED</div>}
                                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                                                <LogoCircle letter={app.logo} size={28} />
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 12, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{app.company}</div>
                                                    <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: C.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{app.role}</div>
                                                </div>
                                            </div>
                                            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: C.muted, marginBottom: 8 }}>\uD83D\uDCC5 {app.date}</div>
                                            <div style={{ display: "flex", gap: 4 }}>
                                                {stageIdx > 0 && <button onClick={(e) => { e.stopPropagation(); moveStage(app.id, -1); }} style={{ flex: 1, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, padding: "4px 0", color: C.muted, fontSize: 12, cursor: "pointer" }}>\u2190</button>}
                                                {stageIdx < TRACKER_STAGES.length - 1 && <button onClick={(e) => { e.stopPropagation(); moveStage(app.id, 1); }} style={{ flex: 1, background: `${stageColor}22`, border: `1px solid ${stageColor}44`, borderRadius: 6, padding: "4px 0", color: stageColor, fontSize: 12, cursor: "pointer", fontWeight: 600 }}>\u2192</button>}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
                {applications.length === 0 && (
                    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", minWidth: 600 }}>
                        <EmptyState
                            icon="📊"
                            title="No applications yet"
                            description="Your tracking board is empty. Start by applying to jobs from the Job Search tab or add one manually!"
                            C={C}
                        />
                    </div>
                )}
            </div>

            {selectedApp && <AppDetailModal app={selectedApp} onClose={() => setSelectedAppId(null)} onUpdate={updateApp} C={C} />}
        </div>
    );
}
