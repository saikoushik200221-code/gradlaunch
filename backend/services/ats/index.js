const GreenhouseAdapter = require('./greenhouse');
const LeverAdapter = require('./lever');
const AshbyAdapter = require('./ashby');
const WorkdayAdapter = require('./workday');
const ICIMSAdapter = require('./icims');

// Registry of available ATS adapters. Order matters — more specific patterns
// (Greenhouse, Lever, Ashby, iCIMS) are checked before the catch-all Workday
// host check.
const adapters = [
    new GreenhouseAdapter(),
    new LeverAdapter(),
    new AshbyAdapter(),
    new ICIMSAdapter(),
    new WorkdayAdapter(),
];

/**
 * Detect the ATS type for a given URL or HTML.
 * @param {Object} context { url, html }
 * @returns {Promise<Object|null>} { adapter, metadata }
 */
async function detectATS({ url, html }) {
    for (const adapter of adapters) {
        const metadata = await adapter.detect({ url, html });
        if (metadata) {
            return { adapter, metadata };
        }
    }
    return null;
}

/**
 * Get an adapter by name.
 * @param {string} name
 * @returns {ATSAdapter|null}
 */
function getAdapter(name) {
    return adapters.find(a => a.name === name) || null;
}

/** Convenience: enumerate adapter names for diagnostics. */
function listAdapters() {
    return adapters.map(a => a.name);
}

module.exports = {
    detectATS,
    getAdapter,
    listAdapters,
    adapters,
};
