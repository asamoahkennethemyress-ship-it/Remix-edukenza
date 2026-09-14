import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  Send, 
  Bell, 
  CheckCircle2, 
  AlertCircle, 
  User, 
  ShieldCheck, 
  Clock, 
  Paperclip, 
  Archive, 
  Check, 
  CheckCheck, 
  CornerUpLeft, 
  Search, 
  X, 
  RefreshCw 
} from 'lucide-react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../../firebase/config';

export interface ParentCommunicationProps {
  currentUser: any;
  linkedStudents: any[];
  selectedStudent: any | null;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const ParentCommunication: React.FC<ParentCommunicationProps> = ({
  currentUser,
  linkedStudents,
  selectedStudent,
  showToast
}) => {
  const activeStudent = selectedStudent || linkedStudents[0] || null;
  const schoolId = currentUser?.schoolId || activeStudent?.schoolId || '';

  const [activeTab, setActiveTab] = useState<'messages' | 'alerts'>('messages');
  const [recipientRole, setRecipientRole] = useState<'teacher' | 'admin'>('teacher');
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [sending, setSending] = useState(false);

  const [messagesList, setMessagesList] = useState<any[]>([]);
  const [teachersList, setTeachersList] = useState<any[]>([]);
  const [selectedThread, setSelectedThread] = useState<any | null>(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [replying, setReplying] = useState(false);

  const [filterMode, setFilterMode] = useState<'all' | 'unread' | 'archived'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // 1. Real-time listener for school teachers
  useEffect(() => {
    if (!schoolId) return;
    const qT = query(collection(db, 'teachers'), where('schoolId', '==', schoolId));
    const unsub = onSnapshot(qT, (snap) => {
      const list: any[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() }));
      setTeachersList(list);
    }, err => console.warn('Teachers error:', err));
    return () => unsub();
  }, [schoolId]);

  // 2. Real-time listener for parent messages
  useEffect(() => {
    if (!schoolId || !currentUser?.uid) return;

    const qMsg = query(
      collection(db, 'messages'),
      where('schoolId', '==', schoolId)
    );

    const unsub = onSnapshot(qMsg, (snap) => {
      const list: any[] = [];
      snap.forEach(d => {
        const data = d.data();
        if (
          data.senderUid === currentUser.uid ||
          data.parentUid === currentUser.uid ||
          data.recipientUid === currentUser.uid ||
          data.parentEmail === currentUser.email
        ) {
          list.push({ id: d.id, ...data });
        }
      });
      list.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
      setMessagesList(list);
    }, err => console.warn('Messages listener error:', err));

    return () => unsub();
  }, [schoolId, currentUser?.uid, currentUser?.email]);

