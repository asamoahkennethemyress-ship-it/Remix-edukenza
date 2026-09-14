import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  Send, 
  User, 
  Search, 
  Plus, 
  Clock, 
  RefreshCw 
} from 'lucide-react';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  onSnapshot,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../../firebase/config';

export interface StudentMessagesProps {
  currentUser: any;
  studentRecord: any;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const StudentMessages: React.FC<StudentMessagesProps> = ({
  currentUser,
  studentRecord,
  showToast
}) => {
  const schoolId = currentUser?.schoolId || studentRecord?.schoolId || '';

  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // New Message Form
  const [showNewMsgModal, setShowNewMsgModal] = useState(false);
  const [recipientRole, setRecipientRole] = useState<'teacher' | 'school_admin'>('teacher');
  const [subject, setSubject] = useState('');
  const [messageBody, setMessageBody] = useState('');

  useEffect(() => {
    if (!schoolId) return;
    setLoading(true);

    const q = query(
      collection(db, 'messages'),
      where('schoolId', '==', schoolId)
    );

    const unsub = onSnapshot(q, (snap) => {
      const list: any[] = [];
      snap.forEach(d => {
        const data = d.data();
        const matchesUser = data.senderUid === currentUser.uid || data.recipientUid === currentUser.uid || data.studentId === currentUser.studentId || data.studentUid === currentUser.uid || data.email === currentUser.email;
        if (matchesUser) {
          list.push({ id: d.id, ...data });
        }
      });
      list.sort((a, b) => (b.createdAt?.toMillis?.() || b.createdAt || 0) - (a.createdAt?.toMillis?.() || a.createdAt || 0));
      setMessages(list);
      setLoading(false);
    }, (err) => {
      console.error("Real-time messages subscription error:", err);
      setLoading(false);
    });

    return () => unsub();
  }, [schoolId, currentUser.uid, currentUser.studentId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageBody.trim()) return;

    setSending(true);
    try {
      const payload = {
        schoolId,
        senderUid: currentUser.uid,
        senderName: currentUser.fullName || currentUser.name,
        senderRole: 'student',
        recipientRole,
        subject,
        message: messageBody,
        createdAt: serverTimestamp(),
        read: false
      };

      await addDoc(collection(db, 'messages'), payload);
      showToast("Message sent successfully!", "success");

      setShowNewMsgModal(false);
      setSubject('');
      setMessageBody('');
    } catch (err) {
      console.error("Error sending message:", err);
      showToast("Failed to send message", "error");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER BANNER */}
      <div className="bg-gradient-to-r from-[#002147] via-[#0b3c5d] to-[#1d2731] p-6 rounded-3xl text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border border-[#D4AF37]/30">
        <div>
          <div className="flex items-center gap-2">
            <MessageSquare className="w-8 h-8 text-[#D4AF37]" />
            <h1 className="text-2xl font-black tracking-tight">Direct Communications</h1>
          </div>
          <p className="text-slate-300 text-xs mt-1">
            Send inquiries and message your subject teachers or School Administration.
          </p>
        </div>

        <button
          onClick={() => setShowNewMsgModal(true)}
          className="px-4 py-2.5 bg-[#D4AF37] hover:bg-amber-400 text-[#002147] font-black text-xs rounded-xl transition flex items-center gap-2 cursor-pointer shadow-md shrink-0"
        >
          <Plus className="w-4 h-4" /> Compose Message
        </button>
      </div>

      {/* MESSAGES CONVERSATION LIST */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <h2 className="text-base font-black text-[#002147]">Message Threads</h2>
          <button onClick={() => showToast("Syncing message threads...", "info")} className="text-slate-400 hover:text-slate-600">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {messages.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            No direct messages sent or received yet. Click "Compose Message" to start a thread.
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map(msg => (
              <div key={msg.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-[#002147]">{msg.subject || 'Inquiry / Question'}</span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    To: {msg.recipientRole === 'teacher' ? 'Assigned Educator' : 'Administration'}
                  </span>
                </div>
                <p className="text-slate-700 bg-white p-3 rounded-xl border border-slate-200">{msg.message}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* NEW MESSAGE MODAL */}
      {showNewMsgModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-black text-[#002147]">Compose New Message</h3>

            <form onSubmit={handleSendMessage} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Recipient Department</label>
                <select
                  value={recipientRole}
                  onChange={e => setRecipientRole(e.target.value as any)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold"
                >
                  <option value="teacher">Assigned Subject Educator</option>
                  <option value="school_admin">School Administration Office</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Subject Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Question regarding Science Homework"
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Message Content</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Type your message inquiry here..."
                  value={messageBody}
                  onChange={e => setMessageBody(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowNewMsgModal(false)}
                  className="px-4 py-2 bg-slate-100 font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sending}
                  className="px-5 py-2 bg-[#002147] text-white font-bold rounded-xl shadow-md cursor-pointer disabled:opacity-50"
                >
                  {sending ? 'Sending...' : 'Send Message'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
