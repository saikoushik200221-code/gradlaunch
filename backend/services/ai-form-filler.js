const { GoogleGenerativeAI } = require('@google/generative-ai');

let genAI = null;
try {
  if (process.env.GEMINI_API_KEY) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    console.log('[AIFormFiller] Gemini AI initialized');
  }
} catch (error) {
  console.error('[AIFormFiller] Failed to initialize Gemini:', error.message);
}

class AIFormFiller {
  constructor() {
    this.temperature = 0.7;
    this.maxTokens = 1000;
  }

  /**
   * Generate tailored application responses using Gemini AI
   * @param {Object} jobDescription - Job posting details
   * @param {Object} userProfile - User's profile and resume data
   * @param {string} userId - User ID for logging
   * @param {Object} abTestingService - Optional A/B testing service
   * @param {Object} analyticsService - Optional analytics service
   * @returns {Promise<Object>} - Tailored application content
   */
  async generateTailoredResponses(jobDescription, userProfile, userId = null, abTestingService = null, analyticsService = null) {
    if (!jobDescription || !userProfile) {
      throw new Error('Missing job description or user profile');
    }

    if (genAI) {
      try {
        // If A/B testing is enabled, try generating with experiment variant
        if (userId && abTestingService) {
          return await this.generateWithExperiment(jobDescription, userProfile, userId, abTestingService, analyticsService);
        }
        
        return await this.generateWithGemini(jobDescription, userProfile, userId, analyticsService);
      } catch (error) {
        console.error('[AIFormFiller] Gemini generation failed:', error.message);
        return this.generateWithMock(jobDescription, userProfile);
      }
    }
    
    return this.generateWithMock(jobDescription, userProfile);
  }

  /**
   * Generate with A/B test variant
   */
  async generateWithExperiment(jobDescription, userProfile, userId, abTestingService, analyticsService) {
    // Get prompt experiment assignment
    const promptVariant = await abTestingService.getVariantConfig(userId, 'cover_letter_style');
    
    if (promptVariant && promptVariant.config && genAI) {
      // Track the usage of this specific variant
      await abTestingService.trackEvent(userId, 'cover_letter_style', 'prompt_used', {
        variant: promptVariant.name,
        job_id: jobDescription.id || 'unknown'
      });
      
      const startTime = Date.now();
      try {
        const result = await this.generateWithCustomPrompt(
          jobDescription, 
          userProfile, 
          promptVariant.config
        );
        
        const duration = Date.now() - startTime;
        
        // Log analytics for the generation
        if (analyticsService) {
           await analyticsService.logGeminiUsage(
             userId, 'gemini-1.5-flash', 'application_prefill_experiment', 
             500, 500, duration, true
           );
        }
        
        return result;
      } catch (e) {
        console.error('[AIFormFiller] Custom prompt variant failed, falling back...');
      }
    }
    
    // Fallback to default Gemini generation
    return await this.generateWithGemini(jobDescription, userProfile, userId, analyticsService);
  }

