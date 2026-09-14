import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  Megaphone, 
  Send, 
  Search, 
  User, 
  Clock, 
  Plus, 
  X, 
  RefreshCw 
} from 'lucide-react';
import { 
  collection, 
  getDocs, 
  addDoc, 
  query, 
  where, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../../firebase/config';

export interface TeacherCommunicationProps {
  schoolId: string;
  assignedClasses: any[];
  currentUser: any;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export interface TeacherMessageDoc {
  id?: string;
  schoolId: string;
  senderId: string;
  senderName: string;
  recipientRole: 'School Admin' | 'Parents' | 'Class Announcement';
  targetClass?: string;
  subject: string;
  message: string;
  createdAt?: any;
}

export const TeacherCommunication: React.FC<TeacherCommunicationProps> = ({
  schoolId,
  assignedClasses,
  currentUser,
  showToast
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'announcements' | 'messages'>('announcements');
  const [messages, setMessages] = useState<TeacherMessageDoc[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  // New Message Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState<{
    recipientRole: 'School Admin' | 'Parents' | 'Class Announcement';
    targetClass: string;
    subject: string;
    message: string;
  }>({
    recipientRole: 'School Admin',
    targetClass: assignedClasses[0]?.name || assignedClasses[0]?.className || assignedClasses[0] || '',
    subject: '',
    message: ''
  });

  // Fetch Messages & Announcements
  const fetchCommunicationData = async () => {
    if (!schoolId) return;
    setLoading(true);
    try {
      // 1. Fetch Teacher Messages
      const msgQ = query(
        collection(db, 'teacherMessages'),
        where('schoolId', '==', schoolId)
      );
      const msgSnap = await getDocs(msgQ);
      const msgList: TeacherMessageDoc[] = [];
      msgSnap.forEach(d => msgList.push({ id: d.id, ...d.data() } as TeacherMessageDoc));
      msgList.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
      setMessages(msgList);

      // 2. Fetch School Announcements
      const annQ = query(
        collection(db, 'announcements'),
        where('schoolId', '==', schoolId)
      );
      const annSnap = await getDocs(annQ);
      const annList: any[] = [];
      annSnap.forEach(d => annList.push({ id: d.id, ...d.data() }));
      setAnnouncements(annList);
    } catch (err) {
      console.error("Error fetching communication data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCommunicationData();
  }, [schoolId]);

  // Send Message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.subject || !form.message) {
      showToast("Please fill in subject and message", "error");
      return;
    }

    setSending(true);
    try {
      const payload: TeacherMessageDoc = {
        schoolId,
        senderId: currentUser?.uid || '',
        senderName: currentUser?.fullName || currentUser?.name || 'Teacher',
        recipientRole: form.recipientRole,
        targetClass: form.targetClass,
        subject: form.subject,
        message: form.message,
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'teacherMessages'), payload);
      showToast("Message sent successfully!", "success");

      setIsModalOpen(false);
      setForm({
        recipientRole: 'School Admin',
        targetClass: assignedClasses[0]?.name || assignedClasses[0]?.className || assignedClasses[0] || '',
        subject: '',
        message: ''
      });
      fetchCommunicationData();
    } catch (err) {
      console.error("Send message error:", err);
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
            <h1 className="text-2xl font-black tracking-tight">Communication Center</h1>
          </div>
          <p className="text-slate-300 text-xs mt-1">
            View school broadcast announcements and send messages to School Admin and Parents.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSubTab('announcements')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'announcements' ? 'bg-[#D4AF37] text-[#002147]' : 'bg-white/10 text-white'
            }`}
          >
            <Megaphone className="w-4 h-4" />
            <span>School Broadcasts</span>
          </button>
          <button
            onClick={() => setActiveSubTab('messages')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'messages' ? 'bg-[#D4AF37] text-[#002147]' : 'bg-white/10 text-white'
            }`}
          >
            <Send className="w-4 h-4" />
            <span>Outbox & Messages</span>
          </button>
        </div>
      </div>

      {/* ANNOUNCEMENTS TAB */}
      {activeSubTab === 'announcements' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-base font-black text-[#002147]">School Broadcast Announcements</h2>
            <button
              onClick={fetchCommunicationData}
              className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl transition text-slate-600"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {announcements.length === 0 ? (
              <div className="col-span-full p-12 text-center bg-white rounded-3xl border border-slate-200 text-slate-400 text-xs">
                No active school announcements broadcasted at this time.
              </div>
            ) : (
              announcements.map((ann, i) => (
                <div key={ann.id || i} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="px-2.5 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 rounded-full font-black text-[10px] uppercase">
                      {ann.priority || 'School Notice'}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {ann.publishDate || 'Recent'}
                    </span>
                  </div>
                  <h3 className="text-sm font-black text-[#002147]">{ann.title}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">{ann.message || ann.content}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* MESSAGES TAB */}
      {activeSubTab === 'messages' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-base font-black text-[#002147]">Sent & Received Messages</h2>
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2 bg-[#002147] text-white font-bold text-xs rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4 text-[#D4AF37]" />
              <span>Compose Message</span>
            </button>
          </div>

          <div className="space-y-3">
            {messages.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 text-slate-400 text-xs">
                No sent messages. Click "Compose Message" to contact Admin or Parents.
              </div>
            ) : (
              messages.map(m => (
                <div key={m.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 bg-blue-50 text-[#002147] border border-blue-200 rounded-lg text-[10px] font-black">
                        To: {m.recipientRole} {m.targetClass ? `(${m.targetClass})` : ''}
                      </span>
                      <span className="text-xs font-bold text-[#002147]">{m.subject}</span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 pl-1">{m.message}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* COMPOSE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-[#002147] flex items-center gap-2">
                <Send className="w-5 h-5 text-[#D4AF37]" />
                Compose New Message
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 hover:bg-slate-100 rounded-full text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSendMessage} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Recipient *</label>
                <select
                  value={form.recipientRole}
                  onChange={e => setForm({ ...form, recipientRole: e.target.value as any })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                >
                  <option value="School Admin">School Admin / Principal</option>
                  <option value="Parents">Class Parents</option>
                  <option value="Class Announcement">Class Broadcast Notice</option>
                </select>
              </div>

              {form.recipientRole !== 'School Admin' && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Select Class</label>
                  <select
                    value={form.targetClass}
                    onChange={e => setForm({ ...form, targetClass: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                  >
                    {assignedClasses.map((c, i) => (
                      <option key={i} value={c.name || c.className || c}>
                        {c.name || c.className || c}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">Subject *</label>
                <input
                  type="text"
                  required
                  placeholder="Subject of message..."
                  value={form.subject}
                  onChange={e => setForm({ ...form, subject: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Message Content *</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Write your message here..."
                  value={form.message}
                  onChange={e => setForm({ ...form, message: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sending}
                  className="px-5 py-2 bg-[#002147] text-white font-bold rounded-xl cursor-pointer shadow-md"
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
