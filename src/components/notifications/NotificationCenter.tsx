import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  Search, 
  Filter, 
  CheckCheck, 
  Trash2, 
  Check, 
  AlertTriangle, 
  FileText, 
  CreditCard, 
  Calendar, 
  GraduationCap, 
  Megaphone, 
  ShieldAlert, 
  Clock, 
  RefreshCw, 
  Settings, 
  Send, 
  Inbox,
  Plus,
  X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { 
  subscribeToUserNotifications, 
  markNotificationAsRead, 
  markAllNotificationsAsRead, 
  deleteNotification,
  sendNotification 
} from '../../services/notificationService';
import { NotificationItem, NotificationType, NotificationPriority } from '../../types/notifications';
import { NotificationSettingsModal } from './NotificationSettingsModal';

interface NotificationCenterProps {
  onBack?: () => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ onBack }) => {
  const { currentUser, showToast } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'UNREAD' | 'READ'>('ALL');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 10;
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);

  // Send Notification Form State for Admins/Teachers
  const [sendTitle, setSendTitle] = useState('');
  const [sendMessage, setSendMessage] = useState('');
  const [sendType, setSendType] = useState<NotificationType>('Announcement');
  const [sendPriority, setSendPriority] = useState<NotificationPriority>('Normal');
  const [sendRecipientRole, setSendRecipientRole] = useState<'all' | 'teacher' | 'student' | 'parent'>('all');
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterType, filterStatus]);

  useEffect(() => {
    if (!currentUser?.uid) return;

    const userRole = currentUser.role || 'student';
    const schoolId = currentUser.schoolId || '';

    const unsubscribe = subscribeToUserNotifications(
      currentUser.uid,
      userRole,
      schoolId,
      (fetched) => {
        setNotifications(fetched);
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  const canBroadcast = (currentUser?.role as string) === 'platform_owner' || (currentUser?.role as string) === 'owner' || currentUser?.role === 'school_admin' || currentUser?.role === 'teacher';

  const filteredNotifications = notifications.filter(item => {
    // Search query
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.message.toLowerCase().includes(searchQuery.toLowerCase());

    // Type filter
    const matchesType = filterType === 'ALL' || item.type === filterType;

    // Read status filter
    const matchesStatus = filterStatus === 'ALL' || 
                          (filterStatus === 'UNREAD' && !item.isRead) || 
                          (filterStatus === 'READ' && item.isRead);

    return matchesSearch && matchesType && matchesStatus;
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleMarkAsRead = async (id: string) => {
    try {
      await markNotificationAsRead(id);
    } catch (err) {
      showToast('Error marking notification as read', 'error');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsAsRead(notifications);
      showToast('All notifications marked as read', 'info');
    } catch (err) {
      showToast('Failed to mark all as read', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteNotification(id);
      showToast('Notification deleted', 'info');
    } catch (err) {
      showToast('Error deleting notification', 'error');
    }
  };

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sendTitle.trim() || !sendMessage.trim()) {
      showToast('Please fill in both title and message body', 'error');
      return;
    }

    setIsSending(true);
    try {
      await sendNotification({
        recipientId: sendRecipientRole === 'all' ? 'ALL' : `ROLE:${sendRecipientRole}`,
        recipientRole: sendRecipientRole,
        schoolId: currentUser?.schoolId || '',
        title: sendTitle,
        message: sendMessage,
        type: sendType,
        priority: sendPriority,
        createdBy: currentUser?.fullName || currentUser?.email || 'Authorized User'
      });

      showToast('Notification published successfully', 'info');
      setIsSendModalOpen(false);
      setSendTitle('');
      setSendMessage('');
    } catch (err) {
      showToast('Failed to broadcast notification', 'error');
    } finally {
      setIsSending(false);
    }
  };

  const getTypeIcon = (type: NotificationType) => {
    switch (type) {
      case 'Announcement':
        return <Megaphone className="w-5 h-5 text-amber-500" />;
      case 'Assignment':
        return <FileText className="w-5 h-5 text-blue-500" />;
      case 'Attendance':
        return <Clock className="w-5 h-5 text-emerald-500" />;
      case 'Payment':
        return <CreditCard className="w-5 h-5 text-indigo-500" />;
      case 'Results':
        return <GraduationCap className="w-5 h-5 text-purple-500" />;
      case 'Timetable':
        return <Calendar className="w-5 h-5 text-cyan-500" />;
      case 'System Alert':
        return <AlertTriangle className="w-5 h-5 text-orange-500" />;
      case 'Security Alert':
        return <ShieldAlert className="w-5 h-5 text-red-500" />;
      default:
        return <Bell className="w-5 h-5 text-slate-400" />;
    }
  };

  const getPriorityBadge = (priority: NotificationPriority) => {
    switch (priority) {
      case 'Urgent':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30">URGENT</span>;
      case 'High':
      case 'Important':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">HIGH</span>;
      case 'Normal':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30">NORMAL</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-800 text-slate-400">LOW</span>;
    }
  };

  const totalPages = Math.ceil(filteredNotifications.length / pageSize) || 1;
  const paginatedNotifications = filteredNotifications.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/30 text-amber-400">
            <Bell className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
              Notification Center
              {unreadCount > 0 && (
                <span className="text-xs px-2.5 py-1 rounded-full bg-red-600 text-white font-bold">
                  {unreadCount} Unread
                </span>
              )}
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Centralized communications, announcements, academic alerts, and system notifications.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {canBroadcast && (
            <button
              type="button"
              onClick={() => setIsSendModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs sm:text-sm transition flex items-center gap-2 shadow-lg shadow-amber-500/10"
            >
              <Send className="w-4 h-4" />
              <span>Broadcast Alert</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs sm:text-sm font-medium transition flex items-center gap-2 border border-slate-700"
          >
            <Settings className="w-4 h-4 text-slate-400" />
            <span>Preferences</span>
          </button>

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs sm:text-sm font-medium transition flex items-center gap-2 border border-slate-700"
            >
              <CheckCheck className="w-4 h-4" />
              <span>Mark All Read</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
        {/* Search */}
        <div className="sm:col-span-6 relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search notifications..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        {/* Filter Type */}
        <div className="sm:col-span-3">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-slate-300 focus:outline-none focus:border-amber-500"
          >
            <option value="ALL">All Categories</option>
            <option value="Announcement">Announcements</option>
            <option value="Assignment">Assignments</option>
            <option value="Attendance">Attendance</option>
            <option value="Payment">Payments</option>
            <option value="Results">Academic Results</option>
            <option value="Timetable">Timetables</option>
            <option value="System Alert">System Alerts</option>
            <option value="Security Alert">Security Alerts</option>
          </select>
        </div>

        {/* Filter Read Status */}
        <div className="sm:col-span-3">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-slate-300 focus:outline-none focus:border-amber-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="UNREAD">Unread Only</option>
            <option value="READ">Read Only</option>
          </select>
        </div>
      </div>

      {/* Notifications History List */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
        {filteredNotifications.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-slate-800/60 flex items-center justify-center text-slate-500 mb-4">
              <Inbox className="w-8 h-8" />
            </div>
            <h3 className="text-base font-semibold text-white">No notifications found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              There are no notifications matching your current search or filter criteria.
            </p>
          </div>
        ) : (
          <div>
            <div className="divide-y divide-slate-800">
              {paginatedNotifications.map((item) => (
                <div
                  key={item.notificationId}
                  className={`p-4 sm:p-5 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-800/50 ${
                    !item.isRead ? 'bg-amber-500/5 border-l-4 border-l-amber-500' : 'opacity-90'
                  }`}
                >
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <div className="p-3 rounded-2xl bg-slate-800 border border-slate-700/60 shrink-0">
                      {getTypeIcon(item.type)}
                    </div>

                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                          {item.type}
                        </span>
                        {getPriorityBadge(item.priority)}
                        <span className="text-xs text-slate-500">
                          • {new Date(item.createdAt).toLocaleString()}
                        </span>
                        {item.createdBy && (
                          <span className="text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                            From: {item.createdBy}
                          </span>
                        )}
                      </div>

                      <h3 className={`text-sm sm:text-base font-semibold ${!item.isRead ? 'text-white' : 'text-slate-300'}`}>
                        {item.title}
                      </h3>

                      <p className="text-xs sm:text-sm text-slate-400 leading-relaxed whitespace-pre-line">
                        {item.message}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    {!item.isRead && (
                      <button
                        type="button"
                        onClick={() => handleMarkAsRead(item.notificationId)}
                        className="p-2 text-xs text-amber-400 hover:bg-amber-500/10 rounded-xl transition flex items-center gap-1 font-medium border border-amber-500/20"
                        title="Mark as read"
                      >
                        <Check className="w-4 h-4" />
                        <span className="hidden md:inline">Mark Read</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDelete(item.notificationId)}
                      className="p-2 text-xs text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition border border-slate-800"
                      title="Delete notification"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Controls Bar */}
            {totalPages > 1 && (
              <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-slate-400">
                <div>
                  Showing <span className="text-white font-bold">{(currentPage - 1) * pageSize + 1}</span> to{' '}
                  <span className="text-white font-bold">{Math.min(currentPage * pageSize, filteredNotifications.length)}</span> of{' '}
                  <span className="text-white font-bold">{filteredNotifications.length}</span> notifications
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-700 text-white disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    Previous
                  </button>

                  <span className="px-3 py-1 font-mono font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                    Page {currentPage} of {totalPages}
                  </span>

                  <button
                    type="button"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-700 text-white disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Broadcast Modal */}
      {isSendModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                  <Send className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-white">Broadcast System Alert</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsSendModalOpen(false)}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSendBroadcast} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Target Audience</label>
                <select
                  value={sendRecipientRole}
                  onChange={(e) => setSendRecipientRole(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="all">Everyone in School</option>
                  <option value="teacher">Teachers Only</option>
                  <option value="student">Students Only</option>
                  <option value="parent">Parents Only</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Type</label>
                  <select
                    value={sendType}
                    onChange={(e) => setSendType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="Announcement">Announcement</option>
                    <option value="Assignment">Assignment</option>
                    <option value="Attendance">Attendance</option>
                    <option value="Timetable">Timetable</option>
                    <option value="Results">Results</option>
                    <option value="System Alert">System Alert</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Priority</label>
                  <select
                    value={sendPriority}
                    onChange={(e) => setSendPriority(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="Low">Low</option>
                    <option value="Normal">Normal</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Headline / Title</label>
                <input
                  type="text"
                  placeholder="e.g., Parent-Teacher Meeting Scheduled"
                  value={sendTitle}
                  onChange={(e) => setSendTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Message Body</label>
                <textarea
                  rows={4}
                  placeholder="Write full announcement details..."
                  value={sendMessage}
                  onChange={(e) => setSendMessage(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-amber-500 resize-none"
                  required
                />
              </div>

              <div className="pt-3 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsSendModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSending}
                  className="px-5 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl shadow-lg transition flex items-center gap-2"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSending ? 'Publishing...' : 'Publish Notification'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {isSettingsOpen && (
        <NotificationSettingsModal onClose={() => setIsSettingsOpen(false)} />
      )}
    </div>
  );
};
