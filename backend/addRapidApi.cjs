const fs = require('fs');
let c = fs.readFileSync('server.js', 'utf8');

const rapidApiCode = `
async function fetchRapidApiJSearch() {
    const key = process.env.RAPIDAPI_KEY;
    if (!key) return [];
    console.log('[Scraper] Fetching from RapidAPI (JSearch)...');
    try {
        const { data } = await axios.get('https://jsearch.p.rapidapi.com/search', {
            params: { query: 'software engineer new grad', num_pages: '1', date_posted: 'today' },
            headers: {
                'X-RapidAPI-Key': key,
                'X-RapidAPI-Host': 'jsearch.p.rapidapi.com'
            }
        });
        if (!data || !data.data) return [];
        return data.data.map(item => ({
            id: \`rap-\${item.job_id}\`,
            title: item.job_title,
            company: item.employer_name,
            location: item.job_city ? \`\${item.job_city}, \${item.job_state}\` : "Remote",
            type: item.job_employment_type || "Full-time",
            postedValue: item.job_posted_at_datetime_utc ? new Date(item.job_posted_at_datetime_utc).getTime() : Date.now(),
            posted: getPostedTime(item.job_posted_at_datetime_utc || Date.now()),
            salary: 'Competitive',
            tags: generateTags(item.job_title, item.job_description, item.job_city),
            logo: item.employer_logo || item.employer_name.charAt(0).toUpperCase(),
            match: getMatchScore(item.job_title),
            description: item.job_description,
            skills: extractSkills(item.job_title, item.job_description),
            link: item.job_apply_link || item.job_google_link,
            source: 'JSearch (RapidAPI)'
        }));
    } catch (e) { return []; }
}
`;

c = c.replace('async function fetchLeverJobs() {', rapidApiCode + '\n\nasync function fetchLeverJobs() {');

c = c.replace('fetchApifyJobs()', 'fetchApifyJobs(),\n            fetchRapidApiJSearch()');

c = c.replace('...apifyJobs, ...adzunaRaw', '...apifyJobs, ...adzunaRaw, ...rapidApiJobs');

c = c.replace('const [leverJobs, greenhouseJobs, apifyJobs] = await Promise.all([', 'const [leverJobs, greenhouseJobs, apifyJobs, rapidApiJobs] = await Promise.all([');

fs.writeFileSync('server.js', c);
