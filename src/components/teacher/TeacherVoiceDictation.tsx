import React, { useState, useEffect } from 'react';
import { 
  Mic, 
  MicOff, 
  Save, 
  Trash2, 
  Copy, 
  Check, 
  Sparkles, 
  FileText, 
  Volume2, 
  Clock, 
  Search, 
  Send, 
  Loader2,
  Edit3,
  Share2,
  Download,
  RotateCcw,
  Layers,
  Lock,
  Globe,
  X,
  BookOpen
} from 'lucide-react';
import { VoiceDictationButton } from '../common/VoiceDictationButton';
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  where, 
  deleteDoc, 
  doc, 
  updateDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import { createUserContent, updateUserContent, deleteUserContent, downloadContentFile, copyToClipboard } from '../../services/userContentService';

interface TeacherVoiceDictationProps {
  schoolId: string;
  currentUser: any;
  assignedClasses: any[];
  assignedSubjects: any[];
  students: any[];
  showToast?: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
  onSendToAssignment?: (dictatedText: string) => void;
}

export const TeacherVoiceDictation: React.FC<TeacherVoiceDictationProps> = ({
  schoolId,
  currentUser,
  assignedClasses,
  assignedSubjects,
  students,
  showToast,
  onSendToAssignment
}) => {
  const currentUid = currentUser?.uid || currentUser?.id || '';

  // Input Workspace State
  const [dictatedText, setDictatedText] = useState('');
  const [noteTitle, setNoteTitle] = useState('');
  const [noteCategory, setNoteCategory] = useState<'Classroom Note' | 'Student Feedback' | 'Lesson Reflection' | 'Disciplinary' | 'Parent Message'>('Classroom Note');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [isSharedWithClass, setIsSharedWithClass] = useState(false);

  // Saved Notes & Repository State
  const [savedNotes, setSavedNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState('');

  // Editing Modal State
  const [editingNote, setEditingNote] = useState<any | null>(null);
  const [editFormData, setEditFormData] = useState({
    title: '',
    category: 'Classroom Note',
    className: '',
    content: '',
    isSharedWithClass: false
  });
  const [updatingNote, setUpdatingNote] = useState(false);

  // Real-time listener for teacher's voice notes
  useEffect(() => {
    if (!currentUid) return;
    setLoading(true);

    const q = query(
      collection(db, 'teacherVoiceNotes'),
      where('teacherId', '==', currentUid)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: any[] = [];
        snapshot.forEach((d) => {
          list.push({ id: d.id, ...d.data() });
        });
        // Sort in-memory by createdAt descending
        list.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
        setSavedNotes(list);
        setLoading(false);
      },
      (err) => {
        console.warn('Real-time voice notes listener error:', err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUid]);

  const handleTranscript = (transcriptText: string, isFinal?: boolean) => {
    if (isFinal) {
      setDictatedText(prev => (prev ? `${prev} ${transcriptText}` : transcriptText));
    }
  };

  // CREATE & SAVE: Persist voice note with full ownership tagging
  const handleSaveNote = async () => {
    if (!dictatedText.trim()) {
      if (showToast) showToast('Please dictate or type some note content before saving.', 'warning');
      return;
    }

    setSaving(true);
    try {
      const selectedStudent = students.find(s => s.id === selectedStudentId);
      const title = noteTitle.trim() || `${noteCategory} - ${new Date().toLocaleDateString()}`;

      const newNote = {
        // Ownership & Security fields
        ownerUid: currentUid,
        createdBy: currentUid,
        teacherId: currentUid,
        senderId: currentUid,
        teacherName: currentUser.fullName || currentUser.name || 'Teacher',
        creatorName: currentUser.fullName || currentUser.name || 'Teacher',
        schoolId: schoolId || currentUser.schoolId || '',
        ownerRole: 'teacher',

        title,
        category: noteCategory,
        content: dictatedText.trim(),
        className: selectedClass || 'General',
        targetClass: selectedClass || 'General',
        subjectName: selectedSubject || 'General',
        studentId: selectedStudentId || null,
        studentName: selectedStudent ? (selectedStudent.fullName || selectedStudent.name) : null,

        // Sharing configuration
        isShared: isSharedWithClass,
        isSharedWithClass: isSharedWithClass,
        shareScope: isSharedWithClass ? 'class' : 'private',
        sharedWithClasses: selectedClass ? [selectedClass] : [],
        sharedAt: isSharedWithClass ? serverTimestamp() : null,

        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        dateFormatted: new Date().toLocaleString()
      };

      // 1. Save to primary teacherVoiceNotes collection
      const docRef = await addDoc(collection(db, 'teacherVoiceNotes'), newNote);

      // 2. Also register in the unified userCreatedContent repository for students/hub
      await createUserContent(
        {
          title,
          content: dictatedText.trim(),
          type: 'voice_dictation',
          category: noteCategory,
          targetClass: selectedClass,
          className: selectedClass,
          subjectName: selectedSubject,
          isShared: isSharedWithClass,
          shareScope: isSharedWithClass ? 'class' : 'private',
          sharedWithClasses: selectedClass ? [selectedClass] : [],
          metadata: {
            voiceNoteDocId: docRef.id,
            studentId: selectedStudentId || null
          }
        },
        currentUser
      );

      if (showToast) {
        showToast(
          isSharedWithClass 
            ? `Voice note saved and shared with class ${selectedClass || 'General'}!` 
            : 'Voice note saved privately to your dashboard!', 
          'success'
        );
      }
      
      // Reset form
      setDictatedText('');
      setNoteTitle('');
      setSelectedStudentId('');
      setIsSharedWithClass(false);
    } catch (err: any) {
      console.error('Error saving voice note:', err);
      if (showToast) showToast('Failed to save note: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  // EDIT: Open edit modal
  const handleOpenEdit = (note: any) => {
    setEditingNote(note);
    setEditFormData({
      title: note.title || '',
      category: note.category || 'Classroom Note',
      className: note.className || note.targetClass || '',
      content: note.content || '',
      isSharedWithClass: Boolean(note.isSharedWithClass || note.isShared)
    });
  };

  // EDIT: Update note in Firestore
  const handleUpdateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNote) return;

    setUpdatingNote(true);
    try {
      const noteRef = doc(db, 'teacherVoiceNotes', editingNote.id);
      await updateDoc(noteRef, {
        title: editFormData.title.trim(),
        category: editFormData.category,
        className: editFormData.className,
        targetClass: editFormData.className,
        content: editFormData.content.trim(),
        isShared: editFormData.isSharedWithClass,
        isSharedWithClass: editFormData.isSharedWithClass,
        shareScope: editFormData.isSharedWithClass ? 'class' : 'private',
        sharedWithClasses: editFormData.className ? [editFormData.className] : [],
        updatedAt: serverTimestamp(),
        lastEditedAt: new Date().toLocaleString()
      });

      if (showToast) showToast('Voice note updated successfully!', 'success');
      setEditingNote(null);
    } catch (err: any) {
      console.error('Error updating note:', err);
      if (showToast) showToast('Failed to update note: ' + err.message, 'error');
    } finally {
      setUpdatingNote(false);
    }
  };

  // DELETE: Delete note with strict ownership verification
  const handleDeleteNote = async (note: any) => {
    // Ownership check: only creator or platform owner can delete
    if (note.teacherId !== currentUid && note.ownerUid !== currentUid) {
      if (showToast) showToast('Permission denied: You cannot delete another teacher\'s note.', 'error');
      return;
    }

    if (!window.confirm(`Are you sure you want to permanently delete "${note.title}"?`)) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'teacherVoiceNotes', note.id));
      if (showToast) showToast('Voice note deleted.', 'info');
    } catch (err: any) {
      console.error('Error deleting note:', err);
      if (showToast) showToast('Failed to delete note: ' + err.message, 'error');
    }
  };

  // COPY: Duplicate note into a new draft under teacher's ownership
  const handleDuplicateNote = async (note: any) => {
    try {
      const duplicateData = {
        ...note,
        title: `${note.title} (Copy)`,
        ownerUid: currentUid,
        createdBy: currentUid,
        teacherId: currentUid,
        senderId: currentUid,
        isShared: false,
        isSharedWithClass: false,
        shareScope: 'private',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        dateFormatted: new Date().toLocaleString()
      };
      delete duplicateData.id;

      await addDoc(collection(db, 'teacherVoiceNotes'), duplicateData);
      if (showToast) showToast(`Duplicated "${note.title}" to a new private draft!`, 'success');
    } catch (err: any) {
      console.error('Error duplicating note:', err);
      if (showToast) showToast('Failed to duplicate note.', 'error');
    }
  };

  // SHARE: Toggle sharing with class
  const handleToggleShare = async (note: any) => {
    const nextState = !Boolean(note.isSharedWithClass || note.isShared);
    try {
      const noteRef = doc(db, 'teacherVoiceNotes', note.id);
      await updateDoc(noteRef, {
        isShared: nextState,
        isSharedWithClass: nextState,
        shareScope: nextState ? 'class' : 'private',
        sharedWithClasses: note.className ? [note.className] : [],
        sharedAt: nextState ? serverTimestamp() : null,
        updatedAt: serverTimestamp()
      });

      if (showToast) {
        showToast(
          nextState 
            ? `Note shared with class: ${note.className || 'All Classes'}!` 
            : 'Note is now Private.', 
          'info'
        );
      }
    } catch (err: any) {
      console.error('Error toggling share:', err);
      if (showToast) showToast('Failed to update sharing.', 'error');
    }
  };

  // COPY TEXT: Copy to clipboard
  const handleCopyText = async (text: string, id: string) => {
    const success = await copyToClipboard(text);
    if (success) {
      setCopiedId(id);
      if (showToast) showToast('Note content copied to clipboard!', 'success');
      setTimeout(() => setCopiedId(null), 2000);
    } else {
      if (showToast) showToast('Failed to copy to clipboard.', 'error');
    }
  };

  // DOWNLOAD: Download as text file
  const handleDownloadNote = (note: any) => {
    downloadContentFile(note.title, note.content, 'txt');
    if (showToast) showToast(`Downloaded "${note.title}.txt"`, 'info');
  };

  // REUSE: Load note content back into dictation canvas
  const handleReuseInCanvas = (note: any) => {
    setDictatedText(note.content);
    setNoteTitle(`${note.title} (Extended)`);
    if (note.category) setNoteCategory(note.category);
    if (note.className) setSelectedClass(note.className);
    if (showToast) showToast(`Loaded "${note.title}" into dictation studio!`, 'success');
  };

  // Filter notes
  const filteredNotes = savedNotes.filter(n => {
    const matchesCategory = filterCategory === 'All' || n.category === filterCategory;
    const matchesSearch = !searchTerm || 
      n.title?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      n.content?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      n.className?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      n.studentName?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6">
      
      {/* HEADER BANNER */}
      <div className="bg-gradient-to-r from-[#002147] via-indigo-900 to-[#002147] text-white p-6 rounded-3xl border border-indigo-500/30 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1 max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-[#D4AF37] text-[#002147] rounded-xl font-black">
              <Mic className="w-5 h-5 animate-pulse" />
            </span>
            <h2 className="text-xl font-black tracking-tight text-white">Teacher Voice Dictation & Classroom Notes</h2>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Dictate, save, edit, duplicate, and share classroom observations, voice feedback, and lesson notes with your students in real time.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-white/10 p-3 rounded-2xl border border-white/10 shrink-0 text-xs">
          <Sparkles className="w-4 h-4 text-[#D4AF37]" />
          <span className="text-slate-200">Ownership Protected • Real-Time Sync</span>
        </div>
      </div>

      {/* DICTATION CANVAS & CONTROLS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: DICTATION INPUT WORKSPACE */}
        <div className="lg:col-span-7 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-600" />
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Voice Dictation Studio</h3>
            </div>

            {/* Microphone Button */}
            <VoiceDictationButton
              onTranscript={handleTranscript}
              size="md"
              variant="primary"
              buttonText="Start Dictating"
            />
          </div>

          {/* Form Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Note Category
              </label>
              <select
                value={noteCategory}
                onChange={(e: any) => setNoteCategory(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="Classroom Note">Classroom Note</option>
                <option value="Student Feedback">Student Feedback</option>
                <option value="Lesson Reflection">Lesson Reflection</option>
                <option value="Disciplinary">Disciplinary Observation</option>
                <option value="Parent Message">Parent Message Draft</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Note Title / Topic
              </label>
              <input
                type="text"
                placeholder="e.g., Mathematics Algebra Assessment Feedback"
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Target Class (Optional)
              </label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">-- General / All Classes --</option>
                {assignedClasses.map((c, idx) => (
                  <option key={idx} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Student (Optional)
              </label>
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">-- Select Student for Specific Feedback --</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.fullName || s.name} ({s.className || s.class || 'Student'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Dictated Text Textarea */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Dictated Content & Speech Notes
              </label>
              <span className="text-[10px] text-slate-400 font-mono">
                {dictatedText.length} characters
              </span>
            </div>

            <textarea
              rows={7}
              placeholder="Click 'Start Dictating' above and speak into your microphone, or type your classroom observations directly here..."
              value={dictatedText}
              onChange={(e) => setDictatedText(e.target.value)}
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed resize-y font-mono"
            />
          </div>

          {/* Sharing Checkbox */}
          <div className="p-3 bg-indigo-50/60 rounded-2xl border border-indigo-100 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-indigo-600" />
                Share note with students in {selectedClass || 'target class'}
              </span>
              <p className="text-[11px] text-slate-500">
                When enabled, students in this class receive this note in real time under their Learning Materials.
              </p>
            </div>
            <input
              type="checkbox"
              checked={isSharedWithClass}
              onChange={(e) => setIsSharedWithClass(e.target.checked)}
              className="w-4 h-4 text-indigo-600 rounded cursor-pointer"
            />
          </div>

          {/* Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={() => setDictatedText('')}
              disabled={!dictatedText}
              className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:text-red-600 bg-slate-100 hover:bg-red-50 rounded-xl transition flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Canvas</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleCopyText(dictatedText, 'canvas')}
                disabled={!dictatedText}
                className="px-3.5 py-2 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
              >
                {copiedId === 'canvas' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>Copy Text</span>
              </button>

              <button
                type="button"
                onClick={handleSaveNote}
                disabled={saving || !dictatedText.trim()}
                className="px-5 py-2 text-xs font-black text-[#002147] bg-[#D4AF37] hover:bg-amber-400 rounded-xl transition shadow flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>Save Voice Note</span>
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: SAVED VOICE NOTES REPOSITORY */}
        <div className="lg:col-span-5 bg-slate-50 p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Volume2 className="w-5 h-5 text-[#002147]" />
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                  My Voice Notes ({filteredNotes.length})
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Real-time sync" />
                <span className="text-[10px] bg-slate-200 text-slate-700 font-bold px-2.5 py-1 rounded-full">
                  {savedNotes.length} Total
                </span>
              </div>
            </div>

            {/* Search and Filters */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Search saved voice notes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
                {['All', 'Classroom Note', 'Student Feedback', 'Lesson Reflection', 'Disciplinary'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setFilterCategory(cat)}
                    className={`px-2.5 py-1 rounded-lg font-bold shrink-0 transition cursor-pointer ${
                      filterCategory === cat
                        ? 'bg-[#002147] text-white shadow-sm'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes List */}
            {loading ? (
              <div className="py-12 text-center space-y-2">
                <Loader2 className="w-6 h-6 text-indigo-600 animate-spin mx-auto" />
                <p className="text-xs text-slate-500">Syncing voice notes in real-time...</p>
              </div>
            ) : filteredNotes.length === 0 ? (
              <div className="py-12 text-center bg-white rounded-2xl border border-dashed border-slate-300 p-6 space-y-2">
                <MicOff className="w-8 h-8 text-slate-300 mx-auto" />
                <h4 className="text-xs font-bold text-slate-700">No Voice Notes Found</h4>
                <p className="text-[11px] text-slate-400">
                  Dictate notes on the left canvas to save student feedback and classroom observations.
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
                {filteredNotes.map((note) => {
                  const isShared = Boolean(note.isSharedWithClass || note.isShared);

                  return (
                    <div
                      key={note.id}
                      className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-2.5 hover:border-indigo-300 transition group"
                    >
                      {/* Top Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="inline-block px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-extrabold uppercase tracking-wider rounded-md border border-indigo-100">
                              {note.category}
                            </span>

                            {/* Share Status Badge */}
                            {isShared ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[9px] font-black rounded-md border border-emerald-200">
                                <Globe className="w-2.5 h-2.5" />
                                <span>Shared ({note.className || 'Class'})</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-600 text-[9px] font-black rounded-md">
                                <Lock className="w-2.5 h-2.5" />
                                <span>Private</span>
                              </span>
                            )}
                          </div>

                          <h4 className="text-xs font-black text-slate-900 leading-tight pt-1">
                            {note.title}
                          </h4>
                        </div>

                        {/* Quick Actions Toolbar */}
                        <div className="flex items-center gap-1">
                          
                          {/* Reuse in Canvas */}
                          <button
                            type="button"
                            onClick={() => handleReuseInCanvas(note)}
                            className="p-1 text-slate-400 hover:text-indigo-600 rounded transition"
                            title="Reuse in dictation canvas"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>

                          {/* Copy Text */}
                          <button
                            type="button"
                            onClick={() => handleCopyText(note.content, note.id)}
                            className="p-1 text-slate-400 hover:text-indigo-600 rounded transition"
                            title="Copy text"
                          >
                            {copiedId === note.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>

                          {/* Duplicate */}
                          <button
                            type="button"
                            onClick={() => handleDuplicateNote(note)}
                            className="p-1 text-slate-400 hover:text-indigo-600 rounded transition"
                            title="Duplicate as new draft"
                          >
                            <Layers className="w-3.5 h-3.5" />
                          </button>

                          {/* Share with Class Toggle */}
                          <button
                            type="button"
                            onClick={() => handleToggleShare(note)}
                            className={`p-1 rounded transition ${
                              isShared ? 'text-emerald-600 hover:text-emerald-700' : 'text-slate-400 hover:text-indigo-600'
                            }`}
                            title={isShared ? 'Revoke sharing (Make Private)' : 'Share with Class'}
                          >
                            <Share2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit */}
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(note)}
                            className="p-1 text-slate-400 hover:text-blue-600 rounded transition"
                            title="Edit note"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          {/* Download */}
                          <button
                            type="button"
                            onClick={() => handleDownloadNote(note)}
                            className="p-1 text-slate-400 hover:text-emerald-600 rounded transition"
                            title="Download as .txt"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete (Strictly Teacher Owner) */}
                          <button
                            type="button"
                            onClick={() => handleDeleteNote(note)}
                            className="p-1 text-slate-400 hover:text-red-600 rounded transition"
                            title="Delete note permanently"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Content excerpt */}
                      <p className="text-xs text-slate-700 leading-relaxed font-normal bg-slate-50 p-2.5 rounded-xl border border-slate-100 font-mono">
                        "{note.content}"
                      </p>

                      {/* Footer Info */}
                      <div className="flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-100 pt-2 font-mono">
                        <span>{note.className} {note.studentName ? `• Student: ${note.studentName}` : ''}</span>
                        <span>{note.dateFormatted || 'Recently'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* MODAL: EDIT VOICE NOTE */}
      {editingNote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-indigo-50 text-indigo-700 rounded-xl font-bold">
                  <Edit3 className="w-5 h-5" />
                </span>
                <h3 className="text-sm font-black text-slate-900">Edit Voice Note & Sharing</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingNote(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateNote} className="space-y-3">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    required
                    value={editFormData.title}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Category
                  </label>
                  <select
                    value={editFormData.category}
                    onChange={(e: any) => setEditFormData(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Classroom Note">Classroom Note</option>
                    <option value="Student Feedback">Student Feedback</option>
                    <option value="Lesson Reflection">Lesson Reflection</option>
                    <option value="Disciplinary">Disciplinary Observation</option>
                    <option value="Parent Message">Parent Message Draft</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Target Class
                </label>
                <select
                  value={editFormData.className}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, className: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="General">-- General / All Classes --</option>
                  {assignedClasses.map((c, idx) => (
                    <option key={idx} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Note Content *
                </label>
                <textarea
                  rows={6}
                  required
                  value={editFormData.content}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, content: e.target.value }))}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed"
                />
              </div>

              {/* Sharing Checkbox */}
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-emerald-600" />
                  Share with students in class: {editFormData.className || 'General'}
                </span>
                <input
                  type="checkbox"
                  checked={editFormData.isSharedWithClass}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, isSharedWithClass: e.target.checked }))}
                  className="w-4 h-4 text-emerald-600 rounded cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingNote(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingNote}
                  className="px-5 py-2 text-xs font-black text-[#002147] bg-[#D4AF37] hover:bg-amber-400 rounded-xl transition shadow flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {updatingNote ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>Save Note Changes</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};
