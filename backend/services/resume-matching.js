const mammoth = require('mammoth');
let pdfParse = null;

// Lazy-load pdfParse only when needed 
async function getPDFParser() {
  if (!pdfParse) {
    try {
      pdfParse = require('pdf-parse');
      console.log('[ResumeMatching] pdf-parse loaded');
    } catch (e) {
      console.warn('[ResumeMatching] pdf-parse not available, PDF parsing disabled');
      return null;
    }
  }
  return pdfParse;
}

const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini AI if API key exists
let genAI = null;
try {
  if (process.env.GEMINI_API_KEY) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    console.log('[ResumeMatching] Gemini AI initialized');
  } else {
    console.warn('[ResumeMatching] GEMINI_API_KEY not found, using fallback mode');
  }
} catch (error) {
  console.error('[ResumeMatching] Failed to initialize Gemini:', error.message);
}

// Weight configuration for matching algorithm
const MATCH_WEIGHTS = {
  skills: 0.35,      // 35% - Technical and soft skills
  experience: 0.25,  // 25% - Years and relevance of experience
  education: 0.20,   // 20% - Degree level and field relevance
  location: 0.10,    // 10% - Geographic compatibility
  industry: 0.10     // 10% - Industry alignment
};

class ResumeMatchingEngine {
  constructor() {
    this.similarityThreshold = 0.7;
  }

  /**
   * Parse resume from buffer (PDF or DOCX)
   * @param {Buffer} buffer - File buffer
   * @param {string} mimetype - File MIME type
   * @returns {Promise<string>} - Extracted text
   */
  async parseResume(buffer, mimetype) {
    try {
      let text = '';

      if (mimetype === 'application/pdf') {
        const pdfParser = await getPDFParser();
        if (!pdfParser) {
          throw new Error('PDF parsing library not available');
        }
        const data = await pdfParser(buffer);
        text = result.value;
        console.log('[ResumeMatching] Parsed DOCX:', (text || '').length, 'characters');
      }
      else {
        throw new Error(`Unsupported file type: ${mimetype}`);
      }

      return text;
    } catch (error) {
      console.error('[ResumeMatching] Parse error:', error);
      throw new Error(`Failed to parse resume: ${error.message}`);
    }
  }

  /**
   * Extract structured intelligence from resume text using Gemini AI
   * @param {string} text - Raw resume text
   * @returns {Promise<Object>} - Structured resume data
   */
  async extractIntelligence(text) {
    if (!text || text.length < 50) {
      throw new Error('Resume text is too short or empty');
    }

    // Try Gemini AI first
    if (genAI) {
      try {
        return await this.extractWithGemini(text);
      } catch (error) {
        console.error('[ResumeMatching] Gemini extraction failed:', error.message);
        console.log('[ResumeMatching] Falling back to mock extraction');
        return this.extractWithMock(text);
      }
    }

    // Fallback to mock extraction
    return this.extractWithMock(text);
  }

