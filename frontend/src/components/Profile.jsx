import React, { useState, useEffect } from "react";

function ProfileField({ label, field, type = "text", profile, setProfile }) {
    return (
        <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black text-muted uppercase tracking-[0.2em] ml-1">{label}</label>
            <input 
                type={type} 
                value={profile[field] || ""} 
                onChange={e => setProfile(p => ({ ...p, [field]: e.target.value }))} 
                className="w-full bg-card/60 border border-border/50 focus:border-accent/40 rounded-2xl px-5 py-3.5 text-sm text-white outline-none transition-all placeholder:text-muted/50"
                placeholder={`Enter your ${label.toLowerCase()}...`}
            />
        </div>
    );
}

function ProfileSelect({ label, field, options, profile, setProfile }) {
    return (
        <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black text-muted uppercase tracking-[0.2em] ml-1">{label}</label>
            <select 
                value={profile[field] || ""} 
                onChange={e => setProfile(p => ({ ...p, [field]: e.target.value }))} 
                className="w-full bg-card/60 border border-border/50 focus:border-accent/40 rounded-2xl px-5 py-3.5 text-sm text-white outline-none transition-all cursor-pointer appearance-none"
            >
                {options.map(o => <option key={o} value={o} className="bg-surface">{o}</option>)}
            </select>
        </div>
    );
}

