const { enrichJobWithVisaIntelligence } = require('../visaIntelligence');

// Mock partial DB object
const mockDb = {
  get: async (query, params) => {
    if (params[0] && params[0].toLowerCase() === 'google') {
      return {
        h1b_approvals_2024: 2450,
        h1b_approvals_2023: 3120,
        h1b_denials_2023: 45
      };
    }
    return null;
  }
};

describe('Visa Intelligence Engine', () => {
  it('should detect strong H1B sponsorship signals', async () => {
    const job = {
      company: 'Google',
      title: 'Software Engineer',
      description: 'We will sponsor H1B visas for qualified candidates. STEM OPT eligible.',
    };
    
    const result = await enrichJobWithVisaIntelligence(mockDb, job);
    expect(result.is_h1b_sponsor).toBe(true);
    expect(result.sponsorship_confidence).toBeGreaterThan(0.8);
    expect(result.is_stem_opt_eligible).toBe(true);
  });

  it('should penalize red flag keywords', async () => {
    const job = {
      company: 'Unknown Startup',
      title: 'Frontend Developer',
      description: 'US citizens only. No sponsorship available.',
    };
    
    const result = await enrichJobWithVisaIntelligence(mockDb, job);
    expect(result.is_h1b_sponsor).toBe(false);
    expect(result.sponsorship_confidence).toBeLessThan(0.3);
  });
});
