import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { NotificationItem, NotificationType } from '../../types/notifications';
import { 
  subscribeUserNotifications, 
  markNotificationAsRead, 
  markAllNotificationsAsRead, 
  deleteNotification 
} from '../../services/notificationService';
import { NotificationSettingsView } from './NotificationSettingsView';
import { SendNotificationModal } from './SendNotificationModal';
import { 
  Bell, 
  Search, 
  Filter, 
  CheckCheck, 
  Trash2, 
  X, 
  Check, 
  Sliders, 
  Send, 
  Mail, 
  Megaphone, 
  BookOpen, 
  UserCheck, 
  CreditCard, 
  Award, 
  Calendar, 
  FileSpreadsheet, 
  ShieldAlert, 
  AlertTriangle,
  Sparkles,
  Inbox
} from 'lucide-react';

interface NotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'inbox' | 'preferences' | 'send';
}

export const NotificationCenterModal: React.FC<NotificationCenterModalProps> = ({ 
  isOpen, 
  onClose,
  defaultTab = 'inbox'
}) => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'inbox' | 'preferences' | 'send'>(defaultTab);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  
  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'unread' | 'high'>('all');

  const [isSendModalOpen, setIsSendModalOpen] = useState(false);

  useEffect(() => {
    if (!currentUser) return;

    const unsubscribe = subscribeUserNotifications(
      currentUser.uid,
      currentUser.role,
      currentUser.schoolId,
      (data) => {
        setNotifications(data);
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  if (!isOpen) return null;

  // Filter logic
  const filteredNotifications = notifications.filter((item) => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.message.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedType === 'all' || item.type === selectedType;
    const matchesStatus = selectedFilter === 'all' 
      ? true 
      : selectedFilter === 'unread' 
      ? !item.isRead 
      : (item.priority === 'High' || item.priority === 'Urgent' || item.priority === 'Important');

    return matchesSearch && matchesType && matchesStatus;
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'Announcement': return <Megaphone className="w-4 h-4 text-amber-500" />;
      case 'Assignment': return <BookOpen className="w-4 h-4 text-blue-500" />;
      case 'Attendance': return <UserCheck className="w-4 h-4 text-emerald-500" />;
      case 'Payment': return <CreditCard className="w-4 h-4 text-[#D4AF37]" />;
      case 'Results': return <Award className="w-4 h-4 text-purple-500" />;
      case 'Timetable': return <Calendar className="w-4 h-4 text-indigo-500" />;
      case 'Examination': return <FileSpreadsheet className="w-4 h-4 text-rose-500" />;
      case 'Security Alert': return <ShieldAlert className="w-4 h-4 text-red-600" />;
      default: return <AlertTriangle className="w-4 h-4 text-amber-500" />;
    }
  };

  const isSender = currentUser?.role === 'platform_owner' || currentUser?.role === 'school_admin' || currentUser?.role === 'teacher';

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        
        {/* Modal Top Header Bar */}
        <div className="px-6 py-4 bg-[#002147] border-b border-[#00152e] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#D4AF37] text-[#002147] flex items-center justify-center font-black shadow-md">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-white uppercase tracking-wider">
                  Global Notification Center
                </h2>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 font-extrabold text-xs border border-red-500/30">
                    {unreadCount} Unread
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300">
                Centralized real-time messages & communication alerts
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 text-white hover:bg-white/20 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 bg-slate-950 border-b border-slate-800 flex items-center justify-between overflow-x-auto shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('inbox')}
              className={`py-3.5 px-4 font-black text-xs uppercase tracking-wider border-b-2 flex items-center gap-2 transition cursor-pointer ${
                activeTab === 'inbox'
                  ? 'border-[#D4AF37] text-[#D4AF37]'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <Inbox className="w-4 h-4" />
              Inbox & History
            </button>

            <button
              onClick={() => setActiveTab('preferences')}
              className={`py-3.5 px-4 font-black text-xs uppercase tracking-wider border-b-2 flex items-center gap-2 transition cursor-pointer ${
                activeTab === 'preferences'
                  ? 'border-[#D4AF37] text-[#D4AF37]'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <Sliders className="w-4 h-4" />
              Preferences & Push
            </button>
          </div>

          {isSender && (
            <button
              onClick={() => setIsSendModalOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-[#D4AF37] hover:bg-[#c29f2e] text-[#002147] font-black text-xs uppercase tracking-wider flex items-center gap-1.5 cursor-pointer my-2 shadow-md"
            >
              <Send className="w-3.5 h-3.5" />
              Send Notification
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-900/60">
          {activeTab === 'inbox' && (
            <div className="space-y-5">
              {/* Filter Controls */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
                {/* Search Bar */}
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search notification history..."
                    className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>

                {/* Filter Dropdown & Buttons */}
                <div className="flex items-center gap-2 flex-wrap">
                  <select
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                    className="px-3 py-1.5 text-xs rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-[#D4AF37]"
                  >
                    <option value="all">All Categories</option>
                    <option value="Announcement">Announcements</option>
                    <option value="Assignment">Assignments</option>
                    <option value="Attendance">Attendance</option>
                    <option value="Payment">Payments</option>
                    <option value="Results">Results</option>
                    <option value="Timetable">Timetables</option>
                    <option value="Examination">Examinations</option>
                    <option value="Security Alert">Security Alerts</option>
                  </select>

                  <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 text-[11px] font-bold">
                    <button
                      onClick={() => setSelectedFilter('all')}
                      className={`px-2.5 py-1 rounded-lg transition ${selectedFilter === 'all' ? 'bg-[#D4AF37] text-[#002147]' : 'text-slate-400'}`}
                    >
                      All
                    </button>
                    <button
                      onClick={() => setSelectedFilter('unread')}
                      className={`px-2.5 py-1 rounded-lg transition ${selectedFilter === 'unread' ? 'bg-[#D4AF37] text-[#002147]' : 'text-slate-400'}`}
                    >
                      Unread
                    </button>
                    <button
                      onClick={() => setSelectedFilter('high')}
                      className={`px-2.5 py-1 rounded-lg transition ${selectedFilter === 'high' ? 'bg-[#D4AF37] text-[#002147]' : 'text-slate-400'}`}
                    >
                      High
                    </button>
                  </div>

                  {unreadCount > 0 && (
                    <button
                      onClick={() => markAllNotificationsAsRead(notifications)}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition"
                    >
                      <CheckCheck className="w-4 h-4 text-emerald-400" />
                      Mark All Read
                    </button>
                  )}
                </div>
              </div>

              {/* Notification Cards */}
              {filteredNotifications.length === 0 ? (
                <div className="py-16 text-center space-y-3 bg-slate-950/40 rounded-2xl border border-slate-800">
                  <div className="w-16 h-16 rounded-full bg-slate-800 border border-slate-700 text-slate-500 mx-auto flex items-center justify-center">
                    <Bell className="w-8 h-8" />
                  </div>
                  <h3 className="text-sm font-bold text-white">No notifications found</h3>
                  <p className="text-xs text-slate-400">
                    {searchQuery ? 'Try adjusting your search criteria or filters.' : 'Your notification log is clear.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredNotifications.map((notif) => (
                    <div
                      key={notif.id || notif.notificationId}
                      className={`p-4 rounded-2xl border transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                        notif.isRead 
                          ? 'bg-slate-950/50 border-slate-800/80 text-slate-300' 
                          : 'bg-slate-900 border-l-4 border-l-[#D4AF37] border-slate-700 text-white shadow-lg'
                      }`}
                    >
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="p-2.5 rounded-xl bg-slate-800 border border-slate-700 shrink-0 mt-0.5">
                          {getTypeIcon(notif.type)}
                        </div>

                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-black text-white">{notif.title}</h4>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-800 text-slate-300 border border-slate-700">
                              {notif.type}
                            </span>
                            {notif.priority === 'Urgent' && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-red-500/20 text-red-400 border border-red-500/30">
                                Urgent
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-slate-300 leading-relaxed font-normal">
                            {notif.message}
                          </p>

                          <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-1">
                            <span>Sent by {notif.createdBy}</span>
                            <span>•</span>
                            <span>{new Date(notif.createdAt).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        {!notif.isRead && (
                          <button
                            onClick={() => markNotificationAsRead(notif.id || notif.notificationId)}
                            className="px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-1 cursor-pointer transition"
                          >
                            <Check className="w-3.5 h-3.5" />
                            Mark Read
                          </button>
                        )}
                        <button
                          onClick={() => deleteNotification(notif.id || notif.notificationId)}
                          className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-red-400 transition cursor-pointer"
                          title="Delete notification"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'preferences' && <NotificationSettingsView />}
        </div>
      </div>

      {/* Send Notification Broadcast Modal */}
      <SendNotificationModal
        isOpen={isSendModalOpen}
        onClose={() => setIsSendModalOpen(false)}
      />
    </div>
  );
};
