import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Bot, 
  User, 
  Sparkles, 
  RefreshCw, 
  Copy, 
  Check, 
  Trash2, 
  AlertTriangle, 
  ChevronRight, 
  BookOpen, 
  GraduationCap, 
  Users, 
  Building2, 
  Cpu, 
  ArrowDown,
  FileText,
  Mic,
  MicOff,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { MathScienceRenderer } from './MathScienceRenderer';
import { useVoiceDictation } from '../../hooks/useVoiceDictation';
import { useAuth } from '../../context/AuthContext';
import { SchoolDataIntelligenceService, QueryContext } from '../../services/schoolDataIntelligenceService';

export type UserRole = 'teacher' | 'student' | 'parent' | 'school_admin' | 'platform_owner' | string;

export interface AIChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  isError?: boolean;
}

export interface SuggestedPrompt {
  label: string;
  category?: string;
  prompt: string;
}

export interface AIChatProps {
  userRole?: UserRole;
  userName?: string;
  schoolName?: string;
  initialPrompts?: SuggestedPrompt[];
  className?: string;
  title?: string;
  subtitle?: string;
  onSendMessage?: (message: string) => void;
  storageKey?: string;
}

interface RolePersonaConfig {
  title: string;
  shortRole: string;
  badge: string;
  heading: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  prompts: SuggestedPrompt[];
}

