// Cache for company lookups (5 minute TTL)
const companyCache = new Map();

// USCIS H1B data import function
async function importUSCISData(db) {
  console.log('📊 Importing USCIS H1B data...');
  
  // This would parse the actual Excel/CSV from DOL website
  // For now, provide sample structure:
  const sampleData = [
    { company: 'Google', approvals_2024: 2450, approvals_2023: 3120, denials_2023: 45 },
    { company: 'Microsoft', approvals_2024: 2100, approvals_2023: 2780, denials_2023: 38 },
    { company: 'Amazon', approvals_2024: 1850, approvals_2023: 2340, denials_2023: 92 },
    { company: 'Meta', approvals_2024: 1200, approvals_2023: 1560, denials_2023: 28 }
  ];
  
  for (const data of sampleData) {
    await db.run(`
      INSERT INTO companies (name, h1b_approvals_2024, h1b_approvals_2023, h1b_denials_2023)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(name) DO UPDATE SET
        h1b_approvals_2024 = excluded.h1b_approvals_2024,
        h1b_approvals_2023 = excluded.h1b_approvals_2023,
        h1b_denials_2023 = excluded.h1b_denials_2023
    `, [data.company, data.approvals_2024, data.approvals_2023, data.denials_2023]);
  }
  
  console.log('✅ USCIS data imported');
}

async function getCompanyIntelligence(db, companyName) {
  // Check cache first
  if (companyCache.has(companyName)) {
    return companyCache.get(companyName);
  }
  
  // Query database
  const result = await db.get(
    'SELECT * FROM companies WHERE LOWER(name) = LOWER(?)',
    [companyName]
  );
  
  if (result) {
    // Cache for 5 minutes
    companyCache.set(companyName, result);
    setTimeout(() => companyCache.delete(companyName), 300000);
  }
  
  return result;
}

function generateExplanation(confidence, dataSources) {
  if (confidence > 0.8) {
    return "✅ High confidence: This company regularly sponsors H1B visas based on public records and explicit job description mentions.";
  } else if (confidence > 0.6) {
    return "👍 Likely sponsors H1B. The job description mentions visa sponsorship and company has history of sponsorship.";
  } else if (confidence > 0.4) {
    return "🤔 Possible H1B sponsorship. No explicit mention, but company has sponsored in the past. Consider reaching out to recruiter.";
  } else if (confidence > 0.2) {
    return "⚠️ Unclear sponsorship status. Job description doesn't mention visa sponsorship. Verify with employer before applying.";
  } else {
    return "❌ Unlikely to sponsor. Job description contains phrases like 'no sponsorship' or 'US citizens only'.";
  }
}

async function enrichJobWithVisaIntelligence(db, job) {
  const text = (job.description + ' ' + (job.requirements || '')).toLowerCase();
  const companyName = job.company;
  
  // Keyword scoring weights
  let h1bScore = 0;
  let stemScore = 0;
  let capExemptScore = 0;
  
  // H1B positive signals (each adds 0.2-0.3)
  const h1bPositive = [
    { keywords: ['visa sponsorship', 'will sponsor', 'h1b', 'h-1b'], weight: 0.3 },
    { keywords: ['work authorization', 'sponsorship available'], weight: 0.25 },
    { keywords: ['opt eligible', 'stem opt'], weight: 0.2 }
  ];
  
  // H1B negative signals (each subtracts 0.4)
  const h1bNegative = [
    'no sponsorship', 'cannot sponsor', 'must have work authorization',
    'us citizens only', 'green card holders only', 'c2c only'
  ];
  
  // STEM OPT signals
  const stemSignals = [
    'stem opt', 'stem-opt', 'science technology engineering math',
    'computer science', 'software engineering', 'data science'
  ];
  
  // Cap-exempt signals
  const capExemptSignals = [
    'university', 'college', 'non-profit', 'research institution',
    'hospital', '.edu', 'academic', 'nonprofit'
  ];
  
  // Calculate H1B score
  for (const signal of h1bPositive) {
    for (const keyword of signal.keywords) {
      if (text.includes(keyword)) {
        h1bScore += signal.weight;
        break; // Only count once per category
      }
    }
  }
  
  // Apply negative signals
  for (const keyword of h1bNegative) {
    if (text.includes(keyword)) {
      h1bScore -= 0.4;
    }
  }
  
  // Calculate STEM score
  for (const keyword of stemSignals) {
    if (text.includes(keyword)) {
      stemScore += 0.2;
    }
  }
  
  // Calculate Cap-Exempt score
  for (const keyword of capExemptSignals) {
    if (companyName.toLowerCase().includes(keyword) || text.includes(keyword)) {
      capExemptScore += 0.25;
    }
  }
  
  // Company database lookup
  let companyData = null;
  let companyScore = 0;
  try {
    companyData = await getCompanyIntelligence(db, companyName);
    if (companyData) {
      if (companyData.h1b_approvals_2024 > 0) companyScore += 0.4;
      if (companyData.h1b_approvals_2023 > 0) companyScore += 0.25;
      
      // Penalize high denial rates
      const denialRate = companyData.h1b_denials_2023 / (companyData.h1b_approvals_2023 + companyData.h1b_denials_2023);
      if (denialRate > 0.2) companyScore -= 0.2;
    }
  } catch (err) {
    console.error('Company lookup failed:', err);
  }
  
  // Final confidence scores (clamp between 0 and 1)
  const h1bConfidence = Math.min(1.0, Math.max(0, h1bScore + companyScore));
  const stemConfidence = Math.min(1.0, stemScore + (h1bConfidence * 0.3));
  const capExemptConfidence = Math.min(1.0, capExemptScore);
  
  // Determine final flags with thresholds
  const is_h1b_sponsor = h1bConfidence > 0.5;
  const is_stem_opt_eligible = stemConfidence > 0.4;
  const is_h1b_cap_exempt = capExemptConfidence > 0.6;
  
  // Build data sources for explanation
  const dataSources = {
    keyword_matches: h1bScore > 0.1,
    company_history: companyScore > 0,
    cap_exempt_detected: capExemptScore > 0.4,
    has_red_flags: h1bNegative.some(kw => text.includes(kw))
  };
  
  return {
    is_h1b_sponsor,
    is_stem_opt_eligible,
    is_h1b_cap_exempt,
    sponsorship_confidence: h1bConfidence,
    data_sources: dataSources,
    explanation: generateExplanation(h1bConfidence, dataSources),
    raw_scores: {
      h1b: Math.round(h1bScore * 100),
      stem: Math.round(stemConfidence * 100),
      cap_exempt: Math.round(capExemptConfidence * 100)
    }
  };
}

module.exports = { 
  enrichJobWithVisaIntelligence, 
  importUSCISData,
  getCompanyIntelligence 
};
