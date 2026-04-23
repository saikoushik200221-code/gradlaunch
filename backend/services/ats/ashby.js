const axios = require('axios');
const ATSAdapter = require('./_base');

/**
 * AshbyAdapter — Implementation for Ashby ATS
 *
 * URL patterns:
 *   https://jobs.ashbyhq.com/{company}/{jobId}
 *   https://jobs.ashbyhq.com/{company}/{jobId}/application
 *   https://{company}.ashbyhq.com/jobs/{jobId}
 *
 * Public API (undocumented but stable):
 *   POST https://jobs.ashbyhq.com/api/non-user-graphql?op=ApiJobPosting
 *     { "operationName":"ApiJobPosting",
 *       "variables":{ "organizationHostedJobsPageName": "<company>", "jobPostingId": "<jobId>" } }
 */
class AshbyAdapter extends ATSAdapter {
    constructor() {
        super();
        this.name = 'ashby';
        this.apiUrl = 'https://jobs.ashbyhq.com/api/non-user-graphql?op=ApiJobPosting';
    }

    async detect({ url, html }) {
        if (!url) return false;

        // jobs.ashbyhq.com/{company}/{jobId}
        let m = url.match(/https?:\/\/jobs\.ashbyhq\.com\/([^/]+)\/([0-9a-f-]{20,})/i);
        if (m) return { company: m[1], jobId: m[2], source: 'ashby', layout: 'hosted' };

        // {company}.ashbyhq.com/jobs/{jobId}
        m = url.match(/https?:\/\/([^.]+)\.ashbyhq\.com\/jobs\/([0-9a-f-]{20,})/i);
        if (m) return { company: m[1], jobId: m[2], source: 'ashby', layout: 'embed' };

        // Fallback: HTML signature
        if (html && /ashbyhq/i.test(html) && /\bjobs\/[0-9a-f-]{20,}/i.test(html)) {
            return { company: null, jobId: null, source: 'ashby', layout: 'unknown' };
        }

        return false;
    }

    async getJobDetails(company, jobId) {
        try {
            const { data } = await axios.post(
                this.apiUrl,
                {
                    operationName: 'ApiJobPosting',
                    variables: {
                        organizationHostedJobsPageName: company,
                        jobPostingId: jobId,
                    },
                    query: `query ApiJobPosting($organizationHostedJobsPageName: String!, $jobPostingId: String!) {
                        jobPosting(organizationHostedJobsPageName: $organizationHostedJobsPageName, jobPostingId: $jobPostingId) {
                            id title departmentName teamName locationName employmentType
                            applicationFormDefinition { sections { title fields { id path isRequired type title } } }
                        }
                    }`,
                },
                { headers: { 'Content-Type': 'application/json' }, timeout: 10000 }
            );
            if (data?.errors) throw new Error(data.errors[0]?.message || 'Ashby API error');
            return { success: true, job: data?.data?.jobPosting };
        } catch (error) {
            console.error('[AshbyAdapter] API error:', error.response?.status, error.message);
            return { success: false, error: error.message };
        }
    }

    async prefill({ profile, resumeText, jd, url }) {
        const info = await this.detect({ url });
        if (!info) return { success: false, error: 'Not an Ashby job URL' };

        let questions = [];
        let title = null;
        if (info.company && info.jobId) {
            const details = await this.getJobDetails(info.company, info.jobId);
            if (details.success && details.job) {
                title = details.job.title;
                const sections = details.job.applicationFormDefinition?.sections || [];
                sections.forEach(s => {
                    (s.fields || []).forEach(f => questions.push({
                        id: f.path || f.id,
                        label: f.title || f.path,
                        type: (f.type || 'text').toLowerCase(),
                        required: !!f.isRequired,
                    }));
                });
            }
        }

        // Default mapping for known Ashby field paths.
        const fields = {};
        const map = {
            '_systemfield_name': profile.name || profile.fullName,
            '_systemfield_email': profile.email,
            '_systemfield_phoneNumber': profile.phone || profile.phoneNumber,
            '_systemfield_location': profile.location || profile.currentLocation,
            '_systemfield_linkedinUrl': profile.linkedin || profile.profileLinks?.linkedin,
            '_systemfield_githubUrl': profile.github || profile.profileLinks?.github,
            '_systemfield_websiteUrl': profile.website || profile.profileLinks?.portfolio,
        };
        Object.entries(map).forEach(([k, v]) => { if (v) fields[k] = v; });

        // Also map discovered dynamic questions by keyword.
        questions.forEach(q => {
            const l = (q.label || '').toLowerCase();
            if (/work auth|visa|sponsor/.test(l) && profile.visaStatus) fields[q.id] = profile.visaStatus;
            if (/\bschool\b|university|college/.test(l) && profile.education?.university) fields[q.id] = profile.education.university;
            if (/\bdegree\b/.test(l) && profile.education?.degree) fields[q.id] = profile.education.degree;
            if (/\bgrad(uation)? year\b/.test(l) && profile.education?.gradYear) fields[q.id] = String(profile.education.gradYear);
        });

        return {
            success: true,
            ats: 'ashby',
            jobId: info.jobId,
            company: info.company,
            title,
            fields,
            questions,
            files: ['resume', 'cover_letter'],
        };
    }
}

module.exports = AshbyAdapter;
