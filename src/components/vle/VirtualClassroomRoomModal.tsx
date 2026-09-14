import React, { useState, useEffect, useRef } from 'react';
import { 
  Video, 
  Users, 
  MessageSquare, 
  PenTool, 
  FileText, 
  Sparkles, 
  HelpCircle, 
  CheckCircle2, 
  Clock, 
  ShieldAlert, 
  Share2, 
  Send, 
  Plus, 
  Trash2, 
  Pin, 
  VolumeX, 
  Hand, 
  BrainCircuit, 
  Download, 
  Upload, 
  X, 
  ExternalLink, 
  Layers, 
  Award, 
  BookOpen, 
  Image as ImageIcon, 
  Square, 
  Circle, 
  Type, 
  Eraser, 
  RefreshCw, 
  BarChart2, 
  Lock, 
  ThumbsUp, 
  Heart, 
  Smile, 
  Lightbulb, 
  Flame,
  Film,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  onSnapshot, 
  serverTimestamp, 
  getDocs,
  setDoc
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import { 
  GoogleMeetClass, 
  VleMaterial, 
  VleChatMessage, 
  VleLiveQuiz, 
  VleQuizResponse, 
  VleBreakoutGroup, 
  VleAiNote,
  recordStudentMeetAttendance,
  saveGoogleMeetRecording
} from '../../services/googleMeetService';
import { LiveVleWhiteboard } from './LiveVleWhiteboard';

interface VirtualClassroomRoomModalProps {
  meeting: GoogleMeetClass;
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
  userRole: 'teacher' | 'student' | 'parent' | 'school_admin' | 'owner';
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const VirtualClassroomRoomModal: React.FC<VirtualClassroomRoomModalProps> = ({
  meeting,
  isOpen,
  onClose,
  currentUser,
  userRole,
  showToast
}) => {
  if (!isOpen || !meeting) return null;

  const meetingId = meeting.id || meeting.meetingId;
  const isTeacher = userRole === 'teacher' || userRole === 'school_admin' || userRole === 'owner';

  // Navigation Sub-Tabs
  const [activeTab, setActiveTab] = useState<'whiteboard' | 'materials' | 'chat' | 'homework' | 'quizzes' | 'breakout' | 'ai_assistant' | 'recording' | 'attendance'>('whiteboard');

  // --- 1. DIGITAL WHITEBOARD STATE ---
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [wbTool, setWbTool] = useState<'pen' | 'line' | 'rect' | 'circle' | 'text' | 'eraser'>('pen');
  const [wbColor, setWbColor] = useState('#002147');
  const [wbWidth, setWbWidth] = useState(3);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStartPos, setDrawStartPos] = useState<{ x: number; y: number } | null>(null);
  const [savedWhiteboards, setSavedWhiteboards] = useState<{ id: string; imageData: string; createdAt: any }[]>([]);

  // --- 2. LESSON MATERIALS STATE ---
  const [materials, setMaterials] = useState<VleMaterial[]>([]);
  const [newMatTitle, setNewMatTitle] = useState('');
  const [newMatUrl, setNewMatUrl] = useState('');
  const [newMatType, setNewMatType] = useState<'pdf' | 'docx' | 'ppt' | 'image' | 'video' | 'audio' | 'link'>('pdf');

  // --- 3. LIVE CLASS CHAT STATE ---
  const [chatMessages, setChatMessages] = useState<VleChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatMuted, setChatMuted] = useState(false);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [raisedHandsList, setRaisedHandsList] = useState<{ id: string; studentName: string; timestamp: string }[]>([]);

  // --- 4. IN-CLASS HOMEWORK ASSIGNER STATE ---
  const [hwTitle, setHwTitle] = useState('');
  const [hwInstructions, setHwInstructions] = useState('');
  const [hwDueDate, setHwDueDate] = useState('');
  const [hwPoints, setHwPoints] = useState(100);
  const [hwSubmitting, setHwSubmitting] = useState(false);

  // --- 5. LIVE QUIZZES & POLLS STATE ---
  const [liveQuizzes, setLiveQuizzes] = useState<VleLiveQuiz[]>([]);
  const [quizResponses, setQuizResponses] = useState<VleQuizResponse[]>([]);
  const [newQuizQuestion, setNewQuizQuestion] = useState('');
  const [newQuizType, setNewQuizType] = useState<'mcq' | 'true_false' | 'poll' | 'short_answer'>('mcq');
  const [newQuizOptions, setNewQuizOptions] = useState<string[]>(['Option A', 'Option B', 'Option C', 'Option D']);
  const [correctOptionIdx, setCorrectOptionIdx] = useState(0);

  // --- 6. BREAKOUT GROUPS STATE ---
  const [breakoutGroups, setBreakoutGroups] = useState<VleBreakoutGroup[]>([]);
  const [breakoutCount, setBreakoutCount] = useState(2);

  // --- 7. AI CLASS ASSISTANT STATE ---
  const [aiNote, setAiNote] = useState<VleAiNote | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  // --- 8. CLASS RECORDING & REPLAY STATE ---
  const [recordingUrl, setRecordingUrl] = useState(meeting.recordingUrl || '');
  const [recordingNotes, setRecordingNotes] = useState('');
  const [allowStudentReplay, setAllowStudentReplay] = useState(true);
  const [allowParentReplay, setAllowParentReplay] = useState(true);

  // --- 9. ATTENDANCE LOGS ---
  const [attendanceLogs, setAttendanceLogs] = useState<any[]>([]);

  // Telemetry Join Log
  useEffect(() => {
    if (userRole === 'student' && currentUser?.uid) {
      recordStudentMeetAttendance({
        schoolId: meeting.schoolId,
        meetingId,
        className: meeting.className,
        subject: meeting.subject,
        studentId: currentUser.uid,
        studentName: currentUser.displayName || currentUser.email || 'Student',
        joinTime: new Date().toLocaleTimeString(),
        status: 'Present'
      });
    }
  }, [meeting, currentUser, userRole]);

  // Real-time Chat Listener
  useEffect(() => {
    const q = query(
      collection(db, 'virtualClassroomChats'),
      where('meetingId', '==', meetingId)
    );
    const unsub = onSnapshot(q, (snap) => {
      const list: VleChatMessage[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as VleChatMessage));
      list.sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));
      setChatMessages(list);
    });
    return () => unsub();
  }, [meetingId]);

  // Real-time Hand Raises Listener
  useEffect(() => {
    const q = query(
      collection(db, 'virtualClassroomHandRaises'),
      where('meetingId', '==', meetingId)
    );
    const unsub = onSnapshot(q, (snap) => {
      const list: any[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() }));
      setRaisedHandsList(list);
    });
    return () => unsub();
  }, [meetingId]);

  // Real-time Materials Listener
  useEffect(() => {
    const q = query(
      collection(db, 'virtualClassroomMaterials'),
      where('meetingId', '==', meetingId)
    );
    const unsub = onSnapshot(q, (snap) => {
      const list: VleMaterial[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as VleMaterial));
      setMaterials(list);
    });
    return () => unsub();
  }, [meetingId]);

  // Real-time Live Quizzes Listener
  useEffect(() => {
    const q = query(
      collection(db, 'virtualClassroomQuizzes'),
      where('meetingId', '==', meetingId)
    );
    const unsub = onSnapshot(q, (snap) => {
      const list: VleLiveQuiz[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as VleLiveQuiz));
      setLiveQuizzes(list);
    });
    return () => unsub();
  }, [meetingId]);

  // Real-time Quiz Responses Listener
  useEffect(() => {
    const q = query(
      collection(db, 'virtualClassroomQuizResponses'),
      where('meetingId', '==', meetingId)
    );
    const unsub = onSnapshot(q, (snap) => {
      const list: VleQuizResponse[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as VleQuizResponse));
      setQuizResponses(list);
    });
    return () => unsub();
  }, [meetingId]);

  // Real-time Whiteboards Listener
  useEffect(() => {
    const q = query(
      collection(db, 'virtualClassroomWhiteboards'),
      where('meetingId', '==', meetingId)
    );
    const unsub = onSnapshot(q, (snap) => {
      const list: any[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() }));
      setSavedWhiteboards(list);
    });
    return () => unsub();
  }, [meetingId]);

  // Real-time Attendance Listener
  useEffect(() => {
    const q = query(
      collection(db, 'onlineClassAttendance'),
      where('meetingId', '==', meetingId)
    );
    const unsub = onSnapshot(q, (snap) => {
      const list: any[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() }));
      setAttendanceLogs(list);
    });
    return () => unsub();
  }, [meetingId]);

  // --- WHITEBOARD CANVAS EVENT HANDLERS ---
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isTeacher) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsDrawing(true);
    setDrawStartPos({ x, y });

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.strokeStyle = wbColor;
    ctx.lineWidth = wbWidth;
    ctx.lineCap = 'round';

    if (wbTool === 'pen' || wbTool === 'eraser') {
      ctx.beginPath();
      ctx.moveTo(x, y);
      if (wbTool === 'eraser') {
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = wbWidth * 4;
      }
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !isTeacher) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (wbTool === 'pen' || wbTool === 'eraser') {
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  };

  const handleCanvasMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !isTeacher) return;
    const canvas = canvasRef.current;
    if (!canvas || !drawStartPos) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = wbColor;
    ctx.lineWidth = wbWidth;

    if (wbTool === 'line') {
      ctx.beginPath();
      ctx.moveTo(drawStartPos.x, drawStartPos.y);
      ctx.lineTo(x, y);
      ctx.stroke();
    } else if (wbTool === 'rect') {
      ctx.strokeRect(drawStartPos.x, drawStartPos.y, x - drawStartPos.x, y - drawStartPos.y);
    } else if (wbTool === 'circle') {
      const radius = Math.sqrt(Math.pow(x - drawStartPos.x, 2) + Math.pow(y - drawStartPos.y, 2));
      ctx.beginPath();
      ctx.arc(drawStartPos.x, drawStartPos.y, radius, 0, 2 * Math.PI);
      ctx.stroke();
    }

    setIsDrawing(false);
    setDrawStartPos(null);
  };

  const handleClearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const handleSaveCanvasSnapshot = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const imageData = canvas.toDataURL('image/png');
    try {
      await addDoc(collection(db, 'virtualClassroomWhiteboards'), {
        meetingId,
        imageData,
        savedBy: currentUser?.displayName || 'Teacher',
        createdAt: serverTimestamp()
      });
      showToast?.('Whiteboard snapshot saved to VLE repository', 'success');
    } catch (err) {
      showToast?.('Error saving whiteboard snapshot', 'error');
    }
  };

  // --- SEND CHAT MESSAGE ---
  const handleSendChatMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatInput.trim() || chatMuted) return;

    try {
      await addDoc(collection(db, 'virtualClassroomChats'), {
        meetingId,
        senderId: currentUser?.uid || 'user',
        senderName: currentUser?.displayName || currentUser?.email || 'User',
        senderRole: userRole === 'teacher' ? 'teacher' : 'student',
        text: chatInput.trim(),
        createdAt: serverTimestamp()
      });
      setChatInput('');
    } catch (err) {
      showToast?.('Failed to send message', 'error');
    }
  };

  const handleEmojiReaction = async (msgId: string, emoji: string) => {
    try {
      await updateDoc(doc(db, 'virtualClassroomChats', msgId), {
        reaction: emoji
      });
    } catch (err) {
      console.warn('Emoji reaction error:', err);
    }
  };

  const handleToggleHandRaise = async () => {
    if (userRole !== 'student') return;
    const nextState = !isHandRaised;
    setIsHandRaised(nextState);

    try {
      if (nextState) {
        await addDoc(collection(db, 'virtualClassroomHandRaises'), {
          meetingId,
          studentId: currentUser?.uid,
          studentName: currentUser?.displayName || currentUser?.email || 'Student',
          timestamp: new Date().toLocaleTimeString()
        });
        showToast?.('Hand raised for teacher', 'info');
      } else {
        const q = query(
          collection(db, 'virtualClassroomHandRaises'),
          where('meetingId', '==', meetingId),
          where('studentId', '==', currentUser?.uid)
        );
        const snap = await getDocs(q);
        snap.forEach(d => deleteDoc(doc(db, 'virtualClassroomHandRaises', d.id)));
        showToast?.('Hand lowered', 'info');
      }
    } catch (err) {
      console.warn('Hand raise toggle error:', err);
    }
  };

  // --- UPLOAD MATERIAL ---
  const handleAddMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMatTitle || !newMatUrl) return;

    try {
      await addDoc(collection(db, 'virtualClassroomMaterials'), {
        meetingId,
        title: newMatTitle,
        fileType: newMatType,
        fileUrl: newMatUrl,
        uploadedBy: currentUser?.displayName || 'Teacher',
        createdAt: serverTimestamp()
      });
      setNewMatTitle('');
      setNewMatUrl('');
      showToast?.('Lesson material added to VLE', 'success');
    } catch (err) {
      showToast?.('Error uploading material', 'error');
    }
  };

  // --- ASSIGN HOMEWORK ---
  const handleAssignHomework = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hwTitle || !hwDueDate) return;
    setHwSubmitting(true);

    try {
      await addDoc(collection(db, 'assignments'), {
        schoolId: meeting.schoolId,
        title: hwTitle,
        instructions: hwInstructions,
        subject: meeting.subject,
        className: meeting.className,
        teacherId: meeting.teacherId,
        teacherName: meeting.teacherName,
        dueDate: hwDueDate,
        totalPoints: hwPoints,
        createdFromLiveMeet: true,
        meetingId,
        createdAt: serverTimestamp()
      });

      // Broadcast notification
      await addDoc(collection(db, 'notifications'), {
        schoolId: meeting.schoolId,
        targetRole: 'student',
        targetClass: meeting.className,
        title: `📝 Live Class Homework Assigned: ${hwTitle}`,
        message: `Your teacher assigned new homework for ${meeting.subject} during today's live class. Due: ${hwDueDate}`,
        type: 'assignment_created',
        createdAt: serverTimestamp()
      });

      setHwTitle('');
      setHwInstructions('');
      setHwDueDate('');
      showToast?.('Homework assigned & synced to Student/Parent Portals', 'success');
    } catch (err) {
      showToast?.('Error assigning homework', 'error');
    } finally {
      setHwSubmitting(false);
    }
  };

  // --- LAUNCH LIVE QUIZ ---
  const handleLaunchQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuizQuestion) return;

    try {
      await addDoc(collection(db, 'virtualClassroomQuizzes'), {
        meetingId,
        question: newQuizQuestion,
        type: newQuizType,
        options: newQuizType === 'mcq' || newQuizType === 'poll' ? newQuizOptions : newQuizType === 'true_false' ? ['True', 'False'] : [],
        correctOptionIndex: correctOptionIdx,
        status: 'active',
        createdAt: serverTimestamp()
      });
      setNewQuizQuestion('');
      showToast?.('Live quiz launched to all active students', 'success');
    } catch (err) {
      showToast?.('Error launching live quiz', 'error');
    }
  };

  const handleSubmitQuizResponse = async (quizId: string, optionIdx?: number, shortText?: string) => {
    try {
      await addDoc(collection(db, 'virtualClassroomQuizResponses'), {
        quizId,
        meetingId,
        studentId: currentUser?.uid || 'student',
        studentName: currentUser?.displayName || currentUser?.email || 'Student',
        selectedOptionIndex: optionIdx,
        shortAnswerText: shortText,
        createdAt: serverTimestamp()
      });
      showToast?.('Quiz answer submitted', 'success');
    } catch (err) {
      showToast?.('Error submitting answer', 'error');
    }
  };

  // --- AI CLASS ASSISTANT GENERATOR ---
  const handleGenerateAiNotes = async () => {
    setAiLoading(true);
    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Generate an AI Virtual Classroom Lesson Brief for ${meeting.subject} (${meeting.className}):
          Title: ${meeting.title}
          Date: ${meeting.date}
          
          Include:
          1. Concise 3-paragraph Lesson Summary
          2. 5 Key Concepts & Definitions
          3. 4 Revision Flashcards (Q & A)
          4. 3 Practice Examination Questions
          5. 3 Core Learning Objectives`,
          role: 'teacher',
          targetTask: 'virtual_classroom'
        })
      });

      const data = await response.json();
      if (data.text || data.response) {
        const generatedText = data.text || data.response;
        const noteObj: VleAiNote = {
          meetingId,
          subject: meeting.subject,
          summary: generatedText,
          keyConcepts: [
            'Core Principle 1: Fundamental equations and applications',
            'Core Principle 2: Empirical analysis and methodology',
            'Core Principle 3: Practical problem solving and error analysis'
          ],
          flashcards: [
            { question: `What is the primary objective of ${meeting.subject}?`, answer: 'To master foundational and applied conceptual frameworks.' },
            { question: 'How is theory verified in practice?', answer: 'Through structured experimental trials and analytical models.' }
          ],
          practiceQuestions: [
            `Analyze the primary theorem discussed in ${meeting.subject}.`,
            `Solve the worked example provided during the live class session.`
          ],
          learningObjectives: [
            'Demonstrate mastery of key curriculum concepts.',
            'Apply analytical methods to exam-style questions.'
          ]
        };

        setAiNote(noteObj);
        await addDoc(collection(db, 'virtualClassroomAiNotes'), {
          ...noteObj,
          createdAt: serverTimestamp()
        });
        showToast?.('AI Lesson Brief & Flashcards Generated!', 'success');
      }
    } catch (err) {
      showToast?.('Error calling AI Assistant', 'error');
    } finally {
      setAiLoading(false);
    }
  };

  // --- SAVE RECORDING PERMISSIONS ---
  const handleSaveRecordingInfo = async () => {
    try {
      await saveGoogleMeetRecording(meetingId, recordingUrl, meeting.teacherName, meeting.subject);
      await updateDoc(doc(db, 'googleMeetClasses', meetingId), {
        recordingNotes,
        allowStudentReplay,
        allowParentReplay
      });
      showToast?.('Class recording & replay policies updated', 'success');
    } catch (err) {
      showToast?.('Error updating recording info', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/80 backdrop-blur-md overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* TOP HEADER */}
        <div className="bg-gradient-to-r from-[#002147] via-[#0b3c5d] to-[#1d2731] text-white p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#D4AF37]/30">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-400/30 shrink-0">
              <Video className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 bg-emerald-500 text-white font-black text-[10px] rounded-md uppercase tracking-wider">
                  LIVE VLE ROOM
                </span>
                <span className="text-amber-300 text-xs font-bold">{meeting.subject} ({meeting.className})</span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white mt-0.5">{meeting.title}</h2>
              <p className="text-xs text-slate-300">
                Teacher: <span className="font-bold text-white">{meeting.teacherName}</span> • Time: {meeting.startTime} - {meeting.endTime}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <a
              href={meeting.meetLink}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg flex items-center gap-2 transition"
            >
              <Video className="w-4 h-4" /> Open Google Meet
            </a>
            <button
              onClick={onClose}
              className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* SUB-NAVIGATION TABS */}
        <div className="bg-slate-100 p-2 border-b border-slate-200 flex items-center gap-1 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('whiteboard')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
              activeTab === 'whiteboard' ? 'bg-[#002147] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <PenTool className="w-3.5 h-3.5" /> Digital Whiteboard
          </button>

          <button
            onClick={() => setActiveTab('materials')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
              activeTab === 'materials' ? 'bg-[#002147] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" /> Lesson Materials ({materials.length})
          </button>

          <button
            onClick={() => setActiveTab('chat')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
              activeTab === 'chat' ? 'bg-[#002147] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" /> Class Chat ({chatMessages.length})
            {raisedHandsList.length > 0 && (
              <span className="px-1.5 py-0.5 bg-amber-500 text-white text-[9px] rounded-full font-black">
                🖐️ {raisedHandsList.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('homework')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
              activeTab === 'homework' ? 'bg-[#002147] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" /> In-Class Homework
          </button>

          <button
            onClick={() => setActiveTab('quizzes')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
              activeTab === 'quizzes' ? 'bg-[#002147] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5" /> Live Quizzes & Polls ({liveQuizzes.length})
          </button>

          <button
            onClick={() => setActiveTab('breakout')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
              activeTab === 'breakout' ? 'bg-[#002147] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" /> Breakout Groups
          </button>

          <button
            onClick={() => setActiveTab('ai_assistant')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
              activeTab === 'ai_assistant' ? 'bg-amber-600 text-white shadow-sm' : 'text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 fill-current" /> AI Assistant
          </button>

          <button
            onClick={() => setActiveTab('recording')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
              activeTab === 'recording' ? 'bg-[#002147] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Film className="w-3.5 h-3.5" /> Recordings & Notes
          </button>

          <button
            onClick={() => setActiveTab('attendance')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
              activeTab === 'attendance' ? 'bg-[#002147] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Attendance Log ({attendanceLogs.length})
          </button>
        </div>

        {/* TAB BODY CONTENT */}
        <div className="p-4 sm:p-6 flex-1 overflow-y-auto space-y-6">
          
          {/* TAB 1: DIGITAL WHITEBOARD */}
          {activeTab === 'whiteboard' && (
            <div className="space-y-4">
              <LiveVleWhiteboard
                schoolId={meeting.schoolId}
                meetingId={meetingId}
                meetingTitle={`${meeting.subject}: ${meeting.title}`}
                currentUser={currentUser}
                userRole={userRole}
                showToast={showToast}
              />
            </div>
          )}

          {/* TAB 2: LESSON MATERIALS */}
          {activeTab === 'materials' && (
            <div className="space-y-6">
              {isTeacher && (
                <form onSubmit={handleAddMaterial} className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200 space-y-3">
                  <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-2">
                    <Upload className="w-4 h-4 text-amber-600" /> Upload Lesson Material
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <input
                      type="text"
                      placeholder="Material Title (e.g. Chapter 4 Slides)"
                      value={newMatTitle}
                      onChange={e => setNewMatTitle(e.target.value)}
                      className="px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium"
                    />
                    <select
                      value={newMatType}
                      onChange={e => setNewMatType(e.target.value as any)}
                      className="px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium"
                    >
                      <option value="pdf">PDF Document</option>
                      <option value="ppt">PowerPoint Presentation</option>
                      <option value="docx">Word Document</option>
                      <option value="image">Image / Diagram</option>
                      <option value="video">Video Recording</option>
                      <option value="audio">Audio Explanation</option>
                      <option value="link">External Resource Link</option>
                    </select>
                    <input
                      type="url"
                      placeholder="File URL or Link"
                      value={newMatUrl}
                      onChange={e => setNewMatUrl(e.target.value)}
                      className="px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium"
                    />
                  </div>

                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#002147] text-white font-bold text-xs rounded-xl hover:bg-[#001833] transition flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" /> Add Material to Class Repository
                  </button>
                </form>
              )}

              {/* MATERIAL LIST */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {materials.length === 0 ? (
                  <div className="col-span-2 p-8 bg-slate-50 border border-slate-200 rounded-2xl text-center text-slate-500 text-xs">
                    No lesson materials uploaded for this class session yet.
                  </div>
                ) : (
                  materials.map((m) => (
                    <div key={m.id} className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-blue-50 text-blue-800 rounded-xl font-bold uppercase text-[10px]">
                          {m.fileType}
                        </div>
                        <div>
                          <h5 className="text-xs font-bold text-[#002147]">{m.title}</h5>
                          <p className="text-[10px] text-slate-400">Uploaded by {m.uploadedBy}</p>
                        </div>
                      </div>

                      <a
                        href={m.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1.5 transition"
                      >
                        <Download className="w-3.5 h-3.5" /> Download
                      </a>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 3: LIVE CLASS CHAT */}
          {activeTab === 'chat' && (
            <div className="space-y-4">
              {/* Hand Raise Banner */}
              <div className="flex items-center justify-between bg-amber-50 p-3 rounded-2xl border border-amber-200 text-xs text-amber-900">
                <div className="flex items-center gap-2">
                  <Hand className="w-4 h-4 text-amber-600 animate-bounce" />
                  <span className="font-bold">
                    {raisedHandsList.length === 0
                      ? 'No students currently raising hand'
                      : `${raisedHandsList.length} Student(s) Raising Hand: ${raisedHandsList.map(h => h.studentName).join(', ')}`}
                  </span>
                </div>

                {userRole === 'student' && (
                  <button
                    onClick={handleToggleHandRaise}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition ${
                      isHandRaised ? 'bg-rose-600 text-white' : 'bg-amber-600 text-white'
                    }`}
                  >
                    <Hand className="w-3.5 h-3.5" /> {isHandRaised ? 'Lower Hand' : 'Raise Hand 🖐️'}
                  </button>
                )}
              </div>

              {/* Chat Feed */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 h-80 overflow-y-auto space-y-3">
                {chatMessages.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs">No live chat messages yet. Start the conversation!</div>
                ) : (
                  chatMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`p-3 rounded-2xl border text-xs max-w-xl ${
                        msg.senderRole === 'teacher'
                          ? 'bg-blue-50/90 border-blue-200 text-blue-950 ml-auto'
                          : 'bg-white border-slate-200 text-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1 gap-2">
                        <span className="font-bold text-[11px] text-[#002147]">
                          {msg.senderName} {msg.senderRole === 'teacher' && '⭐ (Teacher)'}
                        </span>
                        <div className="flex items-center gap-1 text-[10px] text-slate-400">
                          {['👍', '❤️', '🖐️', '💡'].map(emoji => (
                            <button
                              key={emoji}
                              onClick={() => handleEmojiReaction(msg.id!, emoji)}
                              className="hover:scale-125 transition"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                      <p className="font-medium text-slate-700">{msg.text}</p>
                      {msg.reaction && (
                        <span className="inline-block mt-1 px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] rounded-full font-bold">
                          {msg.reaction}
                        </span>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Chat Input */}
              <form onSubmit={handleSendChatMessage} className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder={chatMuted ? 'Chat is muted by teacher' : 'Ask a question or comment...'}
                  disabled={chatMuted}
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  className="flex-1 px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium"
                />
                <button
                  type="submit"
                  disabled={chatMuted || !chatInput.trim()}
                  className="px-5 py-2.5 bg-[#002147] hover:bg-[#001833] text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" /> Send
                </button>
              </form>
            </div>
          )}

          {/* TAB 4: IN-CLASS HOMEWORK */}
          {activeTab === 'homework' && (
            <div className="space-y-6">
              {isTeacher ? (
                <form onSubmit={handleAssignHomework} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                  <h4 className="text-xs font-bold text-[#002147] uppercase tracking-wider flex items-center gap-2">
                    <FileText className="w-4 h-4 text-emerald-600" /> Assign Homework During Live Class
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">Homework Title</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Chapter 4 Practice Equations"
                        value={hwTitle}
                        onChange={e => setHwTitle(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">Due Date</label>
                      <input
                        type="date"
                        required
                        value={hwDueDate}
                        onChange={e => setHwDueDate(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">Instructions / Description</label>
                    <textarea
                      rows={3}
                      placeholder="Write instructions for the homework assigned in today's class..."
                      value={hwInstructions}
                      onChange={e => setHwInstructions(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={hwSubmitting}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow transition flex items-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Sync & Assign Homework Immediately
                  </button>
                </form>
              ) : (
                <div className="p-8 bg-slate-50 border border-slate-200 rounded-2xl text-center text-xs text-slate-600 space-y-2">
                  <FileText className="w-10 h-10 text-emerald-600 mx-auto" />
                  <p className="font-bold">In-Class Homework Sync Active</p>
                  <p className="text-slate-500 text-[11px]">
                    Any homework assigned by your teacher during this live class session will automatically appear in your Student Portal and Parent Portal.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: LIVE QUIZZES & POLLS */}
          {activeTab === 'quizzes' && (
            <div className="space-y-6">
              {isTeacher && (
                <form onSubmit={handleLaunchQuiz} className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200 space-y-3">
                  <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-2">
                    <BarChart2 className="w-4 h-4 text-amber-600" /> Launch Quick Live Quiz / Poll
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <input
                      type="text"
                      placeholder="Quiz / Poll Question"
                      value={newQuizQuestion}
                      onChange={e => setNewQuizQuestion(e.target.value)}
                      className="sm:col-span-2 px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium"
                    />
                    <select
                      value={newQuizType}
                      onChange={e => setNewQuizType(e.target.value as any)}
                      className="px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium"
                    >
                      <option value="mcq">Multiple Choice (MCQ)</option>
                      <option value="true_false">True / False</option>
                      <option value="poll">Live Audience Poll</option>
                      <option value="short_answer">Short Answer</option>
                    </select>
                  </div>

                  {newQuizType === 'mcq' && (
                    <div className="grid grid-cols-2 gap-2">
                      {newQuizOptions.map((opt, idx) => (
                        <input
                          key={idx}
                          type="text"
                          value={opt}
                          onChange={e => {
                            const updated = [...newQuizOptions];
                            updated[idx] = e.target.value;
                            setNewQuizOptions(updated);
                          }}
                          className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs"
                        />
                      ))}
                    </div>
                  )}

                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#002147] text-white font-bold text-xs rounded-xl hover:bg-[#001833] transition flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" /> Broadcast Live Quiz
                  </button>
                </form>
              )}

              {/* LIVE QUIZZES LIST */}
              <div className="space-y-4">
                {liveQuizzes.length === 0 ? (
                  <div className="p-8 bg-slate-50 border border-slate-200 rounded-2xl text-center text-xs text-slate-500">
                    No active live quizzes at the moment.
                  </div>
                ) : (
                  liveQuizzes.map((quiz) => {
                    const responsesForQuiz = quizResponses.filter(r => r.quizId === quiz.id);
                    return (
                      <div key={quiz.id} className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="px-2.5 py-0.5 bg-amber-100 text-amber-900 font-bold text-[10px] rounded-md uppercase">
                            {quiz.type}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400">
                            {responsesForQuiz.length} Student Responses
                          </span>
                        </div>

                        <h5 className="text-sm font-bold text-[#002147]">{quiz.question}</h5>

                        {/* STUDENT RESPONSE BUTTONS */}
                        {userRole === 'student' && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {(quiz.options || []).map((opt, idx) => (
                              <button
                                key={idx}
                                onClick={() => handleSubmitQuizResponse(quiz.id!, idx)}
                                className="px-4 py-2 bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 rounded-xl text-xs font-bold text-slate-700 hover:text-emerald-900 text-left transition"
                              >
                                {opt}
                              </button>
                            ))}
                          </div>
                        )}

                        {/* LIVE RESPONSE RESULTS */}
                        {isTeacher && (
                          <div className="space-y-2 pt-2 border-t border-slate-100">
                            {(quiz.options || []).map((opt, idx) => {
                              const count = responsesForQuiz.filter(r => r.selectedOptionIndex === idx).length;
                              const pct = responsesForQuiz.length > 0 ? Math.round((count / responsesForQuiz.length) * 100) : 0;
                              return (
                                <div key={idx} className="space-y-1">
                                  <div className="flex justify-between text-xs font-bold text-slate-600">
                                    <span>{opt}</span>
                                    <span>{count} votes ({pct}%)</span>
                                  </div>
                                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* TAB 6: BREAKOUT GROUPS */}
          {activeTab === 'breakout' && (
            <div className="space-y-4">
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-[#002147]">Virtual Breakout Room Generator</h4>
                    <p className="text-xs text-slate-500">Divide students into interactive peer learning groups.</p>
                  </div>

                  {isTeacher && (
                    <button
                      onClick={() => {
                        const attendeeNames = attendanceLogs.map(l => l.studentName || l.userName || 'Student').filter(Boolean);
                        const half = Math.ceil(attendeeNames.length / 2);
                        const group1Students = attendeeNames.slice(0, half);
                        const group2Students = attendeeNames.slice(half);

                        const groups: VleBreakoutGroup[] = [
                          { id: '1', meetingId, groupName: 'Group Alpha (Investigation)', assignedStudentNames: group1Students.length > 0 ? group1Students : ['Room Group 1'], taskDescription: 'Analyze lesson materials & discuss key findings' },
                          { id: '2', meetingId, groupName: 'Group Beta (Application)', assignedStudentNames: group2Students.length > 0 ? group2Students : ['Room Group 2'], taskDescription: 'Review practice problems & synthesize solution' }
                        ];
                        setBreakoutGroups(groups);
                        showToast?.('2 Breakout groups initialized from class attendance', 'success');
                      }}
                      className="px-4 py-2 bg-[#002147] text-white rounded-xl text-xs font-bold hover:bg-[#001833] transition"
                    >
                      Initialize Breakout Rooms
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {breakoutGroups.length === 0 ? (
                    <div className="col-span-2 p-8 bg-slate-50 rounded-2xl border border-slate-200 text-center text-xs text-slate-500">
                      No active breakout groups configured.
                    </div>
                  ) : (
                    breakoutGroups.map((grp) => (
                      <div key={grp.id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-[#002147]">{grp.groupName}</span>
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">
                            Active
                          </span>
                        </div>
                        <p className="text-xs text-slate-600">{grp.taskDescription}</p>
                        <div className="text-[11px] text-slate-500 font-medium">
                          Members: {grp.assignedStudentNames.join(', ')}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: AI CLASS ASSISTANT */}
          {activeTab === 'ai_assistant' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-amber-500/10 via-amber-50 to-orange-50 p-6 rounded-3xl border border-amber-200/80 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-amber-500 text-white rounded-2xl shadow">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-amber-950">EDUkenZA AI Class Assistant</h3>
                      <p className="text-xs text-amber-800">Auto-generate lesson summaries, flashcards, practice questions & objectives.</p>
                    </div>
                  </div>

                  <button
                    onClick={handleGenerateAiNotes}
                    disabled={aiLoading}
                    className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl shadow transition flex items-center gap-2"
                  >
                    <BrainCircuit className="w-4 h-4" /> {aiLoading ? 'Generating Brief...' : 'Generate AI Lesson Brief'}
                  </button>
                </div>

                {aiNote && (
                  <div className="bg-white p-6 rounded-2xl border border-amber-200 space-y-4 text-xs text-slate-800">
                    <div>
                      <h4 className="font-bold text-[#002147] uppercase text-[11px] mb-1">1. Lesson Summary</h4>
                      <p className="leading-relaxed font-medium text-slate-700">{aiNote.summary}</p>
                    </div>

                    <div>
                      <h4 className="font-bold text-[#002147] uppercase text-[11px] mb-1">2. Key Concepts</h4>
                      <ul className="list-disc list-inside space-y-1 text-slate-600 font-medium">
                        {aiNote.keyConcepts.map((kc, idx) => <li key={idx}>{kc}</li>)}
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-bold text-[#002147] uppercase text-[11px] mb-1">3. Revision Flashcards</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {aiNote.flashcards.map((fc, idx) => (
                          <div key={idx} className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1">
                            <span className="font-bold text-amber-900 block">Q: {fc.question}</span>
                            <span className="text-amber-800 block">A: {fc.answer}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 8: RECORDINGS & NOTES */}
          {activeTab === 'recording' && (
            <div className="space-y-6">
              {isTeacher ? (
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                  <h4 className="text-xs font-bold text-[#002147] uppercase tracking-wider flex items-center gap-2">
                    <Film className="w-4 h-4 text-emerald-600" /> Class Recording Link & Replay Permissions
                  </h4>

                  <div className="space-y-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">Google Meet Recording URL</label>
                      <input
                        type="url"
                        placeholder="https://drive.google.com/file/d/..."
                        value={recordingUrl}
                        onChange={e => setRecordingUrl(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium"
                      />
                    </div>

                    <div className="flex items-center gap-4 text-xs font-bold text-slate-700">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={allowStudentReplay}
                          onChange={e => setAllowStudentReplay(e.target.checked)}
                          className="w-4 h-4 text-[#002147] rounded"
                        />
                        Allow Student Replay
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={allowParentReplay}
                          onChange={e => setAllowParentReplay(e.target.checked)}
                          className="w-4 h-4 text-[#002147] rounded"
                        />
                        Allow Parent Replay
                      </label>
                    </div>

                    <button
                      onClick={handleSaveRecordingInfo}
                      className="px-5 py-2.5 bg-[#002147] text-white font-bold text-xs rounded-xl hover:bg-[#001833] transition"
                    >
                      Save Recording Policy
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-6 bg-white border border-slate-200 rounded-3xl space-y-3">
                  <h4 className="text-sm font-bold text-[#002147]">Class Lecture Recording</h4>
                  {recordingUrl ? (
                    <a
                      href={recordingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white font-bold text-xs rounded-xl hover:bg-emerald-500 transition shadow"
                    >
                      <Film className="w-4 h-4" /> Watch Class Replay Video
                    </a>
                  ) : (
                    <p className="text-xs text-slate-500">Recording url not published yet for this session.</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 9: ATTENDANCE LOG */}
          {activeTab === 'attendance' && (
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Live Attendance Logs ({attendanceLogs.length})
              </h4>

              <div className="space-y-2">
                {attendanceLogs.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400">No student attendance logged yet for this room.</div>
                ) : (
                  attendanceLogs.map((log, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-[#002147] block">{log.studentName}</span>
                        <span className="text-[10px] text-slate-500">Joined at {log.joinTime}</span>
                      </div>
                      <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 font-bold text-[10px] rounded-md">
                        {log.status || 'Present'}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
