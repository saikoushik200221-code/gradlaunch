function calculateMatchScore(resume, job) {
    let score = 0;
    const explanation = [];
    
    // Parse resume data if it's a string
    const resumeData = typeof resume === 'string' ? { skills: [], experience: 0 } : (resume.parsed_data || resume);
    const jobSkills = typeof job.required_skills === 'string' ? JSON.parse(job.required_skills || '[]') : (job.required_skills || []);

    // 1. Skills match (40 points max)
    const userSkills = (resumeData.skills || []).map(s => s.toLowerCase());
    const matchedSkills = jobSkills.filter(skill => 
      userSkills.some(us => us.includes(skill.toLowerCase()))
    );
    
    const skillScore = jobSkills.length > 0 ? Math.min(40, (matchedSkills.length / jobSkills.length) * 40) : 25;
    score += skillScore;
    if (matchedSkills.length > 0) explanation.push(`Skills alignment: ${matchedSkills.slice(0, 3).join(', ')}`);
    
    // 2. Experience match (30 points max)
    const userYears = resumeData.years_experience || 0;
    const requiredYears = job.experience_min || 0;
    
    if (userYears >= requiredYears) {
      score += 30;
      explanation.push(`${userYears}y exp meets requirement`);
    } else {
      score += (userYears / (requiredYears || 1)) * 30;
      explanation.push(`${userYears}y exp vs ${requiredYears}y requested`);
    }
    
    // 3. Education match (15 points max)
    // Simplified: 15 for match, 10 for partial
    score += 12; 
    
    // 4. Visa eligibility bonus (5 points)
    if (job.is_h1b_sponsor || job.is_stem_opt_eligible) {
      score += 5;
      explanation.push('Sponsorship potential confirmed');
    }
    
    // 5. Final normalization (Max 100)
    const finalScore = Math.min(100, Math.round(score + 10)); // +10 for generic fit

    return {
      score: finalScore,
      explanation: explanation.join('. ') + '.',
      breakdown: {
        skills: Math.round(skillScore),
        experience: Math.round(finalScore - skillScore),
        matched_skills: matchedSkills
      }
    };
}

module.exports = { calculateMatchScore };
