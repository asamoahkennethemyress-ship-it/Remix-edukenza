import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Plus, 
  ExternalLink, 
  Trash2, 
  Eye, 
  CheckCircle2, 
  XCircle, 
  BarChart3, 
  Copy, 
  Check, 
  Sparkles, 
  Layers, 
  Send, 
  X, 
  AlertTriangle,
  RefreshCw,
  Clock,
  User,
  Radio,
  Sliders,
  Download,
  Edit3,
  Globe,
  Lock,
  Share2
} from 'lucide-react';
import { 
  GoogleFormRecord, 
  GoogleFormItem, 
  GoogleFormResponseData, 
  getGoogleFormsAccessToken, 
  createGoogleFormViaApi, 
  getGoogleFormResponsesFromApi, 
  saveGoogleFormToFirestore, 
  updateGoogleFormInFirestore,
  deleteGoogleFormFromFirestore, 
  trashOrDeleteGoogleFormInDrive,
  extractGoogleFormId,
  logGoogleFormsAudit,
  clearGoogleFormsAccessToken
} from '../../services/googleFormsService';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase/config';

interface GoogleFormsManagerProps {
  schoolId: string;
  schoolName?: string;
  currentUserId: string;
  currentUserName: string;
  currentUserRole: 'owner' | 'school_admin' | 'teacher' | 'student' | 'parent';
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

const PRESET_TEMPLATES: {
  title: string;
  description: string;
  category: GoogleFormRecord['category'];
  targetRole: GoogleFormRecord['targetRole'];
  items: GoogleFormItem[];
}[] = [
  {
    title: 'Grade 10 Physical Sciences - Energy & Motion Quiz',
    description: 'Mid-term continuous assessment test covering Kinetic Energy, Potential Energy, and Conservation of Energy.',
    category: 'quiz',
    targetRole: 'students',
    items: [
      {
        title: 'State the Principle of Conservation of Mechanical Energy.',
        type: 'PARAGRAPH',
        required: true
      },
      {
        title: 'Which of the following is the standard SI unit of Gravitational Potential Energy?',
        type: 'MULTIPLE_CHOICE',
        options: ['Watt (W)', 'Joule (J)', 'Newton (N)', 'Pascal (Pa)'],
        required: true
      },
      {
        title: 'Select all quantities that directly affect Kinetic Energy:',
        type: 'CHECKBOXES',
        options: ['Mass of the object', 'Velocity of the object', 'Height above reference level', 'Atmospheric pressure'],
        required: true
      },
      {
        title: 'Rate your confidence in solving multi-step energy transformation problems:',
        type: 'LINEAR_SCALE',
        scaleLow: 1,
        scaleHigh: 5,
        scaleLowLabel: 'Needs Help',
        scaleHighLabel: 'Mastered',
        required: false
      }
    ]
  },
  {
    title: '2026 Learner Admissions & Enrollment Application',
    description: 'Official digital intake form for prospective students entering EDUkenZA Partner Schools.',
    category: 'admission',
    targetRole: 'parents',
    items: [
      {
        title: 'Prospective Learner Full Legal Name',
        type: 'SHORT_ANSWER',
        required: true
      },
      {
        title: 'Date of Birth (YYYY-MM-DD)',
        type: 'SHORT_ANSWER',
        required: true
      },
      {
        title: 'Grade Applying For:',
        type: 'DROP_DOWN',
        options: ['Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'],
        required: true
      },
      {
        title: 'Parent / Legal Guardian Primary Phone Contact',
        type: 'SHORT_ANSWER',
        required: true
      },
      {
        title: 'Previous School Attended & Reasons for Transfer',
        type: 'PARAGRAPH',
        required: false
      }
    ]
  },
  {
    title: 'Term Course Evaluation & Teacher Feedback Survey',
    description: 'Confidential academic quality feedback survey to help improve classroom delivery and educational resources.',
    category: 'feedback',
    targetRole: 'students',
    items: [
      {
        title: 'Subject and Term Being Evaluated',
        type: 'SHORT_ANSWER',
        required: true
      },
      {
        title: 'The teacher explained difficult concepts clearly and encouraged questions.',
        type: 'LINEAR_SCALE',
        scaleLow: 1,
        scaleHigh: 5,
        scaleLowLabel: 'Strongly Disagree',
        scaleHighLabel: 'Strongly Agree',
        required: true
      },
      {
        title: 'Assignments and assessments provided constructive feedback.',
        type: 'MULTIPLE_CHOICE',
        options: ['Always', 'Most of the time', 'Sometimes', 'Rarely'],
        required: true
      },
      {
        title: 'What specific topics or resources would help you understand the subject better?',
        type: 'PARAGRAPH',
        required: false
      }
    ]
  },
  {
    title: 'PTA & School Operations Satisfaction Survey',
    description: 'Parent-Teacher Association feedback questionnaire on school safety, transportation, and extracurricular programs.',
    category: 'survey',
    targetRole: 'parents',
    items: [
      {
        title: 'Grade levels of your enrolled children:',
        type: 'CHECKBOXES',
        options: ['Primary (Grades R-7)', 'Junior Secondary (Grades 8-9)', 'Senior Secondary (Grades 10-12)'],
        required: true
      },
      {
        title: 'Overall satisfaction with school administrative communication:',
        type: 'LINEAR_SCALE',
        scaleLow: 1,
        scaleHigh: 5,
        scaleLowLabel: 'Very Dissatisfied',
        scaleHighLabel: 'Extremely Satisfied',
        required: true
      },
      {
        title: 'Which after-school sports or cultural activities would you like the school to introduce?',
        type: 'PARAGRAPH',
        required: false
      }
    ]
  }
];

export const GoogleFormsManager: React.FC<GoogleFormsManagerProps> = ({
  schoolId,
  schoolName,
  currentUserId,
  currentUserName,
  currentUserRole,
  showToast
}) => {
  const [forms, setForms] = useState<GoogleFormRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  
  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingForm, setEditingForm] = useState<GoogleFormRecord | null>(null);
  
