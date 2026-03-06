import React from 'react';
import { LOGO_COLORS } from '../theme';

export function TagBadge({ label, C }) {
    const colors = {
        "New Grad": { bg: C.bg === "#04060A" ? "#0D2A1F" : "#DCFCE7", color: C.bg === "#04060A" ? "#00E599" : "#166534", border: C.bg === "#04060A" ? "#00E59933" : "#86EFAC" },
        "H1B Sponsor": { bg: C.bg === "#04060A" ? "#1A1A2E" : "#F5F3FF", color: C.bg === "#04060A" ? "#A78BFA" : "#5B21B6", border: C.bg === "#04060A" ? "#A78BFA33" : "#C4B5FD" },
        "OPT Friendly": { bg: C.bg === "#04060A" ? "#1A2A0D" : "#F0FDF4", color: C.bg === "#04060A" ? "#7CDB8E" : "#166534", border: C.bg === "#04060A" ? "#7CDB8E33" : "#BBF7D0" },
        "International Friendly": { bg: C.bg === "#04060A" ? "#1A2030" : "#F0F9FF", color: C.bg === "#04060A" ? "#00D4FF" : "#075985", border: C.bg === "#04060A" ? "#00D4FF33" : "#BAE6FD" },
        "Remote Friendly": { bg: C.bg === "#04060A" ? "#0D1A2A" : "#F0F9FF", color: C.bg === "#04060A" ? "#60B8E0" : "#075985", border: C.bg === "#04060A" ? "#60B8E033" : "#BAE6FD" },
        "Fresher Friendly": { bg: C.bg === "#04060A" ? "#2A1A0D" : "#FFFBEB", color: C.bg === "#04060A" ? "#FFD700" : "#92400E", border: C.bg === "#04060A" ? "#FFD70033" : "#FDE68A" },
        "Remote": { bg: C.bg === "#04060A" ? "#0D1A2A" : "#F0F9FF", color: C.bg === "#04060A" ? "#60B8E0" : "#075985", border: C.bg === "#04060A" ? "#60B8E033" : "#BAE6FD" },
        "Security Clearance OK": { bg: C.bg === "#04060A" ? "#1A0D0D" : "#FFF1F2", color: C.bg === "#04060A" ? "#FF9966" : "#9F1239", border: C.bg === "#04060A" ? "#FF996633" : "#FECDD3" },
    };
    const c = colors[label] || { bg: C.tag, color: C.accent, border: C.accentGlow };
    return (
        <span className="premium-tag" style={{
            background: c.bg,
            color: c.color,
            border: `1px solid ${c.border}`,
            padding: "4px 10px",
            borderRadius: "8px",
            fontSize: "11px",
            fontWeight: "600",
            fontFamily: "'DM Sans', sans-serif",
            letterSpacing: "0.2px",
            backdropFilter: "blur(4px)",
            boxShadow: `0 2px 4px rgba(0,0,0,0.1)`,
            transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
            cursor: "default",
            display: "inline-flex",
            alignItems: "center"
        }}>
            {label}
            <style>{`
                .premium-tag:hover { transform: translateY(-1px); filter: brightness(1.1); box-shadow: 0 4px 8px rgba(0,0,0,0.15); }
            `}</style>
        </span>
    );
}

export function LogoCircle({ letter, size = 40 }) {
    const bg = LOGO_COLORS[letter] || "#334155";
    return (
        <div className="logo-pulse" style={{
            width: size,
            height: size,
            borderRadius: size * 0.25,
            background: bg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "'Syne', sans-serif",
            fontWeight: 800,
            fontSize: size * 0.38,
            color: "#fff",
            flexShrink: 0,
            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            cursor: "pointer"
        }}>
            {letter}
            <style>{`
                .logo-pulse:hover { transform: scale(1.05) rotate(-3deg); filter: brightness(1.2); box-shadow: 0 8px 16px rgba(0,0,0,0.2); }
            `}</style>
        </div>
    );
}

export function MatchRing({ score, C }) {
    const color = score >= 90 ? C.green : score >= 75 ? C.accent : C.yellow;
    return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
            <div style={{ width: 48, height: 48, borderRadius: "50%", background: `conic-gradient(${color} ${score * 3.6}deg, ${C.border} 0deg)`, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: C.card, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color, fontFamily: "'Syne', sans-serif" }}>
                    {score}%
                </div>
            </div>
            <span style={{ fontSize: 10, color: C.muted, fontFamily: "'DM Sans', sans-serif" }}>Match</span>
        </div>
    );
}

export function SkeletonCard({ C }) {
    return (
        <div style={{
            background: C.card,
            padding: "16px",
            borderRadius: "16px",
            border: `1px solid ${C.border}`,
            display: "flex",
            gap: "12px",
            animation: "pulse 1.5s infinite ease-in-out"
        }}>
            <div style={{ width: 42, height: 42, background: C.surface, borderRadius: "10px" }} />
            <div style={{ flex: 1 }}>
                <div style={{ height: "18px", background: C.surface, borderRadius: "4px", width: "70%", marginBottom: "8px" }} />
                <div style={{ height: "14px", background: C.surface, borderRadius: "4px", width: "40%", marginBottom: "12px" }} />
                <div style={{ display: "flex", gap: "6px" }}>
                    <div style={{ height: "20px", background: C.surface, borderRadius: "6px", width: "60px" }} />
                    <div style={{ height: "20px", background: C.surface, borderRadius: "6px", width: "60px" }} />
                </div>
            </div>
            <style>{`
                @keyframes pulse {
                    0% { opacity: 0.6; }
                    50% { opacity: 0.3; }
                    100% { opacity: 0.6; }
                }
            `}</style>
        </div>
    );
}

export function EmptyState({ icon, title, description, C }) {
    return (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px", textAlign: "center" }}>
            <div style={{ fontSize: "56px", marginBottom: "20px" }}>{icon}</div>
            <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: "20px", fontWeight: "700", margin: "0 0 12px 0", color: C.text }}>{title}</h3>
            <p style={{ color: C.muted, maxWidth: "300px", fontSize: "14px", lineHeight: "1.6" }}>{description}</p>
        </div>
    );
}

export function Toast({ message, type = "success", onClose, C }) {
    const color = type === "success" ? C.green : C.red;
    return (
        <div style={{
            position: "fixed",
            bottom: "32px",
            right: "32px",
            background: C.surface,
            border: `1px solid ${color}44`,
            borderLeft: `4px solid ${color}`,
            borderRadius: "12px",
            padding: "16px 24px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            zIndex: 10000,
            animation: "slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
        }}>
            <span style={{ fontSize: "18px" }}>{type === "success" ? "✓" : "✕"}</span>
            <div style={{ color: C.text, fontSize: "14px", fontWeight: "600" }}>{message}</div>
            <button onClick={onClose} style={{ background: "transparent", border: "none", color: C.muted, cursor: "pointer", marginLeft: "12px", fontSize: "18px" }}>×</button>
            <style>{`
                @keyframes slideUp {
                    from { transform: translateY(20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
            `}</style>
        </div>
    );
}
