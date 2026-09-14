import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { createNotification } from '../../services/notificationService';
import { 
  NotificationType, 
  NotificationPriority, 
  UserRole 
} from '../../types/notifications';
import { 
  Send, 
  X, 
  Megaphone, 
  Users, 
  Bell, 
  Sparkles, 
  Loader2 
} from 'lucide-react';

interface SendNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SendNotificationModal: React.FC<SendNotificationModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, showToast } = useAuth();

  const [recipientTarget, setRecipientTarget] = useState<'all' | 'school_admin' | 'teacher' | 'student' | 'parent'>('all');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState<NotificationType>('Announcement');
  const [priority, setPriority] = useState<NotificationPriority>('Normal');
  const [actionUrl, setActionUrl] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      showToast('Title and Message are required.', 'error');
      return;
    }

    setLoading(true);
    try {
      await createNotification({
        recipientId: 'ALL',
        recipientRole: recipientTarget === 'all' ? 'all' : (recipientTarget as UserRole),
        schoolId: currentUser?.schoolId || 'all',
        title: title.trim(),
        message: message.trim(),
        type,
        priority,
        actionUrl: actionUrl.trim() || undefined,
        createdBy: `${currentUser?.name || 'User'} (${currentUser?.role?.replace('_', ' ') || 'Admin'})`,
      });

      showToast('Notification broadcast successfully sent!', 'success');
      setTitle('');
      setMessage('');
      setActionUrl('');
      onClose();
    } catch (err: any) {
      showToast(`Failed to send notification: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[#D4AF37]">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white uppercase tracking-wider">
                Send Global Notification
              </h3>
              <p className="text-xs text-slate-400">Broadcast real-time alert to school members</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-slate-100">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
              Target Audience
            </label>
            <select
              value={recipientTarget}
              onChange={(e) => setRecipientTarget(e.target.value as any)}
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white focus:border-[#D4AF37] focus:outline-none"
            >
              <option value="all">Everyone in School (All Roles)</option>
              {currentUser?.role === 'platform_owner' && (
                <option value="school_admin">School Administrators Only</option>
              )}
              <option value="teacher">Teachers Only</option>
              <option value="student">Students Only</option>
              <option value="parent">Parents Only</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                Notification Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as NotificationType)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white focus:border-[#D4AF37] focus:outline-none"
              >
                <option value="Announcement">Announcement</option>
                <option value="Assignment">Assignment</option>
                <option value="Attendance">Attendance</option>
                <option value="Payment">Payment</option>
                <option value="Results">Results</option>
                <option value="Timetable">Timetable</option>
                <option value="Examination">Examination</option>
                <option value="System Alert">System Alert</option>
                <option value="Security Alert">Security Alert</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as NotificationPriority)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white focus:border-[#D4AF37] focus:outline-none"
              >
                <option value="Low">Low</option>
                <option value="Normal">Normal</option>
                <option value="High">High</option>
                <option value="Important">Important</option>
                <option value="Urgent">Urgent (Triggers Desktop Push)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. End of Term Examination Schedule Released"
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:border-[#D4AF37] focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
              Message
            </label>
            <textarea
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Provide clear details for recipients..."
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:border-[#D4AF37] focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
              Optional Action URL / Tab Route
            </label>
            <input
              type="text"
              value={actionUrl}
              onChange={(e) => setActionUrl(e.target.value)}
              placeholder="e.g. tab:assignments or https://edukenza.com/exams"
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:border-[#D4AF37] focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-lg bg-[#D4AF37] hover:bg-[#c29f2e] text-[#002147] font-black text-xs uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Send Notification
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
