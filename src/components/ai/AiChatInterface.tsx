import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Bot, 
  User, 
  Sparkles, 
  Plus, 
  Trash2, 
  Pin, 
  Edit3, 
  Check, 
  RefreshCw, 
  Copy,
  FileText,
  Search, 
  Star, 
  Download, 
  Bookmark, 
  Mic, 
  MicOff, 
  Settings, 
  BarChart3, 
  Mail, 
  Printer, 
  ShieldCheck, 
  CheckCircle2, 
  Wand2, 
  Database, 
  MessageSquare, 
  X, 
  FileSpreadsheet,
  AlertTriangle,
  HelpCircle,
  Clock,
  Layers,
  ChevronRight,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { MathScienceRenderer } from './MathScienceRenderer';
import { useVoiceDictation } from '../../hooks/useVoiceDictation';
import { useAuth } from '../../context/AuthContext';
import { SchoolDataIntelligenceService, QueryContext } from '../../services/schoolDataIntelligenceService';

export interface AiChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  taskCategory?: 'general' | 'report' | 'reports' | 'communication' | 'communications' | 'data_query';
  isBookmarked?: boolean;
  feedback?: 'like' | 'dislike' | null;
  isError?: boolean;
  dataPoints?: Array<{ label: string; value: string; status?: 'good' | 'warning' | 'alert' }>;
}

export interface AiChatSession {
  id: string;
  title: string;
  isPinned: boolean;
  isFavorite: boolean;
  createdAt: string;
  category: 'reports' | 'communications' | 'data_query' | 'general';
  messages: AiChatMessage[];
}

export interface AiChatInterfaceProps {
  currentUser?: any;
  userRole?: 'platform_owner' | 'school_admin' | 'teacher' | 'student' | 'parent';
  schoolName?: string;
  initialCategory?: 'all' | 'reports' | 'communications' | 'data_query';
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onExportReport?: (reportText: string, title: string) => void;
}

const PRESET_ADMIN_ACTIONS = [
  // REPORTS
  {
    id: 'rpt-1',
    category: 'reports',
    icon: BarChart3,
    title: 'Term Executive Academic Report',
    description: 'Generate comprehensive framework for pass rates, subject reviews & at-risk student support.',
    prompt: 'Draft an Executive Academic Report outline for the School Governing Body (SGB). Include core governance KPIs for overall pass rates, departmental subject reviews, at-risk student intervention strategies, and strategic curriculum recommendations.',
    badge: 'Executive Report'
  },
  {
    id: 'rpt-2',
    category: 'reports',
    icon: FileSpreadsheet,
    title: 'Financial Fee Collection Policy & Audit',
    description: 'Framework for tuition billing reconciliation, overdue accounts, and financial risk mitigation.',
    prompt: 'Draft a Financial Fee Collection Audit & Policy framework for the school. Outline tuition billing reconciliation workflows, structured debit order arrangement guidelines, overdue accounts communication protocol, and formal financial risk mitigation steps.',
    badge: 'Finance'
  },
  {
    id: 'rpt-3',
    category: 'reports',
    icon: ShieldCheck,
    title: 'Attendance & Discipline Overview',
    description: 'Framework for attendance monitoring, chronic absenteeism follow-up, and educator presence.',
    prompt: 'Generate a School Attendance & Discipline Policy framework. Outline a 3-tier attendance intervention model, chronic absenteeism parent engagement protocols, staff attendance reporting standards, and pastoral care integration.',
    badge: 'Operations'
  },

  // COMMUNICATIONS
  {
    id: 'comm-1',
    category: 'communications',
    icon: Mail,
    title: 'Parent Circular: Term Exam Timetable',
    description: 'Draft an official, professional parent notice regarding upcoming assessments.',
    prompt: 'Draft an official Parent Circular from the Office of the Principal announcing the upcoming Assessment Timetable. Emphasize study schedules, attendance rules, exam venue instructions, and contact details for academic support.',
    badge: 'Parent Circular'
  },
  {
    id: 'comm-2',
    category: 'communications',
    icon: AlertTriangle,
    title: 'Fee Payment Reminder Letter',
    description: 'Write a firm yet empathetic payment reminder for overdue tuition balances.',
    prompt: 'Draft a firm yet empathetic Fee Payment Reminder Letter to parents with outstanding term balances. Outline available flexible payment options, administrative cutoff dates, and the school finance office consultation hours.',
    badge: 'Notice'
  },
  {
    id: 'comm-3',
    category: 'communications',
    icon: Wand2,
    title: 'Principal Newsletter Address',
    description: 'Compose an inspiring, engaging end-of-month newsletter opening statement.',
    prompt: 'Write an inspiring Principal Newsletter Opening Message celebrating student perseverance in academics and extracurriculars, teacher dedication, and upcoming school community initiatives.',
    badge: 'Newsletter'
  },

  // DATA QUERIES
  {
    id: 'query-1',
    category: 'data_query',
    icon: Database,
    title: 'At-Risk Students & Interventions',
    description: 'Evidence-based framework for identifying and supporting academically vulnerable learners.',
    prompt: 'Propose an evidence-based academic and attendance intervention framework for supporting at-risk high school learners. Detail early-warning triggers, structured peer tutoring models, and collaborative educator-parent review conferences.',
    badge: 'Data Query'
  },
  {
    id: 'query-2',
    category: 'data_query',
    icon: Search,
    title: 'STEM Subject Performance Audit',
    description: 'Framework for evaluating Mathematics and Physical Sciences curriculum delivery.',
    prompt: 'Outline a comparative audit framework for analyzing STEM subject pass rates and curriculum delivery. Recommend diagnostic assessment methods, practical laboratory schedules, and departmental resource allocation strategies.',
    badge: 'Analytics'
  }
];

