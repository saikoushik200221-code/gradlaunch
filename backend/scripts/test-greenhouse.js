const { GreenhouseService } = require('../services/greenhouse');
const gh = new GreenhouseService();

// Example known board (leveraging Greenhouse's board API)
const TEST_COMPANY = 'discord'; // Discord uses Greenhouse
const TEST_JOB_ID = '8289766002'; // Live Job ID as of 2026-03-28

async function runTest() {
    console.log('🧪 Testing Greenhouse Intelligence Engine...');
    
    // Testing Detection
    const url = `https://boards.greenhouse.io/${TEST_COMPANY}/jobs/${TEST_JOB_ID}`;
    const info = gh.detectGreenhouseJob(url);
    console.log('✅ Detection Match:', info);

    // Testing Metadata Fetch
    const details = await gh.getJobDetails(TEST_COMPANY, TEST_JOB_ID);
    if (!details.success) {
        console.error('❌ Metadata Fetch Failed:', details.error);
        process.exit(1);
    }

    console.log('✅ Metadata Fetched for:', details.job.title);
    
    // Testing Field Extraction
    const questions = gh.extractQuestions(details.job);
    console.log(`✅ Extracted ${questions.length} questions`);
    
    const requiredQuestions = questions.filter(q => q.required);
    console.log('📋 Required fields found:', requiredQuestions.map(q => q.label).join(', '));

    // Testing Mapping
    const mockProfile = {
        name: 'Jane Doe',
        email: 'jane.doe@example.com',
        phone: '+1 555-123-4567',
        skills: ['Node.js', 'React', 'TypeScript'],
        experience: { years: 5 }
    };
    
    const answers = gh.mapUserDataToAnswers(questions, mockProfile);
    console.log('✅ Mapped Answers Preview:', answers);

    console.log('\n✨ Greenhouse Intelligence Engine Verification Complete!');
}

runTest().catch(console.error);
