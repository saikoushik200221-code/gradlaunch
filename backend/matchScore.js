/**
 * matchScore — weighted resume <-> job fit.
 *
 * Legacy callers only expect { score, explanation, breakdown } — those
 * fields are preserved. This version also returns a richer payload
 * (strengths, weaknesses, missing skills, confidence, ATS scores, response probability)
 * that matches the shape consumed by the MatchBreakdown UI on the frontend.
 *
 * Weights (sum to 1.0):
 *   skills     0.40
 *   experience 0.25
 *   education  0.15
 *   keywords   0.15
 *   visa       0.05
 */
function calculateMatchScore(resume, job) {
    const explanation = [];

    // Parse resume data if it's a string
    const resumeData =
        typeof resume === 'string'
            ? { skills: [], experience: 0 }
            : (resume.parsed_data || resume);

    const jobSkills =
        typeof job.required_skills === 'string'
            ? JSON.parse(job.required_skills || '[]')
            : (job.required_skills || job.skills || []);

    const userSkills = (resumeData.skills || []).map(s => String(s).toLowerCase());

    // --- Skills axis (0..100) ---
    const matchedSkills = jobSkills.filter(skill =>
        userSkills.some(us => us.includes(String(skill).toLowerCase()))
    );
    const missingSkills = jobSkills.filter(skill =>
        !userSkills.some(us => us.includes(String(skill).toLowerCase()))
    );
    const skillsAxis = jobSkills.length > 0
        ? Math.round((matchedSkills.length / jobSkills.length) * 100)
        : 70;
    if (matchedSkills.length > 0) {
        explanation.push(`Skills alignment: ${matchedSkills.slice(0, 3).join(', ')}`);
    }

    // --- Experience axis (0..100) ---
    const userYears =
        resumeData.years_experience ??
        resumeData.experience?.years ??
        resumeData.experience_years ??
        0;
    const requiredYears = job.experience_min || 0;
    let experienceAxis = 70;
    if (requiredYears > 0) {
        experienceAxis = Math.min(100, Math.round((userYears / requiredYears) * 100));
        explanation.push(
            userYears >= requiredYears
                ? `${userYears}y exp meets requirement`
                : `${userYears}y exp vs ${requiredYears}y requested`
        );
    } else {
        experienceAxis = Math.min(100, userYears * 20 + 60);
    }

    // --- Education axis (0..100) ---
    const educationAxis = resumeData.education ? 90 : 70;

    // --- Keyword axis (0..100) ---
    const jdText = String(job.description || job.title || '').toLowerCase();
    const resumeText = JSON.stringify(resumeData).toLowerCase();
    const TECH_KEYWORDS = [
        'react', 'vue', 'angular', 'node.js', 'python', 'java', 'go', 'typescript',
        'javascript', 'sql', 'aws', 'docker', 'kubernetes', 'graphql', 'redis',
        'mongodb', 'postgresql', 'terraform', 'ci/cd', 'rest', 'api', 'microservices',
        'git', 'linux', 'rust', 'swift', 'kotlin', 'django', 'flask', 'spring',
        'express', 'next.js', 'tailwind', 'kafka', 'elasticsearch',
    ];
    const jdKeywords = TECH_KEYWORDS.filter(k => jdText.includes(k));
    const keywordHits = jdKeywords.filter(k => resumeText.includes(k));
    const keywordGaps = jdKeywords.filter(k => !resumeText.includes(k)).slice(0, 8);
    const keywordsAxis = jdKeywords.length > 0
        ? Math.round((keywordHits.length / jdKeywords.length) * 100)
        : 60;

    // --- Visa axis (0..100) ---
    let visaAxis = 60;
    if (job.is_h1b_sponsor || job.sponsorship_friendly) visaAxis = 95;
    if (job.is_stem_opt_eligible) visaAxis = Math.max(visaAxis, 85);
    if (visaAxis >= 85) explanation.push('Sponsorship potential confirmed');

    // --- Weighted composite ---
    const finalScore = Math.round(
        skillsAxis     * 0.40 +
        experienceAxis * 0.25 +
        educationAxis  * 0.15 +
        keywordsAxis   * 0.15 +
        visaAxis       * 0.05
    );

    // --- ATS Score estimation ---
    const hasStructuredSections = resumeData.experience && resumeData.education && resumeData.skills;
    const hasMetrics = resumeText.match(/\d+%|\d+x|\$\d+|\d+\+/g);
    let currentAtsScore = 50 + (hasStructuredSections ? 15 : 0) + (hasMetrics ? Math.min(hasMetrics.length * 5, 20) : 0) + Math.min(keywordsAxis * 0.15, 15);
    let projectedAtsScore = Math.min(98, currentAtsScore + missingSkills.length * 3 + keywordGaps.length * 2 + 8);
    currentAtsScore = Math.round(currentAtsScore);
    projectedAtsScore = Math.round(projectedAtsScore);

    // --- Response probability estimation ---
    const companySize = (job.company_type || '').toLowerCase();
    let responseBase = companySize.includes('startup') ? 15 : companySize.includes('mnc') ? 5 : 10;
    const responseChanceLow = Math.max(2, Math.round(responseBase * (finalScore / 100)));
    const responseChanceHigh = Math.min(35, responseChanceLow + 8);
    const responseProbability = `${responseChanceLow}-${responseChanceHigh}%`;

    const axes = [
        { key: 'skills',     label: 'Skills',     value: skillsAxis },
        { key: 'experience', label: 'Experience', value: experienceAxis },
        { key: 'education',  label: 'Education',  value: educationAxis },
        { key: 'keywords',   label: 'Keywords',   value: keywordsAxis },
        { key: 'visa',       label: 'Visa Fit',   value: visaAxis },
    ];

    const strengths = axes
        .filter(a => a.value >= 75)
        .map(a => `Strong ${a.label.toLowerCase()} fit (${a.value}%)`);
    const weaknesses = axes
        .filter(a => a.value < 60)
        .map(a => `${a.label} gap (${a.value}%)`);

    const confidence = finalScore >= 80 ? 'HIGH' : finalScore >= 60 ? 'MED' : 'LOW';

    // --- Improvement suggestions ---
    const improvements = [];
    if (missingSkills.length > 0) improvements.push(`Add ${missingSkills.slice(0, 3).join(', ')} to your skills section`);
    if (keywordGaps.length > 0) improvements.push(`Weave these keywords into your bullets: ${keywordGaps.slice(0, 3).join(', ')}`);
    if (currentAtsScore < 80) improvements.push('Add quantifiable metrics (%, $, numbers) to your experience bullets');
    if (improvements.length === 0) improvements.push('Your profile is well-aligned — focus on a strong cover letter');

    return {
        // Legacy-compatible fields
        score: Math.min(100, finalScore),
        explanation: explanation.join('. ') + '.',
        breakdown: {
            skills: skillsAxis,
            experience: experienceAxis,
            keywords: keywordsAxis,
            visa: visaAxis,
            education: educationAxis,
            matched_skills: matchedSkills,
        },
        // Rich payload for MatchBreakdown.jsx
        matchScore: Math.min(100, finalScore),
        axes,
        strengths,
        weaknesses,
        matchedSkills,
        missingSkills,
        keywordGaps,
        confidence,
        atsScore: { current: currentAtsScore, projected: projectedAtsScore },
        responseProbability,
        improvements,
    };
}

module.exports = { calculateMatchScore };
