import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  UserNotificationSettings, 
  EmailNotificationTemplate 
} from '../../types/notifications';
import { 
  getUserNotificationSettings, 
  saveUserNotificationSettings, 
  getEmailNotificationTemplates, 
  saveEmailNotificationTemplate 
} from '../../services/notificationService';
import { requestNotificationPermission } from '../../utils/fcm';
import { 
  Bell, 
  Mail, 
  Smartphone, 
  Megaphone, 
  Clock, 
  Save, 
  CheckCircle, 
  Sliders, 
  FileText, 
  Edit, 
  ToggleLeft, 
  ToggleRight,
  Sparkles,
  ShieldAlert,
  Loader2
} from 'lucide-react';

export const NotificationSettingsView: React.FC = () => {
  const { currentUser, showToast } = useAuth();
  const [settings, setSettings] = useState<UserNotificationSettings>({
    userId: currentUser?.uid || 'guest',
    pushEnabled: true,
    emailEnabled: true,
    announcementEnabled: true,
    reminderEnabled: true,
  });

  const [emailTemplates, setEmailTemplates] = useState<EmailNotificationTemplate[]>([]);
  const [editingTemplate, setEditingTemplate] = useState<EmailNotificationTemplate | null>(null);
  const [loading, setLoading] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(
    'Notification' in window && Notification.permission === 'granted'
  );

  useEffect(() => {
    if (!currentUser) return;

    const loadSettings = async () => {
      setLoading(true);
      const data = await getUserNotificationSettings(currentUser.uid);
      setSettings(data);

      if (currentUser.role === 'platform_owner' || currentUser.role === 'school_admin') {
        const templates = await getEmailNotificationTemplates(currentUser.schoolId || 'global');
        setEmailTemplates(templates);
      }
      setLoading(false);
    };

    loadSettings();
  }, [currentUser]);

  const handleToggle = (key: keyof UserNotificationSettings) => {
    if (typeof settings[key] === 'boolean') {
      setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
    }
  };

  const handleSaveSettings = async () => {
    if (!currentUser) return;
    setLoading(true);
    await saveUserNotificationSettings(settings);
    showToast('Notification preferences saved successfully!', 'success');
    setLoading(false);
  };

  const handleEnablePushPermission = async () => {
    const granted = await requestNotificationPermission(currentUser?.uid);
    setPermissionGranted(granted);
    if (granted) {
      showToast('Browser Web Push Notifications enabled!', 'success');
    } else {
      showToast('Push permission was denied or not supported by browser.', 'error');
    }
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTemplate) return;

    setLoading(true);
    await saveEmailNotificationTemplate(editingTemplate);
    showToast(`Email template "${editingTemplate.name}" updated!`, 'success');
    
    // Refresh templates list
    const templates = await getEmailNotificationTemplates(currentUser?.schoolId || 'global');
    setEmailTemplates(templates);
    setEditingTemplate(null);
    setLoading(false);
  };

  const isAdminOrOwner = currentUser?.role === 'platform_owner' || currentUser?.role === 'school_admin';

  return (
    <div className="space-y-8 text-slate-100">
      {/* User Preferences Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[#D4AF37]">
              <Sliders className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white uppercase tracking-wider">
                Notification Preferences
              </h2>
              <p className="text-xs text-slate-400">
                Manage how and when you receive real-time alerts across EDUkenZA
              </p>
            </div>
          </div>

          <button
            onClick={handleSaveSettings}
            disabled={loading}
            className="px-4 py-2 rounded-xl bg-[#D4AF37] hover:bg-[#c29f2e] text-[#002147] font-black text-xs uppercase tracking-wider transition flex items-center gap-2 cursor-pointer shadow-md"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Settings
          </button>
        </div>

        {/* Toggles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Push Notifications Toggle */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Smartphone className="w-5 h-5 text-amber-400" />
              <div>
                <span className="text-xs font-bold text-white block">Web Push Notifications</span>
                <span className="text-[11px] text-slate-400">
                  {permissionGranted ? 'Browser alerts enabled' : 'Browser push permission required'}
                </span>
              </div>
            </div>
            <button
              onClick={() => handleToggle('pushEnabled')}
              className="text-2xl text-slate-300 hover:text-white transition cursor-pointer"
            >
              {settings.pushEnabled ? (
                <ToggleRight className="w-8 h-8 text-emerald-400" />
              ) : (
                <ToggleLeft className="w-8 h-8 text-slate-600" />
              )}
            </button>
          </div>

          {/* Email Notifications Toggle */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-blue-400" />
              <div>
                <span className="text-xs font-bold text-white block">Email Notifications</span>
                <span className="text-[11px] text-slate-400">Send copies to {currentUser?.email}</span>
              </div>
            </div>
            <button
              onClick={() => handleToggle('emailEnabled')}
              className="text-2xl text-slate-300 hover:text-white transition cursor-pointer"
            >
              {settings.emailEnabled ? (
                <ToggleRight className="w-8 h-8 text-emerald-400" />
              ) : (
                <ToggleLeft className="w-8 h-8 text-slate-600" />
              )}
            </button>
          </div>

          {/* Announcement Notifications Toggle */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Megaphone className="w-5 h-5 text-purple-400" />
              <div>
                <span className="text-xs font-bold text-white block">Announcements & News</span>
                <span className="text-[11px] text-slate-400">School-wide circulars & urgent broadcasts</span>
              </div>
            </div>
            <button
              onClick={() => handleToggle('announcementEnabled')}
              className="text-2xl text-slate-300 hover:text-white transition cursor-pointer"
            >
              {settings.announcementEnabled ? (
                <ToggleRight className="w-8 h-8 text-emerald-400" />
              ) : (
                <ToggleLeft className="w-8 h-8 text-slate-600" />
              )}
            </button>
          </div>

          {/* Reminders Toggle */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-rose-400" />
              <div>
                <span className="text-xs font-bold text-white block">Academic Reminders</span>
                <span className="text-[11px] text-slate-400">Assignment due dates & exam schedules</span>
              </div>
            </div>
            <button
              onClick={() => handleToggle('reminderEnabled')}
              className="text-2xl text-slate-300 hover:text-white transition cursor-pointer"
            >
              {settings.reminderEnabled ? (
                <ToggleRight className="w-8 h-8 text-emerald-400" />
              ) : (
                <ToggleLeft className="w-8 h-8 text-slate-600" />
              )}
            </button>
          </div>
        </div>

        {/* Web Push Permission Request CTA */}
        {!permissionGranted && (
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-[#D4AF37] shrink-0" />
              <p className="text-xs text-amber-200">
                Grant desktop browser push permission to receive instant popups when urgent announcements arrive.
              </p>
            </div>
            <button
              onClick={handleEnablePushPermission}
              className="px-3.5 py-1.5 rounded-lg bg-[#D4AF37] hover:bg-[#c29f2e] text-[#002147] font-black text-xs shrink-0 cursor-pointer transition"
            >
              Enable Desktop Push
            </button>
          </div>
        )}
      </div>

      {/* Admin / Owner Custom Email Templates Section */}
      {isAdminOrOwner && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-black text-white uppercase tracking-wider">
                  Email Notification Templates
                </h2>
                <p className="text-xs text-slate-400">
                  Customize automated email subject lines and message bodies sent to parents, teachers & students
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {emailTemplates.map((template) => (
              <div
                key={template.templateId}
                className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-slate-700 transition flex flex-col justify-between gap-3"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs font-black text-white">{template.name}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-500/20 text-blue-300 border border-blue-500/30">
                      {template.type}
                    </span>
                  </div>

                  <p className="text-xs font-mono text-slate-400 truncate mb-2">
                    Subject: {template.subject}
                  </p>

                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800/80 text-[11px] font-mono text-slate-300 whitespace-pre-wrap line-clamp-3">
                    {template.body}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                  <div className="flex items-center gap-1 flex-wrap">
                    {template.variables.map((v) => (
                      <span key={v} className="px-1.5 py-0.5 rounded bg-slate-800 text-[9px] font-mono text-amber-300">
                        {`{{${v}}}`}
                      </span>
                    ))}
                  </div>

                  <button
                    onClick={() => setEditingTemplate(template)}
                    className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                  >
                    <Edit className="w-3.5 h-3.5 text-amber-400" />
                    Edit Template
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit Template Modal */}
      {editingTemplate && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-black text-white uppercase tracking-wider">
                Edit Template: {editingTemplate.name}
              </h3>
              <button
                onClick={() => setEditingTemplate(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveTemplate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                  Email Subject Line
                </label>
                <input
                  type="text"
                  value={editingTemplate.subject}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, subject: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white focus:border-[#D4AF37] focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                  Email Message Body
                </label>
                <textarea
                  rows={6}
                  value={editingTemplate.body}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, body: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs font-mono text-white focus:border-[#D4AF37] focus:outline-none"
                  required
                />
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-[11px] text-slate-400 block font-bold mb-1">Available Variables:</span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {editingTemplate.variables.map((varName) => (
                    <span key={varName} className="px-2 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-amber-300">
                      {`{{${varName}}}`}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingTemplate(null)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 rounded-lg bg-[#D4AF37] text-[#002147] text-xs font-black hover:bg-[#c29f2e] flex items-center gap-1.5"
                >
                  {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