const getRoleConfig = (role: UserRole): RolePersonaConfig => {
  const normalized = (role || '').toLowerCase();

  switch (normalized) {
    case 'teacher':
      return {
        title: 'EDUkenZA Teaching Assistant',
        shortRole: 'Teacher',
        badge: 'Teacher Academic Co-Pilot',
        heading: 'How can I assist your teaching today?',
        subtitle: 'CAPS-aligned lesson plans, cognitive-level assessment rubrics, worksheets, and teacher marking memoranda.',
        icon: GraduationCap,
        prompts: [
          {
            label: 'Generate Lesson Plan',
            category: 'Curriculum',
            prompt: 'Create a comprehensive Grade 10 CAPS-aligned lesson plan for Quadratic Functions including lesson phases, teaching objectives, and formative assessment questions.'
          },
          {
            label: 'Create Worksheet & Memo',
            category: 'Assessment',
            prompt: 'Draft a 20-mark Grade 11 Physical Sciences worksheet on Newton\'s Second Law with a complete step-by-step teacher marking memorandum.'
          },
          {
            label: 'Assessment Rubric',
            category: 'Evaluation',
            prompt: 'Generate a 40-mark assessment rubric for a Grade 12 English Home Language discursive essay with detailed criteria across 4 cognitive achievement levels.'
          },
          {
            label: 'Differentiated Exercise',
            category: 'Pedagogy',
            prompt: 'Create 3 tiers of math practice problems (Support, Core, Extension) on Factorisation with full worked steps for each tier.'
          }
        ]
      };

    case 'student':
      return {
        title: 'EDUkenZA Learning Assistant',
        shortRole: 'Student',
        badge: 'Personal Academic Tutor',
        heading: 'What subject would you like to master today?',
        subtitle: 'Step-by-step problem solving with LaTeX formulas, conceptual deep dives, and CAPS revision guides.',
        icon: BookOpen,
        prompts: [
          {
            label: 'Solve Math Problem',
            category: 'Mathematics',
            prompt: 'Solve $x^2 - 7x + 12 = 0$ step-by-step using: 1. Given, 2. Formula, 3. Working, 4. Final Solution.'
          },
          {
            label: 'Explain Concept Simply',
            category: 'Science',
            prompt: 'Explain Photosynthesis and the Light-Independent (Calvin) cycle simply with real-world analogies and balanced chemical equations.'
          },
          {
            label: 'Generate Practice Quiz',
            category: 'Exam Prep',
            prompt: 'Create a 5-question multiple choice revision quiz on CAPS Grade 10 Accounting with detailed explanations for each correct answer.'
          },
          {
            label: 'Study Summary & Key Formulas',
            category: 'Revision',
            prompt: 'Summarize key formulas, definitions, and SI units for Grade 12 Electric Circuits and Ohm\'s Law.'
          }
        ]
      };

    case 'parent':
      return {
        title: 'EDUkenZA Family Support Assistant',
        shortRole: 'Parent',
        badge: 'Home Education Partner',
        heading: 'How can we support your child\'s learning?',
        subtitle: 'Empathetic guidance on academic reports, supportive home study habits, and curriculum clarity.',
        icon: Users,
        prompts: [
          {
            label: 'Explain Academic Report',
            category: 'Progress',
            prompt: 'How can I constructively discuss a Term report with my high school child when Mathematics has dropped by 8%?'
          },
          {
            label: 'Homework Guidance Strategies',
            category: 'Home Support',
            prompt: 'Give me practical, encouraging strategies to support my Grade 8 child with independent homework routines without causing frustration.'
          },
          {
            label: 'Weekly Study Timetable',
            category: 'Planning',
            prompt: 'Draft a balanced 5-day home study schedule for a secondary school learner preparing for mid-year examinations.'
          },
          {
            label: 'Subject Choice Advice',
            category: 'Career & CAPS',
            prompt: 'Explain the difference between Mathematics and Mathematical Literacy for Grade 10 subject choices and senior high tertiary entry requirements.'
          }
        ]
      };

    case 'school_admin':
      return {
        title: 'EDUkenZA Administrative Assistant',
        shortRole: 'School Admin',
        badge: 'Executive School Operations',
        heading: 'Administrative & Leadership Support',
        subtitle: 'Policy formulation, official school circulars, compliance checklists, and SGB report frameworks.',
        icon: Building2,
        prompts: [
          {
            label: 'Draft Parent Circular',
            category: 'Communications',
            prompt: 'Draft an official Parent Circular from the Office of the Principal announcing the upcoming Term Examination Timetable and venue regulations.'
          },
          {
            label: 'SGB Academic Report Outline',
            category: 'Governance',
            prompt: 'Create a formal strategic review outline for the School Governing Body (SGB) covering pass rate targets, STEM support, and teacher professional development.'
          },
          {
            label: 'Attendance Policy Framework',
            category: 'Operations',
            prompt: 'Draft a 3-tier school attendance policy framework detailing early-warning triggers, chronic absenteeism interventions, and parental engagement steps.'
          },
          {
            label: 'Curriculum Audit Checklist',
            category: 'Compliance',
            prompt: 'Provide an administrative audit checklist for verifying CAPS curriculum pacing and syllabus completion across all academic departments.'
          }
        ]
      };

    case 'platform_owner':
      return {
        title: 'EDUkenZA Platform Assistant',
        shortRole: 'Platform Owner',
        badge: 'Enterprise Platform Governance',
        heading: 'Platform Architecture & EdTech Strategy',
        subtitle: 'Institutional frameworks, data privacy compliance, multi-campus governance, and technical strategies.',
        icon: Cpu,
        prompts: [
          {
            label: 'Data Privacy & POPIA Audit',
            category: 'Compliance',
            prompt: 'Create a compliance checklist for safeguarding student biometric, academic, and financial records under South African POPIA regulations.'
          },
          {
            label: 'EdTech Adoption Strategy',
            category: 'Deployment',
            prompt: 'Outline a change management strategy for training teachers and onboarding 1,500+ students onto a digital learning management system.'
          },
          {
            label: 'Multi-Campus Quality Framework',
            category: 'Governance',
            prompt: 'Draft an academic quality assurance framework for monitoring academic parity and teacher resources across multiple independent campuses.'
          },
          {
            label: 'School Analytics KPI Blueprint',
            category: 'Analytics',
            prompt: 'Provide a structured KPI dashboard blueprint for measuring school retention rates, STEM performance, and fee recovery efficiency.'
          }
        ]
      };

    default:
      return {
        title: 'EDUkenZA Educational Assistant',
        shortRole: 'Academic AI',
        badge: 'Smart Educational Assistant',
        heading: 'How can I assist your educational journey?',
        subtitle: 'Ask any academic question, solve mathematical equations, or structure teaching resources.',
        icon: Sparkles,
        prompts: [
          {
            label: 'Explain Educational Topic',
            category: 'Learning',
            prompt: 'Explain the concept of Plate Tectonics and continental drift with clear diagrams and real-world examples.'
          },
          {
            label: 'Solve Step-by-Step Problem',
            category: 'STEM',
            prompt: 'Calculate the resultant velocity of an object moving north at 12 m/s and east at 5 m/s with a full vector diagram description.'
          },
          {
            label: 'Draft Structured Document',
            category: 'Writing',
            prompt: 'Draft a structured academic essay outline examining renewable energy transitions in developing economies.'
          },
          {
            label: 'Create Revision Flashcards',
            category: 'Study',
            prompt: 'Generate 5 high-yield revision flashcards on the human circulatory system with Question, Answer, and Memory Hook.'
          }
        ]
      };
  }
};

