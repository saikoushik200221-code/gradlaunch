/**
 * Adzuna Job Search Service
 * Aggregates job listings from 100+ job boards
 * Provides salary predictions and ATS scoring
 */

const axios = require('axios');

class AdzunaService {
    constructor() {
        this.appId = process.env.ADZUNA_APP_ID || '';
        this.apiKey = process.env.ADZUNA_APP_KEY || '';
        this.baseUrl = 'https://api.adzuna.com/v1/api/jobs';
        this.timeout = 10000;
    }

    /**
     * Search jobs on Adzuna
     * @param {string} query - Search query (e.g., "React Engineer")
     * @param {string} location - Location (e.g., "US", "London", "remote")
     * @param {object} filters - Additional filters
     * @returns {Promise<Array>} Array of job listings
     */
    async searchJobs(query, location = 'US', filters = {}) {
        try {
            if (!this.appId || !this.apiKey) {
                console.warn('[Adzuna] Missing API credentials');
                return [];
            }

            const params = {
                app_id: this.appId,
                app_key: this.apiKey,
                results_per_page: filters.limit || 25,
                what: query,
                where: location,
                sort_by: filters.sortBy || 'date',
                full_time: filters.fullTimeOnly ? 1 : undefined,
                salary_min: filters.salaryMin,
                salary_max: filters.salaryMax,
                company: filters.company,
                category: filters.category
            };

            // Remove undefined values
            Object.keys(params).forEach(key =>
                params[key] === undefined && delete params[key]
            );

            const response = await axios.get(
                `${this.baseUrl}/${this.getCountryCode(location)}/search/1`,
                { params, timeout: this.timeout }
            );

            return this.normalizeJobs(response.data.results || []);
        } catch (error) {
            console.error('[Adzuna] Search error:', error.message);
            return [];
        }
    }

    /**
     * Get job details with enhanced metadata
     * @param {string} jobId - Adzuna job ID
     * @returns {Promise<Object>} Job details
     */
    async getJobDetails(jobId) {
        try {
            const params = {
                app_id: this.appId,
                app_key: this.apiKey
            };

            const response = await axios.get(
                `${this.baseUrl}/${jobId}`,
                { params, timeout: this.timeout }
            );

            return this.normalizeJob(response.data);
        } catch (error) {
            console.error('[Adzuna] Details error:', error.message);
            return null;
        }
    }

    /**
     * Search by skills/keywords with salary insights
     * @param {Array<string>} skills - Skills to search for
     * @param {string} location - Location
     * @returns {Promise<Object>} Aggregated results with insights
     */
    async searchBySkills(skills, location = 'US') {
        try {
            const results = [];
            const skillStats = {};

            for (const skill of skills) {
                const jobs = await this.searchJobs(skill, location, { limit: 10 });
                results.push(...jobs);

                // Track salary/demand for each skill
                const salaries = jobs
                    .map(j => j.salary_max || 0)
                    .filter(s => s > 0);

                if (salaries.length > 0) {
                    skillStats[skill] = {
                        avgSalary: Math.round(salaries.reduce((a, b) => a + b) / salaries.length),
                        jobCount: jobs.length,
                        inDemand: jobs.length > 5
                    };
                }
            }

            // Deduplicate and sort by date
            const uniqueJobs = [...new Map(results.map(j => [j.id, j])).values()]
                .sort((a, b) => new Date(b.posted_at || 0) - new Date(a.posted_at || 0));

            return {
                jobs: uniqueJobs,
                skillStats,
                totalJobs: uniqueJobs.length,
                location
            };
        } catch (error) {
            console.error('[Adzuna] Skill search error:', error.message);
            return { jobs: [], skillStats: {}, totalJobs: 0 };
        }
    }

    /**
     * Get salary insights for a role
     * @param {string} role - Job title
     * @param {string} location - Location
     * @returns {Promise<Object>} Salary data
     */
    async getSalaryInsights(role, location = 'US') {
        try {
            const jobs = await this.searchJobs(role, location, { limit: 50 });

            const salaries = jobs
                .map(j => j.salary_min || j.salary_max || 0)
                .filter(s => s > 0)
                .sort((a, b) => a - b);

            if (salaries.length === 0) {
                return { error: 'No salary data available' };
            }

            const mid = Math.floor(salaries.length / 2);
            return {
                role,
                location,
                min: salaries[0],
                median: salaries.length % 2 !== 0 ? salaries[mid] : (salaries[mid - 1] + salaries[mid]) / 2,
                max: salaries[salaries.length - 1],
                average: Math.round(salaries.reduce((a, b) => a + b) / salaries.length),
                dataPoints: salaries.length,
                currency: 'USD'
            };
        } catch (error) {
            console.error('[Adzuna] Salary insights error:', error.message);
            return { error: error.message };
        }
    }

    /**
     * Normalize Adzuna job format to standard format
     * @private
     */
    normalizeJob(job) {
        return {
            id: job.id || Math.random().toString(36).substr(2, 9),
            title: job.title || '',
            company: job.company?.display_name || 'Unknown',
            location: job.location?.display_name || 'Remote',
            description: job.description || '',
            link: job.redirect_url || '',
            posted_at: job.created || new Date().toISOString(),
            salary_min: job.salary_min || 0,
            salary_max: job.salary_max || 0,
            salary_currency: job.salary_currency || 'USD',
            contract_type: job.contract_type || 'permanent',
            category: job.category?.label || 'Unknown',
            source: 'adzuna'
        };
    }

    /**
     * Normalize multiple jobs
     * @private
     */
    normalizeJobs(jobs) {
        return jobs
            .map(job => this.normalizeJob(job))
            .filter(job => this.isGenuineJob(job));
    }

    /**
     * Filter out non-genuine options (staffing, C2C)
     * @private
     */
    isGenuineJob(job) {
        const text = ((job.company || '') + ' ' + (job.title || '') + ' ' + (job.description || '')).toLowerCase();
        
        const agencyBlocklist = [
            "cybercoders", "revature", "turing", "braintrust", "synergis", 
            "robert half", "teksystems", "infosys", "tcs", "wipro", 
            "cognizant", "insight global", "randstad", "adecco", "jobot",
            "kforce", "collabera", "apex systems", "beacon hill", 
            "bairesdev", "optnation", "dice", "toptal", "upwork", "fiverr",
            "hcl technologies", "tech mahindra", "mindtree", "mphasis",
            "mason frank", "nigel frank", "aerotek", "motion recruitment",
            "matrix resources", "judge group"
        ];
        
        const redFlags = [
            "c2c", "corp to corp", "corp-to-corp", "1099", "contract to hire",
            "contract-to-hire", "staffing agency", "staffing firm", "independent contractor",
            "w2 contract", "w-2 only", "no c2c", "third-party", "3rd party"
        ];

        const c = (job.company || '').toLowerCase();
        if (agencyBlocklist.some(agency => c.includes(agency))) return false;
        
        if (redFlags.some(flag => text.includes(flag))) return false;
        
        return true;
    }

    /**
     * Convert location to country code for Adzuna API
     * @private
     */
    getCountryCode(location) {
        const countryMap = {
            'US': 'us',
            'UK': 'gb',
            'CA': 'ca',
            'AU': 'au',
            'INDIA': 'in',
            'REMOTE': 'us', // Default to US for remote
            'US-REMOTE': 'us',
            'GB-REMOTE': 'gb'
        };
        return countryMap[location?.toUpperCase()] || 'us';
    }
}

module.exports = { AdzunaService };
