import React, { useState, useEffect, useRef } from "react";

export default function Copilot() {
    const [messages, setMessages] = useState([
        { role: "ai", text: "Hello! I'm Orion, your elite career navigator. How can I help you accelerate your US job search today? I can analyze role fit, draft high-conversion emails, or simulate interview logic." }
    ]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const scrollRef = useRef(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, loading]);

    async function sendMessage() {
        if (!input.trim() || loading) return;
        const userMsg = input.trim();
        setInput("");
        setMessages(prev => [...prev, { role: "user", text: userMsg }]);
        setLoading(true);

        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:3001"}/api/ai/match`, { // Re-using match pipeline for context-aware chat
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${localStorage.getItem("token")}` },
                body: JSON.stringify({ resume: "", jobDescription: userMsg }) // Generic query mode
            });
            const data = await res.json();
            setMessages(prev => [...prev, { 
                role: "ai", 
                text: data.analysis || "I've analyzed your request. Let me know if you want me to deep-dive into any specific part of this career strategy.", 
                jobs: data.jobs || [] 
            }]);
        } catch (e) {
            setMessages(prev => [...prev, { role: "ai", text: "Communication link offline. Please re-initialize connection." }]);
        }
        setLoading(false);
    }

    return (
        <div className="flex flex-col h-[calc(100vh-160px)] bg-surface/50 border border-border/50 rounded-[2.5rem] overflow-hidden backdrop-blur-xl transition-all">
            {/* Header */}
            <div className="px-8 py-6 border-b border-border/50 flex items-center justify-between bg-white/5">
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <div className="w-10 h-10 rounded-2xl bg-accent flex items-center justify-center text-black text-xl">🤖</div>
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-background animate-pulse" />
                    </div>
                    <div>
                        <h2 className="font-syne text-lg font-black text-white uppercase tracking-tight">Orion // Copilot</h2>
                        <p className="text-[10px] text-muted font-bold uppercase tracking-widest italic">Operational Status: Optimal</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <div className="w-2 h-2 rounded-full bg-accent/30" />
                    <div className="w-2 h-2 rounded-full bg-accent/30" />
                    <div className="w-2 h-2 rounded-full bg-accent/30" />
                </div>
            </div>

            {/* Chat Area */}
            <div 
              ref={scrollRef}
              className="flex-1 p-8 space-y-8 overflow-y-auto custom-scrollbar scroll-smooth"
            >
                {messages.map((m, i) => (
                    <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"} animate-fade-in`}>
                        <div className={`max-w-[75%] space-y-3`}>
                            <div className={`px-6 py-4 text-sm leading-relaxed ${
                                m.role === "user" 
                                ? "bg-accent text-black font-semibold rounded-[1.5rem] rounded-tr-sm shadow-[0_10px_30px_rgba(200,255,0,0.15)]" 
                                : "bg-card/60 border border-white/5 text-white/90 rounded-[1.5rem] rounded-tl-sm backdrop-blur-md"
                            }`}>
                                {m.text}
                            </div>
                            
                            {m.jobs && m.jobs.length > 0 && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                                    {m.jobs.map(job => (
                                        <div key={job.id} className="bg-surface border border-border/40 p-4 rounded-2xl flex items-center gap-4 hover:border-accent/30 transition-all cursor-pointer group">
                                            <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center font-black text-accent text-xs">
                                                {job.company.charAt(0)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-bold text-xs truncate uppercase tracking-tight">{job.title}</div>
                                                <div className="text-[10px] text-muted font-bold uppercase tracking-widest truncate">{job.company}</div>
                                            </div>
                                            <button 
                                                onClick={() => window.open(job.link, '_blank')}
                                                className="p-2 bg-white/5 group-hover:bg-accent group-hover:text-black rounded-lg transition-all"
                                            >
                                                ⇢
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
                {loading && (
                    <div className="flex justify-start animate-fade-in">
                        <div className="bg-card/40 border border-white/5 px-6 py-4 rounded-3xl text-xs text-muted font-black uppercase tracking-[0.2em] animate-pulse">
                            Processing query...
                        </div>
                    </div>
                )}
            </div>

            {/* Input Bar */}
            <div className="p-6 bg-card/40 border-t border-border/50 backdrop-blur-2xl">
                <div className="max-w-4xl mx-auto flex gap-4 relative">
                    <input
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && sendMessage()}
                        placeholder="Intercepting talent requests..."
                        className="flex-1 bg-surface/50 border border-border/60 rounded-2xl py-5 px-8 text-white placeholder:text-muted/50 text-sm outline-none focus:border-accent/40 transition-all shadow-inner"
                    />
                    <button 
                        onClick={sendMessage} 
                        disabled={loading}
                        className="bg-accent hover:brightness-110 active:scale-95 text-black px-8 rounded-2xl font-syne font-black text-sm uppercase tracking-widest transition-all disabled:opacity-50 shadow-[0_10px_30px_rgba(200,255,0,0.2)]"
                    >
                        Execute
                    </button>
                </div>
                <p className="text-center text-[10px] text-muted/30 font-black uppercase tracking-widest mt-4 italic">
                    Powered by Orion Deep Logic (2026 Edition)
                </p>
            </div>
        </div>
    );
}
