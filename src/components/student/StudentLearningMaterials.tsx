import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Download, 
  Search, 
  FileText, 
  RefreshCw,
  Mic,
  Copy,
  Check,
  Lock,
  Globe,
  Eye,
  Plus,
  Layers,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { UserContentHub } from '../common/UserContentHub';
import { copyToClipboard, downloadContentFile, duplicateUserContent } from '../../services/userContentService';

export interface StudentLearningMaterialsProps {
  currentUser: any;
  studentRecord: any;
  showToast: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

export const StudentLearningMaterials: React.FC<StudentLearningMaterialsProps> = ({
  currentUser,
  studentRecord,
  showToast
}) => {
  const schoolId = currentUser?.schoolId || studentRecord?.schoolId || '';
  const className = studentRecord?.className || currentUser?.className || '';

  const [activeViewTab, setActiveViewTab] = useState<'teacher_materials' | 'my_study_notes'>('teacher_materials');
  const [teacherSharedItems, setTeacherSharedItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [viewingItem, setViewingItem] = useState<any | null>(null);

  // Real-time listener for Teacher Materials & Shared Voice Dictations
  useEffect(() => {
    if (!schoolId) return;
    setLoading(true);

    // 1. Listen for userCreatedContent shared by teachers
    const qSharedContent = query(
      collection(db, 'userCreatedContent'),
      where('schoolId', '==', schoolId),
      where('isShared', '==', true)
    );

    // 2. Listen for teacherVoiceNotes shared with class
    const qVoiceNotes = query(
      collection(db, 'teacherVoiceNotes'),
      where('schoolId', '==', schoolId),
      where('isSharedWithClass', '==', true)
    );

    const unsubContent = onSnapshot(qSharedContent, (snapshot) => {
      const items: any[] = [];
      snapshot.forEach((d) => {
        const data = d.data();
        // Check if class matches or is school wide
        const matchesClass = 
          data.shareScope === 'school' || 
          data.shareScope === 'public' ||
          data.targetClass === className ||
          (data.sharedWithClasses && data.sharedWithClasses.includes(className)) ||
          !data.targetClass;

        if (matchesClass) {
          items.push({ id: d.id, ...data, isVoiceNote: data.type === 'voice_dictation' });
        }
      });

      setTeacherSharedItems(prev => {
        // Merge without duplicates
        const voiceOnly = prev.filter(p => p.source === 'teacherVoiceNotes');
        return [...items, ...voiceOnly];
      });
      setLoading(false);
    }, (err) => {
      console.warn('Error subscribing shared content:', err);
      setLoading(false);
    });

    const unsubVoice = onSnapshot(qVoiceNotes, (snapshot) => {
      const voiceItems: any[] = [];
      snapshot.forEach((d) => {
        const data = d.data();
        if (data.className === className || data.targetClass === className || !data.className || data.className === 'General') {
          voiceItems.push({ 
            id: d.id, 
            ...data, 
            source: 'teacherVoiceNotes',
            isVoiceNote: true,
            type: 'voice_dictation'
          });
        }
      });

      setTeacherSharedItems(prev => {
        const standardOnly = prev.filter(p => p.source !== 'teacherVoiceNotes');
        return [...standardOnly, ...voiceItems];
      });
    }, (err) => {
      console.warn('Error subscribing shared voice notes:', err);
    });

    return () => {
      unsubContent();
      unsubVoice();
    };
  }, [schoolId, className]);

  // Fallback study materials if empty
  const defaultMaterials = [
    {
      id: 'default-1',
      title: 'Mathematics Algebra & Calculus Revision Guide',
      category: 'Mathematics',
      type: 'document',
      content: 'Comprehensive review guide of quadratic formulas, graphing techniques, and differential calculus fundamentals for Term 2 examinations.',
      creatorName: 'Mr. David Asamoah (Math Teacher)',
      dateFormatted: 'Recently Updated',
      isTeacherContent: true
    },
    {
      id: 'default-2',
      title: 'Physical Sciences Chemical Equilibrium Voice Summary',
      category: 'Physical Sciences',
      type: 'voice_dictation',
      content: 'Teacher Dictation Summary: Remember Le Chatelier\'s principle. When temperature increases in an exothermic reaction, the equilibrium shifts to favor the endothermic reverse reaction.',
      creatorName: 'Mrs. Sarah Connor (Science Teacher)',
      dateFormatted: 'Yesterday',
      isVoiceNote: true,
      isTeacherContent: true
    },
    {
      id: 'default-3',
      title: 'English Essay Structure & Literary Commentary',
      category: 'English Language',
      type: 'document',
      content: 'Guideline for analytical essays: State your thesis clearly in the introduction, utilize PEEL (Point, Evidence, Explanation, Link) for each argument body paragraph.',
      creatorName: 'Ms. Clara Oswald (English Teacher)',
      dateFormatted: 'Term 2',
      isTeacherContent: true
    }
  ];

  const displayList = teacherSharedItems.length > 0 ? teacherSharedItems : defaultMaterials;

  const filtered = displayList.filter(mat => {
    const matchesSearch = 
      (mat.title && mat.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (mat.content && mat.content.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (mat.creatorName && mat.creatorName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (mat.category && mat.category.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCategory = selectedCategory === 'All' || mat.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleCopyText = async (text: string, id: string) => {
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopiedId(id);
      showToast('Copied content to clipboard!', 'success');
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleDownload = (item: any) => {
    downloadContentFile(item.title, item.content || item.description || '', 'txt');
    showToast(`Downloaded "${item.title}.txt"`, 'info');
  };

  const handleSaveToMyNotes = async (item: any) => {
    try {
      await duplicateUserContent(
        {
          id: item.id,
          ownerUid: currentUser.uid,
          createdBy: currentUser.uid,
          creatorName: currentUser.name || 'Student',
          ownerRole: 'student',
          schoolId,
          title: `${item.title} (My Notes)`,
          content: item.content || item.description || '',
          type: 'notes',
          category: item.category || 'Class Notes',
          targetClass: className,
          isShared: false,
          shareScope: 'private',
          createdAt: null,
          updatedAt: null
        },
        currentUser
      );
      showToast(`Saved a personal copy of "${item.title}" to your study notes!`, 'success');
      setActiveViewTab('my_study_notes');
    } catch (err: any) {
      console.error('Error saving copy to student notes:', err);
      showToast('Failed to save copy: ' + err.message, 'error');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER BANNER */}
      <div className="bg-gradient-to-r from-[#002147] via-[#0b3c5d] to-[#1d2731] p-6 rounded-3xl text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border border-[#D4AF37]/30">
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="w-8 h-8 text-[#D4AF37]" />
            <h1 className="text-2xl font-black tracking-tight">Learning Materials & Student Notes</h1>
          </div>
          <p className="text-slate-300 text-xs mt-1">
            Access teacher-shared lessons, classroom voice notes, and manage your own private study notes with full ownership controls.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-white/10 p-2.5 rounded-2xl border border-white/20 text-xs font-bold text-amber-300">
          <Globe className="w-4 h-4" />
          <span>Class: {className || 'Assigned Class'}</span>
        </div>
      </div>

      {/* TOP LEVEL NAVIGATION TABS */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveViewTab('teacher_materials')}
          className={`px-4 py-2 rounded-2xl text-xs font-black transition flex items-center gap-2 cursor-pointer ${
            activeViewTab === 'teacher_materials'
              ? 'bg-[#002147] text-white shadow-md'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <BookOpen className="w-4 h-4 text-[#D4AF37]" />
          <span>Teacher Materials & Classroom Voice Notes ({displayList.length})</span>
        </button>

        <button
          onClick={() => setActiveViewTab('my_study_notes')}
          className={`px-4 py-2 rounded-2xl text-xs font-black transition flex items-center gap-2 cursor-pointer ${
            activeViewTab === 'my_study_notes'
              ? 'bg-[#002147] text-white shadow-md'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Lock className="w-4 h-4 text-emerald-400" />
          <span>My Personal Study Notes & Drafts</span>
        </button>
      </div>

      {/* TAB 1: TEACHER SHARED MATERIALS */}
      {activeViewTab === 'teacher_materials' && (
        <div className="space-y-4">
          
          {/* NOTICE: OWNERSHIP POLICY FOR STUDENTS */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3 text-xs text-amber-900">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
            <p>
              <strong>Ownership Policy:</strong> Teacher materials and voice notes are provided for your study and are <strong>Read-Only</strong>. You cannot edit or delete teacher content, but you can copy text, download files, or click <em>"Save Copy to My Notes"</em> to make your own editable version!
            </p>
          </div>

          {/* FILTERS & SEARCH */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search teacher notes, voice summaries..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#002147]"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
              {['All', 'Classroom Note', 'Mathematics', 'Physical Sciences', 'English Language'].map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${
                    selectedCategory === cat ? 'bg-[#002147] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* MATERIALS GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map(mat => (
              <div 
                key={mat.id} 
                className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm hover:border-[#002147] transition flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  
                  {/* Category & Badge */}
                  <div className="flex justify-between items-center gap-2">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-[#002147] font-bold text-[10px] rounded-lg">
                      {mat.isVoiceNote ? <Mic className="w-3 h-3 text-rose-500" /> : <FileText className="w-3 h-3 text-indigo-500" />}
                      <span>{mat.category || (mat.isVoiceNote ? 'Voice Note' : 'General')}</span>
                    </span>

                    {/* Strict Read-Only Badge */}
                    <span className="inline-flex items-center gap-1 text-[9px] font-extrabold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full border border-slate-200">
                      <Lock className="w-2.5 h-2.5 text-slate-400" />
                      <span>Teacher Content (Read-Only)</span>
                    </span>
                  </div>

                  <h3 className="text-sm font-black text-slate-900 leading-snug">
                    {mat.title}
                  </h3>

                  <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-2xl border border-slate-100 line-clamp-4 font-mono">
                    "{mat.content || mat.description}"
                  </p>
                </div>

                {/* Footer Controls for Student */}
                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                    <span>By: {mat.creatorName || mat.teacherName || mat.uploadedBy || 'Educator'}</span>
                    <span>{mat.dateFormatted || 'Recently'}</span>
                  </div>

                  <div className="flex items-center justify-between gap-1 pt-1">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleCopyText(mat.content || mat.description || '', mat.id)}
                        className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition"
                        title="Copy note text"
                      >
                        {copiedId === mat.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDownload(mat)}
                        className="p-1.5 text-slate-600 hover:text-emerald-600 hover:bg-slate-100 rounded-lg transition"
                        title="Download as text file"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSaveToMyNotes(mat)}
                      className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-black text-xs rounded-xl flex items-center gap-1.5 transition cursor-pointer"
                      title="Save an editable copy to your own notes"
                    >
                      <Layers className="w-3 h-3" />
                      <span>Save to My Notes</span>
                    </button>
                  </div>
                </div>

              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: MY PERSONAL STUDY NOTES & DRAFTS (FULL USER OWNERSHIP CONTROLS) */}
      {activeViewTab === 'my_study_notes' && (
        <UserContentHub
          currentUser={currentUser}
          userRole="student"
          schoolId={schoolId}
          defaultTypeFilter="notes"
          titleOverride="Student Study Notes & Personal Content"
          descriptionOverride="Manage your private study notes, revision guides, drafts, and saved AI resources. You have 100% control to create, edit, copy, download, and delete your own notes."
          showToast={showToast}
        />
      )}

    </div>
  );
};
