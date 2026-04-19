import React, { useState, useEffect } from 'react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const getToken = () => localStorage.getItem('token');

export default function ResumeVersionManager({ onSelect }) {
    const [versions, setVersions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [comparing, setComparing] = useState(null); // version id to compare with default
    const [showSaveDialog, setShowSaveDialog] = useState(false);
    const [newVersionName, setNewVersionName] = useState('');

    useEffect(() => {
        fetchVersions();
    }, []);

    async function fetchVersions() {
        setLoading(true);
        try {
            const res = await fetch(`${API}/api/resume-versions`, {
                headers: { 'Authorization': `Bearer ${getToken()}` }
            });
            if (res.ok) {
                const data = await res.json();
                setVersions(Array.isArray(data) ? data : []);
            }
        } catch (e) { console.error('Failed to fetch versions', e); }
        setLoading(false);
    }

    async function setAsDefault(id) {
        try {
            await fetch(`${API}/api/resume-versions/${id}/default`, {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${getToken()}` }
            });
            setVersions(prev => prev.map(v => ({ ...v, is_default: v.id === id ? 1 : 0 })));
        } catch (e) { /* silent */ }
    }

    async function saveNewVersion(content) {
        if (!newVersionName.trim()) return;
        try {
            const res = await fetch(`${API}/api/resume-versions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
                body: JSON.stringify({ version_name: newVersionName, content: content || '' })
            });
            if (res.ok) {
                setShowSaveDialog(false);
                setNewVersionName('');
                fetchVersions();
            }
        } catch (e) { /* silent */ }
    }

    const defaultVersion = versions.find(v => v.is_default);
    const comparingVersion = versions.find(v => v.id === comparing);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center px-2">
                <h4 className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] flex items-center gap-2">
                    <span className="text-lg">📂</span>
                    Resume Repository
                </h4>
                <div className="flex items-center gap-3">
                    <div className="text-[9px] font-bold text-accent uppercase tracking-widest">{versions.length} VERSIONS</div>
                    <button
                        onClick={() => setShowSaveDialog(!showSaveDialog)}
                        className="px-3 py-1.5 bg-accent/10 border border-accent/20 rounded-lg text-[9px] font-black text-accent uppercase tracking-widest hover:bg-accent/20 transition-all"
                    >
                        + New
                    </button>
                </div>
            </div>

            {/* Save dialog */}
            {showSaveDialog && (
                <div className="bg-accent/5 border border-accent/20 rounded-2xl p-4 space-y-3 animate-fade-in">
                    <input
                        value={newVersionName}
                        onChange={e => setNewVersionName(e.target.value)}
                        placeholder="e.g., Google SWE, Stripe Backend..."
                        className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-accent/30 transition-all placeholder:text-white/20"
                    />
                    <div className="flex gap-2">
                        <button
                            onClick={() => saveNewVersion('')}
                            disabled={!newVersionName.trim()}
                            className="flex-1 bg-accent text-black py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest disabled:opacity-30 hover:brightness-110 transition-all"
                        >
                            Save Version
                        </button>
                        <button
                            onClick={() => { setShowSaveDialog(false); setNewVersionName(''); }}
                            className="px-4 bg-white/5 border border-white/10 text-white/50 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-white/10 transition-all"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Diff view */}
            {comparing && comparingVersion && defaultVersion && (
                <div className="bg-black/30 border border-white/10 rounded-2xl p-5 space-y-4 animate-fade-in">
                    <div className="flex justify-between items-center">
                        <span className="text-[9px] font-black text-white uppercase tracking-widest">Comparing Versions</span>
                        <button onClick={() => setComparing(null)} className="text-xs text-muted hover:text-white">✕ Close</button>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <span className="text-[8px] font-black text-accent uppercase tracking-widest">
                                ★ {defaultVersion.version_name} (Default)
                            </span>
                            <div className="bg-accent/5 border border-accent/10 rounded-xl p-3 text-[10px] text-white/60 leading-relaxed italic max-h-[200px] overflow-y-auto custom-scrollbar whitespace-pre-wrap">
                                {defaultVersion.content || 'No content'}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <span className="text-[8px] font-black text-purple uppercase tracking-widest">
                                {comparingVersion.version_name}
                            </span>
                            <div className="bg-purple/5 border border-purple/10 rounded-xl p-3 text-[10px] text-white/60 leading-relaxed italic max-h-[200px] overflow-y-auto custom-scrollbar whitespace-pre-wrap">
                                {comparingVersion.content || 'No content'}
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Version list */}
            <div className="grid gap-3">
                {loading ? [1, 2].map(i => (
                    <div key={i} className="h-16 bg-white/5 animate-pulse rounded-2xl border border-white/5" />
                )) : versions.map(v => (
                    <div 
                        key={v.id}
                        className={`bg-white/[0.03] border ${v.is_default ? 'border-accent/30 bg-accent/[0.03]' : 'border-white/10'} p-5 rounded-2xl flex items-center justify-between group hover:bg-white/[0.08] transition-all`}
                    >
                        <div className="flex items-center gap-4 flex-1 min-w-0 cursor-pointer" onClick={() => onSelect?.(v)}>
                            <div className={`w-10 h-10 ${v.is_default ? 'bg-accent/20' : 'bg-white/5'} rounded-xl flex items-center justify-center text-lg font-syne font-black transition-all`}>
                                {v.is_default ? '★' : v.job_id ? '🪄' : '📄'}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <h5 className="text-xs font-black text-white uppercase tracking-tight truncate max-w-[180px]">{v.version_name}</h5>
                                    {v.is_default && (
                                        <span className="text-[7px] font-black text-accent bg-accent/10 px-1.5 py-0.5 rounded border border-accent/20 uppercase tracking-widest">Default</span>
                                    )}
                                    {v.ats_score && (
                                        <span className="text-[7px] font-black text-purple bg-purple/10 px-1.5 py-0.5 rounded border border-purple/20">ATS {v.ats_score}</span>
                                    )}
                                </div>
                                <p className="text-[10px] text-muted font-medium italic">{new Date(v.created_at).toLocaleDateString()}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            {defaultVersion && v.id !== defaultVersion.id && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); setComparing(v.id); }}
                                    className="px-2 py-1 text-[8px] font-bold text-purple uppercase tracking-widest bg-purple/10 border border-purple/20 rounded hover:bg-purple/20 transition-all"
                                >
                                    Diff
                                </button>
                            )}
                            {!v.is_default && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); setAsDefault(v.id); }}
                                    className="px-2 py-1 text-[8px] font-bold text-accent uppercase tracking-widest bg-accent/10 border border-accent/20 rounded hover:bg-accent/20 transition-all"
                                >
                                    Set Default
                                </button>
                            )}
                            <div className="text-accent text-[10px] font-black uppercase tracking-widest cursor-pointer" onClick={() => onSelect?.(v)}>Select →</div>
                        </div>
                    </div>
                ))}
            </div>

            {versions.length === 0 && !loading && (
                <div className="text-center py-8 opacity-50">
                    <div className="text-3xl mb-3">📂</div>
                    <p className="text-xs font-bold text-muted uppercase tracking-widest">No saved versions yet</p>
                    <p className="text-[10px] text-muted/60 mt-1 italic">Tailored resumes will appear here</p>
                </div>
            )}
        </div>
    );
}
