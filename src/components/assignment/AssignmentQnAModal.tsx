import React, { useState, useEffect } from 'react';
import { X, Send, MessageSquare, User, Lock, RefreshCw, CheckCircle2 } from 'lucide-react';
import { collection, addDoc, query, where, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';

interface AssignmentQnAModalProps {
  isOpen: boolean;
  onClose: () => void;
  assignment: any;
  schoolId?: string;
  currentUser: any;
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const AssignmentQnAModal: React.FC<AssignmentQnAModalProps> = ({
  isOpen,
  onClose,
  assignment,
  schoolId,
  currentUser,
  showToast
}) => {
  const actualSchoolId = schoolId || currentUser?.schoolId || assignment?.schoolId || '';
  const toast = showToast || ((_msg: string) => {});
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isPrivateNote, setIsPrivateNote] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!isOpen || !assignment?.id || !actualSchoolId) return;

    const q = query(
      collection(db, 'assignmentComments'),
      where('schoolId', '==', actualSchoolId),
      where('assignmentId', '==', assignment.id)
    );

    const unsub = onSnapshot(q, (snap) => {
      const list: any[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() }));
      list.sort((a, b) => (a.createdAt?.toMillis?.() || 0) - (b.createdAt?.toMillis?.() || 0));
      setComments(list);
    }, (err) => {
      console.warn("Real-time Q&A listener error:", err);
    });

    return () => unsub();
  }, [isOpen, assignment?.id, schoolId]);

  if (!isOpen || !assignment) return null;

  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setSending(true);
    try {
      const payload = {
        schoolId: actualSchoolId,
        assignmentId: assignment.id,
        assignmentTitle: assignment.title,
        senderUid: currentUser?.uid || 'user',
        senderName: currentUser?.fullName || currentUser?.name || 'User',
        senderRole: currentUser?.role || 'teacher',
        text: newComment.trim(),
        isPrivateNote: currentUser?.role === 'teacher' ? isPrivateNote : false,
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'assignmentComments'), payload);
      setNewComment('');
      toast("Comment added!", "success");
    } catch (err) {
      console.error("Error sending comment:", err);
      toast("Failed to post comment", "error");
    } finally {
      setSending(false);
    }
  };

  const isTeacher = currentUser?.role === 'teacher' || currentUser?.role === 'school_admin';

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
        {/* HEADER */}
        <div className="bg-gradient-to-r from-[#002147] to-[#0b3c5d] px-6 py-4 text-white flex justify-between items-center border-b border-[#D4AF37]/30">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-[#D4AF37]" />
            <div>
              <h2 className="text-base font-bold">{assignment.title}</h2>
              <p className="text-[11px] text-slate-300">Live Q&A Discussion Thread & Notes</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* COMMENTS LIST */}
        <div className="p-6 overflow-y-auto flex-1 space-y-3 bg-slate-50">
          {comments.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              No questions or notes posted yet. Be the first to start the discussion!
            </div>
          ) : (
            comments.map((c) => {
              if (c.isPrivateNote && !isTeacher) return null; // Hide private teacher notes from students

              const isMe = c.senderUid === currentUser?.uid;
              return (
                <div
                  key={c.id}
                  className={`p-3.5 rounded-2xl border max-w-[85%] ${
                    c.isPrivateNote ? 'bg-amber-50 border-amber-300 ml-auto' :
                    isMe ? 'bg-[#002147] text-white border-[#002147] ml-auto' :
                    'bg-white text-slate-800 border-slate-200 mr-auto'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] opacity-80 mb-1 gap-2">
                    <span className="font-bold flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {c.senderName} ({c.senderRole})
                    </span>
                    {c.isPrivateNote && (
                      <span className="bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded flex items-center gap-0.5 font-bold">
                        <Lock className="w-2.5 h-2.5" /> Private Note
                      </span>
                    )}
                  </div>
                  <p className="text-xs whitespace-pre-wrap font-medium">{c.text}</p>
                </div>
              );
            })
          )}
        </div>

        {/* INPUT FORM */}
        <form onSubmit={handleSendComment} className="p-4 bg-white border-t border-slate-200 space-y-2">
          {isTeacher && (
            <label className="flex items-center gap-2 text-xs font-bold text-amber-800 cursor-pointer">
              <input
                type="checkbox"
                checked={isPrivateNote}
                onChange={(e) => setIsPrivateNote(e.target.checked)}
                className="rounded text-amber-600 focus:ring-amber-500"
              />
              <Lock className="w-3.5 h-3.5 text-amber-600" />
              <span>Post as Private Teacher Note (Hidden from Students)</span>
            </label>
          )}

          <div className="flex gap-2">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder={isPrivateNote ? "Type private teacher note..." : "Ask a question or type a reply..."}
              className="flex-1 p-3 bg-slate-100 border border-slate-300 rounded-2xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#002147]"
            />
            <button
              type="submit"
              disabled={sending || !newComment.trim()}
              className="px-5 py-3 bg-[#002147] hover:bg-[#0b3c5d] disabled:opacity-40 text-white rounded-2xl text-xs font-bold shadow-md transition flex items-center gap-1.5 border border-[#D4AF37]/30"
            >
              <Send className="w-4 h-4 text-[#D4AF37]" />
              <span>Post</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