  /**
   * Extract using Gemini AI
   */
  async extractWithGemini(text) {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' }); // Use flash for speed

    const prompt = `
      Extract structured information from this resume. Return ONLY a JSON object with this exact structure:
      {
        "skills": ["skill1", "skill2"],
        "experience": {
          "years": number,
          "roles": ["role1", "role2"],
          "companies": ["company1", "company2"],
          "highlights": ["achievement1"]
        },
        "education": {
          "degree": "degree name",
          "field": "field of study",
          "institution": "university name",
          "graduation_year": number
        },
        "location": {
          "city": "city name",
          "state": "state code",
          "country": "country",
          "remote_preference": boolean
        },
        "industry": "primary industry",
        "summary": "brief professional summary"
      }
      
      Resume text:
      ${text.substring(0, 15000)}
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const jsonText = response.text();

    // Extract JSON from response
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    throw new Error('Failed to parse Gemini response');
  }

  /**
   * Mock extraction for development/fallback
   */
  extractWithMock(text) {
    const lowerText = text.toLowerCase();

    // Extract skills (common tech skills)
    const commonSkills = [
      'javascript', 'python', 'java', 'react', 'node.js', 'sql', 'aws',
      'docker', 'kubernetes', 'typescript', 'html', 'css', 'mongodb',
      'express', 'django', 'flask', 'vue', 'angular', 'git', 'agile'
    ];

    const skills = commonSkills.filter(skill => lowerText.includes(skill));

    // Extract years of experience
    let years = 0;
    const yearMatches = lowerText.match(/(\d+)\s*years?\s+experience/i);
    if (yearMatches) {
      years = parseInt(yearMatches[1]);
    }

    // Determine industry
    let industry = 'Technology';
    if (lowerText.includes('finance') || lowerText.includes('bank')) industry = 'Finance';
    else if (lowerText.includes('healthcare') || lowerText.includes('medical')) industry = 'Healthcare';
    else if (lowerText.includes('marketing') || lowerText.includes('sales')) industry = 'Marketing';

    return {
      skills: skills.length ? skills : ['Communication', 'Problem Solving'],
      experience: {
        years: years || 2,
        roles: lowerText.match(/\b(developer|engineer|manager|designer|analyst)\b/gi) || ['Professional'],
        companies: [],
        highlights: ['Demonstrated strong technical skills']
      },
      education: {
        degree: lowerText.includes('bachelor') ? "Bachelor's" :
          lowerText.includes('master') ? "Master's" : "Degree",
        field: lowerText.includes('computer') ? 'Computer Science' : 'Related Field',
        institution: 'University',
        graduation_year: 2020
      },
      location: {
        city: 'Remote',
        state: null,
        country: 'USA',
        remote_preference: true
      },
      industry: industry,
      summary: 'Experienced professional with strong technical skills'
    };
  }

  /**
   * Calculate weighted match score between resume and job
   * @param {Object} resumeData - Structured resume data
   * @param {Object} jobData - Job posting data
   * @returns {Object} - Score breakdown and total
   */
  calculateWeightedScore(resumeData, jobData) {
    const scores = {
      skills: this.calculateSkillsScore(resumeData.skills || [], jobData.skills || []),
      experience: this.calculateExperienceScore(resumeData.experience || {}, jobData),
      education: this.calculateEducationScore(resumeData.education || {}, jobData),
      location: this.calculateLocationScore(resumeData.location || {}, jobData),
      industry: this.calculateIndustryScore(resumeData.industry || '', jobData)
    };

    const total = (
      scores.skills * MATCH_WEIGHTS.skills +
      scores.experience * MATCH_WEIGHTS.experience +
      scores.education * MATCH_WEIGHTS.education +
      scores.location * MATCH_WEIGHTS.location +
      scores.industry * MATCH_WEIGHTS.industry
    );

    return {
      total: Math.round(total * 100),
      breakdown: scores,
      weights: MATCH_WEIGHTS,
      threshold: this.similarityThreshold,
      meets_threshold: total >= this.similarityThreshold
    };
  }

  /**
   * Calculate skills match score
   */
  calculateSkillsScore(resumeSkills, jobSkills) {
    if (!jobSkills || jobSkills.length === 0) return 1.0;
    if (!resumeSkills || resumeSkills.length === 0) return 0.0;

    const normalizedResume = resumeSkills.map(s => String(s).toLowerCase().trim());
    const normalizedJob = jobSkills.map(s => String(s).toLowerCase().trim());

    const matches = normalizedJob.filter(skill =>
      normalizedResume.some(resumeSkill =>
        resumeSkill.includes(skill) || skill.includes(resumeSkill)
      )
    );

    return matches.length / normalizedJob.length;
  }

  /**
   * Calculate experience match score
   */
  calculateExperienceScore(resumeExp, jobData) {
    const requiredYears = jobData.experience_min || 0;
    const resumeYears = resumeExp.years || 0;

    if (requiredYears === 0) return 1.0;
    if (resumeYears >= requiredYears) return 1.0;

    return resumeYears / requiredYears;
  }

  /**
   * Calculate education match score
   */
  calculateEducationScore(resumeEdu, jobData) {
    const educationLevels = {
      'high school': 1,
      'associate': 2,
      "bachelor's": 3,
      "master's": 4,
      'phd': 5,
      'doctorate': 5
    };

    const requiredLevel = (jobData.education_level || "bachelor's").toLowerCase();
    const resumeLevel = (resumeEdu.degree || "bachelor's").toLowerCase();

    const requiredScore = educationLevels[requiredLevel] || 3;
    const resumeScore = educationLevels[resumeLevel] || 3;

    return Math.min(1.0, resumeScore / requiredScore);
  }

  /**
   * Calculate location match score
   */
  calculateLocationScore(resumeLoc, jobData) {
    if (jobData.location?.toLowerCase().includes('remote')) return 1.0;
    if (resumeLoc.remote_preference) return 0.8;

    const jobLoc = (jobData.location || "").toLowerCase();
    const resumeCity = (resumeLoc.city || "").toLowerCase();
    const resumeState = (resumeLoc.state || "").toLowerCase();

    if (resumeCity && jobLoc.includes(resumeCity)) return 1.0;
    if (resumeState && jobLoc.includes(resumeState)) return 0.8;

    return 0.3;
  }

  /**
   * Calculate industry match score
   */
  calculateIndustryScore(resumeIndustry, jobData) {
    const jobIndustry = jobData.industry || jobData.company_type;
    if (!jobIndustry) return 0.5;

    const normalizedResume = (resumeIndustry || "").toLowerCase();
    const normalizedJob = jobIndustry.toLowerCase();

    if (normalizedResume === normalizedJob) return 1.0;
    if (normalizedResume.includes(normalizedJob) || normalizedJob.includes(normalizedResume)) {
      return 0.8;
    }

    return 0.4;
  }

  /**
   * Get weights based on user's experiment assignment
   */
  async getWeightsForUser(userId, abTestingService) {
    if (!abTestingService) return MATCH_WEIGHTS;

    try {
      const variant = await abTestingService.getVariantConfig(userId, 'weight_config_skill_vs_experience');

      if (variant && variant.config) {
        await abTestingService.trackEvent(userId, 'weight_config_skill_vs_experience', 'weight_assigned', {
          variant: variant.name,
          weights: variant.config
        });
        return variant.config;
      }
    } catch (error) {
      console.error('[Matching] Failed to get experiment weights:', error);
    }

    return MATCH_WEIGHTS;
  }

  /**
   * Enhanced calculateWeightedScore with experiment tracking
   */
  async calculateWeightedScoreWithExperiment(resumeData, jobData, userId, abTestingService) {
    const weights = await this.getWeightsForUser(userId, abTestingService);

    const scores = {
      skills: this.calculateSkillsScore(resumeData.skills || [], jobData.skills || []),
      experience: this.calculateExperienceScore(resumeData.experience || {}, jobData),
      education: this.calculateEducationScore(resumeData.education || {}, jobData),
      location: this.calculateLocationScore(resumeData.location || {}, jobData),
      industry: this.calculateIndustryScore(resumeData.industry || '', jobData)
    };

    const total = (
      scores.skills * weights.skills +
      scores.experience * weights.experience +
      scores.education * weights.education +
      scores.location * weights.location +
      scores.industry * weights.industry
    );

    // Track score breakdown for analysis if service provided
    if (abTestingService) {
      await abTestingService.trackEvent(userId, 'weight_config_skill_vs_experience', 'match_calculated', {
        scores,
        weights,
        total
      });
    }

    return {
      total: Math.round(total * 100),
      breakdown: scores,
      weights: weights,
      threshold: this.similarityThreshold,
      meets_threshold: total >= this.similarityThreshold
    };
  }

  /**
   * Find top matching jobs for a user
   * @param {string} userId - User ID
   * @param {Array} jobs - Array of job objects
   * @param {Object} resumeData - User's resume data
   * @param {number} limit - Number of results
   * @param {Object} abTestingService - Optional A/B testing service
   * @returns {Array} - Ranked jobs with scores
   */
  async findMatchingJobs(userId, jobs, resumeData, limit = 10, abTestingService = null) {
    if (!jobs || !jobs.length) return [];

    const matches = await Promise.all(jobs.map(async (job) => ({
      job,
      match: await this.calculateWeightedScoreWithExperiment(resumeData, job, userId, abTestingService)
    })));

    // Sort by total score descending
    matches.sort((a, b) => b.match.total - a.match.total);

    return matches.slice(0, limit).map(match => ({
      ...match.job,
      match_score: match.match.total,
      match_breakdown: match.match.breakdown,
      match_meets_threshold: match.match.meets_threshold,
      match_weights: match.match.weights
    }));
  }
}

module.exports = { ResumeMatchingEngine, MATCH_WEIGHTS };
