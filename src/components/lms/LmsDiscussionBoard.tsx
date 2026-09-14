import React, { useState } from 'react';
import { 
  MessageSquare, 
  Send, 
  Heart, 
  Pin, 
  Lock, 
  User, 
  Search, 
  Check, 
  Plus, 
  Paperclip,
  Trash2,
  ShieldCheck
} from 'lucide-react';
import { LmsDiscussion, LmsReply } from '../../types/lms';
import { LmsService } from '../../services/lmsService';

interface LmsDiscussionBoardProps {
  courseId: string;
  discussions: LmsDiscussion[];
  currentUserId: string;
  currentUserName: string;
  currentUserRole: 'school_admin' | 'teacher' | 'student' | 'parent';
  schoolId?: string;
  onRefresh: () => void;
  showToast?: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const LmsDiscussionBoard: React.FC<LmsDiscussionBoardProps> = ({
  courseId,
  discussions,
  currentUserId,
  currentUserName,
  currentUserRole,
  schoolId = '',
  onRefresh,
  showToast
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewThreadModal, setShowNewThreadModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [activeReplyThreadId, setActiveReplyThreadId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  const filtered = discussions.filter(d => 
    d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateThread = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;

    await LmsService.createDiscussion({
      courseId,
      schoolId: schoolId || '',
      title: newTitle,
      content: newContent,
      authorId: currentUserId,
      authorName: currentUserName,
      authorRole: currentUserRole === 'parent' ? 'student' : currentUserRole,
      isPinned: false,
      isLocked: false
    });

    setNewTitle('');
    setNewContent('');
    setShowNewThreadModal(false);
    onRefresh();
    showToast?.('Discussion thread published!', 'success');
  };

  const handleSendReply = async (discussionId: string) => {
    if (!replyText.trim()) return;

    await LmsService.addReply(discussionId, {
      content: replyText,
      authorId: currentUserId,
      authorName: currentUserName,
      authorRole: currentUserRole === 'parent' ? 'student' : currentUserRole
    });

    setReplyText('');
    setActiveReplyThreadId(null);
    onRefresh();
    showToast?.('Reply posted!', 'success');
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search discussions..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500 font-medium"
          />
        </div>

        <button
          onClick={() => setShowNewThreadModal(true)}
          className="w-full sm:w-auto px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4" /> Start Discussion
        </button>
      </div>

      {/* Threads List */}
      <div className="space-y-4">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-slate-200">
            <MessageSquare className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-slate-700">No discussions yet</h4>
            <p className="text-xs text-slate-500 mt-1">Be the first to start a discussion thread for this course.</p>
          </div>
        ) : (
          filtered.map(disc => (
            <div key={disc.id} className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
              {/* Thread Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-sm uppercase">
                    {disc.authorName.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900">{disc.authorName}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        disc.authorRole === 'teacher' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {disc.authorRole}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {new Date(disc.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                {disc.isPinned && (
                  <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold">
                    <Pin className="w-3 h-3 fill-amber-500" /> Pinned
                  </span>
                )}
              </div>

              {/* Title & Body */}
              <div>
                <h3 className="text-base font-bold text-slate-900">{disc.title}</h3>
                <p className="text-slate-600 text-xs mt-2 leading-relaxed">{disc.content}</p>
              </div>

              {/* Replies Counter & Action Bar */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
                <div className="flex items-center gap-4 text-slate-500">
                  <span className="flex items-center gap-1 font-medium">
                    <MessageSquare className="w-3.5 h-3.5 text-indigo-500" /> {disc.replies.length} Replies
                  </span>
                </div>

                <button
                  onClick={() => setActiveReplyThreadId(activeReplyThreadId === disc.id ? null : disc.id)}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs transition-colors"
                >
                  Reply
                </button>
              </div>

              {/* Thread Replies */}
              {disc.replies.length > 0 && (
                <div className="pl-6 space-y-3 pt-3 border-l-2 border-indigo-100">
                  {disc.replies.map(rep => (
                    <div key={rep.id} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">{rep.authorName}</span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(rep.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-slate-700 leading-relaxed">{rep.content}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Active Reply Input Box */}
              {activeReplyThreadId === disc.id && (
                <div className="pt-2 flex gap-2">
                  <input
                    type="text"
                    placeholder="Write a reply..."
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    className="flex-1 px-4 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    onClick={() => handleSendReply(disc.id)}
                    className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-colors"
                  >
                    Send
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* New Thread Modal */}
      {showNewThreadModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900">Start Course Discussion</h3>
            <form onSubmit={handleCreateThread} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase">Topic Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Question on Lesson 2 homework..."
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  className="w-full mt-1 p-3 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 uppercase">Discussion Details</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Write your discussion details or question..."
                  value={newContent}
                  onChange={e => setNewContent(e.target.value)}
                  className="w-full mt-1 p-3 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewThreadModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 shadow-md"
                >
                  Publish Thread
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