export const AIChat: React.FC<AIChatProps> = ({
  userRole = 'student',
  userName,
  schoolName = 'EDUkenZA Academy',
  initialPrompts,
  className = '',
  title,
  subtitle,
  onSendMessage,
  storageKey
}) => {
  const persona = getRoleConfig(userRole);
  const activeTitle = title || persona.title;
  const activeSubtitle = subtitle || persona.subtitle;
  const RoleIcon = persona.icon;

  const resolvedStorageKey = storageKey || `edukenza_aichat_${userRole}`;
  const { currentUser } = useAuth();
  const queryContextRef = useRef<QueryContext>({});

  // Messages State
  const [messages, setMessages] = useState<AIChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem(resolvedStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // Ignore storage read errors
    }
    return [];
  });

  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  // Voice Dictation Hook
  const {
    isSupported: isVoiceSupported,
    state: voiceState,
    isListening,
    interimTranscript,
    errorMessage: voiceErrorMessage,
    toggleListening: toggleVoiceListening,
    stopListening: stopVoiceListening,
    resetError: resetVoiceError
  } = useVoiceDictation({
    language: 'en-US',
    enableAcademicFormatting: true,
    onFinalResult: (finalText) => {
      if (!finalText.trim()) return;
      const textarea = textareaRef.current;
      if (textarea && textarea.selectionStart !== undefined) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        setInput(prev => {
          const before = prev.substring(0, start);
          const after = prev.substring(end);
          const needsSpaceBefore = before.length > 0 && !before.endsWith(' ') && !before.endsWith('\n');
          const needsSpaceAfter = after.length > 0 && !after.startsWith(' ') && !after.startsWith('\n');
          const isNewSentence = before.trim().length === 0 || /[.!?:]\s*$/.test(before);
          const textToInsert = isNewSentence ? finalText : (finalText.charAt(0).toLowerCase() + finalText.slice(1));
          const insertion = `${needsSpaceBefore ? ' ' : ''}${textToInsert}${needsSpaceAfter ? ' ' : ''}`;
          const newPos = start + insertion.length;
          setTimeout(() => {
            if (textareaRef.current) {
              textareaRef.current.focus();
              textareaRef.current.setSelectionRange(newPos, newPos);
            }
          }, 0);
          return before + insertion + after;
        });
      } else {
        setInput(prev => {
          if (!prev.trim()) return finalText;
          const isNewSentence = /[.!?:]\s*$/.test(prev);
          const textToInsert = isNewSentence ? finalText : (finalText.charAt(0).toLowerCase() + finalText.slice(1));
          const needsSpace = !prev.endsWith(' ') && !prev.endsWith('\n');
          return `${prev}${needsSpace ? ' ' : ''}${textToInsert}`;
        });
      }
    }
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync to local storage
  useEffect(() => {
    try {
      localStorage.setItem(resolvedStorageKey, JSON.stringify(messages));
    } catch {
      // Ignore storage write errors
    }
  }, [messages, resolvedStorageKey]);

  // Auto-scroll when new messages arrive
  const scrollToBottom = (smooth = true) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
    }
  };

  useEffect(() => {
    if (!showScrollBottom) {
      scrollToBottom();
    }
  }, [messages, isThinking]);

  // Handle scroll detection
  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    setShowScrollBottom(distanceFromBottom > 120);
  };

  // Adjust textarea height dynamically
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  };

  // Send Message Logic with Streaming
  const handleSend = async (textToSend?: string) => {
    const prompt = (textToSend || input).trim();
    if (!prompt || isThinking) return;

    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    if (onSendMessage) {
      onSendMessage(prompt);
    }

    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const userMessage: AIChatMessage = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: prompt,
      timestamp: timeStr
    };

    const assistantPlaceholderId = `ast-${Date.now() + 1}`;
    const assistantPlaceholder: AIChatMessage = {
      id: assistantPlaceholderId,
      role: 'assistant',
      content: '',
      timestamp: timeStr
    };

    setMessages(prev => [...prev, userMessage, assistantPlaceholder]);
    setIsThinking(true);

    try {
      // 1. Process via SchoolDataIntelligenceService for real data queries
      const dataResult = await SchoolDataIntelligenceService.processDataQuery({
        prompt,
        clientUser: currentUser,
        history: messages.slice(-6).map(m => ({ role: m.role, content: m.content })),
        context: queryContextRef.current
      });

      if (dataResult.updatedContext) {
        queryContextRef.current = dataResult.updatedContext;
      }

      // Test 12, 13, 14, 15, 16, 22, 23, 24: Unauthorized / Access Denied
      if (dataResult.isSchoolDataQuery && !dataResult.isAuthorized) {
        const denialText = dataResult.summaryAnswer || "ACCESS DENIED: You don't have permission to access that information.";
        setMessages(prev => prev.map(m => 
          m.id === assistantPlaceholderId ? { ...m, content: denialText } : m
        ));
        setIsThinking(false);
        return;
      }

      // Test 17: Ambiguous Query
      if (dataResult.isSchoolDataQuery && dataResult.isAmbiguous) {
        const clarText = dataResult.clarificationPrompt || "Do you mean students, teachers, parents, or another group in your school?";
        setMessages(prev => prev.map(m => 
          m.id === assistantPlaceholderId ? { ...m, content: clarText } : m
        ));
        setIsThinking(false);
        return;
      }

      const historyPayload = messages.slice(-6).map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }]
      }));

      // Pass authoritative facts if retrieved from real database records
      const authoritativeFacts = dataResult.systemContextPrompt || (dataResult.isSchoolDataQuery ? dataResult.summaryAnswer : undefined);

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          history: historyPayload,
          userRole,
          schoolName: currentUser?.schoolName || schoolName,
          authoritativeFacts
        })
      });

      if (!res.ok) {
        // Fallback to real database calculated summary if AI service is unavailable
        if (dataResult.isSchoolDataQuery && dataResult.summaryAnswer) {
          setMessages(prev => prev.map(m => 
            m.id === assistantPlaceholderId ? { ...m, content: dataResult.summaryAnswer! } : m
          ));
          setIsThinking(false);
          return;
        }
        throw new Error(`AI Gateway responded with HTTP status ${res.status}`);
      }

      if (!res.body) {
        if (dataResult.isSchoolDataQuery && dataResult.summaryAnswer) {
          setMessages(prev => prev.map(m => 
            m.id === assistantPlaceholderId ? { ...m, content: dataResult.summaryAnswer! } : m
          ));
          setIsThinking(false);
          return;
        }
        throw new Error('Readable stream not supported by browser environment.');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let accumulatedText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.replace('data: ', '').trim();
            if (dataStr === '[DONE]') continue;

            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.text) {
                accumulatedText += parsed.text;
                setMessages(prev => prev.map(m => 
                  m.id === assistantPlaceholderId ? { ...m, content: accumulatedText } : m
                ));
              } else if (parsed.error) {
                throw new Error(parsed.error);
              }
            } catch (err: any) {
              if (err.message && !err.message.includes('JSON')) {
                throw err;
              }
            }
          }
        }
      }

      if (!accumulatedText.trim()) {
        const fallback = (dataResult.isSchoolDataQuery && dataResult.summaryAnswer)
          ? dataResult.summaryAnswer
          : 'Educational analysis completed.';
        setMessages(prev => prev.map(m => 
          m.id === assistantPlaceholderId 
            ? { ...m, content: fallback } 
            : m
        ));
      }
    } catch (err: any) {
      console.error('[EDUkenZA AIChat Diagnostic Log]:', err);
      setMessages(prev => prev.map(m => 
        m.id === assistantPlaceholderId 
          ? { 
              ...m, 
              isError: true, 
              content: 'EDUkenZA AI is temporarily unavailable. Please try again.' 
            } 
          : m
      ));
    } finally {
      setIsThinking(false);
    }
  };

  // Retry on error
  const handleRetry = (errorIndex: number) => {
    if (isThinking) return;
    const userMsg = messages.slice(0, errorIndex).reverse().find(m => m.role === 'user');
    if (!userMsg) return;

    // Filter out the failed message
    setMessages(prev => prev.filter((_, idx) => idx !== errorIndex));
    handleSend(userMsg.content);
  };

  // Copy text helper
  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Clear chat
  const handleClearChat = () => {
    if (window.confirm('Are you sure you want to clear this chat history?')) {
      setMessages([]);
      try {
        localStorage.removeItem(resolvedStorageKey);
      } catch {
        // Ignore
      }
    }
  };

  const activePrompts = initialPrompts || persona.prompts;

  return (
    <div className={`flex flex-col h-[700px] max-h-[90vh] bg-white rounded-3xl border border-slate-200/90 shadow-xl overflow-hidden relative font-sans ${className}`}>
      
      {/* CHAT HEADER */}
      <header className="px-5 py-4 bg-gradient-to-r from-[#002147] via-[#002b5c] to-[#002147] text-white flex items-center justify-between border-b border-[#D4AF37]/30 shrink-0 z-10">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-[#001733] border border-[#D4AF37]/60 flex items-center justify-center text-[#D4AF37] shadow-inner shrink-0">
            <RoleIcon className="w-5 h-5 text-[#D4AF37]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-extrabold text-sm md:text-base tracking-tight text-white flex items-center gap-1.5">
                {activeTitle}
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#D4AF37] text-[10px] font-bold tracking-wide uppercase">
                {persona.badge}
              </span>
            </div>
            <p className="text-[11px] text-slate-300 line-clamp-1 max-w-md mt-0.5">
              {schoolName} • CAPS & International Standards
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {messages.length > 0 && (
            <button
              onClick={handleClearChat}
              className="p-2 text-slate-300 hover:text-rose-300 hover:bg-white/10 rounded-xl transition cursor-pointer text-xs flex items-center gap-1 font-medium"
              title="Clear Conversation"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">Clear</span>
            </button>
          )}
        </div>
      </header>

      {/* MESSAGES & CONTENT SCROLL CONTAINER */}
      <div 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 bg-slate-50/50 scrollbar-thin scrollbar-thumb-slate-300 relative"
      >
        {/* EMPTY STATE SCREEN */}
        {messages.length === 0 && !isThinking && (
          <div className="my-auto py-6 max-w-3xl mx-auto space-y-6 animate-fadeIn">
            
            {/* HERO CARD */}
            <div className="p-6 md:p-8 bg-white border border-slate-200/90 rounded-3xl shadow-xs space-y-5 text-left">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-[#002147] border-2 border-[#D4AF37] flex items-center justify-center text-[#D4AF37] shadow-sm shrink-0">
                  <RoleIcon className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <span className="inline-block px-3 py-1 rounded-full bg-[#002147]/10 text-[#002147] font-bold text-xs uppercase tracking-wider">
                    {persona.shortRole} Mode Active
                  </span>
                  <h3 className="text-xl md:text-2xl font-black text-[#002147] tracking-tight">
                    {persona.heading}
                  </h3>
                  <p className="text-xs md:text-sm text-slate-600 font-normal leading-relaxed">
                    {activeSubtitle}
                  </p>
                </div>
              </div>

              {/* CURRICULUM BADGES */}
              <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-100 text-[11px] font-medium text-slate-600">
                <span className="px-2.5 py-1 bg-slate-100 rounded-lg">CAPS Aligned (Grades R–12)</span>
                <span className="px-2.5 py-1 bg-slate-100 rounded-lg">Full KaTeX & LaTeX Formulas</span>
                <span className="px-2.5 py-1 bg-slate-100 rounded-lg">Bloom’s Taxonomy Objectives</span>
                <span className="px-2.5 py-1 bg-slate-100 rounded-lg">No Fabricated School Data</span>
              </div>
            </div>

            {/* CONTEXT-AWARE SUGGESTED PROMPTS GRID */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
                  Suggested starting prompts for your role:
                </h4>
                <span className="text-[11px] text-slate-400 font-medium">Click any prompt to begin</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {activePrompts.map((p, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(p.prompt)}
                    className="p-4 bg-white hover:bg-slate-50/80 border border-slate-200/90 hover:border-[#002147]/40 rounded-2xl text-left transition shadow-2xs group cursor-pointer flex flex-col justify-between space-y-2.5"
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-bold text-xs text-[#002147] group-hover:text-[#003366] flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]" />
                        {p.label}
                      </span>
                      <span className="p-1 rounded-lg bg-slate-100 group-hover:bg-[#002147] text-slate-400 group-hover:text-[#D4AF37] transition-colors">
                        <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                      </span>
                    </div>
                    {p.category && (
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        {p.category}
                      </span>
                    )}
                    <p className="text-xs text-slate-500 line-clamp-2 leading-snug">
                      "{p.prompt}"
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* MESSAGES LIST */}
        {messages.map((msg, idx) => {
          const isUser = msg.role === 'user';

          return (
            <div
              key={msg.id}
              className={`flex gap-3.5 w-full ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              {/* AI AVATAR */}
              {!isUser && (
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-[#002147] to-[#0b3c5d] border border-[#D4AF37]/50 text-[#D4AF37] flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                  <Bot className="w-5 h-5 text-[#D4AF37]" />
                </div>
              )}

              {/* MESSAGE CONTENT BUBBLE */}
              <div
                className={`w-full max-w-3xl space-y-2 ${
                  isUser ? 'items-end' : 'items-start'
                }`}
              >
                <div
                  className={`p-4 md:p-5 rounded-3xl shadow-xs text-xs md:text-sm leading-relaxed ${
                    isUser
                      ? 'bg-[#002147] text-white rounded-tr-none ml-auto border border-[#002147]'
                      : 'bg-white text-slate-800 rounded-tl-none border border-slate-200/90'
                  }`}
                >
                  {/* MESSAGE META HEADER */}
                  <div className={`flex items-center justify-between text-[11px] font-mono pb-2 mb-2 border-b ${
                    isUser ? 'border-white/20 text-white/80' : 'border-slate-100 text-slate-400'
                  }`}>
                    <span className="font-bold">
                      {isUser ? (userName || 'You') : persona.title}
                    </span>
                    <span>{msg.timestamp}</span>
                  </div>

                  {/* BODY CONTENT */}
                  {isUser ? (
                    <div className="whitespace-pre-wrap font-medium text-white/95">
                      {msg.content}
                    </div>
                  ) : msg.isError ? (
                    <div className="p-4 bg-amber-50/90 border border-amber-200/90 rounded-2xl space-y-3 text-slate-800">
                      <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                        <span>EDUkenZA AI Service Notice</span>
                      </div>
                      <p className="text-xs text-slate-700 font-medium">
                        EDUkenZA AI is temporarily unavailable. Please try again.
                      </p>
                      <button
                        onClick={() => handleRetry(idx)}
                        className="px-3.5 py-1.5 bg-[#002147] hover:bg-[#003366] text-white rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                      >
                        <RefreshCw className="w-3.5 h-3.5 text-[#D4AF37]" />
                        <span>Retry Prompt</span>
                      </button>
                    </div>
                  ) : (
                    <div className="text-slate-800 w-full min-w-0">
                      <MathScienceRenderer content={msg.content || ''} />
                    </div>
                  )}
                </div>

                {/* AI MESSAGE ACTION TOOLBAR */}
                {!isUser && msg.content && !msg.isError && (
                  <div className="flex items-center gap-2 text-[11px] text-slate-400 px-1">
                    <button
                      onClick={() => handleCopy(msg.id, msg.content)}
                      className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-600 font-medium transition cursor-pointer flex items-center gap-1 shadow-2xs"
                      title="Copy response"
                    >
                      {copiedId === msg.id ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span className="text-emerald-600 font-bold">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 text-slate-500" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* USER AVATAR */}
              {isUser && (
                <div className="w-9 h-9 rounded-2xl bg-[#002147] text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5 font-bold text-xs">
                  <User className="w-5 h-5" />
                </div>
              )}
            </div>
          );
        })}

        {/* ANIMATED THINKING INDICATOR */}
        {isThinking && (
          <div className="flex gap-3.5 items-center w-full max-w-3xl animate-fadeIn">
            <div className="w-9 h-9 rounded-2xl bg-[#002147] border border-[#D4AF37]/50 text-[#D4AF37] flex items-center justify-center shrink-0 shadow-xs">
              <Bot className="w-5 h-5 text-[#D4AF37] animate-pulse" />
            </div>
            <div className="px-5 py-3.5 bg-white border border-slate-200/90 rounded-3xl rounded-tl-none text-xs text-slate-700 flex items-center gap-3.5 shadow-xs">
              <div className="flex gap-1.5 items-center">
                <span className="w-2 h-2 rounded-full bg-[#002147] animate-bounce [animation-delay:-0.3s]" />
                <span className="w-2 h-2 rounded-full bg-[#D4AF37] animate-bounce [animation-delay:-0.15s]" />
                <span className="w-2 h-2 rounded-full bg-[#002147] animate-bounce" />
              </div>
              <div>
                <span className="font-extrabold text-[#002147] block text-xs">
                  EDUkenZA AI is thinking...
                </span>
                <span className="text-[10px] text-slate-500 font-medium">
                  Formulating educational breakdown and KaTeX equations
                </span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* FLOATING SCROLL TO BOTTOM BUTTON */}
      {showScrollBottom && (
        <button
          onClick={() => scrollToBottom(true)}
          className="absolute bottom-24 left-1/2 -translate-x-1/2 px-3.5 py-1.5 bg-[#002147] text-white rounded-full font-bold text-xs shadow-lg flex items-center gap-1.5 border border-[#D4AF37] hover:bg-[#003366] transition cursor-pointer z-20"
        >
          <ArrowDown className="w-3.5 h-3.5 text-[#D4AF37]" />
          <span>Jump to Latest</span>
        </button>
      )}

      {/* CHAT INPUT AREA */}
      <div className="p-4 bg-white border-t border-slate-200/90 space-y-2 shrink-0">
        {/* VOICE LISTENING INTERIM STATUS BAR */}
        {isListening && (
          <div className="bg-[#002147] text-white px-4 py-2 rounded-2xl flex items-center justify-between shadow-md border border-[#D4AF37]/50 text-xs animate-in fade-in">
            <div className="flex items-center gap-2 overflow-hidden">
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
              </span>
              <span className="font-bold text-[#D4AF37] shrink-0">Listening...</span>
              {interimTranscript ? (
                <span className="text-slate-100 italic font-mono bg-white/10 px-2 py-0.5 rounded-lg truncate">
                  "{interimTranscript}..."
                </span>
              ) : (
                <span className="text-slate-300 text-[11px] truncate">
                  Speak clearly into your microphone
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={stopVoiceListening}
              className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold rounded-xl transition cursor-pointer shrink-0 ml-2"
            >
              Stop
            </button>
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-end gap-2 bg-slate-50 border border-slate-200/90 rounded-2xl p-2 focus-within:border-[#002147] focus-within:ring-2 focus-within:ring-[#002147]/10 transition"
        >
          {/* Voice Dictation Button */}
          <button
            type="button"
            onClick={() => {
              if (voiceErrorMessage) resetVoiceError();
              toggleVoiceListening();
            }}
            disabled={!isVoiceSupported}
            aria-label={
              !isVoiceSupported
                ? 'Voice dictation is not supported in this browser'
                : isListening
                ? 'Stop voice dictation'
                : voiceState === 'processing'
                ? 'Initializing microphone...'
                : 'Start voice dictation'
            }
            aria-pressed={isListening}
            title={
              !isVoiceSupported
                ? 'Voice dictation is not supported in this browser'
                : isListening
                ? 'Listening... Click to stop voice dictation'
                : voiceState === 'processing'
                ? 'Connecting to microphone...'
                : 'Click to dictate prompt via microphone'
            }
            className={`p-3 rounded-xl transition cursor-pointer flex items-center justify-center relative shrink-0 ${
              !isVoiceSupported
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : isListening
                ? 'bg-red-600 text-white shadow-md shadow-red-500/30 ring-2 ring-red-400'
                : voiceState === 'processing'
                ? 'bg-amber-400 text-slate-900 animate-pulse'
                : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
            }`}
          >
            {isListening && (
              <span className="absolute -inset-1 rounded-xl bg-red-500/30 animate-ping pointer-events-none" />
            )}
            {voiceState === 'processing' ? (
              <Loader2 className="w-4 h-4 animate-spin text-slate-900" />
            ) : isListening ? (
              <MicOff className="w-4 h-4 text-white" />
            ) : (
              <Mic className="w-4 h-4 text-[#002147]" />
            )}
          </button>

          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={`Ask ${persona.shortRole} AI anything (e.g. solve equations, lesson plans, explanations)...`}
            rows={1}
            disabled={isThinking}
            className="flex-1 bg-transparent border-0 resize-none text-xs md:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-0 p-2 min-h-[40px] max-h-[160px] leading-relaxed"
          />

          <button
            type="submit"
            disabled={!input.trim() || isThinking}
            className={`p-3 rounded-xl font-bold flex items-center justify-center transition cursor-pointer shadow-xs shrink-0 ${
              input.trim() && !isThinking
                ? 'bg-[#002147] hover:bg-[#003366] text-[#D4AF37]'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
            title="Send prompt (Enter)"
          >
            {isThinking ? (
              <RefreshCw className="w-4 h-4 animate-spin text-slate-400" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </form>

        <div className="flex items-center justify-between text-[10px] text-slate-400 px-1 font-medium">
          <span>Press <strong>Enter</strong> to send, <strong>Shift + Enter</strong> for a new line</span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Active Mode: {persona.shortRole}
          </span>
        </div>
      </div>
    </div>
  );
};

export default AIChat;
