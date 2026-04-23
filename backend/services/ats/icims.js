const ATSAdapter = require('./_base');

/**
 * ICIMSAdapter — Implementation for iCIMS ATS.
 *
 * Common URL shapes:
 *   https://careers-{company}.icims.com/jobs/{jobId}/{slug}/job
 *   https://{company}.icims.com/jobs/{jobId}/{slug}/job
 *   https://careers.{company}.com/jobs/... (white-labelled; detect via HTML)
 *
 * iCIMS does not expose a public job-posting API like Greenhouse. We rely
 * on the URL/HTML for detection and hand the Chrome extension a selector map
 * keyed by iCIMS's stable `id`/`name` attributes.
 */
class ICIMSAdapter extends ATSAdapter {
    constructor() {
        super();
        this.name = 'icims';
    }

    async detect({ url, html }) {
        if (url) {
            const m = url.match(/https?:\/\/(?:careers-)?([a-z0-9-]+)\.icims\.com\/jobs\/(\d+)/i);
            if (m) return { company: m[1], jobId: m[2], source: 'icims' };
            if (/\.icims\.com/i.test(url)) return { company: null, jobId: null, source: 'icims' };
        }
        if (html && /icims|powered by icims/i.test(html)) {
            return { company: null, jobId: null, source: 'icims' };
        }
        return false;
    }

    async prefill({ profile, resumeText, jd, url }) {
        const info = await this.detect({ url });
        if (!info) return { success: false, error: 'Not an iCIMS job URL' };

        const { first, last } = splitFirstLast(profile.name || profile.fullName);

        const fields = {
            firstName: first,
            lastName: last,
            email: profile.email || '',
            phone: profile.phone || profile.phoneNumber || '',
            address: profile.address || '',
            city: profile.city || '',
            state: profile.state || '',
            zip: profile.zip || profile.postalCode || '',
            country: profile.country || 'United States',
            linkedin: profile.linkedin || profile.profileLinks?.linkedin || '',
            website: profile.website || profile.profileLinks?.portfolio || '',
            workAuth: profile.visaStatus || '',
        };

        // iCIMS form inputs use deterministic id prefixes across tenants.
        const selectorMap = {
            firstName: 'input[id*="firstname" i], input[name*="firstname" i]',
            lastName:  'input[id*="lastname" i], input[name*="lastname" i]',
            email:     'input[type="email"], input[id*="email" i]',
            phone:     'input[id*="phone" i], input[type="tel"]',
            address:   'input[id*="address" i]',
            city:      'input[id*="city" i]',
            state:     'select[id*="state" i], input[id*="state" i]',
            zip:       'input[id*="zip" i], input[id*="postal" i]',
            country:   'select[id*="country" i]',
            linkedin:  'input[id*="linkedin" i], input[name*="linkedin" i]',
            website:   'input[id*="website" i], input[id*="portfolio" i]',
            workAuth:  'select[id*="work" i][id*="auth" i], select[id*="visa" i]',
        };

        return {
            success: true,
            ats: 'icims',
            jobId: info.jobId,
            company: info.company,
            fields,
            selectorMap,
            files: ['resume', 'cover_letter'],
            note: 'iCIMS is extension-first. Server-side submit is not supported.',
        };
    }
}

function splitFirstLast(full = '') {
    const parts = String(full).trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return { first: '', last: '' };
    if (parts.length === 1) return { first: parts[0], last: '' };
    return { first: parts[0], last: parts.slice(1).join(' ') };
}

module.exports = ICIMSAdapter;
