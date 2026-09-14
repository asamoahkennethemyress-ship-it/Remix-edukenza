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
  Image as ImageIcon, 
  Paperclip, 
  Check, 
  RefreshCw, 
  BookOpen, 
  Copy,
  FileText,
  ArrowDown,
  Menu,
  X,
  Layers,
  ChevronRight,
  Search,
  Star,
  Archive,
  RotateCcw,
  Share2,
  Download,
  Bookmark,
  ThumbsUp,
  ThumbsDown,
  Mic,
  MicOff,
  Settings,
  HelpCircle,
  Lightbulb,
  FileSpreadsheet,
  FileCode,
  Sliders,
  CheckCircle2,
  Printer,
  CopyCheck,
  Zap,
  GraduationCap,
  School,
  Brain,
  Wand2,
  AlertTriangle,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { MathScienceRenderer } from './MathScienceRenderer';
import { useVoiceDictation } from '../../hooks/useVoiceDictation';
import { SchoolDataIntelligenceService, QueryContext } from '../../services/schoolDataIntelligenceService';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  images?: string[];
  attachments?: Array<{ name: string; type: string; size: string; content?: string }>;
  task?: string;
  isBookmarked?: boolean;
  feedback?: 'like' | 'dislike' | null;
  isError?: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  isPinned: boolean;
  isFavorite: boolean;
  isArchived: boolean;
  createdAt: string; // ISO date string
  messages: ChatMessage[];
}

