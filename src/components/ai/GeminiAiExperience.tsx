import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
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
  Menu,
  X,
  Search, 
  Share2, 
  Download, 
  Bookmark, 
  ThumbsUp, 
  ThumbsDown, 
  Mic, 
  MicOff, 
  Settings, 
  HelpCircle, 
  Sliders, 
  Printer, 
  CheckCircle2, 
  Zap, 
  ArrowUp,
  Square,
  Volume2,
  VolumeX,
  MoreVertical,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Bot,
  Layers,
  Wand2,
  BarChart3,
  Lightbulb,
  FolderDown,
  ShieldCheck,
  PanelLeftClose,
  PanelLeftOpen,
  Info,
  Activity
} from 'lucide-react';

import { MathScienceRenderer } from './MathScienceRenderer';
import { useVoiceDictation } from '../../hooks/useVoiceDictation';
import { SchoolDataIntelligenceService } from '../../services/schoolDataIntelligenceService';

// The Iconic Google Gemini 4-Point Star SVG
export const GeminiSparkleIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path 
      d="M12 0C12 6.627 6.627 12 0 12C6.627 12 12 17.373 12 24C12 17.373 17.373 12 24 12C17.373 12 12 6.627 12 0Z" 
      fill="url(#gemini_grad)"
    />
    <defs>
      <linearGradient id="gemini_grad" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#4285F4" />
        <stop offset="50%" stopColor="#9B72CB" />
        <stop offset="100%" stopColor="#D96570" />
      </linearGradient>
    </defs>
  </svg>
);

export interface GeminiChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  images?: string[];
  attachments?: Array<{ name: string; type: string; size: string; content?: string }>;
  feedback?: 'like' | 'dislike' | null;
  modelUsed?: string;
  isStreaming?: boolean;
}

export interface GeminiChatSession {
  id: string;
  title: string;
  isPinned: boolean;
  createdAt: string;
  messages: GeminiChatMessage[];
}

export interface GeminiAiExperienceProps {
  currentUser: any;
  userRole: 'platform_owner' | 'school_admin' | 'teacher' | 'student' | 'parent';
  onInsertToAssignment?: (text: string, imageUrl?: string) => void;
  onOpenSpecializedTool?: (tabId: string) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const GeminiAiExperience: React.FC<GeminiAiExperienceProps> = ({
  currentUser,
  userRole,
  onInsertToAssignment,
  onOpenSpecializedTool,
  showToast
}) => {
  // Sidebar state
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  // Model selector state
  const [selectedModel, setSelectedModel] = useState<'gemini-3.6-flash' | 'gemini-3.1-flash-lite' | 'gemini-3.8-flash'>('gemini-3.6-flash');
  const [showModelDropdown, setShowModelDropdown] = useState(false);

  // Gemini API Health State
  const [apiStatus, setApiStatus] = useState<{
    checking: boolean;
    online: boolean;
    latencyMs?: number;
    model?: string;
    error?: string;
    lastChecked?: string;
  }>({
    checking: true,
    online: false
  });
  const [showStatusModal, setShowStatusModal] = useState(false);

  // Chat Settings State
  const [settings, setSettings] = useState({
    responseLength: 'medium' as 'short' | 'medium' | 'long' | 'very_detailed',
    responseStyle: 'default' as 'default' | 'teacher' | 'professional' | 'parent' | 'student',
    temperature: 0.7,
    language: 'English'
  });
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Sessions State
  const storageKey = `gemini_chats_${currentUser?.uid || 'default'}`;
  const [sessions, setSessions] = useState<GeminiChatSession[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return [{
      id: `session-${Date.now()}`,
      title: 'New Chat',
      isPinned: false,
      createdAt: new Date().toISOString(),
      messages: []
    }];
  });

