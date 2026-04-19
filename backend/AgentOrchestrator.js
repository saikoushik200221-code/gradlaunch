const { detectATSType } = require('./hybridApply');
const crypto = require('crypto');

class AgentOrchestrator {
    constructor(userId, db, req) {
        this.userId = userId;
        this.db = db;
        this.state = 'INIT';
        this.req = req; // needed to fetch user data
    }

    // Generator function to stream states
    async *run(job) {
        this.sessionId = crypto.randomUUID();
        const startTime = Date.now();
        const jdText = (job.description || job.title || '').toLowerCase();
        
        try {
            // ==== STATE: INIT ====
            this.state = 'INIT';
            yield { state: this.state, message: 'Initializing Agent Orchestrator session...' };
            
            // Fetch User Data implicitly
            const user = await this.db.get('SELECT name, email, skills, experience_years, education, resume_data, profile FROM users WHERE id = ?', [this.userId]);
            const resumeData = user?.resume_data ? JSON.parse(user.resume_data) : null;
            
            // Delay to simulate agent startup
            await new Promise(resolve => setTimeout(resolve, 500));

            // ==== STATE: ANALYZING ====
            this.state = 'ANALYZING';
            yield { state: this.state, message: 'Analyzing Job Description constraints and keywords...' };
            
            const techKeywords = ['react','vue','angular','node.js','python','java','go','typescript','javascript','sql','aws','docker','kubernetes','graphql','redis','mongodb','postgresql','terraform','ci/cd','rest','api','microservices','agile','git','linux','c++','rust','django','flask','spring','express','next.js','tailwind','figma','kafka'];
            const jdKeywords = techKeywords.filter(k => jdText.includes(k));
            
            yield { state: this.state, data: { expectedKeywords: jdKeywords.length, keywords: jdKeywords.slice(0,5) }, message: `Identified ${jdKeywords.length} primary constraints.` };
            
            await new Promise(resolve => setTimeout(resolve, 600));

            // ==== STATE: SCORING ====
            this.state = 'SCORING';
            yield { state: this.state, message: 'Scoring resume profile against job requirements...' };
            
            let matchScore = 70, breakdown = { skills: 60, experience: 70, keywords: 50, visa: 80 };
            let missingSkills = [], keywordGaps = [];
            
            if (resumeData) {
                const userSkills = (resumeData.skills || []).map(s => String(s).toLowerCase());
                const matched = jdKeywords.filter(k => userSkills.some(s => s.includes(k) || k.includes(s)));
                missingSkills = jdKeywords.filter(k => !userSkills.some(s => s.includes(k) || k.includes(s))).slice(0, 8);
                const skillScore = jdKeywords.length > 0 ? Math.round((matched.length / jdKeywords.length) * 100) : 70;
                const expScore = Math.min(100, (resumeData.experience?.years || user?.experience_years || 0) * 20);
                const resumeText = JSON.stringify(resumeData).toLowerCase();
                const keywordScore = jdKeywords.length > 0 ? Math.round((jdKeywords.filter(k => resumeText.includes(k)).length / jdKeywords.length) * 100) : 50;
                keywordGaps = jdKeywords.filter(k => !resumeText.includes(k)).slice(0, 6);
                breakdown = { skills: skillScore, experience: expScore, keywords: keywordScore, visa: 80 };
                matchScore = Math.round(breakdown.skills * 0.35 + breakdown.experience * 0.25 + breakdown.keywords * 0.25 + breakdown.visa * 0.15);
            }

            const currentAtsScore = Math.max(0, matchScore - 15);
            const projectedAtsScore = Math.min(99, matchScore + 12);
            const expectedResponseChance = matchScore > 85 ? "85-95%" : matchScore > 70 ? "40-60%" : "5-10%";
            const applyConfidence = matchScore > 85 ? "HIGH" : matchScore > 70 ? "MED" : "LOW";

            yield { state: this.state, data: { matchScore, breakdown, atsScore: { current: currentAtsScore, projected: projectedAtsScore } }, message: `Calculated baseline ATS score: ${currentAtsScore}.` };
            
            await new Promise(resolve => setTimeout(resolve, 600));

            // ==== STATE: FIXING ====
            this.state = 'FIXING';
            yield { state: this.state, message: 'Formulating strategic auto-fixes...' };
            
            const autoFixable = [];
            missingSkills.forEach(s => autoFixable.push({ type: 'skill', severity: 'critical', label: s, fixType: 'add_skill', context: s }));
            
            yield { state: this.state, data: { autoFixableCount: autoFixable.length }, message: `Generated ${autoFixable.length} critical auto-fixes.` };

            await new Promise(resolve => setTimeout(resolve, 500));

            // ==== STATE: REVIEW & PREPARE ====
            this.state = 'REVIEW';
            yield { state: this.state, message: 'Predicting portal readiness & preferences...' };

            const atsType = await detectATSType(job.link || '');
            
            // Calculate field readiness
            const fieldConfidence = {
                name: user?.name ? 'high' : 'missing',
                email: user?.email ? 'high' : 'missing',
                phone: resumeData?.phone ? 'high' : 'missing',
                linkedin: resumeData?.linkedin ? 'high' : 'missing',
                visa_status: resumeData?.visa_status ? 'high' : 'missing', // changed to missing if falsy to test button logic
                skills: (resumeData?.skills?.length || 0) > 3 ? 'high' : 'medium',
                experience: resumeData?.experience ? 'high' : 'medium',
                education: resumeData?.education ? 'high' : 'medium',
            };

            // Preferences
            const rows = await this.db.all('SELECT preference_type, COUNT(*) as c FROM user_preferences WHERE user_id = ? GROUP BY preference_type', [this.userId]);
            const counts = {};
            rows.forEach(r => counts[r.preference_type] = r.c);
            const preferences = { totalAccepted: counts.accepted_fix || 0, totalRejected: counts.rejected_fix || 0, learningMaturity: Math.min(100, ((counts.accepted_fix || 0) + (counts.rejected_fix || 0)) * 5) };

            const resumeVersions = await this.db.all('SELECT id, version_name, is_default, ats_score, created_at FROM resume_versions WHERE user_id = ? ORDER BY created_at DESC LIMIT 5', [this.userId]);

            const finalPayload = {
                sessionId: this.sessionId,
                matchScore,
                breakdown,
                applyConfidence,
                expectedResponseChance,
                missingSkills,
                keywordGaps,
                autoFixable,
                atsScore: { current: currentAtsScore, projected: projectedAtsScore },
                ats_type: atsType,
                confidence: applyConfidence,
                fieldConfidence,
                preferences,
                resumeVersions: resumeVersions || [],
                confidenceFactors: {
                    "User Ground Truth Scope": 0.6,
                    "JD Semantic Match": 0.25,
                    "Visa Sponsorship Compatibility": 0.1,
                    "Recent Application Velocity": 0.05
                }
            };

            // ==== STATE: READY ====
            this.state = 'READY';
            
            // Log deterministically
            const duration = Date.now() - startTime;
            await this.db.run(
                'INSERT INTO agent_activity_log (user_id, job_id, session_id, action, details, duration_ms, status) VALUES (?,?,?,?,?,?,?)',
                [this.userId, job.id, this.sessionId, 'analyze_jd_orchestrator', JSON.stringify({
                    input: { jobTitle: job.title, jobCompany: job.company },
                    output: { matchScore, atsType, gapCount: missingSkills.length },
                    model: 'orchestrator-streaming-v1',
                    latency_ms: duration
                }), duration, 'complete']
            );

            yield { state: this.state, data: finalPayload, message: 'Analysis complete. Agent ready.' };

        } catch (e) {
            console.error('[Orchestrator Error]:', e);
            yield { state: 'ERROR', error: e.message, message: 'Orchestrator failed during execution.' };
            throw e;
        }
    }
}

module.exports = { AgentOrchestrator };