export interface AiChatSectionProps {
  currentUser: any;
  userRole: 'platform_owner' | 'school_admin' | 'teacher' | 'student' | 'parent';
  onInsertToAssignment?: (text: string, imageUrl?: string) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const getRoleAiPersona = (role: string) => {
  switch (role) {
    case 'student':
      return {
        title: 'Your EDUkenZA AI Tutor',
        shortRole: 'AI Tutor',
        heading: 'What would you like to learn today?',
        subtitle: 'Ask curriculum questions, explore step-by-step solutions, or revise key exam concepts.',
        prompts: [
          { label: 'Explain a difficult topic', prompt: 'Explain Photosynthesis and light-dependent reactions step-by-step with clear examples.' },
          { label: 'Solve a mathematics problem', prompt: 'Solve 2x^2 - 8x + 6 = 0 step-by-step showing Given, Formula, Working, and final Answer.' },
          { label: 'Generate practice questions', prompt: 'Generate 5 practice multiple-choice questions on CAPS Grade 10 Accounting with explanations.' },
          { label: 'Help me revise for an exam', prompt: 'Create a focused revision summary with key formulas and definitions for Grade 12 Physical Sciences.' },
          { label: 'Explain a science concept', prompt: 'Explain Newton’s Second Law of Motion with real-world applications, units, and equations.' }
        ]
      };
    case 'teacher':
      return {
        title: 'Your EDUkenZA Teaching Assistant',
        shortRole: 'Teaching Assistant',
        heading: 'How can I support your classroom today?',
        subtitle: 'Create lesson plans, assessment questions, marking rubrics, and differentiated learning resources.',
        prompts: [
          { label: 'Create a lesson plan', prompt: 'Create a comprehensive Grade 10 CAPS-aligned lesson plan for Quadratic Functions including objectives, teaching steps, and assessment questions.' },
          { label: 'Generate quiz with memo', prompt: 'Draft a 15-mark Grade 11 Physical Science quiz on Newton\'s Laws with a complete teacher marking memo.' },
          { label: 'Design an assessment rubric', prompt: 'Generate a 40-mark detailed assessment rubric for a Grade 12 Literature essay assignment.' },
          { label: 'Differentiated worksheet', prompt: 'Draft a differentiated worksheet with tiered difficulty (foundation, intermediate, advanced) for Grade 9 Mathematics.' }
        ]
      };
    case 'parent':
      return {
        title: 'Your EDUkenZA Education Assistant',
        shortRole: 'Education Assistant',
        heading: 'How can I assist with your child’s learning journey?',
        subtitle: 'Get clear explanations on curriculum topics, homework support, and academic guidance.',
        prompts: [
          { label: 'Explain a curriculum concept simply', prompt: 'Explain the concept of fractions and decimals in simple, everyday language so I can help my child.' },
          { label: 'Support homework at home', prompt: 'Give me practical, encouraging strategies to support my child with Grade 9 homework and study habits.' },
          { label: 'Help me understand a grade report', prompt: 'Help me understand how term marks are calculated in Mathematics and Physical Sciences, and where to focus.' },
          { label: 'Weekly home study schedule', prompt: 'Create a balanced 5-day home study schedule for a high school student preparing for upcoming exams.' }
        ]
      };
    case 'school_admin':
      return {
        title: 'Your EDUkenZA Administrative Assistant',
        shortRole: 'Administrative Assistant',
        heading: 'How can I assist with school leadership and operations?',
        subtitle: 'Draft executive circulars, policy frameworks, curriculum compliance audits, and strategic agendas.',
        prompts: [
          { label: 'Term academic review outline', prompt: 'Draft an academic term review framework and agenda for the School Governing Body (SGB).' },
          { label: 'School safety & digital policy', prompt: 'Create a comprehensive school safety and responsible digital device policy framework.' },
          { label: 'Official parent circular', prompt: 'Draft an official parent circular announcing the upcoming examination timetable, rules, and student support.' },
          { label: 'Staff development agenda', prompt: 'Draft a workshop agenda for educators on integrating digital tools and formative assessment.' }
        ]
      };
    case 'platform_owner':
    default:
      return {
        title: 'Your EDUkenZA Platform Assistant',
        shortRole: 'Platform Assistant',
        heading: 'How can I assist with platform governance and quality?',
        subtitle: 'Institutional rollout strategies, compliance checklists, and system-wide curriculum frameworks.',
        prompts: [
          { label: 'Institutional QA framework', prompt: 'Outline a quality assurance framework for multi-campus academic compliance and monitoring.' },
          { label: 'EdTech data privacy checklist', prompt: 'Create a POPIA / GDPR compliance checklist for educational software and student records.' },
          { label: 'Onboarding & adoption guide', prompt: 'Draft a teacher adoption and onboarding strategy for implementing digital learning tools.' }
        ]
      };
  }
};

export const AiChatSection: React.FC<AiChatSectionProps> = ({
  currentUser,
  userRole,
  onInsertToAssignment,
  showToast
}) => {
  const rolePersona = getRoleAiPersona(userRole);

  // AI Settings State
  const [aiSettings, setAiSettings] = useState({
    responseLength: 'medium' as 'short' | 'medium' | 'long' | 'very_detailed',
    responseStyle: 'default' as 'default' | 'teacher' | 'professional' | 'parent' | 'student',
    creativity: 'medium' as 'low' | 'medium' | 'high',
    language: 'English'
  });

  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [exportTargetMsg, setExportTargetMsg] = useState<ChatMessage | null>(null);

  // Chat Sessions Storage
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    const saved = localStorage.getItem(`edukenza_ai_chats_${currentUser?.uid || 'guest'}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    const now = new Date();
    const persona = getRoleAiPersona(userRole);
    return [{
      id: 'session-1',
      title: `${persona.title}`,
      isPinned: true,
      isFavorite: true,
      isArchived: false,
      createdAt: now.toISOString(),
      messages: []
    }];
  });

  const [activeSessionId, setActiveSessionId] = useState<string>(sessions[0]?.id || 'session-1');
  const [searchQuery, setSearchQuery] = useState('');
  const [historyFilter, setHistoryFilter] = useState<'all' | 'pinned' | 'favorites' | 'archived'>('all');

  const [promptInput, setPromptInput] = useState('');
  const [targetTask, setTargetTask] = useState<'general' | 'math' | 'science' | 'coding' | 'lesson_plan' | 'study_plan'>('general');
  const [isStreaming, setIsStreaming] = useState(false);
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');

  // Attachments State
  const [attachedFiles, setAttachedFiles] = useState<Array<{ name: string; type: string; size: string; content?: string; base64?: string }>>([]);

  // Textarea Ref for cursor-aware voice dictation insertion
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Voice Speech Recognition Hook
  const {
    isSupported: isVoiceSupported,
    state: voiceState,
    isListening,
    interimTranscript,
    errorMessage: voiceErrorMessage,
    toggleListening: toggleVoiceInput,
    stopListening: stopVoiceInput,
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
        setPromptInput(prev => {
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
        setPromptInput(prev => {
          if (!prev.trim()) return finalText;
          const isNewSentence = /[.!?:]\s*$/.test(prev);
          const textToInsert = isNewSentence ? finalText : (finalText.charAt(0).toLowerCase() + finalText.slice(1));
          const needsSpace = !prev.endsWith(' ') && !prev.endsWith('\n');
          return `${prev}${needsSpace ? ' ' : ''}${textToInsert}`;
        });
      }
      showToast('Voice dictation transcribed!', 'success');
    },
    onError: (err) => {
      showToast(err, 'error');
    }
  });

  // UI Drawer State
  const [showSidebar, setShowSidebar] = useState(true);
  const [userScrolledUp, setUserScrolledUp] = useState(false);

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryContextRef = useRef<QueryContext>({});

  // Save sessions to localStorage
  useEffect(() => {
    localStorage.setItem(`edukenza_ai_chats_${currentUser?.uid || 'guest'}`, JSON.stringify(sessions));
  }, [sessions, currentUser?.uid]);

  // Auto-scroll logic
  useEffect(() => {
    if (messagesContainerRef.current && (!userScrolledUp || isStreaming)) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [sessions, activeSessionId, isStreaming, userScrolledUp]);

  const handleScroll = () => {
    if (!messagesContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 120;
    setUserScrolledUp(!isAtBottom);
  };

  const scrollToBottom = () => {
    setUserScrolledUp(false);
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  };

  const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0];

  // Grouping Chats by Date
  const groupSessionsByDate = (sessionList: ChatSession[]) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterday = today - 86400000;
    const last7Days = today - 7 * 86400000;
    const last30Days = today - 30 * 86400000;

    const groups: { [key: string]: ChatSession[] } = {
      'Today': [],
      'Yesterday': [],
      'Last 7 Days': [],
      'Last 30 Days': [],
      'Older': []
    };

    sessionList.forEach(s => {
      const sTime = new Date(s.createdAt).getTime();
      if (sTime >= today) groups['Today'].push(s);
      else if (sTime >= yesterday) groups['Yesterday'].push(s);
      else if (sTime >= last7Days) groups['Last 7 Days'].push(s);
      else if (sTime >= last30Days) groups['Last 30 Days'].push(s);
      else groups['Older'].push(s);
    });

    return groups;
  };

  // Filtered Sessions
  const filteredSessions = sessions.filter(s => {
    if (historyFilter === 'pinned' && !s.isPinned) return false;
    if (historyFilter === 'favorites' && !s.isFavorite) return false;
    if (historyFilter === 'archived' && !s.isArchived) return false;
    if (historyFilter !== 'archived' && s.isArchived) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = s.title.toLowerCase().includes(q);
      const matchMsg = s.messages.some(m => m.content.toLowerCase().includes(q));
      return matchTitle || matchMsg;
    }
    return true;
  });

  const groupedFilteredSessions = groupSessionsByDate(filteredSessions);

  // Chat Session Actions
  const handleCreateSession = () => {
    const now = new Date();
    const persona = getRoleAiPersona(userRole);
    const newSess: ChatSession = {
      id: `session-${Date.now()}`,
      title: `${persona.shortRole} Chat ${sessions.length + 1}`,
      isPinned: false,
      isFavorite: false,
      isArchived: false,
      createdAt: now.toISOString(),
      messages: []
    };
    setSessions([newSess, ...sessions]);
    setActiveSessionId(newSess.id);
  };

  const handleTogglePin = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSessions(sessions.map(s => s.id === id ? { ...s, isPinned: !s.isPinned } : s));
  };

  const handleToggleFavorite = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSessions(sessions.map(s => s.id === id ? { ...s, isFavorite: !s.isFavorite } : s));
  };

  const handleToggleArchive = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSessions(sessions.map(s => s.id === id ? { ...s, isArchived: !s.isArchived } : s));
    showToast('Chat archived state updated', 'info');
  };

  const handleDuplicateSession = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const target = sessions.find(s => s.id === id);
    if (!target) return;
    const duplicated: ChatSession = {
      ...target,
      id: `session-${Date.now()}`,
      title: `${target.title} (Copy)`,
      createdAt: new Date().toISOString(),
      isPinned: false
    };
    setSessions([duplicated, ...sessions]);
    setActiveSessionId(duplicated.id);
    showToast('Chat session duplicated', 'success');
  };

  const handleDeleteSession = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (sessions.length === 1) {
      showToast('Cannot delete the only active chat session.', 'info');
      return;
    }
    const remaining = sessions.filter(s => s.id !== id);
    setSessions(remaining);
    if (activeSessionId === id) {
      setActiveSessionId(remaining[0].id);
    }
    showToast('Session deleted', 'info');
  };

  const handleRenameSession = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingTitleId(id);
    const target = sessions.find(s => s.id === id);
    setNewTitle(target?.title || '');
  };

  const handleSaveTitle = (id: string) => {
    if (newTitle.trim()) {
      setSessions(sessions.map(s => s.id === id ? { ...s, title: newTitle.trim() } : s));
    }
    setEditingTitleId(null);
  };

  // File Upload Handling
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files: File[] = Array.from(e.target.files || []);
    if (files.length === 0) return;

    files.forEach((file: File) => {
      const reader = new FileReader();
      if (file.type.startsWith('image/')) {
        reader.onload = () => {
          setAttachedFiles(prev => [...prev, {
            name: file.name,
            type: file.type,
            size: `${(file.size / 1024).toFixed(1)} KB`,
            base64: reader.result as string
          }]);
        };
        reader.readAsDataURL(file);
      } else {
        reader.onload = () => {
          setAttachedFiles(prev => [...prev, {
            name: file.name,
            type: file.type || 'document',
            size: `${(file.size / 1024).toFixed(1)} KB`,
            content: reader.result as string
          }]);
        };
        reader.readAsText(file);
      }
    });
    showToast(`Attached ${files.length} file(s)`, 'success');
  };

  // Send Streaming Message
  const handleSendMessage = async (userPromptText?: string) => {
    const textToSend = userPromptText || promptInput.trim();
    if ((!textToSend && attachedFiles.length === 0) || isStreaming) return;

    const attachedImages = attachedFiles.filter(f => f.base64).map(f => f.base64!);
    const attachedDocs = attachedFiles.filter(f => f.content).map(f => ({
      name: f.name,
      type: f.type,
      size: f.size,
      content: f.content
    }));

    let fullPromptWithDocs = textToSend;
    if (attachedDocs.length > 0) {
      const docTexts = attachedDocs.map(d => `--- ATTACHED FILE: ${d.name} (${d.type}) ---\n${d.content?.slice(0, 8000)}`).join('\n\n');
      fullPromptWithDocs = `${textToSend}\n\n${docTexts}`;
    }

    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: textToSend || 'Analyzed attached documents/files.',
      timestamp: nowStr,
      images: attachedImages.length > 0 ? attachedImages : undefined,
      attachments: attachedDocs.length > 0 ? attachedDocs : undefined,
      task: targetTask
    };

    const assistantMsgId = `ast-${Date.now()}`;
    const initialAssistantMsg: ChatMessage = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: nowStr
    };

    const updatedMessages = [...(activeSession?.messages || []), userMsg, initialAssistantMsg];

    setSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, messages: updatedMessages } : s));
    setPromptInput('');
    setAttachedFiles([]);
    setIsStreaming(true);
    setUserScrolledUp(false);

    try {
      // 1. Process via SchoolDataIntelligenceService for real school/student data queries
      let authoritativeFacts: string | undefined = undefined;
      let directAnswerFallback: string | undefined = undefined;

      try {
        const dataResult = await SchoolDataIntelligenceService.processDataQuery({
          prompt: textToSend,
          clientUser: currentUser,
          history: (activeSession?.messages || []).slice(-6).map(m => ({ role: m.role, content: m.content })),
          context: queryContextRef.current
        });

        if (dataResult.updatedContext) {
          queryContextRef.current = dataResult.updatedContext;
        }

        // Check if query is an unauthorized school record access attempt
        if (dataResult.isSchoolDataQuery && !dataResult.isAuthorized) {
          const denialText = dataResult.summaryAnswer || "🔒 **ACCESS RESTRICTED**: You do not have permission to view this school record under privacy and student safety policies.";
          setSessions(prev => prev.map(s => s.id === activeSessionId ? {
            ...s,
            messages: s.messages.map(m => m.id === assistantMsgId ? { ...m, content: denialText } : m)
          } : s));
          setIsStreaming(false);
          return;
        }

        // Check if query is ambiguous
        if (dataResult.isSchoolDataQuery && dataResult.isAmbiguous) {
          const clarText = dataResult.clarificationPrompt || "Could you please specify which grade, class, or subject records you would like to inspect?";
          setSessions(prev => prev.map(s => s.id === activeSessionId ? {
            ...s,
            messages: s.messages.map(m => m.id === assistantMsgId ? { ...m, content: clarText } : m)
          } : s));
          setIsStreaming(false);
          return;
        }

        if (dataResult.isSchoolDataQuery) {
          authoritativeFacts = dataResult.systemContextPrompt || dataResult.summaryAnswer;
          directAnswerFallback = dataResult.summaryAnswer;
        }
      } catch (dataErr) {
        console.warn('[EDUkenZA Data Intelligence Non-fatal Notice]:', dataErr);
      }

      const historyPayload = (activeSession?.messages || []).map(m => ({
        role: m.role,
        content: m.content
      }));

      const schoolName = currentUser?.schoolName || currentUser?.institutionName || 'EDUkenZA Academy';

      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: fullPromptWithDocs,
          history: historyPayload,
          role: userRole,
          schoolName,
          authoritativeFacts,
          targetTask,
          images: attachedImages.map(img => ({ data: img, mimeType: 'image/png' })),
          temperature: aiSettings.creativity === 'low' ? 0.2 : aiSettings.creativity === 'high' ? 1.0 : 0.7,
          responseLength: aiSettings.responseLength,
          responseStyle: aiSettings.responseStyle,
          language: aiSettings.language
        })
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => null);
        throw new Error(errJson?.error || `AI Chat server returned status ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error('Streaming response reader unavailable');

      let accumulatedContent = '';
      let streamBuffer = '';

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
                accumulatedContent += parsed.text;
                
                setSessions(prevSessions => prevSessions.map(s => {
                  if (s.id !== activeSessionId) return s;
                  const msgs = s.messages.map(m => m.id === assistantMsgId ? { ...m, content: accumulatedContent } : m);
                  return { ...s, messages: msgs };
                }));
              }
            } catch (err) {
              // Partial line / non-JSON data, will be resolved with next chunk
            }
          }
        }
      }

      // Check if any leftover data in streamBuffer
      if (streamBuffer.trim().startsWith('data: ')) {
        const dataStr = streamBuffer.trim().slice(6).trim();
        if (dataStr !== '[DONE]') {
          try {
            const parsed = JSON.parse(dataStr);
            if (parsed.text) {
              accumulatedContent += parsed.text;
            }
          } catch (e) {}
        }
      }

      if (!accumulatedContent) {
        if (directAnswerFallback) {
          accumulatedContent = directAnswerFallback;
        } else {
          throw new Error('No response was generated. Please try asking again.');
        }
      }

      setSessions(prevSessions => prevSessions.map(s => {
        if (s.id !== activeSessionId) return s;
        const msgs = s.messages.map(m => m.id === assistantMsgId ? { ...m, content: accumulatedContent } : m);
        return { ...s, messages: msgs };
      }));

    } catch (err: any) {
      console.error('[EDUkenZA AI Diagnostic Log]:', err);
      const userFacingMsg = err.message || 'EDUkenZA AI is temporarily unavailable. Please try again.';
      showToast(userFacingMsg, 'error');
      setSessions(prevSessions => prevSessions.map(s => {
        if (s.id !== activeSessionId) return s;
        const msgs = s.messages.map(m => m.id === assistantMsgId ? { 
          ...m, 
          isError: true,
          content: `⚠️ **Unable to complete AI response**\n\n${userFacingMsg}\n\nPlease click **Retry** below or rephrase your request.` 
        } : m);
        return { ...s, messages: msgs };
      }));
    } finally {
      setIsStreaming(false);
    }
  };

  // Retry previous prompt on error
  const handleRetryMessage = (errorMsgIndex: number) => {
    if (isStreaming || !activeSession) return;
    const userPromptMsg = activeSession.messages.slice(0, errorMsgIndex).reverse().find(m => m.role === 'user');
    if (!userPromptMsg) return;

    const filteredMessages = activeSession.messages.filter((_, idx) => idx !== errorMsgIndex);
    setSessions(prev => prev.map(s => {
      if (s.id !== activeSessionId) return s;
      return { ...s, messages: filteredMessages };
    }));

    handleSendMessage(userPromptMsg.content);
  };

  // Continue Generating
  const handleContinueGenerating = async () => {
    if (isStreaming || !activeSession) return;
    const lastMsg = activeSession.messages[activeSession.messages.length - 1];
    if (!lastMsg || lastMsg.role !== 'assistant') return;

    setIsStreaming(true);
    setUserScrolledUp(false);

    try {
      const historyPayload = activeSession.messages.map(m => ({
        role: m.role,
        content: m.content
      }));

      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: "Please continue generating your previous response seamlessly from where you stopped. Complete remaining steps, explanations, equations, practice questions, or key takeaways without repeating prior lines.",
          history: historyPayload,
          role: userRole,
          targetTask,
          responseLength: aiSettings.responseLength,
          responseStyle: aiSettings.responseStyle,
          language: aiSettings.language
        })
      });

      if (!response.ok) throw new Error(`AI server status ${response.status}`);

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error('Reader unavailable');

      let accumulatedContinuedText = lastMsg.content + '\n\n---\n\n### Continued Output & Further Steps\n';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.replace('data: ', '').trim();
            if (dataStr === '[DONE]') break;

            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.text) {
                accumulatedContinuedText += parsed.text;
                
                setSessions(prevSessions => prevSessions.map(s => {
                  if (s.id !== activeSessionId) return s;
                  const msgs = s.messages.map((m, idx) => 
                    idx === s.messages.length - 1 ? { ...m, content: accumulatedContinuedText } : m
                  );
                  return { ...s, messages: msgs };
                }));
              }
            } catch (err) {}
          }
        }
      }
    } catch (err: any) {
      showToast('Failed to continue generation: ' + (err?.message || 'Error'), 'error');
    } finally {
      setIsStreaming(false);
    }
  };

  // Regenerate Response
  const handleRegenerateResponse = async (msgIndex: number) => {
    if (isStreaming || !activeSession) return;
    const userPromptMsg = activeSession.messages.slice(0, msgIndex).reverse().find(m => m.role === 'user');
    if (!userPromptMsg) return;

    // Truncate messages up to userPromptMsg
    const historyBefore = activeSession.messages.slice(0, activeSession.messages.indexOf(userPromptMsg));
    
    setSessions(prev => prev.map(s => {
      if (s.id !== activeSessionId) return s;
      return { ...s, messages: [...historyBefore, userPromptMsg] };
    }));

    handleSendMessage(userPromptMsg.content);
  };

  // Feedback Toggle
  const handleToggleFeedback = (msgId: string, type: 'like' | 'dislike') => {
    setSessions(prev => prev.map(s => {
      if (s.id !== activeSessionId) return s;
      const msgs = s.messages.map(m => {
        if (m.id !== msgId) return m;
        return { ...m, feedback: m.feedback === type ? null : type };
      });
      return { ...s, messages: msgs };
    }));
    showToast(`Feedback recorded: ${type === 'like' ? 'Helpful' : 'Needs improvement'}`, 'info');
  };

  // Bookmark Toggle
  const handleToggleBookmarkMessage = (msgId: string) => {
    setSessions(prev => prev.map(s => {
      if (s.id !== activeSessionId) return s;
      const msgs = s.messages.map(m => {
        if (m.id !== msgId) return m;
        return { ...m, isBookmarked: !m.isBookmarked };
      });
      return { ...s, messages: msgs };
    }));
    showToast('Message bookmark updated', 'success');
  };

  // Export File Generators
  const downloadTextFile = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Exported as ${filename}`, 'success');
  };

  const downloadWordDoc = (filename: string, content: string) => {
    const htmlHeader = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><title>${filename}</title><style>
        body { font-family: 'Calibri', 'Arial', sans-serif; font-size: 11pt; line-height: 1.5; color: #111827; }
        h1, h2, h3 { color: #002147; font-family: 'Calibri', sans-serif; }
        pre, code { background: #f3f4f6; padding: 4px; font-family: 'Consolas', monospace; }
        table { border-collapse: collapse; width: 100%; margin: 12px 0; }
        th, td { border: 1px solid #d1d5db; padding: 8px; text-align: left; }
        th { background: #002147; color: white; }
      </style></head><body>
    `;
    const htmlFooter = '</body></html>';
    const fullHtml = htmlHeader + content.replace(/\n/g, '<br/>') + htmlFooter;
    const blob = new Blob([fullHtml], { type: 'application/msword;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Exported Word Document: ${filename}`, 'success');
  };

  const printFormattedPdf = (title: string, content: string) => {
    const printWin = window.open('', '_blank');
    if (!printWin) {
      showToast('Pop-up blocked. Please allow popups to export PDF.', 'error');
      return;
    }
    printWin.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: system-ui, -apple-system, sans-serif; margin: 40px; color: #1e293b; line-height: 1.6; }
          .header { border-b: 3px solid #002147; padding-bottom: 12px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center; }
          .title { font-size: 20px; font-weight: 800; color: #002147; }
          .meta { font-size: 12px; color: #64748b; }
          .content { font-size: 13px; whitespace: pre-wrap; }
          table { width: 100%; border-collapse: collapse; margin: 16px 0; }
          th, td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; font-size: 12px; }
          th { background-color: #002147; color: white; }
          @media print { body { margin: 20px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="title">EDUkenZA AI Studio Output</div>
            <div class="meta">${title} | Generated: ${new Date().toLocaleString()}</div>
          </div>
        </div>
        <div class="content">${content}</div>
        <script>
          window.onload = function() { window.print(); window.close(); };
        </script>
      </body>
      </html>
    `);
    printWin.document.close();
  };

  // Role-based Quick Prompts
  const getRoleQuickPrompts = () => {
    return rolePersona.prompts;
  };

  const copyToClipboard = (txt: string) => {
    navigator.clipboard.writeText(txt);
    showToast('Copied to clipboard!', 'success');
  };

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-180px)] min-h-[680px] max-h-[960px] bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden relative">
      
      {/* LEFT CHAT HISTORY SIDEBAR */}
      <div className={`lg:w-80 bg-slate-900 text-white flex flex-col border-r border-slate-800 transition-all duration-300 z-20 shrink-0 ${
        showSidebar ? 'block w-full lg:w-80' : 'hidden lg:block lg:w-16'
      }`}>
        
        {/* SIDEBAR HEADER */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between gap-2 shrink-0">
          {showSidebar ? (
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#002147] border border-[#D4AF37]/60 flex items-center justify-center text-[#D4AF37]">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-xs uppercase tracking-wider text-white">Chats History</h3>
                  <span className="text-[10px] text-amber-400 font-bold uppercase">{userRole.replace('_', ' ')}</span>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={handleCreateSession}
                  className="p-2 bg-[#D4AF37] hover:bg-amber-400 text-[#002147] rounded-xl font-bold transition shadow cursor-pointer flex items-center gap-1 text-xs"
                  title="New Chat"
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">New</span>
                </button>
                <button
                  onClick={() => setShowSidebar(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                  title="Collapse Sidebar"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 w-full">
              <button
                onClick={() => setShowSidebar(true)}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-[#D4AF37] rounded-xl transition"
                title="Expand History"
              >
                <Menu className="w-5 h-5" />
              </button>
              <button
                onClick={handleCreateSession}
                className="p-2 bg-[#D4AF37] text-[#002147] rounded-xl font-bold transition"
                title="New Chat"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {showSidebar && (
          <div className="p-3 space-y-3 flex-1 flex flex-col min-h-0 overflow-hidden">
            
            {/* SEARCH INPUT */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search chats..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-800/90 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-400 outline-none focus:border-[#D4AF37]"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-2 top-2 text-slate-400 hover:text-white text-xs">
                  ✕
                </button>
              )}
            </div>

            {/* FILTER CATEGORY PILLS */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[11px] scrollbar-none border-b border-slate-800">
              {(['all', 'pinned', 'favorites', 'archived'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setHistoryFilter(f)}
                  className={`px-2.5 py-1 rounded-lg font-bold capitalize transition whitespace-nowrap cursor-pointer ${
                    historyFilter === f 
                      ? 'bg-[#002147] text-[#D4AF37] border border-[#D4AF37]/50' 
                      : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            {/* SESSIONS LIST GROUPED BY DATE */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin scrollbar-thumb-slate-700">
              {Object.entries(groupedFilteredSessions).map(([groupTitle, groupItems]) => {
                if (groupItems.length === 0) return null;

                return (
                  <div key={groupTitle} className="space-y-1.5">
                    <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-2 pt-1 flex items-center justify-between">
                      <span>{groupTitle}</span>
                      <span className="text-slate-500 font-mono">({groupItems.length})</span>
                    </div>

                    {groupItems.map(s => {
                      const isSelected = s.id === activeSessionId;
                      const isEditing = editingTitleId === s.id;

                      return (
                        <div
                          key={s.id}
                          onClick={() => setActiveSessionId(s.id)}
                          className={`p-2.5 rounded-2xl border transition cursor-pointer flex items-center justify-between group relative ${
                            isSelected 
                              ? 'bg-[#002147] border-[#D4AF37] text-white shadow-md' 
                              : 'bg-slate-800/50 hover:bg-slate-800 border-slate-700/60 text-slate-300'
                          }`}
                        >
                          <div className="truncate flex-1 pr-2">
                            {isEditing ? (
                              <input
                                type="text"
                                value={newTitle}
                                onChange={e => setNewTitle(e.target.value)}
                                onBlur={() => handleSaveTitle(s.id)}
                                onKeyDown={e => e.key === 'Enter' && handleSaveTitle(s.id)}
                                autoFocus
                                className="w-full px-2 py-0.5 bg-slate-900 border border-amber-400 rounded text-xs text-white outline-none"
                              />
                            ) : (
                              <div>
                                <div className="flex items-center gap-1.5 font-bold text-xs truncate">
                                  {s.isPinned && <Pin className="w-3 h-3 text-[#D4AF37] shrink-0" />}
                                  {s.isFavorite && <Star className="w-3 h-3 text-amber-400 fill-amber-400 shrink-0" />}
                                  <span className="truncate">{s.title}</span>
                                </div>
                                <span className="text-[10px] text-slate-400 font-mono block">
                                  {s.messages.length} messages
                                </span>
                              </div>
                            )}
                          </div>

                          {/* ACTION BUTTONS ON HOVER */}
                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition shrink-0">
                            <button
                              onClick={(e) => handleTogglePin(s.id, e)}
                              className={`p-1 hover:text-[#D4AF37] ${s.isPinned ? 'text-[#D4AF37]' : 'text-slate-400'}`}
                              title={s.isPinned ? 'Unpin' : 'Pin'}
                            >
                              <Pin className="w-3 h-3" />
                            </button>
                            <button
                              onClick={(e) => handleToggleFavorite(s.id, e)}
                              className={`p-1 hover:text-amber-400 ${s.isFavorite ? 'text-amber-400' : 'text-slate-400'}`}
                              title="Favorite"
                            >
                              <Star className="w-3 h-3" />
                            </button>
                            <button
                              onClick={(e) => handleRenameSession(s.id, e)}
                              className="p-1 text-slate-400 hover:text-white"
                              title="Rename"
                            >
                              <Edit3 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={(e) => handleDuplicateSession(s.id, e)}
                              className="p-1 text-slate-400 hover:text-emerald-400"
                              title="Duplicate"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                            <button
                              onClick={(e) => handleToggleArchive(s.id, e)}
                              className="p-1 text-slate-400 hover:text-sky-400"
                              title={s.isArchived ? 'Unarchive' : 'Archive'}
                            >
                              <Archive className="w-3 h-3" />
                            </button>
                            <button
                              onClick={(e) => handleDeleteSession(s.id, e)}
                              className="p-1 text-slate-400 hover:text-rose-400"
                              title="Delete"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            {/* SIDEBAR FOOTER */}
            <div className="pt-3 border-t border-slate-800 text-[10px] text-slate-400 flex items-center justify-between shrink-0">
              <span className="flex items-center gap-1 text-slate-300">
                <Brain className="w-3.5 h-3.5 text-[#D4AF37]" />
                <strong>Gemini 3.6 Flash</strong>
              </span>
              <button
                onClick={() => setShowSettingsModal(true)}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg flex items-center gap-1 font-bold cursor-pointer"
              >
                <Settings className="w-3 h-3 text-[#D4AF37]" />
                <span>AI Config</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* RIGHT MAIN WORKSPACE */}
      <div className="flex-1 flex flex-col justify-between h-full bg-slate-50 min-w-0 relative">
        
        {/* WORKSPACE TOP HEADER */}
        <div className="px-4 md:px-6 py-3 bg-white border-b border-slate-200 flex flex-wrap justify-between items-center gap-2 shrink-0 shadow-2xs z-10">
          <div className="flex items-center gap-3">
            {!showSidebar && (
              <button
                onClick={() => setShowSidebar(true)}
                className="p-2 bg-slate-100 hover:bg-slate-200 text-[#002147] rounded-xl transition cursor-pointer"
                title="Open Sidebar"
              >
                <Menu className="w-4 h-4" />
              </button>
            )}

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm md:text-base font-black text-[#002147] tracking-tight">
                  {activeSession?.title}
                </h2>
                {activeSession?.isPinned && <span className="px-2 py-0.5 bg-amber-100 text-amber-900 rounded-full text-[10px] font-bold">Pinned</span>}
                {activeSession?.isFavorite && <span className="px-2 py-0.5 bg-yellow-100 text-yellow-900 rounded-full text-[10px] font-bold">Favorite</span>}
              </div>
              <p className="text-[11px] text-slate-500 font-medium hidden sm:block">
                Multimodal educational assistant with KaTeX LaTeX formulas, step-by-step reasoning, and multi-file document extraction.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* TASK DOMAIN SELECTOR */}
            <select
              value={targetTask}
              onChange={(e: any) => setTargetTask(e.target.value)}
              className="px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-[#002147] outline-none cursor-pointer"
            >
              <option value="general">General AI</option>
              <option value="math">Mathematics (KaTeX)</option>
              <option value="science">Physical Science</option>
              <option value="coding">Coding & CS</option>
              <option value="lesson_plan">Lesson Planning</option>
              <option value="study_plan">Study Guide</option>
            </select>

            <button
              onClick={() => setShowExportModal(true)}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-[#002147] rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
              title="Export Full Chat"
            >
              <Download className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span className="hidden sm:inline">Export</span>
            </button>

            <button
              onClick={() => setShowShareModal(true)}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-[#002147] rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
              title="Share Chat"
            >
              <Share2 className="w-3.5 h-3.5 text-sky-600" />
              <span className="hidden sm:inline">Share</span>
            </button>

            <button
              onClick={() => setShowSettingsModal(true)}
              className="p-2 bg-[#002147] text-white rounded-xl hover:bg-[#003366] transition cursor-pointer shadow-sm"
              title="AI Settings"
            >
              <Settings className="w-4 h-4 text-[#D4AF37]" />
            </button>
          </div>
        </div>

        {/* MESSAGES LIST CONTAINER - FULL NATURAL VERTICAL EXPANSION */}
        <div 
          ref={messagesContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 scrollbar-thin scrollbar-thumb-slate-300 relative"
        >
          {/* PROFESSIONAL ROLE-ADAPTED EMPTY STATE */}
          {(!activeSession?.messages || activeSession.messages.length <= 1) && !isStreaming && (
            <div className="my-4 p-6 md:p-8 bg-gradient-to-br from-white to-slate-50 border border-slate-200/90 rounded-3xl shadow-xs space-y-6">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-5 border-b border-slate-100">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-[#002147] border-2 border-[#D4AF37] flex items-center justify-center text-[#D4AF37] shadow-sm shrink-0">
                    <Bot className="w-7 h-7" />
                  </div>
                  <div>
                    <span className="px-3 py-1 rounded-full bg-[#002147]/10 text-[#002147] font-bold text-xs uppercase tracking-wider">
                      {rolePersona.title}
                    </span>
                    <h3 className="text-xl md:text-2xl font-black text-[#002147] tracking-tight mt-1">
                      {rolePersona.heading}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium max-w-2xl mt-0.5">
                      {rolePersona.subtitle}
                    </p>
                  </div>
                </div>
              </div>

              {/* SUGGESTED PROMPTS GRID */}
              <div>
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
                  Suggested starting prompts:
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {rolePersona.prompts.map((p, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setPromptInput(p.prompt);
                      }}
                      className="p-3.5 bg-white hover:bg-slate-50 border border-slate-200 hover:border-[#002147]/40 rounded-2xl text-left transition shadow-2xs group cursor-pointer flex flex-col justify-between"
                    >
                      <span className="font-bold text-xs text-[#002147] group-hover:text-[#003366] flex items-center justify-between">
                        {p.label}
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#002147] transition-transform group-hover:translate-x-0.5" />
                      </span>
                      <span className="text-[11px] text-slate-500 line-clamp-2 mt-1">
                        "{p.prompt}"
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {(activeSession?.messages || []).map((msg, msgIndex) => {
            const isUser = msg.role === 'user';
            const isLastMessage = msgIndex === activeSession.messages.length - 1;

            return (
              <div
                key={msg.id}
                className={`flex gap-3 w-full ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 text-white font-bold text-xs shadow-sm ${
                  isUser ? 'bg-[#002147]' : 'bg-gradient-to-br from-[#002147] to-[#0b3c5d] text-[#D4AF37] border border-[#D4AF37]/50'
                }`}>
                  {isUser ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5 text-[#D4AF37]" />}
                </div>

                <div className={`w-full max-w-5xl p-4 md:p-6 rounded-3xl space-y-3 shadow-sm text-sm ${
                  isUser 
                    ? 'bg-[#002147] text-white rounded-tr-none' 
                    : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none'
                }`}>
                  
                  {/* MESSAGE HEADER */}
                  <div className="flex justify-between items-center text-[11px] opacity-80 font-mono pb-2 border-b border-slate-100/30">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold">{isUser ? 'You' : rolePersona.title}</span>
                      {!isUser && (
                        <span className="px-2 py-0.5 rounded-full bg-[#002147]/10 text-[#002147] font-sans font-bold text-[10px] capitalize">
                          {rolePersona.shortRole}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {msg.isBookmarked && <Bookmark className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />}
                      <span>{msg.timestamp}</span>
                    </div>
                  </div>

                  {/* ATTACHMENTS DISPLAY */}
                  {msg.images && msg.images.length > 0 && (
                    <div className="flex gap-2 my-2 flex-wrap">
                      {msg.images.map((img, i) => (
                        <img key={i} src={img} alt="Uploaded attachment" className="w-48 h-48 object-cover rounded-2xl border border-slate-300 shadow-sm" />
                      ))}
                    </div>
                  )}

                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="flex gap-2 my-2 flex-wrap">
                      {msg.attachments.map((att, i) => (
                        <div key={i} className="px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs flex items-center gap-2 font-mono text-slate-700">
                          <FileText className="w-4 h-4 text-[#002147]" />
                          <span className="font-bold truncate max-w-[180px]">{att.name}</span>
                          <span className="text-[10px] text-slate-400">({att.size})</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* FULL UNLIMITED NATURAL EXPANDING MARKDOWN & MATH RENDERER OR ERROR NOTICE */}
                  <div className="w-full min-w-0">
                    {msg.isError ? (
                      <div className="p-4 bg-amber-50/90 border border-amber-200/90 rounded-2xl space-y-3 text-slate-800">
                        <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                          <AlertTriangle className="w-4 h-4 text-amber-600" />
                          <span>EDUkenZA AI Service Notice</span>
                        </div>
                        <p className="text-xs text-slate-700 font-medium">
                          EDUkenZA AI is temporarily unavailable. Please try again.
                        </p>
                        <button
                          onClick={() => handleRetryMessage(msgIndex)}
                          className="px-3.5 py-1.5 bg-[#002147] hover:bg-[#003366] text-white rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                        >
                          <RefreshCw className="w-3.5 h-3.5 text-[#D4AF37]" />
                          <span>Retry Prompt</span>
                        </button>
                      </div>
                    ) : (
                      <MathScienceRenderer content={msg.content} className={isUser ? 'text-white' : 'text-slate-800'} />
                    )}
                  </div>

                  {/* ASSISTANT MESSAGE TOOLBAR */}
                  {!isUser && msg.content && (
                    <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          onClick={() => copyToClipboard(msg.content)}
                          className="p-1.5 hover:text-[#002147] hover:bg-slate-100 rounded-lg flex items-center gap-1 font-bold cursor-pointer transition"
                          title="Copy text"
                        >
                          <Copy className="w-3.5 h-3.5 text-[#D4AF37]" />
                          <span>Copy</span>
                        </button>

                        <button
                          onClick={() => handleRegenerateResponse(msgIndex)}
                          className="p-1.5 hover:text-[#002147] hover:bg-slate-100 rounded-lg flex items-center gap-1 font-bold cursor-pointer transition"
                          title="Regenerate"
                        >
                          <RefreshCw className="w-3.5 h-3.5 text-sky-600" />
                          <span>Regenerate</span>
                        </button>

                        <button
                          onClick={() => {
                            setExportTargetMsg(msg);
                            setShowExportModal(true);
                          }}
                          className="p-1.5 hover:text-[#002147] hover:bg-slate-100 rounded-lg flex items-center gap-1 font-bold cursor-pointer transition"
                          title="Export"
                        >
                          <Download className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Export</span>
                        </button>

                        <button
                          onClick={() => handleToggleBookmarkMessage(msg.id)}
                          className={`p-1.5 hover:bg-slate-100 rounded-lg flex items-center gap-1 font-bold cursor-pointer transition ${
                            msg.isBookmarked ? 'text-amber-600' : 'hover:text-amber-600'
                          }`}
                          title="Bookmark"
                        >
                          <Bookmark className="w-3.5 h-3.5" />
                        </button>

                        <div className="flex items-center border-l border-slate-200 pl-2 gap-1">
                          <button
                            onClick={() => handleToggleFeedback(msg.id, 'like')}
                            className={`p-1.5 rounded-lg transition cursor-pointer ${
                              msg.feedback === 'like' ? 'bg-emerald-100 text-emerald-700 font-bold' : 'hover:bg-slate-100 text-slate-400'
                            }`}
                            title="Helpful"
                          >
                            <ThumbsUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleToggleFeedback(msg.id, 'dislike')}
                            className={`p-1.5 rounded-lg transition cursor-pointer ${
                              msg.feedback === 'dislike' ? 'bg-rose-100 text-rose-700 font-bold' : 'hover:bg-slate-100 text-slate-400'
                            }`}
                            title="Needs Improvement"
                          >
                            <ThumbsDown className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {onInsertToAssignment && (
                          <button
                            onClick={() => onInsertToAssignment(msg.content)}
                            className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg font-bold flex items-center gap-1 cursor-pointer transition text-[11px]"
                          >
                            <FileText className="w-3 h-3" />
                            <span>Insert to Assignment</span>
                          </button>
                        )}
                      </div>

                      {/* CONTINUE GENERATING BUTTON */}
                      {isLastMessage && !isStreaming && (
                        <button
                          onClick={handleContinueGenerating}
                          className="px-3 py-1 bg-[#002147] hover:bg-[#003366] text-[#D4AF37] rounded-xl font-bold flex items-center gap-1.5 cursor-pointer transition shadow-sm text-xs border border-[#D4AF37]/50"
                          title="Continue generating next steps / details"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
                          <span>Continue Generating</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* STREAMING / THINKING INDICATOR */}
          {isStreaming && (
            <div className="flex gap-3 w-full max-w-5xl animate-fadeIn">
              <div className="w-9 h-9 rounded-2xl bg-[#002147] border border-[#D4AF37]/50 text-[#D4AF37] flex items-center justify-center shrink-0 shadow-sm">
                <Bot className="w-5 h-5 animate-pulse text-[#D4AF37]" />
              </div>
              <div className="px-5 py-3.5 bg-white border border-slate-200 rounded-3xl rounded-tl-none text-xs text-slate-700 flex items-center gap-3.5 shadow-xs">
                <div className="flex gap-1.5 items-center">
                  <span className="w-2 h-2 rounded-full bg-[#002147] animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-2 h-2 rounded-full bg-[#D4AF37] animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-2 h-2 rounded-full bg-[#002147] animate-bounce" />
                </div>
                <div>
                  <span className="font-extrabold text-[#002147] block text-xs">EDUkenZA AI is thinking...</span>
                  <span className="text-[11px] text-slate-500 font-medium">Formulating educational breakdown and LaTeX equations</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />

          {/* FLOATING SCROLL TO BOTTOM BADGE */}
          {userScrolledUp && (
            <button
              onClick={scrollToBottom}
              className="sticky bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-[#002147] text-white rounded-full font-bold text-xs shadow-2xl flex items-center gap-2 border border-[#D4AF37] hover:bg-[#003366] transition cursor-pointer z-20"
            >
              <ArrowDown className="w-4 h-4 text-[#D4AF37] animate-bounce" />
              <span>Jump to newest content</span>
            </button>
          )}
        </div>

        {/* BOTTOM INPUT & QUICK PROMPTS AREA */}
        <div className="p-4 bg-white border-t border-slate-200 shrink-0 space-y-3">
          
          {/* QUICK PROMPTS CHIPS BY ROLE */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
              <Wand2 className="w-3 h-3 text-[#D4AF37]" /> Prompts:
            </span>
            {getRoleQuickPrompts().map((qp, idx) => (
              <button
                key={idx}
                onClick={() => setPromptInput(qp.prompt)}
                className="px-3 py-1 bg-slate-100 hover:bg-[#002147] hover:text-white text-slate-700 font-bold rounded-full transition whitespace-nowrap cursor-pointer text-[11px] border border-slate-200"
              >
                {qp.label}
              </button>
            ))}
          </div>

          {/* ATTACHMENTS PREVIEW CHIPS */}
          {attachedFiles.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1 text-xs">
              {attachedFiles.map((file, idx) => (
                <div key={idx} className="p-2 bg-slate-100 border border-slate-200 rounded-2xl flex items-center gap-2 text-xs font-mono">
                  {file.base64 ? (
                    <img src={file.base64} alt="Preview" className="w-7 h-7 rounded-lg object-cover" />
                  ) : (
                    <FileText className="w-5 h-5 text-[#002147]" />
                  )}
                  <div className="truncate max-w-[140px]">
                    <div className="font-bold truncate text-slate-800">{file.name}</div>
                    <div className="text-[10px] text-slate-400">{file.size}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAttachedFiles(attachedFiles.filter((_, i) => i !== idx))}
                    className="text-slate-400 hover:text-rose-600 font-bold px-1"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* VOICE LISTENING INTERIM STATUS BAR */}
          {isListening && (
            <div className="bg-[#002147] text-white px-4 py-2.5 rounded-2xl flex items-center justify-between shadow-md border border-[#D4AF37]/50 text-xs animate-in fade-in">
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
                    Speak clearly into your microphone (e.g. math equations, chemistry formulas, questions)
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={stopVoiceInput}
                className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold rounded-xl transition cursor-pointer shrink-0 ml-2"
              >
                Stop
              </button>
            </div>
          )}

          {/* FORM INPUT AREA */}
          <form onSubmit={e => { e.preventDefault(); handleSendMessage(); }} className="flex gap-2 items-end">
            <label className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl cursor-pointer transition shrink-0" title="Attach Document / PDF / Image">
              <Paperclip className="w-4 h-4 text-[#002147]" />
              <input type="file" multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.txt,.zip" onChange={handleFileUpload} className="hidden" />
            </label>

            {/* VOICE DICTATION BUTTON */}
            <button
              type="button"
              onClick={() => {
                if (!isVoiceSupported) {
                  showToast('Voice dictation is not supported in this browser. Please use a supported browser or type your message.', 'error');
                  return;
                }
                if (voiceErrorMessage) {
                  resetVoiceError();
                }
                toggleVoiceInput();
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
              className={`p-3 rounded-2xl transition shrink-0 cursor-pointer flex items-center justify-center relative ${
                !isVoiceSupported
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : voiceState === 'error'
                  ? 'bg-red-100 text-red-600 border border-red-300'
                  : isListening
                  ? 'bg-red-600 text-white shadow-lg shadow-red-500/30 ring-2 ring-red-400'
                  : voiceState === 'processing'
                  ? 'bg-amber-400 text-slate-900 animate-pulse'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
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
                <Mic className="w-4 h-4 text-[#002147]" />
              )}
            </button>

            <div className="flex-1 bg-slate-50 border border-slate-200 focus-within:border-[#002147] focus-within:ring-2 focus-within:ring-[#002147]/20 rounded-2xl px-4 py-2 transition flex items-center">
              <textarea
                ref={textareaRef}
                rows={2}
                placeholder={`Ask EDUkenZA AI (${targetTask.toUpperCase()})... Press Enter to send.`}
                value={promptInput}
                onChange={e => setPromptInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                className="w-full bg-transparent text-xs md:text-sm font-medium outline-none resize-none text-slate-800 placeholder-slate-400 scrollbar-none"
              />
            </div>

            <button
              type="submit"
              disabled={isStreaming || (!promptInput.trim() && attachedFiles.length === 0)}
              className="px-5 py-3 bg-[#002147] hover:bg-[#003366] text-white font-black text-xs md:text-sm rounded-2xl transition flex items-center gap-2 cursor-pointer shadow-md disabled:opacity-50 shrink-0"
            >
              <Send className="w-4 h-4 text-[#D4AF37]" />
              <span className="hidden sm:inline">Send</span>
            </button>
          </form>
        </div>

      </div>

      {/* AI CONFIGURATION SETTINGS MODAL */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 border border-slate-200 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-[#D4AF37]" />
                <h3 className="font-black text-base text-[#002147]">AI Engine Configuration</h3>
              </div>
              <button onClick={() => setShowSettingsModal(false)} className="text-slate-400 hover:text-slate-600 font-bold text-lg">✕</button>
            </div>

            <div className="space-y-4 text-xs font-medium text-slate-700">
              <div>
                <label className="block font-bold text-slate-900 mb-1">Response Detail & Length</label>
                <select
                  value={aiSettings.responseLength}
                  onChange={e => setAiSettings({ ...aiSettings, responseLength: e.target.value as any })}
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none"
                >
                  <option value="short">Short & Concise (Under 200 words)</option>
                  <option value="medium">Balanced (Standard Educational)</option>
                  <option value="long">Detailed (Thorough Examples)</option>
                  <option value="very_detailed">Exhaustive Textbook Breakdown</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-900 mb-1">Response Style / Persona</label>
                <select
                  value={aiSettings.responseStyle}
                  onChange={e => setAiSettings({ ...aiSettings, responseStyle: e.target.value as any })}
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none"
                >
                  <option value="default">Default Educational Assistant</option>
                  <option value="teacher">Encouraging Pedagogical Teacher</option>
                  <option value="professional">Formal & Precise Professional</option>
                  <option value="student">Step-by-step Patient Tutor</option>
                  <option value="parent">Reassuring Parent Coach</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-900 mb-1">Creativity / Temperature</label>
                <select
                  value={aiSettings.creativity}
                  onChange={e => setAiSettings({ ...aiSettings, creativity: e.target.value as any })}
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none"
                >
                  <option value="low">Low (Factual & Mathematical Precision - 0.2)</option>
                  <option value="medium">Medium (Balanced Reasoning - 0.7)</option>
                  <option value="high">High (Creative & Brainstorming - 1.0)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-900 mb-1">Target Language</label>
                <select
                  value={aiSettings.language}
                  onChange={e => setAiSettings({ ...aiSettings, language: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none"
                >
                  <option value="English">English</option>
                  <option value="Afrikaans">Afrikaans</option>
                  <option value="isiZulu">isiZulu</option>
                  <option value="isiXhosa">isiXhosa</option>
                  <option value="French">French</option>
                </select>
              </div>
            </div>

            <button
              onClick={() => {
                setShowSettingsModal(false);
                showToast('AI Settings updated successfully', 'success');
              }}
              className="w-full py-3 bg-[#002147] hover:bg-[#003366] text-white font-black text-xs rounded-xl transition cursor-pointer shadow-md"
            >
              Save Configuration
            </button>
          </div>
        </div>
      )}

      {/* EXPORT MODAL */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 border border-slate-200 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <Download className="w-5 h-5 text-[#D4AF37]" />
                <h3 className="font-black text-base text-[#002147]">
                  {exportTargetMsg ? 'Export Single Response' : 'Export Full Chat'}
                </h3>
              </div>
              <button onClick={() => { setShowExportModal(false); setExportTargetMsg(null); }} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>

            <p className="text-xs text-slate-600">
              Select your preferred export format. Math equations and table structures will be preserved.
            </p>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => {
                  const content = exportTargetMsg ? exportTargetMsg.content : activeSession.messages.map(m => `[${m.role.toUpperCase()} - ${m.timestamp}]\n${m.content}\n`).join('\n---\n');
                  downloadTextFile(`${activeSession.title.replace(/\s+/g, '_')}.txt`, content);
                  setShowExportModal(false);
                  setExportTargetMsg(null);
                }}
                className="p-3 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-2xl flex flex-col items-center gap-1 font-bold text-xs text-slate-800 transition cursor-pointer"
              >
                <FileText className="w-5 h-5 text-[#002147]" />
                <span>Text File (.txt)</span>
              </button>

              <button
                onClick={() => {
                  const content = exportTargetMsg ? exportTargetMsg.content : activeSession.messages.map(m => `### ${m.role === 'user' ? 'User' : 'EDUkenZA AI'} (${m.timestamp})\n\n${m.content}\n`).join('\n\n---\n\n');
                  downloadTextFile(`${activeSession.title.replace(/\s+/g, '_')}.md`, content);
                  setShowExportModal(false);
                  setExportTargetMsg(null);
                }}
                className="p-3 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-2xl flex flex-col items-center gap-1 font-bold text-xs text-slate-800 transition cursor-pointer"
              >
                <FileCode className="w-5 h-5 text-sky-600" />
                <span>Markdown (.md)</span>
              </button>

              <button
                onClick={() => {
                  const content = exportTargetMsg ? exportTargetMsg.content : activeSession.messages.map(m => `<h2>${m.role === 'user' ? 'User' : 'EDUkenZA AI'}</h2><p>${m.content}</p>`).join('<hr/>');
                  downloadWordDoc(`${activeSession.title.replace(/\s+/g, '_')}.doc`, content);
                  setShowExportModal(false);
                  setExportTargetMsg(null);
                }}
                className="p-3 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-2xl flex flex-col items-center gap-1 font-bold text-xs text-slate-800 transition cursor-pointer"
              >
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                <span>Word Document (.doc)</span>
              </button>

              <button
                onClick={() => {
                  const content = exportTargetMsg ? exportTargetMsg.content : activeSession.messages.map(m => `${m.role.toUpperCase()} (${m.timestamp}):\n${m.content}\n`).join('\n---\n');
                  printFormattedPdf(activeSession.title, content);
                  setShowExportModal(false);
                  setExportTargetMsg(null);
                }}
                className="p-3 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-2xl flex flex-col items-center gap-1 font-bold text-xs text-slate-800 transition cursor-pointer"
              >
                <Printer className="w-5 h-5 text-purple-600" />
                <span>Formatted PDF Print</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SHARE MODAL */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 border border-slate-200 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <Share2 className="w-5 h-5 text-sky-600" />
                <h3 className="font-black text-base text-[#002147]">Share AI Chat Session</h3>
              </div>
              <button onClick={() => setShowShareModal(false)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>

            <p className="text-xs text-slate-600">
              Copy formatted summary link or raw conversation text to share with colleagues, students, or parents.
            </p>

            <div className="p-3 bg-slate-100 border border-slate-200 rounded-2xl text-xs font-mono text-slate-700 space-y-2">
              <div className="font-bold text-[#002147]">{activeSession.title}</div>
              <div className="text-[11px] text-slate-500">{activeSession.messages.length} messages in conversation</div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  const shareText = `📚 *EDUkenZA AI Chat Summary*: ${activeSession.title}\n\n${activeSession.messages.map(m => `*${m.role.toUpperCase()}*: ${m.content}`).join('\n\n')}`;
                  copyToClipboard(shareText);
                  setShowShareModal(false);
                }}
                className="flex-1 py-2.5 bg-[#002147] hover:bg-[#003366] text-white font-bold text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Copy className="w-4 h-4 text-[#D4AF37]" />
                <span>Copy Summary Text</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
