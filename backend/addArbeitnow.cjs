const fs = require('fs');
let c = fs.readFileSync('server.js', 'utf8');

const freeApiCode = `
async function fetchArbeitnowJobs() {
    console.log('[Scraper] Fetching from Arbeitnow (Free API)...');
    try {
        const { data } = await axios.get('https://arbeitnow.com/api/job-board-api');
        if (!data || !data.data) return [];
        return data.data.map(item => ({
            id: 'arb-' + item.slug,
            title: item.title,
            company: item.company_name,
            location: item.location || "Remote",
            type: item.job_types?.join(', ') || "Full-time",
            postedValue: item.created_at * 1000,
            posted: getPostedTime(item.created_at * 1000),
            salary: 'Competitive',
            tags: generateTags(item.title, item.description, item.location),
            logo: item.company_name.charAt(0).toUpperCase(),
            match: getMatchScore(item.title),
            description: item.description,
            skills: extractSkills(item.title, item.description),
            link: item.url,
            source: 'Arbeitnow'
        }));
    } catch (e) { return []; }
}
`;

c = c.replace('async function fetchLeverJobs() {', freeApiCode + '\n\nasync function fetchLeverJobs() {');

c = c.replace('fetchRapidApiJSearch()', 'fetchRapidApiJSearch(),\n            fetchArbeitnowJobs()');

c = c.replace('...rapidApiJobs]', '...rapidApiJobs, ...arbeitnowJobs]');

c = c.replace(', rapidApiJobs] =', ', rapidApiJobs, arbeitnowJobs] =');

fs.writeFileSync('server.js', c);