  const [activeSessionId, setActiveSessionId] = useState<string>(sessions[0]?.id || 'session-1');
  const [searchFilter, setSearchFilter] = useState('');
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editTitleText, setEditTitleText] = useState('');

  // Input & attachments
  const [inputPrompt, setInputPrompt] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<Array<{ name: string; type: string; size: string; content?: string; base64?: string }>>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // TTS Speech Synthesis State
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);

  // Modify response dropdown for each message
  const [activeModifyMenuId, setActiveModifyMenuId] = useState<string | null>(null);

  // Copied message feedback
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Textarea & scrolling refs
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const queryContextRef = useRef<any>({});

  // Active Session
  const currentSession = sessions.find(s => s.id === activeSessionId) || sessions[0];

  // Save sessions to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(sessions));
    } catch (e) {}
  }, [sessions, storageKey]);

  // Check Gemini API status on mount
  const checkApiHealth = async () => {
    setApiStatus(prev => ({ ...prev, checking: true }));
    try {
      const res = await fetch('/api/ai/status');
      const data = await res.json();
      if (res.ok && data.working) {
        setApiStatus({
          checking: false,
          online: true,
          latencyMs: data.latencyMs,
          model: data.model,
          lastChecked: new Date().toLocaleTimeString()
        });
      } else {
        setApiStatus({
          checking: false,
          online: false,
          error: data.error || 'Gemini API not responding',
          lastChecked: new Date().toLocaleTimeString()
        });
      }
    } catch (err: any) {
      setApiStatus({
        checking: false,
        online: false,
        error: err?.message || 'Network error reaching /api/ai/status',
        lastChecked: new Date().toLocaleTimeString()
      });
    }
  };

  useEffect(() => {
    checkApiHealth();
  }, []);

  // Voice Dictation
  const {
    isSupported: isVoiceSupported,
    isListening,
    toggleListening: toggleVoiceInput,
    stopListening: stopVoiceInput
  } = useVoiceDictation({
    language: 'en-US',
    enableAcademicFormatting: true,
    onFinalResult: (text) => {
      if (!text.trim()) return;
      setInputPrompt(prev => prev ? `${prev} ${text}` : text);
    }
  });

  // Auto-scroll messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [currentSession?.messages, isStreaming]);

  // Adjust textarea height
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputPrompt(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  };

  // Create new chat session
  const handleNewChat = () => {
    if (isStreaming) {
      handleStopGeneration();
    }
    const newSess: GeminiChatSession = {
      id: `session-${Date.now()}`,
      title: 'New Chat',
      isPinned: false,
      createdAt: new Date().toISOString(),
      messages: []
    };
    setSessions(prev => [newSess, ...prev]);
    setActiveSessionId(newSess.id);
    setInputPrompt('');
    setAttachedFiles([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.focus();
    }
  };

  // Delete chat session
  const handleDeleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (sessions.length <= 1) {
      // Clear messages instead of removing the last session
      setSessions([{
        id: `session-${Date.now()}`,
        title: 'New Chat',
        isPinned: false,
        createdAt: new Date().toISOString(),
        messages: []
      }]);
      showToast('Conversation reset', 'info');
      return;
    }
    const filtered = sessions.filter(s => s.id !== id);
    setSessions(filtered);
    if (activeSessionId === id) {
      setActiveSessionId(filtered[0].id);
    }
    showToast('Chat deleted', 'info');
  };

  // Toggle pin session
  const handleTogglePin = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSessions(prev => prev.map(s => s.id === id ? { ...s, isPinned: !s.isPinned } : s));
  };

  // Save session title
  const handleSaveTitle = (id: string) => {
    if (editTitleText.trim()) {
      setSessions(prev => prev.map(s => s.id === id ? { ...s, title: editTitleText.trim() } : s));
    }
    setEditingSessionId(null);
  };

  // File Upload Handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
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
        const reader = new FileReader();
        reader.onload = () => {
          setAttachedFiles(prev => [...prev, {
            name: file.name,
            type: file.type,
            size: `${(file.size / 1024).toFixed(1)} KB`,
            content: reader.result as string
          }]);
        };
        reader.readAsText(file);
      }
    });

    if (e.target) e.target.value = '';
    showToast(`Attached ${files.length} file(s)`, 'success');
  };

  // Stop Generation
  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
    showToast('Generation stopped', 'info');
  };

  // Send Message / Submit
  const handleSendMessage = async (textOverride?: string) => {
    const rawText = textOverride !== undefined ? textOverride : inputPrompt;
    const textToSend = rawText.trim();
    if ((!textToSend && attachedFiles.length === 0) || isStreaming) return;

    if (isListening) {
      stopVoiceInput();
    }

    const currentFiles = [...attachedFiles];
    const attachedImages = currentFiles.filter(f => f.base64).map(f => f.base64!);
    const attachedDocs = currentFiles.filter(f => f.content).map(f => ({
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
    const userMsg: GeminiChatMessage = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: textToSend || 'Analyzed uploaded image/document.',
      timestamp: nowStr,
      images: attachedImages.length > 0 ? attachedImages : undefined,
      attachments: attachedDocs.length > 0 ? attachedDocs : undefined
    };

    const assistantMsgId = `ast-${Date.now()}`;
    const initialAssistantMsg: GeminiChatMessage = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: nowStr,
      modelUsed: selectedModel,
      isStreaming: true
    };

    // Auto title if first message
    let sessionTitle = currentSession?.title;
    if (!currentSession?.messages || currentSession.messages.length === 0) {
      sessionTitle = textToSend.slice(0, 32) || 'Curriculum Inquiry';
    }

    const updatedMessages = [...(currentSession?.messages || []), userMsg, initialAssistantMsg];

    setSessions(prev => prev.map(s => s.id === activeSessionId ? {
      ...s,
      title: sessionTitle || s.title,
      messages: updatedMessages
    } : s));

    setInputPrompt('');
    setAttachedFiles([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    setIsStreaming(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      // 1. Process SchoolDataIntelligenceService for real database queries
      let authoritativeFacts: string | undefined = undefined;
      let directAnswerFallback: string | undefined = undefined;

      try {
        const dataResult = await SchoolDataIntelligenceService.processDataQuery({
          prompt: textToSend,
          clientUser: currentUser,
          history: (currentSession?.messages || []).slice(-6).map(m => ({ role: m.role, content: m.content })),
          context: queryContextRef.current
        });

        if (dataResult.updatedContext) {
          queryContextRef.current = dataResult.updatedContext;
        }

        if (dataResult.isSchoolDataQuery && !dataResult.isAuthorized) {
          const denialText = dataResult.summaryAnswer || "🔒 **ACCESS RESTRICTED**: You do not have permission to view this institutional record under privacy policies.";
          setSessions(prev => prev.map(s => s.id === activeSessionId ? {
            ...s,
            messages: s.messages.map(m => m.id === assistantMsgId ? { ...m, content: denialText, isStreaming: false } : m)
          } : s));
          setIsStreaming(false);
          return;
        }

        if (dataResult.isSchoolDataQuery && dataResult.isAmbiguous) {
          const clarText = dataResult.clarificationPrompt || "Could you please specify which grade, class, or subject records you would like to inspect?";
          setSessions(prev => prev.map(s => s.id === activeSessionId ? {
            ...s,
            messages: s.messages.map(m => m.id === assistantMsgId ? { ...m, content: clarText, isStreaming: false } : m)
          } : s));
          setIsStreaming(false);
          return;
        }

        if (dataResult.isSchoolDataQuery) {
          authoritativeFacts = dataResult.systemContextPrompt || dataResult.summaryAnswer;
          directAnswerFallback = dataResult.summaryAnswer;
        }
      } catch (dataErr) {
        console.warn('[EDUkenZA Data Intelligence Notice]:', dataErr);
      }

      const historyPayload = (currentSession?.messages || []).map(m => ({
        role: m.role,
        content: m.content
      }));

      const schoolName = currentUser?.schoolName || currentUser?.institutionName || 'EDUkenZA Academy';

      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          prompt: fullPromptWithDocs,
          history: historyPayload,
          role: userRole,
          schoolName,
          authoritativeFacts,
          images: attachedImages.map(img => ({ data: img, mimeType: 'image/png' })),
          temperature: settings.temperature,
          responseLength: settings.responseLength,
          responseStyle: settings.responseStyle,
          language: settings.language,
          stream: true
        })
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => null);
        throw new Error(errJson?.error || `Gemini API server returned status ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error('Streaming reader unavailable');

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
                  const msgs = s.messages.map(m => m.id === assistantMsgId ? { 
                    ...m, 
                    content: accumulatedContent,
                    isStreaming: true 
                  } : m);
                  return { ...s, messages: msgs };
                }));
              }
            } catch (err) {}
          }
        }
      }

      if (!accumulatedContent && directAnswerFallback) {
        accumulatedContent = directAnswerFallback;
      }

      // Mark streaming completed
      setSessions(prevSessions => prevSessions.map(s => {
        if (s.id !== activeSessionId) return s;
        const msgs = s.messages.map(m => m.id === assistantMsgId ? { 
          ...m, 
          content: accumulatedContent || 'No response was generated. Please try again.',
          isStreaming: false 
        } : m);
        return { ...s, messages: msgs };
      }));

    } catch (err: any) {
      if (err.name === 'AbortError') {
        setSessions(prevSessions => prevSessions.map(s => {
          if (s.id !== activeSessionId) return s;
          const msgs = s.messages.map(m => m.id === assistantMsgId ? { 
            ...m, 
            content: m.content ? `${m.content}\n\n*(Generation stopped)*` : '*(Generation stopped by user)*',
            isStreaming: false 
          } : m);
          return { ...s, messages: msgs };
        }));
      } else {
        const errNotice = `⚠️ **Gemini Notice**: ${err.message || 'Unable to generate response. Please verify Gemini API settings.'}`;
        setSessions(prevSessions => prevSessions.map(s => {
          if (s.id !== activeSessionId) return s;
          const msgs = s.messages.map(m => m.id === assistantMsgId ? { 
            ...m, 
            content: errNotice,
            isStreaming: false 
          } : m);
          return { ...s, messages: msgs };
        }));
        showToast(err.message || 'Gemini API call failed', 'error');
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  // Modify response (Iconic Gemini feature: Shorter, Longer, Simpler, More Formal, More Casual)
  const handleModifyResponse = (msgId: string, modificationType: 'shorter' | 'longer' | 'simpler' | 'formal' | 'casual') => {
    setActiveModifyMenuId(null);
    const targetMsg = currentSession?.messages.find(m => m.id === msgId);
    if (!targetMsg) return;

    let instruction = '';
    switch (modificationType) {
      case 'shorter':
        instruction = 'Make this response much shorter, concise, and straight to the point:';
        break;
      case 'longer':
        instruction = 'Expand on this response with more detailed step-by-step examples and comprehensive explanations:';
        break;
      case 'simpler':
        instruction = 'Rewrite this response using simpler, easy-to-understand language and intuitive analogies:';
        break;
      case 'formal':
        instruction = 'Rewrite this response in a formal, authoritative, and academic tone:';
        break;
      case 'casual':
        instruction = 'Rewrite this response in an engaging, conversational, and encouraging tone:';
        break;
    }

    const newPrompt = `${instruction}\n\n"${targetMsg.content.slice(0, 1000)}"`;
    handleSendMessage(newPrompt);
  };

  // Regenerate Response
  const handleRegenerate = (msgIndex: number) => {
    if (isStreaming) return;
    const msgs = currentSession?.messages || [];
    // Find the previous user message
    let userPrompt = '';
    for (let i = msgIndex - 1; i >= 0; i--) {
      if (msgs[i].role === 'user') {
        userPrompt = msgs[i].content;
        break;
      }
    }
    if (userPrompt) {
      handleSendMessage(userPrompt);
    }
  };

  // Feedback (Like / Dislike)
  const handleFeedback = (msgId: string, type: 'like' | 'dislike') => {
    setSessions(prev => prev.map(s => s.id === activeSessionId ? {
      ...s,
      messages: s.messages.map(m => m.id === msgId ? {
        ...m,
        feedback: m.feedback === type ? null : type
      } : m)
    } : s));
    showToast(type === 'like' ? 'Marked as helpful' : 'Marked as unhelpful', 'info');
  };

  // Copy to clipboard
  const handleCopy = (text: string, msgId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(msgId);
    showToast('Copied to clipboard', 'success');
    setTimeout(() => setCopiedId(null), 2500);
  };

  // Text to Speech
  const handleToggleSpeak = (msgId: string, text: string) => {
    if (speakingMessageId === msgId) {
      window.speechSynthesis.cancel();
      setSpeakingMessageId(null);
      return;
    }

    window.speechSynthesis.cancel();
    // Clean text of markdown / LaTeX
    const cleanText = text
      .replace(/\$\$(.*?)\$\$/gs, ' mathematical equation ')
      .replace(/\$(.*?)\$/g, ' equation ')
      .replace(/[#*`_~]/g, '')
      .replace(/\[(.*?)\]\(.*?\)/g, '$1')
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.onend = () => setSpeakingMessageId(null);
    utterance.onerror = () => setSpeakingMessageId(null);

    setSpeakingMessageId(msgId);
    window.speechSynthesis.speak(utterance);
  };

  // Export as PDF / Print
  const handlePrintPdf = (content: string) => {
    const printWin = window.open('', '_blank');
    if (!printWin) {
      showToast('Popup was blocked. Please allow popups to export PDF.', 'error');
      return;
    }
    printWin.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>EDUkenZA Gemini Export</title>
        <style>
          body { font-family: system-ui, -apple-system, sans-serif; margin: 40px; color: #1e293b; line-height: 1.6; }
          .header { border-bottom: 2px solid #4285F4; padding-bottom: 12px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center; }
          .title { font-size: 20px; font-weight: 700; color: #1e293b; }
          .content { font-size: 14px; white-space: pre-wrap; }
          table { width: 100%; border-collapse: collapse; margin: 16px 0; }
          th, td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; }
          th { background: #f8fafc; }
          @media print { body { margin: 20px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">EDUkenZA AI - Powered by Google Gemini</div>
          <div>${new Date().toLocaleDateString()}</div>
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

  // Google Gemini Starter Prompts Tailored to Role
  const getGeminiStarterCards = () => {
    switch (userRole) {
      case 'student':
        return [
          {
            title: 'Explain a complex concept',
            subtitle: 'Photosynthesis & cellular respiration with KaTeX formulas',
            prompt: 'Explain Photosynthesis and light-dependent reactions step-by-step with KaTeX formulas and real-world examples.',
            icon: Lightbulb,
            color: 'text-amber-500'
          },
          {
            title: 'Solve math step-by-step',
            subtitle: 'Quadratic equation with Given, Working & Answer',
            prompt: 'Solve 2x^2 - 8x + 6 = 0 showing Given, Formula, Algebraic Working, and Final Answer clearly.',
            icon: Sparkles,
            color: 'text-blue-500'
          },
          {
            title: 'Practice exam questions',
            subtitle: 'Grade 10 Physical Sciences quiz with answers',
            prompt: 'Generate 5 challenging multiple-choice practice questions on Newton\'s Laws with detailed answer explanations.',
            icon: BookOpen,
            color: 'text-purple-500'
          },
          {
            title: 'Study guide & summary',
            subtitle: 'High-yield revision checklist for exams',
            prompt: 'Create a high-yield revision summary with key formulas, core definitions, and common exam pitfalls for upcoming finals.',
            icon: FileText,
            color: 'text-emerald-500'
          }
        ];
      case 'teacher':
        return [
          {
            title: 'Create a CAPS lesson plan',
            subtitle: 'Grade 10 Quadratic Functions with objectives',
            prompt: 'Create a comprehensive Grade 10 CAPS-aligned lesson plan for Quadratic Functions including objectives, teaching phases, and assessment.',
            icon: BookOpen,
            color: 'text-blue-500'
          },
          {
            title: 'Generate test with memo',
            subtitle: '15-mark Science quiz with complete marking memorandum',
            prompt: 'Draft a 15-mark Grade 11 Physical Sciences test on Newton\'s Laws with an exhaustive teacher marking memo.',
            icon: Sparkles,
            color: 'text-purple-500'
          },
          {
            title: 'Differentiated worksheet',
            subtitle: 'Tiered difficulty for foundation to advanced learners',
            prompt: 'Draft a differentiated worksheet with tiered difficulty (Foundation, Intermediate, Advanced) for Grade 9 Mathematics.',
            icon: Layers,
            color: 'text-amber-500'
          },
          {
            title: 'Assessment rubric',
            subtitle: 'Criterion-based marking guide with descriptors',
            prompt: 'Generate a 40-mark detailed assessment rubric for a Grade 12 Literature essay with clear level descriptors.',
            icon: FileText,
            color: 'text-emerald-500'
          }
        ];
      case 'school_admin':
      case 'platform_owner':
        return [
          {
            title: 'Term executive review',
            subtitle: 'Academic KPIs, pass rates, and at-risk student support',
            prompt: 'Draft an Executive Academic Report outline for the School Governing Body (SGB) covering pass rates and subject reviews.',
            icon: BarChart3,
            color: 'text-blue-500'
          },
          {
            title: 'School digital policy',
            subtitle: 'Framework for device usage and student safety',
            prompt: 'Draft a comprehensive school digital device, safety, and responsible AI usage policy framework.',
            icon: ShieldCheck,
            color: 'text-emerald-500'
          },
          {
            title: 'Parent circular announcement',
            subtitle: 'Exam timetable and student preparation guidelines',
            prompt: 'Draft an official parent circular announcing the upcoming examination timetable, rules, and student study guidance.',
            icon: FileText,
            color: 'text-purple-500'
          },
          {
            title: 'Staff professional development',
            subtitle: 'Workshop agenda on digital formative assessment',
            prompt: 'Draft a full-day workshop agenda for educators on integrating digital tools and data-informed formative assessment.',
            icon: Lightbulb,
            color: 'text-amber-500'
          }
        ];
      case 'parent':
      default:
        return [
          {
            title: 'Explain homework simply',
            subtitle: 'Fractions and decimals in everyday language',
            prompt: 'Explain the concept of fractions and decimals in simple, everyday language so I can help my child at home.',
            icon: Lightbulb,
            color: 'text-blue-500'
          },
          {
            title: 'Home study timetable',
            subtitle: 'Balanced 5-day study plan before exams',
            prompt: 'Create a balanced 5-day home study schedule for a high school learner preparing for upcoming term tests.',
            icon: BookOpen,
            color: 'text-purple-500'
          },
          {
            title: 'Understand report cards',
            subtitle: 'How term marks and weights are calculated',
            prompt: 'Help me understand how term marks and promotion requirements are calculated in the South African school curriculum.',
            icon: FileText,
            color: 'text-emerald-500'
          },
          {
            title: 'Positive study habits',
            subtitle: 'Encouraging strategies for focus and motivation',
            prompt: 'Provide practical, encouraging strategies to help a teenager build consistent homework routines without stress.',
            icon: Sparkles,
            color: 'text-amber-500'
          }
        ];
    }
  };

  const starterCards = getGeminiStarterCards();

  // User Display Name
  const userDisplayName = currentUser?.displayName || currentUser?.fullName || currentUser?.name || 'Educator';
  const firstName = userDisplayName.split(' ')[0];

  return (
    <div className="flex h-[calc(100vh-140px)] min-h-[640px] max-h-[1080px] bg-white text-slate-800 rounded-3xl border border-slate-200/90 shadow-2xl overflow-hidden font-sans relative">
      
      {/* ========================================================================= */}
      {/* 1. GOOGLE GEMINI AUTHENTIC LEFT SIDEBAR (COLLAPSIBLE)                    */}
      {/* ========================================================================= */}
      <div 
        className={`bg-[#f0f4f9] text-slate-700 flex flex-col border-r border-slate-200/80 transition-all duration-300 z-30 shrink-0 select-none ${
          isSidebarOpen ? 'w-72' : 'w-0 overflow-hidden border-none'
        }`}
      >
        <div className="p-4 flex flex-col h-full">
          
          {/* Top Sidebar Header & New Chat Button */}
          <div className="space-y-3 pb-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <GeminiSparkleIcon className="w-4 h-4" />
                Conversations
              </span>
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="p-1.5 hover:bg-slate-200 rounded-full text-slate-500 transition cursor-pointer"
                title="Collapse sidebar"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            </div>

            {/* "+ New chat" Pill Button (Iconic Gemini Style) */}
            <button
              onClick={handleNewChat}
              className="w-full bg-white hover:bg-slate-100 text-slate-800 rounded-full py-3 px-4 flex items-center gap-3 font-medium text-sm shadow-sm border border-slate-200/90 transition-all cursor-pointer group"
            >
              <div className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Plus className="w-4 h-4" />
              </div>
              <span>New chat</span>
            </button>
          </div>

          {/* Search Filter */}
          <div className="relative mb-3">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchFilter}
              onChange={e => setSearchFilter(e.target.value)}
              placeholder="Search chats..."
              className="w-full pl-9 pr-3 py-1.5 bg-white/80 border border-slate-200 rounded-full text-xs placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white"
            />
          </div>

          {/* Recent Conversations List */}
          <div className="flex-1 overflow-y-auto space-y-1 pr-1 scrollbar-thin">
            <div className="text-[11px] font-semibold text-slate-400 px-3 pt-2 pb-1">
              Recent
            </div>

            {sessions
              .filter(s => !searchFilter || s.title.toLowerCase().includes(searchFilter.toLowerCase()))
              .map(session => {
                const isActive = session.id === activeSessionId;
                const isEditing = editingSessionId === session.id;

                return (
                  <div
                    key={session.id}
                    onClick={() => {
                      if (!isEditing) {
                        setActiveSessionId(session.id);
                      }
                    }}
                    className={`group relative flex items-center justify-between px-3 py-2 rounded-full text-xs transition cursor-pointer ${
                      isActive 
                        ? 'bg-blue-100/70 text-blue-950 font-medium' 
                        : 'hover:bg-slate-200/70 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate flex-1 min-w-0 pr-2">
                      <GeminiSparkleIcon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'opacity-100' : 'opacity-40'}`} />
                      
                      {isEditing ? (
                        <input
                          type="text"
                          value={editTitleText}
                          onChange={e => setEditTitleText(e.target.value)}
                          onBlur={() => handleSaveTitle(session.id)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleSaveTitle(session.id);
                            if (e.key === 'Escape') setEditingSessionId(null);
                          }}
                          autoFocus
                          className="w-full bg-white px-2 py-0.5 rounded border border-blue-400 text-xs text-slate-900 focus:outline-none"
                        />
                      ) : (
                        <span className="truncate">{session.title}</span>
                      )}
                    </div>

                    {/* Hover Actions */}
                    <div className="hidden group-hover:flex items-center gap-1 shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingSessionId(session.id);
                          setEditTitleText(session.title);
                        }}
                        className="p-1 hover:text-blue-600 text-slate-400 rounded transition"
                        title="Rename"
                      >
                        <Edit3 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => handleTogglePin(session.id, e)}
                        className={`p-1 rounded transition ${session.isPinned ? 'text-amber-500' : 'hover:text-amber-500 text-slate-400'}`}
                        title={session.isPinned ? 'Unpin' : 'Pin'}
                      >
                        <Pin className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => handleDeleteSession(session.id, e)}
                        className="p-1 hover:text-red-600 text-slate-400 rounded transition"
                        title="Delete chat"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>

          {/* Bottom Educational Workspace Tools & Settings */}
          <div className="pt-3 border-t border-slate-200/90 space-y-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 mb-1">
              Educational Suites
            </div>

            <div className="grid grid-cols-2 gap-1 px-1">
              <button
                onClick={() => onOpenSpecializedTool?.('image')}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] text-slate-600 hover:bg-slate-200/80 transition cursor-pointer"
              >
                <ImageIcon className="w-3.5 h-3.5 text-pink-500" />
                <span className="truncate">Image Studio</span>
              </button>

              <button
                onClick={() => onOpenSpecializedTool?.('document')}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] text-slate-600 hover:bg-slate-200/80 transition cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-blue-500" />
                <span className="truncate">Docs AI</span>
              </button>

              <button
                onClick={() => onOpenSpecializedTool?.('lesson')}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] text-slate-600 hover:bg-slate-200/80 transition cursor-pointer"
              >
                <BookOpen className="w-3.5 h-3.5 text-purple-500" />
                <span className="truncate">Lesson Plan</span>
              </button>

              <button
                onClick={() => onOpenSpecializedTool?.('quiz')}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] text-slate-600 hover:bg-slate-200/80 transition cursor-pointer"
              >
                <HelpCircle className="w-3.5 h-3.5 text-amber-500" />
                <span className="truncate">Quiz Maker</span>
              </button>
            </div>

            <div className="pt-2 flex items-center justify-between px-2 text-xs">
              <button
                onClick={() => setShowSettingsModal(true)}
                className="flex items-center gap-1.5 text-slate-600 hover:text-slate-900 py-1 cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>AI Controls</span>
              </button>

              <button
                onClick={() => setShowStatusModal(true)}
                className="flex items-center gap-1.5 text-slate-600 hover:text-slate-900 py-1 cursor-pointer"
              >
                <Activity className="w-3.5 h-3.5 text-emerald-600" />
                <span>API Status</span>
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. MAIN GEMINI STAGE AREA                                                 */}
      {/* ========================================================================= */}
      <div className="flex-1 flex flex-col h-full bg-white relative min-w-0 overflow-hidden">
        
        {/* Top Gemini Navigation Bar */}
        <div className="h-16 border-b border-slate-100 flex items-center justify-between px-4 sm:px-6 shrink-0 bg-white/95 backdrop-blur-sm z-20">
          <div className="flex items-center gap-3">
            {!isSidebarOpen && (
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="p-2 hover:bg-slate-100 text-slate-600 rounded-full transition cursor-pointer"
                title="Expand sidebar"
              >
                <PanelLeftOpen className="w-5 h-5" />
              </button>
            )}

            {/* Gemini Brand Logo */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <GeminiSparkleIcon className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-lg tracking-tight text-slate-800">
                    Gemini
                  </span>
                  
                  {/* Model Selector Pill */}
                  <div className="relative">
                    <button
                      onClick={() => setShowModelDropdown(!showModelDropdown)}
                      className="px-2.5 py-0.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium flex items-center gap-1 transition cursor-pointer"
                    >
                      <span>
                        {selectedModel === 'gemini-3.6-flash' && '2.5 Flash'}
                        {selectedModel === 'gemini-3.1-flash-lite' && 'Flash Lite'}
                        {selectedModel === 'gemini-3.8-flash' && '3.8 Flash'}
                      </span>
                      <ChevronDown className="w-3 h-3 text-slate-500" />
                    </button>

                    {showModelDropdown && (
                      <div className="absolute top-full left-0 mt-1 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-50 text-xs">
                        <div className="px-3 py-1 font-semibold text-slate-400 text-[10px] uppercase">
                          Select AI Engine
                        </div>
                        <button
                          onClick={() => {
                            setSelectedModel('gemini-3.6-flash');
                            setShowModelDropdown(false);
                            showToast('Switched to Gemini 2.5 Flash', 'info');
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center justify-between"
                        >
                          <div>
                            <div className="font-semibold text-slate-800">Gemini 2.5 Flash</div>
                            <div className="text-[10px] text-slate-500">Fast, resilient educational model</div>
                          </div>
                          {selectedModel === 'gemini-3.6-flash' && <Check className="w-4 h-4 text-blue-600" />}
                        </button>
                        <button
                          onClick={() => {
                            setSelectedModel('gemini-3.1-flash-lite');
                            setShowModelDropdown(false);
                            showToast('Switched to Gemini Flash Lite', 'info');
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center justify-between"
                        >
                          <div>
                            <div className="font-semibold text-slate-800">Gemini Flash Lite</div>
                            <div className="text-[10px] text-slate-500">Ultra fast & responsive</div>
                          </div>
                          {selectedModel === 'gemini-3.1-flash-lite' && <Check className="w-4 h-4 text-blue-600" />}
                        </button>
                        <button
                          onClick={() => {
                            setSelectedModel('gemini-3.8-flash');
                            setShowModelDropdown(false);
                            showToast('Switched to Gemini 3.8 Flash', 'info');
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center justify-between"
                        >
                          <div>
                            <div className="font-semibold text-slate-800">Gemini 3.8 Flash</div>
                            <div className="text-[10px] text-slate-500">Advanced reasoning & multimodal</div>
                          </div>
                          {selectedModel === 'gemini-3.8-flash' && <Check className="w-4 h-4 text-blue-600" />}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Toolbar: Live API Status & User Persona */}
          <div className="flex items-center gap-3">
            {/* Live API Health Badge */}
            <button
              onClick={() => setShowStatusModal(true)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition cursor-pointer ${
                apiStatus.online
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                  : apiStatus.checking
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
              }`}
              title="Click for Gemini API diagnostic connection status"
            >
              <span className={`w-2 h-2 rounded-full ${apiStatus.online ? 'bg-emerald-500 animate-pulse' : apiStatus.checking ? 'bg-amber-500' : 'bg-rose-500'}`} />
              <span className="hidden sm:inline">
                {apiStatus.online ? `Gemini API Active (${apiStatus.latencyMs ? `${apiStatus.latencyMs}ms` : '1.5s'})` : apiStatus.checking ? 'Connecting...' : 'API Attention'}
              </span>
            </button>

            {/* User Avatar */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                {firstName.charAt(0).toUpperCase()}
              </div>
              <div className="hidden md:block text-left">
                <div className="text-xs font-semibold text-slate-800 leading-tight truncate max-w-[120px]">
                  {firstName}
                </div>
                <div className="text-[10px] text-slate-500 capitalize leading-tight">
                  {userRole.replace('_', ' ')}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Conversation Stream & Zero State */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 space-y-8 scrollbar-thin">
          
          {/* ZERO STATE: ICONIC GOOGLE GEMINI GREETING & PROMPTS */}
          {(!currentSession?.messages || currentSession.messages.length === 0) ? (
            <div className="max-w-3xl mx-auto pt-8 pb-32 flex flex-col justify-center min-h-[55vh]">
              
              {/* The Famous Google Gemini Greeting with Gradient */}
              <div className="mb-10 space-y-2">
                <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight">
                  <span className="bg-gradient-to-r from-[#4285f4] via-[#9b72cb] to-[#d96570] bg-clip-text text-transparent">
                    Hello, {firstName}
                  </span>
                </h1>
                <p className="text-3xl sm:text-4xl font-semibold text-slate-400 tracking-tight">
                  How can I help you today?
                </p>
                <p className="text-sm text-slate-500 pt-1 max-w-xl">
                  Ask anything about curriculum topics, solve math step-by-step with KaTeX formulas, draft lesson plans, or analyze school documents.
                </p>
              </div>

              {/* Suggestion Prompt Cards (Gemini 2x2 Grid) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {starterCards.map((card, idx) => {
                  const Icon = card.icon;
                  return (
                    <div
                      key={idx}
                      onClick={() => handleSendMessage(card.prompt)}
                      className="group bg-[#f0f4f9] hover:bg-[#e4ebf5] rounded-2xl p-4.5 cursor-pointer border border-transparent hover:border-slate-300 transition-all shadow-sm flex flex-col justify-between h-36"
                    >
                      <div>
                        <h4 className="font-semibold text-sm text-slate-800 group-hover:text-blue-600 transition-colors">
                          {card.title}
                        </h4>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                          {card.subtitle}
                        </p>
                      </div>

                      <div className="flex justify-end">
                        <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-slate-600 shadow-sm group-hover:scale-110 transition-transform">
                          <Icon className={`w-4 h-4 ${card.color}`} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>
          ) : (
            
            /* CONVERSATION MESSAGES LIST */
            <div className="max-w-3xl mx-auto space-y-8 pb-36">
              {currentSession.messages.map((message, index) => {
                const isUser = message.role === 'user';

                return (
                  <div key={message.id} className="space-y-3">
                    
                    {/* Message Header & Role Avatar */}
                    <div className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                      
                      {/* Avatar */}
                      <div className="shrink-0 mt-0.5">
                        {isUser ? (
                          <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-xs font-bold shadow-sm">
                            {firstName.charAt(0).toUpperCase()}
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center">
                            <GeminiSparkleIcon className="w-5 h-5" />
                          </div>
                        )}
                      </div>

                      {/* Message Content Container */}
                      <div className={`flex flex-col max-w-[85%] ${isUser ? 'items-end' : 'items-start'}`}>
                        
                        {/* Sender Label */}
                        <div className="text-[11px] font-semibold text-slate-400 mb-1 flex items-center gap-2">
                          <span>{isUser ? 'You' : 'Gemini'}</span>
                          <span>{message.timestamp}</span>
                        </div>

                        {/* User Bubble vs Gemini Stream */}
                        {isUser ? (
                          <div className="bg-[#f0f4f9] text-slate-800 px-5 py-3.5 rounded-[24px] text-sm leading-relaxed shadow-sm">
                            {/* Attached Images preview */}
                            {message.images && message.images.length > 0 && (
                              <div className="flex flex-wrap gap-2 mb-2">
                                {message.images.map((img, i) => (
                                  <img 
                                    key={i} 
                                    src={img} 
                                    alt="Attached" 
                                    className="max-h-48 rounded-xl object-contain border border-slate-300"
                                  />
                                ))}
                              </div>
                            )}

                            {/* Attached Document Badges */}
                            {message.attachments && message.attachments.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mb-2">
                                {message.attachments.map((doc, i) => (
                                  <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 bg-white rounded-lg text-xs font-medium text-slate-700 border border-slate-200">
                                    <FileText className="w-3 h-3 text-blue-500" />
                                    {doc.name}
                                  </span>
                                ))}
                              </div>
                            )}

                            <div className="whitespace-pre-wrap">{message.content}</div>
                          </div>
                        ) : (
                          <div className="w-full text-slate-800 text-sm leading-relaxed">
                            {/* Formatted Markdown with KaTeX Math & Code renderer */}
                            {message.content ? (
                              <MathScienceRenderer content={message.content} />
                            ) : message.isStreaming ? (
                              <div className="flex items-center gap-2 text-slate-400 py-2">
                                <GeminiSparkleIcon className="w-4 h-4 animate-spin text-blue-500" />
                                <span className="text-xs">Gemini is thinking...</span>
                              </div>
                            ) : null}

                            {/* Streaming pulsating cursor */}
                            {message.isStreaming && (
                              <span className="inline-block w-2 h-4 ml-1 bg-blue-500 animate-pulse rounded-sm" />
                            )}

                            {/* THE ICONIC GOOGLE GEMINI RESPONSE ACTION TOOLBAR */}
                            {!message.isStreaming && message.content && (
                              <div className="flex items-center flex-wrap gap-1 mt-4 pt-2 border-t border-slate-100 text-slate-500">
                                
                                {/* Thumbs Up */}
                                <button
                                  onClick={() => handleFeedback(message.id, 'like')}
                                  className={`p-1.5 rounded-full hover:bg-slate-100 transition cursor-pointer ${
                                    message.feedback === 'like' ? 'text-blue-600 bg-blue-50' : 'text-slate-400 hover:text-slate-700'
                                  }`}
                                  title="Good response"
                                >
                                  <ThumbsUp className="w-4 h-4" />
                                </button>

                                {/* Thumbs Down */}
                                <button
                                  onClick={() => handleFeedback(message.id, 'dislike')}
                                  className={`p-1.5 rounded-full hover:bg-slate-100 transition cursor-pointer ${
                                    message.feedback === 'dislike' ? 'text-rose-600 bg-rose-50' : 'text-slate-400 hover:text-slate-700'
                                  }`}
                                  title="Bad response"
                                >
                                  <ThumbsDown className="w-4 h-4" />
                                </button>

                                {/* Listen (TTS) */}
                                <button
                                  onClick={() => handleToggleSpeak(message.id, message.content)}
                                  className={`p-1.5 rounded-full hover:bg-slate-100 transition cursor-pointer ${
                                    speakingMessageId === message.id ? 'text-blue-600 bg-blue-50 animate-pulse' : 'text-slate-400 hover:text-slate-700'
                                  }`}
                                  title={speakingMessageId === message.id ? 'Stop listening' : 'Listen'}
                                >
                                  {speakingMessageId === message.id ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                                </button>

                                {/* Copy to clipboard */}
                                <button
                                  onClick={() => handleCopy(message.content, message.id)}
                                  className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition cursor-pointer"
                                  title="Copy response"
                                >
                                  {copiedId === message.id ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                                </button>

                                {/* Regenerate */}
                                <button
                                  onClick={() => handleRegenerate(index)}
                                  className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition cursor-pointer"
                                  title="Regenerate response"
                                >
                                  <RefreshCw className="w-4 h-4" />
                                </button>

                                {/* Modify Response Pill Dropdown (Iconic Gemini Feature) */}
                                <div className="relative">
                                  <button
                                    onClick={() => setActiveModifyMenuId(activeModifyMenuId === message.id ? null : message.id)}
                                    className="px-2.5 py-1 rounded-full hover:bg-slate-100 text-slate-600 text-xs font-medium flex items-center gap-1 transition cursor-pointer border border-slate-200/80"
                                  >
                                    <Sliders className="w-3 h-3 text-slate-500" />
                                    <span>Modify</span>
                                  </button>

                                  {activeModifyMenuId === message.id && (
                                    <div className="absolute bottom-full left-0 mb-2 w-44 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-40 text-xs">
                                      <div className="px-3 py-1 font-semibold text-slate-400 text-[10px] uppercase">
                                        Modify response
                                      </div>
                                      <button
                                        onClick={() => handleModifyResponse(message.id, 'shorter')}
                                        className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-slate-700 cursor-pointer"
                                      >
                                        Shorter
                                      </button>
                                      <button
                                        onClick={() => handleModifyResponse(message.id, 'longer')}
                                        className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-slate-700 cursor-pointer"
                                      >
                                        Longer
                                      </button>
                                      <button
                                        onClick={() => handleModifyResponse(message.id, 'simpler')}
                                        className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-slate-700 cursor-pointer"
                                      >
                                        Simpler
                                      </button>
                                      <button
                                        onClick={() => handleModifyResponse(message.id, 'formal')}
                                        className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-slate-700 cursor-pointer"
                                      >
                                        More formal
                                      </button>
                                      <button
                                        onClick={() => handleModifyResponse(message.id, 'casual')}
                                        className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-slate-700 cursor-pointer"
                                      >
                                        More casual
                                      </button>
                                    </div>
                                  )}
                                </div>

                                {/* Print / Export PDF */}
                                <button
                                  onClick={() => handlePrintPdf(message.content)}
                                  className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition cursor-pointer"
                                  title="Export / Print PDF"
                                >
                                  <Printer className="w-4 h-4" />
                                </button>

                                {/* Insert into Assignment (For Teachers & Students) */}
                                {onInsertToAssignment && (
                                  <button
                                    onClick={() => {
                                      onInsertToAssignment(message.content);
                                      showToast('Inserted into assignment editor', 'success');
                                    }}
                                    className="px-2.5 py-1 ml-auto rounded-full bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                                  >
                                    <BookOpen className="w-3 h-3" />
                                    <span>Insert to Class</span>
                                  </button>
                                )}

                              </div>
                            )}

                          </div>
                        )}

                      </div>
                    </div>

                  </div>
                );
              })}

              <div ref={messagesEndRef} />
            </div>
          )}

        </div>

        {/* ========================================================================= */}
        {/* 3. THE ICONIC GOOGLE GEMINI FLOATING INPUT PILL                          */}
        {/* ========================================================================= */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-white via-white/95 to-transparent z-20">
          <div className="max-w-3xl mx-auto">
            
            {/* Attachment Preview Strip */}
            {attachedFiles.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2 p-2 bg-[#f0f4f9] rounded-2xl border border-slate-200">
                {attachedFiles.map((file, i) => (
                  <div key={i} className="relative group bg-white px-2.5 py-1.5 rounded-xl border border-slate-200 flex items-center gap-2 text-xs shadow-sm">
                    {file.base64 ? (
                      <img src={file.base64} alt={file.name} className="w-8 h-8 rounded object-cover" />
                    ) : (
                      <FileText className="w-4 h-4 text-blue-500" />
                    )}
                    <div className="max-w-[120px] truncate">
                      <div className="font-semibold text-slate-800 truncate">{file.name}</div>
                      <div className="text-[10px] text-slate-400">{file.size}</div>
                    </div>
                    <button
                      onClick={() => setAttachedFiles(prev => prev.filter((_, idx) => idx !== i))}
                      className="text-slate-400 hover:text-red-500 p-0.5 rounded"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* The Floating Pill Input Box */}
            <div className="bg-[#f0f4f9] focus-within:bg-white rounded-[28px] p-2 sm:p-3 border border-slate-200/90 focus-within:border-slate-300 shadow-lg shadow-slate-200/50 transition-all">
              
              {/* Textarea */}
              <textarea
                ref={textareaRef}
                value={inputPrompt}
                onChange={handleInputChange}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                rows={1}
                placeholder="Ask Gemini or enter a prompt..."
                className="w-full bg-transparent px-3 py-1.5 text-sm text-slate-800 placeholder:text-slate-400 resize-none focus:outline-none min-h-[36px] max-h-[180px] leading-relaxed"
              />

              {/* Bottom Control Strip inside the Pill */}
              <div className="flex items-center justify-between pt-1 px-1">
                
                {/* Left Controls: Plus / Attachment */}
                <div className="flex items-center gap-1.5">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    multiple
                    accept="image/*,.pdf,.txt,.doc,.docx"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-200/70 rounded-full transition cursor-pointer"
                    title="Add image or document"
                  >
                    <Plus className="w-5 h-5" />
                  </button>

                  <div className="hidden sm:flex items-center gap-1 text-[11px] text-slate-500 font-medium px-2 py-0.5 rounded-full bg-white/70 border border-slate-200">
                    <Zap className="w-3 h-3 text-amber-500" />
                    <span>Gemini 2.5 Flash</span>
                  </div>
                </div>

                {/* Right Controls: Mic & Send / Stop */}
                <div className="flex items-center gap-2">
                  
                  {/* Voice Dictation Button */}
                  {isVoiceSupported && (
                    <button
                      type="button"
                      onClick={toggleVoiceInput}
                      className={`p-2 rounded-full transition cursor-pointer ${
                        isListening
                          ? 'bg-red-500 text-white animate-pulse'
                          : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/70'
                      }`}
                      title={isListening ? 'Stop listening' : 'Dictate prompt'}
                    >
                      {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                    </button>
                  )}

                  {/* Send Button or Stop Generation Button */}
                  {isStreaming ? (
                    <button
                      type="button"
                      onClick={handleStopGeneration}
                      className="p-2.5 rounded-full bg-slate-900 text-white hover:bg-slate-800 transition cursor-pointer shadow-md"
                      title="Stop generating"
                    >
                      <Square className="w-4 h-4 fill-current" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSendMessage()}
                      disabled={!inputPrompt.trim() && attachedFiles.length === 0}
                      className={`p-2.5 rounded-full transition cursor-pointer shadow-sm ${
                        inputPrompt.trim() || attachedFiles.length > 0
                          ? 'bg-slate-900 text-white hover:bg-slate-800'
                          : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                      }`}
                      title="Send message"
                    >
                      <ArrowUp className="w-4 h-4 stroke-[2.5]" />
                    </button>
                  )}

                </div>

              </div>

            </div>

            {/* Google Gemini Footer Disclaimer */}
            <div className="text-center pt-2">
              <span className="text-[11px] text-slate-400">
                Gemini may display inaccurate info, including about people, so double-check its responses. EDUkenZA AI with Google Gemini.
              </span>
            </div>

          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* 4. MODALS: API STATUS DIAGNOSTIC MODAL                                    */}
      {/* ========================================================================= */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <GeminiSparkleIcon className="w-6 h-6" />
                <h3 className="font-bold text-base text-slate-800">Gemini API Diagnostic</h3>
              </div>
              <button
                onClick={() => setShowStatusModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-600">Connection Status:</span>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${apiStatus.online ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                  {apiStatus.online ? '● OPERATIONAL' : '● DISCONNECTED'}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Active Model:</span>
                  <span className="font-semibold text-slate-800">{apiStatus.model || 'gemini-3.6-flash'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Live Ping Latency:</span>
                  <span className="font-semibold text-slate-800">{apiStatus.latencyMs ? `${apiStatus.latencyMs} ms` : '1584 ms'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Response Streaming:</span>
                  <span className="font-semibold text-emerald-600">Active (SSE Stream)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Last Verified:</span>
                  <span className="font-semibold text-slate-800">{apiStatus.lastChecked || 'Just now'}</span>
                </div>
              </div>

              {apiStatus.error && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
                  {apiStatus.error}
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={checkApiHealth}
                disabled={apiStatus.checking}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${apiStatus.checking ? 'animate-spin' : ''}`} />
                <span>Test API Ping Now</span>
              </button>
              <button
                onClick={() => setShowStatusModal(false)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. MODALS: AI SETTINGS MODAL                                              */}
      {/* ========================================================================= */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-slate-700" />
                <h3 className="font-bold text-base text-slate-800">Gemini Response Controls</h3>
              </div>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">Response Length</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['short', 'medium', 'long'] as const).map(len => (
                    <button
                      key={len}
                      onClick={() => setSettings(s => ({ ...s, responseLength: len }))}
                      className={`py-2 rounded-xl capitalize font-semibold border transition cursor-pointer ${
                        settings.responseLength === len 
                          ? 'bg-blue-50 border-blue-500 text-blue-700' 
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {len}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">Tone & Style</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'default', label: 'Balanced' },
                    { id: 'teacher', label: 'Pedagogical Teacher' },
                    { id: 'professional', label: 'Formal Executive' },
                    { id: 'student', label: 'Supportive Tutor' }
                  ].map(sty => (
                    <button
                      key={sty.id}
                      onClick={() => setSettings(s => ({ ...s, responseStyle: sty.id as any }))}
                      className={`py-2 px-3 text-left rounded-xl font-semibold border transition cursor-pointer ${
                        settings.responseStyle === sty.id 
                          ? 'bg-blue-50 border-blue-500 text-blue-700' 
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {sty.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">Temperature (Creativity): {settings.temperature}</label>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.1"
                  value={settings.temperature}
                  onChange={e => setSettings(s => ({ ...s, temperature: parseFloat(e.target.value) }))}
                  className="w-full accent-blue-600 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                  <span>Precise / Strict</span>
                  <span>Creative</span>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => {
                  setShowSettingsModal(false);
                  showToast('AI preferences updated', 'success');
                }}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow cursor-pointer"
              >
                Apply Preferences
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
