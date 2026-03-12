import React, { useState, useEffect } from "react";

export default function Copilot({ C }) {
    const [messages, setMessages] = useState([
        { role: "ai", text: "Hello! I'm Orion. How can I help you in your job search today? I can analyze roles, draft outreach emails, or practice interview questions." }
    ]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);

    async function sendMessage() {
        if (!input.trim() || loading) return;
        const userMsg = input.trim();
        setInput("");
        setMessages(prev => [...prev, { role: "user", text: userMsg }]);
        setLoading(true);

        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:3001"}/api/anthropic/messages`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    model: "claude-sonnet-4-20250514",
                    max_tokens: 1000,
                    messages: [{ role: "user", content: userMsg }]
                })
            });
            const data = await res.json();
            const aiText = data.content?.[0]?.text || "I'm having trouble connecting right now.";
            setMessages(prev => [...prev, { role: "ai", text: aiText }]);
        } catch (e) {
            setMessages(prev => [...prev, { role: "ai", text: "Connection error. Please try again." }]);
        }
        setLoading(false);
    }

    return (
        <div style={{ height: "calc(100vh - 140px)", display: "flex", flexDirection: "column", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 24, overflow: "hidden" }}>
            <div style={{ padding: "20px 32px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 12, height: 12, borderRadius: "50%", background: C.green, boxShadow: `0 0 10px ${C.green}44` }} />
                <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 800, margin: 0 }}>Orion Copilot</h2>
            </div>

            <div style={{ flex: 1, padding: 32, overflowY: "auto", display: "flex", flexDirection: "column", gap: 20 }}>
                {messages.map((m, i) => (
                    <div key={i} style={{ alignSelf: m.role === "user" ? "flex-end" : "flex-start", maxWidth: "80%" }}>
                        <div style={{
                            background: m.role === "user" ? C.accent : C.card,
                            color: m.role === "user" ? "#000" : C.text,
                            padding: "16px 20px",
                            borderRadius: m.role === "user" ? "20px 20px 4px 20px" : "20px 20px 20px 4px",
                            boxShadow: m.role === "user" ? `0 4px 15px ${C.accent}33` : "none",
                            fontSize: 15,
                            lineHeight: 1.6
                        }}>
                            {m.text}
                        </div>
                    </div>
                ))}
                {loading && (
                    <div style={{ alignSelf: "flex-start", background: C.card, padding: "12px 20px", borderRadius: "20px 20px 20px 4px", color: C.muted, fontSize: 14 }}>
                        Orion is thinking...
                    </div>
                )}
            </div>

            <div style={{ padding: 24, background: C.card, borderTop: `1px solid ${C.border}`, display: "flex", gap: 12 }}>
                <input
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && sendMessage()}
                    placeholder="Ask Orion anything..."
                    style={{ flex: 1, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "14px 20px", color: C.text, fontFamily: "'DM Sans', sans-serif", outline: "none" }}
                />
                <button onClick={sendMessage} style={{ background: C.accent, border: "none", width: 48, height: 48, borderRadius: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
                    🚀
                </button>
            </div>
        </div>
    );
}
