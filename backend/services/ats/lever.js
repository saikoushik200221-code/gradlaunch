const axios = require('axios');
const ATSAdapter = require('./_base');

/**
 * LeverAdapter - Implementation for Lever ATS
 */
class LeverAdapter extends ATSAdapter {
    constructor() {
        super();
        this.name = 'lever';
    }

    /**
     * Detect Lever job from URL
     * Format: https://jobs.lever.co/[company]/[job-id]
     */
    async detect({ url, html }) {
        if (!url) return false;
        
        const match = url.match(/https?:\/\/jobs\.lever\.co\/([^/]+)\/([^/?#]+)/);
        if (match) {
            return {
                company: match[1],
                jobId: match[2],
                source: 'lever'
            };
        }
        return false;
    }

    /**
     * Map user profile to Lever fields
     * Lever typically uses standard field names like 'name', 'email', 'phone', 'org'
     */
    async prefill({ profile, resumeText, jd, url }) {
        const info = await this.detect({ url });
        if (!info) return { success: false, error: "Not a Lever job URL" };

        // Lever usually doesn't expose a public questions API in the same way Greenhouse does
        // but it has highly standardized field names.
        const fields = {
            'name': profile.name || profile.fullName || '',
            'email': profile.email || '',
            'phone': profile.phone || profile.phoneNumber || '',
            'org': profile.currentCompany || '',
            'urls[LinkedIn]': profile.linkedin || profile.profileLinks?.linkedin || '',
            'urls[GitHub]': profile.github || profile.profileLinks?.github || '',
            'urls[Portfolio]': profile.website || profile.profileLinks?.portfolio || '',
            'urls[Twitter]': profile.twitter || '',
        };

        return {
            success: true,
            ats: 'lever',
            jobId: info.jobId,
            company: info.company,
            fields: fields,
            files: ['resume', 'cover_letter']
        };
    }
}

module.exports = LeverAdapter;