  // Handle Send New Message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      showToast('Please enter a subject and message content.', 'error');
      return;
    }

    setSending(true);
    try {
      const chosenTeacher = teachersList.find(t => t.id === selectedTeacherId);

      await addDoc(collection(db, 'messages'), {
        schoolId,
        parentUid: currentUser?.uid || '',
        parentEmail: currentUser?.email || '',
        parentName: currentUser?.fullName || currentUser?.name || 'Parent',
        studentId: activeStudent?.studentId || activeStudent?.id || '',
        studentName: activeStudent?.fullName || activeStudent?.name || '',
        recipientRole,
        recipientId: selectedTeacherId || '',
        recipientName: recipientRole === 'teacher' 
          ? (chosenTeacher?.fullName || chosenTeacher?.name || activeStudent?.classTeacher || 'Class Educator')
          : 'School Administration',
        subject,
        message,
        attachmentUrl: attachmentUrl || null,
        createdAt: serverTimestamp(),
        read: false,
        status: 'Delivered',
        isArchived: false,
        replies: []
      });

      showToast(`Message delivered to ${recipientRole === 'teacher' ? 'Class Educator' : 'School Administration'}!`, 'success');
      setSubject('');
      setMessage('');
      setAttachmentUrl('');
      setSelectedTeacherId('');
    } catch (err) {
      console.error("Error sending message:", err);
      showToast('Failed to deliver message. Please try again.', 'error');
    } finally {
      setSending(false);
    }
  };

  // Handle Reply to Thread
  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedThread || !replyMessage.trim()) return;

    setReplying(true);
    try {
      const threadRef = doc(db, 'messages', selectedThread.id);
      const newReply = {
        senderUid: currentUser.uid,
        senderName: currentUser.fullName || currentUser.name || 'Parent',
        message: replyMessage,
        createdAt: new Date().toISOString()
      };

      const existingReplies = selectedThread.replies || [];
      await updateDoc(threadRef, {
        replies: [...existingReplies, newReply],
        updatedAt: serverTimestamp(),
        read: false
      });

      showToast('Reply posted successfully!', 'success');
      setReplyMessage('');
      setSelectedThread(prev => ({
        ...prev,
        replies: [...existingReplies, newReply]
      }));
    } catch (err) {
      console.error('Reply error:', err);
      showToast('Failed to post reply.', 'error');
    } finally {
      setReplying(false);
    }
  };

  // Toggle Archive Thread
  const handleToggleArchive = async (msg: any) => {
    try {
      const threadRef = doc(db, 'messages', msg.id);
      await updateDoc(threadRef, { isArchived: !msg.isArchived });
      showToast(msg.isArchived ? 'Conversation restored' : 'Conversation archived', 'info');
    } catch (err) {
      showToast('Action failed', 'error');
    }
  };

  // Filtered List
  const filteredMessages = messagesList.filter(m => {
    const matchSearch = (m.subject || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (m.message || '').toLowerCase().includes(searchTerm.toLowerCase());
    if (filterMode === 'archived') return matchSearch && m.isArchived;
    if (filterMode === 'unread') return matchSearch && !m.read && !m.isArchived;
    return matchSearch && !m.isArchived;
  });

  return (
    <div className="space-y-6">
      
      {/* HEADER BANNER */}
      <div className="bg-gradient-to-r from-[#002147] via-[#0b3c5d] to-[#1d2731] p-6 rounded-3xl text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border border-[#D4AF37]/30">
        <div>
          <div className="flex items-center gap-2">
            <MessageSquare className="w-8 h-8 text-[#D4AF37]" />
            <h1 className="text-2xl font-black tracking-tight">Parent-Teacher Messaging Workspace</h1>
          </div>
          <p className="text-slate-300 text-xs mt-1">
            Real-time direct communication channel with educators and administration for <span className="font-bold text-white">{activeStudent?.fullName || activeStudent?.name || 'Student'}</span>.
          </p>
        </div>

        <div className="flex bg-white/10 p-1.5 rounded-2xl border border-white/20">
          <button
            onClick={() => setActiveTab('messages')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'messages' ? 'bg-[#D4AF37] text-[#002147]' : 'text-white hover:bg-white/10'
            }`}
          >
            Messages & Threads
          </button>
          <button
            onClick={() => setActiveTab('alerts')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'alerts' ? 'bg-[#D4AF37] text-[#002147]' : 'text-white hover:bg-white/10'
            }`}
          >
            System Notices
          </button>
        </div>
      </div>

      {activeTab === 'messages' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* LEFT COL: COMPOSE NEW MESSAGE */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4 lg:col-span-1">
            <h2 className="text-sm font-black text-[#002147] uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
              <Send className="w-4 h-4 text-[#D4AF37]" />
              Start New Conversation
            </h2>

            <form onSubmit={handleSendMessage} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-[#002147] mb-1">Target Recipient Role:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRecipientRole('teacher')}
                    className={`p-2.5 rounded-2xl border font-bold text-center transition cursor-pointer ${
                      recipientRole === 'teacher' ? 'bg-[#002147] text-white border-[#D4AF37]' : 'bg-slate-50 text-slate-700'
                    }`}
                  >
                    Class Educator
                  </button>
                  <button
                    type="button"
                    onClick={() => setRecipientRole('admin')}
                    className={`p-2.5 rounded-2xl border font-bold text-center transition cursor-pointer ${
                      recipientRole === 'admin' ? 'bg-[#002147] text-white border-[#D4AF37]' : 'bg-slate-50 text-slate-700'
                    }`}
                  >
                    School Admin
                  </button>
                </div>
              </div>

              {recipientRole === 'teacher' && (
                <div>
                  <label className="block font-bold text-[#002147] mb-1">Select Teacher (Optional):</label>
                  <select
                    value={selectedTeacherId}
                    onChange={e => setSelectedTeacherId(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 outline-none"
                  >
                    <option value="">Default Class Educator ({activeStudent?.classTeacher || 'Assigned'})</option>
                    {teachersList.map((t, i) => (
                      <option key={t.id || i} value={t.id}>
                        {t.fullName || t.name} ({Array.isArray(t.subjects) ? t.subjects.join(', ') : t.subjects || 'Teacher'})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block font-bold text-[#002147] mb-1">Subject Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Absence inquiry or Mathematics term project..."
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 font-medium outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-[#002147] mb-1">Message Content *</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Type your detailed message to the educator..."
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 font-medium outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-[#002147] mb-1">Attachment (Optional URL / Link):</label>
                <input
                  type="url"
                  placeholder="https://... attachment link"
                  value={attachmentUrl}
                  onChange={e => setAttachmentUrl(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 outline-none font-mono text-[11px]"
                />
              </div>

              <button
                type="submit"
                disabled={sending}
                className="w-full py-3 bg-[#002147] hover:bg-[#003366] text-white font-black text-xs rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
              >
                <Send className="w-4 h-4 text-[#D4AF37]" />
                <span>{sending ? 'Delivering Message...' : 'Send Message'}</span>
              </button>
            </form>
          </div>

          {/* RIGHT COL: CONVERSATION THREADS LIST & DETAIL */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4 lg:col-span-2 flex flex-col justify-between">
            <div className="space-y-4">
              
              {/* THREAD FILTER BAR */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-3">
                <h2 className="text-sm font-black text-[#002147] uppercase tracking-wider flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#D4AF37]" />
                  Active Messages ({filteredMessages.length})
                </h2>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-48">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Filter threads..."
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
                    />
                  </div>

                  <div className="flex bg-slate-100 p-1 rounded-xl text-[11px] font-bold">
                    <button
                      onClick={() => setFilterMode('all')}
                      className={`px-2.5 py-1 rounded-lg ${filterMode === 'all' ? 'bg-[#002147] text-white' : 'text-slate-600'}`}
                    >
                      All
                    </button>
                    <button
                      onClick={() => setFilterMode('archived')}
                      className={`px-2.5 py-1 rounded-lg ${filterMode === 'archived' ? 'bg-[#002147] text-white' : 'text-slate-600'}`}
                    >
                      Archived
                    </button>
                  </div>
                </div>
              </div>

              {/* MESSAGES LIST */}
              {filteredMessages.length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-xs space-y-2">
                  <MessageSquare className="w-8 h-8 mx-auto text-slate-300" />
                  <p className="font-bold text-slate-600">No conversation threads found.</p>
                  <p className="text-slate-400">Use the form on the left to send your first message to a class educator.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[450px] overflow-y-auto pr-1">
                  {filteredMessages.map((msg, idx) => {
                    const isSelected = selectedThread?.id === msg.id;
                    const repliesCount = (msg.replies || []).length;

                    return (
                      <div
                        key={msg.id || idx}
                        onClick={() => setSelectedThread(msg)}
                        className={`p-4 rounded-2xl border transition cursor-pointer space-y-2 ${
                          isSelected 
                            ? 'bg-slate-900 text-white border-[#D4AF37] shadow-md' 
                            : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800'
                        }`}
                      >
                        <div className="flex justify-between items-center text-xs">
                          <span className={`font-black truncate ${isSelected ? 'text-[#D4AF37]' : 'text-[#002147]'}`}>
                            To: {msg.recipientName || 'Educator'}
                          </span>
                          <span className={`text-[10px] font-mono ${isSelected ? 'text-slate-400' : 'text-slate-400'}`}>
                            {msg.createdAt?.toDate ? msg.createdAt.toDate().toLocaleDateString() : 'Recent'}
                          </span>
                        </div>

                        <h4 className={`font-bold text-xs ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                          {msg.subject}
                        </h4>

                        <p className={`text-xs line-clamp-2 ${isSelected ? 'text-slate-300' : 'text-slate-600'}`}>
                          {msg.message}
                        </p>

                        <div className="flex justify-between items-center pt-2 border-t border-slate-200/40 text-[10px]">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <CheckCheck className="w-3 h-3 text-emerald-600" />
                              {msg.status || 'Delivered'}
                            </span>
                            {repliesCount > 0 && (
                              <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                                {repliesCount} Reply{repliesCount !== 1 ? 'ies' : ''}
                              </span>
                            )}
                          </div>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleArchive(msg);
                            }}
                            className={`hover:underline flex items-center gap-1 font-bold ${isSelected ? 'text-slate-400' : 'text-slate-500'}`}
                          >
                            <Archive className="w-3 h-3" />
                            <span>{msg.isArchived ? 'Restore' : 'Archive'}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* THREAD DETAIL & REPLY MODAL / VIEW */}
            {selectedThread && (
              <div className="mt-4 pt-4 border-t border-slate-200 space-y-3 bg-slate-50 p-4 rounded-2xl border">
                <div className="flex justify-between items-center">
                  <h3 className="font-black text-xs text-[#002147]">
                    Thread: {selectedThread.subject}
                  </h3>
                  <button
                    onClick={() => setSelectedThread(null)}
                    className="text-slate-400 hover:text-slate-600 text-xs font-bold"
                  >
                    Close Thread
                  </button>
                </div>

                {/* THREAD REPLIES */}
                {(selectedThread.replies || []).length > 0 && (
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {selectedThread.replies.map((rep: any, rIdx: number) => (
                      <div key={rIdx} className="p-3 bg-white rounded-xl border border-slate-200 text-xs space-y-1">
                        <div className="flex justify-between text-[10px] font-bold text-slate-500">
                          <span className="text-[#002147]">{rep.senderName}</span>
                          <span>{rep.createdAt?.substring(0, 10)}</span>
                        </div>
                        <p className="text-slate-700">{rep.message}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* REPLY INPUT */}
                <form onSubmit={handleSendReply} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Type a reply to this thread..."
                    value={replyMessage}
                    onChange={e => setReplyMessage(e.target.value)}
                    className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none"
                    required
                  />
                  <button
                    type="submit"
                    disabled={replying}
                    className="px-4 py-2 bg-[#002147] text-white font-bold text-xs rounded-xl cursor-pointer"
                  >
                    Reply
                  </button>
                </form>
              </div>
            )}

          </div>

        </div>
      ) : (
        /* SYSTEM ALERTS TAB */
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
          <h2 className="text-sm font-black text-[#002147] uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
            <Bell className="w-4 h-4 text-[#D4AF37]" />
            Automated Parent Broadcasts & System Notices
          </h2>

          <div className="space-y-3">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-[#002147] font-black flex items-center justify-center shrink-0">
                <Bell className="w-5 h-5 text-[#002147]" />
              </div>
              <div className="flex-1 space-y-1 text-xs">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full text-[10px] uppercase">
                    Attendance Broadcast
                  </span>
                  <span className="text-slate-400 font-mono text-[10px]">Today</span>
                </div>
                <h4 className="font-black text-[#002147]">Daily Attendance Verified</h4>
                <p className="text-slate-600">Morning register attendance for {activeStudent?.fullName || 'Student'} was recorded as Present.</p>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
