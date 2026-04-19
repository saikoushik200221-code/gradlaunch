const axios = require('axios');

/**
 * GreenhouseService - Logic for direct Greenhouse API interactions
 * Handles fetching job metadata, extracting custom questions, and mapping user data.
 */
class GreenhouseService {
    constructor() {
        this.baseUrl = 'https://boards-api.greenhouse.io/v1';
    }

    /**
     * Detect Greenhouse job from URL
     * Format: https://[company].greenhouse.io/jobs/[job_id] or boards.greenhouse.io/[company]/jobs/[job_id]
     */
    detectGreenhouseJob(url = "") {
        if (!url) return null;
        
        // Match both company.greenhouse.io and boards.greenhouse.io formats
        const match = url.match(/https?:\/\/([^.]+)\.greenhouse\.io\/jobs\/(\d+)/) ||
                      url.match(/https?:\/\/boards\.greenhouse\.io\/([^/]+)\/jobs\/(\d+)/);
                      
        if (match) {
            return {
                company: match[1],
                jobId: match[2],
                source: 'greenhouse'
            };
        }
        return null;
    }

    /**
     * Fetch job details from Greenhouse Public API
     */
    async getJobDetails(company, jobId) {
        try {
            console.log(`[GreenhouseService] Fetching metadata for ${company}/${jobId}`);
            const url = `${this.baseUrl}/boards/${company}/jobs/${jobId}`;
            const response = await axios.get(url, { timeout: 10000 });

            if (response.status !== 200) {
                throw new Error(`API Error: ${response.status}`);
            }

            return {
                success: true,
                job: response.data
            };
        } catch (error) {
            console.error('[GreenhouseService] API Error:', error.response?.data || error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Extract application questions from job details
     */
    extractQuestions(jobData) {
        if (!jobData || !jobData.questions) return [];

        return jobData.questions.map(q => ({
            id: q.fields?.[0]?.name || q.id, // Prefer board-specific field names
            label: q.label,
            type: q.type || 'text',
            required: q.required || false,
            description: q.description || '',
            options: q.fields?.[0]?.values || [] // For selects/radios
        }));
    }

    /**
     * Map user intelligence profile to Greenhouse fields
     */
    mapUserDataToAnswers(questions, userProfile) {
        const answers = {};

        questions.forEach(question => {
            const label = (question.label || "").toLowerCase();

            // Intelligence-based mapping
            if (label.includes('name') && !label.includes('company')) {
                answers[question.id] = userProfile.name || userProfile.fullName;
            } else if (label.includes('email')) {
                answers[question.id] = userProfile.email;
            } else if (label.includes('phone')) {
                answers[question.id] = userProfile.phone || userProfile.phoneNumber;
            } else if (label.includes('skills')) {
                answers[question.id] = Array.isArray(userProfile.skills) ? userProfile.skills.join(', ') : userProfile.skills;
            } else if (label.includes('experience')) {
                answers[question.id] = `${userProfile.experience?.years || 0} years`;
            } else if (label.includes('linkedin')) {
                answers[question.id] = userProfile.linkedin || userProfile.profileLinks?.linkedin || '';
            } else if (label.includes('website') || label.includes('portfolio') || label.includes('github')) {
                answers[question.id] = userProfile.website || userProfile.github || '';
            }
        });

        return answers;
    }

    /**
     * Prepare application payload for Tier 2/3 Dispatch
     */
    async prepareApplication(url, userProfile) {
        const info = this.detectGreenhouseJob(url);
        if (!info) return { success: false, error: "Not a Greenhouse job URL" };

        const details = await this.getJobDetails(info.company, info.jobId);
        if (!details.success) return details;

        const questions = this.extractQuestions(details.job);
        const mappedAnswers = this.mapUserDataToAnswers(questions, userProfile);

        return {
            success: true,
            job_id: info.jobId,
            company: info.company,
            title: details.job.title,
            questions: questions,
            answers: mappedAnswers,
            required_files: ['resume', 'cover_letter']
        };
    }
}

module.exports = { GreenhouseService };
