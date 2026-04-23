require('dotenv').config();
const axios = require('axios');
async function testApify() {
    const token = process.env.APIFY_API_KEY;
    try {
        const { data } = await axios.post('https://api.apify.com/v2/acts/apify~google-jobs-scraper/run-sync-get-dataset-items?token=' + token, {
            queries: 'Software Engineer New Grad USA',
            maxPagesPerQuery: 1,
            maxResultsPerQuery: 5,
            searchRegion: 'United States'
        }, { timeout: 30000 });
        console.log('Apify returned:', data?.length, 'jobs');
    } catch(e) {
        console.error('Apify Error:', e.message);
    }
}
testApify();