  // Responses Modal
  const [isResponsesModalOpen, setIsResponsesModalOpen] = useState(false);
  const [selectedFormForResponses, setSelectedFormForResponses] = useState<GoogleFormRecord | null>(null);
  const [responsesData, setResponsesData] = useState<GoogleFormResponseData[]>([]);
  const [loadingResponses, setLoadingResponses] = useState(false);
  
  // Embed Preview Modal
  const [embeddedForm, setEmbeddedForm] = useState<GoogleFormRecord | null>(null);

  // Delete confirmation
  const [formToDelete, setFormToDelete] = useState<GoogleFormRecord | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Creation State
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);
  const [selectedTemplateIndex, setSelectedTemplateIndex] = useState<number | null>(0);
  const [customTitle, setCustomTitle] = useState('');
  const [customDescription, setCustomDescription] = useState('');
  const [customCategory, setCustomCategory] = useState<GoogleFormRecord['category']>('quiz');
  const [customTargetRole, setCustomTargetRole] = useState<GoogleFormRecord['targetRole']>('all');
  const [customItems, setCustomItems] = useState<GoogleFormItem[]>(PRESET_TEMPLATES[0].items);

  // Gemini AI Form Generator State
  const [aiFormPrompt, setAiFormPrompt] = useState('');
  const [isGeneratingAiForm, setIsGeneratingAiForm] = useState(false);

  // Link existing form state
  const [linkInput, setLinkInput] = useState('');
  const [linkTitle, setLinkTitle] = useState('');
  const [linkCategory, setLinkCategory] = useState<GoogleFormRecord['category']>('general');
  const [linkTargetRole, setLinkTargetRole] = useState<GoogleFormRecord['targetRole']>('all');

  // Copy URL state
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [syncingResponseId, setSyncingResponseId] = useState<string | null>(null);

  // Check initial cached token
  useEffect(() => {
    const savedToken = sessionStorage.getItem('edukenza_gforms_token');
    if (savedToken) {
      setAccessToken(savedToken);
    }
  }, []);

  // Listen to Google Forms in Firestore (Strict School Isolation)
  useEffect(() => {
    if (!schoolId) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'googleForms'),
      where('schoolId', '==', schoolId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: GoogleFormRecord[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() } as GoogleFormRecord);
      });
      // Sort newest first
      list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setForms(list);
      setLoading(false);
    }, (err) => {
      console.error('Error fetching Google Forms:', err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [schoolId]);

  const canManageForms = currentUserRole === 'owner' || currentUserRole === 'school_admin' || currentUserRole === 'teacher';

  const handleAuthenticateGoogle = async (force = false) => {
    try {
      const token = await getGoogleFormsAccessToken(force);
      setAccessToken(token);
      showToast('Successfully authenticated with Google Forms & Drive APIs!', 'success');
      await logGoogleFormsAudit({
        schoolId,
        actorId: currentUserId,
        actorName: currentUserName,
        actorRole: currentUserRole,
        action: 'GOOGLE_AUTH_SUCCESS',
        details: 'User authenticated Google OAuth token for Google Forms Center'
      });
    } catch (err: any) {
      showToast(err.message || 'Google OAuth authentication failed', 'error');
    }
  };

  const handleSelectTemplate = (idx: number) => {
    setSelectedTemplateIndex(idx);
    const tmpl = PRESET_TEMPLATES[idx];
    setCustomTitle(tmpl.title);
    setCustomDescription(tmpl.description);
    setCustomCategory(tmpl.category);
    setCustomTargetRole(tmpl.targetRole);
    setCustomItems([...tmpl.items]);
  };

  const handleAddItem = () => {
    setCustomItems([
      ...customItems,
      {
        title: `Question ${customItems.length + 1}`,
        type: 'MULTIPLE_CHOICE',
        options: ['Option 1', 'Option 2', 'Option 3'],
        required: true
      }
    ]);
  };

  const handleRemoveItem = (index: number) => {
    setCustomItems(customItems.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof GoogleFormItem, value: any) => {
    const updated = [...customItems];
    updated[index] = { ...updated[index], [field]: value };
    setCustomItems(updated);
  };

  const handleOptionChange = (itemIndex: number, optionIndex: number, val: string) => {
    const updated = [...customItems];
    const opts = [...(updated[itemIndex].options || [])];
    opts[optionIndex] = val;
    updated[itemIndex] = { ...updated[itemIndex], options: opts };
    setCustomItems(updated);
  };

  const handleAddOption = (itemIndex: number) => {
    const updated = [...customItems];
    const opts = [...(updated[itemIndex].options || []), `Option ${(updated[itemIndex].options?.length || 0) + 1}`];
    updated[itemIndex] = { ...updated[itemIndex], options: opts };
    setCustomItems(updated);
  };

  const handleRemoveOption = (itemIndex: number, optionIndex: number) => {
    const updated = [...customItems];
    const opts = (updated[itemIndex].options || []).filter((_, i) => i !== optionIndex);
    updated[itemIndex] = { ...updated[itemIndex], options: opts };
    setCustomItems(updated);
  };

  const handleGenerateAiForm = async () => {
    if (!aiFormPrompt.trim()) {
      showToast('Please enter a topic or assessment subject for Gemini AI.', 'info');
      return;
    }

    setIsGeneratingAiForm(true);
    try {
      showToast('✨ Gemini AI is designing your Google Form questions...', 'info');
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Create a complete Google Form structure for educational topic: "${aiFormPrompt}".
Output ONLY a valid JSON object matching this TypeScript structure:
{
  "title": "string",
  "description": "string",
  "category": "quiz" | "survey" | "admission" | "feedback" | "general",
  "targetRole": "students" | "parents" | "teachers" | "all",
  "items": [
    {
      "title": "Question text",
      "type": "MULTIPLE_CHOICE" | "CHECKBOXES" | "DROP_DOWN" | "SHORT_ANSWER" | "PARAGRAPH" | "LINEAR_SCALE",
      "options": ["Option 1", "Option 2", "Option 3"],
      "required": true
    }
  ]
}
Include 3-5 comprehensive educational questions. Do not wrap in extra markdown if possible.`,
          role: currentUserRole || 'teacher',
          targetTask: 'quiz_generator'
        })
      });

      if (!res.ok) throw new Error(`AI Service Error (${res.status})`);

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunkStr = decoder.decode(value, { stream: true });
          const lines = chunkStr.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const dataStr = line.slice(6).trim();
              if (dataStr === '[DONE]') break;
              try {
                const parsed = JSON.parse(dataStr);
                if (parsed.text) accumulatedText += parsed.text;
              } catch (e) {}
            }
          }
        }
      }

      const jsonMatch = accumulatedText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const jsonObj = JSON.parse(jsonMatch[0]);
        if (jsonObj.title) setCustomTitle(jsonObj.title);
        if (jsonObj.description) setCustomDescription(jsonObj.description);
        if (jsonObj.category) setCustomCategory(jsonObj.category);
        if (jsonObj.targetRole) setCustomTargetRole(jsonObj.targetRole);
        if (Array.isArray(jsonObj.items) && jsonObj.items.length > 0) {
          setCustomItems(jsonObj.items);
        }
        setSelectedTemplateIndex(null);
        setAiFormPrompt('');
        showToast('✨ Form generated by Gemini AI successfully!', 'success');
      } else {
        throw new Error('Gemini response could not be parsed into form structure.');
      }
    } catch (err: any) {
      console.error('AI Form Generation Error:', err);
      showToast('Failed to generate form with Gemini: ' + err.message, 'error');
    } finally {
      setIsGeneratingAiForm(false);
    }
  };

  const handleCreateGoogleForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTitle.trim()) {
      showToast('Please enter a valid form title.', 'error');
      return;
    }

    setIsSubmittingForm(true);
    try {
      showToast('Connecting to Google Forms REST API...', 'info');
      let token = accessToken;
      if (!token) {
        token = await getGoogleFormsAccessToken();
        setAccessToken(token);
      }

      const { formId, responderUri, editUri } = await createGoogleFormViaApi({
        title: customTitle.trim(),
        description: customDescription.trim(),
        items: customItems,
        accessToken: token
      });

      const docId = await saveGoogleFormToFirestore({
        schoolId,
        schoolName: schoolName || 'EDUkenZA Institution',
        formId,
        title: customTitle.trim(),
        description: customDescription.trim(),
        responderUri,
        editUri,
        category: customCategory,
        targetRole: customTargetRole,
        status: 'published',
        published: true,
        acceptingResponses: true,
        ownerUid: currentUserId,
        createdByUid: currentUserId,
        createdByName: currentUserName,
        responseCount: 0
      });

      await logGoogleFormsAudit({
        schoolId,
        actorId: currentUserId,
        actorName: currentUserName,
        actorRole: currentUserRole,
        action: 'FORM_CREATED',
        formId,
        details: `Created new Google Form '${customTitle.trim()}' with ${customItems.length} questions`
      });

      showToast(`Google Form '${customTitle}' created and published successfully!`, 'success');
      setIsCreateModalOpen(false);
      setCustomTitle('');
      setCustomDescription('');
    } catch (err: any) {
      console.error('Failed to create Google Form:', err);
      showToast(`Creation failed: ${err.message || err}`, 'error');
    } finally {
      setIsSubmittingForm(false);
    }
  };

  const handleLinkExistingForm = async (e: React.FormEvent) => {
    e.preventDefault();
    const extractedId = extractGoogleFormId(linkInput);
    if (!extractedId) {
      showToast('Please enter a valid Google Form URL or Form ID.', 'error');
      return;
    }

    const titleToUse = linkTitle.trim() || `Google Form (${extractedId.substring(0, 8)}...)`;
    const responderUri = linkInput.includes('http') ? linkInput.trim() : `https://docs.google.com/forms/d/e/${extractedId}/viewform`;
    const editUri = `https://docs.google.com/forms/d/${extractedId}/edit`;

    try {
      await saveGoogleFormToFirestore({
        schoolId,
        schoolName: schoolName || 'EDUkenZA Institution',
        formId: extractedId,
        title: titleToUse,
        description: 'Linked external Google Form',
        responderUri,
        editUri,
        category: linkCategory,
        targetRole: linkTargetRole,
        status: 'published',
        published: true,
        acceptingResponses: true,
        ownerUid: currentUserId,
        createdByUid: currentUserId,
        createdByName: currentUserName,
        responseCount: 0
      });

      await logGoogleFormsAudit({
        schoolId,
        actorId: currentUserId,
        actorName: currentUserName,
        actorRole: currentUserRole,
        action: 'FORM_CREATED',
        formId: extractedId,
        details: `Linked existing Google Form '${titleToUse}'`
      });

      showToast(`Linked Google Form '${titleToUse}'!`, 'success');
      setIsLinkModalOpen(false);
      setLinkInput('');
      setLinkTitle('');
    } catch (err: any) {
      showToast(`Failed to link form: ${err.message || err}`, 'error');
    }
  };

  const handleTogglePublish = async (record: GoogleFormRecord) => {
    if (!record.id) return;
    const newStatus = record.status === 'published' ? 'closed' : 'published';
    const newPublished = newStatus === 'published';
    try {
      await updateGoogleFormInFirestore(record.id, {
        status: newStatus,
        published: newPublished,
        acceptingResponses: newPublished
      });
      await logGoogleFormsAudit({
        schoolId,
        actorId: currentUserId,
        actorName: currentUserName,
        actorRole: currentUserRole,
        action: newPublished ? 'FORM_PUBLISHED' : 'FORM_CLOSED',
        formId: record.formId,
        details: `Updated form status to ${newStatus}`
      });
      showToast(`Form '${record.title}' is now ${newStatus.toUpperCase()}.`, 'success');
    } catch (err: any) {
      showToast(`Failed to update status: ${err.message}`, 'error');
    }
  };

  const handleFetchResponses = async (record: GoogleFormRecord) => {
    setSelectedFormForResponses(record);
    setIsResponsesModalOpen(true);
    setLoadingResponses(true);
    setResponsesData([]);

    try {
      let token = accessToken;
      if (!token) {
        token = await getGoogleFormsAccessToken();
        setAccessToken(token);
      }

      const { responses } = await getGoogleFormResponsesFromApi(record.formId, token);
      setResponsesData(responses);

      if (record.id) {
        await updateGoogleFormInFirestore(record.id, {
          responseCount: responses.length
        });
      }

      await logGoogleFormsAudit({
        schoolId,
        actorId: currentUserId,
        actorName: currentUserName,
        actorRole: currentUserRole,
        action: 'RESPONSES_FETCHED',
        formId: record.formId,
        details: `Fetched ${responses.length} live responses via Google Forms API`
      });

      showToast(`Retrieved ${responses.length} live responses from Google Forms API!`, 'success');
    } catch (err: any) {
      console.error('Error fetching responses:', err);
      showToast(`Response fetch notice: ${err.message || 'Make sure you have permission to view responses.'}`, 'error');
    } finally {
      setLoadingResponses(false);
    }
  };

  const handleQuickSyncResponses = async (record: GoogleFormRecord) => {
    if (!record.id) return;
    setSyncingResponseId(record.id);
    try {
      let token = accessToken;
      if (!token) {
        token = await getGoogleFormsAccessToken();
        setAccessToken(token);
      }
      const { responses } = await getGoogleFormResponsesFromApi(record.formId, token);
      await updateGoogleFormInFirestore(record.id, {
        responseCount: responses.length
      });
      showToast(`Synced ${responses.length} submissions for '${record.title}'!`, 'success');
    } catch (err: any) {
      showToast(`Sync failed: ${err.message}`, 'error');
    } finally {
      setSyncingResponseId(null);
    }
  };

  const handleConfirmDelete = async (record: GoogleFormRecord) => {
    if (!record.id) return;
    setDeletingId(record.id);

    try {
      // 1. Trash form in Google Drive
      let token = accessToken;
      if (token) {
        await trashOrDeleteGoogleFormInDrive(record.formId, token);
      }

      // 2. Delete Firestore record
      await deleteGoogleFormFromFirestore(record.id);

      await logGoogleFormsAudit({
        schoolId,
        actorId: currentUserId,
        actorName: currentUserName,
        actorRole: currentUserRole,
        action: 'FORM_DELETED',
        formId: record.formId,
        details: `Trashed and deleted Google Form '${record.title}'`
      });

      showToast(`Google Form '${record.title}' removed from school portal and trashed in Google Drive.`, 'success');
      setFormToDelete(null);
    } catch (err: any) {
      showToast(`Delete failed: ${err.message || err}`, 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingForm || !editingForm.id) return;
    try {
      await updateGoogleFormInFirestore(editingForm.id, {
        title: editingForm.title,
        description: editingForm.description,
        category: editingForm.category,
        targetRole: editingForm.targetRole,
        responderUri: editingForm.responderUri
      });
      await logGoogleFormsAudit({
        schoolId,
        actorId: currentUserId,
        actorName: currentUserName,
        actorRole: currentUserRole,
        action: 'FORM_EDITED',
        formId: editingForm.formId,
        details: `Edited form metadata for '${editingForm.title}'`
      });
      showToast(`Form metadata updated successfully!`, 'success');
      setIsEditModalOpen(false);
      setEditingForm(null);
    } catch (err: any) {
      showToast(`Failed to update form: ${err.message}`, 'error');
    }
  };

  const handleShareToNotifications = async (record: GoogleFormRecord) => {
    try {
      await logGoogleFormsAudit({
        schoolId,
        actorId: currentUserId,
        actorName: currentUserName,
        actorRole: currentUserRole,
        action: 'FORM_OPENED',
        formId: record.formId,
        details: `Broadcasted form link to ${record.targetRole || 'all'} notifications`
      });
      showToast(`Broadcasted form link to ${record.targetRole || 'all'} notifications!`, 'success');
    } catch (err: any) {
      showToast(`Failed to broadcast form: ${err.message || err}`, 'error');
    }
  };

  const handleCopyLink = (record: GoogleFormRecord) => {
    navigator.clipboard.writeText(record.responderUri);
    setCopiedId(record.id || record.formId);
    showToast('Form responder URL copied to clipboard!', 'info');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownloadResponsesCsv = () => {
    if (responsesData.length === 0 || !selectedFormForResponses) return;
    
    // Collect all unique question headers
    const questionHeadersSet = new Set<string>();
    responsesData.forEach((res) => {
      res.parsedAnswers?.forEach((ans) => {
        if (ans.questionTitle) questionHeadersSet.add(ans.questionTitle);
      });
    });
    const questionHeaders = Array.from(questionHeadersSet);

    const headers = ['Response ID', 'Submission Time', 'Respondent Email', ...questionHeaders];
    const rows = responsesData.map((res) => {
      const answersMap: Record<string, string> = {};
      res.parsedAnswers?.forEach((ans) => {
        if (ans.questionTitle) answersMap[ans.questionTitle] = ans.values.join('; ');
      });
      return [
        `"${res.responseId}"`,
        `"${res.lastSubmittedTime || res.createTime}"`,
        `"${res.respondentEmail || 'Anonymous'}"`,
        ...questionHeaders.map((q) => `"${(answersMap[q] || '').replace(/"/g, '""')}"`)
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${selectedFormForResponses.title.replace(/[^a-zA-Z0-9]/g, '_')}_responses.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Downloaded responses CSV!', 'success');
  };

  // Role-based visibility filtering
  const visibleForms = forms.filter((f) => {
    if (currentUserRole === 'student') {
      return f.targetRole === 'students' || f.targetRole === 'all' || !f.targetRole;
    }
    if (currentUserRole === 'parent') {
      return f.targetRole === 'parents' || f.targetRole === 'all' || !f.targetRole;
    }
    return true;
  });

  const filteredForms = visibleForms.filter((f) => {
    if (activeCategory === 'all') return true;
    return f.category === activeCategory;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-purple-950 via-indigo-900 to-slate-900 text-white rounded-2xl p-6 shadow-xl border border-purple-800/40 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-purple-500/10 to-transparent pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 text-purple-300 font-bold text-xs uppercase tracking-widest mb-1">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span>Google Workspace Integration • Forms API v1</span>
            </div>
            <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
              Google Forms Center
            </h2>
            <p className="text-purple-200 text-xs mt-1 max-w-2xl leading-relaxed">
              Create, embed, publish, and sync Google Forms for quizzes, CBT assessments, admission applications, and school feedback.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {!accessToken ? (
              <button
                onClick={() => handleAuthenticateGoogle(false)}
                className="bg-white hover:bg-purple-50 text-slate-900 px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition shadow-md cursor-pointer border border-slate-200"
              >
                <svg className="w-4 h-4" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                </svg>
                <span>Authorize Google Forms API</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <div className="bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Google Connected</span>
                </div>
                <button
                  onClick={() => handleAuthenticateGoogle(true)}
                  title="Reconnect Google Account"
                  className="bg-purple-800/60 hover:bg-purple-700 text-purple-200 p-1.5 rounded-lg text-xs transition cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {canManageForms && (
              <>
                <button
                  onClick={() => setIsLinkModalOpen(true)}
                  className="bg-purple-900/80 hover:bg-purple-800 text-white px-3.5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition border border-purple-600/50 cursor-pointer"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Link External Form</span>
                </button>
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2.5 rounded-xl font-black text-xs flex items-center gap-2 transition shadow-lg cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Google Form</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          {[
            { id: 'all', label: 'All Forms' },
            { id: 'quiz', label: 'Quizzes & CBT' },
            { id: 'survey', label: 'Surveys' },
            { id: 'admission', label: 'Admissions' },
            { id: 'feedback', label: 'Feedback' },
            { id: 'general', label: 'General' }
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3.5 py-1.5 rounded-lg font-bold text-xs transition cursor-pointer whitespace-nowrap ${
                activeCategory === cat.id
                  ? 'bg-purple-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="text-xs font-bold text-slate-500">
          Total: <span className="text-slate-900 font-black">{filteredForms.length}</span> Forms
        </div>
      </div>

      {/* Form List Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-500 font-bold text-xs animate-pulse">
          Loading school Google Forms...
        </div>
      ) : filteredForms.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center mx-auto">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="font-black text-slate-800 text-base">No Google Forms Available</h3>
          <p className="text-slate-500 text-xs max-w-md mx-auto">
            {canManageForms 
              ? 'Get started by creating a new Google Form quiz, admission application, or linking an existing form.'
              : 'There are currently no active Google Forms assigned to your role.'}
          </p>
          {canManageForms && (
            <div className="pt-2 flex justify-center gap-3">
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="bg-purple-900 hover:bg-purple-800 text-white px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Build New Google Form</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredForms.map((formRec) => {
            const isOwnerOrAdmin = currentUserRole === 'owner' || currentUserRole === 'school_admin';
            const isCreator = formRec.createdByUid === currentUserId || formRec.ownerUid === currentUserId;
            const canEdit = isOwnerOrAdmin || isCreator;
            const isPublished = formRec.status === 'published' || formRec.published !== false;

            return (
              <div 
                key={formRec.id || formRec.formId}
                className={`bg-white border rounded-2xl p-5 space-y-4 shadow-sm hover:shadow-md transition flex flex-col justify-between ${
                  !isPublished ? 'border-slate-300 opacity-80' : 'border-slate-200 hover:border-purple-300'
                }`}
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 font-extrabold text-[10px] uppercase tracking-wide">
                        {formRec.category}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        isPublished ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {isPublished ? 'Live' : 'Closed'}
                      </span>
                    </div>

                    <span className="text-[10px] font-bold text-slate-400">
                      Audience: <span className="text-slate-700 capitalize">{formRec.targetRole || 'all'}</span>
                    </span>
                  </div>

                  <h3 className="font-black text-slate-900 text-sm leading-snug line-clamp-2">
                    {formRec.title}
                  </h3>

                  {formRec.description && (
                    <p className="text-slate-500 text-xs line-clamp-2 leading-relaxed">
                      {formRec.description}
                    </p>
                  )}
                </div>

                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                    <span>By: <strong className="text-slate-700">{formRec.createdByName || 'Faculty'}</strong></span>
                    {formRec.responseCount !== undefined && (
                      <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-bold">
                        {formRec.responseCount} Submissions
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      onClick={() => setEmbeddedForm(formRec)}
                      className="w-full py-2 bg-purple-50 hover:bg-purple-100 text-purple-900 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Fill / Embed</span>
                    </button>

                    <a
                      href={formRec.responderUri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition text-center"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Open Form</span>
                    </a>
                  </div>

                  {canManageForms && (
                    <div className="flex items-center justify-between gap-1 pt-1 border-t border-slate-100">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleCopyLink(formRec)}
                          title="Copy Responder URL"
                          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition cursor-pointer"
                        >
                          {copiedId === (formRec.id || formRec.formId) ? (
                            <Check className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>

                        <button
                          onClick={() => handleFetchResponses(formRec)}
                          title="View Live Responses (Google Forms API)"
                          className="p-1.5 rounded-lg hover:bg-indigo-50 text-indigo-700 transition cursor-pointer flex items-center gap-1"
                        >
                          <BarChart3 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleQuickSyncResponses(formRec)}
                          disabled={syncingResponseId === formRec.id}
                          title="Refresh Submission Count"
                          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition cursor-pointer"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${syncingResponseId === formRec.id ? 'animate-spin text-purple-600' : ''}`} />
                        </button>

                        {canEdit && (
                          <a
                            href={formRec.editUri || `https://docs.google.com/forms/d/${formRec.formId}/edit`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Edit Questions in Google Forms"
                            className="p-1.5 rounded-lg hover:bg-purple-50 text-purple-700 transition"
                          >
                            <Edit3 className="w-4 h-4" />
                          </a>
                        )}

                        {canEdit && (
                          <button
                            onClick={() => { setEditingForm(formRec); setIsEditModalOpen(true); }}
                            title="Edit Form Metadata"
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition cursor-pointer"
                          >
                            <Sliders className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        {canEdit && (
                          <button
                            onClick={() => handleTogglePublish(formRec)}
                            title={isPublished ? 'Close Form' : 'Publish Form'}
                            className={`p-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                              isPublished ? 'hover:bg-amber-50 text-amber-600' : 'hover:bg-emerald-50 text-emerald-600'
                            }`}
                          >
                            {isPublished ? <Lock className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
                          </button>
                        )}

                        {canEdit && (
                          <button
                            onClick={() => setFormToDelete(formRec)}
                            title="Delete Google Form"
                            className="p-1.5 rounded-lg hover:bg-red-50 text-red-600 transition cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* --- MODAL: CREATE GOOGLE FORM --- */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-3xl w-full space-y-5 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2 text-purple-900">
                <FileText className="w-5 h-5 text-purple-600" />
                <h3 className="font-black text-slate-900 text-base">Create New Google Form</h3>
              </div>
              <button 
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* GEMINI AI FORM GENERATOR BANNER */}
            <div className="bg-gradient-to-r from-purple-50 via-indigo-50 to-pink-50 p-4 rounded-xl border border-purple-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  Auto-Generate Form Structure with Gemini AI
                </span>
                <span className="text-[10px] bg-purple-200/60 text-purple-800 px-2 py-0.5 rounded-full font-semibold">
                  AI Powered
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="e.g. Create a 5-question Grade 10 Physical Science Quiz on Energy & Motion..."
                  value={aiFormPrompt}
                  onChange={(e) => setAiFormPrompt(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleGenerateAiForm(); } }}
                  className="flex-1 px-3 py-2 bg-white border border-purple-200 rounded-lg text-xs focus:ring-2 focus:ring-purple-500 outline-none placeholder:text-purple-300"
                />
                <button
                  type="button"
                  onClick={handleGenerateAiForm}
                  disabled={isGeneratingAiForm}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shrink-0 shadow-xs cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className={`w-3.5 h-3.5 ${isGeneratingAiForm ? 'animate-spin' : ''}`} />
                  <span>{isGeneratingAiForm ? 'Generating...' : 'Generate AI Form'}</span>
                </button>
              </div>
            </div>

            {/* Template Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Or Select Preset Form Template
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {PRESET_TEMPLATES.map((tmpl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectTemplate(idx)}
                    className={`p-3 rounded-xl border text-left space-y-1 transition cursor-pointer ${
                      selectedTemplateIndex === idx
                        ? 'border-purple-600 bg-purple-50/80 ring-2 ring-purple-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="font-bold text-xs text-slate-900">{tmpl.title}</div>
                    <div className="text-[11px] text-slate-500 line-clamp-1">{tmpl.description}</div>
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleCreateGoogleForm} className="space-y-4">
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Form Title *</label>
                  <input
                    type="text"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    required
                    placeholder="e.g. Grade 10 Mid-Term Science Assessment 2026"
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-xs font-bold focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Form Description / Instructions</label>
                  <textarea
                    value={customDescription}
                    onChange={(e) => setCustomDescription(e.target.value)}
                    rows={2}
                    placeholder="Provide clear instructions for responders..."
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                    <select
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value as any)}
                      className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-xs font-bold focus:ring-2 focus:ring-purple-500 outline-none"
                    >
                      <option value="quiz">Quiz / CBT Assessment</option>
                      <option value="survey">Survey</option>
                      <option value="admission">Admission Application</option>
                      <option value="feedback">Feedback</option>
                      <option value="assignment">Assignment</option>
                      <option value="general">General</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Target Audience</label>
                    <select
                      value={customTargetRole}
                      onChange={(e) => setCustomTargetRole(e.target.value as any)}
                      className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-xs font-bold focus:ring-2 focus:ring-purple-500 outline-none"
                    >
                      <option value="all">Everyone</option>
                      <option value="students">Students</option>
                      <option value="parents">Parents</option>
                      <option value="teachers">Teachers</option>
                      <option value="public">Public</option>
                    </select>
                  </div>
                </div>

                {/* Items Builder */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between border-b pb-2">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                      Form Questions & Fields ({customItems.length})
                    </span>
                    <button
                      type="button"
                      onClick={handleAddItem}
                      className="text-xs text-purple-700 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Question</span>
                    </button>
                  </div>

                  <div className="max-h-72 overflow-y-auto space-y-3 pr-1">
                    {customItems.map((item, index) => (
                      <div key={index} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-black text-slate-500">Question #{index + 1}</span>
                          <div className="flex items-center gap-3">
                            <label className="flex items-center gap-1 text-[11px] font-bold text-slate-600 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={!!item.required}
                                onChange={(e) => handleItemChange(index, 'required', e.target.checked)}
                                className="rounded text-purple-600"
                              />
                              <span>Required</span>
                            </label>
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(index)}
                              className="text-red-500 hover:text-red-700 text-xs font-bold cursor-pointer"
                            >
                              Remove
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <input
                            type="text"
                            value={item.title}
                            onChange={(e) => handleItemChange(index, 'title', e.target.value)}
                            placeholder="Question text..."
                            className="sm:col-span-2 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold outline-none"
                          />
                          <select
                            value={item.type}
                            onChange={(e) => handleItemChange(index, 'type', e.target.value)}
                            className="px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium outline-none"
                          >
                            <option value="MULTIPLE_CHOICE">Multiple Choice</option>
                            <option value="CHECKBOXES">Checkboxes</option>
                            <option value="DROP_DOWN">Dropdown</option>
                            <option value="SHORT_ANSWER">Short Answer</option>
                            <option value="PARAGRAPH">Paragraph</option>
                            <option value="LINEAR_SCALE">Linear Scale (1-5)</option>
                            <option value="SECTION">Section Break</option>
                          </select>
                        </div>

                        {/* Options builder for Choice questions */}
                        {(item.type === 'MULTIPLE_CHOICE' || item.type === 'CHECKBOXES' || item.type === 'DROP_DOWN') && (
                          <div className="pl-3 space-y-1.5 border-l-2 border-purple-200">
                            <div className="text-[10px] font-bold text-slate-500 uppercase">Answer Options:</div>
                            {(item.options || ['Option 1', 'Option 2']).map((opt, optIdx) => (
                              <div key={optIdx} className="flex items-center gap-2">
                                <span className="text-[10px] font-black text-slate-400">{optIdx + 1}.</span>
                                <input
                                  type="text"
                                  value={opt}
                                  onChange={(e) => handleOptionChange(index, optIdx, e.target.value)}
                                  className="flex-1 px-2.5 py-1 bg-white border border-slate-300 rounded text-xs"
                                />
                                {(item.options?.length || 0) > 2 && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveOption(index, optIdx)}
                                    className="text-slate-400 hover:text-red-500 text-xs"
                                  >
                                    ×
                                  </button>
                                )}
                              </div>
                            ))}
                            <button
                              type="button"
                              onClick={() => handleAddOption(index)}
                              className="text-[11px] text-purple-700 font-bold hover:underline pt-1 block"
                            >
                              + Add Option
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  disabled={isSubmittingForm}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingForm}
                  className="px-5 py-2 rounded-xl bg-purple-900 hover:bg-purple-800 text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
                >
                  {isSubmittingForm ? 'Publishing to Google Forms API...' : 'Create & Publish Google Form'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: LINK EXTERNAL FORM --- */}
      {isLinkModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-black text-slate-900 text-sm uppercase">Link Existing Google Form</h3>
              <button onClick={() => setIsLinkModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleLinkExistingForm} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Google Form URL or ID *</label>
                <input
                  type="text"
                  value={linkInput}
                  onChange={(e) => setLinkInput(e.target.value)}
                  required
                  placeholder="https://docs.google.com/forms/d/e/.../viewform"
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Display Title</label>
                <input
                  type="text"
                  value={linkTitle}
                  onChange={(e) => setLinkTitle(e.target.value)}
                  placeholder="e.g. PTA Feedback Survey 2026"
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                  <select
                    value={linkCategory}
                    onChange={(e) => setLinkCategory(e.target.value as any)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-xl text-xs font-bold"
                  >
                    <option value="quiz">Quiz / CBT</option>
                    <option value="survey">Survey</option>
                    <option value="admission">Admission</option>
                    <option value="feedback">Feedback</option>
                    <option value="general">General</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Target Audience</label>
                  <select
                    value={linkTargetRole}
                    onChange={(e) => setLinkTargetRole(e.target.value as any)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-xl text-xs font-bold"
                  >
                    <option value="all">Everyone</option>
                    <option value="students">Students</option>
                    <option value="parents">Parents</option>
                    <option value="teachers">Teachers</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsLinkModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-purple-900 text-white font-bold text-xs uppercase cursor-pointer"
                >
                  Link Form
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: EDIT FORM METADATA --- */}
      {isEditModalOpen && editingForm && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-black text-slate-900 text-sm uppercase">Edit Form Metadata</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Form Title</label>
                <input
                  type="text"
                  value={editingForm.title}
                  onChange={(e) => setEditingForm({ ...editingForm, title: e.target.value })}
                  required
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  value={editingForm.description || ''}
                  onChange={(e) => setEditingForm({ ...editingForm, description: e.target.value })}
                  rows={2}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-xs font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                  <select
                    value={editingForm.category}
                    onChange={(e) => setEditingForm({ ...editingForm, category: e.target.value as any })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-xl text-xs font-bold"
                  >
                    <option value="quiz">Quiz / CBT</option>
                    <option value="survey">Survey</option>
                    <option value="admission">Admission</option>
                    <option value="feedback">Feedback</option>
                    <option value="general">General</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Target Role</label>
                  <select
                    value={editingForm.targetRole || 'all'}
                    onChange={(e) => setEditingForm({ ...editingForm, targetRole: e.target.value as any })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-xl text-xs font-bold"
                  >
                    <option value="all">Everyone</option>
                    <option value="students">Students</option>
                    <option value="parents">Parents</option>
                    <option value="teachers">Teachers</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-purple-900 text-white font-bold text-xs uppercase cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: EMBEDDED FORM FILL VIEW --- */}
      {embeddedForm && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-4xl h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-purple-400" />
                <div>
                  <h3 className="font-black text-sm text-white line-clamp-1">{embeddedForm.title}</h3>
                  <p className="text-[10px] text-slate-400">Interactive Google Form Frame</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={embeddedForm.responderUri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-lg flex items-center gap-1 cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open in New Tab</span>
                </a>
                <button
                  onClick={() => setEmbeddedForm(null)}
                  className="p-1.5 text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 bg-slate-100">
              <iframe
                src={`${embeddedForm.responderUri}?embedded=true`}
                title={embeddedForm.title}
                className="w-full h-full border-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL: LIVE RESPONSES VIEW & EXPORT --- */}
      {isResponsesModalOpen && selectedFormForResponses && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-3xl w-full max-h-[88vh] flex flex-col space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-purple-600" />
                  <span>Live Responses: {selectedFormForResponses.title}</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Google Forms REST API Responses Feed
                </p>
              </div>

              <div className="flex items-center gap-2">
                {responsesData.length > 0 && (
                  <button
                    onClick={handleDownloadResponsesCsv}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export CSV</span>
                  </button>
                )}
                <button
                  onClick={() => handleFetchResponses(selectedFormForResponses)}
                  disabled={loadingResponses}
                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                  title="Refresh Live Responses"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingResponses ? 'animate-spin text-purple-600' : ''}`} />
                </button>
                <button onClick={() => setIsResponsesModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3">
              {loadingResponses ? (
                <div className="p-12 text-center text-slate-500 font-bold text-xs animate-pulse">
                  Fetching live responses directly from Google Forms API...
                </div>
              ) : responsesData.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs space-y-2">
                  <div className="font-bold text-slate-700">No responses submitted yet.</div>
                  <p className="text-slate-400">
                    Share the form link or embed it for students and parents to submit answers.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700 bg-purple-50 p-3.5 rounded-xl border border-purple-200">
                    <span>Total Submissions Recorded: <strong className="text-purple-900 text-sm font-black">{responsesData.length}</strong></span>
                    <span className="text-[11px] text-purple-700">Live API Synchronized</span>
                  </div>

                  <div className="space-y-3">
                    {responsesData.map((res, i) => (
                      <div key={res.responseId || i} className="p-4 bg-white border border-slate-200 rounded-xl space-y-2.5 shadow-xs">
                        <div className="flex items-center justify-between border-b pb-2 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-800 font-bold flex items-center justify-center text-[10px]">
                              #{i + 1}
                            </span>
                            <span className="font-bold text-slate-900">{res.respondentEmail}</span>
                          </div>
                          <span className="text-[11px] text-slate-400 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {res.lastSubmittedTime ? new Date(res.lastSubmittedTime).toLocaleString() : 'Recent'}
                          </span>
                        </div>

                        {/* Question & Answer Pairs */}
                        {res.parsedAnswers && res.parsedAnswers.length > 0 ? (
                          <div className="space-y-2 pt-1">
                            {res.parsedAnswers.map((ans, aIdx) => (
                              <div key={aIdx} className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-xs">
                                <div className="font-bold text-slate-700 mb-0.5">{ans.questionTitle}</div>
                                <div className="text-purple-900 font-medium pl-2 border-l-2 border-purple-400">
                                  {ans.values.join(', ')}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-[11px] text-slate-400 italic">No structured answers available.</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2 border-t flex justify-end">
              <button
                onClick={() => setIsResponsesModalOpen(false)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL: CONFIRM DELETE FORM LINK --- */}
      {formToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="font-black text-slate-900 text-sm uppercase">Delete Google Form</h3>
              </div>
              <button 
                onClick={() => !deletingId && setFormToDelete(null)}
                disabled={!!deletingId}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs text-slate-700">
              <p className="font-semibold text-slate-800">
                Are you sure you want to delete <strong className="text-slate-900">"{formToDelete.title}"</strong>?
              </p>
              <p className="text-slate-500">
                This will move the Google Form to Google Drive Trash and remove its reference from the EDUkenZA school portal.
              </p>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                onClick={() => setFormToDelete(null)}
                disabled={!!deletingId}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleConfirmDelete(formToDelete)}
                disabled={!!deletingId}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase cursor-pointer disabled:opacity-50"
              >
                {deletingId ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
