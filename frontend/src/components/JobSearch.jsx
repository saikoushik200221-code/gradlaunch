import React, { useState, useEffect, useCallback } from "react";
import JobIntelligenceCard from "./JobIntelligenceCard";
import SmartApplyModal from "./SmartApplyModal";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

function timeSince(val) {
  if (!val) return "Recently";
  const ms = typeof val === "number" ? val : new Date(val).getTime();
  const diff = (Date.now() - ms) / 1000;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return `${Math.floor(diff / 604800)}w ago`;
}

function SourceBadge({ source }) {
  const map = {
    "Lever": { color: "text-violet-400 bg-violet-500/10 border-violet-500/30", icon: "⚡" },
    "Greenhouse": { color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30", icon: "🌿" },
    "Google Jobs": { color: "text-blue-400 bg-blue-500/10 border-blue-500/30", icon: "🔵" },
    "Adzuna": { color: "text-orange-400 bg-orange-500/10 border-orange-500/30", icon: "🌐" },
  };
  const s = map[source] || { color: "text-white/40 bg-white/5 border-white/10", icon: "📋" };
  return (
    <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg border ${s.color} flex items-center gap-1`}>
      {s.icon} {source}
    </span>
  );
}

function JobCard({ job, selected, onSelect, onSave, saved }) {
  const score = job.match || job.match_score || job.genuinessScore || 72;
  const isHot = score >= 85;
  const isMed = score >= 65;
  const accent = isHot ? "#c8ff00" : isMed ? "#a855f7" : "#ec4899";
  const postedMs = job.posted_value || 0;
  const isNew = postedMs && (Date.now() - postedMs) < 86400000 * 2;

  return (
    <div
      onClick={() => onSelect(job)}
      className={`group relative cursor-pointer rounded-2xl border p-5 transition-all duration-200 hover:-translate-y-1 ${
        selected ? "border-accent/60 bg-accent/5 shadow-lg shadow-accent/10" : "border-white/8 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]"
      }`}
    >
      {isNew && (
        <div className="absolute -top-2 -right-2 bg-accent text-black text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shadow-lg shadow-accent/30">
          NEW
        </div>
      )}

      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 flex items-center justify-center text-lg font-black text-white shrink-0">
          {job.logo?.startsWith?.("http") ? (
            <img src={job.logo} alt="" className="w-6 h-6 object-contain" />
          ) : (
            job.company?.[0]?.toUpperCase() || "?"
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-white truncate leading-tight">{job.title}</h3>
          <p className="text-xs text-white/50 truncate mt-0.5">{job.company} · {job.location}</p>
        </div>
        <button
          onClick={e => { e.stopPropagation(); onSave(job); }}
          className={`shrink-0 text-base transition-transform hover:scale-110 ${saved ? "text-accent" : "text-white/20 hover:text-white/60"}`}
        >
          {saved ? "🔖" : "＋"}
        </button>
      </div>

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <SourceBadge source={job.source} />
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-white/30">{timeSince(job.posted_value || job.postedValue)}</span>
          <div
            className="text-[10px] font-black px-2 py-0.5 rounded-lg"
            style={{ color: accent, background: `${accent}15`, border: `1px solid ${accent}30` }}
          >
            {Math.round(score)}% MATCH
          </div>
        </div>
      </div>

      {job.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3">
          {job.tags.slice(0, 3).map((t, i) => (
            <span key={i} className="text-[9px] text-white/40 bg-white/5 border border-white/8 px-2 py-0.5 rounded-full capitalize">
              {t}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function JobSearch({ onAddToTracker, onToggleSave, savedJobs = [], profileText, currentUser }) {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [selectedJob, setSelectedJob] = useState(null);
  const [deepAnalysis, setDeepAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [tailoring, setTailoring] = useState(false);
  const [tailoredResume, setTailoredResume] = useState(null);
  const [changesMade, setChangesMade] = useState([]);
  const [showSmartApply, setShowSmartApply] = useState(false);
  const [stage, setStage] = useState("ready");
  const [modalError, setModalError] = useState(null);
  const [streamState, setStreamState] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [postedDays, setPostedDays] = useState(0);
  const [view, setView] = useState("grid");
  const [totalJobs, setTotalJobs] = useState(0);

  const isSaved = id => savedJobs?.some(s => s.id === id);
  const token = localStorage.getItem("token");

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search) params.set("q", search);
      if (activeFilter === "newgrad") params.set("newGrad", "true");
      if (activeFilter === "remote") params.set("remote", "true");
      if (activeFilter === "h1b") params.set("h1b_sponsor", "true");
      if (postedDays > 0) params.set("postedWithinDays", postedDays);
      params.set("limit", "100");

      const res = await fetch(`${API}/api/jobs?${params}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data = await res.json();
      const arr = Array.isArray(data) ? data : (data.jobs || []);
      // Sort by freshness
      arr.sort((a, b) => (b.posted_value || 0) - (a.posted_value || 0));
      setJobs(arr);
      setTotalJobs(arr.length);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  }, [search, activeFilter, postedDays]);

  useEffect(() => {
    const t = setTimeout(fetchJobs, 300);
    return () => clearTimeout(t);
  }, [fetchJobs]);

  useEffect(() => {
    setDeepAnalysis(null);
    setTailoredResume(null);
    setChangesMade([]);
    setStreamState(null);
  }, [selectedJob?.id]);

  async function handleSync() {
    setSyncing(true);
    setSyncMsg("Connecting to job boards...");
    try {
      const res = await fetch(`${API}/api/jobs/scrape`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setSyncMsg("✅ Sync complete! Refreshing...");
        setTimeout(() => { fetchJobs(); setSyncMsg(""); }, 1500);
      } else {
        setSyncMsg("⚠️ Sync failed");
        setTimeout(() => setSyncMsg(""), 2000);
      }
    } catch {
      setSyncMsg("❌ Connection error");
      setTimeout(() => setSyncMsg(""), 2000);
    }
    setSyncing(false);
  }

  async function analyzeFitDeep() {
    if (!selectedJob) return;
    setAnalyzing(true);
    setStage("analyzing");
    setShowSmartApply(true);
    setModalError(null);
    setStreamState({ state: "INIT", message: "Connecting to agent orchestrator..." });
    try {
      const qs = new URLSearchParams({
        title: selectedJob.title || "",
        company: selectedJob.company || "",
        id: selectedJob.id || "",
        link: selectedJob.link || "",
        description: selectedJob.description || ""
      });
      const res = await fetch(`${API}/api/ai/analyze-stream?${qs}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error(`Analysis failed: ${res.status}`);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "", done = false;
      while (!done) {
        const { value, done: d } = await reader.read();
        done = d;
        if (value) {
          buf += decoder.decode(value, { stream: true });
          const lines = buf.split("\n");
          buf = lines.pop();
          let ev = null;
          for (const line of lines) {
            if (line.startsWith("event: ")) ev = line.slice(7).trim();
            else if (line.startsWith("data: ")) {
              try {
                const p = JSON.parse(line.slice(6));
                if (ev === "step") { setStreamState(p); if (p.state === "READY") setDeepAnalysis(p.data); }
                else if (ev === "done") { setAnalyzing(false); setStage("tailoring"); setTimeout(handleTailor, 100); }
                else if (ev === "error") throw new Error(p.error);
              } catch {}
            }
          }
        }
      }
    } catch (e) {
      setModalError(e.message);
      setStage("failed");
      setAnalyzing(false);
    }
  }

  async function handleTailor() {
    if (!selectedJob) return;
    setTailoring(true);
    setStage("tailoring");
    setModalError(null);
    try {
      const res = await fetch(`${API}/api/ai/tailor-resume`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ jobId: selectedJob.id, resumeText: profileText || "New Grad Software Engineer" })
      });
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      const data = await res.json();
      setTailoredResume(data.tailoredResume);
      setChangesMade(data.changesMade || []);
      setStage("ready");
    } catch (e) {
      setModalError(e.message);
      setStage("failed");
    }
    setTailoring(false);
  }

  async function handleFinalDispatch() {
    setStage("dispatching");
    try {
      const res = await fetch(`${API}/api/jobs/dispatch`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ jobId: selectedJob.id, tier: 1, resumeId: "master" })
      });
      if (res.ok) {
        const result = await res.json();
        onAddToTracker?.({ ...selectedJob, stage: result.status === "submitted" ? "Submitted" : "Pending" });
        setShowSmartApply(false);
        setSelectedJob(null);
        setStage("ready");
      }
    } catch (e) {
      setModalError(e.message);
      setStage("failed");
    }
  }

  const FILTERS = [
    { id: "all", label: "All Roles", icon: "🌐" },
    { id: "newgrad", label: "New Grad", icon: "🎓" },
    { id: "remote", label: "Remote", icon: "🏡" },
    { id: "h1b", label: "H1B Friendly", icon: "🛂" },
  ];

  const newJobCount = jobs.filter(j => j.posted_value && (Date.now() - j.posted_value) < 86400000 * 2).length;

  return (
    <div className="flex h-full bg-background font-inter text-white overflow-hidden">
      {/* LEFT PANEL — Job List */}
      <div className="flex flex-col w-full max-w-[520px] border-r border-white/8 overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-white/8 bg-black/20 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-black text-white tracking-tight">Job Discovery</h1>
              <p className="text-[11px] text-white/40 mt-0.5">
                {loading ? "Scanning..." : `${totalJobs} roles · `}
                {newJobCount > 0 && <span className="text-accent font-bold">{newJobCount} new today</span>}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleSync}
                disabled={syncing}
                className="flex items-center gap-2 bg-accent/10 hover:bg-accent/20 border border-accent/30 text-accent text-[10px] font-black uppercase tracking-wider px-3 py-2 rounded-xl transition-all disabled:opacity-50"
              >
                <span className={syncing ? "animate-spin" : ""}>📡</span>
                {syncing ? "Syncing" : "Sync"}
              </button>
              <button
                onClick={fetchJobs}
                className="bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 p-2 rounded-xl transition-all text-sm"
              >
                🔄
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="relative mb-3">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-sm">🔍</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search jobs, companies, skills..."
              className="w-full bg-white/5 border border-white/10 focus:border-accent/40 rounded-xl py-2.5 pl-9 pr-4 text-sm text-white placeholder-white/30 outline-none transition-all"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white text-xs">✕</button>
            )}
          </div>

          {/* Filter chips */}
          <div className="flex gap-2 flex-wrap">
            {FILTERS.map(f => (
              <button
                key={f.id}
                onClick={() => setActiveFilter(f.id)}
                className={`text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg border transition-all ${
                  activeFilter === f.id
                    ? "bg-accent/15 border-accent/50 text-accent"
                    : "bg-white/3 border-white/8 text-white/40 hover:text-white/70 hover:border-white/20"
                }`}
              >
                {f.icon} {f.label}
              </button>
            ))}
          </div>

          {/* Recency */}
          <div className="flex items-center gap-2 mt-3">
            <span className="text-[10px] text-white/30 uppercase tracking-widest">Posted</span>
            {[[0,"Any"],[1,"24h"],[7,"7d"],[30,"30d"]].map(([d, l]) => (
              <button
                key={d}
                onClick={() => setPostedDays(d)}
                className={`text-[10px] font-black px-2.5 py-1 rounded-lg border transition-all ${
                  postedDays === d ? "bg-accent/15 border-accent/40 text-accent" : "bg-white/3 border-white/8 text-white/40 hover:text-white/60"
                }`}
              >
                {l}
              </button>
            ))}
          </div>

          {syncMsg && (
            <div className="mt-3 text-[11px] text-accent bg-accent/10 border border-accent/20 rounded-lg px-3 py-1.5 text-center font-bold">
              {syncMsg}
            </div>
          )}
        </div>

        {/* Job List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-28 rounded-2xl bg-white/5 border border-white/8 animate-pulse" />
            ))
          ) : error ? (
            <div className="text-center py-16">
              <div className="text-4xl mb-3">⚠️</div>
              <p className="text-sm text-white/50 mb-4">{error}</p>
              <button onClick={fetchJobs} className="text-xs bg-accent/10 border border-accent/30 text-accent px-4 py-2 rounded-xl font-bold">
                Retry
              </button>
            </div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-5xl mb-4">🔭</div>
              <p className="text-sm text-white/50 mb-2">No jobs found</p>
              <p className="text-xs text-white/30">Try syncing or changing filters</p>
              <button onClick={handleSync} className="mt-4 text-xs bg-accent/10 border border-accent/30 text-accent px-4 py-2 rounded-xl font-bold">
                📡 Sync Now
              </button>
            </div>
          ) : (
            jobs.map(job => (
              <JobCard
                key={job.id}
                job={job}
                selected={selectedJob?.id === job.id}
                onSelect={setSelectedJob}
                onSave={onToggleSave}
                saved={isSaved(job.id)}
              />
            ))
          )}
        </div>
      </div>

      {/* RIGHT PANEL — Detail View */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {!selectedJob ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-10">
            <div className="w-24 h-24 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center text-4xl mb-6">
              🎯
            </div>
            <h2 className="text-xl font-black text-white mb-2">Select a Role</h2>
            <p className="text-sm text-white/40 max-w-xs">
              Pick any job from the list to see AI match analysis, tailoring options, and apply tools.
            </p>
            <div className="mt-8 grid grid-cols-3 gap-4 max-w-sm w-full">
              {[["🧠","Deep AI Analysis"],["📝","Resume Tailoring"],["🚀","Smart Apply"]].map(([icon, label]) => (
                <div key={label} className="bg-white/3 border border-white/8 rounded-xl p-3 text-center">
                  <div className="text-2xl mb-1">{icon}</div>
                  <p className="text-[10px] text-white/40 font-bold uppercase tracking-wide">{label}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {/* Job Detail Header */}
            <div className="sticky top-0 bg-background/90 backdrop-blur-xl border-b border-white/8 p-6 z-10">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 flex items-center justify-center text-2xl font-black text-white">
                    {selectedJob.logo?.startsWith?.("http") ? (
                      <img src={selectedJob.logo} alt="" className="w-8 h-8 object-contain" />
                    ) : selectedJob.company?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-white leading-tight">{selectedJob.title}</h2>
                    <p className="text-sm text-white/50">{selectedJob.company} · {selectedJob.location}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <SourceBadge source={selectedJob.source} />
                      <span className="text-[10px] text-white/30">{timeSince(selectedJob.posted_value)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onToggleSave?.(selectedJob)}
                    className={`text-sm px-3 py-1.5 rounded-xl border transition-all font-bold ${isSaved(selectedJob.id) ? "bg-accent/15 border-accent/40 text-accent" : "bg-white/5 border-white/10 text-white/50 hover:text-white"}`}
                  >
                    {isSaved(selectedJob.id) ? "🔖 Saved" : "＋ Save"}
                  </button>
                  <button onClick={() => setSelectedJob(null)} className="bg-white/5 hover:bg-white/10 border border-white/10 text-white/50 p-2 rounded-xl text-sm transition-all">
                    ✕
                  </button>
                </div>
              </div>

              {/* Match Score Bar */}
              <div className="mt-4 bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">AI Match Score</span>
                  <span className="text-2xl font-black text-accent">{Math.round(selectedJob.match || selectedJob.match_score || 72)}%</span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-accent to-purple-500 rounded-full transition-all duration-700"
                    style={{ width: `${selectedJob.match || selectedJob.match_score || 72}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="p-6 space-y-5">
              {/* CTA Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={analyzeFitDeep}
                  disabled={analyzing}
                  className="bg-accent hover:brightness-110 disabled:opacity-60 text-black font-black text-sm py-3.5 rounded-2xl transition-all shadow-lg shadow-accent/20 flex items-center justify-center gap-2"
                >
                  {analyzing ? (
                    <><span className="animate-spin">⚙️</span> Analyzing...</>
                  ) : (
                    <><span>🧠</span> Deep Analysis</>
                  )}
                </button>
                <a
                  href={selectedJob.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-white/10 hover:bg-white/15 border border-white/15 text-white font-black text-sm py-3.5 rounded-2xl transition-all flex items-center justify-center gap-2"
                >
                  <span>🔗</span> Apply Now
                </a>
              </div>

              {/* Intelligence Card */}
              {deepAnalysis ? (
                <JobIntelligenceCard
                  analysis={deepAnalysis}
                  onTailor={handleTailor}
                  onApply={() => setShowSmartApply(true)}
                  loadingTailor={tailoring}
                  onStartAutoFix={() => { setStage("fixing"); setShowSmartApply(true); }}
                />
              ) : (
                streamState && (
                  <div className="bg-accent/5 border border-accent/20 rounded-2xl p-5">
                    <div className="flex items-center gap-3">
                      <span className="text-xl animate-spin">⚙️</span>
                      <div>
                        <p className="text-xs font-black text-accent uppercase tracking-widest">{streamState.state}</p>
                        <p className="text-sm text-white/60 mt-0.5">{streamState.message}</p>
                      </div>
                    </div>
                  </div>
                )
              )}

              {/* Job Description */}
              {selectedJob.description && (
                <div className="bg-white/3 border border-white/8 rounded-2xl p-5">
                  <h3 className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-3">Role Overview</h3>
                  <p className="text-sm text-white/60 leading-relaxed whitespace-pre-wrap line-clamp-12">
                    {selectedJob.description.slice(0, 800)}{selectedJob.description.length > 800 ? "..." : ""}
                  </p>
                </div>
              )}

              {/* Skills Tags */}
              {selectedJob.skills?.length > 0 && (
                <div className="bg-white/3 border border-white/8 rounded-2xl p-5">
                  <h3 className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-3">Required Skills</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedJob.skills.map((s, i) => (
                      <span key={i} className="text-[11px] font-bold text-accent bg-accent/10 border border-accent/20 px-3 py-1 rounded-lg">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Salary */}
              {selectedJob.salary && selectedJob.salary !== "Competitive" && (
                <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-5 flex items-center gap-3">
                  <span className="text-2xl">💰</span>
                  <div>
                    <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Salary</p>
                    <p className="text-sm font-bold text-white">{selectedJob.salary}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {showSmartApply && selectedJob && (
        <SmartApplyModal
          job={selectedJob}
          analysis={deepAnalysis}
          tailoredResume={tailoredResume}
          changesMade={changesMade}
          stage={stage}
          error={modalError}
          streamState={streamState}
          onClose={() => { setShowSmartApply(false); setStage("ready"); }}
          onTailor={handleTailor}
          onDispatch={handleFinalDispatch}
          onAddToTracker={onAddToTracker}
        />
      )}
    </div>
  );
}