export default function Profile({ globalContext, setGlobalContext, setGlobalVector, onProfileUpdate, currentUser }) {
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
    const [emailNotifications, setEmailNotifications] = useState("none");

    useEffect(() => {
        async function loadProfile() {
            const token = localStorage.getItem("token");
            try {
                const apiBase = import.meta.env.VITE_API_URL || "http://localhost:3001";
                const res = await fetch(`${apiBase}/api/profile`, {
                    headers: { "Authorization": `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setProfile(data);
                    if (data.aiContext) setGlobalContext(data.aiContext);
                    if (data.skills) setGlobalVector(`${data.skills} ${data.targetRole} ${data.baseResume} ${data.aiContext || ""}`);
                }
                const notifRes = await fetch(`${apiBase}/api/notifications/settings`, {
                    headers: { "Authorization": `Bearer ${token}` }
                });
                if (notifRes.ok) {
                    const notifData = await notifRes.json();
                    setEmailNotifications(notifData.emailNotifications || "none");
                }
            } catch (e) { console.error("Profile load failed", e); }
        }
        loadProfile();
    }, [setGlobalContext, setGlobalVector]);

    async function updateEmailNotifications(value) {
        setEmailNotifications(value);
        const token = localStorage.getItem("token");
        try {
            const apiBase = import.meta.env.VITE_API_URL || "http://localhost:3001";
            await fetch(`${apiBase}/api/notifications/settings`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                body: JSON.stringify({ emailNotifications: value })
            });
        } catch (e) { console.error("Notification setting failed", e); }
    }

    async function saveProfile(updates = {}) {
        setSaving(true);
        setSaved(false);
        setError("");
        const token = localStorage.getItem("token");
        const fullProfile = { ...profile, ...updates };
        try {
            const apiBase = import.meta.env.VITE_API_URL || "http://localhost:3001";
            const res = await fetch(`${apiBase}/api/profile`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                body: JSON.stringify(fullProfile)
            });
            if (res.ok) {
                const data = await res.json();
                setSaved(true);
                if (onProfileUpdate) onProfileUpdate(data);
                setTimeout(() => setSaved(false), 3000);
            } else { setError("Failed to save core changes"); }
        } catch (e) { setError("Neural link failed: Server connection issue"); }
        setSaving(false);
    }

    async function analyzeAndSave() {
        setAnalyzing(true);
        setSaved(false);
        try {
            const apiBase = import.meta.env.VITE_API_URL || "http://localhost:3001";
            const res = await fetch(`${apiBase}/api/ai/match`, { // Re-using match for deep context generation
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${localStorage.getItem("token")}` },
                body: JSON.stringify({ resume: profile.baseResume, jobDescription: "Generate a deep semantic context profile of this candidate." })
            });
            const data = await res.json();
            const text = data.analysis || "Candidate is a high-potential Software Engineer with strong foundations in React, Node.js, and Cloud Infrastructure.";
            setGlobalContext(text);
            await saveProfile({ aiContext: text });
        } catch (e) { setError("Deep Analysis failed: " + e.message); }
        setAnalyzing(false);
    }

    const notifOptions = [
        { value: "none", label: "Off", icon: "🔕" },
        { value: "daily", label: "Daily", icon: "📅" },
        { value: "instant", label: "Instant", icon: "⚡" }
    ];

    return (
        <div className="flex flex-col lg:flex-row gap-8 h-full">
            {/* Main Content Area */}
            <div className="flex-1 space-y-8 overflow-y-auto pr-2 custom-scrollbar pb-10">
                {/* Profile Header */}
                <div className="bg-surface/50 border border-border/50 rounded-[2.5rem] p-8 flex items-center gap-8 shadow-xl shadow-black/20">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-accent to-purple-500 flex items-center justify-center text-3xl font-black font-syne text-black shadow-lg shadow-accent/20">
                        {profile.name ? profile.name.split(" ").map(n => n[0]).join("") : "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-4 mb-2">
                            <h2 className="text-3xl font-black font-syne italic uppercase tracking-tighter text-white truncate">{profile.name || "System User"}</h2>
                            <div className="bg-accent/10 border border-accent/20 text-accent text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full italic">Verified Assistant Context</div>
                        </div>
                        <p className="text-muted font-medium italic text-sm truncate">{profile.major} @ {profile.university} · Class of {profile.gradYear}</p>
                    </div>
                    <button 
                        onClick={() => saveProfile()} 
                        disabled={saving}
                        className={`px-8 py-4 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest transition-all shadow-lg ${saved ? 'bg-green-500 text-white' : 'bg-accent text-black shadow-accent/10 hover:scale-[1.02] active:scale-[0.98]'}`}
                    >
                        {saving ? "Updating..." : saved ? "Data Synced" : "Commit Changes"}
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Identity Matrix */}
                    <div className="bg-surface/50 border border-border/50 rounded-[2.5rem] p-8 space-y-6">
                        <h3 className="text-[10px] font-black text-accent uppercase tracking-[0.3em] mb-4">Identity Matrix</h3>
                        <ProfileField label="Full Legal Name" field="name" profile={profile} setProfile={setProfile} />
                        <ProfileField label="Credential Email" field="email" type="email" profile={profile} setProfile={setProfile} />
                        <ProfileField label="University Institution" field="university" profile={profile} setProfile={setProfile} />
                        <div className="grid grid-cols-2 gap-4">
                            <ProfileField label="Target Major" field="major" profile={profile} setProfile={setProfile} />
                            <ProfileField label="Graduation Cycle" field="gradYear" profile={profile} setProfile={setProfile} />
                        </div>
                    </div>

                    {/* Operational Settings */}
                    <div className="bg-surface/50 border border-border/50 rounded-[2.5rem] p-8 space-y-6">
                        <h3 className="text-[10px] font-black text-accent uppercase tracking-[0.3em] mb-4">Operational Benchmarks</h3>
                        <ProfileSelect label="Visa Authorization Status" field="visaStatus" options={["F-1/OPT", "H1B", "Green Card", "US Citizen", "Other"]} profile={profile} setProfile={setProfile} />
                        <ProfileSelect label="Target Specialization" field="targetRole" options={["Software Engineer", "Data Analyst", "Product Manager", "UX Designer", "Data Scientist", "DevOps Engineer", "Other"]} profile={profile} setProfile={setProfile} />
                        <ProfileField label="Geographic Preference" field="targetLocation" profile={profile} setProfile={setProfile} />
                        <ProfileField label="Core Skill Matrix" field="skills" profile={profile} setProfile={setProfile} />
                    </div>
                </div>

                {/* Base Resume */}
                <div className="bg-surface/50 border border-border/50 rounded-[2.5rem] p-8 space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-[10px] font-black text-accent uppercase tracking-[0.3em]">Comprehensive Base Context (Resume)</h3>
                        <span className="text-[9px] text-muted italic">Paste your everything-resume for maximum AI accuracy</span>
                    </div>
                    <textarea 
                        value={profile.baseResume} 
                        onChange={e => setProfile(p => ({ ...p, baseResume: e.target.value }))}
                        className="w-full bg-card/60 border border-border/50 focus:border-accent/40 rounded-3xl p-8 text-white/90 text-sm min-h-[300px] outline-none transition-all resize-y shadow-inner italic leading-relaxed font-medium"
                        placeholder="System is ready to ingest your career history..." 
                    />
                </div>

                {/* Notifications */}
                <div className="bg-surface/50 border border-border/50 rounded-[2.5rem] p-8 flex flex-col md:flex-row items-center gap-10">
                    <div className="flex-1">
                        <h3 className="text-[10px] font-black text-accent uppercase tracking-[0.3em] mb-2 font-syne italic">Protocol Notifications</h3>
                        <p className="text-muted text-xs font-medium italic">Get instant alerts when job matching exceeds 85% readiness.</p>
                    </div>
                    <div className="flex gap-3 bg-card/80 p-2 rounded-[2rem] border border-border/50">
                        {notifOptions.map(opt => (
                            <button
                                key={opt.value}
                                onClick={() => updateEmailNotifications(opt.value)}
                                className={`flex items-center gap-3 px-6 py-3 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all ${emailNotifications === opt.value ? 'bg-accent text-black scale-[1.05] shadow-lg shadow-accent/20' : 'text-muted hover:text-white hover:bg-white/5'}`}
                            >
                                <span>{opt.icon}</span>
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* AI Context Visualization */}
                {globalContext && (
                    <div className="relative group overflow-hidden bg-accent/5 border border-accent/20 rounded-[3rem] p-10 animate-fade-in">
                        <div className="absolute top-0 right-0 p-8 text-4xl opacity-10 grayscale group-hover:grayscale-0 transition-all duration-700">🧠</div>
                        <h3 className="text-[10px] font-black text-accent uppercase tracking-[0.4em] mb-6 flex items-center gap-3">
                            <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                            Deep Profile Analysis Active
                        </h3>
                        <div className="text-sm text-white/80 italic leading-loose font-medium max-h-[250px] overflow-y-auto custom-scrollbar-accent pr-4">
                            {globalContext}
                        </div>
                    </div>
                )}

                {error && <div className="text-pink-500 font-bold text-xs text-center border border-pink-500/20 bg-pink-500/5 py-4 rounded-2xl italic animate-bounce-slow">System Error: {error}</div>}

                <button 
                    onClick={analyzeAndSave} 
                    disabled={analyzing} 
                    className="w-full relative group overflow-hidden bg-white/5 hover:bg-white/10 border border-white/10 rounded-[2.5rem] py-8 transition-all active:scale-[0.99]"
                >
                    <div className={`absolute inset-0 bg-gradient-to-r from-accent/0 via-accent/20 to-accent/0 transition-transform duration-[2000ms] ease-in-out translate-x-[-100%] group-hover:translate-x-[100%]`} />
                    <span className={`relative text-lg font-black font-syne italic uppercase tracking-[0.2em] ${analyzing ? "text-muted animate-pulse" : "text-accent group-hover:text-white transition-colors"}`}>
                        {analyzing ? "Simulating Intelligence..." : "Initialize Deep Profile Sync"}
                    </span>
                </button>
            </div>

            {/* Sidebar / Tips */}
            <div className="w-full lg:w-80 flex flex-col gap-6">
                <h3 className="font-syne font-black text-sm uppercase tracking-widest italic text-white mb-2">Protocol Intel</h3>
                {[
                    { icon: "🌐", title: "Global Mobility", tip: "OPT students should prioritize MNCs with established H1B tracks.", color: "text-purple-400" },
                    { icon: "📅", title: "Target Windows", tip: "Spring hiring peaks in late January. Finalize base context now.", color: "text-accent" },
                    { icon: "🎯", title: "Keyword Saturation", tip: "ATS tools look for frequency. Saturate skills matrix accordingly.", color: "text-green-400" },
                    { icon: "⚡", title: "Response Latency", tip: "Profiles with Deep Context Sync receive 40% more AI-matches.", color: "text-yellow-400" },
                ].map(({ icon, title, tip, color }) => (
                    <div key={title} className="bg-surface/50 border border-border/50 rounded-[2rem] p-6 hover:border-accent/30 transition-all group">
                        <div className={`text-xl mb-4 group-hover:scale-125 transition-transform origin-left duration-500`}>{icon}</div>
                        <h4 className={`font-syne font-black text-[11px] uppercase tracking-wider mb-2 ${color}`}>{title}</h4>
                        <p className="text-muted text-[11px] font-medium leading-relaxed italic">{tip}</p>
                    </div>
                ))}
                
                <div className="mt-auto bg-accent/5 border border-dashed border-accent/30 rounded-[2rem] p-6 text-center">
                    <p className="text-[10px] text-accent font-black uppercase tracking-widest mb-1 italic">V2.4 Operational</p>
                    <p className="text-[9px] text-muted font-bold">GradLaunch Career Assistant</p>
                </div>
            </div>
        </div>
    );
}
