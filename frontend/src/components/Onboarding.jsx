import React, { useState } from 'react';
import { MatchBadgeLarge, LogoCircle } from './Common';

export default function Onboarding({ onComplete, currentUser }) {
    const [step, setStep] = useState(0);
    const [form, setForm] = useState({
        role: 'Software Engineer',
        experience: '0-1 yrs',
        visa: 'OPT',
        resume: null
    });
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState(null);

    const roles = ['Software Engineer', 'Data Scientist', 'Full Stack', 'Backend Engineer', 'Frontend Engineer'];
    const experiences = ['0-1 yrs', '1-3 yrs', '3-5 yrs', '5+ yrs'];
    const visas = ['OPT', 'H1B', 'Citizen/GC', 'Other'];

    const handleUpload = (e) => {
        const file = e.target.files[0];
        if (file) setForm({ ...form, resume: file });
    };

    const runAnalysis = async () => {
        setLoading(true);
        // Simulate AI Analysis for WOW moment
        setTimeout(() => {
            setResults({
                score: 82,
                topMatches: [
                    { company: 'Stripe', match: 88, logo: 'S' },
                    { company: 'Startup X', match: 81, logo: 'X' },
                    { company: 'Amazon', match: 76, logo: 'A' }
                ]
            });
            setLoading(false);
            setStep(2);
        }, 2500);
    };

    return (
        <div className="fixed inset-0 bg-background z-[100] flex items-center justify-center p-6 overflow-y-auto">
            <div className="absolute top-0 left-0 w-full h-full bg-accent/5 blur-[150px] pointer-events-none" />
            
            <div className="w-full max-w-2xl bg-surface/40 border border-border/50 backdrop-blur-3xl rounded-[3rem] p-12 shadow-2xl animate-slide-up">
                {step === 0 && (
                    <div className="space-y-10">
                        <div className="text-center">
                            <span className="text-[10px] font-black text-accent uppercase tracking-[0.3em] mb-4 block">Step 1 — Tactical Setup</span>
                            <h2 className="font-syne text-4xl font-black text-white uppercase tracking-tight">What's your target?</h2>
                        </div>

                        <div className="space-y-8">
                            <section>
                                <h4 className="text-[10px] font-black text-muted uppercase tracking-widest mb-4">Target Role</h4>
                                <div className="flex flex-wrap gap-2">
                                    {roles.map(r => (
                                        <button 
                                            key={r} 
                                            onClick={() => setForm({...form, role: r})}
                                            className={`px-6 py-3 rounded-2xl text-xs font-bold border transition-all ${form.role === r ? 'bg-accent text-black border-accent' : 'bg-white/5 text-muted border-border hover:border-muted'}`}
                                        >
                                            {r}
                                        </button>
                                    ))}
                                </div>
                            </section>

                            <div className="grid grid-cols-2 gap-8">
                                <section>
                                    <h4 className="text-[10px] font-black text-muted uppercase tracking-widest mb-4">Experience</h4>
                                    <div className="grid grid-cols-1 gap-2">
                                        {experiences.map(e => (
                                            <button 
                                                key={e} 
                                                onClick={() => setForm({...form, experience: e})}
                                                className={`px-4 py-3 rounded-xl text-xs font-bold border text-left transition-all ${form.experience === e ? 'bg-accent/10 text-accent border-accent' : 'bg-white/5 text-muted border-border'}`}
                                            >
                                                {e}
                                            </button>
                                        ))}
                                    </div>
                                </section>
                                <section>
                                    <h4 className="text-[10px] font-black text-muted uppercase tracking-widest mb-4">Visa Status</h4>
                                    <div className="grid grid-cols-1 gap-2">
                                        {visas.map(v => (
                                            <button 
                                                key={v} 
                                                onClick={() => setForm({...form, visa: v})}
                                                className={`px-4 py-3 rounded-xl text-xs font-bold border text-left transition-all ${form.visa === v ? 'bg-accent/10 text-accent border-accent' : 'bg-white/5 text-muted border-border'}`}
                                            >
                                                {v}
                                            </button>
                                        ))}
                                    </div>
                                </section>
                            </div>
                        </div>

                        <button 
                            onClick={() => setStep(1)}
                            className="w-full bg-accent py-5 rounded-2xl text-black font-syne font-black uppercase tracking-widest text-sm hover:brightness-110 transition-all active:scale-[0.98]"
                        >
                            Next: Initialize Profile
                        </button>
                    </div>
                )}

                {step === 1 && (
                    <div className="space-y-10 py-4">
                        <div className="text-center">
                            <span className="text-[10px] font-black text-accent uppercase tracking-[0.3em] mb-4 block">Step 2 — Data Ingestion</span>
                            <h2 className="font-syne text-4xl font-black text-white uppercase tracking-tight">Upload Your Core</h2>
                            <p className="text-muted mt-2 text-sm">We'll decrypt your experience and match you to top roles immediately.</p>
                        </div>

                        <div className="relative group">
                            <input 
                                type="file" 
                                accept=".pdf" 
                                onChange={handleUpload}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            />
                            <div className={`border-2 border-dashed rounded-[2.5rem] py-20 flex flex-col items-center justify-center gap-4 transition-all ${form.resume ? 'border-accent bg-accent/5' : 'border-border group-hover:border-accent/40 bg-white/5'}`}>
                                <div className="text-6xl">{form.resume ? '📄' : '📤'}</div>
                                <div className="text-center">
                                    <p className="font-bold text-white text-lg">{form.resume ? form.resume.name : 'Select Resume PDF'}</p>
                                    <p className="text-xs text-muted font-medium uppercase tracking-widest mt-1">Maximum 5MB • PDF Only</p>
                                </div>
                            </div>
                        </div>

                        <button 
                            disabled={!form.resume || loading}
                            onClick={runAnalysis}
                            className="w-full bg-accent py-5 rounded-2xl text-black font-syne font-black uppercase tracking-widest text-sm hover:brightness-110 transition-all active:scale-[0.98] disabled:opacity-50 disabled:grayscale"
                        >
                            {loading ? 'Analyzing Neural Nodes...' : 'Begin AI Matching'}
                        </button>
                    </div>
                )}

                {step === 2 && results && (
                    <div className="space-y-10 py-4 animate-fade-in">
                        <div className="text-center">
                            <div className="w-20 h-20 bg-accent rounded-3xl flex items-center justify-center text-4xl mx-auto mb-6 shadow-lg shadow-accent/20 animate-bounce-slow">✨</div>
                            <h2 className="font-syne text-4xl font-black text-white uppercase tracking-tight">Impact Visualized</h2>
                            <p className="text-muted mt-2 text-sm italic">"Your profile is a high-alpha match for these targets"</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                            <MatchBadgeLarge score={results.score} />
                            
                            <div className="space-y-4">
                                <h4 className="text-[10px] font-black text-muted uppercase tracking-widest">Initial Top Alignment</h4>
                                <div className="space-y-3">
                                    {results.topMatches.map((res, i) => (
                                        <div key={i} className="flex items-center gap-4 bg-white/5 border border-border/50 p-4 rounded-2xl hover:border-accent/30 transition-all">
                                            <LogoCircle letter={res.logo} size={40} />
                                            <div className="flex-1">
                                                <div className="text-sm font-bold text-white">{res.company}</div>
                                                <div className="text-[10px] font-black text-accent uppercase">{res.match}% Semantic Match</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <button 
                            onClick={onComplete}
                            className="w-full bg-accent py-5 rounded-2xl text-black font-syne font-black uppercase tracking-widest text-sm hover:brightness-110 transition-all active:scale-[0.98]"
                        >
                            Enter Command Center
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
