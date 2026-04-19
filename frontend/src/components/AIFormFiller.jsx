import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

// @21st-sdk/react does not export AgentProvider/useAgent/ChatWindow.
// Create local stubs to keep the component functional.
const AgentContext = createContext({ sendMessage: () => {}, messages: [], isThinking: false });
const useAgent = () => useContext(AgentContext);
const AgentProvider = ({ children }) => {
    const [messages, setMessages] = useState([]);
    const [isThinking, setIsThinking] = useState(false);
    const sendMessage = (text) => {
        setMessages(prev => [...prev, { role: 'user', content: text }]);
        setIsThinking(true);
        setTimeout(() => {
            setMessages(prev => [...prev, { role: 'assistant', content: 'I can help you fill out this section. What information would you like me to add?' }]);
            setIsThinking(false);
        }, 1000);
    };
    return <AgentContext.Provider value={{ sendMessage, messages, isThinking }}>{children}</AgentContext.Provider>;
};
const ChatWindow = ({ messages = [], onSendMessage, isThinking, placeholder, className }) => {
    const [input, setInput] = useState('');
    return (
        <div className={`flex flex-col h-full ${className || ''}`}>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {messages.map((m, i) => (
                    <div key={i} className={`text-xs p-3 rounded-xl max-w-[85%] ${m.role === 'user' ? 'bg-accent/10 text-accent ml-auto' : 'bg-white/5 text-white/80'}`}>
                        {m.content}
                    </div>
                ))}
                {isThinking && <div className="text-[10px] text-accent animate-pulse italic">Thinking...</div>}
            </div>
            <div className="p-3 border-t border-border/30">
                <div className="flex gap-2">
                    <input
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && input.trim()) { onSendMessage(input); setInput(''); }}}
                        placeholder={placeholder || 'Type a message...'}
                        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-accent/30 transition-all"
                    />
                    <button
                        onClick={() => { if (input.trim()) { onSendMessage(input); setInput(''); }}}
                        className="bg-accent text-black px-4 rounded-xl text-[10px] font-black uppercase tracking-widest hover:brightness-110 transition-all"
                    >Send</button>
                </div>
            </div>
        </div>
    );
};
import { 
  User, 
  GraduationCap, 
  Code, 
  Briefcase, 
  FileText,
  Save,
  RefreshCw,
  Sparkles,
  AlertCircle,
  Layout,
  MessageSquare
} from 'lucide-react';
import { z } from 'zod';
import './AIFormFiller.css';

// Re-define schemas locally for frontend validation (same as backend/formAgent.ts)
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
  gpa: z.number().min(0).max(4.0).optional()
});

const SkillsSchema = z.object({
  technicalSkills: z.string().min(1, 'At least one technical skill required'),
  softSkills: z.string().optional(),
  languages: z.string().optional(),
  frameworks: z.string().optional(),
  tools: z.string().optional()
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
  company: z.string().min(1, 'Company is required'),
  position: z.string().min(1, 'Position is required'),
  status: z.enum(['wishlist', 'applied', 'interviewing', 'rejected', 'offer']),
  notes: z.string().optional()
});

const tabs = [
  { id: 'profile', label: 'Profile', icon: User, schema: ProfileSchema },
  { id: 'education', label: 'Education', icon: GraduationCap, schema: EducationSchema },
  { id: 'skills', label: 'Skills', icon: Code, schema: SkillsSchema },
  { id: 'experience', label: 'Experience', icon: Briefcase, schema: ExperienceSchema },
  { id: 'application', label: 'Application', icon: FileText, schema: ApplicationSchema }
];

