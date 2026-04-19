const { agent, tool } = require('@21st-sdk/agent');
const { z } = require('zod');

// Define Zod schemas for form validation
const ProfileSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  linkedin: z.string().url().optional().or(z.literal('')),
  github: z.string().url().optional().or(z.literal('')),
  currentLocation: z.string().optional(),
  visaStatus: z.enum(['F1', 'OPT', 'STEM_OPT', 'H1B', 'Green Card', 'US Citizen', 'Other']),
  optEndDate: z.string().optional(),
  willingToRelocate: z.boolean().default(false),
  workAuthorization: z.string().optional()
});

const EducationSchema = z.object({
  degree: z.string().min(2, 'Degree is required'),
  fieldOfStudy: z.string().min(2, 'Field of study is required'),
  university: z.string().min(2, 'University name is required'),
  graduationYear: z.number().min(1990).max(2030),
  gpa: z.number().min(0).max(4.0).optional(),
  relevantCourses: z.array(z.string()).optional()
});

const SkillsSchema = z.object({
  technicalSkills: z.array(z.string()).min(1, 'At least one technical skill required'),
  softSkills: z.array(z.string()).optional(),
  languages: z.array(z.string()).optional(),
  frameworks: z.array(z.string()).optional(),
  tools: z.array(z.string()).optional()
});

const ExperienceSchema = z.object({
  title: z.string().min(2, 'Job title is required'),
  company: z.string().min(2, 'Company name is required'),
  location: z.string().optional(),
  startDate: z.string(),
  endDate: z.string().optional(),
  current: z.boolean().default(false),
  description: z.string().min(10, 'Please provide a description of your role')
});

const ApplicationSchema = z.object({
  jobId: z.string(),
  company: z.string(),
  position: z.string(),
  status: z.enum(['wishlist', 'applied', 'interviewing', 'rejected', 'offer']),
  notes: z.string().optional(),
  appliedDate: z.string().optional(),
  interviewDate: z.string().optional(),
  followUpDate: z.string().optional()
});

// Define the form filling tool
const fillFormTool = tool({
  name: 'fill_form',
  description: 'Fill fields for one of the forms (profile, education, skills, experience, application). Use this to update the UI.',
  parameters: z.object({
    formId: z.enum(['profile', 'education', 'skills', 'experience', 'application']),
    patch: z.record(z.unknown()).describe('The key-value pairs of fields to update in the active form.')
  }),
  execute: async ({ formId, patch }) => {
    // This JSON output will be parsed by the frontend to update the state
    return {
      content: [{ 
        type: 'text', 
        text: JSON.stringify({ formId, patch }) 
      }]
    };
  }
});

// Define the analyze_resume tool
const analyzeResumeTool = tool({
  name: 'analyze_resume',
  description: 'Analyze a resume to extract skills, experience, and education',
  parameters: z.object({
    resumeText: z.string().describe('The resume text to analyze'),
    targetRole: z.string().optional().describe('Target job role for optimization')
  }),
  execute: async ({ resumeText, targetRole }, context) => {
    return {
      success: true,
      extractedSkills: ['React', 'Node.js', 'Python'],
      yearsExperience: 3,
      education: 'Master of Science in Computer Science',
      suggestions: [
        'Add more quantifiable achievements',
        'Highlight leadership experience',
        'Include relevant certifications'
      ]
    };
  }
});

// Create the AI Agent
function createFormAgent() {
  const formAgent = agent({
    model: "claude-sonnet-4-6",
    name: 'Form Assistant',
    description: 'An AI assistant that helps fill out job application forms',
    tools: {
        fill_form: fillFormTool,
        analyze_resume: analyzeResumeTool
    },
    systemPrompt: `You are a form-filling assistant for GradLaunch, a platform for international students. 
Your goal is to help users fill out their profile, education, skills, and experience tabs.

COMMANDS:
- To fill fields, use the "fill_form" tool with the appropriate "formId" and a "patch" object.
- You can work across multiple tabs. If the user asks to "Fill out my profile and education", call the tool for each section.

SCHEMA REFERENCE:
- profile: { fullName, email, phone, visaStatus, willingToRelocate }
- education: { degree, university, graduationYear }
- skills: { technicalSkills, softSkills }
- experience: { title, company, description }
- application: { company, position, status }

GUIDELINES:
1. Always be professional and supportive.
2. If data is missing, ask the user politely.
3. For visa-related questions (F1, OPT, STEM OPT), be precise.
4. The user's current form data and active tab will be provided in a SYSTEM NOTE. Read it carefully.`,
    temperature: 0.7,
    maxTokens: 2000
  });
  
  return formAgent;
}

module.exports = { createFormAgent, ProfileSchema, EducationSchema, SkillsSchema, ExperienceSchema, ApplicationSchema };
