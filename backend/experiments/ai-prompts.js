/**
 * A/B Test: AI Prompt Variations for Cover Letter Generation
 */

const promptExperiments = {
  // Default prompt (Control)
  default: {
    name: 'default',
    config: {
      systemPrompt: `Generate a professional cover letter for a job application.`,
      temperature: 0.7,
      maxTokens: 1000,
      structure: ['opening', 'qualifications', 'closing']
    }
  },
  
  // Experiment A: More detailed, story-driven
  storyDriven: {
    name: 'story_driven',
    config: {
      systemPrompt: `Write a compelling cover letter that tells a story about the candidate's professional journey. 
      Focus on narrative and personal growth.`,
      temperature: 0.8,
      maxTokens: 1200,
      structure: ['hook', 'journey', 'achievement', 'alignment', 'vision']
    }
  },
  
  // Experiment B: Concise, bullet-point focused
  concise: {
    name: 'concise',
    config: {
      systemPrompt: `Generate a concise, bullet-point focused cover letter. 
      Be direct and highlight measurable achievements.`,
      temperature: 0.5,
      maxTokens: 600,
      structure: ['summary', 'bullets', 'closing']
    }
  },
  
  // Experiment C: Enthusiastic, culture-focused
  cultureFocused: {
    name: 'culture_focused',
    config: {
      systemPrompt: `Write an enthusiastic cover letter that emphasizes cultural fit 
      and passion for the company's mission.`,
      temperature: 0.75,
      maxTokens: 900,
      structure: ['excitement', 'culture_match', 'skills', 'contribution']
    }
  },
  
  // Experiment D: Data-driven, metric-heavy
  metricDriven: {
    name: 'metric_driven',
    config: {
      systemPrompt: `Write a data-driven cover letter focusing on quantifiable achievements 
      and specific metrics. Use numbers and percentages.`,
      temperature: 0.6,
      maxTokens: 800,
      structure: ['metric_highlight', 'impact', 'skills', 'results']
    }
  }
};

// Register prompt experiments
async function registerPromptExperiments(abTestingService) {
  const experiments = [
    {
      name: 'cover_letter_style',
      description: 'Testing different cover letter writing styles',
      variants: [
        { name: 'control', config: promptExperiments.default.config },
        { name: 'story_driven', config: promptExperiments.storyDriven.config },
        { name: 'concise', config: promptExperiments.concise.config },
        { name: 'culture_focused', config: promptExperiments.cultureFocused.config }
      ],
      targeting: {
        user_percentage: 60,
        min_resume_complete: true
      },
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      metrics: ['user_acceptance', 'edits_made', 'application_completion']
    },
    {
      name: 'cover_letter_length',
      description: 'Testing cover letter length impact on user engagement',
      variants: [
        { name: 'short', config: { ...promptExperiments.concise.config, maxTokens: 400 } },
        { name: 'medium', config: { ...promptExperiments.default.config, maxTokens: 800 } },
        { name: 'long', config: { ...promptExperiments.storyDriven.config, maxTokens: 1500 } }
      ],
      targeting: {
        user_percentage: 40,
        min_resume_complete: true
      },
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      metrics: ['time_to_accept', 'edit_rate', 'conversion']
    }
  ];
  
  for (const exp of experiments) {
    await abTestingService.registerExperiment(exp);
  }
  
  return experiments;
}

module.exports = { promptExperiments, registerPromptExperiments };
