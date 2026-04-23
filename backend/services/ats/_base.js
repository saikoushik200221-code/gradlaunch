/**
 * ATS Adapter Base Interface
 * Each ATS adapter (greenhouse, lever, etc) should implement this interface.
 */

class ATSAdapter {
    constructor() {
        this.name = 'base';
    }

    /**
     * Detect if the given URL or HTML belongs to this ATS
     * @param {Object} context { url, html }
     * @returns {Promise<boolean|Object>} Returns truthy (or metadata object) if detected
     */
    async detect({ url, html }) {
        return false;
    }

    /**
     * Prefill application fields based on user profile and job description
     * @param {Object} context { profile, resumeText, jd, url }
     * @returns {Promise<Object>} { fields, files, success, error }
     */
    async prefill({ profile, resumeText, jd, url }) {
        return { 
            success: false, 
            error: "Not implemented",
            fields: {}, 
            files: [] 
        };
    }

    /**
     * Submit the application (Tier 3)
     * @param {Object} context { session, prefilled }
     * @returns {Promise<Object>} { status, confirmation_id, raw }
     */
    async submit({ session, prefilled }) {
        return { 
            status: 'manual_only', 
            confirmation_id: null, 
            raw: null 
        };
    }
}

module.exports = ATSAdapter;
