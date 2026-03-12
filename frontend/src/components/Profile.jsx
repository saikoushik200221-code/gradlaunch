import React, { useState, useEffect } from "react";
import { COLORS } from "../theme";

function ProfileField({ label, field, type = "text", profile, setProfile, C }) {
    const inputStyle = { width: "100%", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 14px", color: C.text, fontFamily: "'DM Sans', sans-serif", fontSize: 14, outline: "none", boxSizing: "border-box" };
    const labelStyle = { fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: C.muted, marginBottom: 6, fontWeight: 600 };

    return (
        <div>
            <div style={labelStyle}>{label}</div>
            <input type={type} value={profile[field] || ""} onChange={e => setProfile(p => ({ ...p, [field]: e.target.value }))} style={inputStyle} />
        </div>
    );
}

function ProfileSelect({ label, field, options, profile, setProfile, C }) {
    const inputStyle = { width: "100%", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 14px", color: C.text, fontFamily: "'DM Sans', sans-serif", fontSize: 14, outline: "none", boxSizing: "border-box", cursor: "pointer" };
    const labelStyle = { fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: C.muted, marginBottom: 6, fontWeight: 600 };

    return (
        <div>
            <div style={labelStyle}>{label}</div>
            <select value={profile[field] || ""} onChange={e => setProfile(p => ({ ...p, [field]: e.target.value }))} style={inputStyle}>
                {options.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
        </div>
    );
}

export default function Profile({ globalContext, setGlobalContext, setGlobalVector, onProfileUpdate, currentUser, C }) {
    const [profile, setProfile] = useState({
        name: currentUser?.name || "", email: currentUser?.email || "",
        university: "", major: "", gradYear: "",
        visaStatus: "F-1/OPT", targetRole: "Software Engineer", targetLocation: "",
        skills: "", linkedin: "", baseResume: ""
    });
    const [analyzing, setAnalyzing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        async function loadProfile() {
            const token = localStorage.getItem("token");
            try {
                const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:3001"}/api/profile`, {
                    headers: { "Authorization": `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setProfile(data);
                    if (data.aiContext) setGlobalContext(data.aiContext);
                    if (data.skills) setGlobalVector(`${data.skills} ${data.targetRole} ${data.baseResume} ${data.aiContext || ""}`);
                }
            } catch (e) { console.error("Profile load failed", e); }
        }
        loadProfile();
    }, [setGlobalContext, setGlobalVector]);

    async function saveProfile(updates = {}) {
        setSaving(true);
        setSaved(false);
        setError("");
        const token = localStorage.getItem("token");
        const fullProfile = { ...profile, ...updates };
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:3001"}/api/profile`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                body: JSON.stringify(fullProfile)
            });
            if (res.ok) {
                const data = await res.json();
                setSaved(true);
                if (onProfileUpdate) onProfileUpdate(data.profile);
                setTimeout(() => setSaved(false), 3000);
            } else { setError("Failed to save changes"); }
        } catch (e) { setError("Server connection failed"); }
        setSaving(false);
    }

    async function analyzeAndSave() {
        setAnalyzing(true);
        setSaved(false);
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:3001"}/api/anthropic/messages`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    model: "claude-sonnet-4-20250514",
                    max_tokens: 1500,
                    system: "You are an expert career AI. Analyze the user's raw profile data and base resume. Extract a comprehensive, highly detailed 'Deep Context Profile' that captures all their skills, experiences, projects, metrics, and educational background. Group them logically. Output ONLY the structured context.",
                    messages: [{
                        role: "user",
                        content: `Name: ${profile.name}\nMajor: ${profile.major}\nSkills: ${profile.skills}\nTarget Role: ${profile.targetRole}\n\nBASE RESUME:\n${profile.baseResume}`
                    }]
                })
            });
            const data = await res.json();
            const text = data.content?.[0]?.text || "";
            setGlobalContext(text);
            setGlobalVector(`${profile.skills} ${profile.targetRole} ${profile.baseResume} ${text}`);
            await saveProfile({ aiContext: text });
        } catch (e) {
            setError("Analysis failed: " + e.message);
        }
        setAnalyzing(false);
    }

    return (
        <div style={{ display: "flex", gap: 24, height: "100%" }}>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 20, overflowY: "auto" }}>
                <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 18, padding: 24, display: "flex", alignItems: "center", gap: 20 }}>
                    <div style={{ width: 72, height: 72, borderRadius: "50%", background: `linear-gradient(135deg, ${C.accent}, ${C.purple})`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 28, color: "#fff", flexShrink: 0 }}>
                        {profile.name ? profile.name.split(" ").map(n => n[0]).join("") : "?"}
                    </div>
                    <div>
                        <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 20, color: C.text, margin: "0 0 4px" }}>{profile.name || "Untitled Profile"}</h2>
                        <div style={{ fontFamily: "'DM Sans', sans-serif", color: C.muted, fontSize: 14 }}>{profile.major} · {profile.university} · Class of {profile.gradYear}</div>
                        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                            <button onClick={() => saveProfile()} disabled={saving} style={{ background: "transparent", border: `1px solid ${C.accent}44`, color: C.accent, borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                                {saving ? "Saving..." : saved ? "✓ Saved" : "💾 Save Changes"}
                            </button>
                        </div>
                    </div>
                </div>

                <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 18, padding: 24 }}>
                    <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 16, color: C.text, marginBottom: 18 }}>Personal Info</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                        <ProfileField label="Full Name" field="name" profile={profile} setProfile={setProfile} C={C} />
                        <ProfileField label="Email Address" field="email" type="email" profile={profile} setProfile={setProfile} C={C} />
                        <ProfileField label="University" field="university" profile={profile} setProfile={setProfile} C={C} />
                        <ProfileField label="Major" field="major" profile={profile} setProfile={setProfile} C={C} />
                        <ProfileField label="Graduation Year" field="gradYear" profile={profile} setProfile={setProfile} C={C} />
                        <ProfileField label="LinkedIn Profile" field="linkedin" profile={profile} setProfile={setProfile} C={C} />
                    </div>
                </div>

                <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 18, padding: 24 }}>
                    <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 16, color: C.text, marginBottom: 18 }}>Job Preferences</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                        <ProfileSelect label="Visa Status" field="visaStatus" options={["F-1/OPT", "H1B", "Green Card", "US Citizen", "Other"]} profile={profile} setProfile={setProfile} C={C} />
                        <ProfileSelect label="Target Role" field="targetRole" options={["Software Engineer", "Data Analyst", "Product Manager", "UX Designer", "Data Scientist", "DevOps Engineer", "Other"]} profile={profile} setProfile={setProfile} C={C} />
                        <ProfileField label="Target Location" field="targetLocation" profile={profile} setProfile={setProfile} C={C} />
                        <div />
                        <div style={{ gridColumn: "1 / -1" }}>
                            <ProfileField label="Key Skills (comma-separated)" field="skills" profile={profile} setProfile={setProfile} C={C} />
                        </div>
                    </div>
                </div>

                <div style={{ gridColumn: "1 / -1", marginTop: 12 }}>
                    <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: C.muted, marginBottom: 6, fontWeight: 600 }}>📄 Comprehensive Base Resume</div>
                    <textarea value={profile.baseResume} onChange={e => setProfile(p => ({ ...p, baseResume: e.target.value }))}
                        placeholder="Paste your everything-resume here..."
                        style={{ width: "100%", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px", color: C.text, fontFamily: "'DM Sans', sans-serif", fontSize: 13, outline: "none", boxSizing: "border-box", minHeight: 200, resize: "vertical", lineHeight: 1.6 }} />
                </div>

                {globalContext && (
                    <div style={{ background: C.bg === "#04060A" ? `linear-gradient(135deg, ${C.accent}11, ${C.purple}11)` : "#F1F5F9", border: `1px solid ${C.accent}44`, borderRadius: 18, padding: 24 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                            <span style={{ fontSize: 20 }}>🧠</span>
                            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 16, color: C.text }}>Deep Profile Context Active</div>
                        </div>
                        <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: C.text, lineHeight: 1.6, whiteSpace: "pre-wrap", maxHeight: 200, overflowY: "auto", padding: 12, background: "rgba(0,0,0,0.3)", borderRadius: 8 }}>
                            {globalContext}
                        </div>
                    </div>
                )}

                {error && <div style={{ color: C.red, fontSize: 13, textAlign: "center" }}>{error}</div>}

                <button onClick={analyzeAndSave} disabled={analyzing} style={{ background: analyzing ? C.surface : `linear-gradient(135deg, ${C.accent}, ${C.accentDim})`, border: analyzing ? `1px solid ${C.border}` : "none", borderRadius: 12, padding: "15px 0", color: analyzing ? C.muted : "#000", fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 15, cursor: analyzing ? "wait" : "pointer", transition: "all 0.3s", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                    {analyzing ? "⚙\uFE0F Analyzing..." : "\uD83E\uDD16 Analyze & Save Deep Profile"}
                </button>
            </div>

            <div style={{ flex: "0 0 260px", display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 16, color: C.text }}>🎯 Tips For You</div>
                {[
                    { icon: "🌐", title: "International Student?", tip: "Filter jobs by H1B Sponsor.", color: COLORS.purple },
                    { icon: "📋", title: "OPT Deadline", tip: "Apply 90 days before graduation.", color: COLORS.accent },
                    { icon: "🚀", title: "New Grad Programs", tip: "Hiring cycles: Oct–Dec.", color: COLORS.green },
                    { icon: "✨", title: "ATS Tip", tip: "Use exact keywords.", color: COLORS.yellow },
                ].map(({ icon, title, tip, color }) => (
                    <div key={title} style={{ background: C.surface, border: `1px solid ${color}22`, borderRadius: 14, padding: 16, borderLeft: `3px solid ${color}` }}>
                        <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 14, color, marginBottom: 6 }}>{icon} {title}</div>
                        <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: C.muted, lineHeight: 1.5 }}>{tip}</div>
                    </div>
                ))}
            </div>
        </div>
    );
}
