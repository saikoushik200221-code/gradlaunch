const ATSAdapter = require('./_base');

/**
 * WorkdayAdapter — Implementation for Workday ATS.
 *
 * Workday does not expose a truly public application API. Server-side Tier 3
 * submission is not safe/stable because Workday relies on a per-session
 * bearer token, CSRF cookie, and per-tenant field paths that change.
 *
 * This adapter focuses on:
 *   1. Robust URL detection (tenants vary: myworkdayjobs.com, wd1/wd2/wd3/wd5 shards)
 *   2. Generating a prefill payload keyed by the *canonical Workday field names*
 *      that the Chrome extension's content script injects into the page DOM.
 *
 * Known URL patterns:
 *   https://{tenant}.wd{n}.myworkdayjobs.com/{lang}/{site}/job/{path}/...
 *   https://{tenant}.myworkdayjobs.com/en-US/{site}/job/...
 *   https://{tenant}.wd{n}.myworkdayjobs.com/{site}/job/...
 */
class WorkdayAdapter extends ATSAdapter {
    constructor() {
        super();
        this.name = 'workday';
    }

    async detect({ url, html }) {
        if (!url && !html) return false;

        if (url) {
            const m = url.match(
                /https?:\/\/([a-z0-9-]+)(?:\.wd\d+)?\.myworkdayjobs\.com\/(?:([a-zA-Z-]+)\/)?([^/]+)\/job\/([^?#]+)/i
            );
            if (m) {
                return {
                    tenant: m[1],
                    lang: m[2] || 'en-US',
                    site: m[3],
                    path: m[4],
                    source: 'workday',
                };
            }
            // Looser fallback for non-job pages on the same host (e.g., careers pages).
            if (/myworkdayjobs\.com/i.test(url)) {
                return { tenant: null, site: null, path: null, source: 'workday' };
            }
        }

        if (html && /myworkdayjobs\.com|data-automation-id="jobPosting/i.test(html)) {
            return { tenant: null, site: null, path: null, source: 'workday' };
        }

        return false;
    }

    /**
     * Workday has a very stable set of `data-automation-id` attributes the
     * extension's content script can target. We return both a keyed `fields`
     * object (for the extension) and a `selectorMap` that maps field names to
     * the `data-automation-id` the script should fill.
     */
    async prefill({ profile, resumeText, jd, url }) {
        const info = await this.detect({ url });
        if (!info) return { success: false, error: 'Not a Workday job URL' };

        const first = splitFirstLast(profile.name || profile.fullName).first;
        const last = splitFirstLast(profile.name || profile.fullName).last;

        const fields = {
            firstName: first,
            lastName: last,
            email: profile.email || '',
            phoneNumber: profile.phone || profile.phoneNumber || '',
            addressLine1: profile.address || '',
            city: profile.city || '',
            state: profile.state || '',
            postalCode: profile.zip || profile.postalCode || '',
            country: profile.country || 'United States of America',
            linkedIn: profile.linkedin || profile.profileLinks?.linkedin || '',
            website: profile.website || profile.profileLinks?.portfolio || '',
            workAuthorization: profile.visaStatus || '',
            requireSponsorship: /h1b|opt|stem/i.test(profile.visaStatus || '') ? 'Yes' : 'No',
        };

        // data-automation-id attributes the content script targets.
        const selectorMap = {
            firstName: 'legalNameSection_firstName',
            lastName: 'legalNameSection_lastName',
            email: 'email',
            phoneNumber: 'phone-number',
            addressLine1: 'addressSection_addressLine1',
            city: 'addressSection_city',
            state: 'addressSection_countryRegion',
            postalCode: 'addressSection_postalCode',
            country: 'countryDropdown',
            linkedIn: 'linkedInQuestion', // usually a text input
            website: 'websiteQuestion',
            workAuthorization: 'workAuthorizationQuestion',
            requireSponsorship: 'sponsorshipQuestion',
        };

        return {
            success: true,
            ats: 'workday',
            tenant: info.tenant,
            site: info.site,
            fields,
            selectorMap,
            files: ['resume', 'cover_letter'],
            note: 'Workday Tier 3 submit is not supported server-side. Use the extension for form-fill.',
        };
    }
}

function splitFirstLast(full = '') {
    const parts = String(full).trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return { first: '', last: '' };
    if (parts.length === 1) return { first: parts[0], last: '' };
    return { first: parts[0], last: parts.slice(1).join(' ') };
}

module.exports = WorkdayAdapter;
