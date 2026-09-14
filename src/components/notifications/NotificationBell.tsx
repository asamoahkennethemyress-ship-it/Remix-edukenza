import React, { useState, useEffect, useRef } from 'react';
import { 
  Bell, 
  Check, 
  CheckCheck, 
  Trash2, 
  ExternalLink, 
  X, 
  Settings, 
  AlertTriangle, 
  FileText, 
  CreditCard, 
  Calendar, 
  GraduationCap, 
  Megaphone, 
  ShieldAlert, 
  Inbox,
  Clock,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { 
  subscribeToUserNotifications, 
  markNotificationAsRead, 
  markAllNotificationsAsRead, 
  deleteNotification 
} from '../../services/notificationService';
import { NotificationItem, NotificationType } from '../../types/notifications';
import { NotificationSettingsModal } from './NotificationSettingsModal';

interface NotificationBellProps {
  onOpenFullCenter?: () => void;
  onOpenCenter?: () => void;
  onOpenSendModal?: () => void;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ 
  onOpenFullCenter, 
  onOpenCenter 
}) => {
  const triggerFullCenter = onOpenFullCenter || onOpenCenter;
  const { currentUser, showToast } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleMarkAsRead = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await markNotificationAsRead(id);
    } catch (err) {
      showToast('Could not mark notification as read', 'error');
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

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await deleteNotification(id);
      showToast('Notification deleted', 'info');
    } catch (err) {
      showToast('Could not delete notification', 'error');
    }
  };

  const getTypeIcon = (type: NotificationType) => {
    switch (type) {
      case 'Announcement':
        return <Megaphone className="w-4 h-4 text-amber-500" />;
      case 'Assignment':
        return <FileText className="w-4 h-4 text-blue-500" />;
      case 'Attendance':
        return <Clock className="w-4 h-4 text-emerald-500" />;
      case 'Payment':
        return <CreditCard className="w-4 h-4 text-indigo-500" />;
      case 'Results':
        return <GraduationCap className="w-4 h-4 text-purple-500" />;
      case 'Timetable':
        return <Calendar className="w-4 h-4 text-cyan-500" />;
      case 'System Alert':
        return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      case 'Security Alert':
        return <ShieldAlert className="w-4 h-4 text-red-500" />;
      default:
        return <Bell className="w-4 h-4 text-slate-400" />;
    }
  };

  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return 'Yesterday';
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/80 transition-all focus:outline-none focus:ring-2 focus:ring-amber-500/50"
        title="Notification Center"
        aria-label="Notification Center"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white ring-2 ring-slate-900 animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl z-50 overflow-hidden backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="p-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Notifications</h3>
                <p className="text-[11px] text-slate-400">
                  {unreadCount === 0 ? 'All caught up!' : `${unreadCount} unread alert${unreadCount > 1 ? 's' : ''}`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="p-1.5 text-xs text-amber-400 hover:bg-amber-500/10 rounded-lg transition flex items-center gap-1 font-medium"
                  title="Mark all as read"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Read all</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsSettingsOpen(true)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
                title="Notification Settings"
              >
                <Settings className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* List Body */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-800/60 scrollbar-thin scrollbar-thumb-slate-700">
            {notifications.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-12 h-12 mx-auto rounded-full bg-slate-800/50 flex items-center justify-center text-slate-500 mb-3">
                  <Inbox className="w-6 h-6" />
                </div>
                <p className="text-xs font-medium text-slate-300">No notifications yet</p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Alerts, reminders, and updates will appear here.
                </p>
              </div>
            ) : (
              notifications.slice(0, 15).map((item) => (
                <div
                  key={item.notificationId}
                  className={`p-3.5 transition-colors flex items-start gap-3 hover:bg-slate-800/40 relative group ${
                    !item.isRead ? 'bg-amber-500/5 border-l-2 border-l-amber-500' : 'opacity-85'
                  }`}
                >
                  <div className="p-2 rounded-xl bg-slate-800/80 border border-slate-700/50 shrink-0 mt-0.5">
                    {getTypeIcon(item.type)}
                  </div>

                  <div className="flex-1 min-w-0 pr-12">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-400/90 bg-amber-400/10 px-2 py-0.5 rounded-full">
                        {item.type}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {formatTime(item.createdAt)}
                      </span>
                    </div>

                    <h4 className={`text-xs font-semibold leading-tight mb-1 truncate ${!item.isRead ? 'text-white' : 'text-slate-300'}`}>
                      {item.title}
                    </h4>

                    <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                      {item.message}
                    </p>
                  </div>

                  {/* Actions Overlay */}
                  <div className="absolute right-3 top-3 flex items-center gap-1 opacity-90 group-hover:opacity-100">
                    {!item.isRead && (
                      <button
                        type="button"
                        onClick={(e) => handleMarkAsRead(e, item.notificationId)}
                        className="p-1 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded transition"
                        title="Mark as read"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={(e) => handleDelete(e, item.notificationId)}
                      className="p-1 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded transition"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-slate-800 bg-slate-950/80 text-center">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                if (triggerFullCenter) {
                  triggerFullCenter();
                }
              }}
              className="w-full py-2 px-3 text-xs font-semibold text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 rounded-xl transition flex items-center justify-center gap-1.5"
            >
              <span>View All Notifications & History</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
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
