import React, { useState } from 'react';
import { 
  Settings, 
  Key, 
  Bell, 
  UserCheck, 
  Lock, 
  CheckCircle2, 
  Save 
} from 'lucide-react';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { auth } from '../../firebase/config';
import { BiometricPasskeysSettings } from '../biometric/BiometricPasskeysSettings';
import { PersonalDataExportCard } from '../profile/PersonalDataExportCard';

export interface StudentSettingsProps {
  currentUser: any;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const StudentSettings: React.FC<StudentSettingsProps> = ({
  currentUser,
  showToast
}) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);

  // Notifications preferences
  const [notifications, setNotifications] = useState({
    emailAnnouncements: true,
    assignmentAlerts: true,
    resultRelease: true
  });

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showToast("New passwords do not match", "error");
      return;
    }
    if (newPassword.length < 6) {
      showToast("Password must be at least 6 characters long", "error");
      return;
    }

    setUpdatingPassword(true);
    try {
      const user = auth.currentUser;
      if (user && user.email) {
        const credential = EmailAuthProvider.credential(user.email, currentPassword);
        await reauthenticateWithCredential(user, credential);
        await updatePassword(user, newPassword);
        showToast("Password changed successfully!", "success");
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        showToast("Unable to verify current session", "error");
      }
    } catch (err: any) {
      console.error("Error updating password:", err);
      showToast(err.message || "Failed to update password. Check current password.", "error");
    } finally {
      setUpdatingPassword(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER BANNER */}
      <div className="bg-gradient-to-r from-[#002147] via-[#0b3c5d] to-[#1d2731] p-6 rounded-3xl text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border border-[#D4AF37]/30">
        <div>
          <div className="flex items-center gap-2">
            <Settings className="w-8 h-8 text-[#D4AF37]" />
            <h1 className="text-2xl font-black tracking-tight">Student Security & Preferences</h1>
          </div>
          <p className="text-slate-300 text-xs mt-1">
            Update account security credentials and manage alert preferences.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* CHANGE PASSWORD */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-base font-black text-[#002147] flex items-center gap-2">
              <Key className="w-5 h-5 text-[#D4AF37]" />
              Change Login Password
            </h2>
            <p className="text-xs text-slate-500">Ensure your student account remains secure.</p>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Current Password *</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">New Password *</label>
              <input
                type="password"
                required
                placeholder="At least 6 characters"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Confirm New Password *</label>
              <input
                type="password"
                required
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none"
              />
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                type="submit"
                disabled={updatingPassword}
                className="px-5 py-2.5 bg-[#002147] text-white font-bold text-xs rounded-xl shadow-md cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                <Lock className="w-4 h-4 text-[#D4AF37]" />
                <span>{updatingPassword ? 'Updating...' : 'Update Password'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* NOTIFICATION PREFERENCES */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-base font-black text-[#002147] flex items-center gap-2">
              <Bell className="w-5 h-5 text-[#D4AF37]" />
              Notification Preferences
            </h2>
            <p className="text-xs text-slate-500">Configure broadcast alerts and assignment updates.</p>
          </div>

          <div className="space-y-4 text-xs">
            <label className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-200 cursor-pointer">
              <div>
                <p className="font-bold text-[#002147]">School Broadcast Announcements</p>
                <p className="text-[10px] text-slate-500">Receive instant alerts on school notices.</p>
              </div>
              <input
                type="checkbox"
                checked={notifications.emailAnnouncements}
                onChange={e => setNotifications({ ...notifications, emailAnnouncements: e.target.checked })}
                className="w-4 h-4 accent-[#002147]"
              />
            </label>

            <label className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-200 cursor-pointer">
              <div>
                <p className="font-bold text-[#002147]">Assignment Due Reminders</p>
                <p className="text-[10px] text-slate-500">Notifications when new homework is published.</p>
              </div>
              <input
                type="checkbox"
                checked={notifications.assignmentAlerts}
                onChange={e => setNotifications({ ...notifications, assignmentAlerts: e.target.checked })}
                className="w-4 h-4 accent-[#002147]"
              />
            </label>

            <label className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-200 cursor-pointer">
              <div>
                <p className="font-bold text-[#002147]">Published Results Alerts</p>
                <p className="text-[10px] text-slate-500">Get notified when term marks are released.</p>
              </div>
              <input
                type="checkbox"
                checked={notifications.resultRelease}
                onChange={e => setNotifications({ ...notifications, resultRelease: e.target.checked })}
                className="w-4 h-4 accent-[#002147]"
              />
            </label>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => showToast("Notification preferences saved!", "success")}
                className="px-5 py-2.5 bg-[#002147] text-white font-bold text-xs rounded-xl shadow-md cursor-pointer flex items-center gap-2"
              >
                <Save className="w-4 h-4 text-[#D4AF37]" />
                <span>Save Preferences</span>
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* BIOMETRIC & PASSKEYS MANAGEMENT */}
      <BiometricPasskeysSettings />

      {/* DATA PRIVACY & DOWNLOAD PERSONAL DATA */}
      <PersonalDataExportCard
        currentUser={currentUser}
        customTitle="Download Student Personal Data"
        customDescription="Export a machine-readable JSON file containing your student account data, attendance records, exam marks, and security credentials."
      />

    </div>
  );
};
