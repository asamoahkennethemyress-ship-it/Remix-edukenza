import React, { useState, useEffect } from 'react';
import { 
  X, 
  Bell, 
  Mail, 
  Smartphone, 
  Megaphone, 
  Clock, 
  Check, 
  Save, 
  AlertCircle,
  Loader2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { 
  getUserNotificationSettings, 
  saveUserNotificationSettings 
} from '../../services/notificationService';
import { requestNotificationPermission } from '../../utils/fcm';
import { UserNotificationSettings } from '../../types/notifications';

interface NotificationSettingsModalProps {
  onClose: () => void;
}

export const NotificationSettingsModal: React.FC<NotificationSettingsModalProps> = ({ onClose }) => {
  const { currentUser, showToast } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [browserPermission, setBrowserPermission] = useState<NotificationPermission>('default');

  const [settings, setSettings] = useState<UserNotificationSettings>({
    userId: currentUser?.uid || '',
    pushEnabled: true,
    emailEnabled: true,
    announcementEnabled: true,
    reminderEnabled: true,
  });

  useEffect(() => {
    if ('Notification' in window) {
      setBrowserPermission(Notification.permission);
    }

    async function loadSettings() {
      if (!currentUser?.uid) return;
      try {
        const fetched = await getUserNotificationSettings(currentUser.uid);
        setSettings(fetched);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }

    loadSettings();
  }, [currentUser]);

  const handleToggle = (field: keyof UserNotificationSettings) => {
    setSettings(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const handleEnablePushPermissions = async () => {
    if (!currentUser?.uid) return;
    const granted = await requestNotificationPermission(currentUser.uid);
    if (granted) {
      setBrowserPermission('granted');
      setSettings(prev => ({ ...prev, pushEnabled: true }));
      showToast('Browser Push Notifications enabled!', 'info');
    } else {
      setBrowserPermission(Notification.permission);
      showToast('Push notifications permission was denied or not granted in browser', 'error');
    }
  };

  const handleSave = async () => {
    if (!currentUser?.uid) return;
    setSaving(true);
    try {
      await saveUserNotificationSettings(settings);
      showToast('Notification preferences saved', 'info');
      onClose();
    } catch (e) {
      showToast('Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-6 animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-400">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Notification Preferences</h3>
              <p className="text-xs text-slate-400">Manage how you receive alerts & updates</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-400 space-y-2">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-amber-500" />
            <p className="text-xs">Loading preferences...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Browser Permission Banner */}
            {browserPermission !== 'granted' && (
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Browser desktop alerts disabled</span>
                </div>
                <button
                  type="button"
                  onClick={handleEnablePushPermissions}
                  className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] rounded-lg transition shrink-0"
                >
                  Enable
                </button>
              </div>
            )}

            {/* Toggle items */}
            <div className="space-y-3">
              {/* Push Notifications */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800/80 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-white">Browser Push Notifications</h4>
                    <p className="text-[11px] text-slate-400">Real-time desktop and mobile popups</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.pushEnabled}
                  onChange={() => handleToggle('pushEnabled')}
                  className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                />
              </div>

              {/* Email Alerts */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800/80 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-white">Email Digest & Alerts</h4>
                    <p className="text-[11px] text-slate-400">Send copies to registered email</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.emailEnabled}
                  onChange={() => handleToggle('emailEnabled')}
                  className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                />
              </div>

              {/* Announcements */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800/80 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                    <Megaphone className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-white">School Announcements</h4>
                    <p className="text-[11px] text-slate-400">Official circulars and school news</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.announcementEnabled}
                  onChange={() => handleToggle('announcementEnabled')}
                  className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                />
              </div>

              {/* Reminders */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800/80 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-white">Academic Reminders</h4>
                    <p className="text-[11px] text-slate-400">Assignment deadlines, fee dates, exams</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.reminderEnabled}
                  onChange={() => handleToggle('reminderEnabled')}
                  className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 rounded-xl transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || loading}
            className="px-5 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl transition flex items-center gap-2 shadow-lg shadow-amber-500/10"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? 'Saving...' : 'Save Settings'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
