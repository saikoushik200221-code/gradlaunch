const axios = require('axios');
const ATSAdapter = require('./_base');

/**
 * GreenhouseAdapter - Implementation for Greenhouse ATS
 */
class GreenhouseAdapter extends ATSAdapter {
    constructor() {
        super();
        this.name = 'greenhouse';
        this.baseUrl = 'https://boards-api.greenhouse.io/v1';
    }

    /**
     * Detect Greenhouse job from URL
     */
    async detect({ url, html }) {
        if (!url) return false;
        
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
        return false;
    }

    /**
     * Fetch job details from Greenhouse Public API
     */
    async getJobDetails(company, jobId) {
        try {
            console.log(`[GreenhouseAdapter] Fetching metadata for ${company}/${jobId}`);
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
            console.error('[GreenhouseAdapter] API Error:', error.response?.data || error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Map user profile to Greenhouse fields
     */
    async prefill({ profile, resumeText, jd, url }) {
        const info = await this.detect({ url });
        if (!info) return { success: false, error: "Not a Greenhouse job URL" };

        const details = await this.getJobDetails(info.company, info.jobId);
        if (!details.success) return details;

        const questions = details.job.questions || [];
        const fields = {};

        questions.forEach(q => {
            const fieldId = q.fields?.[0]?.name || q.id;
            const label = (q.label || "").toLowerCase();

            // Mapping logic
            if (label.includes('name') && !label.includes('company')) {
                fields[fieldId] = profile.name || profile.fullName;
            } else if (label.includes('email')) {
                fields[fieldId] = profile.email;
            } else if (label.includes('phone')) {
                fields[fieldId] = profile.phone || profile.phoneNumber || '';
            } else if (label.includes('skills')) {
                fields[fieldId] = Array.isArray(profile.skills) ? profile.skills.join(', ') : (profile.skills || '');
            } else if (label.includes('experience')) {
                fields[fieldId] = `${profile.experience?.years || 0} years`;
            } else if (label.includes('linkedin')) {
                fields[fieldId] = profile.linkedin || profile.profileLinks?.linkedin || '';
            } else if (label.includes('website') || label.includes('portfolio') || label.includes('github')) {
                fields[fieldId] = profile.website || profile.github || profile.profileLinks?.github || '';
            }
        });

        return {
            success: true,
            ats: 'greenhouse',
            jobId: info.jobId,
            company: info.company,
            title: details.job.title,
            fields: fields,
            questions: questions.map(q => ({
                id: q.fields?.[0]?.name || q.id,
                label: q.label,
                type: q.type || 'text',
                required: q.required || false,
                options: q.fields?.[0]?.values || []
            })),
            files: ['resume', 'cover_letter']
        };
    }
}

module.exports = GreenhouseAdapter;