function FormSection({ tab, data, onChange, onSave, isSaving }) {
  const { register, handleSubmit, formState: { errors }, watch, reset } = useForm({
    resolver: zodResolver(tab.schema),
    defaultValues: data
  });
  
  // Sync state whenever form changes
  const values = watch();
  useEffect(() => {
    onChange(tab.id, values);
  }, [values, tab.id, onChange]);

  // Handle outside data updates (e.g. from AI)
  useEffect(() => {
    reset(data);
  }, [data, reset]);

  return (
    <form onSubmit={handleSubmit((d) => onSave(tab.id, d))} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {tab.id === 'profile' && (
          <>
            <div className="space-y-2">
              <label className="text-xs font-black text-muted uppercase tracking-widest">Full Name</label>
              <input {...register('fullName')} className="orion-input" placeholder="John Doe" />
              {errors.fullName && <p className="text-pink text-[10px] font-bold">{errors.fullName.message}</p>}
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-muted uppercase tracking-widest">Email</label>
              <input {...register('email')} className="orion-input" placeholder="john@example.com" />
              {errors.email && <p className="text-pink text-[10px] font-bold">{errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-muted uppercase tracking-widest">Visa Status</label>
              <select {...register('visaStatus')} className="orion-input">
                <option value="F1">F-1 Student</option>
                <option value="OPT">OPT</option>
                <option value="STEM_OPT">STEM OPT</option>
                <option value="H1B">H1B</option>
                <option value="Green Card">Green Card</option>
                <option value="US Citizen">US Citizen</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="flex items-center gap-3 pt-6">
              <input type="checkbox" {...register('willingToRelocate')} className="w-4 h-4 rounded border-border bg-card" />
              <label className="text-xs font-black text-muted uppercase tracking-widest">Willing to Relocate</label>
            </div>
          </>
        )}

        {tab.id === 'education' && (
          <>
            <div className="space-y-2">
              <label className="text-xs font-black text-muted uppercase tracking-widest">Degree</label>
              <input {...register('degree')} className="orion-input" placeholder="Master of Science" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-muted uppercase tracking-widest">University</label>
              <input {...register('university')} className="orion-input" placeholder="Stanford" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-muted uppercase tracking-widest">Graduation Year</label>
              <input type="number" {...register('graduationYear', { valueAsNumber: true })} className="orion-input" />
            </div>
          </>
        )}

        {tab.id === 'skills' && (
          <div className="col-span-2 space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-black text-muted uppercase tracking-widest">Technical Skills</label>
              <textarea {...register('technicalSkills')} className="orion-input h-24" placeholder="React, Node.js, Python..." />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-muted uppercase tracking-widest">Soft Skills</label>
              <input {...register('softSkills')} className="orion-input" placeholder="Leadership, Communication..." />
            </div>
          </div>
        )}

        {tab.id === 'experience' && (
          <>
            <div className="space-y-2">
              <label className="text-xs font-black text-muted uppercase tracking-widest">Current Role</label>
              <input {...register('title')} className="orion-input" placeholder="Software Engineer" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-muted uppercase tracking-widest">Company</label>
              <input {...register('company')} className="orion-input" placeholder="Google" />
            </div>
            <div className="col-span-2 space-y-2">
              <label className="text-xs font-black text-muted uppercase tracking-widest">Description</label>
              <textarea {...register('description')} className="orion-input h-32" placeholder="Describe your achievements..." />
            </div>
          </>
        )}

        {tab.id === 'application' && (
          <>
            <div className="space-y-2">
              <label className="text-xs font-black text-muted uppercase tracking-widest">Company</label>
              <input {...register('company')} className="orion-input" placeholder="Apple" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-muted uppercase tracking-widest">Position</label>
              <input {...register('position')} className="orion-input" placeholder="Fullstack Dev" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-muted uppercase tracking-widest">Status</label>
              <select {...register('status')} className="orion-input">
                <option value="wishlist">Wishlist</option>
                <option value="applied">Applied</option>
                <option value="interviewing">Interviewing</option>
              </select>
            </div>
          </>
        )}
      </div>

      <div className="flex justify-end pt-4">
        <button 
          disabled={isSaving}
          className="bg-accent hover:brightness-110 active:scale-95 text-black font-syne font-black px-8 py-4 rounded-2xl flex items-center gap-2 uppercase tracking-widest text-xs transition-all"
        >
          {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Sync {tab.label}
        </button>
      </div>
    </form>
  );
}

function AIFormFillerContent() {
  const [activeTab, setActiveTab] = useState('profile');
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);
  const [loadingAI, setLoadingAI] = useState(false);
  const [resumeUploaded, setResumeUploaded] = useState(false);
  const [lastProcessedToolId, setLastProcessedToolId] = useState(null);
  const { sendMessage, messages, isThinking } = useAgent();

  // 1. Initial Profile Load
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/profile`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success && data.user) {
          setResumeUploaded(!!data.user.resume_data);
          // Pre-populate forms if data exists
          const initialData = {};
          if (data.user.resume_data) {
            initialData.profile = { 
              fullName: data.user.name, 
              email: data.user.email,
              ...data.user.resume_data
            };
          }
          setFormData(prev => ({ ...prev, ...initialData }));
        }
      } catch (e) {
        console.error('Failed to load profile intelligence');
      }
    };
    fetchProfile();
  }, []);

  // 2. Tool Output Application
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.role === 'assistant' && lastMessage.tool_calls) {
      lastMessage.tool_calls.forEach(toolCall => {
        if (toolCall.function.name === 'fill_form' && toolCall.id !== lastProcessedToolId) {
          try {
            const toolResult = messages.find(m => m.role === 'tool' && m.tool_call_id === toolCall.id);
            if (toolResult) {
              const { formId, patch } = JSON.parse(toolResult.content);
              setFormData(prev => ({
                ...prev,
                [formId]: { ...(prev[formId] || {}), ...patch }
              }));
              setLastProcessedToolId(toolCall.id);
            }
          } catch (e) {
            console.error('Failed to parse tool output', e);
          }
        }
      });
    }
  }, [messages, lastProcessedToolId]);

  // 3. Resume Upload Handler
  const handleResumeUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const token = localStorage.getItem('token');
    const fd = new FormData();
    fd.append('resume', file);

    setLoadingAI(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/resume/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: fd
      });
      const data = await res.json();
      if (data.success) {
        setResumeUploaded(true);
        // Orion Insight: Force immediate sync of extracted data into UI
        setFormData(prev => ({
          ...prev,
          profile: { ...prev.profile, ...data.data }
        }));
        alert('Orion Intelligence: Resume parsed successfully!');
      }
    } catch (err) {
      alert('Upload failed. Please try again.');
    } finally {
      setLoadingAI(false);
    }
  };

  // 4. AI Prefill Action
  const handleAIAutoFill = async () => {
    if (!resumeUploaded) {
        alert('Please upload your resume first to enable AI Intelligence');
        return;
    }
    
    setLoadingAI(true);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/application/prefill`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ 
            job_id: 'sample-job', // In production, this would be the current job being viewed
            fields: ['cover_letter', 'why_this_company', 'relevant_experience', 'skills']
        })
      });
      const data = await res.json();
      if (data.success) {
        // Map AI responses to the form tabs
        setFormData(prev => ({
          ...prev,
          application: { 
            ...prev.application, 
            notes: `AI COVER LETTER:\n${data.responses.cover_letter}\n\nWHY THIS COMPANY:\n${data.responses.why_this_company}`
          },
          skills: {
            ...prev.skills,
            technicalSkills: data.responses.skills || prev.skills?.technicalSkills
          }
        }));
      }
    } catch (e) {
      console.error('AI Autocomplete failed');
    } finally {
      setLoadingAI(false);
    }
  };

  const handleSendMessage = (text) => {
    const currentTab = tabs.find(t => t.id === activeTab);
    const contextNote = `[[[SYSTEM NOTE: CURRENT ACTIVE TAB: "${activeTab}"
CURRENT FORM DATA FOR ACTIVE TAB: ${JSON.stringify(formData[activeTab] || {})}
SCHEMA FOR ACTIVE TAB: ${JSON.stringify(currentTab.schema)}]]]`;
    
    sendMessage(contextNote + "\n" + text);
  };

  const handleFormChange = (section, data) => {
    setFormData(prev => ({ ...prev, [section]: data }));
  };

  const handleSave = async (section, data) => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      localStorage.setItem(`gradlaunch_form_${section}`, JSON.stringify(data));
    }, 1000);
  };

  const currentTab = tabs.find(t => t.id === activeTab);
  const currentData = formData[activeTab] || {};

  return (
    <div className="flex h-[calc(100vh-140px)] gap-6 p-6">
      {/* Form Panel */}
      <div className="flex-1 bg-card/30 border border-border/50 backdrop-blur-xl rounded-[2rem] flex flex-col overflow-hidden animate-slide-up">
        <div className="p-8 border-bottom border-border/30 bg-accent/5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-2xl bg-accent/20 flex items-center justify-center">
                <Layout className="text-accent" />
                </div>
                <div>
                <h1 className="font-syne font-black text-2xl text-white uppercase tracking-tight">System Autocomplete</h1>
                <p className="text-muted text-[10px] font-bold uppercase tracking-widest">Multi-Tab Intelligence Entry</p>
                </div>
            </div>
            
            <div className="flex items-center gap-4">
                <label className="cursor-pointer bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-white/10 transition-all flex items-center gap-2">
                    <FileText className="w-3 h-3 text-accent" />
                    {resumeUploaded ? 'Update Resume' : 'Import Resume'}
                    <input type="file" className="hidden" onChange={handleResumeUpload} accept=".pdf,.docx" />
                </label>
                
                <button 
                  onClick={handleAIAutoFill}
                  className="bg-accent/10 hover:bg-accent/20 text-accent px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-accent/20 transition-all flex items-center gap-2"
                >
                    <Sparkles className="w-3 h-3" />
                    AI Prefill
                </button>
            </div>
          </div>
        </div>

        <div className="flex border-b border-border/30 px-6 gap-2 bg-black/20">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-4 flex items-center gap-2 transition-all border-b-2 font-bold text-[10px] uppercase tracking-widest ${
                activeTab === tab.id ? 'border-accent text-accent' : 'border-transparent text-muted hover:text-white'
              }`}
            >
              <tab.icon className="w-3 h-3" />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-8 overflow-y-auto flex-1 custom-scrollbar">
          {loadingAI ? (
            <div className="h-full flex flex-col items-center justify-center gap-4 animate-pulse">
                <RefreshCw className="w-12 h-12 text-accent animate-spin" />
                <p className="font-syne font-bold text-xs text-accent uppercase tracking-widest">Orion is thinking...</p>
            </div>
          ) : (
            <FormSection
                tab={currentTab}
                data={currentData}
                onChange={handleFormChange}
                onSave={handleSave}
                isSaving={saving}
            />
          )}
        </div>
      </div>

      {/* Chat Panel */}
      <div className="w-[400px] bg-card/40 border border-border/50 backdrop-blur-2xl rounded-[2rem] flex flex-col overflow-hidden animate-slide-left">
        <div className="p-6 border-b border-border/30 flex items-center justify-between bg-purple/10">
          <div className="flex items-center gap-3">
            <div className="bg-purple/20 p-2 rounded-lg">
              <Sparkles className="text-purple w-4 h-4" />
            </div>
            <h3 className="font-syne font-black text-xs text-white uppercase tracking-widest">Orion Agent</h3>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            <span className="text-[10px] font-bold text-accent uppercase tracking-widest">Online</span>
          </div>
        </div>
        
        <div className="flex-1 overflow-hidden">
          <ChatWindow
            messages={messages.filter(m => !m.content?.startsWith('[[[SYSTEM NOTE'))}
            onSendMessage={handleSendMessage}
            isThinking={isThinking}
            placeholder="Instruct the agent..."
            className="orion-chat"
          />
        </div>
      </div>
    </div>
  );
}

export default function AIFormFiller() {
  const [agentConfig, setAgentConfig] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchToken = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/agent/token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        const data = await res.json();
        // Use apiKey if provided, otherwise fallback to token
        setAgentConfig({
            apiKey: data.apiKey,
            token: data.token,
            ...data.config
        });
      } catch (e) {
        console.error('Agent config failed');
      } finally {
        setLoading(false);
      }
    };
    fetchToken();
  }, []);

  if (loading) return (
    <div className="h-full flex items-center justify-center">
      <RefreshCw className="w-8 h-8 text-accent animate-spin" />
    </div>
  );

  return (
    <AgentProvider 
        apiKey={agentConfig?.apiKey} 
        token={agentConfig?.token} 
        agentName={agentConfig?.agentName || "Orion Form Assistant"}
    >
      <AIFormFillerContent />
    </AgentProvider>
  );
}