  /**
   * Generate using Gemini AI with logging
   */
  async generateWithGemini(jobDescription, userProfile, userId = null, analyticsService = null) {
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-1.5-flash',
      generationConfig: {
        temperature: this.temperature,
        maxOutputTokens: this.maxTokens
      }
    });

    const skillsStr = Array.isArray(userProfile.skills) ? userProfile.skills.join(', ') : (userProfile.skills || 'Not specified');
    const degree = userProfile.education?.degree || 'Degree';
    const field = userProfile.education?.field || 'Field';
    
    const prompt = `
      Generate tailored job application responses based on the following:
      
      JOB DESCRIPTION:
      Title: ${jobDescription.title || 'Unknown Title'}
      Company: ${jobDescription.company_name || jobDescription.company || 'Unknown Company'}
      Description: ${(jobDescription.description || '').substring(0, 2000)}
      
      USER PROFILE:
      Skills: ${skillsStr}
      Experience: ${userProfile.experience?.years || userProfile.experience_years || 0} years
      Education: ${degree} in ${field}
      Summary: ${userProfile.summary || 'No summary provided'}
      
      Return ONLY a JSON object with this exact structure:
      {
        "cover_letter": "A compelling cover letter tailored to this specific job",
        "key_qualifications": ["qualification1", "qualification2", "qualification3"],
        "why_this_company": "Brief explanation of why you want to work at this company",
        "relevant_experience": "Summary of most relevant experience for this role",
        "skills_highlight": ["skill1", "skill2", "skill3"],
        "custom_answers": {
          "question1": "answer1",
          "question2": "answer2"
        }
      }
      
      Make it personal, enthusiastic, and highlight relevant skills from the user profile.
    `;
    
    const startTime = Date.now();
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const jsonText = response.text();
    const duration = Date.now() - startTime;
    
    // Log usage if analytics provided
    if (userId && analyticsService) {
        // Approximate token counts (1 word ~= 1.33 tokens)
        const promptTokens = Math.round(prompt.split(' ').length * 1.33);
        const responseTokens = Math.round(jsonText.split(' ').length * 1.33);
        
        await analyticsService.logGeminiUsage(
            userId, 'gemini-1.5-flash', 'application_prefill', 
            promptTokens, responseTokens, duration, true
        );
    }
    
    // Extract JSON from response
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    throw new Error('Failed to parse Gemini response');
  }

  /**
   * Generate with custom prompt configuration
   */
  async generateWithCustomPrompt(jobDescription, userProfile, promptConfig) {
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-1.5-flash',
      generationConfig: {
        temperature: promptConfig.temperature || 0.7,
        maxOutputTokens: promptConfig.maxTokens || 1000
      }
    });
    
    const skillsStr = Array.isArray(userProfile.skills) ? userProfile.skills.join(', ') : (userProfile.skills || 'Not specified');
    const prompt = `
      ${promptConfig.systemPrompt}
      
      JOB: ${jobDescription.title || 'Position'} at ${jobDescription.company_name || jobDescription.company || 'Company'}
      DESCRIPTION: ${(jobDescription.description || '').substring(0, 1500)}
      
      CANDIDATE: ${userProfile.summary || 'Qualified professional'}
      SKILLS: ${skillsStr}
      EXPERIENCE: ${userProfile.experience?.years || userProfile.experience_years || 0} years
      
      Generate ${ (promptConfig.structure || ['opening', 'qualifications', 'closing']).join(', ')} sections.
      Return the response in a structured JSON format with a 'cover_letter' and 'why_this_company' field at minimum.
    `;
    
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    
    // Parse response into required format (simplified for experiments)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        cover_letter: parsed.cover_letter || text,
        key_qualifications: parsed.key_qualifications || ["Expert alignment with role"],
        why_this_company: parsed.why_this_company || "Excited about company values",
        relevant_experience: parsed.relevant_experience || "Strong background for this role",
        skills_highlight: parsed.skills_highlight || userProfile.skills?.slice(0, 5) || [],
        custom_answers: parsed.custom_answers || {}
      };
    }
    
    return {
      cover_letter: text,
      key_qualifications: ["Expert alignment with role"],
      why_this_company: "Excited about company values",
      relevant_experience: "Strong background for this role",
      skills_highlight: userProfile.skills?.slice(0, 5) || [],
      custom_answers: {}
    };
  }

  /**
   * Mock generation for fallback
   */
  generateWithMock(jobDescription, userProfile) {
    const companyName = jobDescription.company_name || jobDescription.company || 'this company';
    const jobTitle = jobDescription.title || 'this position';
    const skills = Array.isArray(userProfile.skills) ? userProfile.skills : [];
    
    return {
      cover_letter: `Dear Hiring Manager,

I am excited to apply for the ${jobTitle} position at ${companyName}. With my background in ${skills.slice(0, 3).join(', ') || 'relevant fields'}, I am confident I can contribute significantly to your team.

${userProfile.summary || 'I am a dedicated professional with a passion for excellence.'}

I look forward to discussing how my experience aligns with your needs.

Best regards,
${userProfile.name || 'Candidate'}`,
      
      key_qualifications: [
        `${userProfile.experience?.years || userProfile.experience_years || 2}+ years of relevant experience`,
        `Expertise in ${skills[0] || 'core competencies'}`,
        `Strong track record of delivering results`
      ],
      
      why_this_company: `I admire ${companyName}'s innovative approach and would be honored to contribute to your mission.`,
      
      relevant_experience: `My experience in ${skills.slice(0, 2).join(' and ') || 'relevant areas'} has prepared me well for this role.`,
      
      skills_highlight: (skills.length > 0 ? skills : ['Communication', 'Problem Solving']).slice(0, 5),
      
      custom_answers: {
        "Why are you interested in this role?": `I am passionate about ${jobTitle} and believe my skills make me an ideal candidate.`,
        "What are your greatest strengths?": `My strongest assets are my ${skills.slice(0, 2).join(' and ') || 'adaptability and dedication'} to continuous improvement.`
      }
    };
  }

  /**
   * Generate specific field values for form filling
   * @param {Object} jobDescription - Job posting
   * @param {Object} userProfile - User profile
   * @param {Array} fields - Fields to fill (from SDK)
   * @param {string} userId - User ID for logging
   * @param {Object} abTestingService - Optional A/B testing
   * @param {Object} analyticsService - Optional analytics
   * @returns {Promise<Object>} - Field values
   */
  async generateFieldValues(jobDescription, userProfile, fields, userId = null, abTestingService = null, analyticsService = null) {
    const responses = await this.generateTailoredResponses(jobDescription, userProfile, userId, abTestingService, analyticsService);
    
    // Map responses to field types
    const fieldMap = {
      'cover_letter': responses.cover_letter,
      'why_this_company': responses.why_this_company,
      'relevant_experience': responses.relevant_experience,
      'skills': responses.skills_highlight?.join(', '),
      'qualifications': responses.key_qualifications?.join('\n')
    };
    
    const result = {};
    for (const field of (fields || [])) {
      const fieldKey = String(field).toLowerCase().replace(/\s+/g, '_');
      result[field] = fieldMap[fieldKey] || (responses.custom_answers ? responses.custom_answers[field] : null) || 'Not specified';
    }
    
    return result;
  }
}

module.exports = { AIFormFiller };