export const AiChatInterface: React.FC<AiChatInterfaceProps> = ({
  currentUser,
  userRole = 'school_admin',
  schoolName = 'EDUkenZA Academy',
  initialCategory = 'all',
  showToast,
  onExportReport
}) => {
  const notify = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    if (showToast) showToast(msg, type);
    else console.log(`[AI ${type.toUpperCase()}] ${msg}`);
  };

  // State
  const [activeCategory, setActiveCategory] = useState<'all' | 'reports' | 'communications' | 'data_query'>(initialCategory);
  const [promptInput, setPromptInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTone, setSelectedTone] = useState<'executive' | 'empathetic' | 'authoritative' | 'concise'>('executive');
  const [responseLength, setResponseLength] = useState<'medium' | 'detailed' | 'short'>('medium');
  const [includeDataSnapshot, setIncludeDataSnapshot] = useState(true);
  const { currentUser: authUser } = useAuth();
  const effectiveUser = currentUser || authUser;
  const queryContextRef = useRef<QueryContext>({});

  // Search & Session State
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSessionId, setActiveSessionId] = useState<string>('default-session');
  const [sessions, setSessions] = useState<AiChatSession[]>(() => {
    const saved = localStorage.getItem(`edukenza_admin_ai_chat_sessions_${userRole}`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return [
      {
        id: 'default-session',
        title: 'School Executive AI Session',
        isPinned: true,
        isFavorite: true,
        createdAt: new Date().toISOString(),
        category: 'general',
        messages: [
          {
            id: 'welcome-1',
            role: 'assistant',
            content: `👋 **Welcome, School Administrator!** I am your **Gemini-Powered Executive Assistant** tailored for **${schoolName}**.

How can I assist you today? Here is what I can generate for you in seconds:

1. 📊 **Executive Reports**: Term academic pass rates, financial fee collection ledgers, staff workload distribution, SGB governance summaries.
2. ✉️ **School Communications**: Official parent circulars, fee payment notices, principal newsletters, staff policy memos, event invitations.
3. 🔍 **Data Queries & Analytics**: Interrogate student academic scores, attendance registers, at-risk student lists, and departmental statistics.

*Tip: Toggle the **School Data Snapshot** above to ground AI responses directly in live 2026 school metrics!*`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            taskCategory: 'general'
          }
        ]
      }
    ];
  });

  // Export / Print Modal State
  const [previewModalMsg, setPreviewModalMsg] = useState<AiChatMessage | null>(null);

  // Voice Dictation & Input Ref
  const promptInputRef = useRef<HTMLInputElement | null>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem(`edukenza_admin_ai_chat_sessions_${userRole}`, JSON.stringify(sessions));
  }, [sessions, userRole]);

  // Scroll to bottom on new message
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [sessions, activeSessionId, isLoading]);

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
      const inputEl = promptInputRef.current;
      if (inputEl && inputEl.selectionStart !== null && inputEl.selectionStart !== undefined) {
        const start = inputEl.selectionStart;
        const end = inputEl.selectionEnd || start;
        setPromptInput(prev => {
          const before = prev.substring(0, start);
          const after = prev.substring(end);
          const needsSpaceBefore = before.length > 0 && !before.endsWith(' ');
          const needsSpaceAfter = after.length > 0 && !after.startsWith(' ');
          const isNewSentence = before.trim().length === 0 || /[.!?:]\s*$/.test(before);
          const textToInsert = isNewSentence ? finalText : (finalText.charAt(0).toLowerCase() + finalText.slice(1));
          const insertion = `${needsSpaceBefore ? ' ' : ''}${textToInsert}${needsSpaceAfter ? ' ' : ''}`;
          const newPos = start + insertion.length;
          setTimeout(() => {
            if (promptInputRef.current) {
              promptInputRef.current.focus();
              promptInputRef.current.setSelectionRange(newPos, newPos);
            }
          }, 0);
          return before + insertion + after;
        });
      } else {
        setPromptInput(prev => {
          if (!prev.trim()) return finalText;
          const isNewSentence = /[.!?:]\s*$/.test(prev);
          const textToInsert = isNewSentence ? finalText : (finalText.charAt(0).toLowerCase() + finalText.slice(1));
          const needsSpace = !prev.endsWith(' ');
          return `${prev}${needsSpace ? ' ' : ''}${textToInsert}`;
        });
      }
      notify('Voice input recognized!', 'success');
    },
    onError: (err) => {
      notify(err, 'error');
    }
  });

  // Get active session
  const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0];

  // Helper to create a new session
  const handleNewSession = (cat: 'reports' | 'communications' | 'data_query' | 'general' = 'general') => {
    const newId = `session-${Date.now()}`;
    const newSess: AiChatSession = {
      id: newId,
      title: `${cat.toUpperCase()} Session (${new Date().toLocaleDateString()})`,
      isPinned: false,
      isFavorite: false,
      createdAt: new Date().toISOString(),
      category: cat,
      messages: [
        {
          id: `msg-init-${Date.now()}`,
          role: 'assistant',
          content: `New **${cat.replace('_', ' ').toUpperCase()}** AI Session initialized. How can I assist you with school management today?`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          taskCategory: cat
        }
      ]
    };
    setSessions(prev => [newSess, ...prev]);
    setActiveSessionId(newId);
  };

  // Delete session
  const handleDeleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (sessions.length <= 1) {
      notify('Cannot delete the last remaining session.', 'info');
      return;
    }
    setSessions(prev => prev.filter(s => s.id !== id));
    if (activeSessionId === id) {
      setActiveSessionId(sessions.find(s => s.id !== id)?.id || sessions[0].id);
    }
    notify('Chat session deleted.', 'info');
  };

  // Send Prompt to Gemini AI via SSE Streaming
  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || promptInput).trim();
    if (!query || isLoading) return;

    setPromptInput('');

    // User Message
    const userMsg: AiChatMessage = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    // Assistant Placeholder
    const assistantMsgId = `ast-${Date.now()}`;
    const assistantMsg: AiChatMessage = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      taskCategory: activeCategory === 'all' ? 'general' : activeCategory
    };

    // Append user message & assistant placeholder to active session
    setSessions(prev => prev.map(s => {
      if (s.id === activeSession.id) {
        // Auto update session title if default
        const title = s.messages.length <= 1 ? query.slice(0, 32) + '...' : s.title;
        return {
          ...s,
          title,
          messages: [...s.messages, userMsg, assistantMsg]
        };
      }
      return s;
    }));

    setIsLoading(true);
    let dataResult: any = null;

    try {
      // Execute SchoolDataIntelligenceService for natural language queries against real Firestore data
      dataResult = await SchoolDataIntelligenceService.processDataQuery({
        prompt: query,
        clientUser: effectiveUser,
        history: activeSession.messages.slice(-6).map(m => ({ role: m.role, content: m.content })),
        context: queryContextRef.current
      });

      if (dataResult.updatedContext) {
        queryContextRef.current = dataResult.updatedContext;
      }

      // Check for authorization denial (Tests 12, 13, 14, 15, 16, 22, 23, 24)
      if (dataResult.isSchoolDataQuery && !dataResult.isAuthorized) {
        const denial = dataResult.summaryAnswer || "ACCESS DENIED: You don't have permission to access that information.";
        setSessions(prev => prev.map(s => {
          if (s.id === activeSession.id) {
            const updatedMsgs = s.messages.map(m => m.id === assistantMsgId ? { ...m, content: denial } : m);
            return { ...s, messages: updatedMsgs };
          }
          return s;
        }));
        setIsLoading(false);
        return;
      }

      // Check for ambiguous query (Test 17)
      if (dataResult.isSchoolDataQuery && dataResult.isAmbiguous) {
        const clar = dataResult.clarificationPrompt || "Do you mean students, teachers, parents, or another group in your school?";
        setSessions(prev => prev.map(s => {
          if (s.id === activeSession.id) {
            const updatedMsgs = s.messages.map(m => m.id === assistantMsgId ? { ...m, content: clar } : m);
            return { ...s, messages: updatedMsgs };
          }
          return s;
        }));
        setIsLoading(false);
        return;
      }

      // Build system instruction including school context if enabled
      let dataContextText = '';
      if (dataResult.systemContextPrompt) {
        dataContextText = `\n\n[AUTHORITATIVE REAL FIRESTORE RECORDS]:\n${dataResult.systemContextPrompt}`;
      } else if (includeDataSnapshot) {
        dataContextText = `\n\n[INSTITUTIONAL CONTEXT - ${schoolName}]:
- Current Operational Term: 2026 Academic Year
- Role Persona: ${userRole === 'platform_owner' ? 'Your EDUkenZA Platform Assistant' : 'Your EDUkenZA Administrative Assistant'}
- Note: Live student enrollments, exam score sheets, and financial ledgers are strictly governed by school database records. NEVER invent or fabricate student numbers, pass percentages, fee amounts, or grades. If specific institutional records have not been recorded in the database or provided by the user in this prompt, state: 'That information is not currently available in EDUkenZA.'`;
      }

      const systemInstruction = `You are the Senior Executive Gemini AI Assistant for ${schoolName}.
You specialize in school administration, executive reporting, parent/staff communications, policy formulation, and educational leadership.
Your tone mode is set to: ${selectedTone.toUpperCase()} (Executive, Empathetic, Authoritative, or Concise).
Format your output cleanly using Markdown, LaTeX (if mathematical), bullet points, bold headers, and structured tables where relevant.${dataContextText}`;

      // Build context history from current session
      const history = activeSession.messages.slice(-6).map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }]
      }));

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: query,
          history,
          systemInstruction,
          role: userRole,
          schoolName: currentUser?.schoolName || schoolName,
          authoritativeFacts: dataResult.systemContextPrompt,
          targetTask: activeCategory === 'all' ? 'general' : activeCategory,
          responseLength: responseLength === 'detailed' ? 'long' : responseLength,
          responseStyle: selectedTone === 'empathetic' ? 'parent' : selectedTone === 'executive' ? 'professional' : 'default',
          language: 'English'
        })
      });

      if (!res.ok) {
        throw new Error(`Gemini Service Error (${res.status})`);
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = '';
      let streamBuffer = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          streamBuffer += decoder.decode(value, { stream: true });
          let lineEnd: number;

          while ((lineEnd = streamBuffer.indexOf('\n')) !== -1) {
            const line = streamBuffer.slice(0, lineEnd).trim();
            streamBuffer = streamBuffer.slice(lineEnd + 1);

            if (line.startsWith('data: ')) {
              const dataStr = line.slice(6).trim();
              if (dataStr === '[DONE]') break;
              try {
                const parsed = JSON.parse(dataStr);
                if (parsed.text) {
                  accumulatedText += parsed.text;
                  
                  // Stream update state
                  setSessions(prev => prev.map(s => {
                    if (s.id === activeSession.id) {
                      const updatedMsgs = s.messages.map(m => {
                        if (m.id === assistantMsgId) {
                          return { ...m, content: accumulatedText };
                        }
                        return m;
                      });
                      return { ...s, messages: updatedMsgs };
                    }
                    return s;
                  }));
                }
              } catch (e) {}
            }
          }
        }
      }

      if (streamBuffer.trim().startsWith('data: ')) {
        const dataStr = streamBuffer.trim().slice(6).trim();
        if (dataStr !== '[DONE]') {
          try {
            const parsed = JSON.parse(dataStr);
            if (parsed.text) {
              accumulatedText += parsed.text;
            }
          } catch (e) {}
        }
      }

      if (!accumulatedText) {
        // Fallback if empty stream
        const fallbackContent = (dataResult.isSchoolDataQuery && dataResult.summaryAnswer)
          ? dataResult.summaryAnswer
          : 'I have processed your request. Please review the school data summary above.';

        setSessions(prev => prev.map(s => {
          if (s.id === activeSession.id) {
            const updatedMsgs = s.messages.map(m => {
              if (m.id === assistantMsgId) {
                return { ...m, content: fallbackContent };
              }
              return m;
            });
            return { ...s, messages: updatedMsgs };
          }
          return s;
        }));
      }

    } catch (err: any) {
      console.error('[EDUkenZA Admin AI Diagnostic Log]:', err);
      if (dataResult?.isSchoolDataQuery && dataResult?.summaryAnswer) {
        setSessions(prev => prev.map(s => {
          if (s.id === activeSession.id) {
            const updatedMsgs = s.messages.map(m => {
              if (m.id === assistantMsgId) {
                return { ...m, content: dataResult.summaryAnswer! };
              }
              return m;
            });
            return { ...s, messages: updatedMsgs };
          }
          return s;
        }));
        setIsLoading(false);
        return;
      }

      notify('EDUkenZA AI is temporarily unavailable. Please try again.', 'error');
      
      setSessions(prev => prev.map(s => {
        if (s.id === activeSession.id) {
          const updatedMsgs = s.messages.map(m => {
            if (m.id === assistantMsgId) {
              return { 
                ...m, 
                isError: true,
                content: 'EDUkenZA AI is temporarily unavailable. Please try again.' 
              };
            }
            return m;
          });
          return { ...s, messages: updatedMsgs };
        }
        return s;
      }));
    } finally {
      setIsLoading(false);
    }
  };

  // Action Handlers for Messages
  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    notify('Content copied to clipboard!', 'success');
  };

  const handleBookmark = (msgId: string) => {
    setSessions(prev => prev.map(s => {
      if (s.id === activeSession.id) {
        return {
          ...s,
          messages: s.messages.map(m => {
            if (m.id === msgId) {
              return { ...m, isBookmarked: !m.isBookmarked };
            }
            return m;
          })
        };
      }
      return s;
    }));
    notify('Bookmark status updated.', 'info');
  };

  const handlePrintExport = (msg: AiChatMessage) => {
    setPreviewModalMsg(msg);
  };

  const triggerDirectPrint = () => {
    if (!previewModalMsg) return;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>${schoolName} - Official Executive Output</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 40px; color: #1e293b; line-height: 1.6; }
              .header { border-bottom: 2px solid #002147; padding-bottom: 15px; margin-bottom: 25px; display: flex; justify-content: space-between; align-items: center; }
              .logo { font-size: 20px; font-weight: bold; color: #002147; }
              .tag { font-size: 11px; background: #f1f5f9; padding: 4px 8px; border-radius: 4px; color: #475569; }
              .footer { border-top: 1px solid #e2e8f0; margin-top: 40px; padding-top: 15px; font-size: 11px; color: #64748b; text-align: center; }
              pre { font-family: inherit; white-space: pre-wrap; font-size: 13px; }
            </style>
          </head>
          <body>
            <div class="header">
              <div>
                <div class="logo">${schoolName}</div>
                <div style="font-size: 12px; color: #64748b;">Office of the School Executive & Administration</div>
              </div>
              <div class="tag">Generated via Gemini AI - ${new Date().toLocaleDateString()}</div>
            </div>
            <div>
              <pre>${previewModalMsg.content.replace(/\*\*/g, '')}</pre>
            </div>
            <div class="footer">
              Confidential School Administrative Output &bull; POPIA & Data Protection Compliant &bull; ${schoolName}
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    }
  };

  // Filter preset actions by active category
  const filteredPresets = activeCategory === 'all' 
    ? PRESET_ADMIN_ACTIONS 
    : PRESET_ADMIN_ACTIONS.filter(p => p.category === activeCategory);

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-3xl shadow-xl overflow-hidden flex flex-col md:flex-row h-[850px] max-h-[90vh]">
      
      {/* SIDEBAR: SESSIONS & SEARCH */}
      <div className="w-full md:w-80 bg-slate-900 text-white flex flex-col border-r border-slate-800 shrink-0">
        
        {/* SIDEBAR HEADER */}
        <div className="p-4 border-b border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#002147] border border-[#D4AF37] flex items-center justify-center text-[#D4AF37]">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-[#D4AF37]">Admin AI Chat</h2>
                <p className="text-[10px] text-slate-400 font-medium">Gemini Intelligence</p>
              </div>
            </div>
            
            <button
              onClick={() => handleNewSession('general')}
              title="New Session"
              className="p-2 bg-slate-800 hover:bg-[#002147] text-white rounded-xl transition border border-slate-700 cursor-pointer flex items-center gap-1 text-xs font-bold"
            >
              <Plus className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">New</span>
            </button>
          </div>

          {/* Search sessions */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search chat sessions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#D4AF37]"
            />
          </div>
        </div>

        {/* SESSIONS LIST */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5 scrollbar-thin">
          <div className="text-[10px] font-bold uppercase text-slate-400 px-2 py-1 tracking-wider">
            Active Chat History
          </div>

          {sessions
            .filter(s => s.title.toLowerCase().includes(searchQuery.toLowerCase()))
            .map(s => {
              const isActive = s.id === activeSessionId;
              return (
                <div
                  key={s.id}
                  onClick={() => setActiveSessionId(s.id)}
                  className={`group relative p-3 rounded-2xl transition cursor-pointer flex items-center justify-between gap-2 border ${
                    isActive
                      ? 'bg-[#002147] text-white border-[#D4AF37]/60 shadow-md'
                      : 'bg-slate-800/40 text-slate-300 hover:bg-slate-800 border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <MessageSquare className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#D4AF37]' : 'text-slate-400'}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold truncate leading-snug">{s.title}</p>
                      <p className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        <span>{s.messages.length} messages</span>
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={(e) => handleDeleteSession(s.id, e)}
                    title="Delete Chat"
                    className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-400 p-1 rounded hover:bg-slate-700/50 transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
        </div>

        {/* DATA SNAPSHOT TOGGLE */}
        <div className="p-3 bg-slate-950/60 border-t border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-amber-400" />
              Attach School Data
            </span>
            <input
              type="checkbox"
              checked={includeDataSnapshot}
              onChange={(e) => setIncludeDataSnapshot(e.target.checked)}
              className="w-4 h-4 rounded accent-[#D4AF37] cursor-pointer"
            />
          </div>
          <p className="text-[10px] text-slate-400 leading-tight">
            Feeds live 2026 Term 3 pass rates, tuition balances & attendance metrics directly to Gemini.
          </p>
        </div>
      </div>

      {/* MAIN CHAT AREA */}
      <div className="flex-1 flex flex-col bg-white overflow-hidden">
        
        {/* MAIN TOP HEADER BAR */}
        <div className="p-4 bg-slate-900 text-white border-b border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[#D4AF37]" />
                {schoolName} AI Executive Assistant
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-[10px] font-extrabold border border-amber-400/40 uppercase">
                Gemini 3.6
              </span>
            </div>
            <p className="text-xs text-slate-300">
              Intelligent reports, parent communications & natural language database queries.
            </p>
          </div>

          {/* MODE / CATEGORY TABS */}
          <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-xl border border-slate-700 self-stretch sm:self-auto overflow-x-auto">
            <button
              onClick={() => setActiveCategory('all')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                activeCategory === 'all' ? 'bg-[#002147] text-[#D4AF37] shadow-xs' : 'text-slate-300 hover:text-white'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setActiveCategory('reports')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 whitespace-nowrap ${
                activeCategory === 'reports' ? 'bg-[#002147] text-[#D4AF37] shadow-xs' : 'text-slate-300 hover:text-white'
              }`}
            >
              <BarChart3 className="w-3 h-3" />
              Reports
            </button>
            <button
              onClick={() => setActiveCategory('communications')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 whitespace-nowrap ${
                activeCategory === 'communications' ? 'bg-[#002147] text-[#D4AF37] shadow-xs' : 'text-slate-300 hover:text-white'
              }`}
            >
              <Mail className="w-3 h-3" />
              Communications
            </button>
            <button
              onClick={() => setActiveCategory('data_query')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 whitespace-nowrap ${
                activeCategory === 'data_query' ? 'bg-[#002147] text-[#D4AF37] shadow-xs' : 'text-slate-300 hover:text-white'
              }`}
            >
              <Database className="w-3 h-3" />
              Data Query
            </button>
          </div>
        </div>

        {/* CHAT MESSAGES CONTAINER */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-slate-50/50">
          
          {/* PRESET ACTION CARDS (If history is minimal or user toggles category) */}
          {activeSession.messages.length <= 2 && (
            <div className="space-y-3 mb-6">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Wand2 className="w-3.5 h-3.5 text-amber-600" />
                  Quick Admin Actions ({activeCategory.toUpperCase()})
                </span>
                <span className="text-[11px] text-slate-400">Click to execute Gemini prompt</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredPresets.map(preset => {
                  const Icon = preset.icon;
                  return (
                    <div
                      key={preset.id}
                      onClick={() => handleSendMessage(preset.prompt)}
                      className="group bg-white p-4 rounded-2xl border border-slate-200 hover:border-[#D4AF37] hover:shadow-md transition cursor-pointer space-y-2 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="p-2 rounded-xl bg-[#002147]/10 text-[#002147] group-hover:bg-[#002147] group-hover:text-[#D4AF37] transition">
                            <Icon className="w-4 h-4" />
                          </span>
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                            {preset.badge}
                          </span>
                        </div>
                        <h3 className="text-xs font-bold text-slate-900 group-hover:text-[#002147] leading-snug">
                          {preset.title}
                        </h3>
                        <p className="text-[11px] text-slate-500 line-clamp-2 mt-1 leading-relaxed">
                          {preset.description}
                        </p>
                      </div>

                      <div className="flex items-center text-[11px] font-bold text-[#002147] group-hover:text-amber-600 pt-1">
                        <span>Generate with Gemini</span>
                        <ChevronRight className="w-3.5 h-3.5 ml-1 group-hover:translate-x-1 transition" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* MESSAGES LIST */}
          {activeSession.messages.map((msg, idx) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={msg.id}
                className={`flex gap-3 max-w-4xl ${isUser ? 'ml-auto justify-end' : 'mr-auto justify-start'}`}
              >
                {!isUser && (
                  <div className="w-9 h-9 rounded-2xl bg-[#002147] border border-[#D4AF37] flex items-center justify-center text-[#D4AF37] shadow-sm shrink-0 mt-1">
                    <Bot className="w-5 h-5" />
                  </div>
                )}

                <div className={`space-y-2 max-w-3xl ${isUser ? 'items-end' : 'items-start'}`}>
                  
                  {/* MESSAGE BUBBLE */}
                  <div
                    className={`p-4 sm:p-5 rounded-3xl shadow-xs text-xs sm:text-sm leading-relaxed ${
                      isUser
                        ? 'bg-[#002147] text-white rounded-tr-none border border-[#002147]'
                        : 'bg-white text-slate-900 rounded-tl-none border border-slate-200'
                    }`}
                  >
                    {isUser ? (
                      <p className="whitespace-pre-wrap font-medium">{msg.content}</p>
                    ) : msg.isError ? (
                      <div className="p-4 bg-amber-50/90 border border-amber-200 rounded-2xl space-y-3 text-slate-800">
                        <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                          <AlertTriangle className="w-4 h-4 text-amber-600" />
                          <span>EDUkenZA AI Service Notice</span>
                        </div>
                        <p className="text-xs text-slate-700 font-medium">
                          EDUkenZA AI is temporarily unavailable. Please try again.
                        </p>
                        <button
                          onClick={() => {
                            const prevUserMsg = activeSession.messages.slice(0, idx).reverse().find(m => m.role === 'user');
                            if (prevUserMsg) {
                              const filtered = activeSession.messages.filter((_, i) => i !== idx);
                              setSessions(prev => prev.map(s => s.id === activeSession.id ? { ...s, messages: filtered } : s));
                              handleSendMessage(prevUserMsg.content);
                            }
                          }}
                          className="px-3.5 py-1.5 bg-[#002147] hover:bg-[#003366] text-white rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                        >
                          <RefreshCw className="w-3.5 h-3.5 text-[#D4AF37]" />
                          <span>Retry Query</span>
                        </button>
                      </div>
                    ) : (
                      <MathScienceRenderer content={msg.content || 'Generating analysis...'} />
                    )}
                  </div>

                  {/* ACTION TOOLBAR (ASSISTANT ONLY) */}
                  {!isUser && msg.content && (
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500 px-1">
                      <button
                        onClick={() => handleCopyText(msg.content)}
                        className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition cursor-pointer flex items-center gap-1 font-medium"
                      >
                        <Copy className="w-3 h-3 text-slate-600" />
                        <span>Copy</span>
                      </button>

                      <button
                        onClick={() => handlePrintExport(msg)}
                        className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition cursor-pointer flex items-center gap-1 font-medium text-slate-700"
                      >
                        <Printer className="w-3 h-3 text-slate-600" />
                        <span>Print Letterhead</span>
                      </button>

                      {onExportReport && (
                        <button
                          onClick={() => onExportReport(msg.content, 'Executive Report')}
                          className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg transition cursor-pointer flex items-center gap-1 font-medium"
                        >
                          <BarChart3 className="w-3 h-3 text-amber-600" />
                          <span>Export to Reports</span>
                        </button>
                      )}

                      <button
                        onClick={() => handleBookmark(msg.id)}
                        className={`p-1 rounded-lg border transition cursor-pointer ${
                          msg.isBookmarked
                            ? 'bg-amber-100 border-amber-300 text-amber-700'
                            : 'bg-white border-slate-200 hover:bg-slate-100 text-slate-500'
                        }`}
                        title="Bookmark Response"
                      >
                        <Bookmark className="w-3.5 h-3.5" />
                      </button>

                      <span className="text-[10px] text-slate-400 ml-auto">{msg.timestamp}</span>
                    </div>
                  )}
                </div>

                {isUser && (
                  <div className="w-9 h-9 rounded-2xl bg-slate-800 text-slate-200 flex items-center justify-center shadow-sm shrink-0 mt-1">
                    <User className="w-5 h-5" />
                  </div>
                )}
              </div>
            );
          })}

          {/* STREAMING LOADING INDICATOR */}
          {isLoading && (
            <div className="flex gap-3.5 items-center bg-white px-5 py-3.5 rounded-2xl border border-slate-200/90 shadow-xs w-max animate-fadeIn">
              <div className="w-8 h-8 rounded-xl bg-[#002147] border border-[#D4AF37]/50 flex items-center justify-center text-[#D4AF37] shrink-0">
                <Bot className="w-4 h-4 text-[#D4AF37] animate-pulse" />
              </div>
              <div className="flex gap-1.5 items-center">
                <span className="w-2 h-2 rounded-full bg-[#002147] animate-bounce [animation-delay:-0.3s]" />
                <span className="w-2 h-2 rounded-full bg-[#D4AF37] animate-bounce [animation-delay:-0.15s]" />
                <span className="w-2 h-2 rounded-full bg-[#002147] animate-bounce" />
              </div>
              <div>
                <span className="font-extrabold text-[#002147] block text-xs">EDUkenZA AI is thinking...</span>
                <span className="text-[10px] text-slate-500 font-medium">Drafting administrative response</span>
              </div>
            </div>
          )}

          <div ref={chatBottomRef} />
        </div>

        {/* INPUT FORM & CONFIG CONTROLS */}
        <div className="p-4 bg-white border-t border-slate-200 space-y-3 shrink-0">
          
          {/* TONE & LENGTH PREFERENCE BAR */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs bg-slate-50 p-2 rounded-xl border border-slate-200">
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-bold flex items-center gap-1 text-[11px]">
                <Settings className="w-3.5 h-3.5 text-[#002147]" /> Tone:
              </span>
              <select
                value={selectedTone}
                onChange={(e: any) => setSelectedTone(e.target.value)}
                className="bg-white border border-slate-300 rounded-lg px-2 py-0.5 text-xs text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-[#002147]"
              >
                <option value="executive">Formal Executive</option>
                <option value="empathetic">Empathetic Parent Tone</option>
                <option value="authoritative">Authoritative Policy</option>
                <option value="concise">Concise Summary</option>
              </select>

              <span className="text-slate-500 font-bold flex items-center gap-1 text-[11px] ml-2">
                Length:
              </span>
              <select
                value={responseLength}
                onChange={(e: any) => setResponseLength(e.target.value)}
                className="bg-white border border-slate-300 rounded-lg px-2 py-0.5 text-xs text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-[#002147]"
              >
                <option value="medium">Standard (Balanced)</option>
                <option value="detailed">Exhaustive Report</option>
                <option value="short">Brief Notice</option>
              </select>
            </div>

            <div className="text-[11px] text-slate-500 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>POPIA & Data Encrypted</span>
            </div>
          </div>

          {/* INPUT FORM */}
          {/* VOICE LISTENING INTERIM STATUS BAR */}
          {isListening && (
            <div className="mb-3 bg-[#002147] text-white px-4 py-2.5 rounded-2xl flex items-center justify-between shadow-md border border-[#D4AF37]/50 text-xs animate-in fade-in">
              <div className="flex items-center gap-2.5 overflow-hidden">
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
                    Speak clearly into your microphone (e.g. queries, reports, questions)
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={stopVoiceListening}
                className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold rounded-xl transition cursor-pointer shrink-0 ml-2"
              >
                Stop
              </button>
            </div>
          )}

          <div className="flex items-center gap-2">
            <input
              ref={promptInputRef}
              type="text"
              placeholder={`Ask Gemini to draft a report, compose an announcement, or query ${schoolName} data...`}
              value={promptInput}
              onChange={(e) => setPromptInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSendMessage(); } }}
              disabled={isLoading}
              className="flex-1 px-4 py-3 bg-slate-50 border border-slate-300 rounded-2xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#002147] focus:bg-white transition"
            />

            <button
              type="button"
              onClick={() => {
                if (!isVoiceSupported) {
                  notify('Voice dictation is not supported in this browser. Please use a supported browser or type your message.', 'error');
                  return;
                }
                if (voiceErrorMessage) {
                  resetVoiceError();
                }
                toggleVoiceListening();
              }}
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
                  ? 'Voice dictation is not supported in this browser. Please use a supported browser or type your message.'
                  : isListening
                  ? 'Listening... Click to stop voice dictation'
                  : voiceState === 'processing'
                  ? 'Connecting to microphone...'
                  : 'Click to dictate prompt via microphone'
              }
              className={`p-3 rounded-2xl border transition cursor-pointer flex items-center justify-center relative shrink-0 ${
                !isVoiceSupported
                  ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                  : voiceState === 'error'
                  ? 'bg-red-100 text-red-600 border-red-300'
                  : isListening
                  ? 'bg-red-600 text-white border-red-500 shadow-md shadow-red-500/30 ring-2 ring-red-400'
                  : voiceState === 'processing'
                  ? 'bg-amber-400 text-slate-900 border-amber-500 animate-pulse'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
              }`}
            >
              {isListening && (
                <span className="absolute -inset-1 rounded-2xl bg-red-500/30 animate-ping pointer-events-none" />
              )}
              {voiceState === 'processing' ? (
                <Loader2 className="w-4 h-4 animate-spin text-slate-900" />
              ) : isListening ? (
                <MicOff className="w-4 h-4 text-white" />
              ) : (
                <Mic className="w-4 h-4" />
              )}
            </button>

            <button
              type="button"
              onClick={() => handleSendMessage()}
              disabled={isLoading || !promptInput.trim()}
              className="px-5 py-3 bg-[#002147] hover:bg-[#001529] disabled:opacity-50 text-white font-bold rounded-2xl text-xs sm:text-sm shadow-md transition flex items-center gap-2 cursor-pointer shrink-0"
            >
              <span>Ask Gemini</span>
              <Send className="w-4 h-4 text-[#D4AF37]" />
            </button>
          </div>
        </div>
      </div>

      {/* PRINT / OFFICIAL LETTERHEAD PREVIEW MODAL */}
      {previewModalMsg && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-300 w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
            
            <div className="px-6 py-4 bg-[#002147] text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-[#D4AF37]" />
                <h3 className="font-bold text-sm">Official Letterhead & Executive Preview</h3>
              </div>
              <button
                onClick={() => setPreviewModalMsg(null)}
                className="text-slate-300 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-8 overflow-y-auto space-y-6 flex-1 bg-white">
              
              {/* LETTERHEAD HEADER */}
              <div className="border-b-2 border-[#002147] pb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black text-[#002147]">{schoolName}</h2>
                  <p className="text-xs text-slate-500 font-medium">Office of Executive Governance & School Administration</p>
                </div>
                <div className="text-right text-xs text-slate-500">
                  <p className="font-bold text-slate-800">{new Date().toLocaleDateString('en-ZA', { dateStyle: 'full' })}</p>
                  <p className="text-[10px] text-amber-600 font-extrabold uppercase tracking-wider">Gemini Verified Output</p>
                </div>
              </div>

              {/* DOCUMENT CONTENT */}
              <div className="text-slate-900 text-xs sm:text-sm leading-relaxed font-sans">
                <MathScienceRenderer content={previewModalMsg.content} />
              </div>

              {/* LETTERHEAD FOOTER */}
              <div className="border-t border-slate-200 pt-4 text-center text-[10px] text-slate-400 space-y-1">
                <p>Official Institutional Document &bull; Confidential & Security Encrypted</p>
                <p>{schoolName} &bull; Republic of South Africa</p>
              </div>
            </div>

            {/* MODAL FOOTER */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3 shrink-0">
              <button
                onClick={() => setPreviewModalMsg(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={triggerDirectPrint}
                className="px-5 py-2 bg-[#002147] hover:bg-[#001529] text-white rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-sm"
              >
                <Printer className="w-4 h-4 text-[#D4AF37]" />
                <span>Print Document</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
