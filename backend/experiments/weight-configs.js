/**
 * A/B Test: Weight Configurations for Matching Engine
 */

const weightExperiments = {
  // Default configuration (Control)
  default: {
    name: 'default',
    config: {
      skills: 0.35,
      experience: 0.25,
      education: 0.20,
      location: 0.10,
      industry: 0.10
    }
  },
  
  // Experiment A: More emphasis on skills (40%)
  skillFocused: {
    name: 'skill_focused',
    config: {
      skills: 0.40,
      experience: 0.25,
      education: 0.15,
      location: 0.10,
      industry: 0.10
    }
  },
  
  // Experiment B: More emphasis on experience (35%)
  experienceFocused: {
    name: 'experience_focused',
    config: {
      skills: 0.30,
      experience: 0.35,
      education: 0.15,
      location: 0.10,
      industry: 0.10
    }
  },
  
  // Experiment C: Include remote work preference (new weight)
  remoteOptimized: {
    name: 'remote_optimized',
    config: {
      skills: 0.30,
      experience: 0.20,
      education: 0.15,
      location: 0.20,  // Increased location weight for remote preference
      industry: 0.15
    }
  },
  
  // Experiment D: Balanced with education emphasis
  educationFocused: {
    name: 'education_focused',
    config: {
      skills: 0.30,
      experience: 0.20,
      education: 0.30,
      location: 0.10,
      industry: 0.10
    }
  }
};

// Register all experiments
async function registerWeightExperiments(abTestingService) {
  const experiments = [
    {
      name: 'weight_config_skill_vs_experience',
      description: 'Testing skill-focused vs experience-focused matching weights',
      variants: [
        { name: 'control', config: weightExperiments.default.config },
        { name: 'skill_focused', config: weightExperiments.skillFocused.config },
        { name: 'experience_focused', config: weightExperiments.experienceFocused.config }
      ],
      targeting: {
        user_percentage: 50,
        min_resume_complete: true,
        user_tier: ['free', 'premium']
      },
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      metrics: ['match_accuracy', 'user_engagement', 'application_rate']
    },
    {
      name: 'weight_config_remote_optimized',
      description: 'Testing remote-optimized weight configuration',
      variants: [
        { name: 'control', config: weightExperiments.default.config },
        { name: 'remote_optimized', config: weightExperiments.remoteOptimized.config }
      ],
      targeting: {
        user_percentage: 30,
        remote_preference: true,
        min_resume_complete: true
      },
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      metrics: ['match_accuracy', 'remote_job_acceptance']
    }
  ];
  
  for (const exp of experiments) {
    await abTestingService.registerExperiment(exp);
  }
  
  return experiments;
}

module.exports = { weightExperiments, registerWeightExperiments };
