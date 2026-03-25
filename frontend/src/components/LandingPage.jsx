import React, { useState } from "react";

export default function LandingPage({ onShowLogin }) {
    const [hoveredFeature, setHoveredFeature] = useState(null);

    const metrics = [
        { value: "10K+", label: "Jobs Analyzed Daily", icon: "🔍" },
        { value: "100%", label: "OPT Compliant", icon: "🛡️" },
        { value: "AI", label: "Powered Matching", icon: "🧠" },
    ];

    const features = [
        {
            num: 1,
            title: "AI-Powered Job Discovery",
            desc: "Stop scrolling endlessly. Our engine aggregates jobs from 8+ sources, filters for OPT/H-1B friendly roles, and ranks them by your real match score.",
            icon: "🔍",
        },
        {
            num: 2,
            title: "Resume Optimizer",
            desc: "Paste any job description and get AI-tailored bullet points that pass ATS filters. Every application gets a fresh, optimized resume.",
            icon: "🪄",
        },
        {
            num: 3,
            title: "Orion AI Copilot",
            desc: "Your personal career strategist. Get cover letter drafts, interview prep, salary negotiation tips, and role-fit analysis — all in one chat.",
            icon: "🤖",
        },
        {
            num: 4,
            title: "Application Pipeline",
            desc: "Track every application from Wishlist to Offer. See your velocity metrics, interview conversion rates, and get daily tactical action plans.",
            icon: "📋",
        },
    ];

    const compliancePoints = [
        "H-1B filings",
        "Visa extensions",
        "Green card processing",
        "Background checks",
        "Employer audits",
    ];

    return (
        <div className="min-h-screen bg-[#f4f7fc] text-gray-900 font-inter overflow-x-hidden">
            {/* ─── NAVIGATION ──────────────────────────────────────────── */}
            <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-200/60">
                <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-[#0f1117] rounded-xl flex items-center justify-center text-[#c8ff00] text-lg font-black">🚀</div>
                        <span className="font-syne font-black text-xl tracking-tight text-gray-900">GradLaunch</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <a href="#features" className="hidden md:inline text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors px-4 py-2">Features</a>
                        <a href="#compliance" className="hidden md:inline text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors px-4 py-2">Why GradLaunch</a>
                        <button
                            onClick={onShowLogin}
                            className="bg-[#0f1117] hover:bg-[#1a1b23] text-white px-6 py-2.5 rounded-full text-sm font-bold transition-all hover:shadow-lg hover:shadow-black/10 active:scale-95"
                        >
                            Get Started
                        </button>
                    </div>
                </div>
            </nav>

            {/* ─── HERO SECTION ────────────────────────────────────────── */}
            <section className="relative pt-20 pb-16 px-6 overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-blue-500/5 rounded-full blur-[120px] pointer-events-none" />
                <div className="max-w-4xl mx-auto text-center relative z-10">
                    <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-700 px-4 py-1.5 rounded-full text-xs font-bold mb-8 tracking-wide uppercase">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                        </span>
                        AI Career Engine for International Students
                    </div>

                    <h1 className="font-syne text-5xl md:text-7xl font-black text-gray-900 leading-[1.1] mb-6">
                        Land Your{" "}
                        <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                            Dream Job
                        </span>
                        <br />
                        Before OPT
                        <span className="text-sm align-super font-bold text-gray-400 ml-1">(STEM-OPT, H-1B)</span>
                        {" "}Expires
                    </h1>

                    <p className="text-lg md:text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed mb-10 font-medium">
                        OPT expiring soon? GradLaunch focuses exclusively on full-time, F-1/OPT compliant roles.
                        Our AI matches your profile to 10,000+ jobs daily and optimizes every resume for ATS filters.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
                        <button
                            onClick={onShowLogin}
                            className="bg-[#0f1117] hover:bg-[#1a1b23] text-white px-10 py-4 rounded-full text-sm font-bold transition-all hover:shadow-xl hover:shadow-black/15 active:scale-95 flex items-center justify-center gap-2"
                        >
                            Get Started Free <span className="text-lg">→</span>
                        </button>
                        <a
                            href="#features"
                            className="bg-white hover:bg-gray-50 text-gray-700 px-10 py-4 rounded-full text-sm font-bold border border-gray-200 transition-all hover:shadow-lg flex items-center justify-center gap-2"
                        >
                            See How It Works
                        </a>
                    </div>

                    {/* ─── METRICS ─────────────────────────────── */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-2xl mx-auto">
                        {metrics.map((m, i) => (
                            <div
                                key={i}
                                className="bg-white border border-gray-200 rounded-2xl p-6 text-center hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
                            >
                                <div className="text-3xl mb-2">{m.icon}</div>
                                <div className="text-3xl font-black font-syne text-blue-600 mb-1">{m.value}</div>
                                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{m.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ─── FEATURES SECTION ────────────────────────────────────── */}
            <section id="features" className="py-20 px-6">
                <div className="max-w-5xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="font-syne text-4xl md:text-5xl font-black text-gray-900 mb-4">
                            What{" "}
                            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                                GradLaunch
                            </span>
                            {" "}Does
                        </h2>
                        <p className="text-gray-500 text-lg font-medium max-w-lg mx-auto">
                            Everything you need to land a legitimate, full-time role — powered by AI.
                        </p>
                    </div>

                    <div className="grid gap-6">
                        {features.map((f) => (
                            <div
                                key={f.num}
                                className={`bg-white border border-gray-200 rounded-3xl p-8 flex flex-col md:flex-row items-start gap-6 transition-all duration-300 cursor-default ${hoveredFeature === f.num ? "shadow-xl -translate-y-1 border-blue-200" : "hover:shadow-lg"}`}
                                onMouseEnter={() => setHoveredFeature(f.num)}
                                onMouseLeave={() => setHoveredFeature(null)}
                            >
                                <div className="flex-shrink-0 w-14 h-14 bg-blue-50 border border-blue-100 rounded-2xl flex items-center justify-center text-blue-600 font-black font-syne text-xl">
                                    {f.num}
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-syne text-xl font-black text-gray-900 mb-2 flex items-center gap-3">
                                        <span className="text-2xl">{f.icon}</span>
                                        {f.title}
                                    </h3>
                                    <p className="text-gray-500 font-medium leading-relaxed">{f.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ─── H-1B PATH BANNER ────────────────────────────────────── */}
            <section className="py-16 px-6 bg-[#0f1117]">
                <div className="max-w-4xl mx-auto text-center">
                    <h2 className="font-syne text-4xl md:text-5xl font-black text-white mb-6">
                        Your Path To <span className="text-[#c8ff00]">H-1B</span>
                    </h2>
                    <p className="text-gray-400 text-lg font-medium max-w-lg mx-auto mb-8">
                        Every job we surface is vetted for OPT compliance. No staffing agencies. No C2C contracts. Only direct-hire roles that protect your immigration future.
                    </p>
                    <button
                        onClick={onShowLogin}
                        className="bg-[#c8ff00] hover:brightness-110 text-black px-10 py-4 rounded-full text-sm font-black uppercase tracking-widest transition-all hover:shadow-xl hover:shadow-[#c8ff00]/20 active:scale-95"
                    >
                        Get Started
                    </button>
                </div>
            </section>

            {/* ─── COMPLIANCE SECTION ──────────────────────────────────── */}
            <section id="compliance" className="py-20 px-6">
                <div className="max-w-4xl mx-auto text-center">
                    <div className="text-4xl mb-4">🛡️</div>
                    <h2 className="font-syne text-3xl md:text-4xl font-black text-gray-900 mb-3">
                        100% Legit. 100% Compliant. Built to Last.
                    </h2>
                    <p className="text-gray-400 font-medium mb-10">
                        No shortcuts. No gray areas. No future risk.
                    </p>

                    <div className="bg-white border border-gray-200 rounded-3xl p-8 text-left max-w-2xl mx-auto mb-8">
                        <p className="text-gray-600 font-medium leading-relaxed mb-4">
                            GradLaunch is designed for candidates who want a legitimate, long-term career in the U.S.
                            We surface only direct, full-time roles that fully comply with F-1 and OPT regulations.
                        </p>
                        <p className="text-gray-600 font-medium leading-relaxed">
                            Unlike typical consultancy paths that push students into C2C contracts, staffing roles, or proxy
                            employment, GradLaunch avoids all high-risk structures that can raise red flags later.
                        </p>
                    </div>

                    <div className="bg-red-50 border border-red-200 rounded-3xl p-8 text-left max-w-2xl mx-auto">
                        <h3 className="font-syne text-xl font-black text-red-800 mb-4">Why This Matters?</h3>
                        <p className="text-red-700/80 font-medium leading-relaxed mb-6">
                            Many consultancy-driven roles may work short term — but they often leave compliance gaps
                            that can surface years later during:
                        </p>
                        <div className="bg-white border border-red-100 rounded-2xl p-4 flex flex-wrap justify-center gap-3 mb-6">
                            {compliancePoints.map((p, i) => (
                                <span key={i} className="text-sm font-bold text-gray-700">
                                    {i > 0 && <span className="text-red-300 mr-3">|</span>}
                                    {p}
                                </span>
                            ))}
                        </div>
                        <p className="text-red-700 font-bold text-center">
                            When that happens, entire careers can collapse — even after years of work in the U.S.
                        </p>
                    </div>
                </div>
            </section>

            {/* ─── FINAL CTA ───────────────────────────────────────────── */}
            <section className="py-20 px-6 bg-gradient-to-b from-white to-[#f4f7fc]">
                <div className="max-w-3xl mx-auto text-center">
                    <h2 className="font-syne text-4xl md:text-5xl font-black text-gray-900 mb-4">
                        Ready to Launch Your Career?
                    </h2>
                    <p className="text-gray-500 text-lg font-medium max-w-lg mx-auto mb-10">
                        Join thousands of international students who are using AI to land legitimate, high-paying roles in the US.
                    </p>
                    <button
                        onClick={onShowLogin}
                        className="bg-[#0f1117] hover:bg-[#1a1b23] text-white px-12 py-5 rounded-full text-sm font-bold transition-all hover:shadow-xl hover:shadow-black/15 active:scale-95 flex items-center justify-center gap-2 mx-auto"
                    >
                        Get Started Today <span className="text-lg">→</span>
                    </button>
                </div>
            </section>

            {/* ─── FOOTER ──────────────────────────────────────────────── */}
            <footer className="bg-[#0f1117] text-gray-400 py-12 px-6">
                <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-8 bg-white/10 rounded-lg flex items-center justify-center text-[#c8ff00] text-sm">🚀</div>
                        <span className="font-syne font-black text-white text-sm tracking-tight">GradLaunch</span>
                    </div>
                    <div className="flex flex-wrap gap-6 text-xs font-semibold uppercase tracking-wider">
                        <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
                        <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
                        <a href="#" className="hover:text-white transition-colors">Refund Policy</a>
                        <a href="#" className="hover:text-white transition-colors">Contact</a>
                    </div>
                    <p className="text-xs text-gray-600">© 2026 GradLaunch. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
}
